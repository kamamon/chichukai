// 部隊の割り振り・私兵の整理・任せ方のテスト
globalThis.UI = { debate: async () => 0 };
const M = require('./bundle.js');
const { S, W, D, B, HOOK, U, GEO, A } = M;
const assert = (c, m) => { if (!c) { console.error('NG', m); process.exitCode = 1; } else console.log('ok', m); };
HOOK.choose = async (o) => (o.choices.find(c => !c.disabled && c.v != null) || o.choices[0]).v;
S.newGame({ country: 'rome', rank: 'shog', min: 'chiso', sei: '李', mei: '信', age: 25, stats: { bu: 80, tou: 75, chi: 60, pol: 50, mi: 60 }, traits: ['kobu'], style: 'ins', diff: 1 });
let G = M.getG(); const A2 = G.me.army;
console.log('food at start', G.me.food, 'tier', S.tier());
assert(G.me.food === S.startFood(S.tier()), 'start food uses new formula');
const tot0 = S.armyTotal();
const sumMax = () => U.sum(A2.sq.filter(s => !s.pv), s => s.max);
const max0 = sumMax();
console.log('squads', A2.sq.map(s => `${s.t}:${s.n}/${s.max}:${s.ld || '-'}`).join(' '), 'subs', A2.subs.length);
// 1) 直属の隊から副官へ 1234 人
const direct = A2.sq.find(s => !s.ld && s.n > 2000);
const dep = A2.dep;
const moved = S.moveTroops(direct.id, 1234, dep);
assert(moved === 1234, 'moved 1234 to deputy');
assert(S.armyTotal() === tot0, 'total troops preserved');
assert(sumMax() === max0, 'total authorized strength preserved');
const depSq = A2.sq.find(s => s.ld === dep && s.t === direct.t);
assert(depSq && depSq.n >= 1234, 'deputy now has squad of same type');
// 2) 元に戻す（全部）
const back = S.moveTroops(depSq.id, depSq.n, null);
assert(back > 0 && S.armyTotal() === tot0, 'moved back to direct, total preserved');
// 3) 同じ隊長・同じ兵種をまとめる
const k = S.mergeSquads();
const keys = A2.sq.map(s => [s.t, s.pv ? 1 : 0, s.ld || ''].join('|'));
assert(new Set(keys).size === keys.length, `merge left unique squads (${k} merged)`);
assert(S.armyTotal() === tot0, 'merge preserved total');
// 4) 私兵：募集→解散→空の枠が消える
G.me.land.fac.barracks = 3; G.me.gold = 1e6;
const shihei = A.list.find(a => a.id === 'shihei');
HOOK.number = async (o) => 40;
G.me.ap = 5;
const msg = await_(A.run(shihei));
function await_(p) { return p; }
(async () => {
  console.log('shihei:', await msg);
  const pv = A2.sq.filter(s => s.pv);
  assert(pv.length === 1 && pv[0].n === 40 && pv[0].max === 40, 'recruited 40 private troops (max == n)');
  const hh0 = G.me.land.hh;
  const d = S.disband(pv[0].id, 40);
  assert(d === 40 && !A2.sq.some(s => s.pv), 'disbanded all private troops and the empty slot is gone');
  assert(G.me.land.hh === hh0 + 8, 'disbanded soldiers returned to land as households');
  // 5) 合戦で私兵が全滅しても枠が残らない
  HOOK.number = async (o) => 30; G.me.ap = 5;
  await A.run(shihei);
  const p2 = A2.sq.find(s => s.pv); p2.n = 0; S.tidyArmy();
  assert(!A2.sq.some(s => s.pv), 'empty private squad removed by tidy');
  // 6) 任せ方：副官を攻勢に → 合戦で開戦と同時に委任
  const sub = A2.subs.find(id => id !== dep) || dep;
  const s0 = A2.sq.find(s => !s.ld && s.n > 1000);
  S.moveTroops(s0.id, 1000, sub);
  S.setOrder(sub, 'attack');
  assert(A2.orders[sub] === 'attack', 'order stored');
  const o = S.myOff();
  const pid = S.adj(G.me.loc).find(q => G.prov[q].o !== o.c) || G.me.loc;
  const spec = W.buildSpec({ kind: 'field', pid, title: 'T', A: { c: o.c, troops: 25000, cmd: o }, B: { c: 'carth', troops: 20000, cmd: S.bestGeneral('carth') }, me: 'A', role: 'commander' });
  const preN = spec.units.filter(u => u.preDlg).length;
  assert(preN >= 1, `spec has ${preN} pre-delegated units`);
  const bt = B.create(spec);
  assert(!bt.units.some(u => u.delegate), 'not delegated during deployment');
  B.start(bt);
  const del = bt.units.filter(u => u.delegate);
  assert(del.length === preN && del.every(u => u.ctrl === 'ai' && u.delegate.mode === 'attack'), `delegated at start: ${del.map(u => u.delegate.n + '/' + u.delegate.mode + (u.delegate.basic ? '(basic)' : '')).join(',')}`);
  const r = B.simulate(bt, 300);
  assert(r && isFinite(r.winner), 'battle simulates with delegated units');
  W.applyBattleResult(spec, r);
  assert(A2.sq.every(s => s.n > 0 || (!s.pv && s.max > 0)), 'no empty private slots after battle');
  // 7) 自分で指揮に戻す
  S.setOrder(sub, 'self');
  assert(!A2.orders[sub], 'order cleared');
  // 8) 移す先が部下でないなら何もしない
  assert(S.moveTroops(A2.sq[0].id, 10, 'nobody') === 0, 'invalid destination rejected');
  // 9) 古いセーブの読み込み（v4）で兵糧が足され、空の私兵が消える
  const g2 = JSON.parse(S.serialize()); g2.v = 4; g2.me.food = 500; g2.me.army.sq.push({ id: 'x1', t: 'inf', n: 0, max: 120, tr: 30, wl: 1, al: 1, ld: null, xp: 0, pv: true }); delete g2.me.army.orders;
  S.load(JSON.stringify(g2)); G = M.getG();
  assert(G.v >= 5 && G.me.food > 500 && !G.me.army.sq.some(s => s.id === 'x1') && G.me.army.orders, `migrated old save: food ${G.me.food}`);
  console.log(process.exitCode ? 'FAILED' : 'ALL OK');
})();
