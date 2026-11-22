// headless battle tests
globalThis.UI = { debate: async () => 0 };
const M = require('./bundle.js');
const { B, D, U } = M;

function mkSpec(kind, sizes, opts = {}) {
  const units = [];
  const comps = [opts.compA || { inf: 50, spear: 15, arch: 20, lcav: 15 }, opts.compB || { inf: 50, spear: 15, arch: 20, lcav: 15 }];
  for (let s = 0; s < 2; s++) {
    const total = sizes[s];
    const comp = comps[s];
    const sum = Object.values(comp).reduce((a, b) => a + b, 0);
    const nU = total <= 12 ? 1 : total <= 300 ? 3 : Math.min(18, Math.round(3 + Math.log2(total / 300) * 2.2));
    const cap = Math.ceil(total / nU);
    for (const t in comp) {
      let n = Math.round(total * comp[t] / sum);
      while (n > 0) { const k = n > cap * 1.5 ? cap : n; units.push({ side: s, t, n: k, tr: 45, wl: 1, al: 1, grp: D.UT[t].cls === 'rng' ? 'archer' : D.UT[t].cls === 'cav' ? (Math.random() < 0.5 ? 'left' : 'right') : 'front', ctrl: 'ai', ld: { n: 'X' + s + units.length, sei: 'X', bu: 60, tou: 60, chi: 60, mi: 60, tr: ['kobu'], st: s ? 'chi' : 'ins' } }); n -= k; }
    }
    units.push({ side: s, t: 'guard', n: Math.max(5, Math.round(total * 0.05)), tr: 60, grp: 'hq', hq: true, ctrl: 'ai', ld: { n: 'CMD' + s, sei: 'C', bu: 70, tou: 75, chi: 70, mi: 70, tr: [], st: s ? 'chi' : 'ins' } });
  }
  if (kind === 'siege' || kind === 'pass') {
    for (let i = 0; i < 2; i++) units.push({ side: 0, t: 'ram', n: 30, tr: 40, grp: 'siege', ctrl: 'ai', ld: { n: 'R', bu: 30, tou: 30, chi: 30, mi: 30, tr: [] } });
    units.push({ side: 0, t: 'ladder', n: Math.round(sizes[0] * 0.1), tr: 40, grp: 'siege', ctrl: 'ai', ld: { n: 'L', bu: 40, tou: 40, chi: 30, mi: 30, tr: [] } });
    if (sizes[0] > 10000) units.push({ side: 0, t: 'tower', n: 60, tr: 40, grp: 'siege', ctrl: 'ai', ld: { n: 'T', bu: 30, tou: 30, chi: 30, mi: 30, tr: [] } });
  }
  return {
    kind, theme: opts.theme || 'plain', seed: opts.seed || Math.floor(Math.random() * 1e9), pid: null, title: 'test', role: 'watch',
    city: kind === 'siege' || kind === 'pass' ? 1 : -1, wall: 60, maxDays: opts.days || 2, diff: 1,
    sides: [{ c: 'rome', name: '秦軍', player: false, cmd: { n: 'CMD0', tou: 75, chi: 70, st: 'ins' } }, { c: 'carth', name: '趙軍', player: false, cmd: { n: 'CMD1', tou: 75, chi: 70, st: 'chi' } }],
    units,
  };
}

const cases = [
  ['skirmish 5v5', 'skirmish', [5, 5], {}],
  ['skirmish 100v100', 'skirmish', [100, 100], {}],
  ['field 1000v1000 forest', 'field', [1000, 1000], { theme: 'forest' }],
  ['field 20k v 15k river', 'field', [20000, 15000], { theme: 'river' }],
  ['field 100k v 100k hill', 'field', [100000, 100000], { theme: 'hill' }],
  ['field 500k v 400k plain', 'field', [500000, 400000], { theme: 'plain', days: 3 }],
  ['siege 30k v 12k', 'siege', [30000, 12000], { days: 4 }],
  ['pass 60k v 25k', 'pass', [60000, 25000], { theme: 'pass', days: 4 }],
  ['siege small 3000 v 800', 'siege', [3000, 800], { days: 3 }],
];
for (const [name, kind, sizes, opts] of cases) {
  const spec = mkSpec(kind, sizes, opts);
  const t0 = Date.now();
  const bt = B.create(spec);
  const info = `W=${Math.round(bt.W)} p=${bt.p.toFixed(2)} fp=${bt.fp.toFixed(3)} units=${bt.units.length} cells=${bt.units.reduce((s, u) => s + u.cells.length, 0)}`;
  const t1 = Date.now();
  const res = B.simulate(bt, 2400);
  const t2 = Date.now();
  const nan = bt.units.some(u => !isFinite(u.x) || !isFinite(u.y) || !isFinite(u.n) || u.cells.some(c => !isFinite(c.mor)));
  const s0 = res.sides[0], s1 = res.sides[1];
  console.log(`${name.padEnd(28)} ${info}`);
  console.log(`   create ${t1 - t0}ms sim ${t2 - t1}ms  gameTime=${Math.round(bt.time)}s days=${bt.day} winner=${res.winner} (${res.reason}) NaN=${nan}`);
  console.log(`   side0 start ${s0.start} alive ${s0.alive} routed ${s0.routed} dead ${s0.dead} | side1 start ${s1.start} alive ${s1.alive} routed ${s1.routed} dead ${s1.dead}`);
  if (bt.walls) console.log(`   walls: gates broken ${bt.walls.filter(w => w.kind === 'gate' && w.broken).length}/${bt.walls.filter(w => w.kind === 'gate').length}, captured ${bt.walls.filter(w => w.captured >= 0).length}, cityTaken ${bt.cityTaken}`);
  console.log('   log:', bt.log.slice(0, 5).map(l => l.s).join(' / '));
}
