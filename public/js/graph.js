// Task dependency network: critical path method (CPM) + layered SVG layout.

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const STATUS_COLOR = { open: '#3987e5', in_progress: '#fab219', completed: '#0ca30c', closed: '#8a8fa3' };
const STATUS_LABEL = { open: 'Open', in_progress: 'In progress', completed: 'Completed', closed: 'Closed' };

export function computeCPM(tasks, deps) {
  const ids = new Set(tasks.map((t) => t.id));
  const preds = new Map(tasks.map((t) => [t.id, []]));
  const succs = new Map(tasks.map((t) => [t.id, []]));
  for (const d of deps) {
    if (!ids.has(d.task_id) || !ids.has(d.depends_on_id)) continue;
    preds.get(d.task_id).push(d.depends_on_id);
    succs.get(d.depends_on_id).push(d.task_id);
  }
  // Kahn topological order
  const indeg = new Map(tasks.map((t) => [t.id, preds.get(t.id).length]));
  const queue = tasks.filter((t) => indeg.get(t.id) === 0).map((t) => t.id);
  const order = [];
  while (queue.length) {
    const id = queue.shift();
    order.push(id);
    for (const s of succs.get(id)) { indeg.set(s, indeg.get(s) - 1); if (indeg.get(s) === 0) queue.push(s); }
  }
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const dur = (id) => (byId.get(id).status === 'closed' ? 0 : Number(byId.get(id).duration) || 0);
  const remDur = (id) => (['closed', 'completed'].includes(byId.get(id).status) ? 0 : Number(byId.get(id).duration) || 0);
  const info = new Map();
  for (const id of order) {
    const es = Math.max(0, ...preds.get(id).map((p) => info.get(p).ef));
    const res = Math.max(0, ...preds.get(id).map((p) => info.get(p).ref));
    const level = Math.max(-1, ...preds.get(id).map((p) => info.get(p).level)) + 1;
    info.set(id, { es, ef: es + dur(id), res, ref: res + remDur(id), level });
  }
  const total = Math.max(0, ...[...info.values()].map((v) => v.ef));
  const remaining = Math.max(0, ...[...info.values()].map((v) => v.ref));
  for (const id of [...order].reverse()) {
    const v = info.get(id);
    v.lf = Math.min(total, ...succs.get(id).map((s) => info.get(s).ls));
    v.ls = v.lf - dur(id);
    v.slack = Math.round((v.ls - v.es) * 1000) / 1000;
    v.critical = v.slack === 0 && total > 0;
  }
  // The chain shown in the summary: follow tight critical links from a critical start.
  const chain = [];
  let cur = order.find((id) => info.get(id).critical && info.get(id).es === 0 && preds.get(id).length === 0) ?? order.find((id) => info.get(id).critical);
  while (cur !== undefined) {
    chain.push(cur);
    const ef = info.get(cur).ef;
    cur = succs.get(cur).find((s) => info.get(s).critical && info.get(s).es === ef);
  }
  return { order, info, preds, succs, total, remaining, chain, cyclic: order.length !== tasks.length };
}

export function renderGraph(tasks, cpm, membersById, meId) {
  if (!tasks.length) return '';
  const W = 228, H = 66, CG = 74, RG = 20, PAD = 8;
  const cols = [];
  for (const t of tasks) {
    const lv = cpm.info.get(t.id)?.level ?? 0;
    (cols[lv] ||= []).push(t);
  }
  const pos = new Map();
  let maxRows = 0;
  cols.forEach((col, c) => {
    col.sort((a, b) => (cpm.info.get(a.id).es - cpm.info.get(b.id).es) || (Number(cpm.info.get(b.id).critical) - Number(cpm.info.get(a.id).critical)) || a.id - b.id);
    maxRows = Math.max(maxRows, col.length);
  });
  const totalH = maxRows * H + (maxRows - 1) * RG;
  cols.forEach((col, c) => {
    const colH = col.length * H + (col.length - 1) * RG;
    const top = (totalH - colH) / 2;
    col.forEach((t, r) => pos.set(t.id, { x: PAD + c * (W + CG), y: PAD + top + r * (H + RG) }));
  });
  const width = PAD * 2 + cols.length * W + (cols.length - 1) * CG;
  const height = PAD * 2 + totalH;

  let edges = '';
  for (const t of tasks) {
    for (const p of cpm.preds.get(t.id) || []) {
      const a = pos.get(p), b = pos.get(t.id);
      if (!a || !b) continue;
      const x1 = a.x + W, y1 = a.y + H / 2, x2 = b.x - 6, y2 = b.y + H / 2;
      const mx = (x1 + x2) / 2;
      const crit = cpm.info.get(p).critical && cpm.info.get(t.id).critical && cpm.info.get(p).ef === cpm.info.get(t.id).es;
      edges += `<path class="g-edge${crit ? ' crit' : ''}" d="M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}" marker-end="url(#${crit ? 'arrC' : 'arr'})"/>`;
    }
  }

  let nodes = '';
  for (const t of tasks) {
    const { x, y } = pos.get(t.id);
    const v = cpm.info.get(t.id);
    const m = membersById.get(t.owner_id);
    const mine = t.owner_id === meId;
    const title = t.title.length > 27 ? t.title.slice(0, 26) + '…' : t.title;
    const color = STATUS_COLOR[t.status];
    const tip = `${t.title}\n${m?.name ?? 'Unknown'} · ${STATUS_LABEL[t.status]} · ${t.duration} day(s)\nEarliest start: day ${v.es} · finish: day ${v.ef}\nSlack: ${v.slack} day(s)${v.critical ? ' · on the critical path' : ''}`;
    nodes += `<g class="g-node${v.critical ? ' crit' : ''}${mine ? ' mine' : ''}" data-task="${t.id}" transform="translate(${x},${y})" tabindex="0" role="img" aria-label="${esc(tip)}">
      <title>${esc(tip)}</title>
      <rect class="card" width="${W}" height="${H}" rx="12"/>
      <rect x="0" y="12" width="3" height="${H - 24}" rx="1.5" fill="${color}"/>
      <circle cx="26" cy="${H / 2}" r="13" fill="${m?.color ?? '#555'}"/>
      <text x="26" y="${H / 2 + 4}" text-anchor="middle" style="font-size:11px;font-weight:700;fill:#fff">${esc((m?.name ?? '?').split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase())}</text>
      <text x="48" y="27">${esc(title)}</text>
      <circle cx="52" cy="44" r="3.5" fill="${color}"/>
      <text class="sub" x="60" y="48">${esc(STATUS_LABEL[t.status])} · ${t.duration}d · day ${v.es}→${v.ef}${v.slack > 0 ? ` · slack ${v.slack}` : ''}</text>
    </g>`;
  }

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="critGrad" x1="0" x2="1"><stop offset="0" stop-color="#7c6cff"/><stop offset="1" stop-color="#22d3ee"/></linearGradient>
      <marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#39406a"/></marker>
      <marker id="arrC" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#22d3ee"/></marker>
    </defs>
    ${edges}${nodes}
  </svg>`;
}
