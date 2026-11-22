// 全体マップ連動の戦場生成テスト
globalThis.UI = { debate: async () => 0 };
const M = require('./bundle.js');
const { B, D, U, GEO } = M;
GEO.build();
const sym = {}; const T = D.T;
Object.assign(sym, { [T.PLAIN]: '.', [T.DIRT]: ',', [T.FOREST]: 'F', [T.HILL]: 'h', [T.MOUNT]: 'M', [T.RIVER]: '~', [T.FORD]: '=', [T.MARSH]: 'm', [T.ROAD]: '#', [T.WALL]: 'W', [T.GATE]: 'G', [T.CITY]: 'C', [T.PATH]: 'p', [T.FIELD]: '"', [T.PADDY]: ';', [T.VILLAGE]: 'V', [T.STREAM]: 's', [T.GROVE]: 'f', [T.ROCK]: 'r', [T.POND]: 'o', [T.SAND]: ':', [T.BRIDGE]: 'B', [T.GRASS]: "'" });
function spec(pid, kind, n, from) {
  const units = [];
  for (let s = 0; s < 2; s++) { units.push({ side: s, t: 'inf', n, tr: 45, grp: 'front', ctrl: 'ai', ld: { n: 'A' + s, bu: 60, tou: 60, chi: 60, mi: 60, tr: [] } }); units.push({ side: s, t: 'guard', n: Math.max(5, n / 20), tr: 60, grp: 'hq', hq: true, ctrl: 'ai', ld: { n: 'C' + s, bu: 60, tou: 60, chi: 60, mi: 60, tr: [] } }); }
  const seed = 12345;
  const site = GEO.site(pid, { from, field: !from && kind !== 'siege', rng: U.rng(seed) });
  return { kind, pid, theme: kind === 'siege' || kind === 'pass' ? D.PROVINCES.find(p => p.id === pid).t : GEO.siteTheme(site), site, seed, title: 't', role: 'watch', city: kind === 'siege' || kind === 'pass' ? 1 : -1, wall: 60, maxDays: 1, diff: 1,
    sides: [{ c: 'rome', name: '秦軍', cmd: { n: 'C0', tou: 60, chi: 60 } }, { c: 'carth', name: '趙軍', cmd: { n: 'C1', tou: 60, chi: 60 } }], units };
}
const cases = [['carthago', 'field', 3000], ['antiochia', 'field', 20000, 'alexandria'], ['shu', 'field', 1000], ['dai', 'field', 5000], ['nanjun', 'field', 8000], ['syracusae', 'siege', 8000], ['hangu', 'pass', 20000], ['yunzhong', 'field', 500], ['chen', 'field', 30000]];
const args = process.argv.slice(2);
for (const [pid, kind, n, from] of cases) {
  const sp = spec(pid, kind, n, from);
  const t0 = Date.now();
  const bt = B.create(sp);
  const ms = Date.now() - t0;
  const cnt = {}; for (const t of bt.terr) cnt[D.TILE[t].n] = (cnt[D.TILE[t].n] || 0) + 1;
  const fcnt = {}; for (const t of bt.fine.type) fcnt[D.TILE[t].n] = (fcnt[D.TILE[t].n] || 0) + 1;
  console.log(`${pid} ${kind} theme=${sp.theme} W=${Math.round(bt.W)} create=${ms}ms river=${!!bt.feat.river} streams=${bt.feat.streams.length} roads=${bt.feat.roads.length} villages=${bt.feat.villages.map(v => v.n).join('/')} ponds=${bt.feat.ponds.length} rot=${bt.feat.rot.toFixed(2)}`);
  console.log('  nav:', Object.entries(cnt).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + v).join(' '));
  if (args.includes(pid)) {
    for (let r = 0; r < bt.rows; r += 2) { let line = ''; for (let c = 0; c < bt.cols; c++) line += sym[bt.terr[r * bt.cols + c]] || '?'; console.log(line); }
  }
  const res = B.simulate(bt, 900);
  const nan = bt.units.some(u => !isFinite(u.x) || !isFinite(u.y));
  console.log(`  sim winner=${res.winner} ${res.reason} t=${Math.round(bt.time)} NaN=${nan}`);
}
