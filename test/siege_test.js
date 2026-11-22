// 包囲戦：包囲→兵糧攻め・水攻め・坑道・内応・強襲・救援。月をまたいで決着すること
globalThis.UI = { debate: async () => 1 };
const M = require('./bundle.js');
const { S, W, A, D, B, HOOK, U } = M;
let pick = {};
HOOK.choose = async (o) => {
  for (const k in pick) if ((o.title || '').includes(k)) { const c = o.choices.find(c => c.v === pick[k] && !c.disabled); if (c) return c.v; }
  const ok = o.choices.filter(c => !c.disabled); const c = ok[Math.floor(Math.random() * ok.length)] || o.choices[0]; return c ? c.v : null;
};
HOOK.info = async () => {};
HOOK.duel = async () => ({ win: true });
HOOK.battle = async (spec) => { const bt = B.create(spec); for (const u of bt.units) if (u.ctrl === 'player') { u.ctrl = 'ai'; u.delegate = { mode: 'attack' }; u.role = 'advance'; } return B.simulate(bt, 900); };
let fails = 0;
const check = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
(async () => {
  S.newGame({ country: 'rome', rank: 'kuns', min: 'chiso', sei: '嬴', mei: '政', age: 30, stats: { bu: 70, tou: 80, chi: 80, pol: 80, mi: 80 }, traits: ['kobu'], style: 'bal', diff: 1 });
  const G = M.getG();
  // 補給線
  const own = S.ownedProvs('rome')[0];
  check(W.supplyIndex('rome', own.id) === 1, 'supply at home = 1');
  const far = Object.values(G.prov).find(p => p.o === 'syra');
  check(W.supplyIndex('rome', far.id) < 0.6, 'supply far away is low: ' + W.supplyIndex('rome', far.id).toFixed(2));
  // 包囲を始める：趙の隣接郡を狙う
  const tgt = Object.values(G.prov).find(p => p.o === 'carth' && S.adj(p.id).some(q => G.prov[q].o === 'rome'));
  const src = S.adj(tgt.id).find(q => G.prov[q].o === 'rome');
  G.prov[src].troops = 80000; tgt.troops = 15000;
  if (!S.atWar('rome', 'carth')) W.declareWar('rome', 'carth');
  pick = { '前にして': 'besiege', '遠征の軍議': 1 };
  G.month = 3;
  const res = await W.launchExpedition(tgt.id, 40000, { lead: true, src });
  check(res && res.win === 'besiege', 'expedition ends in besiege: ' + JSON.stringify(res && { win: res.win, stages: res.stages }));
  check(W.sieges().length === 1 && G.prov[tgt.id].besieged, 'siege registered');
  const sg = W.sieges()[0];
  console.log('siege', { troops: sg.troops, food: sg.food, fort: W.siegeFortMul(sg).toFixed(2) });
  // 月を進める：待つ → 坑道 → 待つ…；兵糧が尽きるか強襲で落ちるまで
  pick = { '包囲中': 'tunnel', '遠征の軍議': 1 };
  let months = 0;
  while (W.sieges().includes(sg) && months < 10 && !G.over) {
    await W.siegeMonthly(); months++;
    pick = { '包囲中': months < 3 ? 'wait' : (sg.tunnel >= 3 ? 'assault' : 'wait'), '遠征の軍議': 1 };
    console.log(' month', months, 'troops', sg.troops, 'food', sg.food, 'tunnel', sg.tunnel, 'city troops', G.prov[tgt.id].troops, 'owner', G.prov[tgt.id].o);
  }
  check(!W.sieges().includes(sg), 'siege resolved within 10 months (owner now ' + G.prov[tgt.id].o + ')');
  // 内応と水攻め：別の郡で
  const tgt2 = Object.values(G.prov).find(p => p.o !== 'rome' && p.id !== tgt.id && S.atWar('rome', p.o) && S.adj(p.id).some(q => G.prov[q].o === 'rome'));
  if (tgt2) {
    const src2 = S.adj(tgt2.id).find(q => G.prov[q].o === 'rome'); G.prov[src2].troops = 60000; tgt2.troops = 12000;
    pick = { '前にして': 'besiege', '遠征の軍議': 1 };
    const r2 = await W.launchExpedition(tgt2.id, 30000, { lead: true, src: src2 });
    check(r2 && r2.win === 'besiege', 'second siege started');
    const sg2 = W.sieges().find(s => s.tgt === tgt2.id);
    if (sg2) {
      G.me.gold = 1e7;
      pick = { '包囲中': 'insider', '遠征の軍議': 1 };
      let m2 = 0; while (W.sieges().includes(sg2) && m2 < 12 && !G.over) { await W.siegeMonthly(); m2++; }
      check(!W.sieges().includes(sg2), `insider siege resolved in ${m2} months (owner ${G.prov[tgt2.id].o})`);
    }
  }
  // AI の包囲：AI 国同士でも破綻しないこと
  for (let i = 0; i < 24; i++) { await W.endMonth(); if (G.over) break; }
  check(!G.over || G.over.kind === 'unify', 'world runs 24 months with sieges: sieges now ' + W.sieges().length + ' log: ' + G.log.filter(l => /包囲|開城|救援|刈田|水攻め/.test(l.s)).slice(0, 4).map(l => l.s).join(' / '));
  // セーブ互換：G.sieges が無い保存でも動く
  delete G.sieges; await W.siegeMonthly(); check(Array.isArray(G.sieges), 'siegeMonthly tolerates missing G.sieges');
  console.log(fails ? `FAILS ${fails}` : 'ALL OK');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
