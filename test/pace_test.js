// 世界の進み具合（AIだけで何年に各国が滅ぶか）
globalThis.UI = { debate: async () => 0, shop: async () => '', organize: async () => '', appoint: async () => '', build: async () => '' };
const M = require('./bundle.js');
const { S, W, A, D, B, HOOK, U } = M;
HOOK.choose = async (o) => { const ok = o.choices.filter(c => !c.disabled); const c = ok[ok.length - 1] || o.choices[0]; return c ? c.v : null; };
HOOK.info = async () => {};
HOOK.duel = async () => ({ win: true });
HOOK.battle = async (spec) => { const bt = B.create(spec); for (const u of bt.units) if (u.ctrl === 'player') { u.ctrl = 'ai'; u.delegate = { mode: 'attack' }; u.role = 'advance'; u.attach = null; } return B.simulate(bt, 300); };
const country = process.argv[2] || 'syra', years = +process.argv[3] || 25;
(async () => {
  S.newGame({ country, rank: 'goch', min: 'chiso', sei: '李', mei: '信', age: 20, stats: { bu: 70, tou: 65, chi: 60, pol: 50, mi: 60 }, traits: ['kobu'], style: 'ins', diff: 1 });
  const G = M.getG(); G.custom = Object.assign(G.custom || {}, { noDeath: true });
  const fall = {};
  for (let m = 0; m < years * 12; m++) {
    if (G.over) break;
    try { await W.endMonth(); } catch (e) { console.error('MONTH', e.stack); break; }
    const g = M.getG();
    for (const c of D.CORDER) if (!g.cty[c].alive && !fall[c]) fall[c] = -g.year;
    if (g.month === 1 && process.argv.includes('trace')) console.log(S.dateStr(), Object.values(g.cty).filter(c => c.alive).map(c => c.id + ':' + S.ownedProvs(c.id).length + '/' + Math.round(S.countryTroops(c.id) / 1000) + 'k' + (c.weary ? '(' + c.weary.toFixed(2) + ')' : '') + (process.argv.includes('eco') ? '[f' + Math.round(c.food / 1e4) + ' g' + Math.round(c.gold / 1e6) + ' L' + Math.round(U.sum(S.ownedProvs(c.id), p => p.loyal) / Math.max(1, S.ownedProvs(c.id).length)) + ']' : '')).join(' '));
    if (Object.values(g.cty).filter(c => c.alive).length <= 1) break;
  }
  const g = M.getG();
  console.log('fall', D.CORDER.map(c => c + ':' + (fall[c] ? fall[c] : '-')).join(' '), '| end', S.dateStr(), Object.values(g.cty).filter(c => c.alive).map(c => c.id + ':' + S.ownedProvs(c.id).length).join(' '));
})();
