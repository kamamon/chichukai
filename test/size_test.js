globalThis.UI = { debate: async () => 1, shop: async () => '', organize: async () => '', appoint: async () => '', build: async () => '' };
const M = require('./bundle.js');
const { S, W, A, D, B, HOOK } = M;
const zlib = require('zlib');
HOOK.choose = async (o) => { const ok = o.choices.filter(c => !c.disabled); const c = ok[Math.floor(Math.random() * ok.length)] || o.choices[0]; return c ? c.v : null; };
HOOK.info = async () => {};
HOOK.duel = async () => ({ win: Math.random() < 0.5 });
HOOK.battle = async (spec) => { const bt = B.create(spec); for (const u of bt.units) if (u.ctrl === 'player') { u.ctrl = 'ai'; u.delegate = { mode: 'attack' }; u.role = 'advance'; u.attach = null; } return B.simulate(bt, 600); };
(async () => {
  for (const rank of ['kuns', 'shog', 'goch']) {
    S.newGame({ country: 'rome', rank, min: 'chiso', sei: '李', mei: '信', age: 20, stats: { bu: 70, tou: 65, chi: 60, pol: 50, mi: 60 }, traits: [], style: 'ins', diff: 1 });
    for (let m = 0; m < 120; m++) {
      const G = M.getG(); if (G.over) break;
      for (let k = 0; k < 4 && G.me.ap > 0; k++) {
        const cats = A.visibleCats ? A.visibleCats() : null;
        const L = A.list.filter(a => (!cats || cats.includes(a.cat))).filter(a => { const s = A.status(a); return s.show && s.ok && a.ap > 0; });
        if (!L.length) break;
        const a = L[Math.floor(Math.random() * L.length)];
        try { await A.run(a); } catch (e) { console.log('act err', a.id, e.message); }
      }
      await W.endMonth();
    }
    const json = S.serialize();
    const gz = zlib.gzipSync(Buffer.from(json));
    console.log(rank, 'months', S.dateStr(), 'json', (json.length / 1024).toFixed(0) + 'KB', 'gz+b64', (Math.ceil(gz.length / 3) * 4 / 1024).toFixed(0) + 'KB');
  }
})().catch(e => { console.error(e); process.exit(1); });
