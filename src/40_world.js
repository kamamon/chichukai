/* =========================================================
   地中海覇道 — world simulation (strategy layer)
   ========================================================= */
const W = {};
// UI hooks (filled by UI; stubbed in tests)
const HOOK = {
  battle: async (spec) => B.autoResolve(spec),
  choose: async (o) => (o.choices.find(c => !c.disabled) || o.choices[0]).v,
  info: async (o) => {},
  event: async (ev) => 0,
  // 数を入れてもらう（画面では UI.askNumber）。テストでは既定値
  number: async (o) => o.value ?? o.max,
  // カットイン（画面では UI.cutin。テストでは何もしない）
  cutin: async (o) => false,
  // 異名・武名の演出（画面では UI.fame）
  fame: async (o) => HOOK.info({ title: o.title, seal: o.seal || '武名', big: true, body: [o.lead, o.epithet ? `「${o.epithet}」` : '', ...(o.lines || []).map(l => `${l.who || S.cname(l.c)}：${l.s}`)].filter(Boolean).join('\n') }),
};

/* ---------- 功績・昇進 ---------- */
W.gainMerit = (n, why) => {
  if (!n) return 0;
  const me = G.me, c = S.myOff().c;
  let v = n;
  if (n > 0 && S.lawOn(c, 'gunkou') && D.RANKS[me.rank].track !== 'civ') v *= 1.1;
  if (n > 0) v *= S.fxm(S.myOff(), 'merit');
  v = Math.round(v);
  me.merit = Math.max(0, me.merit + v);
  S.myOff().merit = me.merit;
  if (v > 0) me.fame = Math.min(999, me.fame + v / 120 * S.fxm(S.myOff(), 'fame'));
  if (why) S.log(`功績 ${v > 0 ? '+' : ''}${U.num(v)}（${why}）`, v > 0 ? 'good' : 'bad');
  const up = S.juePromote();
  if (up) W.logJue(up);
  return v;
};
W.logJue = (st) => {
  const me = G.me, o = S.myOff(), L = S.jueLand(me.jue, me.jueG || 0);
  const lvUp = st.g === 0;
  S.log(`身分が上がった：${S.jueLabel()}（土地${U.num(Math.round(L.ha * 20))}ユゲラ${L.hh ? '・与えられた村' + U.num(L.hh) + '戸' : ''}）`, lvUp ? 'big' : 'good');
  if (lvUp && me.jue >= 9) S.chron(`${o.n}、${D.JUE[me.jue].n}の身分を得る。`);
};

// 次の官職（等級ではなく）
W.nextRank = () => D.RANKS[G.me.rank]?.up || null;

// 昇進：一度に一段（等級か官職）だけ。功績・在任期間・条件がそろったとき
W.checkPromotion = async (ceremony = '論功行賞') => {
  await W.flushFame();
  const me = G.me, o = S.myOff();
  const st = S.nextStep();
  if (!S.stepReady(st)) return 0;
  if (st.kind === 'grade') { await W.gradeUp(st.g, ceremony); return 1; }
  if (me.facDelay && me.facDelay > G.turn) return 0;
  if (typeof PPL !== 'undefined' && await PPL.promotionObjection(st)) return 0;
  const nx = st.r;
  if (nx === 'daij') {
    // 空席の大臣を選ぶ
    const cc = S.myCty();
    const opts = D.MIN_ORDER.map(m => ({ v: m, label: D.MINISTRIES[m].n, sub: (G.off[cc.mins[m]]?.n || '空席') + '（現職）' }));
    const pick = await HOOK.choose({ title: '大臣への昇進', body: '総督としての功績が認められ、大臣に列せられることになった。担当を選べ。', choices: opts });
    me.min = pick || 'chiso'; o.min = me.min;
    const old = G.off[cc.mins[me.min]]; if (old && old.id !== o.id) { old.r = 'guns'; old.min = null; }
    cc.mins[me.min] = o.id;
    me.loc = D.COUNTRIES[o.c].cap; o.loc = me.loc;
  }
  await W.promote(nx, ceremony);
  return 1;
};
S.pay = () => Math.round(D.RANKS[G.me.rank].pay * (1 + 0.15 * (G.me.grade || 0)));
// 同じ官職の中で等級が上がる
W.gradeUp = async (g, why) => {
  const me = G.me, o = S.myOff();
  me.grade = g; me.stepT = G.turn;
  me.fame = Math.min(999, me.fame + 2 + S.tier());
  me.rec.prom.push({ d: S.dateStr(), r: me.rank, g });
  S.log(`【昇格】${S.rankLabel()}に進んだ。`, 'big');
  const nx = S.nextStep();
  const body = [
    `${o.n}を${S.rankLabel()}に進める。`,
    `俸禄：金${U.fmt(S.pay())}／月`,
    nx ? `次は${S.rankName(nx.r, nx.g)}（功績${U.num(nx.need)}・在任${nx.mo}か月${nx.req.length ? '・' + nx.req.map(x => x.label).join('・') : ''}）` : '',
  ].filter(Boolean);
  await HOOK.info({ title: why || '論功行賞', seal: '昇格', body: body.join('\n') });
};

// 定員 cap まで国軍の兵を増やす（新しい兵は練度が低い）。split: 大きな隊は分けて隊長を付けやすくする
W.fillArmy = (cap, split = true) => {
  const me = G.me, o = S.myOff(), c = o.c, A = me.army, rk = D.RANKS[me.rank];
  const have = S.armyNominal();
  if (cap <= have) return 0;
  const add = cap - have;
  const tr = Math.round(U.clamp(S.avgTraining() * 0.6 + 20, 20, 60));
  if (rk.track === 'civ' && rk.tier <= 3) {
    const put = (t, n) => { if (n <= 0) return; const ex = A.sq.find(s => s.t === t && !s.pv && !s.ld); if (ex) { ex.tr = Math.round((ex.tr * ex.n + tr * n) / Math.max(1, ex.n + n)); ex.n += n; ex.max = Math.max(ex.max + n, ex.n); } else A.sq.push(S.newSquad(t, n, { tr })); };
    put('militia', Math.round(add * 0.7)); put('arch', add - Math.round(add * 0.7));
  } else {
    const sp = S.compSplit(c, add);
    const unitSize = !split ? Infinity : cap >= 100000 ? 20000 : cap >= 20000 ? 5000 : cap >= 3000 ? 1000 : Infinity;
    for (const t in sp) {
      let n = sp[t];
      const ex = A.sq.find(s => s.t === t && !s.pv && !s.ld && Math.max(s.n, s.max) + n <= unitSize);
      if (ex) { ex.tr = Math.round((ex.tr * ex.n + tr * n) / Math.max(1, ex.n + n)); ex.n += n; ex.max = Math.max(ex.max + n, ex.n); continue; }
      while (n > 0) { const k = Math.min(n, unitSize); A.sq.push(S.newSquad(t, k, { tr })); n -= k; }
    }
  }
  for (const s of A.sq) s.max = Math.max(s.max, s.n);
  return add;
};
// 功績に応じて率いる兵が増える官職（将軍・大将軍）：上限が伸びたら新しい兵が配属される
W.growArmy = () => {
  const me = G.me, rk = D.RANKS[me.rank];
  if (!rk || !rk.tmax) return 0;
  const cap = S.armyCap(), have = S.armyNominal();
  if (cap - have < Math.max(1000, cap * 0.03)) return 0;
  const add = W.fillArmy(cap, false);
  if (add > 0) S.log(`功績が認められ、兵${U.fmt(add)}人が新たに配属された（定員${U.fmt(cap)}）。`, 'good');
  return add;
};

W.promote = async (nx, why) => {
  const me = G.me, o = S.myOff(), c = o.c, cc = G.cty[c];
  const old = me.rank;
  const prevJur = me.jur;
  me.rank = nx; o.r = nx;
  me.grade = 0; me.stepT = G.turn;
  const rk = D.RANKS[nx];
  me.rec.prom.push({ d: S.dateStr(), r: nx });
  // unique posts
  if (nx === 'josh') { const prev = G.off[cc.josh]; if (prev && prev.id !== o.id) prev.ret = true; cc.josh = o.id; me.loc = D.COUNTRIES[c].cap; }
  if (nx === 'gyos') { const prev = G.off[cc.gyos]; if (prev && prev.id !== o.id) prev.ret = true; cc.gyos = o.id; me.loc = D.COUNTRIES[c].cap; }
  if (old === 'daij' && cc.mins[me.min] === o.id) { const n = S.genOfficer(c, 'daij'); n.min = me.min; cc.mins[me.min] = n.id; }
  if (nx === 'guns') {
    const p = G.prov[me.loc];
    if (p.o === c && p.id !== D.COUNTRIES[c].cap) { const pg = G.off[p.gov]; if (pg && pg.id !== cc.ruler) { pg.r = 'kenr'; pg.ret = true; } p.gov = o.id; }
    else { const cand = S.ownedProvs(c).find(pp => pp.id !== D.COUNTRIES[c].cap && !S.P[pp.id].pass) || S.ownedProvs(c)[0]; me.loc = cand.id; const pg = G.off[cand.gov]; if (pg && pg.id !== cc.ruler) pg.ret = true; cand.gov = o.id; }
  }
  o.loc = me.loc;
  // jurisdiction
  if (D.JUR[nx]) S.setupJur(nx, me.loc, prevJur); else me.jur = null;
  // army
  const A = me.army;
  if (old === 'goch' || old === 'ritei') {
    // 伍の仲間は伍長として部下になる
    for (const w of A.wu.filter(w => w.alive)) {
      const off = S.genOfficer(c, 'goch', { loc: me.loc });
      off.n = w.n; Object.assign(off, S.splitName(w.n)); off.bu = U.clamp(w.bu, 10, 95); off.tou = U.ri(30, 50); off.bond = Math.max(30, w.bond); off.lord = o.id;
      if (w.tr) off.tr = [w.tr];
      A.subs.push(off.id);
    }
    A.wu = [];
    A.sq = A.sq.filter(s => s.pv);
  }
  if (rk.troops > 0 && nx !== 'kuns') {
    W.fillArmy(S.armyCap(), true);
    // 副官
    if (!A.dep && rk.tier >= 2) { const d = S.makeDeputyCandidates(1)[0]; const off = S.genOfficer(c, D.RANK_ORDER_MIL[Math.max(0, Math.min(6, rk.tier - 2))], { stats: d.stats }); off.n = d.n; off.sei = d.sei; off.mei = d.mei; off.tr = d.tr; off.lord = o.id; off.bond = 20; A.dep = off.id; A.subs.push(off.id); }
    // 新しい隊に隊長を付ける
    for (const s of A.sq) {
      if (!s.ld && !s.pv && s !== A.sq[0] && s.n >= 300 && A.subs.length < 12 && U.ch(0.7)) {
        const l = S.genOfficer(c, D.RANK_ORDER_MIL[Math.max(0, Math.min(7, rk.tier - 3))], { loc: me.loc }); l.lord = o.id; l.bond = 10; s.ld = l.id; A.subs.push(l.id);
      }
    }
  }
  if ((rk.track === 'staff' && rk.tier >= 5) || (rk.track === 'mil' && rk.tier >= 7)) {
    const chi = S.stat(o, 'chi');
    for (const t of D.TACTIC_ORDER) if (!me.tac.includes(t) && D.TACTICS[t].req.chi <= chi - 15) me.tac.push(t);
  }
  if (rk.track === 'staff') A.stg = null;
  // 上官
  S.setupChain(false);
  me.ap = Math.max(me.ap, 0);
  W.gainMerit(0);
  const J = S.jueLand(me.jue, me.jueG || 0);
  if (nx === 'tenka') {
    // 地中海の覇将：諸国が認める
    S.log(`【地中海の覇将】${o.n}の名は地中海の岸のすべてに並ぶ者がない。人は${o.n}を「地中海の覇将」と呼ぶ。`, 'big');
    S.chron(`${o.n}、地中海の覇将と称される。`);
    me.fame = 999;
    await HOOK.fame({ kind: 'tenka', title: '地中海の覇将', seal: '覇将', epithet: '地中海の覇将', name: o.n, lead: `${S.cname(c)}の${o.n}。その武名は諸国に轟き、並ぶ者はもういない。人々は${o.n}をこう呼んだ——`, lines: W.fameLines('tenka', '地中海の覇将') });
    return;
  }
  const lines = [
    `${o.n}を${S.rankLabel()}${nx === 'daij' ? '（' + D.MINISTRIES[me.min].n + '）' : ''}に任ず。`,
    `身分：${S.jueLabel()}　土地${U.num(Math.round(J.ha * 20))}ユゲラ${J.hh ? '・与えられた村' + U.num(J.hh) + '戸' : ''}`,
    rk.troops ? `率いる兵：${U.fmt(S.armyTotal())}${rk.tmax ? `（功績に応じて最大${U.fmt(rk.tmax)}）` : ''}` : '',
  ].filter(Boolean);
  S.log(`【昇進】${rk.name}に任じられた！`, 'big');
  S.chron(`${o.n}、${rk.name}に昇進。`);
  await HOOK.cutin({ kind: 'single', a: o, side: 0, ea: 'joy', title: rk.name, sub: '昇進', snd: 'gong', dur: 1900 });
  await HOOK.info({ title: why || '論功行賞', seal: '昇進', who: G.off[G.cty[c].ruler] && !G.off[G.cty[c].ruler].player ? G.off[G.cty[c].ruler] : null, body: lines.join('\n'), big: true });
};

S.setupChainAfterPromotion = () => S.setupChain(false);

/* ---------- 武名と異名 ---------- */
// 合戦の働きから武名を計算し、異名や「名が轟く」演出を予約する（演出は W.flushFame で）
W.renownFromBattle = (spec, br, won) => {
  const me = G.me, o = S.myOff();
  if (!spec || spec.role === 'watch' || !br || br.meFate === 'dead') return 0;
  const s0 = br.sides?.[0]?.start || 0, s1 = br.sides?.[1]?.start || 0, total = s0 + s1;
  const scale = total >= 200000 ? 4 : total >= 60000 ? 3 : total >= 15000 ? 2.2 : total >= 3000 ? 1.5 : total >= 500 ? 1 : 0.5;
  const kind = spec.ctx?.kind || spec.kind;
  const cmd = !!spec.sides[0]?.cmdAll;
  const slain = br.slainInfo || (br.slainNames || []).map(n => ({ n, hist: false, tier: 3 }));
  const kills = br.meKills || 0, duels = br.duelWins || 0, rear = br.merit?.rearguard || 0;
  const ratio = s1 / Math.max(1, s0);
  let pts = (won ? 5 : 0) + Math.min(25, Math.sqrt(kills) * 0.9) + duels * 12 + rear * 8;
  for (const x of slain) pts += x.hist ? 35 : 3 + (x.tier || 3) * 2;
  if (won && cmd) pts += 8 * U.clamp(ratio, 0.5, 3);
  if (kind === 'bandit') pts *= 0.4;
  pts *= scale;
  if (!won) pts *= 0.35;
  pts = Math.round(pts);
  if (pts <= 0) return 0;
  // 手柄の種類
  const myU = (br.units || []).find(u => u.side === 0 && u.ldId === o.id);
  const ut = myU ? D.UT[myU.t] : null;
  let feat = 'brave';
  if (kind === 'bandit') feat = 'bandit';
  else if (kind === 'nomad') feat = 'nomad';
  else if (duels > 0 && (slain.some(x => x.hist) || duels >= 2)) feat = 'duel';
  else if (slain.length >= 2 || slain.some(x => x.hist)) feat = 'slayer';
  else if (won && spec.kind === 'naval') feat = 'naval';
  else if (won && ratio >= 1.6) feat = 'few';
  else if (won && spec.kind === 'siege' && spec.city === 1) feat = 'siege';
  else if (won && (spec.kind === 'siege' || spec.kind === 'pass') && spec.city === 0) feat = 'wall';
  else if (won && spec.kind === 'urban') feat = spec.urbanDef === 0 ? 'wall' : 'siege';
  else if (rear > 0) feat = 'rear';
  else if (won && cmd && total >= 40000) feat = 'big';
  else if (ut && ut.cls === 'cav') feat = 'cav';
  else if (ut && ut.cls === 'rng') feat = 'arch';
  else if (duels > 0) feat = 'duel';
  me.feats = me.feats || {}; me.feats[feat] = (me.feats[feat] || 0) + 1;
  const lv0 = S.renownLv();
  me.renown = (me.renown || 0) + pts;
  if (pts >= 5) S.log(`武名 +${U.num(pts)}（${spec.title}）`, 'good');
  me.fame = Math.min(999, me.fame + pts / 10);
  const lv1 = S.renownLv();
  me.fameQ = me.fameQ || [];
  // 異名：大きな戦での目立つ手柄で、今の異名の手柄を大きく上回るとき
  const best = U.maxBy(me.epi || [], x => x.pts || 0);
  const notable = won && pts >= 40 && (total >= 8000 || slain.some(x => x.hist) || duels > 0);
  if (notable && (!best || pts >= (best.pts || 0) * 1.6)) me.fameQ.push({ k: 'epithet', feat, pts, title: spec.title, pid: spec.pid });
  if (lv1 > lv0) me.fameQ.push({ k: 'renown', lv: lv1, feat });
  return pts;
};
// 異名を作る。一度使ったひな形（「〇〇の猛虎」など）は場所が違っても使わない
W.makeEpithet = (feat, pid) => {
  const me = G.me, o = S.myOff();
  const place = pid && S.P[pid] ? S.P[pid].name : S.cname(o.c);
  const have = new Set((me.epi || []).map(x => x.n)), usedT = new Set((me.epi || []).map(x => x.tpl).filter(Boolean));
  const mei = o.mei || o.n.slice(1) || o.n;
  const make = (t) => ({ tpl: t, n: t.replace('{p}', place).replace('{c}', S.cname(o.c)).replace('{m}', mei) });
  for (const f of [feat, 'big', 'brave', ...Object.keys(D.EPITHET)]) {
    const T = D.EPITHET[f]; if (!T) continue;
    const cands = T.t.filter(t => !usedT.has(t)).map(make).filter(x => !have.has(x.n));
    if (cands.length) return U.pick(cands);
  }
  return null;
};
// 七国の反応（演出用）。同じ言い回しが続かないように、言葉の山から順に配る
D.FAME_SAY = DATA_JSON.lines.fame;   // data/lines.json
W.fameLines = (kind, ep) => {
  const o = S.myOff(), my = o.c, nm = ep ? `「${ep}」` : o.n;
  const pools = {};
  const say = (k) => { const P = pools[k] || (pools[k] = U.shuffle(D.FAME_SAY[k].slice())); const t = P.shift() || U.pick(D.FAME_SAY[k]); return t.replace(/\{nm\}/g, nm).replace(/\{name\}/g, o.n); };
  const T = kind === 'tenka';
  const out = [];
  for (const c of D.CORDER) {
    const cc = G.cty[c]; if (!cc || !cc.alive) continue;
    const k = c === my ? (T ? 'tenkaOwn' : 'own') : S.atWar(my, c) ? (T ? 'tenkaWar' : 'war') : (T ? 'tenkaOther' : 'other');
    out.push({ c, s: say(k) });
  }
  // 名のある他国の将のひとこと
  const foes = Object.values(G.off).filter(x => x.alive && x.hist && !x.ret && !x.player && x.c !== my && G.cty[x.c]?.alive && ['dais', 'shog', 'kuns', 'josh', 'gunshi'].includes(x.r));
  for (const x of U.shuffle(foes.slice()).slice(0, kind === 'epithet' ? 1 : 2)) out.push({ c: x.c, who: x.n, s: say('quote') });
  return out;
};
W.giveEpithet = async (f) => {
  const me = G.me, o = S.myOff();
  const e = W.makeEpithet(f.feat, f.pid); if (!e) return;
  const n = e.n;
  me.epi = me.epi || [];
  me.epi.push({ n, tpl: e.tpl, k: f.feat, pts: f.pts, d: S.dateStr(), why: `${f.title}で${D.EPITHET[f.feat]?.n || '活躍'}` });
  me.epiSel = null;
  me.fame = Math.min(999, me.fame + 15);
  S.log(`【異名】${o.n}は「${n}」と呼ばれるようになった。`, 'big');
  S.chron(`${o.n}、${f.title}の働きで「${n}」と呼ばれる。`);
  await HOOK.fame({ kind: 'epithet', title: '異名', seal: '異名', epithet: n, name: o.n, lead: `${f.title}での働きにより、人々は${o.n}をこう呼ぶようになった。`, lines: W.fameLines('epithet', n) });
};
W.renownUp = async (f) => {
  const me = G.me, o = S.myOff();
  // 名が知れ渡ったのに異名がなければ、これまでの手柄から付く
  if (f.lv >= 2 && !(me.epi || []).length) {
    const feat = U.maxBy(Object.keys(me.feats || {}), k => me.feats[k]) || f.feat || 'brave';
    const e = W.makeEpithet(feat, null);
    if (e) { me.epi = [{ n: e.n, tpl: e.tpl, k: feat, pts: 0, d: S.dateStr(), why: `数々の手柄（${D.EPITHET[feat]?.n || '戦'}）` }]; S.chron(`${o.n}、「${e.n}」と呼ばれる。`); }
  }
  const ep = S.epithet(), R = D.RENOWN[f.lv];
  const who = ep ? `「${ep}」${o.n}` : o.n;
  const msg = R.say.replace('{n}', who).replace('{c}', S.cname(o.c));
  S.log(`【武名】${msg}`, 'big');
  if (f.lv >= 3) S.chron(msg);
  if (f.lv >= 2) await HOOK.fame({ kind: 'renown', lv: f.lv, title: f.lv >= 4 ? R.n : `武名　${R.n}`, seal: '武名', epithet: ep, name: o.n, lead: msg, note: `合戦では味方の士気+${f.lv}・敵の士気−${Math.round(f.lv * 1.5)}。主人公の隊は近くの敵を威圧する。`, lines: f.lv >= 3 ? W.fameLines('renown', ep) : [] });
};
W.flushFame = async () => {
  const me = G.me; if (!me || !me.fameQ || !me.fameQ.length) return;
  const q = me.fameQ; me.fameQ = [];
  for (const f of q) {
    if (G.over) break;
    if (f.k === 'epithet') await W.giveEpithet(f);
    else if (f.k === 'renown') await W.renownUp(f);
  }
};

/* ---------- 経験による特性の会得 ---------- */
W.learn = (c, n = 1, quiet = false) => {
  const me = G.me, o = S.myOff();
  me.tx = me.tx || {};
  me.tx[c] = (me.tx[c] || 0) + n;
  const L = D.LEARN.find(x => x.c === c); if (!L) return null;
  let got = null;
  for (let i = L.ids.length - 1; i >= 0; i--) {
    if (me.tx[c] < L.th[i]) continue;
    const id = L.ids[i];
    if (o.tr.includes(id)) break;
    // 下位の段階は置き換える
    o.tr = o.tr.filter(t => !L.ids.slice(0, i).includes(t));
    if (o.tr.some(t => L.ids.slice(i + 1).includes(t))) break;
    o.tr.push(id); got = id;
    break;
  }
  if (got && !quiet) { S.log(`経験を積み、特性「${D.TRAITS[got].n}」を会得した！（${D.TRAITS[got].d}）`, 'big'); G.flags.newTrait = (G.flags.newTrait || []).concat(got); }
  return got;
};
W.learnFromBattle = (spec, br, won) => {
  const tx = br.tx || {};
  const theme = spec.theme;
  if (['forest', 'hill', 'mount', 'marsh', 'river', 'plain', 'steppe'].includes(theme)) W.learn(theme === 'river' ? 'river' : theme);
  if (spec.kind === 'siege' || spec.kind === 'pass') W.learn(spec.city === 0 ? 'siegeD' : 'siegeA');
  if (spec.kind === 'pass') W.learn('pass');
  if (spec.weather && ['rain', 'fog', 'snow'].includes(spec.weather)) W.learn(spec.weather);
  for (const k in tx) if (tx[k] > 0) W.learn(k, tx[k]);
  if (won) W.learn('win');
  if (won && spec.sides[0] && spec.sides[0].c && spec.kind !== 'siege' && br.sides && br.sides[0].start < br.sides[1].start) W.learn('hold');
  if (won && spec.ctx && spec.ctx.kind === 'bandit') W.learn('bandit');
  if (won && spec.ctx && spec.ctx.kind === 'nomad') W.learn('nomad');
  const me = br.units.find(u => u.me);
  if (spec.kind === 'naval') W.learn('river');   // 海の上の戦いも水の戦い
  const mt = me && (me.land || me.t);
  if (mt) { const key = { inf: 'u_inf', spear: 'u_spear', heavy: 'u_heavy', arch: 'u_arch', xbow: 'u_xbow', lcav: 'u_lcav', hcav: 'u_hcav', harch: 'u_harch', chariot: 'u_chariot', militia: 'u_militia', guard: 'u_inf', shield: 'u_inf', mount: 'u_inf', phal: 'u_phal', velite: 'u_velite', sling: 'u_sling', eleph: 'u_eleph', cataph: 'u_cataph', warb: 'u_warb' }[mt]; if (key) W.learn(key); }
};

/* ---------- 経済 ---------- */
W.playerEconomy = () => {
  const me = G.me, o = S.myOff(), L = me.land;
  const rk = D.RANKS[me.rank];
  const lines = [];
  const pay = S.pay();
  let gold = pay, food = 0;
  const taxMul = [0.75, 1, 1.3][L.tax];
  const goldLand = (L.hh * 32 + L.ha * 28) * taxMul * (1 + 0.3 * L.fac.market + 0.12 * (L.fac.brewery || 0)) * S.fxm(o, 'gold');
  const foodLand = (L.ha * 12.5 + L.hh * 0.6) * taxMul * (1 + 0.3 * L.fac.farm) * (G.month === 9 ? 3 : 0.8) * S.fxm(o, 'food');
  gold += goldLand; food += foodLand;
  if (me.jur) { const j = me.jur; const perk = j.hh * (0.3 + j.comm / 100) * 0.4 * (D.JUR[me.rank]?.perk ?? 1) * S.fxm(o, 'gold'); gold += perk; }
  if (me.rank === 'kuns') { gold += S.myCty().gold * 0.004; }
  // 私兵の維持
  const pv = U.sum(me.army.sq.filter(s => s.pv), s => s.n);
  const upk = pv * 2.5 * Math.max(0.3, 1 - S.fx(o, 'upkeep') - 0.08 * (L.fac.granary || 0));
  food -= upk; gold -= pv * 15;
  me.gold = Math.round(me.gold + gold);
  me.food = Math.round(me.food + food);
  lines.push(`収入 金${U.fmt(gold + pv * 15)}（俸禄${U.fmt(pay)}・領地${U.fmt(goldLand)}）／兵糧${food >= 0 ? '+' : ''}${U.fmt(food)}袋`);
  if (me.food < 0) {
    const lost = Math.ceil(pv * 0.15);
    for (const s of me.army.sq.filter(s => s.pv)) s.n = Math.max(0, s.n - Math.ceil(s.n * 0.15));
    me.food = 0;
    lines.push(`兵糧が尽き、私兵${lost}人が逃げ出した。`);
  }
  if (me.gold < 0) me.gold = 0;
  // 私領：建設
  for (const b of L.build) { b.left--; if (b.left <= 0) { L.fac[b.f] = Math.min(5, (L.fac[b.f] || 0) + 1); lines.push(`${D.FAC[b.f].n}がLv${L.fac[b.f]}になった。`); } }
  L.build = L.build.filter(b => b.left > 0);
  // 私兵の自然増
  const cap = S.pvCap(); const have = pv;
  if (cap > have && (L.fac.barracks > 0 || L.hh > 0)) {
    const add = Math.min(cap - have, Math.round(2 + L.fac.barracks * 6 + L.hh * 0.004));
    if (add > 0) {
      let sq = me.army.sq.find(s => s.pv && s.t === 'inf' && !s.ld) || me.army.sq.find(s => s.pv && s.t === 'inf');
      if (!sq) { sq = S.newSquad('inf', 0, { pv: true, tr: 25 }); me.army.sq.push(sq); }
      sq.tr = Math.round((sq.tr * sq.n + 25 * add) / (sq.n + add)); sq.n += add; sq.max = Math.max(sq.max, sq.n);
      lines.push(`私兵が${add}人集まった（私兵 ${U.num(have + add)}／上限${U.num(cap)}）。`);
    }
  }
  // 私領の治安・民心
  L.order = U.clamp(L.order + U.rf(-1.5, 1) + L.fac.wall * 0.3 + (L.fac.tower || 0) * 0.25 + (L.fac.shrine || 0) * 0.15 - (L.tax === 2 ? 1 : 0), 10, 100);
  L.loyal = U.clamp(L.loyal + (L.tax === 0 ? 1.2 : L.tax === 2 ? -1.6 : 0.2) + (L.fac.shrine || 0) * 0.35 + U.rf(-0.8, 0.8), 5, 100);
  // 医舎：傷の治りが早い
  if (me.inj > 0 && (L.fac.clinic || 0) > 0 && U.ch(0.2 * L.fac.clinic)) me.inj = Math.max(0, me.inj - 1);
  // 国軍分の補充（徐々に）
  const cc = S.myCty();
  for (const s of me.army.sq.filter(s => !s.pv)) {
    if (s.n < s.max && s.t !== 'militia') {
      const add = Math.ceil((s.max - s.n) * 0.18);
      s.tr = Math.round((s.tr * s.n + 22 * add) / Math.max(1, s.n + add)); s.n += add;
    }
  }
  S.tidyArmy();
  // 伍の負傷回復
  for (const w of me.army.wu) if (w.alive) w.hp = Math.min(100, w.hp + 25);
  if (me.inj > 0) { me.inj--; if (!me.inj) lines.push('傷が癒えた。'); }
  return lines;
};

W.countryEconomy = (c) => {
  const cc = G.cty[c]; const ps = S.ownedProvs(c);
  if (!ps.length) return;
  const harvest = G.month === 9 ? 4.5 : G.month === 10 ? 1.6 : 0.55;
  let gold = 0, food = 0;
  const qi = (D.COUNTRIES[c] && D.COUNTRIES[c].bonus && D.COUNTRIES[c].bonus.comm) || 1;
  // 郡の実りは、拠点を持つ割合で分け合う（敵に奪われた県や郷の分は入らない）
  for (const p of Object.values(G.prov)) {
    const sh = S.shareOf(p, c); if (sh <= 0) continue;
    const persons = p.pop * 10000 * sh;
    gold += persons * 12 * (0.3 + p.comm / 100) * (cc.tax / 0.15) * S.lawMul(c, 'comm') * S.lawMul(c, 'gold') * qi * (0.6 + p.order / 250);
    food += persons * 2.5 * (0.5 + p.agri / 100) * 0.1 * harvest * S.lawMul(c, 'agri');
  }
  if (c !== S.myOff().c && typeof PPL !== 'undefined') { const dm = PPL.diff().aiIncome; gold *= dm; food *= dm; }
  const troops = U.sum(ps, p => p.troops) + S.garrisonOf(c);
  food -= troops * 2.5 * S.lawMul(c, 'upkeep');
  gold -= troops * 14 + S.officersOf(c).length * 9000;
  cc.gold = Math.round(cc.gold + gold);
  cc.food = Math.round(cc.food + food);
  // 兵糧が乏しくなれば、国庫の金で買い入れる（四か月分を目安に）
  const need = troops * 2.5 * S.lawMul(c, 'upkeep') * 4 - cc.food;
  if (need > 0 && cc.gold > 0) { const price = 25, buy = Math.min(need, cc.gold * 0.3 / price); cc.food = Math.round(cc.food + buy); cc.gold = Math.round(cc.gold - buy * price); }
  if (cc.food < 0) {
    for (const p of ps) { p.troops = Math.round(p.troops * 0.97); p.loyal = Math.max(5, p.loyal - 2); }
    cc.food = 0;
    if (c === S.myOff().c) S.log('国の兵糧が尽き、兵が逃げ出している！', 'bad');
  }
  if (cc.gold < 0) { cc.gold = 0; for (const o of S.officersOf(c)) o.loy = Math.max(10, o.loy - 1); }
};

W.develop = (c) => {
  const cc = G.cty[c]; const ps = S.ownedProvs(c);
  const pol = cc.policy;
  const lawOrder = S.lawAdd(c, 'order'), lawLoyal = S.lawAdd(c, 'loyal');
  const dev = S.lawMul(c, 'dev');
  for (const p of ps) {
    const gov = G.off[p.gov];
    const gp = gov && gov.alive ? gov.pol : 50;
    const gv = gov && gov.alive ? gov : null;
    const isPlayerJur = G.me.jur && G.me.jur.lv === 'jun' && G.me.jur.prov === p.id && !D.JUR[G.me.rank]?.deputy;
    const k = (isPlayerJur ? 0.25 : 1) * (gp / 70) * dev * (pol === 'develop' ? 1.6 : 1) * (cc.gold > 0 ? 1 : 0.3);
    p.agri = Math.min(100, p.agri + 0.22 * k * S.fxm(gv, 'agri') * (c === 'ptol' ? 1.12 : 1) * (S.lawOn(c, 'junou') ? 1.08 : 1) * Math.max(0.1, 1 - p.agri / 110));
    p.comm = Math.min(100, p.comm + 0.18 * k * S.fxm(gv, 'comm') * Math.max(0.1, 1 - p.comm / 110));
    const fs = S.foreignShare(p, true);
    const tOrder = 58 + lawOrder + (pol === 'order' ? 10 : 0) + S.fx(gv, 'order') * 12 - (cc.weary || 0) * 12 - fs * 25;
    const tLoyal = 60 + lawLoyal - (cc.tax - 0.15) * 120 + S.fx(gv, 'loyal') * 12 - fs * 15;
    p.order = U.clamp(p.order + (tOrder - p.order) * 0.05 + U.rf(-1, 1), 5, 100);
    p.loyal = U.clamp(p.loyal + (tLoyal - p.loyal) * 0.04 + U.rf(-1, 1), 5, 100);
    p.wall = Math.min(100, p.wall + (S.P[p.id].pass ? 0.3 : 0.08) * (pol === 'military' ? 2 : 1));
    // 人口
    const grow = 0.0007 * (p.loyal / 60) * S.lawMul(c, 'grow') * (cc.food > 0 ? 1 : -1);
    p.pop = Math.max(1, p.pop * (1 + grow));
    // 徴兵
    const persons = p.pop * 10000 * (1 - S.foreignShare(p));
    const allOut = ps.length <= 2 ? 1.25 : 1; // 存亡の危機：総動員
    const cap = persons * 0.075 * S.lawMul(c, 'recruit') * (pol === 'military' ? 1.1 : 1) * (S.P[p.id].pass ? 3 : 1) * allOut;
    if (p.troops < cap && cc.food > U.sum(ps, q => q.troops) * 3 && cc.gold > 0) {
      const add = Math.min(cap - p.troops, persons * 0.0032 * (p.loyal / 80) * S.lawMul(c, 'recruit') * (pol === 'military' ? 1.5 : 1) * allOut);
      p.troops = Math.round(p.troops + add);
      cc.gold -= add * 25;
    }
  }
  // 兵の再配置：内地 → 前線
  const front = ps.filter(p => S.adj(p.id).some(q => G.prov[q].o !== c && S.atWar(c, G.prov[q].o)));
  if (front.length) {
    const inner = ps.filter(p => !front.includes(p) && !S.P[p.id].cap);
    for (const p of inner) {
      const mv = Math.round(p.troops * 0.06);
      if (mv > 100) { p.troops -= mv; U.pick(front).troops += mv; }
    }
  }
};

/* ---------- 外交AI ---------- */
W.diplomacyAI = async () => {
  const me = G.me, myC = S.myOff().c;
  const alive = D.CORDER.filter(c => G.cty[c].alive);
  for (let i = 0; i < alive.length; i++) for (let j = i + 1; j < alive.length; j++) {
    const a = alive[i], b = alive[j], d = S.dip(a, b);
    if (d.t > 0) { d.t--; if (d.t === 0 && (d.st === 'truce' || d.st === 'ally')) { d.st = 'peace'; S.log(`${S.cname(a)}と${S.cname(b)}の${d.st === 'ally' ? '同盟' : '停戦'}期間が終わった。`); } }
    if (d.st === 'war') d.rel = Math.max(-100, d.rel - 0.6);
    else d.rel += (0 - d.rel) * 0.02;
    const neighbors = S.ownedProvs(a).some(p => S.adj(p.id).some(q => G.prov[q].o === b));
    const playerDecides = (myC === a || myC === b) && S.isTop();
    // 宣戦
    if (d.st === 'peace' && neighbors) {
      for (const [x, y] of [[a, b], [b, a]]) {
        const ratio = S.countryPower(x) / Math.max(1, S.countryPower(y));
        // 史実でまだ倒れていない国には、強い国も軽々しく攻めない
        const far = W.histOn() && D.HIST_FALL[y] && G.year < D.HIST_FALL[y] - 8 ? 0.35 : 1;
        if (ratio > 1.35 && d.rel < -25 && U.ch(G.cty[x].aggr * 0.05 * far)) {
          if (playerDecides && x === myC) continue;
          W.declareWar(x, y);
          break;
        }
      }
    }
    // 講和（史実でまだ倒れていない国が大きく負けたら、賠償金を払って長い和を結ぶ。ザマのあとのカルタゴ、キュノスケファライのあとのマケドニアのように）
    if (d.st === 'war' && !playerDecides && W.histOn() && (d.since || 0) < G.turn - 24) {
      const pa = S.countryPower(a), pb = S.countryPower(b);
      const weaker = pa < pb ? a : b, stronger = weaker === a ? b : a;
      const fy = D.HIST_FALL[weaker], start = D.PROVINCES.filter(p => p.o === weaker).length, now = S.ownedProvs(weaker).length;
      const off = W.offensive(stronger);
      if (fy && G.year < fy - 8 && now <= start * (off && off.c === weaker ? 0.4 : 0.6) && S.countryPower(stronger) > S.countryPower(weaker) * 1.4 && U.ch(0.05)) {
        if (off && off.c === weaker) G.flags.offensive = null;   // 大攻勢も講和で終わる
        const pay = Math.round(G.cty[weaker].gold * 0.3);
        d.st = 'truce'; d.t = 36; d.rel = Math.max(d.rel, -10); G.cty[weaker].gold -= pay; G.cty[stronger].gold += pay;
        S.log(`${S.cname(weaker)}は${S.cname(stronger)}に賠償金 金${U.fmt(pay)}を払い、講和した。`, myC === a || myC === b ? 'big' : 'info');
        S.chron(`${S.cname(weaker)}、${S.cname(stronger)}と講和。`);
        continue;
      }
    }
    // 停戦
    if (d.st === 'war' && (d.since || 0) < G.turn - 10 && U.ch(0.035)) {
      const pa = S.countryPower(a), pb = S.countryPower(b);
      const weaker = pa < pb ? a : b, stronger = weaker === a ? b : a;
      if (playerDecides) {
        if (weaker !== myC && S.countryPower(stronger) < S.countryPower(weaker) * 2.2) {
          const gift = Math.round(G.cty[weaker].gold * 0.08);
          const ok = await HOOK.choose({ title: `${S.cname(weaker)}から停戦の申し入れ`, body: `${S.cname(weaker)}の使者が来た。「金${U.fmt(gift)}を献じます。一年の停戦を」`, choices: [{ v: 1, label: '受け入れる' }, { v: 0, label: '突っぱねる' }] });
          if (ok) { d.st = 'truce'; d.t = 12; d.rel += 20; G.cty[weaker].gold -= gift; G.cty[myC].gold += gift; S.log(`${S.cname(weaker)}と停戦した。`, 'good'); }
        }
      } else if (S.countryPower(stronger) < S.countryPower(weaker) * 2.2) { d.st = 'truce'; d.t = 12; d.rel += 15; S.log(`${S.cname(a)}と${S.cname(b)}が停戦した。`); }
    }
    // 同盟（共通の敵）
    if (d.st === 'peace' && d.rel > 15) {
      const common = alive.find(c => c !== a && c !== b && S.atWar(a, c) && S.atWar(b, c));
      if (common && U.ch(0.03)) {
        if (playerDecides) {
          const other = a === myC ? b : a;
          const ok = await HOOK.choose({ title: `${S.cname(other)}から同盟の申し入れ`, body: `「共に${S.cname(common)}を討ちましょう」`, choices: [{ v: 1, label: '同盟する（2年）' }, { v: 0, label: '断る' }] });
          if (ok) { d.st = 'ally'; d.t = 24; d.rel += 15; S.log(`${S.cname(other)}と同盟を結んだ。`, 'good'); }
        } else { d.st = 'ally'; d.t = 24; d.rel += 10; S.log(`${S.cname(a)}と${S.cname(b)}が同盟を結んだ。`); }
      }
    }
  }
};
W.declareWar = (a, b) => {
  const d = S.dip(a, b); d.st = 'war'; d.t = 0; d.rel = Math.min(d.rel, -50); d.since = G.turn;
  S.log(`${S.cname(a)}が${S.cname(b)}に宣戦布告した！`, 'bad');
  S.chron(`${S.cname(a)}、${S.cname(b)}に宣戦。`);
  // 同盟国は参戦
  for (const c of D.CORDER) if (G.cty[c].alive && c !== a && c !== b && S.dip(b, c).st === 'ally' && S.dip(a, c).st !== 'ally') { const dd = S.dip(a, c); if (dd.st !== 'war') { dd.st = 'war'; dd.since = G.turn; dd.rel = Math.min(dd.rel, -40); S.log(`${S.cname(c)}は同盟国${S.cname(b)}のため${S.cname(a)}と開戦した。`); } }
};

/* ---------- 戦争AI ---------- */
// 存亡の危機：郡を失い、残り2郡以下になった国は総力で守る
W.lastStand = (c) => { if (!c || !G.cty[c] || !G.cty[c].alive) return false; const n = S.ownedProvs(c).length; return n <= 2 && n < D.PROVINCES.filter(p => p.o === c).length; };
// 史実の流れ：史実で国が滅んだ年より前は、その国の都は落ちにくい（主人公が指揮する遠征には効かない）
// 史実で国が倒れた年（それより前は都が落ちにくい）
D.HIST_FALL = { syra: -212, mace: -168, carth: -146, numi: -46, sele: -64, ptol: -30, rome: 476 };
W.histOn = () => !(G.custom && G.custom.hist === false);
W.isCapOf = (pid) => { const o = G.prov[pid].o; return !!(S.P[pid].cap || (G.cty[o] && pid === G.cty[o].capOverride)); };
W.histMul = (pid) => {
  if (!W.histOn()) return 1;
  const fy = D.HIST_FALL[G.prov[pid].o]; if (!fy) return 1;
  const early = fy - G.year; if (early <= 0) return 1;
  // 都は史実で落ちた年より前にはまず落ちない。ほかの州も少しだけ守りが固い。残り二州以下まで追い詰められた国はさらに粘る
  const last = S.ownedProvs(G.prov[pid].o).length <= 2 && early > 8 ? 1.4 : 1;
  return (W.isCapOf(pid) ? 1 + Math.min(2.4, early * 0.12) : 1 + Math.min(0.35, early * 0.015)) * last;
};
W.fortMul = (pid, player) => { const p = G.prov[pid]; return (S.P[pid].pass ? 2.6 : 1) * (1 + p.wall / 160) * (W.isCapOf(pid) ? 1.25 : 1) * (W.lastStand(p.o) ? 1.15 : 1) * (player ? 1 : W.histMul(pid)); };
// 史実の大攻勢：その年、攻め手の国は総力を挙げて一国を攻める（a: 攻め手, c: 目標）
D.HIST_OFF = [
  // 第一次ポエニ戦争（前264年の物語）
  { a: 'rome', c: 'carth', y: -262, m: 4, title: 'シキリア攻め', text: 'ローマ軍がシキリアへ渡り、カルタゴの側についた町々を次々に攻める。' },
  { a: 'rome', c: 'carth', y: -256, m: 5, title: 'レグルスのアフリカ遠征', text: '執政官レグルスの艦隊が、カルタゴの本国アフリカをめざして海を渡る。' },
  { a: 'rome', c: 'carth', y: -250, m: 4, title: 'リリュバエウム包囲', text: 'ローマ軍が、シキリア西の端に残るカルタゴの要塞を陸と海から囲む。' },
  // 第二次ポエニ戦争とマケドニア・シリアの戦争
  { a: 'carth', c: 'rome', y: -218, m: 5, title: 'ハンニバルのイタリア遠征', text: 'ハンニバルが戦象と大軍を率いてヒスパニアを発ち、ピュレネとアルペスを越えてイタリアへ向かう。' },
  { a: 'sele', c: 'ptol', y: -217, m: 4, title: 'ラフィアへの進軍', text: 'アンティオコス三世がコイレ・シリアを奪おうと、戦象を連れてエジプトの門へ迫る。' },
  { a: 'mace', c: 'rome', y: -214, m: 4, title: '第一次マケドニア戦争', text: 'ハンニバルと結んだフィリッポス五世が、アドリア海を渡ってイリュリアのローマの拠点を襲う。' },
  { a: 'rome', c: 'syra', y: -213, m: 4, title: 'シュラクサイ攻め', text: 'マルケッルスがシュラクサイを陸と海から囲んだ。アルキメデスの兵器が待ち受ける。' },
  { a: 'rome', c: 'carth', y: -210, m: 4, title: 'スキピオのヒスパニア遠征', text: '若きスキピオがヒスパニアへ渡り、カルタゴ・ノウァを狙う。' },
  { a: 'rome', c: 'carth', y: -204, m: 4, title: 'スキピオのアフリカ遠征', text: 'スキピオがシキリアから大艦隊でアフリカへ渡った。カルタゴの喉元を突く。' },
  { a: 'sele', c: 'ptol', y: -202, m: 4, title: '第五次シリア戦争', text: 'アンティオコス大王が、幼い王のエジプトからコイレ・シリアを奪いに攻め入った。' },
  { a: 'rome', c: 'mace', y: -200, m: 4, title: '第二次マケドニア戦争', text: 'ローマがマケドニアのフィリッポス五世に宣戦し、ギリシアへ軍団を送る。' },
  { a: 'rome', c: 'mace', y: -198, m: 4, title: 'フラミニヌスの進軍', text: '若い執政官フラミニヌスが、アオオス川の谷を抜けてテッサリアへ迫る。' },
  { a: 'rome', c: 'sele', y: -191, m: 3, title: 'アンティオコス戦争', text: 'ローマ軍がギリシアに上陸したアンティオコス大王を迎え撃ち、アジアへ攻め入る。' },
  { a: 'rome', c: 'sele', y: -190, m: 6, title: 'スキピオ兄弟のアジア渡海', text: 'ルキウス・スキピオと兄のアフリカヌスがヘレスポントスを渡り、アジアへ攻め入る。' },
  { a: 'rome', c: 'mace', y: -171, m: 4, title: '第三次マケドニア戦争', text: 'ローマがペルセウス王のマケドニアへ攻め入った。' },
  { a: 'sele', c: 'ptol', y: -170, m: 4, title: '第六次シリア戦争', text: 'アンティオコス四世がペルシオンを破り、エジプトへ攻め入った。' },
  { a: 'rome', c: 'mace', y: -168, m: 3, title: 'パウルスの出陣', text: 'アエミリウス・パウルスが軍を鍛え直し、ペルセウスの守るオリュンポスの峠へ向かう。' },
  { a: 'rome', c: 'carth', y: -149, m: 4, title: '第三次ポエニ戦争', text: 'ローマがカルタゴを滅ぼすと決め、アフリカへ大軍を送る。' },
];
// 史実の年を過ぎたあと、大攻勢をかけ続ける国
W.HEGEMON = 'rome';
// 目標国以外の交戦国と接していない州
W.safeProvs = (c, tgtC) => S.ownedProvs(c).filter(p => !S.adj(p.id).some(q => { const o = G.prov[q].o; return o !== c && o !== tgtC && S.atWar(c, o); }));
W.offensive = (c) => { const o = G.flags.offensive; return o && (o.a || W.HEGEMON) === c && G.turn <= o.until && G.cty[c] && G.cty[c].alive && G.cty[o.c] && G.cty[o.c].alive ? o : null; };
W.histOffensive = async () => {
  if (!W.histOn()) return;
  let h = D.HIST_OFF.find(x => x.y === G.year && x.m === G.month && G.cty[x.a] && G.cty[x.a].alive && G.cty[x.c] && G.cty[x.c].alive);
  // 史実の年を過ぎても残る国へは、覇権国が一年半ほどおきに大攻勢をかける
  const H = W.HEGEMON;
  if (!h && G.year >= -190 && G.month === 4 && G.cty[H] && G.cty[H].alive && !W.offensive(H) && G.turn - (G.flags.lastOff || 0) >= 30) {
    // 同盟国・休戦中の国は攻めない。史実で倒れた年よりずっと前の国も（友邦のヌミディアやエジプトをいきなり滅ぼさない）
    const cands = D.CORDER.filter(c => c !== H && G.cty[c].alive && !['ally', 'truce'].includes(S.dip(H, c).st) && !(D.HIST_FALL[c] && G.year < D.HIST_FALL[c] - 12) && S.ownedProvs(H).some(p => S.adj(p.id).some(q => G.prov[q].o === c)));
    const t = U.minBy(cands, c => S.countryPower(c));
    if (t) h = { a: H, c: t, title: `${S.cname(H)}の${S.cname(t)}攻め`, text: `${S.cname(H)}が総力を挙げて${S.cname(t)}へ攻め入った。` };
  }
  if (!h) return;
  const A = h.a, myC = S.myOff().c;
  if (myC === A && S.isTop()) return; // 君主・宰相なら自分で決める
  if (!S.atWar(A, h.c)) W.declareWar(A, h.c);
  G.flags.offensive = { a: A, c: h.c, until: G.turn + 14, title: h.title }; G.flags.lastOff = G.turn;
  // 動員：他の敵と接していない州から兵を集め、目標国と接する州へ（海を挟む州も足場になる）
  const stage = S.ownedProvs(A).filter(p => S.adj(p.id).some(q => G.prov[q].o === h.c));
  if (stage.length) {
    let pool = 0;
    for (const p of W.safeProvs(A, h.c)) if (!stage.includes(p)) { const mv = Math.round(p.troops * 0.35); p.troops -= mv; pool += mv; }
    for (const p of stage) p.troops += Math.round(pool / stage.length);
  }
  S.log(`【${h.title}】${h.text}`, 'big'); S.chron(h.text);
  if (myC === h.c) await HOOK.info({ title: h.title, seal: '国難', body: `${h.text}
${S.cname(A)}はこれから一年あまり、総力を挙げて${S.cname(h.c)}を攻める。` });
  else if (myC === A && S.isMil()) await HOOK.info({ title: h.title, seal: '出陣', body: `${h.text}
${S.cname(A)}は総力を挙げて${S.cname(h.c)}を攻める。戦功を立てる好機だ。` });
};
// 名の轟いた主人公が守る郡は、敵が攻めるのをためらう（攻めの見込みを低く見積もる）
W.renownFear = (pid) => {
  const me = G.me; if (!me || !S.isMilLike() || me.loc !== pid || G.prov[pid].o !== S.myOff().c) return 1;
  const lv = S.renownLv();
  return lv >= 3 ? 1 + 0.25 * (lv - 2) : 1;
};
W.campaignPlans = (c, all) => {
  const plans = [];
  for (const src of S.ownedProvs(c)) {
    for (const q of S.adj(src.id)) {
      const tgt = G.prov[q];
      if (tgt.o === c || !S.atWar(c, tgt.o) || tgt.besieged) continue;
      const atk = src.troops * 0.68;
      if (atk < 3000 && !all) continue;
      const def = tgt.troops * W.fortMul(q) * W.renownFear(q) * W.isolation(q);
      const odds = atk / Math.max(1, def);
      plans.push({ src: src.id, tgt: q, atk: Math.round(atk), def: tgt.troops, odds });
    }
  }
  return plans.sort((a, b) => b.odds - a.odds);
};
W.warAI = () => {
  const camps = [];
  const myC = S.myOff().c;
  for (const c of U.shuffle(D.CORDER.filter(c => G.cty[c].alive))) {
    if (c === myC && S.isTop()) continue; // 君主・丞相は自分で決める
    const cc = G.cty[c];
    const off = W.offensive(c);
    if (off) {
      // 大攻勢：目標国の郡だけを狙い、他の郡から兵を集める（都とその周りを優先）
      const op = W.campaignPlans(c, true).filter(pl => G.prov[pl.tgt].o === off.c);
      if (op.length) {
        const cap = W.capital(off.c);
        const best = U.maxBy(op, pl => pl.odds + (pl.tgt === cap ? 0.6 : S.adj(pl.tgt).includes(cap) ? 0.3 : 0));
        const src = G.prov[best.src];
        for (const p of W.safeProvs(c, off.c)) if (p.id !== best.src && !S.adj(p.id).some(q => G.prov[q].o === off.c)) { const mv = Math.round(p.troops * 0.08); p.troops -= mv; src.troops += mv; }
        best.atk = Math.round(src.troops * 0.72);
        best.odds = best.atk / Math.max(1, G.prov[best.tgt].troops * W.fortMul(best.tgt));
        if (best.odds > 0.75 && U.ch(0.8)) { camps.push(W.makeCampaign(c, best)); continue; }
      }
    }
    if (cc.food < S.countryTroops(c) * 2) continue;
    const plans = W.campaignPlans(c);
    if (!plans.length) continue;
    const best = plans[0];
    const wr = cc.weary || 0;
    const ag = typeof PPL !== 'undefined' ? PPL.aggrOf(W.pickCommander(c, best.src)) : 1;
    const sea = (W.isWinter && W.isWinter() ? 0.45 : 1) * (W.isRainy && W.isRainy() && ['river', 'marsh'].includes(S.P[best.tgt].t) ? 0.4 : 1);
    const thr = ((cc.policy === 'expand' ? 1.05 : 1.3) + wr * 0.6) / ag;
    const p = cc.aggr * (cc.policy === 'expand' ? 0.75 : 0.42) * (1 - wr * 0.7) * ag * sea;
    if (best.odds > thr && U.ch(p)) camps.push(W.makeCampaign(c, best));
    else if (best.odds > 2.4 + wr && U.ch(0.5 * (1 - wr * 0.5))) camps.push(W.makeCampaign(c, best));
  }
  return camps;
};
W.makeCampaign = (c, plan) => {
  const tgt = G.prov[plan.tgt];
  const atkCmd = W.pickCommander(c, plan.src);
  const defCmd = W.pickCommander(tgt.o, plan.tgt);
  const kind = S.P[plan.tgt].pass ? 'pass' : (tgt.wall >= 60 && U.ch(0.55)) || S.P[plan.tgt].cap ? 'siege' : 'field';
  return { id: U.uid(), atk: c, def: tgt.o, src: plan.src, tgt: plan.tgt, atkTroops: plan.atk, defTroops: tgt.troops, atkCmd: atkCmd?.id, defCmd: defCmd?.id, kind };
};
W.pickCommander = (c, pid) => {
  const mySubs = G.me && G.me.army ? G.me.army.subs : [];
  const local = S.officersOf(c, o => ['dais', 'shog', 'goz'].includes(o.r) && o.loc === pid && o.id !== G.me.oid && !mySubs.includes(o.id));
  return U.maxBy(local, o => o.tou + (o.r === 'dais' ? 20 : 0)) || S.bestGeneral(c) || G.off[G.cty[c].ruler];
};

// 自動戦闘
W.autoResolve = (atkTroops, defTroops, atkC, defC, atkCmd, defCmd, fort = 1) => {
  const q = (c, o) => (0.75 + (o ? (o.tou * 0.6 + o.bu * 0.15 + o.chi * 0.25) / 200 : 0.25)) * (c === 'rome' ? 1.08 : 1) * (o ? 1 + (S.fx(o, 'atk') + S.fx(o, 'def')) * 0.35 + S.fx(o, 'big') * 0.3 : 1);
  // 地の利：統率の高い将は戦場を選ぶ（野戦のとき）。選べない時は守る側に少し利がある
  let fa = 1, fd = 1;
  if (fort <= 1.05) {
    const ta = atkCmd ? atkCmd.tou || 50 : 45, td = defCmd ? defCmd.tou || 50 : 45, top = Math.max(ta, td);
    if (top >= (typeof FLD !== 'undefined' ? FLD.MIN_TOU : 70)) { const k = 1 + Math.min(0.12, 0.03 + Math.abs(ta - td) / 100 * 0.5); if (ta > td) fa = k; else fd = k; }
    else fd = 1.03;
  }
  const pa = atkTroops * q(atkC, atkCmd) * fa * U.rf(0.78, 1.28);
  const pd = defTroops * q(defC, defCmd) * fort * fd * U.rf(0.78, 1.28);
  const r = pa / Math.max(1, pd);
  let atkLoss, defLoss, win;
  if (r > 1) { win = 'atk'; atkLoss = atkTroops * U.clamp(0.1 / Math.pow(r, 0.7), 0.03, 0.3); defLoss = defTroops * U.clamp(0.32 * Math.pow(r, 0.4), 0.15, 0.85); }
  else { win = 'def'; atkLoss = atkTroops * U.clamp(0.3 * Math.pow(1 / r, 0.4), 0.12, 0.7); defLoss = defTroops * U.clamp(0.08 * Math.pow(r, 0.7), 0.02, 0.3); }
  const slain = [];
  if (atkCmd && !atkCmd.player && U.ch(win === 'def' ? 0.07 : 0.02)) slain.push(atkCmd.id);
  if (defCmd && !defCmd.player && U.ch(win === 'atk' ? 0.08 : 0.02)) slain.push(defCmd.id);
  return { win, atkLoss: Math.round(atkLoss), defLoss: Math.round(defLoss), ratio: r, slain, capture: win === 'atk' && r > 1.1 };
};

W.capture = (pid, c, from) => {
  const p = G.prov[pid];
  const prev = p.o;
  p.capturedAt = G.turn;
  p.o = c; p.loyal = Math.max(10, p.loyal - 25); p.order = Math.max(10, p.order - 20); p.wall = Math.max(10, p.wall - 15);
  p.agri = Math.max(10, p.agri - 5); p.comm = Math.max(5, p.comm - 8);
  const g = G.off[p.gov];
  if (g && g.c === prev && !g.player) { if (U.ch(0.3)) { W.killOfficer(g.id, '討死'); } else g.loc = D.COUNTRIES[prev]?.cap; }
  const ng = S.genOfficer(c, 'guns', { loc: pid }); p.gov = ng.id;
  // 郡の拠点：攻め手の拠点は郡に合流、元の持ち主の拠点は降る（中都市はときに残って抵抗する）
  const holdOut = S.ownedProvs(prev).length > 0 && S.adj(pid).some(q => G.prov[q].o === prev);
  for (const h of S.holdsIn(pid)) {
    if (h.o === c) { p.troops += Math.round(h.g || 0); h.g = 0; continue; }
    if (h.o !== prev) continue;
    if (h.k === 'mid' && holdOut && U.ch(0.25)) { h.g = Math.round(D.HOLDK.mid.floor * U.rf(1, 2.5)); continue; }
    h.o = c; h.g = 0;
  }
  // 敵将の所在を退避
  for (const o of Object.values(G.off)) if (o.alive && o.c === prev && o.loc === pid) { const back = S.adj(pid).find(q => G.prov[q].o === prev); o.loc = back || D.COUNTRIES[prev]?.cap; }
  // 厭戦：急な拡大は国を疲れさせる
  if (G.cty[c]) G.cty[c].weary = Math.min(0.7, (G.cty[c].weary || 0) + (S.P[pid].cap ? 0.12 : 0.06));
  S.log(`${S.cname(c)}が${S.P[pid].name}を${S.cname(prev)}から奪った！`, c === S.myOff().c ? 'good' : (prev === S.myOff().c ? 'bad' : 'info'));
  S.chron(`${S.cname(c)}、${S.P[pid].name}を攻略。`);
  // 都の陥落
  if (S.P[pid].cap || pid === G.cty[prev]?.capOverride) {
    const rest = S.ownedProvs(prev);
    if (rest.length) { const nc = U.maxBy(rest, x => x.pop); G.cty[prev].capOverride = nc.id; S.log(`${S.cname(prev)}は都を${S.P[nc.id].name}へ移した。`); }
  }
  // 主人公の所在
  if (G.me.loc === pid && S.myOff().c === prev) {
    const back = S.adj(pid).find(q => G.prov[q].o === prev) || (S.ownedProvs(prev)[0] || {}).id;
    if (back) { G.me.loc = back; S.myOff().loc = back; if (G.me.jur && G.me.jur.prov === pid) { S.setupJur(G.me.rank, back); S.log('管轄地を失い、新たな任地へ移った。', 'bad'); } }
  }
  if (!S.ownedProvs(prev).length) W.killCountry(prev, c);
};
W.capital = (c) => G.cty[c].capOverride && G.prov[G.cty[c].capOverride]?.o === c ? G.cty[c].capOverride : (G.prov[D.COUNTRIES[c].cap]?.o === c ? D.COUNTRIES[c].cap : (S.ownedProvs(c)[0] || {}).id);

W.killCountry = (c, by) => {
  const cc = G.cty[c]; if (!cc.alive) return;
  cc.alive = false;
  S.log(`${S.cname(c)}は滅亡した……`, 'big');
  S.chron(`${S.cname(c)}、${S.cname(by)}に滅ぼされる。`);
  for (const o of S.officersOf(c)) {
    if (o.player) continue;
    if (U.ch(0.45)) { o.c = by; o.loy = U.ri(30, 60); o.loc = W.capital(by); if (['kuns', 'josh'].includes(o.r)) o.r = 'daij'; }
    else o.ret = true;
  }
  for (const k in G.dip) if (k.includes(c)) G.dip[k].st = 'peace';
  // 残った拠点は、その郡の持ち主に降る
  for (const h of S.holdAll()) if (h.o === c) { h.o = G.prov[h.pid].o; h.g = 0; }
  if (S.myOff().c === c) G.flags.homeFallen = by;
};

W.killOfficer = (id, why = '死去', chron = true) => {
  const o = G.off[id]; if (!o || !o.alive) return;
  if (o.player) return;
  o.alive = false;
  if (typeof PPL !== 'undefined') PPL.grave(o, why);
  const c = o.c, cc = G.cty[c];
  if (o.hist || ['dais', 'shog', 'kuns', 'josh'].includes(o.r)) S.log(`${S.cname(c)}の${D.RANKS[o.r]?.name || ''}${o.n}が${why}した。`, o.c === S.myOff().c ? 'bad' : 'info');
  if (o.hist && chron) S.chron(`${S.cname(c)}の${o.n}、${why}。`);
  if (cc && cc.alive && cc.ruler === id) W.succession(c);
  if (cc && cc.alive && cc.josh === id) { const n = S.genOfficer(c, 'josh'); cc.josh = n.id; }
  if (cc && cc.alive && cc.gyos === id) { const n = S.genOfficer(c, 'gyos'); cc.gyos = n.id; }
  if (cc && cc.alive) for (const m in cc.mins) if (cc.mins[m] === id) { const n = S.genOfficer(c, 'daij'); n.min = m; cc.mins[m] = n.id; }
  for (const p of Object.values(G.prov)) if (p.gov === id) { const n = S.genOfficer(p.o, 'guns', { loc: p.id }); p.gov = n.id; }
  if (G.me.boss === id) { G.me.boss = null; S.setupChainAfterPromotion(G.me.rank); S.log(`上官の${o.n}を失った。`, 'bad'); }
  if (G.me.gen === id) G.me.gen = W.pickCommander(S.myOff().c, G.me.loc)?.id || null;
  const A = G.me.army;
  if (A.subs.includes(id)) { A.subs = A.subs.filter(x => x !== id); if (A.dep === id) A.dep = null; for (const s of A.sq) if (s.ld === id) s.ld = null; }
};

W.succession = (c) => {
  const cc = G.cty[c];
  const old = G.off[cc.ruler];
  if (old && old.player) return;
  const heir = S.genOfficer(c, 'kuns'); heir.age = U.ri(18, 40);
  // 史実の跡継ぎ（年が来ていれば）
  const hs = (D.HEIRS[c] || []).find(([y, n]) => G.year >= y && !G.flags['heir_' + n]);
  if (hs && W.histOn()) { G.flags['heir_' + hs[1]] = 1; heir.n = hs[1]; Object.assign(heir, S.splitName(hs[1])); }
  cc.ruler = heir.id;
  if (G.me && S.myOff().c === c) G.flags.rulerDied = G.turn;
  for (const p of S.ownedProvs(c)) if (p.gov === old?.id) p.gov = heir.id;
  S.log(`${S.cname(c)}で${heir.n}が即位した。`);
  S.chron(`${S.cname(c)}、${heir.n}即位。`);
};

/* ---------- 主人公の関与 ---------- */
W.involvement = (camp) => {
  const me = G.me, o = S.myOff(), myC = o.c;
  if (camp.atk !== myC && camp.def !== myC) return null;
  if (me.inj > 0 && S.isMilLike()) return null;
  const side = camp.atk === myC ? 'atk' : 'def';
  const rk = D.RANKS[me.rank];
  const near = side === 'atk' ? (me.loc === camp.src) : (me.loc === camp.tgt || (me.loc === camp.src && false));
  if (me.rank === 'kuns' || me.rank === 'josh') return side === 'def' ? { side, role: 'top' } : null;
  if (rk.track === 'mil' || rk.track === 'staff') {
    const vol = me.flags.volunteer && me.flags.volunteer >= G.turn && (S.adj(camp.src).includes(me.loc) || S.adj(camp.tgt).includes(me.loc));
    if (near || vol || (side === 'def' && S.adj(camp.tgt).includes(me.loc) && rk.tier >= 6 && U.ch(0.5))) {
      const cmdId = side === 'atk' ? camp.atkCmd : camp.defCmd;
      const cmd = G.off[cmdId];
      let role = 'unit';
      // 軍師の道：軍師からは総軍師、若いうちは将の軍で戦う
      if (rk.track === 'staff') role = rk.tier >= 7 ? 'gunshi' : 'unit';
      else if (rk.tier >= 7 && (!cmd || cmd.tou < S.stat(o, 'tou') || me.rank === 'dais' || me.rank === 'tenka' || (cmd.r !== 'dais' && me.rank === 'shog'))) role = 'commander';
      return { side, role };
    }
    return null;
  }
  if (rk.track === 'civ') {
    if (side === 'def' && me.jur && me.jur.prov === camp.tgt && S.armyTotal() > 0) return { side, role: me.rank === 'guns' ? 'commander' : 'unit' };
    if (me.rank === 'daij' && me.min === 'eii' && side === 'def' && camp.tgt === W.capital(myC)) return { side, role: 'unit' };
  }
  return null;
};

// 郡（大都市）を攻める戦は、みな遠征（前哨戦・野戦・攻城戦）として進む
W.resolveCampaign = (camp) => W.runExpedition(camp);

/* ---------- 合戦の構成 ---------- */
W.snap = (o, extra) => o ? Object.assign({ id: o.id, n: o.n, sei: o.sei || o.n.slice(0, 1), bu: S.stat(o, 'bu') - (o.inj ? 12 : 0), tou: S.stat(o, 'tou') - (o.inj ? 10 : 0), chi: S.stat(o, 'chi'), pers: typeof PPL !== 'undefined' ? PPL.pers(o) : null, pol: S.stat(o, 'pol'), mi: S.stat(o, 'mi'), tr: o.tr || [], tac: (o.player ? G.me.tac : o.tac) || [], st: o.st || 'bal', r: o.r, player: !!o.player, hist: !!o.hist, mount: !!o.mount, xfx: o.player ? S.playerXfx() : null }, extra || {}) : null;
W.tempLeader = (c, tier) => {
  const nm = S.genName();
  const b = 32 + tier * 5;
  const r = D.RANK_ORDER_MIL[Math.min(7, Math.max(0, tier - 1))];
  const o = { id: null, n: nm.n, sei: nm.sei, bu: U.ri(b - 12, b + 14), tou: U.ri(b - 10, b + 14), chi: U.ri(b - 14, b + 12), pol: U.ri(20, 50), mi: U.ri(b - 10, b + 10), tr: [], tac: [], st: U.pick(['ins', 'chi', 'bal']), r };
  o.tr = S.genTraits('mil', tier, U.ch(0.5) ? 1 : U.ch(0.5) ? 2 : 0);
  if (tier >= 5) o.tac = S.genTactics(o);
  return o;
};
W.tierForSize = n => n >= 30000 ? 8 : n >= 10000 ? 7 : n >= 4000 ? 6 : n >= 2000 ? 5 : n >= 700 ? 4 : n >= 300 ? 3 : n >= 60 ? 2 : 1;

// side army → battle units
W.armyUnits = (c, total, opt) => {
  const units = [];
  if (total <= 0) return units;
  const comp = S.compSplit(opt.bandit ? 'bandit' : opt.nomad ? (opt.raid && D.COMP['raid_' + opt.raid] ? 'raid_' + opt.raid : 'nomad') : c, total);
  // 単位兵数
  let nUnits = total <= 12 ? 1 : total <= 60 ? 2 : total <= 300 ? 3 : Math.round(3 + Math.log2(total / 300) * 2.2);
  nUnits = U.clamp(nUnits, 1, opt.maxUnits || 18);
  const cap = Math.max(5, Math.ceil(total / nUnits));
  for (const t in comp) {
    let n = comp[t];
    if (n <= 0) continue;
    if (n < cap * 0.25 && total > 300) { // 少ない兵種は歩兵へ
      const inf = units.find(u => u.t === 'inf'); if (inf) { inf.n += n; continue; }
    }
    while (n > 0) { const k = n > cap * 1.5 ? cap : n; units.push({ t, n: k }); n -= k; }
  }
  // 名のある将を割り当て
  const named = (opt.officers || []).slice();
  units.sort((a, b) => b.n - a.n);
  for (const u of units) {
    const tier = W.tierForSize(u.n);
    if (named.length && u.n >= 2000) u.ld = W.snap(named.shift());
    else u.ld = W.tempLeader(c, tier);
    u.tr = opt.tr ?? U.ri(30, 55); u.wl = opt.wl ?? 1; u.al = opt.al ?? 1;
    u.grp = W.groupFor(u.t);
    u.ctrl = 'ai';
  }
  return units;
};
W.groupFor = t => {
  const cls = D.UT[t].cls;
  if (cls === 'rng') return 'archer';
  if (cls === 'cav' || cls === 'chr') return U.ch(0.5) ? 'left' : 'right';
  if (cls === 'sie') return 'siege';
  if (t === 'guard') return 'hq';
  return U.ch(0.7) ? 'front' : (U.ch(0.5) ? 'left' : 'right');
};

// 主人公の軍の部隊（同じ隊長・同じ兵種で一つ。key は 'ld|t'）
W.playerGroups = () => {
  const me = G.me, groups = new Map();
  for (const s of me.army.sq) {
    if (s.n <= 0) continue;
    const ld = s.ld && G.off[s.ld] && G.off[s.ld].alive ? s.ld : '';
    const key = ld + '|' + s.t;
    let g = groups.get(key);
    if (!g) { g = { key, ld, t: s.t, sqs: [] }; groups.set(key, g); }
    g.sqs.push(s);
  }
  return [...groups.values()].map(g => { g.n = U.sum(g.sqs, s => s.n); g.tr = Math.round(U.sum(g.sqs, s => s.tr * s.n) / Math.max(1, g.n)); return g; });
};
// 出撃する部隊を選べるか：部隊が二つ以上あれば兵の多少にかかわらず、一つだけなら三百人から
// （伍長・什長の伍は選ばずに出る）
W.canPickSortie = () => { const gs = W.playerGroups(), tot = U.sum(gs, g => g.n); return gs.length >= 2 ? tot >= 20 : tot >= 300; };
// 出撃する部隊のおまかせ（all 全軍・auto 敵の倍まで・direct 直属だけ）
W.sortiePick = (spec, preset) => {
  const gs = W.playerGroups(), pick = {};
  if (preset === 'all') { for (const g of gs) pick[g.key] = g.n; return pick; }
  if (preset === 'direct') { for (const g of gs) pick[g.key] = g.ld ? 0 : g.n; return pick; }
  const enemy = U.sum((spec && spec.units || []).filter(u => u.side === 1), u => u.n);
  let need = Math.max(300, enemy * 2);
  // 主人公の直属の一番大きい隊から、あとは練度の高い隊から
  const main = U.maxBy(gs.filter(g => !g.ld), g => g.n);
  const order = gs.slice().sort((a, b) => (b === main ? 1 : 0) - (a === main ? 1 : 0) || b.tr - a.tr || b.n - a.n);
  for (const g of order) { const k = Math.min(g.n, Math.max(0, need)); pick[g.key] = Math.round(k); need -= k; }
  return pick;
};
// 主人公の軍を合戦の部隊にする。割り振りのとおりに出し、勝手に分けない：
// 同じ隊長・同じ兵種の隊は一つの部隊（国軍と私兵も合わせる）。兵のいない部下は出ない。
// sortie: 出撃する人数（{ 'ld|t': 人数 }）。なければ全軍
W.playerUnits = (role, sortie) => {
  const me = G.me, o = S.myOff();
  const out = [];
  if (me.army.wu.length) { const main = me.army.sq.find(s => !s.pv && !s.ld) || me.army.sq[0]; if (main) { main.n = 1 + me.army.wu.filter(w => w.alive).length; main.max = 5; } }
  const list = W.playerGroups().map(g => {
    const n = sortie ? Math.max(0, Math.min(g.n, Math.round(sortie[g.key] ?? 0))) : g.n;
    const avg = (k) => U.sum(g.sqs, s => (s[k] || 0) * s.n) / Math.max(1, g.n);
    return Object.assign(g, { use: n, tr: Math.round(avg('tr')), wl: Math.round(avg('wl')), al: Math.round(avg('al')) });
  }).filter(g => g.use > 0);
  // 主人公は直属で一番大きい部隊を率いる
  list.sort((a, b) => (a.ld ? 1 : 0) - (b.ld ? 1 : 0) || b.n - a.n);
  const orders = me.army.orders || {};
  const led = new Set();
  let mainDone = false;
  for (const g of list) {
    const off = g.ld ? G.off[g.ld] : null;
    const u = { t: g.t, n: g.use, tr: g.tr, wl: g.wl, al: g.al, sq: g.sqs[0].id, sqs: g.sqs.length > 1 ? g.sqs.map(s => ({ id: s.id, n: s.n })) : null, ctrl: 'player', grp: 'player' };
    if (!off && !mainDone) { u.ld = W.snap(o); u.me = true; mainDone = true; if (me.army.wu.length) u.wu = me.army.wu.filter(w => w.alive).map(w => ({ id: w.id, n: w.n, bu: w.bu, hp: w.hp, tr: w.tr })); }
    else if (off && !led.has(g.ld)) { u.ld = W.snap(off); led.add(g.ld); }
    else u.ld = W.retainer(off || o, o.c, g.use, !off);
    // 軍の割り振りで決めた任せ方（開戦と同時に隊長が動かす）
    const mode = off && orders[g.ld] && orders[g.ld] !== 'self' ? orders[g.ld] : null;
    if (mode && !u.me) u.preDlg = { mode, dep: { id: off.id, n: off.n, tou: S.stat(off, 'tou'), chi: S.stat(off, 'chi'), good: S.canLead(off) } };
    out.push(u);
  }
  // 直属の兵がいない（全部を部下に任せた・文官など）：主人公は護衛だけを連れて出る
  if (!mainDone) out.unshift({ t: 'guard', n: out.length ? 20 : 5, tr: 50, wl: 1, al: 1, ctrl: 'player', grp: 'player', ld: W.snap(o), me: true, escort: true });
  return out;
};
// 主人公や部下の二つ目以降の兵種を率いる者（名のない隊長）
W.retainer = (of, c, n, direct) => {
  const cap = Math.max(1, (D.RANKS[of.r] ? D.RANKS[of.r].tier : 3) - 1);
  const t = W.tempLeader(c, Math.max(1, Math.min(W.tierForSize(n), cap)));
  t.n = `${of.n}${direct ? 'の直属' : 'の配下'}`; t.sei = of.sei || of.n.slice(0, 1); t.ret = true;
  return t;
};

W.siegeKit = (units, c, total, side) => {
  const rams = U.clamp(1 + Math.floor(total / 40000), 1, 4);
  const towers = total >= 15000 ? U.clamp(Math.floor(total / 45000) + 1, 1, 3) : 0;
  for (let i = 0; i < rams; i++) units.push({ side, t: 'ram', n: 30, tr: 40, wl: 1, al: 2, grp: 'siege', ctrl: 'ai', ld: W.tempLeader(c, 2) });
  for (let i = 0; i < towers; i++) units.push({ side, t: 'tower', n: 60, tr: 40, wl: 1, al: 2, grp: 'siege', ctrl: 'ai', ld: W.tempLeader(c, 2) });
  // 歩兵の一部を雲梯隊に
  const ladderN = Math.round(total * 0.08);
  if (ladderN >= 30) {
    const inf = units.filter(u => u.side === side && (u.t === 'inf' || u.t === 'militia') && u.ctrl === 'ai').sort((a, b) => b.n - a.n)[0];
    if (inf && inf.n > ladderN * 1.5) { inf.n -= ladderN; units.push({ side, t: 'ladder', n: ladderN, tr: inf.tr, wl: 1, al: 1, grp: 'siege', ctrl: 'ai', ld: W.tempLeader(c, W.tierForSize(ladderN)) }); }
  }
};

/*
  W.buildSpec(o)
   o.kind: field|siege|pass|skirmish|bandit|raid|nomad
   o.pid, o.title
   o.A / o.B: {c, troops, cmd (officer), officers:[], bandit, nomad, morale}
   o.me: 'A'|'B'|null  — 主人公の側
   o.role: commander|unit|gunshi|top|watch
   o.cityOf: 'A'|'B'|null — 攻城戦で城を持つ側
*/
W.buildSpec = (o) => {
  const me = G.me, myOff = S.myOff();
  const meSide = o.me || null;
  const sideKeys = meSide === 'B' ? ['B', 'A'] : ['A', 'B'];
  const total = (o.A.troops || 0) + (o.B.troops || 0);
  const spec = {
    kind: o.kind, pid: o.pid, title: o.title, theme: o.theme || S.P[o.pid]?.t || 'plain',
    seed: o.seed ?? Math.floor(Math.random() * 1e9), sides: [], units: [], role: o.role || 'watch',
    city: o.cityOf ? (sideKeys[0] === o.cityOf ? 0 : 1) : -1,
    wall: o.wall ?? (o.pid ? G.prov[o.pid].wall : 50),
    maxDays: o.maxDays || (o.kind === 'naval' ? 1 : o.kind === 'siege' ? (total > 60000 ? 7 : 4) : o.kind === 'pass' ? 5 : total >= 120000 ? 5 : total >= 40000 ? 3 : total >= 6000 ? 2 : 1),
    diff: G.diff, ctx: o.ctx || null, noDeath: !!(G.custom && G.custom.noDeath),
  };
  // 全体マップの地形から戦場を決める
  if (spec.kind === 'naval') spec.theme = 'coast';
  else if (typeof GEO !== 'undefined' && GEO.built && o.pid && S.P[o.pid]) {
    try {
      const fieldLike = !['siege', 'pass'].includes(spec.kind);
      const site = GEO.site(o.pid, { at: o.at || null, from: !o.at && o.from && o.from !== o.pid ? o.from : null, field: fieldLike && !o.from && !o.at, rng: U.rng(spec.seed) });
      if (site) { spec.site = site; if (fieldLike && !o.theme) spec.theme = GEO.siteTheme(site); }
    } catch (e) { console.warn(e); }
  }
  // 選び直し（出撃する部隊の選び直しなど）でも、決めた戦場はそのまま
  if (o.field && typeof FLD !== 'undefined' && FLD.get(o.field.id)) { spec.field = o.field; const A = FLD.ARCH[FLD.get(o.field.id).arch]; if (A && A.theme) spec.theme = A.theme; }
  spec.weather = o.weather || D.weatherFor(G.month, spec.theme, o.pid && S.P[o.pid] && S.P[o.pid].y < 200);
  if (o.siege) { spec.breach = !!o.siege.breach; spec.flooded = !!o.siege.flooded; spec.siegeMonths = o.siege.months || 0; }
  // 市街戦：城壁はもうない。守る側（町を持つ側）に街区の地の利
  if (spec.kind === 'urban') {
    const di = spec.city >= 0 ? spec.city : 1; spec.city = -1; spec.urbanDef = di;
    if (typeof FLD !== 'undefined') { const e = FLD.urbanFor(o.pid, spec.seed); if (e) { spec.field = { id: e.id, a: di, how: 'city' }; spec.theme = 'plain'; } }
  }
  if (spec.kind === 'raid' || spec.kind === 'skirmish' || spec.kind === 'bandit' || spec.kind === 'nomad' || spec.kind === 'naval') spec.city = -1;
  const unitCountTarget = total > 200000 ? 20 : 16;
  for (let si = 0; si < 2; si++) {
    const k = sideKeys[si], X = o[k];
    const isMe = meSide === k && o.role !== 'watch';
    const cmd = X.cmd || null;
    const sd = {
      c: X.c, name: X.pirate ? ((D.PIRATES[X.pirate] || {}).n || '海賊') : X.bandit ? '盗賊団' : X.nomad ? ((D.RAIDERS[X.raid] || {}).n || D.NOMAD.name) : spec.kind === 'naval' ? ((D.NAVY[X.c] || {}).n || S.cname(X.c) + '艦隊') : S.cname(X.c) + '軍', player: isMe, pirate: X.pirate || null,
      cmd: cmd ? W.snap(cmd) : W.tempLeader(X.c, 5), morale: X.morale || 0,
      cmdAll: isMe && ['commander', 'gunshi', 'top'].includes(o.role),
      tactics: null, known: null, troops0: X.troops, bandit: !!X.bandit, nomad: !!X.nomad, rebel: !!X.rebel,
    };
    spec.sides.push(sd);
    let remain = X.troops;
    let units = [];
    if (isMe) {
      const pu = W.playerUnits(o.role, o.sortie);
      const pTotal = U.sum(pu, u => u.n);
      // addMe：X.troops は味方の援軍だけ（主人公の兵はその上に足す）。ふつうは主人公の兵も X.troops に含まれる
      remain = X.addMe ? remain : Math.max(0, remain - pTotal);
      for (const u of pu) { u.side = si; units.push(u); }
      // 上官の隊（低い階級）
      const tier = S.tier();
      if (o.role === 'unit' && remain > pTotal * 3) {
        const pSize = tier <= 1 ? 95 : tier === 2 ? Math.min(900, remain * 0.3) : Math.min(pTotal * 4, remain * 0.25);
        const boss = G.off[me.boss];
        if (pSize >= 20) {
          const n = Math.round(pSize);
          units.push({ side: si, t: S.isCiv() && tier <= 2 ? 'militia' : 'inf', n, tr: 40, wl: 1, al: 1, grp: 'front', ctrl: 'ai', ld: boss ? W.snap(boss) : W.tempLeader(X.c, tier + 1), parentOfMe: true });
          remain -= n;
        }
      }
      if (o.role === 'commander' || o.role === 'gunshi' || o.role === 'top') sd.known = me.tac.slice();
      sd.cmd = o.role === 'commander' || o.role === 'top' ? W.snap(myOff) : sd.cmd;
      // 恩義のある将が駆けつける
      if (typeof PPL !== 'undefined' && !o.noFriends) { const fr = PPL.friendsJoin(X.c, o); for (const u of fr) { u.side = si; units.push(u); } if (fr.length) spec.friends = fr.map(u => u.ld.n); }
    }
    // 主人公の部下は主人公の軍でだけ戦う（兵を任せていなければ出ない）
    const mySubs = G.me && G.me.army ? G.me.army.subs : [];
    const offs = (X.officers || []).filter(x => x && x.alive && !x.player && !mySubs.includes(x.id));
    if (cmd && !cmd.player && !offs.includes(cmd) && !mySubs.includes(cmd.id)) offs.unshift(cmd);
    const au = W.armyUnits(X.c, Math.round(remain), { bandit: X.bandit, nomad: X.nomad, raid: X.raid, officers: offs, maxUnits: unitCountTarget, tr: X.tr });
    for (const u of au) { u.side = si; units.push(u); }
    // 本陣（総大将の隊）
    const hasMeCmd = isMe && (o.role === 'commander' || o.role === 'top');
    if (!hasMeCmd && X.troops >= 400 && !X.bandit) {
      const big = units.filter(u => u.side === si && u.ctrl === 'ai' && !u.parentOfMe).sort((a, b) => b.n - a.n)[0];
      if (big) { const hqN = Math.max(20, Math.round(Math.min(big.n * 0.3, X.troops * 0.06))); big.n -= hqN; units.push({ side: si, t: 'guard', n: hqN, tr: 60, wl: 2, al: 2, grp: 'hq', ctrl: 'ai', hq: true, ld: sd.cmd }); }
    } else if (hasMeCmd) {
      const mu = units.find(u => u.me); if (mu) mu.hq = true;
    } else if (units.filter(u => u.side === si).length) {
      const big = units.filter(u => u.side === si).sort((a, b) => b.n - a.n)[0]; big.hq = true; if (!big.me) big.ld = sd.cmd || big.ld;
    }
    // 攻城兵器
    if ((spec.kind === 'siege' || spec.kind === 'pass') && spec.city !== si) W.siegeKit(units, X.c, X.troops, si);
    spec.units.push(...units.filter(u => u.n > 0));
  }
  // 海戦：兵は海兵として船に乗る
  if (spec.kind === 'naval' && typeof NAV !== 'undefined') NAV.convert(spec);
  // 武名：主人公の名が知れていれば、味方は奮い立ち、敵はひるむ
  if (meSide && o.role !== 'watch') {
    const lv = S.renownLv();
    if (lv > 0) { spec.sides[0].morale = (spec.sides[0].morale || 0) + lv; spec.sides[1].morale = (spec.sides[1].morale || 0) - Math.round(lv * 1.5); spec.renown = { lv, ep: S.epithet(), n: myOff.n }; }
  }
  // 主人公の側の軍師
  if (o.role === 'gunshi') spec.sides[0].gunshi = W.snap(myOff);
  else if (meSide && me.army.stg && G.off[me.army.stg]?.alive) spec.sides[0].gunshi = W.snap(G.off[me.army.stg]);
  // 委任できる部下
  if (meSide && o.role !== 'watch') {
    // 委任できるのは、この合戦で兵を率いている部下だけ
    const leading = new Set(spec.units.filter(u => u.ld && u.ld.id && u.ctrl === 'player' && !u.me).map(u => u.ld.id));
    const ids = [me.army.dep, me.army.stg, ...me.army.subs].filter((x, i, a) => x && a.indexOf(x) === i && leading.has(x));
    spec.deputies = ids.map(id => G.off[id]).filter(x => x && x.alive).slice(0, 8).map(x => ({ id: x.id, n: x.n, tou: S.stat(x, 'tou'), chi: S.stat(x, 'chi'), bu: S.stat(x, 'bu') }));
  }
  spec.courier = G.flags.courier !== false;
  // 出撃する部隊を選び直すときのために、作り方を覚えておく
  spec.args = Object.assign({}, o, { seed: spec.seed, weather: spec.weather });
  return spec;
};
// 出撃する部隊（pick: { 'ld|t': 人数 }）を選んで、合戦を作り直す
W.rebuildSpec = (spec, pick) => spec && spec.args ? W.buildSpec(Object.assign({}, spec.args, { sortie: pick })) : spec;

/* ---------- 合戦結果の反映 ---------- */
// br: B.result()
W.applyBattleResult = (spec, br) => {
  const me = G.me, o = S.myOff();
  const meSide = spec.sides.findIndex(s => s.player);
  const won = br.winner === 0 && meSide === 0;
  const lost = br.winner === 1 && meSide === 0;
  // 兵の損害（主人公の部隊）
  const heal = 0.25 * (1 + S.fx(o, 'heal') + (br.healFx || 0));
  const bySq = {};
  for (const u of br.units) {
    if (u.sqs && u.sqs.length) {
      // 一つにまとめて出した隊は、人数の割合で損害を分ける
      const tot = U.sum(u.sqs, x => x.n) || 1;
      for (const x of u.sqs) { const f = x.n / tot; (bySq[x.id] = bySq[x.id] || []).push({ n0: u.n0 * f, alive: u.alive * f, routed: u.routed * f, ldFate: u.ldFate, ldId: u.ldId }); }
    } else if (u.sq) (bySq[u.sq] = bySq[u.sq] || []).push(u);
  }
  for (const s of me.army.sq) {
    const us = bySq[s.id]; if (!us) continue;
    const n0 = U.sum(us, u => u.n0), alive = U.sum(us, u => u.alive), routed = U.sum(us, u => u.routed), dead = Math.max(0, n0 - alive - routed);
    const back = Math.round(alive + routed * 0.65 + dead * heal);
    const lostN = Math.max(0, n0 - back);
    s.n = Math.max(0, Math.min(s.max, s.n - lostN));
    s.tr = Math.min(100, s.tr + (won ? 4 : 2));
    s.xp = (s.xp || 0) + 1;
    for (const u of us) if (u.ldFate && u.ldFate !== 'ok' && s.ld && u.ldId === s.ld) { if (u.ldFate === 'slain') W.killOfficer(s.ld, '戦死'); }
  }
  S.tidyArmy();
  // 伍
  for (const u of br.units) if (u.wu) for (const w of u.wu) {
    const m = me.army.wu.find(x => x.id === w.id); if (!m) continue;
    if (w.dead) { m.alive = false; S.log(`伍の仲間、${m.n}が戦死した……`, 'bad'); }
    else { m.hp = Math.max(10, w.hp); m.xp += w.kills * 6 + 8; if (m.xp >= 60 && m.bu < 95) { m.bu += 1 + Math.floor(m.xp / 120); m.xp = 0; } if (won) m.bond = Math.min(100, m.bond + 4); }
  }
  // 伍の補充
  const deadWu = me.army.wu.filter(w => !w.alive).length;
  if ((me.rank === 'goch' || me.rank === 'ritei') && deadWu > 0) {
    me.army.wu = me.army.wu.filter(w => w.alive);
    while (me.army.wu.length < 4) { const nm = S.genName(); me.army.wu.push({ id: U.uid(), n: nm.n, bu: U.ri(22, 50), hp: 100, xp: 0, bond: 5, alive: true, tr: null, fresh: true }); }
    const main = me.army.sq.find(s => !s.pv && !s.ld) || me.army.sq[0]; if (main) { main.n = 5; main.max = 5; }
    S.log('新しい兵が伍に補充された。');
  }
  // 将の生死
  for (const id of br.slainOfficers || []) W.killOfficer(id, '戦死');
  for (const id of br.capturedOfficers || []) { const x = G.off[id]; if (x && x.alive) { x.loc = W.capital(o.c); x.captive = o.c; S.log(`${x.n}を捕らえた。`, 'good'); } }
  // 主人公
  if (br.meFate === 'wounded') { me.inj = 2; S.log('主人公は深手を負った（2か月）。', 'bad'); }
  if (spec.role !== 'watch') {
    me.rec.battles++; if (won) me.rec.wins++;
    if (spec.kind === 'naval') { if (won) me.rec.navalWins = (me.rec.navalWins || 0) + 1; me.rec.sunk = (me.rec.sunk || 0) + ((br.sunk && br.sunk[1]) || 0); }
    if (won && spec.field && spec.field.how === 'me') me.rec.fieldWins = (me.rec.fieldWins || 0) + 1;
  }
  me.rec.kills += Math.round(br.meKills || 0);
  for (const s of br.slainNames || []) me.rec.slain.push(s);
  me.rec.duels += br.duelWins || 0;
  // 功績
  const m = br.merit || {};
  const tier = S.tier();
  let merit = Math.round((br.meKills || 0) * 1.0 + (m.officers || 0) + (m.duel || 0) + (m.points || 0) * tier * 6 + (won ? 25 * tier * (spec.kind === 'skirmish' ? 0.6 : 1) : 0) + (m.rearguard || 0) * 30 * tier + (m.cmdKills || 0) * 0.35 + (m.order || 0));
  if (lost) merit = Math.round(merit * 0.5 - (spec.sides[0].cmdAll ? 20 * tier : 0));
  if (br.meFate === 'dead') merit = 0;
  const gain = W.gainMerit(merit, `${spec.title}`);
  // 金と兵糧（戦利品）
  if (won) { const loot = Math.round(U.sum(br.units.filter(u => u.side === 1), u => u.n0) * U.rf(1.5, 4) * S.fxm(o, 'loot')); me.gold += loot; if (loot > 0) S.log(`戦利品 金${U.fmt(loot)}`); }
  // 経験による特性の会得
  if (spec.role !== 'watch') W.learnFromBattle(spec, br, won);
  if (spec.role !== 'watch' && typeof PPL !== 'undefined') { try { PPL.afterBattle(spec, br, won); } catch (e) { console.error(e); } }
  // 戦場の兵の損害を国の数字に
  const sides = br.sides;
  const res = {
    win: br.winner === 0 ? (meSide === 0 ? 'me' : 'foe') : br.winner === 1 ? 'foe' : 'draw',
    atkLoss: 0, defLoss: 0, slain: [], capture: false, merit: gain, br,
  };
  const ctx = spec.ctx;
  if (ctx && ctx.camp) {
    const mySideKey = ctx.side; // 'atk' or 'def'
    const s0Loss = sides[0].start - sides[0].alive - sides[0].routed * 0.6;
    const s1Loss = sides[1].start - sides[1].alive - sides[1].routed * 0.6;
    const myLoss = Math.max(0, s0Loss), foeLoss = Math.max(0, s1Loss);
    if (mySideKey === 'atk') { res.atkLoss = Math.round(myLoss); res.defLoss = Math.round(foeLoss); res.win = br.winner === 0 ? 'atk' : 'def'; }
    else { res.defLoss = Math.round(myLoss); res.atkLoss = Math.round(foeLoss); res.win = br.winner === 0 ? 'def' : 'atk'; }
    res.capture = res.win === 'atk' && (spec.kind !== 'field' ? br.cityTaken || br.winner !== -1 : true);
  }
  if (br.meFate === 'dead') G.over = { kind: 'death', text: `${o.n}は${spec.title}で討ち死にした。` };
  else res.renown = W.renownFromBattle(spec, br, won);
  if (typeof ACH !== 'undefined') { try { ACH.check(true); } catch (e) { console.error(e); } }
  return res;
};

/* ---------- 小競り合い・盗賊・出撃 ---------- */
W.genOffers = () => {
  const me = G.me, o = S.myOff(), c = o.c;
  G.offers = [];
  const rk = D.RANKS[me.rank];
  const P = G.prov[me.loc];
  if (!P) return;
  const force = Math.max(5, S.armyTotal());
  const hostile = S.adj(me.loc).filter(q => G.prov[q].o !== c && (S.atWar(c, G.prov[q].o) || S.dip(c, G.prov[q].o).rel < -40));
  const canFight = (S.isMilLike() || (rk.track === 'civ' && force >= 5)) && me.inj === 0;
  if (canFight && hostile.length && (rk.track !== 'civ' || rk.tier <= 6)) {
    const n = U.ch(0.7) ? (U.ch(0.35) ? 2 : 1) : 0;
    for (let i = 0; i < n; i++) {
      const q = U.pick(hostile); const ec = G.prov[q].o;
      const scale = U.rf(0.55, 1.5);
      let foe = Math.round(force * scale);
      let ally = 0;
      if (rk.tier <= 2) { foe = U.ri(60, 220); ally = Math.max(0, Math.round(foe * U.rf(0.8, 1.3)) - force); }
      else if (rk.tier <= 4) { foe = Math.round(force * U.rf(0.8, 2.2)); ally = Math.round(Math.max(0, foe * U.rf(0.9, 1.2) - force)); }
      foe = Math.max(8, foe);
      G.offers.push({ id: U.uid(), kind: 'skirmish', pid: me.loc, from: q, ec, foe, ally, title: `${S.P[q].name}方面の小競り合い`, desc: `${S.cname(ec)}軍 約${U.fmt(foe)}が国境を侵している。` });
    }
  }
  // 隣の敵の拠点を奪う好機（低い身分なら上官の兵と一緒に）
  if (canFight && rk.track !== 'civ' && G.hold) {
    const ts = W.playerHoldTargets(true).filter(h => (D.HOLD_TIER[h.k] || 9) <= rk.tier + 1);
    if (ts.length && U.ch(0.55)) G.offers.push(W.holdOffer(U.pick(ts)));
  }
  // 盗賊
  const jb = me.jur ? me.jur.bandits : 0;
  if ((canFight || rk.track === 'civ') && (jb > 0 || U.ch(0.25 + (100 - P.order) / 250))) {
    const size = rk.tier <= 2 ? U.ri(6, 28) : rk.tier <= 4 ? U.ri(40, 300) : U.ri(400, 3000);
    G.offers.push({ id: U.uid(), kind: 'bandit', pid: me.loc, ec: 'bandit', foe: size, ally: 0, title: `${S.P[me.loc].name}の盗賊討伐`, desc: `盗賊団 約${U.fmt(size)}が村を荒らしている。` });
  }
  // 海賊（海に面した州）
  if (canFight && typeof NAV !== 'undefined' && NAV.coastal(me.loc) && U.ch(D.PIRATE_AT[me.loc] ? 0.32 : 0.16)) G.offers.push(NAV.pirateOffer(me.loc, force, rk.tier));
  // 辺境の部族の襲来（ガリア人・トラキア人・ルシタニ人・砂漠の騎馬の民など）
  const rk0 = D.RAID_AT[me.loc], R = rk0 ? D.RAIDERS[rk0] : null;
  if (canFight && R && U.ch(0.3)) {
    const size = Math.round(Math.max(30, force * U.rf(0.6, 1.4)));
    G.offers.push({ id: U.uid(), kind: 'nomad', pid: me.loc, ec: 'nomad', raid: rk0, foe: size, ally: 0, title: `${R.n}の襲来`, desc: `${R.n}の${R.w || '戦士'} 約${U.fmt(size)}が辺境を荒らしている。` });
  }
};

W.offerSpec = (of) => {
  const me = G.me, o = S.myOff(), c = o.c;
  const force = S.armyTotal();
  const boss = G.off[me.boss];
  const role = S.tier() <= 5 && of.ally > force ? 'unit' : 'commander';
  const ec = of.ec;
  if (of.kind === 'hold') {
    // 中都市・小都市・地域を攻め取る
    const h = G.hold[of.hid];
    const kind = h.k === 'mid' ? 'siege' : 'field';
    of.foe = Math.max(20, S.holdDef(h));
    const foeCmd = h.o === G.prov[h.pid].o && U.ch(0.6) ? U.pick(S.officersOf(h.o, x => ['senn', 'sanz', 'goz'].includes(x.r))) || null : null;
    return W.buildSpec({
      kind, pid: h.pid, at: { x: h.x, y: h.y }, from: of.from, title: of.title,
      A: { c, troops: of.ally, addMe: true, cmd: role === 'unit' ? boss : o, officers: [] },
      B: { c: h.o, troops: of.foe, cmd: foeCmd },
      me: 'A', role, cityOf: kind === 'siege' ? 'B' : null, wall: h.w || 10,
      maxDays: kind === 'siege' ? 2 : 1,
      ctx: { offer: of.id, kind: 'hold', hid: h.id, ec: h.o },
    });
  }
  if (of.kind === 'pirate') {
    return W.buildSpec({
      kind: 'naval', pid: of.pid, title: of.title,
      A: { c, troops: of.ally, addMe: true, cmd: role === 'unit' ? boss : o, officers: [] },
      B: { c, troops: of.foe, cmd: null, bandit: true, pirate: of.pirate, tr: 48 },
      me: 'A', role, maxDays: 1,
      ctx: { offer: of.id, kind: 'pirate', ec: 'pirate' },
    });
  }
  const foeCmd = ec === 'bandit' || ec === 'nomad' ? null : U.pick(S.officersOf(ec, x => ['goz', 'sanz', 'senn', 'shog'].includes(x.r)) || [null]);
  return W.buildSpec({
    kind: of.kind === 'skirmish' ? 'skirmish' : of.kind, pid: of.pid, from: of.from, title: of.title, theme: typeof GEO !== 'undefined' && GEO.built ? undefined : S.P[of.from || of.pid]?.t,
    A: { c, troops: of.ally, addMe: true, cmd: role === 'unit' ? boss : o, officers: [] },
    B: { c: ec === 'bandit' || ec === 'nomad' ? c : ec, troops: of.foe, cmd: foeCmd, bandit: ec === 'bandit', nomad: ec === 'nomad', raid: of.raid, tr: ec === 'bandit' ? 20 : undefined },
    me: 'A', role,
    maxDays: 1,
    ctx: { offer: of.id, kind: of.kind, ec },
  });
};

W.afterOffer = (of, res) => {
  const me = G.me;
  G.offers = G.offers.filter(x => x.id !== of.id);
  const br = res.br;
  const won = br.winner === 0;
  if (of.kind === 'bandit') {
    if (won && me.jur) { me.jur.bandits = Math.max(0, me.jur.bandits - 1); me.jur.order = Math.min(100, me.jur.order + 6); me.jur.loyal = Math.min(100, me.jur.loyal + 3); }
    if (won) G.prov[of.pid].order = Math.min(100, G.prov[of.pid].order + 2);
    W.taskEvent('bandit', of.pid, won);
  }
  if (of.kind === 'pirate') {
    const P0 = G.prov[of.pid];
    if (won) { P0.order = Math.min(100, P0.order + 3); P0.comm = Math.min(100, (P0.comm || 0) + 2); const loot = Math.round(of.foe * U.rf(2, 6)); me.gold += loot; S.log(`海賊を討った。沿岸の村と商船が安堵している。奪い返した積み荷 金${U.fmt(loot)}`, 'good'); }
    else { P0.comm = Math.max(0, (P0.comm || 0) - 2); S.log('海賊を取り逃がした。沿岸の商いが細っている。', 'bad'); }
  }
  if (of.kind === 'skirmish' && of.from) {
    const fp = G.prov[of.from];
    if (won) { fp.troops = Math.max(0, fp.troops - Math.round(of.foe * 0.4)); }
    else G.prov[of.pid].troops = Math.max(0, G.prov[of.pid].troops - Math.round(S.armyTotal() * 0.2));
  }
  if (of.kind === 'hold') {
    const h = G.hold[of.hid];
    if (h) {
      const myC = S.myOff().c, s0 = br.sides[0], s1 = br.sides[1];
      const defLoss = Math.max(0, s1.start - s1.alive - s1.routed * 0.6);
      const allyLoss = of.ally ? Math.round(of.ally * Math.max(0, s0.start - s0.alive - s0.routed * 0.6) / Math.max(1, s0.start)) : 0;
      const home = G.prov[of.from];
      if (home && home.o === myC) home.troops = Math.max(0, home.troops - allyLoss);
      W.holdLoss(h, defLoss);
      const taken = won && (h.k !== 'mid' || br.cityTaken || br.winner === 0);
      if (taken && h.o !== myC && S.atWar(myC, h.o)) {
        // 守備兵は駐屯地の軍から出す
        let gar = 0;
        if (home && home.o === myC && home.id !== h.pid) { gar = Math.round(Math.min(D.HOLDK[h.k].cap, home.troops * 0.03, Math.max(D.HOLDK[h.k].floor, (of.ally - allyLoss) * 0.5))); home.troops -= gar; }
        W.takeHold(h, myC, gar);
        W.gainMerit(D.HOLDK[h.k].merit * S.tier(), `${S.holdLabel(h)}を奪った`);
        for (const t of me.tasks) if (t.k === 'hold' && t.hid === h.id) t.done = true;
      }
    }
  }
  if (of.kind === 'raid') {
    const tp = G.prov[of.tgt];
    if (won) { tp.troops = Math.max(0, tp.troops - Math.round(of.foe * 0.6)); tp.loyal = Math.max(5, tp.loyal - 6); tp.agri = Math.max(5, tp.agri - 3); const loot = Math.round(of.foe * U.rf(3, 8)); me.gold += loot; S.log(`${S.P[of.tgt].name}への出撃は成功。略奪品 金${U.fmt(loot)}`, 'good'); }
    const d = S.dip(S.myOff().c, tp.o); d.rel = Math.max(-100, d.rel - 8);
    if (d.st !== 'war' && d.rel < -60 && U.ch(0.4)) W.declareWar(tp.o, S.myOff().c);
  }
};

/* ---------- 任務（評定） ---------- */
W.taskTemplates = () => {
  const me = G.me, o = S.myOff(), rk = D.RANKS[me.rank], tier = rk.tier, c = o.c;
  const T = [];
  const due = G.turn + 3;
  const base = 30 * tier * tier / 2 + 20;
  if (me.jur) {
    const j = me.jur;
    T.push({ k: 'dev', stat: 'agri', target: Math.min(100, Math.round(j.agri + 8 + tier)), desc: `${j.name}の農業を${Math.min(100, Math.round(j.agri + 8 + tier))}まで上げよ`, due, rew: base });
    T.push({ k: 'dev', stat: 'order', target: Math.min(100, Math.round(j.order + 10)), desc: `${j.name}の治安を${Math.min(100, Math.round(j.order + 10))}まで上げよ`, due, rew: base });
    T.push({ k: 'dev', stat: 'comm', target: Math.min(100, Math.round(j.comm + 8)), desc: `${j.name}の商業を${Math.min(100, Math.round(j.comm + 8))}まで上げよ`, due, rew: base });
    T.push({ k: 'bandit', pid: j.prov, desc: `${S.P[j.prov].name}の盗賊を討伐せよ`, due, rew: base * 1.2 });
    T.push({ k: 'gold', amount: Math.round(300 * tier * tier), desc: `国庫に金${U.fmt(300 * tier * tier)}を納めよ`, due, rew: base * 0.8 });
  }
  if (S.isMilLike()) {
    const tgt = Math.min(95, Math.round(S.avgTraining() + 10));
    T.push({ k: 'train', target: tgt, desc: `部隊の練度を${tgt}まで上げよ`, due, rew: base });
    T.push({ k: 'merit', target: Math.round(20 * tier * tier), start: me.merit, desc: `戦場で功績${Math.round(20 * tier * tier)}を挙げよ`, due, rew: base * 1.2 });
    if (tier >= 2) T.push({ k: 'troops', target: Math.round(S.armyTotal() * 1.0 + 1), desc: `兵を欠員なく揃えよ（${U.fmt(S.armyCap())}）`, due, rew: base * 0.7, full: true });
    const enemyAdj = S.adj(me.loc).filter(q => S.atWar(c, G.prov[q].o));
    if (enemyAdj.length) { const q = U.pick(enemyAdj); T.push({ k: 'scout', pid: q, desc: `${S.P[q].name}の敵情を偵察せよ`, due, rew: base * 0.9 }); }
    const hts = G.hold ? W.playerHoldTargets() : [];
    if (tier >= 2 && tier <= 6 && hts.length) { const h = U.pick(hts); T.push({ k: 'hold', hid: h.id, pid: h.pid, desc: `${S.P[h.pid].name}の${S.holdLabel(h)}を奪え`, due, rew: base * 1.3 }); }
    if (tier >= 7 && enemyAdj.length) { const q = U.pick(enemyAdj); T.push({ k: 'conquer', pid: q, desc: `${S.P[q].name}を攻略せよ（攻略の許可を与える）`, due: G.turn + 4, rew: base * 3 }); }
  }
  if (me.rank === 'daij' && me.min === 'tenkaku' || me.rank === 'josh') {
    const others = D.CORDER.filter(x => x !== c && G.cty[x].alive);
    const x = U.pick(others); const tgt = Math.min(100, Math.round(S.dip(c, x).rel + 20));
    T.push({ k: 'diplo', cty: x, target: tgt, desc: `${S.cname(x)}との関係を${tgt}以上にせよ`, due, rew: base * 1.3 });
  }
  if (tier >= 3) T.push({ k: 'talent', start: me.army.subs.length, desc: '人材を一人登用せよ', due, rew: base * 0.9 });
  return T;
};
W.taskEvent = (kind, pid, ok) => {
  for (const t of G.me.tasks) if (t.k === kind && (!t.pid || t.pid === pid) && ok) t.done = true;
};
W.checkTasks = async () => {
  const me = G.me;
  const out = [];
  for (const t of me.tasks) {
    let done = t.done;
    if (!done) {
      if (t.k === 'dev' && me.jur && me.jur[t.stat] >= t.target) done = true;
      if (t.k === 'train' && S.avgTraining() >= t.target) done = true;
      if (t.k === 'merit' && me.merit - t.start >= t.target) done = true;
      if (t.k === 'troops' && S.armyTotal(false) >= S.armyCap() * 0.98) done = true;
      if (t.k === 'talent' && me.army.subs.length > t.start) done = true;
      if (t.k === 'gold' && (me.flags.paid || 0) - (t.paid0 || 0) >= t.amount) done = true;
      if (t.k === 'diplo' && S.dip(S.myOff().c, t.cty).rel >= t.target) done = true;
      if (t.k === 'conquer' && G.prov[t.pid].o === S.myOff().c) done = true;
      if (t.k === 'hold' && G.hold && G.hold[t.hid] && G.hold[t.hid].o === S.myOff().c) done = true;
    }
    if (done) { t.res = 'ok'; out.push(t); }
    else if (G.turn >= t.due) { t.res = 'fail'; out.push(t); }
  }
  for (const t of out) {
    me.tasks = me.tasks.filter(x => x !== t);
    const boss = G.off[me.boss];
    if (t.res === 'ok') {
      const gold = Math.round(t.rew * 8);
      me.gold += gold;
      W.gainMerit(Math.round(t.rew), '任務達成：' + t.desc);
      if (boss) boss.bond = Math.min(100, boss.bond + 6);
      S.log(`任務達成！ 褒美 金${U.fmt(gold)}`, 'good');
    } else {
      W.gainMerit(-Math.round(t.rew * 0.4), '任務失敗：' + t.desc);
      if (boss) boss.bond = Math.max(-100, boss.bond - 8);
    }
  }
  return out;
};

W.council = async () => {
  const me = G.me, o = S.myOff(), c = o.c, cc = G.cty[c];
  if (G.month % 3 !== 1 || me.lastCouncil === G.turn) return;
  me.lastCouncil = G.turn;
  const policies = [
    { v: 'expand', label: '攻略', sub: '隣国への侵攻を優先する' },
    { v: 'develop', label: '内政', sub: '農業・商業の開発を急ぐ' },
    { v: 'military', label: '軍備', sub: '徴兵と城壁を強化する' },
    { v: 'order', label: '治安', sub: '治安と民心を立て直す' },
    { v: 'balance', label: '均衡', sub: 'バランスよく国を運営する' },
  ];
  if (S.isTop()) {
    const pick = await HOOK.choose({ title: '評定', seal: '評定', body: `この三か月の国の方針を定める。現在：${policies.find(p => p.v === cc.policy)?.label || '均衡'}`, choices: policies });
    cc.policy = pick || cc.policy;
    // 将軍たちの攻略上奏
    const plans = W.campaignPlans(c).slice(0, 3).filter(p => p.odds > 0.8);
    if (plans.length && cc.policy !== 'develop') {
      const ch = plans.map(p => ({ v: p, label: `${S.P[p.src].name}から${S.P[p.tgt].name}を攻める`, sub: `兵${U.fmt(p.atk)} 対 守備${U.fmt(p.def)}（見込み ${p.odds >= 1.4 ? '有利' : p.odds >= 1 ? '五分' : '不利'}）` }));
      ch.push({ v: null, label: '今は攻めない' });
      const pl = await HOOK.choose({ title: '諸将の上奏', body: '将軍たちから攻略の献策があった。', choices: ch });
      if (pl) G.pend.push({ k: 'camp', plan: pl, c });
    }
  } else {
    // AI君主の方針
    const ruler = G.off[cc.ruler];
    const atWar = D.CORDER.some(x => x !== c && G.cty[x].alive && S.atWar(c, x));
    const avgOrder = U.avg(S.ownedProvs(c), p => p.order);
    cc.policy = avgOrder < 40 ? 'order' : atWar && U.ch(0.55) ? (U.ch(0.5) ? 'expand' : 'military') : U.pick(['develop', 'balance', 'military']);
    const pol = policies.find(p => p.v === cc.policy);
    // 任務の割り当て
    const tmpl = U.shuffle(W.taskTemplates()).slice(0, 3);
    const choices = tmpl.map(t => ({ v: t, label: t.desc, sub: `期限：${3}か月　報酬：功績${Math.round(t.rew)}` }));
    choices.push({ v: null, label: '今回は任務を受けない' });
    const maxTasks = 2;
    let body = `${G.off[cc.ruler]?.n || '君主'}は方針を「${pol.label}」と定めた。`;
    if (me.tasks.length >= maxTasks) body += '\n（遂行中の任務が多いため、新しい任務は受けられない）';
    if (me.tasks.length < maxTasks) {
      const t = await HOOK.choose({ title: '評定', seal: '評定', who: G.off[me.boss] || ruler, body: body + '\n上官から任務状が届いた。', choices });
      if (t) { me.tasks.push(Object.assign({ id: U.uid(), paid0: me.flags.paid || 0 }, t)); S.log(`任務を受けた：${t.desc}`); }
    } else await HOOK.info({ title: '評定', seal: '評定', who: G.off[me.boss] || ruler, body });
  }
};

/* ---------- 年度の考課（九月末） ---------- */
W.annualReview = async () => {
  if (G.month !== 9) return;
  const me = G.me, o = S.myOff();
  const lines = [];
  let merit = 0;
  if (me.jur) {
    const j = me.jur, b = j.base;
    const d = (j.agri - b.agri) + (j.comm - b.comm) + (j.order - b.order) * 0.8 + (j.loyal - b.loyal) * 0.8 + (j.cult - b.cult) * 0.5 + (j.hh - b.hh) / Math.max(1, b.hh) * 100;
    merit += Math.round(Math.max(-20, d) * (8 + S.tier() * 6) * S.lawMul(o.c, 'dev'));
    lines.push(`管轄の伸び：農${Math.round(j.agri - b.agri)} 商${Math.round(j.comm - b.comm)} 治${Math.round(j.order - b.order)} 民${Math.round(j.loyal - b.loyal)}`);
    j.base = { agri: j.agri, comm: j.comm, order: j.order, loyal: j.loyal, cult: j.cult, hh: j.hh, def: j.def };
  }
  if (S.isMilLike()) {
    const t = S.avgTraining();
    merit += Math.round((t - 40) * S.tier() * 4);
    lines.push(`部隊の練度：${Math.round(t)}`);
  }
  if (me.rank === 'daij' || me.rank === 'gyos' || me.rank === 'josh') {
    const cc = S.myCty();
    const avg = U.avg(S.ownedProvs(o.c), p => (p.agri + p.comm + p.order + p.loyal) / 4);
    merit += Math.round((avg - 50) * 60 + (me.flags.natWork || 0) * 120);
    me.flags.natWork = 0;
    lines.push(`国の内政平均：${Math.round(avg)}`);
  }
  if (me.rank !== 'kuns') {
    W.gainMerit(merit, '年度の考課');
    await HOOK.info({ title: '年度の考課', seal: '考課', body: `九月末、一年の働きが評価された。\n${lines.join('\n')}\n評価：功績${merit >= 0 ? '+' : ''}${U.num(merit)}` });
    await W.checkPromotion('年度の考課による昇進');
  }
};

/* ---------- 年齢・死去・人材 ---------- */
W.aging = () => {
  if (G.month !== 1) return;
  for (const o of Object.values(G.off)) {
    if (!o.alive) continue;
    o.age++;
    if (o.player) continue;
    let p = (o.age > 58 ? (o.age - 58) / 110 : 0.003) * Math.max(0.2, 1 - S.fx(o, 'health'));
    if (o.hist && o.death && G.year >= o.death) p = Math.max(p, 0.6);
    if (o.hist && o.death && G.year < o.death - 1) p *= 0.2;
    if (U.ch(p)) W.killOfficer(o.id, '病没');
  }
  const me = S.myOff();
  if (me.age >= 62 && !(G.custom && G.custom.noAge) && U.ch((me.age - 60) / 60 * Math.max(0.2, 1 - S.fx(me, 'health')))) G.over = { kind: 'age', text: `${me.n}は${me.age}歳で天寿を全うした。` };
  // 新しい人材
  for (const c of D.CORDER) if (G.cty[c].alive) {
    const n = U.ri(1, 2) + (S.lawOn(c, 'kakkei') ? 1 : 0);
    for (let i = 0; i < n; i++) { const x = S.genOfficer(c, U.pick(['senn', 'sanz', 'goz', 'kenr'])); x.age = U.ri(18, 30); }
    // 欠けた将軍を補う
    const gens = S.officersOf(c, o => ['dais', 'shog'].includes(o.r));
    if (gens.length < 4) { const best = U.maxBy(S.officersOf(c, o => o.r === 'goz'), o => o.tou); if (best) best.r = 'shog'; else S.genOfficer(c, 'shog'); }
  }
};

/* ---------- 連合軍（強国への包囲） ---------- */
W.coalitionCheck = async () => {
  if (G.month !== 2 && G.month !== 8) return;
  const alive = D.CORDER.filter(c => G.cty[c].alive);
  if (alive.length < 4) return;
  const totalPop = U.sum(Object.values(G.prov), p => p.pop);
  const dom = U.maxBy(alive, c => S.countryPop(c));
  const share = S.countryPop(dom) / totalPop;
  if (share < 0.36 || (G.flags.lastCoalition && G.turn - G.flags.lastCoalition < 30)) return;
  if (!U.ch(0.45)) return;
  const members = alive.filter(c => c !== dom && S.dip(c, dom).rel < 25 && S.dip(c, dom).st !== 'ally');
  if (members.length < 3) return;
  G.flags.lastCoalition = G.turn;
  for (const a of members) for (const b of members) if (a < b) { const d = S.dip(a, b); d.st = 'ally'; d.t = 12; d.rel = Math.max(d.rel, 30); }
  for (const m of members) { const d = S.dip(m, dom); d.st = 'war'; d.since = G.turn; d.rel = -80; }
  // 主攻の目標
  const border = S.ownedProvs(dom).filter(p => S.adj(p.id).some(q => members.includes(G.prov[q].o)));
  const tgt = U.maxBy(border, p => (S.P[p.id].pass ? 50 : 0) + S.adj(p.id).filter(q => members.includes(G.prov[q].o)).length * 10 + p.pop / 10);
  if (!tgt) return;
  let total = 0; const leadC = U.maxBy(members, c => S.countryPower(c)); const contrib = {};
  for (const m of members) { const n = Math.round(S.countryTroops(m) * 0.33); contrib[m] = n; total += n; for (const p of S.ownedProvs(m)) p.troops = Math.round(p.troops * 0.67); }
  const src = S.adj(tgt.id).find(q => members.includes(G.prov[q].o));
  S.log(`【連合軍】${members.map(S.cname).join('・')}が連合し、${S.cname(dom)}へ攻め寄せる！ 総勢${U.fmt(total)}`, 'big');
  S.chron(`連合軍${U.fmt(total)}、${S.cname(dom)}の${S.P[tgt.id].name}に迫る。`);
  G.pend.push({ k: 'coalition', members, dom, tgt: tgt.id, src, total, leadC, contrib });
};
W.runCoalition = async (pc) => {
  const tgt = G.prov[pc.tgt];
  if (tgt.o !== pc.dom) return;
  const leadCmd = S.bestGeneral(pc.leadC);
  const camp = { id: U.uid(), atk: pc.leadC, def: pc.dom, src: pc.src, tgt: pc.tgt, atkTroops: pc.total, defTroops: Math.round(tgt.troops + S.countryTroops(pc.dom) * 0.35), atkCmd: leadCmd?.id, defCmd: W.pickCommander(pc.dom, pc.tgt)?.id, kind: S.P[pc.tgt].pass ? 'pass' : 'field', coalition: pc.members, contrib: pc.contrib || Object.fromEntries(pc.members.map(m => [m, 1])) };
  // 防衛側は増援を集める（狙われた郡へ）
  let reinf = 0;
  for (const p of S.ownedProvs(pc.dom)) if (p.id !== pc.tgt) { const mv = Math.round(p.troops * 0.35); p.troops -= mv; reinf += mv; }
  tgt.troops += reinf;
  const myC = S.myOff().c;
  if (pc.members.includes(myC) && myC !== pc.leadC) { camp.atk = myC; camp.atkCmd = W.pickCommander(myC, G.me.loc)?.id || camp.atkCmd; camp.src = G.me.loc; }
  const res = await W.resolveCampaign(camp);
  if (res.win === 'atk' || res.capture) S.log('連合軍が勝利した！', 'big'); else { S.log(`連合軍は${S.cname(pc.dom)}に退けられた。`, 'big'); if (pc.dom === myC) G.me.rec.coalitions = (G.me.rec.coalitions || 0) + 1; }
};

/* ---------- 月の進行 ---------- */
W.endMonth = async () => {
  const me = G.me, o = S.myOff();
  G.report = [];
  S.refreshLiveNames();
  const rep = s => G.report.push(s);
  // 1. 主人公の経済
  for (const l of W.playerEconomy()) rep(l);
  // 2. 各国
  for (const c of D.CORDER) if (G.cty[c].alive) { W.countryEconomy(c); W.develop(c); const cc = G.cty[c]; if (cc.weary) cc.weary = Math.max(0, cc.weary - (S.ownedProvs(c).some(p => S.adj(p.id).some(q => G.prov[q].o !== c && S.atWar(c, G.prov[q].o))) ? 0.01 : 0.02)); }
  // 3. 外交
  await W.diplomacyAI();
  // 4. 戦争
  await W.histOffensive();
  if (G.over) return;
  const camps = W.warAI();
  // 君主・丞相が承認した遠征
  for (const pd of G.pend.filter(x => x.k === 'camp')) {
    const plan = pd.plan; const src = G.prov[plan.src];
    if (src.o !== pd.c || !S.atWar(pd.c, G.prov[plan.tgt].o)) continue;
    const camp = W.makeCampaign(pd.c, Object.assign({}, plan, { atk: Math.round(src.troops * 0.68) }));
    camps.push(camp);
  }
  const coalitions = G.pend.filter(x => x.k === 'coalition');
  G.pend = G.pend.filter(x => x.k !== 'camp' && x.k !== 'coalition');
  for (const camp of camps) {
    if (G.over) break;
    if (G.prov[camp.tgt].o !== camp.def || G.prov[camp.src].o !== camp.atk) continue;
    await W.resolveCampaign(camp);
  }
  for (const pc of coalitions) { if (G.over) break; await W.runCoalition(pc); }
  if (G.over) return;
  // 中都市・小都市・地域の奪い合い
  W.localWarAI();
  W.holdUpkeep();
  const lr = W.landReport(); if (lr) rep(lr);
  // 包囲と季節
  if (W.siegeMonthly) { await W.siegeMonthly(); if (G.over) return; for (const l of W.siegeReport()) rep(l); }
  if (W.seasonMonthly) await W.seasonMonthly();
  // 5. 事件
  await EV.monthly();
  if (G.over) return;
  if (typeof PPL !== 'undefined') await PPL.monthly();
  if (G.over) return;
  // 6. 任務
  await W.checkTasks();
  // 7. 上計
  await W.annualReview();
  // 8. 管轄の自然変化
  if (me.jur) {
    const j = me.jur;
    j.order = U.clamp(j.order + U.rf(-1.8, 0.8) - j.bandits * 0.8, 5, 100);
    j.loyal = U.clamp(j.loyal + U.rf(-1, 0.8), 5, 100);
    j.hh = Math.round(j.hh * (1 + 0.0006 * (j.loyal / 60)));
    if (U.ch((0.12 + (100 - j.order) / 300) * Math.max(0.3, 1 - 0.12 * (G.me.land.fac.tower || 0)))) { j.bandits = Math.min(5, j.bandits + 1); rep(`${j.name}に盗賊が出没しはじめた。`); }
  }
  // 9. 年齢
  W.aging();
  // 10. 日付
  G.month++; if (G.month > 12) { G.month = 1; G.year++; }
  G.turn++;
  me.ap = S.apMax();
  // 爵は一か月に一段ずつ。率いる兵は功績に応じて増える
  const ju = S.juePromote(); if (ju) W.logJue(ju);
  W.growArmy();
  // 本国の滅亡
  if (G.flags.homeFallen && !G.over) await W.homeFallen();
  // 統一
  W.checkUnification();
  // 11. 評定と次の月の機会
  if (!G.over) await W.council();
  W.genOffers();
  // 主人公の再配置（上官の移動）
  if (S.isMilLike() && me.gen && me.gen !== o.id && G.off[me.gen] && G.off[me.gen].alive && G.off[me.gen].loc && G.prov[G.off[me.gen].loc]?.o === o.c && D.RANKS[me.rank].tier <= 6) me.loc = G.off[me.gen].loc;
  o.loc = me.loc;
  if (!G.over) await W.flushFame();
  if (typeof ACH !== 'undefined') { try { await ACH.check(false); } catch (e) { console.error(e); } }
  return G.report;
};

W.homeFallen = async () => {
  const by = G.flags.homeFallen; G.flags.homeFallen = null;
  const me = G.me, o = S.myOff();
  const pick = await HOOK.choose({ title: `${S.cname(o.c)}滅亡`, seal: '亡国', body: `祖国は${S.cname(by)}に滅ぼされた。これからどうする？`, choices: [{ v: 'serve', label: `${S.cname(by)}に仕官する` }, { v: 'end', label: '亡国の臣として野に下る（終幕）' }] });
  if (pick === 'serve') {
    o.c = by; me.loc = W.capital(by); o.loc = me.loc;
    const t = Math.max(1, S.tier() - 2);
    const tk = D.RANKS[me.rank].track;
    me.rank = S.rankAtTier(tk === 'top' ? 'civ' : tk, t); o.r = me.rank;
    me.merit = D.RANKS[me.rank].m; o.merit = me.merit;
    me.grade = 0; me.stepT = G.turn;
    me.army.sq = me.army.sq.filter(s => s.pv); me.tasks = [];
    if (D.JUR[me.rank]) S.setupJur(me.rank, me.loc); else me.jur = null;
    const cap = D.RANKS[me.rank].troops;
    if (cap > 0) { const sp = S.compSplit(by, cap); for (const ty in sp) me.army.sq.push(S.newSquad(ty, sp[ty], { tr: 35 })); }
    S.setupChainAfterPromotion(me.rank);
    S.log(`${S.cname(by)}に${D.RANKS[me.rank].name}として仕えることになった。`, 'big');
  } else {
    G.over = { kind: 'fallen', text: `${S.cname(o.c)}は滅び、${o.n}は野に下った。` };
  }
};

W.checkUnification = () => {
  const alive = D.CORDER.filter(c => G.cty[c].alive);
  const my = S.myOff().c;
  if (alive.length === 1 && alive[0] === my) G.over = { kind: 'unify', text: `${S.cname(my)}が地中海を統一した！` };
};

/* ---------- 遠征（主人公の命令） ---------- */
W.launchPlayerCampaign = (tgt, troops, opts = {}) => W.launchExpedition(tgt, troops, opts);
