/* =========================================================
   地中海覇道 — 拠点（大都市・中都市・小都市・地域）と遠征
   州は「大都市」（州の都）と、いくつもの中都市（市）・小都市（大きな町）・地域（村々と野）からなる。
   ・中都市・小都市・地域は、小さな戦で一つずつ奪い合う
   ・大都市は「遠征」でしか取れない：前哨戦・野戦を経て攻城戦。野戦で敵の主力を殲滅すれば城は開く
   州の持ち主（G.prov[pid].o）は大都市の持ち主。州の実り・徴兵は、拠点を持つ割合で分け合う
   ========================================================= */

// 拠点の種類。w: 州の中での取り分の重み、K: 州の兵のうち守りに付く割合、floor: 最低の守り、cap: 占領した時の守備兵の上限、fort: 守りやすさ
D.HOLDK = {
  big:   { n: '大都市', s: '大' },
  mid:   { n: '中都市', s: '中', w: 3,   K: 0.07,  floor: 400, cap: 1600, fort: 1.25, merit: 40 },
  small: { n: '小都市', s: '小', w: 1.5, K: 0.025, floor: 150, cap: 700,  fort: 1.12, merit: 20 },
  area:  { n: '地域',   s: '域', w: 1,   K: 0.012, floor: 60,  cap: 300,  fort: 1.0,  merit: 10 },
};
// 主人公が攻め取れる拠点（格ごと）
D.HOLD_TIER = { area: 2, small: 3, mid: 4 };

/* ---------- 拠点をつくる（全体マップの市と村から） ---------- */
// 村の名はカタカナ（七雄覇道の「〜郷」「〜里」のような字の尾はない）。名のあとに地勢を添える
S.areaName = (v) => {
  const stem = v.n;
  const e = GEO.elev(v.x, v.y), cv = GEO.cover(v.x, v.y, e);
  if (e > 0.55) return stem + 'の山地';
  if (cv.marsh > 0.3) return stem + 'の沼沢';
  if (cv.forest > 0.45) return stem + 'の森';
  if (cv.steppe > 0.4) return stem + 'の原';
  return stem + 'の野';
};
// 小都市にする大きな村（七雄覇道では名が「郷」「聚」で終わる村。地中海版は村の大きさ s で選ぶ）
S.isTownVil = (v) => /[郷聚]$/.test(v.n) || v.s >= 1.0;
S.genHoldings = () => {
  if (typeof GEO === 'undefined') return {};
  if (!GEO.built) GEO.build();
  const out = {};
  for (const P of D.PROVINCES) {
    const cs = (GEO.byProv[P.id] || []).slice().sort((a, b) => a.k - b.k);
    const p = G.prov[P.id];
    const list = [];
    // 中都市：州の都のほかの市
    for (const c of cs) if (c.k > 0) list.push({ id: `${P.id}:m${c.k}`, k: 'mid', n: c.n, x: c.x, y: c.y, ck: c.k });
    const used = new Set();
    if (!P.pass) {
      const nS = Math.max(1, Math.round(cs.length * 0.6)), nA = Math.max(1, Math.round(cs.length * 0.6));
      // 小都市：大きな村のうち一番大きな町（州の都に近い市から）
      let made = 0;
      for (const c of cs) {
        if (made >= nS) break;
        const v = U.maxBy(c.vil.filter(v => S.isTownVil(v) && Math.hypot(v.x - c.x, v.y - c.y) > 2.2), v => v.s);
        if (!v) continue;
        used.add(v); list.push({ id: `${P.id}:s${c.k}`, k: 'small', n: v.n, x: v.x, y: v.y, ck: c.k }); made++;
      }
      // 地域：小さな村の散らばる田舎（外れの市から）
      made = 0;
      for (const c of cs.slice().reverse()) {
        if (made >= nA) break;
        const vs = c.vil.filter(v => !used.has(v) && !S.isTownVil(v));
        if (!vs.length) continue;
        const v = U.maxBy(vs, v => Math.hypot(v.x - c.x, v.y - c.y));
        used.add(v); list.push({ id: `${P.id}:a${c.k}`, k: 'area', n: S.areaName(v), x: v.x, y: v.y, ck: c.k }); made++;
      }
    } else {
      // 峠の砦の外の険しい道
      const c = cs[cs.length - 1], v = c && c.vil[0];
      if (v) list.push({ id: `${P.id}:a${c.k}`, k: 'area', n: S.areaName(v), x: v.x, y: v.y, ck: c.k });
    }
    // 州の中での取り分（大都市が残りを持つ）
    const bigSh = P.pass ? 0.7 : 0.35;
    const wsum = U.sum(list, h => D.HOLDK[h.k].w) || 1;
    for (const h of list) {
      h.pid = P.id;
      h.sh = Math.round((1 - bigSh) * D.HOLDK[h.k].w / wsum * 1000) / 1000;
      const vr = (GEO.hash(h.ck * 7 + 3, h.k.length, D.PROVINCES.indexOf(P) + 11) - 0.5) * 2;
      h.w = h.k === 'mid' ? Math.max(10, Math.round(p.wall * 0.5 + 8 + vr * 10)) : h.k === 'small' ? Math.max(4, Math.round(p.wall * 0.2 + 4 + vr * 5)) : 0;
      h.o = p.o; h.g = 0;
      h.x = Math.round(h.x * 10) / 10; h.y = Math.round(h.y * 10) / 10;
      out[h.id] = h;
    }
  }
  return out;
};
S.initHoldings = () => { G.hold = S.genHoldings(); S._hbpG = null; };
// 州ごとの拠点（G が替わったら作り直す）
S.holdsIn = (pid) => {
  if (S._hbpG !== G || S._hbpN !== Object.keys(G.hold || {}).length) {
    S._hbp = {}; S._hbpG = G; S._hbpN = Object.keys(G.hold || {}).length;
    for (const h of Object.values(G.hold || {})) (S._hbp[h.pid] = S._hbp[h.pid] || []).push(h);
    for (const k in S._hbp) S._hbp[k].sort((a, b) => ({ mid: 0, small: 1, area: 2 })[a.k] - ({ mid: 0, small: 1, area: 2 })[b.k] || a.ck - b.ck);
  }
  return S._hbp[pid] || [];
};
S.holdAll = () => Object.values(G.hold || {});
// 大都市（州の都）の名
S.bigName = (pid) => (typeof GEO !== 'undefined' && GEO.built && GEO.byProv[pid] && GEO.byProv[pid][0] ? GEO.byProv[pid][0].n : S.P[pid].name);
S.holdKind = (h) => D.HOLDK[h.k].n;
S.holdLabel = (h) => `${h.n}（${D.HOLDK[h.k].n}）`;
// 州の中で、州の持ち主でない国が持つ取り分
S.foreignShare = (p, warOnly) => { let s = 0; for (const h of S.holdsIn(p.id)) if (h.o !== p.o && (!warOnly || S.atWar(h.o, p.o))) s += h.sh; return Math.min(0.9, s); };
// 国 c がこの州から得る取り分（0〜1）
S.shareOf = (p, c) => {
  if (p.o === c) return 1 - S.foreignShare(p);
  let s = 0; for (const h of S.holdsIn(p.id)) if (h.o === c) s += h.sh; return s;
};
// 州の外に置いた守備兵（占領した拠点）
S.garrisonOf = (c) => { let n = 0; for (const h of S.holdAll()) if (h.o === c && h.o !== G.prov[h.pid].o) n += h.g || 0; return n; };
// 拠点の守り（人数）と守りやすさ。奪った拠点は、隣の自領の軍がすぐ駆けつけて支える
S.holdSupport = (h) => { const sup = U.maxBy(S.adj(h.pid).map(q => G.prov[q]).filter(q => q.o === h.o), q => q.troops); return sup ? Math.round(sup.troops * 0.08) : 0; };
S.holdDef = (h) => {
  const K = D.HOLDK[h.k], p = G.prov[h.pid];
  if (h.o === p.o) return Math.round(Math.max(K.floor, p.troops * K.K));
  return Math.round(Math.max(K.floor * 0.4, h.g || 0) + S.holdSupport(h));
};
S.holdFort = (h) => D.HOLDK[h.k].fort * (1 + (h.w || 0) / 200);

/* ---------- 拠点の取り合い ---------- */
// 守りの損害を、州の兵か守備兵から引く
W.holdLoss = (h, n) => {
  const p = G.prov[h.pid];
  if (h.o === p.o) { p.troops = Math.max(0, Math.round(p.troops - n)); return; }
  // 守備兵と、駆けつけた隣の軍とで損害を分ける
  const g = Math.max(1, h.g || 0), sup = S.holdSupport(h), tot = g + sup;
  const fromG = Math.round(n * g / tot);
  h.g = Math.max(0, Math.round((h.g || 0) - fromG));
  if (sup > 0) { const sp = U.maxBy(S.adj(h.pid).map(q => G.prov[q]).filter(q => q.o === h.o), q => q.troops); if (sp) sp.troops = Math.max(0, sp.troops - (n - fromG)); }
};
// 拠点が国 c のものになる（gar: 残す守備兵）
W.takeHold = (h, c, gar = 0) => {
  const p = G.prov[h.pid], prev = h.o, my = S.myOff().c;
  h.o = c;
  if (c === p.o) { p.troops += Math.round(h.g || 0); h.g = 0; }
  else { h.g = Math.max(0, Math.round(gar)); p.order = Math.max(5, p.order - 3); p.loyal = Math.max(5, p.loyal - 2); }
  h.w = Math.max(0, Math.round((h.w || 0) * 0.85));
  G.landStat = G.landStat || {};
  const st = (G.landStat[G.turn] = G.landStat[G.turn] || {});
  st[c] = (st[c] || 0) + 1; st[prev] = (st[prev] || 0) - 1;
  if ((c === my || prev === my) && (h.k !== 'area' || h.pid === G.me.loc)) S.log(`${S.cname(c)}が${S.P[h.pid].name}の${S.holdLabel(h)}を${S.cname(prev)}から奪った。`, c === my ? 'good' : 'bad');
  // 主人公の管轄の市が奪われた
  const j = G.me.jur;
  if (j && j.county && j.county === `${h.pid}_${h.ck}` && h.k === 'mid' && prev === my && c !== my) { j.order = Math.max(5, j.order - 15); j.loyal = Math.max(5, j.loyal - 15); S.log(`管轄の${h.n}が敵の手に落ちた。民が動揺している。`, 'bad'); }
};
// 占領した拠点の守備兵：隣の自領から補い、孤立すれば痩せて降る
W.holdUpkeep = () => {
  for (const h of S.holdAll()) {
    const p = G.prov[h.pid];
    if (h.o === p.o) { h.g = 0; continue; }
    const cc = G.cty[h.o];
    if (!cc || !cc.alive) { h.o = p.o; h.g = 0; continue; }
    const K = D.HOLDK[h.k];
    const want = Math.round(Math.max(K.floor, Math.min(K.cap, p.troops * K.K * 1.2)));
    const sup = U.maxBy(S.adj(h.pid).map(q => G.prov[q]).filter(q => q.o === h.o), q => q.troops);
    if (sup) {
      const add = Math.min(Math.max(0, want - (h.g || 0)), Math.round(sup.troops * 0.02));
      if (add > 0) { h.g = (h.g || 0) + add; sup.troops -= add; }
    } else {
      h.g = Math.round((h.g || 0) * 0.95);
      if (h.g < K.floor * 0.3 && S.atWar(h.o, p.o)) {
        const was = h.o; h.o = p.o; h.g = 0;
        if (was === S.myOff().c || p.o === S.myOff().c) S.log(`孤立した${S.P[h.pid].name}の${S.holdLabel(h)}は${S.cname(p.o)}に降った。`, p.o === S.myOff().c ? 'good' : 'bad');
      }
    }
  }
};
// 拠点を一つ攻める（自動で決着）。src: 兵を出す州
W.resolveLocal = (c, h, src, force) => {
  const p = G.prov[h.pid], prev = h.o;
  force = Math.max(0, Math.min(Math.round(force), src.troops));
  if (force < 50) return null;
  src.troops -= force;
  const cmdA = W.pickCommander(c, src.id), cmdD = h.o === p.o ? W.pickCommander(h.o, h.pid) : null;
  const def = S.holdDef(h);
  const r = W.autoResolve(force, def, c, prev, cmdA && U.ch(0.35) ? cmdA : null, cmdD && U.ch(0.35) ? cmdD : null, S.holdFort(h));
  W.holdLoss(h, r.defLoss);
  const left = Math.max(0, force - r.atkLoss);
  if (r.win === 'atk') {
    const gar = c === p.o ? 0 : Math.round(Math.min(D.HOLDK[h.k].cap, left * 0.5));
    W.takeHold(h, c, gar);
    src.troops += left - gar;
  } else src.troops += left;
  return r;
};
// 国ごとの拠点の奪い合い（毎月）
W.localWarAI = () => {
  for (const c of U.shuffle(D.CORDER.filter(x => G.cty[x].alive))) {
    const cc = G.cty[c];
    if (cc.food <= 0) continue;
    const enemies = D.CORDER.filter(x => x !== c && G.cty[x].alive && S.atWar(c, x));
    if (!enemies.length) continue;
    const own = S.ownedProvs(c);
    const seen = new Set(), cands = [];
    const consider = (pid) => {
      if (seen.has(pid)) return; seen.add(pid);
      const p = G.prov[pid];
      for (const h of S.holdsIn(pid)) {
        if (h.o === c || !enemies.includes(h.o)) continue;
        const src = p.o === c ? p : U.maxBy(S.adj(pid).map(q => G.prov[q]).filter(q => q.o === c), q => q.troops);
        if (!src) continue;
        const def = S.holdDef(h) * S.holdFort(h);
        const avail = src.troops * (src.id === pid ? 0.2 : 0.12);
        const odds = avail / Math.max(1, def);
        if (odds < 1.4) continue;
        const pri = Math.min(odds, 4) * (p.o === c ? 2.4 : 1) * ({ area: 1.2, small: 1, mid: 0.9 })[h.k] * U.rf(0.7, 1.3);
        cands.push({ h, src, def, pri, retake: p.o === c });
      }
    };
    for (const p of own) { consider(p.id); for (const q of S.adj(p.id)) consider(q); }
    if (!cands.length) continue;
    cands.sort((a, b) => b.pri - a.pri);
    const wr = cc.weary || 0;
    let budget = (U.ch(0.55 * (1 - wr * 0.6)) ? 1 : 0) + (cc.policy === 'expand' && U.ch(0.5) ? 1 : 0) + (cands.some(x => x.retake) ? 1 : 0);
    const done = new Set();
    for (const x of cands) {
      if (budget <= 0) break;
      if (done.has(x.h.id) || x.h.o === c) continue;
      done.add(x.h.id); budget--;
      W.resolveLocal(c, x.h, x.src, Math.min(x.src.troops * (x.src.id === x.h.pid ? 0.2 : 0.12), x.def * U.rf(1.6, 2.4)));
    }
  }
};
// 今月の拠点の増減（主人公の国）を報告に
W.landReport = () => {
  const st = (G.landStat || {})[G.turn]; if (!st) return null;
  const my = S.myOff().c, n = st[my] || 0;
  G.landStat = {};
  return n ? `今月、${S.cname(my)}は拠点を差し引き${n > 0 ? n + 'つ得た' : -n + 'つ失った'}。` : null;
};

/* ---------- 遠征（大都市を取る） ---------- */
// 州の大都市に寄せる城の守りやすさ：周りの拠点を敵に取られるほど孤立して弱る
W.isolation = (pid) => 1 - 0.45 * S.foreignShare(G.prov[pid], true);
// 前哨戦の相手：攻め手がこの州に拠点を持たないとき、攻め手の来る方角に一番近い、州の持ち主の拠点
W.gateHold = (tgt, atk, src) => {
  const p = G.prov[tgt], hs = S.holdsIn(tgt);
  if (hs.some(h => h.o === atk)) return null;
  const F = S.P[src] || S.P[tgt];
  return U.minBy(hs.filter(h => h.o === p.o), h => Math.hypot(h.x - F.x, h.y - F.y)) || null;
};
// 遠征の一つの合戦の構成
W.expSpec = (camp, stage, inv, aT, dT, kind, x, title) => {
  const atkOffs = S.officersOf(camp.atk, o => ['dais', 'shog', 'goz'].includes(o.r) && o.loc === camp.src).slice(0, stage === 'gate' ? 2 : 5);
  const defOffs = stage === 'gate' ? [] : S.officersOf(camp.def, o => ['dais', 'shog', 'goz'].includes(o.r) && o.loc === camp.tgt).slice(0, 5);
  let role = inv.role === 'top' ? 'commander' : inv.role;
  const sup = W.supplyIndex ? W.supplyIndex(camp.atk, camp.tgt, G.off[camp.atkCmd]) : 1;
  const A = { c: camp.atk, troops: aT, cmd: G.off[camp.atkCmd], officers: atkOffs, morale: Math.round((sup - 1) * 10) };
  const B = { c: camp.def, troops: dT, cmd: G.off[camp.defCmd], officers: defOffs, morale: camp.fromSiege ? -Math.min(15, camp.fromSiege.months * 3) : 0 };
  if (inv.side === 'atk' && role === 'commander') A.cmd = S.myOff();
  if (inv.side === 'def' && role === 'commander') B.cmd = S.myOff();
  const seat = typeof GEO !== 'undefined' && GEO.built ? (GEO.byProv[camp.tgt] || [])[0] : null;
  const at = stage === 'gate' ? { x: x.hold.x, y: x.hold.y } : (stage === 'siege' || stage === 'urban') && seat ? { x: seat.x, y: seat.y } : null;
  return W.buildSpec({
    kind, pid: camp.tgt, from: stage === 'field' ? camp.src : null, at, title,
    A, B, me: inv.side === 'atk' ? 'A' : 'B', role,
    cityOf: kind === 'field' || kind === 'naval' ? null : 'B', wall: stage === 'gate' ? (x.hold.w || 10) : G.prov[camp.tgt].wall,
    maxDays: stage === 'naval' ? 1 : stage === 'gate' ? (kind === 'siege' ? 2 : 1) : stage === 'field' ? (aT + dT >= 60000 ? 2 : 1) : stage === 'urban' ? (aT + dT >= 60000 ? 2 : 1) : undefined,
    ctx: { camp: camp.id, side: inv.side, stage },
    siege: camp.fromSiege ? { months: camp.fromSiege.months, breach: camp.fromSiege.tunnel >= 3, flooded: camp.fromSiege.water >= 3 } : null,
    noFriends: stage === 'gate',
  });
};
// 守り手が城を出て野戦に出る兵（0 なら籠城）
W.sallyForce = (camp, atk) => {
  const P = G.prov[camp.tgt];
  if (S.P[camp.tgt].pass) return 0;
  const field = Math.round(P.troops * 0.65), ratio = field / Math.max(1, atk);
  const iso = W.isolation(camp.tgt);
  const p = ratio >= 0.9 ? 0.85 : ratio >= 0.55 ? 0.45 : 0.05;
  return U.ch(p * (iso < 0.8 ? 0.7 : 1)) ? field : 0;
};
/*
  遠征を進める。camp: { id, atk, def, src, tgt, atkTroops, atkCmd, defCmd, contrib?, drawn?, playerLed?, inv? }
  戻り値: { win: 'atk'|'def', capture, atkLoss, defLoss, surrender, stages: [...] }
*/
W.runExpedition = async (camp) => {
  const P = G.prov[camp.tgt], my = S.myOff().c;
  const out = { win: 'def', capture: false, atkLoss: 0, defLoss: 0, surrender: false, stages: [] };
  if (!P || P.o !== camp.def || !G.prov[camp.src]) return out;
  const tgtName = S.P[camp.tgt].name, big = S.bigName(camp.tgt);
  const nameA = S.cname(camp.atk), nameD = S.cname(camp.def);
  // 兵を出す（連合軍の兵は各国からすでに引いてある）
  const pool = camp.contrib || null;
  if (!pool && !camp.drawn) G.prov[camp.src].troops = Math.max(0, G.prov[camp.src].troops - camp.atkTroops);
  let atk = camp.atkTroops;
  if (W.isWinter && W.isWinter() && !camp.fromSiege && atk > 1000) { const lost = Math.round(atk * 0.04); atk -= lost; if (camp.atk === my) S.log(`冬の行軍で兵${U.fmt(lost)}を損なった。`, 'bad'); }
  const supply = W.supplyIndex ? W.supplyIndex(camp.atk, camp.tgt, G.off[camp.atkCmd]) : 1;
  const giveBack = (n) => {
    n = Math.max(0, Math.round(n));
    if (!pool) { G.prov[camp.src].troops += n; return; }
    const tot = U.sum(Object.values(pool), x => x) || 1;
    for (const c in pool) {
      if (!G.cty[c] || !G.cty[c].alive) continue;
      const ps = S.ownedProvs(c); if (!ps.length) continue;
      const home = ps.find(p => S.adj(p.id).includes(camp.tgt)) || G.prov[W.capital(c)] || ps[0];
      home.troops += Math.round(n * pool[c] / tot);
    }
  };
  // 主人公の関わり
  let inv = camp.inv !== undefined ? camp.inv : W.involvement(camp);
  if (inv && !camp.playerLed) {
    if (inv.role === 'top') {
      const mode = await HOOK.choose({
        title: `${nameA}軍が${tgtName}へ遠征！`, seal: '遠征',
        body: `${nameA}軍 ${U.fmt(camp.atkTroops)}（${G.off[camp.atkCmd]?.n || '－'}）が${tgtName}の${big}をめざして攻め寄せた。守る兵は${U.fmt(P.troops)}。`,
        choices: [{ v: 'lead', label: '自ら指揮を執る（親征）' }, { v: 'watch', label: '将に任せて観戦する' }, { v: 'auto', label: '将に任せる（結果のみ）' }],
      });
      if (mode === 'auto') inv = null; else if (mode === 'watch') inv = { side: inv.side, role: 'watch' };
    } else {
      const cmdN = G.off[inv.side === 'atk' ? camp.atkCmd : camp.defCmd]?.n || '総大将';
      const rolestr = inv.role === 'commander' ? '貴殿を総大将に任ずる' : inv.role === 'gunshi' ? '総軍師として策を練れ' : `${cmdN}の軍に加わり戦え`;
      await HOOK.info({
        title: inv.side === 'atk' ? `遠征：${tgtName}の${big}へ` : `敵襲：${tgtName}の${big}防衛`, seal: '軍令',
        body: `${nameA}軍 ${U.fmt(camp.atkTroops)} 対 ${nameD}軍 ${U.fmt(P.troops)}。\n大都市を取るには、前哨戦と野戦を経て城を攻める。野戦で敵の主力を殲滅すれば、城は戦わずに開く。\n${rolestr}。`,
      });
    }
  }
  const cmdA = G.off[camp.atkCmd], cmdD = G.off[camp.defCmd];
  const playerAtk = inv && inv.side === 'atk' && inv.role !== 'watch';
  // 主人公が攻め手の采配を握るか（握らなければ、進むか退くかは総大将が決める）
  const playerCmd = playerAtk && ['commander', 'gunshi', 'top'].includes(inv.role);
  // 一つの戦い
  const fight = async (stage, aT, dT, kind, x, title) => {
    const join = inv && (inv.side === 'atk' || stage !== 'gate');
    if (join) {
      const spec = W.expSpec(camp, stage, inv, aT, dT, kind, x, title);
      const br = await HOOK.battle(spec);
      const res = W.applyBattleResult(spec, br);
      const di = inv.side === 'atk' ? 1 : 0, sd = br.sides && br.sides[di];
      const annih = stage === 'field' && res.win === 'atk' && sd && sd.alive / Math.max(1, sd.start) < 0.3;
      return { win: res.win === 'atk' ? 'atk' : 'def', atkLoss: Math.min(aT, res.atkLoss || 0), defLoss: Math.min(dT, res.defLoss || 0), annih, battle: true, ratio: 1 };
    }
    const fort = stage === 'siege' ? x.fort : stage === 'gate' ? S.holdFort(x.hold) : stage === 'urban' ? 1.45 : 1.05 * (W.lastStand(camp.def) ? 1.1 : 1);
    const r = stage === 'naval' && typeof NAV !== 'undefined' ? NAV.autoResolve(aT, dT, camp.atk, camp.def, cmdA, cmdD) : W.autoResolve(aT, dT, camp.atk, camp.def, cmdA, cmdD, fort);
    for (const id of r.slain || []) W.killOfficer(id, '戦死');
    const annih = stage === 'field' && r.win === 'atk' && r.defLoss >= dT * 0.6;
    return { win: r.win, atkLoss: r.atkLoss, defLoss: r.defLoss, annih, ratio: r.ratio };
  };
  const goOn = async (body, foe) => {
    if (!playerCmd) return true;
    const k = await HOOK.choose({ title: '遠征の軍議', seal: '軍議', body: body + `\n補給線は${W.supplyLabel ? W.supplyLabel(supply) : ''}。`, choices: [{ v: 1, label: '進軍を続ける', sub: `味方 ${U.fmt(atk)}　敵 約${U.fmt(foe)}` }, { v: 0, label: '兵を退く', sub: '遠征をやめて自領へ戻る' }] });
    return !!k;
  };
  const finish = (capture, why) => {
    const sg = camp.fromSiege;
    if (sg) {
      if (capture) { sg.troops = atk; W.siegeCapture(sg, '強襲で落ちた'); out.win = 'atk'; out.capture = true; out.why = why; return out; }
      sg.troops = Math.max(0, Math.round(atk));
      if (sg.troops < Math.max(300, P.troops * 0.4)) W.siegeLift(sg, '強襲に失敗し退いた'); else S.log(`${tgtName}の${big}への強襲は退けられた。${nameA}軍は包囲を続ける。`, camp.atk === my ? 'bad' : camp.def === my ? 'good' : 'info');
      out.why = why; return out;
    }
    if (capture && inv && inv.role !== 'watch') { try { HOOK.cutin({ kind: 'banner', title: camp.atk === my ? '落城' : '落城……', sub: `${tgtName}の${big}${camp.atk === my ? 'を落とした！' : 'が落ちた'}`, color: camp.atk === my ? '#f3d27a' : '#f08a74', red: true, snd: 'gong' }); } catch (e) {} }
    if (capture) {
      const g = Math.round(atk * (pool ? 0.4 : 0.7));
      G.prov[camp.tgt].troops = g;
      W.capture(camp.tgt, camp.atk, camp.def);
      giveBack(atk - g);
      out.win = 'atk'; out.capture = true;
    } else giveBack(atk);
    out.why = why;
    // 主人公の国が関わる遠征の知らせ
    if (camp.atk === my || camp.def === my) {
      const st = out.stages.map(s => `${s.n}${s.win === 'atk' ? '○' : '●'}`).join(' → ');
      const won = (out.win === 'atk') === (camp.atk === my);
      S.log(`${tgtName}への遠征（${nameA}軍）：${st || '－'}${out.surrender ? ' → 開城' : ''}。${capture ? `${nameA}が${big}を落とした。` : `${nameA}軍は退いた。`}`, won ? 'good' : 'bad');
    }
    return out;
  };
  // 0. 海戦：海を渡る遠征は、守り手の艦隊が沖で迎え撃つことがある
  if (!camp.fromSiege && typeof NAV !== 'undefined' && NAV.seaEdge(camp.src, camp.tgt)) {
    const fleet = NAV.intercept(camp.def, camp.atk, atk);
    if (fleet > 0) {
      const sea = NAV.seaName(camp.tgt);
      if (inv && inv.role !== 'watch') await HOOK.info({ title: '敵の艦隊', seal: '海戦', body: `${sea}を渡る${nameA}軍の船団の前に、${(D.NAVY[camp.def] || D.NAVY_DEF).n}が現れた。海兵 約${U.fmt(fleet)}。\n船が沈めば兵も海に消える。負ければ上陸はできない。` });
      const r = await fight('naval', atk, fleet, 'naval', {}, `${sea}の海戦（${tgtName}沖）`);
      if (G.over) return out;
      atk -= r.atkLoss; out.atkLoss += r.atkLoss; out.defLoss += r.defLoss;
      out.stages.push({ n: '海戦', win: r.win });
      if (r.win !== 'atk' || atk <= 0) return finish(false, 'naval');
      if (!(await goOn(`海戦に勝ち、${tgtName}の浜に上陸した。${big}には敵 約${U.fmt(P.troops)} が控えている。`, P.troops))) return finish(false, 'retreat');
    }
  }
  // 1. 前哨戦：攻め手の来る方角の拠点（包囲からの強襲では省く）
  const gate = camp.fromSiege ? null : W.gateHold(camp.tgt, camp.atk, camp.src);
  if (gate) {
    const gd = Math.round(S.holdDef(gate) + (gate.o === P.o ? P.troops * 0.06 : 0));
    const r = await fight('gate', atk, gd, gate.k === 'mid' ? 'siege' : 'field', { hold: gate }, `${gate.n}の戦い（前哨戦）`);
    if (G.over) return out;
    atk -= r.atkLoss; out.atkLoss += r.atkLoss; out.defLoss += r.defLoss;
    W.holdLoss(gate, r.defLoss);
    out.stages.push({ n: '前哨戦', win: r.win, at: gate.n });
    if (r.win !== 'atk' || atk <= 0) return finish(false, 'gate');
    const gar = Math.round(Math.min(D.HOLDK[gate.k].cap, atk * 0.04));
    W.takeHold(gate, camp.atk, gar); atk -= gar;
    // 攻め手のAI：大きく劣るなら退く
    if (!playerCmd && atk < P.troops * W.fortMul(camp.tgt) * W.isolation(camp.tgt) * 0.55) return finish(false, 'retreat');
    if (!(await goOn(`前哨戦に勝ち、${gate.n}を奪った。${tgtName}の${big}には敵 約${U.fmt(P.troops)} が控えている。`, P.troops))) return finish(false, 'retreat');
  }
  // 2. 野戦：守り手の主力が城を出て迎え撃つか
  let sally;
  if (camp.fromSiege) sally = 0;
  else if (inv && inv.side === 'def' && (inv.role === 'commander' || inv.role === 'top') && !S.P[camp.tgt].pass) {
    const k = await HOOK.choose({ title: `${big}の守り`, seal: '軍議', body: `${nameA}軍 約${U.fmt(atk)} が迫る。城の兵は${U.fmt(P.troops)}。`, choices: [{ v: 'sally', label: '城を出て迎え撃つ（野戦）', sub: '勝てば敵を退け、大敗すれば城を失う' }, { v: 'hold', label: '籠城する', sub: '城壁を頼りに攻城戦で守る' }] });
    sally = k === 'sally' ? Math.round(P.troops * 0.7) : 0;
  } else sally = W.sallyForce(camp, atk);
  if (sally > 0) {
    const r = await fight('field', atk, sally, 'field', {}, `${tgtName}郊外の野戦`);
    if (G.over) return out;
    atk -= r.atkLoss; P.troops = Math.max(0, P.troops - r.defLoss); out.atkLoss += r.atkLoss; out.defLoss += r.defLoss;
    out.stages.push({ n: '野戦', win: r.win });
    if (r.win !== 'atk' || atk <= 0) return finish(false, 'field');
    // 殲滅：主力の大半を失い、城を守る兵が足りなければ城は開く
    if (r.annih || P.troops < Math.max(800, atk * 0.15) || ((r.ratio || 0) >= 2.2 && U.ch(0.5))) {
      out.surrender = true;
      S.log(`${tgtName}の${big}は主力を失い、城門を開いた。`, camp.atk === my ? 'good' : camp.def === my ? 'bad' : 'info');
      if (inv && inv.role !== 'watch') await HOOK.info({ title: '開城', seal: '開城', body: `野戦で敵の主力を殲滅した。${big}は戦わずに城門を開いた。` });
      return finish(true, 'surrender');
    }
    if (!playerCmd && atk < P.troops * W.fortMul(camp.tgt) * W.isolation(camp.tgt) * 0.6) return finish(false, 'retreat');
    if (!(await goOn(`野戦に勝った。敵の残兵 約${U.fmt(P.troops)} が${big}に籠もった。城を攻めるか。`, P.troops))) return finish(false, 'retreat');
  }
  // 3. 包囲か強襲か（大都市で、包囲が続いておらず、連合軍でなければ）
  if (!camp.fromSiege && !S.P[camp.tgt].pass && !pool && !P.besieged && W.siegeStart) {
    let want = 'assault';
    const fortNow = W.fortMul(camp.tgt, camp.atk === my && (camp.playerLed || S.isTop())) * W.isolation(camp.tgt);
    if (playerCmd) {
      want = await HOOK.choose({ title: `${big}を前にして`, seal: '軍議', body: `城の兵 ${U.fmt(P.troops)}、城壁の守り ${Math.round(fortNow * 100)}%。味方 ${U.fmt(atk)}（補給線は${W.supplyLabel(supply)}）。\n強襲すればすぐに決まるが、城壁の守りは厚い。包囲すれば月をまたいで城を締め上げられる（兵糧攻め・水攻め・坑道・内応）。ただし救援軍が来ることもある。`, choices: [{ v: 'assault', label: '強襲する' }, { v: 'besiege', label: '包囲する', sub: '月をまたいで城を囲む' }, { v: 'retreat', label: '兵を退く' }] }) || 'retreat';
    } else {
      const pers = typeof PPL !== 'undefined' && cmdA ? PPL.pers(cmdA) : 'steady';
      const strong = atk >= P.troops * fortNow * 1.1;
      if (!strong && atk >= P.troops * 0.9 && pers !== 'bold' && pers !== 'siege' && U.ch(0.6)) want = 'besiege';
      else if (!strong && pers === 'cunning' && U.ch(0.4)) want = 'besiege';
    }
    if (want === 'retreat') return finish(false, 'retreat');
    if (want === 'besiege') { W.siegeStart(camp, atk, inv && inv.role !== 'watch' ? inv : null, playerCmd); out.win = 'besiege'; out.why = 'besiege'; out.stages.push({ n: '包囲', win: 'atk' }); return out; }
  }
  // 4. 攻城戦
  const pl = camp.atk === my && (camp.playerLed || S.isTop());
  const fort = W.fortMul(camp.tgt, pl) * W.isolation(camp.tgt) * (camp.fromSiege ? W.siegeFortMul(camp.fromSiege) : 1);
  const r = await fight('siege', atk, P.troops, S.P[camp.tgt].pass ? 'pass' : 'siege', { fort }, `${big}攻城戦`);
  if (G.over) return out;
  atk -= r.atkLoss; P.troops = Math.max(0, P.troops - r.defLoss); out.atkLoss += r.atkLoss; out.defLoss += r.defLoss;
  out.stages.push({ n: '攻城戦', win: r.win });
  if (r.win === 'atk' && atk > 0) {
    // 5. 市街戦：大きな都は、城壁を破られても通りごとに抵抗することがある
    const bigCity = W.isCapOf(camp.tgt) || (S.P[camp.tgt].pop || 0) >= 60;
    if (bigCity && !S.P[camp.tgt].pass && P.troops > Math.max(1500, atk * 0.12) && U.ch(0.55)) {
      const dT = Math.round(P.troops * 0.85 + (S.P[camp.tgt].pop || 30) * 40);
      if (inv && inv.role !== 'watch') await HOOK.info({ title: '市街戦', seal: '市街', body: `城壁は破った。だが${big}の兵と市民は通りに荷車と石を積み、家々に籠もって抵抗を続けている。\n通りと広場を一つずつ奪え。` });
      const r2 = await fight('urban', atk, dT, 'urban', {}, `${big}の市街戦`);
      if (G.over) return out;
      atk -= r2.atkLoss; P.troops = Math.max(0, P.troops - r2.defLoss * 0.8); out.atkLoss += r2.atkLoss; out.defLoss += r2.defLoss;
      out.stages.push({ n: '市街戦', win: r2.win });
      if (r2.win !== 'atk' || atk <= 0) return finish(false, 'urban');
    }
    // 敗残兵は隣の自領へ
    const back = S.adj(camp.tgt).map(q => G.prov[q]).find(p => p.o === camp.def);
    if (back) back.troops += Math.round(P.troops * 0.5);
    return finish(true, 'siege');
  }
  return finish(false, 'siege');
};

/* ---------- 主人公の遠征（君主・宰相の命、または許しを得た将） ---------- */
W.launchExpedition = async (tgt, troops, opts = {}) => {
  const me = G.me, o = S.myOff(), c = o.c;
  const src = opts.src || S.adj(tgt).filter(q => G.prov[q].o === c).sort((a, b) => G.prov[b].troops - G.prov[a].troops)[0];
  if (!src) return null;
  const P = G.prov[tgt];
  if (P.besieged) { await HOOK.info({ title: '包囲中', body: `${S.P[tgt].name}の${S.bigName(tgt)}はすでに囲まれている。包囲の行方を待とう。` }); return null; }
  const lead = opts.lead !== false;
  const asGunshi = lead && S.isStaff() && S.tier() >= 7 && G.off[me.boss] && G.off[me.boss].alive;
  // 兵の調達：近隣の州から
  let need = troops, got = 0;
  for (const q of [src, ...S.adj(src).filter(q => G.prov[q].o === c)]) { const p = G.prov[q]; const take = Math.min(need, Math.round(p.troops * 0.7)); p.troops -= take; need -= take; got += take; if (need <= 0) break; }
  const camp = {
    id: U.uid(), atk: c, def: P.o, src, tgt, atkTroops: got, drawn: true,
    atkCmd: lead ? (asGunshi ? me.boss : o.id) : opts.cmd, defCmd: W.pickCommander(P.o, tgt)?.id,
    playerLed: lead,
    inv: lead ? { side: 'atk', role: asGunshi ? 'gunshi' : 'commander' } : (opts.watch ? { side: 'atk', role: 'watch' } : null),
  };
  const res = await W.runExpedition(camp);
  W.taskEvent('conquer', tgt, G.prov[tgt].o === c);
  if (lead && res.capture && !G.over) { W.gainMerit(Math.round(60 * S.tier()), `${S.P[tgt].name}の${S.bigName(tgt)}を落とした`); me.rec.cities = (me.rec.cities || 0) + 1; }
  return res;
};

/* ---------- 主人公が攻め取れる拠点 ---------- */
// 今いる州（自領の中の敵の拠点）と、隣の州の敵の拠点
W.playerHoldTargets = (ignoreTier) => {
  const me = G.me, myC = S.myOff().c, tier = S.tier();
  const out = [];
  for (const pid of [me.loc, ...S.adj(me.loc)]) {
    for (const h of S.holdsIn(pid)) {
      if (h.o === myC || !S.atWar(myC, h.o)) continue;
      if (!ignoreTier && tier < (D.HOLD_TIER[h.k] || 9)) continue;
      out.push(h);
    }
  }
  return out;
};
// 拠点を攻める戦の報せ（主人公が加わる）
W.holdOffer = (h, opt = {}) => {
  const me = G.me, myC = S.myOff().c;
  const force = Math.max(5, S.armyTotal());
  const foe = Math.max(20, S.holdDef(h));
  const home = G.prov[me.loc];
  const supMax = home && home.o === myC ? Math.round(home.troops * 0.1) : 0;
  const want = Math.round(foe * S.holdFort(h) * U.rf(1.15, 1.6));
  const ally = Math.max(0, Math.min(supMax, want - force));
  return { id: U.uid(), kind: 'hold', hid: h.id, pid: h.pid, from: me.loc, ec: h.o, foe, ally, title: `${h.n}攻略（${D.HOLDK[h.k].n}）`, desc: `${S.cname(h.o)}の${S.P[h.pid].name}・${S.holdLabel(h)}を攻め取る好機。守り 約${U.fmt(foe)}。`, auto: !!opt.auto };
};
