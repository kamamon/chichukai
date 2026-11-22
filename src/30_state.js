/* =========================================================
   地中海覇道 — game state
   ========================================================= */
let G = null;
const S = {};

/* ---------- static lookups ---------- */
S.P = {};      // province static by id
S.ADJ = {};    // adjacency
(function initStatic() {
  for (const p of D.PROVINCES) { S.P[p.id] = p; S.ADJ[p.id] = []; }
  for (const [a, b] of D.EDGES) { S.ADJ[a].push(b); S.ADJ[b].push(a); }
})();

/* ---------- accessors ---------- */
S.me = () => G.me;
S.off = id => G.off[id];
S.myOff = () => G.off[G.me.oid];
S.cty = id => G.cty[id];
S.myCty = () => G.cty[G.off[G.me.oid].c];
S.prov = id => G.prov[id];
S.rank = () => D.RANKS[G.me.rank];
S.tier = () => D.RANKS[G.me.rank].tier;
S.adj = pid => S.ADJ[pid] || [];
S.cname = c => (D.COUNTRIES[c] || (c === 'bandit' ? D.BANDIT : D.NOMAD)).name;
S.ccolor = c => (D.COUNTRIES[c] || (c === 'bandit' ? D.BANDIT : D.NOMAD)).color;
S.dateStr = (y = G.year, m = G.month) => `前${-y}年 ${m}月`;
S.isTop = () => ['kuns', 'josh'].includes(G.me.rank);
S.isMil = () => D.RANKS[G.me.rank].track === 'mil';
S.isCiv = () => D.RANKS[G.me.rank].track === 'civ';
S.isStaff = () => D.RANKS[G.me.rank].track === 'staff';
// 武官か軍師（兵を率いて合戦に出る）
S.isMilLike = () => S.isMil() || S.isStaff();

S.dipKey = (a, b) => a < b ? a + '|' + b : b + '|' + a;
S.dip = (a, b) => {
  const k = S.dipKey(a, b);
  if (!G.dip[k]) G.dip[k] = { rel: 0, st: 'peace', t: 0 };
  return G.dip[k];
};
S.atWar = (a, b) => a !== b && S.dip(a, b).st === 'war';
S.allied = (a, b) => a === b || S.dip(a, b).st === 'ally';
S.ownedProvs = c => Object.values(G.prov).filter(p => p.o === c);
S.countryTroops = c => U.sum(S.ownedProvs(c), p => p.troops) + (G.hold ? S.garrisonOf(c) : 0);
S.countryPop = c => U.sum(S.ownedProvs(c), p => p.pop);
S.countryPower = c => {
  const ps = S.ownedProvs(c); if (!ps.length) return 0;
  const tr = U.sum(ps, p => p.troops) + (G.hold ? S.garrisonOf(c) : 0);
  const gens = Object.values(G.off).filter(o => o.c === c && o.alive && !o.ret && ['dais', 'shog'].includes(o.r));
  const gq = gens.length ? U.avg(gens.slice(0, 6), o => o.tou) : 50;
  return tr * (0.6 + gq / 200);
};
S.border = (c, other) => S.ownedProvs(c).filter(p => S.adj(p.id).some(q => G.prov[q].o === (other || G.prov[q].o) && G.prov[q].o !== c));
S.enemyNeighbors = (pid) => S.adj(pid).filter(q => G.prov[q].o !== G.prov[pid].o && S.atWar(G.prov[q].o, G.prov[pid].o));

/* 実効ステータス（特性・名品・負傷） */
S.STATK = ['bu', 'tou', 'chi', 'pol', 'mi'];
S.stat = (o, k) => {
  let v = o[k] || 0;
  if (o.tr) for (const t of o.tr) { const tr = D.TRAITS[t]; if (tr && tr.fx[k]) v += tr.fx[k]; }
  if (o.id === G?.me?.oid) {
    for (const slot in G.me.eq) { const it = D.ITEMS[G.me.eq[slot]]; if (it && it.eff && it.eff[k]) v += it.eff[k]; if (it && it.fx && it.fx[k]) v += it.fx[k]; }
    if (G.me.inj > 0 && (k === 'bu' || k === 'tou')) v -= 8;
    if (G.me.spouseBonus && G.me.spouseBonus[k]) v += G.me.spouseBonus[k];
  }
  return U.clamp(Math.round(v), 1, 150);
};
/* 特性の効果（効果キーの合計） */
S.fx = (o, k) => {
  if (!o) return 0;
  let v = 0;
  if (o.tr) for (const t of o.tr) { const T = D.TRAITS[t]; if (T && T.fx[k]) v += T.fx[k]; }
  if (o.xfx) { if (o.xfx[k]) v += o.xfx[k]; }
  else if (typeof G !== 'undefined' && G && G.me && o.id === G.me.oid) { const ix = S.itemFx(); if (ix[k]) v += ix[k]; }
  return S.fxClamp(k, v);
};
// 短所を重ねても掛け算が負にならないように
S.fxClamp = (k, v) => { const t = D.FXK[k] && D.FXK[k][1]; if (t === 'p' && v < -0.9) return -0.9; if (t === 'r' && v < -2) return -2; return v; };
S.fxm = (o, k) => 1 + S.fx(o, k);
S.myFx = (k) => S.fx(S.myOff(), k);
// 装備の効果を効果キーに
S.itemFx = () => {
  const out = {};
  if (!G || !G.me) return out;
  for (const slot in G.me.eq) {
    const it = D.ITEMS[G.me.eq[slot]]; if (!it) continue;
    const e = it.eff || {};
    if (e.hp) out.duel_hp = (out.duel_hp || 0) + e.hp;
    if (e.duel) out.duel = (out.duel || 0) + (e.duel - 1);
    if (it.fx) for (const k in it.fx) if (!S.STATK.includes(k)) out[k] = (out[k] || 0) + it.fx[k];
  }
  return out;
};
S.traitSkills = (o) => { const out = []; for (const t of (o && o.tr) || []) { const sk = D.TRAITS[t]?.sk; if (sk && !out.includes(sk)) out.push(sk); } return out; };
S.hasTrait = (o, t) => !!(o && o.tr && o.tr.includes(t));
S.lawOn = (c, l) => (G.cty[c]?.laws || []).includes(l);
S.lawMul = (c, key) => {
  const cc = G.cty[c]; if (!cc) return 1;
  let v = 1;
  for (const l of cc.laws) { const e = D.LAWS[l]?.eff; if (e && e[key] != null) v *= e[key]; }
  return v;
};
S.lawAdd = (c, key) => { let v = 0; const cc = G.cty[c]; if (!cc) return 0; for (const l of cc.laws) { const e = D.LAWS[l]?.eff; if (e && e[key] != null) v += e[key]; } return v; };

/* ---------- 自作の特性（このブラウザに保存し、使ったものはセーブにも写す） ---------- */
S.CTR_KEY = 'chichukai.ctraits.v1';
S.ctrLib = () => { try { const v = JSON.parse(localStorage.getItem(S.CTR_KEY) || '[]'); return Array.isArray(v) ? v.filter(d => d && d.id) : []; } catch (e) { return []; } };
S.ctrStore = (list) => { try { localStorage.setItem(S.CTR_KEY, JSON.stringify(list)); return true; } catch (e) { return false; } };
S.ctrBoot = () => { for (const d of S.ctrLib()) D.regCTrait(d); };
// 作る・直す（このブラウザの工房と、遊んでいるゲームの両方に反映）
S.ctrPut = (def) => {
  const T = D.regCTrait(Object.assign({}, def, { ts: Date.now() }));
  if (!T) return null;
  const list = S.ctrLib().filter(d => d.id !== T.id); list.push(D.ctrDef(T.id)); S.ctrStore(list);
  if (typeof G !== 'undefined' && G) S.ctrSync();
  return T;
};
S.ctrUsers = (id) => (typeof G !== 'undefined' && G ? Object.values(G.off).filter(o => o.alive && (o.tr || []).includes(id)) : []);
S.ctrDelete = (id) => {
  S.ctrStore(S.ctrLib().filter(d => d.id !== id));
  if (S.ctrUsers(id).length) return false;   // 使っている人がいる間は消さずに残す
  delete D.TRAITS[id]; D.CTR_IDS = D.CTR_IDS.filter(x => x !== id);
  return true;
};
S.ctrSync = () => {
  if (typeof G === 'undefined' || !G) return;
  const out = {};
  for (const o of Object.values(G.off)) for (const t of o.tr || []) if (!out[t] && D.TRAITS[t] && D.TRAITS[t].custom) out[t] = D.ctrDef(t);
  G.ctr = out;
};
// セーブに写っている自作の特性を登録する（工房の方が新しければそちらを使う）
S.ctrFromSave = (g) => {
  const lib = S.ctrLib(); let add = false;
  for (const id in g.ctr || {}) {
    const d = g.ctr[id], mine = lib.find(x => x.id === id);
    D.regCTrait(mine && (mine.ts || 0) >= (d.ts || 0) ? mine : d);
    if (!mine) { lib.push(d); add = true; }
  }
  if (add) S.ctrStore(lib);
};

/* ---------- logging ---------- */
S.log = (s, k = 'info') => { G.log.unshift({ t: G.turn, d: S.dateStr(), s, k }); if (G.log.length > 160) G.log.length = 160; };
S.chron = (s) => { G.hist.unshift({ d: S.dateStr(), s }); if (G.hist.length > 120) G.hist.length = 120; };

/* ---------- officers ---------- */
// 名前。sur: 家名（氏族名）を決めて作る、c: 国（その国の人らしい名に）。ローマ人は「名・氏族名」、ほかは名だけ
S.cultOf = (c) => { const w = D.CNAME[c] || D.CNAME.bandit; return U.wpick(Object.keys(w), k => w[k]); };
S.splitName = (n) => { const p = String(n || '').split('・'); return p.length >= 2 ? { mei: p[0], sei: p[p.length - 1] } : { mei: n, sei: n }; };
// 旗や印に書く一文字
S.mark = (o) => String((o && (o.sei || o.n)) || '？').slice(0, 1);
S.fullName = (sei, mei, cul) => (cul === 'latin' && sei && mei) ? mei + '・' + sei : (mei || sei || '');
S.genName = (sur, c, cul) => {
  if (!c) c = (typeof G !== 'undefined' && G && G.me && S.myOff && S.myOff()) ? S.myOff().c : U.pick(D.CORDER);
  if (!cul) {
    // 家名が決まっているなら、その家名の文化に合わせる
    if (sur) cul = Object.keys(D.NAMES).find(k => D.NAMES[k].h.includes(sur)) || S.cultOf(c);
    else cul = S.cultOf(c);
  }
  const L = D.NAMES[cul] || D.NAMES.greek;
  // 史実の人物と同じ名、いま生きている人と同じ名は避ける（何度か引き直す）
  const taken = (n) => S.reservedNames().has(n) || (typeof G !== 'undefined' && G && G.off && S._liveNames && S._liveNames.has(n));
  let sei = sur || U.pick(L.h), mei = U.pick(L.m), n = S.fullName(sei, mei, cul);
  for (let k = 0; k < 12 && taken(n); k++) { if (!sur && k % 2) sei = U.pick(L.h); mei = U.pick(L.m); n = S.fullName(sei, mei, cul); }
  if (S._liveNames) S._liveNames.add(n);
  return { sei, mei, cul, n };
};
// 史実の人物の名（シナリオで出てくる人も）
S._reserved = null;
S.reservedNames = () => {
  if (S._reserved) return S._reserved;
  const set = new Set();
  try {
    for (const r of (DATA_JSON.hist || [])) if (r && r[0]) set.add(String(r[0]));
    for (const sc of (DATA_JSON.scenarios || [])) for (const r of (sc.extra || [])) if (r && r[0]) set.add(String(r[0]));
  } catch (e) {}
  return (S._reserved = set);
};
// 生きている人の名（月ごとに作り直す。名を生むたびに足す）
S.refreshLiveNames = () => { S._liveNames = new Set(); if (typeof G !== 'undefined' && G && G.off) for (const id in G.off) { const o = G.off[id]; if (o && o.alive) S._liveNames.add(o.n); } };
S.newId = () => 'o' + (G.nid++);
/* 特性の抽選 */
S._tpool = {};
S.traitPool = (role) => {
  if (S._tpool[role]) return S._tpool[role];
  const ok = (T) => {
    if (T.uniq) return false;
    if (T.role === 'any') return true;
    if (role === 'top') return T.role === 'top' || T.role === 'civ';
    if (role === 'staff') return T.role === 'mil' || T.cat === 'pol' || T.cat === 'school';
    return T.role === role;
  };
  return (S._tpool[role] = D.TRAIT_ORDER.filter(id => ok(D.TRAITS[id])));
};
S.traitFam = id => id.replace(/\d+$/, '');
S.genTraits = (role, tier, n, have = []) => {
  const pool = S.traitPool(role);
  const out = have.slice();
  const fams = new Set(out.map(S.traitFam));
  let guard = 0;
  while (out.length < have.length + n && guard++ < 80) {
    const t = U.wpick(pool, id => {
      const T = D.TRAITS[id];
      let w = T.w != null ? T.w * 10 : (T.lv === 1 ? 10 : T.lv === 2 ? 4 : 1.1);
      if (T.lv === 3) w *= 0.5 + tier * 0.1;
      if (T.neg) w *= 0.55;
      if (T.cat === 'pers' || T.cat === 'orig') w *= 0.5;
      if (T.cat === 'king' && role !== 'top') w = 0;
      return w;
    });
    if (!t || out.includes(t) || fams.has(S.traitFam(t))) continue;
    const cat = D.TRAITS[t].cat;
    if ((cat === 'pers' || cat === 'orig' || cat === 'school') && out.some(x => D.TRAITS[x]?.cat === cat)) continue;
    out.push(t); fams.add(S.traitFam(t));
  }
  return out;
};
/* 戦術の抽選（武将・軍師は戦術を知っている） */
S.genTactics = (o, n) => {
  const pool = D.TACTIC_ORDER.filter(t => D.tacticReqOk(t, o));
  if (n == null) n = U.clamp(Math.floor((o.chi - 22) / 13) + (o.st === 'chi' ? 1 : 0) + (D.RANKS[o.r]?.tier >= 7 ? 1 : 0), 0, 9);
  const out = [];
  for (const t of U.shuffle(pool.slice())) { if (out.length >= n) break; const T = D.TACTICS[t]; if ((T.cat === 'siegeA' || T.cat === 'siegeD') && out.filter(x => D.TACTICS[x].cat === T.cat).length >= 2) continue; out.push(t); }
  return out;
};
S.roleOf = (r) => { const rk = D.RANKS[r]; if (!rk) return 'mil'; return rk.track; };
// 官職ティアに応じた能力の目安
S.genOfficer = (c, r, opt = {}) => {
  const rk = D.RANKS[r] || D.RANKS.hyak;
  const tier = rk.tier;
  const civ = rk.track === 'civ';
  const base = 34 + tier * 4.5;
  const roll = () => U.clamp(Math.round(base + U.rf(-16, 18)), 15, 92);
  const nm = S.genName(opt.sur, c);
  const o = {
    id: S.newId(), n: nm.n, sei: nm.sei, mei: nm.mei, c, r,
    bu: roll(), tou: roll(), chi: roll(), pol: roll(), mi: roll(),
    tr: [], tac: [], st: U.pick(['ins', 'chi', 'bal', 'bal']), age: U.ri(22, 48), alive: true,
    loy: U.ri(60, 90), bond: 0, merit: rk.m ?? (D.MERIT_TIER[tier] || 0), jue: Math.min(19, Math.max(1, tier + 1)),
    loc: opt.loc || G.cty[c]?.cap || null, gen: true,
  };
  if (civ) { o.pol = U.clamp(o.pol + 12, 1, 95); o.bu = U.clamp(o.bu - 14, 5, 90); }
  else if (rk.track === 'mil') { o.bu = U.clamp(o.bu + 6, 1, 95); o.tou = U.clamp(o.tou + 6, 1, 95); o.pol = U.clamp(o.pol - 10, 5, 90); }
  if (opt.stats) Object.assign(o, opt.stats);
  const nTr = U.clamp(U.ri(1, 2) + (tier >= 4 ? 1 : 0) + (tier >= 7 && U.ch(0.5) ? 1 : 0), 1, 4);
  o.tr = S.genTraits(S.roleOf(r), tier, nTr);
  if (rk.track !== 'civ' || o.chi >= 60) o.tac = S.genTactics(o);
  G.off[o.id] = o;
  return o;
};
S.officersOf = (c, filt) => Object.values(G.off).filter(o => o.c === c && o.alive && !o.ret && (!filt || filt(o)));
S.bestGeneral = (c, exclude = []) => {
  const mySubs = G.me && G.me.army ? G.me.army.subs : [];
  const gs = S.officersOf(c, o => ['dais', 'shog', 'goz', 'gunshi'].includes(o.r) && !exclude.includes(o.id) && o.id !== G.me.oid && !mySubs.includes(o.id));
  return U.maxBy(gs, o => o.tou * 1.2 + o.bu * 0.4 + o.chi * 0.6 + (o.r === 'dais' ? 25 : o.r === 'shog' ? 12 : 0));
};

/* ---------- player helpers ---------- */
S.armyTotal = (inclPv = true) => U.sum(G.me.army.sq.filter(s => inclPv || !s.pv), s => s.n);
S.armyCap = () => S.rankCap(G.me.rank, G.me.merit);
// 国軍の定員（欠員も含めた隊の大きさの合計）
S.armyNominal = () => U.sum(G.me.army.sq.filter(s => !s.pv), s => Math.max(s.n, s.max));
S.pvCap = () => { const L = G.me.land; return Math.round((L.fac.barracks || 0) * 60 + L.hh * 0.05 + (L.ha >= 20 ? 20 : 0)); };
S.avgTraining = () => { const sq = G.me.army.sq; const n = U.sum(sq, s => s.n); return n ? U.sum(sq, s => s.tr * s.n) / n : 0; };
S.squadName = s => {
  const ut = D.UT[s.t];
  const ld = s.ld && G.off[s.ld] ? G.off[s.ld].n + '隊' : (s.pv ? '私兵' : '直属');
  return `${ut.n}（${ld}）`;
};
// 初期の兵糧（立場が上がるほど多い）
S.startFood = (tier) => 1000 + 1000 * tier * tier;

/* ---------- 軍の割り振り（任務状は使わない） ---------- */
// 合戦での任せ方：self は主人公が自分で動かす。ほかは開戦と同時に隊長が判断して動かす
S.ORDER_MODES = { self: '自ら指揮', attack: '攻勢', defend: '守勢', flank: '遊撃', follow: '追従' };
S.ORDER_DESC = { self: '主人公が自分で動かす', attack: '敵を求めて攻める', defend: '持ち場を守る', flank: '敵の側背を突く（騎兵向き）', follow: '主人公の隊を守ってついて来る' };
// 任せられる将か（統率60以上か知力65以上なら自ら判断して戦う）
S.canLead = (x) => !!x && (S.stat(x, 'tou') >= 60 || S.stat(x, 'chi') >= 65);
// 空の私兵の隊を消し、いなくなった部下の隊を直属に戻す
S.tidyArmy = () => {
  const A = G.me.army;
  A.subs = (A.subs || []).filter(id => G.off[id] && G.off[id].alive);
  for (const s of A.sq) {
    if (s.pv) s.max = s.n;
    if (s.ld && !A.subs.includes(s.ld)) s.ld = null;
  }
  A.sq = A.sq.filter(s => s.n > 0 || (!s.pv && s.max > 0));
  if (A.dep && !A.subs.includes(A.dep)) A.dep = null;
  if (A.orders) for (const id of Object.keys(A.orders)) if (!A.subs.includes(id)) delete A.orders[id];
};
// 隊 b を隊 a にまとめる（練度・装備は人数で平均）
S.mergeInto = (a, b, n = b.n, share = b.max) => {
  const tot = a.n + n;
  if (tot > 0) {
    a.tr = Math.round((a.tr * a.n + b.tr * n) / tot);
    a.wl = Math.round((a.wl * a.n + b.wl * n) / tot);
    a.al = Math.round((a.al * a.n + b.al * n) / tot);
    a.xp = Math.round(((a.xp || 0) * a.n + (b.xp || 0) * n) / tot);
  }
  a.n = tot; a.max += share;
};
// 隊 sqId から n 人を ld（null は主人公の直属）へ移す。同じ兵種の隊があればまとめる
S.moveTroops = (sqId, n, ld) => {
  const A = G.me.army, s = A.sq.find(x => x.id === sqId);
  ld = ld || null;
  if (!s || (s.ld || null) === ld) return 0;
  if (ld && !A.subs.includes(ld)) return 0;
  n = Math.min(s.n, Math.max(0, Math.floor(n)));
  if (!n) return 0;
  const share = s.pv ? n : Math.min(s.max, Math.round(s.max * n / Math.max(1, s.n)));
  let t = A.sq.find(x => x !== s && x.t === s.t && !!x.pv === !!s.pv && (x.ld || null) === ld);
  if (!t) { t = S.newSquad(s.t, 0, { pv: s.pv, tr: s.tr, wl: s.wl, al: s.al, ld }); t.max = 0; t.xp = s.xp || 0; A.sq.push(t); }
  S.mergeInto(t, s, n, share);
  s.n -= n; s.max = Math.max(s.n, s.max - share);
  S.tidyArmy();
  return n;
};
// 同じ隊長・同じ兵種・国軍／私兵の別が同じ隊をまとめる
S.mergeSquads = () => {
  const A = G.me.army, seen = new Map(); let k = 0;
  for (const s of A.sq) {
    const key = [s.t, s.pv ? 1 : 0, s.ld || ''].join('|');
    const a = seen.get(key);
    if (!a) { seen.set(key, s); continue; }
    S.mergeInto(a, s); s.n = 0; s.max = 0; k++;
  }
  S.tidyArmy();
  return k;
};
// 私兵を解散する（領地へ帰農し、戸が少し増える）
S.disband = (sqId, n) => {
  const A = G.me.army, s = A.sq.find(x => x.id === sqId);
  if (!s || !s.pv) return 0;
  n = Math.min(s.n, Math.max(0, Math.floor(n)));
  if (!n) return 0;
  s.n -= n;
  G.me.land.hh += Math.round(n / 5);
  S.tidyArmy();
  return n;
};
// 部下を解任する（任せていた兵は直属に戻る。本人は国の将に戻り、主人公を恨む）
S.dismissSub = (id) => {
  const A = G.me.army, x = G.off[id];
  if (!A.subs.includes(id)) return false;
  A.subs = A.subs.filter(v => v !== id);
  for (const s of A.sq) if (s.ld === id) s.ld = null;
  if (A.dep === id) A.dep = null;
  if (A.stg === id) A.stg = null;
  if (A.orders) delete A.orders[id];
  if (x) { x.lord = null; x.bond = Math.min(x.bond || 0, -20); }
  // 残る部下は少し不安になる
  for (const sid of A.subs) { const y = G.off[sid]; if (y) y.bond = Math.max(-100, (y.bond || 0) - 2); }
  S.mergeSquads();
  return true;
};
S.setOrder = (ld, mode) => {
  const A = G.me.army;
  if (!ld || !A.subs.includes(ld)) return;
  A.orders = A.orders || {};
  if (!mode || mode === 'self') delete A.orders[ld]; else A.orders[ld] = mode;
};

/* ---------- 官職の等級と出世 ---------- */
// 官職の名（等級つき）。g を省くと官職の名だけ
S.rankName = (r, g) => { const rk = D.RANKS[r]; if (!rk) return ''; return (g == null || rk.track === 'top' || rk.nograde) ? rk.name : `${rk.name}（${D.GRADES[g] || D.GRADES[0]}）`; };
S.rankLabel = () => S.rankName(G.me.rank, G.me.grade || 0);
const roundMerit = (v) => v >= 1000 ? Math.round(v / 100) * 100 : Math.round(v / 10) * 10;
// 官職 r の上の境目（次の官職に要る功績。頂点なら目安）
S.rankTop = (r) => { const rk = D.RANKS[r]; const nx = rk.up && D.RANKS[rk.up]; return nx ? nx.m : roundMerit(rk.m * 1.6 + 1000); };
// 官職 r の等級 g（0:三等 1:二等 2:一等）に要る功績
S.gradeNeed = (r, g) => { const rk = D.RANKS[r]; return g ? roundMerit(rk.m + (S.rankTop(r) - rk.m) * g / 3) : rk.m; };
S.gradeFromMerit = (r, merit) => { const rk = D.RANKS[r]; if (!rk || rk.track === 'top' || rk.nograde) return 0; let g = 0; while (g < 2 && merit >= S.gradeNeed(r, g + 1)) g++; return g; };
S.stepMonths = (r) => D.STEP_MONTHS[D.RANKS[r]?.tier || 1] || 6;
// 功績に応じた兵の上限（将軍は最大十万、大将軍は最大五十万）
S.rankCap = (r, merit) => {
  const rk = D.RANKS[r]; if (!rk) return 0;
  if (!rk.tmax) return rk.troops;
  const p = U.clamp((merit - rk.m) / Math.max(1, (rk.mfull || S.rankTop(r)) - rk.m), 0, 1);
  return Math.round((rk.troops + (rk.tmax - rk.troops) * p) / 1000) * 1000;
};
// 昇進の条件（功績と在任期間のほか）
S.reqList = (r) => {
  const q = D.RANKS[r]?.req, me = G.me, out = [];
  if (!q) return out;
  if (q.fame) out.push({ k: 'fame', label: `名声${q.fame}`, ok: me.fame >= q.fame, have: Math.round(me.fame) });
  if (q.wins) out.push({ k: 'wins', label: `勝利${q.wins}回`, ok: me.rec.wins >= q.wins, have: me.rec.wins });
  if (q.battles) out.push({ k: 'battles', label: `合戦${q.battles}回`, ok: me.rec.battles >= q.battles, have: me.rec.battles });
  if (q.renown) out.push({ k: 'renown', label: `武名「${D.RENOWN[q.renown].n}」`, ok: S.renownLv() >= q.renown, have: D.RENOWN[S.renownLv()].n });
  if (q.favor) {
    const ru = G.off[S.myCty().ruler], b = ru && !ru.player ? Math.round(ru.bond || 0) : 0;
    out.push({ k: 'favor', label: `君主との絆${q.favor[0]}か名声${q.favor[1]}`, ok: b >= q.favor[0] || me.fame >= q.favor[1], have: `絆${b}・名声${Math.round(me.fame)}` });
  }
  return out;
};
// 次の一段（等級か官職）。頂点なら null
S.nextStep = () => {
  const me = G.me, r = me.rank, rk = D.RANKS[r];
  if (!rk || rk.track === 'top' || rk.nograde) return null;
  const g = me.grade || 0, mo = S.stepMonths(r);
  if (g < 2) return { kind: 'grade', r, g: g + 1, need: S.gradeNeed(r, g + 1), mo, req: [] };
  const nx = rk.up; if (!nx || !D.RANKS[nx]) return null;
  return { kind: 'rank', r: nx, g: 0, need: D.RANKS[nx].m, mo, req: S.reqList(nx) };
};
// 在任期間があと何か月要るか
S.stepWait = (st = S.nextStep()) => st ? Math.max(0, st.mo - (G.turn - (G.me.stepT ?? -99))) : 0;
S.stepReady = (st = S.nextStep()) => !!st && G.me.merit >= st.need && S.stepWait(st) === 0 && st.req.every(x => x.ok);
// その道で格 tier までの一番上の官職
S.rankAtTier = (track, tier) => {
  const L = D.LADDER[track] || D.LADDER.mil;
  let best = L[0];
  for (const r of L) if (D.RANKS[r].tier <= tier && !D.RANKS[r].nograde) best = r;
  return best;
};

/* ---------- 爵（二十等爵。一つの爵も下・中・上の三段） ---------- */
S.jueNeed = (j, g) => { const J = D.JUE[j]; if (!g) return J.m; const hi = (D.JUE[j + 1] || D.JUE_TOP).m; return roundMerit(J.m + (hi - J.m) * g / 3); };
S.jueName = (j, g) => j <= 0 ? D.JUE[0].n : `${D.JUE[j].n}（${D.JUE_SUB[g || 0]}）`;
S.jueLabel = () => S.jueName(G.me.jue, G.me.jueG || 0);
S.jueLand = (j, g) => { const J = D.JUE[j], N = D.JUE[j + 1] || D.JUE_TOP, f = (g || 0) / 3; return { ha: Math.round((J.ha + (N.ha - J.ha) * f) * 2) / 2, hh: Math.round((J.hh + (N.hh - J.hh) * f) / 10) * 10 }; };
// 爵 j・段 g の次の段
S.jueStepAfter = (j, g) => {
  if (j >= 20 && g >= 2) return null;
  if (g < 2) return { j, g: g + 1, need: S.jueNeed(j, g + 1), t: 0, fame: 0 };
  const J = D.JUE[j + 1];
  return { j: j + 1, g: 0, need: J.m, t: J.t || 0, fame: J.fame || 0 };
};
S.jueNext = () => S.jueStepAfter(G.me.jue, G.me.jueG || 0);
S.jueOk = (nx, merit, tier, fame) => !!nx && merit >= nx.need && tier >= nx.t && (!nx.fame || fame >= nx.fame);
// 功績から爵を決める（始めるときなど。一か月一段の制限なし）
S.jueFromMerit = (merit, tier, fame) => {
  let j = 1, g = 0, nx;
  while ((nx = S.jueStepAfter(j, g)) && S.jueOk(nx, merit, tier, fame)) { j = nx.j; g = nx.g; }
  return { j, g };
};
// 一か月に一段だけ上がる。上がったら次の段を返す
S.juePromote = () => {
  const me = G.me;
  if (me.jueT === G.turn) return null;
  const nx = S.jueNext();
  if (!S.jueOk(nx, me.merit, S.tier(), me.fame)) return null;
  me.jue = nx.j; me.jueG = nx.g; me.jueT = G.turn;
  S.myOff().jue = me.jue;
  S.applyJueLand();
  return nx;
};
S.applyJueLand = () => {
  const me = G.me, L = S.jueLand(me.jue, me.jueG || 0);
  me.land.ha = Math.max(me.land.ha, L.ha);
  me.land.hh = Math.max(me.land.hh, L.hh);
};

/* ---------- 武名と異名 ---------- */
S.renownLv = (v = G.me.renown || 0) => { let i = 0; while (i + 1 < D.RENOWN.length && v >= D.RENOWN[i + 1].m) i++; return i; };
// 名乗っている異名（選んでいなければ一番の手柄のもの）
S.epithet = () => {
  const e = G.me.epi || []; if (!e.length) return '';
  const sel = G.me.epiSel != null && e[G.me.epiSel] ? e[G.me.epiSel] : U.maxBy(e, x => x.pts || 0);
  return sel ? sel.n : '';
};
// 武名による合戦の効果（近くの敵を威圧し、味方を励ます）
S.renownFx = () => { const lv = S.renownLv(); return lv ? { fear: 0.04 * lv, aura: 0.03 * lv } : null; };
S.playerXfx = () => { const out = S.itemFx(); const r = S.renownFx(); if (r) for (const k in r) out[k] = (out[k] || 0) + r[k]; return out; };

/* ---------- new game ---------- */
// 史実の人物を作る（late: 後から登場する時）
S.histOfficer = (h, late, ov) => {
  const [n, c, role0, bu, tou, chi, pol, mi, age, tr, st, death, special] = h;
  const role = ov && ov.role ? ov.role : role0;
  let [r, min] = role.split(':');
  const cc = G.cty[c];
  if (late && min && cc.mins[min] && G.off[cc.mins[min]]?.alive) min = null;
  if (late && (r === 'kuns' || r === 'josh')) r = 'daij';
  const o = { id: S.newId(), n, ...S.splitName(n), c, r, min: min || null, bu, tou, chi, pol, mi, tr: [...tr], st, age: ov && ov.age != null ? ov.age : (late ? age + (G.year - D.START_YEAR) : age), alive: true, loy: 85, bond: 0, merit: D.RANKS[r].m || 0, jue: Math.min(20, D.RANKS[r].tier * 2), loc: W.capital ? (W.capital(c) || D.COUNTRIES[c].cap) : D.COUNTRIES[c].cap, hist: true, death };
  if (special === 'mount') o.mount = true;
  if (o.tr.length < 2) o.tr = S.genTraits(S.roleOf(r), D.RANKS[r].tier, 2 - o.tr.length, o.tr);
  o.tac = h[13] ? h[13].filter(t => D.TACTICS[t]) : S.genTactics(o);
  if (!o.tac.length) o.tac = S.genTactics(o);
  G.off[o.id] = o;
  if (r === 'kuns') cc.ruler = o.id; else if (r === 'josh') cc.josh = o.id; else if (r === 'gyos') cc.gyos = o.id; else if (r === 'daij' && min) cc.mins[min] = o.id;
  return o;
};
S.newGame = (cfg) => {
  G = {
    v: 8, mode: cfg.mode || 'normal', custom: cfg.custom || null, year: (cfg.scenario && D.scenario(cfg.scenario) ? D.scenario(cfg.scenario).year : D.START_YEAR), month: 1, turn: 0, diff: cfg.diff ?? 1, scenario: cfg.scenario || 'start', ach: {},
    cty: {}, prov: {}, off: {}, nid: 1, dip: {}, log: [], hist: [], flags: {},
    offers: [], pend: [], reports: [], over: null, seed: Math.floor(Math.random() * 1e9),
  };
  // countries
  for (const id of D.CORDER) {
    const C = D.COUNTRIES[id];
    G.cty[id] = { id, alive: true, gold: 0, food: 0, tax: 0.15, laws: [...C.laws], ruler: null, josh: null, gyos: null, mins: {}, policy: 'balance', ptarget: null, aggr: C.aggr, fame: 50, coalition: null };
  }
  // provinces
  for (const p of D.PROVINCES) {
    const cap = !!p.cap;
    const pv = { id: p.id, o: p.o, pop: p.pop, agri: U.ri(35, 60) + (cap ? 15 : 0), comm: U.ri(25, 50) + (cap ? 20 : 0), order: U.ri(50, 70), loyal: U.ri(55, 75), wall: p.pass ? 95 : (cap ? 80 : U.ri(30, 60)), troops: 0, gov: null };
    if (p.o === 'carth' || p.o === 'ptol') pv.comm += 10;
    if (p.id === 'shu') pv.agri += 20;
    const mob = 0.055 * (p.o === 'rome' ? 1.15 : 1);
    pv.troops = Math.round(p.pop * 10000 * mob * (cap ? 1.4 : 1) / 100) * 100;
    if (p.pass) pv.troops = 25000;
    G.prov[p.id] = pv;
  }
  // 拠点（中都市・小都市・地域）
  // シナリオ：郡の持ち主と滅んだ国
  const SCN = D.SCENARIOS ? D.scenario(cfg.scenario) : null;
  if (SCN && !SCN.default) {
    if (SCN.owners) for (const pid in SCN.owners) if (G.prov[pid]) G.prov[pid].o = SCN.owners[pid];
    if (SCN.dead) for (const c of SCN.dead) G.cty[c].alive = false;
    // 都を奪われている国は、いちばん大きな郡を都にする
    for (const c of D.CORDER) if (G.cty[c].alive && G.prov[D.COUNTRIES[c].cap] && G.prov[D.COUNTRIES[c].cap].o !== c) { const rest = Object.values(G.prov).filter(p => p.o === c); if (rest.length) G.cty[c].capOverride = U.maxBy(rest, p => p.pop).id; }
  }
  S.initHoldings();
  // economy
  for (const id of D.CORDER) {
    const pop = S.countryPop(id);
    G.cty[id].gold = Math.round(pop * 10000 * 40);
    G.cty[id].food = Math.round(pop * 10000 * 6);
  }
  // 前218年の外交（ハンニバル戦争と第四次シリア戦争）
  const wars = SCN && SCN.wars ? SCN.wars : [['rome', 'carth'], ['sele', 'ptol']];
  for (const a of D.CORDER) for (const b of D.CORDER) if (a < b) G.dip[S.dipKey(a, b)] = { rel: U.ri(-15, 15), st: 'peace', t: 0 };
  for (const [a, b] of wars) { const d = S.dip(a, b); d.st = 'war'; d.rel = U.ri(-70, -45); }
  const rel0 = SCN && SCN.rel ? SCN.rel : [['rome', 'syra', 45], ['rome', 'mace', -25], ['carth', 'mace', 15], ['rome', 'ptol', 20], ['carth', 'numi', 10], ['mace', 'ptol', -10], ['sele', 'mace', 10], ['syra', 'carth', -10]];
  for (const [a, b, v] of rel0) if (G.dip[S.dipKey(a, b)] && S.dip(a, b).st !== 'war') S.dip(a, b).rel = v;
  const ally0 = SCN && SCN.allies ? SCN.allies : [['rome', 'syra']];
  for (const [a, b] of ally0) if (G.dip[S.dipKey(a, b)]) { const d = S.dip(a, b); d.st = 'ally'; d.rel = Math.max(d.rel, 50); }
  // historical officers（シナリオの年に合わせて、まだ生まれていない者・すでに亡い者を省き、王と丞相を据える）
  const scn = SCN && !SCN.default ? SCN : null;
  const rows = scn ? [...D.HIST, ...(scn.extra || [])] : D.HIST;
  for (const h of rows) {
    if (h[14] && h[14] > G.year) continue;   // まだ世に出ていない人物
    if (!scn) { S.histOfficer(h); continue; }
    if (!G.cty[h[1]] || !G.cty[h[1]].alive) continue;
    if (h[11] && h[11] < G.year) continue;   // すでに亡い
    const age = h[8] + (G.year - D.START_YEAR);
    if (age < 15) continue;
    let role = h[2]; const rk = role.split(':')[0];
    const ruler = scn.rulers && scn.rulers[h[1]], josh = scn.joshes && scn.joshes[h[1]];
    if (ruler) { if (h[0] === ruler) role = 'kuns'; else if (rk === 'kuns') role = 'daij:sosei'; }
    if (josh) { if (h[0] === josh) role = 'josh'; else if (rk === 'josh') role = 'daij'; }
    if (!ruler && rk === 'kuns' && G.cty[h[1]].ruler) role = 'daij:sosei';
    if (role.startsWith('daij')) { const [, mn] = role.split(':'); if (!mn || G.cty[h[1]].mins[mn]) { const free = D.MIN_ORDER.find(m => !G.cty[h[1]].mins[m]); role = free ? 'daij:' + free : 'guns'; } }
    const o = S.histOfficer(h, false, { age, role });
    if (o && (rk === 'kuns' || h[0] === ruler)) o.royal = true;
  }
  // シナリオでは、すでに起きた史実の事件は起こさない
  if (scn && typeof EV !== 'undefined' && EV.hist) for (const ev of EV.hist) if (ev.y < G.year) G.flags['ev_' + ev.id] = -1;
  // fill posts with generated officers
  for (const c of D.CORDER) {
    const cc = G.cty[c];
    if (!cc.ruler) { const o = S.genOfficer(c, 'kuns'); o.age = U.ri(30, 55); cc.ruler = o.id; }
    if (!cc.josh) cc.josh = S.genOfficer(c, 'josh').id;
    if (!cc.gyos) cc.gyos = S.genOfficer(c, 'gyos').id;
    for (const m of D.MIN_ORDER) if (!cc.mins[m]) { const o = S.genOfficer(c, 'daij'); o.min = m; cc.mins[m] = o.id; }
    const gens = S.officersOf(c, o => o.r === 'dais' || o.r === 'shog');
    let need = 5 - gens.length; while (need-- > 0) S.genOfficer(c, U.ch(0.25) ? 'dais' : 'shog');
    const goz = S.officersOf(c, o => o.r === 'goz');
    for (let i = goz.length; i < 4; i++) S.genOfficer(c, 'goz');
    for (let i = 0; i < 3; i++) S.genOfficer(c, U.pick(['senn', 'sanz']));
    // governors
    for (const p of S.ownedProvs(c)) {
      if (p.id === D.COUNTRIES[c].cap) { p.gov = cc.ruler; continue; }
      const g = S.genOfficer(c, 'guns', { loc: p.id }); p.gov = g.id;
    }
    // station generals at borders
    const border = S.ownedProvs(c).filter(p => S.adj(p.id).some(q => G.prov[q].o !== c));
    for (const o of S.officersOf(c, o => ['dais', 'shog', 'goz', 'sanz', 'senn'].includes(o.r))) {
      o.loc = border.length && U.ch(0.75) ? U.pick(border).id : D.COUNTRIES[c].cap;
    }
  }
  // プトレマイオス朝は周辺と穏やか
  for (const c of D.CORDER) if (c !== 'ptol') S.dip('ptol', c).rel += 5;
  // カスタム：他国の好戦性
  if (cfg.custom && cfg.custom.aggr != null) for (const c of D.CORDER) if (c !== cfg.country) G.cty[c].aggr *= cfg.custom.aggr;

  S.createPlayer(cfg);
  S.log(`${S.cname(cfg.country)}の${D.RANKS[cfg.rank].name}${cfg.rank === 'daij' ? '（' + D.MINISTRIES[cfg.min].n + '）' : ''}として、${S.myOff().n}の物語が始まる。`, 'big');
  S.chron(`${S.myOff().n}、${S.cname(cfg.country)}の${D.RANKS[cfg.rank].name}となる。`);
  if (typeof MOD !== 'undefined') { try { MOD.apply(); } catch (e) { console.warn(e); } }
  if (typeof PPL !== 'undefined') PPL.init();
  G.startYear = G.year; G.me.startRank = cfg.rank;
  return G;
};

S.createPlayer = (cfg) => {
  const c = cfg.country, r = cfg.rank, rk = D.RANKS[r], tier = rk.tier;
  const cc = G.cty[c];
  const o = {
    id: S.newId(), n: S.fullName(cfg.sei, cfg.mei, cfg.cul || S.cultOf(c)), sei: cfg.sei, mei: cfg.mei, c, r, min: r === 'daij' ? cfg.min : null,
    bu: cfg.stats.bu, tou: cfg.stats.tou, chi: cfg.stats.chi, pol: cfg.stats.pol, mi: cfg.stats.mi,
    tr: [...cfg.traits], st: cfg.style, age: cfg.age, alive: true, loy: 100, bond: 0, merit: 0, jue: 1, loc: null, player: true,
  };
  G.off[o.id] = o;
  // replace unique post holders
  const retire = id => { if (id && G.off[id]) { G.off[id].ret = true; } };
  if (r === 'kuns') { retire(cc.ruler); cc.ruler = o.id; for (const p of S.ownedProvs(c)) if (p.gov && G.off[p.gov]?.ret) p.gov = o.id; }
  if (r === 'josh') { retire(cc.josh); cc.josh = o.id; }
  if (r === 'gyos') { retire(cc.gyos); cc.gyos = o.id; }
  if (r === 'daij') { retire(cc.mins[cfg.min]); cc.mins[cfg.min] = o.id; }

  const startMerit = r === 'kuns' ? 0 : (rk.m || 0);
  const fame0 = 10 + tier * 8;
  let { j: jue, g: jueG } = S.jueFromMerit(startMerit, tier, fame0);
  if (r === 'kuns') { jue = 20; jueG = 0; }
  o.jue = jue; o.merit = startMerit;

  // location
  let loc = cfg.loc;
  if (!loc || G.prov[loc]?.o !== c) {
    if (tier >= 7 && rk.track !== 'mil') loc = (W.capital ? W.capital(c) : D.COUNTRIES[c].cap);
    else if (rk.track === 'civ') { const ps = S.ownedProvs(c).filter(p => !S.P[p.id].pass && p.id !== (W.capital ? W.capital(c) : D.COUNTRIES[c].cap)); loc = (U.pick(ps) || S.ownedProvs(c)[0]).id; }
    else loc = S.frontProv(c).id;
  }
  if (['kuns', 'josh', 'daij', 'gyos'].includes(r)) loc = (W.capital ? W.capital(c) : D.COUNTRIES[c].cap);
  o.loc = loc;
  if (r === 'guns') { const p = G.prov[loc]; if (p.gov && G.off[p.gov] && G.off[p.gov].id !== cc.ruler) G.off[p.gov].ret = true; p.gov = o.id; }

  const startGold = [0, 600, 1800, 4500, 10000, 22000, 45000, 100000, 220000, 450000, 2000000][tier];
  const me = G.me = {
    oid: o.id, rank: r, min: o.min, loc, boss: null, gen: null,
    gold: startGold, food: S.startFood(tier), ap: 0, merit: startMerit, jue, jueG, jueT: -1, fame: fame0,
    grade: 0, stepT: G.turn, renown: Math.round([0, 0, 0, 0, 10, 30, 70, 150, 280, 450, 700][tier] * (rk.track === 'civ' ? 0.3 : 1)), epi: [], epiSel: null, feats: {},
    exp: { bu: 0, tou: 0, chi: 0, pol: 0, mi: 0 },
    army: { sq: [], wu: [], subs: [], dep: null, stg: null, orders: {} },
    land: { ha: 0, hh: 0, fac: {}, build: [], order: 60, loyal: 65, tax: 1, name: '' },
    jur: null, tac: [], tasks: [], items: [], eq: {},
    inj: 0, rec: { battles: 0, wins: 0, kills: 0, slain: [], duels: 0, prom: [] }, flags: {}, banner: cfg.banner || 0,
    lastCouncil: -1, tx: {},
  };
  for (const f of D.FAC_ORDER) me.land.fac[f] = 0;
  S.applyJueLand();
  const facPts = Math.floor(jue / 3);
  const facOrder = ['farm', 'market', 'barracks', 'drill', 'smithy', 'stable', 'school', 'workshop', 'wall'];
  for (let i = 0; i < facPts; i++) { const f = facOrder[i % facOrder.length]; me.land.fac[f] = Math.min(5, me.land.fac[f] + 1); }
  me.land.name = S.placeName(loc) + (jue >= 19 ? '侯国' : '');

  // chain of command
  S.setupChain();
  // starting army
  S.setupArmy(cfg);
  // jurisdiction
  if (D.JUR[r]) S.setupJur(r, loc);
  // tactics
  if (cfg.tactics && cfg.tactics.length) me.tac = cfg.tactics.filter(t => D.TACTICS[t]);
  else {
    const chi = S.stat(o, 'chi');
    const st = { bu: S.stat(o, 'bu'), tou: S.stat(o, 'tou'), chi, pol: S.stat(o, 'pol'), mi: S.stat(o, 'mi') };
    const n = rk.track === 'staff' ? Math.max(3, tier - 1) : tier >= 7 ? 4 : tier >= 4 ? 2 : 1;
    me.tac = S.genTactics(Object.assign({ st: o.st, r }, st), n);
  }
  if (!me.tac.includes('shazone')) me.tac.push('shazone');
  o.tac = me.tac;
  // starting items
  if (tier >= 3) me.eq.weapon = 'bronze_sword';
  if (tier >= 5) me.eq.armor = 'leather';
  if (tier >= 6) me.eq.horse = 'horse';
  me.items = Object.values(me.eq);
  // カスタム設定
  const cu = cfg.custom;
  if (cu) {
    me.gold = Math.round(me.gold * (cu.gold || 1)) + (cu.gold > 1 ? 5000 * cu.gold : 0);
    if (cu.food > 1) me.food = Math.round(me.food * cu.food);
    if (cu.troops > 1) for (const sq of me.army.sq) { if (me.army.wu.length && !sq.pv && !sq.ld) continue; sq.n = Math.round(sq.n * cu.troops); sq.max = Math.max(sq.max, sq.n); }
    if (cu.train) for (const sq of me.army.sq) sq.tr = Math.max(sq.tr, cu.train);
    if (cu.jue) { me.jue = Math.max(me.jue, cu.jue); o.jue = me.jue; S.applyJueLand(); }
  }
  me.ap = S.apMax();
  S.ctrSync();
};

S.frontProv = (c) => {
  const ps = S.ownedProvs(c).filter(p => !S.P[p.id].pass);
  return U.maxBy(ps, p => S.adj(p.id).filter(q => G.prov[q].o !== c && S.atWar(c, G.prov[q].o)).length * 10 + S.adj(p.id).filter(q => G.prov[q].o !== c).length * 2 + Math.random()) || ps[0];
};

// 上官と所属軍の将を決める（fresh: 新しいゲーム。昇進のときは、今の上官が合っていればそのまま）
S.setupChain = (fresh = true) => {
  const me = G.me, o = S.myOff(), c = o.c, cc = G.cty[c], r = me.rank;
  const loc = me.loc;
  const keep = fresh ? null : G.off[me.boss];
  const find = (rr) => U.pick(S.officersOf(c, x => x.r === rr && x.id !== o.id));
  const gen = (rr) => S.genOfficer(c, rr, { loc });
  const want = (rr, mk) => (keep && keep.alive && !keep.ret && keep.c === c && keep.r === rr) ? keep : mk();
  const stationGeneral = () => {
    if (keep && keep.alive && !keep.ret && keep.c === c && ['shog', 'dais'].includes(keep.r)) return keep;
    let g = U.maxBy(S.officersOf(c, x => ['shog', 'dais'].includes(x.r) && x.loc === loc && x.id !== o.id), x => x.tou);
    if (!g) { g = find('shog') || gen('shog'); g.loc = loc; }
    return g;
  };
  const topGeneral = () => want('dais', () => U.maxBy(S.officersOf(c, x => x.r === 'dais' && x.id !== o.id), x => x.tou) || gen('dais'));
  const gov = () => { const p = G.prov[loc]; return p && p.gov && p.gov !== o.id && G.off[p.gov]?.alive ? p.gov : null; };
  const head = () => (cc.josh && cc.josh !== o.id ? cc.josh : cc.ruler);
  switch (r) {
    case 'goch': case 'shic': case 'tonc': me.boss = want('hyak', () => gen('hyak')).id; me.gen = stationGeneral().id; break;
    case 'hyak': case 'sanb': case 'gohy': me.boss = want('senn', () => gen('senn')).id; me.gen = stationGeneral().id; break;
    case 'senn': { const b = want('goz', () => find('goz') || gen('goz')); b.loc = loc; me.boss = b.id; me.gen = stationGeneral().id; break; }
    case 'sanz': case 'goz': { const g = stationGeneral(); me.boss = g.id; me.gen = g.id; break; }
    case 'shog': me.boss = topGeneral().id; me.gen = o.id; break;
    case 'dais': case 'tenka': me.boss = cc.ruler; me.gen = o.id; break;
    // 軍師の道：若いうちは駐屯地の将軍の幕下、軍師からは大将軍の幕下
    case 'gunri': case 'sanbo': case 'gshib': case 'chosh': { const g = stationGeneral(); me.boss = g.id; me.gen = g.id; break; }
    case 'gunshi': case 'dgun': { const g = topGeneral(); g.loc = loc; me.boss = g.id; me.gen = g.id; break; }
    case 'ritei': me.boss = want('teic', () => gen('teic')).id; break;
    case 'teic': case 'kyosa': me.boss = want('kyos', () => gen('kyos')).id; break;
    case 'kyos': case 'reis': case 'kenj': me.boss = want('kenr', () => gen('kenr')).id; break;
    case 'kenr': case 'gunj': me.boss = gov() || head(); break;
    case 'guns': case 'daij': case 'gyos': me.boss = head(); break;
    case 'josh': me.boss = cc.ruler; break;
    case 'kuns': me.boss = null; break;
  }
  if (!S.isMilLike()) me.gen = null;
  if (fresh && me.boss && G.off[me.boss]) G.off[me.boss].bond = 10;
  if (!fresh && keep && keep.id !== me.boss) S.log(`上官が${G.off[me.boss]?.n || '－'}に替わった。`);
};

S.compSplit = (c, total, opt = {}) => {
  // 国の編成比で兵種ごとに分ける
  const comp = { ...(D.COMP[c] || D.COMP.rome) };
  if (opt.noSiege !== false) { delete comp.ladder; }
  const keys = Object.keys(comp); const sum = U.sum(keys, k => comp[k]);
  const out = {}; let left = total;
  for (const k of keys) { const n = Math.floor(total * comp[k] / sum / 10) * 10; out[k] = n; left -= n; }
  out[keys[0]] = (out[keys[0]] || 0) + left;
  for (const k of keys) if (out[k] <= 0) delete out[k];
  return out;
};

S.newSquad = (t, n, opt = {}) => ({ id: U.uid(), t, n, max: opt.max || n, tr: opt.tr ?? 35, wl: opt.wl ?? 1, al: opt.al ?? 1, ld: opt.ld || null, xp: 0, pv: !!opt.pv });

S.setupArmy = (cfg) => {
  const me = G.me, o = S.myOff(), c = o.c, r = me.rank;
  const A = me.army;
  const tr = 35 + Math.round(S.stat(o, 'tou') / 6);
  const add = (t, n, opt) => { if (n > 0) A.sq.push(S.newSquad(t, n, Object.assign({ tr }, opt))); };
  if (r === 'goch' || r === 'ritei') {
    add(r === 'goch' ? (D.MAIN_INF[c] || 'inf') : 'militia', 5);
    const names = cfg.squadNames && cfg.squadNames.length === 4 ? cfg.squadNames : null;
    for (let i = 0; i < 4; i++) {
      const nm = names ? names[i] : S.genName().n;
      A.wu.push({ id: U.uid(), n: nm, bu: U.ri(25, 62), hp: 100, xp: 0, bond: U.ri(10, 30), alive: true, tr: U.ch(0.2) ? U.pick(['moushou', 'kobu', 'sogeki', 'tenun', 'fukuhei']) : null });
    }
    return;
  }
  const bow = D.MAIN_RNG[c] || 'arch', foot = D.MAIN_INF[c] || 'inf', pike = D.MAIN_SPEAR[c] || 'spear';
  if (r === 'teic') { add('militia', 8); add(bow, 4); }
  else if (r === 'kyosa') { add('militia', 18); add(bow, 7); }
  else if (r === 'kyos') { add('militia', 30); add(bow, 10); add('inf', 10); }
  else if (r === 'reis') { add('militia', 60); add(bow, 25); add('inf', 15); }
  else if (r === 'kenj') { add('inf', 140); add(bow, 60); }
  else if (r === 'shic') { add(foot, 10); }
  else if (r === 'tonc') { add(foot, 40); add(bow, 10); }
  else if (r === 'hyak') { add(foot, 100); }
  else if (r === 'sanb') { add(foot, 180); add(pike, 60); add(bow, 60); }
  else if (r === 'gohy') { add(foot, 300); add(pike, 100); add(bow, 100); }
  else if (r === 'gunri') { add('guard', 20); }
  else if (r === 'sanbo') { add('guard', 50); }
  else if (r === 'daij' && me.min === 'eii') { add('guard', 2000); add(foot, 1500); add(bow, 1000); add('lcav', 500); }
  else {
    const total = D.RANKS[r].troops;
    const sp = S.compSplit(c, total);
    // 大部隊は兵種ごとに複数の隊へ
    const unitSize = total >= 100000 ? 20000 : total >= 20000 ? 5000 : total >= 3000 ? 1000 : 100000;
    for (const t in sp) {
      let n = sp[t];
      while (n > 0) { const k = Math.min(n, unitSize); add(t, k); n -= k; }
    }
  }
  // 副官・隊長
  const tier = D.RANKS[r].tier;
  if (tier >= 2) {
    const dep = cfg.deputy ? cfg.deputy : S.makeDeputyCandidates(1)[0];
    const d = S.genOfficer(c, D.RANK_ORDER_MIL[Math.max(0, Math.min(6, tier - 2))], { stats: dep.stats, sur: dep.sei });
    d.n = dep.n || d.n; d.sei = dep.sei || d.sei; d.mei = dep.mei || d.mei; d.tr = dep.tr || d.tr; d.st = dep.st || d.st;
    d.loc = me.loc; d.bond = 30; d.lord = o.id;
    A.dep = d.id; A.subs.push(d.id);
    // 主要な隊に隊長を付ける
    const nLead = Math.min(A.sq.length - 1, tier >= 7 ? 6 : tier >= 4 ? 3 : tier >= 3 ? 2 : 0);
    const sorted = [...A.sq].sort((a, b) => b.n - a.n);
    for (let i = 0; i < nLead; i++) {
      const s = sorted[i + 1]; if (!s) break;
      const lr = D.RANK_ORDER_MIL[Math.max(0, tier - 3)];
      const l = S.genOfficer(c, lr, { loc: me.loc }); l.lord = o.id; l.bond = 15;
      s.ld = l.id; A.subs.push(l.id);
    }
    if (sorted[0]) sorted[0].ld = null; // 主人公の直属
  }
  if (D.RANKS[r].track === 'staff') me.army.stg = null;
};

S.makeDeputyCandidates = (n = 3) => {
  const out = [];
  const types = [
    { k: '武闘派', b: { bu: 20, tou: 6, chi: -10 }, tr: ['moushou', 'totsu', 'ikkigake', 'tb_hero1', 'td_spear1', 'tb_chg1', 'tx_brave'] },
    { k: '智将', b: { chi: 22, tou: 10, bu: -12 }, tr: ['gunryaku', 'fukuhei', 'seisha', 'tb_det1', 'tc_plan1', 'tb_amb1', 'tx_calm'] },
    { k: '堅実', b: { tou: 18, bu: 4, pol: 6 }, tr: ['teppeki', 'renpei', 'heitan', 'kobu', 'tb_def1', 'tc_disc1', 'tb_rg1'] },
    { k: '騎兵', b: { bu: 12, tou: 10 }, tr: ['shinsoku', 'kiba', 'kisha', 'tu_lcav1', 'tu_hcav1', 'tb_pursuit1', 'td_ride1'] },
    { k: '弓の名手', b: { bu: 8, chi: 8 }, tr: ['seisha', 'sogeki', 'tu_arch1', 'tu_xbow1', 'tb_shoot1', 'tb_range1', 'td_bow1'] },
  ];
  for (let i = 0; i < n; i++) {
    const ty = types[(i + U.ri(0, types.length - 1)) % types.length];
    const nm = S.genName();
    const st = { bu: U.ri(42, 62), tou: U.ri(42, 62), chi: U.ri(38, 62), pol: U.ri(30, 55), mi: U.ri(35, 60) };
    for (const k in ty.b) st[k] = U.clamp(st[k] + ty.b[k], 15, 88);
    const tr = U.shuffle(ty.tr.slice()).slice(0, 2);
    const more = S.genTraits('mil', 3, 1, tr);
    out.push({ n: nm.n, sei: nm.sei, mei: nm.mei, kind: ty.k, stats: st, tr: more, st: ty.k === '智将' ? 'chi' : ty.k === '武闘派' ? 'ins' : 'bal' });
  }
  return out;
};
// 郡の中の県（地図の県）から地名を選ぶ。地図がまだなら昔の名簿から
S.placeName = (pid) => {
  if (typeof GEO !== 'undefined' && GEO.built && (GEO.byProv[pid] || []).length) { const cs = GEO.byProv[pid]; return U.pick(cs.length > 1 ? cs.slice(1) : cs).n; }
  return U.pick(D.XIANG_NAMES);
};
S.setupJur = (r, pid, prev) => {
  const J = D.JUR[r], p = G.prov[pid];
  let nm, county = null, vil = null;
  const cs = typeof GEO !== 'undefined' && GEO.built ? (GEO.byProv[pid] || []) : [];
  if (J.lv === 'jun') nm = S.P[pid].name + '州';
  else if (cs.length) {
    // 同じ郡の中で移るなら、なるべく同じ県のまま
    let ct = prev && prev.county ? GEO.county(prev.county) : null;
    if (!ct || ct.pid !== pid) ct = J.lv === 'xian' ? U.pick(cs) : U.pick(cs.length > 1 ? cs.slice(1).concat(cs) : cs);
    county = ct.id;
    if (J.lv === 'xian') nm = ct.n;
    else {
      const vi = ct.vil.length ? U.ri(0, ct.vil.length - 1) : -1;
      if (vi >= 0) { vil = vi; nm = `${ct.n}・${ct.vil[vi].n}${J.n}`; }
      else nm = ct.n + '・' + J.n;
    }
  } else nm = J.lv === 'xian' ? (U.pick(D.XIANG_NAMES)) : (U.pick(D.XIANG_NAMES)) + J.n;
  const j = {
    lv: J.lv, r, name: nm, prov: pid, county, vil,
    hh: J.lv === 'jun' ? Math.round(p.pop * 10000 / 5) : Math.round(J.hh * U.rf(0.8, 1.25)),
    agri: U.clamp(p.agri + U.ri(-12, 6), 10, 95), comm: U.clamp(p.comm + U.ri(-12, 6), 5, 95),
    order: U.clamp(p.order + U.ri(-15, 5), 10, 95), loyal: U.clamp(p.loyal + U.ri(-10, 6), 10, 95),
    cult: U.ri(20, 45), def: U.clamp(p.wall - 20 + U.ri(-10, 10), 5, 90), bandits: U.ri(0, 2),
  };
  if (prev) { j.agri = Math.max(j.agri, prev.agri - 5); j.order = Math.max(j.order, prev.order - 8); }
  j.base = { agri: j.agri, comm: j.comm, order: j.order, loyal: j.loyal, cult: j.cult, hh: j.hh, def: j.def };
  G.me.jur = j;
  return j;
};

S.apMax = () => {
  const me = G.me, o = S.myOff();
  let ap = D.RANKS[me.rank].ap + (G.custom && G.custom.ap || 0) + Math.round(S.fx(o, 'ap'));
  if (S.stat(o, 'pol') >= 80 || S.stat(o, 'chi') >= 85) ap += 1;
  if (me.inj > 0) ap -= 1;
  return Math.max(1, ap);
};

/* ---------- serialization ---------- */
S.serialize = () => { S.ctrSync(); return JSON.stringify(G); };
S.load = (json) => {
  const g = typeof json === 'string' ? JSON.parse(json) : json;
  if (!g || !g.me || !g.prov || !g.off) throw new Error('セーブデータの形式が違います');
  S.ctrFromSave(g);
  G = g;
  S.migrate();
  return G;
};
S.migrate = () => {
  if ((G.v || 0) < 4) {
    for (const o of Object.values(G.off)) {
      if (!o.tr) o.tr = [];
      o.tr = o.tr.filter(t => D.TRAITS[t]);
      if (!o.tac) o.tac = o.player ? (G.me.tac || []) : (D.RANKS[o.r]?.track !== 'civ' ? S.genTactics(o) : []);
    }
    G.me.tac = (G.me.tac || []).filter(t => D.TACTICS[t]);
    G.me.tx = G.me.tx || {};
    G.mode = G.mode || 'normal';
    G.v = 4;
  }
  if (G.v < 5) {
    // 軍の割り振り・私兵の枠の整理、初期兵糧の見直し
    G.me.army.orders = G.me.army.orders || {};
    S.tidyArmy();
    const tier = D.RANKS[G.me.rank]?.tier || 1;
    const bonus = Math.max(0, S.startFood(tier) - 200 * tier * tier);
    if (bonus > 0) { G.me.food = (G.me.food || 0) + bonus; S.log(`兵糧の見直しで、蔵に兵糧${U.num(bonus)}石が届いた。`, 'good'); }
    G.v = 5;
  }
  if (G.v < 6) {
    // 官職の等級・爵の三段・武名と異名。官職と爵は下げず、今の中での段だけを功績から決める
    const me = G.me, R = me.rec || {};
    if (!D.RANKS[me.rank]) me.rank = S.myOff().r = 'hyak';
    me.grade = S.gradeFromMerit(me.rank, me.merit);
    me.stepT = G.turn;
    me.jue = U.clamp(me.jue || 1, 1, 20);
    me.jueG = 0; while (me.jueG < 2 && me.merit >= S.jueNeed(me.jue, me.jueG + 1)) me.jueG++;
    me.jueT = -1;
    me.renown = Math.round((R.wins || 0) * 4 + (R.slain || []).length * 12 + (R.duels || 0) * 10 + Math.sqrt(R.kills || 0) * 2);
    me.epi = me.epi || []; me.epiSel = me.epiSel ?? null; me.feats = me.feats || {};
    S.log(`官職に三等〜一等の等級ができ、身分も下・中・上の三段に分かれた。今は${S.rankLabel()}・${S.jueLabel()}。`, 'good');
    G.v = 6;
  }
  if (G.v < 7) {
    // 郡を大都市・中都市・小都市・地域に分ける（はじめは郡の持ち主のもの）
    if (!G.hold) S.initHoldings();
    S.log('州が大都市・中都市・小都市・地域に分かれた。大都市は遠征で、ほかは一つずつ攻め取る。', 'good');
    G.v = 7;
  }
  if (G.v < 8) {
    // 恩と怨・派閥・墓。将の用兵は見るときに決まる
    if (typeof PPL !== 'undefined') PPL.init();
    G.ach = G.ach || {}; G.startYear = G.startYear ?? D.START_YEAR; G.me.startRank = G.me.startRank || (G.me.rec && G.me.rec.prom && G.me.rec.prom.length ? 'goch' : G.me.rank); G.scenario = G.scenario || 'start';
    S.log('将たちのあいだに恩と怨が生まれ、国には派閥ができた。人物の札で用兵と関係が見られる。遠征では城を包囲でき、実績と年代記が加わった。', 'good');
    G.v = 8;
  }
};
