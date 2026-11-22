// 自作の特性のテスト
globalThis.UI = { debate: async () => 0 };
const store = {}; globalThis.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const M = require('./bundle.js');
const { S, W, D, B, HOOK, U, GEO } = M;
const ok = (c, m) => { if (!c) { console.error('NG', m); process.exitCode = 1; } else console.log('ok', m); };
// 1) 最強
const mx = D.ctrMax();
const T = S.ctrPut(Object.assign(mx, { n: '天下無双' }));
ok(T && T.custom && T.lv === 3 && T.pw > 1000, `max trait registered pw=${T.pw} cost=${T.cost} keys=${Object.keys(T.fx).length}`);
ok(!D.TRAIT_ORDER.includes(T.id) && D.CTR_IDS.includes(T.id), 'custom trait kept out of random pools');
ok(S.traitPool('mil').every(id => !D.TRAITS[id].custom), 'NPC pools have no custom traits');
console.log('desc:', T.d);
// 2) 弱い（短所）
const W1 = S.ctrPut({ id: 'cx_weak1', n: '臆病', fx: { atk: -0.9, def: -0.9, mor: -30, arrow_res: -1 } });
ok(W1.neg && W1.cost < 0, `negative trait cost=${W1.cost}`);
// 3) 主人公に付けて始める
S.newGame({ country: 'carth', rank: 'dais', min: 'chiso', sei: '李', mei: '牧', age: 30, stats: { bu: 80, tou: 90, chi: 80, pol: 50, mi: 60 }, traits: ['kobu', T.id], style: 'bal', diff: 1, mode: 'custom', custom: { gold: 1, food: 1, troops: 1, jue: 0, ap: 0, noDeath: true, noAge: false, hist: true, aggr: 1, train: 0 } });
let G = M.getG();
const o = S.myOff();
ok(G.ctr && G.ctr[T.id], 'G.ctr has the custom trait');
ok(S.stat(o, 'bu') === 150 && S.stat(o, 'tou') === 150, `stats capped at 150 (bu=${S.stat(o, 'bu')})`);
ok(S.apMax() >= 5, `ap with trait: ${S.apMax()}`);
ok(S.traitSkills(o).includes('kyouhei'), 'trait skill available');
// 4) 部下に短所を付けて効果がマイナスに振れすぎない
const sub = G.off[G.me.army.subs[0]];
sub.tr = sub.tr.concat([W1.id, W1.id]);
ok(S.fx(sub, 'atk') === -0.9 && S.fx(sub, 'arrow_res') === -2, `stacked negatives clamped atk=${S.fx(sub, 'atk')} arrow_res=${S.fx(sub, 'arrow_res')}`);
// 5) 合戦：総大将が最強の特性
const pid = S.adj(G.me.loc).find(q => G.prov[q].o !== o.c) || G.me.loc;
const spec = W.buildSpec({ kind: 'field', pid, title: 'T', A: { c: o.c, troops: 30000, cmd: o }, B: { c: 'rome', troops: 30000, cmd: S.bestGeneral('rome') }, me: 'A', role: 'commander' });
const bt = B.create(spec);
for (const u of bt.units) if (u.ctrl === 'player') { u.ctrl = 'ai'; u.delegate = { mode: 'attack' }; u.role = 'advance'; u.attach = null; }
const sideAtk = bt.sides[0].fx.atk || 0;
ok(sideAtk >= 3, `side fx applies to whole army (atk +${sideAtk})`);
const r = B.simulate(bt, 900);
const nan = bt.units.some(u => !Number.isFinite(u.x) || !Number.isFinite(u.y) || !Number.isFinite(u.n));
ok(!nan, 'no NaN in battle');
const s0 = B.strength(bt, 0), s1 = B.strength(bt, 1);
console.log('battle', r.winner, r.reason, 'strength', s0, s1);
ok(r.winner === 0, 'the strongest trait wins an even battle');
// 6) セーブと読み込み（別のブラウザ＝工房が空でも動く）
const json = S.serialize();
for (const k of Object.keys(store)) delete store[k];
delete D.TRAITS[T.id]; D.CTR_IDS.length = 0;
S.load(json); G = M.getG();
ok(D.TRAITS[T.id] && D.TRAITS[T.id].custom, 'trait restored from save');
ok(JSON.parse(store[S.CTR_KEY] || '[]').some(d => d.id === T.id), 'trait copied into the workshop library');
// 7) 直すとゲームにも反映
const d = D.ctrDef(T.id); d.n = '天下無双改'; d.fx = { bu: 10 }; d.side = false; d.sk = null;
S.ctrPut(d);
ok(D.TRAITS[T.id].n === '天下無双改' && G.ctr[T.id].n === '天下無双改' && S.stat(S.myOff(), 'bu') < 150, 'edit applies to the running game');
// 8) 使っている間は消しても登録が残る
ok(S.ctrDelete(T.id) === false && D.TRAITS[T.id], 'in-use trait stays registered after delete');
S.myOff().tr = S.myOff().tr.filter(t => t !== T.id);
ok(S.ctrDelete(T.id) === true && !D.TRAITS[T.id], 'unused trait fully deleted');
// 9) 不正なデータ
ok(D.regCTrait({ id: 'evil', n: 'x', fx: { atk: 1 } }) === null && D.regCTrait({ id: 'cx_a', n: '<b>', fx: { atk: 99, nope: 1, def: NaN } }).fx.atk === 3, 'invalid ids rejected, values clamped, unknown keys dropped');
console.log(process.exitCode ? 'FAILED' : 'ALL OK');
