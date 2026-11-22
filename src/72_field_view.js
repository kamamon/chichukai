/* =========================================================
   地中海覇道 — 合戦場の描画（細格子のタイル・木と家・城壁・天気）
   ========================================================= */
V.FIELD_GEN = 0;
V.SEASON = () => { const m = (typeof G !== 'undefined' && G && G.month) || 4; return m <= 3 ? 0 : m <= 6 ? 1 : m <= 9 ? 2 : 3; };
V.buildTerrain = () => {
  const bt = V.bt, f = bt.fine;
  // ミニマップ（航行格子）
  const m = document.createElement('canvas'); m.width = bt.cols; m.height = bt.rows;
  const mc = m.getContext('2d');
  for (let i = 0; i < bt.cols * bt.rows; i++) { mc.fillStyle = D.TILE[bt.terr[i]].c; mc.fillRect(i % bt.cols, Math.floor(i / bt.cols), 1, 1); }
  V.mterr = m;
  bt._terrSnap = bt.terr.slice();
  // 霧
  V.fog = document.createElement('canvas'); V.fog.width = bt.cols; V.fog.height = bt.rows;
  V.fogT = -9;
  // 細かい地表（タイル）
  if (V.ft) V.ft.destroy();
  if (!f) { V.ft = null; return; }
  const gen = ++V.FIELD_GEN + 1000;
  const data = { gen, cols: f.cols, rows: f.rows, cell: f.cell, type: f.type, elev: f.elev, T: D.T, season: V.SEASON(), snow: bt.weather === 'snow' ? 1 : 0, fieldAng: bt.feat ? bt.feat.fieldAng : 0, pw: bt.feat && bt.feat.parcel ? bt.feat.parcel.pw : 0, ph: bt.feat && bt.feat.parcel ? bt.feat.parcel.ph : 0 };
  GEO.setField(data);
  if (GEO.worker) { try { GEO.worker.postMessage({ cmd: 'field', data }); } catch (e) { console.warn(e); } }
  V.ft = new MAP.TileSet({ set: 'f', W: bt.W, H: bt.H, unit: f.cell, levels: [1, 2, 4, 8, 16, 32, 64], max: 90, gen, render: GEO.renderFieldTile, decorate: V.decorateField });
  V.ft.prefetchBase();
  // 地名
  V.places = [];
  if (bt.feat) {
    for (const v of bt.feat.villages) if (v.n) V.places.push({ x: v.x, y: v.y + v.r * 1.15, s: v.town ? v.n + '（町）' : v.n, big: v.town });
    if (bt.feat.river && bt.feat.river.n) { const p = bt.feat.river.pts[Math.floor(bt.feat.river.pts.length * 0.62)]; V.places.push({ x: p[0], y: p[1], s: bt.feat.river.n, water: true }); }
    for (const p of bt.feat.ponds) if (p.n) V.places.push({ x: p.x, y: p.y, s: p.n, water: true });
  }
  V.weatherInit();
};
V.syncTerrain = () => {
  const bt = V.bt; const snap = bt._terrSnap;
  let changed = false;
  for (let i = 0; i < bt.terr.length; i++) if (bt.terr[i] !== snap[i]) { snap[i] = bt.terr[i]; changed = true; const mc = V.mterr.getContext('2d'); mc.fillStyle = D.TILE[bt.terr[i]].c; mc.fillRect(i % bt.cols, Math.floor(i / bt.cols), 1, 1); }
  return changed;
};
// 細格子の地形（描画と同じゆがみ）
V.ftype = (fx, fy) => GEO.fieldTypeAt(fx, fy);
/* タイルに木・家・岩・葦・道・橋を重ねる（座標は戦場の単位） */
V.decorateField = (g, L, tx, ty) => {
  const bt = V.bt; if (!bt || !bt.fine) return;
  const f = bt.fine, cell = f.cell, T = D.T;
  const span = 256 / L * cell, x0 = tx * span, y0 = ty * span, x1 = x0 + span, y1 = y0 + span;
  const pxu = L / cell, px = 1 / pxu;
  g.setTransform(pxu, 0, 0, pxu, -x0 * pxu, -y0 * pxu);
  g.lineCap = 'round'; g.lineJoin = 'round';
  const inT = (x, y, pad) => x > x0 - pad && x < x1 + pad && y > y0 - pad && y < y1 + pad;
  const season = V.SEASON(), snow = bt.weather === 'snow';
  // 0. 外で作った地面の絵を、模様（明暗）だけ重ねる。色・季節・雪は今の描画のまま
  if (L >= 4 && typeof ASSET !== 'undefined' && ASSET.on()) V.texField(g, x0, y0, x1, y1, px);
  // 1. 道（縁と轍）
  if (L >= 2 && bt.feat) for (const rd of bt.feat.roads) {
    const pts = rd.pts; let any = false; for (const p of pts) if (inT(p[0], p[1], rd.w * 3 + span * 0.1)) { any = true; break; }
    if (!any) continue;
    const path = () => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let k = 1; k < pts.length - 1; k++) { const mx = (pts[k][0] + pts[k + 1][0]) / 2, my = (pts[k][1] + pts[k + 1][1]) / 2; g.quadraticCurveTo(pts[k][0], pts[k][1], mx, my); } g.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]); };
    path(); g.strokeStyle = 'rgba(110,86,58,.55)'; g.lineWidth = rd.w * 1.05 + 1.5 * px; g.stroke();
    path(); g.strokeStyle = snow ? 'rgba(230,226,214,.9)' : 'rgba(190,164,122,.95)'; g.lineWidth = rd.w * 0.92; g.stroke();
    if (L >= 8 && rd.major) { g.setLineDash([cell * 0.5, cell * 0.35]); path(); g.strokeStyle = 'rgba(120,96,66,.45)'; g.lineWidth = Math.max(px, rd.w * 0.08); g.stroke(); g.setLineDash([]); }
  }
  // 2. 橋（道が水を渡る所）
  if (L >= 2 && bt.feat) for (const rd of bt.feat.roads) {
    const pts = rd.pts;
    for (let k = 1; k < pts.length; k++) {
      const [ax, ay] = pts[k - 1], [bx, by] = pts[k];
      if (!inT(ax, ay, span * 0.2) && !inT(bx, by, span * 0.2)) continue;
      const n = Math.max(2, Math.ceil(Math.hypot(bx - ax, by - ay) / (cell * 0.5)));
      let s0 = -1;
      for (let q = 0; q <= n; q++) {
        const x = ax + (bx - ax) * q / n, y = ay + (by - ay) * q / n;
        const t = f.type[B.fineIdx(bt, x, y)];
        const wet = t === T.BRIDGE;
        if (wet && s0 < 0) s0 = q;
        if ((!wet || q === n) && s0 >= 0) {
          const e = wet ? q : q - 1; if (e >= s0) {
            const sx = ax + (bx - ax) * (s0 - 0.6) / n, sy = ay + (by - ay) * (s0 - 0.6) / n, ex = ax + (bx - ax) * (e + 0.6) / n, ey = ay + (by - ay) * (e + 0.6) / n;
            const L2 = Math.hypot(ex - sx, ey - sy) || 1, nx = -(ey - sy) / L2, ny = (ex - sx) / L2, hw = rd.w * 0.62;
            g.fillStyle = '#8a6a44'; g.beginPath(); g.moveTo(sx + nx * hw, sy + ny * hw); g.lineTo(ex + nx * hw, ey + ny * hw); g.lineTo(ex - nx * hw, ey - ny * hw); g.lineTo(sx - nx * hw, sy - ny * hw); g.closePath(); g.fill();
            if (L >= 4) { g.strokeStyle = 'rgba(60,42,24,.7)'; g.lineWidth = Math.max(px, cell * 0.04); const np = Math.ceil(L2 / (cell * 0.22)); g.beginPath(); for (let p = 0; p <= np; p++) { const cx = sx + (ex - sx) * p / np, cy = sy + (ey - sy) * p / np; g.moveTo(cx + nx * hw, cy + ny * hw); g.lineTo(cx - nx * hw, cy - ny * hw); } g.stroke(); }
            g.strokeStyle = '#4e3a24'; g.lineWidth = Math.max(px * 1.2, cell * 0.08); g.beginPath(); g.moveTo(sx + nx * hw, sy + ny * hw); g.lineTo(ex + nx * hw, ey + ny * hw); g.moveTo(sx - nx * hw, sy - ny * hw); g.lineTo(ex - nx * hw, ey - ny * hw); g.stroke();
          }
          s0 = -1;
        }
      }
    }
  }
  if (L < 4) { g.setTransform(1, 0, 0, 1, 0, 0); return; }
  // 3. 木・家・岩・葦（決まった格子で置く）
  const fx0 = x0 / cell - 1, fx1 = x1 / cell + 1, fy0 = y0 / cell - 1, fy1 = y1 / cell + 1;
  const tc = L >= 16 ? 0.55 : L >= 8 ? 0.7 : 1.0;
  const crown = new Path2D(), shadow = new Path2D(), hiP = new Path2D(), con = new Path2D(), conS = new Path2D();
  const autumn = season === 2, winter = season === 3;
  for (let r = Math.floor(fy0 / tc); r <= Math.ceil(fy1 / tc); r++) for (let c = Math.floor(fx0 / tc); c <= Math.ceil(fx1 / tc); c++) {
    const h1 = GEO.hash(c, r, 101), h2 = GEO.hash(c, r, 102), h3 = GEO.hash(c, r, 103);
    const fx = (c + 0.1 + h1 * 0.8) * tc, fy = (r + 0.1 + h2 * 0.8) * tc;
    const t = V.ftype(fx, fy);
    const p = t === T.FOREST ? 0.9 : t === T.GROVE ? 0.38 : t === T.VILLAGE ? 0.06 : t === T.PLAIN ? 0.012 : t === T.HILL ? 0.02 : t === T.MARSH ? 0.03 : t === T.GRASS ? 0.004 : 0;
    if (h3 > p) continue;
    const x = fx * cell, y = fy * cell, rr = cell * tc * (t === T.FOREST ? 0.5 + h1 * 0.25 : 0.45 + h1 * 0.3);
    const e = f.elev[B.fineIdx(bt, x, y)];
    if (e > 0.62 || (t === T.FOREST && h2 < 0.25)) {
      con.moveTo(x, y - rr * 1.5); con.lineTo(x + rr * 0.8, y + rr * 0.7); con.lineTo(x - rr * 0.8, y + rr * 0.7); con.closePath();
      conS.moveTo(x + rr * 0.3, y + rr * 0.9); conS.ellipse(x + rr * 0.3, y + rr * 0.8, rr * 0.7, rr * 0.3, 0, 0, 6.2832);
    } else {
      shadow.moveTo(x + rr * 0.35 + rr, y + rr * 0.4); shadow.arc(x + rr * 0.35, y + rr * 0.4, rr, 0, 6.2832);
      crown.moveTo(x + rr, y); crown.arc(x, y, rr, 0, 6.2832);
      hiP.moveTo(x - rr * 0.25 + rr * 0.45, y - rr * 0.3); hiP.arc(x - rr * 0.25, y - rr * 0.3, rr * 0.45, 0, 6.2832);
    }
  }
  g.fillStyle = 'rgba(20,30,16,.32)'; g.fill(shadow); g.fill(conS);
  g.fillStyle = winter ? (snow ? '#c9d0cc' : '#6d6a52') : autumn ? '#8c7a3c' : '#4a6a3a'; g.fill(crown);
  g.fillStyle = winter ? 'rgba(240,240,236,.5)' : autumn ? 'rgba(214,170,80,.55)' : 'rgba(150,180,100,.5)'; g.fill(hiP);
  g.fillStyle = snow ? '#9fb0a8' : '#3c5434'; g.fill(con);
  // 家
  const hc = L >= 16 ? 0.9 : 1.15;
  const walls = new Path2D(), roofA = new Path2D(), roofB = new Path2D();
  for (let r = Math.floor(fy0 / hc); r <= Math.ceil(fy1 / hc); r++) for (let c = Math.floor(fx0 / hc); c <= Math.ceil(fx1 / hc); c++) {
    const h1 = GEO.hash(c, r, 111), h2 = GEO.hash(c, r, 112), h3 = GEO.hash(c, r, 113);
    const fx = (c + 0.2 + h1 * 0.6) * hc, fy = (r + 0.2 + h2 * 0.6) * hc;
    const t = V.ftype(fx, fy);
    const city = t === T.CITY;
    if (!(t === T.VILLAGE && h3 < 0.6) && !(city && h3 < 0.8)) continue;
    const x = fx * cell, y = fy * cell;
    const w = cell * hc * (0.55 + h3 * 0.35), hh = w * (0.55 + h1 * 0.2);
    const a = city ? 0 : (GEO.hash(Math.floor(c / 4), Math.floor(r / 4), 114) - 0.5) * 1.2 + (h2 - 0.5) * 0.3;
    const ca = Math.cos(a), sa = Math.sin(a);
    const pt = (lx, ly) => [x + lx * ca - ly * sa, y + lx * sa + ly * ca];
    const q = [pt(-w / 2, -hh / 2), pt(w / 2, -hh / 2), pt(w / 2, hh / 2), pt(-w / 2, hh / 2)];
    walls.moveTo(q[0][0], q[0][1]); for (let k = 1; k < 4; k++) walls.lineTo(q[k][0], q[k][1]); walls.closePath();
    const m0 = pt(-w / 2, 0), m1 = pt(w / 2, 0);
    roofA.moveTo(q[0][0], q[0][1]); roofA.lineTo(q[1][0], q[1][1]); roofA.lineTo(m1[0], m1[1]); roofA.lineTo(m0[0], m0[1]); roofA.closePath();
    roofB.moveTo(m0[0], m0[1]); roofB.lineTo(m1[0], m1[1]); roofB.lineTo(q[2][0], q[2][1]); roofB.lineTo(q[3][0], q[3][1]); roofB.closePath();
  }
  g.save(); g.translate(cell * 0.12, cell * 0.16); g.fillStyle = 'rgba(30,20,10,.3)'; g.fill(walls); g.restore();
  g.fillStyle = snow ? '#e6e6e2' : '#8f6d4c'; g.fill(roofA);
  g.fillStyle = snow ? '#c9cbc8' : '#6c4f36'; g.fill(roofB);
  g.strokeStyle = 'rgba(40,28,16,.75)'; g.lineWidth = Math.max(px * 0.8, cell * 0.03); g.stroke(walls);
  // 岩
  const rc = 0.8, rocks = new Path2D(), rhi = new Path2D();
  for (let r = Math.floor(fy0 / rc); r <= Math.ceil(fy1 / rc); r++) for (let c = Math.floor(fx0 / rc); c <= Math.ceil(fx1 / rc); c++) {
    const h1 = GEO.hash(c, r, 121), h2 = GEO.hash(c, r, 122), h3 = GEO.hash(c, r, 123);
    const fx = (c + h1) * rc, fy = (r + h2) * rc;
    const t = V.ftype(fx, fy);
    const p = t === T.ROCK ? 0.5 : t === T.MOUNT ? 0.32 : t === T.HILL ? 0.025 : t === T.SAND ? 0.02 : 0;
    if (h3 > p) continue;
    const x = fx * cell, y = fy * cell, rr = cell * rc * (0.18 + h1 * 0.22);
    rocks.moveTo(x + rr, y);
    for (let k = 1; k <= 6; k++) { const a = k / 6 * 6.2832, q = rr * (0.75 + GEO.hash(c * 7 + k, r, 124) * 0.4); rocks.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q * 0.8); }
    rocks.closePath();
    rhi.moveTo(x - rr * 0.2 + rr * 0.35, y - rr * 0.25); rhi.arc(x - rr * 0.2, y - rr * 0.25, rr * 0.35, 0, 6.2832);
  }
  g.fillStyle = '#7d766a'; g.fill(rocks); g.strokeStyle = 'rgba(40,36,30,.6)'; g.lineWidth = Math.max(px * 0.8, cell * 0.025); g.stroke(rocks);
  g.fillStyle = 'rgba(220,214,200,.35)'; g.fill(rhi);
  // 葦・草
  if (L >= 8) {
    const gc = 0.45, reed = new Path2D(), tuft = new Path2D();
    for (let r = Math.floor(fy0 / gc); r <= Math.ceil(fy1 / gc); r++) for (let c = Math.floor(fx0 / gc); c <= Math.ceil(fx1 / gc); c++) {
      const h1 = GEO.hash(c, r, 131), h2 = GEO.hash(c, r, 132), h3 = GEO.hash(c, r, 133);
      const fx = (c + h1) * gc, fy = (r + h2) * gc;
      const t = V.ftype(fx, fy);
      const x = fx * cell, y = fy * cell, hgt = cell * gc * 0.7;
      if (t === T.MARSH && h3 < 0.55) { for (let k = -1; k <= 1; k++) { reed.moveTo(x + k * hgt * 0.15, y); reed.lineTo(x + k * hgt * 0.35, y - hgt * (k ? 0.8 : 1)); } }
      else if ((t === T.PLAIN || t === T.GRASS || t === T.HILL) && h3 < (L >= 16 ? 0.16 : 0.07)) { for (let k = -1; k <= 1; k++) { tuft.moveTo(x, y); tuft.lineTo(x + k * hgt * 0.3, y - hgt * 0.5); } }
    }
    g.strokeStyle = 'rgba(70,86,50,.75)'; g.lineWidth = Math.max(px * 0.7, cell * 0.02); g.stroke(reed);
    g.strokeStyle = season === 2 || season === 3 ? 'rgba(120,104,60,.45)' : 'rgba(70,96,46,.4)'; g.stroke(tuft);
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
};
/* 毎回の地表：タイル＋焼け跡・城壁の様子 */
V.texField = (g, x0, y0, x1, y1, px) => {
  const bt = V.bt, f = bt.fine, cell = f.cell;
  const c0 = Math.max(0, Math.floor(x0 / cell) - 1), r0 = Math.max(0, Math.floor(y0 / cell) - 1), c1 = Math.min(f.cols, Math.ceil(x1 / cell) + 1), r1 = Math.min(f.rows, Math.ceil(y1 / cell) + 1);
  const paths = new Map();
  for (let r = r0; r < r1; r++) for (let c = c0; c < c1; c++) {
    const t = f.type[r * f.cols + c]; let p = paths.get(t);
    if (!p) { if (!V.detailTex(t)) { paths.set(t, null); continue; } p = new Path2D(); paths.set(t, p); }
    if (p) p.rect(c * cell - px * 0.5, r * cell - px * 0.5, cell + px, cell + px);
  }
  const rep = (bt.W / bt.cols) * 3;
  g.save(); g.globalCompositeOperation = 'soft-light'; g.globalAlpha = 0.95;
  for (const [t, p] of paths) {
    if (!p) continue;
    const pat = g.createPattern(V.detailTex(t), 'repeat');
    if (pat.setTransform) pat.setTransform(new DOMMatrix().scale(rep / 256));
    g.fillStyle = pat; g.fill(p);
  }
  g.restore();
};
// 地面の絵の模様（明るさの平均を真ん中に寄せた灰色）
V._detail = new Map();
V.detailTex = (t) => {
  if (V._detail.has(t)) return V._detail.get(t);
  const im = ASSET.img(ASSET.tileKey(t));   // tools/assets.py が作った灰色の模様（256×256）
  if (im) V._detail.set(t, im);
  return im;
};
V.drawGround = () => {
  const bt = V.bt, ctx = V.ctx, z = V.cam.z;
  const [ox, oy] = V.w2s(0, 0);
  ctx.imageSmoothingEnabled = true;
  // 下地（タイルが届くまで）
  ctx.drawImage(V.mterr, ox, oy, bt.W * z, bt.H * z);
  if (V.ft) V.ft.draw(ctx, { x: V.cam.x, y: V.cam.y, s: z }, V.vw, V.vh, V.dpr);
  ctx.setTransform(V.dpr, 0, 0, V.dpr, 0, 0);
  // 焼け跡
  const ts = bt.tile * z;
  const [wx0, wy0] = V.s2w(0, 0), [wx1, wy1] = V.s2w(V.vw, V.vh);
  const c0 = Math.max(0, Math.floor(wx0 / bt.tile)), c1 = Math.min(bt.cols - 1, Math.floor(wx1 / bt.tile));
  const r0 = Math.max(0, Math.floor(wy0 / bt.tile)), r1 = Math.min(bt.rows - 1, Math.floor(wy1 / bt.tile));
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    const i = r * bt.cols + c;
    if (!bt.burnt[i] && bt.terr[i] !== D.T.BURNT) continue;
    const [x, y] = V.w2s(c * bt.tile, r * bt.tile);
    ctx.fillStyle = 'rgba(38,32,26,.62)'; ctx.fillRect(x, y, ts + 0.5, ts + 0.5);
    if (ts > 10) { ctx.fillStyle = 'rgba(120,110,96,.35)'; for (let k = 0; k < 4; k++) ctx.fillRect(x + V.hash(i, k) * ts, y + V.hash(i, k + 9) * ts, Math.max(1, ts * 0.08), Math.max(1, ts * 0.08)); }
  }
  // 城壁・城門（壊れ具合）
  if (bt.walls) for (const w of bt.walls) {
    if (!w.tiles.length) continue;
    const a = B.tc(bt, w.tiles[0]), b = B.tc(bt, w.tiles[w.tiles.length - 1]);
    const ext = bt.tile * 0.5, dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, ux = dx / L || (w.nx ? 0 : 1), uy = dy / L || (w.nx ? 1 : 0);
    const [sx, sy] = V.w2s(a[0] - ux * ext, a[1] - uy * ext), [ex, ey] = V.w2s(b[0] + ux * ext, b[1] + uy * ext);
    if (Math.max(sx, ex) < -40 || Math.min(sx, ex) > V.vw + 40 || Math.max(sy, ey) < -40 || Math.min(sy, ey) > V.vh + 40) continue;
    const th = Math.max(3, bt.tile * z * 0.95);
    ctx.lineCap = 'butt';
    if (w.broken) {
      ctx.strokeStyle = 'rgba(90,74,58,.9)'; ctx.lineWidth = th * 0.7; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.fillStyle = 'rgba(60,50,40,.8)'; const n = Math.max(3, Math.round(Math.hypot(ex - sx, ey - sy) / 6));
      for (let k = 0; k < n; k++) { const t = (k + V.hash(w.id, k)) / n; ctx.fillRect(sx + (ex - sx) * t + (V.hash(w.id, k + 5) - 0.5) * th, sy + (ey - sy) * t + (V.hash(w.id, k + 7) - 0.5) * th, th * 0.25, th * 0.2); }
      continue;
    }
    if (w.kind === 'gate') {
      ctx.strokeStyle = '#3a2614'; ctx.lineWidth = th * 1.15; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.strokeStyle = w.openT > bt.time ? '#2a1a0c' : '#7a5530'; ctx.lineWidth = th * 0.75; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
      if (th > 8) { ctx.fillStyle = '#c9a14a'; const mx = (sx + ex) / 2, my = (sy + ey) / 2; ctx.fillRect(mx - 1.5, my - 1.5, 3, 3); }
      continue;
    }
    ctx.strokeStyle = 'rgba(20,16,12,.45)'; ctx.lineWidth = th * 1.25; ctx.beginPath(); ctx.moveTo(sx + 2, sy + 3); ctx.lineTo(ex + 2, ey + 3); ctx.stroke();
    ctx.strokeStyle = '#6a5f53'; ctx.lineWidth = th; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
    if (th > 6) {
      // 胸壁
      const n = Math.max(2, Math.round(Math.hypot(ex - sx, ey - sy) / Math.max(5, th * 0.9)));
      const nx = -(ey - sy) / (Math.hypot(ex - sx, ey - sy) || 1), ny = (ex - sx) / (Math.hypot(ex - sx, ey - sy) || 1);
      const side = (w.nx * nx + w.ny * ny) > 0 ? 1 : -1;
      ctx.fillStyle = '#857869';
      for (let k = 0; k < n; k += 2) { const t = (k + 0.5) / n, cx = sx + (ex - sx) * t + nx * side * th * 0.35, cy = sy + (ey - sy) * t + ny * side * th * 0.35; ctx.fillRect(cx - th * 0.22, cy - th * 0.22, th * 0.44, th * 0.44); }
    }
  }
  ctx.lineCap = 'round';
  // 地名
  if (V.places && z * bt.W > V.vw * 1.3) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const p of V.places) {
      const [x, y] = V.w2s(p.x, p.y); if (x < -60 || y < -20 || x > V.vw + 60 || y > V.vh + 20) continue;
      ctx.font = `${p.big ? 14 : 12}px ${V.fontHead()}`;
      ctx.lineWidth = 3; ctx.strokeStyle = p.water ? 'rgba(220,232,230,.7)' : 'rgba(236,226,196,.75)'; ctx.strokeText(p.s, x, y);
      ctx.fillStyle = p.water ? '#244a5a' : '#2e2216'; ctx.fillText(p.s, x, y);
    }
  }
};
/* ---------- 天気 ---------- */
V.weatherInit = () => {
  const w = V.bt.weather;
  V.wx = { k: w, parts: [] };
  const n = w === 'rain' ? 140 : w === 'snow' ? 110 : w === 'wind' ? 40 : 0;
  for (let i = 0; i < n; i++) V.wx.parts.push({ x: Math.random(), y: Math.random(), s: 0.6 + Math.random() * 0.8, p: Math.random() * 6.28 });
};
V.drawWeather = () => {
  const wx = V.wx; if (!wx) return;
  const ctx = V.ctx, W = V.vw, H = V.vh, t = V.ui.anim || 0, dt = V.realDt || 0.016;
  const sp = V.ui.paused ? 0 : 1;
  const wind = V.bt.wind || 0, wdx = Math.cos(wind), wdy = Math.sin(wind);
  if (wx.k === 'rain') {
    ctx.strokeStyle = 'rgba(200,214,226,.35)'; ctx.lineWidth = 1; ctx.beginPath();
    for (const p of wx.parts) { p.y += dt * 1.6 * p.s * sp; p.x += dt * 0.15 * wdx * sp; if (p.y > 1) { p.y -= 1; p.x = Math.random(); } if (p.x > 1) p.x -= 1; if (p.x < 0) p.x += 1; const x = p.x * W, y = p.y * H; ctx.moveTo(x, y); ctx.lineTo(x - 3 * p.s - wdx * 4, y - 13 * p.s); }
    ctx.stroke();
    ctx.fillStyle = 'rgba(40,52,62,.12)'; ctx.fillRect(0, 0, W, H);
  } else if (wx.k === 'snow') {
    ctx.fillStyle = 'rgba(250,250,252,.8)';
    for (const p of wx.parts) { p.y += dt * 0.08 * p.s * sp; p.x += (Math.sin(t * 1.3 + p.p) * 0.02 + wdx * 0.02) * dt * sp; if (p.y > 1) { p.y -= 1; p.x = Math.random(); } if (p.x > 1) p.x -= 1; if (p.x < 0) p.x += 1; ctx.beginPath(); ctx.arc(p.x * W, p.y * H, 1.2 + p.s, 0, 6.28); ctx.fill(); }
    ctx.fillStyle = 'rgba(220,226,236,.08)'; ctx.fillRect(0, 0, W, H);
  } else if (wx.k === 'fog') {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(214,218,214,.28)'); g.addColorStop(0.5, 'rgba(214,218,214,.16)'); g.addColorStop(1, 'rgba(214,218,214,.3)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (let k = 0; k < 4; k++) { const x = ((t * 8 * (k + 1) + k * 300) % (W + 400)) - 200, y = H * (0.15 + k * 0.22); const rg = ctx.createRadialGradient(x, y, 10, x, y, 200); rg.addColorStop(0, 'rgba(230,232,228,.22)'); rg.addColorStop(1, 'rgba(230,232,228,0)'); ctx.fillStyle = rg; ctx.fillRect(x - 200, y - 200, 400, 400); }
  } else if (wx.k === 'wind') {
    ctx.strokeStyle = 'rgba(214,196,150,.35)'; ctx.lineWidth = 1.2; ctx.beginPath();
    for (const p of wx.parts) { p.x += dt * 0.5 * wdx * p.s * sp; p.y += dt * 0.5 * wdy * p.s * sp + Math.sin(t * 2 + p.p) * 0.0006; if (p.x > 1.05) p.x -= 1.1; if (p.x < -0.05) p.x += 1.1; if (p.y > 1.05) p.y -= 1.1; if (p.y < -0.05) p.y += 1.1; const x = p.x * W, y = p.y * H; ctx.moveTo(x, y); ctx.lineTo(x - wdx * 16 * p.s, y - wdy * 16 * p.s); }
    ctx.stroke();
  } else if (wx.k === 'cloud') {
    ctx.fillStyle = 'rgba(40,46,52,.07)'; ctx.fillRect(0, 0, W, H);
  }
};
