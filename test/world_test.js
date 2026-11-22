// strategic layer smoke test: every rank, random actions, months of play
let battles = 0, battleMs = 0;
globalThis.UI = {
  debate: async () => [-1, 0, 1][Math.floor(Math.random() * 3)],
  shop: async () => '', organize: async () => '', appoint: async () => '', build: async () => '',
};
const M = require('./bundle.js');
const { S, W, A, D, B, HOOK, U } = M;
HOOK.choose = async (o) => { const ok = o.choices.filter(c => !c.disabled); const c = ok[Math.floor(Math.random() * ok.length)] || o.choices[0]; return c ? c.v : null; };
HOOK.info = async () => {};
HOOK.duel = async (o) => ({ win: Math.random() < 0.5 });
HOOK.battle = async (spec) => {
  battles++;
  const t0 = Date.now();
  const bt = B.create(spec);
  // 主人公の部隊はAIに任せる
  for (const u of bt.units) if (u.ctrl === 'player') { u.ctrl = 'ai'; u.delegate = { mode: 'attack' }; u.role = 'advance'; u.attach = null; }
  const r = B.simulate(bt, 900);
  battleMs += Date.now() - t0;
  if (r.units.some(u => !isFinite(u.alive))) throw new Error('NaN in battle');
  return r;
};

const ranks = process.argv[2] ? process.argv[2].split(',') : D.SELECTABLE;
const months = +process.argv[3] || 24;
(async () => {
  const t0 = Date.now();
  for (const rank of ranks) {
    for (const country of ['rome', 'carth', 'mace']) {
      const cfg = { country, rank, min: 'chiso', sei: '李', mei: '信', age: 20, stats: { bu: 70, tou: 65, chi: 60, pol: 50, mi: 60 }, traits: ['kobu', 'renpei'], style: 'ins', diff: 1 };
      if (rank === 'daij') cfg.min = U.pick(D.MIN_ORDER);
      S.newGame(cfg);
      let G = M.getG();
      let acts = 0, errs = 0;
      for (let m = 0; m < months; m++) {
        G = M.getG();
        if (G.over) break;
        // random actions until AP runs out
        let guard = 0;
        while (G.me.ap > 0 && guard++ < 8) {
          const cats = A.visibleCats();
          const list = A.list.filter(a => cats.includes(a.cat)).filter(a => A.status(a).show && A.status(a).ok);
          if (!list.length) break;
          const a = U.pick(list);
          try { const msg = await A.run(a); acts++; if (typeof msg === 'string' && msg.startsWith('エラー：')) { errs++; console.error('ACTION ERR', rank, a.id, msg); } } catch (e) { errs++; console.error('ACTION ERR', rank, a.id, e.stack); }
          if (G.over) break;
        }
        try { await W.endMonth(); } catch (e) { errs++; console.error('MONTH ERR', rank, e.stack); break; }
      }
      G = M.getG();
      const json = S.serialize();
      const bad = [];
      for (const p of Object.values(G.prov)) { for (const k of ['pop', 'agri', 'comm', 'order', 'loyal', 'wall', 'troops']) if (!isFinite(p[k])) bad.push(p.id + '.' + k); }
      for (const c of Object.values(G.cty)) { if (!isFinite(c.gold) || !isFinite(c.food)) bad.push(c.id); }
      if (!isFinite(G.me.gold) || !isFinite(G.me.merit)) bad.push('me');
      console.log(`${rank.padEnd(7)} ${country.padEnd(5)} ${S.dateStr()} rank→${D.RANKS[G.me.rank].name} merit ${G.me.merit} jue ${D.JUE[G.me.jue].n} gold ${U.fmt(G.me.gold)} army ${S.armyTotal()} acts ${acts} errs ${errs} over ${G.over ? G.over.kind : '-'} save ${(json.length / 1024).toFixed(0)}KB ${bad.length ? 'BAD:' + bad.join(',') : ''}`);
    }
  }
  const alive = Object.values(M.getG().cty).filter(c => c.alive).map(c => c.id + ':' + S.ownedProvs(c.id).length);
  console.log('countries', alive.join(' '));
  console.log(`total ${Date.now() - t0}ms, battles ${battles} (${battleMs}ms)`);
})();
