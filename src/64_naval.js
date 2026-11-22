/* =========================================================
   地中海覇道 — 海戦（艦隊・衝角・コルウス・海賊）
   陸の兵はそのまま海兵として船に乗り込む。一つの隊は一つの船団、伍の四角は一隻（大軍なら数隻）。
   ・衝角：速く突っ込んだ船は、敵船の横腹や艫を破って沈める（舳先どうしはお互いに傷む）
   ・コルウス：ローマの船は渡し橋を下ろして敵船をつかまえ、軍団兵が乗り移って戦う
   ・浅瀬：重い船は足を取られる（軽い快速船は平気）
   ========================================================= */
const NAV = {};
// 国ごとの艦隊：line 主力艦、fast 速い船、big 櫓のある大型艦、skill 漕ぎ手の腕、str 艦隊の大きさ（迎え撃つ力）
D.NAVY = {
  rome:  { n: 'ローマ艦隊',             line: 'quinq',   fast: 'trireme', big: null,   skill: 0.9,  str: 1.0,  corvus: true },
  carth: { n: 'カルタゴ艦隊',           line: 'quinq',   fast: 'trireme', big: null,   skill: 1.15, str: 0.85 },
  mace:  { n: 'マケドニア艦隊',         line: 'trireme', fast: 'lembos',  big: 'hept', skill: 0.95, str: 0.45 },
  sele:  { n: 'セレウコス朝の艦隊',     line: 'quinq',   fast: 'trireme', big: 'hept', skill: 1.0,  str: 0.6 },
  ptol:  { n: 'プトレマイオス朝の艦隊', line: 'quinq',   fast: 'trireme', big: 'hept', skill: 1.05, str: 0.95 },
  syra:  { n: 'シュラクサイ艦隊',       line: 'quinq',   fast: 'trireme', big: 'hept', skill: 1.05, str: 0.5 },
  numi:  { n: 'ヌミディアの船団',       line: 'trireme', fast: 'lembos',  big: null,   skill: 0.8,  str: 0.12 },
};
D.NAVY_DEF = { n: '艦隊', line: 'quinq', fast: 'trireme', big: null, skill: 0.9, str: 0.35 };
// 海賊（沿岸を荒らす）
D.PIRATES = {
  illyr:  { n: 'イリュリアの海賊',   color: '#4f5d6e', skill: 1.1 },
  cilic:  { n: 'キリキアの海賊',     color: '#6b4e6e', skill: 1.1 },
  cret:   { n: 'クレタの海賊',       color: '#5e6b4a', skill: 1.05 },
  tyrrh:  { n: 'ティレニアの海賊',   color: '#5a4a3a', skill: 1.0 },
  balear: { n: 'バレアレスの海賊',   color: '#6e5a3a', skill: 1.0 },
  aetol:  { n: 'アイトリアの私掠船', color: '#5d6e4f', skill: 1.0 },
  moor:   { n: 'マウリの海賊',       color: '#6e4a3a', skill: 1.0 },
};
// 海に面した州と、そこに出る海賊
NAV.COAST = new Set(('roma etruria campania lucania bruttium tarentum apulia picenum ariminum cisalpina liguria massilia emporiae sardinia corsica '
  + 'lilybaeum agrigentum messana illyria syracusae leontini carthago utica byzacium emporia hippo iol siga mauretania cartnova gades saguntum baleares lusitania '
  + 'pella thessalia chalcidice thracia epirus aetolia euboea athenae corinth achaea sparta antiochia phoenicia cilicia pergamon bithynia '
  + 'alexandria pelusium cyrene cyprus gaza judaea ionia caria lycia rhodos creta').split(' '));
D.PIRATE_AT = {
  illyria: 'illyr', epirus: 'illyr', picenum: 'illyr', apulia: 'illyr', ariminum: 'illyr', tarentum: 'illyr',
  cilicia: 'cilic', lycia: 'cilic', cyprus: 'cilic', rhodos: 'cilic', phoenicia: 'cilic', antiochia: 'cilic',
  creta: 'cret', caria: 'cret', sparta: 'cret', ionia: 'cret', cyrene: 'cret', alexandria: 'cret',
  etruria: 'tyrrh', corsica: 'tyrrh', sardinia: 'tyrrh', liguria: 'tyrrh', roma: 'tyrrh', campania: 'tyrrh', lucania: 'tyrrh', massilia: 'tyrrh',
  baleares: 'balear', emporiae: 'balear', saguntum: 'balear', cartnova: 'balear',
  aetolia: 'aetol', achaea: 'aetol', athenae: 'aetol', euboea: 'aetol', corinth: 'aetol', thessalia: 'aetol',
  mauretania: 'moor', siga: 'moor', iol: 'moor', gades: 'moor', hippo: 'moor',
};
NAV.coastal = (pid) => NAV.COAST.has(pid);
NAV._sea = null;
NAV.seaEdge = (a, b) => {
  if (!NAV._sea) { NAV._sea = new Set(); for (const e of D.EDGES) if (e[2]) { NAV._sea.add(e[0] + '|' + e[1]); NAV._sea.add(e[1] + '|' + e[0]); } }
  return NAV._sea.has(a + '|' + b);
};
NAV.seaName = (pid) => (typeof FLD !== 'undefined' ? FLD.SEAS[FLD.seaOf(pid)].n : '海');
// 海兵としての腕（陸の兵種ごと）
NAV.MARINE = { inf: 1.05, spear: 1.0, heavy: 1.15, phal: 0.95, shield: 1.05, guard: 1.2, warb: 1.05, mount: 1.0, militia: 0.7, ladder: 0.9, arch: 0.85, sling: 0.85, velite: 0.95, xbow: 0.85, lcav: 0.7, hcav: 0.75, cataph: 0.65, harch: 0.7, chariot: 0.6, eleph: 0.5 };
NAV.navyOf = (sd) => {
  if (!sd) return D.NAVY_DEF;
  if (sd.pirate) return Object.assign({}, D.NAVY_DEF, { n: (D.PIRATES[sd.pirate] || {}).n || '海賊', line: 'lembos', fast: 'lembos', big: null, skill: (D.PIRATES[sd.pirate] || {}).skill || 1.05 });
  return D.NAVY[sd.c] || D.NAVY_DEF;
};
// 陸の兵種 → 乗る船
NAV.shipFor = (nv, u) => {
  const L = D.UT[u.t] || D.UT.inf;
  if (u.hq) return nv.big || nv.line;
  if (u.n <= 30) return 'lembos';                         // 小舟
  if (L.range && L.cls !== 'cav') return nv.big || nv.line;  // 射撃兵は櫓のある大型艦に
  if (L.cls === 'cav' || L.cls === 'chr') return nv.fast;     // 騎兵の兵は速い船に
  return nv.line;
};
// 合戦の構成を海戦に（陸の兵種を覚えておき、船に乗せる）
NAV.convert = (spec) => {
  for (const u of spec.units) {
    if (D.UT[u.t] && D.UT[u.t].ship) continue;
    const nv = NAV.navyOf(spec.sides[u.side]);
    u.land = u.t; u.mar = NAV.MARINE[u.t] ?? 0.9;
    if (spec.sides[u.side] && spec.sides[u.side].pirate) u.mar = Math.max(u.mar, 1.0);   // 海賊は船の上の斬り合いに慣れている
    u.t = NAV.shipFor(nv, u);
    const S0 = D.UT[u.t];
    if (u.grp !== 'player' && !u.parentOfMe) u.grp = u.hq ? 'hq' : S0.range ? 'archer' : S0.fast ? (U.ch(0.5) ? 'left' : 'right') : 'front';
  }
  spec.units = spec.units.filter(u => !(D.UT[u.land] && D.UT[u.land].cls === 'sie'));
  spec.naval = true;
  return spec;
};
// 船の数（隊の兵から）
NAV.ships = (t, n) => Math.max(1, Math.round(n / ((D.UT[t] && D.UT[t].crew) || 100)));

/* ---------- 遠征の海戦：海を渡る軍を、守り手の艦隊が迎え撃つ ---------- */
// 迎え撃つ艦隊の海兵の数（0 なら迎え撃たない）
NAV.intercept = (def, atk, troops) => {
  const nd = D.NAVY[def] || D.NAVY_DEF, na = D.NAVY[atk] || D.NAVY_DEF;
  // 冬の海は荒れて、艦隊はあまり出ない
  const winter = typeof W !== 'undefined' && W.isWinter && W.isWinter();
  let p = nd.str * 0.6 * (winter ? 0.35 : 1);
  if (na.str > nd.str * 2) p *= 0.5;
  if (!U.ch(p)) return 0;
  const share = 0.35 + 0.45 * nd.str / (nd.str + na.str);
  return Math.round(U.clamp(troops * share * U.rf(0.7, 1.1), 400, 60000));
};
// AI どうしの海戦：漕ぎ手の腕と船の重さで
NAV.autoResolve = (aT, dT, atk, def, cmdA, cmdD) => {
  const na = D.NAVY[atk] || D.NAVY_DEF, nd = D.NAVY[def] || D.NAVY_DEF;
  const ka = 0.85 + na.skill * 0.15 + (na.corvus ? 0.05 : 0), kd = 0.85 + nd.skill * 0.15 + (nd.corvus ? 0.05 : 0) + 0.05;
  const r = W.autoResolve(Math.round(aT * ka), Math.round(dT * kd), atk, def, cmdA, cmdD, 1.0);
  // 負けた側は船ごと沈む（溺れる）
  const drown = (x) => Math.round(x * 1.25);
  return Object.assign({}, r, { atkLoss: Math.min(aT, r.win === 'atk' ? Math.round(r.atkLoss / ka) : drown(r.atkLoss / ka)), defLoss: Math.min(dT, r.win === 'atk' ? drown(r.defLoss / kd) : Math.round(r.defLoss / kd)) });
};

/* ---------- 海賊討伐 ---------- */
NAV.pirateOffer = (pid, force, tier) => {
  const pk = D.PIRATE_AT[pid] || 'tyrrh', P0 = D.PIRATES[pk];
  const size = tier <= 2 ? U.ri(40, 120) : tier <= 4 ? U.ri(150, 700) : Math.round(Math.max(600, force * U.rf(0.4, 1.0)));
  const ships = Math.max(1, Math.round(size / 40));
  const ally = tier <= 4 ? Math.max(0, Math.round(size * U.rf(0.9, 1.3)) - force) : 0;
  return { id: U.uid(), kind: 'pirate', pid, ec: 'pirate', pirate: pk, foe: size, ally, title: `${S.P[pid].name}沖の海賊討伐`, desc: `${P0.n}の船 約${ships}隻（${U.fmt(size)}人）が沿岸の船と村を襲っている。` };
};
