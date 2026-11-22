/* =========================================================
   地中海覇道 — 合戦場の地形（細かい格子・全体マップ連動）
   航行格子（96×128）で道を探し、その5×5倍の細格子（480×640）で
   地表・描画・足元の効果を決める。全体マップの川・道・郷・森・田畑を写す。
   ========================================================= */
B.FINE = 5;
B.fineIdx = (bt, x, y) => { const f = bt.fine; const c = U.clamp(Math.floor(x / f.cell), 0, f.cols - 1), r = U.clamp(Math.floor(y / f.cell), 0, f.rows - 1); return r * f.cols + c; };
// 足元の地形（細格子。航行格子が城・焼跡など動く地形ならそちら）
B.groundT = (bt, x, y) => {
  const nt = bt.terr[B.ti(bt, x, y)];
  if (!bt.fine) return nt;
  const T = D.T;
  if (nt === T.WALL || nt === T.GATE || nt === T.BROKEN || nt === T.BURNT || nt === T.CITY) return nt;
  const ft = bt.fine.type[B.fineIdx(bt, x, y)];
  if (D.TILE[ft].mv[0] <= 0 && D.TILE[nt].mv[0] > 0) return nt;
  return ft;
};
B.tileAt = (bt, x, y) => B.groundT(bt, x, y);
// 地勢ごとの既定の割合（全体マップの情報がない時）
B.THEME_MIX = {
  plain:  { forest: 0.1, farm: 0.4, marsh: 0, sand: 0, steppe: 0, village: 2 },
  hill:   { forest: 0.16, farm: 0.22, marsh: 0, sand: 0, steppe: 0, village: 1 },
  mount:  { forest: 0.22, farm: 0.06, marsh: 0, sand: 0, steppe: 0, village: 1 },
  forest: { forest: 0.4, farm: 0.1, marsh: 0.03, sand: 0, steppe: 0, village: 1 },
  river:  { forest: 0.08, farm: 0.38, marsh: 0.08, sand: 0, steppe: 0, village: 2 },
  marsh:  { forest: 0.08, farm: 0.15, marsh: 0.32, sand: 0, steppe: 0, village: 1 },
  steppe: { forest: 0.02, farm: 0.04, marsh: 0, sand: 0.12, steppe: 1, village: 0 },
  pass:   { forest: 0.16, farm: 0.05, marsh: 0, sand: 0, steppe: 0, village: 0 },
  coast:  { forest: 0.08, farm: 0.25, marsh: 0, sand: 0.04, steppe: 0, village: 1 },
  desert: { forest: 0.01, farm: 0.02, marsh: 0, sand: 0.3, steppe: 0, village: 0 },
};
B.genTerrain = (bt) => {
  const { cols, rows, spec } = bt, N = cols * rows;
  bt.terr = new Uint8Array(N); bt.elev = new Float32Array(N); bt.fire = new Float32Array(N); bt.flood = new Float32Array(N); bt.burnt = new Uint8Array(N);
  B.genField(bt);
  B.navFromFine(bt);
  // 山道は航行格子でも途切れないように
  if (bt.feat.passPath) { const p = bt.feat.passPath; for (let k = 1; k < p.length; k++) { const n = Math.ceil(Math.hypot(p[k][0] - p[k - 1][0], p[k][1] - p[k - 1][1]) / (bt.tile * 0.3)); for (let q = 0; q <= n; q++) { const i = B.ti(bt, p[k - 1][0] + (p[k][0] - p[k - 1][0]) * q / n, p[k - 1][1] + (p[k][1] - p[k - 1][1]) * q / n); if (bt.terr[i] === D.T.MOUNT || bt.terr[i] === D.T.ROCK) bt.terr[i] = D.T.PATH; } } }
  const snap = bt.terr.slice();
  if (spec.kind === 'pass') B.buildPass(bt);
  else if (spec.kind === 'siege' && spec.city >= 0) B.buildCity(bt);
  for (let i = 0; i < N; i++) if (bt.terr[i] !== snap[i]) B.stampFine(bt, i, bt.terr[i]);
  bt.river = []; for (let i = 0; i < N; i++) if (bt.terr[i] === D.T.RIVER) bt.river.push(i);
  if (!bt.river.length) bt.river = null;
};
// 航行格子1枚ぶんの細格子を塗る
B.stampFine = (bt, i, t) => {
  const f = bt.fine, F = B.FINE, c = i % bt.cols, r = (i - c) / bt.cols;
  for (let dr = 0; dr < F; dr++) for (let dc = 0; dc < F; dc++) {
    const k = (r * F + dr) * f.cols + c * F + dc;
    f.type[k] = t;
    if (t === D.T.MOUNT) f.elev[k] = Math.max(f.elev[k], 0.82);
  }
};
// 細格子 → 航行格子（多数決。ただし水・橋・道は少なくても優先）
B.navFromFine = (bt) => {
  const { cols, rows } = bt, F = B.FINE, f = bt.fine, T = D.T;
  const cnt = new Uint16Array(D.TILE.length + 1);
  const skip = new Set([T.RIVER, T.POND, T.BRIDGE, T.FORD, T.ROAD, T.STREAM, T.PATH, T.SEA, T.SHOAL]);
  // 細い障害物は少なくても航行格子に残す（通り道をふさぐため）
  const OB = [[T.PALISADE, 4], [T.STONEWALL, 4], [T.WAGON, 4], [T.ABATIS, 5], [T.DITCH, 5], [T.CLIFF, 7], [T.TEMPLE, 10], [T.HOUSE, 15]];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    cnt.fill(0); let es = 0;
    for (let dr = 0; dr < F; dr++) { const o = (r * F + dr) * f.cols + c * F; for (let dc = 0; dc < F; dc++) { cnt[f.type[o + dc]]++; es += f.elev[o + dc]; } }
    const i = r * cols + c;
    bt.elev[i] = es / (F * F);
    const water = cnt[T.RIVER] + cnt[T.POND] + cnt[T.SEA];
    let t = -1;
    if (cnt[T.BRIDGE] >= 3) t = T.BRIDGE;
    else if (water >= 9) t = (cnt[T.SEA] >= cnt[T.POND] && cnt[T.SEA] >= cnt[T.RIVER]) ? T.SEA : cnt[T.POND] > cnt[T.RIVER] ? T.POND : T.RIVER;
    else if (cnt[T.SHOAL] + cnt[T.SEA] >= 9) t = T.SHOAL;
    if (t < 0) for (const [ob, n] of OB) if (cnt[ob] >= n) { t = ob; break; }
    if (t >= 0) {}
    else if (cnt[T.FORD] >= 6) t = T.FORD;
    else if (cnt[T.ROAD] >= 6) t = T.ROAD;
    else if (cnt[T.PATH] >= 6) t = T.PATH;
    else if (cnt[T.STREAM] >= 5) t = T.STREAM;
    else { let best = T.PLAIN, bc = -1; for (let k = 0; k < D.TILE.length; k++) { if (skip.has(k)) continue; if (cnt[k] > bc) { bc = cnt[k]; best = k; } } t = best; }
    bt.terr[i] = t;
  }
};
// 折れ線を細格子に塗る（幅 w、cb(i, d) を呼ぶ）
B.fieldLine = (f, pts, w, cb) => {
  const fc = f.cell, rad = w / 2;
  for (let k = 1; k < pts.length; k++) {
    const [ax, ay] = pts[k - 1], [bx, by] = pts[k];
    const c0 = Math.max(0, Math.floor((Math.min(ax, bx) - rad) / fc) - 1), c1 = Math.min(f.cols - 1, Math.ceil((Math.max(ax, bx) + rad) / fc) + 1);
    const r0 = Math.max(0, Math.floor((Math.min(ay, by) - rad) / fc) - 1), r1 = Math.min(f.rows - 1, Math.ceil((Math.max(ay, by) + rad) / fc) + 1);
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      const px = (c + 0.5) * fc, py = (r + 0.5) * fc;
      let t = ((px - ax) * dx + (py - ay) * dy) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const qx = ax + dx * t - px, qy = ay + dy * t - py, d = Math.sqrt(qx * qx + qy * qy);
      if (d <= rad) cb(r * f.cols + c, d);
    }
  }
};
// 二点の間をゆらゆら結ぶ線
B.wobbly = (x0, y0, x1, y1, amp, n, rnd) => {
  const pts = [], L = Math.hypot(x1 - x0, y1 - y0) || 1, nx = -(y1 - y0) / L, ny = (x1 - x0) / L;
  const ph1 = rnd() * 6.28, ph2 = rnd() * 6.28, f1 = 1 + rnd() * 1.5, f2 = 3 + rnd() * 3;
  for (let k = 0; k <= n; k++) {
    const t = k / n, env = Math.sin(Math.PI * t) * 0.85 + 0.15;
    const o = (Math.sin(t * 6.28 * f1 + ph1) * 0.7 + Math.sin(t * 6.28 * f2 + ph2) * 0.3) * amp * env;
    pts.push([x0 + (x1 - x0) * t + nx * o, y0 + (y1 - y0) * t + ny * o]);
  }
  return pts;
};
B.genField = (bt) => {
  const { cols, rows, spec, W, H } = bt, F = B.FINE, FC = cols * F, FR = rows * F, FN = FC * FR, T = D.T;
  const fc = bt.tile / F;
  const f = bt.fine = { cols: FC, rows: FR, cell: fc, type: new Uint8Array(FN), elev: new Float32Array(FN) };
  // 戦場図（名のある戦場）が決まっていれば、その形で作る（全体マップの土地は名前にだけ使う）
  const FE0 = spec.field && typeof FLD !== 'undefined' ? FLD.get(spec.field.id) : null, AR = FE0 ? FLD.ARCH[FE0.arch] : null;
  const theme = (AR && AR.theme) || spec.theme || 'plain', th = D.TERRAIN_THEME[theme] || D.TERRAIN_THEME.plain;
  const mix = Object.assign({}, B.THEME_MIX[theme] || B.THEME_MIX.plain);
  if (FE0) { Object.assign(mix, FLD.BIOMES[FE0.bio].mix); if (AR.mix) Object.assign(mix, AR.mix); }
  const rnd = FE0 ? U.rng(FE0.seed) : bt.rng, sd = FE0 ? FE0.seed : (spec.seed || 1);
  const n1 = U.noise2(sd), n2 = U.noise2(sd + 77), n3 = U.noise2(sd + 191), n4 = U.noise2(sd + 313), n5 = U.noise2(sd + 457), n6 = U.noise2(sd + 599);
  const nameSite = spec.site || null;
  const site = FE0 ? null : (spec.site || null), R = 7;
  // 全体マップの情報で割合を決める
  if (site) {
    mix.forest = U.clamp(site.forest * 0.8, 0.02, 0.5) * (theme === 'forest' ? 1.3 : 1);
    mix.farm = U.clamp(site.farm * 0.6, 0, 0.6);
    mix.marsh = U.clamp(site.marsh * 0.7 + (theme === 'marsh' ? 0.15 : 0), 0, 0.4);
    mix.sand = U.clamp(site.sand * 0.6, 0, 0.4);
    mix.steppe = site.steppe;
  }
  if (spec.kind === 'pass' || spec.kind === 'siege') mix.farm *= 0.6;
  // 灌漑畑はエジプト（ナイルの谷）。ほかは麦・オリーブ・ぶどう
  const paddy = FE0 ? !!FLD.BIOMES[FE0.bio].paddy : (site && typeof FLD !== 'undefined' ? (FLD.biomeOf(spec.pid) === 'aegyptus' && site.elev < 0.3) : false);
  // 向き：川があれば川を横に、なければ道を縦に
  let rot = 0;
  if (site && site.river && site.river.d < R) rot = -site.river.ang;
  else if (site && site.road && site.road.d < R) rot = Math.PI / 2 - site.road.ang;
  rot = U.angNorm(rot); if (rot > Math.PI / 2) rot -= Math.PI; if (rot < -Math.PI / 2) rot += Math.PI;
  const ca = Math.cos(rot), sa = Math.sin(rot), K = (W * 0.5) / R * 0.92;
  const mapP = (dx, dy) => [W / 2 + (dx * ca - dy * sa) * K, H / 2 + (dx * sa + dy * ca) * K];
  const dirB = (a) => { let v = U.angNorm(a + rot); if (v > Math.PI / 2) v -= Math.PI; if (v < -Math.PI / 2) v += Math.PI; return v; };
  bt.feat = { river: null, streams: [], roads: [], villages: [], ponds: [], rot, fieldAng: rnd() * Math.PI };
  // 1. 高さ
  let tgx = 0, tgy = 0;
  if (site && site.ring) { for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; tgx += site.ring[k] * Math.cos(a); tgy += site.ring[k] * Math.sin(a); } const bx = tgx * ca - tgy * sa, by = tgx * sa + tgy * ca; tgx = bx; tgy = by; }
  const tm = Math.hypot(tgx, tgy), tilt = U.clamp(tm * 1.2, 0, 0.14);
  const rough = site ? U.clamp(0.85 + site.rough * 5, 0.85, 1.35) : 1;
  // 低い周波数は粗く求めて補間（速さのため）
  const GC = cols + 1, GR = rows + 1, gE = new Float32Array(GC * GR), gF = new Float32Array(GC * GR), gM = new Float32Array(GC * GR), gS = new Float32Array(GC * GR);
  for (let r = 0; r < GR; r++) for (let c = 0; c < GC; c++) {
    const nx = c / cols, ny = r / rows, k = r * GC + c;
    let e = n1(nx * 2.6 + 1.3, ny * 2.6 * 1.33 + 0.7, 4);
    e = 0.5 + (e - 0.5) * rough;
    if (tm > 1e-6) e += tilt * ((nx - 0.5) * tgx + (ny - 0.5) * tgy * 1.33) / tm;
    gE[k] = e;
    gF[k] = n2(nx * 4.2 + 5, ny * 4.2 * 1.33 + 9, 3);
    gM[k] = n3(nx * 3 + 2, ny * 3 * 1.33 + 4, 3);
    gS[k] = n5(nx * 3.4 + 7, ny * 3.4 * 1.33 + 2, 2);
  }
  const lerpG = (A, c, r, tx, ty) => { const k = r * GC + c; return (A[k] * (1 - tx) + A[k + 1] * tx) * (1 - ty) + (A[k + GC] * (1 - tx) + A[k + GC + 1] * tx) * ty; };
  const FE = f.elev, FF = new Float32Array(FN), FM = new Float32Array(FN), FS = new Float32Array(FN);
  for (let r = 0; r < FR; r++) {
    const gy = (r + 0.5) / F, gr = Math.min(rows - 1, Math.floor(gy)), ty = gy - gr;
    for (let c = 0; c < FC; c++) {
      const gx = (c + 0.5) / F, gc = Math.min(cols - 1, Math.floor(gx)), tx = gx - gc, i = r * FC + c;
      const nx = (c + 0.5) / FC, ny = (r + 0.5) / FR;
      const d1 = n4(nx * 16, ny * 21.3, 2) - 0.5, d2 = n6(nx * 22 + 3, ny * 29 + 5, 2) - 0.5;
      FE[i] = lerpG(gE, gc, gr, tx, ty) + d1 * 0.07;
      FF[i] = lerpG(gF, gc, gr, tx, ty) + d2 * 0.16;
      FM[i] = lerpG(gM, gc, gr, tx, ty) + d1 * 0.1;
      FS[i] = lerpG(gS, gc, gr, tx, ty) + d2 * 0.12;
    }
  }
  // 割合から閾値（上から frac の所）
  const quant = (A, frac) => { if (frac <= 0) return 9; const s = []; for (let k = 0; k < 4000; k++) s.push(A[Math.floor(rnd() * FN)]); s.sort((a, b) => a - b); return s[Math.floor(U.clamp(1 - frac, 0, 0.999) * s.length)]; };
  const thF = quant(FF, mix.forest), thG = quant(FF, Math.min(0.85, mix.forest * 1.7 + 0.03));
  const thM = mix.marsh > 0 ? quant(FM, mix.marsh) : 9, thS = mix.sand > 0 ? quant(FS, mix.sand) : 9;
  const steppe = mix.steppe > 0.5;
  // 2. 地表
  const ft = f.type;
  for (let r = 0; r < FR; r++) for (let c = 0; c < FC; c++) {
    const i = r * FC + c, nx = (c + 0.5) / FC, ny = (r + 0.5) / FR, e = FE[i];
    let t = steppe ? T.GRASS : T.PLAIN;
    const sideBand = nx < 0.22 || nx > 0.78;
    if (th.mount && e > th.mount && (sideBand || theme === 'mount')) t = T.MOUNT;
    else if (e > th.hill) t = T.HILL;
    const fv = FF[i];
    if (t !== T.MOUNT) { if (fv > thF) t = T.FOREST; else if (fv > thG) t = T.GROVE; }
    if (FM[i] > thM && e < 0.54 && t !== T.MOUNT) t = T.MARSH;
    if (FS[i] > thS && (t === T.PLAIN || t === T.GRASS || t === T.HILL || t === T.GROVE)) t = T.SAND;
    if (t === T.HILL && e > th.hill + 0.13 && FS[i] > 0.6) t = T.ROCK;
    if ((t === T.PLAIN || t === T.GRASS) && FM[i] < 0.3) t = T.DIRT;
    // 合戦の布陣の邪魔にならないように
    const edge = ny < 0.17 || ny > 0.83;
    if (edge && (t === T.MOUNT || t === T.MARSH || t === T.ROCK)) t = e > th.hill ? T.HILL : (steppe ? T.GRASS : T.PLAIN);
    if (edge && (t === T.FOREST) && (nx > 0.3 && nx < 0.7)) t = T.GROVE;
    ft[i] = t;
  }
  // 2b. 関所：両側の山を細かい格子で削り出し、山の抜け道をつける
  if (spec.kind === 'pass') {
    const cs = spec.city >= 0 ? spec.city : 1;
    const ph1 = rnd() * 6.28, ph2 = rnd() * 6.28;
    const vL = (fy) => FC * 0.32 + (Math.sin(fy / FR * 6.28 * 2.3 + ph1) * 0.6 + (n5(0.3, fy / FR * 7, 2) - 0.5) * 1.6) * F * 1.8;
    const vR = (fy) => FC * 0.68 + (Math.sin(fy / FR * 6.28 * 1.9 + ph2) * 0.6 + (n6(0.7, fy / FR * 7, 2) - 0.5) * 1.6) * F * 1.8;
    for (let r = 0; r < FR; r++) {
      const a = vL(r + 0.5), b = vR(r + 0.5);
      for (let c = 0; c < FC; c++) {
        const i = r * FC + c, x = c + 0.5;
        if (x < a || x > b) { ft[i] = T.MOUNT; FE[i] = Math.max(FE[i], 0.8 + (FF[i] - 0.5) * 0.2 + Math.min(1, Math.min(Math.abs(x - a), Math.abs(x - b)) / 40) * 0.15); }
        else if (x < a + 3 || x > b - 3) { if (GEO.hash(c >> 1, r >> 1, 91) < 0.55) ft[i] = T.ROCK; FE[i] = Math.max(FE[i], 0.7); }
        else if (ft[i] === T.MOUNT) ft[i] = T.HILL;
      }
    }
    // 抜け道
    const startR = cs === 1 ? FR - 8 * B.TS * F : 7 * B.TS * F, endR = cs === 1 ? Math.round(FR * 0.18) : Math.round(FR * 0.82);
    const dir = startR < endR ? 1 : -1;
    let pc = FC * 0.12; const pts = [];
    for (let r = startR; dir > 0 ? r <= endR : r >= endR; r += dir * F) { pc = U.clamp(pc + (rnd() - 0.5) * F * 1.6, 3 * F, vL(r) - 3 * F); pts.push([(pc + 0.5) * fc, (r + 0.5) * fc]); }
    const ex = vL(endR) + 2;
    for (let k = 1; k <= 4; k++) pts.push([(pc + (ex - pc) * k / 4 + 0.5) * fc, (endR + 0.5 + Math.sin(k) * 2) * fc]);
    B.fieldLine(f, pts, fc * 3, (i) => { const t = ft[i]; if (t === T.MOUNT || t === T.ROCK || t === T.HILL || t === T.FOREST || t === T.GROVE) ft[i] = T.PATH; });
    bt.feat.passPath = pts;
    bt.secretPath = { x: pts[pts.length - 1][0], y: pts[pts.length - 1][1] };
  }
  // 2c. 戦場図の形を彫る（山・湖・海・森・砂丘など）
  if (FE0) {
    bt.feat.field = FE0;
    const X = FLD.ctx(bt, FE0, spec.field.a, FE, FF);
    bt._fx = X;
    if (AR.sculpt) AR.sculpt(X);
  }
  // 3. 田畑（区画ごと。向きは戦場ごと）
  if (mix.farm > 0.02) {
    const fa = bt.feat.fieldAng, fca = Math.cos(fa), fsa = Math.sin(fa);
    const pw = fc * (4 + rnd() * 3), ph = fc * (6 + rnd() * 4);
    for (let r = 0; r < FR; r++) for (let c = 0; c < FC; c++) {
      const i = r * FC + c, t = ft[i];
      if (t !== T.PLAIN && t !== T.DIRT && t !== T.GRASS && !(t === T.HILL && FE[i] < th.hill + 0.05)) continue;
      const x = (c + 0.5) * fc, y = (r + 0.5) * fc;
      if (FE0 && (t === T.SAND || t === T.DUNE)) continue;
      const iu = Math.floor((x * fca + y * fsa) / pw), iv = Math.floor((-x * fsa + y * fca) / ph);
      const pr = mix.farm * (0.55 + (FM[i] - 0.5) * 0.9 + (1 - Math.abs(FE[i] - 0.45) * 2) * 0.3);
      if (GEO.hash(iu, iv, sd & 1023) < pr) ft[i] = paddy && FE[i] < 0.5 ? T.PADDY : T.FIELD;
    }
    bt.feat.parcel = { pw, ph };
  }
  // 4. 大河
  const hasRiver = AR ? (AR.river && AR.river !== 'none' && (AR.river !== 'auto' || !!(nameSite && nameSite.river && nameSite.river.d < R)))
    : spec.kind !== 'pass' && ((site && site.river && site.river.d < R) || theme === 'river' || (theme === 'marsh' && rnd() < 0.5));
  if (AR && hasRiver) FLD.river(bt, bt._fx, AR.river === 'auto' ? 'fords' : AR.river, nameSite && nameSite.river ? nameSite.river.n : null);
  else if (hasRiver) {
    const rw = site && site.river ? site.river.w : 1.2;
    const wR = U.clamp(W * (0.018 + 0.011 * rw), Math.max(fc * 4, bt.tile * 2.2), W * 0.075);
    let py = H * (0.44 + rnd() * 0.12), px = W / 2, a = (rnd() - 0.5) * 0.3;
    if (site && site.river && site.river.d < R) { const [mx, my] = mapP(site.river.dx, site.river.dy); px = U.clamp(mx, W * 0.2, W * 0.8); py = U.clamp(my, H * 0.38, H * 0.62); a = dirB(site.river.ang); a = U.clamp(a, -0.45, 0.45); }
    const amp = W * (0.02 + rnd() * 0.025), ph = rnd() * 6.28, fq = 1 + rnd() * 1.5;
    const pts = [];
    for (let k = -2; k <= 42; k++) {
      const x = W * k / 40;
      const y = py + Math.tan(a) * (x - px) + Math.sin(x / W * 6.28 * fq + ph) * amp + (n5(x / W * 5, 0.37, 2) - 0.5) * amp * 1.2;
      pts.push([x, U.clamp(y, H * 0.3, H * 0.7)]);
    }
    const bank = wR / 2 + fc * 2.5;
    B.fieldLine(f, pts, bank * 2, (i, d) => {
      if (d <= wR / 2) { ft[i] = T.RIVER; FE[i] = Math.min(FE[i], 0.3); }
      else { const t = ft[i]; if (t === T.MOUNT || t === T.HILL || t === T.ROCK || t === T.FOREST) ft[i] = T.PLAIN; if (FS[i] > 0.6 && ft[i] !== T.VILLAGE) ft[i] = T.SAND; FE[i] = Math.min(FE[i], 0.42); }
    });
    // 浅瀬
    const fords = [];
    const nF = wR > W * 0.05 ? 2 : 3;
    for (let k = 0; k < nF; k++) {
      const fx = W * (0.15 + (k + rnd() * 0.6) * 0.7 / nF);
      fords.push(fx);
      const len = Math.max(bt.tile * 2.2, W * 0.035);
      for (let r = 0; r < FR; r++) for (let c = Math.floor((fx - len / 2) / fc); c <= Math.floor((fx + len / 2) / fc); c++) { if (c < 0 || c >= FC) continue; const i = r * FC + c; if (ft[i] === T.RIVER) ft[i] = T.FORD; }
    }
    bt.feat.river = { pts, w: wR, n: site && site.river ? site.river.n : null, fords };
  }
  // 5. 小川
  let nS = (site && site.stream && site.stream.d < R ? 1 : 0) + (theme === 'river' || theme === 'marsh' ? 1 : 0) + (rnd() < 0.45 ? 1 : 0);
  if (steppe || spec.kind === 'pass' || (site && site.sand > 0.4)) nS = Math.min(nS, 1);
  if (AR) nS = (AR.ponds === false || ['desert', 'mount', 'coast', 'steppe'].includes(AR.theme)) ? 0 : Math.min(nS, rnd() < 0.5 ? 1 : 0);
  for (let s = 0; s < Math.min(3, nS); s++) {
    // 端から川（なければ反対の端）へ
    const fromLeft = rnd() < 0.5;
    let x0 = fromLeft ? -W * 0.02 : W * 1.02, y0 = H * (0.2 + rnd() * 0.6);
    let x1, y1;
    if (bt.feat.river) { const rp = bt.feat.river.pts; const q = rp[Math.floor(rp.length * (0.25 + rnd() * 0.5))]; x1 = q[0]; y1 = q[1]; if (rnd() < 0.5) { x0 = W * (0.15 + rnd() * 0.7); y0 = rnd() < 0.5 ? -H * 0.02 : H * 1.02; } }
    else { x1 = fromLeft ? W * 1.02 : -W * 0.02; y1 = H * (0.2 + rnd() * 0.6); }
    const pts = B.wobbly(x0, y0, x1, y1, W * 0.06, 40, rnd);
    const w = Math.max(fc * 1.7, W * 0.006);
    B.fieldLine(f, pts, w, (i) => { const t = ft[i]; if (t !== T.RIVER && t !== T.FORD && t !== T.MOUNT) { ft[i] = T.STREAM; FE[i] = Math.min(FE[i], 0.5); } });
    bt.feat.streams.push({ pts, w });
  }
  // 6. 池・湖
  const nP = AR && AR.ponds === false ? 0 : (site && site.lake && site.lake.d < R ? 1 : 0) + (mix.farm > 0.2 && rnd() < 0.5 ? 1 : 0) + (theme === 'marsh' ? 1 : 0);
  for (let k = 0; k < nP; k++) {
    const big = k === 0 && site && site.lake;
    const rp = (big ? 0.07 : 0.025 + rnd() * 0.02) * W;
    const cx = rnd() < 0.5 ? W * (0.08 + rnd() * 0.14) : W * (0.78 + rnd() * 0.14), cy = H * (0.3 + rnd() * 0.4);
    const ph = rnd() * 6.28;
    for (let r = Math.max(0, Math.floor((cy - rp * 1.4) / fc)); r <= Math.min(FR - 1, Math.ceil((cy + rp * 1.4) / fc)); r++) for (let c = Math.max(0, Math.floor((cx - rp * 1.4) / fc)); c <= Math.min(FC - 1, Math.ceil((cx + rp * 1.4) / fc)); c++) {
      const x = (c + 0.5) * fc, y = (r + 0.5) * fc, a = Math.atan2(y - cy, x - cx), d = Math.hypot(x - cx, y - cy);
      const rr = rp * (1 + 0.25 * Math.sin(a * 3 + ph) + 0.12 * Math.sin(a * 5 + ph * 2));
      const i = r * FC + c;
      if (d < rr && ft[i] !== T.RIVER && ft[i] !== T.MOUNT) { ft[i] = T.POND; FE[i] = Math.min(FE[i], 0.3); }
      else if (d < rr + fc * 2 && (ft[i] === T.PLAIN || ft[i] === T.FIELD || ft[i] === T.GRASS || ft[i] === T.DIRT)) ft[i] = T.MARSH;
    }
    bt.feat.ponds.push({ x: cx, y: cy, r: rp, n: big ? site.lake.n : null });
  }
  // 7. 大道（川は橋で渡る）
  const roadAt = (pts, w, major) => {
    B.fieldLine(f, pts, w, (i) => {
      const t = ft[i];
      if (t === T.RIVER || t === T.POND) ft[i] = T.BRIDGE;
      else if (t === T.MOUNT || t === T.ROCK) ft[i] = T.PATH;
      else if (t !== T.FORD && t !== T.BRIDGE) ft[i] = T.ROAD;
    });
    bt.feat.roads.push({ pts, w, major });
  };
  if (AR && (AR.road === 'y' || AR.road === 'x')) {
    // 戦場図：通り道に沿う道（隘路なら谷の真ん中）
    const X = bt._fx, pts = [];
    for (let k = -1; k <= 21; k++) { const t = k / 20; pts.push(AR.road === 'y' ? [(X.cx ? X.cx(t) : (AR.cx || 0.5)) + Math.sin(t * 5 + sd % 7) * 0.02, t] : [t, 0.5 + Math.sin(t * 5 + sd % 7) * 0.03]); }
    X.road(pts, 2.6);
  } else if (spec.kind !== 'pass' && !(AR && AR.road === 'none')) {
    let a = Math.PI / 2 + (rnd() - 0.5) * 0.5, cx = W * (0.4 + rnd() * 0.2), cy = H / 2;
    if (site && site.road && site.road.d < R) { a = dirB(site.road.ang); const [mx, my] = mapP(site.road.dx, site.road.dy); cx = U.clamp(mx, W * 0.15, W * 0.85); cy = U.clamp(my, H * 0.2, H * 0.8); }
    // 端から端へ
    const dx = Math.cos(a), dy = Math.sin(a), L = Math.hypot(W, H);
    const p0 = [cx - dx * L, cy - dy * L], p1 = [cx + dx * L, cy + dy * L];
    const pts = B.wobbly(p0[0], p0[1], p1[0], p1[1], W * 0.025, 50, rnd).filter(([x, y]) => x > -W * 0.1 && x < W * 1.1 && y > -H * 0.1 && y < H * 1.1);
    if (pts.length > 2) roadAt(pts, Math.max(fc * 2.6, W * 0.013), true);
  }
  // 8. 郷（村）と、村から大道への小道
  const vlist = [];
  if (site && site.vlist) for (const v of site.vlist) { const [x, y] = mapP(v.dx, v.dy); if (x > W * 0.06 && x < W * 0.94 && y > H * 0.08 && y < H * 0.92) vlist.push({ n: v.n, x, y, s: 1 }); }
  if (site && site.town && site.townD < R * 0.9 && spec.kind !== 'siege' && spec.kind !== 'pass') { const [x, y] = mapP(site.townDx, site.townDy); if (x > W * 0.08 && x < W * 0.92 && y > H * 0.1 && y < H * 0.9) vlist.unshift({ n: site.town, x, y, s: 1.6, town: true }); }
  if (AR) {
    // 戦場図：村は型の数だけ、建てられる所に。名前は全体マップのその土地の村から
    const names = ((nameSite && nameSite.vlist) || []).map(v => v.n); if (nameSite && nameSite.town) names.unshift(nameSite.town);
    const ok = new Set([T.PLAIN, T.DIRT, T.GRASS, T.FIELD, T.PADDY, T.GROVE, T.SAND, T.HILL]);
    for (let k = 0; k < (AR.vill || 0); k++) for (let tries = 0; tries < 16; tries++) {
      const [x, y] = bt._fx.xy(0.14 + rnd() * 0.72, 0.16 + rnd() * 0.68), t = ft[B.fineIdx(bt, x, y)];
      if (ok.has(t) && vlist.every(o => Math.hypot(o.x - x, o.y - y) > W * 0.15)) { vlist.push({ n: names[k] || null, x, y, s: k === 0 && nameSite && nameSite.town ? 1.3 : 1 }); break; }
    }
  } else if (!site) for (let k = 0; k < (mix.village || 0); k++) if (rnd() < 0.7) vlist.push({ n: null, x: W * (0.12 + rnd() * 0.76), y: H * (0.2 + rnd() * 0.6), s: 1 });
  const roadPts = bt.feat.roads.length ? bt.feat.roads[0].pts : null;
  for (const v of vlist.slice(0, 7)) {
    if (spec.kind === 'pass') break;
    const rv = U.clamp(W * 0.02 * v.s, fc * 3.5, W * 0.055 * v.s);
    const ph = rnd() * 6.28;
    let ok = 0;
    for (let r = Math.max(0, Math.floor((v.y - rv * 2.6) / fc)); r <= Math.min(FR - 1, Math.ceil((v.y + rv * 2.6) / fc)); r++) for (let c = Math.max(0, Math.floor((v.x - rv * 2.6) / fc)); c <= Math.min(FC - 1, Math.ceil((v.x + rv * 2.6) / fc)); c++) {
      const x = (c + 0.5) * fc, y = (r + 0.5) * fc, a = Math.atan2(y - v.y, x - v.x), d = Math.hypot(x - v.x, y - v.y);
      const i = r * FC + c, t = ft[i];
      if (t === T.RIVER || t === T.POND || t === T.MOUNT || t === T.ROAD || t === T.BRIDGE || t === T.FORD || t === T.STREAM) continue;
      const rr = rv * (1 + 0.22 * Math.sin(a * 3 + ph) + 0.1 * Math.sin(a * 7 + ph));
      if (d < rr) { ft[i] = T.VILLAGE; ok++; }
      else if (d < rr * 2.4 && (t === T.PLAIN || t === T.DIRT || t === T.GRASS || t === T.GROVE) && GEO.hash(c >> 2, r >> 2, 77) < 0.75) ft[i] = paddy ? T.PADDY : T.FIELD;
    }
    if (!ok) continue;
    bt.feat.villages.push({ n: v.n, x: v.x, y: v.y, r: rv, town: !!v.town });
    // 大道への小道
    if (roadPts) {
      let best = null, bd = Infinity; for (const p of roadPts) { const d = Math.hypot(p[0] - v.x, p[1] - v.y); if (d < bd) { bd = d; best = p; } }
      if (best && bd > rv && bd < W * 0.5) { const pts = B.wobbly(v.x, v.y, best[0], best[1], bd * 0.08, 14, rnd); B.fieldLine(f, pts, Math.max(fc * 1.4, W * 0.006), (i) => { const t = ft[i]; if (t === T.RIVER || t === T.POND) ft[i] = T.BRIDGE; else if (t !== T.FORD && t !== T.BRIDGE && t !== T.VILLAGE && t !== T.MOUNT) ft[i] = T.ROAD; }); bt.feat.roads.push({ pts, w: Math.max(fc * 1.4, W * 0.006), major: false }); }
    }
  }
  // 9. 高さの仕上げ（山は高く、水辺は低く）
  for (let i = 0; i < FN; i++) { const t = ft[i]; if (t === T.MOUNT) FE[i] = Math.max(FE[i], th.mount || 0.75); else if (t === T.RIVER || t === T.POND || t === T.FORD) FE[i] = Math.min(FE[i], 0.3); else if (t === T.SEA || t === T.SHOAL) FE[i] = Math.min(FE[i], 0.22); else if (t === T.CLIFF) FE[i] = Math.max(FE[i], 0.78); }
  if (AR && AR.finish) AR.finish(bt._fx);
  bt.feat.mix = mix; bt.feat.paddy = paddy; bt.feat.steppe = steppe;
};
