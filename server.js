'use strict';
// Community App server: zero-dependency Node.js (22.13+) HTTP server with built-in SQLite.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const PUBLIC_DIR = path.join(__dirname, 'public');
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;

const CATEGORIES = ['Event', 'Facilities', 'Safety', 'Volunteering', 'Fundraising', 'General'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const ISSUE_STATUSES = ['open', 'in_progress', 'closed'];
const TASK_STATUSES = ['open', 'in_progress', 'completed', 'closed'];

// ---------------------------------------------------------------- database
fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(path.join(DATA_DIR, 'community.db'));
db.exec(`
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    name TEXT NOT NULL,
    email TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL DEFAULT '',
    bio TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    location TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL DEFAULT '#6366f1',
    pass_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    expires INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS issues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'General',
    priority TEXT NOT NULL DEFAULT 'medium',
    status TEXT NOT NULL DEFAULT 'open',
    due_date TEXT,
    owner_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    issue_id INTEGER NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    owner_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'open',
    duration REAL NOT NULL DEFAULT 1,
    due_date TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS task_deps (
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    depends_on_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, depends_on_id)
  );
  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    issue_id INTEGER NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id INTEGER,
    issue_id INTEGER,
    summary TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

const nowIso = () => new Date().toISOString();

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return { salt, hash: crypto.scryptSync(password, salt, 64).toString('hex') };
}
function verifyPassword(password, salt, hash) {
  const a = Buffer.from(hashPassword(password, salt).hash, 'hex');
  const b = Buffer.from(hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function logActivity(memberId, action, entityType, entityId, issueId, summary, at = nowIso()) {
  db.prepare(`INSERT INTO activity (member_id, action, entity_type, entity_id, issue_id, summary, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)`).run(memberId, action, entityType, entityId, issueId, summary, at);
}

// ---------------------------------------------------------------- seed data
function seed() {
  if (db.prepare('SELECT COUNT(*) AS n FROM members').get().n > 0) return;
  const day = 86400000;
  const ago = (d, h = 0) => new Date(Date.now() - d * day - h * 3600000).toISOString();
  const ahead = (d) => new Date(Date.now() + d * day).toISOString().slice(0, 10);

  const people = [
    ['susan', 'Susan Miller', 'Community Organizer', '#8b5cf6', 'Brings neighbors together one event at a time.', 'Maple Street'],
    ['joey', 'Joey Carter', 'Events Volunteer', '#f59e0b', 'Pizza enthusiast and weekend volunteer.', 'Oak Avenue'],
    ['sam', 'Sam Patel', 'Safety Coordinator', '#10b981', 'Keeps the neighborhood safe and organized.', 'Birch Lane'],
    ['lisa', 'Lisa Chen', 'Facilities Lead', '#ec4899', 'Gardener, planner, spreadsheet lover.', 'Cedar Court'],
    ['george', 'George Brooks', 'Fundraising Chair', '#06b6d4', 'Always happy to bring the snacks.', 'Pine Road'],
  ];
  const ids = {};
  for (const [u, name, title, color, bio, loc] of people) {
    const { salt, hash } = hashPassword('community123');
    ids[u] = Number(db.prepare(`INSERT INTO members (username, name, email, title, bio, phone, location, color, pass_hash, salt, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(u, name, `${u}@community.example`, title, bio, '', loc, color, hash, salt, ago(30)).lastInsertRowid);
  }

  const addIssue = (owner, title, description, category, priority, status, due, createdDaysAgo) => {
    const at = ago(createdDaysAgo);
    const id = Number(db.prepare(`INSERT INTO issues (title, description, category, priority, status, due_date, owner_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(title, description, category, priority, status, due, ids[owner], at, at).lastInsertRowid);
    logActivity(ids[owner], 'created', 'issue', id, id, `created issue “${title}”`, at);
    return id;
  };
  const addTask = (issueId, owner, title, status, duration, deps = [], daysAgo = 1, notes = '') => {
    const at = ago(daysAgo, Math.random() * 10);
    const id = Number(db.prepare(`INSERT INTO tasks (issue_id, title, notes, owner_id, status, duration, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(issueId, title, notes, ids[owner], status, duration, at, at).lastInsertRowid);
    for (const d of deps) db.prepare('INSERT INTO task_deps (task_id, depends_on_id) VALUES (?, ?)').run(id, d);
    logActivity(ids[owner], 'volunteered', 'task', id, issueId, `volunteered: “${title}”`, at);
    if (status === 'completed') logActivity(ids[owner], 'completed', 'task', id, issueId, `completed “${title}”`, ago(Math.max(0, daysAgo - 1)));
    return id;
  };
  const addComment = (issueId, who, body, daysAgo) =>
    db.prepare('INSERT INTO comments (issue_id, member_id, body, created_at) VALUES (?, ?, ?, ?)').run(issueId, ids[who], body, ago(daysAgo, Math.random() * 5));

  const potluck = addIssue('susan', 'Potluck Lunch',
    'Let’s get together for a community potluck lunch at the community hall! Everyone brings something to share. Volunteer a dish below so we don’t end up with five bowls of chips.',
    'Event', 'high', 'open', ahead(10), 6);
  const invites = addTask(potluck, 'susan', 'Send invitations & collect headcount', 'completed', 1, [], 6);
  const hall = addTask(potluck, 'susan', 'Book the community hall', 'completed', 1, [], 6);
  addTask(potluck, 'joey', 'I will bring pizza', 'open', 2, [invites], 5, 'Planning 4 large pizzas: 2 cheese, 1 veggie, 1 pepperoni.');
  addTask(potluck, 'sam', 'I will bring lunch', 'in_progress', 3, [invites], 4, 'Pasta salad and sandwiches.');
  addTask(potluck, 'george', 'I will bring chips', 'completed', 1, [invites], 4);
  addTask(potluck, 'lisa', 'Set up tables & decorations', 'open', 2, [hall], 3);
  addComment(potluck, 'susan', 'Headcount is at 24 so far. Thanks everyone for volunteering!', 4);
  addComment(potluck, 'joey', 'Pizza is covered 🍕 — any dietary restrictions I should know about?', 3);
  addComment(potluck, 'lisa', 'One gluten-free guest, I’ll message you the details.', 2);

  const garden = addIssue('lisa', 'Community Garden Cleanup',
    'Spring cleanup of the shared garden beds: clear debris, add fresh mulch, and plant seedlings.',
    'Facilities', 'medium', 'in_progress', ahead(14), 12);
  const dumpster = addTask(garden, 'sam', 'Rent a dumpster', 'completed', 1, [], 11);
  const shifts = addTask(garden, 'george', 'Organize volunteer shifts', 'in_progress', 2, [], 10);
  const mulch = addTask(garden, 'lisa', 'Buy mulch & seedlings', 'open', 3, [], 9);
  const clear = addTask(garden, 'susan', 'Clear debris from beds', 'open', 4, [dumpster, shifts], 8);
  addTask(garden, 'joey', 'Plant seedlings', 'open', 2, [clear, mulch], 7);
  addComment(garden, 'george', 'Shifts sheet is shared — Saturday morning is filling up fast.', 5);

  const watch = addIssue('sam', 'Neighborhood Watch Schedule',
    'We need a rota for evening walks and a point of contact with the local police liaison.',
    'Safety', 'critical', 'open', ahead(5), 4);
  const rota = addTask(watch, 'lisa', 'Draft patrol rota', 'in_progress', 2, [], 3);
  addTask(watch, 'susan', 'Contact police liaison', 'open', 1, [], 2);
  addTask(watch, 'sam', 'Share rota with all members', 'open', 1, [rota], 1);

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
}
seed();

// ---------------------------------------------------------------- live updates (SSE)
const sseClients = new Set();
function broadcast(event) {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of sseClients) res.write(payload);
}
setInterval(() => { for (const res of sseClients) res.write(': ping\n\n'); }, 25000).unref();

// ---------------------------------------------------------------- http helpers
class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function sendJson(res, status, data, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > 1e6) { reject(new HttpError(413, 'Request too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(new HttpError(400, 'Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

function parseCookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

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

const PUBLIC_MEMBER_COLS = 'id, username, name, email, title, bio, phone, location, color, created_at';

// Token auth (Authorization: Bearer) so the frontend can live on another origin, e.g. GitHub Pages.
// EventSource cannot send headers, so the live-update stream alone accepts ?token=.
function requestToken(req, allowQuery = false) {
  const h = req.headers.authorization || '';
  if (h.startsWith('Bearer ')) return h.slice(7).trim();
  if (allowQuery) return new URL(req.url, 'http://x').searchParams.get('token');
  return null;
}

function clientIp(req) {
  return (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress;
}

function currentMember(req, allowQuery = false) {
  const token = requestToken(req, allowQuery);
  if (!token) return null;
  const row = db.prepare(`SELECT m.${PUBLIC_MEMBER_COLS.split(', ').join(', m.')}, s.expires FROM sessions s
    JOIN members m ON m.id = s.member_id WHERE s.token = ?`).get(token);
  if (!row) return null;
  if (row.expires < Date.now()) { db.prepare('DELETE FROM sessions WHERE token = ?').run(token); return null; }
  delete row.expires;
  return row;
}

function startSession(memberId) {
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare('DELETE FROM sessions WHERE expires < ?').run(Date.now());
  db.prepare('INSERT INTO sessions (token, member_id, expires) VALUES (?, ?, ?)').run(token, memberId, Date.now() + SESSION_MS);
  return token;
}

const loginAttempts = new Map();
function rateLimit(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip) || { count: 0, reset: now + 10 * 60000 };
  if (now > entry.reset) { entry.count = 0; entry.reset = now + 10 * 60000; }
  entry.count++;
  loginAttempts.set(ip, entry);
  if (entry.count > 20) throw new HttpError(429, 'Too many attempts. Try again in a few minutes.');
}

function getIssue(id) {
  const issue = db.prepare('SELECT * FROM issues WHERE id = ?').get(id);
  if (!issue) throw new HttpError(404, 'Issue not found');
  return issue;
}
function getTask(id) {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!task) throw new HttpError(404, 'Task not found');
  return task;
}
function requireOwner(row, me, what) {
  if (row.owner_id !== me.id) throw new HttpError(403, `Only the owner can update this ${what}`);
}

// Validates dependency ids (same issue, not self) and rejects cycles.
function setDependencies(task, dependsOn) {
  if (dependsOn === undefined) return;
  if (!Array.isArray(dependsOn)) throw new HttpError(400, 'depends_on must be a list');
  const ids = [...new Set(dependsOn.map(Number))];
  const sameIssue = new Set(db.prepare('SELECT id FROM tasks WHERE issue_id = ?').all(task.issue_id).map((r) => r.id));
  for (const id of ids) {
    if (id === task.id) throw new HttpError(400, 'A task cannot depend on itself');
    if (!sameIssue.has(id)) throw new HttpError(400, 'Dependencies must be tasks in the same issue');
  }
  const edges = new Map();
  for (const r of db.prepare(`SELECT d.task_id, d.depends_on_id FROM task_deps d JOIN tasks t ON t.id = d.task_id
                              WHERE t.issue_id = ? AND d.task_id != ?`).all(task.issue_id, task.id)) {
    if (!edges.has(r.task_id)) edges.set(r.task_id, []);
    edges.get(r.task_id).push(r.depends_on_id);
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
  db.prepare('DELETE FROM task_deps WHERE task_id = ?').run(task.id);
  for (const id of ids) db.prepare('INSERT INTO task_deps (task_id, depends_on_id) VALUES (?, ?)').run(task.id, id);
}

function changed(me, summary, extra = {}) {
  broadcast({ type: 'change', by: me.id, byName: me.name, summary, ...extra });
}

// ---------------------------------------------------------------- routes
const routes = [];
const route = (method, pattern, handler, { auth = true, queryToken = false } = {}) =>
  routes.push({ method, re: new RegExp(`^${pattern.replace(/:(\w+)/g, '(?<$1>\\d+)')}$`), handler, auth, queryToken });

route('POST', '/api/auth/login', async (req, res) => {
  rateLimit(clientIp(req));
  const body = await readBody(req);
  const username = text(body.username, 'Username', { required: true, min: 1, max: 40 });
  const password = text(body.password, 'Password', { required: true, min: 1, max: 200 });
  const m = db.prepare('SELECT * FROM members WHERE username = ?').get(username);
  if (!m || !verifyPassword(password, m.salt, m.pass_hash)) throw new HttpError(401, 'Incorrect username or password');
  sendJson(res, 200, { ok: true, token: startSession(m.id) });
}, { auth: false });

route('POST', '/api/auth/register', async (req, res) => {
  rateLimit(clientIp(req));
  const body = await readBody(req);
  const username = text(body.username, 'Username', { required: true, min: 3, max: 24 }).toLowerCase();
  if (!/^[a-z0-9_.]+$/.test(username)) throw new HttpError(400, 'Username can only contain letters, numbers, dots and underscores');
  const name = text(body.name, 'Full name', { required: true, min: 2, max: 60 });
  const email = text(body.email, 'Email', { max: 120 }) || '';
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Email looks invalid');
  const password = text(body.password, 'Password', { required: true, min: 8, max: 200 });
  if (db.prepare('SELECT 1 FROM members WHERE username = ?').get(username)) throw new HttpError(409, 'That username is taken');
  const palette = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#ef4444', '#84cc16'];
  const { salt, hash } = hashPassword(password);
  const id = Number(db.prepare(`INSERT INTO members (username, name, email, color, pass_hash, salt, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(username, name, email, palette[Math.floor(Math.random() * palette.length)], hash, salt, nowIso()).lastInsertRowid);
  logActivity(id, 'joined', 'member', id, null, 'joined the community');
  changed({ id, name }, `${name} joined the community`);
  sendJson(res, 201, { ok: true, token: startSession(id) });
}, { auth: false });

route('POST', '/api/auth/logout', async (req, res) => {
  const token = requestToken(req);
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  sendJson(res, 200, { ok: true });
}, { auth: false });

route('GET', '/api/health', async (req, res) => sendJson(res, 200, { ok: true, time: nowIso() }), { auth: false });

route('GET', '/api/me', async (req, res, me) => sendJson(res, 200, me));

route('GET', '/api/events', async (req, res, me) => {
  if (!me) throw new HttpError(401, 'Please sign in');
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
  res.write('retry: 5000\n\n');
  sseClients.add(res);
  req.on('close', () => sseClients.delete(res));
}, { auth: false, queryToken: true });

// Everything a logged-in member can see: the community is small, so one payload keeps the client simple.
route('GET', '/api/bootstrap', async (req, res, me) => {
  sendJson(res, 200, {
    me,
    members: db.prepare(`SELECT ${PUBLIC_MEMBER_COLS} FROM members ORDER BY name`).all(),
    issues: db.prepare(`SELECT i.*, (SELECT COUNT(*) FROM comments c WHERE c.issue_id = i.id) AS comment_count
                        FROM issues i ORDER BY i.updated_at DESC`).all(),
    tasks: db.prepare('SELECT * FROM tasks ORDER BY created_at').all(),
    deps: db.prepare('SELECT * FROM task_deps').all(),
  });
});

route('GET', '/api/activity', async (req, res) => {
  const limit = Math.min(500, Math.max(1, Number(new URL(req.url, 'http://x').searchParams.get('limit')) || 50));
  sendJson(res, 200, db.prepare('SELECT * FROM activity ORDER BY created_at DESC, id DESC LIMIT ?').all(limit));
});

route('PUT', '/api/members/:id', async (req, res, me, p) => {
  if (Number(p.id) !== me.id) throw new HttpError(403, 'You can only update your own profile');
  const b = await readBody(req);
  const fields = {
    name: text(b.name, 'Full name', { min: 2, max: 60 }),
    email: text(b.email, 'Email', { max: 120 }),
    title: text(b.title, 'Title', { max: 80 }),
    bio: text(b.bio, 'Bio', { max: 500 }),
    phone: text(b.phone, 'Phone', { max: 40 }),
    location: text(b.location, 'Location', { max: 80 }),
    color: text(b.color, 'Color', { max: 7 }),
  };
  if (fields.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) throw new HttpError(400, 'Email looks invalid');
  if (fields.color && !/^#[0-9a-fA-F]{6}$/.test(fields.color)) throw new HttpError(400, 'Color must be a hex value like #6366f1');
  const sets = Object.entries(fields).filter(([, v]) => v !== undefined);
  if (sets.length) db.prepare(`UPDATE members SET ${sets.map(([k]) => `${k} = ?`).join(', ')} WHERE id = ?`).run(...sets.map(([, v]) => v), me.id);
  logActivity(me.id, 'updated', 'member', me.id, null, 'updated their profile');
  changed(me, `${me.name} updated their profile`);
  sendJson(res, 200, db.prepare(`SELECT ${PUBLIC_MEMBER_COLS} FROM members WHERE id = ?`).get(me.id));
});

route('PUT', '/api/me/password', async (req, res, me) => {
  const b = await readBody(req);
  const current = text(b.current, 'Current password', { required: true, min: 1, max: 200 });
  const next = text(b.next, 'New password', { required: true, min: 8, max: 200 });
  const row = db.prepare('SELECT salt, pass_hash FROM members WHERE id = ?').get(me.id);
  if (!verifyPassword(current, row.salt, row.pass_hash)) throw new HttpError(400, 'Current password is incorrect');
  const { salt, hash } = hashPassword(next);
  db.prepare('UPDATE members SET salt = ?, pass_hash = ? WHERE id = ?').run(salt, hash, me.id);
  sendJson(res, 200, { ok: true });
});

route('POST', '/api/issues', async (req, res, me) => {
  const b = await readBody(req);
  const at = nowIso();
  const title = text(b.title, 'Title', { required: true, min: 3, max: 120 });
  const r = db.prepare(`INSERT INTO issues (title, description, category, priority, status, due_date, owner_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'open', ?, ?, ?, ?)`).run(
    title, text(b.description, 'Description', { max: 4000 }) || '',
    oneOf(b.category, 'Category', CATEGORIES) || 'General', oneOf(b.priority, 'Priority', PRIORITIES) || 'medium',
    dateOrNull(b.due_date, 'Due date') ?? null, me.id, at, at);
  const id = Number(r.lastInsertRowid);
  logActivity(me.id, 'created', 'issue', id, id, `created issue “${title}”`);
  changed(me, `${me.name} created “${title}”`, { issueId: id });
  sendJson(res, 201, getIssue(id));
});

route('PUT', '/api/issues/:id', async (req, res, me, p) => {
  const issue = getIssue(p.id);
  requireOwner(issue, me, 'issue');
  const b = await readBody(req);
  const fields = {
    title: text(b.title, 'Title', { min: 3, max: 120 }),
    description: text(b.description, 'Description', { max: 4000 }),
    category: oneOf(b.category, 'Category', CATEGORIES),
    priority: oneOf(b.priority, 'Priority', PRIORITIES),
    status: oneOf(b.status, 'Status', ISSUE_STATUSES),
    due_date: dateOrNull(b.due_date, 'Due date'),
  };
  const sets = Object.entries(fields).filter(([, v]) => v !== undefined);
  db.prepare(`UPDATE issues SET ${[...sets.map(([k]) => `${k} = ?`), 'updated_at = ?'].join(', ')} WHERE id = ?`)
    .run(...sets.map(([, v]) => v), nowIso(), issue.id);
  const updated = getIssue(issue.id);
  const action = fields.status && fields.status !== issue.status
    ? (fields.status === 'closed' ? 'closed' : fields.status === 'open' && issue.status === 'closed' ? 'reopened' : 'updated') : 'updated';
  logActivity(me.id, action, 'issue', issue.id, issue.id, `${action} issue “${updated.title}”`);
  changed(me, `${me.name} ${action} “${updated.title}”`, { issueId: issue.id });
  sendJson(res, 200, updated);
});

route('DELETE', '/api/issues/:id', async (req, res, me, p) => {
  const issue = getIssue(p.id);
  requireOwner(issue, me, 'issue');
  db.prepare('DELETE FROM issues WHERE id = ?').run(issue.id);
  logActivity(me.id, 'deleted', 'issue', issue.id, null, `deleted issue “${issue.title}”`);
  changed(me, `${me.name} deleted “${issue.title}”`);
  sendJson(res, 200, { ok: true });
});

route('POST', '/api/issues/:id/tasks', async (req, res, me, p) => {
  const issue = getIssue(p.id);
  if (issue.status === 'closed') throw new HttpError(409, 'This issue is closed and no longer accepts tasks');
  const b = await readBody(req);
  const at = nowIso();
  const title = text(b.title, 'Task', { required: true, min: 2, max: 140 });
  const r = db.prepare(`INSERT INTO tasks (issue_id, title, notes, owner_id, status, duration, due_date, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'open', ?, ?, ?, ?)`).run(issue.id, title, text(b.notes, 'Notes', { max: 1000 }) || '', me.id,
    numberIn(b.duration, 'Duration', 0, 999) ?? 1, dateOrNull(b.due_date, 'Due date') ?? null, at, at);
  const task = getTask(Number(r.lastInsertRowid));
  setDependencies(task, b.depends_on);
  db.prepare('UPDATE issues SET updated_at = ? WHERE id = ?').run(at, issue.id);
  logActivity(me.id, 'volunteered', 'task', task.id, issue.id, `volunteered: “${title}”`);
  changed(me, `${me.name} volunteered: “${title}”`, { issueId: issue.id });
  sendJson(res, 201, task);
});

route('PUT', '/api/tasks/:id', async (req, res, me, p) => {
  const task = getTask(p.id);
  requireOwner(task, me, 'task');
  const b = await readBody(req);
  const fields = {
    title: text(b.title, 'Task', { min: 2, max: 140 }),
    notes: text(b.notes, 'Notes', { max: 1000 }),
    status: oneOf(b.status, 'Status', TASK_STATUSES),
    duration: numberIn(b.duration, 'Duration', 0, 999),
    due_date: dateOrNull(b.due_date, 'Due date'),
  };
  const sets = Object.entries(fields).filter(([, v]) => v !== undefined);
  db.prepare(`UPDATE tasks SET ${[...sets.map(([k]) => `${k} = ?`), 'updated_at = ?'].join(', ')} WHERE id = ?`)
    .run(...sets.map(([, v]) => v), nowIso(), task.id);
  setDependencies(task, b.depends_on);
  db.prepare('UPDATE issues SET updated_at = ? WHERE id = ?').run(nowIso(), task.issue_id);
  const updated = getTask(task.id);
  const action = fields.status && fields.status !== task.status
    ? ({ completed: 'completed', closed: 'closed', open: 'reopened', in_progress: 'started' })[fields.status] : 'updated';
  logActivity(me.id, action, 'task', task.id, task.issue_id, `${action} “${updated.title}”`);
  changed(me, `${me.name} ${action} “${updated.title}”`, { issueId: task.issue_id });
  sendJson(res, 200, updated);
});

route('DELETE', '/api/tasks/:id', async (req, res, me, p) => {
  const task = getTask(p.id);
  requireOwner(task, me, 'task');
  db.prepare('DELETE FROM tasks WHERE id = ?').run(task.id);
  logActivity(me.id, 'withdrew', 'task', task.id, task.issue_id, `withdrew from “${task.title}”`);
  changed(me, `${me.name} withdrew from “${task.title}”`, { issueId: task.issue_id });
  sendJson(res, 200, { ok: true });
});

route('GET', '/api/issues/:id/comments', async (req, res, me, p) => {
  getIssue(p.id);
  sendJson(res, 200, db.prepare('SELECT * FROM comments WHERE issue_id = ? ORDER BY created_at').all(p.id));
});

route('POST', '/api/issues/:id/comments', async (req, res, me, p) => {
  const issue = getIssue(p.id);
  const b = await readBody(req);
  const body = text(b.body, 'Comment', { required: true, min: 1, max: 2000 });
  const r = db.prepare('INSERT INTO comments (issue_id, member_id, body, created_at) VALUES (?, ?, ?, ?)').run(issue.id, me.id, body, nowIso());
  logActivity(me.id, 'commented', 'issue', issue.id, issue.id, `commented on “${issue.title}”`);
  changed(me, `${me.name} commented on “${issue.title}”`, { issueId: issue.id });
  sendJson(res, 201, db.prepare('SELECT * FROM comments WHERE id = ?').get(r.lastInsertRowid));
});

route('DELETE', '/api/comments/:id', async (req, res, me, p) => {
  const c = db.prepare('SELECT * FROM comments WHERE id = ?').get(p.id);
  if (!c) throw new HttpError(404, 'Comment not found');
  if (c.member_id !== me.id) throw new HttpError(403, 'You can only delete your own comments');
  db.prepare('DELETE FROM comments WHERE id = ?').run(c.id);
  changed(me, `${me.name} deleted a comment`, { issueId: c.issue_id });
  sendJson(res, 200, { ok: true });
});

// ---------------------------------------------------------------- static files
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json',
};
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'",
};

function serveStatic(req, res) {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = path.normalize(path.join(PUBLIC_DIR, urlPath));
  if (!file.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end(); }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(PUBLIC_DIR, 'index.html');
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache', ...SECURITY_HEADERS });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://x');
  if (!pathname.startsWith('/api/')) return serveStatic(req, res);
  // Bearer tokens (not cookies) carry auth, so allowing any origin does not expose sessions.
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Requested-With',
      'Access-Control-Max-Age': '86400',
    });
    return res.end();
  }
  try {
    // Mutating requests must come from our own pages (CSRF defence in addition to SameSite cookies).
    if (req.method !== 'GET' && req.headers['x-requested-with'] !== 'community-app') throw new HttpError(403, 'Forbidden');
    for (const r of routes) {
      const m = r.method === req.method && pathname.match(r.re);
      if (!m) continue;
      const me = currentMember(req, r.queryToken);
      if (r.auth && !me) throw new HttpError(401, 'Please sign in');
      return await r.handler(req, res, me, m.groups || {});
    }
    throw new HttpError(404, 'Not found');
  } catch (err) {
    if (!(err instanceof HttpError)) console.error(err);
    if (!res.headersSent) sendJson(res, err.status || 500, { error: err instanceof HttpError ? err.message : 'Something went wrong' });
  }
});

server.listen(PORT, '0.0.0.0', () => console.log(`Community App running at http://localhost:${PORT}`));
