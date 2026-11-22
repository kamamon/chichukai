// 官職の等級・爵の三段・兵の上限・武名と異名・セーブの移行
globalThis.UI = { debate: async () => 0, shop: async () => '', organize: async () => '', appoint: async () => '', build: async () => '' };
const M = require('./bundle.js');
const { S, W, A, D, B, HOOK, U } = M;
let fails = 0;
const ok = (c, msg) => { if (!c) { fails++; console.log('NG', msg); } };
const fameCalls = [], infoCalls = [];
HOOK.choose = async (o) => { const c = o.choices.find(c => !c.disabled) || o.choices[0]; return c ? c.v : null; };
HOOK.info = async (o) => { infoCalls.push(o); };
HOOK.fame = async (o) => { fameCalls.push(o); };
const cfg = (rank, country = 'rome') => ({ country, rank, min: 'chiso', sei: '李', mei: '信', age: 20, stats: { bu: 70, tou: 65, chi: 60, pol: 55, mi: 60 }, traits: ['kobu'], style: 'ins', diff: 1 });
(async () => {
  // 1. 出世の道がつながっている
  for (const tr in D.LADDER) {
    const L = D.LADDER[tr];
    for (let i = 0; i < L.length; i++) {
      const r = L[i], rk = D.RANKS[r];
      ok(rk && rk.track === tr, `${r} track`);
      if (i + 1 < L.length) { ok(rk.up === L[i + 1], `${r}.up → ${L[i + 1]}`); ok(D.RANKS[L[i + 1]].m > rk.m, `${r} m 増える`); }
    }
  }
  ok(D.RANKS.gyos.up === 'josh' && D.RANKS.dgun.up === 'josh' && D.RANKS.dais.up === 'tenka', 'ladder tops');
  for (const r of D.SELECTABLE) ok(D.RANKS[r], 'selectable ' + r);
  ok(!D.SELECTABLE.includes('tenka'), '天下の大将軍は選べない');
  // 2. 昇進は一段ずつ・在任期間が要る
  S.newGame(cfg('goch'));
  let G = M.getG();
  ok(S.rankLabel() === '伍長（三等）', 'start label ' + S.rankLabel());
  G.me.merit = 100000; G.me.rec.wins = 0;
  ok(await W.checkPromotion() === 0, '在任期間が足りないと上がらない');
  G.turn += 2;
  ok(await W.checkPromotion() === 1 && S.rankLabel() === '伍長（二等）', '一段だけ上がる ' + S.rankLabel());
  ok(await W.checkPromotion() === 0, '同じ月にもう一段は上がらない');
  G.turn += 2; await W.checkPromotion(); ok(S.rankLabel() === '伍長（一等）', '一等 ' + S.rankLabel());
  G.turn += 2; await W.checkPromotion(); ok(G.me.rank === 'shic' && G.me.grade === 0, '什長へ ' + S.rankLabel());
  ok(G.me.army.wu.length === 0 && G.me.army.subs.length >= 4, '伍の仲間が部下になる');
  // 将軍は勝利5回が要る
  for (let i = 0; i < 80 && G.me.rank !== 'goz'; i++) { G.turn += 8; await W.checkPromotion(); }
  ok(G.me.rank === 'goz', '五千将まで ' + S.rankLabel());
  for (let i = 0; i < 4; i++) { G.turn += 8; await W.checkPromotion(); }
  ok(G.me.rank === 'goz' && G.me.grade === 2, '五千将（一等）で止まる（勝利が足りない） ' + S.rankLabel());
  ok(S.nextStep().req.some(x => x.k === 'wins' && !x.ok), '勝利の条件が見える');
  G.me.rec.wins = 5; G.turn += 8; await W.checkPromotion();
  ok(G.me.rank === 'shog', '将軍へ ' + S.rankLabel());
  // 3. 将軍の兵は功績で最大十万
  G.me.merit = 24000; ok(S.armyCap() === 20000, 'shog cap at floor ' + S.armyCap());
  G.me.merit = 68000; ok(S.armyCap() === 100000, 'shog cap max ' + S.armyCap());
  G.me.merit = 900000; ok(S.armyCap() === 100000, 'shog cap clamp');
  S.newGame(cfg('shog')); G = M.getG();
  const before = S.armyNominal(); G.me.merit = 68000; W.growArmy(); ok(S.armyNominal() === 100000 && before === 20000, `将軍の兵が増える ${before}→${S.armyNominal()}`);
  // 4. 大将軍は最大五十万。天下の大将軍は武名などが要る
  S.newGame(cfg('dais')); G = M.getG();
  ok(S.armyCap() === 100000, 'dais cap floor ' + S.armyCap());
  G.me.merit = 250000; ok(S.armyCap() === 500000, 'dais cap max ' + S.armyCap());
  W.growArmy(); ok(S.armyNominal() === 500000, 'dais army 50万 ' + S.armyNominal());
  G.me.grade = 2; G.turn += 10; G.me.fame = 999; G.me.rec.wins = 50;
  ok(await W.checkPromotion() === 0, '武名が足りないと天下の大将軍にならない');
  G.me.renown = 2000; fameCalls.length = 0;
  ok(await W.checkPromotion() === 1 && G.me.rank === 'tenka', '天下の大将軍 ' + G.me.rank);
  ok(fameCalls.some(f => f.kind === 'tenka'), '天下の大将軍の演出');
  ok(S.nextStep() === null && S.rankLabel() === '天下の大将軍', '頂点 ' + S.rankLabel());
  // 5. 爵は一か月に一段・官職の格が要る
  S.newGame(cfg('goch')); G = M.getG();
  ok(S.jueLabel() === '公士（下）', 'jue start ' + S.jueLabel());
  W.gainMerit(5000, 'test');
  ok(S.jueLabel() === '公士（中）', '一段だけ ' + S.jueLabel());
  W.gainMerit(10, 'test'); ok(S.jueLabel() === '公士（中）', '同じ月は上がらない');
  for (let i = 0; i < 40; i++) { G.turn++; const st = S.juePromote(); if (!st) break; }
  ok(G.me.jue === 4 && G.me.jueG === 2, '伍長は不更（上）まで ' + S.jueLabel());
  const land = S.jueLand(4, 2); ok(G.me.land.ha >= land.ha, '田が増える');
  // 6. 武名と異名
  S.newGame(cfg('senn')); G = M.getG(); fameCalls.length = 0;
  const spec = { role: 'unit', kind: 'field', title: '長平の戦い', pid: Object.keys(G.prov)[0], sides: [{ player: true, cmdAll: false }, {}], ctx: null };
  const br = { winner: 0, sides: [{ start: 40000 }, { start: 50000 }], meKills: 600, duelWins: 1, slainInfo: [{ n: '趙括', hist: true, tier: 7 }], merit: { rearguard: 0 }, units: [] };
  const pts = W.renownFromBattle(spec, br, true);
  ok(pts > 100, '武名が上がる ' + pts);
  ok(G.me.fameQ.some(f => f.k === 'epithet'), '異名の予約');
  await W.flushFame();
  ok(G.me.epi.length === 1 && S.epithet(), '異名がつく ' + S.epithet());
  ok(fameCalls.some(f => f.kind === 'epithet' && f.lines.length >= 3), '七国の反応');
  ok(S.renownLv() >= 1, '武名の段階 ' + S.renownLv());
  const sp2 = W.buildSpec({ kind: 'field', pid: spec.pid, title: 't', A: { c: 'rome', troops: 2000, cmd: S.myOff() }, B: { c: 'carth', troops: 2000 }, me: 'A', role: 'commander' });
  ok(sp2.sides[0].morale > 0 && sp2.sides[1].morale < 0 && sp2.renown, '武名で士気が変わる');
  ok(W.snap(S.myOff()).xfx.fear > 0, '武名で威圧');
  // 7. セーブの移行（v5 → v6）
  S.newGame(cfg('hyak')); G = M.getG();
  G.me.merit = 2000; G.me.rec.wins = 10;
  for (const k of ['grade', 'stepT', 'jueG', 'jueT', 'renown', 'epi', 'epiSel', 'feats']) delete G.me[k];
  G.v = 5;
  S.load(S.serialize()); G = M.getG();
  ok(G.v >= 6 && G.me.grade === 2 && G.me.renown >= 40 && Array.isArray(G.me.epi) && G.me.jueG != null, `移行 grade ${G.me.grade} renown ${G.me.renown}`);
  // 8. 兵種転換が安い
  ok(A.convCost('lcav') === 24 && A.convCost('inf') === 8, '兵種転換 ' + A.convCost('lcav'));
  // 9. 軍師の道
  S.newGame(cfg('gunri', 'carth')); G = M.getG();
  ok(S.isStaff() && S.isMilLike() && G.me.boss && G.me.gen === G.me.boss, '軍吏の上官');
  ok(W.involvement({ atk: 'carth', def: 'rome', src: G.me.loc, tgt: G.me.loc })?.role === 'unit', '軍吏は将の軍で戦う');
  S.newGame(cfg('gunshi', 'carth')); G = M.getG();
  ok(W.involvement({ atk: 'carth', def: 'rome', src: G.me.loc, tgt: G.me.loc })?.role === 'gunshi', '軍師は総軍師');
  console.log(fails ? `NG ${fails}` : 'ALL OK');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e.stack); process.exit(1); });
