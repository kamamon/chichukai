'use strict';
/* =========================================================
   地中海覇道 — utilities
   ========================================================= */
function U_MOD() {
  const U = {};
  U.ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  U.rf = (a, b) => a + Math.random() * (b - a);
  U.ch = p => Math.random() < p;
  U.pick = a => a[Math.floor(Math.random() * a.length)];
  U.wpick = (a, w) => {
    let t = 0;
    const ws = a.map(x => { const v = Math.max(0, w(x) || 0); t += v; return v; });
    if (t <= 0) return U.pick(a);
    let r = Math.random() * t;
    for (let i = 0; i < a.length; i++) { r -= ws[i]; if (r <= 0) return a[i]; }
    return a[a.length - 1];
  };
  U.shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  U.clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
  U.angNorm = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
  U.angDiff = (a, b) => U.angNorm(b - a);
  U.sum = (a, f) => a.reduce((s, x) => s + (f ? f(x) : x), 0);
  U.avg = (a, f) => a.length ? U.sum(a, f) / a.length : 0;
  U.maxBy = (a, f) => { let best = null, bv = -Infinity; for (const x of a) { const v = f(x); if (v > bv) { bv = v; best = x; } } return best; };
  U.minBy = (a, f) => { let best = null, bv = Infinity; for (const x of a) { const v = f(x); if (v < bv) { bv = v; best = x; } } return best; };
  U.num = n => Math.round(n || 0).toLocaleString('ja-JP');
  U.fmt = n => {
    n = Math.round(n || 0);
    const s = n < 0 ? '-' : ''; n = Math.abs(n);
    if (n >= 1e8) return s + trim((n / 1e8).toFixed(n >= 1e9 ? 1 : 2)) + '億';
    if (n >= 1e4) return s + trim((n / 1e4).toFixed(n >= 1e5 ? 0 : 1)) + '万';
    return s + n.toLocaleString('ja-JP');
    function trim(x) { return x.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1'); }
  };
  U.pct = v => Math.round(v * 100) + '%';
  U.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  U.uid = () => Math.random().toString(36).slice(2, 9);
  U.rng = seed => {
    let a = seed >>> 0;
    return () => {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  };
  // value noise (seeded) for terrain
  U.noise2 = seed => {
    const r = U.rng(seed);
    const P = 256, perm = new Uint8Array(P * 2), val = new Float32Array(P);
    for (let i = 0; i < P; i++) { perm[i] = i; val[i] = r(); }
    for (let i = P - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
    for (let i = 0; i < P; i++) perm[i + P] = perm[i];
    const v = (x, y) => val[perm[(perm[x & 255] + y) & 511] & 255];
    const sm = t => t * t * (3 - 2 * t);
    const n = (x, y) => {
      const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
      const a = v(xi, yi), b = v(xi + 1, yi), c = v(xi, yi + 1), d = v(xi + 1, yi + 1);
      const u = sm(xf), w = sm(yf);
      return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w;
    };
    return (x, y, oct = 4) => { let s = 0, amp = 1, f = 1, tot = 0; for (let o = 0; o < oct; o++) { s += n(x * f, y * f) * amp; tot += amp; amp *= 0.5; f *= 2; } return s / tot; };
  };
  U.$ = (sel, root = document) => root.querySelector(sel);
  U.$$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  // tiny DOM builder
  U.h = (tag, attrs, ...kids) => {
    const el = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'text') el.textContent = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const k of kids.flat()) { if (k == null || k === false) continue; el.append(k.nodeType ? k : document.createTextNode(String(k))); }
    return el;
  };
  U.sleep = ms => new Promise(r => setTimeout(r, ms));
  U.deep = o => JSON.parse(JSON.stringify(o));
  U.kanjiNum = n => {
    const d = '〇一二三四五六七八九';
    if (n <= 10) return n === 10 ? '十' : d[n];
    if (n < 20) return '十' + (n % 10 ? d[n % 10] : '');
    if (n < 100) return d[Math.floor(n / 10)] + '十' + (n % 10 ? d[n % 10] : '');
    return String(n);
  };
  return U;
}
const U = U_MOD();
