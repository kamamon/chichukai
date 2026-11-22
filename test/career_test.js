// 出世の速さ：主人公が無作為に行動して、何年で何になるか
//   node test/career_test.js RANK COUNTRY YEARS RUNS
globalThis.UI = {
  debate: async () => [-1, 0, 1][Math.floor(Math.random() * 3)],
  shop: async () => '', organize: async () => '', appoint: async () => '', build: async () => '',
};
const M = require('./bundle.js');
const { S, W, A, D, B, HOOK, U } = M;
HOOK.choose = async (o) => { const ok = o.choices.filter(c => !c.disabled); const c = ok[Math.floor(Math.random() * ok.length)] || o.choices[0]; return c ? c.v : null; };
HOOK.info = async () => {};
HOOK.duel = async () => ({ win: Math.random() < 0.6 });
HOOK.battle = async (spec) => {
  const bt = B.create(spec);
  for (const u of bt.units) if (u.ctrl === 'player') { u.ctrl = 'ai'; u.delegate = { mode: 'attack' }; u.role = 'advance'; u.attach = null; }
  return B.simulate(bt, 500);
};
const rank = process.argv[2] || 'goch', country = process.argv[3] || 'rome';
const years = +process.argv[4] || 8, runs = +process.argv[5] || 2;
const rname = (me) => (S.rankLabel ? S.rankLabel() : D.RANKS[me.rank].name);
const jname = (me) => (S.jueLabel ? S.jueLabel() : D.JUE[me.jue].n);
(async () => {
  const t0 = Date.now();
  for (let run = 0; run < runs; run++) {
    S.newGame({ country, rank, min: 'chiso', sei: '李', mei: '信', age: 20, stats: { bu: 70, tou: 65, chi: 60, pol: 55, mi: 60 }, traits: ['kobu'], style: 'ins', diff: 1 });
    let G = M.getG(); G.custom = Object.assign(G.custom || {}, { noDeath: true });
    const tl = []; let last = rname(G.me), lastJ = jname(G.me), errs = 0;
    for (let m = 0; m < years * 12; m++) {
      G = M.getG(); if (G.over) break;
      let guard = 0;
      while (G.me.ap > 0 && guard++ < 8) {
        const cats = A.visibleCats();
        const list = A.list.filter(a => cats.includes(a.cat)).filter(a => A.status(a).show && A.status(a).ok);
        if (!list.length) break;
        try { const msg = await A.run(U.pick(list)); if (typeof msg === 'string' && msg.startsWith('エラー：')) { errs++; console.error(msg); } } catch (e) { errs++; console.error(e.stack); }
        if (G.over) break;
      }
      try { await W.endMonth(); } catch (e) { errs++; console.error(e.stack); break; }
      G = M.getG();
      const rn = rname(G.me);
      if (rn !== last) { tl.push(`${(m + 1) / 12 < 1 ? (m + 1) + 'か月' : ((m + 1) / 12).toFixed(1) + '年'}:${rn}`); last = rn; }
    }
    G = M.getG();
    console.log(`#${run + 1} ${rank}/${country} ${S.dateStr()} 官=${rname(G.me)} 爵=${jname(G.me)} 功=${G.me.merit} 名=${Math.round(G.me.fame)} 武名=${Math.round(G.me.renown || 0)}${S.renownLv ? '(' + D.RENOWN[S.renownLv()].n + ')' : ''} 異名=${(G.me.epi || []).map(x => x.n).join('/')} 兵=${S.armyTotal()} 勝=${G.me.rec.wins} errs=${errs} over=${G.over ? G.over.kind : '-'}`);
    console.log('   ' + tl.join(' → '));
  }
  console.log(`${((Date.now() - t0) / 1000).toFixed(0)}s`);
})();
