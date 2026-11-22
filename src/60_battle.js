/* =========================================================
   地中海覇道 — battle model（描画なし）
   伍ごとの士気セル・陣形・地形・乱戦・挟撃・射撃区域・伏兵・攻城・一騎打ち
   ========================================================= */
const B = {};
B.COLS = 96; B.ROWS = 128;
B.TS = B.COLS / 48;   // 旧格子（48×64）に対する格子の細かさ
B.K = 0.0085;          // 白兵の殺傷係数（交戦兵1人あたり/秒）
B.REL_SIDE = { F: 1, L: 1.5, Rt: 1.5, R: 2.0 };
B.SIDES = ['F', 'L', 'Rt', 'R'];

/* ---------------- 生成 ---------------- */
B.create = (spec) => {
  const total = spec.units.reduce((s, u) => s + u.n, 0);
  let W = U.clamp(60 * Math.pow(Math.max(10, total), 0.33), 130, 1600);
  if (spec.kind === 'siege' || spec.kind === 'pass') W = Math.max(W, 560);
  // 海戦：船は場所をとり、回り込む海も要る
  if (spec.kind === 'naval') W = U.clamp(W * 1.35, 520, 1700);
  const tile = W / B.COLS;
  const H = tile * B.ROWS;
  const T0 = tile * B.TS;   // 旧格子1枚の大きさ（距離の目安）
  const bt = {
    spec, W, H, tile, T0, cols: B.COLS, rows: B.ROWS, p: Math.max(1.5, W / 340),
    time: 0, day: 1, dayLen: Math.round(240 + W * 0.22), maxDays: spec.maxDays || 1,
    units: [], sides: [], proj: [], fx: [], texts: [], log: [], points: [], walls: null, gateAt: null, wallAt: null, events: [],
    t05: 0, t1: 0, ended: false, paused: null, winner: -1, reason: '',
    stat: { meKills: 0, sideKills: [0, 0], slain: [], captured: [], duelWins: 0, points: 0, rearguard: 0, order: 0, disobey: 0, cmdKills: 0 },
    duelPairs: {}, wind: Math.random() * Math.PI * 2, cityTaken: false, meFate: 'ok', textSeq: 0,
    weather: spec.weather || 'clear', traps: [], started: false, naval: spec.kind === 'naval',
  };
  bt.stat.sunk = [0, 0];
  bt.rng = U.rng(spec.seed || 1);
  B.genTerrain(bt);
  B.mkSides(bt);
  for (let i = 0; i < spec.units.length; i++) bt.units.push(B.mkUnit(bt, spec.units[i], i));
  B.deploy(bt);
  // 包囲の成果：坑道で崩れた城壁、水攻めで弱った城壁
  if (bt.walls && bt.city && (spec.breach || spec.flooded)) {
    const ws = bt.walls.filter(w => w.kind === 'wall' && !w.broken && w.side === bt.city.side);
    if (spec.flooded) for (const w of ws) { w.hp = Math.round(w.hp * 0.55); w.maxhp = w.hp; }
    if (spec.breach && ws.length) { const front = ws.filter(w => (bt.city.side === 1 ? w.ny > 0 : w.ny < 0)); const pick = U.minBy(front.length ? front : ws, w => Math.abs(w.x - bt.city.x)); if (pick) B.collapseWall(bt, pick, '坑道で城壁が崩れている！'); }
  }
  B.genPoints(bt);
  for (const s of bt.sides) s.start = U.sum(bt.units.filter(u => u.side === s.idx), u => u.n);
  B.setupTactics(bt);
  for (const u of bt.units) { B.calcMorBase(bt, u); for (const c of u.cells) c.mor = u.morBase; }
  B.updateVis(bt);
  B.plan(bt, 0); B.plan(bt, 1);
  if (bt.sides[0].player && !bt.sides[0].cmdAll) { const me = bt.units.find(u => u.me); bt.myCp = 30; bt.myCpRegen = 0.08 + ((me && me.ld && me.ld.tou) || 50) / 900; }
  bt.deputies = (spec.deputies || []).map(d => Object.assign({ good: (d.tou >= 60 || d.chi >= 65) }, d));
  return bt;
};
/* 委任・分割 */
B.canCommand = (bt, u) => !!(u && B.alive(u) && u.side === 0 && bt.sides[0].player && !bt.ended && (u.mine || bt.sides[0].cmdAll));
B.delegate = (bt, u, mode, dep) => {
  if (!B.canCommand(bt, u)) return false;
  if (!mode) { u.delegate = null; u.ctrl = 'player'; u.order = null; return true; }
  const good = !!(dep && dep.good) || !!bt.sides[0].gunshi;
  u.delegate = { mode, basic: !good, n: dep ? dep.n : '' };
  u.ctrl = 'ai'; u.attach = null; u.order = null;
  u.role = good ? ({ attack: 'advance', defend: 'hold', flank: 'flank', follow: 'followMe' }[mode] || 'hold') : (mode === 'follow' ? 'followMe' : 'hold');
  u.home = { x: u.x, y: u.y, a: u.a };
  u.aiT = 0;
  return true;
};
B.split = (bt, u) => {
  if (!B.canCommand(bt, u) || u.n < 10 || u.cells.length < 2 || u.ut.fixed || u.wu) return null;
  const cells = u.cells.slice().sort((a, b) => a.c - b.c || a.r - b.r);
  const half = Math.floor(cells.length / 2);
  const mv = cells.slice(half);
  const nMove = U.sum(mv, c => c.n);
  const share = u.n0 * nMove / Math.max(1, u.n);
  const v = Object.assign({}, u);
  v.id = bt.units.length; v.cells = mv.map(c => Object.assign({}, c)); v.n = nMove; v.n0 = Math.round(share); v.dead = 0; v.routed = 0; v.kills = 0;
  v.me = false; v.hq = false; v.attach = null; v.order = null; v.path = null; v.eng = []; v.impact = {}; v.buffs = {}; v.cd = {}; v.zone = null; v.zoneFired = {};
  v.hitSide = { F: -9, L: -9, Rt: -9, R: -9 }; v.vis = [true, true]; v.wu = null; v.delegate = null; v.courier = null; v._gone = false;
  v.ld = { n: (u.ld ? u.ld.n + 'の' : '') + '別動隊', sei: '別', bu: Math.round((u.ld?.bu || 45) * 0.8), tou: Math.round((u.ld?.tou || 45) * 0.85), chi: 40, mi: 40, tr: [], st: 'bal' };
  v.ldSnap = null; v.ldFate = 'ok';
  v.splitFrom = u.id;   // 結合の相手を覚える（sq はそのまま：損害は同じ隊に集計される）
  u.cells = cells.slice(0, half); u.n -= nMove; u.n0 = Math.max(u.n, u.n0 - v.n0);
  B.layoutCells(u); B.layoutCells(v);
  const [rx, ry] = [Math.cos(u.a), Math.sin(u.a)];
  u.x -= rx * v.w * 0.55; u.y -= ry * v.w * 0.55;
  v.x = u.x + rx * (u.w / 2 + v.w / 2 + 2 * bt.fp); v.y = u.y + ry * (u.w / 2 + v.w / 2 + 2 * bt.fp);
  B.unstick(bt, v);
  bt.units.push(v);
  return v;
};
// 分けた隊の元をたどる（別動隊の別動隊でも本隊に戻る）
B.splitRoot = (bt, u) => { let r = u, g = 0; while (r && r.splitFrom != null && g++ < 20) r = bt.units[r.splitFrom]; return r || u; };
// 結合できる相手：同じ本隊から分かれた（または本隊そのものの）隊で、近くにいるもの
B.mergeTargets = (bt, u) => {
  if (!B.canCommand(bt, u) || u.wu || u.ut.fixed || u.onwall != null || u.state === 'rout') return [];
  const root = B.splitRoot(bt, u);
  return bt.units.filter(v => v !== u && B.canCommand(bt, v) && !v.wu && v.onwall == null && v.state !== 'rout' && v.t === u.t && B.splitRoot(bt, v) === root && B.edgeDist(u, v) < 40 * bt.p);
};
B.canMerge = (bt, u) => B.mergeTargets(bt, u).length > 0;
// u と v を一つの隊に戻す。本隊（分ける前の隊）が残り、別動隊は消える
B.merge = (bt, u, v) => {
  if (!u || !v || u === v || !B.mergeTargets(bt, u).includes(v)) return null;
  // 残す方：本隊（splitFrom を持たない）＞主人公の隊＞番号の小さい方
  let keep = u, gone = v;
  const rank = (x) => (x.splitFrom == null ? 4 : 0) + (x.me ? 2 : 0) + (x.ld && x.ldSnap ? 1 : 0);
  if (rank(v) > rank(u) || (rank(v) === rank(u) && v.id < u.id)) { keep = v; gone = u; }
  const nk = Math.max(1, keep.n), ng = Math.max(1, gone.n);
  // 位置は兵数の重みで寄せる（本隊が大きく動かないように）
  keep.x = (keep.x * nk + gone.x * ng) / (nk + ng); keep.y = (keep.y * nk + gone.y * ng) / (nk + ng);
  for (const c of gone.cells) { c.hit = -9; keep.cells.push(c); }
  keep.n += gone.n; keep.n0 += gone.n0; keep.kills += gone.kills || 0; keep.routed += gone.routed || 0; keep.dead += gone.dead || 0;
  keep.fat = (keep.fat * nk + (gone.fat || 0) * ng) / (nk + ng);
  if (keep.ut.range || keep.horseArch) keep.ammo = Math.round((keep.ammo * nk + (gone.ammo || 0) * ng) / (nk + ng));
  B.layoutCells(keep);
  B.unstick(bt, keep);
  keep.home = { x: keep.x, y: keep.y, a: keep.a };
  if (keep.hidden && !B.canHide(bt, keep)) keep.hidden = false;
  keep.order = null; keep.path = null; keep.state = keep.eng.length ? keep.state : 'idle';
  // 消える隊：兵も損害も本隊へ移したので、結果には数えない
  gone.n = 0; gone.n0 = 0; gone.kills = 0; gone.routed = 0; gone.dead = 0; gone.cells = []; gone.out = true; gone._gone = true; gone.merged = keep.id;
  gone.order = null; gone.eng = []; gone.hidden = false; gone.zone = null;
  B.unitGone(bt, gone);
  for (const w of bt.units) if (w.order && (w.order.target === gone.id) && w !== gone) w.order = Object.assign({}, w.order, { target: keep.id });
  B.text(bt, keep.x, keep.y, '合流', 'info');
  return keep;
};

B.mkSides = (bt) => {
  for (let i = 0; i < 2; i++) {
    const sd = bt.spec.sides[i];
    let color = sd.rebel ? '#7a5b3c' : (D.COUNTRIES[sd.c]?.color || '#666');
    if (sd.name === '盗賊団') color = D.BANDIT.color;
    if (sd.nomad) color = D.NOMAD.color;
    const s = {
      idx: i, c: sd.c, name: sd.name, color, player: !!sd.player, cmdAll: !!sd.cmdAll, cmd: sd.cmd, gunshi: sd.gunshi || null,
      tactics: [], known: sd.known ? sd.known.slice() : null, preset: sd.tactics ? sd.tactics.slice() : null, cp: 40, mo: (sd.morale || 0), start: 0, retreat: false, cmdDead: false, cmdDeadT: 0,
      plan: null, planT: -99, lawMorale: (typeof G !== 'undefined' && G && G.cty[sd.c]) ? S.lawAdd(sd.c, 'morale') : 0,
      bandit: !!sd.bandit, nomad: !!sd.nomad, fx: {}, acts: new Set(),
    };
    if (sd.name === '盗賊団') s.bandit = true;
    if (sd.nomad) s.nomad = true;
    if (i === 1 && sd.c === bt.spec.sides[0].c && !sd.rebel) s.color = '#7a5b3c';
    if (sd.pirate) { s.color = (D.PIRATES[sd.pirate] || {}).color || '#4f5d6e'; s.pirate = sd.pirate; }
    const c = s.cmd || { tou: 50, chi: 50 };
    if (!s.player && typeof PPL !== 'undefined' && !bt.spec.sides.every(x => !x.player)) { const df = PPL.diff(); s.mo += df.aiMor; s.misjudge = df.misjudge; s.planT0 = df.planT; }
    s.cpRegen0 = 0.12 + (c.tou || 50) / 700 + (c.chi || 50) / 900 + (s.gunshi ? s.gunshi.chi / 600 : 0);
    s.cpRegen = s.cpRegen0;
    bt.sides.push(s);
  }
};

/* ---------------- 効果（特性・戦術） ---------------- */
B.F = (u, k) => (u && u.fx && u.fx[k]) || 0;
B.addFx = (out, fx, mul = 1) => { if (fx) for (const k in fx) out[k] = (out[k] || 0) + fx[k] * mul; return out; };
B.ldFx = (ld, skipSide) => {
  const out = {};
  if (!ld) return out;
  for (const t of ld.tr || []) { const T = D.TRAITS[t]; if (!T) continue; if (skipSide && T.side) continue; B.addFx(out, T.fx); }
  if (ld.xfx) B.addFx(out, ld.xfx);
  return out;
};
B.isCmdLd = (bt, u) => { const c = bt.sides[u.side].cmd; return !!(u.ld && c && ((c.id && u.ld.id === c.id) || u.ld.n === c.n)); };
B.sideFx = (bt, s) => {
  const sd = bt.sides[s], out = {};
  for (const t of sd.tactics) B.addFx(out, D.TACTICS[t]?.fx);
  const add = (o) => { if (!o) return; for (const t of o.tr || []) { const T = D.TRAITS[t]; if (T && T.side) B.addFx(out, T.fx); } };
  if (!sd.cmdDead) add(sd.cmd);
  if (sd.gunshi) add(sd.gunshi);
  return out;
};
B.recalcFx = (bt) => {
  for (let s = 0; s < 2; s++) {
    const sd = bt.sides[s];
    sd.fx = B.sideFx(bt, s);
    sd.acts = new Set(sd.tactics.map(t => D.TACTICS[t]?.act).filter(Boolean));
    sd.cpRegen = sd.cpRegen0 * (1 + (sd.fx.cp_rec || 0) + (B.ldFx(sd.cmd).cp_rec || 0) * 0.5);
    sd.noRetreat = !!sd.fx.noRetreat;
  }
  for (const u of bt.units) B.unitFx(bt, u);
};
B.unitFx = (bt, u) => {
  const sd = bt.sides[u.side];
  const fx = Object.assign({}, sd.fx || {});
  B.addFx(fx, B.ldFx(u.ld, B.isCmdLd(bt, u)));
  for (const k in fx) fx[k] = S.fxClamp(k, fx[k]);
  u.fx = fx;
  if (u.t === 'lcav' && fx.cav_arch > 0 && !u.horseArch) { u.horseArch = true; if (!u.ammo) u.ammo = 18; }
  if (!bt.started) u.ammo = Math.round((u.horseArch && !u.ut.ammo ? 18 : (u.ut.ammo || 0)) * (1 + (fx.ammo || 0)));
  return fx;
};
B.trOf = (u) => Math.min(100, u.tr + B.F(u, 'train_b'));
B.slots = (bt, s) => {
  const sd = bt.sides[s], cmd = sd.cmd || { chi: 50 };
  let n = 1 + Math.floor((cmd.chi || 50) / 30);
  n += B.ldFx(cmd).slots || 0;
  if (cmd.st === 'chi') n++;
  if (sd.gunshi) n += 1 + Math.round((B.ldFx(sd.gunshi).slots || 0) * 0.5);
  return U.clamp(Math.round(n), 1, 8);
};
B.knownTactics = (bt, s) => {
  const sd = bt.sides[s];
  if (sd.known) return sd.known.filter(t => D.TACTICS[t]);
  const set = new Set();
  for (const o of [sd.cmd, sd.gunshi]) if (o) for (const t of (o.tac || [])) if (D.TACTICS[t]) set.add(t);
  if (!set.size) { const c = Object.assign({ bu: 50, tou: 50, chi: 50, pol: 50, mi: 50 }, sd.cmd || {}); for (const t of D.TACTIC_ORDER) if (D.tacticReqOk(t, c) && bt.rng() < 0.4) set.add(t); }
  return [...set];
};
B.pickTactics = (bt, s, known, slots) => {
  const siegeAtk = bt.city && bt.city.side !== s, siegeDef = bt.city && bt.city.side === s;
  const mine = bt.units.filter(u => u.side === s);
  const tot = Math.max(1, U.sum(mine, u => u.n));
  const share = cls => U.sum(mine.filter(u => u.cls === cls), u => u.n) / tot;
  const hasT = t => mine.some(u => u.t === t);
  const ratio = tot / Math.max(1, U.sum(bt.units.filter(u => u.side !== s), u => u.n));
  const fs = bt.forestShare || 0;
  const score = (t) => {
    const T = D.TACTICS[t]; let v = 1 + bt.rng() * 1.5;
    if (T.cat === 'siegeA') v += siegeAtk ? 6 : -99;
    if (T.cat === 'siegeD') v += siegeDef ? 6 : -99;
    if (T.cat === 'cav') v += share('cav') * 8 + share('chr') * 6 - 1;
    if (T.cat === 'rng') v += share('rng') * 8 - 0.5;
    if (T.cat === 'inf') v += share('inf') * 4;
    if (t === 'kibasha' && !hasT('lcav')) v -= 99;
    if (t === 'sensha' && !hasT('chariot')) v -= 99;
    if (t === 'yashuu') v += bt.maxDays > 1 ? 2 : -99;
    if (t === 'suikei' || t === 'kousui') v += bt.river ? 1.5 : -99;
    if (t === 'rakuseki') v += bt.points.some(p => p.type === 'hill') ? 1 : -99;
    if (t === 'kakei' || t === 'hiya') v += fs > 0.08 ? 1.5 : -1;
    if (t === 'fukuhei' || t === 'gisou') v += fs > 0.1 ? 1 : -1;
    if (t === 'kanchou' || t === 'ryugen' || t === 'gekibun') v += 1.2;
    if (t === 'haisui') v += ratio < 0.8 ? 2 : -2;
    if (t === 'wana' || t === 'jinchi' || t === 'kenjin') v += ratio < 1 ? 1 : 0;
    if (T.cat === 'form' && T.fx && Object.keys(T.fx).some(k => k.startsWith('f_'))) v += 0.2;
    if (bt.weather === 'rain' && (t === 'kakei' || t === 'hiya')) v -= 3;
    return v;
  };
  return known.filter(t => D.TACTICS[t]).map(t => [t, score(t)]).filter(x => x[1] > -50).sort((a, b) => b[1] - a[1]).slice(0, slots).map(x => x[0]);
};
B.setupTactics = (bt) => {
  let fs = 0; for (let i = 0; i < bt.terr.length; i++) if (D.TILE[bt.terr[i]].burn >= 0.8) fs++;
  bt.forestShare = fs / bt.terr.length;
  for (let s = 0; s < 2; s++) {
    const sd = bt.sides[s];
    const known = B.knownTactics(bt, s);
    sd.known = known;
    sd.slots = B.slots(bt, s);
    sd.tactics = sd.preset ? sd.preset.filter(t => D.TACTICS[t]).slice(0, sd.slots) : B.pickTactics(bt, s, known, sd.slots);
  }
  B.recalcFx(bt);
  B.applyTacticSetup(bt);
  B.aiFormations(bt);
};
// 戦術の変更（軍議）に合わせて仕掛けを置き直す
B.setTactics = (bt, s, list) => { bt.sides[s].tactics = list.slice(); B.recalcFx(bt); B.applyTacticSetup(bt); for (const u of bt.units) if (u.side === s) { B.calcMorBase(bt, u); for (const c of u.cells) c.mor = u.morBase; } };
B.applyTacticSetup = (bt) => {
  for (let s = 0; s < 2; s++) {
    const sd = bt.sides[s], acts = sd.acts;
    if (bt.walls) for (const w of bt.walls) if (w.kind === 'gate' && w.side === s) { if (w.baseHp == null) w.baseHp = w.maxhp; w.maxhp = w.baseHp * (acts.has('gate') ? 1.5 : 1); w.hp = w.maxhp; }
    bt.traps = bt.traps.filter(t => t.side !== s);
    if (acts.has('trap')) B.placeTraps(bt, s);
    if (acts.has('wind')) bt.wind = s === 0 ? -Math.PI / 2 : Math.PI / 2;
    if (bt.city && bt.city.side !== s) {
      if (acts.has('naiou')) bt.naiou = { s, t: 70 + bt.rng() * 110 - ((sd.cmd?.chi || 50) - 50), done: false }; else if (bt.naiou && bt.naiou.s === s) bt.naiou = null;
      if (acts.has('tunnel')) bt.tunnel = { s, t: 0, need: 150 - (sd.cmd?.chi || 50) * 0.6, done: false }; else if (bt.tunnel && bt.tunnel.s === s) bt.tunnel = null;
      if (acts.has('cata') && !bt.units.some(u => u.side === s && u.t === 'cata')) B.addCatapults(bt, s);
    }
  }
};
// AIの陣形：準備した陣形の戦術に合わせる
B.aiFormations = (bt) => {
  for (let s = 0; s < 2; s++) {
    const sd = bt.sides[s]; if (sd.cmdAll) continue;
    const forms = Object.keys(sd.fx).filter(k => k.startsWith('f_') && sd.fx[k] > 0).map(k => k.slice(2)).filter(f => D.FORM[f]);
    if (!forms.length) continue;
    for (const u of bt.units) {
      if (u.side !== s || u.ctrl === 'player' || u.ut.fixed || u.cls === 'sie' || u.onwall) continue;
      const tou = u.ld ? u.ld.tou : 40;
      const f = forms.find(f => D.FORM[f].req <= tou + 5 && (u.cls === 'rng' ? f === 'goose' || f === 'loose' : true));
      if (f) { u.form = f; B.layoutCells(u); }
    }
  }
};
// 開戦時の一度きりの効果
B.start = (bt) => {
  if (bt.started) return;
  bt.started = true;
  // 軍の割り振りで任せておいた隊は、開戦と同時に隊長が動かす
  for (const u of bt.units) if (u.preDlg && u.side === 0 && !u.me && !u.delegate && B.alive(u)) B.delegate(bt, u, u.preDlg.mode, u.preDlg.dep);
  for (let s = 0; s < 2; s++) {
    const sd = bt.sides[s], foe = bt.sides[1 - s];
    if (sd.tactics.includes('ryugen')) { foe.mo -= 8; B.logMsg(bt, s === 0 ? '流言が敵陣に広まった。敵の士気が下がっている。' : '敵の流言で兵が動揺している……', s === 0 ? 'good' : 'bad'); }
    if (sd.acts.has('gihei')) { foe.mo -= 3; foe.misjudge = 1.6; }
    if (sd.acts.has('rikan')) foe.disarray = true;
    if (sd.tactics.includes('kanchou')) for (const u of bt.units) if (u.side !== s) { u.vis[s] = true; if (u.hidden && s === 0) B.reveal(bt, u); }
    if (sd.acts.has('kujo') && bt.city && bt.city.side === s) {
      foe.hesitateT = 55;
      B.logMsg(bt, s === 1 ? '城門が開け放たれている……罠か？' : '空城の計：城門を開け放った。', 'info');
      if (!foe.player && (foe.cmd?.chi || 50) < (sd.cmd?.chi || 50) - 8 && bt.rng() < 0.35) foe.kujoRetreatT = 8;
    }
  }
  if (bt.city) { const ds = bt.city.side; bt.siegeFood = (bt.spec.food ?? 6) + (bt.sides[ds].acts.has('roujou') ? 4 : 0); }
  // 武名：名の知れた主人公の旗に、敵がどよめく
  const rn = bt.spec.renown;
  if (rn && rn.lv >= 2 && bt.sides[0].player) {
    const nm = rn.ep ? `「${rn.ep}」` : rn.n;
    B.logMsg(bt, `${nm}の旗が翻る。敵陣にどよめきが走った。`, 'good');
    const mu = bt.units.find(u => u.me && u.side === 0);
    if (mu) B.text(bt, mu.x, mu.y - 24 * (bt.p || 1), nm, 'good');
  }
};

B.defaultForm = t => (D.UT[t].cls === 'rng' ? 'line' : 'line');
B.mkUnit = (bt, su, id) => {
  const ut = D.UT[su.t] || D.UT.inf;
  const ld = su.ld || null;
  const u = {
    id, side: su.side, t: su.t, ut, cls: ut.cls, n: su.n, n0: su.n, tr: su.tr ?? 40, wl: su.wl ?? 1, al: su.al ?? 1,
    ld, ctrl: su.ctrl || 'ai', grp: su.grp || 'front', me: !!su.me, hq: !!su.hq, parentOfMe: !!su.parentOfMe, sq: su.sq || null, sqs: su.sqs || null, escort: !!su.escort,
    x: 0, y: 0, a: su.side === 0 ? 0 : Math.PI, form: B.defaultForm(su.t), cells: [], cols: 1, rows: 1, w: 2, h: 2, fp: 1, per: 5,
    state: 'idle', order: null, path: null, pi: 0, pathT: -9, eng: [], engT: 0, chaos: false, fat: 0, ammo: ut.ammo || 0, reload: Math.random() * 3,
    mor: 70, morBase: 70, hidden: false, zone: null, zoneFired: {}, kills: 0, ldFate: 'ok', buffs: {}, cd: {}, routed: 0, dead: 0, out: false,
    spd: 0, aiT: Math.random() * 0.6, role: null, delegate: null, courier: null, attach: null, attOff: null, home: null,
    vis: [true, true], hitSide: { F: -9, L: -9, Rt: -9, R: -9 }, climb: null, onwall: null, impact: {}, routT: 0, pincerT: -99,
    forced: null, wu: su.wu ? su.wu.map(w => Object.assign({ kills: 0, dead: false }, w)) : null, ldSnap: ld, mine: su.ctrl === 'player', preDlg: su.preDlg || null,
    heroAcc: 0, _eng: 0, _press: 0, lastOrderT: -99, feintT: 0, disT: 0, rgT: 0,
  };
  u.mv = ut.cls === 'cav' || ut.elephant ? 1 : ut.cls === 'chr' ? 2 : ut.cls === 'sie' ? 3 : ((ut.mountain || (ld && ((ld.tr || []).includes('sangaku') || ld.mount))) ? 4 : 0);
  if (ut.ship) {
    // 船：海だけを行く。漕ぎ手の腕・コルウス・海兵の腕は国（海賊）ごと
    const nv = typeof NAV !== 'undefined' ? NAV.navyOf(bt.spec.sides[su.side]) : null;
    u.ship = true; u.mv = 5; u.navSk = nv ? nv.skill : 1; u.corvus = !!(nv && nv.corvus); u.mar = su.mar ?? 1; u.land = su.land || null; u.grappleT = 0;
  }
  if (bt.sides[su.side] && !bt.sides[su.side].player && typeof PPL !== 'undefined' && bt.spec.sides.some(x => x.player)) u.tr = U.clamp(u.tr + PPL.diff().aiTr, 5, 100);
  u.fx = B.ldFx(ld, false);
  if (u.t === 'lcav' && u.fx.cav_arch > 0) { u.horseArch = true; u.ammo = 18; }
  B.calcMorBase(bt, u);
  B.buildCells(bt, u);
  return u;
};

B.calcMorBase = (bt, u) => {
  const side = bt.sides[u.side], ld = u.ld;
  let m = 52 + B.trOf(u) * 0.25 + (ld ? (ld.tou || 50) * 0.12 + (ld.mi || 50) * 0.05 : 5) + (u.ut.moraleMod || 0) + (D.FORM[u.form].morale || 0) + side.mo + (side.lawMorale || 0) + B.F(u, 'mor');
  if (u.me) m += 4;
  if (ld && ld.st === 'bal') m += 3;
  if (u.ldLost) m -= 12;
  if (bt.weather === 'snow') m -= 3;
  u.morBase = U.clamp(m, 12, 100);
};

B.buildCells = (bt, u) => {
  const n = u.n;
  let per;
  if (n <= 5) per = 1;
  else if (Math.ceil(n / 5) <= 64) per = 5;
  else per = Math.ceil(Math.ceil(n / 5) / 64) * 5;
  // 船：一つの四角が一隻（大きな船団なら数隻）
  if (u.ship) { const crew = u.ut.crew || 100; per = n < crew ? Math.max(1, n) : Math.max(crew, Math.ceil(n / 40)); u.shipsPer = Math.max(1, Math.round(per / crew)); }
  u.per = per;
  const nc = Math.ceil(n / per);
  u.cells = [];
  let left = n;
  for (let i = 0; i < nc; i++) { const m = Math.min(per, left); left -= m; u.cells.push({ n: m, max: m, mor: u.morBase, dmg: 0, hit: -9, c: 0, r: i, wi: undefined }); }
  if (u.wu && per === 1 && !u.ship) {
    // cells[0]: 主人公 / 以降：伍の仲間
    u.cells.forEach((c, i) => { c.wi = i === 0 ? -1 : (i - 1 < u.wu.length ? i - 1 : undefined); });
    // 前列中央に主人公
    if (u.cells.length >= 3) { const me = u.cells[0]; u.cells.splice(0, 1); u.cells.splice(1, 0, me); u.cells.forEach((c, i) => c.r = i); }
  }
  B.layoutCells(u);
};
B.layoutCells = (u) => {
  const alive = u.cells.filter(c => c.n > 0);
  if (!alive.length) { u.cells = []; return; }
  const F = D.FORM[u.form];
  const k = alive.length;
  // 船は横に並ぶ（横陣は一列か二列、縦隊は一列に縦、方陣は円く固まる）
  const cols = u.ship ? Math.max(1, u.form === 'snake' ? 1 : u.form === 'square' ? Math.ceil(Math.sqrt(k)) : u.form === 'arrow' ? Math.ceil(k / 3) : u.form === 'crane' ? k : Math.min(k, u.form === 'loose' ? 14 : 12))
    : Math.max(1, Math.min(k, Math.round(Math.sqrt(k * F.asp))));
  alive.sort((a, b) => a.r - b.r || a.c - b.c);
  alive.forEach((c, i) => { c.r = Math.floor(i / cols); c.c = i % cols; });
  u.cells = alive; u.cols = cols; u.rows = Math.ceil(k / cols);
  B.shape(u);
};
B.shape = (u) => {
  if (u.ship) {
    const hl = u.ut.hull || [15, 40], k = Math.sqrt(u.shipsPer || 1), F = D.FORM[u.form];
    const cw = hl[0] * k * (F.densMul ? Math.sqrt(F.densMul) : 1), ch = hl[1] * k * (u.form === 'snake' ? 1.15 : 1);
    u.w = Math.max(u.cols * cw * u.fp, 2); u.h = Math.max(u.rows * ch * u.fp, 3); u.diag = Math.hypot(u.w, u.h);
    return;
  }
  if (u.ut.fixed) { u.w = u.ut.fixed[0] * Math.max(0.5, u.fp * 1.4); u.h = u.ut.fixed[1] * Math.max(0.5, u.fp * 1.4); u.diag = Math.hypot(u.w, u.h); return; }
  const F = D.FORM[u.form];
  const dens = u.ut.dens * (F.densMul || 1);
  const area = Math.max(1, u.n) * dens;
  let w = Math.sqrt(area * F.asp), h = area / w;
  w *= u.fp; h *= u.fp;
  u.w = Math.max(w, 0.9 * Math.min(1, u.fp * 2)); u.h = Math.max(h, 0.6 * Math.min(1, u.fp * 2));
  u.diag = Math.hypot(u.w, u.h);
};
B.cellLocal = (u, c) => {
  const cw = u.w / u.cols, ch = u.h / u.rows;
  const lastRowCount = u.cells.length - (u.rows - 1) * u.cols;
  let off = 0;
  if (c.r === u.rows - 1 && lastRowCount < u.cols) off = (u.cols - lastRowCount) * cw / 2;
  return [-u.w / 2 + (c.c + 0.5) * cw + off, -u.h / 2 + (c.r + 0.5) * ch];
};
B.toWorld = (u, lx, ly) => { const ca = Math.cos(u.a), sa = Math.sin(u.a); return [u.x + lx * ca - ly * sa, u.y + lx * sa + ly * ca]; };
B.toLocal = (u, x, y) => { const dx = x - u.x, dy = y - u.y, ca = Math.cos(u.a), sa = Math.sin(u.a); return [dx * ca + dy * sa, -dx * sa + dy * ca]; };
B.fwd = a => [Math.sin(a), -Math.cos(a)];
B.angTo = (dx, dy) => Math.atan2(dx, -dy);

/* ---------------- 地形 ---------------- */
B.ti = (bt, x, y) => { const c = U.clamp(Math.floor(x / bt.tile), 0, bt.cols - 1), r = U.clamp(Math.floor(y / bt.tile), 0, bt.rows - 1); return r * bt.cols + c; };
B.tileAt = (bt, x, y) => bt.terr[B.ti(bt, x, y)];
B.tc = (bt, i) => [(i % bt.cols + 0.5) * bt.tile, (Math.floor(i / bt.cols) + 0.5) * bt.tile];
// 地形の生成は 62_field.js（細かい格子）
B.addWallSeg = (bt, tiles, kind, side, nx, ny, hp) => {
  const id = bt.walls.length;
  let sx = 0, sy = 0;
  for (const i of tiles) { const [x, y] = B.tc(bt, i); sx += x; sy += y; bt.wallAt[i] = id; bt.terr[i] = kind === 'gate' ? D.T.GATE : D.T.WALL; }
  bt.walls.push({ id, kind, tiles, side, nx, ny, x: sx / tiles.length, y: sy / tiles.length, hp, maxhp: hp, broken: false, captured: -1, def: null, prog: 0, len: tiles.length * bt.tile, tower: false, openT: 0 });
};
B.buildCity = (bt) => {
  const { cols, rows, spec } = bt, T = D.T;
  bt.walls = []; bt.wallAt = new Int16Array(cols * rows).fill(-1);
  const cs = spec.city;
  const cw = Math.round(cols * 0.56), ch = Math.round(rows * 0.25);
  const x0 = Math.round((cols - cw) / 2), y0 = cs === 1 ? 2 : rows - 2 - ch;
  const x1 = x0 + cw - 1, y1 = y0 + ch - 1;
  // 内部と周囲の整地
  const mg = 2 * B.TS;
  for (let r = y0 - mg; r <= y1 + mg; r++) for (let c = x0 - mg; c <= x1 + mg; c++) {
    if (r < 0 || r >= rows || c < 0 || c >= cols) continue;
    const i = r * cols + c, t0 = bt.terr[i];
    bt.terr[i] = (r >= y0 && r <= y1 && c >= x0 && c <= x1) ? T.CITY : ([T.ROAD, T.PLAIN, T.DIRT, T.HILL, T.FIELD, T.GRASS, T.BRIDGE].includes(t0) ? (t0 === T.BRIDGE ? T.ROAD : t0) : T.PLAIN);
  }
  const wallHP = 900 + (spec.wall || 50) * 30;
  const gateHP = 500 + (spec.wall || 50) * 14;
  const frontRow = cs === 1 ? y1 : y0, backRow = cs === 1 ? y0 : y1;
  const fnY = cs === 1 ? 1 : -1;
  const midC = Math.round((x0 + x1) / 2);
  // 前面（敵側）
  const SEG = 5 * B.TS;
  const seg = (list, nx, ny) => { let buf = []; for (const i of list) { const isGate = bt._gateTiles.has(i); if (isGate) { if (buf.length) { B.addWallSeg(bt, buf, 'wall', cs, nx, ny, wallHP); buf = []; } continue; } buf.push(i); if (buf.length >= SEG) { B.addWallSeg(bt, buf, 'wall', cs, nx, ny, wallHP); buf = []; } } if (buf.length) B.addWallSeg(bt, buf, 'wall', cs, nx, ny, wallHP); };
  bt._gateTiles = new Set();
  const gF = []; for (let k = -B.TS; k < B.TS; k++) gF.push(frontRow * cols + midC + k);
  const midR = Math.round((y0 + y1) / 2);
  const gL = [], gR = []; for (let k = 0; k < B.TS; k++) { gL.push((midR + k) * cols + x0); gR.push((midR + k) * cols + x1); }
  for (const i of [...gF, ...gL, ...gR]) bt._gateTiles.add(i);
  const front = [], back = [], left = [], right = [];
  for (let c = x0; c <= x1; c++) { front.push(frontRow * cols + c); back.push(backRow * cols + c); }
  for (let r = y0 + 1; r < y1; r++) { left.push(r * cols + x0); right.push(r * cols + x1); }
  seg(front, 0, fnY); seg(left, -1, 0); seg(right, 1, 0); seg(back, 0, -fnY);
  B.addWallSeg(bt, gF, 'gate', cs, 0, fnY, gateHP);
  B.addWallSeg(bt, gL, 'gate', cs, -1, 0, gateHP * 0.8);
  B.addWallSeg(bt, gR, 'gate', cs, 1, 0, gateHP * 0.8);
  delete bt._gateTiles;
  const [ccx] = B.tc(bt, midR * cols + midC);
  const ccy = (cs === 1 ? (y0 + ch * 0.38) : (y1 - ch * 0.38)) * bt.tile;
  bt.city = { x: ccx, y: ccy, r: bt.T0 * 3, hold: 0, side: cs, x0: x0 * bt.tile, y0: y0 * bt.tile, x1: (x1 + 1) * bt.tile, y1: (y1 + 1) * bt.tile };
};
B.buildPass = (bt) => {
  const { cols, rows, spec } = bt, T = D.T, r = bt.rng;
  bt.walls = []; bt.wallAt = new Int16Array(cols * rows).fill(-1);
  const cs = spec.city >= 0 ? spec.city : 1;
  const fineDone = !!(bt.feat && bt.feat.passPath);
  let vL = Math.round(cols * 0.32), vR = Math.round(cols * 0.68);
  if (!fineDone) {
    for (let rr = 0; rr < rows; rr++) for (let c = 0; c < cols; c++) {
      const i = rr * cols + c;
      const wob = Math.round(Math.sin(rr * 0.4 / B.TS + c / B.TS) * 1.2 * B.TS);
      if (c < vL + wob || c > vR + wob) { bt.terr[i] = T.MOUNT; bt.elev[i] = 0.85; }
      else if (bt.terr[i] === T.MOUNT) bt.terr[i] = T.HILL;
    }
    // 抜け道（山道）
    let pc = Math.round(cols * 0.12);
    const startR = cs === 1 ? rows - 8 * B.TS : 7 * B.TS, endR = cs === 1 ? Math.round(rows * 0.18) : Math.round(rows * 0.82);
    const dir = startR < endR ? 1 : -1;
    for (let rr = startR; rr !== endR; rr += dir) { if ((rr & 1) === 0) pc = U.clamp(pc + Math.round((r() - 0.5) * 2), 3 * B.TS, vL - 3 * B.TS); bt.terr[rr * cols + pc] = T.PATH; if (B.TS > 1) bt.terr[rr * cols + pc + 1] = T.PATH; }
    bt.secretPath = { x: (pc + 0.5) * bt.tile, y: (endR + 0.5) * bt.tile };
    for (let c = pc; c <= vL + 1; c++) bt.terr[endR * cols + c] = T.PATH;
  }
  // 関の城壁（谷の幅いっぱいに）
  const wr = cs === 1 ? Math.round(rows * 0.34) : Math.round(rows * 0.66);
  const span = (rr) => { let a = -1, b = -1; for (let c = Math.round(cols * 0.2); c < Math.round(cols * 0.8); c++) if (bt.terr[rr * cols + c] !== T.MOUNT) { if (a < 0) a = c; b = c; } return a < 0 ? [vL, vR] : [a, b]; };
  [vL, vR] = span(wr);
  const fnY = cs === 1 ? 1 : -1;
  const midC = Math.round((vL + vR) / 2);
  const wallHP = 1600 + (spec.wall || 90) * 30, gateHP = 900 + (spec.wall || 90) * 16;
  bt._gateTiles = new Set(); for (let k = -B.TS; k < B.TS; k++) bt._gateTiles.add(wr * cols + midC + k);
  const line = []; for (let c = vL - 1; c <= vR + 1; c++) line.push(wr * cols + c);
  let buf = [];
  for (const i of line) { if (bt._gateTiles.has(i)) { if (buf.length) { B.addWallSeg(bt, buf, 'wall', cs, 0, fnY, wallHP); buf = []; } continue; } buf.push(i); if (buf.length >= 5 * B.TS) { B.addWallSeg(bt, buf, 'wall', cs, 0, fnY, wallHP); buf = []; } }
  if (buf.length) B.addWallSeg(bt, buf, 'wall', cs, 0, fnY, wallHP);
  B.addWallSeg(bt, [...bt._gateTiles], 'gate', cs, 0, fnY, gateHP);
  delete bt._gateTiles;
  // 関の内側
  const yIn0 = cs === 1 ? wr - 6 * B.TS : wr + 1, yIn1 = cs === 1 ? wr - 1 : wr + 6 * B.TS;
  let x0 = vL, x1 = vR;
  for (let rr = yIn0; rr <= yIn1; rr++) { const [a, b] = span(rr); x0 = Math.max(x0, a); x1 = Math.min(x1, b); for (let c = a; c <= b; c++) { const i = rr * cols + c; if (bt.terr[i] !== T.MOUNT && bt.terr[i] !== T.WALL && bt.terr[i] !== T.GATE) bt.terr[i] = T.CITY; } }
  const ccy = ((cs === 1 ? wr - 3.5 * B.TS : wr + 3.5 * B.TS)) * bt.tile;
  bt.city = { x: (midC) * bt.tile, y: ccy, r: bt.T0 * 3, hold: 0, side: cs, x0: x0 * bt.tile, y0: Math.min(yIn0, yIn1) * bt.tile, x1: (x1 + 1) * bt.tile, y1: (Math.max(yIn0, yIn1) + 1) * bt.tile, pass: true };
};
B.passable = (bt, i, mv, side) => {
  const t = bt.terr[i];
  if (t === D.T.GATE) { const w = bt.walls[bt.wallAt[i]]; return w && (w.broken || w.side === side); }
  if (t === D.T.WALL) { const w = bt.walls[bt.wallAt[i]]; return !!(w && w.captured === side && (mv === 0 || mv === 4)); }
  return D.TILE[t].mv[mv] > 0;
};
B.moveMul = (bt, i, mv) => { const t = bt.terr[i]; if (t === D.T.WALL) return 0.5; if (t === D.T.GATE) return 0.8; let v = D.TILE[t].mv[mv]; if (bt.flood[i] > 0) v *= 0.35; return v; };
// 部隊ごとの移動倍率（悪路の不利を特性で軽減）
B.uMoveMul = (bt, u, i) => {
  let v = B.moveMul(bt, i, u.mv), tt = bt.terr[i];
  if (bt.fine && v > 0 && i === B.ti(bt, u.x, u.y)) {
    const g = B.groundT(bt, u.x, u.y);
    if (g !== tt && g !== D.T.WALL && g !== D.T.GATE) { const gv = D.TILE[g].mv[u.mv] * (bt.flood[i] > 0 ? 0.35 : 1); if (gv > 0) { v = gv; tt = g; } }
  }
  if (u.ship && u.ut.light && tt === D.T.SHOAL) return Math.max(v, 0.9);
  if (v <= 0 || v >= 1) return v;
  const T = D.TILE[tt];
  let red = B.F(u, 'mv_rough') + (T.mvk ? B.F(u, T.mvk) : 0);
  if (red > 0) v = v + (1 - v) * Math.min(1, red);
  return v;
};

/* ---------------- 戦術地点 ---------------- */
B.genPoints = (bt) => {
  if (bt.naval) return;
  const { cols, rows } = bt, T = D.T;
  const pts = bt.points;
  const add = (type, i, owner = -1) => { const [x, y] = B.tc(bt, i); pts.push({ id: pts.length, type, x, y, r: Math.max(18, bt.T0 * 1.6), owner, prog: 0, progSide: -1, used: false }); };
  // 陣
  for (let s = 0; s < 2; s++) {
    const hq = bt.units.find(u => u.side === s && u.hq) || bt.units.find(u => u.side === s);
    if (hq) { const i = B.ti(bt, hq.x + (s ? -1 : 1) * bt.W * 0.12, hq.y); if (D.TILE[bt.terr[i]].mv[0] > 0) add('camp', i, s); }
  }
  const mid = i => { const r = Math.floor(i / cols); return r > rows * 0.24 && r < rows * 0.76; };
  const far = (i, d) => pts.every(p => U.dist(p.x, p.y, ...B.tc(bt, i)) > d);
  const hills = [];
  for (let i = 0; i < cols * rows; i++) if (bt.terr[i] === T.HILL && mid(i)) hills.push(i);
  hills.sort((a, b) => bt.elev[b] - bt.elev[a]);
  let nh = 0;
  for (const i of hills) { if (nh >= 2) break; if (far(i, bt.W * 0.22)) { add('hill', i); nh++; } }
  const forests = [];
  for (let i = 0; i < cols * rows; i++) if (bt.terr[i] === T.FOREST && mid(i) && (i % B.TS === 0)) { let k = 0; const c = i % cols, r = Math.floor(i / cols); for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const j = (r + dr) * cols + c + dc; if (j >= 0 && j < cols * rows && bt.terr[j] === T.FOREST) k++; } if (k >= 7) forests.push(i); }
  U.shuffle(forests);
  let nf = 0; for (const i of forests) { if (nf >= 2) break; if (far(i, bt.W * 0.2)) { add('forest', i); nf++; } }
  const rest = hills.filter(i => far(i, bt.W * 0.2));
  if (rest.length) add('tower', rest[0]);
  if (bt.river) { const cand = bt.river.filter(i => (i % cols) <= 3 * B.TS); if (cand.length) add('dam', cand[0]); }
};
B.updatePoints = (bt, dt) => {
  for (const pt of bt.points) {
    const near = [0, 0];
    for (const u of bt.units) if (B.alive(u) && u.state !== 'rout' && U.dist(u.x, u.y, pt.x, pt.y) < pt.r + u.diag * 0.3) near[u.side] += u.n;
    let s = -1;
    if (near[0] > 0 && near[1] === 0) s = 0; else if (near[1] > 0 && near[0] === 0) s = 1;
    if (s >= 0 && s !== pt.owner) {
      if (pt.progSide !== s) { pt.progSide = s; pt.prog = 0; }
      pt.prog += dt;
      if (pt.prog >= 6) {
        pt.owner = s; pt.prog = 0;
        B.text(bt, pt.x, pt.y, `${{ camp: '陣', hill: '丘', forest: '森', tower: '櫓', dam: '堰' }[pt.type]}を確保`, s === 0 ? 'good' : 'bad');
        if (s === 0) { const cap = bt.units.find(u => u.side === 0 && u.ctrl === 'player' && U.dist(u.x, u.y, pt.x, pt.y) < pt.r + u.diag); if (cap) bt.stat.points++; }
      }
    } else if (s < 0) pt.prog = Math.max(0, pt.prog - dt * 0.5);
  }
};

/* ---------------- 布陣 ---------------- */
B.deploy = (bt) => {
  const { W, H } = bt;
  // 小さすぎる地図で大部隊がはみ出さないよう縮尺 fp を決める
  const rowWidth = (s) => {
    const us = bt.units.filter(u => u.side === s && ['front', 'left', 'right', 'player'].includes(B.depGroup(bt, u)));
    return U.sum(us, u => u.w) + us.length * 3;
  };
  const maxW = Math.max(rowWidth(0), rowWidth(1), 1);
  // 布陣できる幅（隘路・谷・湖畔・海辺では通れる所だけ）
  const laneAt = (y) => {
    const r = U.clamp(Math.floor(y / bt.tile), 0, bt.rows - 1); let best = [0, bt.cols - 1], bl = -1, cur = -1;
    for (let c = 0; c <= bt.cols; c++) {
      const ok = c < bt.cols && D.TILE[bt.terr[r * bt.cols + c]].mv[bt.naval ? 5 : 0] > 0.3;
      if (ok && cur < 0) cur = c;
      if (!ok && cur >= 0) { if (c - cur > bl) { bl = c - cur; best = [cur, c - 1]; } cur = -1; }
    }
    return { x0: best[0] * bt.tile, x1: (best[1] + 1) * bt.tile };
  };
  bt.lanes = bt.city && bt.city.pass ? null : [laneAt(H * 0.74), laneAt(H * 0.26)];
  const laneW = bt.lanes ? Math.min(bt.lanes[0].x1 - bt.lanes[0].x0, bt.lanes[1].x1 - bt.lanes[1].x0) : W;
  const avail = bt.city && bt.city.pass ? (bt.city.x1 - bt.city.x0) * 0.92 : Math.min(W * 0.8, laneW * 0.92);
  const fp = Math.min(1, avail / maxW);
  bt.fp = fp;
  for (const u of bt.units) { u.fp = fp; B.shape(u); }
  for (let s = 0; s < 2; s++) B.deploySide(bt, s);
  if (bt.naval) for (const u of bt.units) B.seaFit(bt, u);
  for (const u of bt.units) u.home = { x: u.x, y: u.y, a: u.a };
};
// 船団が島や岸にかからないよう、近くの海へずらす（自分の側の海の中で）
B.seaFit = (bt, u) => {
  if (!u.ship || u.attach != null) return;
  const ca = Math.cos(u.a), sa = Math.sin(u.a);
  const ok = (x, y) => {
    if (u.side === 0 ? y < bt.H * 0.5 : y > bt.H * 0.5) return false;
    for (const [fx, fy] of [[0, 0], [-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5], [0, -0.5], [0, 0.5], [-0.5, 0], [0.5, 0]]) {
      const lx = fx * u.w, ly = fy * u.h, wx = x + lx * ca - ly * sa, wy = y + lx * sa + ly * ca;
      if (wx < 0 || wy < 0 || wx > bt.W || wy > bt.H) continue;
      if (!B.passable(bt, B.ti(bt, wx, wy), u.mv, u.side)) return false;
    }
    return true;
  };
  if (ok(u.x, u.y)) return;
  const st = bt.tile;
  for (let r = 1; r < 48; r++) for (let k = 0; k < 8 * r; k++) {
    const a = k / (8 * r) * Math.PI * 2, x = u.x + Math.cos(a) * r * st, y = u.y + Math.sin(a) * r * st * 0.7;
    if (ok(x, y)) { u.x = x; u.y = y; return; }
  }
};
B.depGroup = (bt, u) => {
  if (u.grp !== 'player') return u.grp;
  const sd = bt.spec.sides[u.side];
  if (bt.spec.role === 'unit') return 'player';
  if (u.hq) return 'hq';
  return W_groupFor(u.t);
};
function W_groupFor(t) { const cls = D.UT[t].cls; if (D.UT[t].ship) return D.UT[t].range ? 'archer' : D.UT[t].fast ? 'wing' : 'front'; if (cls === 'rng') return 'archer'; if (cls === 'cav' || cls === 'chr') return 'wing'; if (cls === 'sie') return 'siege'; if (t === 'guard') return 'hq'; return 'front'; }
B.deploySide = (bt, s) => {
  const { W, H } = bt;
  const dir = s === 0 ? 1 : -1;  // +1 = 後方は下
  const a = s === 0 ? 0 : Math.PI;
  const us = bt.units.filter(u => u.side === s);
  for (const u of us) u.a = a;
  const cityMine = bt.city && bt.city.side === s;
  if (cityMine) { B.deployCity(bt, s, us); return; }
  let frontY = s === 0 ? H * 0.74 : H * 0.26;
  if (bt.city && !cityMine) {
    // 攻城側：城の前
    const wallY = bt.city.side === 1 ? bt.city.y1 : bt.city.y0;
    frontY = wallY + dir * Math.max(H * 0.2, 160 * bt.p * 0.8);
    frontY = U.clamp(frontY, H * 0.12, H * 0.88);
  }
  const groups = { front: [], wing: [], left: [], right: [], archer: [], reserve: [], hq: [], siege: [], player: [] };
  for (const u of us) {
    let g = B.depGroup(bt, u);
    if (g === 'wing') g = groups.left.length <= groups.right.length ? 'left' : 'right';
    if (!groups[g]) g = 'front';
    groups[g].push(u);
  }
  // 歩兵が少なすぎる場合、騎兵の一部を予備へ
  if (groups.left.length + groups.right.length > 4) { const mv = groups.left.length > groups.right.length ? groups.left.pop() : groups.right.pop(); groups.reserve.push(mv); }
  const gap = Math.max(2, 6 * bt.fp * bt.p);
  const lane = bt.lanes && !bt.city ? bt.lanes[s] : null;
  const lx0 = lane ? lane.x0 : 0, lx1 = lane ? lane.x1 : W;
  const cxDef = bt.city && bt.city.pass ? (bt.city.x0 + bt.city.x1) / 2 : (lane ? (lane.x0 + lane.x1) / 2 : W / 2);
  const placeRow = (list, y, cx = cxDef) => {
    if (!list.length) return;
    list.sort((p, q) => q.n - p.n);
    // 中央に大きい部隊
    const ordered = []; list.forEach((u, i) => { if (i % 2 === 0) ordered.push(u); else ordered.unshift(u); });
    const total = U.sum(ordered, u => u.w) + gap * (ordered.length - 1);
    let x = cx - total / 2;
    for (const u of ordered) { u.x = U.clamp(x + u.w / 2, lx0 + u.w / 2 + 2, lx1 - u.w / 2 - 2); u.y = y; x += u.w + gap; }
  };
  const depth = (list) => list.length ? Math.max(...list.map(u => u.h)) : 0;
  const frontList = groups.front.concat(groups.player);
  // 前衛＋両翼を一列に
  const row1 = [...groups.left, ...frontList, ...groups.right];
  placeRow(frontList, frontY);
  // 翼
  const fl = frontList.length ? Math.min(...frontList.map(u => u.x - u.w / 2)) : W / 2;
  const fr = frontList.length ? Math.max(...frontList.map(u => u.x + u.w / 2)) : W / 2;
  let x = fl - gap * 2;
  for (const u of groups.left.sort((p, q) => q.n - p.n)) { u.x = Math.max(lx0 + u.w / 2 + 2, x - u.w / 2); u.y = frontY + dir * u.h * 0.2; x = u.x - u.w / 2 - gap; }
  x = fr + gap * 2;
  for (const u of groups.right.sort((p, q) => q.n - p.n)) { u.x = Math.min(lx1 - u.w / 2 - 2, x + u.w / 2); u.y = frontY + dir * u.h * 0.2; x = u.x + u.w / 2 + gap; }
  const d1 = Math.max(depth(row1), 4 * bt.fp);
  const yArch = frontY + dir * (d1 / 2 + gap * 2 + depth(groups.archer) / 2);
  placeRow(groups.archer, yArch);
  const yRes = yArch + dir * (depth(groups.archer) / 2 + gap * 2 + Math.max(depth(groups.reserve), depth(groups.hq)) / 2 + 4);
  placeRow(groups.reserve.concat(groups.hq), yRes);
  if (groups.siege.length) placeRow(groups.siege, frontY - dir * (d1 / 2 + gap * 3 + depth(groups.siege) / 2));
  // 主人公の隊（下級）：上官の隊の前に付く
  const parent = us.find(u => u.parentOfMe);
  const mine = us.filter(u => u.grp === 'player');
  if (parent && bt.spec.role === 'unit' && mine.length) {
    let tw = U.sum(mine, u => u.w) + gap * 0.3 * (mine.length - 1);
    let lx = -tw / 2;
    for (const u of mine) {
      const ox = lx + u.w / 2, oy = -(parent.h / 2 + u.h / 2 + 0.4 * bt.fp);
      u.attach = parent.id; u.attOff = [ox, oy];
      const [wx, wy] = B.toWorld(parent, ox, oy); u.x = wx; u.y = wy; u.a = parent.a;
      lx += u.w + gap * 0.3;
    }
  }
  // 地形で詰まらないよう、移動不能タイルにいる部隊を近くへ
  for (const u of us) B.unstick(bt, u);
};
B.deployCity = (bt, s, us) => {
  const ct = bt.city;
  const walls = bt.walls.filter(w => w.kind === 'wall');
  const frontWalls = walls.filter(w => (s === 1 ? w.ny > 0 : w.ny < 0)).sort((a, b) => Math.abs(a.x - ct.x) - Math.abs(b.x - ct.x));
  const sideWalls = walls.filter(w => w.nx !== 0);
  const rng = us.filter(u => u.cls === 'rng').sort((a, b) => b.n - a.n);
  let wi = 0;
  const wallOrder = [...frontWalls, ...sideWalls];
  for (const u of rng) {
    const w = wallOrder[wi % Math.max(1, wallOrder.length)]; wi++;
    if (w && !w.def) { B.putOnWall(bt, u, w); }
    else { u.x = ct.x + (Math.random() - 0.5) * (ct.x1 - ct.x0) * 0.5; u.y = ct.y; }
  }
  const gates = bt.walls.filter(w => w.kind === 'gate');
  const mainGate = gates.find(g => (s === 1 ? g.ny > 0 : g.ny < 0)) || gates[0];
  const others = us.filter(u => u.cls !== 'rng' && !u.onwall);
  let k = 0;
  for (const u of others.sort((a, b) => b.n - a.n)) {
    if (u.hq) { u.x = ct.x; u.y = ct.y; continue; }
    if (k === 0 && mainGate) { u.x = mainGate.x - mainGate.nx * (u.h / 2 + bt.T0 * 1.5); u.y = mainGate.y - mainGate.ny * (u.h / 2 + bt.T0 * 1.5); }
    else { const g = gates[k % gates.length]; const off = (k > 2 ? 3.5 : 1.8) * bt.T0; u.x = g.x - g.nx * (u.h / 2 + off) + (Math.random() - 0.5) * bt.T0 * 3; u.y = g.y - g.ny * (u.h / 2 + off); }
    u.x = U.clamp(u.x, ct.x0 + u.w / 2 + 2, ct.x1 - u.w / 2 - 2); u.y = U.clamp(u.y, ct.y0 + u.h / 2 + 2, ct.y1 - u.h / 2 - 2);
    k++;
  }
  for (const u of us) if (!u.onwall) { u.a = s === 0 ? 0 : Math.PI; B.unstick(bt, u); }
};
B.putOnWall = (bt, u, w) => {
  w.def = u.id; u.onwall = w.id; u.state = 'onwall';
  const inward = 0.25 * bt.tile;
  u.x = w.x - w.nx * inward; u.y = w.y - w.ny * inward;
  u.a = B.angTo(w.nx, w.ny);
  // 城壁上の隊形は細長い
  u.form = 'line';
};
B.unstick = (bt, u) => {
  if (u.onwall) return;
  let i = B.ti(bt, u.x, u.y);
  if (B.passable(bt, i, u.mv, u.side)) return;
  const c0 = i % bt.cols, r0 = Math.floor(i / bt.cols);
  for (let rad = 1; rad < 12 * B.TS; rad++) for (let dr = -rad; dr <= rad; dr++) for (let dc = -rad; dc <= rad; dc++) {
    if (Math.abs(dr) !== rad && Math.abs(dc) !== rad) continue;
    const r = r0 + dr, c = c0 + dc; if (r < 0 || c < 0 || r >= bt.rows || c >= bt.cols) continue;
    const j = r * bt.cols + c;
    if (B.passable(bt, j, u.mv, u.side)) { [u.x, u.y] = B.tc(bt, j); return; }
  }
};

/* ---------------- ユーティリティ ---------------- */
B.alive = u => !u.out && u.n > 0;
B.active = u => B.alive(u) && u.state !== 'rout';
B.text = (bt, x, y, s, kind = 'info') => { bt.texts.push({ x, y, s, kind, t: 0, id: bt.textSeq++ }); if (bt.texts.length > 40) bt.texts.shift(); };
B.logMsg = (bt, s, kind = 'info') => { bt.log.unshift({ s, kind, t: bt.time }); if (bt.log.length > 30) bt.log.length = 30; };
B.fx = (bt, o) => { if (bt.fx.length > 400) bt.fx.splice(0, 50); o.t = 0; bt.fx.push(o); };
B.ldName = u => u.ld ? u.ld.n : D.UT[u.t].n + '隊';
// 主人公側の経験（特性の会得に使う）
B.tx = (bt, k, n = 1) => { if (!bt.sides[0].player) return; bt.stat.tx = bt.stat.tx || {}; bt.stat.tx[k] = (bt.stat.tx[k] || 0) + n; };
// 兵を戦列から除く（投降など）
B.removeMen = (bt, u, k, why) => {
  let left = k;
  for (let i = u.cells.length - 1; i >= 0 && left > 0; i--) { const c = u.cells[i]; const m = Math.min(c.n, left); c.n -= m; left -= m; if (c.n <= 0) u._dirty = true; }
  const got = k - left;
  u.n -= got; u.dead += got;
  if (why === 'surr') u.surr = (u.surr || 0) + got;
  if (u.n <= 0) B.unitDestroyed(bt, u, null);
};
// 落とし穴
B.placeTraps = (bt, s) => {
  const front = bt.units.filter(u => u.side === s && !u.hq && u.cls !== 'sie' && !u.onwall);
  if (!front.length) return;
  const dir = s === 0 ? -1 : 1;
  const fy = s === 0 ? Math.min(...front.map(u => u.y - u.h / 2)) : Math.max(...front.map(u => u.y + u.h / 2));
  const xs = front.map(u => u.x).sort((a, b) => a - b);
  const n = U.clamp(Math.round(front.length / 2), 2, 5);
  for (let i = 0; i < n; i++) {
    const x = xs[Math.floor((i + 0.5) / n * xs.length)] + (bt.rng() - 0.5) * 30 * bt.p;
    const y = fy + dir * (35 + bt.rng() * 25) * bt.p;
    bt.traps.push({ side: s, x: U.clamp(x, 10, bt.W - 10), y: U.clamp(y, 10, bt.H - 10), r: 28 * bt.p, used: false, pw: 1 + B.F(front[0], 'trap') });
  }
};
B.checkTraps = (bt) => {
  for (const tp of bt.traps) {
    if (tp.used) continue;
    for (const e of bt.units) {
      if (e.side === tp.side || !B.active(e) || e.cls === 'sie') continue;
      if (U.dist(e.x, e.y, tp.x, tp.y) > tp.r + e.diag * 0.35) continue;
      tp.used = true;
      B.applyHits(bt, e, (3 + e.n * 0.035) * tp.pw, null, 0, 0, null, 1.4, true);
      B.morHit(bt, e, 22 * tp.pw);
      e.fat = Math.min(1, e.fat + 0.25);
      B.text(bt, e.x, e.y, '落とし穴！', tp.side === 0 ? 'good' : 'bad');
      B.logMsg(bt, `${B.unitName(bt, e)}が落とし穴にはまった！`, tp.side === 0 ? 'good' : 'bad');
      break;
    }
  }
};
// 投石機を攻城部隊に加える
B.addCatapults = (bt, s) => {
  const n = U.clamp(Math.round(bt.sides[s].start / 30000) + 1, 1, 3);
  const ref = bt.units.filter(u => u.side === s && u.grp === 'siege')[0] || bt.units.find(u => u.side === s);
  if (!ref) return;
  for (let i = 0; i < n; i++) {
    const su = { side: s, t: 'cata', n: 40, tr: 40, wl: 1, al: 1, grp: 'siege', ctrl: s === 0 && bt.sides[0].cmdAll ? 'player' : 'ai', ld: { n: '砲手', sei: '砲', bu: 30, tou: 40, chi: 50, mi: 30, tr: [], st: 'bal' } };
    const u = B.mkUnit(bt, su, bt.units.length);
    u.fp = bt.fp; B.shape(u);
    u.x = U.clamp(ref.x + (i - (n - 1) / 2) * 40 * bt.p, 20, bt.W - 20); u.y = ref.y + (s === 0 ? 1 : -1) * 30 * bt.p;
    u.a = s === 0 ? 0 : Math.PI; u.home = { x: u.x, y: u.y, a: u.a };
    B.unstick(bt, u);
    bt.units.push(u);
    B.unitFx(bt, u);
  }
};
B.unitName = (bt, u) => u.ship ? `${u.ld ? u.ld.n + 'の船団' : '無名の船団'}（${D.UT[u.t].n}）` : `${u.ld ? (u.ld.ret ? u.ld.n : u.ld.n + '隊') : '無名隊'}（${D.UT[u.t].n}）`;
// 名のない隊長は「○○の直属の隊長」と呼ぶ
B.ldName = (ld) => (ld ? (ld.ret ? ld.n + 'の隊長' : ld.n) : '');
B.dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
B.edgeDist = (a, b) => Math.max(0, B.dist(a, b) - (Math.min(a.w, a.h) + Math.min(b.w, b.h)) * 0.5);
B.sight = (bt, u) => { let s = (u.cls === 'cav' ? 260 : u.ship ? 240 : 190) * bt.p * (1 + B.F(u, 'sight')); const t = B.groundT(bt, u.x, u.y); if (t === D.T.HILL || t === D.T.ROCK) s *= 1.35; if (t === D.T.FOREST || t === D.T.VILLAGE) s *= 0.75; else if (t === D.T.GROVE) s *= 0.88; if (u.onwall) s *= 1.3; if (bt.weather === 'fog') s *= 0.55; else if (bt.weather === 'rain' || bt.weather === 'snow') s *= 0.85; return s; };
// 部隊の位置の地形に対応する効果キー
B.terrKey = (t) => D.TILE[t]?.fk || null;
B.terrMul = (bt, u) => {
  const t = B.groundT(bt, u.x, u.y);
  const T = D.TILE[t];
  let m = 0;
  const k = T.fk; if (k) m += B.F(u, k);
  if (T.fk2) m += B.F(u, T.fk2);
  return m;
};
B.weatherMul = (bt, u) => bt.weather && bt.weather !== 'clear' ? B.F(u, 'w_' + bt.weather) : 0;
B.sizeMul = (bt, u) => {
  const mine = bt.sides[u.side].start, foe = bt.sides[1 - u.side].start;
  let m = 0;
  if (mine >= 50000) m += B.F(u, 'big');
  if (mine < foe * 0.75) m += B.F(u, 'few');
  return m;
};
B.foes = (bt, s) => bt.units.filter(u => u.side !== s && B.alive(u) && u.vis[s]);
B.friends = (bt, s) => bt.units.filter(u => u.side === s && B.alive(u));

/* ---------------- 視界・伏兵 ---------------- */
B.updateVis = (bt) => {
  const towers = bt.points.filter(p => p.type === 'tower' && p.owner >= 0);
  for (const e of bt.units) {
    if (!B.alive(e)) continue;
    for (let s = 0; s < 2; s++) {
      if (e.side === s) { e.vis[s] = true; continue; }
      if (e.hidden) { e.vis[s] = false; continue; }
      const t = B.groundT(bt, e.x, e.y);
      const conceal = D.TILE[t].hide ? 0.45 : 1;
      let v = false;
      for (const u of bt.units) {
        if (u.side !== s || !B.alive(u)) continue;
        if (B.dist(u, e) < (B.sight(bt, u) * conceal + e.diag * 0.5)) { v = true; break; }
      }
      if (!v) for (const tw of towers) if (tw.owner === s && U.dist(tw.x, tw.y, e.x, e.y) < 320 * bt.p) { v = true; break; }
      if (!v && bt.sides[s].tactics.includes('kanchou') && bt.time < 30) v = true;
      e.vis[s] = v;
    }
  }
};
B.detectAmbush = (bt) => {
  for (const h of bt.units) {
    if (!h.hidden || !B.alive(h)) continue;
    const t = B.groundT(bt, h.x, h.y);
    if (!D.TILE[t].hide || bt.fire[B.ti(bt, h.x, h.y)] > 0 || h.spd > 1.3 * bt.p) { B.reveal(bt, h); continue; }
    const hchi = h.ld ? h.ld.chi : 40;
    const skill = 1 / (1 + Math.max(0, B.F(h, 'stealth'))) * (bt.weather === 'fog' ? 0.6 : 1);
    const forestPt = bt.points.some(p => p.type === 'forest' && p.owner === h.side && U.dist(p.x, p.y, h.x, h.y) < 140 * bt.p) ? 0.5 : 1;
    for (const e of bt.units) {
      if (e.side === h.side || !B.active(e)) continue;
      const d = B.dist(e, h) - h.diag * 0.5;
      const echi = e.ld ? Math.max(e.ld.chi || 40, e.ld.st === 'ins' ? (e.ld.bu || 40) * 0.9 : 0) : 40;
      const det = Math.max(0, B.F(e, 'detect'));
      const range = (24 + echi * 0.5) * bt.p * (bt.sides[e.side].tactics.includes('kanchou') ? 1.5 : 1) * (1 + det * 0.5);
      if (d < 10 * bt.p) { B.reveal(bt, h); break; }
      if (d < range && Math.random() < U.clamp(0.12 + (echi - hchi) / 220, 0.02, 0.6) * skill * forestPt * (1 + det)) { B.reveal(bt, h); B.text(bt, h.x, h.y, '伏兵発見！', h.side === 0 ? 'bad' : 'good'); if (e.side === 0 && (e.mine || bt.sides[0].cmdAll)) B.tx(bt, 'detect'); break; }
    }
  }
  // 櫓は伏兵も暴く
  for (const tw of bt.points) if (tw.type === 'tower' && tw.owner >= 0) for (const h of bt.units) if (h.hidden && h.side !== tw.owner && U.dist(tw.x, tw.y, h.x, h.y) < 160 * bt.p) B.reveal(bt, h);
};
B.reveal = (bt, h) => { if (!h.hidden) return; h.hidden = false; h.surpriseUntil = 0; };
B.canHide = (bt, u) => D.TILE[B.groundT(bt, u.x, u.y)].hide && u.cls !== 'sie' && u.cls !== 'chr';

/* ---------------- 命令 ---------------- */
B.setOrder = (bt, u, o) => {
  if (!B.alive(u)) return;
  if (u.state === 'rout' && o.type !== 'retreat') return;
  if (u.onwall && o.type !== 'hold' && o.type !== 'zone' && o.type !== 'fire') { const w = bt.walls[u.onwall]; if (w) w.def = null; u.onwall = null; u.state = 'idle'; }
  if (u.climb && o.type !== 'climb') { u.climb = null; if (u.state === 'climb') u.state = 'idle'; }
  if (o.type === 'rejoin') { const par = bt.units[o.parent]; if (par && B.alive(par)) { u.attach = par.id; if (!u.attOff) u.attOff = [0, -(par.h / 2 + u.h / 2 + 0.4 * bt.fp)]; } u.order = null; return; }
  if (o.type !== 'follow' && u.attach != null && !o.keepAttach) { u.attach = null; }
  u.order = o; u.path = null; u.pi = 0; u.pathT = -9; u.lastOrderT = bt.time;
  if (o.type === 'disengage') { u.state = 'disengage'; u.disT = bt.time; }
  else if (o.type === 'feint') { u.state = 'disengage'; u.disT = bt.time; u.feintT = bt.time + 12; }
  else if (o.type === 'rearguard') { u.rgT = bt.time; if (u.side === 0 && (u.mine || bt.sides[0].cmdAll)) B.tx(bt, 'rearguard'); }
  else if (u.state === 'disengage' && !u.eng.length) u.state = 'idle';
  if (o.type === 'hold' && u.state !== 'rout') { u.state = 'idle'; }
  if (o.type === 'ambush') { if (B.canHide(bt, u)) { u.hidden = true; u.order = null; } else B.text(bt, u.x, u.y, '隠れられる地形ではない', 'bad'); }
  if (o.type === 'zone') { u.zone = { x: o.x, y: o.y, r: o.r }; u.order = null; u.zoneFired = {}; }
  if (o.type === 'form') { B.setForm(bt, u, o.f); u.order = null; }
};
B.setForm = (bt, u, f) => {
  if (u.form === f || !D.FORM[f]) return;
  u.form = f; u.formT = bt.time + 4 * Math.max(0.2, 1 - B.F(u, 'form_fast')); // 陣形変更中は弱い
  B.layoutCells(u);
  B.calcMorBase(bt, u);
};
// 主人公の命令（伝令の遅延つき）
B.command = (bt, u, o) => {
  if (!B.alive(u)) return;
  if (u.delegate) u.delegate = null;
  const me = bt.units.find(x => x.me && B.alive(x));
  if (u.side === 0 && u.ctrl !== 'player') u.ctrl = 'player';
  const delayOn = bt.spec.courier !== false && me && u !== me && bt.sides[u.side].cmdAll && !u.mine;
  if (delayOn && me) {
    const d = B.dist(me, u);
    const sig = 230 * bt.p;
    if (d > sig) { u.courier = { o, at: bt.time + Math.min(10, (d - sig) / (18 * bt.p)) * Math.max(0.15, 1 - B.F(me, 'courier')) }; return 'courier'; }
  }
  B.setOrder(bt, u, o);
  return 'ok';
};
B.processCourier = (bt, u) => { if (u.courier && bt.time >= u.courier.at) { const o = u.courier.o; u.courier = null; B.setOrder(bt, u, o); } };

/* ---------------- 経路 ---------------- */
B.lineClear = (bt, x0, y0, x1, y1, mv, side) => {
  const d = Math.hypot(x1 - x0, y1 - y0); const n = Math.max(1, Math.ceil(d / (bt.tile * 0.5)));
  for (let k = 1; k <= n; k++) { const t = k / n; if (!B.passable(bt, B.ti(bt, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t), mv, side)) return false; }
  return true;
};
B.astar = (bt, x0, y0, x1, y1, mv, side) => {
  const { cols, rows } = bt, N = cols * rows;
  const s = B.ti(bt, x0, y0); let g = B.ti(bt, x1, y1);
  if (!B.passable(bt, g, mv, side)) {
    // 目標が通れない場合は近くの通れるタイルへ
    const gc0 = g % cols, gr0 = Math.floor(g / cols); let found = -1;
    for (let rad = 1; rad < 4 * B.TS && found < 0; rad++) for (let dr = -rad; dr <= rad && found < 0; dr++) for (let dc = -rad; dc <= rad; dc++) { const r = gr0 + dr, c = gc0 + dc; if (r < 0 || c < 0 || r >= rows || c >= cols) continue; const j = r * cols + c; if (B.passable(bt, j, mv, side)) { found = j; break; } }
    if (found < 0) return null; g = found; [x1, y1] = B.tc(bt, g);
  }
  const gc = g % cols, gr = Math.floor(g / cols);
  if (!B._as || B._as.N !== N) B._as = { N, gS: new Float32Array(N), f: new Float32Array(N), came: new Int32Array(N), state: new Uint8Array(N), heap: new Int32Array(N * 8) };
  const A = B._as; A.gS.fill(1e9); A.came.fill(-1); A.state.fill(0);
  const heap = A.heap; let hn = 0;
  const push = (i) => { let k = hn++; heap[k] = i; while (k > 0) { const pk = (k - 1) >> 1; if (A.f[heap[pk]] <= A.f[heap[k]]) break; const t = heap[pk]; heap[pk] = heap[k]; heap[k] = t; k = pk; } };
  const pop = () => { const top = heap[0]; heap[0] = heap[--hn]; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < hn && A.f[heap[l]] < A.f[heap[m]]) m = l; if (r < hn && A.f[heap[r]] < A.f[heap[m]]) m = r; if (m === k) break; const t = heap[m]; heap[m] = heap[k]; heap[k] = t; k = m; } return top; };
  A.gS[s] = 0; A.f[s] = Math.hypot(s % cols - gc, Math.floor(s / cols) - gr); push(s); A.state[s] = 1;
  let it = 0;
  while (hn && it++ < 6000 * B.TS * B.TS) {
    const cur = pop();
    if (A.state[cur] === 2) continue;
    if (cur === g) break;
    A.state[cur] = 2;
    const cc = cur % cols, cr = (cur - cc) / cols;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const nc = cc + dc, nr = cr + dr; if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
      const ni = nr * cols + nc; if (A.state[ni] === 2 || !B.passable(bt, ni, mv, side)) continue;
      if (dr && dc && (!B.passable(bt, cr * cols + nc, mv, side) || !B.passable(bt, nr * cols + cc, mv, side))) continue;
      const m = B.moveMul(bt, ni, mv) || 0.05;
      const ng = A.gS[cur] + (dr && dc ? 1.414 : 1) / m;
      if (ng < A.gS[ni]) { A.gS[ni] = ng; A.came[ni] = cur; A.f[ni] = ng + Math.hypot(nc - gc, nr - gr); if (hn < heap.length) push(ni); A.state[ni] = 1; }
    }
  }
  if (A.came[g] < 0 && g !== s) return null;
  const path = []; let c = g; let guard = 0; while (c !== s && c >= 0 && guard++ < N) { path.push(c); c = A.came[c]; }
  path.reverse();
  const pts = path.map(i => B.tc(bt, i));
  const out = []; let ax = x0, ay = y0;
  for (let k = 0; k < pts.length; k++) {
    const nxt = pts[k + 1];
    if (nxt && k % (6 * B.TS) !== 6 * B.TS - 1 && B.lineClear(bt, ax, ay, nxt[0], nxt[1], mv, side)) continue;
    out.push(pts[k]); ax = pts[k][0]; ay = pts[k][1];
  }
  out.push([x1, y1]);
  return out;
};

/* ---------------- 1ステップ ---------------- */
B.step = (bt, dt) => {
  if (bt.ended || bt.paused) return;
  if (!bt.started) B.start(bt);
  bt.time += dt;
  bt.t05 -= dt; bt.t1 -= dt;
  if (bt.t05 <= 0) { bt.t05 += 0.5; B.updateVis(bt); B.updatePoints(bt, 0.5); B.detectAmbush(bt); }
  if (bt.t1 <= 0) { bt.t1 += 1; B.periodic(bt); if (bt.ended || bt.paused) return; }
  // 戦況図のための記録（三秒ごと）
  if (bt.time - (bt.recT ?? -99) >= 3) { bt.recT = bt.time; (bt.rec = bt.rec || []).push({ t: bt.time, d: bt.day, u: bt.units.map(u => B.alive(u) ? [Math.round(u.x), Math.round(u.y), u.n, u.state === 'rout' ? 1 : 0] : null) }); if (bt.rec.length > 480) bt.rec.splice(0, 60); }
  const units = bt.units;
  for (const u of units) {
    if (!B.alive(u)) continue;
    if (u.courier) B.processCourier(bt, u);
    if (bt.time >= u.aiT) { u.aiT = bt.time + U.rf(0.6, 1.3) * (bt.sides[u.side].disarray ? 1.6 : 1); B.think(bt, u); }
  }
  for (const u of units) if (B.alive(u)) B.move(bt, u, dt);
  B.separate(bt, dt);
  B.contacts(bt, dt);
  B.melee(bt, dt);
  B.rampage(bt, dt);
  for (const u of units) if (B.alive(u) && (u.ut.range || u.horseArch) && u.t !== 'cata') B.shoot(bt, u, dt);
  B.projectiles(bt, dt);
  if (bt.walls) B.siegeStep(bt, dt);
  B.hazards(bt, dt);
  for (const u of units) if (B.alive(u)) B.morale(bt, u, dt);
  for (const s of bt.sides) s.cp = Math.min(100, s.cp + s.cpRegen * dt);
  if (bt.myCp != null) bt.myCp = Math.min(100, bt.myCp + bt.myCpRegen * dt);
  if (!bt.ended && bt.time >= bt.dayLen * bt.day) B.dayEnd(bt);
};

B.periodic = (bt) => {
  for (const u of bt.units) {
    if (!B.alive(u)) continue;
    B.calcMorBase(bt, u);
    // 隊列の詰め直し
    if (u.cells.length && (u._dirty || u.cells.some(c => c.n <= 0))) { u._dirty = false; B.layoutCells(u); if (!u.cells.length) { u.n = 0; } }
    // 士気の伝播
    B.spreadMorale(u);
    // 交戦中の将の危険
    if (u.eng.length && u.ld && u.ldFate === 'ok' && !u.escort) {
      const loss = u._lossRate || 0;
      const foeHero = Math.max(0, ...u.eng.map(id => (bt.units[id].ld?.bu || 40)));
      let p = 0.00045 * (loss / Math.max(5, u.n) * 120) * (1 - (u.ld.bu || 40) / 135) * (u.n < 300 ? 2.2 : 1) * (u.form === 'cres' ? 2 : 1) * (foeHero >= 85 ? 1.6 : 1) / (1 + Math.max(0, B.F(u, 'lead_surv')));
      if (u.ld.player) p *= [0.25, 0.55, 0.9][bt.spec.diff ?? 1];
      if (Math.random() < p) { const killer = bt.units[U.pick(u.eng)]; B.leaderHit(bt, u, killer); }
    }
    u._lossRate = 0;
    // 潰走からの立て直し
    if (u.state === 'rout' && !u.eng.length && bt.time - u.routT > 18 && u.ld && u.ldFate === 'ok' && u.n > u.n0 * 0.15) {
      const rally = ((u.ld.tou || 40) / 160 + (B.traitSk(u).includes('kobu') ? 0.2 : 0)) * (1 + B.F(u, 'rally'));
      if (Math.random() < rally * 0.25) B.rally(bt, u);
    }
    // 熱湯・矢
    if (u.fat > 0 && !u.eng.length && u.spd < 0.5 * bt.p) u.fat = Math.max(0, u.fat - 0.03);
  }
  // 側面の士気オフセットは徐々に戻る
  for (const s of bt.sides) s.mo += (0 - s.mo) * 0.01;
  // 決着判定
  B.checkEnd(bt);
  // 計画の更新
  for (let s = 0; s < 2; s++) if (bt.time - bt.sides[s].planT > (bt.sides[s].disarray ? 36 : 18)) B.plan(bt, s);
  // 落とし穴
  if (bt.traps.length) B.checkTraps(bt);
  // 空城の計で退く
  for (let s = 0; s < 2; s++) { const sd = bt.sides[s]; if (sd.kujoRetreatT && bt.time >= sd.kujoRetreatT && !sd.retreat) { sd.kujoRetreatT = 0; B.logMsg(bt, `${sd.name}は空城の計を恐れて兵を退いた！`, s === 0 ? 'bad' : 'good'); B.retreat(bt, s); } }
  // AIの一騎打ち申し込み
  B.aiDuels(bt);
  // 命令遵守（下級の主人公）
  B.obedience(bt);
};
B.spreadMorale = (u) => {
  const cells = u.cells; if (cells.length < 2) return;
  const grid = {};
  for (const c of cells) grid[c.r * 1000 + c.c] = c;
  const delta = [];
  for (const c of cells) {
    let s = 0, k = 0;
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nb = grid[(c.r + dr) * 1000 + c.c + dc]; if (nb) { s += nb.mor; k++; } }
    delta.push(k ? (s / k - c.mor) * 0.12 : 0);
  }
  cells.forEach((c, i) => { c.mor += delta[i]; });
};

/* ---------------- 移動 ---------------- */
B.turnRate = u => u.ship ? (u.ut.turn || 0.5) * (0.7 + (u.navSk || 1) * 0.3) : ({ inf: 0.9, rng: 0.9, cav: 1.6, chr: 0.7, sie: 0.35 }[u.cls] || 0.9);
B.speed = (bt, u) => {
  const F = D.FORM[u.form];
  let v = u.ut.spd * bt.p * F.spd * (1 - u.fat * 0.3) * (1 + B.F(u, 'spd') + (u.form === 'snake' ? B.F(u, 'f_snake') : 0));
  const i = B.ti(bt, u.x, u.y);
  v *= B.uMoveMul(bt, u, i) || 0.15;
  if (u.buffs.shinsoku > bt.time) v *= 1.6;
  if (u.buffs.shippu > bt.time) v *= 1.3;
  if (u.buffs.sally > bt.time) v *= 1.2;
  if (u.cls === 'cav' && bt.sides[u.side].acts.has('ukai')) v *= 1.15;
  // 船：漕ぎ手の腕。コルウスを積んだ船は重い
  if (u.ship) v *= (0.85 + (u.navSk || 1) * 0.15) * (u.corvus ? 0.93 : 1);
  if (bt.weather === 'snow') v *= 0.82; else if (bt.weather === 'rain') v *= 0.92;
  if (u.formT > bt.time) v *= 0.5;
  if (u.ld && u.ld.player && typeof G !== 'undefined' && G && G.me && G.me.eq && G.me.eq.horse && (u.cls === 'cav' || u.n <= 5)) v *= D.ITEMS[G.me.eq.horse].eff.spd || 1;
  return v;
};
B.move = (bt, u, dt) => {
  u.spd = 0;
  if (u.state === 'onwall' || u.state === 'climb') return;
  if (u.state === 'ram') { return; }
  // コルウスでつかまれた船（つかんだ船も）は動けない
  if (u.ship && u.grappleT > bt.time && u.eng.length) return;
  let tx = null, ty = null, charge = false, faceA = null, speedMul = 1;
  const o = u.order;
  if (u.state === 'rout') {
    // 自陣側の端へ
    const ey = u.side === 0 ? bt.H + 50 : -50;
    let ax = 0, ay = 0, k = 0;
    for (const e of bt.units) if (e.side !== u.side && B.active(e) && B.dist(e, u) < 200 * bt.p) { ax += u.x - e.x; ay += u.y - e.y; k++; }
    tx = u.x + (k ? ax / k : 0) * 0.3; ty = ey;
    speedMul = 1.05;
  } else if (u.eng.length && u.state !== 'disengage') {
    // 交戦中：敵の方を向く（押し合いは melee で）
    const e = bt.units[u.eng[0]];
    if (e && !u.ut.fixed) { const da = U.angDiff(u.a, B.angTo(e.x - u.x, e.y - u.y)); if (Math.abs(da) > 0.9 && u.engT < 3) u.a += Math.sign(da) * Math.min(Math.abs(da), B.turnRate(u) * dt * 0.5); }
    return;
  } else if (u.state === 'disengage') {
    // 交戦から離れる：敵から遠ざかる方向
    let ax = 0, ay = 0, k = 0;
    for (const e of bt.units) if (e.side !== u.side && B.active(e) && B.dist(e, u) < (u.diag + e.diag) * 0.8 + 30 * bt.p) { ax += u.x - e.x; ay += u.y - e.y; k++; }
    if (o && o.x != null) { tx = o.x; ty = o.y; }
    else if (k) { const l = Math.hypot(ax, ay) || 1; tx = u.x + ax / l * 80 * bt.p; ty = u.y + ay / l * 80 * bt.p; }
    else { tx = u.x; ty = u.y + (u.side === 0 ? 1 : -1) * 60 * bt.p; }
    speedMul = u.feintT > bt.time ? 1.15 : 0.75;
    if (!u.eng.length && bt.time - u.disT > 1.5 && !(o && o.x != null && U.dist(u.x, u.y, o.x, o.y) > 6)) {
      u.state = 'idle'; if (o && (o.type === 'disengage' || o.type === 'feint')) u.order = null;
      return;
    }
    faceA = u.a;
  } else if (u.attach != null) {
    const par = bt.units[u.attach];
    if (!par || !B.alive(par) || par.state === 'rout') { u.attach = null; }
    else {
      [tx, ty] = B.toWorld(par, u.attOff[0], u.attOff[1]);
      faceA = par.a;
      speedMul = 1.25;
      if (U.dist(u.x, u.y, tx, ty) < 0.5) { u.x = tx; u.y = ty; u.a = par.a; return; }
    }
  } else if (o) {
    if (o.type === 'move' || o.type === 'retreat' || o.type === 'climb' || o.type === 'ramgate' || o.type === 'rearguard' && o.x != null) {
      if (o.type === 'retreat') { tx = u.x; ty = u.side === 0 ? bt.H + 60 : -60; }
      else if (o.type === 'climb') { const w = bt.walls[o.wall]; const off = u.h / 2 + bt.tile * 0.7; tx = w.x + w.nx * off; ty = w.y + w.ny * off; }
      else if (o.type === 'ramgate') { const w = bt.walls[o.wall]; const off = u.h / 2 + bt.tile * 0.6; tx = w.x + w.nx * off; ty = w.y + w.ny * off; }
      else { tx = o.x; ty = o.y; }
      if (o.run) charge = true;
    } else if (o.type === 'attack' || o.type === 'charge') {
      const e = bt.units[o.target];
      if (!e || !B.alive(e) || (e.side === u.side)) { u.order = null; return; }
      if (!e.vis[u.side] && !e.hidden) { /* 見失っても最後の位置へ */ }
      [tx, ty] = B.attackPoint(bt, u, e);
      const d = B.edgeDist(u, e);
      if (o.type === 'charge' || d < 55 * bt.p) charge = d < 70 * bt.p;
    } else if (o.type === 'follow') {
      const t = bt.units[o.target];
      if (!t || !B.alive(t)) { u.order = null; return; }
      [tx, ty] = B.toWorld(t, o.ox || 0, o.oy || t.h / 2 + u.h / 2 + 6 * bt.fp);
      faceA = t.a;
      if (U.dist(u.x, u.y, tx, ty) < 2 * bt.p) return;
    } else if (o.type === 'hold' || o.type === 'rearguard') {
      return B.faceNearest(bt, u, dt);
    }
  } else {
    return B.faceNearest(bt, u, dt);
  }
  if (tx == null) return;
  // 経路
  let wx = tx, wy = ty;
  if (bt.time - (u.losT || -9) > 0.8 || !u.losGoal || U.dist(u.losGoal[0], u.losGoal[1], tx, ty) > 15 * bt.p) { u.losT = bt.time; u.losGoal = [tx, ty]; u.losClear = B.lineClear(bt, u.x, u.y, tx, ty, u.mv, u.side); }
  const needPath = !u.losClear;
  if (needPath) {
    if (!u.path || bt.time - u.pathT > 3 || (u.path.goal && U.dist(u.path.goal[0], u.path.goal[1], tx, ty) > 25 * bt.p)) {
      if (u.pathFailT && bt.time - u.pathFailT < 2.5) return;
      B._astarCount = (B._astarCount || 0) + 1;
      const p = B.astar(bt, u.x, u.y, tx, ty, u.mv, u.side);
      u.path = p ? { pts: p, goal: [tx, ty] } : null; u.pi = 0; u.pathT = bt.time;
      if (!p) { // 到達不能
        u.pathFailT = bt.time;
        if (o && (o.type !== 'attack' || u.ctrl === 'ai')) u.order = null;
        if (u.ctrl === 'player' && u.side === 0 && o) B.text(bt, u.x, u.y, 'そこへは行けない', 'bad');
        return;
      }
      u.pathFailT = 0;
    }
    const pts = u.path.pts;
    while (u.pi < pts.length - 1 && U.dist(u.x, u.y, pts[u.pi][0], pts[u.pi][1]) < bt.tile * 0.6) u.pi++;
    [wx, wy] = pts[Math.min(u.pi, pts.length - 1)];
  } else u.path = null;
  const dx = wx - u.x, dy = wy - u.y, dist = Math.hypot(dx, dy);
  if (dist < 0.4) {
    if (o && o.type === 'move' && U.dist(u.x, u.y, tx, ty) < 1) { u.order = o.then || null; if (o.face != null) u.a = o.face; }
    if (o && o.type === 'climb') { u.state = 'climb'; u.climb = o.wall; }
    if (o && o.type === 'ramgate') { u.state = 'ram'; u.ramWall = o.wall; }
    return;
  }
  const want = B.angTo(dx, dy);
  // 後退（向きを変えずに下がる）：近い距離で背面への移動
  const back = Math.abs(U.angDiff(u.a, want)) > 2.3 && dist < 25 * bt.p && !charge && u.state !== 'rout';
  if (!back) {
    const da = U.angDiff(u.a, want);
    u.a += Math.sign(da) * Math.min(Math.abs(da), B.turnRate(u) * dt * (u.cls === 'cav' ? 1.6 : 1));
  }
  let v = B.speed(bt, u) * speedMul;
  if (charge) v = Math.max(v, u.ut.chg * bt.p * (1 - u.fat * 0.3) * (B.uMoveMul(bt, u, B.ti(bt, u.x, u.y)) || 0.2) * (u.buffs.shinsoku > bt.time ? 1.4 : 1) * (1 + B.F(u, 'spd') * 0.5));
  if (back) v *= 0.45;
  const turnPen = back ? 1 : Math.max(0.25, 1 - Math.abs(U.angDiff(u.a, want)) / 2.2);
  v *= turnPen;
  const step = Math.min(dist, v * dt);
  const nx = u.x + dx / dist * step, ny = u.y + dy / dist * step;
  if (B.passable(bt, B.ti(bt, nx, ny), u.mv, u.side) || u.state === 'rout') { u.x = nx; u.y = ny; }
  else if (B.passable(bt, B.ti(bt, nx, u.y), u.mv, u.side)) u.x = nx;
  else if (B.passable(bt, B.ti(bt, u.x, ny), u.mv, u.side)) u.y = ny;
  else { u.path = null; u.pathT = -9; }
  u.spd = step / dt;
  u.charging = charge && u.spd > u.ut.chg * bt.p * 0.5;
  u.fat = U.clamp(u.fat + (charge ? 0.045 : u.spd > u.ut.spd * bt.p * 1.05 ? 0.01 : 0.002) * dt * Math.max(0.2, 1 - B.F(u, 'fatigue')) * (bt.weather === 'snow' ? 1.3 : 1), 0, 1);
  if (faceA != null && dist < 3 * bt.p) u.a = faceA;
  // 地図の外に出たら離脱
  if (u.y < -20 || u.y > bt.H + 20 || u.x < -20 || u.x > bt.W + 20) {
    u.out = true;
    if (u.state === 'rout') {
      const cut = bt.sides[1 - u.side].acts.has('cut') ? 0.35 : 0;
      const cap = Math.round(u.n * cut);
      u.surr = (u.surr || 0) + cap; u.dead += cap;
      u.routed += u.n - cap; u.n = 0;
      if (cap > 20) B.logMsg(bt, `退路を断たれ、${B.unitName(bt, u)}の兵${cap}人が捕らえられた。`, u.side === 0 ? 'bad' : 'good');
    }
    else u.escaped = true;
    B.unitGone(bt, u);
  }
  // 端に寄りすぎない
  u.x = U.clamp(u.x, -30, bt.W + 30);
};
B.faceNearest = (bt, u, dt) => {
  if (u.state === 'rout') return;
  let best = null, bd = 260 * bt.p;
  for (const e of bt.units) if (e.side !== u.side && B.active(e) && e.vis[u.side]) { const d = B.dist(u, e); if (d < bd) { bd = d; best = e; } }
  if (!best) return;
  const want = B.angTo(best.x - u.x, best.y - u.y);
  const da = U.angDiff(u.a, want);
  if (Math.abs(da) > 0.35) u.a += Math.sign(da) * Math.min(Math.abs(da), B.turnRate(u) * dt * 0.6);
};
B.attackPoint = (bt, u, e) => {
  // 交戦中の敵には側面・背面から
  if (e.eng.length && !u.eng.length) {
    const sides = [];
    for (const sd of ['L', 'Rt', 'R']) {
      const [lx, ly] = sd === 'L' ? [-(e.w / 2 + u.h / 2 + 1), 0] : sd === 'Rt' ? [e.w / 2 + u.h / 2 + 1, 0] : [0, e.h / 2 + u.h / 2 + 1];
      const [wx, wy] = B.toWorld(e, lx, ly);
      const busy = e.eng.some(id => { const f = bt.units[id]; return f && U.dist(f.x, f.y, wx, wy) < (f.diag * 0.6 + 4); });
      sides.push({ wx, wy, d: U.dist(u.x, u.y, wx, wy) + (busy ? 1e5 : 0) + (sd === 'R' ? -20 * bt.p : 0) });
    }
    const b = U.minBy(sides, s => s.d);
    if (b && b.d < 1e5) return [b.wx, b.wy];
  }
  return [e.x, e.y];
};
B.separate = (bt, dt) => {
  const us = bt.units;
  for (let i = 0; i < us.length; i++) {
    const a = us[i]; if (!B.alive(a) || a.onwall) continue;
    for (let j = i + 1; j < us.length; j++) {
      const b = us[j]; if (!B.alive(b) || b.onwall || a.side !== b.side) continue;
      if (a.attach === b.id || b.attach === a.id || (a.attach != null && a.attach === b.attach)) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.01;
      const rr = (Math.min(a.w, a.h) + Math.min(b.w, b.h)) * 0.45 + Math.max(a.w, b.w) * 0.1;
      if (d < rr) {
        const push = (rr - d) * Math.min(1, dt * 1.2);
        const ma = a.eng.length ? 0.1 : 1, mb = b.eng.length ? 0.1 : 1;
        // 押し合っても、通れない所（陸の船・水の兵）には押し出さない
        const ax = a.x - dx / d * push * ma * 0.5, ay = a.y - dy / d * push * ma * 0.5, bx = b.x + dx / d * push * mb * 0.5, by = b.y + dy / d * push * mb * 0.5;
        if (B.passable(bt, B.ti(bt, ax, ay), a.mv, a.side)) { a.x = ax; a.y = ay; }
        if (B.passable(bt, B.ti(bt, bx, by), b.mv, b.side)) { b.x = bx; b.y = by; }
      }
    }
  }
};

/* ---------------- 接触判定 ---------------- */
B.obb = (u) => { const ca = Math.cos(u.a), sa = Math.sin(u.a); return { cx: u.x, cy: u.y, ax: [[ca, sa], [-sa, ca]], h: [u.w / 2, u.h / 2] }; };
B.overlap = (a, b, m) => {
  const A = B.obb(a), Bb = B.obb(b);
  const axes = [A.ax[0], A.ax[1], Bb.ax[0], Bb.ax[1]];
  const dx = Bb.cx - A.cx, dy = Bb.cy - A.cy;
  for (const ax of axes) {
    const ra = A.h[0] * Math.abs(A.ax[0][0] * ax[0] + A.ax[0][1] * ax[1]) + A.h[1] * Math.abs(A.ax[1][0] * ax[0] + A.ax[1][1] * ax[1]);
    const rb = Bb.h[0] * Math.abs(Bb.ax[0][0] * ax[0] + Bb.ax[0][1] * ax[1]) + Bb.h[1] * Math.abs(Bb.ax[1][0] * ax[0] + Bb.ax[1][1] * ax[1]);
    if (Math.abs(dx * ax[0] + dy * ax[1]) > ra + rb + m) return false;
  }
  return true;
};
// b のどの面に a が当たっているか、その幅
B.hitInfo = (a, b) => {
  const [lx, ly] = B.toLocal(b, a.x, a.y);
  const nx = lx / Math.max(0.5, b.w / 2), ny = ly / Math.max(0.5, b.h / 2);
  let side;
  if (Math.abs(ny) >= Math.abs(nx)) side = ny < 0 ? 'F' : 'R'; else side = nx < 0 ? 'L' : 'Rt';
  // 当たり幅（bの辺に沿った区間）
  const horiz = side === 'F' || side === 'R';
  const ax = horiz ? [Math.cos(b.a), Math.sin(b.a)] : [-Math.sin(b.a), Math.cos(b.a)];
  const cA = (a.x - b.x) * ax[0] + (a.y - b.y) * ax[1];
  const ca = Math.cos(a.a), sa = Math.sin(a.a);
  const eA = a.w / 2 * Math.abs(ca * ax[0] + sa * ax[1]) + a.h / 2 * Math.abs(-sa * ax[0] + ca * ax[1]);
  const eB = horiz ? b.w / 2 : b.h / 2;
  const lo = Math.max(-eB, cA - eA), hi = Math.min(eB, cA + eA);
  const L = Math.max(Math.min(1.2, 2 * eB), hi - lo);
  return { side, lo, hi, L };
};
B.contacts = (bt, dt = 0.1) => {
  const us = bt.units;
  for (const u of us) { u._prevEng = u.eng; u.eng = []; }
  bt.cl = [];
  const m = Math.max(0.5, 1.4 * bt.fp);
  for (let i = 0; i < us.length; i++) {
    const a = us[i]; if (!B.alive(a) || a.onwall || a.state === 'climb') continue;
    for (let j = i + 1; j < us.length; j++) {
      const b = us[j]; if (!B.alive(b) || b.side === a.side || b.onwall || b.state === 'climb') continue;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d > (a.diag + b.diag) / 2 + m) continue;
      if (!B.overlap(a, b, m)) continue;
      const hb = B.hitInfo(a, b), ha = B.hitInfo(b, a);
      a.eng.push(b.id); b.eng.push(a.id);
      bt.cl.push({ a, b, ha, hb });
      if (a.hidden) B.surprise(bt, a, b); if (b.hidden) B.surprise(bt, b, a);
    }
  }
  for (const u of us) {
    if (!B.alive(u)) continue;
    if (u.eng.length) { u.engT += dt; if (u.engT > 6) u.chaos = true; if (u.state === 'idle' || u.state === 'move') u.state = 'melee'; if (u.order && u.order.type === 'move' && !u.order.run) {} }
    else { u.engT = Math.max(0, u.engT - dt * 3); if (u.engT === 0) u.chaos = false; if (u.state === 'melee') u.state = 'idle'; }
  }
};
B.surprise = (bt, h, target) => {
  if (!h.hidden) return;
  h.hidden = false;
  h.surpriseUntil = bt.time + 6;
  const ambMul = (1 + B.F(h, 'ambush')) * (bt.sides[h.side].tactics.includes('fukuhei') ? 1 : 0.7);
  B.morHit(bt, target, 26 * ambMul);
  if (h.side === 0 && (h.mine || bt.sides[0].cmdAll)) B.tx(bt, 'ambush');
  bt.sides[target.side].mo -= 3;
  B.text(bt, target.x, target.y, '伏兵だ！', target.side === 0 ? 'bad' : 'good');
  B.logMsg(bt, `${B.unitName(bt, h)}の伏兵が${B.unitName(bt, target)}を奇襲！`, h.side === 0 ? 'good' : 'bad');
};

/* ---------------- 白兵 ---------------- */
B.spacing = u => Math.sqrt(u.ut.dens * (D.FORM[u.form].densMul || 1)) * u.fp;
B.ranks = (u) => {
  if (u.ship) return u.chaos ? 3.5 : 3;
  let r = u.cls === 'cav' ? 1.3 : u.cls === 'chr' ? 1 : u.cls === 'rng' ? 1.5 : 2;
  if (u.t === 'spear') r += 0.8;
  if (u.chaos) r += 1.5;
  if (u.cls === 'sie') r = 0.5;
  return r;
};
B.cellsMor = (u) => u.mor;
// 国の得意（t_兵種・兵の系統・海）。船に乗った兵は陸の兵種で数え、海の国は海戦に強い
B.countryMul = (bt, u) => {
  const C = D.COUNTRIES[bt.sides[u.side].c]; if (!C || !C.bonus) return 1;
  const b = C.bonus; let m = 1;
  const t = u.land || u.t, cls = u.ship ? (D.UT[t] ? D.UT[t].cls : 'inf') : u.cls;
  if (b['t_' + t]) m *= b['t_' + t];
  if (b[t] && t !== cls) m *= b[t];
  if (b[cls]) m *= u.ship ? 1 + (b[cls] - 1) * 0.5 : b[cls];
  if (u.ship && b.water) m *= b.water;
  return m;
};
// 足場の悪い所（森・沼・岩・瓦礫・浅瀬…）。ファランクスはここで崩れる
B.rough = (t) => D.TILE[t].mv[0] < 0.78 && D.TILE[t].mv[0] > 0;
B.atk = (bt, a, b, sideOnA) => {
  const F = D.FORM[a.form];
  let v = a.ut.atk * F.atk * (1 + 0.08 * (a.wl - 1)) * (0.7 + B.trOf(a) / 250) * (a.ld ? 0.85 + (a.ld.tou || 50) / 400 : 0.85);
  // 特性・戦術
  let fm = 1 + B.F(a, 'atk') + B.F(a, 'c_' + a.cls) + B.F(a, 'u_' + a.t) + B.F(a, 'vs_' + b.cls) + B.F(a, 'f_' + a.form) + B.F(a, 'form_all') + B.terrMul(bt, a) + B.weatherMul(bt, a) + B.sizeMul(bt, a);
  if (b.hq) fm += B.F(a, 'vs_hq');
  if (bt.sides[b.side].nomad) fm += B.F(a, 'vs_nomad');
  if (bt.sides[b.side].bandit) fm += B.F(a, 'vs_bandit');
  if (a.form === 'snake') fm += B.F(a, 'f_snake') * 0.5;
  if (bt.city && bt.city.side === a.side && !a.onwall && (a.x < bt.city.x0 || a.x > bt.city.x1 || a.y < bt.city.y0 || a.y > bt.city.y1)) fm += B.F(a, 'sally');
  v *= Math.max(0.3, fm);
  if (a.buffs.gekirin > bt.time) v *= 1.8;
  if (a.buffs.kyouhei > bt.time) v *= 1.2;
  if (a.buffs.sally > bt.time) v *= 1.3;
  if (a.confused > bt.time) v *= 0.75;
  v *= (0.55 + 0.45 * a.mor / 100) * (1 - a.fat * 0.35) * B.countryMul(bt, a);
  if (a.formT > bt.time) v *= 0.75;
  // 海兵の腕（陸の兵種）。コルウスで乗り移ったローマの軍団兵は強い
  if (a.ship) { v *= a.mar || 1; if (a.corvus && b.ship && a.grappleT > bt.time) v *= 1.35; }
  const ta = B.groundT(bt, a.x, a.y), tb = B.groundT(bt, b.x, b.y);
  const ea = bt.elev[B.ti(bt, a.x, a.y)], eb = bt.elev[B.ti(bt, b.x, b.y)];
  if (ea - eb > 0.04) v *= 1 + Math.min(0.25, (ea - eb) * 1.6);
  if (a.cls === 'cav') { if (D.TILE[ta].cavBad) v *= 0.6 + Math.min(0.3, B.F(a, 'mv_rough') * 0.3); if (b.cls === 'rng') v *= 1.7; }
  if (a.cls === 'chr' && !a.ut.elephant) { v *= D.TILE[ta].chrOk ? 1.3 : 0.45; }
  // ファランクス：正面は長槍の壁。でこぼこの地では隊列が崩れる
  if (a.ut.pike) { if (sideOnA === 'F') v *= 1.12; if (B.rough(ta)) v *= 0.72; }
  // ガリアの戦士：最初の突撃は激しいが、長引くと勢いが落ちる
  if (a.ut.fierce) v *= a.engT < 8 ? 1.35 : a.engT > 25 ? 0.85 : 1;
  // 戦象：馬は象を怖がって近寄らない。散兵の投げ槍は象を傷つける
  if (a.cls === 'cav' && b.ut.elephant) v *= 0.6;
  if (a.ut.antiEleph && b.ut.elephant) v *= a.ut.antiEleph;
  if (a.ut.antiCav && (b.cls === 'cav' || b.cls === 'chr') && sideOnA === 'F') v *= a.ut.antiCav;
  if (a.cls === 'rng') v *= 0.8;
  if (a.buffs.totsu > bt.time) v *= 1.5;
  if (a.ship && b.ship && b.ut.light && !a.ut.light) v *= 1.15;
  if (a.surpriseUntil > bt.time) v *= 1.8 * (1 + B.F(a, 'ambush') * 0.4);
  if (a.mv === 4 && (ta === D.T.MOUNT || ta === D.T.FOREST)) v *= 1.15;
  if (bt.weather === 'rain' && a.cls === 'chr') v *= 0.8;
  if (b.cls === 'sie') v *= 2.5;
  if (typeof G !== 'undefined' && G && a.side === 0 && bt.spec.sides[0].player && G.cty && G.cty[bt.sides[0].c]) {
    const cc = G.cty[bt.sides[0].c]; if (cc.equip) v *= 1 + cc.equip * 0.03; if (cc.horse && a.cls === 'cav') v *= 1 + cc.horse * 0.04;
    if (a.cls === 'cav' && S.lawOn(bt.sides[0].c, 'kofuku')) v *= 1.12;
  }
  return v;
};
B.def = (bt, b) => {
  const F = D.FORM[b.form];
  let v = b.ut.def * F.def * (1 + 0.08 * (b.al - 1)) * (0.8 + B.trOf(b) / 400);
  const tb = B.groundT(bt, b.x, b.y);
  v *= D.TILE[tb].def;
  let fm = 1 + B.F(b, 'def') + B.F(b, 'c_' + b.cls) + B.F(b, 'u_' + b.t) + B.F(b, 'f_' + b.form) + B.F(b, 'form_all') + B.terrMul(bt, b) + B.weatherMul(bt, b) + B.sizeMul(bt, b);
  if (D.TILE[tb].fk && D.TILE[tb].fk !== 't_plain') fm += B.F(b, 'terrain');
  if (b.onwall != null || tb === D.T.CITY || tb === D.T.WALL) fm += B.F(b, 'siege_def');
  if (B.F(b, 'camp_def') && bt.points.some(p => p.type === 'camp' && p.owner === b.side && U.dist(p.x, p.y, b.x, b.y) < 120 * bt.p)) fm += B.F(b, 'camp_def');
  v *= Math.max(0.3, fm);
  if (b.buffs.teppeki > bt.time) v *= 1.6;
  if (b.buffs.kyouhei > bt.time) v *= 1.2;
  if (b.buffs.gekirin > bt.time) v *= 0.6;
  if (b.state === 'onwall') v *= 2.4;
  if (b.formT > bt.time) v *= 0.8;
  if (b.state === 'rout') v *= 0.5;
  if (b.ship && tb === D.T.SHOAL && !b.ut.light) v *= 0.85;
  if (b.ut.pike && B.rough(tb)) v *= 0.75;
  return v;
};
B.sideMul = (bt, b, side) => {
  let m = (B.REL_SIDE[side] || 1) * (b.ut.pike && side !== 'F' ? 1.25 : 1);
  if (m > 1) { m = 1 + (m - 1) * D.FORM[b.form].flank * Math.max(0.2, 1 - B.F(b, 'flank_res')); if (b.buffs.teppeki > bt.time) m = 1 + (m - 1) * 0.5; }
  return m;
};
// 士気への打撃（特性・戦法で軽減）
B.morDmg = (bt, u, amt) => { if (amt <= 0) return amt; if (u.buffs && u.buffs.kongou > bt.time) return 0; return amt / (1 + Math.max(0, B.F(u, 'mor_res'))); };
B.morHit = (bt, u, amt, cells) => { const d = B.morDmg(bt, u, amt); if (!d) return; for (const c of (cells || u.cells)) c.mor -= d; };
B.melee = (bt, dt) => {
  const cl = bt.cl;
  if (!cl.length) return;
  for (const u of bt.units) { u._eng = 0; u._press = 0; }
  for (const c of cl) {
    c.nA = Math.min(c.a.n, c.ha.L / Math.max(0.3, B.spacing(c.a)) * B.ranks(c.a));
    c.nB = Math.min(c.b.n, c.hb.L / Math.max(0.3, B.spacing(c.b)) * B.ranks(c.b));
    c.a._eng += c.nA; c.b._eng += c.nB;
  }
  for (const c of cl) {
    if (c.a._eng > c.a.n) c.nA *= c.a.n / c.a._eng;
    if (c.b._eng > c.b.n) c.nB *= c.b.n / c.b._eng;
  }
  for (const c of cl) {
    B.fight(bt, c.a, c.b, c.nA, c.hb, c.ha, dt);
    B.fight(bt, c.b, c.a, c.nB, c.ha, c.hb, dt);
  }
};
// a が b を攻撃。hb: bの被弾面, ha: aの被弾面
B.fight = (bt, a, b, nA, hb, ha, dt) => {
  if (!B.alive(a) || !B.alive(b)) return;
  if (a.state === 'rout' || a.cls === 'sie') return;
  if (a.state === 'disengage' && a.feintT > bt.time) return;
  const now = bt.time;
  b.hitSide[hb.side] = now;
  // コルウス：ローマの船は渡し橋を下ろして敵船をつかまえる
  if (a.corvus && b.ship && a.ship) {
    a.grappleT = b.grappleT = now + 6;
    if (now - (a.corvT ?? -99) > 25) { a.corvT = now; B.text(bt, b.x, b.y, 'コルウス！', a.side === 0 ? 'good' : 'bad'); if (!bt._corvMsg) { bt._corvMsg = true; B.logMsg(bt, 'ローマの船が渡し橋（コルウス）を下ろした。軍団兵が敵船に乗り移っていく！', a.side === 0 ? 'good' : 'bad'); } }
  }
  // 挟撃
  const hs = b.hitSide;
  const recent = s => now - hs[s] < 2.5;
  const nSides = B.SIDES.filter(recent).length;
  const pincer = (recent('F') && recent('R')) || (recent('L') && recent('Rt')) || nSides >= 3;
  const houi = B.F(a, 'pincer');
  let mul = B.sideMul(bt, b, hb.side);
  if (hb.side !== 'F') mul *= 1 + B.F(a, 'flank_dmg');
  if (pincer) { mul *= 1.3 * (1 + houi); if (now - b.pincerT > 10) { b.pincerT = now; B.text(bt, b.x, b.y, nSides >= 3 ? '包囲！' : '挟撃！', b.side === 0 ? 'bad' : 'good'); if (a.side === 0 && (a.mine || bt.sides[0].cmdAll)) B.tx(bt, 'pincer'); } }
  if (a.chaos || b.chaos) mul *= 1.2 + B.F(a, 'chaos');
  if (b.state === 'rout') mul *= 2.2 * (1 + B.F(a, 'pursuit'));
  if (b.state === 'disengage' && !b.feintT && !(b.buffs.tettai > now)) mul *= 1.4 * Math.max(0.3, 1 - B.F(b, 'disengage'));
  const rg = b.state === 'disengage' ? bt.units.find(r => r.side === b.side && r.order && r.order.type === 'rearguard' && r.eng.includes(a.id)) : null;
  if (rg) mul *= 0.3 / (1 + B.F(rg, 'rearguard'));
  let kills = nA * B.K * (B.atk(bt, a, b, ha.side) / Math.max(1, B.def(bt, b))) * mul * dt;
  if (b.ut.pike && hb.side === 'F' && !B.rough(B.groundT(bt, b.x, b.y))) kills *= 0.8;   // 長槍の壁に近寄れない
  // 戦象を散兵が突く：象が驚いて暴れ出すことがある
  if (b.ut.elephant && (a.ut.antiEleph || a.cls === 'rng') && b.state !== 'rout') { b.panic = (b.panic || 0) + dt * (a.ut.antiEleph ? 0.05 : 0.02); if (b.panic > 1 && Math.random() < 0.3 * dt) B.elephPanic(bt, b); }
  // 突撃の衝撃（船は離れてから何度でも突く＝衝角）
  if (a.charging && a.ship && b.ship && (!a.impact[b.id] || now - a.impact[b.id] > 12)) { a.impact[b.id] = now; B.ram(bt, a, b, hb, ha); }
  else if (a.charging && !a.impact[b.id] && !a.ship) {
    a.impact[b.id] = now;
    const mounted = a.cls === 'cav' || a.cls === 'chr';
    const bf = B.F(b, 'brace');
    const braced = mounted && hb.side === 'F' && (b.ut.antiCav || bf > 0.25);
    const braceMul = braced ? (b.ut.antiCav ? 0.25 : 0.6) / (1 + bf) : 1;
    let imp = nA * a.ut.mass * 0.22 * (D.FORM[a.form].impact || 1) * (a.buffs.totsu > now ? 1.5 : 1) * (a.ld && a.ld.st === 'ins' ? 1.15 : 1) * (1 + B.F(a, 'chg')) * braceMul * (b.form === 'square' ? 0.6 : 1) * B.sideMul(bt, b, hb.side) * (D.TILE[bt.terr[B.ti(bt, b.x, b.y)]].cover ? 0.5 : 1);
    if (a.cls === 'chr' && !a.ut.elephant && !D.TILE[B.groundT(bt, a.x, a.y)].chrOk) imp *= 0.3;
    kills += imp;
    const shock = Math.min(32, 10 * a.ut.mass / Math.max(0.8, b.ut.mass) * (braced ? 0.3 : 1) * (1 + B.F(a, 'chg') * 0.5));
    B.morHit(bt, b, shock, B.edgeCells(b, hb.side, hb.lo, hb.hi));
    if (braced) { const counter = nA * 0.04 * (b.ut.antiCav || 1) * (1 + bf); B.applyHits(bt, a, counter, 'F', -1e9, 1e9, b, 1); }
    if (a.side === 0 && (a.mine || bt.sides[0].cmdAll) && imp > 2) B.tx(bt, 'charge');
    if (a.hien) { a.hien = false; B.setOrder(bt, a, { type: 'disengage' }); a.buffs.tettai = now + 4; }
    if (imp > 2) B.fx(bt, { k: 'dust', x: b.x, y: b.y, r: Math.max(6, b.w * 0.3) });
    if (imp > 4 && a.side === 0 && a.ctrl === 'player') B.text(bt, b.x, b.y, '突撃！', 'good');
  }
  // 英雄（将の武勇）
  if (a.ld && (a.n <= 600 || a.me) && hb.side) {
    const bu = (a.ld.bu || 40) / 100;
    kills += bu * bu * bu * 0.35 * dt * (a.n <= 5 ? 1.6 : 1) * (a.buffs.totsu > now ? 1.4 : 1) * (1 + B.F(a, 'hero'));
  }
  // 押し込み
  const press = nA * a.ut.mass * (a.mor / 100);
  a._press += press;
  B.applyHits(bt, b, kills, hb.side, hb.lo, hb.hi, a, 1);
  // 圧力による士気低下（局地的な数の差）
  const ratio = U.clamp(nA / Math.max(1, (b._eng || 1)), 0.3, 3);
  const pres = 0.33 * ratio * dt * (1 - (b.ld ? (b.ld.tou || 40) / 400 : 0)) * (b.buffs.teppeki > now ? 0.6 : 1) * (pincer ? 1.8 * (1 + houi * 1.5) : 1) * (1 + B.F(a, 'fear')) * (a.ut.elephant && b.cls === 'cav' ? 2.2 : 1);
  if (a.ut.elephant && b.cls === 'cav' && now - (b.fearT ?? -99) > 30) { b.fearT = now; B.text(bt, b.x, b.y, '馬が象を怖がる！', b.side === 0 ? 'bad' : 'good'); }
  B.morHit(bt, b, pres, B.edgeCells(b, hb.side, hb.lo, hb.hi));
  // 降伏勧告：潰走する兵が投降する
  if (b.state === 'rout' && B.F(a, 'surrender') > 0 && Math.random() < 0.25 * dt) {
    const k = Math.min(b.n, Math.ceil(b.n * 0.06 * B.F(a, 'surrender')));
    if (k > 0) { B.removeMen(bt, b, k, 'surr'); if (Math.random() < 0.2) B.text(bt, b.x, b.y, '敵兵が投降した', a.side === 0 ? 'good' : 'bad'); }
  }
  if (Math.random() < 0.06 * dt * 10) B.fx(bt, { k: 'clash', x: (a.x + b.x) / 2 + (Math.random() - 0.5) * hb.L * 0.5, y: (a.y + b.y) / 2 + (Math.random() - 0.5) * 3 });
};
// 衝角：速く突っ込んだ船が敵船を破る。横腹・艫なら大きく、舳先どうしはお互いに傷む
B.ram = (bt, a, b, hb, ha) => {
  const now = bt.time;
  const headOn = hb.side === 'F' && ha.side === 'F';
  const rel = U.clamp(a.ut.mass / Math.max(1, b.ut.mass), 0.35, 2.4);
  const slot = (b.ut.hull ? b.ut.hull[0] : 15) * b.fp * Math.sqrt(b.shipsPer || 1);
  const hitShips = Math.max(1, Math.min(4, hb.L / Math.max(2, slot)));   // ぶつかった船の数
  const nA = Math.max(1, Math.min(a.cells.length, Math.ceil(hitShips)));
  let sunk = nA * (headOn ? 0.12 : hb.side === 'R' ? 0.6 : 0.45) * Math.sqrt(rel) * (a.navSk || 1) * (1 + B.F(a, 'chg')) * (a.buffs.totsu > now ? 1.4 : 1) * (D.FORM[a.form].impact || 1);
  if (b.form === 'square') sunk *= 0.6;     // 円陣（キュクロス）は舳先を外に向けて固まる
  if (b.grappleT > now) sunk *= 1.2;        // つかみ合っている船は避けられない
  const per = b.per || 100;
  let left = Math.min(b.n, sunk * per * U.rf(0.7, 1.05));
  const killed = left;
  // ぶつかった所の船から、一隻ずつ沈める
  const cells = B.edgeCells(b, hb.side, hb.lo, hb.hi).filter(c => c.n > 0);
  U.shuffle(cells);
  for (const c of cells) { if (left <= 0.5 || !B.alive(b)) break; const k = Math.min(c.n, left); B.applyHits(bt, b, k, hb.side, 0, 0, a, 1.3, false, [c]); left -= k; }
  if (left > 0.5 && B.alive(b)) B.applyHits(bt, b, left * 0.5, hb.side, hb.lo, hb.hi, a, 1.2);
  B.morHit(bt, b, Math.min(30, 8 + sunk * 7), B.edgeCells(b, hb.side, hb.lo, hb.hi));
  if (headOn) B.applyHits(bt, a, killed * 0.4 / rel, 'F', -1e9, 1e9, b, 1);
  B.fx(bt, { k: 'splash', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, r: Math.max(6, Math.min(hb.L, 60) * 0.4) });
  if (a.side === 0 && (a.mine || bt.sides[0].cmdAll) && killed > per * 0.4) B.tx(bt, 'charge');
  if (killed > per * 0.6) B.text(bt, b.x, b.y, headOn ? '舳先がぶつかった！' : '衝角！', a.side === 0 ? 'good' : 'bad');
};
// 船が沈んだ（乗り手がいなくなった）
B.shipSunk = (bt, u, c, src) => {
  const [lx, ly] = B.cellLocal(u, c), [x, y] = B.toWorld(u, lx, ly);
  B.fx(bt, { k: 'sink', x, y, r: Math.max(5, (u.ut.hull ? u.ut.hull[1] : 40) * u.fp * 0.5), a: u.a });
  bt.stat.sunk[u.side] += u.shipsPer || 1;
  if (Math.random() < 0.25) B.text(bt, x, y, '撃沈', u.side === 0 ? 'bad' : 'good');
};
// 戦象が驚いて暴れ出す：自陣の方へ逃げ、通り道の味方を踏みつける
B.elephPanic = (bt, u) => {
  if (u.state === 'rout' || !B.alive(u)) return;
  u.panic = 0; u.rampageT = bt.time + 22;
  B.routUnit(bt, u);
  B.text(bt, u.x, u.y, '象が暴れ出した！', u.side === 0 ? 'bad' : 'good');
  B.logMsg(bt, `${B.unitName(bt, u)}の象が驚いて暴れ出した！ 味方の列を踏みつけている！`, u.side === 0 ? 'bad' : 'good');
};
B.rampage = (bt, dt) => {
  for (const u of bt.units) {
    if (!u.rampageT || u.rampageT < bt.time || !B.alive(u)) continue;
    for (const v of bt.units) {
      if (v === u || v.side !== u.side || !B.alive(v) || v.ship) continue;
      if (B.dist(u, v) > (u.diag + v.diag) / 2 || !B.overlap(u, v, 1)) continue;
      B.applyHits(bt, v, u.n * 0.06 * dt, null, 0, 0, null, 1.4, true);
      B.morHit(bt, v, 6 * dt);
    }
  }
};
// b の被弾面の縁のセル
B.edgeCells = (u, side, lo, hi) => {
  if (!u.cells.length) return [];
  const out = [];
  const byKey = new Map();
  const horiz = side === 'F' || side === 'R';
  for (const c of u.cells) {
    if (c.n <= 0) continue;
    const key = horiz ? c.c : c.r;
    const cur = byKey.get(key);
    const better = side === 'F' ? (!cur || c.r < cur.r) : side === 'R' ? (!cur || c.r > cur.r) : side === 'L' ? (!cur || c.c < cur.c) : (!cur || c.c > cur.c);
    if (better) byKey.set(key, c);
  }
  const cw = u.w / u.cols, ch = u.h / u.rows;
  for (const c of byKey.values()) {
    const pos = horiz ? -u.w / 2 + (c.c + 0.5) * cw : -u.h / 2 + (c.r + 0.5) * ch;
    const half = (horiz ? cw : ch) * 0.6;
    if (pos + half >= lo && pos - half <= hi) out.push(c);
  }
  return out.length ? out : [...byKey.values()].slice(0, 2);
};
B.applyHits = (bt, u, kills, side, lo, hi, src, morMul = 1, all = false, only = null) => {
  if (kills <= 0 || !B.alive(u)) return;
  const cells = only || (all ? u.cells.filter(c => c.n > 0) : B.edgeCells(u, side, lo, hi));
  if (!cells.length) return;
  let tot = 0;
  for (const c of cells) tot += c.n * (c.wi === -1 ? 0.35 : 1);
  const sMul = side ? B.sideMul(bt, u, side) : 1;
  const lMul = (u.ld ? 1 - (u.ld.tou || 40) / 450 : 1) * (1 - B.trOf(u) / 400) / (1 + Math.max(0, B.F(u, 'mor_res'))) * (u.buffs.kongou > bt.time ? 0 : 1);
  for (const c of cells) {
    const w = c.n * (c.wi === -1 ? 0.35 : 1);
    const share = kills * w / Math.max(0.01, tot);
    c.dmg += share;
    c.hit = bt.time;
    c.mor -= share / Math.max(1, c.max) * 90 * morMul * (sMul > 1 ? 1 + (sMul - 1) * 0.8 : 1) * lMul;
    while (c.dmg >= 1 && c.n > 0) {
      c.dmg -= 1; c.n--; u.n--; u.dead++;
      u._lossRate = (u._lossRate || 0) + 1;
      if (src) B.credit(bt, src, u, c);
      if (c.n <= 0) { u._dirty = true; if (c.wi != null && u.wu) B.wuDown(bt, u, c); if (u.ship) B.shipSunk(bt, u, c, src); }
    }
  }
  if (u.n <= 0) B.unitDestroyed(bt, u, src);
};
B.credit = (bt, src, victim, cell) => {
  src.kills++;
  bt.stat.sideKills[src.side]++;
  if (src.side === 0 && bt.sides[0].player) {
    if (src.ctrl === 'player') bt.stat.meKills++;
    if (victim.state === 'rout' && (src.mine || bt.sides[0].cmdAll)) B.tx(bt, 'pursuit');
    bt.stat.cmdKills++;
    if (src.wu) { const alive = src.cells.filter(c => c.n > 0 && c.wi != null); const c = alive.length ? U.pick(alive) : null; if (c && c.wi >= 0) src.wu[c.wi].kills++; }
  }
};
B.wuDown = (bt, u, c) => {
  if (c.wi === -1) { B.playerHit(bt, u, null, true); return; }
  const w = u.wu[c.wi]; if (!w || w.dead) return;
  if (Math.random() < 0.55) { w.dead = true; B.text(bt, u.x, u.y, `${w.n}が倒れた`, 'bad'); B.logMsg(bt, `伍の仲間、${w.n}が討たれた！`, 'bad'); }
  else { w.hp = 15; w.out = true; B.logMsg(bt, `${w.n}が深手を負って倒れた。`, 'bad'); }
};

/* ---------------- 将 ---------------- */
B.leaderHit = (bt, u, killer) => {
  if (!u.ld || u.ldFate !== 'ok') return;
  if (u.ld.player) { B.playerHit(bt, u, killer, false); return; }
  const bu = u.ld.bu || 40;
  if (Math.random() < 0.35 + bu / 300 + B.F(u, 'lead_surv') * 0.3 + B.F(u, 'luck') * 0.2) { B.logMsg(bt, `${B.ldName(u.ld)}が負傷した！`, u.side === 0 ? 'bad' : 'good'); B.morHit(bt, u, 10); return; }
  B.leaderLost(bt, u, killer, Math.random() < 0.8 - (killer ? B.F(killer, 'capture') * 0.5 : 0));
};
B.leaderLost = (bt, u, killer, killed) => {
  const ld = u.ld; if (!ld || u.ldFate !== 'ok') return;
  u.ldFate = killed ? 'slain' : 'captured';
  const side = bt.sides[u.side];
  const isCmd = u.hq || (side.cmd && ld.n === side.cmd.n);
  const tier = ld.r ? (D.RANKS[ld.r]?.tier || 3) : 3;
  B.text(bt, u.x, u.y, killed ? `${B.ldName(ld)} 討ち取ったり！` : `${B.ldName(ld)}を捕縛！`, u.side === 0 ? 'bad' : 'good');
  B.event(bt, { k: 'slay', ld, killer: killer && killer.ld && !killer.ld.ret ? killer.ld : null, side: u.side, isCmd, killed, big: isCmd || tier >= 6 || !!ld.hist || (killer && killer.me) });
  B.logMsg(bt, `${S_cname(bt, u.side)}の${B.ldName(ld)}が${killed ? '討たれた' : '捕らえられた'}！`, u.side === 0 ? 'bad' : 'good');
  for (const c of u.cells) c.mor -= 30;
  side.mo -= isCmd ? 28 * (killer && killer.fx && killer.fx.vs_hq ? 1.3 : 1) : Math.min(14, 3 + tier * 1.4);
  bt.sides[1 - u.side].mo += isCmd ? 10 : 3;
  const byPlayer = !!(killer && killer.side === 0 && killer.ctrl === 'player');
  if (ld.id && !ld.player) (killed ? bt.stat.slain : bt.stat.captured).push({ id: ld.id, n: ld.n, tier, hist: !!ld.hist, byPlayer, side: u.side });
  else if (!ld.player && byPlayer) bt.stat.slain.push({ id: null, n: ld.n, tier, hist: false, byPlayer, side: u.side });
  if (isCmd) { side.cmdDead = true; side.cmdDeadT = bt.time; for (const v of bt.units) if (v.side === u.side) for (const c of v.cells) c.mor -= 18; B.event(bt, { k: 'cmdDead', side: u.side, ld }); }
  u.ldLost = true;
  u.ld = { n: '副将', sei: '副', bu: 40, tou: 40, chi: 40, mi: 40, tr: [], st: 'bal' };
  if (isCmd) B.recalcFx(bt); else B.unitFx(bt, u);
};
B.playerHit = (bt, u, killer, cellDown) => {
  if (bt.meFate !== 'ok') return;
  const ld = u.ldSnap && u.ldSnap.player ? u.ldSnap : u.ld;
  const luck = B.F(u, 'luck') * 0.25 + B.F(u, 'lead_surv') * 0.12;
  const surv = [0.96, 0.84, 0.62][bt.spec.diff ?? 1] + (ld.bu || 50) / 600 + luck;
  if (Math.random() < surv || bt.spec.noDeath) {
    bt.meFate = 'wounded';
    B.event(bt, { k: 'meDown', dead: false });
    B.text(bt, u.x, u.y, '深手を負った！', 'bad');
    B.logMsg(bt, '主人公が深手を負った！ 部下に担がれて後退する……', 'bad');
    for (const c of u.cells) c.mor -= 20;
    if (u.ld && u.ld.player) u.ld = Object.assign({}, u.ld, { bu: Math.round((u.ld.bu || 50) * 0.6), wounded: true });
  } else {
    bt.meFate = 'dead';
    u.ldFate = 'slain';
    B.event(bt, { k: 'meDown', dead: true });
    B.text(bt, u.x, u.y, '主人公、討ち死に……', 'bad');
    B.logMsg(bt, '主人公は討ち死にした……', 'bad');
    const side = bt.sides[u.side];
    if (side.cmdAll) { side.cmdDead = true; side.cmdDeadT = bt.time; side.mo -= 30; }
  }
};
B.unitDestroyed = (bt, u, src) => {
  if (u._gone) return;
  u._gone = true;
  u.n = 0;
  if (u.ld && u.ldFate === 'ok') {
    if (u.ld.player) B.playerHit(bt, u, src, false);
    else { const bu = u.ld.bu || 40; if (Math.random() > 0.55 + bu / 250 + (u.cls === 'cav' ? 0.15 : 0) + B.F(u, 'lead_surv') * 0.3) B.leaderLost(bt, u, src, Math.random() < 0.75 - (src ? B.F(src, 'capture') * 0.4 : 0)); }
  }
  bt.sides[u.side].mo -= u.hq ? 15 : 3;
  B.text(bt, u.x, u.y, '壊滅', u.side === 0 ? 'bad' : 'good');
  B.unitGone(bt, u);
};
B.unitGone = (bt, u) => {
  if (u.onwall != null && bt.walls) { const w = bt.walls[u.onwall]; if (w && w.def === u.id) w.def = null; }
  u.onwall = null;
  for (const v of bt.units) if (v.attach === u.id) v.attach = null;
};
function S_cname(bt, s) { return bt.sides[s].name; }

/* ---------------- 士気 ---------------- */
B.morale = (bt, u, dt) => {
  const base = u.morBase;
  const inContact = u.eng.length > 0;
  const aura = u.ld && u.ldFate === 'ok' ? (u.ld.tou || 40) / 100 : 0.25;
  let rec = 0.045 * (1 + aura * 0.6) * (1 + B.F(u, 'mor_rec'));
  for (const pt of bt.points) if (pt.type === 'camp' && pt.owner === u.side && U.dist(pt.x, pt.y, u.x, u.y) < 110 * bt.p) rec *= 2.5;
  // 威圧と激励
  let fear = 0;
  for (const e of bt.units) {
    if (!B.active(e) || e === u) continue;
    const f = e.fx && (e.side !== u.side ? e.fx.fear : e.fx.aura);
    if (!f || f <= 0) continue;
    if (B.dist(e, u) > 80 * bt.p) continue;
    if (e.side !== u.side) fear += f; else rec *= 1 + f * 0.6;
  }
  fear = B.morDmg(bt, u, fear);
  if (u.ut.fierce && u.engT > 20) fear += 0.12;
  if (u.ut.elephant && u.state !== 'rout' && u.mor < 32 && Math.random() < 0.08 * dt) { B.elephPanic(bt, u); return; }
  let sum = 0, nsum = 0;
  for (const c of u.cells) {
    if (c.n <= 0) continue;
    const recentlyHit = bt.time - c.hit < 2;
    if (!recentlyHit && u.state !== 'rout') c.mor += (base - c.mor) * rec * dt;
    if (u.state === 'disengage' && u.feintT <= bt.time && !recentlyHit) c.mor -= 0.15 * dt;
    if (fear) c.mor -= fear * dt;
    if (c.mor > 100) c.mor = 100;
    if (c.mor < 7 && u.state !== 'rout' && c.wi !== -1) {
      // 伍（またはその束）が逃げ出す
      u.routed += c.n; u.n -= c.n; c.n = 0; u._dirty = true;
      if (c.wi >= 0 && u.wu) { const w = u.wu[c.wi]; if (w && !w.dead) { w.fled = true; } }
      B.fx(bt, { k: 'flee', x: u.x, y: u.y, a: u.a + Math.PI, side: u.side, n: Math.min(8, 1 + Math.round(c.max / 10)) });
      // 隣の伍も動揺
      for (const d of u.cells) if (d !== c && Math.abs(d.c - c.c) + Math.abs(d.r - c.r) === 1) d.mor -= 9;
      continue;
    }
    sum += c.mor * c.n; nsum += c.n;
  }
  u.mor = nsum ? sum / nsum : 0;
  if (u.n <= 0) { B.unitDestroyed(bt, u, null); return; }
  if (u.state !== 'rout' && (u.mor < 16 || (u.n < u.n0 * 0.25 && u.mor < 40))) B.routUnit(bt, u);
};
B.routUnit = (bt, u) => {
  u.state = 'rout'; u.routT = bt.time; u.order = null; u.attach = null; u.hidden = false;
  if (u.onwall != null && bt.walls) { const w = bt.walls[u.onwall]; if (w) w.def = null; u.onwall = null; }
  for (const c of u.cells) c.mor = Math.min(c.mor, 12);
  bt.sides[u.side].mo -= u.hq ? 10 : 1.5;
  B.text(bt, u.x, u.y, '潰走！', u.side === 0 ? 'bad' : 'good');
  B.logMsg(bt, `${B.unitName(bt, u)}が潰走した。`, u.side === 0 ? 'bad' : 'good');
  for (const v of bt.units) if (v.side === u.side && v !== u && B.active(v) && B.dist(u, v) < 90 * bt.p) for (const c of v.cells) c.mor -= 4;
};
B.rally = (bt, u) => {
  u.state = 'idle'; u.order = null;
  for (const c of u.cells) c.mor = Math.max(c.mor, 40);
  B.text(bt, u.x, u.y, '立て直した！', u.side === 0 ? 'good' : 'bad');
};

/* ---------------- 射撃 ---------------- */
B.range = (bt, u) => {
  let r = (u.ut.range || (u.horseArch ? 110 : 0)) * bt.p * (1 + B.F(u, 'rng_range'));
  if (bt.weather === 'rain') r *= 0.85; else if (bt.weather === 'fog') r *= 0.8;
  const t = B.groundT(bt, u.x, u.y);
  if (t === D.T.HILL) r *= 1.15;
  if (bt.points.some(p => p.type === 'hill' && p.owner === u.side && U.dist(p.x, p.y, u.x, u.y) < 90 * bt.p)) r *= 1.08;
  if (u.onwall != null) r *= 1.25;
  if (u.form === 'goose') r *= 1.1;
  return r;
};
B.shoot = (bt, u, dt) => {
  if (u.state === 'rout' || u.ammo <= 0 || u.state === 'climb') return;
  if (u.eng.length && u.t !== 'tower') return;
  const moving = u.spd > 0.4 * bt.p;
  if (moving && !u.ut.moveFire && !u.horseArch) return;
  u.reload -= dt;
  if (u.reload > 0) return;
  const R = B.range(bt, u);
  let tgt = null;
  const o = u.order;
  const inRange = e => B.edgeDist(u, e) <= R;
  if (o && (o.type === 'attack' || o.type === 'fire') && bt.units[o.target]) { const e = bt.units[o.target]; if (B.alive(e) && e.vis[u.side] && inRange(e)) tgt = e; }
  if (!tgt) {
    let best = null, bs = -1;
    for (const e of bt.units) {
      if (e.side === u.side || !B.alive(e) || !e.vis[u.side]) continue;
      if (u.zone && U.dist(e.x, e.y, u.zone.x, u.zone.y) > u.zone.r + e.diag * 0.4) continue;
      if (!inRange(e)) continue;
      const friendsIn = e.eng.length;
      const d = B.dist(u, e);
      let s = 1000 / (d + 30) * (friendsIn ? 0.25 : 1) * (e.state === 'rout' ? 0.3 : 1) * (e.cls === 'rng' ? 1.2 : 1) * (e.onwall != null ? 1.2 : 1);
      if (s > bs) { bs = s; best = e; }
    }
    tgt = best;
  }
  if (!tgt) { u.reload = 0.5; return; }
  // 射撃
  const d = B.edgeDist(u, tgt);
  const ttile = B.groundT(bt, tgt.x, tgt.y);
  const dens = tgt.ut.dens * (D.FORM[tgt.form].densMul || 1);
  let acc = 0.4 * (1 - 0.45 * d / R) * (0.7 + B.trOf(u) / 200) * U.clamp(1.6 / dens, 0.45, 1.15) * (1 - D.TILE[ttile].cov) * (tgt.spd > 1.2 * bt.p ? 0.85 : 1);
  if (bt.weather === 'rain') acc *= 0.75; else if (bt.weather === 'wind') acc *= 0.85;
  if (tgt.onwall != null) acc *= 0.35;
  const shooters = u.n * (u.onwall != null ? 1 : 0.9) * (moving ? 0.6 : 1);
  let mult = (1 + 0.06 * (u.wl - 1)) * B.countryMul(bt, u) * (D.FORM[u.form].ranged || 1) * Math.max(0.3, 1 + B.F(u, 'rng_dmg') + B.F(u, 'c_' + u.cls) + B.F(u, 'u_' + u.t) + B.F(u, 'vs_' + tgt.cls) + B.weatherMul(bt, u) + (bt.sides[tgt.side].nomad ? B.F(u, 'vs_nomad') : 0) + (bt.sides[tgt.side].bandit ? B.F(u, 'vs_bandit') : 0));
  let tag = null;
  if (u.zone && !u.zoneFired[tgt.id]) { u.zoneFired[tgt.id] = 1; mult *= (bt.sides[u.side].tactics.includes('shazone') ? 2 : 1.4) * (bt.sides[u.side].cmd?.st === 'chi' ? 1.2 : 1) * (1 + B.F(u, 'ambush') * 0.3); tag = '斉射！'; }
  if (u.hidden) { mult *= 2.5; B.reveal(bt, u); tag = '伏兵の斉射！'; for (const c of tgt.cells) c.mor -= 12; }
  if (u.seisha) { mult *= 3; u.seisha = false; tag = '斉射！'; }
  let kills = shooters * acc * (u.ut.mdmg || 0.025) * mult;
  const res = (tgt.ut.arrowRes || 0) + (tgt.al - 1) * 0.06 - (u.ut.pierce || 0) * 0.5;
  kills *= U.clamp(1 - res, 0.2, 1.2) * (D.FORM[tgt.form].arrowTaken || 1) * Math.max(0.25, 1 - B.F(tgt, 'arrow_res'));
  if (tgt.buffs.teppeki > bt.time) kills *= 0.7;
  if (tgt.buffs.bouheki > bt.time) kills *= 0.4;
  const flight = d / (75 * bt.p) + 0.25;
  bt.proj.push({ from: u.id, to: tgt.id, x0: u.x, y0: u.y, x1: tgt.x, y1: tgt.y, t: 0, dur: flight, kills, side: u.side, n: Math.min(28, 4 + Math.round(Math.sqrt(shooters) * 0.8)), xbow: u.t === 'xbow', big: !!tag, mor: 1 + B.F(u, 'arrow_mor'), ff: Math.max(0, 1 - B.F(u, 'ff_res')), fire: bt.sides[u.side].acts.has('hiya') && bt.weather !== 'rain' });
  if (tag) B.text(bt, tgt.x, tgt.y, tag, u.side === 0 ? 'good' : 'bad');
  u.reload = (u.ut.rof || 6) * U.rf(0.9, 1.1) / Math.max(0.3, 1 + B.F(u, 'rng_rate')) / (u.buffs.renya > bt.time ? 2 : 1);
  u.ammo--;
};
B.projectiles = (bt, dt) => {
  const keep = [];
  for (const p of bt.proj) {
    p.t += dt;
    if (p.t >= p.dur) {
      const tgt = bt.units[p.to];
      if (tgt && B.alive(tgt)) {
        // 交戦中の敵を射ると味方にも当たる
        if (tgt.eng.length && Math.random() < 0.3 * (p.ff ?? 1)) {
          const fr = bt.units[U.pick(tgt.eng)];
          if (fr && fr.side === p.side) { B.applyHits(bt, fr, p.kills * 0.4, null, 0, 0, bt.units[p.from], 0.6, true); p.kills *= 0.6; }
        }
        B.applyHits(bt, tgt, p.kills, null, 0, 0, bt.units[p.from], 0.75 * (p.mor || 1), true);
        // 投げ槍・矢を浴びた戦象は驚く（散兵の投げ槍はとくに）
        if (tgt.ut.elephant && tgt.state !== 'rout') { const src = bt.units[p.from]; tgt.panic = (tgt.panic || 0) + (src && src.ut.antiEleph ? 0.22 : 0.06) + (p.fire ? 0.3 : 0); if (tgt.panic > 1 && Math.random() < 0.35) B.elephPanic(bt, tgt); }
        const harass = B.morDmg(bt, tgt, (0.6 + Math.min(4, p.kills * 0.6)) * (p.mor || 1));
        for (const c of tgt.cells) if (Math.random() < 0.5) c.mor -= harass * 0.5;
        if (p.side === 0) { const src = bt.units[p.from]; if (src && (src.mine || bt.sides[0].cmdAll)) B.tx(bt, 'shoot', p.kills); }
        if (p.fire && Math.random() < 0.08) { const ti = B.ti(bt, tgt.x, tgt.y); if (D.TILE[bt.terr[ti]].burn >= 0.6 || tgt.cls === 'sie') { if (B.ignite(bt, ti, 40)) { tgt._lastFireBy = p.from; B.text(bt, tgt.x, tgt.y, '火矢！', p.side === 0 ? 'good' : 'bad'); } } }
        B.fx(bt, { k: 'arrows', x: tgt.x, y: tgt.y, r: Math.max(3, tgt.w * 0.35), n: p.n });
      }
    } else keep.push(p);
  }
  bt.proj = keep;
};

/* ---------------- 攻城 ---------------- */
B.siegeStep = (bt, dt) => {
  const p = bt.p;
  for (const w of bt.walls) w.tower = false;
  // 投石機
  for (const u of bt.units) {
    if (u.t !== 'cata' || !B.alive(u) || u.state === 'rout') continue;
    u.reload -= dt;
    if (u.reload > 0 || u.spd > 0.3 * p) continue;
    const R = B.range(bt, u);
    const w = U.minBy(bt.walls.filter(w => w.side !== u.side && !w.broken && w.captured < 0 && U.dist(w.x, w.y, u.x, u.y) < R), w => (w.kind === 'gate' ? 0 : 60 * p) + U.dist(w.x, w.y, u.x, u.y));
    if (!w) { u.reload = 1; continue; }
    const dmg = (55 + u.n * 0.8) * (1 + B.F(u, 'siege_atk') + B.F(u, 'c_sie'));
    w.hp -= dmg * (w.kind === 'gate' ? 1 : 0.6);
    B.fx(bt, { k: 'rocks', x: w.x, y: w.y, r: bt.T0 * 0.8 });
    const d = bt.units.find(x => x.onwall === w.id && B.alive(x));
    if (d) B.applyHits(bt, d, 1.5 + d.n * 0.01, null, 0, 0, u, 1.2, true);
    if (w.hp <= 0) { if (w.kind === 'gate') B.breakGate(bt, w); else B.collapseWall(bt, w, '投石で城壁が崩れた！'); }
    u.reload = (u.ut.rof || 10) * U.rf(0.9, 1.15);
  }
  // 地道
  if (bt.tunnel && !bt.tunnel.done && bt.started) {
    bt.tunnel.t += dt;
    if (bt.tunnel.t >= bt.tunnel.need) {
      bt.tunnel.done = true;
      const cand = bt.walls.filter(w => w.kind === 'wall' && w.side !== bt.tunnel.s && !w.broken && w.captured < 0);
      const w = U.minBy(cand, w => Math.abs(w.x - bt.city.x) + (w.nx ? 200 * p : 0));
      if (w) B.collapseWall(bt, w, '地道が通じ、城壁が崩れ落ちた！');
    }
  }
  // 内応
  if (bt.naiou && !bt.naiou.done && bt.started && bt.time >= bt.naiou.t) {
    bt.naiou.done = true;
    const atk = bt.sides[bt.naiou.s], dfs = bt.sides[1 - bt.naiou.s];
    const pr = U.clamp(0.55 + ((atk.cmd?.chi || 50) - (dfs.cmd?.chi || 50)) / 120, 0.15, 0.9);
    const g = U.pick(bt.walls.filter(w => w.kind === 'gate' && !w.broken && w.side !== bt.naiou.s));
    if (g && Math.random() < pr) { B.breakGate(bt, g, true); B.logMsg(bt, '内通者が城門を開け放った！', bt.naiou.s === 0 ? 'good' : 'bad'); }
    else B.logMsg(bt, bt.naiou.s === 0 ? '内応は露見し、内通者は斬られた……' : '城内の裏切り者を捕らえた。', bt.naiou.s === 0 ? 'bad' : 'good');
  }
  for (const u of bt.units) {
    if (!B.alive(u)) continue;
    if (u.t === 'tower' && u.state !== 'rout') {
      const w = U.minBy(bt.walls.filter(w => w.kind === 'wall' && w.side !== u.side), w => U.dist(w.x, w.y, u.x, u.y));
      if (w && U.dist(w.x, w.y, u.x, u.y) < u.diag * 0.5 + bt.T0 * 1.4) w.tower = true;
    }
  }
  for (const u of bt.units) {
    if (!B.alive(u)) continue;
    if (u.state === 'ram') {
      const w = bt.walls[u.ramWall];
      if (!w || w.broken) { u.state = 'idle'; u.order = null; continue; }
      if (U.dist(u.x, u.y, w.x, w.y) > u.diag + bt.T0 * 2) { u.state = 'idle'; continue; }
      w.hp -= dt * 7 * (u.n / 30) * (1 + 0.1 * (u.tr / 50)) * (1 + B.F(u, 'ram') + B.F(u, 'siege_atk'));
      if (Math.random() < 0.3 * dt) B.fx(bt, { k: 'dust', x: w.x, y: w.y, r: bt.T0 });
      // 城壁の守備兵は衝車を狙う（熱湯・落石）
      const def = bt.units.filter(d => d.side === w.side && d.onwall != null && B.alive(d) && U.dist(d.x, d.y, w.x, w.y) < bt.T0 * 6);
      if (def.length) B.applyHits(bt, u, dt * 0.35 * def.length * (bt.sides[w.side].acts.has('nettou') ? 1.5 : 1), null, 0, 0, def[0], 0.5, true);
      if (w.hp <= 0) B.breakGate(bt, w);
    }
    if (u.state === 'climb') {
      const w = bt.walls[u.climb];
      if (!w || w.captured === u.side) { u.state = 'idle'; u.climb = null; continue; }
      const def = w.def != null ? bt.units[w.def] : null;
      const len = Math.max(bt.tile, w.len);
      const ladders = (u.t === 'ladder' ? 1.6 : 0.6) * (1 + B.F(u, 'climb') + B.F(u, 'siege_atk'));
      const tw = w.tower ? (bt.sides[u.side].acts.has('tower') ? 4.5 : 3) : 1;
      const hot = bt.sides[w.side].acts.has('nettou') ? 1.5 : 1;
      if (def && B.alive(def) && def.onwall === w.id) {
        const nA = Math.min(u.n, len / B.spacing(u) * 1.2 * ladders * (w.tower ? 2 : 1));
        const nD = Math.min(def.n, len / B.spacing(def) * 2);
        const kA = nA * B.K * B.atk(bt, u, def, 'F') / B.def(bt, def) * 0.6 * dt;
        const kD = nD * B.K * B.atk(bt, def, u, 'F') / B.def(bt, u) * 2.0 * dt * (1 + (def.cls === 'rng' ? 0.4 : 0)) * hot;
        B.applyHits(bt, def, kA, 'F', -1e9, 1e9, u, 0.8);
        B.applyHits(bt, u, kD, 'F', -1e9, 1e9, def, 1.1);
        w.prog += dt * (nA / (nD + 3)) * 0.022 * tw * ladders;
      } else {
        // 守り手のいない城壁は登りやすい（隣の壁から矢）
        w.prog += dt * 0.05 * tw * ladders;
        if (Math.random() < 0.5 * dt) B.applyHits(bt, u, u.n * 0.002 * hot, null, 0, 0, null, 0.5, true);
      }
      if (Math.random() < 0.4 * dt) B.fx(bt, { k: 'clash', x: w.x, y: w.y });
      if (w.prog >= 1) B.breachWall(bt, w, u);
    }
  }
  // 城内から門を開ける
  for (const w of bt.walls) {
    if (w.kind !== 'gate' || w.broken) continue;
    const inside = bt.units.filter(u => u.side !== w.side && B.active(u) && U.dist(u.x, u.y, w.x - w.nx * bt.T0 * 2, w.y - w.ny * bt.T0 * 2) < bt.T0 * 2.6);
    if (inside.length) { w.openT += dt; if (w.openT > 4) { B.breakGate(bt, w, true); } } else w.openT = 0;
  }
  // 本丸
  const ct = bt.city;
  if (ct) {
    const att = 1 - ct.side;
    let a = 0, d = 0;
    for (const u of bt.units) if (B.active(u) && U.dist(u.x, u.y, ct.x, ct.y) < ct.r + u.diag * 0.4) { if (u.side === att) a += u.n; else d += u.n; }
    if (a > 0 && d === 0) { ct.hold += dt; if (ct.hold > 15 && !bt.cityTaken) { bt.cityTaken = true; B.event(bt, { k: 'city', att, pass: !!ct.pass }); B.text(bt, ct.x, ct.y, ct.pass ? '峠の砦を制圧！' : '城砦を制圧！', att === 0 ? 'good' : 'bad'); B.logMsg(bt, ct.pass ? '峠の砦が落ちた！' : '城が落ちた！', att === 0 ? 'good' : 'bad'); bt.sides[ct.side].mo -= 40; } }
    else ct.hold = Math.max(0, ct.hold - dt * 2);
  }
};
B.breakGate = (bt, w, opened) => {
  if (w.broken) return;
  w.broken = true; w.hp = 0;
  if (!bt._gateEv) { bt._gateEv = true; B.event(bt, { k: 'gate', att: 1 - w.side, opened: !!opened }); }
  for (const i of w.tiles) bt.terr[i] = D.T.BROKEN;
  B.text(bt, w.x, w.y, opened ? '城門が開いた！' : '城門を破った！', w.side === 0 ? 'bad' : 'good');
  B.logMsg(bt, opened ? '内側から城門が開け放たれた！' : '衝車が城門を打ち破った！', w.side === 0 ? 'bad' : 'good');
  bt.sides[w.side].mo -= 12; bt.sides[1 - w.side].mo += 8;
  for (const u of bt.units) if (u.side === w.side && B.alive(u)) for (const c of u.cells) c.mor -= 6;
};
B.breachWall = (bt, w, u) => {
  w.captured = u.side; w.prog = 0;
  const def = w.def != null ? bt.units[w.def] : null;
  if (def && B.alive(def)) { def.onwall = null; def.state = 'idle'; for (const c of def.cells) c.mor -= 25; const back = bt.T0 * 1.5 + def.h / 2; def.x = w.x - w.nx * back; def.y = w.y - w.ny * back; }
  w.def = null;
  u.state = 'idle'; u.climb = null; u.order = null;
  const inside = bt.T0 * 1.2 + u.h / 2;
  u.x = w.x - w.nx * inside; u.y = w.y - w.ny * inside;
  u.a = B.angTo(-w.nx, -w.ny);
  B.unstick(bt, u);
  B.text(bt, w.x, w.y, '城壁を突破！', u.side === 0 ? 'good' : 'bad');
  B.logMsg(bt, `${B.unitName(bt, u)}が城壁を乗り越えた！`, u.side === 0 ? 'good' : 'bad');
  bt.sides[w.side].mo -= 6;
  if (u.side === 0 && u.ctrl === 'player') bt.stat.points++;
};

B.collapseWall = (bt, w, msg) => {
  if (w.broken) return;
  w.broken = true; w.hp = 0; w.captured = 1 - w.side;
  const d = w.def != null ? bt.units[w.def] : null;
  if (d && B.alive(d)) { d.onwall = null; d.state = 'idle'; B.applyHits(bt, d, d.n * 0.1, null, 0, 0, null, 1.5, true); const back = bt.T0 * 1.5 + d.h / 2; d.x = w.x - w.nx * back; d.y = w.y - w.ny * back; }
  w.def = null;
  for (const i of w.tiles) bt.terr[i] = D.T.BROKEN;
  B.text(bt, w.x, w.y, msg || '城壁が崩れた！', w.side === 0 ? 'bad' : 'good');
  B.logMsg(bt, msg || '城壁が崩れた！', w.side === 0 ? 'bad' : 'good');
  bt.sides[w.side].mo -= 8;
};

/* ---------------- 火・水 ---------------- */
B.ignite = (bt, i, t = 55) => {
  const tt = bt.terr[i];
  if (!D.TILE[tt].burn || bt.fire[i] > 0 || bt.burnt[i]) return false;
  bt.fire[i] = t;
  return true;
};
B.hazards = (bt, dt) => {
  bt.hz = (bt.hz || 0) + dt;
  const tick = bt.hz >= 1;
  if (tick) bt.hz -= 1;
  const N = bt.cols * bt.rows;
  let anyFire = false, anyFlood = false;
  if (tick) {
    const wx = Math.cos(bt.wind), wy = Math.sin(bt.wind);
    const ignite = [];
    for (let i = 0; i < N; i++) {
      if (bt.fire[i] > 0) {
        anyFire = true;
        bt.fire[i] -= bt.weather === 'rain' ? 3 : 1;
        const c = i % bt.cols, r = Math.floor(i / bt.cols);
        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nc = c + dc, nr = r + dr; if (nc < 0 || nr < 0 || nc >= bt.cols || nr >= bt.rows) continue;
          const j = nr * bt.cols + nc;
          const align = 1 + (dc * wx + dr * wy) * 0.8;
          if (Math.random() < D.TILE[bt.terr[j]].burn * 0.16 * B.TS * align * (bt.weather === 'rain' ? 0.25 : bt.weather === 'wind' ? 1.7 : bt.weather === 'snow' ? 0.5 : 1)) ignite.push(j);
        }
        if (bt.fire[i] <= 0) { bt.fire[i] = 0; bt.burnt[i] = 1; if ([D.T.FOREST, D.T.MARSH, D.T.PLAIN, D.T.GROVE, D.T.FIELD, D.T.GRASS, D.T.VILLAGE].includes(bt.terr[i])) bt.terr[i] = D.T.BURNT; }
      }
      if (bt.flood[i] > 0) { anyFlood = true; bt.flood[i] = Math.max(0, bt.flood[i] - 1); }
    }
    for (const j of ignite) B.ignite(bt, j, U.rf(35, 60));
  }
  if (!tick) return;
  for (const u of bt.units) {
    if (!B.alive(u)) continue;
    const i = B.ti(bt, u.x, u.y);
    if (bt.fire[i] > 0) {
      const src = u._lastFireBy != null ? bt.units[u._lastFireBy] : null;
      const fm = (1 + (src ? B.F(src, 'fire') : 0)) * Math.max(0.2, 1 - B.F(u, 'fire_res'));
      B.applyHits(bt, u, (u.n * 0.006 + 0.2) * fm, null, 0, 0, src, 0.4, true);
      B.morHit(bt, u, 2.2 * fm);
      if (u.hidden) B.reveal(bt, u);
      if (Math.random() < 0.3) B.fx(bt, { k: 'smoke', x: u.x, y: u.y });
    }
    if (bt.flood[i] > 0) { B.applyHits(bt, u, u.n * 0.015, null, 0, 0, null, 0.5, true); for (const c of u.cells) c.mor -= 3; }
  }
};

/* ---------------- 戦法 ---------------- */
B.traitSk = (u) => { const out = []; for (const t of (u.ld && u.ld.tr) || []) { const sk = D.TRAITS[t]?.sk; if (sk && !out.includes(sk)) out.push(sk); } return out; };
B.skillFits = (u, k) => { const t = D.SKILLS[k]?.t; if (!t) return true; if (t === 'rng') return !!(u.ut.range || u.horseArch); if (t === 'cav') return u.cls === 'cav'; if (t === 'sie') return u.cls === 'sie'; if (t === 'inf') return u.cls === 'inf'; return true; };
B.skillsOf = (bt, u) => {
  const out = [];
  if (!u.ld || u.ldFate !== 'ok') return out;
  for (const sk of B.traitSk(u)) if (!out.includes(sk) && B.skillFits(u, sk)) out.push(sk);
  const tac = bt.sides[u.side].tactics;
  if (tac.includes('gitai') && !out.includes('gitai')) out.push('gitai');
  if (tac.includes('chohatsu') && !out.includes('chohatsu')) out.push('chohatsu');
  if (tac.includes('kakei') && !out.includes('kakei')) out.push('kakei_t');
  if (u.cls === 'rng' && !out.includes('seisha') && tac.includes('shazone')) out.push('seisha');
  for (const t of tac) { const T = D.TACTICS[t]; if (T && T.skill && !out.includes(T.skill) && B.skillFits(u, T.skill) && (!T.skillCls || T.skillCls === u.cls)) out.push(T.skill); }
  return out;
};
B.cpPool = (bt, u) => (bt.sides[u.side].player && !bt.sides[u.side].cmdAll) ? 'my' : 'side';
B.cpOf = (bt, u) => B.cpPool(bt, u) === 'my' ? (bt.myCp ?? 0) : bt.sides[u.side].cp;
B.canSkill = (bt, u, k) => {
  const sk = D.SKILLS[k]; if (!sk) return false;
  if ((u.cd[k] || 0) > bt.time) return false;
  if (B.cpOf(bt, u) < sk.cost) return false;
  if (u.state === 'rout' && k !== 'kobu') return false;
  return true;
};
B.useSkill = (bt, u, k, arg) => {
  if (!B.canSkill(bt, u, k)) return false;
  const sk = D.SKILLS[k], now = bt.time, p = bt.p;
  let ok = true;
  switch (k) {
    case 'kobu': {
      for (const c of u.cells) c.mor = Math.min(100, c.mor + 25);
      for (const v of bt.units) if (v !== u && v.side === u.side && B.alive(v) && B.dist(v, u) < 130 * p) for (const c of v.cells) c.mor = Math.min(100, c.mor + 12);
      if (u.state === 'rout') B.rally(bt, u);
      break;
    }
    case 'totsu': u.buffs.totsu = now + sk.dur; u.impact = {}; break;
    case 'shinsoku': u.buffs.shinsoku = now + sk.dur; break;
    case 'teppeki': u.buffs.teppeki = now + sk.dur; break;
    case 'seisha': if (!(u.ut.range || u.horseArch)) return false; u.seisha = true; u.reload = 0; break;
    case 'kakei': case 'kakei_t': {
      let tx = arg?.x, ty = arg?.y;
      if (tx == null) { const e = U.minBy(B.foes(bt, u.side), e => B.dist(e, u)); if (!e) return false; tx = e.x; ty = e.y; }
      if (U.dist(tx, ty, u.x, u.y) > 60 * p) return false;
      let lit = 0;
      const c0 = Math.floor(tx / bt.tile), r0 = Math.floor(ty / bt.tile);
      const fr = Math.round(B.TS * (1 + Math.min(1, B.F(u, 'fire'))));
      if (bt.weather === 'rain') { B.text(bt, tx, ty, '雨で火がつかない', u.side === 0 ? 'bad' : 'good'); return false; }
      for (let dr = -fr; dr <= fr; dr++) for (let dc = -fr; dc <= fr; dc++) { const c = c0 + dc, r = r0 + dr; if (c < 0 || r < 0 || c >= bt.cols || r >= bt.rows) continue; if (B.ignite(bt, r * bt.cols + c, U.rf(45, 70) * (1 + B.F(u, 'fire') * 0.5))) lit++; }
      if (!lit) return false;
      for (const e of bt.units) if (e.side !== u.side && B.dist(e, { x: tx, y: ty }) < 80 * p) e._lastFireBy = u.id;
      B.text(bt, tx, ty, '火計！', u.side === 0 ? 'good' : 'bad');
      break;
    }
    case 'ikki': {
      const e = arg?.target != null ? bt.units[arg.target] : U.minBy(B.foes(bt, u.side), e => B.dist(e, u));
      if (!e || B.edgeDist(u, e) > 60 * p) return false;
      const bu = (u.ld.bu || 50);
      B.applyHits(bt, e, bu / 8, 'F', -1e9, 1e9, u, 1.2);
      for (const c of e.cells) c.mor -= 18 * bu / 90;
      B.text(bt, e.x, e.y, `${u.ld.n} 一騎駆け！`, u.side === 0 ? 'good' : 'bad');
      if (e.ld && e.ldFate === 'ok') { bt.pendingChallenge = { a: u.id, b: e.id, by: u.side }; }
      break;
    }
    case 'sogeki': {
      const R = Math.max(B.range(bt, u), 120 * p) * 1.1;
      const e = arg?.target != null ? bt.units[arg.target] : U.minBy(B.foes(bt, u.side).filter(e => e.ld && e.ldFate === 'ok' && B.edgeDist(u, e) < R), e => B.dist(e, u));
      if (!e || !e.ld) return false;
      const pr = U.clamp(0.18 + ((u.ld.bu || 50) - (e.ld.bu || 50)) / 250, 0.05, 0.45);
      if (Math.random() < pr) { if (e.ld.player) B.playerHit(bt, e, u, false); else B.leaderLost(bt, e, u, Math.random() < 0.5); }
      else { B.text(bt, e.x, e.y, '狙撃は外れた', u.side === 0 ? 'bad' : 'good'); for (const c of e.cells) c.mor -= 6; }
      break;
    }
    case 'rakuseki': {
      const pt = arg?.point != null ? bt.points[arg.point] : bt.points.find(p => p.type === 'hill' && p.owner === u.side && !p.used);
      if (!pt || pt.owner !== u.side || pt.used) return false;
      pt.used = true;
      let hit = 0;
      for (const e of bt.units) if (e.side !== u.side && B.alive(e) && U.dist(e.x, e.y, pt.x, pt.y) < 110 * p + e.diag * 0.3) { B.applyHits(bt, e, e.n * 0.07 + 2, null, 0, 0, u, 1.4, true); for (const c of e.cells) c.mor -= 22; hit++; B.fx(bt, { k: 'rocks', x: e.x, y: e.y, r: e.w * 0.4 }); }
      B.text(bt, pt.x, pt.y, '落石！', u.side === 0 ? 'good' : 'bad');
      if (!hit) B.logMsg(bt, '落石の下には誰もいなかった。');
      break;
    }
    case 'suikei': {
      const pt = bt.points.find(p => p.type === 'dam' && p.owner === u.side && !p.used);
      if (!pt || !bt.river) return false;
      pt.used = true;
      for (const i of bt.river) { const c = i % bt.cols, r = Math.floor(i / bt.cols); for (let dr = -3 * B.TS; dr <= 3 * B.TS; dr++) for (let dc = -B.TS; dc <= B.TS; dc++) { const rr = r + dr, cc = c + dc; if (rr < 0 || cc < 0 || rr >= bt.rows || cc >= bt.cols) continue; const j = rr * bt.cols + cc; if (bt.elev[j] < 0.58) bt.flood[j] = 40; } }
      for (const e of bt.units) if (e.side !== u.side && B.alive(e) && bt.flood[B.ti(bt, e.x, e.y)] > 0) for (const c of e.cells) c.mor -= 28;
      B.text(bt, pt.x, pt.y, '水計！', u.side === 0 ? 'good' : 'bad');
      break;
    }
    case 'gitai': B.setOrder(bt, u, { type: 'feint' }); break;
    case 'renya': if (!(u.ut.range || u.horseArch)) return false; u.buffs.renya = now + sk.dur; u.reload = Math.min(u.reload, 0.5); break;
    case 'kongou': u.buffs.kongou = now + sk.dur; break;
    case 'gekirin': u.buffs.gekirin = now + sk.dur; break;
    case 'kyouhei': for (const v of bt.units) if (v.side === u.side && B.alive(v) && B.dist(v, u) < 120 * p) v.buffs.kyouhei = now + sk.dur; break;
    case 'shippu': for (const v of bt.units) if (v.side === u.side && B.alive(v) && B.dist(v, u) < 120 * p) v.buffs.shippu = now + sk.dur; break;
    case 'bouheki': u.buffs.bouheki = now + sk.dur; break;
    case 'sally': u.buffs.sally = now + sk.dur; break;
    case 'senpu': {
      if (u.cls !== 'cav') return false;
      let hit = 0;
      for (const e of bt.units) if (e.side !== u.side && B.alive(e) && B.edgeDist(u, e) < 30 * p) { B.applyHits(bt, e, 2 + u.n * 0.025 * (1 + B.F(u, 'chg')), null, 0, 0, u, 1.3, true); B.morHit(bt, e, 12); hit++; }
      if (!hit) return false;
      u.fat = Math.min(1, u.fat + 0.2);
      B.text(bt, u.x, u.y, '旋風！', u.side === 0 ? 'good' : 'bad');
      break;
    }
    case 'kaiten': {
      let n = 0;
      for (const v of bt.units) if (v.side === u.side && B.alive(v) && B.dist(v, u) < 170 * p) { if (v.state === 'rout') { B.rally(bt, v); n++; } for (const c of v.cells) c.mor = Math.min(100, c.mor + 15); }
      for (const c of u.cells) c.mor = Math.min(100, c.mor + 20);
      break;
    }
    case 'konran': {
      const e = arg?.target != null ? bt.units[arg.target] : U.minBy(B.foes(bt, u.side).filter(e => B.dist(e, u) < 160 * p), e => B.dist(e, u));
      if (!e || B.dist(e, u) > 200 * p) return false;
      if (e.ld && Math.random() < ((e.ld.chi || 40) - (u.ld.chi || 40) + 30) / 160) { B.text(bt, e.x, e.y, '攪乱を見破った', u.side === 0 ? 'bad' : 'good'); break; }
      e.confused = now + 12; e.order = null; e.attach = null;
      B.text(bt, e.x, e.y, '混乱！', u.side === 0 ? 'good' : 'bad');
      break;
    }
    case 'youdou': {
      const es = B.foes(bt, u.side).filter(e => !e.eng.length && !e.hq && e.cls !== 'sie' && B.dist(e, u) < 280 * p && e.state !== 'rout').slice(0, 3);
      if (!es.length) return false;
      const side = u.x < bt.W / 2 ? 1 : -1;
      const tx = U.clamp(u.x + side * 140 * p, 20, bt.W - 20), ty = u.y;
      let n = 0;
      for (const e of es) { if (e.ld && Math.random() < (e.ld.chi || 40) / 220) continue; e.forced = { x: tx + (Math.random() - 0.5) * 40 * p, y: ty + (Math.random() - 0.5) * 40 * p, until: now + 15 }; B.setOrder(bt, e, { type: 'move', x: e.forced.x, y: e.forced.y }); n++; }
      B.text(bt, u.x, u.y, n ? '陽動！' : '陽動は見破られた', u.side === 0 ? (n ? 'good' : 'bad') : (n ? 'bad' : 'good'));
      break;
    }
    case 'kyuuen': {
      const k = Math.min(Math.round(u.dead * 0.12), Math.max(0, u.n0 - u.n));
      if (k <= 0 || !u.cells.length) return false;
      u.dead -= k; u.n += k; const c = u.cells[u.cells.length - 1]; c.n += k; c.max += k; B.layoutCells(u);
      B.text(bt, u.x, u.y, `救護（+${k}）`, u.side === 0 ? 'good' : 'bad');
      break;
    }
    case 'ransha': {
      if (!(u.ut.range || u.horseArch) || u.ammo <= 0) return false;
      const R = B.range(bt, u);
      const ts = B.foes(bt, u.side).filter(e => B.edgeDist(u, e) <= R).slice(0, 3);
      if (!ts.length) return false;
      for (const e of ts) { const k = u.n * 0.12 * (u.ut.mdmg || 0.03) * (1 + B.F(u, 'rng_dmg')); bt.proj.push({ from: u.id, to: e.id, x0: u.x, y0: u.y, x1: e.x, y1: e.y, t: 0, dur: B.edgeDist(u, e) / (75 * p) + 0.25, kills: k, side: u.side, n: 12, big: true, mor: 1.6 }); }
      u.ammo = Math.max(0, u.ammo - 2);
      break;
    }
    case 'tettai': {
      let n = 0;
      for (const v of bt.units) if (v.side === u.side && B.alive(v) && v.eng.length && B.dist(v, u) < 110 * p && v.state !== 'rout') { B.setOrder(bt, v, { type: 'disengage' }); v.buffs.tettai = now + 8; n++; }
      if (!n) return false;
      break;
    }
    case 'tsuki': {
      const e = u.eng.length ? bt.units[u.eng[0]] : null;
      if (!e) return false;
      B.morHit(bt, e, 20); e.chaos = true; e.engT = Math.max(e.engT, 7);
      B.text(bt, e.x, e.y, '突き崩した！', u.side === 0 ? 'good' : 'bad');
      break;
    }
    case 'hien': {
      if (u.cls !== 'cav') return false;
      const e = arg?.target != null ? bt.units[arg.target] : U.minBy(B.foes(bt, u.side).filter(e => B.dist(e, u) < 200 * p), e => B.dist(e, u));
      if (!e) return false;
      u.hien = true; u.impact = {}; B.setOrder(bt, u, { type: 'charge', target: e.id });
      break;
    }
    case 'hekireki': {
      if (u.cls !== 'sie') return false;
      if (!bt.walls) return false;
      const R = Math.max(B.range(bt, u), 140 * p);
      const w = U.minBy(bt.walls.filter(w => w.side !== u.side && !w.broken && w.captured < 0 && U.dist(w.x, w.y, u.x, u.y) < R), w => U.dist(w.x, w.y, u.x, u.y));
      if (!w) return false;
      w.hp -= 450 * (1 + B.F(u, 'siege_atk'));
      B.fx(bt, { k: 'rocks', x: w.x, y: w.y, r: bt.T0 * 1.4 });
      if (w.hp <= 0) { if (w.kind === 'gate') B.breakGate(bt, w); else B.collapseWall(bt, w); }
      break;
    }
    case 'chohatsu': {
      const e = U.minBy(B.foes(bt, u.side).filter(e => !e.hq && B.dist(e, u) < 200 * p), e => B.dist(e, u));
      if (!e) return false;
      if (e.ld && Math.random() < (e.ld.chi || 40) / 180) { B.text(bt, e.x, e.y, '挑発に乗らない', u.side === 0 ? 'bad' : 'good'); }
      else { e.forced = { target: u.id, until: now + 20 }; B.setOrder(bt, e, { type: 'attack', target: u.id }); B.text(bt, e.x, e.y, '挑発に乗った！', u.side === 0 ? 'good' : 'bad'); }
      break;
    }
    default: ok = false;
  }
  if (!ok) return false;
  if (B.cpPool(bt, u) === 'my') bt.myCp -= sk.cost; else bt.sides[u.side].cp -= sk.cost;
  u.cd[k] = now + sk.cd;
  if (!['kakei', 'kakei_t', 'ikki', 'rakuseki', 'suikei', 'chohatsu', 'senpu', 'konran', 'youdou', 'kyuuen', 'tsuki'].includes(k)) B.text(bt, u.x, u.y, sk.n + '！', u.side === 0 ? 'good' : 'bad');
  if (u.side === 0 && (k === 'kakei' || k === 'kakei_t') && (u.mine || bt.sides[0].cmdAll)) B.tx(bt, 'fire');
  B.logMsg(bt, `${B.ldName(u)}：戦法「${sk.n}」`, u.side === 0 ? 'good' : 'bad');
  return true;
};

/* ---------------- 一騎打ち ---------------- */
B.duelKey = (a, b) => a.id < b.id ? a.id + ':' + b.id : b.id + ':' + a.id;
B.canDuel = (bt, a, b) => !!(a && b && a.ld && b.ld && a.ldFate === 'ok' && b.ldFate === 'ok' && B.alive(a) && B.alive(b) && a.side !== b.side && !bt.duelPairs[B.duelKey(a, b)] && B.edgeDist(a, b) < 35 * bt.p && !a.escort && !b.escort && !(a.ld.wounded || b.ld.wounded));
B.challenge = (bt, a, b) => {
  // a が b に挑む（a は主人公側）
  if (!B.canDuel(bt, a, b)) return 'no';
  bt.duelPairs[B.duelKey(a, b)] = 1;
  const ldb = b.ld;
  const pride = ldb.st === 'ins' ? 0.3 : 0;
  let pAcc = 0.45 + pride + ((ldb.bu || 40) - (a.ld.bu || 40)) / 90;
  // 猪突の将は武力差を顧みず受けて立つ。智謀の将は分の悪い勝負を避ける
  if (ldb.pers === 'bold') pAcc = Math.max(pAcc, 0.9);
  else if (ldb.pers === 'cunning' && (ldb.bu || 40) < (a.ld.bu || 40)) pAcc -= 0.15;
  pAcc = U.clamp(pAcc, 0.08, 0.95);
  if (Math.random() < pAcc) { bt.duel = { a: a.id, b: b.id }; bt.paused = 'duel'; return 'accept'; }
  for (const c of b.cells) c.mor -= 14;
  for (const c of a.cells) c.mor = Math.min(100, c.mor + 8);
  B.text(bt, b.x, b.y, `${ldb.n}は逃げた！`, b.side === 0 ? 'bad' : 'good');
  return 'refuse';
};
// 相手の武力がこれ以上高いと、猪突でない将は自分から挑まない
B.DUEL_GAP = 10;
// 将 e が相手 u に自分から一騎打ちを挑む気があるか（0 なら挑まない）
B.duelUrge = (bt, e, u) => {
  if (!e.ld || !u.ld) return 0;
  const bold = e.ld.pers === 'bold';
  const bu = e.ld.bu || 40, fbu = u.ld.bu || 40;
  if (bu < (bold ? 55 : 72)) return 0;
  const gap = fbu - bu;
  if (!bold && gap > B.DUEL_GAP) return 0;        // 分の悪い相手には挑まない
  let base = (bu - 60) / 30;
  if (bold) base = Math.max(0.6, base) * 1.8;        // 猪突：武力差は気にしない
  else if (gap > 0) base *= 0.6;                     // 少し格上の相手には迷いが出る
  return 0.025 * base * (e.ld.st === 'ins' ? 1.6 : 1) * (D.FORM[e.form].duel || 1);
};
B.aiDuels = (bt) => {
  if (bt.duel || bt.duelOffer) return;
  for (const e of bt.units) {
    // 主人公は自分で「一騎打ち」を選ぶ。挑むのは敵将と味方の AI の将
    if (!B.active(e) || !e.ld || e.ldFate !== 'ok' || e.me) continue;
    for (const id of e.eng) {
      const u = bt.units[id];
      if (!u || !u.ld || u.ldFate !== 'ok') continue;
      if (!B.canDuel(bt, e, u)) continue;
      const pr = B.duelUrge(bt, e, u);
      if (pr <= 0 || Math.random() > pr) continue;
      bt.duelPairs[B.duelKey(e, u)] = 1;
      if (u.me) {
        bt.duelOffer = { a: u.id, b: e.id, bold: e.ld.pers === 'bold' }; bt.paused = 'duelOffer';
        return;
      }
      B.autoDuel(bt, e, u);
      return;
    }
  }
};
B.duelSim = (A, Bf) => {
  // A,B: 将のスナップショット（武力と特性）
  const fa = B.ldFx(A), fb = B.ldFx(Bf);
  let ha = 60 + A.bu * 1.4 + (fa.duel_hp || 0), hb = 60 + Bf.bu * 1.4 + (fb.duel_hp || 0);
  for (let r = 0; r < 14 && ha > 0 && hb > 0; r++) {
    const da = (8 + A.bu * 0.18) * Math.pow(A.bu / Math.max(1, Bf.bu), 0.8) * U.rf(0.6, 1.4) * (1 + (fa.duel || 0) + (fa.duel_read || 0) * 0.3);
    const db = (8 + Bf.bu * 0.18) * Math.pow(Bf.bu / Math.max(1, A.bu), 0.8) * U.rf(0.6, 1.4) * (1 + (fb.duel || 0) + (fb.duel_read || 0) * 0.3);
    hb -= da; ha -= db;
  }
  if (ha > 0 && hb > 0) return { winner: 'draw' };
  return { winner: ha > hb ? 'a' : 'b', kill: Math.random() < 0.7 };
};
B.autoDuel = (bt, a, b) => {
  const r = B.duelSim(a.ld, b.ld);
  B.text(bt, (a.x + b.x) / 2, (a.y + b.y) / 2, `一騎打ち：${a.ld.n} vs ${b.ld.n}`, 'info');
  if (a.side === 0 || b.side === 0 || bt.spec.role === 'watch') B.event(bt, { k: 'duel', a: a.ld, b: b.ld, sa: a.side, winner: r.winner, kill: !!r.kill, fled: !!r.fled });
  B.duelEnd(bt, { a: a.id, b: b.id }, r);
};
// 画面に見せる出来事（描画側が消化する。Node のテストでは溜まるだけ）
B.event = (bt, ev) => { if (!bt.events) bt.events = []; ev.t = bt.time; bt.events.push(ev); if (bt.events.length > 24) bt.events.shift(); };
B.duelEnd = (bt, d, r) => {
  const a = bt.units[d.a], b = bt.units[d.b];
  bt.duel = null; bt.duelOffer = null; bt.paused = null;
  if (!a || !b) return;
  if (r.winner === 'draw') { B.logMsg(bt, `${a.ld.n}と${b.ld.n}の一騎打ちは引き分けに終わった。`); return; }
  const win = r.winner === 'a' ? a : b, lose = r.winner === 'a' ? b : a;
  for (const c of win.cells) c.mor = Math.min(100, c.mor + 22);
  bt.sides[win.side].mo += 6;
  B.logMsg(bt, `一騎打ち！ ${win.ld.n}が${lose.ld.n}を${r.fled ? '退けた' : r.kill ? '討ち取った' : '打ち負かした'}！`, win.side === 0 ? 'good' : 'bad');
  if (win.side === 0 && win.me) { bt.stat.duelWins++; B.tx(bt, 'duel'); if (r.kill) B.tx(bt, 'duelSlay'); }
  if (r.fled) { for (const c of lose.cells) c.mor -= 15; bt.sides[lose.side].mo -= 3; return; }
  if (lose.ld.player) { if (r.kill) B.playerHit(bt, lose, win, false); else { bt.meFate = bt.meFate === 'ok' ? 'wounded' : bt.meFate; for (const c of lose.cells) c.mor -= 25; } return; }
  if (r.kill) B.leaderLost(bt, lose, win, true);
  else { for (const c of lose.cells) c.mor -= 25; bt.sides[lose.side].mo -= 5; B.logMsg(bt, `${lose.ld.n}は傷を負って退いた。`); lose.ld = Object.assign({}, lose.ld, { wounded: true, bu: Math.round((lose.ld.bu || 40) * 0.6) }); }
  if (win.side === 0 && win.me) bt.stat.duelMerit = (bt.stat.duelMerit || 0) + 40 + Math.pow((lose.ld.bu || 40) / 10, 2) * 4;
};

/* ---------------- 命令遵守（下級） ---------------- */
B.obedience = (bt) => {
  if (bt.spec.role !== 'unit') return;
  const me = bt.units.find(u => u.me && B.alive(u));
  const par = bt.units.find(u => u.parentOfMe && B.alive(u));
  if (!me || !par || me.state === 'rout') return;
  const d = B.dist(me, par);
  if (me.attach === par.id || d < 60 * bt.p) bt.stat.order += 1;
  else if (!me.eng.length) bt.stat.disobey += 1;
  // 上官の命令（表示用）
  const o = par.order;
  const msg = !o ? '持ち場を守れ' : o.type === 'attack' || o.type === 'charge' ? `前の敵を叩け！` : o.type === 'hold' ? '持ち場を守れ' : o.type === 'retreat' ? '退け！' : o.type === 'disengage' ? '一旦退け！' : '進め！';
  if (msg !== bt.bossMsg) { bt.bossMsg = msg; bt.bossMsgT = bt.time; }
};

/* ---------------- 夜・日の終わり ---------------- */
B.dayEnd = (bt) => {
  if (bt.day >= bt.maxDays) {
    // 時間切れ
    const r0 = B.strength(bt, 0) / Math.max(1, bt.sides[0].start), r1 = B.strength(bt, 1) / Math.max(1, bt.sides[1].start);
    const s0 = B.strength(bt, 0), s1 = B.strength(bt, 1);
    if (bt.city) B.end(bt, bt.city.side, bt.city.pass ? '関は持ちこたえた' : '城は持ちこたえた');
    else if (s0 > s1 * 1.6 && r0 > r1) B.end(bt, 0, '敵は戦場から退いた');
    else if (s1 > s0 * 1.6 && r1 > r0) B.end(bt, 1, '戦場から退いた');
    else B.end(bt, -1, '日没。両軍兵を引いた（引き分け）');
    return;
  }
  bt.paused = 'night';
  B.logMsg(bt, `${bt.day}日目が暮れた。両軍は陣へ戻る。`);
};
B.strength = (bt, s) => U.sum(bt.units.filter(u => u.side === s && B.active(u)), u => u.n);
B.night = (bt, choice) => {
  const res = [];
  const p = bt.p;
  // AIの夜襲
  const ai = bt.sides[1];
  if (ai.tactics.includes('yashuu') && Math.random() < 0.35) {
    const tgt = U.pick(B.friends(bt, 0).filter(u => u.state !== 'rout'));
    if (tgt) {
      const raider = U.maxBy(B.friends(bt, 1), u => B.F(u, 'night')) || null;
      const ok = Math.random() < (0.45 + (raider ? B.F(raider, 'night') : 0)) * Math.max(0.2, 1 - B.F(tgt, 'night_def'));
      const loss = Math.round(tgt.n * (ok ? 0.1 : 0.03)); B.applyHits(bt, tgt, loss, null, 0, 0, null, 0.8, true); res.push(ok ? `夜半、敵の夜襲を受けた！ ${B.unitName(bt, tgt)}が${loss}人を失った。` : `敵の夜襲を見破り、撃退した。（損害${loss}）`);
    }
  }
  if (choice && choice.k === 'raid') {
    const u = bt.units[choice.unit];
    const foe = U.pick(B.friends(bt, 1).filter(x => x.state !== 'rout'));
    if (u && foe) {
      const chi = (u.ld?.chi || 40) - (foe.ld?.chi || 40);
      const pr = U.clamp(0.4 + chi / 200 + (u.cls === 'cav' ? 0.08 : 0) + (bt.sides[0].tactics.includes('yashuu') ? 0.15 : 0) + B.F(u, 'night') - B.F(foe, 'night_def') * 0.5, 0.1, 0.92);
      if (Math.random() < pr) {
        let tot = 0;
        for (const e of B.friends(bt, 1).filter(x => x.state !== 'rout').slice(0, 3)) { const k = Math.round(e.n * U.rf(0.05, 0.11)); B.applyHits(bt, e, k, null, 0, 0, u, 1.2, true); for (const c of e.cells) c.mor -= 18; tot += k; }
        B.applyHits(bt, u, Math.round(u.n * 0.03), null, 0, 0, null, 0.3, true);
        res.push(`夜襲は成功！ 敵陣は混乱し、約${tot}人を討った。`); B.tx(bt, 'night');
        bt.sides[1].mo -= 8;
      } else {
        B.applyHits(bt, u, Math.round(u.n * U.rf(0.12, 0.22)), null, 0, 0, null, 1, true);
        for (const c of u.cells) c.mor -= 18;
        res.push('夜襲は読まれていた……。手痛い反撃を受けた。');
      }
    }
  }
  const rest = choice && choice.k === 'rest';
  for (const u of bt.units) {
    if (!B.alive(u)) continue;
    // 交戦を解いて少し下がる
    if (u.eng.length || u.state === 'melee' || u.state === 'disengage') { const dir = u.side === 0 ? 1 : -1; u.y += dir * 25 * p; B.unstick(bt, u); }
    u.eng = []; u.engT = 0; u.chaos = false; u.fat = 0; u.order = u.onwall != null ? null : u.order;
    if (u.state === 'rout') { if (u.n > u.n0 * 0.2 && u.ldFate === 'ok') B.rally(bt, u); }
    else if (u.state !== 'onwall' && u.state !== 'climb') u.state = 'idle';
    const heal = Math.round(Math.max(0, u.n0 - u.n - u.routed - (u.surr || 0)) * (rest && u.side === 0 ? 0.06 : 0.03) * (1 + B.F(u, 'camp_heal')));
    const back = Math.round(u.routed * (u.side === 0 && rest ? 0.25 : 0.15));
    const add = Math.max(0, heal + back);
    if (add > 0 && u.cells.length) { u.routed -= back; u.n += add; u.cells[u.cells.length - 1].n += add; u.cells[u.cells.length - 1].max += add; B.layoutCells(u); }
    for (const c of u.cells) c.mor = Math.min(100, Math.max(c.mor, u.morBase * 0.6) + (rest && u.side === 0 ? 20 : 12));
  }
  if (bt.city) {
    const ds = bt.city.side, starve = bt.sides[1 - ds].acts.has('starve');
    bt.siegeFood = (bt.siegeFood ?? (bt.spec.food ?? 6)) - (starve ? 2 : 1);
    if (starve) { bt.sides[ds].mo -= 4; res.push(ds === 0 ? '兵糧攻めで城内の蓄えが減っていく……' : '兵糧攻めが効いている。城内は飢え始めた。'); }
    if (bt.siegeFood <= 0) { bt.sides[ds].mo -= 12; res.push('城内の兵糧が尽きかけている。守兵の士気が落ちた。'); }
    const rep = bt.sides[ds].acts.has('roujou') ? 0.1 : 0.05;
    for (const w of bt.walls) if (!w.broken && w.kind === 'wall') w.hp = Math.min(w.maxhp, w.hp + w.maxhp * rep);
  }
  bt.day++;
  bt.time = bt.dayLen * (bt.day - 1);
  bt.paused = null;
  B.plan(bt, 0); B.plan(bt, 1);
  B.logMsg(bt, `${bt.day}日目の夜が明けた。`);
  return res;
};

/* ---------------- 決着 ---------------- */
B.retreat = (bt, s) => {
  bt.sides[s].retreat = true; bt.sides[s].retreatT = bt.time;
  for (const u of bt.units) if (u.side === s && B.alive(u)) { u.attach = null; B.setOrder(bt, u, { type: 'retreat' }); }
  B.logMsg(bt, `${bt.sides[s].name}は撤退を始めた。`, s === 0 ? 'bad' : 'good');
};
B.checkEnd = (bt) => {
  if (bt.ended) return;
  const lost = [false, false], why = ['', ''];
  for (let s = 0; s < 2; s++) {
    const sd = bt.sides[s];
    const act = B.strength(bt, s);
    const ratio = act / Math.max(1, sd.start);
    if (sd.retreat && bt.time - sd.retreatT > 8) { lost[s] = true; why[s] = '撤退'; }
    else if (ratio < 0.2) { lost[s] = true; why[s] = '総崩れ'; }
    else if (sd.cmdDead && bt.time - sd.cmdDeadT > 10) { lost[s] = true; why[s] = '総大将を失った'; }
    else if (!bt.units.some(u => u.side === s && B.active(u))) { lost[s] = true; why[s] = '全軍潰走'; }
    if (bt.city && bt.city.side !== s && ratio < 0.33) { lost[s] = true; why[s] = '攻めあぐねて退いた'; }
  }
  if (bt.cityTaken) { lost[bt.city.side] = true; why[bt.city.side] = bt.city.pass ? '関が落ちた' : '城が落ちた'; }
  if (bt.meFate === 'dead' && bt.sides[0].cmdAll) { lost[0] = true; why[0] = '総大将（主人公）討死'; }
  if (lost[0] && lost[1]) { const r0 = B.strength(bt, 0) / bt.sides[0].start, r1 = B.strength(bt, 1) / bt.sides[1].start; if (r0 >= r1) lost[0] = false; else lost[1] = false; }
  if (lost[0]) B.end(bt, 1, why[0]);
  else if (lost[1]) B.end(bt, 0, why[1]);
  // 敗色濃厚なAIは撤退
  for (let s = 0; s < 2; s++) {
    const sd = bt.sides[s];
    if (sd.player && sd.cmdAll) continue;
    if (sd.retreat) continue;
    if (bt.city && bt.city.side === s) continue;
    if (sd.noRetreat) continue;
    const act = B.strength(bt, s), en = B.strength(bt, 1 - s);
    if (act < sd.start * 0.4 && en > act * 1.8 && bt.time > 30) B.retreat(bt, s);
  }
};
B.end = (bt, winner, reason) => {
  if (bt.ended) return;
  bt.ended = true; bt.winner = winner; bt.reason = reason;
  B.logMsg(bt, winner === 0 ? `勝利！（${reason}）` : winner === 1 ? `敗北……（${reason}）` : reason, winner === 0 ? 'good' : 'bad');
};

/* ---------------- AI ---------------- */
B.power = u => u.n * (u.ut.atk + u.ut.def) / 20 * (0.6 + u.mor / 200) * (0.7 + u.tr / 250);
B.plan = (bt, s) => {
  const sd = bt.sides[s];
  sd.planT = bt.time;
  const mine = bt.units.filter(u => u.side === s && B.active(u));
  const foes = bt.units.filter(u => u.side !== s && B.active(u) && u.vis[s]);
  const myPow = U.sum(mine, B.power), enPow = Math.max(1, U.sum(foes.length ? foes : bt.units.filter(u => u.side !== s && B.active(u)), B.power)) * (sd.misjudge || 1);
  const ratio = myPow / enPow;
  const st = sd.cmd?.st || 'bal';
  const PP = (typeof PPL !== 'undefined' && sd.cmd && sd.cmd.pers && PPL.PERS[sd.cmd.pers]) ? PPL.PERS[sd.cmd.pers].plan : null;
  const defending = bt.city && bt.city.side === s;
  let plan = sd.plan;
  if (!plan || bt.time - (sd.planSet || 0) > (sd.planT0 || 60)) {
    if (defending) plan = 'hold';
    else if (bt.city) plan = 'siege';
    else if (ratio < (PP ? PP.holdBelow : 0.65) && st !== 'ins') plan = sd.tactics.includes('fukuhei') ? 'lure' : 'hold';
    else if (ratio > (PP ? PP.advAbove : 1.5)) plan = st === 'chi' ? 'envelop' : 'advance';
    else if (PP) { const ok = PP.pref.filter(k => k !== 'lure' || (sd.tactics.includes('fukuhei') && bt.points.some(p => p.type === 'forest'))); plan = U.pick(ok.length ? ok : ['advance']); }
    else plan = st === 'ins' ? (Math.random() < 0.5 ? 'advance' : 'breakthrough') : st === 'chi' ? (Math.random() < 0.5 ? 'envelop' : (sd.tactics.includes('fukuhei') && bt.points.some(p => p.type === 'forest') ? 'lure' : 'seize')) : (Math.random() < 0.5 ? 'advance' : 'envelop');
    sd.plan = plan; sd.planSet = bt.time;
  }
  // 時間経過で守勢から攻勢へ（将の個性で早い遅いがある）
  if (plan === 'hold' && !defending && bt.time > bt.dayLen * (PP ? PP.early : 0.35) && ratio > (PP && PP.early < 0.3 ? 0.65 : 0.8)) plan = sd.plan = 'advance';
  if (plan === 'lure' && bt.time > 120) plan = sd.plan = 'advance';
  if (plan === 'seize' && bt.time > 100) plan = sd.plan = 'advance';
  const cx = U.avg(mine, u => u.x) || bt.W / 2;
  for (const u of mine) {
    if (u.ctrl === 'player' && !u.delegate) continue;
    if (u.parentOfMe && bt.spec.role === 'unit') {}
    let role = 'advance';
    if (u.delegate) { role = { attack: 'advance', defend: 'hold', flank: 'flank', follow: 'followMe' }[u.delegate.mode] || 'hold'; if (u.delegate.basic && role !== 'followMe') role = 'hold'; u.role = role; continue; }
    const rc = u.ship ? (u.ut.range ? 'rng' : u.ut.fast ? 'cav' : 'inf') : u.cls;
    if (u.hq) role = 'guard';
    else if (rc === 'sie') role = 'siege';
    else if (rc === 'rng') role = defending ? 'wallguard' : 'support';
    else if (rc === 'cav' || rc === 'chr') role = plan === 'hold' ? (PP && PP.cavFlank && !defending ? 'flank' : 'reserve') : (plan === 'envelop' || plan === 'advance') ? 'flank' : plan === 'breakthrough' ? 'advance' : 'reserve';
    else {
      role = plan === 'hold' || plan === 'lure' ? 'hold' : plan === 'siege' ? (u.t === 'ladder' ? 'climb' : 'siegeinf') : plan === 'seize' ? 'seize' : 'advance';
      if (defending) role = 'gate';
    }
    if (plan === 'lure' && u.cls === 'inf' && !u.role) {}
    u.role = role;
  }
  // 囮と伏兵
  if (plan === 'lure') {
    const forests = bt.points.filter(p => p.type === 'forest');
    const inf = mine.filter(u => u.cls === 'inf' && !u.hq && u.ctrl !== 'player').sort((a, b) => b.n - a.n);
    if (forests.length && inf.length >= 2 && !sd.lureSet) {
      sd.lureSet = true;
      const f = U.minBy(forests, p => U.dist(p.x, p.y, cx, s === 0 ? bt.H * 0.8 : bt.H * 0.2));
      const amb = inf.slice(1, 3);
      for (const u of amb) { u.role = 'ambush'; u.ambushAt = { x: f.x + (Math.random() - 0.5) * 20 * bt.p, y: f.y }; }
      inf[0].role = 'bait';
    }
  }
  // 敵の弓兵区域（知略型）
  if (st === 'chi' || sd.tactics.includes('shazone')) {
    for (const u of mine.filter(u => u.cls === 'rng' && u.ctrl !== 'player' && !u.zone)) {
      const r = B.range(bt, u) * 0.75;
      const dir = s === 0 ? -1 : 1;
      u.zone = { x: u.x, y: u.y + dir * r * 0.75, r: r * 0.55 };
    }
  }
};
B.think = (bt, u) => {
  if (u.state === 'rout') return;
  const sd = bt.sides[u.side];
  if (u.confused > bt.time) { if (u.order && u.order.type !== 'hold') u.order = null; return; }
  if (u.forced && u.forced.x != null) { if (u.forced.until > bt.time && !u.eng.length) { if (!u.order || u.order.type !== 'move') B.setOrder(bt, u, { type: 'move', x: u.forced.x, y: u.forced.y }); return; } u.forced = null; }
  if (sd.hesitateT && bt.time < sd.hesitateT && !sd.player && !u.eng.length && u.ctrl === 'ai') { if (u.order && u.order.type !== 'hold') B.setOrder(bt, u, { type: 'hold' }); return; }
  if (sd.retreat) { if (!u.order || u.order.type !== 'retreat') { u.attach = null; B.setOrder(bt, u, { type: 'retreat' }); } return; }
  const playerCtl = u.ctrl === 'player' && !u.delegate && sd.player;
  if (playerCtl) return B.thinkPlayerUnit(bt, u);
  if (u.attach != null) return;
  if (u.state === 'climb' || u.state === 'ram' || u.state === 'onwall') { B.aiSkill(bt, u); return; }
  if (u.forced && u.forced.until > bt.time) { if (!u.order || u.order.target !== u.forced.target) B.setOrder(bt, u, { type: 'attack', target: u.forced.target }); return; }
  const foes = B.foes(bt, u.side);
  const p = bt.p;
  B.aiSkill(bt, u);
  // 交戦中
  if (u.eng.length) {
    const rammer = u.ship && u.ut.fast && !(u.grappleT > bt.time);
    if (rammer && u.engT > 3.5 && !u.chaos && Math.random() < 0.5) { B.setOrder(bt, u, { type: 'disengage' }); u.recharge = bt.time + 5; }
    else if (u.cls === 'cav' && u.engT > 7 && !u.chaos && (u.mor < 60 || u.eng.some(id => bt.units[id].ut.antiCav)) && Math.random() < 0.5) { B.setOrder(bt, u, { type: 'disengage' }); u.recharge = bt.time + 7; }
    else if (u.mor < 25 && Math.random() < 0.25 && !u.hq) {
      B.setOrder(bt, u, { type: 'disengage' });
      // 知略型は殿を付ける
      if (sd.cmd?.st === 'chi') { const rg = U.minBy(B.friends(bt, u.side).filter(v => v !== u && v.state !== 'rout' && v.mor > 55 && v.cls === 'inf' && !v.eng.length && !v.hq), v => B.dist(v, u)); if (rg && B.dist(rg, u) < 120 * p) { const e = bt.units[u.eng[0]]; if (e) B.setOrder(bt, rg, { type: 'attack', target: e.id }); } }
    }
    return;
  }
  if (u.recharge && bt.time < u.recharge) {
    if (!u.order || u.order.type !== 'move') { const dir = u.side === 0 ? 1 : -1; B.setOrder(bt, u, { type: 'move', x: u.x + (Math.random() - 0.5) * 60 * p, y: u.y + dir * 50 * p }); }
    return;
  }
  // 士気が低ければ陣で休む
  if (u.mor < 32 && !u.hq && u.role !== 'wallguard') {
    const camp = bt.points.find(pt => pt.type === 'camp' && pt.owner === u.side) || u.home;
    if (camp && U.dist(u.x, u.y, camp.x, camp.y) > 40 * p) { B.setOrder(bt, u, { type: 'move', x: camp.x, y: camp.y }); return; }
  }
  const role = u.role || 'advance';
  const near = (r) => foes.filter(e => B.edgeDist(u, e) < r);
  const pickTarget = (pool) => U.maxBy(pool, e => B.targetScore(bt, u, e));
  switch (role) {
    case 'guard': {
      const inCityOnly = bt.city && bt.city.side === u.side;
      const th = inCityOnly ? foes.filter(e => e.x > bt.city.x0 && e.x < bt.city.x1 && e.y > bt.city.y0 && e.y < bt.city.y1 && B.edgeDist(u, e) < 200 * p) : near(150 * Math.min(p, 2.2));
      if (th.length) B.setOrder(bt, u, { type: 'attack', target: pickTarget(th).id });
      else if (u.home && U.dist(u.x, u.y, u.home.x, u.home.y) > 30 * p) B.setOrder(bt, u, { type: 'move', x: u.home.x, y: u.home.y, face: u.home.a });
      else if (u.order) u.order = null;
      return;
    }
    case 'followMe': {
      const me = bt.units.find(x => x.me && B.alive(x));
      if (!me) { u.role = 'hold'; return; }
      const th = near(50 * p);
      if (th.length) { B.setOrder(bt, u, { type: 'attack', target: pickTarget(th).id }); return; }
      if (!u.order || u.order.type !== 'follow') B.setOrder(bt, u, { type: 'follow', target: me.id, ox: (u.id % 3 - 1) * (me.w + u.w) * 0.6, oy: me.h / 2 + u.h / 2 + 8 * bt.fp });
      return;
    }
    case 'support': {
      // 前衛の後ろで射撃。近づかれたら下がる
      const threat = foes.filter(e => e.cls !== 'rng' && B.edgeDist(u, e) < 45 * p && !e.eng.length);
      if (threat.length) { const e = threat[0]; const dx = u.x - e.x, dy = u.y - e.y, l = Math.hypot(dx, dy) || 1; B.setOrder(bt, u, { type: 'move', x: u.x + dx / l * 50 * p, y: u.y + dy / l * 50 * p, run: true }); return; }
      const front = B.friends(bt, u.side).filter(v => v.cls !== 'rng' && !v.hq && v.state !== 'rout');
      const R = B.range(bt, u);
      const tgt = U.minBy(foes, e => B.dist(u, e));
      if (tgt && B.edgeDist(u, tgt) > R * 0.92) {
        // 射程に入るまで前進（前衛より前には出ない）
        const fy = front.length ? (u.side === 0 ? Math.min(...front.map(v => v.y)) : Math.max(...front.map(v => v.y))) : null;
        let ty = tgt.y + (u.side === 0 ? 1 : -1) * R * 0.8;
        if (fy != null) ty = u.side === 0 ? Math.max(ty, fy + 15 * p) : Math.min(ty, fy - 15 * p);
        B.setOrder(bt, u, { type: 'move', x: U.clamp(tgt.x, u.w, bt.W - u.w), y: ty });
      } else if (u.order && u.order.type === 'move' && tgt && B.edgeDist(u, tgt) < R * 0.85) u.order = null;
      return;
    }
    case 'wallguard': {
      if (u.onwall != null) return;
      const w = U.minBy(bt.walls ? bt.walls.filter(w => w.kind === 'wall' && w.side === u.side && w.def == null && w.captured !== 1 - u.side) : [], w => U.dist(w.x, w.y, u.x, u.y));
      if (w && U.dist(w.x, w.y, u.x, u.y) < bt.T0 * 3) { B.putOnWall(bt, u, w); return; }
      if (w) B.setOrder(bt, u, { type: 'move', x: w.x - w.nx * bt.T0 * 1.5, y: w.y - w.ny * bt.T0 * 1.5 });
      else B.thinkHold(bt, u, foes);
      return;
    }
    case 'gate': {
      // 破られた門・乗り越えられた壁へ
      const breach = bt.walls ? bt.walls.filter(w => w.side === u.side && (w.broken || w.captured >= 0)) : [];
      const inCity = foes.filter(e => bt.city && e.x > bt.city.x0 && e.x < bt.city.x1 && e.y > bt.city.y0 && e.y < bt.city.y1);
      if (inCity.length) { B.setOrder(bt, u, { type: 'attack', target: pickTarget(inCity).id }); return; }
      if (breach.length) { const w = U.minBy(breach, w => U.dist(w.x, w.y, u.x, u.y)); const tx = w.x - w.nx * (u.h / 2 + bt.T0), ty = w.y - w.ny * (u.h / 2 + bt.T0); if (U.dist(u.x, u.y, tx, ty) > 8 * p) B.setOrder(bt, u, { type: 'move', x: tx, y: ty }); return; }
      const atGate = foes.filter(e => bt.walls.some(w => w.kind === 'gate' && w.side === u.side && U.dist(w.x, w.y, e.x, e.y) < e.diag * 0.5 + bt.T0 * 2.5) && !e.onwall);
      if (atGate.length && u.cls !== 'rng') { B.setOrder(bt, u, { type: 'attack', target: pickTarget(atGate).id }); return; }
      if (u.home && U.dist(u.x, u.y, u.home.x, u.home.y) > 12 * p) B.setOrder(bt, u, { type: 'move', x: u.home.x, y: u.home.y, face: u.home.a });
      return;
    }
    case 'siege': {
      if (u.t === 'ram') {
        const g = U.minBy(bt.walls.filter(w => w.kind === 'gate' && !w.broken && w.side !== u.side), w => U.dist(w.x, w.y, u.x, u.y) + (Math.abs(w.ny) > 0 ? 0 : 200));
        if (g) { if (!u.order || u.order.type !== 'ramgate') B.setOrder(bt, u, { type: 'ramgate', wall: g.id }); }
        else B.thinkHold(bt, u, foes);
        return;
      }
      if (u.t === 'cata') {
        const R = B.range(bt, u) * 0.85;
        const w = U.minBy(bt.walls.filter(w => w.side !== u.side && !w.broken && w.captured < 0), w => (w.kind === 'gate' ? 0 : 80 * bt.p) + U.dist(w.x, w.y, u.x, u.y));
        if (w && U.dist(w.x, w.y, u.x, u.y) > R) { const d = U.dist(w.x, w.y, u.x, u.y); const tx = w.x + (u.x - w.x) / d * R * 0.85, ty = w.y + (u.y - w.y) / d * R * 0.85; if (!u.order || u.order.type !== 'move') B.setOrder(bt, u, { type: 'move', x: tx, y: ty }); }
        else if (u.order) u.order = null;
        return;
      }
      if (u.t === 'tower') {
        const w = U.minBy(bt.walls.filter(w => w.kind === 'wall' && w.side !== u.side && w.captured < 0), w => U.dist(w.x, w.y, u.x, u.y) + (w.nx ? 300 : 0));
        if (w) { const off = u.h / 2 + bt.tile * 0.4; const tx = w.x + w.nx * off, ty = w.y + w.ny * off; if (U.dist(u.x, u.y, tx, ty) > 2) B.setOrder(bt, u, { type: 'move', x: tx, y: ty }); }
        return;
      }
      return B.thinkHold(bt, u, foes);
    }
    case 'climb': {
      const gateOpen = bt.walls.some(w => w.kind === 'gate' && w.broken && w.side !== u.side);
      if (gateOpen) { u.role = 'siegeinf'; return; }
      if (u.order && u.order.type === 'climb') return;
      const ws = bt.walls.filter(w => w.kind === 'wall' && w.side !== u.side && w.captured < 0);
      const w = U.minBy(ws, w => U.dist(w.x, w.y, u.x, u.y) * (w.tower ? 0.4 : 1) + (w.nx ? 200 * p : 0) + (w.def != null ? 60 * p : 0));
      if (w) B.setOrder(bt, u, { type: 'climb', wall: w.id });
      return;
    }
    case 'siegeinf': {
      // 門が開くか壁が落ちるまで矢の届かない所で待機。開いたら突入
      const open = bt.walls.filter(w => w.side !== u.side && (w.broken || w.captured === u.side));
      if (open.length) {
        const inCity = foes.filter(e => bt.city && e.x > bt.city.x0 - 5 && e.x < bt.city.x1 + 5 && e.y > bt.city.y0 - 5 && e.y < bt.city.y1 + 5);
        if (inCity.length) { B.setOrder(bt, u, { type: 'attack', target: pickTarget(inCity).id }); return; }
        B.setOrder(bt, u, { type: 'move', x: bt.city.x, y: bt.city.y });
        return;
      }
      const out = near(80 * p).filter(e => !e.onwall);
      if (out.length) { B.setOrder(bt, u, { type: 'attack', target: pickTarget(out).id }); return; }
      // 時間が経っても門が開かなければ梯子で登る
      if (bt.time > 90 && Math.random() < 0.15) { u.role = 'climb'; }
      return;
    }
    case 'ambush': {
      if (!u.hidden && u.ambushAt) {
        if (U.dist(u.x, u.y, u.ambushAt.x, u.ambushAt.y) > 6 * p) { if (!u.order) B.setOrder(bt, u, { type: 'move', x: u.ambushAt.x, y: u.ambushAt.y }); return; }
        if (B.canHide(bt, u)) u.hidden = true;
      }
      const th = foes.filter(e => B.edgeDist(u, e) < 70 * p);
      if (th.length) { u.role = 'advance'; B.setOrder(bt, u, { type: 'attack', target: pickTarget(th).id }); }
      return;
    }
    case 'bait': {
      const th = near(60 * p);
      if (th.length && !u.baited) { u.baited = true; B.setOrder(bt, u, { type: 'feint' }); u.role = 'hold'; return; }
      const e = pickTarget(foes); if (e) B.setOrder(bt, u, { type: 'attack', target: e.id });
      return;
    }
    case 'reserve': {
      // 苦戦している味方を助ける
      const hurt = B.friends(bt, u.side).filter(v => v.eng.length && v.mor < 50 && B.dist(v, u) < 320 * p);
      if (hurt.length) { const v = U.minBy(hurt, v => v.mor); const e = bt.units[v.eng[0]]; if (e) { B.setOrder(bt, u, { type: 'attack', target: e.id }); return; } }
      const routers = foes.filter(e => e.state === 'rout' && B.dist(e, u) < 260 * p);
      if (routers.length && u.cls === 'cav') { B.setOrder(bt, u, { type: 'attack', target: U.minBy(routers, e => B.dist(e, u)).id }); return; }
      if (bt.time > bt.dayLen * 0.4 + (bt.day - 1) * bt.dayLen) u.role = 'flank';
      return B.thinkHold(bt, u, foes);
    }
    case 'flank': {
      if (!foes.length) return B.thinkAdvance(bt, u, foes);
      // 交戦中の敵の側背・弓兵・本陣を狙う
      const pool = foes.filter(e => e.state !== 'rout' || B.dist(e, u) < 150 * p);
      const e = pickTarget(pool);
      if (!e) return;
      const d = B.dist(u, e);
      if (!e.eng.length && e.cls !== 'rng' && !e.hq && d > 120 * p && !u.flankWp) {
        // 大回り
        const side = e.x < bt.W / 2 ? -1 : 1;
        const wx = U.clamp(e.x + side * (e.w / 2 + 90 * p), 20, bt.W - 20);
        const wy = e.y + (u.side === 0 ? -1 : 1) * 30 * p;
        u.flankWp = true;
        B.setOrder(bt, u, { type: 'move', x: wx, y: wy, then: { type: 'attack', target: e.id }, run: true });
        return;
      }
      if (!u.order || u.order.type !== 'attack' || u.order.target !== e.id) { if (!(u.order && u.order.type === 'move' && u.order.then)) B.setOrder(bt, u, { type: 'attack', target: e.id }); }
      return;
    }
    case 'seize': {
      const pts = bt.points.filter(pt => pt.owner !== u.side && pt.type !== 'camp');
      const pt = U.minBy(pts, pt => U.dist(pt.x, pt.y, u.x, u.y));
      const th = near(60 * p);
      if (th.length) { B.setOrder(bt, u, { type: 'attack', target: pickTarget(th).id }); return; }
      if (pt && U.dist(pt.x, pt.y, u.x, u.y) > pt.r * 0.6) { B.setOrder(bt, u, { type: 'move', x: pt.x, y: pt.y }); return; }
      if (!pt) u.role = 'advance';
      return;
    }
    case 'hold': return B.thinkHold(bt, u, foes);
    default: return B.thinkAdvance(bt, u, foes);
  }
};
B.thinkHold = (bt, u, foes) => {
  const p = bt.p;
  const th = foes.filter(e => B.edgeDist(u, e) < 70 * p);
  if (th.length) { const e = U.maxBy(th, e => B.targetScore(bt, u, e)); if (!u.order || u.order.target !== e.id) B.setOrder(bt, u, { type: 'attack', target: e.id }); return; }
  if (u.home && U.dist(u.x, u.y, u.home.x, u.home.y) > 50 * p && !(u.order && u.order.type === 'move')) B.setOrder(bt, u, { type: 'move', x: u.home.x, y: u.home.y, face: u.home.a });
  else if (u.order && u.order.type === 'attack') { const e = bt.units[u.order.target]; if (!e || !B.alive(e) || B.edgeDist(u, e) > 110 * p) u.order = null; }
};
B.thinkAdvance = (bt, u, foes) => {
  const p = bt.p;
  if (!foes.length) {
    // 敵が見えなければ敵陣の方へ
    const ty = u.side === 0 ? bt.H * 0.25 : bt.H * 0.75;
    if (!u.order || u.order.type !== 'move') B.setOrder(bt, u, { type: 'move', x: U.clamp(u.x, 30, bt.W - 30), y: ty });
    return;
  }
  const e = U.maxBy(foes, e => B.targetScore(bt, u, e));
  if (!e) return;
  if (u.order && u.order.type === 'attack' && u.order.target === e.id) return;
  if (u.order && u.order.type === 'attack' && bt.units[u.order.target] && B.alive(bt.units[u.order.target]) && Math.random() < 0.6) return;
  B.setOrder(bt, u, { type: 'attack', target: e.id });
};
B.targetScore = (bt, u, e) => {
  const d = B.dist(u, e);
  let s = 1000 / (d + 40 * bt.p);
  const uc = u.ship ? (u.ut.fast ? 'cav' : 'inf') : u.cls, ec = e.ship ? (e.ut.range ? 'rng' : 'inf') : e.cls;
  if (e.state === 'rout') s *= uc === 'cav' ? 1.2 : 0.4;
  if (u.ship && e.ship && u.ut.fast && (e.ut.mass || 0) > (u.ut.mass || 0) * 1.6 && !e.eng.length) s *= 0.5;   // 速い船は、手の空いた巨艦に正面から挑まない
  if (uc === 'cav' || uc === 'chr') {
    if (ec === 'rng') s *= 2.2;
    if (e.ut.antiCav && !e.eng.length) s *= 0.3;
    if (e.eng.length) s *= 2.0;
    if (e.hq) s *= 1.4;
  } else {
    if (e.cls === 'cav' && u.ut.antiCav) s *= 1.5;
    if (e.eng.length) s *= 1.3;
  }
  if (e.mor < 40) s *= 1.4;
  if (e.state === 'disengage' && bt.sides[u.side].cmd?.st === 'ins') s *= 2;
  if (e.onwall != null) s *= 0.2;
  if (e.cls === 'sie') s *= 1.3;
  return s;
};
B.aiSkill = (bt, u) => {
  if (!u.ld || u.ldFate !== 'ok') return;
  const sd = bt.sides[u.side];
  if (sd.player && (u.ctrl === 'player' && !u.delegate)) return;
  if (sd.player && sd.cmdAll && !u.delegate) return;
  if (sd.player && sd.cmdAll && Math.random() < 0.5) return;
  const sk = B.skillsOf(bt, u);
  if (!sk.length) return;
  for (const k of sk) {
    if (!B.canSkill(bt, u, k) || Math.random() > 0.3) continue;
    if (k === 'kobu' && u.mor < 42) return void B.useSkill(bt, u, k);
    if (k === 'totsu' && u.order && u.order.type === 'attack' && !u.eng.length && B.edgeDist(u, bt.units[u.order.target] || u) < 80 * bt.p) return void B.useSkill(bt, u, k);
    if (k === 'teppeki' && u.eng.length >= 2) return void B.useSkill(bt, u, k);
    if (k === 'seisha' && (u.ut.range || u.horseArch) && B.foes(bt, u.side).some(e => B.edgeDist(u, e) < B.range(bt, u))) return void B.useSkill(bt, u, k);
    if (k === 'shinsoku' && u.order && u.order.type !== 'hold' && u.cls === 'cav') return void B.useSkill(bt, u, k);
    if ((k === 'kakei' || k === 'kakei_t') && bt.time > 20) { const e = B.foes(bt, u.side).find(e => D.TILE[B.groundT(bt, e.x, e.y)].burn >= 0.8 && B.dist(e, u) < 55 * bt.p); if (e) return void B.useSkill(bt, u, k, { x: e.x, y: e.y }); }
    if (k === 'ikki' && u.eng.length && (u.ld.bu || 0) >= 80) return void B.useSkill(bt, u, k, { target: u.eng[0] });
    if (k === 'renya' && B.foes(bt, u.side).some(e => B.edgeDist(u, e) < B.range(bt, u))) return void B.useSkill(bt, u, k);
    if ((k === 'kongou' || k === 'kaiten') && u.mor < 45 && u.eng.length) return void B.useSkill(bt, u, k);
    if ((k === 'gekirin' || k === 'kyouhei' || k === 'tsuki') && u.eng.length && u.mor > 50) return void B.useSkill(bt, u, k);
    if (k === 'senpu' && B.foes(bt, u.side).some(e => B.edgeDist(u, e) < 25 * bt.p)) return void B.useSkill(bt, u, k);
    if (k === 'bouheki' && bt.proj.some(p => p.to === u.id)) return void B.useSkill(bt, u, k);
    if (k === 'kyuuen' && u.dead > u.n0 * 0.15) return void B.useSkill(bt, u, k);
    if ((k === 'konran' || k === 'youdou') && bt.time > 15 && B.foes(bt, u.side).some(e => B.dist(e, u) < 180 * bt.p)) return void B.useSkill(bt, u, k);
    if (k === 'ransha' && B.foes(bt, u.side).filter(e => B.edgeDist(u, e) < B.range(bt, u)).length >= 2) return void B.useSkill(bt, u, k);
    if (k === 'hekireki' && bt.walls) return void B.useSkill(bt, u, k);
    if (k === 'sally' && bt.city && bt.city.side === u.side && u.eng.length) return void B.useSkill(bt, u, k);
    if (k === 'tettai' && u.eng.length && u.mor < 35) return void B.useSkill(bt, u, k);
    if (k === 'shippu' && u.order && u.order.type !== 'hold' && !u.eng.length) return void B.useSkill(bt, u, k);
  }
  // 落石・水計
  if (sd.tactics.includes('rakuseki') && sd.cp >= 22) { const pt = bt.points.find(p => p.type === 'hill' && p.owner === u.side && !p.used && bt.units.some(e => e.side !== u.side && B.alive(e) && U.dist(e.x, e.y, p.x, p.y) < 100 * bt.p)); if (pt && Math.random() < 0.3) B.useSkill(bt, u, 'rakuseki', { point: pt.id }); }
};
// 主人公が直接動かす部隊の自動行動（自衛のみ）
B.thinkPlayerUnit = (bt, u) => {
  if (u.eng.length || u.attach != null) return;
  if (u.order && u.order.type === 'attack') { const e = bt.units[u.order.target]; if (!e || !B.alive(e)) u.order = null; }
};

/* ---------------- 結果 ---------------- */
B.result = (bt) => {
  const out = { winner: bt.winner, reason: bt.reason, sides: [], units: [], meKills: bt.stat.meKills, slainOfficers: [], capturedOfficers: [], slainNames: [], duelWins: bt.stat.duelWins, meFate: bt.meFate, cityTaken: bt.cityTaken, days: bt.day, tx: Object.assign({}, bt.stat.tx || {}), weather: bt.weather, healFx: bt.sides[0].fx ? (bt.sides[0].fx.heal || 0) : 0 };
  for (let s = 0; s < 2; s++) {
    const us = bt.units.filter(u => u.side === s);
    const alive = U.sum(us, u => u.n), routed = U.sum(us, u => u.routed);
    out.sides.push({ start: bt.sides[s].start, alive, routed, dead: Math.max(0, bt.sides[s].start - alive - routed) });
  }
  for (const u of bt.units) {
    out.units.push({ side: u.side, t: u.t, land: u.land || null, sq: u.sq, sqs: u.sqs || null, n0: u.n0, alive: u.n, routed: u.routed, kills: u.kills, ldId: u.ldSnap?.id || null, ldFate: u.ldFate, wu: u.wu ? u.wu.map(w => ({ id: w.id, dead: !!w.dead, hp: w.out ? 15 : (w.hp ?? 100), kills: w.kills || 0 })) : null, me: u.me });
  }
  let offMerit = 0;
  for (const x of bt.stat.slain) {
    if (x.side === 1 && x.id) out.slainOfficers.push(x.id);
    if (x.side === 0 && x.id) out.slainOfficers.push(x.id);
    if (x.byPlayer) { offMerit += x.tier * x.tier * 22 + (x.hist ? 300 : 0); out.slainNames.push(x.n); }
  }
  // 主人公の隊が討った敵将（武名・異名に使う）
  out.slainInfo = bt.stat.slain.filter(x => x.byPlayer && x.side === 1).map(x => ({ n: x.n, hist: !!x.hist, tier: x.tier || 3 }));
  for (const x of bt.stat.captured) { if (x.side === 1 && x.id) out.capturedOfficers.push(x.id); if (x.byPlayer) offMerit += x.tier * x.tier * 18; }
  const ord = bt.spec.role === 'unit' ? (bt.stat.order > bt.stat.disobey * 2 ? 10 * (bt.stat.order > 20 ? 2 : 1) : (bt.stat.meKills > 15 ? 0 : -15)) : 0;
  out.merit = { officers: offMerit, duel: bt.stat.duelMerit || 0, points: bt.stat.points, rearguard: bt.stat.rearguard, cmdKills: bt.sides[0].cmdAll ? bt.stat.cmdKills : 0, order: ord };
  if (bt.naval) out.sunk = bt.stat.sunk.slice();
  return out;
};

/* ---------------- 自動解決（描画なし） ---------------- */
B.simulate = (bt, maxSec = 1800) => {
  let guard = 0;
  B.start(bt);
  while (!bt.ended && guard++ < maxSec * 5) {
    if (bt.paused === 'night') { B.night(bt, { k: 'rest' }); continue; }
    if (bt.paused === 'duelOffer' || bt.paused === 'duel') { const d = bt.duel || bt.duelOffer; const a = bt.units[d.a], b = bt.units[d.b]; bt.paused = null; if (a && b && a.ld && b.ld) B.duelEnd(bt, d, B.duelSim(a.ld, b.ld)); else { bt.duel = bt.duelOffer = null; } continue; }
    if (bt.pendingChallenge) { const c = bt.pendingChallenge; bt.pendingChallenge = null; const a = bt.units[c.a], b = bt.units[c.b]; if (B.canDuel(bt, a, b)) { bt.duelPairs[B.duelKey(a, b)] = 1; B.duelEnd(bt, { a: a.id, b: b.id }, B.duelSim(a.ld, b.ld)); } }
    B.step(bt, 0.2);
  }
  if (!bt.ended) { const s0 = B.strength(bt, 0), s1 = B.strength(bt, 1); B.end(bt, s0 > s1 * 1.3 ? 0 : s1 > s0 * 1.3 ? 1 : -1, '決着つかず'); }
  return B.result(bt);
};
B.autoResolve = (spec) => {
  const sp = Object.assign({}, spec, { units: spec.units.map(u => Object.assign({}, u, { ctrl: 'ai' })) });
  const bt = B.create(sp);
  bt.sides[0].player = false; bt.sides[0].cmdAll = false;
  return B.simulate(bt);
};
