// 拠点（中都市・小都市・地域）・遠征・出撃部隊の選択・部下の解任
globalThis.UI = { debate: async () => 0, shop: async () => '', organize: async () => '', appoint: async () => '', build: async () => '' };
const M = require('./bundle.js');
const { S, W, A, D, B, HOOK, U, GEO } = M;
let fails = 0;
const ok = (c, msg) => { if (!c) { fails++; console.log('NG', msg); } else console.log('ok', msg); };
let battles = [];
HOOK.choose = async (o) => { const c = o.choices.find(c => !c.disabled) || o.choices[0]; return c ? c.v : null; };
HOOK.info = async () => {};
HOOK.fame = async () => {};
HOOK.duel = async () => ({ win: true });
HOOK.battle = async (spec) => { battles.push(spec); const bt = B.create(spec); for (const u of bt.units) if (u.ctrl === 'player') { u.ctrl = 'ai'; u.delegate = { mode: 'attack' }; u.role = 'advance'; u.attach = null; } return B.simulate(bt, 400); };
const cfg = (rank, country = 'rome') => ({ country, rank, min: 'chiso', sei: '李', mei: '信', age: 20, stats: { bu: 70, tou: 65, chi: 60, pol: 55, mi: 60 }, traits: ['kobu'], style: 'ins', diff: 1 });
(async () => {
  // 1. 拠点ができる
  S.newGame(cfg('shog'));
  let G = M.getG();
  const hs = Object.values(G.hold);
  ok(hs.length > 300 && new Set(hs.map(h => h.id)).size === hs.length, `拠点 ${hs.length}`);
  ok(D.PROVINCES.every(P => { const s = U.sum(S.holdsIn(P.id), h => h.sh); return s > 0.2 && s < 0.7; }), '郡の取り分');
  ok(hs.every(h => h.n && isFinite(h.x) && isFinite(h.y) && h.o === G.prov[h.pid].o), '名・場所・持ち主');
  ok(S.bigName('apulia') === '長子', '大都市の名 ' + S.bigName('apulia'));
  // 2. 拠点を奪うと実りを分ける
  const h1 = S.holdsIn('campania').find(h => h.k === 'mid');
  const before = S.shareOf(G.prov.henei, 'sele');
  W.takeHold(h1, 'rome', 800);
  ok(Math.abs(S.shareOf(G.prov.henei, 'sele') - (before - h1.sh)) < 1e-9 && Math.abs(S.shareOf(G.prov.henei, 'rome') - h1.sh) < 1e-9, '取り分が移る');
  ok(S.garrisonOf('rome') >= 800, '守備兵は秦の兵に数える');
  ok(S.holdDef(h1) > 800, '隣の秦軍が支える ' + S.holdDef(h1));
  const gb = G.cty.sele.gold; W.countryEconomy('sele'); ok(isFinite(G.cty.sele.gold), '経済');
  // 3. 自動の奪い合い
  const h2 = S.holdsIn('campania').find(h => h.k === 'area' && h.o === 'sele');
  const r = W.resolveLocal('rome', h2, G.prov.shangdang, 20000);
  ok(r && h2.o === 'rome', '地域を奪う');
  for (let i = 0; i < 3; i++) W.holdUpkeep();
  ok(h2.o === 'rome' && h2.g > 0, '守備兵が補われる ' + h2.g);
  W.localWarAI(); ok(true, '奪い合いのAIが動く');
  // 4. 遠征（AI同士）：前哨戦・攻城戦で大都市を落とすと、郡の拠点も降る
  S.newGame(cfg('goch', 'syra')); G = M.getG();
  G.prov.henei.troops = 6000; G.prov.shangdang.troops = 120000;
  if (!S.atWar('rome', 'sele')) W.declareWar('rome', 'sele');
  let camp = W.makeCampaign('rome', { src: 'apulia', tgt: 'campania', atk: 90000 });
  let res = await W.runExpedition(camp);
  ok(res.capture && G.prov.henei.o === 'rome', '遠征で大都市を落とす ' + JSON.stringify(res.stages));
  ok(res.stages.length >= 2 && res.stages[0].n === '前哨戦', '前哨戦から始まる');
  ok(S.holdsIn('campania').filter(h => h.o === 'sele').length <= S.holdsIn('campania').filter(h => h.k === 'mid').length, '拠点は降る（中都市が少し残ることがある）');
  // 5. 野戦で主力を殲滅すれば開城
  S.newGame(cfg('goch', 'syra')); G = M.getG();
  G.prov.henei.troops = 40000; G.prov.shangdang.troops = 300000;
  const ar = W.autoResolve, sf = W.sallyForce;
  W.sallyForce = () => 30000;
  W.autoResolve = (a, d, ac, dc, x, y, f) => ({ win: 'atk', atkLoss: Math.round(a * 0.05), defLoss: Math.round(d * 0.9), ratio: 4, slain: [] });
  camp = W.makeCampaign('rome', { src: 'apulia', tgt: 'campania', atk: 200000 });
  res = await W.runExpedition(camp);
  W.autoResolve = ar; W.sallyForce = sf;
  ok(res.capture && res.surrender && !res.stages.some(s => s.n === '攻城戦'), '殲滅して開城（攻城戦なし） ' + JSON.stringify(res.stages));
  // 6. 主人公が率いる遠征（合戦を戦う）
  S.newGame(cfg('dais')); G = M.getG(); battles = [];
  G.prov.henei.troops = 30000;
  if (!S.atWar('rome', 'sele')) W.declareWar('rome', 'sele');
  const src = S.adj('campania').find(q => G.prov[q].o === 'rome');
  G.prov[src].troops = 150000;
  res = await W.launchExpedition('campania', 100000, { lead: true, src });
  ok(battles.length >= 2 && battles.every(b => b.sides[0].player), `主人公の遠征で合戦が続く（${battles.length}戦：${battles.map(b => b.title).join('／')}）`);
  ok(battles[0].ctx.stage === 'gate' && battles[battles.length - 1].ctx.stage !== 'gate', '前哨戦のあとに野戦か攻城戦');
  // 7. 出撃する部隊を選ぶ
  S.newGame(cfg('dais')); G = M.getG();
  const spec = W.buildSpec({ kind: 'field', pid: G.me.loc, title: 'て', A: { c: 'rome', troops: 2000, addMe: true, cmd: S.myOff() }, B: { c: 'carth', troops: 3000 }, me: 'A', role: 'commander' });
  const all = U.sum(spec.units.filter(u => u.side === 0 && u.ctrl === 'player'), u => u.n);
  const pick = W.sortiePick(spec, 'auto');
  const spec2 = W.rebuildSpec(spec, pick);
  const mine2 = U.sum(spec2.units.filter(u => u.side === 0 && u.ctrl === 'player'), u => u.n);
  ok(all >= 100000 && mine2 <= 6500 && mine2 >= 3000, `敵の倍まで：全軍${all} → ${mine2}`);
  ok(spec2.seed === spec.seed && U.sum(spec2.units.filter(u => u.side === 0 && u.ctrl !== 'player'), u => u.n) === U.sum(spec.units.filter(u => u.side === 0 && u.ctrl !== 'player'), u => u.n), '同じ戦場・援軍は同じ');
  const direct = W.sortiePick(spec, 'direct'), gs = W.playerGroups();
  ok(gs.filter(g => g.ld).every(g => direct[g.key] === 0), '直属だけ');
  // 留守の兵は減らない
  const tot0 = S.armyTotal();
  const bt = B.create(spec2); const brr = B.simulate(bt, 300);
  W.applyBattleResult(spec2, brr);
  ok(tot0 - S.armyTotal() <= mine2, `損害は出た兵の中だけ（${tot0 - S.armyTotal()} ≤ ${mine2}）`);
  // 8. 拠点攻略（主人公）
  S.newGame(cfg('senn')); G = M.getG(); battles = [];
  const near = S.adj(G.me.loc).find(q => G.prov[q].o !== 'rome' && S.atWar('rome', G.prov[q].o));
  if (near) {
    G.me.loc = S.adj(near).find(q => G.prov[q].o === 'rome') || G.me.loc;
    const tg = W.playerHoldTargets();
    ok(tg.length > 0 && tg.every(h => S.tier() >= D.HOLD_TIER[h.k]), '攻め取れる拠点 ' + tg.length);
    const a = A.list.find(x => x.id === 'kyoten');
    G.me.ap = 5;
    const area = tg.find(h => h.k === 'area') || tg[0];
    A._preHold = area.id;
    G.prov[area.pid].troops = 2000;
    const msg = await A.run(a);
    ok(battles.length === 1 && typeof msg === 'string', '拠点攻略の合戦 ' + msg);
  } else ok(true, '（隣に敵地がない）');
  // 9. 部下の解任
  S.newGame(cfg('goz')); G = M.getG();
  const sub = G.me.army.subs.find(id => G.me.army.sq.some(s => s.ld === id));
  const n0 = S.armyTotal();
  ok(sub && S.dismissSub(sub) && !G.me.army.subs.includes(sub) && G.me.army.sq.every(s => s.ld !== sub) && S.armyTotal() === n0, '部下を解任すると兵は直属に戻る');
  ok(!G.off[sub].lord && G.off[sub].bond <= -20, '解任された者は恨む');
  // 10. 古いセーブ（v6）を読むと拠点ができる
  S.newGame(cfg('hyak')); G = M.getG();
  delete G.hold; G.v = 6;
  S.load(S.serialize()); G = M.getG();
  ok(G.v >= 7 && Object.keys(G.hold).length > 300, '古いセーブに拠点ができる');
  // 11. 国が滅ぶと、その拠点は郡の持ち主へ
  const hz = S.holdsIn('apulia')[0]; W.takeHold(hz, 'carth', 500);
  W.killCountry('carth', 'rome');
  ok(hz.o === G.prov.shangdang.o, '滅んだ国の拠点は戻る');
  console.log(fails ? `NG ${fails}` : 'ALL OK');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e.stack); process.exit(1); });
