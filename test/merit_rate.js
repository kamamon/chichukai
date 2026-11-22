// 立場ごとの功績の伸び（昇進を止めて、無作為に行動したときの1か月あたり）
//   node test/merit_rate.js RANKS(カンマ区切り) YEARS RUNS
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
W.checkPromotion = async () => 0;
const ranks = (process.argv[2] || 'goch').split(','), years = +process.argv[3] || 2, runs = +process.argv[4] || 2;
(async () => {
  for (const rank of ranks) {
    const rates = [];
    for (let run = 0; run < runs; run++) {
      const country = ['rome', 'carth', 'mace', 'sele'][run % 4];
      S.newGame({ country, rank, min: 'chiso', sei: '李', mei: '信', age: 20, stats: { bu: 70, tou: 65, chi: 60, pol: 55, mi: 60 }, traits: ['kobu'], style: 'ins', diff: 1 });
      let G = M.getG(); G.custom = Object.assign(G.custom || {}, { noDeath: true });
      const m0 = G.me.merit; let months = 0;
      for (let m = 0; m < years * 12; m++) {
        G = M.getG(); if (G.over) break;
        let guard = 0;
        while (G.me.ap > 0 && guard++ < 8) {
          const cats = A.visibleCats();
          const list = A.list.filter(a => cats.includes(a.cat)).filter(a => A.status(a).show && A.status(a).ok);
          if (!list.length) break;
          try { await A.run(U.pick(list)); } catch (e) { console.error(e.stack); }
          if (G.over) break;
        }
        try { await W.endMonth(); } catch (e) { console.error(e.stack); break; }
        months++;
        if (M.getG().me.rank !== rank) break;
      }
      G = M.getG();
      rates.push(Math.round((G.me.merit - m0) / Math.max(1, months)));
    }
    console.log(`${rank.padEnd(7)} ${D.RANKS[rank].name}\t功績/月 ${rates.join(' ')}\t平均 ${Math.round(rates.reduce((a, b) => a + b, 0) / rates.length)}`);
  }
})();
