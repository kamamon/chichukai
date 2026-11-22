/* =========================================================
   地中海覇道 — 一騎打ち（3Dアニメーション）
   馬と武者を骨格で動かし、遠近法で描く（外部ライブラリなし）。
   脚は逆運動学、駈歩は四拍子、腕の振りは予備動作→本動作→戻しの三段。
   激突のあとは駆け抜けて馬首を返し、カメラも逆側へ切り返す。
   勝負の仕組みは UI.DUEL_ACT / UI.DUEL_M（攻撃・強撃・受け・必殺・退く）
   ========================================================= */
UI.DUEL_LINES = DATA_JSON.lines.duel;   // data/lines.json
UI.duelLine = (key, x) => { const L = UI.DUEL_LINES[key] || ['']; const s = L[Math.floor(Math.random() * L.length)]; return s.replace('{c}', x.cn || '').replace('{n}', x.n || ''); };
// 武器：特性と兵科から
UI.duelWeapon = (x, mounted) => {
  const tr = x.tr || [];
  const has = (p) => tr.some(t => String(t).startsWith(p));
  if (has('td_twin')) return 'twin';
  if (has('td_sword')) return 'sword';
  if (has('td_spear')) return 'spear';
  if (has('td_ji') || has('td_pow')) return 'ji';
  if (has('td_hidden')) return 'dagger';
  if (!mounted) return (x.bu || 50) >= 75 ? 'ji' : 'sword';
  return (x.bu || 50) >= 80 ? 'ji' : (x.bu || 50) >= 60 ? 'spear' : 'sword';
};
// 必殺技の名（特性から）
UI.duelSpecial = (x) => {
  const tr = x.tr || [];
  const has = (p) => tr.some(t => String(t).startsWith(p));
  if (has('td_spear')) return '神槍・貫天';
  if (has('td_sword')) return '剣聖・一閃';
  if (has('td_twin')) return '双剣・乱舞';
  if (has('td_ji')) return '大槍・薙ぎ払い';
  if (has('td_pow')) return '怪力・砕岩';
  if (has('moushou')) return '鬼神・一撃';
  if (has('td_hidden')) return '暗器・影討ち';
  return (x.st === 'chi') ? '見切り・返し太刀' : (x.st === 'ins') ? '雷霆・一撃' : '渾身・一太刀';
};
UI.HORSE_C = ['#5a3a24', '#2a221c', '#8a5a34', '#6b4a2e', '#c9bfae', '#3d2e24'];

/* ---------------- 3D の小道具（ベクトル・骨格） ---------------- */
UI.D3 = (() => {
  const DR = {};
  DR.add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  DR.sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  DR.mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  DR.len = (a) => Math.hypot(a[0], a[1], a[2]);
  DR.norm = (a) => { const l = DR.len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  DR.cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  DR.dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  DR.lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  // 向き（heading：上軸まわり）、pitch（左軸まわり、正で前へ倒れる）、roll（前軸まわり）で局所→世界
  DR.frame = (pos, heading, pitch = 0, roll = 0) => {
    const ch = Math.cos(heading), sh = Math.sin(heading), cp = Math.cos(pitch), sp = Math.sin(pitch), cr = Math.cos(roll), sr = Math.sin(roll);
    return (l) => {
      let x = l[0], y = l[1] * cr - l[2] * sr, z = l[1] * sr + l[2] * cr;
      const x2 = x * cp + z * sp, z2 = -x * sp + z * cp; x = x2; z = z2;
      return [pos[0] + x * ch - y * sh, pos[1] + x * sh + y * ch, pos[2] + z];
    };
  };
  DR.rotZ = (l, a) => { const c = Math.cos(a), s = Math.sin(a); return [l[0] * c - l[1] * s, l[0] * s + l[1] * c, l[2]]; };
  DR.rotY = (l, a) => { const c = Math.cos(a), s = Math.sin(a); return [l[0] * c + l[2] * s, l[1], -l[0] * s + l[2] * c]; };  // 正で前へ倒れる
  DR.rotX = (l, a) => { const c = Math.cos(a), s = Math.sin(a); return [l[0], l[1] * c - l[2] * s, l[1] * s + l[2] * c]; };
  DR.ease = k => k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  DR.easeOut = k => 1 - Math.pow(1 - k, 3);
  DR.easeIn = k => k * k * k;
  DR.shade = (hex, f) => PORT.shade(hex, f);
  // 二本の骨の逆運動学：根 r から先 t へ、長さ l1, l2、曲げる向き bendDir（世界座標）
  DR.ik2 = (r, t, l1, l2, bendDir) => {
    const d = DR.sub(t, r); let L = DR.len(d); const maxL = l1 + l2 - 0.02, minL = Math.abs(l1 - l2) + 0.02;
    if (L > maxL) L = maxL; if (L < minL) L = minL;
    const dn = L > 1e-6 ? DR.norm(d) : [0, 0, -1];
    const cosA = Math.max(-1, Math.min(1, (l1 * l1 + L * L - l2 * l2) / (2 * l1 * L)));
    const a = Math.acos(cosA);
    let perp = DR.cross(DR.cross(dn, bendDir), dn); const pl = DR.len(perp); perp = pl < 1e-4 ? [1, 0, 0] : DR.mul(perp, 1 / pl);
    const knee = DR.add(r, DR.add(DR.mul(dn, Math.cos(a) * l1), DR.mul(perp, Math.sin(a) * l1)));
    return [knee, DR.add(r, DR.mul(dn, L))];
  };
  return DR;
})();

/* ---------------- 一騎打ちの画面 ---------------- */
UI.duel = (o) => UI.modal((box, close) => {
  const DR = UI.D3;
  box.classList.add('duel-cine');
  if (box.parentElement) box.parentElement.classList.add('duel-wrap');
  const prevBgm = typeof SND !== 'undefined' ? SND.bgmK : null;
  if (typeof SND !== 'undefined') SND.bgm('duel');
  const A0 = o.a, B0 = o.b;
  let mounted = o.mounted !== undefined ? !!o.mounted : !!o.battle;
  const myC = (typeof G !== 'undefined' && G && G.me) ? S.myOff().c : null;
  const cnA = o.ac ? (D.COUNTRIES[o.ac]?.name || '') : (myC ? S.cname(myC) : ''), cnB = o.bc ? (D.COUNTRIES[o.bc]?.name || '') : (o.b.c && D.COUNTRIES[o.b.c] ? D.COUNTRIES[o.b.c].name : '');
  const cA = o.ac || myC, cB = o.bc || B0.c || null;
  const F = (x, cn, side, c) => { const fx = k => S.fx(x, k); const hp = 60 + (x.bu || 40) * 1.4 + fx('duel_hp'); return { src: x, n: x.n, cn, side, c, bu: x.bu || 40, chi: x.chi || 40, tr: x.tr || [], st: x.st || 'bal', hp0: hp, hp, ki: 20, dm: 1 + fx('duel'), rd: fx('duel_read'), kg: 1 + fx('duel_ki'), fl: fx('duel_flee'), wep: x.wep || UI.duelWeapon(x, mounted), spName: UI.duelSpecial(x), por: PORT.params(Object.assign({ c }, x)) }; };
  const a = F(A0, cnA, 0, cA), b = F(B0, cnB, 1, cB);
  a.col = a.por.col; b.col = b.por.col; if (a.col === b.col) b.col = '#7a5b3c';
  const rngH = U.rng(PORT.hash(a.n + b.n));
  a.horse = UI.HORSE_C[Math.floor(rngH() * 4)]; b.horse = UI.HORSE_C[Math.floor(rngH() * 4)];
  if (a.por.tier >= 7 && rngH() < 0.3) a.horse = UI.HORSE_C[4]; else if (b.por.tier >= 7 && rngH() < 0.3) b.horse = UI.HORSE_C[4];
  if (a.horse === b.horse) b.horse = UI.HORSE_C[(UI.HORSE_C.indexOf(b.horse) + 2) % 4];
  let round = 0, last = null, done = false, hintAct = null, busy = true, unhorsed = false;
  const log = [];
  // ---- 画面 ----
  box.innerHTML = `
    <canvas class="dc-cv" aria-hidden="true"></canvas>
    <div class="dc-bars" aria-hidden="true"></div>
    <div class="dc-top">
      <div class="dc-f dc-fa" style="--pc:${a.col}"><div class="dc-por"></div><div class="dc-ft"><b>${U.esc(a.n)}</b><small>${U.esc(a.cn)}　武${a.bu}</small><div class="hp"><i id="d-ah"></i></div><div class="ki"><i id="d-ak"></i></div></div></div>
      <div class="dc-title"><span class="dc-vs">対</span><small id="dc-round"></small></div>
      <div class="dc-f dc-fb" style="--pc:${b.col}"><div class="dc-ft"><b>${U.esc(b.n)}</b><small>${U.esc(b.cn)}　武${b.bu}</small><div class="hp"><i id="d-bh"></i></div><div class="ki"><i id="d-bk"></i></div></div><div class="dc-por"></div></div>
    </div>
    <div class="dc-mid"><div class="dc-say" id="d-say"></div><div class="duel-hint" id="d-hint"></div></div>
    <div class="dc-bottom">
      <div class="duel-acts" id="d-acts"></div>
      <div class="dc-foot"><div class="duel-log" id="d-log" aria-live="polite"></div><button class="btn sm" id="d-auto">おまかせ</button></div>
    </div>
    <div class="dc-kanji" id="d-kanji" hidden></div>
    <div class="dc-skip" id="d-skip">タップで名乗りを飛ばす</div>`;
  const porA = U.$('.dc-fa .dc-por', box), porB = U.$('.dc-fb .dc-por', box);
  const setExpr = (f, expr) => { const el = f === a ? porA : porB; if (el.dataset.ex === expr) return; el.dataset.ex = expr; el.innerHTML = ''; el.append(PORT.canvas(Object.assign({ c: f.c }, f.src), 64, { dark: true, expr })); el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); };
  setExpr(a, 'normal'); setExpr(b, 'normal');
  const cv = U.$('.dc-cv', box), g = cv.getContext('2d');
  const say = U.$('#d-say', box), hintEl = U.$('#d-hint', box), kanji = U.$('#d-kanji', box), bars = U.$('.dc-bars', box), skipEl = U.$('#d-skip', box);
  const fontHead = () => (typeof V !== 'undefined' && V.fontHead) ? V.fontHead() : 'serif';
  // ---- 場面の状態 ----
  const SC = { t: 0, dt: 0, shake: 0, flash: 0, slow: 1, vign: 0, zoom: 1, parts: [], nums: [], lines: 0, dust: [], runaway: [], skip: false, wide: false,
    sky: (typeof V !== 'undefined' && V.bt) ? ((V.bt.time - (V.bt.day - 1) * V.bt.dayLen) / V.bt.dayLen) : 0.5, weather: (typeof V !== 'undefined' && V.bt) ? V.bt.weather : 'clear' };
  const LANE = 4.6, READY = mounted ? 27 : 12;
  // 武者（世界座標：x が対決の線、y が奥行き、z が上。はじめ A は負の側）
  const mk = (f, side) => ({
    f, side, pos: [side === 0 ? -READY : READY, side === 0 ? -LANE : LANE, 0], heading: side === 0 ? 0 : Math.PI, vel: 0, prev: null, gait: Math.random() * 6.28,
    horse: mounted, lean: 0, twist: 0, rear: 0, fall: 0, fallDir: 1, hit: 0, glow: 0, gone: false, cheer: 0, charge: 0, look: 0, slump: 0,
    poseFrom: null, poseTo: null, poseT: 0, poseDur: 1, curPose: null,
  });
  const ea = mk(a, 0), eb = mk(b, 1);
  let W = 1, H = 1, px = 1, CY = 0.46;
  const resize = () => { const r = cv.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height); px = Math.min(2, devicePixelRatio || 1); cv.width = Math.round(W * px); cv.height = Math.round(H * px); CY = W > H ? 0.47 : 0.455; };
  resize();
  // ---- カメラ ----
  let cs = -1;   // カメラの側（y の符号）。すれ違いのあと切り返す
  const cam = { pos: [0, -90, 24], tgt: [0, 0, 14], fov: 50, roll: 0, from: null, to: null, k: 1, dur: 1, ease: DR.ease, orbit: 0 };
  let CB = null;
  const camSetup = () => {
    const F2 = DR.norm(DR.sub(cam.tgt, cam.pos));
    let R = DR.cross(F2, [0, 0, 1]); R = DR.len(R) < 1e-4 ? [1, 0, 0] : DR.norm(R);
    let Up = DR.cross(R, F2);
    if (cam.roll) { const cr = Math.cos(cam.roll), sr = Math.sin(cam.roll); const R2 = DR.add(DR.mul(R, cr), DR.mul(Up, sr)); Up = DR.add(DR.mul(Up, cr), DR.mul(R, -sr)); R = R2; }
    const foc = (H / 2) / Math.tan(cam.fov * Math.PI / 360);
    CB = { F: F2, R, Up, foc };
  };
  const project = (p) => {
    const d = DR.sub(p, cam.pos); const dep = DR.dot(d, CB.F); if (dep < 0.5) return null;
    const k = CB.foc / dep; return [W / 2 + DR.dot(d, CB.R) * k, H * CY - DR.dot(d, CB.Up) * k, dep, k];
  };
  const shot = (def, dur, ease) => { cam.from = { pos: cam.pos.slice(), tgt: cam.tgt.slice(), fov: cam.fov, roll: cam.roll }; cam.to = def; cam.k = 0; cam.dur = Math.max(0.01, dur || 0.01); cam.ease = ease || DR.ease; };
  const cut = (def) => { cam.from = null; cam.to = def; cam.k = 1; SC.aSide = ea.pos[0] <= eb.pos[0] ? -1 : 1; };
  const evalDef = (def) => ({ pos: typeof def.pos === 'function' ? def.pos() : def.pos, tgt: typeof def.tgt === 'function' ? def.tgt() : def.tgt, fov: def.fov || 50, roll: def.roll || 0 });
  const camUpdate = (real) => {
    if (!cam.to) { camSetup(); return; }
    cam.k = Math.min(1, cam.k + real / cam.dur);
    const to = evalDef(cam.to);
    if (cam.from && cam.k < 1) { const e = cam.ease(cam.k); cam.pos = DR.lerp3(cam.from.pos, to.pos, e); cam.tgt = DR.lerp3(cam.from.tgt, to.tgt, e); cam.fov = cam.from.fov + (to.fov - cam.from.fov) * e; cam.roll = cam.from.roll + (to.roll - cam.from.roll) * e; }
    else { cam.pos = to.pos; cam.tgt = to.tgt; cam.fov = to.fov; cam.roll = to.roll; }
    if (SC.shake > 0) cam.pos = DR.add(cam.pos, [(Math.random() - 0.5) * SC.shake * 0.35, (Math.random() - 0.5) * SC.shake * 0.35, (Math.random() - 0.5) * SC.shake * 0.25]);
    camSetup();
  };
  // 構図
  const mid = () => DR.mul(DR.add(ea.pos, eb.pos), 0.5);
  const fwd = (e) => [Math.cos(e.heading), Math.sin(e.heading), 0];
  const topZ = (e) => (e.horse ? 29 : 19) - e.fall * 9;
  const headPos = (e) => DR.add(e.pos, [0, 0, topZ(e) - 3]);
  // 構図は「画面に収める幅・高さ（世界の単位）」で決め、画角と縦横比から距離を出す
  // 上下の札で隠れる分を除いた「見える高さ」を基準にする
  const heff = () => W < H ? 0.66 : 0.5;
  const dist = (visH, visW, fov) => { const t = Math.tan((fov || 50) * Math.PI / 360) * heff(); let d = 0; if (visH) d = Math.max(d, visH / (2 * t)); if (visW) d = Math.max(d, visW / (2 * t * (W / H))); return d; };
  const place = (tgt, dir, visH, visW, fov) => DR.add(tgt, DR.mul(DR.norm(dir), dist(visH, visW, fov)));
  const portrait = () => W < H;
  const span = () => Math.abs(ea.pos[0] - eb.pos[0]) + (mounted ? 60 : 30);
  const SHOTS = {
    wide: { fov: 50, tgt: () => DR.add(mid(), [0, 0, mounted ? 13 : 9]), pos: () => { const ph = portrait() ? 0.7 : 0.42; return place(DR.add(mid(), [0, 0, mounted ? 13 : 9]), [cs * Math.sin(ph), cs * Math.cos(ph), 0.26], mounted ? 44 : 28, span() * (portrait() ? 0.8 : 0.95), 50); } },
    wideLow: { fov: 52, tgt: () => DR.add(mid(), [0, 0, mounted ? 15 : 10]), pos: () => place(DR.add(mid(), [0, 0, mounted ? 15 : 10]), [cs * Math.sin(0.3), cs * Math.cos(0.3), 0.1], mounted ? 40 : 26, span() * 0.9, 52) },
    track: { fov: 56, roll: 0.02, tgt: () => DR.add(mid(), [0, 0, mounted ? 16 : 10]), pos: () => place(DR.add(mid(), [0, 0, mounted ? 16 : 10]), [0, cs, 0.16], mounted ? 56 : 34, mounted ? 36 : 22, 56) },
    clash: { fov: 42, tgt: () => DR.add(mid(), [0, 0, mounted ? 19 : 11]), pos: () => place(DR.add(mid(), [0, 0, mounted ? 19 : 11]), [cs * -0.2, cs, 0.3], mounted ? (portrait() ? 64 : 50) : (portrait() ? 42 : 32), 0, 42) },
    clashOrbit: { fov: 44, tgt: () => DR.add(mid(), [0, 0, mounted ? 18 : 11]), pos: () => { const an = cs * Math.PI / 2 - cs * cam.orbit; return place(DR.add(mid(), [0, 0, mounted ? 18 : 11]), [Math.cos(an), Math.sin(an), 0.28], mounted ? (portrait() ? 68 : 54) : (portrait() ? 44 : 34), 0, 44); } },
  };
  const followShot = (e) => ({ fov: 48, tgt: () => DR.add(e.pos, [0, 0, e.horse ? 15 : 9]), pos: () => place(DR.add(e.pos, [0, 0, e.horse ? 15 : 9]), [-fwd(e)[0] * 0.55, cs * 0.8, 0.22], e.horse ? 52 : 34, 0, 48) });
  const fallShot = (e) => ({ fov: 46, tgt: () => DR.add(e.pos, [0, 0, e.horse ? 14 : 9]), pos: () => place(DR.add(e.pos, [0, 0, e.horse ? 14 : 9]), [fwd(e)[0] * -0.35, cs, 0.14], e.horse ? 48 : 32, 0, 46) });
  // 構えの画：縦画面では A の背後の高みから対決の線を見下ろす（手前に自分、奥に相手の構え）。横画面では斜めの引き
  const readyShot = () => portrait() ? {
    fov: 50,
    tgt: () => DR.add(DR.lerp3(ea.pos, eb.pos, SC.rt || 0.5), [0, 0, (mounted ? 12 : 8)]),
    pos: () => { const ph = SC.phi || (mounted ? 0.95 : 0.72), m = DR.add(DR.lerp3(ea.pos, eb.pos, SC.rt || 0.5), [0, 0, mounted ? 12 : 8]); const sA = ea.pos[0] < eb.pos[0] ? -1 : 1; return place(m, [sA * Math.sin(ph), cs * Math.cos(ph), SC.rz || 0.24], mounted ? 44 : 36, (Math.abs(ea.pos[0] - eb.pos[0]) + (mounted ? 46 : 14)) * Math.cos(ph) * (SC.rm || (mounted ? 1.0 : 0.75)), 50); },
  } : SHOTS.wide;
  const closeOf = (e) => ({ fov: 40, tgt: () => DR.add(headPos(e), [0, 0, -7]), pos: () => place(DR.add(headPos(e), [0, 0, -7]), [fwd(e)[0] * 0.45, cs * 0.85, 0.3], e.horse ? 50 : 32, 0, 40) });
  const overOf = (e, other) => ({ fov: 46, tgt: () => DR.add(other.pos, [0, 0, other.horse ? 19 : 12]), pos: () => DR.add(e.pos, [-fwd(e)[0] * 24, cs * 7, e.horse ? 31 : 20]) });
  const victorShot = (e) => ({ fov: 40, tgt: () => DR.add(e.pos, [0, 0, e.horse ? 19 : 12]), pos: () => place(DR.add(e.pos, [0, 0, e.horse ? 19 : 12]), [fwd(e)[0] * 0.6 + cam.orbit * 0.15, cs * (0.8 - cam.orbit * 0.15), 0.1 + cam.orbit * 0.08], e.horse ? 44 : 30, 0, 40) });
  // ---- 光と空 ----
  const light = (() => { const t = SC.sky; const az = Math.PI * (0.25 + t * 0.5); return { L: DR.norm([Math.cos(az) * 0.7, -0.45, 0.55 + Math.sin(Math.PI * t) * 0.45]) }; })();
  const skyCols = () => {
    const t = SC.sky, w = SC.weather;
    let top = '#5d7f9c', mid2 = '#c7b48c', hor = '#e2c48c';
    if (t < 0.15) { top = '#2c3550'; mid2 = '#b06a4a'; hor = '#e7b06a'; }
    else if (t > 0.78) { top = '#36304a'; mid2 = '#b85a3a'; hor = '#e69a55'; }
    if (w === 'rain' || w === 'cloud') { top = '#44505a'; mid2 = '#7d8690'; hor = '#9aa0a2'; }
    if (w === 'fog') { top = '#8d9496'; mid2 = '#b6b9b4'; hor = '#c9c8c0'; }
    if (w === 'snow') { top = '#6f7a86'; mid2 = '#b3b8bd'; hor = '#d9dbd9'; }
    return [top, mid2, hor];
  };
  const groundCol = SC.weather === 'snow' ? [214, 212, 204] : [168, 143, 98];
  // ---- 描く部品（奥から手前へ並べて描く） ----
  let prims = [];
  const P = {
    sphere(c, r, col, opt) { const p = project(c); if (!p) return; prims.push({ d: p[2], k: 's', x: p[0], y: p[1], r: r * p[3], col, opt }); },
    capsule(a2, b2, ra, rb, col, opt) { const pa = project(a2), pb = project(b2); if (!pa || !pb) return; prims.push({ d: (pa[2] + pb[2]) / 2, k: 'c', pa, pb, ra: ra * pa[3], rb: rb * pb[3], col, opt }); },
    poly(pts, col, opt) { const pp = pts.map(project); if (pp.some(q => !q)) return; prims.push({ d: pp.reduce((s, q) => s + q[2], 0) / pp.length + (opt && opt.dz || 0), k: 'p', pp, col, opt, pts }); },
    bill(c, w, h, draw, opt) { const p = project(c); if (!p) return; const sw = w * p[3], sh = h * p[3]; if (p[0] < -sw - 40 || p[0] > W + sw + 40 || p[1] < -sh - 40 || p[1] > H + sh + 40) return; prims.push({ d: p[2] + (opt && opt.dz || 0), k: 'b', x: p[0], y: p[1], w: sw, h: sh, draw, opt }); },
    shadow(c, rx, ry, alpha) { const L = light.L; const sx = c[0] - L[0] / Math.max(0.3, L[2]) * c[2] * 0.5, sy = c[1] - L[1] / Math.max(0.3, L[2]) * c[2] * 0.5; const pts = []; for (let i = 0; i < 12; i++) { const an = i / 12 * 6.2832; pts.push([sx + Math.cos(an) * rx, sy + Math.sin(an) * ry, 0.05]); } const pp = pts.map(project); if (pp.some(q => !q)) return; prims.push({ d: 1e8, k: 'p', pp, col: `rgba(20,14,8,${alpha || 0.28})`, flat: true }); },
  };
  const lightScreen = () => { const l = light.L; return [DR.dot(l, CB.R), -DR.dot(l, CB.Up)]; };
  const drawPrims = () => {
    SC.lastPrims = prims.length;
    prims.sort((p1, p2) => p2.d - p1.d);
    const ls = lightScreen();
    for (const q of prims) {
      if (q.k === 's') {
        if (q.r < 0.3) continue;
        if (q.col[0] === 'r' && q.col.indexOf('rgba') === 0) { g.fillStyle = q.col; g.beginPath(); g.arc(q.x, q.y, q.r, 0, 6.2832); g.fill(); continue; }
        const gr = g.createRadialGradient(q.x + ls[0] * q.r * 0.4, q.y + ls[1] * q.r * 0.4, q.r * 0.08, q.x, q.y, q.r * 1.05);
        gr.addColorStop(0, DR.shade(q.col, 0.3)); gr.addColorStop(0.55, q.col); gr.addColorStop(1, DR.shade(q.col, -0.45));
        g.fillStyle = gr; g.beginPath(); g.arc(q.x, q.y, q.r, 0, 6.2832); g.fill();
        if (q.opt && q.opt.line) { g.strokeStyle = 'rgba(20,14,8,.35)'; g.lineWidth = Math.max(0.5, q.r * 0.08); g.stroke(); }
      } else if (q.k === 'c') {
        const ax = q.pa[0], ay = q.pa[1], bx = q.pb[0], by = q.pb[1];
        const dx = bx - ax, dy = by - ay, L2 = Math.hypot(dx, dy) || 1, nx = -dy / L2, ny = dx / L2, ang = Math.atan2(ny, nx);
        g.beginPath(); g.arc(ax, ay, Math.max(0.2, q.ra), ang, ang + Math.PI); g.arc(bx, by, Math.max(0.2, q.rb), ang + Math.PI, ang + 2 * Math.PI); g.closePath();
        if (q.col[0] === 'r' && q.col.indexOf('rgba') === 0) { g.fillStyle = q.col; g.fill(); continue; }
        const mxx = (ax + bx) / 2, myy = (ay + by) / 2, rr = Math.max(q.ra, q.rb, 0.5);
        const lit = (ls[0] * nx + ls[1] * ny) > 0 ? 1 : -1;
        const gr = g.createLinearGradient(mxx + nx * rr * lit, myy + ny * rr * lit, mxx - nx * rr * lit, myy - ny * rr * lit);
        gr.addColorStop(0, DR.shade(q.col, 0.28)); gr.addColorStop(0.5, q.col); gr.addColorStop(1, DR.shade(q.col, -0.45));
        g.fillStyle = gr; g.fill();
        if (q.opt && q.opt.line) { g.strokeStyle = 'rgba(20,14,8,.3)'; g.lineWidth = 0.6; g.stroke(); }
      } else if (q.k === 'p') {
        g.beginPath(); q.pp.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath();
        if (q.flat) { g.fillStyle = q.col; g.fill(); continue; }
        let col = q.col;
        if (!(q.opt && q.opt.noLight) && q.pts && q.pts.length >= 3 && q.col[0] === '#') { const n = DR.norm(DR.cross(DR.sub(q.pts[1], q.pts[0]), DR.sub(q.pts[2], q.pts[0]))); const lam = Math.abs(DR.dot(n, light.L)); col = DR.shade(q.col, -0.35 + lam * 0.5); }
        g.fillStyle = col; g.fill();
        if (q.opt && q.opt.line) { g.strokeStyle = q.opt.line === true ? 'rgba(20,14,8,.4)' : q.opt.line; g.lineWidth = q.opt.lw || 0.8; g.stroke(); }
      } else if (q.k === 'b') { g.save(); g.translate(q.x, q.y); q.draw(g, q.w, q.h, q); g.restore(); }
    }
    prims = [];
  };
  // ---- 馬 ----
  const HORSE = { hipF: 7.4, hipB: -7.6, hipY: 2.6, hipZ: 10.2, bodyZ: 12.8, l1: 5.7, l2: 5.1, hoof: 1.3, stride: 28 };
  const LEGS = [{ hip: [HORSE.hipF, -HORSE.hipY, HORSE.hipZ], off: 0.5, front: true }, { hip: [HORSE.hipF, HORSE.hipY, HORSE.hipZ], off: 0.65, front: true }, { hip: [HORSE.hipB, -HORSE.hipY, HORSE.hipZ + 0.3], off: 0.0, front: false }, { hip: [HORSE.hipB, HORSE.hipY, HORSE.hipZ + 0.3], off: 0.15, front: false }];
  const horsePose = (e) => {
    const v = Math.max(0, e.vel), run = Math.min(1, v / 36), ph = e.gait;
    const period = v > 1.5 ? HORSE.stride / v : 1, stance = 0.3 + (1 - run) * 0.3;
    const half = Math.min(5.4, v * period * stance * 0.5);
    const legs = [];
    for (const lg of LEGS) {
      const k = (((ph / 6.2832) + lg.off) % 1 + 1) % 1;
      let fx, fz;
      if (v < 1.5) { fx = Math.sin(SC.t * 1.1 + lg.off * 9) * 0.2; fz = 0; }
      else if (k < stance) { const t = k / stance; fx = half * (1 - 2 * t); fz = 0; }
      else { const t = (k - stance) / (1 - stance); fx = half * (-1 + 2 * t); fz = Math.sin(t * Math.PI) * (1.6 + run * 3.6); }
      legs.push({ hip: lg.hip, tgt: [lg.hip[0] + fx + (lg.front ? 0.6 : -0.4), lg.hip[1], fz + HORSE.hoof], front: lg.front });
    }
    const bob = v > 1.5 ? Math.sin(ph + 0.3) * 1.1 * run : Math.sin(SC.t * 1.1) * 0.18;
    const pitch = v > 1.5 ? -Math.sin(ph + 0.5) * 0.06 * run : 0;
    return { legs, bob, pitch, run };
  };
  const horseFrames = (e) => {
    const hp = e.horsePos || e.pos, hd0 = e.horseHeading != null ? e.horseHeading : e.heading;
    const pz = horsePose(e);
    const Tg = DR.frame([hp[0], hp[1], hp[2]], hd0);
    const Tb = DR.frame([hp[0], hp[1], hp[2] + pz.bob], hd0, pz.pitch, 0);
    const th = e.rear * 0.8, cr = Math.cos(th), sr = Math.sin(th), pv = [HORSE.hipB - 1.5, 0, 0];
    const Tr = th === 0 ? Tb : (l) => Tb([(l[0] - pv[0]) * cr - (l[2] - pv[2]) * sr + pv[0], l[1], (l[0] - pv[0]) * sr + (l[2] - pv[2]) * cr + pv[2]]);
    return { Tg, Tb, Tr, pz, hd0, hp };
  };
  const drawHorse = (e) => {
    const f = e.f, hc = f.horse, hd = DR.shade(hc, -0.2), hl = DR.shade(hc, 0.08);
    const HF = horseFrames(e), Tr = HF.Tr, Tg = HF.Tg, pz = HF.pz, rear = e.rear;
    const fw = [Math.cos(HF.hd0), Math.sin(HF.hd0), 0];
    P.shadow(HF.hp, 12, 5, 0.3);
    // 胴（胸・腹・尻）
    P.capsule(Tr([HORSE.hipF + 2, 0, HORSE.bodyZ + 0.6]), Tr([HORSE.hipB - 1, 0, HORSE.bodyZ + 0.3]), 4.9, 4.7, hc);
    P.sphere(Tr([HORSE.hipF + 3.2, 0, HORSE.bodyZ + 0.4]), 4.4, hl);
    P.sphere(Tr([HORSE.hipB - 2.4, 0, HORSE.bodyZ + 0.9]), 4.6, hc);
    // 首と頭（走ると首が伸び、棹立ちで持ち上がる）
    const nx = 1.2 * pz.run, nz = -1.4 * pz.run;
    const n0 = Tr([8.6, 0, 15.2]), n1 = Tr([14.6 + nx, 0, 22.2 + nz]);
    P.capsule(n0, n1, 3.1, 2.3, hc);
    const headT = (l) => Tr([14.6 + nx + l[0], l[1], 22.2 + nz + l[2]]);
    P.capsule(headT([1.8, 0, 1.0]), headT([6.9, 0, -1.6 + pz.run * 0.6]), 2.3, 1.6, hc);
    P.sphere(headT([8.0, 0, -2.1 + pz.run * 0.6]), 1.5, hd);
    P.sphere(headT([3.6, -1.9, 1.5]), 0.45, '#140f0a'); P.sphere(headT([3.6, 1.9, 1.5]), 0.45, '#140f0a');
    P.capsule(headT([1.9, -1.3, 2.4]), headT([1.5, -1.7, 4.4]), 0.6, 0.15, hd); P.capsule(headT([1.9, 1.3, 2.4]), headT([1.5, 1.7, 4.4]), 0.6, 0.15, hd);
    // たてがみ
    for (let i = 0; i < 5; i++) { const t = i / 4; const bx = 8.6 + (14.6 + nx - 8.6) * t, bz = 15.2 + (22.2 + nz - 15.2) * t + 3; const sway = Math.sin(SC.t * 6 + i) * 0.4 * (0.3 + pz.run); P.capsule(Tr([bx, 0, bz]), Tr([bx - 1.4 - pz.run * 1.6, sway, bz + 1.5]), 0.9, 0.3, DR.shade(hc, -0.42)); }
    // 尾
    const tailSw = Math.sin(SC.t * 2.5 + (e.side || 0)) * 0.6, back = -2.2 - pz.run * 3.5;
    let prev = Tr([HORSE.hipB - 4.6, 0, HORSE.bodyZ + 2.6]);
    for (let i = 1; i <= 4; i++) { const t = i / 4; const q = Tr([HORSE.hipB - 4.6 + back * t, tailSw * t * 1.4, HORSE.bodyZ + 2.6 - 6 * t * t + pz.run * 1.5 * t]); P.capsule(prev, q, 1.1 - t * 0.5, 0.9 - t * 0.5, DR.shade(hc, -0.35)); prev = q; }
    // 脚（逆運動学：前脚は膝が前、後ろ脚は飛節が後ろ）
    for (const lg of pz.legs) {
      const hipW = Tr(lg.hip);
      let tgtW;
      if (rear > 0.05 && lg.front) { const paw = Math.sin(SC.t * 9 + (lg.hip[1] > 0 ? 1.6 : 0)) * 1.6 * rear; tgtW = Tr([lg.hip[0] + 3.2 + paw, lg.hip[1], lg.hip[2] - 7.6 + rear * 1.4]); }
      else tgtW = Tg(lg.tgt);
      const [knee, tip] = DR.ik2(hipW, tgtW, HORSE.l1, HORSE.l2, lg.front ? fw : DR.mul(fw, -1));
      P.capsule(hipW, knee, 1.5, 1.05, hc); P.capsule(knee, tip, 1.0, 0.75, hd);
      P.sphere(DR.add(tip, [0, 0, -0.5]), 0.95, '#1a140f');
    }
    // 鞍・障泥（国の色）・胸繋・手綱
    const sc = f.col;
    P.poly([Tr([3.8, -4.7, 15.4]), Tr([3.8, 4.7, 15.4]), Tr([-4.4, 4.7, 15.5]), Tr([-4.4, -4.7, 15.5])], sc, { line: 'rgba(201,161,74,.8)' });
    P.poly([Tr([3.4, -5.0, 15.3]), Tr([3.4, -5.2, 9.4]), Tr([-3.8, -5.2, 9.6]), Tr([-3.8, -5.0, 15.4])], DR.shade(sc, -0.1), { line: 'rgba(201,161,74,.6)' });
    P.poly([Tr([3.4, 5.0, 15.3]), Tr([3.4, 5.2, 9.4]), Tr([-3.8, 5.2, 9.6]), Tr([-3.8, 5.0, 15.4])], DR.shade(sc, -0.1), { line: 'rgba(201,161,74,.6)' });
    P.capsule(Tr([2.6, 0, 17.4]), Tr([-2.6, 0, 17.7]), 2.3, 2.5, '#3a2a1c');
    P.capsule(Tr([3.8, 0, 18.6]), Tr([3.8, 0, 19.8]), 1.0, 0.6, '#5a4026');
    if (!e.noReins) { P.capsule(headT([4.4, -1.7, -0.6]), Tr([2.4, -2.6, 20.2]), 0.18, 0.18, '#2a1e14'); P.capsule(headT([4.4, 1.7, -0.6]), Tr([2.4, 2.6, 20.2]), 0.18, 0.18, '#2a1e14'); }
    return HF;
  };
  // ---- 武者 ----
  const RD = { hipZ: 19.6, footZ: 10.5, torsoL: 6.6, headR: 1.95, shY: 3.0, armL1: 3.4, armL2: 3.3, legL1: 5.6, legL2: 5.4 };
  // 構え（右手の位置は肩基準の局所：前・左・上）
  const POSES = {
    ready:       { rh: [3.0, -2.4, 0.8], lean: 0.05, twist: 0.12, wp: 0.6, wy: 0.1, shield: 0.25 },
    thrust_wind: { rh: [-1.8, -1.6, 0.6], lean: -0.1, twist: 0.55, wp: 0.12, wy: 0.05, shield: 0.3 },
    thrust_hit:  { rh: [5.8, 0.4, 1.0], lean: 0.45, twist: -0.45, wp: -0.05, wy: 0.0, shield: 0.1 },
    swing_wind:  { rh: [-0.8, -2.2, 5.4], lean: -0.22, twist: 0.65, wp: 1.5, wy: 0.2, shield: 0.2 },
    swing_hit:   { rh: [5.0, 1.8, -0.4], lean: 0.48, twist: -0.6, wp: -0.75, wy: -0.25, shield: 0.1 },
    sweep_wind:  { rh: [-1.4, -3.4, 5.4], lean: -0.15, twist: 1.2, wp: 0.5, wy: 1.5, shield: 0.1 },
    sweep_hit:   { rh: [4.8, 3.0, 1.6], lean: 0.32, twist: -1.1, wp: 0.05, wy: -1.3, shield: 0.0 },
    guard:       { rh: [2.4, -0.6, 2.6], lean: -0.06, twist: 0.1, wp: 0.35, wy: 1.25, shield: 1 },
    recoil:      { rh: [0.2, -2.0, 3.0], lean: -0.5, twist: 0.35, wp: 1.0, wy: 0.4, shield: 0.4 },
    raise:       { rh: [1.0, -0.8, 7.2], lean: -0.15, twist: 0.0, wp: 1.45, wy: 0.0, shield: 0.0 },
    lock:        { rh: [4.6, 0.4, 2.4], lean: 0.32, twist: -0.3, wp: 0.35, wy: 0.5, shield: 0.2 },
    slump:       { rh: [2.0, -1.6, -0.9], lean: 0.5, twist: 0.1, wp: -0.3, wy: 0.1, shield: 0.1 },
    stab_wind:   { rh: [-0.6, -2.6, 2.6], lean: -0.05, twist: 0.5, wp: -0.3, wy: 0.2, shield: 0.3 },
    stab_hit:    { rh: [5.2, 0.2, 0.0], lean: 0.5, twist: -0.5, wp: -0.4, wy: 0.0, shield: 0.1 },
  };
  const lerpPose = (p1, p2, t) => ({ rh: DR.lerp3(p1.rh, p2.rh, t), lean: p1.lean + (p2.lean - p1.lean) * t, twist: p1.twist + (p2.twist - p1.twist) * t, wp: p1.wp + (p2.wp - p1.wp) * t, wy: p1.wy + (p2.wy - p1.wy) * t, shield: p1.shield + (p2.shield - p1.shield) * t });
  const setPose = (e, name, dur) => { e.poseFrom = e.curPose || POSES.ready; e.poseTo = POSES[name] || POSES.ready; e.poseT = 0; e.poseDur = Math.max(0.01, dur || 0.3); };
  const curPose = (e) => { if (!e.poseTo) { e.curPose = POSES.ready; return e.curPose; } const k = DR.ease(Math.min(1, e.poseT / e.poseDur)); e.curPose = lerpPose(e.poseFrom, e.poseTo, k); return e.curPose; };
  const drawRider = (e, HF) => {
    const f = e.f, p = f.por;
    const pose = curPose(e);
    const woundK = 1 - Math.max(0, Math.min(1, f.hp / f.hp0));
    const ride = e.horse && HF ? Math.sin(e.gait + 0.6) * 0.07 * HF.pz.run : 0;
    const lean = pose.lean + e.lean + woundK * 0.22 + e.hit * -0.3 + ride + e.slump * 0.6, twist = pose.twist + e.twist;
    const fall = e.fall;
    // 腰の枠：馬上なら鞍から（棹立ちと共に動く）、徒歩なら地面から。落馬なら世界座標で転がる
    const Tfoot = DR.frame(e.pos, e.heading);
    const hipL = e.horse ? [0.2, 0, RD.hipZ] : [0, 0, RD.footZ - fall * 7.5];
    const root = e.horse && HF ? (l) => HF.Tr(DR.add(hipL, l)) : (l) => Tfoot(DR.add(hipL, l));
    const fallPitch = -1.5 * fall, fallRoll = e.fallDir * 0.55 * fall;
    const fallOff = fall > 0 ? [Math.cos(e.heading) * -7 * fall, Math.sin(e.heading) * -7 * fall + e.fallDir * 6.5 * fall, -(RD.hipZ - 2.4) * DR.easeIn(Math.min(1, fall * 1.1)) * (e.horse ? 1 : 0.05)] : null;
    const R = (l) => { let q = DR.rotZ(l, twist); q = DR.rotY(q, lean + fallPitch); if (fall > 0) q = DR.rotX(q, fallRoll); const w = root(q); return fallOff ? DR.add(w, fallOff) : w; };
    const Rt = R;
    const armor = DR.shade(f.col, -0.12), dark = DR.shade(f.col, -0.45), skin = p.skin;
    if (!e.horse) P.shadow(DR.add(e.pos, fallOff ? [fallOff[0], fallOff[1], 0] : [0, 0, 0]), 4.5 + fall * 4, 3.2, 0.3);
    // 腰・胴（鎧）
    P.sphere(R([0, 0, 0.2]), 2.2, dark);
    P.capsule(R([0, 0, 0.6]), R([0.3, 0, RD.torsoL]), 2.2, 2.7, armor, { line: true });
    // 肩当て
    P.sphere(Rt([0.3, -RD.shY - 0.1, RD.torsoL - 0.2]), 1.35, f.col, { line: true }); P.sphere(Rt([0.3, RD.shY + 0.1, RD.torsoL - 0.2]), 1.35, f.col, { line: true });
    if (p.armor >= 2) P.sphere(R([2.7, 0, 3.6]), 0.9, '#d8bb6a');
    // 首・頭・顔
    P.capsule(R([0.3, 0, RD.torsoL]), R([0.4, 0, RD.torsoL + 1.4]), 1.1, 1.0, skin);
    const hz = RD.torsoL + 3.1;
    const face = (l) => R([0.6 + l[0], l[1], hz + l[2]]);
    P.sphere(face([0, 0, 0]), RD.headR, skin);
    P.sphere(face([1.7, -0.7, 0.3]), 0.26, '#1d150c'); P.sphere(face([1.7, 0.7, 0.3]), 0.26, '#1d150c');
    P.capsule(face([1.75, -1.0, 0.75]), face([1.75, -0.35, 0.65]), 0.14, 0.14, '#1d150c'); P.capsule(face([1.75, 0.35, 0.65]), face([1.75, 1.0, 0.75]), 0.14, 0.14, '#1d150c');
    if (p.beard !== 'none') P.capsule(face([1.4, 0, -0.9]), face([1.2, 0, -1.9 - (p.beard === 'long' ? 1.3 : p.beard === 'full' ? 0.5 : 0)]), p.beard === 'must' ? 0.5 : 0.9, 0.35, p.beardC);
    // 冠・兜（地中海の被り物：p.head。古い分類 p.hat は予備）
    const hat = p.hat, hd = p.head;
    const HELM = ['montef', 'attic', 'phryg', 'boeot', 'pilos', 'conic', 'corinth', 'horned', 'sinew'];
    if (hd && HELM.includes(hd)) {
      const mc = ({ bronze: '#9c7a44', gold: '#b8953f', silver: '#9a9ea4', iron: '#5e5a54' })[p.metal] || '#9c7a44';
      P.sphere(face([-0.1, 0, 0.5]), RD.headR + 0.38, mc, { line: true });
      if (hd === 'pilos' || hd === 'conic') P.capsule(face([-0.2, 0, 1.4]), face([-0.4, 0, 3.4]), 1.5, 0.25, mc, { line: true });
      if (hd === 'phryg') P.capsule(face([-0.4, 0, 1.6]), face([1.0, 0, 3.0]), 1.3, 0.6, mc, { line: true });
      if (hd === 'corinth') { P.capsule(face([1.5, -1.0, -0.2]), face([1.5, -1.0, -1.6]), 0.5, 0.4, mc); P.capsule(face([1.5, 1.0, -0.2]), face([1.5, 1.0, -1.6]), 0.5, 0.4, mc); }
      else { P.capsule(face([0.2, -2.1, 0.1]), face([0.4, -2.1, -1.5]), 0.6, 0.45, mc); P.capsule(face([0.2, 2.1, 0.1]), face([0.4, 2.1, -1.5]), 0.6, 0.45, mc); }
      if (hd === 'boeot') P.capsule(face([0, -2.6, -0.2]), face([0, 2.6, -0.2]), 0.5, 0.5, mc);
      if (hd === 'horned') { P.capsule(face([-0.2, -1.8, 1.6]), face([0.4, -3.2, 3.6]), 0.5, 0.15, '#e8dcc0'); P.capsule(face([-0.2, 1.8, 1.6]), face([0.4, 3.2, 3.6]), 0.5, 0.15, '#e8dcc0'); }
      if (p.crest && p.crestT) {
        const sway = Math.sin(SC.t * 7 + e.side) * 0.3 * (0.4 + (HF ? HF.pz.run : 0));
        if (p.crestT === 'trans') P.capsule(face([-0.1, -2.2, 2.6]), face([-0.1, 2.2 + sway, 2.6]), 0.7, 0.7, p.crest);
        else if (p.crestT === 'feath') { P.capsule(face([-0.2, -1.6, 1.8]), face([-0.6, -2.2 + sway, 4.4]), 0.35, 0.15, p.crest); P.capsule(face([-0.2, 1.6, 1.8]), face([-0.6, 2.2 + sway, 4.4]), 0.35, 0.15, p.crest); }
        else if (p.crestT === 'tuft') P.capsule(face([-0.2, 0, 2.3]), face([-0.6, sway, 3.9]), 0.7, 0.3, p.crest);
        else P.capsule(face([1.2, 0, 2.5]), face([-2.4, sway, 3.0]), 0.6, 0.3, p.crest);
      }
    } else if (hd === 'diadem' || hd === 'wreath') {
      P.sphere(face([-0.4, 0, 0.6]), RD.headR + 0.15, p.hairC);
      P.capsule(face([0.2, -2.15, 0.7]), face([0.2, 2.15, 0.7]), 0.32, 0.32, hd === 'diadem' ? '#f2ecdc' : (p.tenka ? '#d9b44a' : '#6f8a3c'));
    } else if (hd === 'nemes') {
      P.sphere(face([-0.2, 0, 0.5]), RD.headR + 0.35, '#2f4f7a', { line: true });
      P.capsule(face([-0.4, -2.2, 0.2]), face([0.3, -2.4, -2.6]), 1.0, 0.8, '#d9b44a'); P.capsule(face([-0.4, 2.2, 0.2]), face([0.3, 2.4, -2.6]), 1.0, 0.8, '#d9b44a');
    } else if (hd === 'kausia' || hd === 'petasos') {
      P.sphere(face([-0.4, 0, 0.6]), RD.headR + 0.1, p.hairC);
      P.capsule(face([-0.2, 0, 1.9]), face([-0.2, 0, 2.3]), 3.0, 2.6, hd === 'kausia' ? '#5a5048' : '#8a7048', { line: true });
    } else if (hd === 'pcap' || hd === 'tiara') {
      P.capsule(face([-0.2, 0, 1.2]), face([-0.4, 0, 3.6]), 2.0, 1.4, hd === 'tiara' ? '#7a2f5a' : '#6b3048', { line: true });
    } else if (hd === 'scarf') {
      P.sphere(face([-0.2, 0, 0.55]), RD.headR + 0.2, '#7a5a3a'); P.capsule(face([-2.0, 0.6, 0.2]), face([-3.0, 1.0, -1.2]), 0.5, 0.3, '#7a5a3a');
    } else if (hd) {
      // 素頭：髪（短い・巻き毛・長い）
      P.sphere(face([-0.45, 0, 0.6]), RD.headR + (p.hair === 'curly' || p.hair === 'tight' ? 0.3 : 0.12), p.hairC);
      if (p.hair === 'long' || p.hair === 'fem') P.capsule(face([-1.6, 0, 0.2]), face([-2.4, 0, -2.6]), 1.6, 1.1, p.hairC);
    } else if (hat === 'helm' || hat === 'cap') {
      const mc = hat === 'helm' ? (p.tenka ? '#b89a4a' : '#5a5650') : '#5b4530';
      P.sphere(face([-0.1, 0, 0.45]), RD.headR + 0.35, mc, { line: true });
      P.capsule(face([-0.1, -2.2, 0.1]), face([-0.1, -2.2, -1.7]), 0.7, 0.5, mc); P.capsule(face([-0.1, 2.2, 0.1]), face([-0.1, 2.2, -1.7]), 0.7, 0.5, mc);
      if (hat === 'helm') { const crest = p.tenka ? '#f0d070' : f.col; const sway = Math.sin(SC.t * 7 + e.side) * 0.3 * (0.4 + (HF ? HF.pz.run : 0)); P.capsule(face([-0.1, 0, 2.5]), face([-2.4, sway, 4.2]), 0.55, 0.15, crest); P.sphere(face([-0.1, 0, 2.5]), 0.5, '#c9a14a'); }
    } else if (hat === 'mian' || hat === 'jinxian' || hat === 'jinxian1') { P.poly([face([-1.5, -1.6, 1.8]), face([1.2, -1.6, 1.8]), face([1.2, 1.6, 1.8]), face([-1.5, 1.6, 1.8])], '#17120e', { line: true }); P.capsule(face([-0.3, 0, 1.6]), face([-0.3, 0, 3.9]), 1.4, 1.2, '#17120e'); }
    else if (hat === 'fur') P.sphere(face([-0.1, 0, 0.5]), RD.headR + 0.5, '#5a4634');
    else { P.capsule(face([0, -2, 0.8]), face([0, 2, 0.8]), 0.5, 0.5, hat === 'band' ? '#8a3b2a' : DR.shade(f.col, -0.35)); P.sphere(face([-0.4, 0, 2.3]), 0.8, p.hairC); }
    // 脚
    if (e.horse && HF) {
      for (const sgn of [-1, 1]) {
        const hip = R([0.2, sgn * 1.9, 0.2]);
        const stirrup = HF.Tr([2.6, sgn * 5.4, 9.8]);
        const foot = fall > 0 ? DR.lerp3(stirrup, R([2.0, sgn * 2.4, -7.0]), fall) : stirrup;
        const [knee, tip] = DR.ik2(hip, foot, RD.legL1, RD.legL2, DR.sub(R([1, 0, 0]), R([0, 0, 0])));
        P.capsule(hip, knee, 1.25, 1.0, dark); P.capsule(knee, tip, 0.95, 0.7, dark); P.sphere(tip, 0.8, '#2a1e14');
      }
    } else {
      const v = Math.max(0, e.vel), run = Math.min(1, v / 14);
      const st = v > 1 ? Math.sin(e.gait) * (2.2 + run * 1.6) : 0;
      for (const sgn of [-1, 1]) {
        const hip = R([0, sgn * 1.5, -0.2]);
        const lift = v > 1 ? Math.max(0, Math.sin(e.gait + (sgn > 0 ? 0 : Math.PI))) * (1.2 + run * 1.4) : 0;
        const foot = fall > 0 ? R([2.5 * fall, sgn * 2.2, -8 + fall * 3]) : Tfoot([st * sgn + (e.slump ? -1.2 : 0), sgn * 1.7, 0.6 + lift]);
        const [knee, tip] = DR.ik2(hip, foot, RD.legL1, RD.legL2, DR.sub(Tfoot([1, 0, 0]), Tfoot([0, 0, 0])));
        P.capsule(hip, knee, 1.3, 1.05, dark); P.capsule(knee, tip, 1.0, 0.75, dark); P.sphere(tip, 0.85, '#2a1e14');
      }
      P.capsule(R([0, -2.4, -0.5]), R([0, 2.4, -0.5]), 1.0, 1.0, DR.shade(f.col, -0.3));
    }
    // 右腕と武器
    const sh = Rt([0.4, -RD.shY, RD.torsoL - 0.4]);
    const hand = Rt([0.4 + pose.rh[0], -RD.shY + pose.rh[1], RD.torsoL - 0.4 + pose.rh[2]]);
    const bendR = DR.sub(R([-0.3, -1, -0.6]), R([0, 0, 0]));
    const [elbow, handP] = DR.ik2(sh, hand, RD.armL1, RD.armL2, bendR);
    P.capsule(sh, elbow, 1.15, 0.95, armor); P.capsule(elbow, handP, 0.9, 0.7, skin); P.sphere(handP, 0.85, skin);
    const dL = [Math.cos(pose.wy) * Math.cos(pose.wp), Math.sin(pose.wy) * Math.cos(pose.wp), Math.sin(pose.wp)];
    const dir = DR.norm(DR.sub(R(dL), R([0, 0, 0])));
    drawWeapon(handP, dir, f.wep, e.glow);
    // 左腕：手綱か盾（双剣なら二本目）
    const shL = Rt([0.4, RD.shY, RD.torsoL - 0.4]);
    let handLp;
    if (f.wep === 'twin') handLp = Rt([0.4 + pose.rh[0] * 0.8, RD.shY - pose.rh[1] * 0.8, RD.torsoL - 0.4 + pose.rh[2] * 0.7]);
    else if (e.horse && HF && pose.shield < 0.5 && fall === 0) handLp = HF.Tr([5.2, 2.2, 20.0]);
    else handLp = Rt([2.4 + pose.shield * 1.6, RD.shY - 0.6, RD.torsoL - 1.8 + pose.shield * 2.4]);
    const bendL = DR.sub(R([-0.3, 1, -0.6]), R([0, 0, 0]));
    const [elbowL, handPL] = DR.ik2(shL, handLp, RD.armL1, RD.armL2, bendL);
    P.capsule(shL, elbowL, 1.15, 0.95, armor); P.capsule(elbowL, handPL, 0.9, 0.7, skin); P.sphere(handPL, 0.8, skin);
    if (f.wep === 'twin') { const dL2 = [Math.cos(-pose.wy) * Math.cos(pose.wp), Math.sin(-pose.wy) * Math.cos(pose.wp), Math.sin(pose.wp)]; drawWeapon(handPL, DR.norm(DR.sub(R(dL2), R([0, 0, 0]))), 'sword', e.glow); }
    else if ((pose.shield > 0.3 || !e.horse) && fall < 0.6) {
      const n = DR.norm(DR.sub(handPL, elbowL)); const c = DR.add(handPL, DR.mul(n, 0.4));
      let u1 = DR.cross(n, [0, 0, 1]); u1 = DR.len(u1) < 1e-3 ? [1, 0, 0] : DR.norm(u1); const u2 = DR.norm(DR.cross(n, u1));
      const pts = []; for (let i = 0; i < 12; i++) { const an = i / 12 * 6.2832; pts.push(DR.add(c, DR.add(DR.mul(u1, Math.cos(an) * 3.2), DR.mul(u2, Math.sin(an) * 3.2)))); }
      P.poly(pts, '#5a4026', { line: 'rgba(201,161,74,.9)', lw: 1.2 });
      P.sphere(c, 0.7, '#c9a14a');
    }
    if (e.hit > 0) P.sphere(R([0.3, 0, RD.torsoL * 0.5]), 4.6, `rgba(255,120,80,${(e.hit * 0.3).toFixed(3)})`);
  };
  const drawWeapon = (hand, dir, wep, glow) => {
    let side2 = DR.cross(dir, [0, 0, 1]); side2 = DR.len(side2) < 1e-3 ? [0, 1, 0] : DR.norm(side2); const up2 = DR.norm(DR.cross(side2, dir));
    const at = (t, s = 0, u = 0) => DR.add(hand, DR.add(DR.mul(dir, t), DR.add(DR.mul(side2, s), DR.mul(up2, u))));
    const blade = glow > 0.2 ? '#fff1b0' : '#d9dde0';
    if (wep === 'sword' || wep === 'twin' || wep === 'dagger') {
      const L = wep === 'dagger' ? 3.6 : 8.8;
      P.capsule(at(-1.6), at(0.6), 0.45, 0.45, '#5a4026');
      P.capsule(at(0.6, -0.9), at(0.6, 0.9), 0.3, 0.3, '#c9a14a');
      P.poly([at(0.8, -0.42), at(L, -0.3), at(L + 1.2), at(L, 0.3), at(0.8, 0.42)], blade, { line: 'rgba(60,70,80,.6)', noLight: true });
    } else {
      const L = 18.5;
      P.capsule(at(-7), at(L), 0.42, 0.36, '#6b4a2a');
      if (wep === 'spear') P.poly([at(L - 0.4, -0.7), at(L + 4.8), at(L - 0.4, 0.7)], blade, { line: 'rgba(60,70,80,.6)', noLight: true });
      else { P.poly([at(L - 0.4, -0.6), at(L + 4.0), at(L - 0.4, 0.6)], blade, { line: 'rgba(60,70,80,.6)', noLight: true }); P.poly([at(L - 3.4, 0, 0.3), at(L - 1.4, 0, 3.6), at(L + 0.2, 0, 2.8), at(L - 0.8, 0, 0.3)], blade, { line: 'rgba(60,70,80,.6)', noLight: true }); }
      P.capsule(at(L - 0.6), at(L - 2.6, 0, -1.9), 0.25, 0.1, '#b6382a');
    }
    if (glow > 0.2) P.sphere(at(wep === 'sword' || wep === 'twin' || wep === 'dagger' ? 5 : 15), 2.8 * glow, `rgba(255,220,140,${(glow * 0.35).toFixed(3)})`);
  };
  // ---- 環境 ----
  const rT = U.rng(PORT.hash(a.n + '|' + b.n));
  const tufts = []; for (let i = 0; i < 120; i++) tufts.push({ x: (rT() - 0.5) * 420, y: (rT() - 0.5) * 240, s: 0.6 + rT() * 1.2 });
  const stones = []; for (let i = 0; i < 20; i++) { const st = { x: (rT() - 0.5) * 400, y: (rT() - 0.5) * 240, s: 0.5 + rT() * 1.5 }; if (Math.abs(st.y) < 14 && Math.abs(st.x) < 60) st.y += 30; stones.push(st); }
  const armyMen = []; for (let s = 0; s < 2; s++) for (let i = 0; i < 44; i++) armyMen.push({ side: s, x: 120 + rT() * 60, y: (rT() - 0.5) * 150, h: 0.9 + rT() * 0.25, flag: rT() < 0.22, ph: rT() * 6 });
  const hills = []; for (let i = 0; i < 18; i++) hills.push({ an: i / 18 * 6.2832 + rT() * 0.3, r: 700 + rT() * 300, h: 60 + rT() * 110, w: 150 + rT() * 160 });
  const drawEnv = () => {
    const [top, mid2, hor] = skyCols();
    const horP = project(DR.add(cam.pos, DR.mul([CB.F[0], CB.F[1], 0], 1000)));
    const hy = horP ? horP[1] : H * 0.45;
    const grd = g.createLinearGradient(0, 0, 0, Math.max(10, hy)); grd.addColorStop(0, top); grd.addColorStop(0.72, mid2); grd.addColorStop(1, hor);
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    if (SC.weather === 'clear' || SC.weather === 'wind') { const sp = project(DR.add(cam.pos, DR.mul(light.L, 900))); if (sp && sp[1] < hy) { const sg = g.createRadialGradient(sp[0], sp[1], 2, sp[0], sp[1], H * 0.22); sg.addColorStop(0, 'rgba(255,240,200,.95)'); sg.addColorStop(0.18, 'rgba(255,220,160,.4)'); sg.addColorStop(1, 'rgba(255,220,160,0)'); g.fillStyle = sg; g.fillRect(0, 0, W, Math.max(0, hy)); } }
    // 遠山
    g.fillStyle = 'rgba(70,64,80,.5)';
    for (const h of hills) { const c = [Math.cos(h.an) * h.r, Math.sin(h.an) * h.r, 0]; const pA = project([c[0] - Math.sin(h.an) * h.w, c[1] + Math.cos(h.an) * h.w, 0]), pB = project([c[0] + Math.sin(h.an) * h.w, c[1] - Math.cos(h.an) * h.w, 0]), pT = project([c[0], c[1], h.h]); if (!pA || !pB || !pT) continue; g.beginPath(); g.moveTo(pA[0], hy + 2); g.lineTo(pA[0], pA[1]); g.quadraticCurveTo(pT[0], pT[1] - (pA[1] - pT[1]) * 0.3, pB[0], pB[1]); g.lineTo(pB[0], hy + 2); g.closePath(); g.fill(); }
    // 地面
    const gg = g.createLinearGradient(0, hy, 0, H); gg.addColorStop(0, `rgb(${groundCol[0] - 40},${groundCol[1] - 36},${groundCol[2] - 30})`); gg.addColorStop(0.35, `rgb(${groundCol[0]},${groundCol[1]},${groundCol[2]})`); gg.addColorStop(1, `rgb(${groundCol[0] - 30},${groundCol[1] - 30},${groundCol[2] - 24})`);
    g.fillStyle = gg; g.fillRect(0, Math.max(0, hy), W, H);
    g.fillStyle = 'rgba(214,190,140,.22)'; g.fillRect(0, Math.max(0, hy) - 6, W, 14);
    // 踏み荒らされた土
    { const pts = []; for (let i = 0; i < 20; i++) { const an = i / 20 * 6.2832; pts.push([Math.cos(an) * 48, Math.sin(an) * 24, 0.08]); } P.poly(pts, 'rgba(120,96,60,.28)', { noLight: true, dz: 1e6 }); }
    for (const st of stones) P.sphere([st.x, st.y, st.s * 0.5], st.s, '#857a68');
    for (const tf of tufts) P.bill([tf.x, tf.y, 0], 2.4 * tf.s, 2.6 * tf.s, (g2, w, h) => { g2.strokeStyle = SC.weather === 'snow' ? 'rgba(120,110,100,.5)' : 'rgba(80,100,46,.7)'; g2.lineWidth = Math.max(0.6, w * 0.08); g2.beginPath(); g2.moveTo(0, 0); g2.lineTo(-w * 0.35, -h); g2.moveTo(0, 0); g2.lineTo(w * 0.1, -h * 1.1); g2.moveTo(0, 0); g2.lineTo(w * 0.4, -h * 0.8); g2.stroke(); });
    for (const m of armyMen) {
      const f = m.side ? b : a, E2 = m.side ? eb : ea, sx = (m.side ? -1 : 1) * (SC.aSide || -1);
      const ch = E2.cheer > 0 ? Math.max(0, Math.sin(SC.t * 14 + m.ph)) * E2.cheer * 3 : 0;
      P.bill([m.x * sx, m.y, 0], 4, 14 * m.h + ch, (g2, w, h) => { g2.fillStyle = 'rgba(40,32,24,.9)'; g2.beginPath(); g2.ellipse(0, -h * 0.55, w * 0.32, h * 0.3, 0, 0, 6.2832); g2.fill(); g2.beginPath(); g2.arc(0, -h * 0.9, w * 0.2, 0, 6.2832); g2.fill(); g2.strokeStyle = 'rgba(40,32,24,.9)'; g2.lineWidth = Math.max(0.5, w * 0.08); g2.beginPath(); g2.moveTo(w * 0.3, -h * 0.3); g2.lineTo(w * 0.3, -h * 1.7); g2.stroke(); if (m.flag) { g2.fillStyle = f.col; g2.fillRect(w * 0.3, -h * 1.7, w * 0.8 * -sx, h * 0.35); } });
    }
    // 旗手（それぞれの軍の前）
    for (const E2 of [ea, eb]) {
      const sx = (E2.side === 0 ? 1 : -1) * (SC.aSide || -1), fx = sx * 68, fy = 28;
      const wv = Math.sin(SC.t * 3 + E2.side) * 1.5;
      P.capsule([fx, fy, 0], [fx, fy, 30], 0.35, 0.3, '#3a2a1c');
      P.poly([[fx, fy, 30], [fx + sx * 11, fy + wv, 29.5], [fx + sx * 10.5, fy + wv * 0.6, 20], [fx, fy, 20.5]], E2.f.col, { line: 'rgba(201,161,74,.8)', noLight: true });
      P.bill([fx + sx * 5.5, fy + wv * 0.5, 25], 7, 7, (g2, w, h) => { g2.fillStyle = '#f6efdc'; g2.font = `${Math.round(h * 0.95)}px ${fontHead()}`; g2.textAlign = 'center'; g2.textBaseline = 'middle'; g2.fillText(S.mark(E2.f.src), 0, 0); }, { dz: -0.5 });
      P.bill([fx, fy - 1, 0], 4, 13, (g2, w, h) => { g2.fillStyle = 'rgba(45,36,28,.85)'; g2.beginPath(); g2.ellipse(0, -h * 0.55, w * 0.32, h * 0.3, 0, 0, 6.2832); g2.fill(); g2.beginPath(); g2.arc(0, -h * 0.9, w * 0.2, 0, 6.2832); g2.fill(); });
    }
  };
  // ---- 粒子 ----
  const spark = (c, n, col) => { for (let i = 0; i < n; i++) { const an = Math.random() * 6.2832, el = (Math.random() - 0.3) * 1.2, sp = 18 + Math.random() * 40; SC.parts.push({ p: c.slice(), v: [Math.cos(an) * Math.cos(el) * sp, Math.sin(an) * Math.cos(el) * sp, Math.sin(el) * sp + 10], t: 0, life: 0.3 + Math.random() * 0.4, col: col || (Math.random() < 0.5 ? '#ffe9a8' : '#ffb347'), r: 0.35 + Math.random() * 0.5 }); } };
  const blood = (c, n) => { for (let i = 0; i < n; i++) { const an = Math.random() * 6.2832, sp = 6 + Math.random() * 14; SC.parts.push({ p: c.slice(), v: [Math.cos(an) * sp, Math.sin(an) * sp, 8 + Math.random() * 14], t: 0, life: 0.5 + Math.random() * 0.5, col: '#7a1a12', r: 0.5 + Math.random() * 0.9, g: 1, stain: true }); } };
  const puff = (c, n, big) => { for (let i = 0; i < n; i++) SC.dust.push({ p: [c[0] + (Math.random() - 0.5) * 6, c[1] + (Math.random() - 0.5) * 4, 0.5], v: [(Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, 2 + Math.random() * 3], t: 0, life: 0.8 + Math.random() * 0.8, r: (big ? 4 : 2.2) + Math.random() * 2 }); };
  const stains = [];
  const num = (c, s, col) => SC.nums.push({ p: c, s, col, t: 0 });
  const drawFx = () => {
    const keepP = [];
    for (const q of SC.parts) { q.t += SC.dt; if (q.t < q.life) { q.p = DR.add(q.p, DR.mul(q.v, SC.dt)); q.v[2] -= (q.g ? 60 : 40) * SC.dt; if (q.p[2] <= 0.2 && q.stain) { if (stains.length < 60) stains.push({ p: [q.p[0], q.p[1], 0.12], r: q.r * 2.2 }); continue; } keepP.push(q); const k = 1 - q.t / q.life; P.bill(q.p, q.r * 2, q.r * 2, (g2, w) => { g2.globalAlpha = k; g2.fillStyle = q.col; g2.beginPath(); g2.arc(0, 0, Math.max(0.8, w / 2), 0, 6.2832); g2.fill(); g2.globalAlpha = 1; }); } }
    SC.parts = keepP;
    for (const st of stains) P.poly([[st.p[0] - st.r, st.p[1] - st.r * 0.6, 0.1], [st.p[0] + st.r, st.p[1] - st.r * 0.6, 0.1], [st.p[0] + st.r * 0.8, st.p[1] + st.r * 0.7, 0.1], [st.p[0] - st.r * 0.7, st.p[1] + st.r * 0.6, 0.1]], 'rgba(90,20,14,.55)', { noLight: true, dz: 1e5 });
    const keepD = [];
    for (const d of SC.dust) { d.t += SC.dt; if (d.t < d.life) { keepD.push(d); d.p = DR.add(d.p, DR.mul(d.v, SC.dt)); const k = 1 - d.t / d.life; P.bill(d.p, d.r * (1.6 - k * 0.6) * 2, d.r * (1.6 - k * 0.6) * 2, (g2, w) => { g2.fillStyle = `rgba(200,180,140,${(0.3 * k).toFixed(3)})`; g2.beginPath(); g2.arc(0, 0, w / 2, 0, 6.2832); g2.fill(); }, { dz: -2 }); } }
    SC.dust = keepD;
  };
  const drawNums = () => {
    const keepN = [];
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const n of SC.nums) { n.t += SC.dt; if (n.t < 1.1) { keepN.push(n); const p = project(DR.add(n.p, [0, 0, 8 * n.t / 1.1])); if (!p) continue; const k = n.t / 1.1; g.font = `700 ${Math.round((26 + (k < 0.15 ? (0.15 - k) * 90 : 0)) * Math.min(1.4, W / 390))}px ${fontHead()}`; g.globalAlpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1; g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,.8)'; g.strokeText(n.s, p[0], p[1]); g.fillStyle = n.col; g.fillText(n.s, p[0], p[1]); } }
    SC.nums = keepN; g.globalAlpha = 1;
    if (SC.lines > 0) { g.strokeStyle = `rgba(255,250,235,${(0.5 * SC.lines).toFixed(3)})`; const cx = W / 2, cy = H * CY, R = Math.hypot(W, H); for (let i = 0; i < 48; i++) { const a2 = i / 48 * 6.2832 + SC.t * 0.5, r0 = R * (0.14 + ((i * 7) % 10) / 30), r1 = r0 + R * 0.25; g.lineWidth = 0.5 + (i % 3); g.beginPath(); g.moveTo(cx + Math.cos(a2) * r0, cy + Math.sin(a2) * r0); g.lineTo(cx + Math.cos(a2) * r1, cy + Math.sin(a2) * r1); g.stroke(); } }
    if (SC.flash > 0) { g.fillStyle = `rgba(255,250,235,${SC.flash.toFixed(3)})`; g.fillRect(0, 0, W, H); }
    if (SC.vign > 0) { const vg = g.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${(0.8 * SC.vign).toFixed(3)})`); g.fillStyle = vg; g.fillRect(0, 0, W, H); }
  };
  // ---- ループ ----
  let lastT = performance.now(), closed = false;
  const stepEntity = (e, real) => {
    if (e.prev) { const d = Math.hypot(e.pos[0] - e.prev[0], e.pos[1] - e.prev[1]); const v = SC.dt > 1e-4 ? d / SC.dt : e.vel; e.vel += (v - e.vel) * Math.min(1, real * 14); }
    e.prev = e.pos.slice();
    e.gait += SC.dt * (e.vel > 1.5 ? 6.2832 * e.vel / (e.horse ? HORSE.stride : 13) : 0.6);
    e.poseT += SC.dt;
    e.hit = Math.max(0, e.hit - real * 3); e.cheer = Math.max(0, e.cheer - real * 0.8);
    if (e.charge > 0) { e.glow = 0.6 + 0.4 * Math.sin(SC.t * 18); if (Math.random() < 0.6) spark(DR.add(e.pos, [(Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, (e.horse ? 18 : 8) + Math.random() * 10]), 1, '#ffe9a8'); }
    if (e.vel > 14 && Math.random() < (e.horse ? 0.6 : 0.3)) puff(DR.add(e.pos, [-Math.cos(e.heading) * (e.horse ? 10 : 3), 0, 0]), 1, e.vel > 30);
  };
  const loop = () => {
    if (closed) return;
    try { frame(); } catch (err) { prims = []; if (!SC.err) { SC.err = 1; console.warn('duel frame', err); } }
    requestAnimationFrame(loop);
  };
  const frame = () => {
    const now = performance.now(); const real = Math.min(0.05, (now - lastT) / 1000); lastT = now;
    SC.dt = real * SC.slow; SC.t += SC.dt;
    for (const e of [ea, eb]) stepEntity(e, real);
    for (const h of SC.runaway) { h.pos = DR.add(h.pos, DR.mul([Math.cos(h.heading), Math.sin(h.heading), 0], h.vel * SC.dt)); h.gait += SC.dt * 6.2832 * h.vel / HORSE.stride; h.rear = Math.max(0, h.rear - SC.dt * 2); }
    SC.shake = Math.max(0, SC.shake - real * 40); SC.flash = Math.max(0, SC.flash - real * 2.5);
    cam.orbit += real * 0.35;
    camUpdate(real);
    g.setTransform(px, 0, 0, px, 0, 0);
    SC.zoom += (1 - SC.zoom) * Math.min(1, real * 4);
    if (SC.zoom > 1.001) { g.translate(W / 2, H * CY); g.scale(SC.zoom, SC.zoom); g.translate(-W / 2, -H * CY); }
    drawEnv();
    for (const e of [ea, eb]) { if (e.gone) continue; const HF = e.horse ? drawHorse(e) : null; drawRider(e, HF); }
    for (const h of SC.runaway) if (Math.abs(h.pos[0]) < 420 && Math.abs(h.pos[1]) < 300) drawHorse(h);
    drawFx();
    drawPrims();
    drawNums();
    bars.style.setProperty('--bar', SC.wide ? (W > H ? '9vh' : '6vh') : '0px');
    const ms = performance.now() - now; SC.ms = SC.ms == null ? ms : SC.ms + (ms - SC.ms) * 0.1; SC.nPrim = SC.lastPrims;
  };
  cut(SHOTS.wide); camSetup();
  box._d = { cut, shot, SHOTS, readyShot, closeOf, ea, eb, a, b, cam, SC, setPose };
  requestAnimationFrame(loop);
  const onRs = () => resize(); window.addEventListener('resize', onRs);
  // ---- 動き（時間でつなぐ） ----
  const anim = (dur, fn) => new Promise(res => { let acc = 0, lt = performance.now(); const step = () => { if (closed) return res(); const now = performance.now(); acc += Math.min(0.05, (now - lt) / 1000) * SC.slow; lt = now; if (SC.skip) acc = dur; const k = Math.min(1, acc / dur); if (fn) fn(k); if (k >= 1) res(); else requestAnimationFrame(step); }; step(); });
  const wait = (ms) => new Promise(res => { const t0 = performance.now(); const tick = () => { if (closed || SC.skip || performance.now() - t0 >= ms) return res(); requestAnimationFrame(tick); }; tick(); });
  const sayLine = (who, text, cls) => { say.innerHTML = `<span class="${cls || ''} ${who ? (who === a ? 'sa' : 'sb') : ''}">${who ? `<b>${U.esc(who.n)}</b>` : ''}${U.esc(text)}</span>`; say.classList.remove('pop'); void say.offsetWidth; say.classList.add('pop'); };
  const bigKanji = async (s, cls, ms) => { kanji.textContent = s; kanji.className = 'dc-kanji ' + (cls || ''); kanji.hidden = false; await wait(ms || 650); kanji.hidden = true; };
  const snd = (k) => { if (typeof SND !== 'undefined' && SND.play) SND.play(k); };
  const hitFx = (target, dmg, strong) => {
    const c = DR.add(target.pos, [0, 0, target.horse ? 23 : 13]);
    spark(c, strong ? 34 : 16);
    SC.shake = Math.max(SC.shake, strong ? 14 : 6); SC.flash = Math.max(SC.flash, strong ? 0.45 : 0.15);
    target.hit = 1; num(DR.add(c, [target.pos[0] < mid()[0] ? -6 : 6, 0, 3]), String(Math.round(dmg)), strong ? '#ffd36a' : '#ffe6c0');
    if (dmg > 18) blood(c, strong ? 14 : 6);
    setExpr(target.f, 'pain');
    snd(strong ? 'clash_big' : 'clash');
    if (navigator.vibrate) { try { navigator.vibrate(strong ? 40 : 15); } catch (e) {} }
  };
  const upd = () => {
    U.$('#d-ah', box).style.width = Math.max(0, Math.min(100, a.hp / a.hp0 * 100)) + '%';
    U.$('#d-bh', box).style.width = Math.max(0, Math.min(100, b.hp / b.hp0 * 100)) + '%';
    U.$('#d-ak', box).style.width = Math.max(0, Math.min(100, a.ki)) + '%';
    U.$('#d-bk', box).style.width = Math.max(0, Math.min(100, b.ki)) + '%';
    U.$('.dc-fa .ki', box).classList.toggle('full', a.ki >= 100); U.$('.dc-fb .ki', box).classList.toggle('full', b.ki >= 100);
    U.$('#dc-round', box).textContent = round ? `${U.kanjiNum(round)}合目${mounted ? '' : '・徒歩'}` : '';
    U.$('#d-log', box).innerHTML = log.slice(-3).map(s => `<div>${s}</div>`).join('');
    const acts = U.$('#d-acts', box);
    acts.innerHTML = ['atk', 'pow', 'grd', 'sp', 'flee'].map(k => `<button data-k="${k}" class="${k === 'sp' ? 'sp' : ''}" ${done || busy || (k === 'sp' && a.ki < 100) || (k === 'flee' && o.noFlee) || (k === 'flee' && o.sport) ? 'disabled' : ''}>${k === 'sp' && a.ki >= 100 ? U.esc(a.spName.split('・')[1] || '必殺') : UI.DUEL_ACT[k].n}<small>${k === 'sp' ? U.esc(a.spName.split('・')[0]) + 'の大技' : UI.DUEL_ACT[k].d}</small></button>`).join('');
    for (const bb of U.$$('button', acts)) bb.onclick = () => turn(bb.dataset.k);
    U.$('#d-auto', box).disabled = done || busy;
  };
  const aiPick = () => {
    if (b.ki >= 100 && Math.random() < 0.75) return 'sp';
    if (b.hp < b.hp0 * 0.25 && b.st !== 'ins' && !o.sport && Math.random() < 0.18) return 'flee';
    const w = { atk: 3, pow: b.st === 'ins' ? 3 : 2, grd: b.st === 'chi' ? 3 : 2 };
    if (last === 'grd') { w.atk += 2; w.pow -= 1; }
    if (last === 'pow') { w.grd += 2.5; }
    if (last === 'atk') { w.pow += 1.5; }
    return U.wpick(Object.keys(w), k => w[k]);
  };
  const newHint = () => {
    hintAct = aiPick();
    const p = Math.max(0.15, Math.min(0.92, 0.35 + (a.chi - b.chi) / 200 + (a.bu - b.bu) / 300 + (a.st === 'ins' ? 0.1 : 0) + a.rd - b.rd * 0.5));
    let shown = null;
    if (Math.random() < p) {
      shown = Math.random() < 0.82 ? hintAct : U.pick(['atk', 'pow', 'grd']);
      hintEl.textContent = { atk: `${b.n}は間合いを詰めてくる……`, pow: `${b.n}が大きく振りかぶった！`, grd: `${b.n}は構えを固めた。`, sp: `${b.n}の気が満ちている！`, flee: `${b.n}の目が泳いでいる……` }[shown];
    } else hintEl.textContent = `${b.n}の動きが読めない。`;
    setPose(eb, shown === 'pow' || shown === 'sp' ? 'swing_wind' : shown === 'grd' ? 'guard' : shown === 'atk' ? 'thrust_wind' : 'ready', 0.7);
    eb.glow = shown === 'sp' ? 0.6 : 0;
    setPose(ea, 'ready', 0.5);
  };
  const dmg = (x, y, m) => (8 + x.bu * 0.18) * Math.pow(x.bu / Math.max(1, y.bu), 0.6) * U.rf(0.85, 1.15) * m * x.dm;
  const windOf = (k, wep) => k === 'grd' ? 'guard' : wep === 'dagger' ? 'stab_wind' : k === 'pow' ? 'swing_wind' : k === 'sp' ? ((wep === 'ji' || wep === 'spear') ? 'sweep_wind' : 'swing_wind') : (wep === 'spear' || wep === 'ji') ? 'thrust_wind' : (k === 'atk' && Math.random() < 0.5 ? 'swing_wind' : 'thrust_wind');
  const hitOf = (wind) => ({ guard: 'guard', stab_wind: 'stab_hit', swing_wind: 'swing_hit', sweep_wind: 'sweep_hit', thrust_wind: 'thrust_hit' }[wind] || 'thrust_hit');
  // 走り寄る：x を詰め、y を自分の筋へ（騎馬は駈歩、徒歩は走る）
  const approach = async (dur) => {
    const x0 = ea.pos[0], x1 = eb.pos[0], y0 = ea.pos[1], y1 = eb.pos[1];
    const gap = mounted ? 5.6 : 4.4, sA = x0 < x1 ? -1 : 1;
    const laneA = cs < 0 ? -LANE : LANE;
    await anim(dur, k => { const e2 = DR.easeIn(Math.min(1, k * 1.1)); ea.pos[0] = x0 + (sA * gap - x0) * e2; eb.pos[0] = x1 + (-sA * gap - x1) * e2; const e3 = DR.ease(k); ea.pos[1] = y0 + (laneA - y0) * e3; eb.pos[1] = y1 + (-laneA - y1) * e3; });
  };
  // 駆け抜ける（騎馬）：勢いのまま相手の側へ
  const passThrough = async (dur) => {
    const x0 = ea.pos[0], x1 = eb.pos[0];
    const sA = x0 < x1 ? 1 : -1, far = 24;
    await anim(dur, k => { const e2 = DR.easeOut(k); ea.pos[0] = x0 + (sA * far - x0) * e2; eb.pos[0] = x1 + (-sA * far - x1) * e2; });
  };
  // 馬首を返す：弧を描いて半回転
  const wheel = async (dur) => {
    const st = [ea, eb].map(e => ({ h0: e.heading, p0: e.pos.slice(), left: [-Math.sin(e.heading), Math.cos(e.heading)] }));
    const r = mounted ? 5 : 1.5;
    await anim(dur, k => {
      const t = DR.ease(k);
      [ea, eb].forEach((e, i) => {
        const s = st[i]; const h = s.h0 + Math.PI * t;
        const c = [s.p0[0] + s.left[0] * r, s.p0[1] + s.left[1] * r];
        e.heading = h; e.pos[0] = c[0] + Math.sin(h) * r; e.pos[1] = c[1] - Math.cos(h) * r;
      });
    });
    for (const e of [ea, eb]) e.heading = ((e.heading % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  };
  // 構え直す：互いに READY の距離へ
  const settle = async (dur) => {
    const x0 = ea.pos[0], x1 = eb.pos[0], y0 = ea.pos[1], y1 = eb.pos[1];
    const sA = x0 < x1 ? -1 : 1, laneA = cs < 0 ? -LANE : LANE;
    await anim(dur, k => { const e2 = DR.easeOut(k); ea.pos[0] = x0 + (sA * READY - x0) * e2; eb.pos[0] = x1 + (-sA * READY - x1) * e2; ea.pos[1] = y0 + (laneA - y0) * e2; eb.pos[1] = y1 + (-laneA - y1) * e2; });
    ea.heading = sA < 0 ? 0 : Math.PI; eb.heading = sA < 0 ? Math.PI : 0;
  };
  // 徒歩：間合いを取る（後ろへ下がる）
  const stepBack = async (dur) => {
    const x0 = ea.pos[0], x1 = eb.pos[0];
    const sA = x0 < x1 ? -1 : 1;
    await anim(dur, k => { const e2 = DR.easeOut(k); ea.pos[0] = x0 + (sA * READY - x0) * e2; eb.pos[0] = x1 + (-sA * READY - x1) * e2; });
  };
  const faceEachOther = () => { const sA = ea.pos[0] < eb.pos[0] ? 1 : -1; ea.heading = sA > 0 ? 0 : Math.PI; eb.heading = sA > 0 ? Math.PI : 0; };
  // ---- 決着 ----
  const finish = async (res) => {
    done = true; busy = true; upd();
    SC.skip = false;
    const winE = res.win ? ea : (res.draw ? null : eb), loseE = res.win ? eb : (res.draw ? null : ea);
    if (res.fled) {
      const fe = res.win ? eb : ea, other = res.win ? ea : eb;
      sayLine(fe.f, UI.duelLine('flee', fe.f)); setExpr(fe.f, 'shock');
      shot(followShot(fe), 0.6); SC.wide = true;
      const h0 = fe.heading, p0 = fe.pos.slice(), left = [-Math.sin(h0), Math.cos(h0)], r = fe.horse ? 5 : 1.5;
      await anim(0.6, k => { const t = DR.ease(k); const h = h0 + Math.PI * t; fe.heading = h; fe.pos[0] = p0[0] + left[0] * r + Math.sin(h) * r; fe.pos[1] = p0[1] + left[1] * r - Math.cos(h) * r; });
      snd(fe.horse ? 'hoof' : 'whoosh');
      await anim(1.2, k => { fe.pos[0] += Math.cos(fe.heading) * (fe.horse ? 85 : 26) * SC.dt; fe.pos[1] += Math.sin(fe.heading) * (fe.horse ? 85 : 26) * SC.dt; });
      fe.gone = true;
      if (res.win) { setPose(other, 'raise', 0.5); sayLine(a, UI.duelLine('win', a)); setExpr(a, 'joy'); other.cheer = 1.5; shot(victorShot(other), 0.8); await wait(700); }
    } else if (res.draw) {
      sayLine(null, UI.duelLine('draw', a)); setExpr(a, 'calm'); setExpr(b, 'calm');
      shot(SHOTS.wide, 1.0);
      await wait(900);
    } else if (winE && loseE) {
      SC.slow = 0.3; SC.vign = 0.6; SC.wide = true;
      snd('finish');
      cut(fallShot(loseE));
      await bigKanji(res.kill ? '討' : '勝', 'red', 700);
      setExpr(winE.f, 'angry'); setExpr(loseE.f, 'pain');
      if (res.kill) {
        loseE.fallDir = cs < 0 ? -1 : 1;
        setPose(loseE, 'recoil', 0.3);
        loseE.wasHorse = loseE.horse;
        await anim(1.1, k => { loseE.fall = DR.ease(k); if (loseE.horse && k < 0.35) loseE.rear = Math.sin(k / 0.35 * Math.PI) * 0.6; else loseE.rear = 0; });
        if (loseE.horse) { // 馬だけ駆け去る
          const hf = horseFrames(loseE);
          SC.runaway.push({ pos: loseE.pos.slice(), heading: loseE.heading + (cs < 0 ? 1 : -1) * 0.5, vel: 55, gait: loseE.gait, rear: 0.3, f: loseE.f, noReins: true });
          loseE.horse = false; loseE.pos = [loseE.pos[0], loseE.pos[1], 0];
          void hf;
        }
        blood(DR.add(loseE.pos, [0, 0, 4]), 18);
        puff(loseE.pos, 8, true);
        snd('block');
        SC.slow = 1; SC.vign = 0.25;
        shot(victorShot(winE), 1.2); cam.orbit = 0;
        setPose(winE, 'raise', 0.5); winE.cheer = 1.5;
        if (winE.horse) { snd('neigh'); await anim(0.9, k => { winE.rear = Math.sin(k * Math.PI) * 0.85; }); winE.rear = 0; }
        sayLine(winE.f, UI.duelLine('win', winE.f), 'win'); setExpr(winE.f, 'joy');
      } else {
        // 打ち負かした（生かして帰す）
        setPose(loseE, 'slump', 0.4); loseE.slump = 1;
        await anim(0.5, k => { if (loseE.horse) loseE.rear = Math.sin(k * Math.PI) * 0.45; });
        loseE.rear = 0;
        SC.slow = 1; SC.vign = 0.25;
        sayLine(loseE.f, UI.duelLine('lose_live', loseE.f), 'pain');
        shot(followShot(loseE), 0.8);
        const h0 = loseE.heading, p0 = loseE.pos.slice(), left = [-Math.sin(h0), Math.cos(h0)], r = loseE.horse ? 5 : 1.5;
        await anim(0.7, k => { const t = DR.ease(k); const h = h0 + Math.PI * t; loseE.heading = h; loseE.pos[0] = p0[0] + left[0] * r + Math.sin(h) * r; loseE.pos[1] = p0[1] + left[1] * r - Math.cos(h) * r; });
        await anim(1.1, k => { loseE.pos[0] += Math.cos(loseE.heading) * (loseE.horse ? 45 : 16) * SC.dt; loseE.pos[1] += Math.sin(loseE.heading) * (loseE.horse ? 45 : 16) * SC.dt; });
        loseE.gone = true;
        shot(victorShot(winE), 1.0); cam.orbit = 0;
        setPose(winE, 'raise', 0.5); winE.cheer = 1.5;
        sayLine(winE.f, UI.duelLine('win_spare', winE.f), 'win'); setExpr(winE.f, 'joy');
      }
      spark(DR.add(winE.pos, [0, 0, winE.horse ? 30 : 20]), 10, '#fff2c0');
      snd('roar');
      await wait(1000);
    }
    await wait(res.fled || res.draw ? 500 : 500);
    closed = true; window.removeEventListener('resize', onRs);
    if (typeof SND !== 'undefined') SND.bgm(prevBgm);
    close(res);
  };
  // ---- 落馬 → 徒歩の立ち合い ----
  const unhorse = async (loser, winner) => {
    unhorsed = true;
    sayLine(loser.f, UI.duelLine('unhorse', loser.f), 'pain'); setExpr(loser.f, 'shock');
    snd('neigh');
    cut(closeOf(loser)); SC.wide = true;
    SC.slow = 0.45;
    loser.fallDir = cs < 0 ? 1 : -1; loser.wasHorse = true;
    await anim(0.9, k => { loser.rear = Math.sin(Math.min(1, k * 1.5) * Math.PI) * 0.9; loser.fall = DR.ease(k) * 0.9; });
    puff(loser.pos, 10, true); snd('block');
    SC.slow = 1;
    // 馬は駆け去り、将は立ち上がる
    SC.runaway.push({ pos: loser.pos.slice(), heading: loser.heading + (cs < 0 ? 1 : -1) * 0.6, vel: 55, gait: loser.gait, rear: 0.4, f: loser.f, noReins: true });
    loser.horse = false; loser.rear = 0;
    loser.pos = [loser.pos[0] - Math.cos(loser.heading) * 6, loser.pos[1] + loser.fallDir * 5.5, 0];
    shot(SHOTS.wideLow, 0.9);
    await anim(0.9, k => { loser.fall = 0.9 * (1 - DR.ease(k)); });
    loser.fall = 0; loser.wasHorse = false; setPose(loser, 'ready', 0.4);
    // 勝っている方も降りる
    sayLine(winner.f, UI.duelLine('dismount', winner.f)); setExpr(winner.f, 'angry');
    await wait(400);
    SC.runaway.push({ pos: winner.pos.slice(), heading: winner.heading + (cs < 0 ? -1 : 1) * 0.7, vel: 40, gait: winner.gait, rear: 0, f: winner.f, noReins: true });
    winner.horse = false; winner.pos = [winner.pos[0], winner.pos[1] + (cs < 0 ? -4 : 4), 0];
    mounted = false;
    faceEachOther();
    shot(readyShot(), 0.8);
    await stepBack(0.9);
    loser.f.hp = Math.max(1, loser.f.hp - loser.f.hp0 * 0.06);
    log.push(`${loser.f.n}は落馬した！ 両者、馬を降りて立ち合う。`);
    SC.wide = false;
  };
  // ---- 一合 ----
  const turn = async (ka) => {
    if (done || busy) return;
    busy = true; upd();
    hintEl.textContent = '';
    round++;
    const kb = hintAct || aiPick();
    setExpr(a, ka === 'grd' ? 'calm' : 'angry'); setExpr(b, kb === 'grd' ? 'calm' : 'angry');
    // 必殺の溜め
    if (ka === 'sp' || kb === 'sp') {
      const who = ka === 'sp' ? ea : eb, whoF = ka === 'sp' ? a : b, oth = ka === 'sp' ? eb : ea;
      who.charge = 1; snd('sp'); sayLine(whoF, UI.duelLine('sp', whoF), 'sp');
      SC.vign = 0.55; SC.wide = true;
      cut(overOf(oth, who));
      await anim(0.8, k => { SC.slow = 1 - k * 0.5; if (who.horse && k > 0.4) who.rear = Math.min(1, (k - 0.4) * 2.5); });
      if (who.horse) snd('neigh');
      await bigKanji(whoF.spName, 'sp', 800);
      who.charge = 0; who.glow = 1; SC.slow = 1;
      await anim(0.3, k => { who.rear = Math.max(0, who.rear - k * 1.5); });
      who.rear = 0;
    }
    if (ka === 'flee') {
      const pr = Math.max(0.1, Math.min(0.92, 0.35 + (a.bu - b.bu) / 200 + ((typeof G !== 'undefined' && G && G.me && G.me.eq && G.me.eq.horse) ? 0.15 : 0) + a.fl));
      if (Math.random() < pr) { log.push(`${a.n}は馬首を返して退いた。`); return finish({ win: false, fled: true }); }
      const d = dmg(b, a, 1.2); a.hp -= d; log.push(`退き損ねた！ ${a.n}は${Math.round(d)}の手傷を負った。`);
      await chase(ea, eb, d);
    } else if (kb === 'flee') {
      const pr = Math.max(0.1, Math.min(0.8, 0.35 + (b.bu - a.bu) / 200));
      if (Math.random() < pr) { log.push(`${b.n}は逃げ出した！`); return finish({ win: true, fled: true }); }
      const d = dmg(a, b, 1.3); b.hp -= d; log.push(`${b.n}が逃げようとした背に一撃！（${Math.round(d)}）`);
      await chase(eb, ea, d);
    } else {
      const [ma, mb] = UI.DUEL_M[ka][kb];
      const da = dmg(a, b, ma), db = dmg(b, a, mb);
      const strongA = ma >= 1.8, strongB = mb >= 1.8;
      const wa = windOf(ka, a.wep), wb = windOf(kb, b.wep);
      // 予備動作＋突進
      snd(mounted ? 'hoof' : 'whoosh');
      setPose(ea, wa, 0.5); setPose(eb, wb, 0.5);
      shot(SHOTS.track, 0.35); SC.wide = true;
      await approach(mounted ? 0.5 : 0.4);
      // 本動作 → 激突
      setPose(ea, hitOf(wa), 0.12); setPose(eb, hitOf(wb), 0.12);
      cut(SHOTS.clash); cam.orbit = 0;
      await anim(0.12);
      const c = DR.add(mid(), [0, 0, mounted ? 23 : 13]);
      spark(c, 22, '#fff3c4');
      SC.lines = 1;
      const lock = Math.abs(da - db) < 7 && da > 8 && ka !== 'grd' && kb !== 'grd';
      if (lock) {
        setPose(ea, 'lock', 0.15); setPose(eb, 'lock', 0.15); snd('clash');
        sayLine(Math.random() < 0.5 ? a : b, UI.duelLine('lock', a), 'pain');
        SC.slow = 0.6;
        await anim(0.7, k => { SC.shake = 3; ea.pos[0] += Math.sin(k * 40) * 0.2; eb.pos[0] -= Math.sin(k * 40) * 0.2; if (Math.random() < 0.3) spark(c, 1, '#ffe9a8'); });
        SC.slow = 1;
      }
      SC.zoom = strongA || strongB ? 1.18 : 1.08;
      { const keep = SC.slow; SC.slow = 0.05; await wait(strongA || strongB ? 170 : 100); SC.slow = keep; }
      if (da > 0.5) { hitFx(eb, da, strongA || da > db * 1.8); setPose(eb, 'recoil', 0.25); } else { spark(DR.add(eb.pos, [0, 0, mounted ? 22 : 12]), 8, '#cfd8e0'); snd('block'); }
      if (db > 0.5) { hitFx(ea, db, strongB || db > da * 1.8); setPose(ea, 'recoil', 0.25); } else { spark(DR.add(ea.pos, [0, 0, mounted ? 22 : 12]), 8, '#cfd8e0'); snd('block'); }
      b.hp -= da; a.hp -= db;
      if (da > db * 1.6 && da > 10) { ea.cheer = 1; sayLine(a, UI.duelLine(ka === 'grd' ? 'parry' : 'taunt', a)); }
      else if (db > da * 1.6 && db > 10) { eb.cheer = 1; sayLine(b, UI.duelLine(kb === 'grd' ? 'parry' : 'taunt', b)); }
      else if (ka === 'grd' && kb === 'grd') sayLine(null, '互いに受けに回り、睨み合う……');
      else if (!lock && Math.abs(da - db) < 6 && da > 8) sayLine(null, '刃と刃がかみ合い、火花が散る！');
      const desc = { atk: '打ち込んだ', pow: '渾身の強撃を放った', grd: '受けに回った', sp: '必殺の一撃を繰り出した' };
      log.push(`${a.n}は${desc[ka]}。${b.n}は${desc[kb]}。<b>${Math.round(da)}</b> 対 <b>${Math.round(db)}</b>`);
      a.ki = ka === 'sp' ? 0 : Math.min(100, a.ki + (({ atk: 10, pow: 8, grd: 22 }[ka] || 0) + (db > 0 ? 10 : 0)) * a.kg);
      b.ki = kb === 'sp' ? 0 : Math.min(100, b.ki + (({ atk: 10, pow: 8, grd: 22 }[kb] || 0) + (da > 0 ? 10 : 0)) * b.kg);
      SC.slow = 1; SC.vign = 0; ea.glow = eb.glow = 0;
      const alive = a.hp > 0 && b.hp > 0;
      if (mounted) {
        // 勢いのまま駆け抜け、馬首を返す。カメラは逆側へ切り返す
        shot(SHOTS.clashOrbit, 0.6);
        await passThrough(alive ? 0.55 : 0.45);
        SC.lines = 0;
        if (alive && !unhorsed && (round >= 2 || SC.forceUnhorse)) {
          const cand = SC.forceUnhorse ? (SC.forceUnhorse === 'a' ? ea : eb) : (a.hp < a.hp0 * 0.4 && db > 10) ? ea : (b.hp < b.hp0 * 0.4 && da > 10) ? eb : null;
          if (cand && (Math.random() < 0.45 || SC.forceUnhorse)) { await unhorse(cand, cand === ea ? eb : ea); last = ka; upd(); return afterTurn(); }
        }
        if (alive) {
          cs = -cs; cut(readyShot()); SC.wide = false;
          await wheel(0.6);
          await settle(0.4);
        }
      } else {
        shot(SHOTS.clashOrbit, 0.5);
        await anim(0.35, k => { SC.lines = Math.max(0, 1 - k * 2); });
        if (alive) { shot(readyShot(), 0.6); SC.wide = false; await stepBack(0.5); }
      }
    }
    SC.slow = 1; SC.vign = 0; SC.wide = false; SC.lines = 0; ea.glow = eb.glow = 0;
    last = ka;
    upd();
    return afterTurn();
  };
  const afterTurn = async () => {
    SC.skip = false;
    if (a.hp <= 0 || b.hp <= 0) {
      const win = b.hp <= 0 && a.hp > b.hp;
      const kill = !o.sport && (Math.random() < 0.65 || !!SC.forceKill);
      log.push(win ? `${a.n}の勝ちだ！${kill ? `${b.n}を討ち取った！` : ''}` : `${a.n}は打ち負かされた……`);
      upd();
      return finish({ win, kill });
    }
    if (round >= 12) { log.push('勝負つかず。両者は互いに退いた。'); return finish({ win: false, draw: true }); }
    if (a.hp < a.hp0 * 0.3 && Math.random() < 0.5) sayLine(a, UI.duelLine('pain', a), 'pain');
    setExpr(a, a.hp < a.hp0 * 0.35 ? 'pain' : 'normal'); setExpr(b, b.hp < b.hp0 * 0.35 ? 'pain' : 'normal');
    busy = false; newHint(); upd();
  };
  // 逃げる背を追って一撃
  const chase = async (runner, chaser, d) => {
    shot(SHOTS.track, 0.3); SC.wide = true;
    const h0 = runner.heading, p0 = runner.pos.slice(), left = [-Math.sin(h0), Math.cos(h0)], r = runner.horse ? 4 : 1.2;
    await anim(0.45, k => { const t = DR.ease(k); const h = h0 + Math.PI * t; runner.heading = h; runner.pos[0] = p0[0] + left[0] * r + Math.sin(h) * r; runner.pos[1] = p0[1] + left[1] * r - Math.cos(h) * r; });
    setPose(chaser, runner.horse ? 'thrust_wind' : 'swing_wind', 0.3);
    const sp = runner.horse ? 40 : 14;
    await anim(0.6, k => { runner.pos[0] += Math.cos(runner.heading) * sp * SC.dt; runner.pos[1] += Math.sin(runner.heading) * sp * SC.dt; const tgt = DR.add(runner.pos, DR.mul([Math.cos(runner.heading), Math.sin(runner.heading), 0], -(runner.horse ? 9 : 4))); chaser.pos[0] += (tgt[0] - chaser.pos[0]) * Math.min(1, SC.dt * 9); chaser.pos[1] += (tgt[1] - chaser.pos[1]) * Math.min(1, SC.dt * 9); chaser.heading = runner.heading; });
    setPose(chaser, runner.horse ? 'thrust_hit' : 'swing_hit', 0.12); await anim(0.12);
    hitFx(runner, d, false); setPose(runner, 'recoil', 0.25);
    await anim(0.5);
    // 向き直る
    faceEachOther();
    shot(readyShot(), 0.7); SC.wide = false;
    await settle(0.7);
  };
  U.$('#d-auto', box).onclick = () => {
    const best = (a.ki >= 100) ? 'sp' : hintAct === 'pow' ? 'grd' : hintAct === 'grd' ? 'atk' : hintAct === 'atk' ? 'pow' : 'atk';
    turn(best);
  };
  // ---- 登場と名乗り ----
  (async () => {
    upd();
    snd('duel_intro');
    SC.wide = true;
    const far = mounted ? 95 : 40;
    ea.pos[0] = -far; eb.pos[0] = far; ea.prev = eb.prev = null;
    cut({ fov: 48, pos: () => [cs * 30, cs * 150, 34], tgt: () => [0, 0, 12] });
    shot(SHOTS.wide, 1.5, DR.easeOut);
    await anim(1.3, k => { const e2 = DR.easeOut(k); ea.pos[0] = -far + (-READY + far) * e2; eb.pos[0] = far + (READY - far) * e2; });
    if (closed) return;
    const isMe = A0.player || (typeof G !== 'undefined' && G && G.me && o.a.id === G.me.oid);
    cut(closeOf(ea));
    sayLine(a, UI.duelLine(isMe ? 'intro_me' : `intro_${a.st}`, a), 'intro'); setExpr(a, 'angry');
    if (mounted) { snd('neigh'); await anim(1.0, k => { ea.rear = Math.sin(k * Math.PI) * 0.65; }); ea.rear = 0; } else { setPose(ea, 'raise', 0.4); await wait(900); }
    await wait(500);
    if (closed) return;
    cut(closeOf(eb));
    sayLine(b, UI.duelLine(`intro_${b.st}`, b), 'intro'); setExpr(b, 'angry');
    setPose(eb, 'raise', 0.5);
    await wait(1200);
    setPose(eb, 'ready', 0.5); setPose(ea, 'ready', 0.5);
    if (closed) return;
    say.innerHTML = '';
    shot(readyShot(), 0.9);
    SC.wide = false; SC.skip = false; skipEl.remove();
    setExpr(a, 'normal'); setExpr(b, 'normal');
    busy = false; newHint(); upd();
  })();
  // 名乗りや立ち合いの動きはタップで早送り（決着の場面は飛ばさない）
  cv.onpointerdown = () => { if (busy && !done) SC.skip = true; };
});
