// セーブ互換：旧版（v7）のセーブを読み込んで移行し、数か月遊べること
globalThis.UI = { debate: async () => 1 };
const M = require('./bundle.js');
const { S, W, D, B, HOOK, PPL } = M;
const zlib = require('zlib'), fs = require('fs'), path = require('path');
HOOK.choose = async (o) => { const ok = o.choices.filter(c => !c.disabled); const c = ok[Math.floor(Math.random() * ok.length)] || o.choices[0]; return c ? c.v : null; };
HOOK.info = async () => {}; HOOK.duel = async () => ({ win: Math.random() < 0.5 });
HOOK.battle = async (spec) => { const bt = B.create(spec); for (const u of bt.units) if (u.ctrl === 'player') { u.ctrl = 'ai'; u.delegate = { mode: 'attack' }; u.role = 'advance'; } return B.simulate(bt, 600); };
let fails = 0; const check = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
(async () => {
  for (const f of fs.readdirSync(path.join(__dirname, 'fixtures')).filter(f => f.startsWith('save_') && f.endsWith('.json.gz'))) {
    const json = zlib.gunzipSync(fs.readFileSync(path.join(__dirname, 'fixtures', f))).toString('utf8');
    const g0 = JSON.parse(json);
    console.log(`== ${f}: v${g0.v} ${g0.year}/${g0.month} rank ${g0.me.rank}`);
    S.load(json);
    const G = M.getG();
    check(G.v >= 8, 'migrated to v' + G.v);
    check(G.rel && Object.keys(G.rel).length > 0, 'relations seeded on migrate: ' + Object.keys(G.rel || {}).length);
    check(Array.isArray(G.graves) && G.ach && G.startYear != null && G.scenario, 'new fields present');
    check(typeof PPL.pers(S.myOff()) === 'string', 'personality computable');
    let errs = 0;
    for (let i = 0; i < 6; i++) { try { await W.endMonth(); } catch (e) { errs++; console.log('ERR', e.stack.split('\n').slice(0, 3).join(' | ')); break; } if (G.over) break; }
    check(errs === 0, `played 6 months after load (${S.dateStr()}) over=${G.over && G.over.kind}`);
    const again = JSON.parse(S.serialize()); S.load(again); check(M.getG().v >= 8, 'round-trip save/load');
  }
  console.log(fails ? `FAILS ${fails}` : 'ALL OK'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
