// 合戦での部隊の出し方：割り振りのとおり・勝手に分けない・兵のいない部下は出ない
globalThis.UI = { debate: async () => 0 };
const M = require('./bundle.js');
const { S, W, D, B, U } = M;
const ok = (c, m) => { if (!c) { console.error('NG', m); process.exitCode = 1; } else console.log('ok', m); };
S.newGame({ country: 'carth', rank: 'shog', min: 'chiso', sei: '李', mei: '牧', age: 30, stats: { bu: 80, tou: 85, chi: 70, pol: 50, mi: 60 }, traits: ['kobu'], style: 'bal', diff: 1 });
const G = M.getG(), A2 = G.me.army, o = S.myOff();
const subs = A2.subs.slice();
// 1) 直属の歩兵2万だけ（部下には兵なし）
A2.sq = [S.newSquad('inf', 20000, { tr: 50 })];
const camp = { id: 'x', atk: o.c, def: 'rome', src: G.me.loc, tgt: S.adj(G.me.loc).find(q => G.prov[q].o !== o.c) || G.me.loc, atkTroops: 60000, defTroops: 50000, atkCmd: o.id, defCmd: S.bestGeneral('rome').id, kind: 'field' };
// 部下を同じ郡の将軍にして、以前なら国軍の部隊を率いて出てきた状況にする
for (const id of subs.slice(0, 3)) { G.off[id].r = 'goz'; G.off[id].loc = G.me.loc; }
const spec = W.expSpec(camp, 'field', { side: 'atk', role: 'commander' }, camp.atkTroops, camp.defTroops, 'field', {}, 'T');
const mine = spec.units.filter(u => u.side === 0 && u.ctrl === 'player');
ok(mine.length === 1 && mine[0].n === 20000 && mine[0].me, `20,000 direct infantry -> one block (${mine.map(u => u.t + ':' + u.n).join(',')})`);
const subLed = spec.units.filter(u => u.ld && subs.includes(u.ld.id));
ok(subLed.length === 0, 'subordinates without troops do not appear');
ok((spec.deputies || []).length === 0, 'no deputies listed for delegation');
const other = spec.units.filter(u => u.side === 0 && u.ctrl === 'ai');
console.log('   allied AI units (other generals):', other.length, other.map(u => u.ld && u.ld.n).slice(0, 4).join(','));
// 2) 直属の国軍歩兵と私兵の歩兵 → 一つの部隊。損害は割合で分ける
A2.sq = [S.newSquad('inf', 15000, { tr: 50 }), S.newSquad('inf', 5000, { tr: 30, pv: true })];
const sp2 = W.buildSpec({ kind: 'field', pid: camp.tgt, title: 'T', A: { c: o.c, troops: 20000, cmd: o }, B: { c: 'rome', troops: 20000, cmd: S.bestGeneral('rome') }, me: 'A', role: 'commander' });
const m2 = sp2.units.filter(u => u.side === 0 && u.ctrl === 'player');
ok(m2.length === 1 && m2[0].n === 20000 && m2[0].sqs && m2[0].sqs.length === 2, 'national + private infantry under me -> one block');
const bt = B.create(sp2);
for (const u of bt.units) if (u.ctrl === 'player') { u.ctrl = 'ai'; u.delegate = { mode: 'attack' }; u.role = 'advance'; u.attach = null; }
const r = B.simulate(bt, 600);
const before = A2.sq.map(s => s.n);
W.applyBattleResult(sp2, r);
const after = A2.sq.map(s => s.n);
const l0 = before[0] - after[0], l1 = before[1] - (after[1] || 0);
console.log('   losses national/private:', l0, l1, 'result', r.winner);
ok(l0 >= 0 && l1 >= 0 && (l0 + l1 === 0 || Math.abs(l0 / Math.max(1, l0 + l1) - 0.75) < 0.05), 'casualties split by share (75% / 25%)');
// 3) 部下に二つの兵種 → 一つ目は部下、二つ目は「○○の配下」
A2.sq = [S.newSquad('inf', 8000, { tr: 50 }), S.newSquad('spear', 3000, { tr: 50, ld: subs[0] }), S.newSquad('arch', 2000, { tr: 50, ld: subs[0] }), S.newSquad('xbow', 1000, { tr: 50 })];
const sp3 = W.buildSpec({ kind: 'field', pid: camp.tgt, title: 'T', A: { c: o.c, troops: 14000, cmd: o }, B: { c: 'rome', troops: 14000, cmd: S.bestGeneral('rome') }, me: 'A', role: 'commander' });
const m3 = sp3.units.filter(u => u.side === 0 && u.ctrl === 'player');
console.log('   units:', m3.map(u => `${u.t}:${u.n}:${u.ld.n}${u.me ? '(me)' : ''}`).join('  '));
ok(m3.length === 4, 'one unit per (leader, type)');
ok(m3.filter(u => u.ld.id === subs[0]).length === 1 && m3.some(u => u.ld.ret && u.ld.n === G.off[subs[0]].n + 'の配下'), "subordinate leads one unit, the other is '…の配下'");
ok(m3.some(u => u.ld.ret && u.ld.n === o.n + 'の直属'), "my second direct type is '…の直属'");
ok(sp3.deputies.length === 1 && sp3.deputies[0].id === subs[0], 'only the subordinate with troops can be delegated to');
const bt3 = B.create(sp3);
ok(B.unitName(bt3, bt3.units.find(u => u.ldSnap && u.ldSnap.ret)) .includes('の'), 'unit name for retainer: ' + B.unitName(bt3, bt3.units.find(u => u.ldSnap && u.ldSnap.ret)));
// 4) 直属がいない → 護衛だけ
A2.sq = [S.newSquad('inf', 8000, { tr: 50, ld: subs[0] })];
const sp4 = W.buildSpec({ kind: 'field', pid: camp.tgt, title: 'T', A: { c: o.c, troops: 8000, cmd: o }, B: { c: 'rome', troops: 8000, cmd: S.bestGeneral('rome') }, me: 'A', role: 'commander' });
const m4 = sp4.units.filter(u => u.side === 0 && u.ctrl === 'player');
ok(m4.length === 2 && m4.some(u => u.me && u.escort && u.n === 20) && m4.some(u => u.ld.id === subs[0] && u.n === 8000), 'no direct troops -> I bring an escort; the subordinate keeps his 8,000');
// 5) 部下が国の遠征の総大将に選ばれない
const pc = W.pickCommander(o.c, G.me.loc);
ok(!pc || !subs.includes(pc.id), 'my subordinates are not picked as national commanders');
console.log(process.exitCode ? 'FAILED' : 'ALL OK');
