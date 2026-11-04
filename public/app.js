import { API_BASE } from './config.js';
import { Galaxy, fibonacciSphere } from './js/galaxy.js';
import { computeCPM, renderGraph } from './js/graph.js';

// ====================================================================== constants
const CATEGORIES = ['Event', 'Facilities', 'Safety', 'Volunteering', 'Fundraising', 'General'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const ISSUE_STATUSES = ['open', 'in_progress', 'closed'];
const TASK_STATUSES = ['open', 'in_progress', 'completed', 'closed'];
const STATUS_LABEL = { open: 'Open', in_progress: 'In progress', completed: 'Completed', closed: 'Closed' };
const STATUS_COLOR = { open: '#3987e5', in_progress: '#fab219', completed: '#0ca30c', closed: '#8a8fa3' };
const PRIO_LABEL = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' };
const PRIO_COLOR = { low: '#8a8fa3', medium: '#3987e5', high: '#ec835a', critical: '#d03b3b' };
const PRIO_RANK = { critical: 0, high: 1, medium: 2, low: 3 };
const DEMO = [
  ['susan', 'Susan Miller', '#8b5cf6'], ['joey', 'Joey Carter', '#f59e0b'], ['sam', 'Sam Patel', '#10b981'],
  ['lisa', 'Lisa Chen', '#ec4899'], ['george', 'George Brooks', '#06b6d4'],
];
const DEMO_PASSWORD = 'community123';

// ====================================================================== icons
const ICONS = {
  logo: '<circle cx="12" cy="5" r="2.6"/><circle cx="5" cy="17.5" r="2.6"/><circle cx="19" cy="17.5" r="2.6"/><path d="M10.7 7.3 6.3 15.2M13.3 7.3l4.4 7.9M7.6 17.5h8.8"/>',
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  issues: '<rect x="4" y="4" width="16" height="17" rx="2"/><path d="M9 2.5h6v3H9zM8.5 11h7M8.5 15h5"/>',
  check: '<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  tick: '<path d="M20 6 9 17l-5-5"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  orbit: '<circle cx="12" cy="12" r="3"/><ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(-30 12 12)"/><circle cx="20.2" cy="7.6" r="1.4"/>',
  activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  chevR: '<path d="m9 18 6-6-6-6"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  board: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18"/>',
  table: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>',
  flag: '<path d="M4 22V4M4 4h13l-2 4 2 4H4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  pin: '<path d="M12 22s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z"/><circle cx="12" cy="10" r="2.5"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
  alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"/>',
  network: '<circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="12" r="2.5"/><path d="M8.5 6H12a3 3 0 0 1 3 3v1M8.5 18H12a3 3 0 0 0 3-3v-1"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.3-9.3M16 7l3 3M19 4l2 2"/>',
  rotate: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  hand: '<path d="M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v6M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-6-2.4l-3.6-3.6a2 2 0 0 1 2.8-2.8L7 15"/>',
  pie: '<path d="M21 12A9 9 0 1 1 12 3v9z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/>',
  bars: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  star: '<path d="m12 3 2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  dollar: '<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  wrench: '<path d="M14.7 6.3a4 4 0 0 0 5 5L22 14l-8 8-2.3-2.3a4 4 0 0 0-5-5L2 10l8-8z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>',
  zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17h.01"/>',
};
const CAT_ICON = { Event: 'star', Facilities: 'wrench', Safety: 'shield', Volunteering: 'hand', Fundraising: 'dollar', General: 'message' };
const icon = (name, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;

// ====================================================================== utils
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const initials = (name = '?') => name.split(/\s+/).map((s) => s[0]).join('').slice(0, 2).toUpperCase();
const firstName = (name = '') => name.split(' ')[0];
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const fmtDate = (d) => (d ? new Date(d.length === 10 ? d + 'T00:00:00' : d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: new Date(d).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined }) : '');
function relTime(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 45) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.round(s / 86400)}d ago`;
  return fmtDate(iso);
}
function dueInfo(due, closed) {
  if (!due) return null;
  const days = Math.round((new Date(due + 'T00:00:00') - new Date(todayStr() + 'T00:00:00')) / 86400000);
  const overdue = days < 0 && !closed;
  const label = days === 0 ? 'Due today' : days === 1 ? 'Due tomorrow' : days > 1 && days < 14 ? `Due in ${days}d` : days < 0 ? `${overdue ? 'Overdue' : 'Was due'} · ${fmtDate(due)}` : `Due ${fmtDate(due)}`;
  return { days, overdue, label };
}
const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

// ====================================================================== state
const state = {
  token: localStorage.getItem('ca_token'),
  me: null, members: [], issues: [], tasks: [], deps: [], activity: [],
  comments: {},
  filters: { q: '', status: 'active', category: '', priority: '', owner: '', mine: false, view: localStorage.getItem('ca_view') || 'cards', sort: 'updated_at', dir: -1 },
  issueTab: 'tasks',
  galaxyCam: null, galaxyAuto: true, galaxyMine: false,
  authMode: 'login',
  cleanup: [],
  stale: false,
  lastViewKey: '',
  live: false,
};
const memberById = () => new Map(state.members.map((m) => [m.id, m]));
const issueById = (id) => state.issues.find((i) => i.id === Number(id));
const tasksOf = (issueId) => state.tasks.filter((t) => t.issue_id === issueId);
function issueStats(issue) {
  const ts = tasksOf(issue.id);
  const live = ts.filter((t) => t.status !== 'closed');
  const done = live.filter((t) => t.status === 'completed').length;
  const prog = live.filter((t) => t.status === 'in_progress').length;
  const pct = live.length ? Math.round((done / live.length) * 100) : issue.status === 'closed' ? 100 : 0;
  const people = [...new Set([issue.owner_id, ...ts.map((t) => t.owner_id)])];
  return { tasks: ts, total: live.length, done, prog, pct, people };
}

// ====================================================================== api
async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'X-Requested-With': 'community-app' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  let res;
  try {
    res = await fetch(API_BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new Error('Cannot reach the server. Check your connection and try again.');
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && path !== '/api/auth/login') { signOutLocal(); throw new Error(data.error || 'Please sign in'); }
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

async function loadAll() {
  const [boot, activity] = await Promise.all([api('/api/bootstrap'), api('/api/activity?limit=200')]);
  Object.assign(state, boot, { activity });
}

let refreshTimer = null;
function scheduleRefresh(issueId) {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(async () => {
    try {
      await loadAll();
      if (issueId && state.comments[issueId]) state.comments[issueId] = await api(`/api/issues/${issueId}/comments`);
      safeRerender();
    } catch { /* surfaced elsewhere */ }
  }, 250);
}

// Re-render unless the user is in the middle of typing or has a dialog open.
function safeRerender() {
  const a = document.activeElement;
  const typing = a && a.closest?.('#view') && a.matches('input, textarea, select') && (a.value || '').length > 0 && !a.closest('.toolbar');
  if (typing || $('.overlay-bg')) { state.stale = true; return; }
  state.stale = false;
  renderShellBits();
  renderView();
}
document.addEventListener('focusout', () => setTimeout(() => { if (state.stale) safeRerender(); }, 150));

// live updates (server-sent events)
let es = null;
function connectLive() {
  es?.close();
  if (!state.token) return;
  es = new EventSource(`${API_BASE}/api/events?token=${encodeURIComponent(state.token)}`);
  es.onopen = () => setLive(true);
  es.onerror = () => setLive(false);
  es.onmessage = (e) => {
    let ev; try { ev = JSON.parse(e.data); } catch { return; }
    if (ev.type !== 'change' || !state.me) return;
    if (ev.by !== state.me.id) { toast(ev.summary, 'live'); scheduleRefresh(ev.issueId); }
  };
}
function setLive(on) { state.live = on; const el = $('#live'); if (el) { el.classList.toggle('on', on); el.lastElementChild.textContent = on ? 'Live sync on' : 'Reconnecting…'; } }

// ====================================================================== toasts & modals
function toast(msg, kind = 'ok', action) {
  const el = document.createElement('div');
  el.className = `toast ${kind === 'err' ? 'err' : kind === 'ok' ? 'ok' : ''}`;
  el.innerHTML = `${icon(kind === 'err' ? 'alert' : kind === 'live' ? 'zap' : 'tick')}<span>${esc(msg)}</span>${action ? `<button type="button" class="toast-btn">${esc(action.label)}</button>` : ''}`;
  if (action) $('.toast-btn', el).addEventListener('click', () => { el.remove(); action.run(); });
  $('#toasts').append(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, action ? 7000 : kind === 'err' ? 5200 : 3400);
}

function closeModal() {
  $('.overlay-bg')?.remove();
  if (state.stale) safeRerender();
}

// Opens a form dialog. onSubmit receives FormData; throw to show an error inline.
function openModal({ title, body, submit = 'Save', danger = false, onSubmit, wide = false, cancel = true }) {
  closeModal();
  const bg = document.createElement('div');
  bg.className = 'overlay-bg';
  bg.innerHTML = `<form class="modal" style="${wide ? 'max-width:680px' : ''}" novalidate>
    <header><h3>${esc(title)}</h3><button type="button" class="btn ghost icon" data-close aria-label="Close">${icon('x')}</button></header>
    <div class="m-body"><div class="form-error" hidden></div>${body}</div>
    <footer>${cancel ? '<button type="button" class="btn ghost" data-close>Cancel</button>' : ''}<button class="btn ${danger ? 'danger' : 'primary'}" type="submit">${esc(submit)}</button></footer>
  </form>`;
  document.body.append(bg);
  const form = $('form', bg);
  bg.addEventListener('mousedown', (e) => { if (e.target === bg) closeModal(); });
  $$('[data-close]', bg).forEach((b) => b.addEventListener('click', closeModal));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('button[type=submit]', form);
    btn.disabled = true;
    try { await onSubmit(new FormData(form), form); closeModal(); }
    catch (err) { const box = $('.form-error', form); box.hidden = false; box.textContent = err.message; }
    finally { btn.disabled = false; }
  });
  setTimeout(() => $('input:not([type=hidden]):not([type=checkbox]), textarea', form)?.focus(), 30);
  return form;
}

function confirmModal(title, message, action, label = 'Delete') {
  openModal({ title, body: `<p class="text-2" style="margin:0 0 14px">${message}</p>`, submit: label, danger: true, onSubmit: action });
}

// ====================================================================== components
function avatar(m, size = '') {
  if (!m) return `<span class="av ${size}">?</span>`;
  return `<span class="av ${size}" style="--c:${esc(m.color)}" title="${esc(m.name)}">${esc(initials(m.name))}</span>`;
}
const statusBadge = (s) => `<span class="badge status st-${s}"><span class="dot"></span>${STATUS_LABEL[s]}</span>`;
const prioBadge = (p) => `<span class="badge prio pr-${p}">${icon('flag')}${PRIO_LABEL[p]}</span>`;
const catBadge = (c) => `<span class="badge cat">${icon(CAT_ICON[c] || 'message')}${esc(c)}</span>`;
function dueBadge(due, closed) {
  const d = dueInfo(due, closed);
  if (!d) return '';
  return `<span class="badge ${d.overdue ? 'overdue' : ''}">${icon('calendar')}${esc(d.label)}</span>`;
}
function avatarStack(ids, max = 4) {
  const mm = memberById();
  const shown = ids.slice(0, max).map((id) => avatar(mm.get(id), 'xs')).join('');
  return `<span class="stack">${shown}${ids.length > max ? `<span class="more">+${ids.length - max}</span>` : ''}</span>`;
}
function progressBar(st) {
  if (!st.total) return '<div class="progress"></div>';
  return `<div class="progress" title="${st.done} completed, ${st.prog} in progress, ${st.total - st.done - st.prog} open">
    ${st.done ? `<span class="done" style="width:${(st.done / st.total) * 100}%"></span>` : ''}
    ${st.prog ? `<span class="prog" style="width:${(st.prog / st.total) * 100}%"></span>` : ''}</div>`;
}
function statusSeg(kind, id, current, statuses, enabled, ownerName) {
  return `<div class="seg status" role="group" aria-label="Status"${enabled ? '' : ` title="Only ${esc(ownerName)} can change this"`}>${statuses.map((s) =>
    `<button type="button" class="st-${s} ${s === current ? 'on' : ''}" data-act="${kind}-status" data-id="${id}" data-status="${s}" ${enabled ? '' : 'disabled'} aria-pressed="${s === current}"><span class="dot"></span>${STATUS_LABEL[s]}</button>`).join('')}</div>`;
}
function doneSwitch(t, enabled) {
  return `<label class="switch" title="${enabled ? (t.status === 'completed' ? 'Mark as open' : 'Mark as completed') : 'Only the task owner can change this'}">
    <input type="checkbox" data-act="task-toggle" data-id="${t.id}" ${t.status === 'completed' ? 'checked' : ''} ${enabled ? '' : 'disabled'} aria-label="Completed"><span class="track"></span></label>`;
}

function statusSelect(t) {
  return `<select class="status-select st-${t.status}" data-change="task-status" data-id="${t.id}" aria-label="Task status" title="Change status">${TASK_STATUSES.map((s) =>
    `<option value="${s}" ${s === t.status ? 'selected' : ''}>${STATUS_LABEL[s]}</option>`).join('')}</select>`;
}

const IDEAS = {
  Event: ['I will bring dessert', 'I will bring drinks', 'I can help set up', 'I can help clean up'],
  Facilities: ['I can bring tools', 'I can help on Saturday', 'I can pick up supplies'],
  Safety: ['I can take an evening shift', 'I can make flyers', 'I can share the schedule'],
  Volunteering: ['I can drive', 'I can sort donations', 'I can help on the day'],
  Fundraising: ['I can bake something', 'I can share it online', 'I can donate'],
  General: ['I can help', 'I can spread the word'],
};
function quickVolunteer(issue) {
  const ideas = IDEAS[issue.category] || IDEAS.General;
  return `<form class="quick-add" id="quick-volunteer" autocomplete="off">
    <label class="qa-label" for="qv-input">${icon('hand')}Want to help? Tell everyone what you'll bring or do.</label>
    <div class="qa-row">${avatar(state.me, 'sm')}<input class="input" id="qv-input" name="title" maxlength="140" placeholder="e.g. ${esc(ideas[0])}"><button class="btn primary" type="submit">Volunteer</button></div>
    <div class="qa-ideas"><span class="muted small">Quick ideas:</span>${ideas.map((i) => `<button type="button" class="idea" data-idea="${esc(i)}">${esc(i)}</button>`).join('')}
      <button type="button" class="btn ghost sm" data-act="task-new" data-issue="${issue.id}" style="margin-left:auto">More options</button></div>
  </form>`;
}

const STEPS = [
  ['search', 'Find an issue', 'Open Issues to see what your neighbors need help with.'],
  ['hand', 'Volunteer', 'Open an issue, type what you will bring or do, and press Volunteer.'],
  ['check', 'Update your tasks', 'Flip the switch when you are done. You can only change your own items.'],
];
const stepsHtml = () => `<div class="steps">${STEPS.map(([ic, t, d], k) => `<div class="step"><div class="step-ic">${icon(ic)}<span>${k + 1}</span></div><div><b>${t}</b><p>${d}</p></div></div>`).join('')}</div>`;
function introCard() {
  if (localStorage.getItem('ca_intro_done')) return '';
  return `<section class="panel intro" id="intro">
    <div class="row" style="justify-content:space-between;align-items:flex-start"><div><div class="eyebrow">Getting started</div><h3>How Community App works</h3></div>
      <button class="btn ghost icon sm" data-act="intro-dismiss" aria-label="Hide this">${icon('x')}</button></div>
    ${stepsHtml()}
    <div class="row" style="margin-top:16px"><a class="btn primary sm" href="#/issues">${icon('issues')}Browse issues</a><button class="btn ghost sm" data-act="intro-dismiss">Got it, hide this</button></div>
  </section>`;
}
function openHelp() {
  openModal({
    title: 'How it works', submit: 'Got it', cancel: false, onSubmit: async () => {},
    body: `${stepsHtml()}<hr class="sep"><div class="small text-2" style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px">
      <span>${icon('lock')} A lock means only the owner can change that item. You can still see everything.</span>
      <span>${icon('plus')} Need help with something? Press <b>New issue</b> in the sidebar.</span>
      <span>${icon('search')} Press <kbd>Ctrl</kbd> + <kbd>K</kbd> to search anything.</span></div>`,
  });
}

function issueCard(issue, { drag = false } = {}) {
  const mm = memberById();
  const owner = mm.get(issue.owner_id);
  const st = issueStats(issue);
  const mine = issue.owner_id === state.me.id;
  return `<article class="panel issue-card tilt pr-${issue.priority}" data-href="#/issues/${issue.id}" data-issue="${issue.id}" ${drag && mine ? 'draggable="true"' : ''}>
    <div class="glare"></div>
    <div class="row wrap" style="gap:6px">${statusBadge(issue.status)}${prioBadge(issue.priority)}${mine ? '<span class="mine-tag">Yours</span>' : ''}</div>
    <h3>${esc(issue.title)}</h3>
    ${issue.description ? `<p class="desc">${esc(issue.description)}</p>` : ''}
    <div>${progressBar(st)}<div class="row small muted" style="margin-top:6px;justify-content:space-between"><span>${st.done}/${st.total} tasks done</span><span>${st.pct}%</span></div></div>
    <div class="foot">${avatar(owner, 'xs')}<span class="text-2">${esc(firstName(owner?.name))}</span>
      <span>${icon(CAT_ICON[issue.category])}${esc(issue.category)}</span>
      <span>${icon('message')}${issue.comment_count}</span>
      <span style="margin-left:auto">${avatarStack(st.people.filter((p) => p !== issue.owner_id), 3)}</span></div>
    ${issue.due_date && issue.status !== 'closed' ? `<div>${dueBadge(issue.due_date, issue.status === 'closed')}</div>` : ''}
  </article>`;
}

function taskRow(t, { showIssue = false } = {}) {
  const mm = memberById();
  const owner = mm.get(t.owner_id);
  const mine = t.owner_id === state.me.id;
  const issue = issueById(t.issue_id);
  const depNames = state.deps.filter((d) => d.task_id === t.id).map((d) => state.tasks.find((x) => x.id === d.depends_on_id)?.title).filter(Boolean);
  return `<div class="task ${mine ? 'is-mine' : ''} ${t.status === 'completed' || t.status === 'closed' ? 'done' : ''}">
    ${doneSwitch(t, mine)}
    <div style="min-width:0">
      <div class="title">${esc(t.title)}</div>
      ${t.notes ? `<div class="notes">${esc(t.notes)}</div>` : ''}
      <div class="sub">
        <span>${avatar(owner, 'xs')} ${esc(owner?.name)}${mine ? ' (you)' : ''}</span>
        ${showIssue && issue ? `<a href="#/issues/${issue.id}" class="text-2">${icon('issues')}${esc(issue.title)}</a>` : ''}
        <span>${icon('clock')}${t.duration} day${t.duration === 1 ? '' : 's'}</span>
        ${t.due_date ? `<span>${icon('calendar')}${esc(dueInfo(t.due_date, ['completed', 'closed'].includes(t.status)).label)}</span>` : ''}
        ${depNames.length ? `<span title="Starts after: ${esc(depNames.join(', '))}">${icon('network')}After ${esc(depNames.length === 1 ? depNames[0] : plural(depNames.length, 'task'))}</span>` : ''}
      </div>
    </div>
    <div class="actions">
      ${mine ? `${statusSelect(t)}
        <button class="btn ghost icon sm" data-act="task-edit" data-id="${t.id}" title="Edit task" aria-label="Edit task">${icon('edit')}</button>
        <button class="btn ghost icon sm danger" data-act="task-delete" data-id="${t.id}" title="Withdraw from task" aria-label="Delete task">${icon('trash')}</button>`
        : `${statusBadge(t.status)}<span class="lock-note" title="Only ${esc(owner?.name)} can update this task">${icon('lock')}</span>`}
    </div>
  </div>`;
}

function activityItem(a) {
  const m = memberById().get(a.member_id);
  const issue = a.issue_id ? issueById(a.issue_id) : null;
  return `<div class="feed-item">${avatar(m, 'sm')}
    <div class="body"><b>${esc(m?.name ?? 'Someone')}</b> ${esc(a.summary)}
      ${issue && a.entity_type === 'task' ? ` in <a href="#/issues/${issue.id}">${esc(issue.title)}</a>` : ''}
      ${issue && a.entity_type === 'issue' && a.action !== 'deleted' ? ` · <a href="#/issues/${issue.id}">View</a>` : ''}
      <time datetime="${esc(a.created_at)}" title="${esc(new Date(a.created_at).toLocaleString())}">${relTime(a.created_at)}</time></div></div>`;
}

// ====================================================================== galaxy data
const hash = (n) => { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); };
function galaxyScene() {
  const nodes = [], links = [];
  const mm = memberById();
  const pts = fibonacciSphere(state.members.length, 330);
  const mpos = new Map();
  state.members.forEach((m, i) => {
    const p = pts[i];
    mpos.set(m.id, p);
    const nTasks = state.tasks.filter((t) => t.owner_id === m.id).length;
    nodes.push({ id: `m${m.id}`, kind: 'member', ...p, r: 15 + Math.min(9, nTasks * 1.2), color: m.color, label: firstName(m.name), data: m });
  });
  state.issues.forEach((iss) => {
    const ts = tasksOf(iss.id);
    let x = 0, y = 0, z = 0;
    const add = (id, w) => { const p = mpos.get(id); if (p) { x += p.x * w; y += p.y * w; z += p.z * w; } };
    add(iss.owner_id, 3);
    ts.forEach((t) => add(t.owner_id, 1));
    const len = Math.hypot(x, y, z) || 1;
    const r = 150 + hash(iss.id) * 50;
    const jitter = (k) => (hash(iss.id * 7 + k) - 0.5) * 70;
    nodes.push({ id: `i${iss.id}`, kind: 'issue', x: (x / len) * r + jitter(1), y: (y / len) * r * 0.8 + jitter(2), z: (z / len) * r + jitter(3),
      r: 9 + Math.min(7, ts.length), color: iss.status === 'closed' ? '#8a8fa3' : PRIO_COLOR[iss.priority], ring: true,
      label: iss.title.length > 22 ? iss.title.slice(0, 21) + '…' : iss.title, data: iss });
    links.push({ a: `m${iss.owner_id}`, b: `i${iss.id}`, color: mm.get(iss.owner_id)?.color || '#7c6cff', width: 1.8, alpha: 0.6 });
    ts.forEach((t, k) => {
      nodes.push({ id: `t${t.id}`, kind: 'task', r: 4.6, color: STATUS_COLOR[t.status], glow: true, data: t,
        orbit: { parent: `i${iss.id}`, radius: 34 + (k % 3) * 9, speed: 0.25 + hash(t.id) * 0.35, phase: (k / Math.max(1, ts.length)) * Math.PI * 2, tilt: 0.5 + hash(t.id * 3) * 0.9, spin: hash(iss.id * 5) * 2 } });
      links.push({ a: `t${t.id}`, b: `i${iss.id}`, color: STATUS_COLOR[t.status], width: 0.9, alpha: 0.5 });
      links.push({ a: `m${t.owner_id}`, b: `t${t.id}`, color: mm.get(t.owner_id)?.color || '#7c6cff', width: 0.7, alpha: 0.17, dash: true });
    });
  });
  return { nodes, links };
}
function mineIds() {
  const ids = new Set([`m${state.me.id}`]);
  state.issues.filter((i) => i.owner_id === state.me.id).forEach((i) => { ids.add(`i${i.id}`); tasksOf(i.id).forEach((t) => ids.add(`t${t.id}`)); });
  state.tasks.filter((t) => t.owner_id === state.me.id).forEach((t) => { ids.add(`t${t.id}`); ids.add(`i${t.issue_id}`); });
  return ids;
}
function galaxyTooltip(node, mouse) {
  const tip = $('#tooltip');
  if (!node || !mouse) { tip.hidden = true; return; }
  const mm = memberById();
  const d = node.data;
  let html = '';
  if (node.kind === 'member') {
    const tasks = state.tasks.filter((t) => t.owner_id === d.id);
    html = `<b>${esc(d.name)}</b><span>${esc(d.title || 'Member')}</span><br><span>${plural(state.issues.filter((i) => i.owner_id === d.id).length, 'issue')} · ${plural(tasks.length, 'task')} · ${tasks.filter((t) => t.status === 'completed').length} completed</span>`;
  } else if (node.kind === 'issue') {
    const st = issueStats(d);
    html = `<b>${esc(d.title)}</b><span>${STATUS_LABEL[d.status]} · ${PRIO_LABEL[d.priority]} priority · by ${esc(firstName(mm.get(d.owner_id)?.name))}</span><br><span>${st.done}/${st.total} tasks done (${st.pct}%)</span>`;
  } else {
    html = `<b>${esc(d.title)}</b><span>${esc(mm.get(d.owner_id)?.name)} · ${STATUS_LABEL[d.status]}</span><br><span>${esc(issueById(d.issue_id)?.title)}</span>`;
  }
  tip.innerHTML = html;
  tip.hidden = false;
  const x = Math.min(window.innerWidth - 280, mouse.cx + 16);
  tip.style.left = `${x}px`;
  tip.style.top = `${mouse.cy + 16}px`;
}
function galaxyClick(node) {
  const d = node.data;
  location.hash = node.kind === 'member' ? `#/members/${d.id}` : node.kind === 'issue' ? `#/issues/${d.id}` : `#/issues/${d.issue_id}`;
}
function mountGalaxy(canvas, extra = {}) {
  const g = new Galaxy(canvas, { onHover: galaxyTooltip, onClick: galaxyClick, camera: state.galaxyCam, ...extra });
  const { nodes, links } = galaxyScene();
  g.setData(nodes, links);
  state.cleanup.push(() => { state.galaxyCam = g.camera; g.destroy(); $('#tooltip').hidden = true; });
  return g;
}

// ====================================================================== auth screen
function renderAuth() {
  runCleanup();
  const login = state.authMode === 'login';
  $('#root').innerHTML = `<div class="auth">
    <section class="auth-hero">
      <canvas id="auth-canvas" aria-hidden="true"></canvas>
      <div class="brand"><span class="brand-mark">${icon('logo')}</span><div>Community App<small>Members · Issues · Tasks</small></div></div>
      <div>
        <div class="eyebrow">Neighborhood operations platform</div>
        <h1>Where your community <span class="grad-text">gets things done.</span></h1>
        <p>Raise issues, volunteer for tasks and watch progress live, from potluck lunches to playground fundraisers.</p>
        <div class="auth-feats"><span>3D community galaxy</span><span>Live sync</span><span>Owner-only edits</span><span>Critical-path planning</span><span>Kanban board</span></div>
      </div>
      <div class="muted small">© ${new Date().getFullYear()} Community App</div>
    </section>
    <section class="auth-side">
      <div class="auth-card">
        <h2>${login ? 'Welcome back' : 'Join your community'}</h2>
        <p class="sub">${login ? 'Sign in to see issues and update your tasks.' : 'Create an account to raise issues and volunteer.'}</p>
        <div class="tabs-pill" role="tablist"><button type="button" class="${login ? 'on' : ''}" data-mode="login" role="tab" aria-selected="${login}">Sign in</button><button type="button" class="${login ? '' : 'on'}" data-mode="register" role="tab" aria-selected="${!login}">Create account</button></div>
        <form id="auth-form" novalidate>
          <div class="form-error" hidden></div>
          ${login ? '' : `<div class="field"><label for="f-name">Full name</label><input class="input" id="f-name" name="name" autocomplete="name" required></div>`}
          <div class="field"><label for="f-user">Username</label><input class="input" id="f-user" name="username" autocomplete="username" required></div>
          ${login ? '' : `<div class="field"><label for="f-email">Email <span class="muted">(optional)</span></label><input class="input" id="f-email" name="email" type="email" autocomplete="email"></div>`}
          <div class="field"><label for="f-pass">Password</label><input class="input" id="f-pass" name="password" type="password" autocomplete="${login ? 'current-password' : 'new-password'}" required>${login ? '' : '<span class="hint">At least 8 characters.</span>'}</div>
          <button class="btn primary block" type="submit">${login ? 'Sign in' : 'Create account'}</button>
        </form>
        ${login ? `<div class="demo"><div class="demo-label"><span>Try a demo account</span><span>password <code>${DEMO_PASSWORD}</code></span></div>
          <div class="demo-list">${DEMO.map(([u, n, c]) => `<button type="button" data-demo="${u}">${avatar({ name: n, color: c }, 'xs')}${esc(firstName(n))}</button>`).join('')}</div></div>` : ''}
      </div>
    </section>
  </div>`;

  // decorative 3D network
  const g = new Galaxy($('#auth-canvas'), { labels: false, zoom: 0.95, starCount: 300, offsetX: 0.2 });
  const pts = fibonacciSphere(26, 300);
  const colors = ['#8b5cf6', '#f59e0b', '#10b981', '#ec4899', '#06b6d4', '#3987e5'];
  const nodes = pts.map((p, i) => ({ id: `n${i}`, kind: i < 6 ? 'member' : 'issue', ...p, r: i < 6 ? 16 : 7 + (i % 4), color: colors[i % colors.length], ring: i >= 6 && i % 3 === 0 }));
  for (let i = 0; i < 18; i++) nodes.push({ id: `t${i}`, kind: 'task', r: 4, color: colors[i % 4], orbit: { parent: `n${6 + (i % 20)}`, radius: 30, speed: 0.4 + (i % 5) * 0.08, phase: i, tilt: 0.7, spin: i * 0.4 } });
  const links = [];
  pts.forEach((p, i) => {
    const near = pts.map((q, j) => [j, Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z)]).filter(([j]) => j !== i).sort((a, b) => a[1] - b[1]).slice(0, 2);
    near.forEach(([j]) => { if (i < j) links.push({ a: `n${i}`, b: `n${j}`, color: colors[i % colors.length], alpha: 0.35, width: 1.2 }); });
  });
  g.setData(nodes, links);
  state.cleanup.push(() => g.destroy());

  $$('[data-mode]').forEach((b) => b.addEventListener('click', () => { state.authMode = b.dataset.mode; renderAuth(); }));
  $$('[data-demo]').forEach((b) => b.addEventListener('click', () => {
    $('#f-user').value = b.dataset.demo;
    $('#f-pass').value = DEMO_PASSWORD;
    $('#auth-form').requestSubmit();
  }));
  $('#auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target));
    const btn = $('button[type=submit]', e.target);
    const box = $('.form-error', e.target);
    btn.disabled = true;
    btn.textContent = 'Please wait…';
    try {
      const r = await api(login ? '/api/auth/login' : '/api/auth/register', { method: 'POST', body: fd });
      state.token = r.token;
      localStorage.setItem('ca_token', r.token);
      if (!location.hash || location.hash === '#/') location.hash = '#/dashboard';
      await boot();
      toast(login ? `Signed in as ${state.me.name}` : `Welcome to the community, ${firstName(state.me.name)}!`);
    } catch (err) {
      box.hidden = false;
      box.textContent = err.message;
      btn.disabled = false;
      btn.textContent = login ? 'Sign in' : 'Create account';
    }
  });
  setTimeout(() => $('#f-user, #f-name')?.focus(), 50);
}

// ====================================================================== shell
const NAV = [
  ['dashboard', 'Dashboard', 'home'],
  ['issues', 'Issues', 'issues'],
  ['my-work', 'My work', 'check'],
  ['members', 'Members', 'users'],
  ['galaxy', 'Community galaxy', 'orbit'],
  ['activity', 'Activity', 'activity'],
];
function renderShell() {
  $('#root').innerHTML = `<div class="shell" id="shell">
    <aside class="sidebar">
      <a class="brand" href="#/dashboard"><span class="brand-mark">${icon('logo')}</span><div>Community App<small>Members · Issues · Tasks</small></div></a>
      <nav class="nav" id="nav" aria-label="Main"></nav>
      <div class="side-foot">
        <button class="btn ghost block sm" data-act="help">${icon('help')}How it works</button>
        <button class="btn primary block" data-act="issue-new">${icon('plus')}New issue</button>
        <div class="live" id="live"><i></i><span>Connecting…</span></div>
        <div class="me-card" id="me-card"></div>
      </div>
    </aside>
    <div class="main">
      <header class="topbar">
        <button class="btn ghost icon menu-btn" data-act="menu" aria-label="Open menu">${icon('menu')}</button>
        <button class="search-btn" data-act="palette">${icon('search')}<span>Search issues, tasks, people…</span><kbd>Ctrl K</kbd></button>
        <div class="spacer"></div>
        <a class="btn ghost sm" href="#/my-work" title="Your open tasks">${icon('check')}<span id="my-open-count"></span></a>
      </header>
      <main class="view" id="view" tabindex="-1"></main>
    </div>
  </div>`;
  renderShellBits();
  setLive(state.live);
}
function renderShellBits() {
  const nav = $('#nav');
  if (!nav) return;
  const route = parseRoute();
  const myOpen = state.tasks.filter((t) => t.owner_id === state.me.id && ['open', 'in_progress'].includes(t.status)).length;
  const counts = { issues: state.issues.filter((i) => i.status !== 'closed').length, 'my-work': myOpen, members: state.members.length };
  nav.innerHTML = `<div class="nav-title">Workspace</div>${NAV.map(([k, label, ic]) =>
    `<a href="#/${k}" class="${route.page === k || (k === 'issues' && route.page === 'issue') || (k === 'members' && route.page === 'member') ? 'on' : ''}" ${route.page === k ? 'aria-current="page"' : ''}>${icon(ic)}${label}${counts[k] ? `<span class="count">${counts[k]}</span>` : ''}</a>`).join('')}`;
  $('#me-card').innerHTML = `${avatar(state.me, 'sm')}<a class="who" href="#/members/${state.me.id}"><b>${esc(state.me.name)}</b><span>@${esc(state.me.username)}</span></a>
    <button class="btn ghost icon sm" data-act="logout" title="Sign out" aria-label="Sign out">${icon('logout')}</button>`;
  $('#my-open-count').textContent = `${myOpen} open`;
}

// ====================================================================== routing
function parseRoute() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const page = parts[0] || 'dashboard';
  if (page === 'issues' && parts[1]) return { page: 'issue', id: Number(parts[1]) };
  if (page === 'members' && parts[1]) return { page: 'member', id: Number(parts[1]) };
  return { page };
}
function runCleanup() { state.cleanup.splice(0).forEach((fn) => { try { fn(); } catch { /* ignore */ } }); }

const VIEWS = {};
function renderView() {
  const view = $('#view');
  if (!view) return;
  runCleanup();
  const route = parseRoute();
  const fn = VIEWS[route.page] || VIEWS.dashboard;
  const key = location.hash;
  const fresh = key !== state.lastViewKey;
  state.lastViewKey = key;
  const scroll = window.scrollY;
  fn(view, route);
  if (fresh) { window.scrollTo(0, 0); view.style.animation = 'none'; void view.offsetWidth; view.style.animation = ''; countUp(view); }
  else { window.scrollTo(0, scroll); view.style.animation = 'none'; }
  $('#shell')?.classList.remove('nav-open');
}
window.addEventListener('hashchange', () => { if (state.me) { renderShellBits(); renderView(); } });

function countUp(root) {
  $$('[data-count]', root).forEach((el) => {
    const target = Number(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / 900);
      el.textContent = Math.round(target * (1 - Math.pow(1 - k, 3))) + suffix;
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

// ====================================================================== dashboard
VIEWS.dashboard = (view) => {
  const me = state.me;
  const activeIssues = state.issues.filter((i) => i.status !== 'closed');
  const liveTasks = state.tasks.filter((t) => t.status !== 'closed');
  const done = liveTasks.filter((t) => t.status === 'completed').length;
  const rate = liveTasks.length ? Math.round((done / liveTasks.length) * 100) : 0;
  const weekAgo = Date.now() - 7 * 86400000;
  const activeMembers = new Set(state.activity.filter((a) => new Date(a.created_at) > weekAgo).map((a) => a.member_id)).size;
  const myTasks = state.tasks.filter((t) => t.owner_id === me.id && ['open', 'in_progress'].includes(t.status));
  const attention = activeIssues.slice().sort((a, b) => (PRIO_RANK[a.priority] - PRIO_RANK[b.priority]) || ((a.due_date || '9') < (b.due_date || '9') ? -1 : 1)).slice(0, 5);
  const counts = Object.fromEntries(TASK_STATUSES.map((s) => [s, state.tasks.filter((t) => t.status === s).length]));
  const totalTasks = state.tasks.length || 1;
  const byCat = CATEGORIES.map((c) => [c, state.issues.filter((i) => i.category === c).length]).filter(([, n]) => n).sort((a, b) => b[1] - a[1]);
  const maxCat = Math.max(1, ...byCat.map(([, n]) => n));

  const kpi = (ic, val, label, sub, color, suffix = '') => `<div class="panel kpi tilt" style="--kc:${color};--kc-bg:color-mix(in srgb, ${color} 16%, transparent);--kc-glow:color-mix(in srgb, ${color} 22%, transparent)">
    <div class="glare"></div><div class="k-ic">${icon(ic)}</div><div class="k-val" data-count="${val}" data-suffix="${suffix}">${val}${suffix}</div><div class="k-lab">${label}</div><div class="k-sub">${sub}</div></div>`;

  view.innerHTML = `${introCard()}
  <div class="hero-dash">
    <div class="panel hero-card">
      <canvas id="dash-galaxy" aria-label="3D view of members, issues and tasks"></canvas>
      <div class="overlay">
        <div class="eyebrow">${new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
        <h2>${greeting()}, ${esc(firstName(me.name))}</h2>
        <p>${myTasks.length ? `You have ${plural(myTasks.length, 'open task')} across the community.` : 'You are all caught up. Find an issue to help with!'}</p>
      </div>
      <a class="btn sm corner" href="#/galaxy">${icon('orbit')}Explore the galaxy</a>
    </div>
    <div class="kpis">
      ${kpi('issues', activeIssues.length, 'Active issues', `${activeIssues.filter((i) => i.priority === 'critical').length} critical · ${activeIssues.filter((i) => dueInfo(i.due_date)?.overdue).length} overdue`, '#7c6cff')}
      ${kpi('check', liveTasks.filter((t) => t.status !== 'completed').length, 'Tasks in flight', `${counts.in_progress} in progress`, '#fab219')}
      ${kpi('target', rate, 'Completion rate', `${done} of ${liveTasks.length} tasks completed`, '#0ca30c', '%')}
      ${kpi('users', state.members.length, 'Members', `${activeMembers} active this week`, '#22d3ee')}
    </div>
  </div>
  <div class="dash-grid">
    <div class="col">
      <section class="panel">
        <div class="panel-head"><h3>${icon('check')}My tasks</h3><a class="btn ghost sm" href="#/my-work">View all ${icon('chevR')}</a></div>
        ${myTasks.length ? `<div class="list">${myTasks.slice(0, 5).map((t) => taskRow(t, { showIssue: true })).join('')}</div>` : `<div class="empty">${icon('tick')}<div>No open tasks. Browse <a href="#/issues" class="grad-text">issues</a> and volunteer.</div></div>`}
      </section>
      <section class="panel">
        <div class="panel-head"><h3>${icon('alert')}Needs attention</h3><a class="btn ghost sm" href="#/issues">All issues ${icon('chevR')}</a></div>
        <div class="list">${attention.map((i) => {
          const st = issueStats(i);
          return `<a class="li" href="#/issues/${i.id}">${avatar(memberById().get(i.owner_id), 'sm')}
            <div class="grow"><div class="t">${esc(i.title)}</div><div class="s">${esc(i.category)} · ${st.done}/${st.total} tasks done</div></div>
            ${dueBadge(i.due_date, false)}${prioBadge(i.priority)}</a>`;
        }).join('') || '<div class="empty">Nothing urgent right now.</div>'}</div>
      </section>
    </div>
    <div class="col">
      <section class="panel">
        <div class="panel-head"><h3>${icon('pie')}Task status</h3><span class="muted small">${state.tasks.length} tasks</span></div>
        <div class="panel-body">
          <div class="seg-bar" role="img" aria-label="${TASK_STATUSES.map((s) => `${STATUS_LABEL[s]} ${counts[s]}`).join(', ')}">
            ${TASK_STATUSES.filter((s) => counts[s]).map((s) => `<span style="width:${(counts[s] / totalTasks) * 100}%;background:${STATUS_COLOR[s]}" title="${STATUS_LABEL[s]}: ${counts[s]} (${Math.round((counts[s] / totalTasks) * 100)}%)"></span>`).join('')}
          </div>
          <div class="legend">${TASK_STATUSES.map((s) => `<div><i style="background:${STATUS_COLOR[s]}"></i>${STATUS_LABEL[s]}<b>${counts[s]}</b></div>`).join('')}</div>
        </div>
      </section>
      <section class="panel">
        <div class="panel-head"><h3>${icon('bars')}Issues by category</h3></div>
        <div class="panel-body bars">${byCat.map(([c, n]) => `<div class="bar-row" title="${esc(c)}: ${plural(n, 'issue')}"><span>${esc(c)}</span><div class="track"><div class="fill" style="width:${(n / maxCat) * 100}%"></div></div><b>${n}</b></div>`).join('')}</div>
      </section>
      <section class="panel">
        <div class="panel-head"><h3>${icon('activity')}Recent activity</h3><a class="btn ghost sm" href="#/activity">All ${icon('chevR')}</a></div>
        <div class="feed" style="padding:6px 0">${state.activity.slice(0, 7).map(activityItem).join('')}</div>
      </section>
    </div>
  </div>`;
  mountGalaxy($('#dash-galaxy'), { zoom: 1.2, starCount: 160, offsetX: 0.22, labels: 'members' });
};

// ====================================================================== issues list
function filteredIssues() {
  const f = state.filters;
  const q = f.q.trim().toLowerCase();
  const mm = memberById();
  let list = state.issues.filter((i) => {
    if (f.status === 'active' && i.status === 'closed') return false;
    if (!['all', 'active'].includes(f.status) && i.status !== f.status) return false;
    if (f.category && i.category !== f.category) return false;
    if (f.priority && i.priority !== f.priority) return false;
    if (f.owner && i.owner_id !== Number(f.owner)) return false;
    if (f.mine && i.owner_id !== state.me.id && !tasksOf(i.id).some((t) => t.owner_id === state.me.id)) return false;
    if (q && !`${i.title} ${i.description} ${mm.get(i.owner_id)?.name} ${tasksOf(i.id).map((t) => t.title).join(' ')}`.toLowerCase().includes(q)) return false;
    return true;
  });
  const key = f.sort;
  const val = (i) => key === 'owner' ? mm.get(i.owner_id)?.name : key === 'priority' ? -PRIO_RANK[i.priority] : key === 'progress' ? issueStats(i).pct : key === 'due_date' ? (i.due_date || '9999') : i[key];
  list.sort((a, b) => { const x = val(a), y = val(b); return (x < y ? -1 : x > y ? 1 : 0) * f.dir; });
  return list;
}

VIEWS.issues = (view) => {
  const f = state.filters;
  const opt = (v, label, cur) => `<option value="${esc(v)}" ${String(cur) === String(v) ? 'selected' : ''}>${esc(label)}</option>`;
  view.innerHTML = `
    <div class="page-head"><div><div class="eyebrow">Workspace</div><h1>Issues</h1><p>Everything the community is working on. Anyone can volunteer, and only owners can edit.</p></div>
      <div class="row"><button class="btn" data-act="export">${icon('download')}Export CSV</button><button class="btn primary" data-act="issue-new">${icon('plus')}New issue</button></div></div>
    <div class="toolbar">
      <div class="input-ic">${icon('search')}<input class="input sm" id="f-q" placeholder="Search issues and tasks…" value="${esc(f.q)}" aria-label="Search issues"></div>
      <div class="seg" role="group" aria-label="Status filter">${[['active', 'Active'], ['open', 'Open'], ['in_progress', 'In progress'], ['closed', 'Closed'], ['all', 'All']].map(([v, l]) => `<button type="button" data-filter-status="${v}" class="${f.status === v ? 'on' : ''}">${l}</button>`).join('')}</div>
      <select class="select sm" data-filter="category" aria-label="Category">${opt('', 'All categories', f.category)}${CATEGORIES.map((c) => opt(c, c, f.category)).join('')}</select>
      <select class="select sm" data-filter="priority" aria-label="Priority">${opt('', 'Any priority', f.priority)}${PRIORITIES.map((p) => opt(p, PRIO_LABEL[p], f.priority)).join('')}</select>
      <select class="select sm" data-filter="owner" aria-label="Owner">${opt('', 'Any owner', f.owner)}${state.members.map((m) => opt(m.id, m.name, f.owner)).join('')}</select>
      <label class="chip-toggle"><span class="switch"><input type="checkbox" id="f-mine" ${f.mine ? 'checked' : ''}><span class="track"></span></span>Only issues I'm in</label>
      <div class="spacer grow"></div>
      <div class="seg" role="group" aria-label="Layout">${[['cards', 'grid', 'Cards'], ['board', 'board', 'Board'], ['table', 'table', 'Table']].map(([v, ic, l]) => `<button type="button" data-layout="${v}" class="${f.view === v ? 'on' : ''}" title="${l}">${icon(ic)}${l}</button>`).join('')}</div>
    </div>
    <div id="issue-results"></div>`;
  renderIssueResults();
  $('#f-q').addEventListener('input', (e) => { f.q = e.target.value; renderIssueResults(); });
  $('#f-mine').addEventListener('change', (e) => { f.mine = e.target.checked; renderIssueResults(); });
  $$('[data-filter]', view).forEach((s) => s.addEventListener('change', () => { f[s.dataset.filter] = s.value; renderIssueResults(); }));
  $$('[data-filter-status]', view).forEach((b) => b.addEventListener('click', () => { f.status = b.dataset.filterStatus; $$('[data-filter-status]').forEach((x) => x.classList.toggle('on', x === b)); renderIssueResults(); }));
  $$('[data-layout]', view).forEach((b) => b.addEventListener('click', () => { f.view = b.dataset.layout; localStorage.setItem('ca_view', f.view); $$('[data-layout]').forEach((x) => x.classList.toggle('on', x === b)); renderIssueResults(); }));
};

function renderIssueResults() {
  const box = $('#issue-results');
  if (!box) return;
  const f = state.filters;
  const list = filteredIssues();
  if (f.view === 'board') {
    const source = list;
    box.innerHTML = `<p class="small muted" style="margin:-6px 0 14px">${icon('lock')} Drag your own issues between columns to change their status.</p><div class="board">${ISSUE_STATUSES.map((s) => {
      const col = (f.status === 'active' && s === 'closed') ? state.issues.filter((i) => i.status === 'closed' && filteredIssuesIgnoringStatus(i)) : source.filter((i) => i.status === s);
      return `<div class="board-col st-${s}" data-col="${s}"><h4><span class="dot"></span>${STATUS_LABEL[s]}<span class="n">${col.length}</span></h4>${col.map((i) => issueCard(i, { drag: true })).join('') || '<div class="empty small">No issues</div>'}</div>`;
    }).join('')}</div>`;
    bindBoard(box);
    return;
  }
  if (!list.length) { box.innerHTML = `<div class="panel empty">${icon('search')}<div>No issues match these filters.</div></div>`; return; }
  if (f.view === 'table') {
    const mm = memberById();
    const th = (k, l) => `<th data-sort="${k}" aria-sort="${f.sort === k ? (f.dir > 0 ? 'ascending' : 'descending') : 'none'}">${l}${f.sort === k ? (f.dir > 0 ? ' ↑' : ' ↓') : ''}</th>`;
    box.innerHTML = `<div class="panel tbl-wrap"><table class="tbl"><thead><tr>${th('title', 'Issue')}${th('status', 'Status')}${th('priority', 'Priority')}${th('category', 'Category')}${th('owner', 'Owner')}${th('progress', 'Progress')}${th('due_date', 'Due')}${th('updated_at', 'Updated')}</tr></thead>
      <tbody>${list.map((i) => { const st = issueStats(i); const o = mm.get(i.owner_id); return `<tr data-href="#/issues/${i.id}">
        <td><b>${esc(i.title)}</b>${i.owner_id === state.me.id ? ' <span class="mine-tag">Yours</span>' : ''}</td><td>${statusBadge(i.status)}</td><td>${prioBadge(i.priority)}</td><td class="text-2">${esc(i.category)}</td>
        <td><span class="row">${avatar(o, 'xs')}${esc(o?.name)}</span></td><td style="min-width:130px">${progressBar(st)}<span class="small muted">${st.done}/${st.total} · ${st.pct}%</span></td>
        <td>${i.due_date ? dueBadge(i.due_date, i.status === 'closed') : '<span class="muted">—</span>'}</td><td class="muted small">${relTime(i.updated_at)}</td></tr>`; }).join('')}</tbody></table></div>`;
    $$('[data-sort]', box).forEach((h) => h.addEventListener('click', () => { const k = h.dataset.sort; f.dir = f.sort === k ? -f.dir : (k === 'title' || k === 'owner' ? 1 : -1); f.sort = k; renderIssueResults(); }));
    return;
  }
  box.innerHTML = `<div class="issue-grid">${list.map((i) => issueCard(i)).join('')}</div>`;
}
function filteredIssuesIgnoringStatus(issue) {
  const saved = state.filters.status;
  state.filters.status = 'all';
  const ok = filteredIssues().includes(issue);
  state.filters.status = saved;
  return ok;
}
function bindBoard(box) {
  let dragId = null;
  $$('.issue-card[draggable="true"]', box).forEach((c) => {
    c.addEventListener('dragstart', (e) => { dragId = Number(c.dataset.issue); c.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(dragId)); });
    c.addEventListener('dragend', () => { c.classList.remove('dragging'); $$('.board-col', box).forEach((x) => x.classList.remove('drop')); });
  });
  $$('.board-col', box).forEach((col) => {
    col.addEventListener('dragover', (e) => { if (dragId) { e.preventDefault(); col.classList.add('drop'); } });
    col.addEventListener('dragleave', () => col.classList.remove('drop'));
    col.addEventListener('drop', (e) => {
      e.preventDefault();
      col.classList.remove('drop');
      const issue = issueById(dragId);
      dragId = null;
      if (issue && issue.status !== col.dataset.col) setIssueStatus(issue.id, col.dataset.col);
    });
  });
}

function exportCsv() {
  const mm = memberById();
  const rows = [['ID', 'Title', 'Category', 'Priority', 'Status', 'Owner', 'Due date', 'Tasks', 'Completed', 'Progress %', 'Created']];
  for (const i of filteredIssues()) {
    const st = issueStats(i);
    rows.push([i.id, i.title, i.category, PRIO_LABEL[i.priority], STATUS_LABEL[i.status], mm.get(i.owner_id)?.name, i.due_date || '', st.total, st.done, st.pct, i.created_at.slice(0, 10)]);
  }
  const csv = rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' }));
  a.download = `community-issues-${todayStr()}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast(`Exported ${plural(rows.length - 1, 'issue')}`);
}

// ====================================================================== issue detail
VIEWS.issue = (view, { id }) => {
  const issue = issueById(id);
  if (!issue) { view.innerHTML = `<div class="panel empty">${icon('alert')}<div>This issue does not exist or was deleted.</div><p><a class="btn" href="#/issues">Back to issues</a></p></div>`; return; }
  const mm = memberById();
  const owner = mm.get(issue.owner_id);
  const mine = issue.owner_id === state.me.id;
  const st = issueStats(issue);
  const tasks = st.tasks.slice().sort((a, b) => TASK_STATUSES.indexOf(a.status) - TASK_STATUSES.indexOf(b.status) || a.id - b.id);
  const comments = state.comments[issue.id];
  if (!comments) api(`/api/issues/${issue.id}/comments`).then((c) => { state.comments[issue.id] = c; if (parseRoute().id === issue.id) safeRerender(); }).catch(() => {});
  const tab = state.issueTab;
  const issueActivity = state.activity.filter((a) => a.issue_id === issue.id).slice(0, 6);

  let tabBody = '';
  if (tab === 'tasks') {
    tabBody = `${issue.status === 'closed' ? `<div class="volunteer top">${icon('lock')} This issue is closed and no longer accepts volunteers.</div>` : quickVolunteer(issue)}
      ${tasks.length ? tasks.map((t) => taskRow(t)).join('') : `<div class="empty">${icon('hand')}<div>No one has volunteered yet. Be the first!</div></div>`}`;
  } else if (tab === 'network') {
    const cpm = computeCPM(st.tasks, state.deps);
    const chain = cpm.chain.map((tid) => st.tasks.find((t) => t.id === tid)?.title).filter(Boolean);
    tabBody = st.tasks.length ? `<div class="cp-summary">
        <div><b>${cpm.total} days</b>Planned duration</div><div><b>${cpm.remaining} days</b>Remaining on the critical path</div>
        <div class="grow" style="min-width:240px"><span class="small muted">Critical path</span><div class="text-2">${chain.map(esc).join(' → ') || '—'}</div></div>
        <div class="cp-legend"><span><i class="c"></i>Critical</span><span><i></i>Dependency</span></div></div>
      <div class="graph-wrap">${renderGraph(st.tasks, cpm, mm, state.me.id)}</div>
      <p class="small muted" style="padding:0 20px 16px;margin:0">Tasks are laid out by dependency. The critical path is the longest chain by duration: any delay there delays the whole issue. Click one of your tasks to edit its dependencies.</p>`
      : `<div class="empty">${icon('network')}<div>Add tasks to see the dependency network.</div></div>`;
  } else {
    tabBody = `<div class="comments">${!comments ? '<div class="muted">Loading discussion…</div>' : comments.length ? comments.map((c) => {
      const m = mm.get(c.member_id);
      const own = c.member_id === state.me.id;
      return `<div class="comment ${own ? 'mine' : ''}">${avatar(m, 'sm')}<div class="bubble"><header><b>${esc(m?.name)}</b><time title="${esc(new Date(c.created_at).toLocaleString())}">${relTime(c.created_at)}</time>${own ? `<button data-act="comment-delete" data-id="${c.id}" data-issue="${issue.id}">Delete</button>` : ''}</header><p>${esc(c.body)}</p></div></div>`;
    }).join('') : '<div class="empty">No comments yet. Start the conversation.</div>'}</div>
      <form class="comment-form" id="comment-form">${avatar(state.me, 'sm')}<textarea class="input" name="body" placeholder="Write a comment…" maxlength="2000" aria-label="Comment" required></textarea><button class="btn primary" type="submit">Post</button></form>`;
  }

  view.innerHTML = `
    <nav class="crumbs"><a href="#/issues">Issues</a>${icon('chevR')}<span>${esc(issue.title)}</span></nav>
    <section class="panel issue-head pr-${issue.priority}">
      <div>
        <div class="row wrap" style="gap:6px">${statusBadge(issue.status)}${prioBadge(issue.priority)}${catBadge(issue.category)}${mine ? '<span class="mine-tag">Yours</span>' : ''}${dueBadge(issue.due_date, issue.status === 'closed')}</div>
        <h1>${esc(issue.title)}</h1>
        ${issue.description ? `<p class="desc">${esc(issue.description)}</p>` : ''}
        <div class="meta">
          <span>${avatar(owner, 'xs')}Raised by <a href="#/members/${owner?.id}"><b>${esc(owner?.name)}</b></a></span>
          <span>${icon('clock')}Opened ${relTime(issue.created_at)}</span>
          <span>${icon('users')}${plural(st.people.length, 'person', 'people').replace('persons', 'people')} involved ${avatarStack(st.people, 6)}</span>
        </div>
      </div>
      <div class="issue-side">
        <div class="row"><div class="ring" style="--p:${st.pct}"><b>${st.pct}%</b></div><div class="small text-2">${st.done} of ${st.total}<br>tasks done</div></div>
        ${issue.status !== 'closed' ? `<button class="btn primary" data-act="volunteer-focus">${icon('hand')}Volunteer</button>` : ''}
        ${mine ? `<span class="small muted">Issue status</span>${statusSeg('issue', issue.id, issue.status, ISSUE_STATUSES, true)}
          <div class="row"><button class="btn sm" data-act="issue-edit" data-id="${issue.id}">${icon('edit')}Edit</button><button class="btn sm danger" data-act="issue-delete" data-id="${issue.id}">${icon('trash')}Delete</button></div>`
          : `<span class="lock-note">${icon('lock')}Only ${esc(firstName(owner?.name))} can edit this issue</span>`}
      </div>
    </section>
    <div class="detail-grid">
      <section class="panel">
        <div class="tabs" role="tablist">
          <button role="tab" class="${tab === 'tasks' ? 'on' : ''}" data-tab="tasks" aria-selected="${tab === 'tasks'}">${icon('check')}Tasks<span class="n">${st.tasks.length}</span></button>
          <button role="tab" class="${tab === 'network' ? 'on' : ''}" data-tab="network" aria-selected="${tab === 'network'}">${icon('network')}Task plan</button>
          <button role="tab" class="${tab === 'discussion' ? 'on' : ''}" data-tab="discussion" aria-selected="${tab === 'discussion'}">${icon('message')}Discussion<span class="n">${comments ? comments.length : issue.comment_count}</span></button>
        </div>
        <div>${tabBody}</div>
      </section>
      <div class="col">
        <section class="panel">
          <div class="panel-head"><h3>${icon('users')}Volunteers</h3></div>
          <div class="list">${st.people.map((pid) => {
            const m = mm.get(pid);
            const theirs = st.tasks.filter((t) => t.owner_id === pid);
            return `<a class="li" href="#/members/${pid}">${avatar(m, 'sm')}<div class="grow"><div class="t">${esc(m?.name)}${pid === issue.owner_id ? ' <span class="muted small">· owner</span>' : ''}</div><div class="s">${theirs.length ? theirs.map((t) => esc(t.title)).join(', ') : 'Organizer'}</div></div>
              ${theirs.length ? `<span class="small muted">${theirs.filter((t) => t.status === 'completed').length}/${theirs.length}</span>` : ''}</a>`;
          }).join('')}</div>
        </section>
        <section class="panel">
          <div class="panel-head"><h3>${icon('activity')}History</h3></div>
          <div class="feed" style="padding:6px 0">${issueActivity.map(activityItem).join('') || '<div class="empty small">No activity yet.</div>'}</div>
        </section>
      </div>
    </div>`;

  $$('[data-tab]', view).forEach((b) => b.addEventListener('click', () => { state.issueTab = b.dataset.tab; renderView(); }));
  $$('.g-node.mine', view).forEach((n) => n.addEventListener('click', () => openTaskForm(issue, state.tasks.find((t) => t.id === Number(n.dataset.task)))));
  const qv = $('#quick-volunteer', view);
  if (qv) {
    qv.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = $('#qv-input', qv);
      const title = input.value.trim();
      if (title.length < 2) { input.focus(); toast('First type what you will bring or do', 'err'); return; }
      const btn = $('button[type=submit]', qv);
      btn.disabled = true;
      try {
        await api(`/api/issues/${issue.id}/tasks`, { method: 'POST', body: { title } });
        input.value = '';
        await loadAll();
        toast('Thanks for volunteering! It now shows under My work.');
        renderShellBits(); renderView();
      } catch (err) { toast(err.message, 'err'); btn.disabled = false; }
    });
    $$('[data-idea]', qv).forEach((b) => b.addEventListener('click', () => { const i = $('#qv-input', qv); i.value = b.dataset.idea; i.focus(); }));
  }
  const cf = $('#comment-form', view);
  cf?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = new FormData(cf).get('body').trim();
    if (!body) return;
    const btn = $('button', cf);
    btn.disabled = true;
    try {
      const c = await api(`/api/issues/${issue.id}/comments`, { method: 'POST', body: { body } });
      state.comments[issue.id] = [...(state.comments[issue.id] || []), c];
      issue.comment_count++;
      cf.reset();
      renderView();
      scheduleRefresh();
    } catch (err) { toast(err.message, 'err'); btn.disabled = false; }
  });
  cf?.querySelector('textarea').addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) cf.requestSubmit(); });
};

// ====================================================================== my work
VIEWS['my-work'] = (view) => {
  const me = state.me;
  const mine = state.tasks.filter((t) => t.owner_id === me.id);
  const myIssues = state.issues.filter((i) => i.owner_id === me.id);
  const groups = [['in_progress', 'In progress'], ['open', 'To do'], ['completed', 'Completed'], ['closed', 'Closed']];
  view.innerHTML = `
    <div class="page-head"><div><div class="eyebrow">Personal</div><h1>My work</h1><p>Your tasks and the issues you own. Flip the switch to mark a task as done.</p></div>
      <a class="btn" href="#/issues">${icon('hand')}Find something to help with</a></div>
    <div class="detail-grid">
      <div class="col">${groups.map(([s, label]) => {
        const g = mine.filter((t) => t.status === s);
        if (!g.length && (s === 'closed' || s === 'completed')) return '';
        return `<section class="panel"><div class="panel-head"><h3><span class="badge status st-${s}"><span class="dot"></span>${label}</span></h3><span class="muted small">${plural(g.length, 'task')}</span></div>
          ${g.length ? g.map((t) => taskRow(t, { showIssue: true })).join('') : '<div class="empty small">Nothing here.</div>'}</section>`;
      }).join('')}</div>
      <div class="col">
        <section class="panel"><div class="panel-head"><h3>${icon('issues')}Issues I own</h3><button class="btn sm" data-act="issue-new">${icon('plus')}New</button></div>
          <div class="list">${myIssues.map((i) => { const st = issueStats(i); return `<a class="li" href="#/issues/${i.id}"><div class="ring" style="--p:${st.pct};--size:44px"><b style="font-size:11px">${st.pct}%</b></div>
            <div class="grow"><div class="t">${esc(i.title)}</div><div class="s">${STATUS_LABEL[i.status]} · ${st.done}/${st.total} tasks</div></div>${prioBadge(i.priority)}</a>`; }).join('') || '<div class="empty small">You have not raised any issues yet.</div>'}</div></section>
      </div>
    </div>`;
};

// ====================================================================== members
function memberStats(m) {
  const tasks = state.tasks.filter((t) => t.owner_id === m.id);
  return { issues: state.issues.filter((i) => i.owner_id === m.id).length, tasks: tasks.length, done: tasks.filter((t) => t.status === 'completed').length };
}
VIEWS.members = (view) => {
  view.innerHTML = `
    <div class="page-head"><div><div class="eyebrow">Directory</div><h1>Members</h1><p>${plural(state.members.length, 'neighbor')} in this community. You can edit only your own profile.</p></div>
      <button class="btn" data-act="profile-edit">${icon('edit')}Edit my profile</button></div>
    <div class="member-grid">${state.members.map((m) => {
      const s = memberStats(m);
      return `<article class="panel member-card tilt" style="--c:${esc(m.color)}" data-href="#/members/${m.id}"><div class="glare"></div>
        ${m.id === state.me.id ? '<span class="mine-tag you-tag">You</span>' : ''}
        <div class="pop">${avatar(m, 'lg')}</div><h3>${esc(m.name)}</h3><div class="role">${esc(m.title || 'Community member')}</div>
        ${m.location ? `<div class="loc">${icon('pin')}${esc(m.location)}</div>` : ''}
        <div class="mstats"><div><b>${s.issues}</b><span>Issues</span></div><div><b>${s.tasks}</b><span>Tasks</span></div><div><b>${s.done}</b><span>Done</span></div></div></article>`;
    }).join('')}</div>`;
};

VIEWS.member = (view, { id }) => {
  const m = memberById().get(id);
  if (!m) { view.innerHTML = `<div class="panel empty">Member not found. <a href="#/members">Back</a></div>`; return; }
  const me = m.id === state.me.id;
  const s = memberStats(m);
  const tasks = state.tasks.filter((t) => t.owner_id === m.id);
  const issues = state.issues.filter((i) => i.owner_id === m.id);
  view.innerHTML = `
    <nav class="crumbs"><a href="#/members">Members</a>${icon('chevR')}<span>${esc(m.name)}</span></nav>
    <section class="panel profile-head" style="--c:${esc(m.color)}">
      ${avatar(m, 'xl')}
      <div class="grow">
        <h1>${esc(m.name)} ${me ? '<span class="mine-tag">You</span>' : ''}</h1>
        <p>${esc(m.title || 'Community member')} · @${esc(m.username)}</p>
        ${m.bio ? `<p style="max-width:620px">${esc(m.bio)}</p>` : ''}
        <div class="meta" style="margin-top:12px">
          ${m.location ? `<span>${icon('pin')}${esc(m.location)}</span>` : ''}
          ${m.email ? `<span>${icon('mail')}<a href="mailto:${esc(m.email)}">${esc(m.email)}</a></span>` : ''}
          ${m.phone ? `<span>${icon('phone')}${esc(m.phone)}</span>` : ''}
          <span>${icon('calendar')}Joined ${fmtDate(m.created_at)}</span>
        </div>
      </div>
      <div class="col" style="align-items:flex-end;gap:10px">
        <div class="row" style="gap:22px;text-align:center"><div><b style="font-size:22px">${s.issues}</b><div class="small muted">Issues</div></div><div><b style="font-size:22px">${s.tasks}</b><div class="small muted">Tasks</div></div><div><b style="font-size:22px">${s.done}</b><div class="small muted">Done</div></div></div>
        ${me ? `<div class="row"><button class="btn sm" data-act="profile-edit">${icon('edit')}Edit profile</button><button class="btn sm" data-act="password">${icon('key')}Password</button></div>` : `<span class="lock-note">${icon('lock')}Only ${esc(firstName(m.name))} can edit this profile</span>`}
      </div>
    </section>
    <div class="detail-grid">
      <section class="panel"><div class="panel-head"><h3>${icon('check')}Tasks</h3><span class="muted small">${plural(tasks.length, 'task')}</span></div>
        ${tasks.length ? tasks.map((t) => taskRow(t, { showIssue: true })).join('') : '<div class="empty small">No tasks yet.</div>'}</section>
      <section class="panel"><div class="panel-head"><h3>${icon('issues')}Issues raised</h3></div>
        <div class="list">${issues.map((i) => `<a class="li" href="#/issues/${i.id}"><div class="grow"><div class="t">${esc(i.title)}</div><div class="s">${esc(i.category)} · ${relTime(i.created_at)}</div></div>${statusBadge(i.status)}</a>`).join('') || '<div class="empty small">No issues raised.</div>'}</div></section>
    </div>`;
};

// ====================================================================== galaxy page
VIEWS.galaxy = (view) => {
  view.innerHTML = `
    <div class="page-head"><div><div class="eyebrow">Visualize</div><h1>Community galaxy</h1><p>Members are planets, issues are ringed worlds, and tasks orbit their issue in their status color.</p></div></div>
    <section class="panel galaxy-page">
      <canvas id="galaxy" aria-label="Interactive 3D map of the community"></canvas>
      <div class="g-controls">
        <button class="btn sm ${state.galaxyMine ? 'primary' : ''}" id="g-mine">${icon('user')}Highlight my work</button>
        <button class="btn sm" id="g-auto">${icon('rotate')}${state.galaxyAuto ? 'Pause rotation' : 'Auto-rotate'}</button>
        <button class="btn sm" id="g-reset">${icon('target')}Reset view</button>
      </div>
      <div class="panel g-legend">
        <div><i style="background:radial-gradient(circle at 30% 30%,#fff,#8b5cf6)"></i>Member (size = tasks)</div>
        <div><i style="background:radial-gradient(circle at 30% 30%,#fff,#ec835a);box-shadow:0 0 0 2px rgba(236,131,90,.4)"></i>Issue (color = priority)</div>
        ${TASK_STATUSES.map((s) => `<div><i style="background:${STATUS_COLOR[s]};width:8px;height:8px;margin:0 2px"></i>Task: ${STATUS_LABEL[s]}</div>`).join('')}
      </div>
      <div class="g-hint">Drag to rotate · Scroll to zoom · Click anything to open it</div>
    </section>`;
  const g = mountGalaxy($('#galaxy'), { autoRotate: state.galaxyAuto, zoom: 1.1 });
  if (state.galaxyMine) g.setHighlight(mineIds());
  $('#g-reset').addEventListener('click', () => g.resetView());
  $('#g-auto').addEventListener('click', (e) => { state.galaxyAuto = !state.galaxyAuto; g.opts.autoRotate = state.galaxyAuto; e.currentTarget.innerHTML = `${icon('rotate')}${state.galaxyAuto ? 'Pause rotation' : 'Auto-rotate'}`; });
  $('#g-mine').addEventListener('click', (e) => { state.galaxyMine = !state.galaxyMine; g.setHighlight(state.galaxyMine ? mineIds() : null); e.currentTarget.classList.toggle('primary', state.galaxyMine); });
};

// ====================================================================== activity
VIEWS.activity = (view) => {
  const who = state.activityFilter || '';
  const list = state.activity.filter((a) => !who || a.member_id === Number(who));
  const days = new Map();
  for (const a of list) {
    const d = new Date(a.created_at);
    const k = d.toDateString();
    const label = k === new Date().toDateString() ? 'Today' : k === new Date(Date.now() - 86400000).toDateString() ? 'Yesterday' : d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
    if (!days.has(label)) days.set(label, []);
    days.get(label).push(a);
  }
  view.innerHTML = `
    <div class="page-head"><div><div class="eyebrow">Audit trail</div><h1>Activity</h1><p>Every change across the community, newest first.</p></div>
      <select class="select sm" id="act-who" style="width:220px" aria-label="Filter by member"><option value="">Everyone</option>${state.members.map((m) => `<option value="${m.id}" ${String(m.id) === String(who) ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}</select></div>
    <section class="panel" style="max-width:860px">${[...days].map(([label, items]) => `<div class="day-label">${esc(label)}</div><div class="feed">${items.map(activityItem).join('')}</div>`).join('') || '<div class="empty">No activity yet.</div>'}</section>`;
  $('#act-who').addEventListener('change', (e) => { state.activityFilter = e.target.value; renderView(); });
};

// ====================================================================== forms
const options = (list, cur, labels = {}) => list.map((v) => `<option value="${esc(v)}" ${v === cur ? 'selected' : ''}>${esc(labels[v] || v)}</option>`).join('');

function openIssueForm(issue) {
  const edit = !!issue;
  const i = issue || { title: '', description: '', category: 'Event', priority: 'medium', due_date: '', status: 'open' };
  openModal({
    title: edit ? 'Edit issue' : 'Raise a new issue',
    submit: edit ? 'Save changes' : 'Create issue',
    body: `<div class="form-grid">
      <div class="field full"><label for="i-title">Title</label><input class="input" id="i-title" name="title" value="${esc(i.title)}" maxlength="120" required placeholder="e.g. Potluck lunch"></div>
      <div class="field full"><label for="i-desc">Description <span class="muted">(optional)</span></label><textarea class="input" id="i-desc" name="description" maxlength="4000" placeholder="What is it, and what help do you need?">${esc(i.description)}</textarea></div>
      <div class="field"><label for="i-cat">Category</label><select class="select" id="i-cat" name="category">${options(CATEGORIES, i.category)}</select></div>
      <div class="field"><label for="i-pri">Priority</label><select class="select" id="i-pri" name="priority">${options(PRIORITIES, i.priority, PRIO_LABEL)}</select></div>
      <div class="field"><label for="i-due">Due date <span class="muted">(optional)</span></label><input class="input" type="date" id="i-due" name="due_date" value="${esc(i.due_date || '')}"></div>
      ${edit ? `<div class="field"><label for="i-st">Status</label><select class="select" id="i-st" name="status">${options(ISSUE_STATUSES, i.status, STATUS_LABEL)}</select></div>` : ''}
    </div>`,
    onSubmit: async (fd) => {
      const body = Object.fromEntries(fd);
      const saved = edit ? await api(`/api/issues/${issue.id}`, { method: 'PUT', body }) : await api('/api/issues', { method: 'POST', body });
      await loadAll();
      toast(edit ? 'Issue updated' : 'Issue created');
      if (!edit) { state.issueTab = 'tasks'; location.hash = `#/issues/${saved.id}`; } else safeRerenderSoon();
    },
  });
}

function openTaskForm(issue, task) {
  const edit = !!task;
  const t = task || { title: '', notes: '', duration: 1, due_date: '', status: 'open' };
  const others = tasksOf(issue.id).filter((x) => !task || x.id !== task.id);
  const current = new Set(edit ? state.deps.filter((d) => d.task_id === task.id).map((d) => d.depends_on_id) : []);
  const mm = memberById();
  openModal({
    title: edit ? 'Edit your task' : `Volunteer for “${issue.title}”`,
    submit: edit ? 'Save task' : 'Volunteer',
    body: `<div class="form-grid">
      <div class="field full"><label for="t-title">What will you do or bring?</label><input class="input" id="t-title" name="title" value="${esc(t.title)}" maxlength="140" required placeholder="I will bring…"></div>
      <div class="field full"><label for="t-notes">Notes <span class="muted">(optional)</span></label><textarea class="input" id="t-notes" name="notes" maxlength="1000" style="min-height:70px">${esc(t.notes)}</textarea></div>
      ${edit ? `<div class="field full"><label for="t-st">Status</label><select class="select" id="t-st" name="status">${options(TASK_STATUSES, t.status, STATUS_LABEL)}</select></div>` : ''}
      <details class="more full" ${edit && (current.size || t.due_date) ? 'open' : ''}><summary>Planning options <span class="muted">(optional)</span></summary><div class="form-grid">
      <div class="field"><label for="t-dur">How many days will it take?</label><input class="input" type="number" id="t-dur" name="duration" min="0" max="999" step="0.5" value="${esc(t.duration)}"><span class="hint">Helps plan the order of tasks.</span></div>
      <div class="field"><label for="t-due">Due date</label><input class="input" type="date" id="t-due" name="due_date" value="${esc(t.due_date || '')}"></div>
      ${others.length ? `<div class="field full"><label>Do this after these tasks are done</label><div class="checks">${others.map((o) =>
        `<label><input type="checkbox" name="depends_on" value="${o.id}" ${current.has(o.id) ? 'checked' : ''}>${esc(o.title)} <span class="muted">· ${esc(firstName(mm.get(o.owner_id)?.name))}</span></label>`).join('')}</div></div>` : ''}
      </div></details>
    </div>`,
    onSubmit: async (fd) => {
      const body = { title: fd.get('title'), notes: fd.get('notes'), duration: Number(fd.get('duration') || 0), due_date: fd.get('due_date'), depends_on: fd.getAll('depends_on').map(Number) };
      if (edit) body.status = fd.get('status');
      if (edit) await api(`/api/tasks/${task.id}`, { method: 'PUT', body });
      else await api(`/api/issues/${issue.id}/tasks`, { method: 'POST', body });
      await loadAll();
      toast(edit ? 'Task updated' : 'Thanks for volunteering!');
      safeRerenderSoon();
    },
  });
}

function openProfileForm() {
  const m = state.me;
  const swatches = ['#8b5cf6', '#6366f1', '#3987e5', '#06b6d4', '#10b981', '#84cc16', '#f59e0b', '#ec835a', '#ec4899', '#ef4444'];
  const form = openModal({
    title: 'Edit my profile', submit: 'Save profile', wide: true,
    body: `<div class="form-grid">
      <div class="field"><label for="p-name">Full name</label><input class="input" id="p-name" name="name" value="${esc(m.name)}" required maxlength="60"></div>
      <div class="field"><label for="p-title">Role / title</label><input class="input" id="p-title" name="title" value="${esc(m.title)}" maxlength="80"></div>
      <div class="field"><label for="p-email">Email</label><input class="input" type="email" id="p-email" name="email" value="${esc(m.email)}" maxlength="120"></div>
      <div class="field"><label for="p-phone">Phone</label><input class="input" id="p-phone" name="phone" value="${esc(m.phone)}" maxlength="40"></div>
      <div class="field full"><label for="p-loc">Location</label><input class="input" id="p-loc" name="location" value="${esc(m.location)}" maxlength="80"></div>
      <div class="field full"><label for="p-bio">Bio</label><textarea class="input" id="p-bio" name="bio" maxlength="500">${esc(m.bio)}</textarea></div>
      <div class="field full"><label>Avatar color</label><div class="row wrap">${swatches.map((c) => `<button type="button" class="av sm" data-swatch="${c}" style="--c:${c};cursor:pointer;border:0;${c === m.color ? 'outline:2px solid #fff;outline-offset:2px' : ''}" aria-label="Color ${c}"></button>`).join('')}
        <input type="color" name="color" value="${esc(m.color)}" style="width:36px;height:30px;border:0;background:none;cursor:pointer" aria-label="Custom color"></div></div>
    </div>`,
    onSubmit: async (fd) => {
      await api(`/api/members/${m.id}`, { method: 'PUT', body: Object.fromEntries(fd) });
      await loadAll();
      toast('Profile saved');
      safeRerenderSoon();
    },
  });
  $$('[data-swatch]', form).forEach((b) => b.addEventListener('click', () => {
    $('input[name=color]', form).value = b.dataset.swatch;
    $$('[data-swatch]', form).forEach((x) => { x.style.outline = x === b ? '2px solid #fff' : ''; x.style.outlineOffset = '2px'; });
  }));
}

function openPasswordForm() {
  openModal({
    title: 'Change password', submit: 'Update password',
    body: `<div class="field"><label for="pw-c">Current password</label><input class="input" type="password" id="pw-c" name="current" autocomplete="current-password" required></div>
      <div class="field"><label for="pw-n">New password</label><input class="input" type="password" id="pw-n" name="next" autocomplete="new-password" required minlength="8"><span class="hint">At least 8 characters.</span></div>
      <div class="field"><label for="pw-r">Repeat new password</label><input class="input" type="password" id="pw-r" name="repeat" autocomplete="new-password" required></div>`,
    onSubmit: async (fd) => {
      if (fd.get('next') !== fd.get('repeat')) throw new Error('The new passwords do not match');
      await api('/api/me/password', { method: 'PUT', body: { current: fd.get('current'), next: fd.get('next') } });
      toast('Password updated');
    },
  });
}
function safeRerenderSoon() { setTimeout(() => { renderShellBits(); renderView(); }, 0); }

// ====================================================================== mutations
async function setIssueStatus(id, status) {
  const issue = issueById(id);
  if (!issue || issue.status === status) return;
  const prev = issue.status;
  issue.status = status;
  renderShellBits(); renderView();
  try {
    await api(`/api/issues/${id}`, { method: 'PUT', body: { status } });
    toast(`“${issue.title}” is now ${STATUS_LABEL[status].toLowerCase()}`, 'ok', { label: 'Undo', run: () => setIssueStatus(id, prev) });
    await loadAll(); safeRerender();
  } catch (err) { issue.status = prev; renderView(); toast(err.message, 'err'); }
}
async function setTaskStatus(id, status) {
  const task = state.tasks.find((t) => t.id === id);
  if (!task || task.status === status) return;
  const prev = task.status;
  task.status = status;
  renderShellBits(); renderView();
  try {
    await api(`/api/tasks/${id}`, { method: 'PUT', body: { status } });
    toast(status === 'completed' ? `Nice work! “${task.title}” completed` : `“${task.title}” is now ${STATUS_LABEL[status].toLowerCase()}`, 'ok', { label: 'Undo', run: () => setTaskStatus(id, prev) });
    await loadAll(); safeRerender();
  } catch (err) { task.status = prev; renderView(); toast(err.message, 'err'); }
}

function signOutLocal() {
  state.token = null;
  state.me = null;
  localStorage.removeItem('ca_token');
  es?.close();
  setLive(false);
  renderAuth();
}

// ====================================================================== global events
document.addEventListener('click', (e) => {
  const act = e.target.closest('[data-act]');
  if (act && !(act.matches('input'))) {
    const id = Number(act.dataset.id);
    switch (act.dataset.act) {
      case 'issue-new': e.preventDefault(); return openIssueForm();
      case 'issue-edit': return openIssueForm(issueById(id));
      case 'issue-delete': {
        const issue = issueById(id);
        return confirmModal('Delete issue?', `“${esc(issue.title)}” and its ${plural(tasksOf(id).length, 'task')} and comments will be permanently removed.`, async () => {
          await api(`/api/issues/${id}`, { method: 'DELETE' });
          await loadAll();
          toast('Issue deleted');
          location.hash = '#/issues';
        });
      }
      case 'issue-status': return setIssueStatus(id, act.dataset.status);
      case 'task-status': return setTaskStatus(id, act.dataset.status);
      case 'task-new': return openTaskForm(issueById(act.dataset.issue));
      case 'task-edit': { const t = state.tasks.find((x) => x.id === id); return openTaskForm(issueById(t.issue_id), t); }
      case 'task-delete': {
        const t = state.tasks.find((x) => x.id === id);
        return confirmModal('Withdraw from this task?', `“${esc(t.title)}” will be removed from the issue.`, async () => {
          await api(`/api/tasks/${id}`, { method: 'DELETE' });
          await loadAll();
          toast('Task removed');
          safeRerenderSoon();
        }, 'Withdraw');
      }
      case 'comment-delete': {
        const issueId = Number(act.dataset.issue);
        return api(`/api/comments/${id}`, { method: 'DELETE' }).then(() => {
          state.comments[issueId] = state.comments[issueId].filter((c) => c.id !== id);
          const iss = issueById(issueId); if (iss) iss.comment_count = Math.max(0, iss.comment_count - 1);
          renderView();
        }).catch((err) => toast(err.message, 'err'));
      }
      case 'profile-edit': return openProfileForm();
      case 'password': return openPasswordForm();
      case 'export': return exportCsv();
      case 'palette': return openPalette();
      case 'help': return openHelp();
      case 'intro-dismiss': localStorage.setItem('ca_intro_done', '1'); $('#intro')?.remove(); return toast('You can reopen this anytime from “How it works”.');
      case 'volunteer-focus': {
        state.issueTab = 'tasks';
        renderView();
        const i = $('#qv-input');
        i?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => i?.focus(), 250);
        return;
      }
      case 'menu': return $('#shell').classList.toggle('nav-open');
      case 'logout': api('/api/auth/logout', { method: 'POST' }).catch(() => {}).finally(() => { signOutLocal(); toast('Signed out'); }); return;
    }
    return;
  }
  // card / row navigation (ignore clicks on inner links and controls)
  const nav = e.target.closest('[data-href]');
  if (nav && !e.target.closest('a, button, input, label, select')) location.hash = nav.dataset.href;
});

document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.matches('[data-act="task-toggle"]')) setTaskStatus(Number(t.dataset.id), t.checked ? 'completed' : 'open');
  if (t.matches('[data-change="task-status"]')) setTaskStatus(Number(t.dataset.id), t.value);
});

// 3D tilt on cards
let tilted = null;
document.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse') return;
  const el = e.target.closest?.('.tilt');
  if (tilted && tilted !== el) { tilted.style.transform = ''; tilted = null; }
  if (!el || el.classList.contains('dragging')) return;
  tilted = el;
  const r = el.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
  el.style.transform = `perspective(900px) rotateX(${(0.5 - y) * 7}deg) rotateY(${(x - 0.5) * 9}deg) translateY(-3px)`;
  el.style.setProperty('--gx', `${x * 100}%`);
  el.style.setProperty('--gy', `${y * 100}%`);
});
document.addEventListener('pointerleave', () => { if (tilted) { tilted.style.transform = ''; tilted = null; } });

// command palette
function openPalette() {
  if (!state.me || $('.overlay-bg')) return;
  const bg = document.createElement('div');
  bg.className = 'overlay-bg';
  bg.innerHTML = `<div class="palette" role="dialog" aria-label="Search"><div class="p-in">${icon('search')}<input placeholder="Search issues, tasks, people, or jump to a page…" aria-label="Search"><kbd>Esc</kbd></div><div class="p-res"></div></div>`;
  document.body.append(bg);
  const input = $('input', bg), res = $('.p-res', bg);
  const mm = memberById();
  const all = [
    ...NAV.map(([k, l, ic]) => ({ g: 'Pages', label: l, ic, href: `#/${k}` })),
    { g: 'Actions', label: 'Raise a new issue', ic: 'plus', run: () => openIssueForm() },
    { g: 'Actions', label: 'Edit my profile', ic: 'edit', run: () => openProfileForm() },
    ...state.issues.map((i) => ({ g: 'Issues', label: i.title, ic: CAT_ICON[i.category], href: `#/issues/${i.id}`, sub: STATUS_LABEL[i.status] })),
    ...state.tasks.map((t) => ({ g: 'Tasks', label: t.title, ic: 'check', href: `#/issues/${t.issue_id}`, sub: firstName(mm.get(t.owner_id)?.name) })),
    ...state.members.map((m) => ({ g: 'People', label: m.name, ic: 'user', href: `#/members/${m.id}`, sub: m.title })),
  ];
  let items = [], sel = 0;
  const draw = () => {
    const q = input.value.trim().toLowerCase();
    items = all.filter((x) => !q || `${x.label} ${x.sub || ''}`.toLowerCase().includes(q)).slice(0, 40);
    if (!q) items = items.filter((x) => x.g === 'Pages' || x.g === 'Actions');
    sel = Math.min(sel, Math.max(0, items.length - 1));
    let g = '';
    res.innerHTML = items.map((x, k) => `${x.g !== g ? `<div class="p-group">${(g = x.g)}</div>` : ''}<div class="p-item ${k === sel ? 'on' : ''}" data-k="${k}">${icon(x.ic)}<span>${esc(x.label)}</span>${x.sub ? `<span class="s">${esc(x.sub)}</span>` : ''}</div>`).join('') || '<div class="empty small">No results</div>';
  };
  const go = (x) => { bg.remove(); if (!x) return; if (x.run) x.run(); else location.hash = x.href; };
  input.addEventListener('input', () => { sel = 0; draw(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { sel = Math.min(items.length - 1, sel + 1); draw(); e.preventDefault(); }
    if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); draw(); e.preventDefault(); }
    if (e.key === 'Enter') go(items[sel]);
  });
  res.addEventListener('click', (e) => { const it = e.target.closest('[data-k]'); if (it) go(items[Number(it.dataset.k)]); });
  bg.addEventListener('mousedown', (e) => { if (e.target === bg) bg.remove(); });
  draw();
  input.focus();
}

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(); }
  if (e.key === 'Escape' && $('.overlay-bg')) { $('.overlay-bg').remove(); if (state.stale) safeRerender(); }
});

// ====================================================================== boot
async function boot() {
  if (!state.token) return renderAuth();
  if (!$('.shell')) {
    $('#root').innerHTML = `<div class="boot"><div class="boot-orb"></div><div>Loading your community…</div><small id="boot-slow" hidden>The free server is waking up. This can take up to a minute the first time.</small></div>`;
  }
  const slow = setTimeout(() => { const s = $('#boot-slow'); if (s) s.hidden = false; }, 3500);
  try {
    await loadAll();
  } catch (err) {
    clearTimeout(slow);
    if (!state.token) return; // signOutLocal already rendered the login screen
    $('#root').innerHTML = `<div class="boot"><div>${icon('alert')}</div><div>${esc(err.message)}</div><button class="btn" id="retry">Try again</button></div>`;
    $('#retry').addEventListener('click', boot);
    return;
  }
  clearTimeout(slow);
  if (!location.hash || location.hash === '#/') history.replaceState(null, '', '#/dashboard');
  state.lastViewKey = '';
  renderShell();
  renderView();
  connectLive();
}

// Wake the backend early (free hosting sleeps when idle) so sign-in feels fast.
fetch(`${API_BASE}/api/health`).catch(() => {});
boot();
