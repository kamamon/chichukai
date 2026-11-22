/* =========================================================
   地中海覇道 — 天下の地図（高精細）
   地の画素はワーカー（GEO.renderTile）が作り、
   水・川・道・町・木はここでタイルに重ねる。国境や名前は毎回描く。
   ========================================================= */
const MAP = {
  TS: 256, LV: [1, 2, 4, 8, 16, 32],
  ready: false, subs: new Set(), _raf: 0, seq: 0, sets: {},
  LOD_T: [3, 1.2, 0.45, 0.15],
  COL: {
    sea: '#a1b6ae', sea2: '#afc3ba', sea3: '#bccdc3', coast: '#4f6a63', lake: '#a6bbb3', shore: '#58736b',
    riverBank: '#55808b', river: '#98b5b1', stream: '#68909a', road: '#7c5e40', roadIn: '#d8c49a', road2: '#937454', path: '#9f8664',
    wall: '#4b3d30', town: '#d8c49c', townLine: '#4a3a2a', house: '#b9a07a', roof: '#5e4935', tree: 'rgba(66,88,52,.6)', treeHi: 'rgba(170,186,120,.45)',
    reed: 'rgba(92,110,70,.75)', lane: 'rgba(36,74,96,.55)',
  },
};
/* ---------- タイルの組（全体地図・戦場で共用） ----------
   o.set: ワーカーでの種類（'w' 全体地図 / 'f' 戦場）
   o.W, o.H: 世界の広さ。o.unit: L=1 の1画素が何単位か
   o.render(L,tx,ty): 同じスレッドで描く時の関数。o.decorate(g,L,tx,ty): 重ねる絵 */
MAP.TileSet = function (o) {
  Object.assign(this, { TS: 256, levels: [1, 2, 4, 8, 16, 32], max: 110, maxBusy: 2, unit: 1, gen: 0, edge: null }, o);
  this.tiles = new Map(); this.want = []; this.busy = 0; this.frame = 0; this.pend = new Map();
  MAP.sets[this.set] = this;
};
MAP.TileSet.prototype.key = function (L, tx, ty) { return L + '/' + tx + '/' + ty; };
MAP.TileSet.prototype.get = function (L, tx, ty) { return this.tiles.get(L + '/' + tx + '/' + ty); };
MAP.TileSet.prototype.levelFor = function (dev) { for (const l of this.levels) if (l >= dev * 0.92) return l; return this.levels[this.levels.length - 1]; };
MAP.TileSet.prototype.kick = function () {
  if (this.dead) return;
  this.want.sort((a, b) => a.d - b.d);
  while (this.busy < this.maxBusy && this.want.length) {
    const w = this.want.shift(), key = this.key(w.L, w.tx, w.ty);
    if (this.tiles.has(key)) continue;
    this.tiles.set(key, { L: w.L, tx: w.tx, ty: w.ty, st: 0, used: this.frame });
    this.busy++;
    if (GEO.worker) { const id = ++MAP.seq; this.pend.set(id, key); MAP.pendAll.set(id, this); GEO.worker.postMessage({ cmd: 'tile', set: this.set, gen: this.gen, id, L: w.L, tx: w.tx, ty: w.ty }); }
    else { const gen = this.gen; setTimeout(() => { if (gen !== this.gen || this.dead) return; let buf = null; try { buf = this.render(w.L, w.tx, w.ty); } catch (e) { console.error(e); } this.finish(key, buf); }, 0); }
  }
};
MAP.TileSet.prototype.finish = function (key, buf) {
  this.busy = Math.max(0, this.busy - 1);
  if (this.dead) return;
  const t = this.tiles.get(key);
  if (!t || !buf) { this.tiles.delete(key); this.kick(); return; }
  try {
    const cv = document.createElement('canvas'); cv.width = this.TS; cv.height = this.TS;
    const g = cv.getContext('2d');
    g.putImageData(new ImageData(buf instanceof Uint8ClampedArray ? buf : new Uint8ClampedArray(buf), this.TS, this.TS), 0, 0);
    if (this.decorate) this.decorate(g, t.L, t.tx, t.ty);
    t.cv = cv; t.st = 1;
  } catch (e) { console.error(e); this.tiles.delete(key); }
  this.evict();
  this.kick();
  if (this.onChange) this.onChange();
};
MAP.TileSet.prototype.evict = function () {
  if (this.tiles.size <= this.max) return;
  const list = [...this.tiles.values()].filter(t => t.st === 1 && t.L > this.levels[0]).sort((a, b) => a.used - b.used);
  for (const t of list) { if (this.tiles.size <= this.max * 0.85) break; if (t.used >= this.frame - 1) break; if (t.cv) { t.cv.width = 1; t.cv.height = 1; } this.tiles.delete(this.key(t.L, t.tx, t.ty)); }
};
MAP.TileSet.prototype.clear = function () { for (const t of this.tiles.values()) if (t.cv) { t.cv.width = 1; t.cv.height = 1; } this.tiles.clear(); this.want = []; this.busy = 0; this.pend.clear(); };
MAP.TileSet.prototype.destroy = function () { this.clear(); this.dead = true; if (MAP.sets[this.set] === this) delete MAP.sets[this.set]; };
// 一番粗い段をみな頼む
MAP.TileSet.prototype.prefetchBase = function () {
  const L = this.levels[0], span = this.TS / L * this.unit;
  for (let ty = 0; ty < Math.ceil(this.H / span); ty++) for (let tx = 0; tx < Math.ceil(this.W / span); tx++) this.want.push({ L, tx, ty, d: 100 + tx + ty });
  this.kick();
};
/* 地の絵を描く（cam={x,y,s}：s は CSS 画素/単位、vw/vh は CSS 画素） */
MAP.TileSet.prototype.draw = function (g, cam, vw, vh, dpr) {
  this.frame++;
  const s = cam.s, L = this.levelFor(s * dpr * this.unit), span = this.TS / L * this.unit;
  const wx0 = cam.x - vw / 2 / s, wy0 = cam.y - vh / 2 / s, wx1 = cam.x + vw / 2 / s, wy1 = cam.y + vh / 2 / s;
  const nx = Math.ceil(this.W / span), ny = Math.ceil(this.H / span);
  const tx0 = Math.max(0, Math.floor(wx0 / span)), tx1 = Math.min(nx - 1, Math.floor(wx1 / span));
  const ty0 = Math.max(0, Math.floor(wy0 / span)), ty1 = Math.min(ny - 1, Math.floor(wy1 / span));
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  const toX = (wx) => Math.round(((wx - cam.x) * s + vw / 2) * dpr), toY = (wy) => Math.round(((wy - cam.y) * s + vh / 2) * dpr);
  g.beginPath(); g.rect(toX(0), toY(0), toX(this.W) - toX(0), toY(this.H) - toY(0)); g.clip();
  const want = [];
  const ccx = (wx0 + wx1) / 2, ccy = (wy0 + wy1) / 2, L0 = this.levels[0];
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    const X0 = toX(tx * span), X1 = toX((tx + 1) * span), Y0 = toY(ty * span), Y1 = toY((ty + 1) * span);
    const t = this.get(L, tx, ty);
    if (t && t.st === 1) { g.drawImage(t.cv, X0, Y0, X1 - X0, Y1 - Y0); t.used = this.frame; continue; }
    if (!t) want.push({ L, tx, ty, d: Math.hypot((tx + 0.5) * span - ccx, (ty + 0.5) * span - ccy) / span });
    for (let A = L / 2; A >= L0; A /= 2) {
      const f = L / A, at = this.get(A, Math.floor(tx / f), Math.floor(ty / f));
      if (at && at.st === 1) {
        const sw = this.TS / f, sx = (tx % f) * sw, sy = (ty % f) * sw;
        g.drawImage(at.cv, sx, sy, sw, sw, X0, Y0, X1 - X0, Y1 - Y0); at.used = this.frame;
        if (A < L / 2) { const mid = this.get(L / 2, Math.floor(tx / 2), Math.floor(ty / 2)); if (!mid) want.push({ L: L / 2, tx: Math.floor(tx / 2), ty: Math.floor(ty / 2), d: -1 }); }
        break;
      }
    }
  }
  g.restore();
  if (this.edge) { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.strokeStyle = this.edge; g.lineWidth = 1.5 * dpr; g.strokeRect(toX(0), toY(0), toX(this.W) - toX(0), toY(this.H) - toY(0)); g.restore(); }
  this.want = want.concat(this.want.filter(w => w.L === L0));
  this.kick();
  return L;
};
MAP.pendAll = new Map();
/* ---------- 起動 ---------- */
MAP.init = () => {
  if (MAP._init) return MAP._init;
  GEO.onTile = MAP.onTile;
  GEO.onWorkerLost = () => { for (const k in MAP.sets) { const ts = MAP.sets[k]; ts.busy = 0; for (const [, key] of ts.pend) ts.tiles.delete(key); ts.pend.clear(); ts.kick(); } MAP.pendAll.clear(); };
  MAP._init = GEO.boot().then(() => {
    MAP.prep();
    MAP.world = new MAP.TileSet({ set: 'w', W: 1000, H: 720, unit: 1, levels: MAP.LV, max: 120, render: GEO.renderTile, decorate: MAP.decorate, onChange: MAP.changed, edge: 'rgba(60,44,26,.55)' });
    MAP.ready = true;
    MAP.world.prefetchBase();
    MAP.changed();
    return GEO;
  });
  return MAP._init;
};
MAP.onTile = (m) => {
  const ts = MAP.pendAll.get(m.id); MAP.pendAll.delete(m.id);
  if (!ts) return;
  const key = ts.pend.get(m.id); ts.pend.delete(m.id);
  if (key == null) return;
  if (m.gen !== undefined && m.gen !== ts.gen) { ts.busy = Math.max(0, ts.busy - 1); ts.tiles.delete(key); ts.kick(); return; }
  ts.finish(key, m.cmd === 'tile' ? m.buf : null);
};
MAP.changed = () => {
  if (MAP._raf) return;
  MAP._raf = requestAnimationFrame(() => { MAP._raf = 0; for (const f of MAP.subs) { try { f(); } catch (e) { console.error(e); } } });
};
/* ---------- 下ごしらえ（線を区切って範囲を持たせる） ---------- */
MAP.prep = () => {
  const ch = (pts, max, extra) => {
    const out = [], n = pts.length >> 1;
    for (let s = 0; s < n - 1; s += max - 1) {
      const e = Math.min(n, s + max), sub = pts.subarray(s * 2, e * 2);
      const c = { p: sub, bb: GEO.bboxOf(sub), i0: s, i1: e, n };
      if (extra) Object.assign(c, extra(s, e));
      out.push(c);
    }
    return out;
  };
  MAP.C = {
    rivers: GEO.rivers.flatMap(r => ch(r.pts, 40, () => ({ r }))),
    streams: GEO.streams.flatMap(s => ch(s.pts, 40, (a, b) => ({ w: s.w.subarray(a, b), m: s.m }))),
    roads: GEO.roads.flatMap(r => ch(r.pts, 60, () => ({ major: r.major }))),
    paths: GEO.paths.map(p => ({ p, bb: GEO.bboxOf(p) })),
    walls: GEO.walls.flatMap(w => ch(w.pts, 60)),
    lakes: GEO.lakes.map(l => ({ l, bb: GEO.bboxOf(l.poly) })),
    lands: GEO.lands.map(p => ({ p, bb: GEO.bboxOf(p) })),
    coast: GEO.lands.flatMap(p => ch(MAP.closeRing(p), 80)),
    lanes: GEO.lanes.flatMap(l => ch(l.pts, 60, () => ({ l }))),
  };
  MAP.towns = GEO.counties;
  MAP.vils = []; GEO.counties.forEach((c, ci) => c.vil.forEach((v, vi) => MAP.vils.push({ v, c, id: ci * 64 + vi })));
  MAP._pp = MAP.LOD_T.map(() => ({})); MAP._bp = MAP.LOD_T.map(() => ({})); MAP._land = [];
};
// 互換（全体地図）
MAP.get = (L, tx, ty) => MAP.world ? MAP.world.get(L, tx, ty) : null;
MAP.drawBase = (g, cam, vw, vh, dpr) => MAP.world.draw(g, cam, vw, vh, dpr);
MAP.busyCount = () => { let n = 0; for (const k in MAP.sets) n += MAP.sets[k].busy + MAP.sets[k].want.length; return n; };
/* ---------- タイルに重ねる絵 ---------- */
MAP.pathFlat = (g, a, smooth, closed) => {
  const n = a.length >> 1; if (n < 2) return;
  g.moveTo(a[0], a[1]);
  if (!smooth || n < 3) { for (let i = 1; i < n; i++) g.lineTo(a[2 * i], a[2 * i + 1]); }
  else {
    for (let i = 1; i < n - 1; i++) { const x = a[2 * i], y = a[2 * i + 1]; g.quadraticCurveTo(x, y, (x + a[2 * i + 2]) / 2, (y + a[2 * i + 3]) / 2); }
    g.lineTo(a[2 * n - 2], a[2 * n - 1]);
  }
  if (closed) g.closePath();
};
MAP.house = (P, x, y, w, h, a) => {
  const c = Math.cos(a), s = Math.sin(a), hw = w / 2, hh = h / 2;
  P.moveTo(x - c * hw + s * hh, y - s * hw - c * hh); P.lineTo(x + c * hw + s * hh, y + s * hw - c * hh);
  P.lineTo(x + c * hw - s * hh, y + s * hw + c * hh); P.lineTo(x - c * hw - s * hh, y - s * hw + c * hh); P.closePath();
};
MAP.decorate = (g, L, tx, ty) => {
  const span = MAP.TS / L, x0 = tx * span, y0 = ty * span, x1 = x0 + span, y1 = y0 + span, px = 1 / L;
  const C = MAP.C, K = MAP.COL;
  const hit = (bb, pad) => bb[2] >= x0 - pad && bb[0] <= x1 + pad && bb[3] >= y0 - pad && bb[1] <= y1 + pad;
  g.setTransform(L, 0, 0, L, -x0 * L, -y0 * L);
  g.lineCap = 'round'; g.lineJoin = 'round';
  // 1. 木・小さな集落
  if (L >= 8) MAP.flora(g, L, x0, y0, x1, y1);
  // 2. 葦
  if (L >= 4) {
    const cell = L >= 16 ? 0.45 : 0.7, P = new Path2D();
    for (let r = Math.floor(y0 / cell) - 1; r <= Math.ceil(y1 / cell); r++) for (let c = Math.floor(x0 / cell) - 1; c <= Math.ceil(x1 / cell); c++) {
      const x = (c + GEO.hash(c, r, 41)) * cell, y = (r + GEO.hash(c, r, 42)) * cell;
      const mr = GEO.marshAt(x, y); if (mr < 0.2 || GEO.hash(c, r, 43) > mr * 0.9) continue;
      if (GEO.water(x, y) === 1) continue;
      const hgt = cell * 0.45;
      for (let k = -1; k <= 1; k++) { P.moveTo(x + k * cell * 0.13, y); P.lineTo(x + k * cell * 0.2, y - hgt * (k ? 0.8 : 1)); }
    }
    g.strokeStyle = K.reed; g.lineWidth = Math.max(0.05, 0.7 * px); g.stroke(P);
  }
  // 3. 小川
  if (L >= 2) {
    const thr = L >= 16 ? 0 : L >= 8 ? 1.3 : L >= 4 ? 3 : 9;
    g.strokeStyle = K.stream;
    for (const c of C.streams) {
      if (c.m < thr || !hit(c.bb, 1)) continue;
      let w = 0; for (let k = 0; k < c.w.length; k++) w += c.w[k]; w /= c.w.length;
      g.lineWidth = Math.max(w * (L >= 8 ? 1 : 1.3), 0.75 * px);
      g.globalAlpha = L >= 8 ? 0.95 : 0.8;
      g.beginPath(); MAP.pathFlat(g, c.p, L >= 4); g.stroke();
    }
    g.globalAlpha = 1;
  }
  // 4. 大河
  for (const pass of L >= 4 ? [0, 1] : [0]) {
    g.strokeStyle = pass ? K.river : K.riverBank;
    for (const c of C.rivers) {
      if (!hit(c.bb, 3)) continue;
      const t = (c.i0 + c.i1) / 2 / c.n, taper = 0.42 + 0.58 * Math.min(1, t / 0.35);
      const w = c.r.w * taper * (c.r.canal ? 0.9 : 1);
      g.lineWidth = pass ? Math.max(w - 1.2 * px, 0.6 * px) : Math.max(w, 1.1 * px);
      g.beginPath(); MAP.pathFlat(g, c.p, false); g.stroke();
    }
  }
  // 5. 湖
  for (const c of C.lakes) {
    if (!hit(c.bb, 2)) continue;
    g.beginPath(); MAP.pathFlat(g, c.l.poly, false, true);
    g.fillStyle = c.l.salt ? '#c9cfc4' : K.lake; g.fill();
    g.strokeStyle = K.shore; g.lineWidth = Math.max(0.18, 0.8 * px); g.stroke();
  }
  // 6. 海（海が地。タイルの四角から、切り抜いた陸を抜いて塗る）
  {
    const pad = Math.min(14, 72 * px), bx0 = x0 - pad, by0 = y0 - pad, bx1 = x1 + pad, by1 = y1 + pad;
    const sea = new Path2D(); sea.rect(bx0, by0, bx1 - bx0, by1 - by0);
    for (const c of C.lands) {
      if (!hit(c.bb, pad)) continue;
      const q = MAP.clipRect(c.p, bx0, by0, bx1, by1);
      if (q.length >= 6) MAP.pathFlat(sea, q, false, true);
    }
    const cp = new Path2D(); let anyCoast = false;
    for (const c of C.coast) { if (!hit(c.bb, pad)) continue; MAP.pathFlat(cp, c.p, false); anyCoast = true; }
    g.fillStyle = K.sea; g.fill(sea, 'evenodd');
    g.save(); g.clip(sea, 'evenodd');
    if (anyCoast) {
      g.strokeStyle = K.sea2; g.lineWidth = Math.min(12, 70 * px); g.stroke(cp);
      g.strokeStyle = K.sea3; g.lineWidth = Math.min(5, 30 * px); g.stroke(cp);
    }
    if (L >= 8) MAP.waves(g, L, x0, y0, x1, y1);
    g.restore();
    if (anyCoast) { g.strokeStyle = K.coast; g.lineWidth = Math.max(0.22, 0.9 * px); g.stroke(cp); }
    // 航路（海を渡る道）
    if (L >= 2) {
      g.strokeStyle = K.lane; g.lineWidth = Math.max(0.18, 1.1 * px); g.setLineDash([Math.max(0.5, 5 * px), Math.max(0.4, 4 * px)]);
      for (const c of C.lanes) { if (!hit(c.bb, 1)) continue; g.beginPath(); MAP.pathFlat(g, c.p, false); g.stroke(); }
      g.setLineDash([]);
    }
  }
  // 7. 道
  if (L >= 8) {
    g.strokeStyle = K.path; g.lineWidth = Math.max(0.13, 0.8 * px); g.setLineDash([0.32, 0.3]);
    for (const c of C.paths) { if (!hit(c.bb, 1)) continue; g.beginPath(); MAP.pathFlat(g, c.p, false); g.stroke(); }
    g.setLineDash([]);
  }
  if (L >= 2) {
    for (const major of L >= 4 ? [0, 1] : [1]) {
      const lw = major ? Math.max(0.42, 1.3 * px) : Math.max(0.26, 0.95 * px);
      g.strokeStyle = major ? K.road : K.road2; g.lineWidth = lw; g.globalAlpha = L >= 4 ? 1 : 0.7;
      for (const c of C.roads) { if (!!c.major !== !!major || !hit(c.bb, 1)) continue; g.beginPath(); MAP.pathFlat(g, c.p, false); g.stroke(); }
      if (L >= 8 && major) { g.strokeStyle = K.roadIn; g.lineWidth = lw * 0.42; for (const c of C.roads) { if (!c.major || !hit(c.bb, 1)) continue; g.beginPath(); MAP.pathFlat(g, c.p, false); g.stroke(); } }
    }
    g.globalAlpha = 1;
    // 橋
    if (L >= 8) {
      for (const c of C.roads) {
        if (!hit(c.bb, 1)) continue;
        const a = c.p, n = a.length >> 1; let prevW = GEO.water(a[0], a[1]) >= 3;
        for (let i = 1; i < n; i++) {
          const x = a[2 * i], y = a[2 * i + 1], wv = GEO.water(x, y), w = wv >= 3;
          if (w && !prevW) {
            let j = i; while (j < n - 1 && GEO.water(a[2 * j], a[2 * j + 1]) >= 3) j++;
            const bx = a[2 * Math.max(0, i - 1)], by = a[2 * Math.max(0, i - 1) + 1], ex = a[2 * j], ey = a[2 * j + 1];
            g.strokeStyle = K.townLine; g.lineWidth = (c.major ? 0.62 : 0.42) + 1.6 * px; g.beginPath(); g.moveTo(bx, by); g.lineTo(ex, ey); g.stroke();
            g.strokeStyle = '#c6ad82'; g.lineWidth = c.major ? 0.62 : 0.42; g.beginPath(); g.moveTo(bx, by); g.lineTo(ex, ey); g.stroke();
          }
          prevW = w;
        }
      }
    }
  }
  // 8. 長城
  {
    const lw = Math.max(0.42, 1.3 * px);
    g.strokeStyle = K.wall; g.lineWidth = lw;
    for (const c of C.walls) { if (!hit(c.bb, 1)) continue; g.beginPath(); MAP.pathFlat(g, c.p, false); g.stroke(); }
    if (L >= 8) {
      const P = new Path2D(), T = new Path2D();
      for (const c of C.walls) {
        if (!hit(c.bb, 1)) continue;
        const a = c.p, n = a.length >> 1; let acc = 0;
        for (let i = 1; i < n; i++) {
          const ax = a[2 * i - 2], ay = a[2 * i - 1], bx = a[2 * i], by = a[2 * i + 1], l = Math.hypot(bx - ax, by - ay) || 1;
          const nx = -(by - ay) / l, ny = (bx - ax) / l;
          for (let d = (0.6 - acc % 0.6); d < l; d += 0.6) { const x = ax + (bx - ax) * d / l, y = ay + (by - ay) * d / l; P.rect(x + nx * lw * 0.5 - 0.09, y + ny * lw * 0.5 - 0.09, 0.18, 0.18); }
          const k0 = Math.floor(acc / 7), k1 = Math.floor((acc + l) / 7);
          if (k1 > k0) { const d = k1 * 7 - acc, x = ax + (bx - ax) * d / l, y = ay + (by - ay) * d / l; T.rect(x - 0.38, y - 0.38, 0.76, 0.76); }
          acc += l;
        }
      }
      g.fillStyle = K.wall; g.fill(P);
      g.fillStyle = '#9b8462'; g.fill(T); g.strokeStyle = K.wall; g.lineWidth = Math.max(0.08, 0.8 * px); g.stroke(T);
    }
  }
  // 9. 関
  if (L >= 4) for (const p of GEO.PASSES) {
    if (p.x < x0 - 3 || p.x > x1 + 3 || p.y < y0 - 3 || p.y > y1 + 3) continue;
    const r = Math.max(0.7, 4 * px);
    g.fillStyle = '#8e7655'; g.strokeStyle = K.townLine; g.lineWidth = Math.max(0.1, 0.9 * px);
    g.fillRect(p.x - r * 1.3, p.y - r * 0.9, r * 0.8, r * 1.5); g.strokeRect(p.x - r * 1.3, p.y - r * 0.9, r * 0.8, r * 1.5);
    g.fillRect(p.x + r * 0.5, p.y - r * 0.9, r * 0.8, r * 1.5); g.strokeRect(p.x + r * 0.5, p.y - r * 0.9, r * 0.8, r * 1.5);
    g.fillRect(p.x - r * 1.45, p.y - r * 1.2, r * 2.9, r * 0.38); g.strokeRect(p.x - r * 1.45, p.y - r * 1.2, r * 2.9, r * 0.38);
  }
  // 10. 郷（村）
  if (L >= 4) {
    const P = new Path2D(), R = new Path2D();
    for (const it of MAP.vils) {
      const v = it.v; if (v.x < x0 - 3 || v.x > x1 + 3 || v.y < y0 - 3 || v.y > y1 + 3) continue;
      if (L < 8) { const r = Math.max(0.32, 1.7 * px) * (0.8 + v.s * 0.3); P.moveTo(v.x + r, v.y); P.arc(v.x, v.y, r, 0, 6.2832); continue; }
      const n = 4 + Math.floor(v.s * 5), base = GEO.hash(it.id, 3, 61) * 3.14;
      for (let k = 0; k < n; k++) {
        const a = GEO.hash(it.id, k, 62) * 6.2832, d = Math.sqrt(GEO.hash(it.id, k, 63)) * (0.45 + v.s * 0.7);
        const hx = v.x + Math.cos(a) * d, hy = v.y + Math.sin(a) * d;
        if (GEO.water(hx, hy)) continue;
        const ang = base + (GEO.hash(it.id, k, 64) - 0.5) * 0.5;
        MAP.house(P, hx, hy, 0.34, 0.24, ang);
        if (L >= 16) { const c = Math.cos(ang), s = Math.sin(ang); R.moveTo(hx - c * 0.17, hy - s * 0.17); R.lineTo(hx + c * 0.17, hy + s * 0.17); }
      }
    }
    g.fillStyle = L < 8 ? '#6c5844' : K.house; g.fill(P);
    if (L >= 8) { g.strokeStyle = K.roof; g.lineWidth = Math.max(0.04, 0.7 * px); g.stroke(P); if (L >= 16) g.stroke(R); }
  }
  // 11. 県城（城壁で囲む）
  if (L >= 2) for (const t of MAP.towns) {
    if (t.x < x0 - 4 || t.x > x1 + 4 || t.y < y0 - 4 || t.y > y1 + 4) continue;
    const cap = D.PROVINCES[t.pi] && D.PROVINCES[t.pi].cap && t.seat;
    const hs = t.pass ? 0.8 : cap ? 1.9 : t.seat ? 1.35 : 0.8;
    if (L < 4) { const r = Math.max(hs * 0.8, 1.6 * px); g.fillStyle = '#5b4835'; g.fillRect(t.x - r, t.y - r, r * 2, r * 2); continue; }
    g.fillStyle = K.town; g.fillRect(t.x - hs, t.y - hs, hs * 2, hs * 2);
    if (L >= 8) {
      // 通りと家並み
      const P = new Path2D(), cells = cap ? 6 : t.seat ? 5 : 3, step = hs * 2 / cells;
      for (let a = 0; a < cells; a++) for (let b = 0; b < cells; b++) {
        if ((a === Math.floor(cells / 2)) || (b === Math.floor(cells / 2))) continue;
        if (GEO.hash(t.k * 13 + a, b, t.pi + 70) < 0.12) continue;
        const cx = t.x - hs + (a + 0.5) * step, cy = t.y - hs + (b + 0.5) * step;
        P.rect(cx - step * 0.36, cy - step * 0.3, step * 0.72, step * 0.6);
      }
      g.fillStyle = K.house; g.fill(P); g.strokeStyle = K.roof; g.lineWidth = Math.max(0.04, 0.6 * px); g.stroke(P);
      if (t.seat) { g.fillStyle = '#a5503a'; g.fillRect(t.x - step * 0.45, t.y - step * 0.45, step * 0.9, step * 0.9); }
    }
    g.strokeStyle = K.townLine; g.lineWidth = Math.max(0.16, (t.seat ? 1.6 : 1.1) * px); g.strokeRect(t.x - hs, t.y - hs, hs * 2, hs * 2);
    if (L >= 8) { const r = 0.14; g.fillStyle = K.townLine; for (const [cx, cy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.fillRect(t.x + cx * hs - r, t.y + cy * hs - r, r * 2, r * 2); }
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
};
// 木と小さな集落（決まった格子から置くので、タイルの境目でずれない）
MAP.flora = (g, L, x0, y0, x1, y1) => {
  const K = MAP.COL;
  const cell = L >= 16 ? 0.5 : 0.8;
  const crown = new Path2D(), hi = new Path2D(), con = new Path2D();
  for (let r = Math.floor(y0 / cell) - 1; r <= Math.ceil(y1 / cell); r++) for (let c = Math.floor(x0 / cell) - 1; c <= Math.ceil(x1 / cell); c++) {
    const h1 = GEO.hash(c, r, 21), h2 = GEO.hash(c, r, 22), h3 = GEO.hash(c, r, 23);
    const x = (c + 0.15 + h1 * 0.7) * cell, y = (r + 0.15 + h2 * 0.7) * cell;
    if (GEO.water(x, y)) continue;
    const e = GEO.elev(x, y);
    const m = GEO.sample(GEO.M, x, y), st = GEO.sample(GEO.STEP, x, y) / 255, lo = GEO.sample(GEO.LOES, x, y) / 255, sd = GEO.sample(GEO.SAND, x, y) / 255;
    if (sd > 0.6) continue;
    const fo = GEO.forestOf(m, e, GEO.fnoise(x, y), st, lo, sd);
    if (fo < 0.04) continue;
    const tn = GEO.vn(x * 1.9 + 5.3, y * 1.9 + 1.7);
    const cov = GEO.smoothstep(-0.1, 0.12, fo * 1.15 - tn * 0.75 - 0.08) * (0.75 + 0.25 * fo);
    if (h3 > cov * 0.92) continue;
    const rr = cell * (0.3 + h1 * 0.14);
    if (e > 0.5 && h2 < 0.65) { con.moveTo(x, y - rr * 1.5); con.lineTo(x + rr * 0.85, y + rr * 0.6); con.lineTo(x - rr * 0.85, y + rr * 0.6); con.closePath(); }
    else { crown.moveTo(x + rr, y); crown.arc(x, y, rr, 0, 6.2832); hi.moveTo(x - rr * 0.2 + rr * 0.45, y - rr * 0.3); hi.arc(x - rr * 0.2, y - rr * 0.3, rr * 0.45, 0, 6.2832); }
  }
  g.fillStyle = K.tree; g.fill(crown); g.fill(con);
  g.fillStyle = K.treeHi; g.fill(hi);
  // 集落（田畑の多い所にぽつぽつ）
  const hc = 3.4, P = new Path2D();
  for (let r = Math.floor(y0 / hc) - 1; r <= Math.ceil(y1 / hc); r++) for (let c = Math.floor(x0 / hc) - 1; c <= Math.ceil(x1 / hc); c++) {
    const h1 = GEO.hash(c, r, 31), h2 = GEO.hash(c, r, 32), h3 = GEO.hash(c, r, 33);
    const x = (c + 0.2 + h1 * 0.6) * hc, y = (r + 0.2 + h2 * 0.6) * hc;
    if (GEO.water(x, y)) continue;
    const cv = GEO.cover(x, y);
    const pop = GEO.sample(GEO.popField, x, y);
    if (h3 > cv.farm * Math.min(1, 0.3 + pop) * 0.5) continue;
    const n = 2 + Math.floor(h1 * 3), ang = h2 * 3;
    for (let k = 0; k < n; k++) {
      const a = GEO.hash(c * 7 + k, r, 34) * 6.2832, d = 0.15 + GEO.hash(c, r * 7 + k, 35) * 0.45;
      MAP.house(P, x + Math.cos(a) * d, y + Math.sin(a) * d, 0.3, 0.21, ang + (GEO.hash(c, r, 36 + k) - 0.5) * 0.4);
    }
  }
  g.fillStyle = K.house; g.fill(P); g.strokeStyle = K.roof; g.lineWidth = Math.max(0.04, 0.7 / L); g.stroke(P);
};
// 海の波
MAP.waves = (g, L, x0, y0, x1, y1) => {
  const cell = 1.6, P = new Path2D();
  for (let r = Math.floor(y0 / cell) - 1; r <= Math.ceil(y1 / cell); r++) for (let c = Math.floor(x0 / cell) - 1; c <= Math.ceil(x1 / cell); c++) {
    const x = (c + GEO.hash(c, r, 51)) * cell, y = (r + GEO.hash(c, r, 52)) * cell;
    if (GEO.water(x, y) !== 1) continue;
    const sd = GEO.sdist(x, y); if (sd > 9 || GEO.hash(c, r, 53) > 0.55) continue;
    const w = 0.35 + GEO.hash(c, r, 54) * 0.3;
    P.moveTo(x - w, y); P.quadraticCurveTo(x - w / 2, y - w * 0.45, x, y); P.quadraticCurveTo(x + w / 2, y - w * 0.45, x + w, y);
  }
  g.strokeStyle = 'rgba(240,246,238,.55)'; g.lineWidth = Math.max(0.05, 0.8 / L); g.stroke(P);
};
/* ---------- 線の間引き（拡大率ごと） ---------- */
MAP.lodFor = (dev) => { const need = 0.6 / dev; for (let k = 0; k < MAP.LOD_T.length; k++) if (MAP.LOD_T[k] <= need) return k; return MAP.LOD_T.length - 1; };
MAP.provPath = (pi, lod) => {
  const c = MAP._pp[lod]; if (c[pi]) return c[pi];
  const P = new Path2D(); let bb = [Infinity, Infinity, -Infinity, -Infinity];
  for (const ring of GEO.provRings[pi] || []) {
    const r = GEO.simplify(ring, MAP.LOD_T[lod]); MAP.pathFlat(P, r, false, true);
    const b = GEO.bboxOf(r); bb = [Math.min(bb[0], b[0]), Math.min(bb[1], b[1]), Math.max(bb[2], b[2]), Math.max(bb[3], b[3])];
  }
  return (c[pi] = { P, bb });
};
MAP.borderPts = (bi, lod) => { const c = MAP._bp[lod]; if (c[bi]) return c[bi]; const p = GEO.simplify(GEO.borders[bi].pts, MAP.LOD_T[lod]); return (c[bi] = { p, bb: GEO.bboxOf(p) }); };
MAP.landPath = (lod) => {
  if (MAP._land[lod]) return MAP._land[lod];
  const P = new Path2D();
  for (const ring of GEO.lands) MAP.pathFlat(P, GEO.simplify(MAP.closeRing(ring), MAP.LOD_T[lod] * 0.5), false, true);
  for (const l of GEO.lakes) MAP.pathFlat(P, GEO.simplify(l.poly, MAP.LOD_T[lod] * 0.5), false, true);
  return (MAP._land[lod] = P);
};
// 閉じた輪（最後に最初の点を足す）
MAP.closeRing = (a) => { const o = new Float32Array(a.length + 2); o.set(a); o[a.length] = a[0]; o[a.length + 1] = a[1]; return o; };
// 多角形を四角で切り抜く（Sutherland–Hodgman。凹んだ形でも塗りは正しい）
MAP.clipRect = (a, x0, y0, x1, y1) => {
  let pts = a;
  const edge = (src, inside, cut) => {
    const n = src.length >> 1, out = [];
    if (!n) return out;
    let px = src[2 * n - 2], py = src[2 * n - 1], pin = inside(px, py);
    for (let i = 0; i < n; i++) {
      const x = src[2 * i], y = src[2 * i + 1], cin = inside(x, y);
      if (cin) { if (!pin) out.push(...cut(px, py, x, y)); out.push(x, y); }
      else if (pin) out.push(...cut(px, py, x, y));
      px = x; py = y; pin = cin;
    }
    return out;
  };
  pts = edge(pts, (x) => x >= x0, (ax, ay, bx, by) => [x0, ay + (by - ay) * (x0 - ax) / (bx - ax)]);
  pts = edge(pts, (x) => x <= x1, (ax, ay, bx, by) => [x1, ay + (by - ay) * (x1 - ax) / (bx - ax)]);
  pts = edge(pts, (x, y) => y >= y0, (ax, ay, bx, by) => [ax + (bx - ax) * (y0 - ay) / (by - ay), y0]);
  pts = edge(pts, (x, y) => y <= y1, (ax, ay, bx, by) => [ax + (bx - ax) * (y1 - ay) / (by - ay), y1]);
  return pts;
};
/* ---------- 文字の置き場（重なりを避ける） ---------- */
MAP.Labels = function () { this.r = []; };
MAP.Labels.prototype.fits = function (x0, y0, x1, y1) { for (const r of this.r) if (x0 < r[2] && x1 > r[0] && y0 < r[3] && y1 > r[1]) return false; return true; };
MAP.Labels.prototype.add = function (x0, y0, x1, y1) { this.r.push([x0, y0, x1, y1]); };
// 一文字ずつ間をあけて書く
MAP.spaced = (g, text, x, y, sp, halo) => {
  const ch = [...text], w = ch.map(c => g.measureText(c).width), tot = w.reduce((a, b) => a + b, 0) + sp * (ch.length - 1);
  let cx = x - tot / 2;
  ch.forEach((c, i) => { if (halo) g.strokeText(c, cx + w[i] / 2, y); g.fillText(c, cx + w[i] / 2, y); cx += w[i] + sp; });
  return tot;
};
