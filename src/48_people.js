/* =========================================================
   地中海覇道 — people（人間関係・派閥・部下の人生・将の個性・難易度）
   - 恩と怨：将同士の関係 G.rel（a→b の感情、-100〜100）。主人公への感情は従来どおり o.bond
   - 派閥：王家と門閥・宰相派・将軍派。昇進の横槍、讒言の出どころ、弾劾
   - 部下の人生：合戦で育ち、負傷し、引き抜かれ、裏切り、巣立つ。死ねば墓に残る
   - 将の個性（用兵）：猪突・堅実・智謀・騎将・攻城・守城。合戦と遠征の AI に効く
   - 難易度：敵 AI の判断と国力に差をつける
   ========================================================= */
const PPL = {};

/* ---------- 難易度 ---------- */
D.DIFF = [
  { n: '易しい', aiIncome: 0.85, aiMor: -4, aiTr: -5, misjudge: 1.25, planT: 80, harsh: 0.7 },
  { n: '普通',   aiIncome: 1.0,  aiMor: 0,  aiTr: 0,  misjudge: 1.0,  planT: 60, harsh: 1.0 },
  { n: '難しい', aiIncome: 1.2,  aiMor: 5,  aiTr: 6,  misjudge: 0.9,  planT: 45, harsh: 1.35 },
];
PPL.diff = () => D.DIFF[(typeof G !== 'undefined' && G && G.diff != null) ? U.clamp(G.diff, 0, 2) : 1];

/* ---------- 将の個性（用兵） ---------- */
PPL.PERS = {
  bold:    { n: '猪突', d: '猪突猛進の将。早くから攻勢に出て、劣勢でもなかなか退かない。一騎打ちは相手の武力を問わず挑む。', plan: { holdBelow: 0.5, advAbove: 1.2, early: 0.2, pref: ['advance', 'breakthrough'], aggr: 1.25 } },
  steady:  { n: '堅実', d: '備えを固めてから進む将。無理押しはせず、兵を失わない。', plan: { holdBelow: 0.85, advAbove: 1.6, early: 0.5, pref: ['advance', 'hold'], aggr: 0.85 } },
  cunning: { n: '智謀', d: '伏兵・包囲・陣取りを好む将。正面から当たってこない。', plan: { holdBelow: 0.7, advAbove: 1.6, early: 0.4, pref: ['envelop', 'lure', 'seize'], aggr: 1.0 } },
  cavalry: { n: '騎将', d: '騎兵の機動で側面を突く将。守りに回っても騎兵は遊ばせない。', plan: { holdBelow: 0.6, advAbove: 1.4, early: 0.3, pref: ['envelop', 'advance'], aggr: 1.1, cavFlank: true } },
  siege:   { n: '攻城', d: '城攻めの名手。器械を揃え、早くから城壁に取りつく。', plan: { holdBelow: 0.7, advAbove: 1.5, early: 0.35, pref: ['advance', 'envelop'], aggr: 1.05, siegeEarly: true } },
  defend:  { n: '守城', d: '守りに長けた将。城壁や地の利を活かし、敵が疲れるのを待つ。', plan: { holdBelow: 0.9, advAbove: 1.8, early: 0.6, pref: ['hold', 'seize'], aggr: 0.75 } },
};
PPL.persName = (p) => (PPL.PERS[p] || PPL.PERS.steady).n;
// 特性・能力・流儀から、将の用兵を一つ決める（決まったら保存して変えない）
PPL.pers = (o) => {
  if (!o) return 'steady';
  if (o.pers && PPL.PERS[o.pers]) return o.pers;
  const sc = { bold: 0, steady: 0, cunning: 0, cavalry: 0, siege: 0, defend: 0 };
  const fx = {};
  for (const t of (o.tr || [])) { const T = D.TRAITS[t]; if (!T) continue; for (const k in T.fx) fx[k] = (fx[k] || 0) + T.fx[k]; if (T.cat === 'cav') sc.cavalry += 1.5; if (T.cat === 'amb' || T.cat === 'plot') sc.cunning += 1.2; if (T.cat === 'form') sc.steady += 0.6; }
  const has = (k) => (fx[k] || 0) > 0;
  if (has('chg') || has('hero') || has('duel')) sc.bold += 1.5;
  if (has('ambush') || has('stealth') || has('fire') || has('trap')) sc.cunning += 1.5;
  if (has('cav_arch') || has('u_cav') || has('u_harch') || has('cav')) sc.cavalry += 1.5;
  if (has('siege') || has('ladder') || has('ram') || has('wall_atk')) sc.siege += 1.8;
  if (has('siege_def') || has('fort') || has('def') || has('mor_res')) sc.defend += 1.4;
  if (has('train') || has('upkeep') || has('aura') || has('mor')) sc.steady += 1.0;
  const bu = o.bu || 50, tou = o.tou || 50, chi = o.chi || 50;
  if (o.st === 'ins') sc.bold += 1.2; if (o.st === 'chi') sc.cunning += 1.2; if (o.st === 'bal') sc.steady += 0.8;
  if (bu >= tou + 12) sc.bold += 0.8; if (tou >= bu + 12) sc.steady += 0.6; if (chi >= 72) sc.cunning += 0.8; if (tou >= 75 && chi >= 60) sc.defend += 0.5;
  // 同じ名なら同じ結果になるよう、わずかな揺らぎは名から
  const r = U.rng(PORT_hash(o.n || o.id || 'x'));
  for (const k in sc) sc[k] += r() * 0.9;
  let best = 'steady', bv = -1;
  for (const k in sc) if (sc[k] > bv) { bv = sc[k]; best = k; }
  o.pers = best;
  return best;
};
const PORT_hash = (s) => { let h = 2166136261 >>> 0; s = String(s || ''); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
// 遠征 AI の攻め気（将の個性）
PPL.aggrOf = (o) => (PPL.PERS[PPL.pers(o)] || PPL.PERS.steady).plan.aggr;

/* ---------- 恩と怨（将同士の関係） ---------- */
PPL.relKey = (a, b) => `${a}|${b}`;
PPL.rel = (a, b) => (G.rel && G.rel[PPL.relKey(a, b)]) || 0;
PPL.addRel = (a, b, d) => { if (!a || !b || a === b) return; if (!G.rel) G.rel = {}; const k = PPL.relKey(a, b); G.rel[k] = U.clamp((G.rel[k] || 0) + d, -100, 100); if (Math.abs(G.rel[k]) < 1) delete G.rel[k]; };
PPL.addRelBoth = (a, b, d) => { PPL.addRel(a, b, d); PPL.addRel(b, a, d); };
PPL.relLabel = (v) => v >= 60 ? '深い恩義' : v >= 35 ? '恩義' : v >= 15 ? '親しい' : v <= -60 ? '深い怨み' : v <= -35 ? '怨み' : v <= -15 ? '不和' : '';
// o から見た、主人公への感情（bond）を同じ言葉で
PPL.bondLabel = (b) => PPL.relLabel(b);
// 主人公との関係：敵国の将は怨みを持つことがある（討った・敗れた）
PPL.relToMe = (o) => o.bond || 0;
// ある将から見た、関係のある人物の一覧 [{id, v}]
PPL.relsOf = (id) => {
  const out = [];
  if (!G.rel) return out;
  for (const k in G.rel) { const [a, b] = k.split('|'); if (a === id && G.off[b] && G.off[b].alive) out.push({ id: b, v: G.rel[k] }); }
  return out.sort((x, y) => Math.abs(y.v) - Math.abs(x.v));
};
// id に向けられた感情の一覧 [{id: 相手, v}]（相手 → id）
PPL.relsToward = (id) => {
  const out = [];
  if (!G.rel) return out;
  for (const k in G.rel) { const [a, b] = k.split('|'); if (b === id && G.off[a] && G.off[a].alive) out.push({ id: a, v: G.rel[k] }); }
  return out.sort((x, y) => Math.abs(y.v) - Math.abs(x.v));
};
// id に恩義を感じている者・怨みを抱く者
PPL.friendsOf = (id, min = 35) => PPL.relsToward(id).filter(r => r.v >= min).map(r => G.off[r.id]).filter(Boolean);
PPL.foesOf = (id, min = 35) => PPL.relsToward(id).filter(r => r.v <= -min).map(r => G.off[r.id]).filter(Boolean);
// 史実の因縁 [甲, 乙, 甲→乙, 乙→甲]。data/lines.json の histRel に、後から世に出る人物などの因縁を足す
PPL.HIST_REL_MORE = [
  ['ハスドルバル', 'マゴ', 50, 50], ['ハンニバル', 'ハンノ（ボミルカルの子）', 40, 50], ['ハンニバル', 'スキピオ', -20, -20], ['ヒッポクラテス', 'ハンニバル', 40, 40],
  ['ファビウス', 'スキピオ', -30, -35], ['スキピオ', 'マシニッサ', 45, 55], ['ラエリウス', 'マシニッサ', 35, 35], ['スキピオ', 'アエミリウス・パウルス（子）', 30, 30],
  ['スキピオ', 'エンニウス', 40, 50], ['カトー', 'エンニウス', 30, 20], ['カトー', 'ウァレリウス・フラックス', 60, 60], ['カトー', 'スキピオ・ナシカ', -30, -30], ['カトー', 'フラミニヌス', -25, -30],
  ['アエミリウス・パウルス（子）', '小スキピオ', 60, 70], ['小スキピオ', 'ポリュビオス', 70, 70], ['小スキピオ', 'ラエリウス（子）', 70, 70], ['小スキピオ', 'マシニッサ', 40, 50],
  ['フラミニヌス', 'フィロポイメン', -20, -25], ['フラミニヌス', 'フィリッポス五世', -10, -20], ['アエミリウス・パウルス（子）', 'ペルセウス', -20, -30],
  ['フィリッポス五世', 'アラトス', -30, -20], ['フィリッポス五世', 'ペルセウス', 30, 30], ['フィリッポス五世', 'デメトリオス（王子）', 40, 50], ['ペルセウス', 'デメトリオス（王子）', -60, -20], ['フィロポイメン', 'ナビス', -50, -50],
  ['アンティオコス三世', 'ハンニバル', 20, 30], ['アンティオコス三世', 'セレウコス四世', 50, 50], ['アンティオコス三世', 'アンティオコス四世', 40, 40], ['アンティオコス三世', 'クレオパトラ一世', 50, 50],
  ['ヘリオドロス', 'セレウコス四世', -30, 20], ['ポピリウス・ラエナス', 'アンティオコス四世', -30, -40], ['エウメネス二世', 'アンティオコス三世', -30, -30],
  ['プトレマイオス四世', 'アルシノエ三世', 10, 20], ['ソシビオス', 'アルシノエ三世', -30, -30], ['クレオパトラ一世', 'プトレマイオス五世', 50, 40],
  ['ヒエロン二世', 'ゲロン', 60, 60], ['ヒエロニュモス', 'アドラノドロス', 30, 40],
  ['シュファクス', 'ソフォニスバ', 60, 40], ['マシニッサ', 'ソフォニスバ', 50, 30], ['ハスドルバル（ギスコの子）', 'ソフォニスバ', 50, 50], ['マシニッサ', 'ハスドルバル（ギスコの子）', -40, -30],
  ['シュファクス', 'ウェルミナ', 60, 60], ['マシニッサ', 'ミキプサ', 50, 60], ['マシニッサ', 'グルッサ', 50, 60], ['ミキプサ', 'グルッサ', 30, 30],
  // 第一次ポエニ戦争
  ['ハミルカル・バルカ', 'ハンニバル', 80, 90], ['ハミルカル・バルカ', 'ハスドルバル', 70, 80], ['ハミルカル・バルカ', 'マゴ', 70, 80], ['ハミルカル・バルカ', '大ハンノ', -50, -50],
  ['レグルス', 'クサンティッポス', -40, -10], ['ヒエロン二世', 'マニウス・ウァレリウス', 30, 30],
];
PPL.HIST_REL = (() => {
  const base = (typeof DATA_JSON !== 'undefined' && DATA_JSON.lines && DATA_JSON.lines.histRel) || [];   // data/lines.json
  const key = (a, b) => (a < b ? a + '|' + b : b + '|' + a);
  const seen = new Set(base.map(r => key(r[0], r[1])));
  return base.concat(PPL.HIST_REL_MORE.filter(r => !seen.has(key(r[0], r[1]))));
})();
// 王家と門閥：君主の一族と、ローマの古い貴族（パトリキ）の家の者は「王家と門閥」の派閥に入る
PPL.HIST_ROYAL = new Set([
  'ハンニバル', 'ハスドルバル', 'マゴ', 'ハミルカル・バルカ', 'ハンノ（ボミルカルの子）',
  'ヒエロン二世', 'ゲロン', 'ヒエロニュモス', 'アドラノドロス',
  'フィリッポス五世', 'ペルセウス', 'デメトリオス（王子）', 'アンティゴノス二世',
  'アンティオコス三世', 'アカイオス', 'アンティパトロス', 'セレウコス四世', 'アンティオコス四世', 'アンティオコス一世',
  'プトレマイオス四世', 'アルシノエ三世', 'プトレマイオス五世', 'クレオパトラ一世', 'プトレマイオス二世',
  'シュファクス', 'ガイア', 'マシニッサ', 'ウェルミナ', 'ミキプサ', 'グルッサ', 'ソフォニスバ',
  'ファビウス', 'プブリウス・スキピオ', 'グナエウス・スキピオ', 'スキピオ', 'ルキウス・スキピオ', 'スキピオ・ナシカ', '小スキピオ', 'アエミリウス・パウルス', 'アエミリウス・パウルス（子）',
  'アッピウス・クラウディウス', 'クラウディウス・ネロ', 'ウァレリウス・フラックス', 'フラミニヌス', 'トルクァトゥス', 'ラエウィヌス', 'ポストゥミウス', 'マンリウス・ウルソ', 'スルピキウス・ガッルス',
  'アッピウス・カウデクス', 'マニウス・ウァレリウス', 'クラウディウス・プルケル',
]);
PPL.tagRoyal = (o) => { if (o && o.hist && PPL.HIST_ROYAL.has(o.n)) o.royal = true; };
// 後から世に出た史実の人物にも、因縁を結ぶ
PPL.seedHistRel = (o) => {
  if (!G.rel || !o || !o.hist) return;
  for (const [na, nb, ab, ba] of PPL.HIST_REL) {
    if (na !== o.n && nb !== o.n) continue;
    const a = Object.values(G.off).find(x => x.hist && x.alive && x.n === na), b = Object.values(G.off).find(x => x.hist && x.alive && x.n === nb);
    if (a && b) { PPL.addRel(a.id, b.id, ab); PPL.addRel(b.id, a.id, ba); }
  }
};
// 君主の呼び名（ローマなら執政官）
PPL.rt = (c) => (D.RULER_T && D.RULER_T[c]) || '君主';
// はじめの関係を作る（国ごとに、同格のあいだの友誼と対抗心）
PPL.seedRelations = () => {
  if (!G.rel) G.rel = {};
  const r = U.rng((G.seed || 1) ^ 0x5bd1e995);
  for (const c of D.CORDER) {
    const top = S.officersOf(c, o => !o.player && (D.RANKS[o.r]?.tier || 0) >= 5).slice(0, 16);
    for (let i = 0; i < top.length; i++) for (let j = i + 1; j < top.length; j++) {
      const a = top[i], b = top[j], ta = D.RANKS[a.r].tier, tb = D.RANKS[b.r].tier;
      const x = r();
      if (x < 0.12) PPL.addRelBoth(a.id, b.id, 25 + Math.floor(r() * 30));             // 友誼
      else if (x < 0.2 && Math.abs(ta - tb) <= 1 && D.RANKS[a.r].track === D.RANKS[b.r].track) PPL.addRelBoth(a.id, b.id, -(20 + Math.floor(r() * 30)));   // 同格の対抗心
      else if (x < 0.24 && D.RANKS[a.r].track !== D.RANKS[b.r].track) PPL.addRelBoth(a.id, b.id, -(10 + Math.floor(r() * 20)));   // 文と武の反目
    }
  }
  for (const [na, nb, ab, ba] of PPL.HIST_REL) {
    const a = Object.values(G.off).find(o => o.hist && o.alive && o.n === na), b = Object.values(G.off).find(o => o.hist && o.alive && o.n === nb);
    if (a && b) { PPL.addRel(a.id, b.id, ab); PPL.addRel(b.id, a.id, ba); }
  }
};

/* ---------- 派閥 ---------- */
PPL.FAC = { royal: { n: '王家と門閥', d: '君主の一族と古い名門。宮廷と元老院で力を持つ' }, josh: { n: '宰相派', d: '宰相と文官。政と法を握る' }, gen: { n: '将軍派', d: '将軍と武人。軍功で物を言う' } };
PPL.ROYAL_SEI = { carth: 'バルカ', mace: 'アンティゴノス', sele: 'セレウコス', ptol: 'プトレマイオス', syra: 'ヒエロン', numi: 'マッシュリ' };
// 王家の者を補う（各国に、王の一族の将が二人はいるように）
PPL.seedRoyals = () => {
  for (const c of D.CORDER) {
    if (!G.cty[c] || !G.cty[c].alive) continue;
    const sei = PPL.ROYAL_SEI[c]; if (!sei) continue;
    const have = S.officersOf(c, o => o.sei === sei || o.royal).length;
    for (let i = have; i < 2; i++) { const r = i === 0 ? U.pick(['goz', 'sanz', 'shog']) : U.pick(['kenr', 'gunj', 'daij']); const o = S.genOfficer(c, r, { sur: sei }); o.royal = true; o.age = U.ri(24, 46); if (r === 'daij' && !Object.values(G.cty[c].mins || {}).includes(o.id)) { const m = D.MIN_ORDER.find(k => !G.cty[c].mins[k]); if (m) { o.min = m; G.cty[c].mins[m] = o.id; } else o.r = 'gunj'; } }
  }
};
PPL.facOf = (o) => {
  if (!o) return null;
  const cc = G.cty[o.c]; if (!cc) return null;
  if (o.id === cc.ruler) return null;
  if (o.player && G.me.fac) return G.me.fac;
  const ruler = G.off[cc.ruler];
  if (o.royal || (o.sei && (o.sei === PPL.ROYAL_SEI[o.c] || (ruler && ruler.sei === o.sei && ruler.hist === false)))) return 'royal';
  const tr = D.RANKS[o.r]?.track || 'mil';
  return tr === 'mil' ? 'gen' : 'josh';
};
PPL.factions = (c) => {
  const out = {}; for (const k in PPL.FAC) out[k] = { k, n: PPL.FAC[k].n, ids: [], pow: 0, leader: null };
  for (const o of S.officersOf(c)) {
    const f = PPL.facOf(o); if (!f) continue;
    const t = D.RANKS[o.r]?.tier || 1;
    out[f].ids.push(o.id); out[f].pow += t * t;
    if (!out[f].leader || (D.RANKS[out[f].leader.r]?.tier || 0) < t || (!out[f].leader.player && o.player && (D.RANKS[out[f].leader.r]?.tier || 0) === t)) out[f].leader = o;
  }
  const tot = Object.values(out).reduce((s, f) => s + f.pow, 0) || 1;
  for (const k in out) out[k].share = out[k].pow / tot;
  return out;
};
PPL.myFac = () => PPL.facOf(S.myOff());
// 主人公と対立する派閥（いちばん強い、別の派閥）
PPL.rivalFac = () => {
  const my = PPL.myFac(); const fs = PPL.factions(S.myOff().c);
  return Object.values(fs).filter(f => f.k !== my && f.ids.length).sort((a, b) => b.pow - a.pow)[0] || null;
};
// 昇進への横槍：対立派閥が強いと、昇進に待ったがかかることがある（一つの官職につき一度）
PPL.promotionObjection = async (st) => {
  if (!st || st.kind !== 'rank') return false;
  const me = G.me, o = S.myOff();
  if (S.isTop() || S.tier() < 3) return false;
  if (me.facObjected === st.r) return false;
  const my = PPL.myFac(); const fs = PPL.factions(o.c); const rv = PPL.rivalFac();
  if (!rv || !rv.leader || rv.leader.player) return false;
  const p = Math.min(0.45, Math.max(0, rv.share - (fs[my]?.share || 0)) * 0.9 + 0.08) * PPL.diff().harsh;
  if (!U.ch(p)) return false;
  me.facObjected = st.r;
  const L = rv.leader;
  const gold = 400 * S.tier() * S.tier();
  const k = await HOOK.choose({ title: '昇進に横槍', seal: '派閥', who: L, body: `${rv.n}の${L.n}が「${o.n}の昇進は早すぎる」と${PPL.rt(o.c)}に申し立てた。`, choices: [
    { v: 'gift', label: `${L.n}に贈り物をして収める`, sub: `金${U.fmt(gold)}`, disabled: me.gold < gold },
    { v: 'debate', label: `${PPL.rt(o.c)}の前で論じ合う（舌戦）`, sub: '勝てば昇進は通る。負ければ今回は見送り' },
    { v: 'wait', label: '時を待つ', sub: '今回は見送り。角は立たない' },
  ] });
  if (k === 'gift') { me.gold -= gold; L.bond = Math.min(100, (L.bond || 0) + 8); S.log(`${L.n}に金${U.fmt(gold)}を贈り、横槍を収めた。`); return false; }
  if (k === 'debate') {
    const r = await UI.debate(L, '昇進の是非');
    if (r > 0) { L.bond = Math.max(-100, (L.bond || 0) - 12); W.gainMerit(Math.round(6 * S.tier()), `${L.n}を論破`); S.log(`${L.n}を論破し、昇進は認められた。`, 'good'); return false; }
    L.bond = Math.max(-100, (L.bond || 0) - 6); S.log(`${L.n}に言い負かされ、昇進は見送られた。`, 'bad'); me.facDelay = G.turn + 1; return true;
  }
  S.log('昇進は次の機会に持ち越された。'); me.facDelay = G.turn + 1; return true;
};
// 讒言の出どころ：対立派閥で、主人公に良い感情を持たない者
PPL.slanderer = () => {
  const o = S.myOff(); const rv = PPL.rivalFac(); if (!rv) return null;
  const cand = rv.ids.map(id => G.off[id]).filter(x => x && x.alive && !x.player && (x.bond || 0) < 20);
  return U.minBy(cand, x => (x.bond || 0) + Math.random() * 10) || null;
};

/* ---------- 墓（亡き者） ---------- */
PPL.grave = (o, why) => {
  if (!G.graves) G.graves = [];
  const sub = !!(G.me && G.me.army && G.me.army.subs.includes(o.id));
  G.graves.push({ id: o.id, n: o.n, sei: o.sei, c: o.c, r: o.r, why, y: G.year, m: G.month, age: o.age, hist: !!o.hist, sub, bond: Math.round(o.bond || 0), tier: D.RANKS[o.r]?.tier || 1 });
  if (G.graves.length > 300) G.graves.splice(0, G.graves.length - 300);
  if (sub) { S.log(`部下の${o.n}を失った（${why}）。`, 'bad'); for (const id of G.me.army.subs) { const y = G.off[id]; if (y && y.alive) y.bond = Math.max(-100, (y.bond || 0) - 2); } }
  // 友を失った者は、討った者を怨む（戦死のとき）
  if (why === '戦死' && o.lastKiller) for (const f of PPL.friendsOf(o.id, 30)) PPL.addRel(f.id, o.lastKiller, -25);
};

/* ---------- 部下の人生 ---------- */
// 合戦のあと：部下は育ち、絆が動き、深手を負うことがある
PPL.afterBattle = (spec, br, won) => {
  const me = G.me, o = S.myOff();
  const subs = new Set(me.army.subs);
  const seen = new Set();
  for (const u of br.units || []) {
    const id = u.ldId; if (!id || !subs.has(id) || seen.has(id)) continue; seen.add(id);
    const x = G.off[id]; if (!x || !x.alive) continue;
    const lossF = u.n0 ? 1 - (u.alive + u.routed * 0.5) / u.n0 : 0;
    x.xp = (x.xp || 0) + 3 + (won ? 2 : 0) + Math.min(6, (u.kills || 0) / 60);
    if (x.xp >= 24) {
      x.xp -= 24;
      const k = u.cls === 'rng' ? U.pick(['bu', 'tou', 'chi']) : u.cls === 'cav' ? U.pick(['bu', 'bu', 'tou']) : U.pick(['bu', 'tou', 'tou', 'chi']);
      if (x[k] < 95) { x[k] += 1; S.log(`${x.n}の${UI_stat(k)}が1上がった。`, 'good'); }
    }
    x.bond = U.clamp((x.bond || 0) + (won ? 3 : 1) - (lossF > 0.5 ? 3 : 0), -100, 100);
    if (lossF > 0.5 && u.ldFate === 'ok' && U.ch(0.25)) { x.inj = U.ri(1, 3); S.log(`${x.n}は深手を負った（${x.inj}か月）。`, 'bad'); }
    // 共に戦った将は互いに恩を感じる
    for (const id2 of seen) if (id2 !== id) PPL.addRelBoth(id, id2, 2);
  }
  // 駆けつけた友との絆
  for (const nm of spec.friends || []) { const f = Object.values(G.off).find(y => y.alive && y.n === nm); if (f) { f.bond = Math.min(100, (f.bond || 0) + 5); PPL.addRel(f.id, o.id, 4); } }
  // 討った将の友は怨む
  for (const id of br.slainOfficers || []) { const x = G.off[id]; if (x) x.lastKiller = o.id; for (const f of PPL.friendsOf(id, 30)) { PPL.addRel(f.id, o.id, -20); if (f.c !== o.c) f.bond = Math.max(-100, (f.bond || 0) - 15); } }
};
const UI_stat = (k) => ({ bu: '武', tou: '統', chi: '知', pol: '政', mi: '魅' }[k] || k);
// 友の駆けつけ：主人公の合戦に、恩義のある将が兵を率いて加わる
PPL.friendsJoin = (c, o) => {
  const me = G.me, my = S.myOff();
  if (!me || !me.army || o.role === 'watch') return [];
  if (o.kind === 'bandit' || o.kind === 'nomad' || o.kind === 'skirmish') return [];
  const subs = new Set(me.army.subs);
  const cand = PPL.friendsOf(my.id, 40).filter(f => f.alive && f.c === c && !f.player && !subs.has(f.id) && f.id !== me.boss && !f.inj && (D.RANKS[f.r]?.tier || 0) >= 3 && (D.RANKS[f.r]?.track || 'mil') === 'mil');
  const out = [];
  const myN = Math.max(200, S.armyTotal());
  for (const f of U.shuffle(cand).slice(0, 3)) {
    const v = PPL.rel(f.id, my.id);
    if (!U.ch(0.3 + (v >= 70 ? 0.25 : 0))) continue;
    const t = D.RANKS[f.r].tier;
    const n = Math.round(Math.min(myN * 0.4, 300 * t) / 10) * 10;
    if (n < 50) continue;
    out.push({ t: (f.tr || []).some(x => D.TRAITS[x] && D.TRAITS[x].cat === 'cav') ? 'cav' : 'inf', n, tr: 50 + t * 2, wl: 2, al: 2, grp: 'front', ctrl: 'ai', ld: W.snap(f), friend: true });
    if (out.length >= 2) break;
  }
  return out;
};
// 月ごと：負傷の回復、巣立ち
PPL.monthlySubs = async () => {
  const me = G.me, o = S.myOff();
  for (const o2 of Object.values(G.off)) if (o2.inj) { o2.inj--; if (!o2.inj && me.army.subs.includes(o2.id)) S.log(`${o2.n}の傷が癒えた。`); }
  // 巣立ち：主人公と同じ格になった部下は、自分の軍を持つ
  for (const id of me.army.subs.slice()) {
    const x = G.off[id]; if (!x || !x.alive) continue;
    const t = D.RANKS[x.r]?.tier || 1;
    if (t >= S.tier() && S.tier() < 9) {
      me.army.subs = me.army.subs.filter(i => i !== id); if (me.army.dep === id) me.army.dep = null; if (me.army.stg === id) me.army.stg = null;
      for (const s of me.army.sq) if (s.ld === id) s.ld = null;
      x.lord = null; PPL.addRel(x.id, o.id, 40);
      await HOOK.info({ title: '巣立ち', who: x, body: `${x.n}は${D.RANKS[x.r].name}となり、自分の軍を率いることになった。\n「${o.n}殿の恩は忘れません。いつか必ず、お返しします」\n（${x.n}は友として、あなたの合戦に駆けつけることがある）` });
    }
  }
};

/* ---------- 事件（派閥・部下） ---------- */
PPL.events = [
  // 引き抜き：絆の薄い部下が、他の将や他国に誘われる
  { id: 'poach', w: () => { const me = G.me; const c = me.army.subs.map(id => G.off[id]).filter(x => x && x.alive && (x.bond || 0) < 35); return c.length ? 1.6 * PPL.diff().harsh : 0; }, run: async () => {
      const me = G.me, o = S.myOff();
      const cand = me.army.subs.map(id => G.off[id]).filter(x => x && x.alive && (x.bond || 0) < 35);
      const x = U.minBy(cand, y => (y.bond || 0) + Math.random() * 15); if (!x) return;
      const foreign = U.ch(0.4) && D.CORDER.some(c => c !== o.c && G.cty[c].alive);
      const byC = foreign ? U.pick(D.CORDER.filter(c => c !== o.c && G.cty[c].alive)) : null;
      const byO = foreign ? S.bestGeneral(byC) : U.maxBy(S.officersOf(o.c, y => (D.RANKS[y.r]?.tier || 0) >= S.tier() && y.id !== o.id && !y.player), y => (D.RANKS[y.r]?.tier || 0) + Math.random() * 3);
      const who = byO ? byO.n : (byC ? S.cname(byC) : '何者か');
      const gold = 250 * S.tier() * S.tier();
      const k = await HOOK.choose({ title: '引き抜き', seal: '人事', who: x, body: `${foreign ? S.cname(byC) + 'の' : ''}${who}が、部下の${x.n}を厚遇で誘っているらしい。${x.n}の心は揺れている（絆 ${Math.round(x.bond || 0)}）。`, choices: [
        { v: 'talk', label: '腹を割って語る（舌戦）', sub: '勝てば絆が深まる' },
        { v: 'gold', label: `恩賞を与える`, sub: `金${U.fmt(gold)}`, disabled: me.gold < gold },
        { v: 'let', label: '去る者は追わぬ' },
      ] });
      let stay = false;
      if (k === 'talk') { const r = await UI.debate(x, '引き止め'); stay = r > 0; x.bond = U.clamp((x.bond || 0) + (stay ? 18 : -6), -100, 100); }
      else if (k === 'gold') { me.gold -= gold; stay = U.ch(0.8); x.bond = Math.min(100, (x.bond || 0) + 10); }
      if (stay) { S.log(`${x.n}は思いとどまった。`, 'good'); return; }
      me.army.subs = me.army.subs.filter(i => i !== x.id); if (me.army.dep === x.id) me.army.dep = null; if (me.army.stg === x.id) me.army.stg = null;
      for (const s of me.army.sq) if (s.ld === x.id) s.ld = null;
      x.lord = byO && !foreign ? byO.id : null;
      if (foreign) { x.c = byC; x.loc = W.capital(byC) || D.COUNTRIES[byC].cap; x.r = D.RANKS[x.r]?.up || x.r; }
      PPL.addRel(x.id, o.id, k === 'let' ? 10 : -15);
      S.log(`${x.n}は${who}のもとへ去った。`, 'bad');
    } },
  // 裏切り：怨みを抱いた部下が、兵を連れて敵へ走る
  { id: 'betray', w: () => { const me = G.me; const c = me.army.subs.map(id => G.off[id]).filter(x => x && x.alive && (x.bond || 0) <= -10 && (x.loy || 70) < 60); return c.length && D.CORDER.some(c2 => c2 !== S.myOff().c && G.cty[c2].alive && S.atWar(S.myOff().c, c2)) ? 1.2 * PPL.diff().harsh : 0; }, run: async () => {
      const me = G.me, o = S.myOff();
      const cand = me.army.subs.map(id => G.off[id]).filter(x => x && x.alive && (x.bond || 0) <= -10);
      const x = U.minBy(cand, y => (y.bond || 0)); if (!x) return;
      const to = U.pick(D.CORDER.filter(c => c !== o.c && G.cty[c].alive && S.atWar(o.c, c)));
      const sq = me.army.sq.find(s => s.ld === x.id);
      const lostN = sq ? Math.round(sq.n * 0.6) : 0;
      if (sq) { sq.n -= lostN; sq.ld = null; }
      me.army.subs = me.army.subs.filter(i => i !== x.id); if (me.army.dep === x.id) me.army.dep = null; if (me.army.stg === x.id) me.army.stg = null;
      x.lord = null; x.c = to; x.loc = W.capital(to) || D.COUNTRIES[to].cap; x.bond = -60; PPL.addRel(x.id, o.id, -60);
      S.chron(`${o.n}の部下${x.n}、${S.cname(to)}へ寝返る。`);
      await HOOK.info({ title: '裏切り', seal: '凶報', who: x, body: `${x.n}が${lostN ? `兵${U.num(lostN)}を連れて` : ''}${S.cname(to)}へ寝返った！\n「${o.n}には、もう仕えられぬ」\n怨みは深い。いずれ戦場で相まみえるだろう。` });
      W.gainMerit(-Math.round(8 * S.tier()), '部下の裏切り');
    } },
  // 派閥の集まり：同じ派閥の者との絆が深まる。対立派閥からは警戒される
  { id: 'faction_meet', w: () => S.tier() >= 3 && PPL.myFac() ? 1.4 : 0, run: async () => {
      const o = S.myOff(); const fs = PPL.factions(o.c); const my = fs[PPL.myFac()]; if (!my || !my.leader || my.leader.player) return;
      const L = my.leader;
      const k = await HOOK.choose({ title: `${my.n}の集まり`, seal: '派閥', who: L, body: `${L.n}の屋敷で${my.n}の者たちが集まる。「${o.n}も来るがよい」`, choices: [{ v: 1, label: '顔を出す', sub: '派閥の者との絆が深まる' }, { v: 0, label: '遠慮する', sub: '派閥に深入りしない' }] });
      if (!k) { L.bond = Math.max(-100, (L.bond || 0) - 3); return; }
      let n = 0;
      for (const id of my.ids) { const y = G.off[id]; if (y && y.alive && !y.player) { y.bond = Math.min(100, (y.bond || 0) + U.ri(3, 7)); n++; } }
      const rv = PPL.rivalFac(); if (rv) for (const id of rv.ids) { const y = G.off[id]; if (y && y.alive && !y.player && U.ch(0.3)) y.bond = Math.max(-100, (y.bond || 0) - 2); }
      S.log(`${my.n}の集まりに出た。${n}人との絆が深まった。`, 'good');
    } },
  // 部下同士の不和
  { id: 'sub_quarrel', w: () => G.me.army.subs.length >= 2 ? 1.0 : 0, run: async () => {
      const me = G.me; const [a, b] = U.shuffle(me.army.subs.map(id => G.off[id]).filter(x => x && x.alive)).slice(0, 2); if (!a || !b) return;
      const k = await HOOK.choose({ title: '部下の不和', body: `${a.n}と${b.n}が手柄を巡って言い争っている。`, choices: [{ v: 'a', label: `${a.n}の肩を持つ` }, { v: 'b', label: `${b.n}の肩を持つ` }, { v: 'both', label: '両者を叱り、酒を酌み交わさせる', sub: '統率が試される' }] });
      if (k === 'a' || k === 'b') { const w = k === 'a' ? a : b, l = k === 'a' ? b : a; w.bond = Math.min(100, (w.bond || 0) + 8); l.bond = Math.max(-100, (l.bond || 0) - 8); PPL.addRelBoth(a.id, b.id, -15); }
      else { const ok = U.ch(0.4 + S.stat(S.myOff(), 'tou') / 200); if (ok) { PPL.addRelBoth(a.id, b.id, 20); a.bond = Math.min(100, (a.bond || 0) + 4); b.bond = Math.min(100, (b.bond || 0) + 4); S.log(`${a.n}と${b.n}は和解した。`, 'good'); } else { PPL.addRelBoth(a.id, b.id, -10); S.log('二人のわだかまりは解けなかった。'); } }
    } },
  // 友からの便り：恩義のある将が贈り物や情報をくれる
  { id: 'friend_letter', w: () => PPL.friendsOf(S.myOff().id, 40).length ? 1.2 : 0, run: async () => {
      const o = S.myOff(); const f = U.pick(PPL.friendsOf(o.id, 40)); if (!f) return;
      const r = Math.random();
      if (r < 0.4) { const gold = 150 * S.tier() * S.tier(); G.me.gold += gold; await HOOK.info({ title: '友からの便り', who: f, body: `${f.n}から手紙と金${U.fmt(gold)}が届いた。\n「先の恩、忘れてはおらぬ。役立ててくれ」` }); }
      else if (r < 0.7) { const k = U.pick(['bu', 'tou', 'chi', 'pol']); G.me.exp[k] += 30; await HOOK.info({ title: '友からの便り', who: f, body: `${f.n}が自ら学んだ兵法の覚え書きを送ってきた。（${UI_stat(k)}の経験+30）` }); }
      else { W.gainMerit(Math.round(8 * S.tier()), `${f.n}の推挙`); await HOOK.info({ title: '友からの便り', who: f, body: `${f.n}が${PPL.rt(o.c)}の前であなたの働きを褒めたという。功績が上がった。` }); }
      PPL.addRel(f.id, o.id, 2);
    } },
];

// 一つ下の官職
PPL.rankDown = (r) => { for (const k in D.LADDER) { const i = D.LADDER[k].indexOf(r); if (i > 0) return D.LADDER[k][i - 1]; } return r === 'josh' ? 'gyos' : null; };

/* ---------- 行動：弾劾・推挙・派閥 ---------- */
PPL.defineActions = () => {
  if (typeof A === 'undefined' || !A.def) return;
  A.def({ id: 'dangai', cat: 'self', n: '弾劾', ap: 1, d: '対立派閥の者の非を君主の前で論じる。勝てば相手は失脚、負ければこちらが傷つく。', vis: () => S.tier() >= 4 && !S.isTop(), req: () => S.tier() >= 5 ? (PPL.rivalFac() ? true : '対立する派閥がない') : '軍団副将・市の長官・主計官以上',
    run: async () => {
      const me = G.me, o = S.myOff(), cc = S.myCty(); const rv = PPL.rivalFac(); if (!rv) return null;
      const cand = rv.ids.map(id => G.off[id]).filter(x => x && x.alive && !x.player && (D.RANKS[x.r]?.tier || 0) <= S.tier() + 1 && x.id !== cc.ruler).sort((a, b) => (a.bond || 0) - (b.bond || 0)).slice(0, 8);
      if (!cand.length) return '弾劾できる相手がいない。';
      const pick = await HOOK.choose({ title: '弾劾', body: `${rv.n}の誰を弾劾する？　相手の格が高いほど難しい。`, choices: [...cand.map(x => ({ v: x.id, label: `${x.n}（${D.RANKS[x.r]?.name || ''}）`, sub: `絆 ${Math.round(x.bond || 0)}　知${x.chi} 政${x.pol}　${PPL.relLabel(x.bond || 0) || '関心なし'}` })), { v: null, label: 'やめる' }] });
      if (!pick) return null;
      const x = G.off[pick];
      const r = await UI.debate(x, '弾劾');
      const ruler = G.off[cc.ruler];
      if (r > 0) {
        const down = PPL.rankDown(x.r);
        const exiled = !down || U.ch(0.3);
        if (exiled) { x.ret = true; x.loc = null; for (const m in cc.mins) if (cc.mins[m] === x.id) { const n = S.genOfficer(o.c, 'daij'); n.min = m; cc.mins[m] = n.id; } if (cc.josh === x.id) { const n = S.genOfficer(o.c, 'josh'); cc.josh = n.id; } if (cc.gyos === x.id) { const n = S.genOfficer(o.c, 'gyos'); cc.gyos = n.id; } }
        else { x.r = down; if (x.min) { for (const m in cc.mins) if (cc.mins[m] === x.id) delete cc.mins[m]; x.min = null; } }
        x.bond = -70; PPL.addRel(x.id, o.id, -70);
        for (const id of rv.ids) { const y = G.off[id]; if (y && y.alive && !y.player && y.id !== x.id) { y.bond = Math.max(-100, (y.bond || 0) - 10); } }
        const my = PPL.factions(o.c)[PPL.myFac()]; if (my) for (const id of my.ids) { const y = G.off[id]; if (y && y.alive && !y.player) y.bond = Math.min(100, (y.bond || 0) + 6); }
        if (ruler && !ruler.player) ruler.bond = Math.min(100, (ruler.bond || 0) + 4);
        W.gainMerit(Math.round(12 * S.tier()), `${x.n}を弾劾`); me.rec.dangai = (me.rec.dangai || 0) + 1;
        S.chron(`${o.n}、${x.n}を弾劾して${exiled ? '追放' : '降格'}させる。`);
        return `${x.n}の非を暴き、${exiled ? '官を追われた' : D.RANKS[down].name + 'に降格となった'}。${rv.n}はあなたを憎むだろう。`;
      }
      if (ruler && !ruler.player) ruler.bond = Math.max(-100, (ruler.bond || 0) - 12);
      x.bond = Math.max(-100, (x.bond || 0) - 30); PPL.addRel(x.id, o.id, -40);
      me.fame = Math.max(0, (me.fame || 0) - 5);
      W.gainMerit(-Math.round(10 * S.tier()), '弾劾に失敗');
      return `${x.n}に言い負かされた。${PPL.rt(o.c)}の信を損ない、${rv.n}の怨みを買った。`;
    } });
  A.def({ id: 'suisen', cat: 'self', n: '部下の推薦', ap: 1, d: '部下を上の官職に推す。功績を使う。格が追いつけば部下は巣立ち、恩義ある友となる。', vis: () => S.tier() >= 3, req: () => G.me.army.subs.length > 0 ? true : '部下がいない',
    run: async () => {
      const me = G.me, o = S.myOff();
      const cand = me.army.subs.map(id => G.off[id]).filter(x => x && x.alive && D.RANKS[x.r] && D.RANKS[x.r].up && (D.RANKS[D.RANKS[x.r].up]?.tier || 9) <= S.tier());
      if (!cand.length) return '推挙できる部下がいない。';
      const cost = (x) => Math.round(20 * (D.RANKS[x.r]?.tier || 1) * (D.RANKS[x.r]?.tier || 1));
      const pick = await HOOK.choose({ title: '推挙', body: '誰を推す？　功績を使う。', choices: [...cand.map(x => ({ v: x.id, label: `${x.n}（${D.RANKS[x.r].name}→${D.RANKS[D.RANKS[x.r].up].name}）`, sub: `功績${U.num(cost(x))}　絆 ${Math.round(x.bond || 0)}`, disabled: me.merit < cost(x) })), { v: null, label: 'やめる' }] });
      if (!pick) return null;
      const x = G.off[pick]; const cst = cost(x);
      me.merit -= cst; x.r = D.RANKS[x.r].up; x.merit = Math.max(x.merit || 0, D.RANKS[x.r].m || 0);
      x.bond = Math.min(100, (x.bond || 0) + 15); PPL.addRel(x.id, o.id, 15);
      return `${x.n}を${D.RANKS[x.r].name}に推した（功績-${U.num(cst)}）。${x.n}は深く感謝している。`;
    } });
  A.def({ id: 'habatsu', cat: 'self', n: '派閥', ap: 0, d: '国の派閥の力関係を見る。属する派閥を変えることもできる。', vis: () => S.tier() >= 2 && !S.isTop(),
    run: async () => {
      const o = S.myOff(); const fs = PPL.factions(o.c); const my = PPL.myFac();
      const lines = Object.values(fs).map(f => `${f.n}${f.k === my ? '（自分）' : ''}：力 ${Math.round(f.share * 100)}%　${f.leader ? '筆頭 ' + f.leader.n : '－'}　${f.ids.length}人`).join('\n');
      const ch = Object.values(fs).filter(f => f.k !== my).map(f => ({ v: f.k, label: `${f.n}に鞍替えする`, sub: f.leader && !f.leader.player ? `筆頭${f.leader.n}との絆 ${Math.round(f.leader.bond || 0)}（30以上で受け入れられる）` : '', disabled: !(f.leader && !f.leader.player && (f.leader.bond || 0) >= 30) }));
      ch.push({ v: null, label: '閉じる' });
      const k = await HOOK.choose({ title: '派閥', seal: '派閥', body: lines + '\n\n派閥が強いと昇進が通りやすく、弱いと横槍や讒言が増える。', choices: ch });
      if (!k) return null;
      const old = fs[my]; G.me.fac = k;
      if (old) for (const id of old.ids) { const y = G.off[id]; if (y && y.alive && !y.player) y.bond = Math.max(-100, (y.bond || 0) - 12); }
      for (const id of fs[k].ids) { const y = G.off[id]; if (y && y.alive && !y.player) y.bond = Math.min(100, (y.bond || 0) + 5); }
      return `${PPL.FAC[k].n}に鞍替えした。元の派閥の者たちは面白くないようだ。`;
    } });
};

/* ---------- 月ごとの処理・初期化 ---------- */
PPL.init = () => {
  // 新しい物語のはじめ：史実の人物の官職・居場所・王家を整えてから、派閥と因縁を作る
  if (!G.rel) { G.rel = {}; if (typeof EV !== 'undefined' && EV.histInit) { try { EV.histInit(); } catch (e) { console.error(e); } } PPL.seedRoyals(); PPL.seedRelations(); }
  if (!G.graves) G.graves = [];
};
PPL.monthly = async () => {
  if (!G || G.over) return;
  PPL.init();
  await PPL.monthlySubs();
  if (G.over) return;
  // 関係はゆっくり薄れる
  if (G.month === 1 && G.rel) for (const k in G.rel) { G.rel[k] *= 0.93; if (Math.abs(G.rel[k]) < 3) delete G.rel[k]; }
  // 派閥の事件はたまに
  if (U.ch(0.3 * PPL.diff().harsh)) {
    const ev = U.wpick(PPL.events, e => typeof e.w === 'function' ? e.w() : e.w);
    if (ev && (typeof ev.w !== 'function' || ev.w() > 0)) { try { await ev.run(); } catch (e) { console.error(e); } }
  }
};
PPL.defineActions();
