/* =========================================================
   地中海覇道 — siege（包囲戦・兵站・季節）
   - 包囲：大都市を攻める遠征で、強襲せずに城を囲む。月をまたいで続き、
     兵糧攻め・水攻め・坑道・内応・強襲・救援戦がある（G.sieges）
   - 兵站：補給線（自領からの遠さ）で遠征軍の士気と消耗が変わる
   - 季節：冬の消耗、雪解けの増水と渡河、秋の収穫の略奪
   ========================================================= */
W.season = () => D.SEASON(G.month);
W.isWinter = () => G.month >= 10;
W.isRainy = () => G.month === 5 || G.month === 6;
W.isAutumn = () => G.month >= 7 && G.month <= 9;

/* ---------- 兵站：補給線 ---------- */
// 国 c から見た、州 pid の補給のよさ（0.2〜1）。隣接の自領からなら 1、遠いほど下がる。拠点を持っていれば上がる
W.supplyIndex = (c, pid, cmd) => {
  const P = G.prov[pid]; if (!P) return 1;
  if (P.o === c) return 1;
  let idx = 0.25;
  const seen = new Set([pid]); let frontier = [pid], d = 0, found = false;
  while (frontier.length && d < 4 && !found) {
    d++; const next = [];
    for (const p of frontier) for (const q of S.adj(p)) {
      if (seen.has(q)) continue; seen.add(q);
      if (G.prov[q] && G.prov[q].o === c) { idx = d === 1 ? 1 : d === 2 ? 0.7 : d === 3 ? 0.45 : 0.3; found = true; break; }
      next.push(q);
    }
    frontier = next;
  }
  idx *= 0.75 + 0.25 * (typeof S.shareOf === 'function' ? S.shareOf(P, c) : 0);
  if (cmd && S.fx(cmd, 'upkeep') > 0) idx = Math.min(1, idx + 0.15);
  if (W.isWinter()) idx *= 0.85;
  return U.clamp(idx, 0.15, 1);
};
W.supplyLabel = (v) => v >= 0.9 ? '万全' : v >= 0.65 ? '十分' : v >= 0.4 ? '細い' : '途絶えがち';

/* ---------- 包囲 ---------- */
W.sieges = () => (G.sieges = G.sieges || []);
W.siegeOf = (pid) => W.sieges().find(s => s.tgt === pid) || null;
// 包囲で下がる城の守り（月を重ねるほど、坑道・水攻めが成れば大きく）
W.siegeFortMul = (sg) => Math.max(0.3, (1 - Math.min(0.4, sg.months * 0.07)) * (sg.tunnel >= 3 ? 0.6 : 1) * (sg.water >= 3 ? 0.7 : 1));
W.siegeStart = (camp, atk, inv, playerCmd) => {
  const P = G.prov[camp.tgt];
  const sg = {
    id: U.uid(), tgt: camp.tgt, atk: camp.atk, def: camp.def, src: camp.src, troops: Math.round(atk), cmd: camp.atkCmd || null,
    months: 0, food: Math.round(2 + P.wall / 30 + P.agri / 60), water: 0, tunnel: 0, playerLed: !!playerCmd,
    inv: inv ? { side: inv.side, role: inv.role } : null, started: G.turn,
  };
  W.sieges().push(sg); P.besieged = sg.id;
  const my = S.myOff().c;
  S.log(`${S.cname(camp.atk)}軍 ${U.fmt(sg.troops)} が${S.P[camp.tgt].name}の${S.bigName(camp.tgt)}を囲んだ。`, camp.atk === my ? 'good' : camp.def === my ? 'bad' : 'info');
  if (S.P[camp.tgt].cap) S.chron(`${S.cname(camp.atk)}、${S.P[camp.tgt].name}を包囲。`);
  return sg;
};
// 包囲を解く：兵は出発の州（なければ近い自領）へ戻る
W.siegeLift = (sg, why) => {
  const i = W.sieges().indexOf(sg); if (i >= 0) W.sieges().splice(i, 1);
  const P = G.prov[sg.tgt]; if (P && P.besieged === sg.id) P.besieged = null;
  const back = (G.prov[sg.src] && G.prov[sg.src].o === sg.atk) ? G.prov[sg.src] : (S.adj(sg.tgt).map(q => G.prov[q]).find(p => p.o === sg.atk) || (S.ownedProvs(sg.atk)[0] || null));
  if (back) back.troops += Math.max(0, Math.round(sg.troops));
  const my = S.myOff().c;
  S.log(`${S.cname(sg.atk)}軍は${S.P[sg.tgt].name}の包囲を解いた（${why}）。`, sg.atk === my ? 'bad' : sg.def === my ? 'good' : 'info');
};
// 開城・陥落
W.siegeCapture = (sg, why) => {
  const i = W.sieges().indexOf(sg); if (i >= 0) W.sieges().splice(i, 1);
  const P = G.prov[sg.tgt]; if (!P) return;
  P.besieged = null;
  const my = S.myOff().c;
  const g = Math.round(sg.troops * 0.6);
  P.troops = g;
  if (sg.water >= 3) { P.pop = Math.round(P.pop * 0.96 * 10) / 10; P.loyal = Math.max(5, P.loyal - 12); P.agri = Math.max(5, P.agri - 10); }
  W.capture(sg.tgt, sg.atk, sg.def);
  const back = (G.prov[sg.src] && G.prov[sg.src].o === sg.atk) ? G.prov[sg.src] : null;
  if (back) back.troops += Math.max(0, sg.troops - g);
  S.log(`${S.P[sg.tgt].name}の${S.bigName(sg.tgt)}は${why}。`, sg.atk === my ? 'good' : sg.def === my ? 'bad' : 'info');
  if (sg.playerLed && !G.over) { W.gainMerit(Math.round(60 * S.tier()), `${S.P[sg.tgt].name}の${S.bigName(sg.tgt)}を落とした`); G.me.rec.cities = (G.me.rec.cities || 0) + 1; if (why !== '強襲で落ちた') G.me.rec.sieges = (G.me.rec.sieges || 0) + 1; }
  try { if (typeof HOOK.cutin === 'function' && (sg.atk === my || sg.def === my)) HOOK.cutin({ kind: 'banner', title: sg.atk === my ? '落城' : '落城……', sub: `${S.P[sg.tgt].name}の${S.bigName(sg.tgt)}${sg.atk === my ? 'を落とした！' : 'が落ちた'}（${why}）`, color: sg.atk === my ? '#f3d27a' : '#e07a5f', snd: sg.atk === my ? 'victory' : 'defeat', dur: 2200 }); } catch (e) {}
};
// 強襲：遠征の攻城戦だけを行う
W.siegeAssault = async (sg) => {
  const P = G.prov[sg.tgt];
  const camp = { id: U.uid(), atk: sg.atk, def: sg.def, src: sg.src, tgt: sg.tgt, atkTroops: sg.troops, defTroops: P.troops, atkCmd: sg.cmd, defCmd: W.pickCommander(sg.def, sg.tgt)?.id, kind: 'siege', drawn: true, fromSiege: sg, playerLed: sg.playerLed, inv: sg.inv ? Object.assign({}, sg.inv) : (sg.playerLed ? { side: 'atk', role: 'commander' } : null) };
  if (camp.inv && !sg.playerLed && sg.atk !== S.myOff().c && sg.def !== S.myOff().c) camp.inv = null;
  return await W.runExpedition(camp);
};
// 内応：守りの将のうち忠誠の低い者を誘う
W.siegeInsider = async (sg) => {
  const P = G.prov[sg.tgt];
  const offs = S.officersOf(sg.def, o => o.loc === sg.tgt && !o.player);
  const x = U.minBy(offs, o => (o.loy || 70) + Math.random() * 10) || null;
  const loy = x ? (x.loy || 70) : 80;
  const p = U.clamp(0.12 + (70 - loy) / 120 + sg.months * 0.05 + (sg.food <= 1 ? 0.15 : 0), 0.05, 0.8);
  if (U.ch(p)) { if (x) { x.c = sg.atk; x.loy = 55; x.loc = sg.tgt; } W.siegeCapture(sg, x ? `${x.n}の内応で城門が開いた` : '城門が内から開いた'); return { ok: true, who: x }; }
  if (x && U.ch(0.5)) { W.killOfficer(x.id, '内応が露見し処刑'); }
  return { ok: false, who: x };
};
// 救援：守る国が隣の州から兵を送る
W.siegeRelief = async (sg, forced) => {
  const P = G.prov[sg.tgt];
  const srcs = S.adj(sg.tgt).map(q => G.prov[q]).filter(p => p && p.o === sg.def && !p.besieged && p.troops > 500);
  if (!srcs.length) return null;
  const pool = U.sum(srcs, p => p.troops);
  let relief = Math.round(Math.min(pool * 0.5, sg.troops * 1.1) / 100) * 100;
  if (forced && forced.troops) relief = Math.min(pool, forced.troops);
  if (relief < sg.troops * 0.35) return null;
  // 兵を集める
  let need = relief; for (const p of srcs.sort((a, b) => b.troops - a.troops)) { const t = Math.min(need, Math.round(p.troops * 0.6)); p.troops -= t; need -= t; if (need <= 0) break; }
  relief -= Math.max(0, need);
  const my = S.myOff().c;
  const rCmd = (forced && forced.cmd) || W.pickCommander(sg.def, srcs[0].id);
  const sCmd = G.off[sg.cmd] || W.pickCommander(sg.atk, sg.src);
  const title = `${S.P[sg.tgt].name}救援戦`;
  // 主人公が関わるか
  let inv = null;
  if (forced && forced.lead) inv = { side: 'def', role: 'commander' };
  else if (sg.playerLed || (sg.inv && sg.inv.side === 'atk' && sg.atk === my)) inv = { side: 'atk', role: sg.inv && sg.inv.role ? sg.inv.role : 'commander' };
  let atkWon, aLoss, dLoss;
  if (inv) {
    const A = { c: sg.atk, troops: sg.troops, cmd: inv.side === 'atk' && inv.role === 'commander' ? S.myOff() : sCmd, officers: [] };
    const B = { c: sg.def, troops: relief, cmd: inv.side === 'def' ? S.myOff() : rCmd, officers: [] };
    const spec = W.buildSpec({ kind: 'field', pid: sg.tgt, title, A, B, me: inv.side === 'atk' ? 'A' : 'B', role: inv.role === 'top' ? 'commander' : inv.role, ctx: { siege: sg.id, side: inv.side, stage: 'relief' } });
    const br = await HOOK.battle(spec);
    const res = W.applyBattleResult(spec, br);
    const meA = inv.side === 'atk';
    atkWon = meA ? br.winner === 0 : br.winner === 1;
    const s0 = br.sides[0], s1 = br.sides[1];
    const lossOf = (s) => Math.max(0, Math.round(s.start - s.alive - s.routed * 0.6));
    aLoss = meA ? lossOf(s0) : lossOf(s1); dLoss = meA ? lossOf(s1) : lossOf(s0);
    void res;
  } else {
    const r = W.autoResolve(sg.troops, relief, sg.atk, sg.def, sCmd, rCmd, 0.95);
    for (const id of r.slain || []) W.killOfficer(id, '戦死');
    atkWon = r.win === 'atk'; aLoss = r.atkLoss; dLoss = r.defLoss;
  }
  sg.troops = Math.max(0, sg.troops - Math.min(sg.troops, aLoss));
  const left = Math.max(0, relief - dLoss);
  if (atkWon) {
    srcs[0].troops += Math.round(left * 0.7);
    S.log(`${title}：${S.cname(sg.def)}の救援軍 ${U.fmt(relief)} は${S.cname(sg.atk)}軍に敗れた。`, sg.atk === my ? 'good' : sg.def === my ? 'bad' : 'info');
    if (sg.troops < 300) W.siegeLift(sg, '兵が尽きた');
    return { win: 'atk' };
  }
  P.troops += Math.round(left * 0.5); srcs[0].troops += Math.round(left * 0.5);
  S.log(`${title}：${S.cname(sg.def)}の救援軍が${S.cname(sg.atk)}軍を打ち破った。`, sg.def === my ? 'good' : sg.atk === my ? 'bad' : 'info');
  W.siegeLift(sg, '救援軍に敗れた');
  return { win: 'def' };
};
// 包囲の月ごとの進み
W.siegeMonthly = async () => {
  const my = S.myOff().c;
  for (const sg of W.sieges().slice()) {
    if (G.over) return;
    if (!W.sieges().includes(sg)) continue;
    const P = G.prov[sg.tgt];
    if (!P || P.o !== sg.def || !G.cty[sg.atk] || !G.cty[sg.atk].alive) { W.siegeLift(sg, '包囲の意味を失った'); continue; }
    sg.months++;
    const cmd = G.off[sg.cmd];
    const sup = W.supplyIndex(sg.atk, sg.tgt, cmd);
    // 囲む側の消耗：補給が細いほど、冬ほど
    const attr = 0.015 + (1 - sup) * 0.05 + (W.isWinter() ? 0.03 : 0);
    const lostA = Math.round(sg.troops * attr);
    sg.troops = Math.max(0, sg.troops - lostA);
    // 城の中：兵糧が減り、民が苦しむ
    sg.food -= 1 + (sg.water >= 3 ? 1 : 0);
    P.loyal = Math.max(5, P.loyal - 2);
    if (sg.food <= 0) { P.troops = Math.max(0, Math.round(P.troops * 0.9)); }
    // 水攻め・坑道の進み
    if (sg.water > 0 && sg.water < 3) sg.water++;
    else if (sg.water >= 3) { P.wall = Math.max(5, P.wall - 12); P.troops = Math.max(0, Math.round(P.troops * 0.9)); }
    if (sg.tunnel > 0 && sg.tunnel < 3) sg.tunnel++;
    const big = S.bigName(sg.tgt), tn = S.P[sg.tgt].name;
    const involved = sg.playerLed || (sg.atk === my && S.isTop());
    const defInvolved = sg.def === my && (S.isTop() || G.me.loc === sg.tgt);
    // 守る側の救援（主人公が守る国の君主・宰相なら選べる）
    if (defInvolved && S.isTop()) {
      const srcs = S.adj(sg.tgt).map(q => G.prov[q]).filter(p => p && p.o === my && !p.besieged && p.troops > 500);
      const pool = U.sum(srcs, p => p.troops);
      const k = await HOOK.choose({ title: `${tn}の${big}が包囲されている（${sg.months}か月目）`, seal: '軍議', body: `${S.cname(sg.atk)}軍 約${U.fmt(sg.troops)} が城を囲んでいる。城の兵 ${U.fmt(P.troops)}、兵糧はあと約${Math.max(0, sg.food)}か月。${sg.water >= 3 ? '\n敵は川の水を引き、城は水に浸かっている！' : sg.water ? '\n敵が堤を築いている。' : ''}${sg.tunnel >= 3 ? '\n敵の坑道が城壁の下に達した。' : sg.tunnel ? '\n敵が坑道を掘っている。' : ''}\n近くの州の兵 ${U.fmt(pool)}。`, choices: [
        { v: 'relief', label: '救援軍を送る（自ら率いる）', sub: `近くの州から兵を集めて囲みを破る`, disabled: pool < sg.troops * 0.35 },
        { v: 'relief_ai', label: '将に救援を任せる', disabled: pool < sg.troops * 0.35 },
        { v: 'wait', label: '城に耐えさせる', sub: '兵糧が尽きれば城は開く' },
      ] });
      if (k === 'relief' || k === 'relief_ai') { await W.siegeRelief(sg, { troops: Math.round(Math.min(pool * 0.6, sg.troops * 1.2)), lead: k === 'relief', cmd: k === 'relief' ? S.myOff() : null }); if (G.over) return; if (!W.sieges().includes(sg)) continue; }
    } else if (U.ch(0.25 + sg.months * 0.06)) {
      await W.siegeRelief(sg, null);
      if (G.over) return;
      if (!W.sieges().includes(sg)) continue;
    }
    if (sg.troops < 300) { W.siegeLift(sg, '兵が尽きた'); continue; }
    // 兵糧が尽きれば開城
    if (sg.food <= 0 && (!involved || U.ch(0.7))) { W.siegeCapture(sg, '兵糧が尽きて開城した'); continue; }
    // 囲む側の決断
    const fortNow = W.fortMul(sg.tgt, sg.playerLed) * W.isolation(sg.tgt) * W.siegeFortMul(sg);
    const river = ['river', 'marsh'].includes(S.P[sg.tgt].t);
    if (involved) {
      const gold = Math.round(P.troops * 25 + 20000);
      const insiderP = (() => { const offs = S.officersOf(sg.def, o => o.loc === sg.tgt && !o.player); const x = U.minBy(offs, o => o.loy || 70); const loy = x ? (x.loy || 70) : 80; return U.clamp(0.12 + (70 - loy) / 120 + sg.months * 0.05 + (sg.food <= 1 ? 0.15 : 0), 0.05, 0.8); })();
      const k = await HOOK.choose({ title: `${tn}の${big}を包囲中（${sg.months}か月目）`, seal: '包囲', body: `味方 ${U.fmt(sg.troops)}（補給は${W.supplyLabel(sup)}、この月 -${U.fmt(lostA)}）　城の兵 ${U.fmt(P.troops)}\n城の兵糧はあと約${Math.max(0, sg.food)}か月。城壁の守りは${Math.round(W.siegeFortMul(sg) * 100)}%。${sg.water >= 3 ? '\n堤が成り、城は水に浸かっている。' : sg.water ? `\n堤を築いている（あと${3 - sg.water}か月）。` : ''}${sg.tunnel >= 3 ? '\n坑道が城壁の下に達した。強襲すれば城壁が崩れる。' : sg.tunnel ? `\n坑道を掘っている（あと${3 - sg.tunnel}か月）。` : ''}${W.isWinter() ? '\n冬の寒さで兵の消耗が激しい。' : ''}`, choices: [
        { v: 'assault', label: '強襲する', sub: `城壁の守り ${Math.round(fortNow * 100)}%の城を攻める` },
        { v: 'wait', label: '包囲を続ける', sub: '兵糧が尽きるのを待つ' },
        ...(river && !sg.water ? [{ v: 'water', label: '水攻め', sub: '堤を築いて川の水を引く（三か月）。城の守りと兵を削るが、民も死ぬ' }] : []),
        ...(!sg.tunnel ? [{ v: 'tunnel', label: '坑道を掘る', sub: '三か月で城壁の下に達し、強襲で城壁が崩れる' }] : []),
        { v: 'insider', label: '内応を誘う', sub: `金${U.fmt(gold)}　成功 約${Math.round(insiderP * 100)}%`, disabled: G.me.gold < gold },
        { v: 'lift', label: '兵を退く' },
      ] });
      if (k === 'assault') { await W.siegeAssault(sg); if (G.over) return; continue; }
      if (k === 'water') { sg.water = 1; S.log(`${tn}の${big}に水攻めを始めた。`); continue; }
      if (k === 'tunnel') { sg.tunnel = 1; S.log(`${tn}の${big}へ坑道を掘りはじめた。`); continue; }
      if (k === 'insider') { G.me.gold -= gold; const r = await W.siegeInsider(sg); if (!r.ok) await HOOK.info({ title: '内応', body: r.who ? `${r.who.n}への誘いは実らなかった。${r.who.alive ? '' : `${r.who.n}は内応が露見し、城内で処刑された。`}` : '誘いに応じる者はいなかった。' }); continue; }
      if (k === 'lift') { W.siegeLift(sg, '兵を退いた'); continue; }
      continue;
    }
    // AI の決断
    const pers = (typeof PPL !== 'undefined' && cmd) ? PPL.pers(cmd) : 'steady';
    if (sg.troops < P.troops * 0.5) { W.siegeLift(sg, '兵が足りない'); continue; }
    if (sg.months >= 2 && sg.troops >= P.troops * fortNow * (pers === 'bold' || pers === 'siege' ? 0.8 : 1.0) && U.ch(pers === 'bold' ? 0.75 : 0.5)) { await W.siegeAssault(sg); if (G.over) return; continue; }
    if (river && !sg.water && sg.months === 1 && pers === 'cunning' && U.ch(0.5)) { sg.water = 1; S.log(`${S.cname(sg.atk)}軍は${tn}の${big}に水攻めを始めた。`, sg.def === my ? 'bad' : 'info'); continue; }
    if (!sg.tunnel && sg.months === 1 && (pers === 'siege' || pers === 'cunning') && U.ch(0.5)) { sg.tunnel = 1; continue; }
    if (sg.months >= 5 && U.ch(0.3)) { const r = await W.siegeInsider(sg); if (r.ok) continue; }
    if (sg.def === my && !defInvolved) S.log(`${tn}の${big}は${S.cname(sg.atk)}軍に囲まれている（${sg.months}か月目、兵糧あと約${Math.max(0, sg.food)}か月）。`, 'bad');
  }
};
// 月報に出す包囲の様子
W.siegeReport = () => {
  const my = S.myOff().c;
  return W.sieges().filter(sg => sg.atk === my || sg.def === my).map(sg => `${S.P[sg.tgt].name}の${S.bigName(sg.tgt)}：${S.cname(sg.atk)}軍 ${U.fmt(sg.troops)} が包囲中（${sg.months}か月目、城の兵糧あと約${Math.max(0, sg.food)}か月）`);
};

/* ---------- 季節 ---------- */
W.seasonMonthly = async () => {
  const my = S.myOff().c;
  const rep = s => G.report && G.report.push(s);
  if (G.month === 1) rep('春：雪が解け、海も開いた。遠征の季節が来た。');
  if (G.month === 5) rep('増水：山の雪解け水で川があふれ、渡河の攻めは難しい。');
  if (G.month === 7) rep('秋：ぶどうと穀物の取り入れの季節。敵領の実りを奪う「収穫の略奪」の好機。');
  if (G.month === 10) rep('冬：軍は冬営に入る季節。遠征は兵を損ない、城を囲む軍も凍える。');
  // 秋：各国の収穫の略奪（国境の州の実りを奪い合う）
  if (W.isAutumn()) {
    for (const c of D.CORDER) {
      if (!G.cty[c].alive || !U.ch(0.22 * (c === my ? 0.6 : 1))) continue;
      const tgts = [];
      for (const p of S.ownedProvs(c)) for (const q of S.adj(p.id)) { const t = G.prov[q]; if (t && t.o !== c && S.atWar(c, t.o) && !t.besieged) tgts.push({ from: p, to: t }); }
      if (!tgts.length) continue;
      const { from, to } = U.pick(tgts);
      const take = Math.round(Math.min(from.troops * 1.2, to.pop * 10000 * 0.004 * (0.5 + to.agri / 100)));
      if (take < 200) continue;
      G.cty[c].food += take; G.cty[to.o].food = Math.max(0, G.cty[to.o].food - Math.round(take * 0.6));
      to.agri = Math.max(5, to.agri - 2); to.loyal = Math.max(5, to.loyal - 2);
      if (to.o === my) { S.log(`${S.cname(c)}の兵が${S.P[to.id].name}の畑の実りを奪っていった（兵糧 -${U.fmt(Math.round(take * 0.6))}）。`, 'bad'); rep(`${S.P[to.id].name}の畑が${S.cname(c)}の兵に荒らされた。`); }
      else if (c === my) rep(`${S.P[from.id].name}の軍が${S.P[to.id].name}で実りを奪い、兵糧 ${U.fmt(take)} を得た。`);
    }
  }
};
// 主人公の収穫の略奪
if (typeof A !== 'undefined' && A.def) A.def({ id: 'karita', cat: 'ops', n: '収穫の略奪', ap: 1, d: '秋、敵領に踏み込んで畑の実りを刈り取る。兵糧を得て敵の収穫を減らすが、小競り合いになることもある。',
  vis: () => S.isMilLike() && S.tier() >= 4,
  req: () => !W.isAutumn() ? '秋（7〜9月）だけ' : !G.me.army.sq.some(s => s.n > 0) ? '兵がいない' : (S.adj(G.me.loc).some(q => G.prov[q] && S.atWar(S.myOff().c, G.prov[q].o)) ? true : '隣に交戦中の敵の州がない'),
  run: async () => {
    const me = G.me, o = S.myOff(), c = o.c;
    const tg = S.adj(me.loc).map(q => G.prov[q]).filter(p => p && S.atWar(c, p.o));
    const pid = await A.pickProv('どの州の畑を荒らす？', tg, p => `${S.cname(p.o)}　守兵 ${U.fmt(p.troops)}　農業 ${p.agri}`);
    if (!pid) return null;
    const P = G.prov[pid];
    const troops = S.armyTotal();
    let take = Math.round(Math.min(troops * 1.5, P.pop * 10000 * 0.004 * (0.5 + P.agri / 100)) * S.fxm(o, 'loot'));
    let msg = '';
    if (U.ch(0.35)) {
      // 守兵が追ってくる
      const def = Math.round(P.troops * U.rf(0.15, 0.3));
      if (def > 50 && typeof HOOK.battle === 'function') {
        const spec = W.buildSpec({ kind: 'skirmish', pid, title: `${S.P[pid].name}での略奪`, A: { c, troops: Math.min(troops, def * 2.5), cmd: o, officers: [] }, B: { c: P.o, troops: def, cmd: W.pickCommander(P.o, pid), officers: [] }, me: 'A', role: 'commander', maxDays: 1 });
        const br = await HOOK.battle(spec);
        const res = W.applyBattleResult(spec, br);
        if (G.over) return null;
        if (res.win !== 'me') { take = Math.round(take * 0.3); msg = '守兵に追い散らされ、刈り取れたのはわずかだった。'; }
        else msg = '守兵を追い払い、存分に刈り取った。';
      }
    }
    me.food += take; G.cty[P.o].food = Math.max(0, G.cty[P.o].food - Math.round(take * 0.5));
    P.agri = Math.max(5, P.agri - 3); P.loyal = Math.max(5, P.loyal - 3);
    const d = S.dip(c, P.o); if (d) d.rel = Math.max(-100, (d.rel || 0) - 3);
    W.gainMerit(Math.round(4 * S.tier()), `${S.P[pid].name}で収穫の略奪`);
    return `${S.P[pid].name}の畑を刈り取り、兵糧${U.num(take)}袋を得た。${msg}`;
  } });
