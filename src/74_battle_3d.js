/* =========================================================
   地中海覇道 — 合戦の立体表示（3D）
   高低のある地表を遠近法で描き、部隊は伍ごとの隊列と兵の姿で見せる。
   canvas 2D だけで動く（外部ライブラリなし）。
   V.w2s / V.s2w が 3D のときは V3.project / V3.pick になるので、
   旗・文字・命令線・矢などの描画はそのまま使える。
   ========================================================= */
const V3 = {
  on: false, cam: null, foc: 1, near: 2,
  C: [0, 0, 0], F: [0, -1, 0], R: [1, 0, 0], Uv: [0, 0, 1],
  hs: 1, verts: null, cols: 0, rows: 0, colR: null, colG: null, colB: null, trees: [], houses: [], rocks: [], sprites: new Map(), stats: { quads: 0, cells: 0, sprites: 0, ms: 0 },
  quality: 1,
};
V3.pref = () => { try { const v = localStorage.getItem('chichukai.view3d'); return v == null ? true : v === '1'; } catch (e) { return true; } };
V3.savePref = (v) => { try { localStorage.setItem('chichukai.view3d', v ? '1' : '0'); } catch (e) {} };
/* ---------- 高さ ---------- */
V3.zOf = (e) => { const d = e - 0.5; return d >= 0 ? d * V3.hs : d * V3.hs * 0.35; };
V3.init = (bt) => {
  const { cols, rows } = bt;
  V3.cols = cols; V3.rows = rows;
  V3.hs = bt.W * 0.2;
  // 頂点の高さ（格子の角：周りの4枚の平均）
  const vz = V3.verts = new Float32Array((cols + 1) * (rows + 1));
  for (let r = 0; r <= rows; r++) for (let c = 0; c <= cols; c++) {
    let s = 0, n = 0;
    for (let dr = -1; dr <= 0; dr++) for (let dc = -1; dc <= 0; dc++) { const rr = r + dr, cc = c + dc; if (rr < 0 || rr >= rows || cc < 0 || cc >= cols) continue; s += bt.elev[rr * cols + cc]; n++; }
    vz[r * (cols + 1) + c] = V3.zOf(n ? s / n : 0.5);
  }
  // 航行格子ごとの色（細格子の平均）
  const N = cols * rows; V3.colR = new Float32Array(N); V3.colG = new Float32Array(N); V3.colB = new Float32Array(N); V3.water = new Uint8Array(N);
  const f = bt.fine, F = B.FINE;
  const rgb = []; for (const t of D.TILE) { const h = t.c.replace('#', ''); const n = parseInt(h, 16); rgb.push([n >> 16 & 255, n >> 8 & 255, n & 255]); }
  const season = V.SEASON(), snow = bt.weather === 'snow';
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    let R = 0, G2 = 0, Bc = 0, w = 0;
    if (f) { for (let dr = 0; dr < F; dr++) { const o = (r * F + dr) * f.cols + c * F; for (let dc = 0; dc < F; dc++) { const t = f.type[o + dc]; const k = rgb[t]; R += k[0]; G2 += k[1]; Bc += k[2]; if (t === D.T.RIVER || t === D.T.POND || t === D.T.FORD || t === D.T.STREAM || t === D.T.SEA || t === D.T.SHOAL) w++; } } R /= F * F; G2 /= F * F; Bc /= F * F; }
    else { const k = rgb[bt.terr[r * cols + c]]; R = k[0]; G2 = k[1]; Bc = k[2]; }
    const i = r * cols + c;
    // 季節と雪
    if (snow) { const t = bt.terr[i]; if (!D.isWater(t) && t !== D.T.FORD) { R = R * 0.3 + 225 * 0.7; G2 = G2 * 0.3 + 226 * 0.7; Bc = Bc * 0.3 + 224 * 0.7; } }
    else if (season === 3) { const m = (R + G2 + Bc) / 3; R = R * 0.7 + m * 0.3 + 6; G2 = G2 * 0.7 + m * 0.3; Bc = Bc * 0.7 + m * 0.3 - 4; }
    else if (season === 2) { R = Math.min(255, R * 1.06 + 8); G2 = G2 * 0.96; Bc = Bc * 0.9; }
    // 細かな揺らぎ
    const h = V.hash(i, 3) - 0.5; R += h * 14; G2 += h * 12; Bc += h * 10;
    V3.colR[i] = R; V3.colG[i] = G2; V3.colB[i] = Bc; V3.water[i] = w > F * F * 0.5 ? 1 : 0;
  }
  // 色をなめらかに（隣と少し混ぜる。水はそのまま）
  { const R0 = V3.colR.slice(), G0 = V3.colG.slice(), B0 = V3.colB.slice();
    for (let r = 1; r < rows - 1; r++) for (let c = 1; c < cols - 1; c++) { const i = r * cols + c; if (V3.water[i]) continue; let sr = R0[i] * 0.5, sg = G0[i] * 0.5, sb = B0[i] * 0.5; for (const j of [i - 1, i + 1, i - cols, i + cols]) { sr += R0[j] * 0.125; sg += G0[j] * 0.125; sb += B0[j] * 0.125; } V3.colR[i] = sr; V3.colG[i] = sg; V3.colB[i] = sb; } }
  // 木・家・岩（細格子から決まった場所に置く）
  V3.trees = []; V3.houses = []; V3.rocks = [];
  if (f) {
    const T = D.T, cell = f.cell;
    const step = 1.0; // 航行格子1枚に1本の候補
    for (let r = 0; r < rows; r += step) for (let c = 0; c < cols; c += step) {
      const h1 = GEO.hash(c, r, 201), h2 = GEO.hash(c, r, 202), h3 = GEO.hash(c, r, 203);
      const x = (c + 0.1 + h1 * 0.8) * bt.tile, y = (r + 0.1 + h2 * 0.8) * bt.tile;
      const t = f.type[B.fineIdx(bt, x, y)];
      const p = t === T.FOREST ? 0.95 : t === T.GROVE ? 0.42 : t === T.VILLAGE ? 0.08 : t === T.PLAIN ? 0.012 : t === T.HILL ? 0.025 : t === T.MARSH ? 0.03 : 0;
      if (h3 < p) { const e = f.elev[B.fineIdx(bt, x, y)]; V3.trees.push({ x, y, s: 0.75 + h1 * 0.5, k: e > 0.62 || (t === T.FOREST && h2 < 0.3) ? 1 : 0 }); continue; }
      const pr = t === T.ROCK ? 0.45 : t === T.MOUNT ? 0.3 : t === T.HILL ? 0.02 : t === T.SAND ? 0.02 : 0;
      if (h3 < p + pr) V3.rocks.push({ x, y, s: 0.5 + h1 * 0.8 });
    }
    const hc = 1.15;
    for (let r = 0; r < rows / hc; r++) for (let c = 0; c < cols / hc; c++) {
      const h1 = GEO.hash(c, r, 211), h2 = GEO.hash(c, r, 212), h3 = GEO.hash(c, r, 213);
      const x = (c + 0.2 + h1 * 0.6) * hc * bt.tile, y = (r + 0.2 + h2 * 0.6) * hc * bt.tile;
      if (x >= bt.W || y >= bt.H) continue;
      const t = f.type[B.fineIdx(bt, x, y)];
      const city = t === T.CITY;
      if (!(t === T.VILLAGE && h3 < 0.6) && !(city && h3 < 0.38)) continue;
      const w = bt.tile * hc * (city ? 0.4 + h3 * 0.5 : 0.55 + h3 * 0.35), d = w * (0.6 + h1 * 0.25);
      V3.houses.push({ x, y, w, d, a: city ? 0 : (GEO.hash(Math.floor(c / 4), Math.floor(r / 4), 214) - 0.5) * 1.2 + (h2 - 0.5) * 0.3, h: bt.tile * (0.45 + h2 * 0.25), city });
    }
    if (V3.trees.length > 2600) { V3.trees.sort((a, b) => GEO.hash(a.x | 0, a.y | 0, 1) - GEO.hash(b.x | 0, b.y | 0, 1)); V3.trees.length = 2600; }
  }
  V3.sprites.clear();
  V3.treeSpr = null;
  V3.fogT = -9;
};
V3.heightAt = (x, y) => {
  const vz = V3.verts; if (!vz) return 0;
  const bt = V.bt, cols = V3.cols, rows = V3.rows, t = bt.tile;
  const gx = U.clamp(x / t, 0, cols - 0.0001), gy = U.clamp(y / t, 0, rows - 0.0001);
  const c = Math.floor(gx), r = Math.floor(gy), fx = gx - c, fy = gy - r, W1 = cols + 1;
  const a = vz[r * W1 + c], b = vz[r * W1 + c + 1], cc = vz[(r + 1) * W1 + c], d = vz[(r + 1) * W1 + c + 1];
  return (a * (1 - fx) + b * fx) * (1 - fy) + (cc * (1 - fx) + d * fx) * fy;
};
/* ---------- カメラ ---------- */
V3.defaultCam = (bt) => { const me = bt.units.find(u => u.me); const own = bt.units.filter(u => u.side === 0 && B.alive(u)); const cy = own.length ? U.avg(own, u => u.y) : bt.H * 0.7; return { x: me ? U.clamp(me.x, bt.W * 0.25, bt.W * 0.75) : bt.W / 2, y: U.clamp(cy - bt.H * 0.1, bt.H * 0.2, bt.H * 0.8), yaw: 0, pitch: 0.8, dist: Math.max(bt.W, bt.H) * (V.vw > V.vh ? 0.5 : 0.62) }; };
V3.setup = () => {
  const bt = V.bt;
  V3.foc = V.vh * 0.95;
  const cam = V3.cam;
  const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
  const tz = V3.heightAt(cam.x, cam.y);
  const C = V3.C = [cam.x + Math.sin(cam.yaw) * cam.dist * cp, cam.y + Math.cos(cam.yaw) * cam.dist * cp, tz + cam.dist * sp];
  const F = [cam.x - C[0], cam.y - C[1], tz - C[2]]; const fl = Math.hypot(F[0], F[1], F[2]) || 1; F[0] /= fl; F[1] /= fl; F[2] /= fl;
  const Rv = [-F[1], F[0], 0]; const rl = Math.hypot(Rv[0], Rv[1]) || 1; Rv[0] /= rl; Rv[1] /= rl;
  const Up = [F[1] * Rv[2] - F[2] * Rv[1], F[2] * Rv[0] - F[0] * Rv[2], F[0] * Rv[1] - F[1] * Rv[0]];
  V3.F = F; V3.R = Rv; V3.Uv = Up;
  // 共有の関数が使う「およその拡大率」（注視点での1単位あたりのピクセル）
  V.cam.x = cam.x; V.cam.y = cam.y; V.cam.z = V3.foc / cam.dist;
};
V3.clamp = () => {
  const bt = V.bt, cam = V3.cam;
  cam.dist = U.clamp(cam.dist, bt.W * 0.1, Math.max(bt.W, bt.H) * 1.7);
  cam.pitch = U.clamp(cam.pitch, V3.follow ? 0.22 : 0.32, 1.42);
  cam.x = U.clamp(cam.x, -bt.W * 0.1, bt.W * 1.1); cam.y = U.clamp(cam.y, -bt.H * 0.1, bt.H * 1.1);
  if (cam.yaw > Math.PI) cam.yaw -= 6.2832; if (cam.yaw < -Math.PI) cam.yaw += 6.2832;
};
// 投影（x,y は戦場、z は高さ。z 省略で地表）
V3.project = (x, y, z) => {
  if (z === undefined) z = V3.heightAt(x, y);
  const C = V3.C, F = V3.F, R = V3.R, Up = V3.Uv;
  const dx = x - C[0], dy = y - C[1], dz = z - C[2];
  const d = dx * F[0] + dy * F[1] + dz * F[2];
  if (d <= V3.near) return null;
  const xs = dx * R[0] + dy * R[1], ys = dx * Up[0] + dy * Up[1] + dz * Up[2];
  const k = V3.foc / d;
  return [V.vw / 2 + xs * k, V.vh / 2 - ys * k, d];
};
V3.w2s = (x, y) => { const p = V3.project(x, y); return p ? [p[0], p[1]] : [-9999, -9999]; };
// 画面の点 → 地表の点（当たらなければ遠くの地面）
V3.pick = (sx, sy) => {
  const C = V3.C, F = V3.F, R = V3.R, Up = V3.Uv, k = 1 / V3.foc;
  const ax = (sx - V.vw / 2) * k, ay = -(sy - V.vh / 2) * k;
  let dx = F[0] + R[0] * ax + Up[0] * ay, dy = F[1] + R[1] * ax + Up[1] * ay, dz = F[2] + R[2] * ax + Up[2] * ay;
  const bt = V.bt;
  if (dz >= -1e-4) { const t = Math.max(bt.W, bt.H) * 2; return [C[0] + dx * t, C[1] + dy * t]; }
  let t = -C[2] / dz;
  for (let i = 0; i < 4; i++) { const px = C[0] + dx * t, py = C[1] + dy * t; const h = V3.heightAt(U.clamp(px, 0, bt.W), U.clamp(py, 0, bt.H)); t = (h - C[2]) / dz; }
  return [C[0] + dx * t, C[1] + dy * t];
};
V3.fit = () => { const bt = V.bt; V3.cam = V3.defaultCam(bt); if (V.vw > V.vh) V3.cam.dist *= 0.75; V3.clamp(); V3.setup(); };
V3.centerOn = (u, zf) => { V3.cam.x = u.x; V3.cam.y = u.y; if (zf) V3.cam.dist = U.clamp(Math.max(V.bt.W * 0.18, u.diag * 9 / Math.max(0.4, zf)), V.bt.W * 0.1, V.bt.W); V3.clamp(); V3.setup(); };
/* ---------- 光と空 ---------- */
V3.light = () => {
  const bt = V.bt;
  const dayT = U.clamp((bt.time - (bt.day - 1) * bt.dayLen) / bt.dayLen, 0, 1);
  const sunA = Math.PI * (0.15 + dayT * 0.7);          // 東から西へ
  const sunH = Math.sin(Math.PI * dayT) * 0.9 + 0.15;  // 高さ
  const w = bt.weather;
  const cloud = w === 'rain' || w === 'cloud' ? 0.55 : w === 'fog' ? 0.7 : w === 'snow' ? 0.5 : 0;
  const warm = Math.max(0, 1 - sunH * 1.6);           // 朝夕の赤み
  let sky = ['#5a7f9e', '#b8c6c6', '#e0cfa6'];
  if (warm > 0.5) sky = ['#3d4a6b', '#b97555', '#eec27c'];
  if (w === 'rain' || w === 'cloud') sky = ['#4b545c', '#8b9398', '#aeb2ad'];
  if (w === 'fog') sky = ['#9aa0a0', '#c3c6c0', '#d2d1c8'];
  if (w === 'snow') sky = ['#6e7986', '#aeb5bc', '#dcdddb'];
  const L = [Math.cos(sunA) * Math.cos(sunH * 1.2), -0.35, Math.sin(sunH * 1.2) + 0.25]; const ll = Math.hypot(L[0], L[1], L[2]); L[0] /= ll; L[1] /= ll; L[2] /= ll;
  return { L, amb: 0.46 + cloud * 0.18, dif: (0.95 - cloud * 0.45), warm, sky, fogCol: w === 'fog' ? [200, 204, 198] : w === 'snow' ? [205, 210, 214] : w === 'rain' || w === 'cloud' ? [140, 148, 150] : warm > 0.5 ? [215, 170, 120] : [196, 200, 190], fogK: w === 'fog' ? 1.8 : w === 'rain' ? 1.1 : 0.55 };
};
V3.drawSky = (lt) => {
  const ctx = V.ctx, hor = V3.horizonY();
  const g = ctx.createLinearGradient(0, 0, 0, Math.max(10, hor));
  g.addColorStop(0, lt.sky[0]); g.addColorStop(0.7, lt.sky[1]); g.addColorStop(1, lt.sky[2]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, V.vw, V.vh);
  // 雲（地平線の近くをゆっくり流れる）
  if (hor > 20 && V.bt.weather !== 'fog') {
    const t = V.ui.anim * 0.004, w = V.bt.weather;
    ctx.fillStyle = w === 'rain' || w === 'cloud' || w === 'snow' ? 'rgba(90,96,100,.55)' : 'rgba(255,250,240,.55)';
    for (let i = 0; i < 7; i++) { const cx = ((i * 0.37 + t * (1 + i * 0.1) + V3.cam.yaw / 6.2832) % 1) * (V.vw + 300) - 150, cy = hor - (14 + (i % 3) * 14) - V.vh * 0.02 * (i % 4), rw = 60 + (i * 37) % 90, rh = 8 + (i % 3) * 4; ctx.beginPath(); ctx.ellipse(cx, cy, rw, rh, 0, 0, 6.2832); ctx.ellipse(cx + rw * 0.4, cy - rh * 0.5, rw * 0.5, rh * 0.9, 0, 0, 6.2832); ctx.fill(); }
  }
  // 地平線の下は地の色
  ctx.fillStyle = `rgb(${lt.fogCol[0] - 40},${lt.fogCol[1] - 44},${lt.fogCol[2] - 60})`; ctx.fillRect(0, Math.max(0, hor), V.vw, V.vh);
};
V3.horizonY = () => { const F = V3.F, Up = V3.Uv; const d = F[2], u = Up[2]; if (Math.abs(u) < 1e-4) return 0; // 地平線：方向の z 成分が 0 になる画面の y
  const ay = -d / u; return V.vh / 2 - ay * V3.foc; };
/* ---------- 描画 ---------- */
V3.render = () => {
  const bt = V.bt, ctx = V.ctx, t0 = performance.now();
  if (V3.follow) { V3.followCam(); V3.clamp(); }
  V3.setup();
  const lt = V3.light();
  ctx.setTransform(V.dpr, 0, 0, V.dpr, 0, 0);
  V3.drawSky(lt);
  V3.drawTerrain(lt);
  V3.drawLines(lt);
  V3.drawObjects(lt);
  // 共有の重ね描き（命令線・矢・効果・文字・旗）
  if (bt.city) V.drawCity();
  for (const pt of bt.points) V.drawPoint(pt);
  for (const u of bt.units) if (u.zone && u.side === 0 && B.alive(u) && (V.ui.sel.has(u.id) || u.ctrl === 'player' || u.mine)) V.drawZone(u);
  if (V.previewZone && V.previewZone.r) V.drawZone({ zone: V.previewZone });
  for (const id of V.ui.sel) { const u = bt.units[id]; if (u && B.alive(u)) V.drawOrder(u); }
  V.drawProj();
  V.drawFx();
  V.drawTexts();
  const order = bt.units.filter(u => B.alive(u)).map(u => [u, V3.project(u.x, u.y)]).filter(x => x[1]).sort((a, b) => b[1][2] - a[1][2]);
  for (const [u] of order) V.drawBanner(u);
  V.drawWeather();
  V.drawMini();
  V3.stats.ms = performance.now() - t0;
  // 重いときは少し粗く
  V3._acc = (V3._acc || 0) * 0.9 + V3.stats.ms * 0.1;
  if (V3._acc > 34 && V3.quality > 0.5) V3.quality = 0.5; else if (V3._acc < 16 && V3.quality < 1) V3.quality = 1;
};
V3.shadeRGB = (r, g, b, k, depth, lt) => {
  // k: 明るさ、depth で霧に溶かす
  const fog = U.clamp((depth / (V.bt.W * 2.2)) * lt.fogK, 0, 0.75);
  r = (r * k) * (1 - fog) + lt.fogCol[0] * fog; g = (g * k) * (1 - fog) + lt.fogCol[1] * fog; b = (b * k) * (1 - fog) + lt.fogCol[2] * fog;
  return `rgb(${r | 0},${g | 0},${b | 0})`;
};
V3.fogVis = () => {
  // 視界（航行格子）：0.5秒ごとに作り直す
  const bt = V.bt;
  if (bt.spec.role === 'watch') return null;
  if (bt.time - V3.fogT > 0.5 || V3.fogT < 0 || !V3.vis) {
    V3.fogT = bt.time;
    const vis = V3.vis = new Uint8Array(bt.cols * bt.rows);
    for (const u of bt.units) {
      if (u.side !== 0 || !B.alive(u)) continue;
      const R = B.sight(bt, u) / bt.tile, c0 = u.x / bt.tile, r0 = u.y / bt.tile;
      for (let r = Math.max(0, Math.floor(r0 - R)); r <= Math.min(bt.rows - 1, Math.ceil(r0 + R)); r++) for (let c = Math.max(0, Math.floor(c0 - R)); c <= Math.min(bt.cols - 1, Math.ceil(c0 + R)); c++) if ((c + 0.5 - c0) ** 2 + (r + 0.5 - r0) ** 2 <= R * R) vis[r * bt.cols + c] = 1;
    }
    for (const pt of bt.points) if (pt.type === 'tower' && pt.owner === 0) { const R = 320 * bt.p / bt.tile, c0 = pt.x / bt.tile, r0 = pt.y / bt.tile; for (let r = 0; r < bt.rows; r++) for (let c = 0; c < bt.cols; c++) if ((c + 0.5 - c0) ** 2 + (r + 0.5 - r0) ** 2 <= R * R) vis[r * bt.cols + c] = 1; }
  }
  return V3.vis;
};
V3.drawTerrain = (lt) => {
  const bt = V.bt, ctx = V.ctx, cols = V3.cols, rows = V3.rows, t = bt.tile, vz = V3.verts, W1 = cols + 1;
  const cam = V3.cam;
  // 粗さ：遠いほど格子をまとめる
  const pxPerTile = V3.foc / cam.dist * t;
  let q = pxPerTile < 7 ? 4 : pxPerTile < 14 ? 2 : 1;
  if (V3.quality < 1) q = Math.min(4, q * 2);
  const qc = Math.ceil(cols / q), qr = Math.ceil(rows / q);
  // 頂点を投影
  const P = V3._pv && V3._pv.length >= (qc + 1) * (qr + 1) * 3 ? V3._pv : (V3._pv = new Float32Array((qc + 1) * (qr + 1) * 3));
  for (let r = 0; r <= qr; r++) for (let c = 0; c <= qc; c++) {
    const vc = Math.min(cols, c * q), vr = Math.min(rows, r * q);
    const p = V3.project(vc * t, vr * t, vz[vr * W1 + vc]);
    const k = (r * (qc + 1) + c) * 3;
    if (p) { P[k] = p[0]; P[k + 1] = p[1]; P[k + 2] = p[2]; } else { P[k + 2] = -1; }
  }
  // 周りの地面（戦場の外）
  const apron = (x0, y0, x1, y1) => { const a = V3.project(x0, y0, 0), b = V3.project(x1, y0, 0), c = V3.project(x1, y1, 0), d = V3.project(x0, y1, 0); if (!a || !b || !c || !d) return; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath(); ctx.fill(); };
  const base = [V3.colR[Math.floor(cols * rows / 2)] || 150, V3.colG[Math.floor(cols * rows / 2)] || 140, V3.colB[Math.floor(cols * rows / 2)] || 100];
  ctx.fillStyle = V3.shadeRGB(base[0] * 0.9, base[1] * 0.9, base[2] * 0.9, 0.75, bt.W * 1.5, lt);
  const M = Math.max(bt.W, bt.H) * 1.2;
  for (const [x0, y0, x1, y1] of [[-M, -M, bt.W + M, 0], [-M, bt.H, bt.W + M, bt.H + M], [-M, 0, 0, bt.H], [bt.W, 0, bt.W + M, bt.H]]) apron(x0, y0, x1, y1);
  // 見える四角を集めて奥から
  const vis = V3.fogVis();
  const list = V3._ql && V3._ql.length >= qc * qr ? V3._ql : (V3._ql = new Float64Array(qc * qr));
  let n = 0;
  const vw = V.vw, vh = V.vh;
  for (let r = 0; r < qr; r++) for (let c = 0; c < qc; c++) {
    const k0 = (r * (qc + 1) + c) * 3, k1 = k0 + 3, k2 = ((r + 1) * (qc + 1) + c) * 3, k3 = k2 + 3;
    if (P[k0 + 2] < 0 || P[k1 + 2] < 0 || P[k2 + 2] < 0 || P[k3 + 2] < 0) continue;
    const minx = Math.min(P[k0], P[k1], P[k2], P[k3]), maxx = Math.max(P[k0], P[k1], P[k2], P[k3]), miny = Math.min(P[k0 + 1], P[k1 + 1], P[k2 + 1], P[k3 + 1]), maxy = Math.max(P[k0 + 1], P[k1 + 1], P[k2 + 1], P[k3 + 1]);
    if (maxx < 0 || minx > vw || maxy < 0 || miny > vh) continue;
    const d = (P[k0 + 2] + P[k1 + 2] + P[k2 + 2] + P[k3 + 2]) * 0.25;
    list[n++] = Math.round(d * 8) * 1e6 + (r * qc + c); // 深さ（整数化）で並べ、添字も持つ
  }
  const arr = list.subarray(0, n); arr.sort(); // 近い順
  V3.stats.quads = n;
  const L = lt.L;
  const T = D.T;
  for (let i = n - 1; i >= 0; i--) {
    const idx = Math.round(arr[i] % 1e6), r = Math.floor(idx / qc), c = idx % qc;
    const k0 = (r * (qc + 1) + c) * 3, k1 = k0 + 3, k2 = ((r + 1) * (qc + 1) + c) * 3, k3 = k2 + 3;
    // 色：まとめた格子の中心付近の格子
    const tc = Math.min(cols - 1, c * q + (q >> 1)), tr = Math.min(rows - 1, r * q + (q >> 1)), ti = tr * cols + tc;
    let R = V3.colR[ti], Gc = V3.colG[ti], Bc = V3.colB[ti];
    if (q > 1) { let sr = 0, sg = 0, sb = 0, m = 0; for (let dr = 0; dr < q; dr++) for (let dc = 0; dc < q; dc++) { const rr = r * q + dr, cc = c * q + dc; if (rr >= rows || cc >= cols) continue; const j = rr * cols + cc; sr += V3.colR[j]; sg += V3.colG[j]; sb += V3.colB[j]; m++; } if (m) { R = sr / m; Gc = sg / m; Bc = sb / m; } }
    const tt = bt.terr[ti];
    if (tt === T.BURNT || bt.burnt[ti]) { R = 50; Gc = 44; Bc = 38; }
    if (tt === T.CITY) { R = 158; Gc = 146; Bc = 125; }
    // 法線（高さの差から）
    const vc = c * q, vr = r * q;
    const za = vz[Math.min(rows, vr) * W1 + Math.min(cols, vc)], zb = vz[Math.min(rows, vr) * W1 + Math.min(cols, vc + q)], zc = vz[Math.min(rows, vr + q) * W1 + Math.min(cols, vc)];
    const sx = (za - zb) / (q * t), sy = (za - zc) / (q * t);
    let nl = Math.hypot(sx, sy, 1); const nx = sx / nl, ny = sy / nl, nz = 1 / nl;
    let lum = lt.amb + lt.dif * Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
    if (lt.warm > 0.5) { R *= 1.05; Bc *= 0.9; }
    if (V3.water[ti]) { lum = lt.amb + 0.25 + 0.08 * Math.sin(V.ui.anim * 2.5 + c * 0.7 + r * 0.4); R *= 0.9; Bc *= 1.08; }
    if (bt.fire[ti] > 0) { const f = 0.6 + 0.4 * Math.sin(V.ui.anim * 9 + ti); R = 230; Gc = 90 + 60 * f; Bc = 30; lum = 1.1; }
    if (bt.flood[ti] > 0) { R = R * 0.5 + 60; Gc = Gc * 0.5 + 100; Bc = Bc * 0.5 + 140; }
    if (vis && !vis[ti]) { lum *= 0.45; R *= 0.8; Gc *= 0.86; }
    const d = P[k0 + 2];
    ctx.fillStyle = V3.shadeRGB(R, Gc, Bc, lum, d, lt);
    ctx.beginPath(); ctx.moveTo(P[k0], P[k0 + 1]); ctx.lineTo(P[k1], P[k1 + 1]); ctx.lineTo(P[k3], P[k3 + 1]); ctx.lineTo(P[k2], P[k2 + 1]); ctx.closePath(); ctx.fill();
    // 隙間が出ないように薄く縁取る
    ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 0.7; ctx.stroke();
  }
  // 布陣できる範囲（布陣中）
  if (V.ui.deploy && bt.sides[0].player && bt.spec.role !== 'unit') {
    const z = V.deployZone(bt.units.find(u => u.me) || bt.units[0]);
    const pts = [[z.x0, z.y0], [z.x1, z.y0], [z.x1, z.y1], [z.x0, z.y1]].map(([x, y]) => V3.project(x, y, V3.heightAt(x, y) + 0.5)).filter(Boolean);
    if (pts.length === 4) { ctx.strokeStyle = 'rgba(98,179,155,.75)'; ctx.setLineDash([8, 6]); ctx.lineWidth = 2; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.stroke(); ctx.setLineDash([]); }
  }
};
// 川・小川・道：折れ線を地表に沿って描く
V3.drawLines = (lt) => {
  const bt = V.bt, ctx = V.ctx; if (!bt.feat) return;
  const line = (pts, w, col, lift) => {
    const proj = pts.map(([x, y]) => (x < -bt.W * 0.2 || x > bt.W * 1.2 || y < -bt.H * 0.2 || y > bt.H * 1.2) ? null : V3.project(U.clamp(x, 0, bt.W), U.clamp(y, 0, bt.H), V3.heightAt(U.clamp(x, 0, bt.W), U.clamp(y, 0, bt.H)) + lift));
    ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    let open = false;
    for (let i = 0; i < proj.length; i++) {
      const p = proj[i];
      if (!p) { if (open) { ctx.stroke(); open = false; } continue; }
      const lw = Math.max(0.8, w * V3.foc / p[2]);
      if (!open) { ctx.beginPath(); ctx.lineWidth = lw; ctx.moveTo(p[0], p[1]); open = true; }
      else { if (Math.abs(ctx.lineWidth - lw) > lw * 0.35) { ctx.stroke(); ctx.beginPath(); ctx.lineWidth = lw; ctx.moveTo(proj[i - 1][0], proj[i - 1][1]); } ctx.lineTo(p[0], p[1]); }
    }
    if (open) ctx.stroke();
  };
  const snow = bt.weather === 'snow';
  for (const rd of bt.feat.roads) { line(rd.pts, rd.w * 1.1, 'rgba(96,74,48,.55)', 0.25); line(rd.pts, rd.w * 0.9, snow ? 'rgba(226,222,210,.9)' : 'rgba(188,160,118,.92)', 0.3); }
  if (bt.feat.river) { const rv = bt.feat.river; line(rv.pts, rv.w * 1.15, 'rgba(60,96,110,.55)', 0.15); line(rv.pts, rv.w, `rgba(${86 + Math.sin(V.ui.anim) * 6},${132},${148},.95)`, 0.2); line(rv.pts, rv.w * 0.35, 'rgba(190,220,230,.28)', 0.25); }
  for (const s of bt.feat.streams) line(s.pts, s.w * 1.1, 'rgba(100,146,160,.9)', 0.2);
};
/* ---------- 兵の姿（スプライト） ---------- */
V3.sprite = (key, draw) => {
  let s = V3.sprites.get(key); if (s) return s;
  const c = document.createElement('canvas'); c.width = 32; c.height = 48; const g = c.getContext('2d');
  draw(g); V3.sprites.set(key, c); return c;
};
V3.soldier = (t, col, facing) => V3.sprite(`${t}|${col}|${facing}`, (g) => {
  const cls = D.UT[t] ? D.UT[t].cls : 'inf';
  const skin = '#e8c6a0', dark = '#2a2320';
  g.lineCap = 'round'; g.lineJoin = 'round';
  const cx = 16, base = 46;
  if (cls === 'cav' || cls === 'chr') {
    // 馬
    g.fillStyle = cls === 'chr' ? '#5a4026' : '#5b3f28'; g.beginPath(); g.ellipse(cx, base - 12, facing === 'side' ? 13 : 7, 7, 0, 0, 6.2832); g.fill();
    g.strokeStyle = '#3a2a1c'; g.lineWidth = 2.5; g.beginPath(); for (const dx of facing === 'side' ? [-9, -4, 5, 10] : [-5, 5]) { g.moveTo(cx + dx, base - 8); g.lineTo(cx + dx + (facing === 'side' ? 1 : 0), base); } g.stroke();
    if (facing === 'side') { g.fillStyle = '#5b3f28'; g.beginPath(); g.moveTo(cx + 10, base - 16); g.lineTo(cx + 18, base - 22); g.lineTo(cx + 19, base - 17); g.lineTo(cx + 12, base - 12); g.closePath(); g.fill(); }
    else { g.fillStyle = '#5b3f28'; g.beginPath(); g.ellipse(cx, base - 20, 4, 5, 0, 0, 6.2832); g.fill(); }
    if (cls === 'chr') { g.fillStyle = '#3a2a1a'; g.fillRect(cx - 10, base - 14, 20, 5); g.fillStyle = '#6b4a2a'; g.beginPath(); g.arc(cx - 8, base - 9, 4, 0, 6.2832); g.arc(cx + 8, base - 9, 4, 0, 6.2832); g.fill(); }
  }
  const by = cls === 'cav' || cls === 'chr' ? base - 20 : base; // 足元
  // 脚
  g.strokeStyle = dark; g.lineWidth = 3; g.beginPath(); g.moveTo(cx - 3, by - 12); g.lineTo(cx - 4, by); g.moveTo(cx + 3, by - 12); g.lineTo(cx + 4, by); g.stroke();
  // 胴
  g.fillStyle = col; g.fillRect(cx - 5, by - 24, 10, 13);
  g.fillStyle = 'rgba(0,0,0,.25)'; for (let y = by - 22; y < by - 12; y += 3) g.fillRect(cx - 5, y, 10, 1);
  // 頭と兜
  g.fillStyle = skin; g.beginPath(); g.arc(cx, by - 28, 3.6, 0, 6.2832); g.fill();
  g.fillStyle = t === 'guard' || t === 'heavy' ? '#8a7a4a' : dark; g.beginPath(); g.arc(cx, by - 29.5, 4, Math.PI, 0); g.closePath(); g.fill();
  if (facing === 'front') { g.fillStyle = '#1d150c'; g.fillRect(cx - 2, by - 28.5, 1.2, 1.2); g.fillRect(cx + 1, by - 28.5, 1.2, 1.2); }
  // 武器
  g.strokeStyle = '#4a3420'; g.lineWidth = 1.6;
  if (cls === 'rng' || t === 'harch') { g.strokeStyle = '#6b4a2a'; g.beginPath(); g.arc(cx + 6, by - 22, 7, -1.2, 1.2); g.stroke(); g.strokeStyle = '#d9d9d9'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(cx + 6 + Math.cos(-1.2) * 7, by - 22 + Math.sin(-1.2) * 7); g.lineTo(cx + 6 + Math.cos(1.2) * 7, by - 22 + Math.sin(1.2) * 7); g.stroke(); }
  else { const L = t === 'spear' ? 30 : 24; g.beginPath(); g.moveTo(cx + 6, by - 8); g.lineTo(cx + 6, by - 8 - L); g.stroke(); g.fillStyle = '#d9dde0'; g.beginPath(); g.moveTo(cx + 4.5, by - 8 - L); g.lineTo(cx + 6, by - 14 - L); g.lineTo(cx + 7.5, by - 8 - L); g.closePath(); g.fill(); if (t === 'inf' || t === 'militia') { g.fillStyle = '#d9dde0'; g.fillRect(cx + 6, by - 6 - L, 5, 1.5); } }
  // 盾
  if ((t === 'heavy' || t === 'guard' || t === 'shield') && facing !== 'back') { g.fillStyle = t === 'shield' ? '#7a5a34' : '#5a4026'; g.beginPath(); g.ellipse(cx - 6, by - 17, 4, 7, 0, 0, 6.2832); g.fill(); g.strokeStyle = '#c9a14a'; g.lineWidth = 0.8; g.stroke(); }
  if (facing === 'back') { g.fillStyle = col; g.fillRect(cx - 5, by - 24, 10, 13); g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(cx - 5, by - 24, 10, 13); }
});
V3.treeSprite = (k, season, snow) => V3.sprite(`tree|${k}|${season}|${snow}`, (g) => {
  const cx = 16, base = 46;
  g.fillStyle = '#4a3320'; g.fillRect(cx - 1.5, base - 16, 3, 16);
  if (k === 1) { g.fillStyle = snow ? '#9fb0a8' : '#3c5434'; g.beginPath(); g.moveTo(cx, 2); g.lineTo(cx + 12, base - 10); g.lineTo(cx - 12, base - 10); g.closePath(); g.fill(); g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.moveTo(cx, 2); g.lineTo(cx + 5, base - 12); g.lineTo(cx - 2, base - 12); g.closePath(); g.fill(); }
  else { const col = season === 3 ? (snow ? '#c9d0cc' : '#6d6a52') : season === 2 ? '#8c7a3c' : '#4a6a3a'; g.fillStyle = col; g.beginPath(); g.arc(cx, base - 26, 13, 0, 6.2832); g.fill(); g.beginPath(); g.arc(cx - 7, base - 20, 9, 0, 6.2832); g.fill(); g.beginPath(); g.arc(cx + 7, base - 21, 9, 0, 6.2832); g.fill(); g.fillStyle = season === 2 ? 'rgba(214,170,80,.5)' : 'rgba(150,180,100,.45)'; g.beginPath(); g.arc(cx - 4, base - 31, 7, 0, 6.2832); g.fill(); }
});
/* ---------- 物と部隊 ---------- */
V3.box = (ctx, pts, h, colTop, colSide, lt) => {
  // pts: 地面の4点 [x,y,z]（戦場座標）。高さ h の箱を描く
  const top = pts.map(p => V3.project(p[0], p[1], p[2] + h)), bot = pts.map(p => V3.project(p[0], p[1], p[2]));
  if (top.some(p => !p) || bot.some(p => !p)) return;
  // 見える側面：カメラに向く辺（画面で底辺が上辺より下にある辺）
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    const a = bot[i], b = bot[j], c = top[j], d = top[i];
    // 外向き法線が手前を向くか（画面での符号付き面積）
    const area = (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]);
    if (area <= 0) continue;
    ctx.fillStyle = colSide[i % 2]; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = colTop; ctx.beginPath(); ctx.moveTo(top[0][0], top[0][1]); for (let i = 1; i < 4; i++) ctx.lineTo(top[i][0], top[i][1]); ctx.closePath(); ctx.fill();
  return top;
};
V3.drawObjects = (lt) => {
  const bt = V.bt, ctx = V.ctx, cam = V3.cam;
  const items = [];
  const vw = V.vw, vh = V.vh;
  const far = bt.W * 2.4;
  const season = V.SEASON(), snow = bt.weather === 'snow';
  const vis = V3.vis;
  // 木
  const treeBudget = V3.quality < 1 ? 450 : 1100;
  let tn = 0;
  for (const tr of V3.trees) {
    const p = V3.project(tr.x, tr.y); if (!p || p[2] > far) continue;
    const sz = V3.foc / p[2] * bt.tile * 1.3 * tr.s; if (sz < 2.2) continue;
    if (p[0] < -sz || p[0] > vw + sz || p[1] < -sz * 2 || p[1] > vh + sz) continue;
    if (++tn > treeBudget) break;
    items.push({ d: p[2], k: 'tree', p, sz, o: tr });
  }
  for (const rk of V3.rocks) { const p = V3.project(rk.x, rk.y); if (!p || p[2] > far) continue; const sz = V3.foc / p[2] * bt.tile * 0.6 * rk.s; if (sz < 2 || p[0] < -sz || p[0] > vw + sz || p[1] < -sz || p[1] > vh + sz) continue; items.push({ d: p[2], k: 'rock', p, sz, o: rk }); }
  for (const h of V3.houses) { const p = V3.project(h.x, h.y); if (!p || p[2] > far) continue; const sz = V3.foc / p[2] * h.w; if (sz < 2 || p[0] < -sz * 2 || p[0] > vw + sz * 2 || p[1] < -sz * 2 || p[1] > vh + sz) continue; items.push({ d: p[2], k: 'house', p, sz, o: h }); }
  if (bt.walls) for (const w of bt.walls) { if (!w.tiles.length) continue; const p = V3.project(w.x, w.y); if (!p) continue; items.push({ d: p[2] - bt.tile, k: 'wall', p, o: w }); if (w.broken && V3.quality >= 1) items.push({ d: p[2] - bt.tile * 1.5, k: 'smoke', x: w.x, y: w.y, z: bt.tile * 0.4, r: bt.tile * 0.9, a: 0.25, seed: w.id }); }
  // 火の煙（燃えている地から立ちのぼる）
  if (bt.fire) { let fn = 0; const step = V3.quality < 1 ? 3 : 1; for (let i = 0; i < bt.fire.length && fn < 36; i += step) { if (!(bt.fire[i] > 0)) continue; const [x, y] = B.tc(bt, i); const p = V3.project(x, y); if (!p || p[2] > far * 0.6) continue; if (p[0] < -40 || p[0] > vw + 40 || p[1] < -200 || p[1] > vh + 40) continue; items.push({ d: p[2] - bt.tile, k: 'smoke', x, y, z: 0.5, r: bt.tile * 1.1, a: 0.42, seed: i, fire: true }); fn++; } }
  for (const u of bt.units) {
    if (!B.alive(u)) continue;
    if (u.side !== 0 && !u.vis[0] && bt.spec.role !== 'watch') continue;
    const p = V3.project(u.x, u.y); if (!p) continue;
    const sz = V3.foc / p[2] * u.diag; if (p[0] < -sz || p[0] > vw + sz || p[1] < -sz || p[1] > vh + sz) continue;
    items.push({ d: p[2], k: 'unit', p, sz, o: u });
  }
  items.sort((a, b) => b.d - a.d);
  let cells = 0, sprites = 0;
  const spriteBudget = V3.quality < 1 ? 500 : 1300;
  for (const it of items) {
    if (it.k === 'tree') { const s = V3.treeSprite(it.o.k, season, snow); const w = it.sz * 0.9, h = it.sz * 1.35; if (w > 6) { ctx.fillStyle = 'rgba(20,14,8,.22)'; ctx.beginPath(); ctx.ellipse(it.p[0] + w * 0.25, it.p[1], w * 0.55, w * 0.18, 0, 0, 6.2832); ctx.fill(); } ctx.drawImage(s, it.p[0] - w / 2, it.p[1] - h, w, h); continue; }
    if (it.k === 'rock') { const r = it.sz; ctx.fillStyle = V3.shadeRGB(125, 118, 106, 0.95, it.d, lt); ctx.beginPath(); ctx.ellipse(it.p[0], it.p[1] - r * 0.3, r, r * 0.6, 0, 0, 6.2832); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.ellipse(it.p[0] - r * 0.25, it.p[1] - r * 0.55, r * 0.35, r * 0.2, 0, 0, 6.2832); ctx.fill(); continue; }
    if (it.k === 'house') {
      const h = it.o, ca = Math.cos(h.a), sa = Math.sin(h.a);
      const pt = (lx, ly) => { const x = h.x + lx * ca - ly * sa, y = h.y + lx * sa + ly * ca; return [x, y, V3.heightAt(x, y)]; };
      const pts = [pt(-h.w / 2, -h.d / 2), pt(h.w / 2, -h.d / 2), pt(h.w / 2, h.d / 2), pt(-h.w / 2, h.d / 2)];
      const wall = V3.shadeRGB(205, 190, 160, 0.95, it.d, lt), wall2 = V3.shadeRGB(170, 150, 120, 0.9, it.d, lt), roof = V3.shadeRGB(snow ? 230 : 120, snow ? 230 : 90, snow ? 226 : 70, 1, it.d, lt);
      V3.box(ctx, pts, h.h, roof, [wall, wall2], lt);
      // 屋根の棟
      const a = V3.project(pts[0][0] + (pts[3][0] - pts[0][0]) / 2, pts[0][1] + (pts[3][1] - pts[0][1]) / 2, pts[0][2] + h.h * 1.35), b = V3.project(pts[1][0] + (pts[2][0] - pts[1][0]) / 2, pts[1][1] + (pts[2][1] - pts[1][1]) / 2, pts[1][2] + h.h * 1.35);
      if (a && b) { ctx.strokeStyle = V3.shadeRGB(80, 58, 40, 1, it.d, lt); ctx.lineWidth = Math.max(1, it.sz * 0.08); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
      continue;
    }
    if (it.k === 'wall') { V3.drawWall(it.o, it.d, lt); V3.wallMen(it.o, it.d, lt); continue; }
    if (it.k === 'smoke') {
      const t = V.ui.anim * 0.6;
      for (let k = 0; k < 3; k++) {
        const ph = ((t * 0.5 + k * 0.33 + V.hash(it.seed, k)) % 1), rise = ph * it.r * 4.5, drift = (V.hash(it.seed, k + 7) - 0.5) * it.r * 2 * ph;
        const p = V3.project(it.x + drift, it.y + drift * 0.4, it.z + rise); if (!p) continue;
        const rr = V3.foc / p[2] * it.r * (0.5 + ph * 1.1); if (rr < 1.5) continue;
        const al = it.a * (1 - ph) * (it.fire && ph < 0.25 ? 1.2 : 1);
        ctx.fillStyle = it.fire && ph < 0.2 ? `rgba(240,140,60,${(al * 0.8).toFixed(3)})` : `rgba(96,90,84,${al.toFixed(3)})`;
        ctx.beginPath(); ctx.arc(p[0], p[1], rr, 0, 6.2832); ctx.fill();
      }
      continue;
    }
    // 部隊
    const u = it.o;
    const own = u.side === 0, side = bt.sides[u.side];
    let col = side.color; if (col === '#26262d') col = '#3a3a48';
    const sel = V.ui.sel.has(u.id);
    const pxCell = V3.foc / it.d * Math.min(u.w / u.cols, u.h / u.rows);
    const alpha = u.hidden ? 0.5 : u.state === 'rout' ? 0.75 : 1;
    ctx.globalAlpha = alpha;
    const morV = V.ui.morView && (own || bt.spec.role === 'watch');
    const fBase = V.shade(col, own ? 0.06 : 0), fLow = V.shade(col, own ? 0.15 : 0.1);
    const now = bt.time;
    const hb = Math.min(u.w / u.cols, u.h / u.rows) * 0.6;
    const corner = (lx, ly) => { const [x, y] = B.toWorld(u, lx, ly); return [x, y, V3.heightAt(U.clamp(x, 0, bt.W), U.clamp(y, 0, bt.H))]; };
    const dim = (c) => V.shade(c, -0.35), dim2 = (c) => V.shade(c, -0.55);
    // 影（日の向きに少しずらした暗い四角）
    if (!u.ship) { const L = lt.L, ox = -L[0] * u.h * 0.12, oy = -L[1] * u.h * 0.12; const sp = [corner(-u.w / 2, -u.h / 2), corner(u.w / 2, -u.h / 2), corner(u.w / 2, u.h / 2), corner(-u.w / 2, u.h / 2)].map(p => V3.project(p[0] + ox, p[1] + oy, p[2] + 0.15)); if (sp.every(Boolean)) { ctx.fillStyle = 'rgba(20,14,8,.28)'; ctx.beginPath(); sp.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fill(); } }
    if (u.ship) V3.drawShips(u, it.d, col, lt, morV);
    else if (u.cls === 'sie') {
      const pts = [corner(-u.w / 2, -u.h / 2), corner(u.w / 2, -u.h / 2), corner(u.w / 2, u.h / 2), corner(-u.w / 2, u.h / 2)];
      V3.box(ctx, pts, u.t === 'tower' ? u.h * 1.4 : u.h * 0.5, '#6a4a2a', ['#4a3420', '#3a2818'], lt);
      if (u.t === 'ram') { const a = V3.project(...corner(0, -u.h * 0.6).slice(0, 2), pts[0][2] + u.h * 0.4), b = V3.project(...corner(0, u.h * 0.5).slice(0, 2), pts[0][2] + u.h * 0.4); if (a && b) { ctx.strokeStyle = '#2a1a0c'; ctx.lineWidth = Math.max(2, it.sz * 0.12); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); } }
    } else if (pxCell < 4.5) {
      // 遠い：隊を一つの塊に
      const pts = [corner(-u.w / 2, -u.h / 2), corner(u.w / 2, -u.h / 2), corner(u.w / 2, u.h / 2), corner(-u.w / 2, u.h / 2)];
      const top = V3.box(ctx, pts, hb, morV ? V.morColor(u.mor) : fBase, [dim(col), dim2(col)], lt);
      cells += 1;
    } else {
      const cw = u.w / u.cols, ch = u.h / u.rows;
      const gapX = Math.min(cw * 0.12, 0.5), gapY = Math.min(ch * 0.12, 0.5);
      const shake = u.eng.length ? 1 : 0;
      // 兵の姿の向き：隊の向きとカメラの向きの差
      const rel = U.angNorm(u.a - cam.yaw);
      const facing = Math.abs(rel) < 0.8 ? 'back' : Math.abs(rel) > 2.35 ? 'front' : 'side';
      const flip = facing === 'side' && rel > 0;
      const useSpr = pxCell >= 9 && sprites < spriteBudget;
      const spr = useSpr ? V3.soldier(u.t, col, facing) : null;
      // 奥の伍から
      const ordered = u.cells.filter(c => c.n > 0).map(c => { const [lx, ly] = B.cellLocal(u, c); const [x, y] = B.toWorld(u, lx, ly); const p = V3.project(x, y); return p ? { c, lx, ly, p } : null; }).filter(Boolean).sort((a, b) => b.p[2] - a.p[2]);
      for (const { c, lx, ly, p } of ordered) {
        const frac = U.clamp(c.n / Math.max(1, c.max), 0.3, 1);
        const w = (cw - gapX) * (0.6 + 0.4 * frac), h = (ch - gapY) * (0.6 + 0.4 * frac);
        const jx = shake ? (Math.random() - 0.5) * cw * 0.1 : 0, jy = shake ? (Math.random() - 0.5) * ch * 0.1 : 0;
        const hit = now - c.hit < 0.18;
        let fill = morV ? V.morColor(Math.round(c.mor / 4) * 4) : c.mor < 28 ? fLow : fBase;
        if (hit) fill = '#fff1dc';
        const pts = [corner(lx - w / 2 + jx, ly - h / 2 + jy), corner(lx + w / 2 + jx, ly - h / 2 + jy), corner(lx + w / 2 + jx, ly + h / 2 + jy), corner(lx - w / 2 + jx, ly + h / 2 + jy)];
        const top = V3.box(ctx, pts, hb * (useSpr ? 0.35 : 1), fill, [dim(col), dim2(col)], lt);
        cells++;
        if (spr && top) {
          const cx2 = (top[0][0] + top[2][0]) / 2, cy2 = (top[0][1] + top[2][1]) / 2;
          const sw = pxCell * 0.75, sh = sw * 1.5;
          const nfig = pxCell >= 26 ? 3 : pxCell >= 16 ? 2 : 1;
          for (let k = 0; k < nfig; k++) {
            const ox = nfig === 1 ? 0 : (k - (nfig - 1) / 2) * sw * 0.55, oy = nfig === 1 ? 0 : ((k % 2) - 0.5) * sh * 0.12;
            if (flip) { ctx.save(); ctx.translate(cx2 + ox, cy2 + oy); ctx.scale(-1, 1); ctx.drawImage(spr, -sw * 0.5, -sh, sw, sh); ctx.restore(); }
            else ctx.drawImage(spr, cx2 + ox - sw * 0.5, cy2 + oy - sh, sw, sh);
            sprites++;
          }
          if (c.wi === -1) { ctx.strokeStyle = V.colors.bronze; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx2, cy2, sw * 0.6, 0, 6.2832); ctx.stroke(); }
        }
      }
    }
    ctx.globalAlpha = 1;
    // 外枠（選択・敵）
    const outline = own ? (sel ? V.colors.jade : 'rgba(235,227,205,.55)') : 'rgba(194,69,47,.8)';
    const pts = [corner(-u.w / 2, -u.h / 2), corner(u.w / 2, -u.h / 2), corner(u.w / 2, u.h / 2), corner(-u.w / 2, u.h / 2)].map(p => V3.project(p[0], p[1], p[2] + 0.3));
    if (pts.every(Boolean)) {
      ctx.strokeStyle = outline; ctx.lineWidth = sel ? 2.4 : 1; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.stroke();
      // 正面の印
      const f0 = V3.project(...corner(0, -u.h / 2 - 1.2).slice(0, 2), pts[0] ? V3.heightAt(u.x, u.y) + 0.3 : 0), f1 = V3.project(...corner(-1.2, -u.h / 2).slice(0, 2)), f2 = V3.project(...corner(1.2, -u.h / 2).slice(0, 2));
      if (f0 && f1 && f2) { ctx.fillStyle = outline; ctx.beginPath(); ctx.moveTo(f0[0], f0[1]); ctx.lineTo(f1[0], f1[1]); ctx.lineTo(f2[0], f2[1]); ctx.closePath(); ctx.fill(); }
    }
    if (!u.ship && ((u.charging && Math.random() < 0.3) || ((u.cls === 'cav' || u.cls === 'chr') && u.spd > 0.4 && Math.random() < 0.18))) B.fx(bt, { k: 'dust', x: u.x - Math.sin(u.a) * u.h * 0.6, y: u.y + Math.cos(u.a) * u.h * 0.6, r: Math.max(2, u.w * 0.25) });
  }
  V3.stats.cells = cells; V3.stats.sprites = sprites;
};
// 船団（一隻ずつ：船体の側面・甲板・国の色の甲板・帆柱と帆）
V3.drawShips = (u, d, col, lt, morV) => {
  const bt = V.bt, ctx = V.ctx, now = bt.time;
  const cw = u.w / u.cols, ch = u.h / u.rows, L = ch * 0.88, Bm = Math.min(cw * 0.55, L * 0.24);
  const fb = Math.max(1.2, Bm * 0.55);   // 舷の高さ
  const pxL = V3.foc / Math.max(1, d) * L;
  const hullS = V3.shadeRGB(78, 52, 30, 0.9, d, lt), hullT = V3.shadeRGB(112, 80, 50, 1, d, lt);
  const deck = V.shade(col, u.side === 0 ? 0.08 : 0.02), sail = V3.shadeRGB(226, 214, 186, 1, d, lt);
  const P = [[0, -0.5], [0.5, -0.16], [0.46, 0.3], [0, 0.5], [-0.46, 0.3], [-0.5, -0.16]];
  const ord = u.cells.filter(c => c.n > 0).map(c => { const [lx, ly] = B.cellLocal(u, c); const [x, y] = B.toWorld(u, lx, ly); const p = V3.project(x, y); return p ? { c, lx, ly, p } : null; }).filter(Boolean).sort((a, b) => b.p[2] - a.p[2]);
  const pt = (lx, ly, h) => { const [x, y] = B.toWorld(u, lx, ly); return V3.project(x, y, V3.heightAt(U.clamp(x, 0, bt.W), U.clamp(y, 0, bt.H)) + h); };
  for (const { c, lx, ly } of ord) {
    const frac = U.clamp(c.n / Math.max(1, c.max), 0, 1), sink = frac < 0.35 ? (0.35 - frac) * fb * 2.2 : 0, hit = now - c.hit < 0.2;
    if (pxL < 5) {
      // 遠い：船の形の影だけ
      const q = P.map(([a, b2]) => pt(lx + a * Bm, ly + b2 * L, fb * 0.6 - sink)); if (!q.every(Boolean)) continue;
      ctx.fillStyle = hit ? '#fff1dc' : morV ? V.morColor(Math.round(c.mor / 4) * 4) : deck; ctx.beginPath(); q.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fill();
      continue;
    }
    const top = P.map(([a, b2]) => pt(lx + a * Bm, ly + b2 * L, fb - sink)), bot = P.map(([a, b2]) => pt(lx + a * Bm * 0.82, ly + b2 * L * 0.94, 0.15));
    if (!top.every(Boolean) || !bot.every(Boolean)) continue;
    ctx.fillStyle = hullS;
    for (let i = 0; i < P.length; i++) { const j = (i + 1) % P.length; ctx.beginPath(); ctx.moveTo(bot[i][0], bot[i][1]); ctx.lineTo(bot[j][0], bot[j][1]); ctx.lineTo(top[j][0], top[j][1]); ctx.lineTo(top[i][0], top[i][1]); ctx.closePath(); ctx.fill(); }
    const sim = V.shipImg ? V.shipImg(u.t) : null;
    if (sim) {
      // 外で作った軍船の絵を甲板の高さに貼る（船首が前）。国の色は甲板の帯で
      const hL = L * 0.56, Wd = hL * 2 * sim.height / sim.width;
      const A0 = pt(lx - Wd / 2, ly + hL, fb - sink), A1 = pt(lx - Wd / 2, ly - hL, fb - sink), A2 = pt(lx + Wd / 2, ly + hL, fb - sink);
      if (A0 && A1 && A2) { ctx.save(); ctx.transform((A1[0] - A0[0]) / sim.width, (A1[1] - A0[1]) / sim.width, (A2[0] - A0[0]) / sim.height, (A2[1] - A0[1]) / sim.height, A0[0], A0[1]); ctx.drawImage(sim, 0, 0); ctx.restore(); }
      const inner = P.map(([a, b2]) => pt(lx + a * Bm * 0.38, ly + b2 * L * 0.6, fb - sink + 0.05));
      if (inner.every(Boolean)) { const ga = ctx.globalAlpha; ctx.globalAlpha = ga * 0.6; ctx.fillStyle = morV ? V.morColor(Math.round(c.mor / 4) * 4) : deck; ctx.beginPath(); inner.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fill(); ctx.globalAlpha = ga; }
      if (hit) { const ga = ctx.globalAlpha; ctx.globalAlpha = ga * 0.45; ctx.fillStyle = '#fff1dc'; ctx.beginPath(); top.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fill(); ctx.globalAlpha = ga; }
    } else {
      ctx.fillStyle = hit ? '#fff1dc' : hullT; ctx.beginPath(); top.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fill();
      const inner = P.map(([a, b2]) => pt(lx + a * Bm * 0.55, ly + b2 * L * 0.72, fb - sink + 0.05));
      if (inner.every(Boolean)) { ctx.fillStyle = morV ? V.morColor(Math.round(c.mor / 4) * 4) : deck; ctx.beginPath(); inner.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fill(); }
      // 衝角
      const r0 = pt(lx, ly - L * 0.58, 0.4), r1 = pt(lx + Bm * 0.12, ly - L * 0.47, 0.6), r2 = pt(lx - Bm * 0.12, ly - L * 0.47, 0.6);
      if (r0 && r1 && r2) { ctx.fillStyle = '#b8925a'; ctx.beginPath(); ctx.moveTo(r0[0], r0[1]); ctx.lineTo(r1[0], r1[1]); ctx.lineTo(r2[0], r2[1]); ctx.closePath(); ctx.fill(); }
      // 櫂
      if (pxL > 14) {
        const no = u.ut.crew >= 200 ? 8 : u.ut.crew >= 100 ? 6 : 4, ph = u.spd > 0.3 * bt.p ? now * 7 + c.c : 0;
        ctx.strokeStyle = 'rgba(40,28,16,.8)'; ctx.lineWidth = Math.max(0.6, pxL * 0.012); ctx.beginPath();
        for (let k = 0; k < no; k++) { const yy = ly + (-0.24 + k * 0.48 / (no - 1)) * L, sw = Math.sin(ph + k * 0.3) * L * 0.05; for (const sg of [-1, 1]) { const a = pt(lx + sg * Bm * 0.45, yy, fb * 0.6 - sink), b2 = pt(lx + sg * Bm * 1.25, yy + sw, 0.05); if (a && b2) { ctx.moveTo(a[0], a[1]); ctx.lineTo(b2[0], b2[1]); } } }
        ctx.stroke();
      }
    }
    // 帆柱と帆（交戦中は帆をたたむ）
    const m0 = pt(lx, ly - L * 0.06, fb - sink), m1 = pt(lx, ly - L * 0.06, fb - sink + L * 0.5);
    if (m0 && m1 && pxL > 8) {
      ctx.strokeStyle = '#3a2816'; ctx.lineWidth = Math.max(1, pxL * 0.02); ctx.beginPath(); ctx.moveTo(m0[0], m0[1]); ctx.lineTo(m1[0], m1[1]); ctx.stroke();
      const furled = u.eng.length > 0, sh = furled ? 0.06 : 0.3;
      const a = pt(lx - Bm * 0.95, ly - L * 0.06, fb - sink + L * 0.48), b2 = pt(lx + Bm * 0.95, ly - L * 0.06, fb - sink + L * 0.48), c2 = pt(lx + Bm * 0.85, ly - L * 0.06, fb - sink + L * (0.48 - sh)), d2 = pt(lx - Bm * 0.85, ly - L * 0.06, fb - sink + L * (0.48 - sh));
      if (a && b2 && c2 && d2) { ctx.fillStyle = sail; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b2[0], b2[1]); ctx.lineTo(c2[0], c2[1]); ctx.lineTo(d2[0], d2[1]); ctx.closePath(); ctx.fill(); if (!furled) { ctx.fillStyle = V.shade(col, 0.1); const e1 = pt(lx - Bm * 0.9, ly - L * 0.06, fb - sink + L * 0.36), e2 = pt(lx + Bm * 0.9, ly - L * 0.06, fb - sink + L * 0.36), e3 = pt(lx + Bm * 0.88, ly - L * 0.06, fb - sink + L * 0.31), e4 = pt(lx - Bm * 0.88, ly - L * 0.06, fb - sink + L * 0.31); if (e1 && e2 && e3 && e4) { ctx.beginPath(); ctx.moveTo(e1[0], e1[1]); ctx.lineTo(e2[0], e2[1]); ctx.lineTo(e3[0], e3[1]); ctx.lineTo(e4[0], e4[1]); ctx.closePath(); ctx.fill(); } } }
    }
    // 航跡
    if (u.spd > 0.3 * bt.p && pxL > 6) { const w0 = pt(lx - Bm * 0.5, ly + L * 0.5, 0.05), w1 = pt(lx - Bm * 1.4, ly + L * 1.2, 0.05), w2 = pt(lx + Bm * 0.5, ly + L * 0.5, 0.05), w3 = pt(lx + Bm * 1.4, ly + L * 1.2, 0.05); if (w0 && w1 && w2 && w3) { ctx.strokeStyle = 'rgba(236,246,250,.5)'; ctx.lineWidth = Math.max(1, pxL * 0.03); ctx.beginPath(); ctx.moveTo(w0[0], w0[1]); ctx.lineTo(w1[0], w1[1]); ctx.moveTo(w2[0], w2[1]); ctx.lineTo(w3[0], w3[1]); ctx.stroke(); } }
  }
};
V3.drawWall = (w, d, lt) => {
  const bt = V.bt, ctx = V.ctx;
  const a = B.tc(bt, w.tiles[0]), b = B.tc(bt, w.tiles[w.tiles.length - 1]);
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
  const ux = dx / L || (w.nx ? 0 : 1), uy = dy / L || (w.nx ? 1 : 0);
  const nx = -uy, ny = ux, th = bt.tile * 0.55, ext = bt.tile * 0.5;
  const x0 = a[0] - ux * ext, y0 = a[1] - uy * ext, x1 = b[0] + ux * ext, y1 = b[1] + uy * ext;
  const z0 = Math.min(V3.heightAt(x0, y0), V3.heightAt(x1, y1)) - 0.5;
  const pts = [[x0 + nx * th, y0 + ny * th, z0], [x1 + nx * th, y1 + ny * th, z0], [x1 - nx * th, y1 - ny * th, z0], [x0 - nx * th, y0 - ny * th, z0]];
  const hgt = w.broken ? bt.tile * 0.35 : bt.tile * (w.kind === 'gate' ? 2.4 : 2.2);
  const stone = w.broken ? [120, 100, 84] : w.kind === 'gate' ? [92, 66, 40] : [128, 118, 106];
  const top = V3.box(ctx, pts, hgt, V3.shadeRGB(stone[0] + 20, stone[1] + 18, stone[2] + 14, 1, d, lt), [V3.shadeRGB(stone[0], stone[1], stone[2], 0.85, d, lt), V3.shadeRGB(stone[0], stone[1], stone[2], 0.6, d, lt)], lt);
  if (!top) return;
  if (w.broken) { ctx.fillStyle = V3.shadeRGB(70, 58, 48, 0.9, d, lt); for (let k = 0; k < 5; k++) { const t = (k + 0.5) / 5; const p = V3.project(x0 + (x1 - x0) * t + nx * (V.hash(w.id, k) - 0.5) * th * 2, y0 + (y1 - y0) * t + ny * (V.hash(w.id, k) - 0.5) * th * 2, z0 + hgt); if (p) { const r = Math.max(1.5, V3.foc / p[2] * bt.tile * 0.2); ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, 6.2832); ctx.fill(); } } return; }
  // 胸壁（凸凹）
  const n = Math.max(2, Math.round(L / (bt.tile * 0.9)));
  const sideK = (w.nx * nx + w.ny * ny) > 0 ? 1 : -1;
  ctx.fillStyle = V3.shadeRGB(stone[0] + 40, stone[1] + 38, stone[2] + 30, 0.95, d, lt);
  for (let k = 0; k < n; k += 2) {
    const t = (k + 0.5) / n, cx = x0 + (x1 - x0) * t + nx * sideK * th * 0.6, cy = y0 + (y1 - y0) * t + ny * sideK * th * 0.6;
    const mw = bt.tile * 0.32, mh = bt.tile * 0.5;
    const mp = [[cx - ux * mw - nx * mw * 0.5, cy - uy * mw - ny * mw * 0.5, z0 + hgt], [cx + ux * mw - nx * mw * 0.5, cy + uy * mw - ny * mw * 0.5, z0 + hgt], [cx + ux * mw + nx * mw * 0.5, cy + uy * mw + ny * mw * 0.5, z0 + hgt], [cx - ux * mw + nx * mw * 0.5, cy - uy * mw + ny * mw * 0.5, z0 + hgt]];
    V3.box(ctx, mp, mh, ctx.fillStyle, [V3.shadeRGB(stone[0], stone[1], stone[2], 0.8, d, lt), V3.shadeRGB(stone[0], stone[1], stone[2], 0.6, d, lt)], lt);
    ctx.fillStyle = V3.shadeRGB(stone[0] + 40, stone[1] + 38, stone[2] + 30, 0.95, d, lt);
  }
  if (w.kind === 'gate') {
    // 門扉
    const gp = [V3.project(x0 + ux * L * 0.25, y0 + uy * L * 0.25, z0), V3.project(x0 + ux * L * 0.75, y0 + uy * L * 0.75, z0), V3.project(x0 + ux * L * 0.75, y0 + uy * L * 0.75, z0 + hgt * 0.7), V3.project(x0 + ux * L * 0.25, y0 + uy * L * 0.25, z0 + hgt * 0.7)];
    if (gp.every(Boolean)) { ctx.fillStyle = w.openT > bt.time ? '#1a100a' : '#3a2412'; ctx.beginPath(); gp.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#c9a14a'; ctx.lineWidth = 1; ctx.stroke(); }
    // 門の櫓
    const tp = pts.map(p => [p[0], p[1], z0 + hgt]);
    V3.box(ctx, tp, hgt * 0.45, V3.shadeRGB(90, 60, 40, 1, d, lt), [V3.shadeRGB(120, 86, 56, 0.9, d, lt), V3.shadeRGB(100, 70, 46, 0.7, d, lt)], lt);
  }
};
// 城壁の上の兵（守備隊が付いている城壁に、兵の姿を並べる）と、夕暮れの松明
V3.wallMen = (w, d, lt) => {
  const bt = V.bt, ctx = V.ctx;
  const a = B.tc(bt, w.tiles[0]), b = B.tc(bt, w.tiles[w.tiles.length - 1]);
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const hgt = w.broken ? bt.tile * 0.35 : bt.tile * (w.kind === 'gate' ? 2.4 : 2.2);
  const z0 = Math.min(V3.heightAt(a[0], a[1]), V3.heightAt(b[0], b[1])) - 0.5 + hgt;
  const sz = V3.foc / d * bt.tile * 0.7;
  const def = w.def != null ? bt.units[w.def] : null;
  if (def && B.alive(def) && !w.broken && sz >= 5 && V3.stats.sprites < 1600) {
    let col = bt.sides[def.side].color; if (col === '#26262d') col = '#3a3a48';
    const spr = V3.soldier(def.t, col, 'front');
    const n = Math.min(6, Math.max(2, Math.round(L / (bt.tile * 1.2))));
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n; const p = V3.project(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, z0 + 0.2); if (!p) continue;
      const sw = sz * 0.75, sh = sw * 1.5;
      ctx.drawImage(spr, p[0] - sw / 2, p[1] - sh, sw, sh); V3.stats.sprites++;
    }
  }
  // 松明（朝夕）
  if (lt.warm > 0.45 && !w.broken && sz >= 3) {
    const n = Math.max(1, Math.round(L / (bt.tile * 2.5)));
    for (let k = 0; k < n; k++) { const t = (k + 0.5) / n; const p = V3.project(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, z0 + bt.tile * 0.4); if (!p) continue; const r = Math.max(1.5, sz * 0.12) * (0.85 + 0.15 * Math.sin(V.ui.anim * 11 + k)); const gr = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], r * 3); gr.addColorStop(0, 'rgba(255,210,120,.9)'); gr.addColorStop(0.3, 'rgba(255,150,60,.45)'); gr.addColorStop(1, 'rgba(255,120,40,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(p[0], p[1], r * 3, 0, 6.2832); ctx.fill(); }
  }
};
// 将の目線：自分の隊（なければ選んだ隊）の後ろから低く見る
V3.follow = false;
V3.followCam = () => {
  const bt = V.bt; if (!bt) return;
  let u = bt.units.find(x => x.me && B.alive(x));
  if (!u) { const id = [...V.ui.sel][0]; u = id != null ? bt.units[id] : null; }
  if (!u || !B.alive(u)) u = bt.units.find(x => x.side === 0 && B.alive(x));
  if (!u) return;
  const f = B.fwd(u.a);
  const back = bt.W * 0.05;
  const tx = u.x - f[0] * back, ty = u.y - f[1] * back;
  const k = Math.min(1, V.realDt * 3);
  V3.cam.x += (tx - V3.cam.x) * k; V3.cam.y += (ty - V3.cam.y) * k;
  V3.cam.yaw += U.angNorm(u.a - V3.cam.yaw) * k;
  V3.cam.pitch += (0.26 - V3.cam.pitch) * k;
  V3.cam.dist += (bt.W * 0.16 - V3.cam.dist) * k;
};
/* ---------- 入力の補助 ---------- */
V3.orbit = (dyaw, dpitch) => { V3.follow = false; V3.cam.yaw += dyaw; V3.cam.pitch += dpitch; V3.clamp(); V3.setup(); };
V3.zoom = (k) => { V3.follow = false; V3.cam.dist *= k; V3.clamp(); V3.setup(); };
V3.panGrab = (sx0, sy0, sx1, sy1) => { V3.follow = false; const a = V3.pick(sx0, sy0), b = V3.pick(sx1, sy1); const bt = V.bt; const lim = Math.max(bt.W, bt.H); const dx = U.clamp(a[0] - b[0], -lim, lim), dy = U.clamp(a[1] - b[1], -lim, lim); V3.cam.x += dx; V3.cam.y += dy; V3.clamp(); V3.setup(); };
V3.miniRect = (g, W, H) => {
  const bt = V.bt;
  const pts = [[0, 0], [V.vw, 0], [V.vw, V.vh], [0, V.vh]].map(([sx, sy]) => V3.pick(sx, sy)).map(([x, y]) => [U.clamp(x, -bt.W * 0.5, bt.W * 1.5) / bt.W * W, U.clamp(y, -bt.H * 0.5, bt.H * 1.5) / bt.H * H]);
  g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 1; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.stroke();
  // カメラの位置
  const c = V3.C; g.fillStyle = '#f3d27a'; g.beginPath(); g.arc(U.clamp(c[0] / bt.W * W, 0, W), U.clamp(c[1] / bt.H * H, 0, H), 2.2, 0, 6.2832); g.fill();
};
