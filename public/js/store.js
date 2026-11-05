// Community App data layer. GitHub Pages serves static files only, so the "backend" runs in the
// browser: a small database in localStorage with the same API routes, validation and ownership rules
// a server would enforce. Open tabs stay in sync through BroadcastChannel.
//
// Rules enforced here:
//  - every member signs in with a unique email + password (passwords are salted PBKDF2 hashes)
//  - only a member can change their own profile
//  - only the owner can update or delete their own issue, task or comment
//  - comments belong to tasks

const KEY = 'ca_db_v2';
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
export const CATEGORIES = ['Event', 'Facilities', 'Safety', 'Volunteering', 'Fundraising', 'General'];
export const PRIORITIES = ['low', 'medium', 'high', 'critical'];
export const ISSUE_STATUSES = ['open', 'in_progress', 'closed'];
export const TASK_STATUSES = ['open', 'in_progress', 'completed', 'closed'];
export const DEMO_PASSWORD = 'community123';

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

// ---------------------------------------------------------------- cross-tab change events
const channel = 'BroadcastChannel' in self ? new BroadcastChannel('community-app') : null;
const listeners = new Set();
if (channel) channel.onmessage = (e) => listeners.forEach((fn) => fn(e.data));
export const onChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const changed = (me, summary, extra = {}) => channel?.postMessage({ type: 'change', by: me.id, byName: me.name, summary, ...extra });

// ---------------------------------------------------------------- storage
let db = null;
const nowIso = () => new Date().toISOString();
const clone = (v) => JSON.parse(JSON.stringify(v));
function load() {
  try { db = JSON.parse(localStorage.getItem(KEY)); } catch { db = null; }
  return db;
}
function save() { localStorage.setItem(KEY, JSON.stringify(db)); }
const nextId = (table) => (db.seq[table] = (db.seq[table] || 0) + 1);

// ---------------------------------------------------------------- password hashing
const enc = new TextEncoder();
const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const randomHex = (n) => toHex(crypto.getRandomValues(new Uint8Array(n)));
async function hashPassword(password, salt = randomHex(16)) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' }, key, 256);
  return { salt, hash: toHex(bits) };
}
async function verifyPassword(password, salt, hash) {
  return (await hashPassword(password, salt)).hash === hash;
}

// ---------------------------------------------------------------- validation
function text(value, field, { min = 0, max = 200, required = false } = {}) {
  if (value === undefined || value === null) {
    if (required) throw new HttpError(400, `${field} is required`);
    return undefined;
  }
  if (typeof value !== 'string') throw new HttpError(400, `${field} must be text`);
  const v = value.trim();
  if (v.length < min) throw new HttpError(400, min <= 1 ? `${field} is required` : `${field} must be at least ${min} characters`);
  if (v.length > max) throw new HttpError(400, `${field} must be at most ${max} characters`);
  return v;
}
function oneOf(value, field, options) {
  if (value === undefined) return undefined;
  if (!options.includes(value)) throw new HttpError(400, `${field} must be one of: ${options.join(', ')}`);
  return value;
}
function dateOrNull(value, field) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || isNaN(Date.parse(value))) throw new HttpError(400, `${field} must be a date (YYYY-MM-DD)`);
  return value;
}
function numberIn(value, field, min, max) {
  if (value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) throw new HttpError(400, `${field} must be between ${min} and ${max}`);
  return n;
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function email(value, field = 'Email', required = false) {
  const v = text(value, field, { required, min: required ? 1 : 0, max: 120 });
  if (v === undefined) return undefined;
  if (!EMAIL_RE.test(v)) throw new HttpError(400, 'Please enter a valid email address');
  return v.toLowerCase();
}
const emailTaken = (addr, exceptId) => db.members.some((m) => m.email === addr && m.id !== exceptId);

// ---------------------------------------------------------------- helpers
const publicMember = ({ pass_hash, salt, ...m }) => m;
function logActivity(memberId, action, entityType, entityId, issueId, summary, at = nowIso()) {
  db.activity.push({ id: nextId('activity'), member_id: memberId, action, entity_type: entityType, entity_id: entityId, issue_id: issueId, summary, created_at: at });
}
function getIssue(id) {
  const issue = db.issues.find((i) => i.id === Number(id));
  if (!issue) throw new HttpError(404, 'Issue not found');
  return issue;
}
function getTask(id) {
  const task = db.tasks.find((t) => t.id === Number(id));
  if (!task) throw new HttpError(404, 'Task not found');
  return task;
}
function requireOwner(row, me, what) {
  if (row.owner_id !== me.id) throw new HttpError(403, `Only the owner can update this ${what}`);
}
function applyFields(row, fields) {
  for (const [k, v] of Object.entries(fields)) if (v !== undefined) row[k] = v;
}
function deleteTaskCascade(taskId) {
  db.tasks = db.tasks.filter((t) => t.id !== taskId);
  db.deps = db.deps.filter((d) => d.task_id !== taskId && d.depends_on_id !== taskId);
  db.comments = db.comments.filter((c) => c.task_id !== taskId);
}

// Validates dependency ids (same issue, not itself) and rejects loops.
function setDependencies(task, dependsOn) {
  if (dependsOn === undefined) return;
  if (!Array.isArray(dependsOn)) throw new HttpError(400, 'depends_on must be a list');
  const ids = [...new Set(dependsOn.map(Number))];
  const sameIssue = new Set(db.tasks.filter((t) => t.issue_id === task.issue_id).map((t) => t.id));
  for (const id of ids) {
    if (id === task.id) throw new HttpError(400, 'A task cannot depend on itself');
    if (!sameIssue.has(id)) throw new HttpError(400, 'Dependencies must be tasks in the same issue');
  }
  const edges = new Map();
  for (const d of db.deps) {
    if (d.task_id === task.id || !sameIssue.has(d.task_id)) continue;
    if (!edges.has(d.task_id)) edges.set(d.task_id, []);
    edges.get(d.task_id).push(d.depends_on_id);
  }
  edges.set(task.id, ids);
  const seen = new Set();
  const stack = [...ids];
  while (stack.length) {
    const n = stack.pop();
    if (n === task.id) throw new HttpError(400, 'That dependency would create a loop');
    if (seen.has(n)) continue;
    seen.add(n);
    stack.push(...(edges.get(n) || []));
  }
  db.deps = db.deps.filter((d) => d.task_id !== task.id);
  for (const id of ids) db.deps.push({ task_id: task.id, depends_on_id: id });
}

// ---------------------------------------------------------------- demo data
async function seed() {
  db = { version: 2, seq: {}, members: [], sessions: {}, issues: [], tasks: [], deps: [], comments: [], activity: [] };
  const day = 86400000;
  const ago = (d, h = 0) => new Date(Date.now() - d * day - h * 3600000).toISOString();
  const ahead = (d) => new Date(Date.now() + d * day).toISOString().slice(0, 10);
  const people = [
    ['susan', 'Susan Miller', 'Community Organizer', '#8b5cf6', 'Brings neighbors together one event at a time.', 'Maple Street', '(989) 555-0101'],
    ['joey', 'Joey Carter', 'Events Volunteer', '#f59e0b', 'Pizza enthusiast and weekend volunteer.', 'Oak Avenue', '(989) 555-0102'],
    ['sam', 'Sam Patel', 'Safety Coordinator', '#10b981', 'Keeps the neighborhood safe and organized.', 'Birch Lane', '(989) 555-0103'],
    ['lisa', 'Lisa Chen', 'Facilities Lead', '#ec4899', 'Gardener, planner, spreadsheet lover.', 'Cedar Court', '(989) 555-0104'],
    ['george', 'George Brooks', 'Fundraising Chair', '#06b6d4', 'Always happy to bring the snacks.', 'Pine Road', '(989) 555-0105'],
  ];
  const ids = {};
  for (const [u, name, title, color, bio, location, phone] of people) {
    const { salt, hash } = await hashPassword(DEMO_PASSWORD);
    const id = nextId('members');
    ids[u] = id;
    db.members.push({ id, name, email: `${u}@community.example`, title, bio, phone, location, color, pass_hash: hash, salt, created_at: ago(30) });
  }
  const addIssue = (owner, title, description, category, priority, status, due, daysAgo) => {
    const at = ago(daysAgo);
    const id = nextId('issues');
    db.issues.push({ id, title, description, category, priority, status, due_date: due, owner_id: ids[owner], created_at: at, updated_at: at });
    logActivity(ids[owner], 'created', 'issue', id, id, `created issue “${title}”`, at);
    return id;
  };
  const addTask = (issueId, owner, title, status, duration, deps = [], daysAgo = 1, notes = '') => {
    const at = ago(daysAgo, Math.random() * 10);
    const id = nextId('tasks');
    db.tasks.push({ id, issue_id: issueId, title, notes, owner_id: ids[owner], status, duration, due_date: null, created_at: at, updated_at: at });
    for (const d of deps) db.deps.push({ task_id: id, depends_on_id: d });
    logActivity(ids[owner], 'volunteered', 'task', id, issueId, `took on “${title}”`, at);
    if (status === 'completed') logActivity(ids[owner], 'completed', 'task', id, issueId, `completed “${title}”`, ago(Math.max(0, daysAgo - 1)));
    return id;
  };
  const addComment = (taskId, who, body, daysAgo) => {
    const at = ago(daysAgo, Math.random() * 5);
    const task = db.tasks.find((t) => t.id === taskId);
    db.comments.push({ id: nextId('comments'), task_id: taskId, member_id: ids[who], body, created_at: at, updated_at: at });
    logActivity(ids[who], 'commented', 'task', taskId, task.issue_id, `commented on “${task.title}”`, at);
  };

  const potluck = addIssue('susan', 'Potluck Lunch',
    'Let’s get together for a community potluck lunch at the community hall! Everyone brings something to share. Volunteer a dish below so we don’t end up with five bowls of chips.',
    'Event', 'high', 'open', ahead(10), 6);
  const invites = addTask(potluck, 'susan', 'Send invitations & collect headcount', 'completed', 1, [], 6);
  const hall = addTask(potluck, 'susan', 'Book the community hall', 'completed', 1, [], 6);
  const pizza = addTask(potluck, 'joey', 'I will bring pizza', 'open', 2, [invites], 5, 'Planning 4 large pizzas: 2 cheese, 1 veggie, 1 pepperoni.');
  const lunch = addTask(potluck, 'sam', 'I will bring lunch', 'in_progress', 3, [invites], 4, 'Pasta salad and sandwiches.');
  const chips = addTask(potluck, 'george', 'I will bring chips', 'completed', 1, [invites], 4);
  addTask(potluck, 'lisa', 'Set up tables & decorations', 'open', 2, [hall], 3);
  addComment(invites, 'susan', 'Headcount is at 24 so far. Thanks everyone for volunteering!', 4);
  addComment(pizza, 'joey', 'Pizza is covered 🍕 Any dietary restrictions I should know about?', 3);
  addComment(pizza, 'lisa', 'One gluten-free guest, I’ll message you the details.', 2);
  addComment(lunch, 'susan', 'Sandwiches sound perfect, thank you Sam!', 2);
  addComment(chips, 'george', 'Bought three big bags plus salsa.', 1);

  const garden = addIssue('lisa', 'Community Garden Cleanup',
    'Spring cleanup of the shared garden beds: clear debris, add fresh mulch, and plant seedlings.',
    'Facilities', 'medium', 'in_progress', ahead(14), 12);
  const dumpster = addTask(garden, 'sam', 'Rent a dumpster', 'completed', 1, [], 11);
  const shifts = addTask(garden, 'george', 'Organize volunteer shifts', 'in_progress', 2, [], 10);
  const mulch = addTask(garden, 'lisa', 'Buy mulch & seedlings', 'open', 3, [], 9);
  const clear = addTask(garden, 'susan', 'Clear debris from beds', 'open', 4, [dumpster, shifts], 8);
  addTask(garden, 'joey', 'Plant seedlings', 'open', 2, [clear, mulch], 7);
  addComment(shifts, 'george', 'Shifts sheet is shared. Saturday morning is filling up fast.', 5);

  const watch = addIssue('sam', 'Neighborhood Watch Schedule',
    'We need a rota for evening walks and a point of contact with the local police liaison.',
    'Safety', 'critical', 'open', ahead(5), 4);
  const rota = addTask(watch, 'lisa', 'Draft patrol rota', 'in_progress', 2, [], 3);
  addTask(watch, 'susan', 'Contact police liaison', 'open', 1, [], 2);
  addTask(watch, 'sam', 'Share rota with all members', 'open', 1, [rota], 1);
  addComment(rota, 'sam', 'Can we cover Tuesday and Thursday evenings first?', 1);

  const coats = addIssue('joey', 'Winter Coat Drive',
    'Collect gently used winter coats for the local shelter.', 'Volunteering', 'low', 'closed', ahead(-20), 40);
  addTask(coats, 'joey', 'Set up drop-off box', 'completed', 1, [], 38);
  addTask(coats, 'lisa', 'Deliver coats to the shelter', 'completed', 1, [], 30);
  logActivity(ids.joey, 'closed', 'issue', coats, coats, 'closed issue “Winter Coat Drive”', ago(25));

  const fund = addIssue('george', 'Playground Fundraiser',
    'Raise $5,000 for new playground equipment through a bake sale and online campaign.',
    'Fundraising', 'medium', 'open', ahead(30), 2);
  const page = addTask(fund, 'george', 'Create online donation page', 'open', 2, [], 2);
  addTask(fund, 'susan', 'Organize the bake sale', 'open', 3, [], 1);
  addTask(fund, 'sam', 'Promote on community board', 'open', 1, [page], 1);
  save();
}

let ready = null;
function ensureDb() {
  if (!ready) ready = (async () => { if (!load() || db.version !== 2) await seed(); })();
  return ready.then(() => load());
}
export async function resetDemoData() {
  ready = null;
  localStorage.removeItem(KEY);
  await ensureDb();
}

// ---------------------------------------------------------------- routes
const routes = [];
const route = (method, pattern, handler, auth = true) =>
  routes.push({ method, re: new RegExp(`^${pattern.replace(/:(\w+)/g, '(?<$1>\\d+)')}$`), handler, auth });

async function startSession(memberId) {
  const token = randomHex(32);
  const now = Date.now();
  for (const [t, s] of Object.entries(db.sessions)) if (s.expires < now) delete db.sessions[t];
  db.sessions[token] = { member_id: memberId, expires: now + SESSION_MS };
  return token;
}
function currentMember(token) {
  const s = token && db.sessions[token];
  if (!s) return null;
  if (s.expires < Date.now()) { delete db.sessions[token]; save(); return null; }
  const m = db.members.find((x) => x.id === s.member_id);
  return m ? publicMember(m) : null;
}

route('POST', '/api/auth/login', async (body) => {
  const addr = email(body.email, 'Email', true);
  const password = text(body.password, 'Password', { required: true, min: 1, max: 200 });
  const m = db.members.find((x) => x.email === addr);
  if (!m || !(await verifyPassword(password, m.salt, m.pass_hash))) throw new HttpError(401, 'Incorrect email or password');
  return { ok: true, token: await startSession(m.id) };
}, false);

route('POST', '/api/auth/register', async (body) => {
  const name = text(body.name, 'Full name', { required: true, min: 2, max: 60 });
  const addr = email(body.email, 'Email', true);
  const phone = text(body.phone, 'Phone', { max: 40 }) || '';
  const password = text(body.password, 'Password', { required: true, min: 8, max: 200 });
  if (emailTaken(addr)) throw new HttpError(409, 'An account with that email already exists');
  const palette = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#ef4444', '#84cc16'];
  const { salt, hash } = await hashPassword(password);
  const id = nextId('members');
  db.members.push({ id, name, email: addr, title: '', bio: '', phone, location: '', color: palette[id % palette.length], pass_hash: hash, salt, created_at: nowIso() });
  logActivity(id, 'joined', 'member', id, null, 'joined the community');
  changed({ id, name }, `${name} joined the community`);
  return { ok: true, token: await startSession(id) };
}, false);

route('POST', '/api/auth/logout', async (body, me, p, token) => {
  if (token) delete db.sessions[token];
  return { ok: true };
}, false);

route('POST', '/api/reset', async () => { await seed(); return { ok: true }; }, false);

route('GET', '/api/bootstrap', async (body, me) => {
  const countByTask = new Map();
  for (const c of db.comments) countByTask.set(c.task_id, (countByTask.get(c.task_id) || 0) + 1);
  const tasks = db.tasks.slice().sort((a, b) => a.created_at.localeCompare(b.created_at)).map((t) => ({ ...t, comment_count: countByTask.get(t.id) || 0 }));
  const issues = db.issues.slice().sort((a, b) => b.updated_at.localeCompare(a.updated_at)).map((i) => ({
    ...i, comment_count: tasks.filter((t) => t.issue_id === i.id).reduce((n, t) => n + t.comment_count, 0),
  }));
  return {
    me,
    members: db.members.map(publicMember).sort((a, b) => a.name.localeCompare(b.name)),
    issues, tasks,
    deps: db.deps,
    comments: db.comments.slice().sort((a, b) => a.created_at.localeCompare(b.created_at)),
  };
});

route('GET', '/api/activity', async () =>
  db.activity.slice().sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id).slice(0, 300));

route('PUT', '/api/members/:id', async (b, me, p) => {
  if (Number(p.id) !== me.id) throw new HttpError(403, 'You can only update your own profile');
  const fields = {
    name: text(b.name, 'Full name', { min: 2, max: 60 }),
    email: b.email === undefined ? undefined : email(b.email, 'Email', true),
    title: text(b.title, 'Title', { max: 80 }),
    bio: text(b.bio, 'Bio', { max: 500 }),
    phone: text(b.phone, 'Phone', { max: 40 }),
    location: text(b.location, 'Location', { max: 80 }),
    color: text(b.color, 'Color', { max: 7 }),
  };
  if (fields.email && emailTaken(fields.email, me.id)) throw new HttpError(409, 'Another member already uses that email');
  if (fields.color && !/^#[0-9a-fA-F]{6}$/.test(fields.color)) throw new HttpError(400, 'Color must be a hex value like #6366f1');
  const row = db.members.find((m) => m.id === me.id);
  applyFields(row, fields);
  logActivity(me.id, 'updated', 'member', me.id, null, 'updated their profile');
  changed(me, `${row.name} updated their profile`);
  return publicMember(row);
});

route('PUT', '/api/me/password', async (b, me) => {
  const current = text(b.current, 'Current password', { required: true, min: 1, max: 200 });
  const next = text(b.next, 'New password', { required: true, min: 8, max: 200 });
  const row = db.members.find((m) => m.id === me.id);
  if (!(await verifyPassword(current, row.salt, row.pass_hash))) throw new HttpError(400, 'Current password is incorrect');
  Object.assign(row, await hashPassword(next).then(({ salt, hash }) => ({ salt, pass_hash: hash })));
  return { ok: true };
});

route('POST', '/api/issues', async (b, me) => {
  const at = nowIso();
  const title = text(b.title, 'Title', { required: true, min: 3, max: 120 });
  const issue = {
    id: nextId('issues'), title, description: text(b.description, 'Description', { max: 4000 }) || '',
    category: oneOf(b.category, 'Category', CATEGORIES) || 'General', priority: oneOf(b.priority, 'Priority', PRIORITIES) || 'medium',
    status: 'open', due_date: dateOrNull(b.due_date, 'Due date') ?? null, owner_id: me.id, created_at: at, updated_at: at,
  };
  db.issues.push(issue);
  logActivity(me.id, 'created', 'issue', issue.id, issue.id, `created issue “${title}”`);
  changed(me, `${me.name} created “${title}”`, { issueId: issue.id });
  return issue;
});

route('PUT', '/api/issues/:id', async (b, me, p) => {
  const issue = getIssue(p.id);
  requireOwner(issue, me, 'issue');
  const before = issue.status;
  const fields = {
    title: text(b.title, 'Title', { min: 3, max: 120 }),
    description: text(b.description, 'Description', { max: 4000 }),
    category: oneOf(b.category, 'Category', CATEGORIES),
    priority: oneOf(b.priority, 'Priority', PRIORITIES),
    status: oneOf(b.status, 'Status', ISSUE_STATUSES),
    due_date: dateOrNull(b.due_date, 'Due date'),
  };
  applyFields(issue, fields);
  issue.updated_at = nowIso();
  const action = fields.status && fields.status !== before
    ? (fields.status === 'closed' ? 'closed' : fields.status === 'open' && before === 'closed' ? 'reopened' : 'updated') : 'updated';
  logActivity(me.id, action, 'issue', issue.id, issue.id, `${action} issue “${issue.title}”`);
  changed(me, `${me.name} ${action} “${issue.title}”`, { issueId: issue.id });
  return issue;
});

route('DELETE', '/api/issues/:id', async (b, me, p) => {
  const issue = getIssue(p.id);
  requireOwner(issue, me, 'issue');
  for (const t of db.tasks.filter((x) => x.issue_id === issue.id)) deleteTaskCascade(t.id);
  db.issues = db.issues.filter((i) => i.id !== issue.id);
  logActivity(me.id, 'deleted', 'issue', issue.id, null, `deleted issue “${issue.title}”`);
  changed(me, `${me.name} deleted “${issue.title}”`);
  return { ok: true };
});

route('POST', '/api/issues/:id/tasks', async (b, me, p) => {
  const issue = getIssue(p.id);
  if (issue.status === 'closed') throw new HttpError(409, 'This issue is closed and no longer accepts tasks');
  const at = nowIso();
  const title = text(b.title, 'Task', { required: true, min: 2, max: 140 });
  const task = {
    id: nextId('tasks'), issue_id: issue.id, title, notes: text(b.notes, 'Notes', { max: 1000 }) || '', owner_id: me.id, status: 'open',
    duration: numberIn(b.duration, 'Duration', 0, 999) ?? 1, due_date: dateOrNull(b.due_date, 'Due date') ?? null, created_at: at, updated_at: at,
  };
  db.tasks.push(task);
  try { setDependencies(task, b.depends_on); } catch (err) { db.tasks.pop(); throw err; }
  issue.updated_at = at;
  logActivity(me.id, 'volunteered', 'task', task.id, issue.id, `took on “${title}”`);
  changed(me, `${me.name} volunteered: “${title}”`, { issueId: issue.id });
  return task;
});

route('PUT', '/api/tasks/:id', async (b, me, p) => {
  const task = getTask(p.id);
  requireOwner(task, me, 'task');
  const before = task.status;
  const fields = {
    title: text(b.title, 'Task', { min: 2, max: 140 }),
    notes: text(b.notes, 'Notes', { max: 1000 }),
    status: oneOf(b.status, 'Status', TASK_STATUSES),
    duration: numberIn(b.duration, 'Duration', 0, 999),
    due_date: dateOrNull(b.due_date, 'Due date'),
  };
  setDependencies(task, b.depends_on);
  applyFields(task, fields);
  task.updated_at = nowIso();
  getIssue(task.issue_id).updated_at = task.updated_at;
  const action = fields.status && fields.status !== before
    ? ({ completed: 'completed', closed: 'closed', open: 'reopened', in_progress: 'started' })[fields.status] : 'updated';
  logActivity(me.id, action, 'task', task.id, task.issue_id, `${action} “${task.title}”`);
  changed(me, `${me.name} ${action} “${task.title}”`, { issueId: task.issue_id });
  return task;
});

route('DELETE', '/api/tasks/:id', async (b, me, p) => {
  const task = getTask(p.id);
  requireOwner(task, me, 'task');
  deleteTaskCascade(task.id);
  logActivity(me.id, 'withdrew', 'task', task.id, task.issue_id, `withdrew from “${task.title}”`);
  changed(me, `${me.name} withdrew from “${task.title}”`, { issueId: task.issue_id });
  return { ok: true };
});

route('POST', '/api/tasks/:id/comments', async (b, me, p) => {
  const task = getTask(p.id);
  const body = text(b.body, 'Comment', { required: true, min: 1, max: 2000 });
  const at = nowIso();
  const c = { id: nextId('comments'), task_id: task.id, member_id: me.id, body, created_at: at, updated_at: at };
  db.comments.push(c);
  logActivity(me.id, 'commented', 'task', task.id, task.issue_id, `commented on “${task.title}”`);
  changed(me, `${me.name} commented on “${task.title}”`, { issueId: task.issue_id });
  return c;
});

function ownComment(id, me) {
  const c = db.comments.find((x) => x.id === Number(id));
  if (!c) throw new HttpError(404, 'Comment not found');
  if (c.member_id !== me.id) throw new HttpError(403, 'You can only change your own comments');
  return c;
}
route('PUT', '/api/comments/:id', async (b, me, p) => {
  const c = ownComment(p.id, me);
  c.body = text(b.body, 'Comment', { required: true, min: 1, max: 2000 });
  c.updated_at = nowIso();
  changed(me, `${me.name} edited a comment`);
  return c;
});
route('DELETE', '/api/comments/:id', async (b, me, p) => {
  const c = ownComment(p.id, me);
  db.comments = db.comments.filter((x) => x.id !== c.id);
  changed(me, `${me.name} deleted a comment`);
  return { ok: true };
});

// ---------------------------------------------------------------- entry point
export async function localApi(path, { method = 'GET', body } = {}, token = null) {
  await ensureDb();
  load(); // pick up changes made in other tabs
  const { pathname } = new URL(path, 'http://x');
  for (const r of routes) {
    const m = r.method === method && pathname.match(r.re);
    if (!m) continue;
    const me = currentMember(token);
    if (r.auth && !me) throw new HttpError(401, 'Please sign in');
    const result = await r.handler(body || {}, me, m.groups || {}, token);
    if (method !== 'GET') save();
    return clone(result);
  }
  throw new HttpError(404, 'Not found');
}
