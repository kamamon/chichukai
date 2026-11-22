/* =========================================================
   地中海覇道 — battle view（描画・操作・HUD）
   ========================================================= */
const V = {};
V.TP = 24; // 地形画像の1タイルのピクセル数

V.css = (k) => getComputedStyle(document.documentElement).getPropertyValue(k).trim();
V.hexA = (hex, a) => { const h = hex.replace('#', ''); const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };
V._shadeC = new Map();
V.shade = (hex, f) => {
  const key = hex + '|' + f; let v = V._shadeC.get(key); if (v) return v;
  const h = hex.replace('#', ''); const n = parseInt(h, 16); let r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255; if (f >= 0) { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; } else { r *= 1 + f; g *= 1 + f; b *= 1 + f; }
  v = `rgb(${r | 0},${g | 0},${b | 0})`; if (V._shadeC.size > 4000) V._shadeC.clear(); V._shadeC.set(key, v); return v;
};
V.morColor = (m) => { m = U.clamp(m, 0, 100); if (m > 60) { const t = (m - 60) / 40; return `rgb(${Math.round(220 - 120 * t)},${Math.round(190 + 20 * t)},${Math.round(70 + 20 * t)})`; } if (m > 30) { const t = (m - 30) / 30; return `rgb(${Math.round(220)},${Math.round(90 + 100 * t)},${Math.round(50 + 20 * t)})`; } const t = m / 30; return `rgb(${Math.round(150 + 70 * t)},${Math.round(40 + 50 * t)},${Math.round(40 + 10 * t)})`; };

/* ---------------- 起動 ---------------- */
V.run = (spec) => new Promise((resolve) => {
  const bt = B.create(spec);
  V.bt = bt; V.resolve = resolve;
  V.ui = { sel: new Set(), mode: null, skill: null, speed: bt.W > 1200 ? 2 : 1, morView: false, follow: false, deploy: true, last: performance.now(), acc: 0, hudT: 0, lastTap: 0, lastTapId: -1, ended: false, logShown: -1, multi: false, view3d: typeof V3 !== 'undefined' && V3.pref() };
  V.mount();
  V.buildTerrain();
  if (typeof V3 !== 'undefined') { try { V3.init(bt); } catch (e) { console.warn(e); V.ui.view3d = false; } }
  V.fitCamera(true);
  const me = bt.units.find(u => u.me);
  if (me && (bt.spec.role === 'unit' || bt.W > 900)) V.centerOn(me, bt.spec.role === 'unit' ? 0.55 : 0.85);
  const canDeploy = bt.sides[0].player && bt.spec.role !== 'watch';
  V.ui.deploy = canDeploy;
  V.dep0 = bt.units.filter(u => u.side === 0).map(u => ({ id: u.id, x: u.x, y: u.y, a: u.a }));
  V.ui.paused = true;
  V.showDeploy(canDeploy);
  if (me && canDeploy) V.select([me.id]);
  V.loop();
});

V.mount = () => {
  const root = U.$('#scr-battle');
  root.innerHTML = `
    <canvas id="bt-cv"></canvas>
    <div class="bt-top">
      <div class="bt-row">
        <button class="bt-ic" id="bt-menu" aria-label="メニュー">≡</button>
        <div class="bt-title"><b id="bt-name"></b><span id="bt-clock"></span></div>
        <div class="bt-speed" role="group" aria-label="速度">
          <button data-sp="0" aria-label="一時停止">❚❚</button><button data-sp="1">1×</button><button data-sp="2">2×</button><button data-sp="4">4×</button>
        </div>
      </div>
      <div class="bt-bars">
        <div class="bt-side s0"><span class="bt-cmd" id="bt-c0"></span><span id="bt-n0"></span><i><b id="bt-m0"></b></i></div>
        <div class="bt-vs">対</div>
        <div class="bt-side s1"><i><b id="bt-m1"></b></i><span id="bt-n1"></span><span class="bt-cmd" id="bt-c1"></span></div>
      </div>
      <div class="bt-cp" id="bt-cpwrap"><span>采配</span><i><b id="bt-cp"></b></i><em id="bt-cpn"></em></div>
      <div class="bt-order" id="bt-order" hidden></div>
      <div class="bt-log" id="bt-log" aria-live="polite"></div>
    </div>
    <canvas id="bt-mini" width="96" height="128" aria-label="全体図"></canvas>
    <div class="bt-3dtools" id="bt-3dtools"><button id="bt-view" aria-label="表示の切り替え">3D</button><button id="bt-rotl" aria-label="左へ回す">↺</button><button id="bt-rotr" aria-label="右へ回す">↻</button><button id="bt-fit" aria-label="全体を見る">⌂</button><button id="bt-eye" aria-label="将の目線">目</button></div>
    <div class="bt-hint" id="bt-hint" hidden></div>
    <div class="bt-panel" id="bt-panel">
      <div class="bt-groups" id="bt-groups"></div>
      <div class="bt-sel" id="bt-sel"></div>
      <div class="bt-cmds" id="bt-cmds"></div>
    </div>
    <div class="bt-deploy" id="bt-deploy" hidden></div>
    <div class="bt-place" id="bt-place" hidden>
      <div class="pl-top">
        <div class="pl-ttl"><b>布陣</b><span id="pl-hint"></span></div>
        <button class="btn sm" id="pl-fit" title="布陣できる範囲全体を見る">全体</button>
        <button class="btn sm" id="pl-reset" title="開戦前の自動配置に戻す">戻す</button>
        <button class="btn sm" id="pl-back" title="軍議の札へ戻る">軍議</button>
      </div>
      <div class="pl-bot">
        <div class="pl-units" id="pl-units"></div>
        <div class="pl-row"><div class="pl-acts" id="pl-acts"></div><button class="btn seal" id="pl-go">開戦</button></div>
      </div>
    </div>
    <div class="bt-over" id="bt-over" hidden></div>`;
  UI.show('battle');
  V.cv = U.$('#bt-cv'); V.ctx = V.cv.getContext('2d');
  V.mini = U.$('#bt-mini'); V.mctx = V.mini.getContext('2d');
  V.colors = { ink: V.css('--ink') || '#231c13', bone: V.css('--fg') || '#ebe3cd', jade: V.css('--jade') || '#62b39b', seal: V.css('--seal') || '#c2452f', bronze: V.css('--bronze') || '#c9a14a' };
  V.resize();
  if (!V._bound) {
    V._bound = true;
    window.addEventListener('resize', () => { if (V.bt) V.resize(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden && V.bt && !V.bt.ended) { V.setSpeed(0); } });
  }
  V.bindInput();
  U.$('#bt-name').textContent = V.bt.spec.title || '合戦';
  for (let s = 0; s < 2; s++) { const sd = V.bt.sides[s], el = U.$('#bt-c' + s); if (sd.cmd && !sd.bandit && !sd.nomad && el) { el.append(PORT.canvas(Object.assign({ c: sd.c }, sd.cmd), 26, { dark: true })); el.title = sd.cmd.n; } }
  for (const b of U.$$('.bt-speed button')) b.onclick = () => V.setSpeed(+b.dataset.sp);
  U.$('#bt-menu').onclick = V.menu;
  const viewBtn = U.$('#bt-view');
  const updView = () => { viewBtn.textContent = V.ui.view3d ? '2D' : '3D'; viewBtn.title = V.ui.view3d ? '平面の地図にする' : '立体で見る'; for (const id of ['bt-rotl', 'bt-rotr', 'bt-eye']) U.$('#' + id).hidden = !V.ui.view3d; U.$('#bt-eye').classList.toggle('on', !!V3.follow); };
  V.setView3d = (on) => { V.ui.view3d = !!on; V3.savePref(V.ui.view3d); if (V.ui.view3d && !V3.cam) V3.fit(); else if (!V.ui.view3d) { V.cam.z = V.zBase || V.cam.z; V.clampCam(); V3.follow = false; } updView(); };
  V.updViewBtn = updView;
  viewBtn.onclick = () => V.setView3d(!V.ui.view3d);
  U.$('#pl-fit').onclick = () => V.fitPlace();
  U.$('#pl-reset').onclick = () => V.resetDeploy();
  U.$('#pl-back').onclick = () => { V.leavePlace(); V.showDeploy(true); };
  U.$('#pl-go').onclick = () => V.beginBattle();
  U.$('#bt-rotl').onclick = () => V3.orbit(-Math.PI / 4, 0);
  U.$('#bt-rotr').onclick = () => V3.orbit(Math.PI / 4, 0);
  U.$('#bt-fit').onclick = () => { V3.follow = false; V.fitCamera(); };
  U.$('#bt-eye').onclick = () => { if (!V.ui.view3d) V.setView3d(true); V3.follow = !V3.follow; U.$('#bt-eye').classList.toggle('on', V3.follow); if (V3.follow) UI.toast('将の目線：自分の隊の後ろから見る（画面を動かすと戻る）'); };
  updView();
  V.mini.onclick = (e) => { const r = V.mini.getBoundingClientRect(); const bt = V.bt; const x = (e.clientX - r.left) / r.width * bt.W, y = (e.clientY - r.top) / r.height * bt.H; if (V.ui.view3d && V3.cam) { V3.cam.x = x; V3.cam.y = y; V3.clamp(); V3.setup(); } else { V.cam.x = x; V.cam.y = y; } V.ui.follow = false; };
  V.setSpeed(V.ui.speed, true);
  V.renderGroups();
  V.renderPanel();
};
V.resize = () => {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const r = V.cv.getBoundingClientRect();
  V.dpr = dpr; V.vw = r.width || window.innerWidth; V.vh = r.height || window.innerHeight;
  V.cv.width = Math.round(V.vw * dpr); V.cv.height = Math.round(V.vh * dpr);
  if (V.cam) V.clampCam();
};
V.setSpeed = (sp, silent) => {
  if (!V.ui) return;
  if (V.ui.deploy && sp > 0 && !silent) return;
  V.ui.paused = sp === 0;
  if (sp > 0) V.ui.speed = sp;
  for (const b of U.$$('.bt-speed button')) b.classList.toggle('on', (+b.dataset.sp === 0 && V.ui.paused) || (+b.dataset.sp === V.ui.speed && !V.ui.paused));
};

/* ---------------- カメラ ---------------- */
V.fitCamera = (init) => {
  const bt = V.bt;
  const availH = V.vh * 0.72, availW = V.vw;
  const z = Math.min(availW / bt.W, availH / bt.H) * 0.98;
  V.cam = { x: bt.W / 2, y: bt.H / 2 + (bt.H * 0.06), z };
  V.zBase = z;
  V.zMin = z * 0.8;
  V.zMax = Math.max(z * 40, 30);
  if (V.ui && V.ui.view3d && typeof V3 !== 'undefined') V3.fit();
};
V.centerOn = (u, zf) => {
  const bt = V.bt;
  if (V.ui && V.ui.view3d) { V3.centerOn(u, zf); return; }
  V.cam.x = u.x; V.cam.y = u.y - (V.vh * 0.08) / V.cam.z;
  if (zf) { const target = Math.min(V.zMax, Math.max(V.cam.z, Math.min(V.vw, V.vh) * zf / Math.max(30, u.diag * 6))); V.cam.z = target; V.cam.y = u.y; }
  V.clampCam();
};
V.clampCam = () => { const bt = V.bt; if (V.ui && V.ui.view3d && V3.cam) { V3.clamp(); V3.setup(); return; } V.cam.z = U.clamp(V.cam.z, V.zMin, V.zMax); V.cam.x = U.clamp(V.cam.x, 0, bt.W); V.cam.y = U.clamp(V.cam.y, -bt.H * 0.05, bt.H * 1.05); };
V.w2s = (x, y) => (V.ui && V.ui.view3d) ? V3.w2s(x, y) : [(x - V.cam.x) * V.cam.z + V.vw / 2, (y - V.cam.y) * V.cam.z + V.vh / 2];
V.s2w = (sx, sy) => (V.ui && V.ui.view3d) ? V3.pick(sx, sy) : [(sx - V.vw / 2) / V.cam.z + V.cam.x, (sy - V.vh / 2) / V.cam.z + V.cam.y];

/* ---------------- 地形画像 ---------------- */
V.buildTerrain = () => {
  const bt = V.bt, TP = V.TP;
  const c = document.createElement('canvas');
  c.width = bt.cols * TP; c.height = bt.rows * TP;
  V.tcv = c; V.tctx = c.getContext('2d');
  V.trng = U.rng((bt.spec.seed || 1) + 5);
  for (let i = 0; i < bt.cols * bt.rows; i++) V.drawTile(i, true);
  V.drawTileDetails();
  bt._terrSnap = bt.terr.slice();
  // ミニマップ用
  const m = document.createElement('canvas'); m.width = bt.cols; m.height = bt.rows;
  const mc = m.getContext('2d');
  for (let i = 0; i < bt.cols * bt.rows; i++) { mc.fillStyle = D.TILE[bt.terr[i]].c; mc.fillRect(i % bt.cols, Math.floor(i / bt.cols), 1, 1); }
  V.mterr = m;
  // 霧
  V.fog = document.createElement('canvas'); V.fog.width = bt.cols; V.fog.height = bt.rows;
  V.fogT = -9;
};
V.drawTile = (i, initial) => {
  const bt = V.bt, TP = V.TP, g = V.tctx;
  const t = bt.terr[i], c = i % bt.cols, r = Math.floor(i / bt.cols);
  const x = c * TP, y = r * TP;
  const e = bt.elev[i];
  const base = D.TILE[t].c;
  // 高さで明暗
  const sh = (t === D.T.HILL || t === D.T.PLAIN || t === D.T.DIRT || t === D.T.FOREST) ? (e - 0.5) * 0.35 : 0;
  g.fillStyle = V.shade(base, sh);
  g.fillRect(x, y, TP, TP);
  const rnd = V.trng;
  if (t === D.T.PLAIN || t === D.T.DIRT || t === D.T.HILL) {
    for (let k = 0; k < 7; k++) { g.fillStyle = `rgba(${t === D.T.DIRT ? '80,60,40' : '60,70,30'},${0.08 + rnd() * 0.1})`; g.fillRect(x + rnd() * TP, y + rnd() * TP, 1 + rnd() * 2, 1 + rnd() * 2); }
  }
  if (t === D.T.ROAD) { g.fillStyle = 'rgba(120,95,60,0.18)'; g.fillRect(x, y + TP * 0.3, TP, 1); g.fillRect(x, y + TP * 0.7, TP, 1); }
  if (t === D.T.RIVER || t === D.T.FORD) { g.strokeStyle = t === D.T.RIVER ? 'rgba(220,235,240,0.25)' : 'rgba(255,255,255,0.3)'; g.lineWidth = 1; for (let k = 0; k < 2; k++) { const yy = y + 5 + rnd() * (TP - 10); g.beginPath(); g.moveTo(x + 2, yy); g.quadraticCurveTo(x + TP / 2, yy - 3, x + TP - 2, yy); g.stroke(); } }
  if (t === D.T.MARSH) { for (let k = 0; k < 4; k++) { g.fillStyle = 'rgba(70,110,120,0.45)'; g.beginPath(); g.ellipse(x + rnd() * TP, y + rnd() * TP, 3 + rnd() * 3, 1.5, 0, 0, 6.28); g.fill(); } g.strokeStyle = 'rgba(40,60,30,0.5)'; for (let k = 0; k < 3; k++) { const xx = x + rnd() * TP, yy = y + rnd() * TP; g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx, yy - 5); g.stroke(); } }
  if (t === D.T.MOUNT || t === D.T.PATH) { g.strokeStyle = 'rgba(30,28,24,0.35)'; g.lineWidth = 1; for (let k = 0; k < 3; k++) { const xx = x + rnd() * TP, yy = y + TP * 0.3 + rnd() * TP * 0.6; g.beginPath(); g.moveTo(xx - 5, yy + 3); g.lineTo(xx, yy - 4); g.lineTo(xx + 5, yy + 3); g.stroke(); } if (t === D.T.PATH) { g.fillStyle = 'rgba(190,170,130,0.55)'; g.fillRect(x + TP * 0.35, y, TP * 0.3, TP); } }
  if (t === D.T.WALL || t === D.T.GATE) {
    g.fillStyle = t === D.T.WALL ? '#4f463f' : '#5b3d25'; g.fillRect(x, y, TP, TP);
    g.fillStyle = 'rgba(0,0,0,0.3)'; for (let k = 0; k < 3; k++) g.fillRect(x + k * TP / 3 + 1, y + 1, TP / 3 - 3, TP * 0.25);
    g.strokeStyle = 'rgba(255,240,210,0.18)'; g.strokeRect(x + 0.5, y + 0.5, TP - 1, TP - 1);
    if (t === D.T.GATE) { g.fillStyle = '#2f1f12'; g.fillRect(x + TP * 0.2, y + TP * 0.3, TP * 0.6, TP * 0.6); }
  }
  if (t === D.T.BROKEN) { g.fillStyle = '#3d2c1e'; g.fillRect(x, y, TP, TP); g.strokeStyle = 'rgba(0,0,0,0.5)'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + TP, y + TP); g.moveTo(x + TP, y); g.lineTo(x, y + TP); g.stroke(); }
  if (t === D.T.CITY) { for (let k = 0; k < 2; k++) { g.fillStyle = `rgba(80,65,50,${0.25 + rnd() * 0.2})`; g.fillRect(x + 2 + rnd() * (TP - 10), y + 2 + rnd() * (TP - 10), 5 + rnd() * 5, 4 + rnd() * 4); } }
  if (t === D.T.BURNT) { for (let k = 0; k < 5; k++) { g.fillStyle = 'rgba(20,18,15,0.5)'; g.fillRect(x + rnd() * TP, y + rnd() * TP, 2, 2); } }
  if (!initial && t === D.T.FOREST) V.drawTrees(i);
};
// 兵の駒（真上から見た絵）と軍船の絵
V.tokImg = (t) => (typeof ASSET !== 'undefined' ? ASSET.small('unit/tok_' + t, 96) : null);
V.shipImg = (t) => (typeof ASSET !== 'undefined' ? ASSET.small('unit/ship_' + t + '_top', 256) : null);
V.drawTrees = (i) => {
  const bt = V.bt, TP = V.TP, g = V.tctx, rnd = V.trng;
  const c = i % bt.cols, r = Math.floor(i / bt.cols);
  for (let k = 0; k < 5; k++) {
    const x = c * TP + rnd() * TP, y = r * TP + rnd() * TP, rr = 3 + rnd() * 4;
    g.fillStyle = 'rgba(20,35,20,0.35)'; g.beginPath(); g.arc(x + 1.5, y + 2, rr, 0, 6.28); g.fill();
    g.fillStyle = V.shade('#47663f', (rnd() - 0.5) * 0.3); g.beginPath(); g.arc(x, y, rr, 0, 6.28); g.fill();
  }
};
V.drawTileDetails = () => {
  const bt = V.bt, TP = V.TP, g = V.tctx;
  for (let i = 0; i < bt.cols * bt.rows; i++) if (bt.terr[i] === D.T.FOREST) V.drawTrees(i);
  // 等高線
  g.strokeStyle = 'rgba(80,60,30,0.18)'; g.lineWidth = 1;
  for (let i = 0; i < bt.cols * bt.rows; i++) {
    const c = i % bt.cols, r = Math.floor(i / bt.cols);
    const e = bt.elev[i], er = c + 1 < bt.cols ? bt.elev[i + 1] : e, ed = r + 1 < bt.rows ? bt.elev[i + bt.cols] : e;
    for (const th of [0.6, 0.68, 0.76]) {
      if ((e - th) * (er - th) < 0) { g.beginPath(); g.moveTo((c + 1) * TP, r * TP); g.lineTo((c + 1) * TP, (r + 1) * TP); g.stroke(); }
      if ((e - th) * (ed - th) < 0) { g.beginPath(); g.moveTo(c * TP, (r + 1) * TP); g.lineTo((c + 1) * TP, (r + 1) * TP); g.stroke(); }
    }
  }
};
V.syncTerrain = () => {
  const bt = V.bt; const snap = bt._terrSnap;
  let changed = false;
  for (let i = 0; i < bt.terr.length; i++) if (bt.terr[i] !== snap[i]) { snap[i] = bt.terr[i]; V.drawTile(i); changed = true; const mc = V.mterr.getContext('2d'); mc.fillStyle = D.TILE[bt.terr[i]].c; mc.fillRect(i % bt.cols, Math.floor(i / bt.cols), 1, 1); }
  return changed;
};

/* ---------------- ループ ---------------- */
V.loop = () => {
  const bt = V.bt; if (!bt) return;
  const now = performance.now();
  let dt = Math.min(0.1, (now - V.ui.last) / 1000);
  V.ui.last = now;
  V.realDt = dt;
  if (!V.ui.paused && !bt.paused && !bt.ended && !V.ui.cutin) {
    V.ui.acc += dt * V.ui.speed;
    const step = V.ui.speed >= 4 && bt.units.length > 30 ? 0.15 : 0.1;
    let n = 0;
    while (V.ui.acc >= step && n < 10) { B.step(bt, step); V.ui.acc -= step; n++; if (bt.paused || bt.ended) break; }
    if (n >= 10) V.ui.acc = 0;
  }
  V.ui.anim = (V.ui.anim || 0) + dt;
  if (V.ui.follow) { const me = bt.units.find(u => u.me && B.alive(u)); if (me) { if (V.ui.view3d && V3.cam) { V3.cam.x += (me.x - V3.cam.x) * 0.08; V3.cam.y += (me.y - V3.cam.y) * 0.08; } else { V.cam.x += (me.x - V.cam.x) * 0.08; V.cam.y += (me.y - V.cam.y) * 0.08; } } }
  { const r0 = performance.now(); V.render(); V.perf.add(performance.now() - r0, dt); if (V.ui.perf) V.perf.draw(); }
  V.ui.hudT -= dt;
  if (V.ui.hudT <= 0) { V.ui.hudT = 0.25; V.hud(); }
  if (bt.events && bt.events.length && !V.ui.cutin && !V.ui.modal && !bt.ended) V.consumeEvents();
  if (bt.paused && !V.ui.modal && !V.ui.cutin) V.handlePause();
  if (bt.ended && !V.ui.ended && !V.ui.cutin) { V.ui.ended = true; setTimeout(() => V.showResult(), 900); }
  if (!V.ui.closed) requestAnimationFrame(V.loop);
};

/* ---------------- 描画 ---------------- */
// 計測の窓（軍令の「計測の窓」で出す）
V.perf = {
  ms: 0, fps: 0, n: 0, worst: 0,
  add(ms, dt) { this.ms += (ms - this.ms) * 0.1; this.fps += ((dt > 0 ? 1 / dt : 0) - this.fps) * 0.1; this.worst = Math.max(this.worst * 0.98, ms); },
  draw() {
    const bt = V.bt, ctx = V.ctx; if (!bt) return;
    ctx.setTransform(V.dpr, 0, 0, V.dpr, 0, 0);
    const lines = [`描画 ${this.ms.toFixed(1)}ms（最大 ${this.worst.toFixed(0)}）  ${Math.round(this.fps)}fps`, `部隊 ${bt.units.filter(B.alive).length}/${bt.units.length}  効果 ${bt.fx.length}  矢 ${bt.proj.length}  記録 ${(bt.rec || []).length}`];
    if (V.ui.view3d && typeof V3 !== 'undefined') lines.push(`3D 面 ${V3.stats.quads}  伍 ${V3.stats.cells}  兵 ${V3.stats.sprites}  品質 ${V3.quality}`);
    lines.push(`時 ${bt.time.toFixed(0)}s  速さ ×${V.ui.speed}  ${V.vw}×${V.vh} @${V.dpr}`);
    ctx.font = '11px ui-monospace, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 12, h = lines.length * 14 + 8, x = 8, y = V.vh - 232 - h;
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#d9f0c8'; lines.forEach((l, i) => ctx.fillText(l, x + 6, y + 4 + i * 14));
  },
};
V.render = () => {
  const bt = V.bt, ctx = V.ctx, z = V.cam.z;
  V.syncTerrain();
  if (V.ui.view3d && typeof V3 !== 'undefined') { try { V3.render(); return; } catch (e) { console.warn(e); V.ui.view3d = false; } }
  ctx.setTransform(V.dpr, 0, 0, V.dpr, 0, 0);
  ctx.fillStyle = '#1c2622';
  ctx.fillRect(0, 0, V.vw, V.vh);
  V.drawGround();
  // 火・水
  V.drawHazards();
  // 霧
  V.drawFog();
  // 城の本丸
  if (bt.city) V.drawCity();
  // 戦術地点
  for (const pt of bt.points) V.drawPoint(pt);
  V.drawDeployZone();
  for (const tp of bt.traps) if (!tp.used && (tp.side === 0 || bt.spec.role === 'watch')) { const [x, y] = V.w2s(tp.x, tp.y); const r = Math.max(6, tp.r * V.cam.z); V.ctx.strokeStyle = 'rgba(90,60,30,0.75)'; V.ctx.setLineDash([3, 3]); V.ctx.lineWidth = 1.5; V.ctx.beginPath(); V.ctx.arc(x, y, r, 0, 6.28); V.ctx.stroke(); V.ctx.setLineDash([]); V.ctx.fillStyle = 'rgba(60,40,20,0.25)'; V.ctx.fill(); }
  // 射撃区域
  for (const u of bt.units) if (u.zone && u.side === 0 && B.alive(u) && (V.ui.sel.has(u.id) || u.ctrl === 'player' || u.mine)) V.drawZone(u);
  if (V.previewZone && V.previewZone.r) V.drawZone({ zone: V.previewZone });
  // 部隊
  const order = bt.units.filter(u => B.alive(u)).sort((a, b) => (a.side === 0) - (b.side === 0) || b.n - a.n);
  for (const u of order) V.drawUnit(u);
  // 命令線
  for (const id of V.ui.sel) { const u = bt.units[id]; if (u && B.alive(u)) V.drawOrder(u); }
  // 矢
  V.drawProj();
  V.drawFx();
  V.drawTexts();
  // 旗は最後に（重なりの上）
  for (const u of order) V.drawBanner(u);
  V.drawWeather();
  V.drawMini();
};
// 拡大時の地形の描き込み（見えているタイルだけ）
V.hash = (i, k) => { let h = (i * 374761393 + k * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
V.drawTerrainDetail = () => {
  const bt = V.bt, ctx = V.ctx, z = V.cam.z, ts = bt.tile * z;
  const [wx0, wy0] = V.s2w(0, 0), [wx1, wy1] = V.s2w(V.vw, V.vh);
  const c0 = Math.max(0, Math.floor(wx0 / bt.tile)), c1 = Math.min(bt.cols - 1, Math.floor(wx1 / bt.tile));
  const r0 = Math.max(0, Math.floor(wy0 / bt.tile)), r1 = Math.min(bt.rows - 1, Math.floor(wy1 / bt.tile));
  if ((c1 - c0 + 1) * (r1 - r0 + 1) > 400) return;
  const T = D.T;
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    const i = r * bt.cols + c, t = bt.terr[i];
    const [x, y] = V.w2s(c * bt.tile, r * bt.tile);
    const k = Math.min(24, Math.floor(ts / 14));
    if (t === T.PLAIN || t === T.HILL || t === T.DIRT) {
      ctx.strokeStyle = t === T.DIRT ? 'rgba(90,70,45,.35)' : 'rgba(70,85,40,.45)'; ctx.lineWidth = 1;
      for (let j = 0; j < k; j++) { const px = x + V.hash(i, j) * ts, py = y + V.hash(i, j + 99) * ts; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - 2, py - 5); ctx.moveTo(px, py); ctx.lineTo(px + 2, py - 4); ctx.stroke(); }
    } else if (t === T.FOREST) {
      for (let j = 0; j < Math.min(14, k); j++) { const px = x + V.hash(i, j) * ts, py = y + V.hash(i, j + 50) * ts, rr = ts * (0.07 + V.hash(i, j + 7) * 0.07); ctx.fillStyle = 'rgba(15,30,15,.35)'; ctx.beginPath(); ctx.arc(px + rr * 0.3, py + rr * 0.4, rr, 0, 6.28); ctx.fill(); ctx.fillStyle = V.shade('#4a6a40', (V.hash(i, j + 3) - 0.5) * 0.35); ctx.beginPath(); ctx.arc(px, py, rr, 0, 6.28); ctx.fill(); }
    } else if (t === T.RIVER || t === T.FORD) {
      ctx.strokeStyle = 'rgba(230,240,240,.25)'; ctx.lineWidth = 1.5;
      const ph = V.ui.anim * 0.8;
      for (let j = 0; j < 3; j++) { const py = y + ts * (0.2 + 0.3 * j) + Math.sin(ph + j + c) * 3; ctx.beginPath(); ctx.moveTo(x + 4, py); ctx.quadraticCurveTo(x + ts / 2, py - 5, x + ts - 4, py); ctx.stroke(); }
    } else if (t === T.MOUNT || t === T.PATH) {
      ctx.strokeStyle = 'rgba(35,30,25,.4)'; ctx.lineWidth = 1.5;
      for (let j = 0; j < Math.min(6, k); j++) { const px = x + V.hash(i, j) * ts, py = y + V.hash(i, j + 9) * ts, w = ts * 0.12; ctx.beginPath(); ctx.moveTo(px - w, py + w * 0.6); ctx.lineTo(px, py - w); ctx.lineTo(px + w, py + w * 0.6); ctx.stroke(); }
    }
  }
};
V.drawHazards = () => {
  const bt = V.bt, ctx = V.ctx, z = V.cam.z, t = V.ui.anim;
  const ts = bt.tile * z;
  for (let i = 0; i < bt.fire.length; i++) {
    if (bt.fire[i] > 0) {
      const c = i % bt.cols, r = Math.floor(i / bt.cols);
      const [x, y] = V.w2s(c * bt.tile, r * bt.tile);
      if (x > V.vw || y > V.vh || x + ts < 0 || y + ts < 0) continue;
      const f = 0.55 + 0.35 * Math.sin(t * 9 + i);
      ctx.fillStyle = `rgba(230,${90 + Math.round(60 * f)},30,${0.45 + 0.25 * f})`;
      ctx.fillRect(x, y, ts, ts);
      ctx.fillStyle = `rgba(255,220,120,${0.25 * f})`;
      ctx.beginPath(); ctx.arc(x + ts * (0.3 + 0.4 * ((i * 7) % 10) / 10), y + ts * 0.5, ts * 0.25 * f, 0, 6.28); ctx.fill();
    }
    if (bt.flood[i] > 0) {
      const c = i % bt.cols, r = Math.floor(i / bt.cols);
      const [x, y] = V.w2s(c * bt.tile, r * bt.tile);
      if (x > V.vw || y > V.vh || x + ts < 0 || y + ts < 0) continue;
      ctx.fillStyle = `rgba(70,120,150,${0.35 + 0.1 * Math.sin(t * 3 + i)})`;
      ctx.fillRect(x, y, ts, ts);
    }
  }
};
V.drawFog = () => {
  const bt = V.bt;
  if (bt.spec.role === 'watch') return;
  if (bt.time - V.fogT > 0.5 || V.fogT < 0) {
    V.fogT = bt.time;
    const g = V.fog.getContext('2d');
    const img = g.createImageData(bt.cols, bt.rows);
    const vis = new Uint8Array(bt.cols * bt.rows);
    for (const u of bt.units) {
      if (u.side !== 0 || !B.alive(u)) continue;
      const R = B.sight(bt, u) / bt.tile;
      const c0 = u.x / bt.tile, r0 = u.y / bt.tile;
      for (let r = Math.max(0, Math.floor(r0 - R)); r <= Math.min(bt.rows - 1, Math.ceil(r0 + R)); r++) for (let c = Math.max(0, Math.floor(c0 - R)); c <= Math.min(bt.cols - 1, Math.ceil(c0 + R)); c++) if ((c + 0.5 - c0) ** 2 + (r + 0.5 - r0) ** 2 <= R * R) vis[r * bt.cols + c] = 1;
    }
    for (const pt of bt.points) if (pt.type === 'tower' && pt.owner === 0) { const R = 320 * bt.p / bt.tile, c0 = pt.x / bt.tile, r0 = pt.y / bt.tile; for (let r = 0; r < bt.rows; r++) for (let c = 0; c < bt.cols; c++) if ((c + 0.5 - c0) ** 2 + (r + 0.5 - r0) ** 2 <= R * R) vis[r * bt.cols + c] = 1; }
    for (let i = 0; i < vis.length; i++) { img.data[i * 4] = 14; img.data[i * 4 + 1] = 22; img.data[i * 4 + 2] = 20; img.data[i * 4 + 3] = vis[i] ? 0 : 105; }
    g.putImageData(img, 0, 0);
  }
  const ctx = V.ctx, [ox, oy] = V.w2s(0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(V.fog, ox, oy, bt.W * V.cam.z, bt.H * V.cam.z);
};
V.drawCity = () => {
  const bt = V.bt, ctx = V.ctx, ct = bt.city;
  const [x, y] = V.w2s(ct.x, ct.y);
  const r = Math.max(10, ct.r * V.cam.z);
  ctx.strokeStyle = V.hexA(bt.sides[ct.side].color === '#26262d' ? '#c9a14a' : bt.sides[ct.side].color, 0.9); ctx.lineWidth = 2;
  ctx.setLineDash([5, 4]); ctx.beginPath(); V.circlePath(ct.x, ct.y, ct.r); ctx.stroke(); ctx.setLineDash([]);
  if (ct.hold > 0) { ctx.strokeStyle = V.colors.seal; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, Math.min(r, 40) + 4, -Math.PI / 2, -Math.PI / 2 + 6.28 * Math.min(1, ct.hold / 15)); ctx.stroke(); }
  V.label(x, y, ct.pass ? '峠の砦' : '城砦', 13, '#f2e6c4', 'rgba(30,20,10,0.75)');
  // 城門のHP
  for (const w of bt.walls) {
    if (w.kind !== 'gate' || w.broken) continue;
    const [gx, gy] = V.w2s(w.x, w.y);
    const pct = w.hp / w.maxhp;
    if (pct < 0.999) { ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(gx - 16, gy - 14, 32, 5); ctx.fillStyle = pct > 0.5 ? '#d8b24a' : '#d4553a'; ctx.fillRect(gx - 16, gy - 14, 32 * pct, 5); }
  }
  for (const w of bt.walls) if (w.kind === 'wall' && (w.prog > 0.02 || w.captured >= 0)) {
    const [gx, gy] = V.w2s(w.x, w.y);
    if (w.captured >= 0) { ctx.fillStyle = bt.sides[w.captured].color; ctx.fillRect(gx - 4, gy - 16, 10, 7); ctx.fillStyle = '#ddd'; ctx.fillRect(gx - 5, gy - 16, 1.5, 16); }
    else { ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(gx - 14, gy + 8, 28, 4); ctx.fillStyle = '#e09a3a'; ctx.fillRect(gx - 14, gy + 8, 28 * Math.min(1, w.prog), 4); }
  }
};
V.drawPoint = (pt) => {
  const bt = V.bt, ctx = V.ctx;
  const [x, y] = V.w2s(pt.x, pt.y);
  if (x < -30 || y < -30 || x > V.vw + 30 || y > V.vh + 30) return;
  const ch = { camp: '陣', hill: '丘', forest: '森', tower: '櫓', dam: '堰' }[pt.type];
  const col = pt.owner < 0 ? '#9c927a' : bt.sides[pt.owner].color;
  const r = 11;
  ctx.fillStyle = 'rgba(20,16,10,0.55)'; ctx.beginPath(); ctx.arc(x, y, r + 2, 0, 6.28); ctx.fill();
  ctx.fillStyle = col === '#26262d' ? '#3a3a44' : col; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.28); ctx.fill();
  ctx.strokeStyle = pt.owner === 0 ? V.colors.jade : pt.owner === 1 ? V.colors.seal : '#d9cfb3'; ctx.lineWidth = 1.5; ctx.stroke();
  if (pt.prog > 0) { ctx.strokeStyle = '#f2e6c4'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, r + 4, -Math.PI / 2, -Math.PI / 2 + 6.28 * pt.prog / 6); ctx.stroke(); }
  ctx.fillStyle = '#f6efdc'; ctx.font = `600 12px ${V.fontHead()}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(ch, x, y + 0.5);
  if (pt.used) { ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.beginPath(); ctx.moveTo(x - 8, y - 8); ctx.lineTo(x + 8, y + 8); ctx.stroke(); }
};
V.drawZone = (u) => {
  const ctx = V.ctx, z = u.zone;
  ctx.strokeStyle = 'rgba(224,170,70,0.85)'; ctx.fillStyle = 'rgba(224,170,70,0.08)'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 5]);
  ctx.beginPath(); V.circlePath(z.x, z.y, z.r); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
};
// 地面の円（3D では楕円になる）
V.circlePath = (wx, wy, wr) => {
  const ctx = V.ctx;
  if (!V.ui.view3d) { const [x, y] = V.w2s(wx, wy); ctx.arc(x, y, wr * V.cam.z, 0, 6.2832); return; }
  let first = true;
  for (let i = 0; i <= 28; i++) { const a = i / 28 * 6.2832; const p = V3.project(wx + Math.cos(a) * wr, wy + Math.sin(a) * wr); if (!p) continue; if (first) { ctx.moveTo(p[0], p[1]); first = false; } else ctx.lineTo(p[0], p[1]); }
  ctx.closePath();
};
V.fontHead = () => '"Zen Antique","Shippori Mincho",serif';
V.timeLabel = (tInDay) => { const hours = ['卯', '辰', '巳', '午', '未', '申', '酉']; const dayT = tInDay / (V.bt ? V.bt.dayLen : 300); return `${hours[U.clamp(Math.floor(dayT * 7), 0, 6)]}の刻`; };
V.fontBody = () => '"Zen Kaku Gothic New","Hiragino Sans",sans-serif';
V.drawUnit = (u) => {
  const bt = V.bt, ctx = V.ctx, z = V.cam.z;
  const own = u.side === 0;
  if (!own && !u.vis[0] && bt.spec.role !== 'watch') return;
  const [sx, sy] = V.w2s(u.x, u.y);
  const rad = u.diag * z * 0.6 + 20;
  if (sx < -rad || sy < -rad || sx > V.vw + rad || sy > V.vh + rad) return;
  const side = bt.sides[u.side];
  let col = side.color;
  if (col === '#26262d') col = '#2e2e38';
  const sel = V.ui.sel.has(u.id);
  ctx.save();
  ctx.translate(sx, sy); ctx.rotate(u.a); ctx.scale(z, z);
  const alpha = u.hidden ? 0.45 : u.state === 'rout' ? 0.7 : 1;
  ctx.globalAlpha = alpha;
  const cw = u.w / u.cols, ch = u.h / u.rows;
  const gapX = Math.min(cw * 0.12, 1.2 / z), gapY = Math.min(ch * 0.12, 1.2 / z);
  const now = bt.time;
  const shake = u.eng.length ? 1 : 0;
  const figs = cw * z > 9 && ch * z > 7;
  const outline = own ? (sel ? V.colors.jade : 'rgba(235,227,205,0.75)') : 'rgba(194,69,47,0.9)';
  // 外枠
  ctx.lineWidth = (sel ? 2.4 : 1.1) / z;
  ctx.strokeStyle = outline;
  if (u.ship) V.drawShips(u, col, outline, sel);
  else if (u.cls === 'sie') {
    ctx.fillStyle = V.shade(col, 0.05);
    ctx.fillRect(-u.w / 2, -u.h / 2, u.w, u.h);
    ctx.strokeRect(-u.w / 2, -u.h / 2, u.w, u.h);
    ctx.fillStyle = '#5a4026';
    const stk = V.tokImg(u.t);
    if (stk) { const s = Math.max(u.w, u.h) * 1.15; ctx.drawImage(stk, -s / 2, -s / 2, s, s); }
    else if (u.t === 'ram') { ctx.fillRect(-u.w * 0.15, -u.h * 0.7, u.w * 0.3, u.h * 0.8); }
    else { ctx.strokeStyle = '#5a4026'; ctx.lineWidth = 1.2 / z * 2; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(-u.w / 2, k * u.h / 5); ctx.lineTo(u.w / 2, k * u.h / 5); ctx.stroke(); } }
  } else {
    const tok = figs ? V.tokImg(u.t) : null, toks = tok ? [] : null;
    const FP = figs && !tok ? { head: new Path2D(), wep: new Path2D(), horse: new Path2D(), cart: new Path2D(), shield: new Path2D(), hw: 0 } : null;
    // 伍ごとの四角は色ごとにまとめて塗る（呼び出しを減らす）
    const fills = new Map(), over = new Map(); let wiP = null;
    const add = (m, k, x, y, w, h) => { let p = m.get(k); if (!p) { p = new Path2D(); m.set(k, p); } p.rect(x, y, w, h); };
    const morV = V.ui.morView && (own || bt.spec.role === 'watch'), tint = !V.ui.morView && (own || bt.spec.role === 'watch');
    const fBase = V.shade(col, own ? 0.06 : 0), fLow = V.shade(col, own ? 0.15 : 0.1);
    for (const c of u.cells) {
      if (c.n <= 0) continue;
      const [lx, ly] = B.cellLocal(u, c);
      const frac = U.clamp(c.n / Math.max(1, c.max), 0.25, 1);
      const fill = morV ? V.morColor(Math.round(c.mor / 4) * 4) : c.mor < 28 ? fLow : fBase;
      const hit = now - c.hit < 0.18;
      const jx = shake ? (Math.random() - 0.5) * cw * 0.12 : 0, jy = shake ? (Math.random() - 0.5) * ch * 0.12 : 0;
      const w = (cw - gapX) * (0.55 + 0.45 * frac), h = (ch - gapY) * (0.55 + 0.45 * frac);
      const x = lx - w / 2 + jx, y = ly - h / 2 + jy;
      add(fills, fill, x, y, w, h);
      if (tint && c.mor < 28) add(over, `rgba(220,60,40,${(0.18 + 0.3 * (1 - Math.floor(c.mor / 7) * 7 / 28)).toFixed(2)})`, x, y, w, h);
      if (hit) add(over, 'rgba(255,240,220,0.55)', x, y, w, h);
      if (tok) toks.push(lx + jx, ly + jy, Math.min(w, h) * 1.3);
      else if (figs) V.addFigures(FP, u, c, lx + jx, ly + jy, w, h);
      if (c.wi === -1) { if (!wiP) wiP = new Path2D(); wiP.rect(lx - w / 2, ly - h / 2, w, h); }
    }
    for (const [k, p] of fills) { ctx.fillStyle = k; ctx.fill(p); }
    for (const [k, p] of over) { ctx.fillStyle = k; ctx.fill(p); }
    if (tok && toks.length) { const ga = ctx.globalAlpha; ctx.globalAlpha = ga * 0.95; for (let k = 0; k < toks.length; k += 3) { const s = toks[k + 2]; ctx.drawImage(tok, toks[k] - s / 2, toks[k + 1] - s / 2, s, s); } ctx.globalAlpha = ga; }
    if (wiP) { ctx.strokeStyle = V.colors.bronze; ctx.lineWidth = 2 / z; ctx.stroke(wiP); }
    if (FP) {
      if (u.cls === 'cav' || u.cls === 'chr') { ctx.fillStyle = '#5b3f28'; ctx.fill(FP.horse); if (u.cls === 'chr') { ctx.fillStyle = '#3a2a1a'; ctx.fill(FP.cart); } }
      ctx.fillStyle = 'rgba(245,232,205,0.9)'; ctx.fill(FP.head);
      ctx.strokeStyle = 'rgba(30,22,14,0.85)'; ctx.lineWidth = Math.max(0.6 / z, FP.hw * 0.35); ctx.stroke(FP.wep);
      if (u.t === 'heavy' || u.t === 'guard') { ctx.fillStyle = 'rgba(90,70,50,0.9)'; ctx.fill(FP.shield); }
    }
    // 縁取り
    ctx.strokeStyle = outline;
    ctx.lineWidth = (sel ? 2.4 : 1) / z;
    ctx.strokeRect(-u.w / 2 - 0.6 / z, -u.h / 2 - 0.6 / z, u.w + 1.2 / z, u.h + 1.2 / z);
    // 正面の印
    ctx.fillStyle = outline;
    ctx.beginPath(); ctx.moveTo(-3 / z, -u.h / 2 - 1.5 / z); ctx.lineTo(3 / z, -u.h / 2 - 1.5 / z); ctx.lineTo(0, -u.h / 2 - 6 / z); ctx.fill();
  }
  if (u.charging && Math.random() < 0.3 && !u.ship) B.fx(bt, { k: 'dust', x: u.x - Math.sin(u.a) * u.h * 0.6, y: u.y + Math.cos(u.a) * u.h * 0.6, r: Math.max(2, u.w * 0.25) });
  ctx.restore();
  ctx.globalAlpha = 1;
};
// 船団：一隻ずつ（船体・櫂・衝角・甲板・航跡）。座標は隊の中心・向きに合わせてある
V.drawShips = (u, col, outline, sel) => {
  const bt = V.bt, ctx = V.ctx, z = V.cam.z, now = bt.time, own = u.side === 0;
  const cw = u.w / u.cols, ch = u.h / u.rows;
  const L = ch * 0.88, Bm = Math.min(cw * 0.55, L * 0.24);
  const moving = u.spd > 0.3 * bt.p, fast = u.spd / Math.max(0.1, bt.p * 5);
  const morV = V.ui.morView && (own || bt.spec.role === 'watch');
  const deck = V.shade(col, own ? 0.1 : 0.04), hullC = '#5e4026', hullD = '#3b2817';
  const detail = Bm * z > 3, crowd = Bm * z > 6;
  const no = u.ut.crew >= 200 ? 9 : u.ut.crew >= 100 ? 7 : u.ut.crew >= 60 ? 6 : 4;
  const sim = V.shipImg(u.t);
  for (const c of u.cells) {
    if (c.n <= 0) continue;
    const [lx, ly] = B.cellLocal(u, c);
    const frac = U.clamp(c.n / Math.max(1, c.max), 0, 1), hit = now - c.hit < 0.2;
    ctx.save(); ctx.translate(lx, ly);
    if (frac < 0.45) ctx.rotate(Math.sin(c.r * 3 + c.c * 1.7) * 0.14 * (1 - frac));
    // 航跡
    if (moving) { ctx.strokeStyle = `rgba(236,246,250,${Math.min(0.55, 0.15 + fast * 0.4).toFixed(2)})`; ctx.lineWidth = Math.max(0.7 / z, Bm * 0.12); ctx.beginPath(); ctx.moveTo(-Bm * 0.45, L * 0.45); ctx.lineTo(-Bm * 1.3, L * (0.95 + fast * 0.5)); ctx.moveTo(Bm * 0.45, L * 0.45); ctx.lineTo(Bm * 1.3, L * (0.95 + fast * 0.5)); ctx.stroke(); }
    if (sim) {
      // 外で作った軍船の絵（船首を前＝上に向ける）。甲板に国の色の帯を重ねる
      ctx.save(); ctx.rotate(-Math.PI / 2);
      const len = L * 1.12, wid = len * sim.height / sim.width;
      ctx.drawImage(sim, -len / 2, -wid / 2, len, wid);
      ctx.restore();
      const ga = ctx.globalAlpha;
      ctx.beginPath(); ctx.ellipse(0, L * 0.03, Bm * 0.2, L * 0.3, 0, 0, 6.2832);
      ctx.globalAlpha = ga * (morV ? 0.8 : 0.6); ctx.fillStyle = morV ? V.morColor(Math.round(c.mor / 4) * 4) : deck; ctx.fill();
      if (!morV && c.mor < 28) { ctx.fillStyle = 'rgba(220,60,40,0.4)'; ctx.fill(); }
      ctx.globalAlpha = ga;
      if (hit) { ctx.fillStyle = 'rgba(255,240,220,0.45)'; ctx.beginPath(); ctx.ellipse(0, 0, Bm * 0.55, L * 0.5, 0, 0, 6.2832); ctx.fill(); }
    }
    // 櫂（漕いでいるときは揺れる）
    if (detail && !sim) {
      const ph = moving ? now * (6 + fast * 6) + c.c : 0;
      ctx.strokeStyle = 'rgba(42,30,18,0.85)'; ctx.lineWidth = Math.max(0.5 / z, Bm * 0.07); ctx.beginPath();
      for (let k = 0; k < no; k++) { const y0 = -L * 0.26 + k * L * 0.52 / (no - 1), sw = Math.sin(ph + k * 0.25) * L * 0.05; ctx.moveTo(-Bm * 0.42, y0); ctx.lineTo(-Bm * 1.2, y0 + sw); ctx.moveTo(Bm * 0.42, y0); ctx.lineTo(Bm * 1.2, y0 + sw); }
      ctx.stroke();
    }
    // 船体
    if (!sim) {
    ctx.beginPath();
    ctx.moveTo(0, -L * 0.5);
    ctx.quadraticCurveTo(Bm * 0.56, -L * 0.3, Bm * 0.5, 0);
    ctx.quadraticCurveTo(Bm * 0.46, L * 0.38, 0, L * 0.5);
    ctx.quadraticCurveTo(-Bm * 0.46, L * 0.38, -Bm * 0.5, 0);
    ctx.quadraticCurveTo(-Bm * 0.56, -L * 0.3, 0, -L * 0.5);
    ctx.fillStyle = hit ? '#f2e3c6' : frac < 0.35 ? hullD : hullC; ctx.fill();
    // 甲板（国の色。士気表示なら士気の色）
    ctx.beginPath(); ctx.ellipse(0, L * 0.03, Bm * 0.3, L * 0.33, 0, 0, 6.2832);
    ctx.fillStyle = morV ? V.morColor(Math.round(c.mor / 4) * 4) : deck; ctx.fill();
    if (!morV && c.mor < 28) { ctx.fillStyle = 'rgba(220,60,40,0.35)'; ctx.fill(); }
    // 衝角（青銅）
    ctx.fillStyle = '#b8925a'; ctx.beginPath(); ctx.moveTo(0, -L * 0.57); ctx.lineTo(Bm * 0.15, -L * 0.45); ctx.lineTo(-Bm * 0.15, -L * 0.45); ctx.closePath(); ctx.fill();
    }
    // 櫓（大型艦）・渡し橋（ローマ）
    if (detail && u.ut.range) { ctx.fillStyle = '#7a5a3a'; ctx.fillRect(-Bm * 0.22, -L * 0.14, Bm * 0.44, L * 0.12); ctx.fillRect(-Bm * 0.22, L * 0.16, Bm * 0.44, L * 0.1); }
    if (detail && u.corvus) { const down = u.grappleT > now; ctx.strokeStyle = '#3a2a18'; ctx.lineWidth = Math.max(0.6 / z, Bm * 0.14); ctx.beginPath(); ctx.moveTo(0, -L * 0.2); ctx.lineTo(down ? Bm * 0.2 : 0, down ? -L * 0.66 : -L * 0.4); ctx.stroke(); }
    // 海兵
    if (crowd && !sim) { ctx.fillStyle = 'rgba(245,232,205,0.92)'; const nm = Math.max(1, Math.round(5 * frac)); for (let k = 0; k < nm; k++) { ctx.beginPath(); ctx.arc((k % 2 - 0.5) * Bm * 0.26, -L * 0.2 + k * L * 0.1, Bm * 0.07, 0, 6.2832); ctx.fill(); } }
    // 傷み（煙）
    if (frac < 0.5 && detail) { ctx.fillStyle = 'rgba(40,36,32,0.42)'; ctx.beginPath(); ctx.arc(Bm * 0.12, L * 0.1, Bm * 0.4 * (1 - frac), 0, 6.2832); ctx.fill(); }
    if (c.wi === -1) { ctx.strokeStyle = V.colors.bronze; ctx.lineWidth = 2 / z; ctx.stroke(); }
    ctx.restore();
  }
  // 船団の枠（薄く）と正面の印
  const ga = ctx.globalAlpha;
  ctx.globalAlpha = ga * (sel ? 1 : 0.5);
  ctx.strokeStyle = outline; ctx.lineWidth = (sel ? 2.2 : 0.9) / z;
  ctx.strokeRect(-u.w / 2 - 1 / z, -u.h / 2 - 1 / z, u.w + 2 / z, u.h + 2 / z);
  ctx.globalAlpha = ga;
  ctx.fillStyle = outline;
  ctx.beginPath(); ctx.moveTo(-3 / z, -u.h / 2 - 1.5 / z); ctx.lineTo(3 / z, -u.h / 2 - 1.5 / z); ctx.lineTo(0, -u.h / 2 - 6 / z); ctx.fill();
};
// 兵の姿（部隊ごとにまとめて描く）
V.addFigures = (P, u, c, cx, cy, w, h) => {
  const n = Math.min(c.n, u.per === 1 ? 1 : 6);
  const cols = n <= 2 ? n : n <= 4 ? 2 : 3, rows = Math.ceil(n / cols);
  const head = Math.min(w / cols, h / rows) * 0.28;
  P.hw = Math.max(P.hw, head);
  for (let k = 0; k < n; k++) {
    const fx = cx - w / 2 + (k % cols + 0.5) * w / cols, fy = cy - h / 2 + (Math.floor(k / cols) + 0.5) * h / rows;
    if (u.cls === 'cav' || u.cls === 'chr') {
      P.horse.moveTo(fx + head * 0.7, fy + head * 0.4); P.horse.ellipse(fx, fy + head * 0.4, head * 0.7, head * 1.5, 0, 0, 6.28);
      if (u.cls === 'chr') P.cart.rect(fx - head * 1.4, fy + head * 0.6, head * 2.8, head * 0.6);
    }
    P.head.moveTo(fx + head, fy); P.head.arc(fx, fy, head, 0, 6.28);
    if (u.cls === 'rng') { P.wep.moveTo(fx + head * 1.1 + head * 1.2 * Math.cos(-1.3), fy - head * 0.3 + head * 1.2 * Math.sin(-1.3)); P.wep.arc(fx + head * 1.1, fy - head * 0.3, head * 1.2, -1.3, 1.3); }
    else { P.wep.moveTo(fx + head * 0.9, fy + head * 1.4); P.wep.lineTo(fx + head * 0.9, fy - head * (u.t === 'spear' ? 4 : 3)); }
    if (u.t === 'heavy' || u.t === 'guard') P.shield.rect(fx - head * 1.6, fy - head * 0.8, head * 0.7, head * 1.8);
  }
};
V.drawFigures = (u, c, cx, cy, w, h, col) => {
  const ctx = V.ctx, z = V.cam.z;
  const n = Math.min(c.n, u.per === 1 ? 1 : 6);
  const cols = n <= 2 ? n : n <= 4 ? 2 : 3, rows = Math.ceil(n / cols);
  const head = Math.min(w / cols, h / rows) * 0.28;
  for (let k = 0; k < n; k++) {
    const fx = cx - w / 2 + (k % cols + 0.5) * w / cols, fy = cy - h / 2 + (Math.floor(k / cols) + 0.5) * h / rows;
    if (u.cls === 'cav' || u.cls === 'chr') {
      ctx.fillStyle = '#5b3f28'; ctx.beginPath(); ctx.ellipse(fx, fy + head * 0.4, head * 0.7, head * 1.5, 0, 0, 6.28); ctx.fill();
      if (u.cls === 'chr') { ctx.fillStyle = '#3a2a1a'; ctx.fillRect(fx - head * 1.4, fy + head * 0.6, head * 2.8, head * 0.6); }
    }
    ctx.fillStyle = 'rgba(245,232,205,0.9)';
    ctx.beginPath(); ctx.arc(fx, fy, head, 0, 6.28); ctx.fill();
    ctx.strokeStyle = 'rgba(30,22,14,0.85)'; ctx.lineWidth = Math.max(0.6 / z, head * 0.35);
    ctx.beginPath();
    if (u.cls === 'rng') { ctx.arc(fx + head * 1.1, fy - head * 0.3, head * 1.2, -1.3, 1.3); }
    else { ctx.moveTo(fx + head * 0.9, fy + head * 1.4); ctx.lineTo(fx + head * 0.9, fy - head * (u.t === 'spear' ? 4 : 3)); }
    ctx.stroke();
    if (u.t === 'heavy' || u.t === 'guard') { ctx.fillStyle = 'rgba(90,70,50,0.9)'; ctx.fillRect(fx - head * 1.6, fy - head * 0.8, head * 0.7, head * 1.8); }
  }
};
V.drawBanner = (u) => {
  const bt = V.bt, ctx = V.ctx;
  if (u.side !== 0 && !u.vis[0] && bt.spec.role !== 'watch') return;
  const [fx, fy] = B.toWorld(u, 0, -u.h / 2);
  const [sx, sy] = V.w2s(fx, fy);
  if (sx < -40 || sy < -60 || sx > V.vw + 40 || sy > V.vh + 40) return;
  const big = u.hq || u.me || u.n >= 3000;
  const s = big ? 17 : u.n >= 300 ? 14 : 11;
  const pole = s * 1.5;
  const side = bt.sides[u.side];
  let col = side.color === '#26262d' ? '#2e2e38' : side.color;
  ctx.globalAlpha = u.hidden ? 0.5 : 1;
  ctx.strokeStyle = 'rgba(30,22,14,0.9)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy - pole - s); ctx.stroke();
  ctx.fillStyle = col;
  ctx.fillRect(sx, sy - pole - s, s, s);
  ctx.strokeStyle = u.me ? V.colors.bronze : u.side === 0 ? 'rgba(235,227,205,0.9)' : 'rgba(194,69,47,0.95)';
  ctx.lineWidth = u.me || u.hq ? 2 : 1;
  ctx.strokeRect(sx + 0.5, sy - pole - s + 0.5, s - 1, s - 1);
  const ch = u.ld ? String(u.ld.sei || u.ld.n || '').slice(0, 1) : D.UT[u.t].s;
  ctx.fillStyle = '#f6efdc'; ctx.font = `${Math.round(s * 0.78)}px ${V.fontHead()}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(ch, sx + s / 2, sy - pole - s / 2 + 1);
  if (u.hq) { ctx.fillStyle = V.colors.bronze; ctx.beginPath(); ctx.arc(sx, sy - pole - s - 3, 3, 0, 6.28); ctx.fill(); }
  // 状態アイコン
  let tag = '';
  if (u.state === 'rout') tag = '潰';
  else if (u.hidden) tag = '伏';
  else if (u.chaos) tag = '乱';
  else if (u.state === 'climb') tag = '攀';
  else if (u.order && u.order.type === 'rearguard') tag = '殿';
  else if (u.courier) tag = '伝';
  else if (u.delegate) tag = '任';
  if (tag) { ctx.fillStyle = tag === '潰' ? V.colors.seal : 'rgba(25,20,12,0.85)'; ctx.fillRect(sx + s + 1, sy - pole - s, s * 0.8, s * 0.8); ctx.fillStyle = '#f6efdc'; ctx.font = `${Math.round(s * 0.6)}px ${V.fontBody()}`; ctx.fillText(tag, sx + s + 1 + s * 0.4, sy - pole - s + s * 0.42); }
  // 兵種の札（旗の下に下げる）：布陣の間はすべての隊、合戦中は選んだ隊と寄ったとき
  if (V.showTypeTab(u)) V.drawTypeTab(ctx, D.utAb(u.t), u.cls, sx + 1, sy - pole, s);
  // 兵数（選択中・拡大時）
  const showNum = V.ui.sel.has(u.id) || u.me || (V.cam.z * u.w > 70);
  if (showNum) {
    const txt = u.ship ? `${u.cells.filter(c => c.n > 0).length * (u.shipsPer || 1)}隻・${U.fmt(u.n)}` : `${U.fmt(u.n)}`;
    ctx.font = `600 11px ${V.fontBody()}`;
    const tw = ctx.measureText(txt).width + 8;
    ctx.fillStyle = 'rgba(15,12,8,0.7)'; ctx.fillRect(sx - tw / 2, sy + 3, tw, 15);
    ctx.fillStyle = u.side === 0 ? '#e9e1cc' : '#f0b3a5'; ctx.fillText(txt, sx, sy + 11);
    // 士気バー
    ctx.fillStyle = 'rgba(15,12,8,0.7)'; ctx.fillRect(sx - tw / 2, sy + 18, tw, 4);
    ctx.fillStyle = V.morColor(u.mor); ctx.fillRect(sx - tw / 2, sy + 18, tw * U.clamp(u.mor / 100, 0, 1), 4);
  }
  ctx.globalAlpha = 1;
};
V.showTypeTab = (u) => !!(V.ui.deploy || V.ui.placing || V.ui.sel.has(u.id) || V.cam.z * u.w > 70);
// 兵種の札：兵科の色の地に二文字（x, y は札の左上。s は旗の大きさ）
V.drawTypeTab = (ctx, ab, cls, x, y, s) => {
  if (!ab) return;
  ctx.save();
  const fs = Math.max(9, Math.round(s * 0.62));
  ctx.font = `700 ${fs}px ${V.fontBody()}`;
  const tw = Math.ceil(ctx.measureText(ab).width) + 5, th = fs + 4;
  ctx.globalAlpha = Math.max(ctx.globalAlpha, 0.85);
  ctx.fillStyle = V.CLS_COLOR[cls] || '#cfc6ae';
  ctx.fillRect(x, y, tw, th);
  ctx.strokeStyle = 'rgba(25,20,12,0.9)'; ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, tw - 1, th - 1);
  ctx.fillStyle = '#1d150b'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(ab, x + 2.5, y + th / 2 + 0.5);
  ctx.restore();
};
V.drawOrder = (u) => {
  const bt = V.bt, ctx = V.ctx; const o = u.order;
  if (!o && !u.courier) return;
  const oo = u.courier ? u.courier.o : o;
  let tx, ty, col = 'rgba(98,179,155,0.9)';
  if (oo.type === 'move' || oo.type === 'climb' || oo.type === 'ramgate') { if (oo.type === 'move') { tx = oo.x; ty = oo.y; } else { const w = bt.walls[oo.wall]; tx = w.x; ty = w.y; col = 'rgba(224,154,58,0.9)'; } }
  else if ((oo.type === 'attack' || oo.type === 'charge') && bt.units[oo.target]) { const e = bt.units[oo.target]; tx = e.x; ty = e.y; col = 'rgba(214,85,58,0.95)'; }
  else if (oo.type === 'retreat') { tx = u.x; ty = u.side === 0 ? bt.H : 0; col = 'rgba(200,200,200,0.6)'; }
  else return;
  const [ax, ay] = V.w2s(u.x, u.y), [bx, by] = V.w2s(tx, ty);
  ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.setLineDash(u.courier ? [3, 5] : [8, 6]);
  ctx.beginPath(); ctx.moveTo(ax, ay);
  if (u.path && u.path.pts && !u.courier) for (let k = u.pi; k < u.path.pts.length; k++) { const [px, py] = V.w2s(u.path.pts[k][0], u.path.pts[k][1]); ctx.lineTo(px, py); }
  else ctx.lineTo(bx, by);
  ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(bx, by, 4, 0, 6.28); ctx.fill();
};
V.drawProj = () => {
  const bt = V.bt, ctx = V.ctx, z = V.cam.z;
  ctx.lineWidth = 1;
  for (const p of bt.proj) {
    const t = p.t / p.dur;
    const tu = bt.units[p.to];
    const x1 = tu ? tu.x : p.x1, y1 = tu ? tu.y : p.y1;
    const hgt = Math.min(60, Math.hypot(x1 - p.x0, y1 - p.y0) * 0.25) * Math.sin(Math.PI * t) * (p.xbow ? 0.3 : 1);
    ctx.strokeStyle = p.side === 0 ? 'rgba(30,24,16,0.85)' : 'rgba(60,18,10,0.85)';
    const spread = Math.max(4, (tu ? tu.w : 10) * 0.4);
    for (let k = 0; k < p.n; k++) {
      const jx = ((k * 37) % 17 - 8) / 8 * spread, jy = ((k * 53) % 13 - 6) / 6 * spread * 0.5;
      let sx, sy, ang;
      if (V.ui.view3d) {
        const x = p.x0 + (x1 + jx - p.x0) * t, y = p.y0 + (y1 + jy - p.y0) * t;
        const pr = V3.project(x, y, V3.heightAt(U.clamp(x, 0, bt.W), U.clamp(y, 0, bt.H)) + hgt * 0.9 + 1.5); if (!pr) continue;
        const pr2 = V3.project(x + (x1 - p.x0) * 0.02, y + (y1 - p.y0) * 0.02, V3.heightAt(U.clamp(x, 0, bt.W), U.clamp(y, 0, bt.H)) + hgt * 0.9 + 1.5 + Math.cos(Math.PI * t) * 1.2);
        sx = pr[0]; sy = pr[1]; ang = pr2 ? Math.atan2(pr2[1] - pr[1], pr2[0] - pr[0]) : 0;
        if (sx < -20 || sy < -20 || sx > V.vw + 20 || sy > V.vh + 20) continue;
      } else {
        const x = p.x0 + (x1 + jx - p.x0) * t, y = p.y0 + (y1 + jy - p.y0) * t - hgt;
        [sx, sy] = V.w2s(x, y);
        if (sx < -20 || sy < -20 || sx > V.vw + 20 || sy > V.vh + 20) continue;
        ang = Math.atan2(y1 - p.y0, x1 - p.x0) - (0.5 - t) * (p.xbow ? 0.2 : 1.1);
      }
      const L = 5 + Math.min(4, z * 0.8);
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - Math.cos(ang) * L, sy - Math.sin(ang) * L); ctx.stroke();
    }
  }
};
V.drawFx = () => {
  const bt = V.bt, ctx = V.ctx, z = V.cam.z, dt = V.realDt * Math.max(1, V.ui.speed * (V.ui.paused ? 0 : 1));
  const keep = [];
  for (const f of bt.fx) {
    if (f.t === 0 && !V.ui.paused && typeof SND !== 'undefined') { const po = { pan: (V.w2s(f.x, f.y)[0] / V.vw - 0.5) * 1.5 }; if (f.k === 'clash') SND.play('clash', po); else if (f.k === 'arrows') SND.play('arrows', po); else if (f.k === 'flee') SND.play('rout', po); else if (f.k === 'splash') SND.play('crash', po); else if (f.k === 'sink') SND.play('whoosh', po); }
    f.t += V.ui.paused ? V.realDt * 0.3 : dt;
    const life = { dust: 1.4, clash: 0.35, arrows: 0.6, flee: 1.6, smoke: 2.2, rocks: 0.9, splash: 0.9, sink: 3.2 }[f.k] || 1;
    if (f.t > life) continue;
    keep.push(f);
    const [x, y] = V.w2s(f.x, f.y);
    if (x < -60 || y < -60 || x > V.vw + 60 || y > V.vh + 60) continue;
    const k = f.t / life;
    if (f.k === 'dust') { ctx.fillStyle = `rgba(190,170,130,${0.35 * (1 - k)})`; ctx.beginPath(); ctx.arc(x, y, Math.max(4, f.r * z) * (0.6 + k), 0, 6.28); ctx.fill(); }
    else if (f.k === 'clash') { ctx.strokeStyle = `rgba(255,245,220,${1 - k})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 4, y - 4); ctx.lineTo(x + 4, y + 4); ctx.moveTo(x + 4, y - 4); ctx.lineTo(x - 4, y + 4); ctx.stroke(); }
    else if (f.k === 'arrows') { ctx.fillStyle = `rgba(30,24,16,${0.7 * (1 - k)})`; const rr = Math.max(4, f.r * z); for (let i = 0; i < Math.min(14, f.n); i++) { const a = i * 2.4, d = (i * 0.37 % 1) * rr; ctx.fillRect(x + Math.cos(a) * d, y + Math.sin(a) * d, 1.5, 1.5); } }
    else if (f.k === 'flee') { ctx.fillStyle = `rgba(230,220,200,${0.8 * (1 - k)})`; for (let i = 0; i < f.n; i++) { const a = f.a + (i - f.n / 2) * 0.25; const d = (10 + 50 * k) * Math.max(0.6, z * 0.3); ctx.beginPath(); ctx.arc(x + Math.sin(a) * d, y - Math.cos(a) * d, 2, 0, 6.28); ctx.fill(); } }
    else if (f.k === 'smoke') { ctx.fillStyle = `rgba(70,66,60,${0.35 * (1 - k)})`; ctx.beginPath(); ctx.arc(x + k * 10, y - k * 30, 6 + k * 14, 0, 6.28); ctx.fill(); }
    else if (f.k === 'splash') { ctx.strokeStyle = `rgba(242,248,252,${(0.9 * (1 - k)).toFixed(2)})`; ctx.lineWidth = 2; const rr = Math.max(7, f.r * z) * (0.45 + k); ctx.beginPath(); for (let i = 0; i < 9; i++) { const a = i * 0.7; ctx.moveTo(x + Math.cos(a) * rr * 0.35, y + Math.sin(a) * rr * 0.35); ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr - (1 - k) * 9); } ctx.stroke(); ctx.fillStyle = `rgba(250,252,255,${(0.5 * (1 - k)).toFixed(2)})`; ctx.beginPath(); ctx.arc(x, y, rr * 0.45, 0, 6.2832); ctx.fill(); }
    else if (f.k === 'sink') {
      const rr = Math.max(5, f.r * z);
      ctx.strokeStyle = `rgba(232,242,247,${(0.7 * (1 - k)).toFixed(2)})`; ctx.lineWidth = 1.4;
      for (let j = 0; j < 3; j++) { const q = 0.35 + k * (1 + j * 0.6); ctx.beginPath(); ctx.ellipse(x, y, rr * q, rr * 0.55 * q, f.a || 0, 0, 6.2832); ctx.stroke(); }
      if (k < 0.5) { ctx.fillStyle = `rgba(62,42,24,${(0.85 * (1 - k * 2)).toFixed(2)})`; ctx.beginPath(); ctx.ellipse(x, y, rr * 0.22, rr * 0.75 * (1 - k * 1.6), f.a || 0, 0, 6.2832); ctx.fill(); }
      ctx.fillStyle = `rgba(80,58,36,${(0.9 * (1 - k)).toFixed(2)})`;
      for (let i = 0; i < 7; i++) ctx.fillRect(x + Math.cos(i * 2.1) * rr * (0.3 + k * 0.9), y + Math.sin(i * 2.7) * rr * 0.55 * (0.3 + k * 0.9), 3, 1.5);
    }
    else if (f.k === 'rocks') { ctx.fillStyle = `rgba(90,85,78,${1 - k})`; const rr = Math.max(4, (f.r || 5) * z); for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(x + Math.cos(i * 1.7) * rr * 0.7, y + Math.sin(i * 1.7) * rr * 0.7 - (1 - k) * 30, 3 + (i % 3), 0, 6.28); ctx.fill(); } }
  }
  bt.fx = keep;
};
V.drawTexts = () => {
  const bt = V.bt, ctx = V.ctx;
  const keep = [];
  for (const t of bt.texts) { t.t += V.realDt; if (t.t <= 2.4) keep.push(t); }
  // 同時に出す文字は新しいものから最大10件。重なる場合は上へ積む
  const show = keep.slice(-10);
  const rects = [];
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const t of show) {
    const [sx, sy] = V.w2s(t.x, t.y);
    const k = t.t / 2.4;
    const size = t.s.length > 8 ? 13 : 16;
    ctx.font = `600 ${size}px ${V.fontHead()}`;
    const w = ctx.measureText(t.s).width + 8, hgt = size + 6;
    const x = U.clamp(sx, w / 2 + 6, V.vw - w / 2 - 6);
    const base = sy - 26 - k * 26;
    if (t.row == null) {
      t.row = 0;
      while (t.row < 6 && rects.some(r => Math.abs(r.x - x) < (r.w + w) / 2 && Math.abs(r.y - (base - t.row * hgt)) < (r.h + hgt) / 2)) t.row++;
    }
    const yy = U.clamp(base - t.row * hgt, hgt / 2 + 4, V.vh - hgt / 2 - 4);
    rects.push({ x, y: yy, w, h: hgt });
    ctx.globalAlpha = k < 0.8 ? 1 : 1 - (k - 0.8) / 0.2;
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(18,14,8,0.85)'; ctx.strokeText(t.s, x, yy);
    ctx.fillStyle = t.kind === 'good' ? '#f3d27a' : t.kind === 'bad' ? '#f08a74' : '#efe6cf';
    ctx.fillText(t.s, x, yy);
    ctx.globalAlpha = 1;
  }
  bt.texts = keep;
};
V.label = (x, y, s, size, fg, bg) => {
  const ctx = V.ctx;
  ctx.font = `${size}px ${V.fontHead()}`;
  const w = ctx.measureText(s).width + 10;
  ctx.fillStyle = bg; ctx.fillRect(x - w / 2, y - size / 2 - 3, w, size + 6);
  ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s, x, y + 1);
};
V.drawMini = () => {
  const bt = V.bt, g = V.mctx, W = V.mini.width, H = V.mini.height;
  g.imageSmoothingEnabled = false;
  g.drawImage(V.mterr, 0, 0, W, H);
  for (const u of bt.units) {
    if (!B.alive(u)) continue;
    if (u.side !== 0 && !u.vis[0] && bt.spec.role !== 'watch') continue;
    g.fillStyle = u.side === 0 ? (u.me ? '#f3d27a' : '#e9e1cc') : '#d4553a';
    const x = u.x / bt.W * W, y = u.y / bt.H * H;
    const s = Math.max(2, Math.min(6, u.w / bt.W * W));
    g.fillRect(x - s / 2, y - 1, s, 2.5);
  }
  if (V.ui.view3d) { V3.miniRect(g, W, H); return; }
  const [x0, y0] = V.s2w(0, 0), [x1, y1] = V.s2w(V.vw, V.vh);
  g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1;
  g.strokeRect(x0 / bt.W * W, y0 / bt.H * H, (x1 - x0) / bt.W * W, (y1 - y0) / bt.H * H);
};

/* ---------------- 入力 ---------------- */
V.bindInput = () => {
  const cv = V.cv;
  const ptrs = new Map();
  let pinch = null, drag = null;
  const pos = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  cv.onpointerdown = (e) => {
    cv.setPointerCapture(e.pointerId);
    const [x, y] = pos(e);
    ptrs.set(e.pointerId, { x, y, sx: x, sy: y, t0: performance.now(), moved: false });
    if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, z: V.cam.z, camx: V.cam.x, camy: V.cam.y };
      drag = null;
    } else if (ptrs.size === 1) {
      drag = { x, y, camx: V.cam.x, camy: V.cam.y, unit: null };
      // 布陣中は自分の部隊を掴める
      if (V.ui.deploy) { const u = V.hit(x, y); if (u && u.side === 0 && V.canDeployMove(u)) { drag.unit = u; drag.offx = u.x; drag.offy = u.y; V.select([u.id]); } }
      if (V.ui.mode === 'zone') { const [wx, wy] = V.s2w(x, y); drag.zone = { x: wx, y: wy }; }
      clearTimeout(V._lp);
      V._lp = setTimeout(() => { const p = ptrs.get(e.pointerId); if (p && !p.moved && ptrs.size === 1) { p.long = true; V.longPress(p.x, p.y); } }, 480);
    }
  };
  cv.onpointermove = (e) => {
    const p = ptrs.get(e.pointerId); if (!p) return;
    const [x, y] = pos(e); p.x = x; p.y = y;
    if (Math.hypot(x - p.sx, y - p.sy) > 8) p.moved = true;
    if (pinch && ptrs.size >= 2 && V.ui.view3d) {
      const [a, b] = [...ptrs.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y), ang = Math.atan2(b.y - a.y, b.x - a.x);
      const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
      if (pinch.ang == null) { pinch.ang = ang; pinch.cy0 = cy; pinch.dist = V3.cam.dist; pinch.yaw = V3.cam.yaw; pinch.pitch = V3.cam.pitch; pinch.lastD = d; }
      V3.cam.dist = pinch.dist * Math.max(10, pinch.d) / Math.max(10, d);
      V3.cam.yaw = pinch.yaw + U.angNorm(ang - pinch.ang);
      V3.cam.pitch = pinch.pitch + (cy - pinch.cy0) / V.vh * 2.2;
      V3.clamp(); V3.setup(); V.ui.follow = false;
      return;
    }
    if (pinch && ptrs.size >= 2) {
      const [a, b] = [...ptrs.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
      const nz = U.clamp(pinch.z * d / Math.max(10, pinch.d), V.zMin, V.zMax);
      // ピンチ中心を固定
      const wx = (pinch.cx - V.vw / 2) / pinch.z + pinch.camx, wy = (pinch.cy - V.vh / 2) / pinch.z + pinch.camy;
      V.cam.z = nz; V.cam.x = wx - (cx - V.vw / 2) / nz; V.cam.y = wy - (cy - V.vh / 2) / nz;
      V.clampCam(); V.ui.follow = false;
      return;
    }
    if (drag && p.moved) {
      if (drag.unit) {
        const [wx, wy] = V.s2w(x, y);
        V.deployMove(drag.unit, wx, wy);
      } else if (drag.zone) {
        const [wx, wy] = V.s2w(x, y);
        drag.zone.r = Math.hypot(wx - drag.zone.x, wy - drag.zone.y);
        V.previewZone = drag.zone;
      } else if (V.ui.view3d) {
        if (drag.lx == null) { drag.lx = drag.x; drag.ly = drag.y; }
        V3.panGrab(drag.lx, drag.ly, x, y); drag.lx = x; drag.ly = y; V.ui.follow = false;
      } else {
        V.cam.x = drag.camx - (x - drag.x) / V.cam.z; V.cam.y = drag.camy - (y - drag.y) / V.cam.z; V.clampCam(); V.ui.follow = false;
      }
    }
  };
  const up = (e) => {
    const p = ptrs.get(e.pointerId); if (!p) return;
    ptrs.delete(e.pointerId);
    clearTimeout(V._lp);
    if (ptrs.size < 2) pinch = null;
    if (drag && drag.zone && p.moved) { V.applyZone(drag.zone.x, drag.zone.y, drag.zone.r); V.previewZone = null; drag = null; return; }
    if (!p.moved && !p.long && ptrs.size === 0 && performance.now() - p.t0 < 600) V.tap(p.x, p.y);
    if (ptrs.size === 0) drag = null;
  };
  cv.onpointerup = up; cv.onpointercancel = up;
  cv.onwheel = (e) => {
    e.preventDefault();
    if (V.ui.view3d) { if (e.shiftKey) V3.orbit(e.deltaY * 0.003, 0); else if (e.altKey) V3.orbit(0, e.deltaY * 0.002); else V3.zoom(Math.exp(e.deltaY * 0.0012)); V.ui.follow = false; return; }
    const [x, y] = pos(e);
    const [wx, wy] = V.s2w(x, y);
    const nz = U.clamp(V.cam.z * Math.exp(-e.deltaY * 0.0015), V.zMin, V.zMax);
    V.cam.z = nz; V.cam.x = wx - (x - V.vw / 2) / nz; V.cam.y = wy - (y - V.vh / 2) / nz; V.clampCam();
  };
  cv.oncontextmenu = (e) => { e.preventDefault(); const [x, y] = pos(e); if (V.ui.sel.size) V.orderAt(x, y, true); };
};
V.hit = (sx, sy) => {
  const bt = V.bt;
  const [wx, wy] = V.s2w(sx, sy);
  let best = null, bd = Infinity;
  const pad = 14 / V.cam.z;
  for (const u of bt.units) {
    if (!B.alive(u)) continue;
    if (u.side !== 0 && !u.vis[0] && bt.spec.role !== 'watch') continue;
    const [lx, ly] = B.toLocal(u, wx, wy);
    const inside = Math.abs(lx) <= u.w / 2 + pad && Math.abs(ly) <= u.h / 2 + pad;
    // 旗も当たり
    const [fx, fy] = B.toWorld(u, 0, -u.h / 2);
    const [bx, by] = V.w2s(fx, fy);
    const onFlag = Math.abs(sx - bx - 6) < 14 && sy < by && sy > by - 44;
    if (inside || onFlag) { const d = Math.hypot(lx, ly) / Math.max(1, Math.min(u.w, u.h)) + (onFlag ? -1 : 0) + (u.side === 0 ? 0 : 0.2); if (d < bd) { bd = d; best = u; } }
  }
  return best;
};
V.tap = (sx, sy) => {
  const bt = V.bt;
  const u = V.hit(sx, sy);
  const [wx, wy] = V.s2w(sx, sy);
  const mode = V.ui.mode;
  if (mode === 'zone') { const sel = V.selUnits().filter(x => x.ut.range || x.horseArch); const r = sel.length ? B.range(bt, sel[0]) * 0.45 : 60; V.applyZone(wx, wy, r); return; }
  if (mode === 'skillpt') { V.useSkillAt(wx, wy, u); return; }
  if (mode === 'attack') { if (u && u.side !== 0) { V.orderAttack(u); V.setMode(null); } else V.toast('敵の部隊をタップ'); return; }
  if (mode === 'move') { V.orderMove(wx, wy); V.setMode(null); return; }
  if (V.ui.deploy) {
    if (u && u.side === 0) { if (V.ui.multi && B.canCommand(bt, u)) { V.ui.sel.has(u.id) ? V.ui.sel.delete(u.id) : V.ui.sel.add(u.id); V.renderPanel(); } else V.select([u.id]); return; }
    // 布陣のターン：選んだ隊を、タップした所へ置く
    if (V.ui.placing && !u) { const mv = V.selUnits().filter(x => V.canDeployMove(x)); if (mv.length) { V.placeAt(mv, wx, wy); return; } }
    V.select([]); return;
  }
  if (u && u.side === 0) {
    const now = performance.now();
    if (now - V.ui.lastTap < 320 && V.ui.lastTapId === u.id && B.canCommand(bt, u)) { V.selectSimilar(u); V.ui.lastTap = 0; return; }
    V.ui.lastTap = now; V.ui.lastTapId = u.id;
    if (V.ui.multi && B.canCommand(bt, u)) { V.ui.sel.has(u.id) ? V.ui.sel.delete(u.id) : V.ui.sel.add(u.id); V.renderPanel(); return; }
    V.select([u.id]); return;
  }
  if (u && u.side !== 0) {
    const cmd = V.selUnits().filter(x => B.canCommand(bt, x));
    if (cmd.length) { V.orderAttack(u); return; }
    V.select([u.id]); return;
  }
  if (V.selUnits().some(x => B.canCommand(bt, x))) { V.orderMove(wx, wy); return; }
  V.select([]);
};
V.longPress = (sx, sy) => {
  const u = V.hit(sx, sy);
  if (u && u.side === 0 && B.canCommand(V.bt, u)) { V.ui.sel.has(u.id) ? V.ui.sel.delete(u.id) : V.ui.sel.add(u.id); V.renderPanel(); V.toast('複数選択'); if (navigator.vibrate) try { navigator.vibrate(15); } catch (e) {} }
};
V.orderAt = (sx, sy) => { const u = V.hit(sx, sy); const [wx, wy] = V.s2w(sx, sy); if (u && u.side !== 0) V.orderAttack(u); else V.orderMove(wx, wy); };
V.selUnits = () => [...V.ui.sel].map(id => V.bt.units[id]).filter(u => u && B.alive(u));
V.cmdUnits = () => V.selUnits().filter(u => B.canCommand(V.bt, u));
V.select = (ids) => { V.ui.sel = new Set(ids); V.setMode(null); V.renderPanel(); };
V.selectSimilar = (u) => {
  const bt = V.bt;
  const ids = bt.units.filter(x => B.canCommand(bt, x) && x.cls === u.cls && x.state !== 'rout').map(x => x.id);
  V.ui.sel = new Set(ids); V.renderPanel(); V.toast(`${{ inf: '歩兵', rng: '射撃', cav: '騎兵', chr: '戦車', sie: '攻城' }[u.cls]}をまとめて選択`);
};
V.orderMove = (wx, wy) => {
  const bt = V.bt, us = V.cmdUnits();
  if (!us.length) return;
  const cx = U.avg(us, u => u.x), cy = U.avg(us, u => u.y);
  const face = B.angTo(wx - cx, wy - cy);
  let courier = 0;
  for (const u of us) {
    let tx = wx, ty = wy;
    if (us.length > 1) { tx = wx + (u.x - cx); ty = wy + (u.y - cy); }
    tx = U.clamp(tx, 2, bt.W - 2); ty = U.clamp(ty, 2, bt.H - 2);
    if (V.ui.deploy) { V.deployMove(u, tx, ty); continue; }
    if (B.command(bt, u, { type: 'move', x: tx, y: ty, face }) === 'courier') courier++;
  }
  B.fx(bt, { k: 'clash', x: wx, y: wy });
  if (courier) V.toast(`伝令を走らせた（${courier}隊）`);
};
V.orderAttack = (e) => {
  const bt = V.bt, us = V.cmdUnits();
  let courier = 0;
  for (const u of us) if (B.command(bt, u, { type: 'attack', target: e.id }) === 'courier') courier++;
  if (us.length) V.toast(`${B.unitName(bt, e)}を攻撃${courier ? '（伝令）' : ''}`);
};
V.applyZone = (x, y, r) => {
  const bt = V.bt;
  const us = V.cmdUnits().filter(u => u.ut.range || u.horseArch);
  if (!us.length) { V.setMode(null); return; }
  for (const u of us) {
    const R = B.range(bt, u);
    const rr = U.clamp(r || R * 0.45, 10 * bt.p, R * 0.8);
    let zx = x, zy = y;
    const d = U.dist(u.x, u.y, x, y);
    if (d > R) { zx = u.x + (x - u.x) / d * R * 0.9; zy = u.y + (y - u.y) / d * R * 0.9; }
    B.setOrder(bt, u, { type: 'zone', x: zx, y: zy, r: rr });
  }
  V.setMode(null);
  V.toast('射撃区域を設定した');
};
V.setMode = (m, hint) => {
  V.ui.mode = m;
  const h = U.$('#bt-hint');
  if (!h) return;
  if (m) { h.hidden = false; h.textContent = hint || { attack: '攻撃する敵をタップ', move: '移動先をタップ', zone: '射撃区域：中心をタップ（ドラッグで大きさ）', skillpt: '戦法の目標をタップ' }[m] || ''; }
  else h.hidden = true;
};
V.toast = (s) => { const el = U.$('#bt-hint'); if (!el || V.ui.mode) return; el.hidden = false; el.textContent = s; clearTimeout(V._toastT); V._toastT = setTimeout(() => { if (!V.ui.mode) el.hidden = true; }, 1600); };

/* ---------------- 布陣 ---------------- */
V.canDeployMove = (u) => {
  const bt = V.bt;
  if (!B.canCommand(bt, u) || u.onwall != null) return false;
  if (bt.spec.role === 'unit') return false;
  return true;
};
V.deployZone = (u) => {
  const bt = V.bt;
  if (bt.city && bt.city.side === 0) return { x0: bt.city.x0, x1: bt.city.x1, y0: bt.city.y0, y1: bt.city.y1 };
  // 攻城・関所：自動配置は城の手前まで寄っているので、範囲も城壁の少し手前まで
  if (bt.city) { const wallY = bt.city.side === 1 ? bt.city.y1 : bt.city.y0; return { x0: 0, x1: bt.W, y0: Math.min(bt.H * 0.6, wallY + bt.H * 0.1), y1: bt.H }; }
  return { x0: 0, x1: bt.W, y0: bt.H * 0.6, y1: bt.H };
};
V.deployMove = (u, x, y) => {
  const bt = V.bt, z = V.deployZone(u);
  x = U.clamp(x, z.x0 + u.w / 2, z.x1 - u.w / 2); y = U.clamp(y, z.y0 + u.h / 2, z.y1 - u.h / 2);
  if (!B.passable(bt, B.ti(bt, x, y), u.mv, u.side)) return;
  u.x = x; u.y = y; u.home = { x, y, a: u.a };
  if (u.hidden && !B.canHide(bt, u)) u.hidden = false;
};
V.showDeploy = (can) => {
  const bt = V.bt, el = U.$('#bt-deploy');
  el.hidden = false;
  U.$('#scr-battle').classList.add('briefing');   // 軍議の札の間は下の板を隠して地図を見せる
  const sd = bt.sides[0], foe = bt.sides[1];
  const intel = [];
  const foeCmd = foe.cmd ? `${foe.cmd.n}（${{ ins: '本能型', chi: '知略型', bal: '均衡型' }[foe.cmd.st] || ''}${foe.cmd.pers && typeof PPL !== 'undefined' ? '・用兵は' + PPL.persName(foe.cmd.pers) : ''}）` : '不明';
  intel.push(`敵将：${foeCmd}`);
  if (bt.spec.friends && bt.spec.friends.length) intel.push(`駆けつけた友：${bt.spec.friends.join('・')}`);
  intel.push(`敵兵力：約${U.fmt(foe.start)}　味方：${U.fmt(sd.start)}`);
  intel.push(`地勢：${D.TERRAIN_THEME[bt.spec.theme]?.n || ''}${bt.city ? (bt.city.pass ? '・峠の砦' : '・城') : ''}${bt.maxDays > 1 ? `・最大${bt.maxDays}日` : ''}`);
  if (bt.feat && bt.feat.field && bt.spec.field) { const fa = bt.spec.field.a; intel.push(`戦場：${bt.feat.field.n}（地の利は${fa === 0 ? 'こちら' : '敵'}${bt.spec.field.how === 'none' ? '・守る側' : ''}）`); }
  intel.push(`天候：${D.WEATHER[bt.weather]?.n || '晴れ'}`);
  if (sd.tactics.length) intel.push(`戦術：${sd.tactics.map(t => D.TACTICS[t].n).join('・')}`);
  const own = bt.units.filter(u => u.side === 0 && u.mine && !u.escort && u.sq && B.alive(u));
  if (own.length) intel.push(`自軍：${own.slice(0, 6).map(u => `${u.ld ? u.ld.n : ''}（${D.UT[u.t].n}${U.fmt(u.n)}）`).join('・')}${own.length > 6 ? ` ほか${own.length - 6}隊` : ''}`);
  const pre = bt.units.filter(u => u.side === 0 && u.preDlg && B.alive(u));
  if (pre.length) { const names = [...new Set(pre.map(u => u.preDlg.dep.n))]; intel.push(`任せた隊：${names.join('・')}の${pre.length}隊（開戦と同時に動く）`); }
  const role = bt.spec.role;
  const roleMsg = role === 'watch' ? '観戦：両軍ともAIが指揮する。' : role === 'unit' ? '上官の隊の最前列に付いている。命令を待つか、独断で動け。' : role === 'gunshi' ? '総軍師として全軍に指示を出せる。' : '総大将として全軍を指揮する。';
  const cmdA = sd.cmd && !sd.bandit && !sd.nomad ? PORT.tag(Object.assign({ c: sd.c }, sd.cmd), 48) : '', cmdB = foe.cmd && !foe.bandit && !foe.nomad ? PORT.tag(Object.assign({ c: foe.c }, foe.cmd), 48) : '';
  el.innerHTML = `
    <div class="dep-in">
      <div class="dep-h">${bt.spec.title}</div>
      <div class="dep-vs"><div class="dep-side">${cmdA}<div><b>${U.esc(sd.name)}</b><small>${U.esc(sd.cmd ? sd.cmd.n : '')}　${U.fmt(sd.start)}</small></div></div><span class="dep-x">対</span><div class="dep-side r"><div><b>${U.esc(foe.name)}</b><small>${U.esc(foe.cmd ? foe.cmd.n : '')}　約${U.fmt(foe.start)}</small></div>${cmdB}</div></div>
      <div class="dep-intel">${intel.map(s => `<span>${U.esc(s)}</span>`).join('')}</div>
      <p class="dep-role">${roleMsg}${can && role !== 'unit' ? '<br>「布陣へ」で地図を広く出し、部隊を置き直せる。森の部隊は「伏兵」にできる。' : ''}</p>
      <div class="dep-btns">
        ${can && role !== 'unit' && role !== 'watch' ? '<button class="btn sm" id="dep-gungi" title="準備する戦術を選ぶ">軍議（戦術）</button>' : ''}
        ${can && role !== 'unit' ? '<button class="btn seal" id="dep-place">布陣へ</button><button class="btn sm" id="dep-go">このまま開戦</button>' : '<button class="btn seal" id="dep-go">開戦</button>'}
      </div>
    </div>`;
  PORT.fill(el);
  const g = U.$('#dep-gungi'); if (g) g.onclick = V.gungi;
  const pl = U.$('#dep-place'); if (pl) pl.onclick = () => V.enterPlace();
  U.$('#dep-go').onclick = () => V.beginBattle();
  if (!can) { /* 観戦のみ */ }
};
/* ---------------- 布陣のターン ---------------- */
// 平面の地図で布陣する（3D の設定は保存せず、開戦時に戻す）
V.planView = (on) => {
  if (on) {
    if (V.ui.view3dPrev == null) V.ui.view3dPrev = V.ui.view3d;
    if (V.ui.view3d) { V.ui.view3d = false; if (typeof V3 !== 'undefined') V3.follow = false; V.cam.z = V.zBase || V.cam.z; V.clampCam(); }
  } else if (V.ui.view3dPrev != null) {
    const back = V.ui.view3dPrev; V.ui.view3dPrev = null;
    if (back && !V.ui.view3d) { V.ui.view3d = true; if (typeof V3 !== 'undefined') { try { V3.fit(); } catch (e) { console.warn(e); V.ui.view3d = false; } } }
  }
  if (V.updViewBtn) V.updViewBtn();
};
V.enterPlace = () => {
  const bt = V.bt; if (!bt || !V.ui.deploy) return;
  V.ui.placing = true; V.ui.placeKey = null;
  U.$('#bt-deploy').hidden = true;
  U.$('#scr-battle').classList.remove('briefing');
  U.$('#scr-battle').classList.add('placing');
  U.$('#bt-place').hidden = false;
  V.setMode(null);
  V.planView(true);
  const me = bt.units.find(u => u.me && B.alive(u));
  if (!V.ui.sel.size && me && B.canCommand(bt, me)) V.select([me.id]); else V.renderPanel();
  V.fitPlace();   // 帯の高さが決まってから合わせる
};
V.leavePlace = () => {
  if (!V.ui.placing) return;
  V.ui.placing = false; V.ui.multi = false;
  U.$('#scr-battle').classList.remove('placing');
  U.$('#bt-place').hidden = true;
  V.planView(false);
  V.renderGroups();
};
// 布陣できる範囲が帯の間に収まるようにカメラを合わせる
V.fitPlace = () => {
  const bt = V.bt, root = U.$('#scr-battle');
  const z = V.deployZone(bt.units.find(u => u.me) || bt.units[0]);
  const topH = (U.$('.pl-top') || {}).offsetHeight || 64, botH = (U.$('.pl-bot') || {}).offsetHeight || 124;
  root.style.setProperty('--place-h', botH + 'px');
  const zh = z.y1 - z.y0;
  const y0 = Math.max(0, z.y0 - zh * 0.35), y1 = z.y1;   // 敵の側も少し見せる
  const freeW = Math.max(120, V.vw - 16), freeH = Math.max(120, V.vh - topH - botH - 16);
  const zoom = U.clamp(Math.min(freeW / (z.x1 - z.x0), freeH / (y1 - y0)), V.zMin, V.zMax);
  V.cam.z = zoom; V.cam.x = (z.x0 + z.x1) / 2;
  // 範囲＋敵側の余白を帯の間の中央に。地図の下端が帯より上に来るなら、下端を帯に揃えて上の余りに地図を見せる
  V.cam.y = (y0 + y1) / 2 - (topH - botH) / (2 * zoom);
  const want = V.vh - botH - 8, bottomPx = (bt.H - V.cam.y) * zoom + V.vh / 2;
  if (bottomPx < want) V.cam.y -= (want - bottomPx) / zoom;
  V.ui.follow = false;
  V.clampCam();
};
// 選んだ隊を、タップした所へ（複数なら並びを保って）
V.placeAt = (us, wx, wy) => {
  const bt = V.bt;
  const cx = U.avg(us, u => u.x), cy = U.avg(us, u => u.y);
  let moved = 0;
  for (const u of us) {
    const tx = us.length > 1 ? wx + (u.x - cx) : wx, ty = us.length > 1 ? wy + (u.y - cy) : wy;
    const bx = u.x, by = u.y;
    V.deployMove(u, U.clamp(tx, 2, bt.W - 2), U.clamp(ty, 2, bt.H - 2));
    if (u.x !== bx || u.y !== by) moved++;
  }
  if (moved) { B.fx(bt, { k: 'clash', x: wx, y: wy }); V.ui.placeKey = null; V.renderPanel(); }
  else V.toast('そこには置けない（範囲の外か、通れない地形）');
};
V.resetDeploy = () => {
  const bt = V.bt; if (!bt || !V.dep0) return;
  let n = 0;
  for (const d of V.dep0) { const u = bt.units[d.id]; if (!u || !B.alive(u) || !V.canDeployMove(u)) continue; u.x = d.x; u.y = d.y; u.a = d.a; u.home = { x: d.x, y: d.y, a: d.a }; if (u.hidden && !B.canHide(bt, u)) u.hidden = false; n++; }
  V.ui.placeKey = null; V.renderPanel();
  V.toast(n ? '開戦前の配置に戻した' : '戻せる隊がない');
};
V.CLS_COLOR = { inf: '#c9c0a0', rng: '#8fc0a9', cav: '#e0ac4a', chr: '#d08a5a', sie: '#a08a5a', nav: '#8db8cf' };
V.renderPlace = (soft) => {
  const bt = V.bt; if (!bt || !V.ui.placing) return;
  const own = bt.units.filter(u => u.side === 0 && B.alive(u) && B.canCommand(bt, u) && !u.escort);
  const sel = V.selUnits(), can = sel.filter(x => B.canCommand(bt, x));
  const one = can.length === 1 ? can[0] : null;
  const key = own.map(u => `${u.id}:${u.n}${u.hidden ? 'h' : ''}${u.form}${u.onwall != null ? 'w' : ''}`).join(',') + '|' + [...V.ui.sel].join(',') + '|' + (one && B.canMerge(bt, one) ? 'm' : '') + (V.ui.multi ? 'M' : '');
  if (soft && key === V.ui.placeKey) return;
  V.ui.placeKey = key;
  // 上の帯：選んだ隊の要約か、やり方
  const hint = U.$('#pl-hint');
  if (one) hint.textContent = `${B.unitName(bt, one)}　${U.fmt(one.n)}人・${D.FORM[one.form].n}${one.hidden ? '・伏兵' : ''}${one.onwall != null ? '・城壁の上（動かせない）' : ''}　→ 置きたい所をタップ`;
  else if (can.length > 1) hint.textContent = `${can.length}隊を選択　→ 置きたい所をタップ（並びを保って動く）`;
  else hint.textContent = '部隊をタップして選び、置きたい所をタップ。指で引いても動く。長押しで複数選択';
  // 自分の隊の札
  const chips = U.$('#pl-units');
  chips.innerHTML = own.map(u => `<button class="chip ${V.ui.sel.has(u.id) ? 'on' : ''}" data-id="${u.id}" title="${U.esc(D.UT[u.t].n)}"><em class="ty" style="background:${V.CLS_COLOR[u.cls] || '#cfc6ae'}">${D.utAb(u.t)}</em>${U.esc(u.ld ? u.ld.n : D.UT[u.t].n)}<small>${U.fmt(u.n)}${u.hidden ? '・伏' : ''}${u.onwall != null ? '・壁' : ''}</small></button>`).join('') + `<button class="chip ${V.ui.multi ? 'on' : ''}" data-id="multi" title="タップで複数選択">複数</button>`;
  for (const b of U.$$('.chip', chips)) b.onclick = () => {
    if (b.dataset.id === 'multi') { V.ui.multi = !V.ui.multi; V.ui.placeKey = null; V.renderPanel(); return; }
    const u = bt.units[+b.dataset.id]; if (!u) return;
    if (V.ui.multi) { V.ui.sel.has(u.id) ? V.ui.sel.delete(u.id) : V.ui.sel.add(u.id); V.ui.placeKey = null; V.renderPanel(); return; }
    V.select([u.id]);
    // 画面の外なら寄せる
    const [sx, sy] = V.w2s(u.x, u.y); if (sx < 0 || sy < 0 || sx > V.vw || sy > V.vh) { V.cam.x = u.x; V.cam.y = u.y; V.clampCam(); }
  };
  const on = U.$('.chip.on', chips); if (on && on.scrollIntoView) { try { on.scrollIntoView({ inline: 'nearest', block: 'nearest' }); } catch (e) {} }
  // 命令（布陣中に意味のあるものだけ）
  const acts = U.$('#pl-acts');
  const btns = [];
  const add = (k, label, sub, opt = {}) => btns.push(`<button class="cmd ${opt.cls || ''}" data-k="${k}" title="${U.esc(opt.tip || '')}">${label}${sub ? `<small>${U.esc(sub)}</small>` : ''}</button>`);
  if (can.length) {
    if (can.some(x => !x.ut.fixed)) add('form', '陣形', one ? D.FORM[one.form].n : '', { tip: '陣形を変える' });
    if (can.some(x => B.canHide(bt, x)) && (bt.sides[0].tactics.includes('fukuhei') || can.some(x => B.F(x, 'ambush') > 0))) add('hide', '伏兵', '', { tip: '森や草地に潜ませる' });
    if (one && !one.wu && one.n >= 10 && !one.ut.fixed) add('split', '分割', '', { tip: '隊を二つに分けて別動隊を作る' });
    if ((one && B.canMerge(bt, one)) || (can.length === 2 && B.mergeTargets(bt, can[0]).includes(can[1]))) add('merge', '結合', '', { tip: '分けた隊を一つに戻す' });
    if (bt.walls && bt.city && bt.city.side === 0 && can.some(x => x.cls === 'rng' && x.onwall == null)) add('wall', '城壁へ', '', { tip: '近くの城壁に上げる' });
  }
  acts.innerHTML = btns.join('') || `<span class="pl-note">${own.length ? '部隊を選ぶと陣形・伏兵・分割などを変えられる' : '動かせる部隊がない'}</span>`;
  for (const b of U.$$('.cmd', acts)) b.onclick = () => V.cmd(b.dataset.k);
};
// 2D：布陣できる範囲（布陣中は範囲の外を少し暗くする）
V.drawDeployZone = () => {
  const bt = V.bt, ctx = V.ctx;
  if (!V.ui.deploy || !bt.sides[0].player || bt.spec.role === 'unit') return;
  const z = V.deployZone(bt.units.find(u => u.me) || bt.units[0]);
  const [x0, y0] = V.w2s(z.x0, z.y0), [x1, y1] = V.w2s(z.x1, z.y1);
  if (V.ui.placing) {
    ctx.fillStyle = 'rgba(6,10,8,0.3)';
    ctx.beginPath(); ctx.rect(0, 0, V.vw, V.vh); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.fill('evenodd');
  }
  ctx.strokeStyle = 'rgba(98,179,155,.85)'; ctx.setLineDash([8, 6]); ctx.lineWidth = 2;
  ctx.strokeRect(x0, y0, x1 - x0, y1 - y0); ctx.setLineDash([]);
  if (V.ui.placing) {
    ctx.fillStyle = 'rgba(98,179,155,.95)'; ctx.font = '12px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('布陣できる範囲', x0 + 8, Math.max(4, y0 + 6));
    // 敵のいる向き
    const foeY = bt.city && bt.city.side !== 0 ? (bt.city.side === 1 ? bt.city.y1 : bt.city.y0) : bt.H * 0.26;
    const [, fy] = V.w2s(bt.W / 2, foeY);
    if (fy < y0 - 16 && !(bt.city && bt.city.side === 0)) { ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(240,179,165,.9)'; ctx.fillText('▲ 敵陣はこちら', (x0 + x1) / 2, Math.max(4, y0 - 20)); }
  }
};
// 開戦（軍議の札からも、布陣のターンからも）
V.beginBattle = async () => {
  const bt = V.bt, el = U.$('#bt-deploy');
  if (!bt || bt.started || V.ui.starting) return;
  V.ui.starting = true;
  if (V.ui.placing) V.leavePlace();
  el.hidden = true; V.ui.deploy = false;
  U.$('#scr-battle').classList.remove('briefing');
  {
    const sdA = bt.sides[0], sdB = bt.sides[1];
    if (UI.CUTIN_ON() && sdA.cmd && sdB.cmd && !sdB.bandit && !sdB.nomad) {
      V.ui.cutin = true;
      await UI.cutin({ kind: 'clash', a: Object.assign({ c: sdA.c }, sdA.cmd), b: Object.assign({ c: sdB.c }, sdB.cmd), title: bt.spec.title || '開戦', sub: `${sdA.name} ${U.fmt(sdA.start)}　対　${sdB.name} ${U.fmt(sdB.start)}`, snd: 'drums' });
      V.ui.cutin = false;
    }
    if (UI.CUTIN_ON() && bt.spec.friends && bt.spec.friends.length) {
      V.ui.cutin = true;
      const fu = bt.units.find(u => u.side === 0 && u.ld && bt.spec.friends.includes(u.ld.n));
      await UI.cutin({ kind: 'single', a: fu ? Object.assign({ c: sdA.c }, fu.ld) : Object.assign({ c: sdA.c }, sdA.cmd), ea: 'joy', title: `${bt.spec.friends.join('・')}、駆けつける！`, sub: '恩義ある友が兵を率いて加わった', snd: 'horn', dur: 2000 });
      V.ui.cutin = false;
    }
    B.start(bt);
    for (const u of bt.units) u.home = { x: u.x, y: u.y, a: u.a };
    V.ui.last = performance.now();
    V.setSpeed(V.ui.speed);
    B.logMsg(bt, '開戦！');
    B.text(bt, bt.W / 2, bt.H / 2, '開戦', 'info');
  }
};
V.gungiSlots = () => B.slots(V.bt, 0);
V.gungi = async () => {
  const bt = V.bt;
  const all = (bt.sides[0].known || bt.sides[0].tactics).slice();
  const slots = bt.sides[0].slots || V.gungiSlots();
  const chosen = new Set(bt.sides[0].tactics.filter(t => all.includes(t)).slice(0, slots));
  const ctx = bt.city ? (bt.city.side === 0 ? '守城戦' : '攻城戦') : '野戦';
  const res = await UI.multiPick({
    title: '軍議', body: `準備する戦術を選ぶ（最大${slots}つ）。準備していない戦術は使えない。\n${ctx}・天候${D.WEATHER[bt.weather]?.n || '晴れ'}`,
    items: D.TACTIC_ORDER.filter(t => all.includes(t)).map(t => ({ v: t, label: D.TACTICS[t].n, sub: D.TACTICS[t].d, g: D.TACTIC_CATS[D.TACTICS[t].cat], dim: (D.TACTICS[t].cat === 'siegeA' && !(bt.city && bt.city.side === 1)) || (D.TACTICS[t].cat === 'siegeD' && !(bt.city && bt.city.side === 0)) })),
    max: slots, chosen: [...chosen],
  });
  if (!res) return;
  B.setTactics(bt, 0, res);
  if (res.includes('kanchou')) { for (const u of bt.units) if (u.side === 1) { u.vis[0] = true; if (u.hidden) B.reveal(bt, u); } B.logMsg(bt, '間諜が敵の布陣と伏兵を探り出した。', 'good'); }
  V.toast(`戦術：${res.map(t => D.TACTICS[t].n).join('・') || 'なし'}`);
  V.showDeploy(true);
  V.renderPanel();
};

/* ---------------- HUD ---------------- */
V.hud = () => {
  const bt = V.bt;
  U.$('#bt-clock').textContent = `${bt.day}日目 ${V.timeLabel(bt.time - (bt.day - 1) * bt.dayLen)}`;
  for (let s = 0; s < 2; s++) {
    const n = B.strength(bt, s);
    const us = bt.units.filter(u => u.side === s && B.active(u));
    const mor = us.length ? U.sum(us, u => u.mor * u.n) / Math.max(1, U.sum(us, u => u.n)) : 0;
    U.$('#bt-n' + s).textContent = (s === 1 && !bt.units.some(u => u.side === 1 && u.vis[0]) && bt.spec.role !== 'watch' ? '?' : U.fmt(n));
    const bar = U.$('#bt-m' + s); bar.style.width = U.clamp(mor, 0, 100) + '%'; bar.style.background = V.morColor(mor);
  }
  const cpw = U.$('#bt-cpwrap');
  const me = bt.units.find(u => u.me);
  const cp = bt.myCp != null ? bt.myCp : bt.sides[0].cp;
  if (bt.spec.role === 'watch') cpw.hidden = true; else { cpw.hidden = false; U.$('#bt-cp').style.width = cp + '%'; U.$('#bt-cpn').textContent = Math.floor(cp); }
  const ord = U.$('#bt-order');
  if (bt.spec.role === 'unit' && bt.bossMsg) { ord.hidden = false; const par = bt.units.find(u => u.parentOfMe); ord.innerHTML = `<b>${U.esc(par && par.ld ? par.ld.n : '上官')}</b>「${U.esc(bt.bossMsg)}」${me && me.attach == null && B.alive(me) ? '<button class="btn sm" id="bt-rejoin">隊に戻る</button>' : ''}`; const rj = U.$('#bt-rejoin'); if (rj) rj.onclick = () => { if (par) B.setOrder(bt, me, { type: 'rejoin', parent: par.id }); }; }
  else ord.hidden = true;
  // ログ
  const log = U.$('#bt-log');
  const top = bt.log.slice(0, 4);
  const key = top.map(l => l.s).join('|');
  if (key !== V.ui.logKey) { V.ui.logKey = key; log.innerHTML = top.map((l, i) => `<div class="${l.kind}" style="opacity:${1 - i * 0.2}">${U.esc(l.s)}</div>`).join(''); }
  V.renderPanel(true);
};
V.renderGroups = () => {
  const bt = V.bt, el = U.$('#bt-groups');
  if (bt.spec.role === 'watch') { el.innerHTML = '<span class="chip-note">観戦中</span>'; return; }
  const cmdable = bt.units.filter(u => B.canCommand(bt, u));
  const groups = [];
  const me = bt.units.find(u => u.me);
  if (me) groups.push(['me', '本隊', [me.id]]);
  if (cmdable.length > 1) groups.push(['all', '全軍', cmdable.map(u => u.id)]);
  for (const [k, n] of [['inf', '歩'], ['rng', '弓'], ['cav', '騎'], ['chr', '車'], ['sie', '攻']]) { const ids = cmdable.filter(u => u.cls === k).map(u => u.id); if (ids.length && cmdable.length > 1) groups.push([k, n, ids]); }
  if (bt.sides[0].cmdAll) for (const [k, n] of [['left', '左翼'], ['front', '中央'], ['right', '右翼'], ['reserve', '予備']]) { const ids = cmdable.filter(u => (u.grp === k) || (k === 'front' && u.grp === 'archer')).map(u => u.id); if (ids.length) groups.push([k, n, ids]); }
  el.innerHTML = groups.map(([k, n]) => `<button class="chip" data-g="${k}">${n}</button>`).join('') + `<button class="chip ${V.ui.multi ? 'on' : ''}" data-g="multi" title="タップで複数選択">複数</button><button class="chip ${V.ui.morView ? 'on' : ''}" data-g="mor">士気</button>`;
  for (const b of U.$$('.chip', el)) b.onclick = () => {
    const g = b.dataset.g;
    if (g === 'multi') { V.ui.multi = !V.ui.multi; V.renderGroups(); return; }
    if (g === 'mor') { V.ui.morView = !V.ui.morView; V.renderGroups(); return; }
    const gr = groups.find(x => x[0] === g); if (!gr) return;
    const ids = gr[2].filter(id => B.alive(bt.units[id]));
    V.select(ids);
    if (g === 'me' && me) V.centerOn(me);
  };
};
V.stateName = (u) => {
  if (u.state === 'rout') return '潰走中';
  if (u.hidden) return '伏兵';
  if (u.state === 'onwall') return '城壁守備';
  if (u.state === 'climb') return '攀城中';
  if (u.state === 'ram') return '破城中';
  if (u.state === 'disengage') return u.feintT > V.bt.time ? '偽退' : '離脱中';
  if (u.eng.length) return u.chaos ? '乱戦' : '交戦';
  if (u.order) return { move: '移動', attack: '攻撃', charge: '突撃', hold: '守備', rearguard: '殿', retreat: '退却', follow: '追従', climb: '攀城へ', ramgate: '城門へ' }[u.order.type] || '行動';
  if (u.attach != null) return '上官に随伴';
  if (u.delegate) return `委任（${{ attack: '攻勢', defend: '守勢', flank: '遊撃', follow: '追従' }[u.delegate.mode] || ''}）`;
  return '待機';
};
V.renderPanel = (soft) => {
  const bt = V.bt; if (!bt) return;
  if (V.ui.placing) V.renderPlace(soft);
  const sel = V.selUnits();
  const box = U.$('#bt-sel'), cmds = U.$('#bt-cmds');
  if (!sel.length) {
    if (!soft || V.ui.panelKey !== 'none') {
      V.ui.panelKey = 'none';
      box.innerHTML = `<div class="sel-empty">${bt.spec.role === 'watch' ? '部隊をタップすると詳細が見られる。' : '自分の部隊をタップして選択。空き地をタップで移動、敵をタップで攻撃。二本指で拡大。'}</div>`;
      cmds.innerHTML = '';
    }
    return;
  }
  const u = sel[0];
  const multi = sel.length > 1;
  const key = sel.map(x => x.id).join(',') + '|' + (multi ? '' : u.state + u.form + (u.order ? u.order.type : '') + (u.delegate ? 'd' : '') + (u.hidden ? 'h' : '') + (u.zone ? 'z' : '') + (u.side === 0 && B.canMerge(bt, u) ? 'm' : '') + Math.round(B.cpOf(bt, u) / 5));
  // 数値は毎回更新、ボタンはキー変化時のみ
  if (multi) {
    const n = U.sum(sel, x => x.n), mor = U.sum(sel, x => x.mor * x.n) / Math.max(1, n);
    box.innerHTML = `<div class="sel-h"><b>${sel.length}隊を選択</b><span>${U.fmt(n)}人　士気${Math.round(mor)}</span></div>`;
  } else {
    const ld = u.ld;
    const own = u.side === 0;
    const wu = u.wu ? u.cells.filter(c => c.wi != null).map(c => { const w = c.wi === -1 ? { n: (u.ld && u.ld.n) || '主人公', kills: 0 } : u.wu[c.wi]; return `<span class="wu ${c.n <= 0 ? 'down' : ''}"><i style="background:${V.morColor(c.mor)}"></i>${U.esc(w.n)}${w.kills ? `<em>${w.kills}</em>` : ''}</span>`; }).join('') : '';
    const lostWu = u.wu ? u.wu.filter(w => w.dead).map(w => `<span class="wu down">✕${U.esc(w.n)}</span>`).join('') : '';
    box.innerHTML = `
      <div class="sel-h">${ld && !ld.ret ? PORT.tag(Object.assign({ c: bt.sides[u.side].c }, ld), 34) : ''}<b>${U.esc(B.unitName(bt, u))}</b><span class="st">${V.stateName(u)}</span></div>
      <div class="sel-row">
        <div class="sel-stats">
          <span>兵 <b>${U.num(u.n)}</b>/${U.num(u.n0)}</span>
          <span>士気 <b style="color:${V.morColor(u.mor)}">${Math.round(u.mor)}</b></span>
          <span>${D.FORM[u.form].n}</span>
          ${ld ? `<span>武${ld.bu} 統${ld.tou} 知${ld.chi}</span>` : ''}
          ${u.ut.range || u.horseArch ? `<span>矢 ${u.ammo}</span>` : ''}
          <span>練度${Math.round(u.tr)}</span>
          ${u.fat > 0.3 ? `<span class="warn">疲労${Math.round(u.fat * 100)}</span>` : ''}
        </div>
        <canvas class="sel-grid" width="132" height="56" aria-label="伍ごとの士気"></canvas>
      </div>
      ${wu || lostWu ? `<div class="sel-wu">${wu}${lostWu}</div>` : ''}`;
    const cg = U.$('.sel-grid', box);
    if (cg && (own || bt.spec.role === 'watch' || u.vis[0])) V.drawCellGrid(cg, u);
    PORT.fill(box);
  }
  if (soft && V.ui.panelKey === key) return;
  V.ui.panelKey = key;
  // コマンド
  const can = sel.filter(x => B.canCommand(bt, x));
  if (!can.length) { cmds.innerHTML = u.side === 0 && bt.spec.role === 'unit' ? '<div class="sel-note">上官の部隊（命令はできない）</div>' : ''; return; }
  const btns = [];
  const add = (k, label, opt = {}) => btns.push(`<button class="cmd ${opt.cls || ''}" data-k="${k}" ${opt.dis ? 'disabled' : ''} title="${U.esc(opt.tip || '')}">${label}</button>`);
  const anyEng = can.some(x => x.eng.length);
  const anyRng = can.some(x => x.ut.range || x.horseArch);
  const one = can.length === 1 ? can[0] : null;
  add('attack', '攻撃');
  add('charge', '突撃', { tip: '目の前の敵へ全速で突っ込む' });
  add('hold', '停止');
  add('form', '陣形');
  add('dis', '離脱', { dis: !anyEng, tip: '乱戦から抜け出す（背中を討たれやすい）' });
  add('rg', '殿', { tip: '退く味方を守るために踏みとどまる' });
  if (anyRng) add('zone', can.some(x => x.zone) ? '区域解除' : '射撃区域');
  if (can.some(x => B.canHide(bt, x)) && (bt.sides[0].tactics.includes('fukuhei') || can.some(x => B.F(x, 'ambush') > 0))) add('hide', '伏兵');
  if (one && B.skillsOf(bt, one).length) add('skill', '戦法', { cls: 'em' });
  if (one && one.me) {
    const near = bt.units.filter(e => e.side === 1 && B.alive(e) && B.canDuel(bt, one, e));
    add('duel', '一騎打ち', { dis: !near.length, cls: 'em', tip: '近くの敵将に一騎打ちを挑む' });
  }
  if (one && !one.wu && one.n >= 10 && !one.ut.fixed) add('split', '分割', { tip: '隊を二つに分けて別動隊を作る' });
  if ((one && B.canMerge(bt, one)) || (can.length === 2 && B.mergeTargets(bt, can[0]).includes(can[1]))) add('merge', '結合', { tip: '分けた隊を一つに戻す（近くの本隊・別動隊と合流）' });
  if (bt.walls) {
    if (can.some(x => x.cls === 'inf' && bt.city.side !== 0)) add('climb', '攀城');
    if (can.some(x => x.t === 'ram')) add('ram', '破城');
    if (bt.city.side === 0 && can.some(x => x.cls === 'rng')) add('wall', '城壁へ');
  }
  add('dlg', can.some(x => x.delegate) ? '委任解除' : '委任', { tip: '副官に任せてAIで戦わせる' });
  add('back', '退却', { tip: 'この部隊を戦場から下げる' });
  if (one && bt.spec.role === 'unit') { const par = bt.units.find(x => x.parentOfMe); if (par && B.alive(par) && one.attach == null) add('rejoin', '隊に戻る'); }
  cmds.innerHTML = btns.join('');
  for (const b of U.$$('.cmd', cmds)) b.onclick = () => V.cmd(b.dataset.k);
};
V.drawCellGrid = (cv, u) => {
  const g = cv.getContext('2d'); const W = cv.width, H = cv.height;
  g.clearRect(0, 0, W, H);
  const cols = u.cols, rows = u.rows;
  const cw = Math.min(W / cols, 18), ch = Math.min(H / rows, 14);
  const ox = (W - cw * cols) / 2, oy = (H - ch * rows) / 2;
  for (const c of u.cells) {
    if (c.n <= 0) continue;
    g.fillStyle = V.morColor(c.mor);
    g.fillRect(ox + c.c * cw + 0.5, oy + c.r * ch + 0.5, cw - 1, ch - 1);
    if (c.wi === -1) { g.strokeStyle = '#f3d27a'; g.lineWidth = 1.5; g.strokeRect(ox + c.c * cw + 1, oy + c.r * ch + 1, cw - 2, ch - 2); }
  }
  g.fillStyle = 'rgba(235,227,205,0.65)'; g.fillRect(ox, oy - 2, cw * cols, 1.5);
};
V.cmd = async (k) => {
  const bt = V.bt, us = V.cmdUnits();
  if (!us.length) return;
  const p = bt.p;
  switch (k) {
    case 'attack': V.setMode('attack'); break;
    case 'charge': {
      if (us.some(u => B.foes(bt, 0).some(e => B.edgeDist(u, e) < 160 * p))) V.chargeCutin(us);
      for (const u of us) {
        const e = U.minBy(B.foes(bt, 0), e => B.dist(u, e));
        if (e && B.edgeDist(u, e) < 160 * p) B.command(bt, u, { type: 'charge', target: e.id });
        else { const [fx, fy] = B.fwd(u.a); B.command(bt, u, { type: 'move', x: u.x + fx * 80 * p, y: u.y + fy * 80 * p, run: true }); }
      }
      break;
    }
    case 'hold': for (const u of us) B.command(bt, u, { type: 'hold' }); break;
    case 'form': {
      const ld = us[0].ld || { tou: 40 };
      const tou = Math.max(...us.map(u => u.ld ? u.ld.tou : 40));
      const f = await UI.choose({ title: '陣形', body: `率いる将の統率で使える陣形が決まる（統率${tou}）。`, choices: D.FORM_ORDER.map(f => ({ v: f, label: D.FORM[f].n + (us.every(u => u.form === f) ? '（現在）' : ''), sub: `${D.FORM[f].desc}${D.FORM[f].req ? `　要統率${D.FORM[f].req}` : ''}`, disabled: D.FORM[f].req > tou })).concat([{ v: null, label: 'やめる' }]) });
      if (f) for (const u of us) if (!u.ut.fixed && D.FORM[f].req <= (u.ld ? u.ld.tou : 40) + 5) B.command(bt, u, { type: 'form', f });
      break;
    }
    case 'dis': for (const u of us) if (u.eng.length) B.command(bt, u, { type: 'disengage' }); break;
    case 'rg': for (const u of us) { B.command(bt, u, { type: 'rearguard' }); } V.toast('殿を務める'); break;
    case 'zone': if (us.some(u => u.zone)) { for (const u of us) u.zone = null; V.toast('射撃区域を解除'); } else V.setMode('zone'); break;
    case 'hide': { let n = 0; for (const u of us) if (B.canHide(bt, u)) { B.setOrder(bt, u, { type: 'ambush' }); n++; } V.toast(n ? '伏兵として潜ませた' : '隠れられる地形にいない'); break; }
    case 'skill': {
      const u = us[0];
      const sk = B.skillsOf(bt, u);
      const pick = await UI.choose({ title: `戦法（采配 ${Math.floor(B.cpOf(bt, u))}）`, choices: sk.map(k2 => ({ v: k2, label: `${D.SKILLS[k2].n}（${D.SKILLS[k2].cost}）`, sub: D.SKILLS[k2].d + ((u.cd[k2] || 0) > bt.time ? `　再使用まで${Math.ceil(u.cd[k2] - bt.time)}秒` : ''), disabled: !B.canSkill(bt, u, k2) })).concat([{ v: null, label: 'やめる' }]) });
      if (!pick) break;
      if (['kakei', 'kakei_t'].includes(pick)) { V.ui.skill = { u: u.id, k: pick }; V.setMode('skillpt', '火を放つ場所をタップ（森・草地）'); break; }
      if (pick === 'rakuseki') { const pts = bt.points.filter(pt => pt.type === 'hill' && pt.owner === 0 && !pt.used); if (!pts.length) { V.toast('確保した丘がない'); break; } B.useSkill(bt, u, pick, { point: pts[0].id }) || V.toast('使えない'); break; }
      if (pick === 'ikki' || pick === 'sogeki' || pick === 'konran' || pick === 'hien') { V.ui.skill = { u: u.id, k: pick }; V.setMode('skillpt', '狙う敵部隊をタップ'); break; }
      if (!B.useSkill(bt, u, pick)) V.toast('今は使えない');
      break;
    }
    case 'duel': {
      const u = us[0];
      const near = bt.units.filter(e => e.side === 1 && B.alive(e) && B.canDuel(bt, u, e));
      if (!near.length) break;
      const e = near.length === 1 ? near[0] : bt.units[await UI.choose({ title: '一騎打ちの相手', choices: near.map(e => ({ v: e.id, label: e.ld.n, sub: `武${e.ld.bu}` })) })];
      if (!e) break;
      const r = B.challenge(bt, u, e);
      if (r === 'refuse') V.toast(`${e.ld.n}は一騎打ちを避けた`);
      break;
    }
    case 'split': { const v = B.split(bt, us[0]); if (v) { V.select([us[0].id, v.id]); V.toast('隊を分けた（近づけて「結合」で戻せる）'); } break; }
    case 'merge': {
      const a = us[0];
      let tgts = B.mergeTargets(bt, a);
      if (us.length >= 2 && tgts.includes(us[1])) tgts = [us[1]];
      if (!tgts.length) { V.toast('近くに合流できる隊がいない'); break; }
      const v = tgts.length === 1 ? tgts[0] : bt.units[await UI.choose({ title: '合流する隊', body: '同じ隊から分かれた隊とだけ一つに戻せる。', choices: tgts.map(t => ({ v: t.id, label: B.unitName(bt, t), sub: `${U.num(t.n)}人　士気${Math.round(t.mor)}` })).concat([{ v: null, label: 'やめる' }]) })];
      if (!v) break;
      const k = B.merge(bt, a, v);
      if (k) { V.select([k.id]); V.toast(`隊を一つに戻した（${U.num(k.n)}人）`); }
      break;
    }
    case 'climb': {
      for (const u of us.filter(x => x.cls === 'inf')) {
        const w = U.minBy(bt.walls.filter(w => w.kind === 'wall' && w.side !== 0 && w.captured < 0), w => U.dist(w.x, w.y, u.x, u.y) * (w.tower ? 0.5 : 1));
        if (w) B.command(bt, u, { type: 'climb', wall: w.id });
      }
      break;
    }
    case 'ram': for (const u of us.filter(x => x.t === 'ram')) { const g = U.minBy(bt.walls.filter(w => w.kind === 'gate' && !w.broken && w.side !== 0), w => U.dist(w.x, w.y, u.x, u.y)); if (g) B.command(bt, u, { type: 'ramgate', wall: g.id }); } break;
    case 'wall': for (const u of us.filter(x => x.cls === 'rng')) { const w = U.minBy(bt.walls.filter(w => w.kind === 'wall' && w.side === 0 && w.def == null), w => U.dist(w.x, w.y, u.x, u.y)); if (w) { B.setOrder(bt, u, { type: 'hold' }); B.putOnWall(bt, u, w); } } break;
    case 'dlg': {
      if (us.some(u => u.delegate)) { for (const u of us) B.delegate(bt, u, null); V.toast('自ら指揮を執る'); break; }
      const deps = bt.deputies || [];
      const gs = bt.sides[0].gunshi;
      const ch = deps.map((d, i) => ({ v: i, label: `${d.n}に任せる`, sub: `統${d.tou} 知${d.chi}${d.good || gs ? '　（自ら判断して戦える）' : '　（未熟：持ち場を守るのみ）'}` }));
      if (!ch.length) ch.push({ v: -1, label: '兵に任せる', sub: '副官がいないため、持ち場を守るだけ' });
      ch.push({ v: null, label: 'やめる' });
      const di = await UI.choose({ title: '委任', body: gs ? `軍師${gs.n}の策に従い、副官が判断して戦う。` : '統率60以上か知力65以上の副官なら、自ら判断して戦える。', choices: ch });
      if (di == null) break;
      const mode = await UI.choose({ title: '方針', choices: [{ v: 'attack', label: '攻勢', sub: '敵を求めて攻める' }, { v: 'defend', label: '守勢', sub: 'その場を守る' }, { v: 'flank', label: '遊撃', sub: '敵の側背を突く（騎兵向き）' }, { v: 'follow', label: '本隊に続く', sub: '主人公の隊を守ってついて来る' }] });
      if (!mode) break;
      const dep = di >= 0 ? deps[di] : null;
      for (const u of us) if (!u.me) B.delegate(bt, u, mode, dep);
      V.toast(us.some(u => u.me) ? '本隊以外を委任した。本隊は自ら率いる' : '委任した');
      break;
    }
    case 'back': for (const u of us) B.command(bt, u, { type: 'retreat' }); break;
    case 'rejoin': { const par = bt.units.find(x => x.parentOfMe); if (par) B.setOrder(bt, us[0], { type: 'rejoin', parent: par.id }); break; }
  }
  V.ui.panelKey = null;
  V.renderPanel();
};
V.useSkillAt = (wx, wy, target) => {
  const bt = V.bt, s = V.ui.skill; V.setMode(null);
  if (!s) return;
  const u = bt.units[s.u];
  let ok;
  if (s.k === 'ikki' || s.k === 'sogeki' || s.k === 'konran' || s.k === 'hien') ok = target && target.side === 1 ? B.useSkill(bt, u, s.k, { target: target.id }) : false;
  else ok = B.useSkill(bt, u, s.k, { x: wx, y: wy });
  if (!ok) V.toast(s.k === 'ikki' ? '近くの敵を選んで' : s.k === 'sogeki' ? '射程内の敵将を選んで' : 'そこには使えない（距離か地形）');
  V.ui.skill = null;
};

/* ---------------- 出来事の演出（カットイン） ---------------- */
V.consumeEvents = async () => {
  const bt = V.bt;
  const ev = bt.events.shift();
  if (!ev) return;
  const show = bt.sides[0].player || bt.spec.role === 'watch';
  if (!show || !UI.CUTIN_ON()) return;
  // 小さな討ち取りは文字だけ（大将・名将・主人公の手柄のときだけカットイン）
  if (ev.k === 'slay' && !ev.big) return;
  if (ev.k === 'slay' && bt.time - (V.ui.lastSlayCut || -99) < 20) return;
  if (ev.k === 'slay') V.ui.lastSlayCut = bt.time;
  V.ui.cutin = true;
  try { await UI.battleEvent(bt, ev); } catch (e) { console.warn(e); }
  V.ui.cutin = false;
  V.ui.last = performance.now();
};
V.chargeCutin = (us) => {
  const bt = V.bt;
  const lead = us.find(u => u.me) || us.find(u => u.ld && !u.ld.ret) || us[0];
  if (!lead || !lead.ld || bt.time - (V.ui.lastChargeCut || -99) < 25) return;
  V.ui.lastChargeCut = bt.time;
  V.ui.cutin = true;
  UI.cutin({ kind: 'single', a: Object.assign({ c: bt.sides[0].c }, lead.ld), side: 0, title: '突撃！', sub: us.length > 1 ? `${us.length}隊が突っ込む` : B.unitName(bt, lead), dur: 1300, snd: 'horn' }).then(() => { V.ui.cutin = false; V.ui.last = performance.now(); });
};

/* ---------------- 一時停止の処理 ---------------- */
V.handlePause = async () => {
  const bt = V.bt;
  if (V.ui.modal) return;
  if (bt.paused === 'night') {
    V.ui.modal = true;
    const res = await V.nightUI();
    V.ui.modal = false;
    return;
  }
  if (bt.paused === 'duelOffer') {
    V.ui.modal = true;
    const d = bt.duelOffer; const a = bt.units[d.a], e = bt.units[d.b];
    const gap = (a.ld.bu || 40) - (e.ld.bu || 40);
    const flavor = d.bold ? (gap >= B.DUEL_GAP ? `猪突の将は武力の差など顧みない。` : `猪突の将だ。退くことを知らぬ。`) : '';
    const ok = await UI.choose({ title: '一騎打ちを挑まれた！', seal: '一騎打ち', body: `${e.ld.n}（武${e.ld.bu}${e.ld.pers && typeof PPL !== 'undefined' ? '・' + PPL.persName(e.ld.pers) : ''}）が「${a.ld.n}、勝負しろ！」と叫んでいる。${flavor}`, choices: [{ v: 1, label: '受けて立つ' }, { v: 0, label: '取り合わない（士気が下がる）' }] });
    if (ok) { bt.duel = d; bt.paused = 'duel'; V.ui.modal = false; return; }
    for (const c of a.cells) c.mor -= 12;
    bt.duelOffer = null; bt.paused = null; V.ui.modal = false;
    return;
  }
  if (bt.paused === 'duel') {
    V.ui.modal = true;
    const d = bt.duel; const a = bt.units[d.a], e = bt.units[d.b];
    const la = Object.assign({ c: bt.sides[a.side].c }, a.ld), lb = Object.assign({ c: bt.sides[e.side].c }, e.ld);
    const foot = ['inf', 'rng'].includes(a.cls) && ['inf', 'rng'].includes(e.cls) && !(typeof G !== 'undefined' && G && G.me && G.me.eq && G.me.eq.horse);
    const r = await UI.duel({ a: a.ld, b: e.ld, ac: la.c, bc: lb.c, title: `一騎打ち：${a.ld.n} 対 ${e.ld.n}`, battle: true, mounted: !foot });
    B.duelEnd(bt, d, { winner: r.win ? 'a' : r.draw ? 'draw' : 'b', kill: r.kill, fled: r.fled ? (r.win ? 'b' : 'a') : null });
    if (!r.draw && UI.CUTIN_ON()) { V.ui.cutin = true; await UI.cutin({ kind: 'duel', a: la, b: lb, ea: r.win ? 'joy' : 'pain', eb: r.win ? 'pain' : 'joy', title: r.win ? `${la.n}、${lb.n}を${r.fled ? '退ける' : r.kill ? '討ち取る！' : '打ち破る！'}` : r.fled ? `${la.n}、退く` : `${la.n}、敗れる……`, sub: '一騎打ち', red: !!r.kill, dur: 2000 }); V.ui.cutin = false; }
    V.ui.modal = false;
    return;
  }
};
// 主人公の一騎駆け → 一騎打ちへ
V.checkChallenge = () => {
  const bt = V.bt;
  if (!bt.pendingChallenge) return;
  const c = bt.pendingChallenge; bt.pendingChallenge = null;
  const a = bt.units[c.a], b = bt.units[c.b];
  if (a && a.me && b) B.challenge(bt, a, b);
  else if (a && b && B.canDuel(bt, a, b)) { bt.duelPairs[B.duelKey(a, b)] = 1; B.autoDuel(bt, a, b); }
};
setInterval(() => { if (V.bt && !V.bt.ended && !V.bt.paused) V.checkChallenge(); }, 300);

V.nightUI = async () => {
  const bt = V.bt;
  const ownStr = B.strength(bt, 0), foeStr = B.strength(bt, 1);
  const choices = [{ v: 'rest', label: '休息する', sub: '士気と兵を回復する' }];
  if (bt.sides[0].player && bt.spec.role !== 'watch') {
    const raiders = bt.units.filter(u => B.canCommand(bt, u) && u.state !== 'rout' && u.cls !== 'sie');
    if (bt.sides[0].tactics.includes('yashuu') && raiders.length) choices.push({ v: 'raid', label: '夜襲をかける', sub: '成功すれば敵陣を混乱させる' });
    if (bt.sides[0].cmdAll && !bt.sides[0].noRetreat) choices.push({ v: 'retreat', label: '撤退する', sub: '戦をやめて兵を退く（敗北）' });
  }
  const k = bt.spec.role === 'watch' ? 'rest' : await UI.choose({ title: `${bt.day}日目の夜`, seal: '夜営', body: `味方 ${U.fmt(ownStr)}　敵 ${U.fmt(foeStr)}\n篝火が両陣に灯る。明日の戦に備えよ。`, choices });
  if (k === 'retreat') { B.retreat(bt, 0); bt.paused = null; for (const u of bt.units) if (u.side === 0) { u.out = true; u.escaped = true; } B.end(bt, 1, '撤退'); return; }
  let unit = null;
  if (k === 'raid') {
    const raiders = bt.units.filter(u => B.canCommand(bt, u) && u.state !== 'rout' && u.cls !== 'sie');
    unit = await UI.choose({ title: '夜襲に出す部隊', choices: raiders.slice(0, 12).map(u => ({ v: u.id, label: B.unitName(bt, u), sub: `${U.num(u.n)}人　士気${Math.round(u.mor)}` })) });
  }
  const res = B.night(bt, { k: k === 'raid' && unit != null ? 'raid' : 'rest', unit });
  if (res.length) await UI.info({ title: '夜明け', body: res.join('\n') });
  V.fogT = -9;
};

/* ---------------- メニュー・結果 ---------------- */
V.menu = async () => {
  const bt = V.bt;
  const wasPaused = V.ui.paused; V.setSpeed(0, true);
  const ch = [
    { v: 'fit', label: '全体を見る' },
    { v: 'me', label: '本隊へ移動', disabled: !bt.units.some(u => u.me && B.alive(u)) },
    { v: 'follow', label: V.ui.follow ? '本隊の追尾をやめる' : '本隊を追尾する' },
    { v: 'courier', label: `伝令の遅れ：${bt.spec.courier === false ? 'なし' : 'あり'}`, sub: '遠くの部隊への命令が届くまでに時間がかかる' },
    { v: 'help', label: '操作説明' },
    { v: 'snd', label: `音：${SND.on ? 'あり' : 'なし'}` },
    { v: 'perf', label: `計測の窓：${V.ui.perf ? 'あり' : 'なし'}`, sub: '描画の時間・部隊数・3Dの枚数を表示する' },
  ];
  if (bt.sides[0].player && bt.spec.role !== 'watch') ch.push({ v: 'retreat', label: '全軍撤退', sub: bt.sides[0].noRetreat && bt.sides[0].cmdAll ? '背水の陣のため退けない' : bt.sides[0].cmdAll ? '戦をあきらめて退く（敗北）' : '自分の隊を戦場から退かせる', disabled: bt.sides[0].noRetreat && bt.sides[0].cmdAll });
  if (bt.spec.role === 'watch') ch.push({ v: 'skip', label: '結果まで飛ばす' });
  ch.push({ v: null, label: '戦に戻る' });
  const k = await UI.choose({ title: '軍令', choices: ch });
  if (k === 'fit') V.fitCamera();
  if (k === 'perf') V.ui.perf = !V.ui.perf;
  if (k === 'me') { const me = bt.units.find(u => u.me); if (me) V.centerOn(me, 0.6); }
  if (k === 'follow') V.ui.follow = !V.ui.follow;
  if (k === 'courier') { bt.spec.courier = bt.spec.courier === false; if (typeof G !== 'undefined' && G) G.flags.courier = bt.spec.courier; }
  if (k === 'snd') SND.toggle();
  if (k === 'help') await UI.info({ title: '合戦の操作', body: '・自分の部隊をタップで選択（長押しで追加選択、ダブルタップで同じ兵種をまとめて選択）\n・空き地をタップで移動、敵をタップで攻撃\n・二本指で拡大縮小、ドラッグで視点移動\n・士気は組（または組の束）ごとに色で表示。挟撃や伏兵、矢を受けた所から崩れる\n・殿：退く味方の背中を守る\n・射撃区域：敵が入ったら一斉射撃\n・委任：有能な副官がいれば、その場を任せて別動隊を率いられる\n・采配：戦法に使う。時間で回復する' });
  if (k === 'retreat') { if (bt.sides[0].cmdAll) B.retreat(bt, 0); else for (const u of bt.units.filter(u => u.mine)) B.setOrder(bt, u, { type: 'retreat' }); }
  if (k === 'skip') { V.ui.closed = true; B.simulate(bt, 3000); V.ui.closed = false; V.loop(); }
  if (!wasPaused && !V.ui.deploy) V.setSpeed(V.ui.speed);
};
V.showResult = async () => {
  const bt = V.bt;
  const r = B.result(bt);
  const win = bt.winner === 0, lose = bt.winner === 1;
  const s0 = r.sides[0], s1 = r.sides[1];
  const meU = bt.units.find(u => u.me);
  const wuLines = meU && meU.wu ? meU.wu.map(w => `${w.n}：${w.dead ? '戦死' : w.out ? '負傷' : '無事'}（${w.kills || 0}人）`).join('、') : '';
  const slain = bt.stat.slain.filter(x => x.side === 1).map(x => x.n);
  const lostG = bt.stat.slain.filter(x => x.side === 0).map(x => x.n);
  const body = [
    `${bt.reason}`,
    `味方：${U.fmt(s0.start)} → 残り${U.fmt(s0.alive)}（戦死・負傷${U.fmt(s0.dead)}／潰走${U.fmt(s0.routed)}）`,
    `敵　：${U.fmt(s1.start)} → 残り${U.fmt(s1.alive)}（戦死・負傷${U.fmt(s1.dead)}／潰走${U.fmt(s1.routed)}）`,
    bt.naval ? `沈んだ船：味方 ${U.num(bt.stat.sunk[0])}隻／敵 ${U.num(bt.stat.sunk[1])}隻` : '',
    bt.sides[0].player && bt.spec.role !== 'watch' ? `主人公の部隊の戦果：${U.num(bt.stat.meKills)}人` : '',
    slain.length ? `討ち取った敵将：${slain.join('、')}` : '',
    lostG.length ? `失った将：${lostG.join('、')}` : '',
    bt.stat.duelWins ? `一騎打ち勝利：${bt.stat.duelWins}` : '',
    wuLines ? `伍の仲間：${wuLines}` : '',
    bt.meFate === 'wounded' ? '主人公は深手を負った。' : bt.meFate === 'dead' ? '主人公は討ち死にした……' : '',
  ].filter(Boolean).join('\n');
  V.setSpeed(0, true);
  if (bt.sides[0].player) await UI.cutin({ kind: 'banner', title: win ? '勝利' : lose ? '敗北' : '引き分け', sub: bt.reason, color: win ? '#f3d27a' : lose ? '#f08a74' : '#efe6cf', snd: win ? 'victory' : lose ? 'defeat' : 'gong', dur: 2000 });
  if (UI.battleResult) await UI.battleResult(bt, r, body); else await UI.info({ title: win ? '勝利' : lose ? '敗北' : '引き分け', seal: win ? '勝' : lose ? '敗' : '和', body, big: true });
  V.ui.closed = true;
  if (V.ft) { V.ft.destroy(); V.ft = null; }
  const bt0 = V.bt; V.bt = null;
  const res = B.result(bt0);
  V.resolve(res);
};
