// Lightweight 3D scene renderer on a 2D canvas: perspective projection, depth-sorted shaded spheres,
// orbiting moons, glowing links, starfield, drag-to-rotate with inertia and scroll-to-zoom.

const TAU = Math.PI * 2;
const CAMERA = 900;

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const rgba = ([r, g, b], a) => `rgba(${r},${g},${b},${a})`;
const mix = ([r, g, b], [r2, g2, b2], t) => [r + (r2 - r) * t, g + (g2 - g) * t, b + (b2 - b) * t].map(Math.round);
const WHITE = [255, 255, 255];
const BLACK = [0, 0, 0];

export class Galaxy {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.opts = { autoRotate: true, interactive: true, labels: true, rings: true, starCount: 240, ...opts };
    const cam = opts.camera || {};
    this.yaw = cam.yaw ?? 0.5;
    this.pitch = cam.pitch ?? -0.32;
    this.zoom = cam.zoom ?? (opts.zoom || 1);
    this.vyaw = 0;
    this.vpitch = 0;
    this.nodes = [];
    this.links = [];
    this.highlight = null;
    this.hover = null;
    this.projected = [];
    this.dragging = false;
    this.time = 0;
    this.last = performance.now();
    this.stars = Array.from({ length: this.opts.starCount }, () => {
      const u = Math.random() * 2 - 1;
      const a = Math.random() * TAU;
      const r = 1100 + Math.random() * 900;
      const s = Math.sqrt(1 - u * u);
      return { x: Math.cos(a) * s * r, y: u * r, z: Math.sin(a) * s * r, b: 0.25 + Math.random() * 0.75, size: Math.random() < 0.1 ? 1.6 : 0.9 };
    });

    this.resize = this.resize.bind(this);
    this.frame = this.frame.bind(this);
    this.ro = new ResizeObserver(this.resize);
    this.ro.observe(canvas);
    this.resize();
    if (this.opts.interactive) this.bind();
    this.visible = true;
    this.io = new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; });
    this.io.observe(canvas);
    this.raf = requestAnimationFrame(this.frame);
  }

  get camera() { return { yaw: this.yaw, pitch: this.pitch, zoom: this.zoom }; }

  setData(nodes, links) {
    this.nodes = nodes;
    this.links = links;
    const byId = new Map(nodes.map((n) => [n.id, n]));
    for (const n of nodes) {
      n.rgb = hexToRgb(n.color);
      if (n.orbit) n.orbit.parentNode = byId.get(n.orbit.parent);
    }
    for (const l of links) {
      l.na = byId.get(l.a);
      l.nb = byId.get(l.b);
      l.rgb = hexToRgb(l.color);
    }
    this.links = links.filter((l) => l.na && l.nb);
  }

  setHighlight(ids) { this.highlight = ids && ids.size ? ids : null; }

  resetView() { this.yaw = 0.5; this.pitch = -0.32; this.zoom = this.opts.zoom || 1; this.vyaw = this.vpitch = 0; }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = Math.max(1, r.width);
    this.h = Math.max(1, r.height);
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  bind() {
    const c = this.canvas;
    let sx = 0, sy = 0, lx = 0, ly = 0, moved = 0;
    this.onDown = (e) => {
      this.dragging = true; moved = 0;
      sx = lx = e.clientX; sy = ly = e.clientY;
      c.setPointerCapture(e.pointerId);
    };
    this.onMove = (e) => {
      const r = c.getBoundingClientRect();
      this.mouse = { x: e.clientX - r.left, y: e.clientY - r.top, cx: e.clientX, cy: e.clientY };
      if (!this.dragging) return;
      const dx = e.clientX - lx, dy = e.clientY - ly;
      lx = e.clientX; ly = e.clientY;
      moved = Math.max(moved, Math.hypot(e.clientX - sx, e.clientY - sy));
      this.vyaw = dx * 0.006;
      this.vpitch = dy * 0.006;
      this.yaw += this.vyaw;
      this.pitch = Math.max(-1.35, Math.min(1.35, this.pitch + this.vpitch));
    };
    this.onUp = (e) => {
      if (!this.dragging) return;
      this.dragging = false;
      if (moved < 5 && this.hover && this.opts.onClick) this.opts.onClick(this.hover);
      try { c.releasePointerCapture(e.pointerId); } catch { /* already released */ }
    };
    this.onLeave = () => { this.mouse = null; this.setHover(null); };
    this.onWheel = (e) => {
      e.preventDefault();
      this.zoom = Math.max(0.45, Math.min(2.6, this.zoom * (e.deltaY > 0 ? 0.92 : 1.08)));
    };
    c.addEventListener('pointerdown', this.onDown);
    c.addEventListener('pointermove', this.onMove);
    c.addEventListener('pointerup', this.onUp);
    c.addEventListener('pointercancel', this.onUp);
    c.addEventListener('pointerleave', this.onLeave);
    c.addEventListener('wheel', this.onWheel, { passive: false });
  }

  setHover(node) {
    if (node === this.hover) return;
    this.hover = node;
    this.canvas.style.cursor = node ? 'pointer' : '';
    this.opts.onHover?.(node, this.mouse);
  }

  project(x, y, z) {
    const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const x1 = x * cy + z * sy;
    const z1 = -x * sy + z * cy;
    const y2 = y * cp - z1 * sp;
    const z2 = y * sp + z1 * cp;
    const f = Math.min(this.w, this.h * 1.25) * 1.02 * this.zoom;
    const s = f / (CAMERA + z2);
    const ox = this.w < 700 ? 0 : (this.opts.offsetX || 0);
    return { x: this.w * (0.5 + ox) + x1 * s, y: this.h / 2 + y2 * s, z: z2, s };
  }

  positions() {
    for (const n of this.nodes) {
      if (!n.orbit) { n.px = n.x; n.py = n.y; n.pz = n.z; }
    }
    for (const n of this.nodes) {
      const o = n.orbit;
      if (!o || !o.parentNode) continue;
      const p = o.parentNode;
      const a = o.phase + this.time * o.speed;
      const lx = Math.cos(a) * o.radius;
      const lz = Math.sin(a) * o.radius;
      // tilt the orbit plane around the X then Z axis
      const ly = lz * Math.sin(o.tilt);
      const lz2 = lz * Math.cos(o.tilt);
      const rx = lx * Math.cos(o.spin) - ly * Math.sin(o.spin);
      const ry = lx * Math.sin(o.spin) + ly * Math.cos(o.spin);
      n.px = p.x + rx; n.py = p.y + ry; n.pz = p.z + lz2;
    }
  }

  frame(now) {
    this.raf = requestAnimationFrame(this.frame);
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (!this.visible || document.hidden) return;
    this.time += dt;
    if (!this.dragging) {
      this.yaw += this.vyaw;
      this.pitch = Math.max(-1.35, Math.min(1.35, this.pitch + this.vpitch));
      this.vyaw *= 0.94;
      this.vpitch *= 0.94;
      if (this.opts.autoRotate && !this.hover && Math.abs(this.vyaw) < 0.002) this.yaw += dt * 0.09;
    }
    this.draw();
  }

  draw() {
    const { ctx, w, h } = this;
    ctx.clearRect(0, 0, w, h);
    this.positions();

    // starfield (parallax: rotates slower than the scene)
    const yaw = this.yaw, pitch = this.pitch;
    this.yaw = yaw * 0.35; this.pitch = pitch * 0.35;
    for (const st of this.stars) {
      const p = this.project(st.x, st.y, st.z);
      if (p.z < -CAMERA + 50) continue;
      const tw = 0.6 + 0.4 * Math.sin(this.time * 1.5 + st.x);
      ctx.fillStyle = `rgba(200,210,255,${st.b * tw * 0.55})`;
      ctx.fillRect(p.x, p.y, st.size, st.size);
    }
    this.yaw = yaw; this.pitch = pitch;

    // orbital guide rings on the equatorial plane
    if (this.opts.rings) {
      for (const [r, a] of [[150, 0.10], [300, 0.07], [420, 0.04]]) {
        ctx.beginPath();
        for (let i = 0; i <= 96; i++) {
          const t = (i / 96) * TAU;
          const p = this.project(Math.cos(t) * r, 0, Math.sin(t) * r);
          i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
        }
        ctx.strokeStyle = `rgba(140,150,255,${a})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    const proj = new Map();
    for (const n of this.nodes) proj.set(n, this.project(n.px, n.py, n.pz));
    const hl = this.highlight;
    const hov = this.hover;
    const near = hov ? new Set([hov.id]) : null;
    if (hov) for (const l of this.links) { if (l.a === hov.id) near.add(l.b); if (l.b === hov.id) near.add(l.a); }
    const fog = (z) => Math.max(0.28, Math.min(1, 0.95 - z / 900));
    const dimmed = (n) => (near && !near.has(n.id)) || (hl && !hl.has(n.id));

    // links
    ctx.lineCap = 'round';
    for (const l of this.links) {
      const a = proj.get(l.na), b = proj.get(l.nb);
      const active = hov && (l.a === hov.id || l.b === hov.id);
      const dim = (near && !active) || (hl && !(hl.has(l.a) && hl.has(l.b)));
      const alpha = (l.alpha ?? 0.4) * fog((a.z + b.z) / 2) * (dim ? 0.25 : active ? 2.2 : 1);
      ctx.strokeStyle = rgba(l.rgb, Math.min(1, alpha));
      ctx.lineWidth = (l.width ?? 1) * (active ? 1.8 : 1) * Math.max(0.6, (a.s + b.s) / 2);
      ctx.setLineDash(l.dash ? [3, 5] : []);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // nodes, far to near
    const order = this.nodes.slice().sort((p, q) => proj.get(q).z - proj.get(p).z);
    this.projected = [];
    for (const n of order) {
      const p = proj.get(n);
      if (p.z < -CAMERA + 60) continue;
      const r = n.r * p.s;
      const dim = dimmed(n);
      const alpha = fog(p.z) * (dim ? 0.3 : 1);
      ctx.globalAlpha = alpha;
      if (n.glow !== false && r > 3) {
        const g = ctx.createRadialGradient(p.x, p.y, r * 0.6, p.x, p.y, r * (n === hov ? 3.4 : 2.6));
        g.addColorStop(0, rgba(n.rgb, n.kind === 'member' ? 0.42 : 0.3));
        g.addColorStop(1, rgba(n.rgb, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, r * 3.4, 0, TAU); ctx.fill();
      }
      const g = ctx.createRadialGradient(p.x - r * 0.38, p.y - r * 0.42, r * 0.08, p.x, p.y, r);
      g.addColorStop(0, rgba(mix(n.rgb, WHITE, 0.75), 1));
      g.addColorStop(0.35, rgba(mix(n.rgb, WHITE, 0.15), 1));
      g.addColorStop(0.8, rgba(n.rgb, 1));
      g.addColorStop(1, rgba(mix(n.rgb, BLACK, 0.55), 1));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(1.2, r), 0, TAU); ctx.fill();
      if (n.ring) { // planetary ring for issues
        ctx.strokeStyle = rgba(mix(n.rgb, WHITE, 0.4), 0.55);
        ctx.lineWidth = Math.max(0.8, r * 0.12);
        ctx.beginPath(); ctx.ellipse(p.x, p.y, r * 1.75, r * 0.5, -0.35, 0, TAU); ctx.stroke();
      }
      if (n === hov) {
        ctx.strokeStyle = 'rgba(255,255,255,.85)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(p.x, p.y, r + 5, 0, TAU); ctx.stroke();
      }
      const showLabel = this.opts.labels === 'members' ? n.kind === 'member' : this.opts.labels && (n.kind === 'member' || n.kind === 'issue');
      if (showLabel && n.label && !dim) {
        ctx.globalAlpha = alpha * (n.kind === 'member' ? 1 : 0.85);
        ctx.font = `${n.kind === 'member' ? 600 : 500} ${n.kind === 'member' ? 12.5 : 11.5}px Inter, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = n.kind === 'member' ? '#eef0f8' : '#a9afc8';
        ctx.fillText(n.label, p.x, p.y + r + (n.ring ? 16 : 15));
      }
      ctx.globalAlpha = 1;
      this.projected.push({ n, x: p.x, y: p.y, r });
    }

    if (this.mouse && !this.dragging) {
      let best = null, bd = Infinity;
      for (const q of this.projected) {
        const d = Math.hypot(q.x - this.mouse.x, q.y - this.mouse.y);
        if (d < Math.max(q.r + 4, 9) && d - q.r < bd) { bd = d - q.r; best = q.n; }
      }
      this.setHover(best);
      if (best) this.opts.onHover?.(best, this.mouse);
    }
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.io.disconnect();
    const c = this.canvas;
    if (this.onDown) {
      c.removeEventListener('pointerdown', this.onDown);
      c.removeEventListener('pointermove', this.onMove);
      c.removeEventListener('pointerup', this.onUp);
      c.removeEventListener('pointercancel', this.onUp);
      c.removeEventListener('pointerleave', this.onLeave);
      c.removeEventListener('wheel', this.onWheel);
    }
    this.opts.onHover?.(null);
  }
}

// Even spread of n points on a sphere.
export function fibonacciSphere(n, radius) {
  const pts = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = n === 1 ? 0 : 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const t = golden * i + 0.6;
    pts.push({ x: Math.cos(t) * r * radius, y: y * radius * 0.62, z: Math.sin(t) * r * radius });
  }
  return pts;
}
