// 史実の合戦イベントを直接呼んで、参戦の流れを確かめる
globalThis.UI = { debate: async () => 0 };
const M = require('./bundle.js');
const { S, W, D, B, HOOK, U, GEO, EV } = M;
GEO.build();
let battles = 0, lastSpec = null;
HOOK.choose = async (o) => { const ok = o.choices.filter(c => !c.disabled); return (ok.find(c => c.v === 1) || ok[0] || o.choices[0]).v; };
HOOK.info = async () => {};
HOOK.duel = async () => ({ win: true });
HOOK.battle = async (spec) => { battles++; lastSpec = spec; const bt = B.create(spec); for (const u of bt.units) if (u.ctrl === 'player') { u.ctrl = 'ai'; u.delegate = { mode: 'attack' }; u.role = 'advance'; u.attach = null; } return B.simulate(bt, 900); };
const cases = [
  ['pingyang234', 'carth', 'shog', -234, 2],
  ['feixia233', 'carth', 'dais', -233, 4],
  ['juxin242', 'carth', 'shog', -242, 4],
  ['lixin225', 'rome', 'shog', -225, 10],
  ['lixin225', 'mace', 'dais', -225, 10],
];
(async () => {
  for (const [id, c, rank, y, m] of cases) {
    S.newGame({ country: c, rank, min: 'chiso', sei: '李', mei: '信', age: 25, stats: { bu: 80, tou: 75, chi: 60, pol: 50, mi: 60 }, traits: ['kobu'], style: 'ins', diff: 1 });
    const G = M.getG(); G.year = y; G.month = m;
    // 史実の人物が生きているように
    const ev = EV.hist.find(e => e.id === id);
    const b0 = battles; const hist0 = G.hist.length;
    try { await ev.run(); } catch (e) { console.log(id, 'ERR', e.stack); continue; }
    const s = lastSpec && battles > b0 ? `${lastSpec.title} kind=${lastSpec.kind} role=${lastSpec.role} theme=${lastSpec.theme} site=${lastSpec.site ? lastSpec.site.town : '-'} units=${lastSpec.units.length}` : 'no battle';
    console.log(`${id} as ${c}/${rank}: battles+${battles - b0} | ${s} | chron: ${G.hist.slice(0, G.hist.length - hist0).map(h => h.s).join(' / ')}`);
    console.log('   log:', G.log.slice(0, 4).map(l => l.s || l).join(' | ').slice(0, 300));
  }
})();
