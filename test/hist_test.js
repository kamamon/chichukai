// 長期の通し：史実イベントと後から登場する人物の確認
globalThis.UI = { debate: async () => [-1, 0, 1][Math.floor(Math.random() * 3)], shop: async () => '', organize: async () => '', appoint: async () => '', build: async () => '' };
const M = require('./bundle.js');
const { S, W, A, D, B, HOOK, U, GEO } = M;
HOOK.choose = async (o) => { const ok = o.choices.filter(c => !c.disabled); const c = ok[Math.floor(Math.random() * ok.length)] || o.choices[0]; return c ? c.v : null; };
HOOK.info = async () => {};
HOOK.duel = async () => ({ win: Math.random() < 0.5 });
let battles = 0;
HOOK.battle = async (spec) => { battles++; const bt = B.create(spec); for (const u of bt.units) if (u.ctrl === 'player') { u.ctrl = 'ai'; u.delegate = { mode: 'attack' }; u.role = 'advance'; u.attach = null; } return B.simulate(bt, 600); };
const [rank, country, months] = [process.argv[2] || 'kuns', process.argv[3] || 'rome', +process.argv[4] || 200];
if (process.argv.includes('geo')) GEO.build();
(async () => {
  const t0 = Date.now();
  S.newGame({ country, rank, min: 'chiso', sei: '李', mei: '信', age: 20, stats: { bu: 70, tou: 65, chi: 60, pol: 50, mi: 60 }, traits: ['kobu'], style: 'ins', diff: 1 });
  let errs = 0;
  if (process.argv.includes('nodeath')) M.getG().custom = Object.assign(M.getG().custom || {}, { noDeath: true });
  let hb = 0; const EVM = M.EV; const ohb = EVM.histBattle; EVM.histBattle = async (o) => { hb++; const r = await ohb(o); console.log('histBattle', o.title || o.pid, '->', r, 'battles', battles); return r; };
  for (let m = 0; m < months; m++) {
    const G = M.getG(); if (G.over) break;
    let guard = 0;
    while (G.me.ap > 0 && guard++ < 6) { const cats = A.visibleCats(); const list = A.list.filter(a => cats.includes(a.cat)).filter(a => A.status(a).show && A.status(a).ok && !['shuppei', 'jousou'].includes(a.id)); if (!list.length) break; try { await A.run(U.pick(list)); } catch (e) { errs++; console.error('ACT', e.stack); } }
    try { await W.endMonth(); } catch (e) { errs++; console.error('MONTH', e.stack); break; }
    if (process.argv.includes('trace') && M.getG().month === 1) { const g = M.getG(); console.log(S.dateStr(), Object.values(g.cty).filter(c => c.alive).map(c => c.id + ':' + S.ownedProvs(c.id).length + '/' + Math.round(S.countryTroops(c.id) / 1000) + 'k').join(' ')); }
  }
  const G = M.getG();
  console.log(`${rank} ${country} ${S.dateStr()} errs ${errs} battles ${battles} over ${G.over ? G.over.kind : '-'} ${Date.now() - t0}ms`);
  console.log('chronicle:'); for (const h of G.hist.slice().reverse()) console.log('  ' + h.d + ' ' + h.s);
  const spawned = Object.keys(G.flags.histSpawn || {}); console.log('spawned:', spawned.join(' '));
  const alive = Object.values(G.cty).filter(c => c.alive).map(c => c.id + ':' + S.ownedProvs(c.id).length); console.log('countries', alive.join(' '));
})();
