/* =========================================================
   地中海覇道 — player commands (by rank)
   ========================================================= */
const A = {};
A.CATS = [
  { k: 'self', n: '自身' },
  { k: 'army', n: '軍備' },
  { k: 'ops',  n: '軍務' },
  { k: 'jur',  n: '管轄' },
  { k: 'min',  n: '部局' },
  { k: 'nat',  n: '国政' },
  { k: 'dip',  n: '外交' },
  { k: 'war',  n: '軍令' },
  { k: 'land', n: '私領' },
];
A.list = [];
A.def = (o) => A.list.push(o);
const me_ = () => G.me;
const mo_ = () => S.myOff();
const tier_ = () => S.tier();
const rank_ = () => G.me.rank;
const track_ = () => D.RANKS[G.me.rank].track;
const cty_ = () => S.myCty();
const isMilLike = () => S.isMilLike();
const isGunshi = () => S.isStaff() && tier_() >= 7;
const hasArmy = () => G.me.army.sq.some(s => s.n > 0);
const st_ = k => S.stat(S.myOff(), k);

A.pickSquad = async (title, allowAll = true, filt) => {
  const sqs = G.me.army.sq.filter(s => s.n > 0 && (!filt || filt(s)));
  if (!sqs.length) return null;
  if (sqs.length === 1) return sqs[0];
  const ch = sqs.map(s => ({ v: s, label: S.squadName(s), sub: `${U.num(s.n)}人　練度${Math.round(s.tr)}　武器Lv${s.wl}　防具Lv${s.al}` }));
  if (allowAll) ch.unshift({ v: 'all', label: '全部隊', sub: '効果は少し下がる' });
  ch.push({ v: null, label: 'やめる' });
  return await HOOK.choose({ title, choices: ch });
};
A.pickProv = async (title, provs, subf) => {
  if (A._pre) { const ids = provs.map(p => p.id || p); const v = A._pre; A._pre = null; if (ids.includes(v)) return v; }
  if (!provs.length) return null;
  const ch = provs.map(p => ({ v: p.id || p, label: S.P[p.id || p].name, sub: subf ? subf(G.prov[p.id || p]) : '' }));
  ch.push({ v: null, label: 'やめる' });
  return await HOOK.choose({ title, choices: ch });
};
// 拠点を選ぶ（A._preHold があればそれ）
A._preHold = null;
A.pickHold = async (title, hs) => {
  if (A._preHold) { const v = A._preHold; A._preHold = null; if (hs.some(h => h.id === v)) return v; }
  const ch = hs.map(h => ({ v: h.id, label: `${S.P[h.pid].name}・${h.n}（${D.HOLDK[h.k].n}）`, sub: `${S.cname(h.o)}　守り 約${U.fmt(S.holdDef(h))}${h.w ? `・城壁${h.w}` : ''}` }));
  ch.push({ v: null, label: 'やめる' });
  return await HOOK.choose({ title, choices: ch });
};
A.pickCountry = async (title, filt, subf) => {
  const cs = D.CORDER.filter(c => G.cty[c].alive && c !== mo_().c && (!filt || filt(c)));
  if (!cs.length) return null;
  const ch = cs.map(c => ({ v: c, label: S.cname(c), sub: subf ? subf(c) : A.relStr(c) }));
  ch.push({ v: null, label: 'やめる' });
  return await HOOK.choose({ title, choices: ch });
};
A.relStr = (c) => { const d = S.dip(mo_().c, c); const st = { war: '交戦中', peace: '平時', ally: '同盟', truce: '停戦' }[d.st]; return `${st}　関係${Math.round(d.rel)}${d.t ? `（残${d.t}か月）` : ''}`; };
A.spend = (g) => { if (G.me.gold < g) return false; G.me.gold -= g; return true; };
A.jurShare = () => D.JUR[G.me.rank]?.share || 0;
A.jurAdd = (stat, v) => {
  const j = G.me.jur; if (!j) return 0;
  const before = j[stat];
  j[stat] = U.clamp(j[stat] + v, 0, 100);
  const d = j[stat] - before;
  const p = G.prov[j.prov];
  if (p && p[stat] != null) p[stat] = U.clamp(p[stat] + d * A.jurShare(), 0, 100);
  return d;
};
A.civPow = (k) => { const o = mo_(); return (S.stat(o, k) / 60) * S.lawMul(o.c, 'dev'); };

/* ======== 自身 ======== */
A.def({ id: 'tanren', cat: 'self', n: '鍛錬', ap: 1, d: '能力を磨く。年を重ねると伸びにくい。',
  run: async () => {
    const o = mo_(), me = me_();
    const names = { bu: '武力', tou: '統率', chi: '知力', pol: '政治', mi: '魅力' };
    const k = await HOOK.choose({ title: '鍛錬', body: '何を磨く？', choices: [...Object.keys(names).map(x => ({ v: x, label: names[x], sub: `現在 ${S.stat(o, x)}（素質 ${o[x]}）` })), { v: null, label: 'やめる' }] });
    if (!k) return null;
    const ageMul = o.age < 25 ? 1.3 : o.age > 45 ? 0.6 : 1;
    const g = (16 + U.ri(0, 12) + (me.land.fac.school || 0) * 4) * ageMul * Math.max(0.3, S.fxm(o, 'exp'));
    W.learn('study', 1, true);
    me.exp[k] += g;
    let msg = `${names[k]}の経験 +${Math.round(g)}`;
    const need = 40 + o[k] * 0.8;
    let ups = 0;
    while (me.exp[k] >= need && o[k] < 100) { me.exp[k] -= need; o[k]++; ups++; }
    if (ups) msg = `${names[k]}が${ups}上がった！（${o[k]}）`;
    if (k === 'bu' && o.bu >= 85 && !o.tr.includes('moushou') && U.ch(0.08)) { o.tr.push('moushou'); msg += '　特性「猛将」を会得した！'; }
    if (k === 'tou' && o.tou >= 80 && !o.tr.includes('kobu') && U.ch(0.08)) { o.tr.push('kobu'); msg += '　特性「鼓舞」を会得した！'; }
    if (k === 'chi' && o.chi >= 80 && !o.tr.includes('gunryaku') && U.ch(0.08)) { o.tr.push('gunryaku'); msg += '　特性「軍略」を会得した！'; }
    return msg;
  } });
A.def({ id: 'kyuyo', cat: 'self', n: '休養', ap: 1, d: '体を休める。負傷が早く治り、伍の仲間も回復する。',
  run: async () => {
    const me = me_();
    if (me.inj > 0) { me.inj = Math.max(0, me.inj - 1); }
    for (const w of me.army.wu) if (w.alive) w.hp = 100;
    for (const s of me.army.sq) s.tr = Math.max(0, s.tr - 0.5);
    return me.inj ? `養生した。負傷はあと${me.inj}か月。` : '英気を養った。';
  } });
A.def({ id: 'koryu', cat: 'self', n: '交流', ap: 1, d: '人物を訪ねて絆を深める。絆は上奏や登用に効く。',
  run: async () => {
    const me = me_(), o = mo_(), c = o.c, cc = cty_();
    const cand = new Set([me.boss, cc.ruler, cc.josh, me.gen, ...me.army.subs]);
    for (const x of S.officersOf(c, x => x.loc === me.loc && !x.player)) cand.add(x.id);
    const list = [...cand].map(id => G.off[id]).filter(x => x && x.alive && !x.player && x.c === c).slice(0, 14);
    const pick = await HOOK.choose({ title: '交流', body: '誰を訪ねる？', choices: [...list.map(x => ({ v: x.id, label: `${x.n}（${D.RANKS[x.r]?.name || ''}）`, sub: `絆 ${Math.round(x.bond)}　武${x.bu} 統${x.tou} 知${x.chi} 政${x.pol} 魅${x.mi}` })), { v: null, label: 'やめる' }] });
    if (!pick) return null;
    const x = G.off[pick];
    const g = Math.round(U.ri(6, 13) * Math.max(0.3, S.fxm(o, 'bond')) * (0.7 + S.stat(o, 'mi') / 160));
    x.bond = Math.min(100, x.bond + g);
    let msg = `${x.n}と語らった。絆+${g}（${Math.round(x.bond)}）`;
    const r = Math.random();
    if (r < 0.15) { const k = U.pick(['bu', 'tou', 'chi', 'pol']); me.exp[k] += 25; msg += `　教えを受けた（${{ bu: '武', tou: '統', chi: '知', pol: '政' }[k]}の経験+25）`; }
    else if (r < 0.25 && x.r && D.RANKS[x.r].tier > tier_()) { W.gainMerit(Math.round(10 * tier_()), '推薦を受けた'); msg += '　上に推薦してもらえた。'; }
    else if (r < 0.32) { const gold = 200 * tier_() * tier_(); me.gold += gold; msg += `　金${U.fmt(gold)}を贈られた。`; }
    // 登用
    if (x.bond >= 55 && !me.army.subs.includes(x.id) && D.RANKS[x.r] && D.RANKS[x.r].tier < tier_() && !x.lord && tier_() >= 2) {
      const ok = await HOOK.choose({ title: '登用', body: `${x.n}「あなたの下で働かせてほしい」`, choices: [{ v: 1, label: '部下に迎える' }, { v: 0, label: '今はまだ' }] });
      if (ok) { x.lord = o.id; me.army.subs.push(x.id); msg += `　${x.n}が部下になった！`; }
    }
    return msg;
  } });
A.def({ id: 'shuen', cat: 'self', n: '酒宴', ap: 1, d: '上官や部下、仲間を招いて宴を開く。金がかかる。', cost: () => 150 * tier_() * tier_(),
  run: async () => {
    const me = me_(); const cost = 150 * tier_() * tier_();
    if (!A.spend(cost)) return '金が足りない。';
    const ids = [me.boss, ...me.army.subs].filter(Boolean);
    for (const id of ids) if (G.off[id]) G.off[id].bond = Math.min(100, G.off[id].bond + U.ri(3, 7));
    for (const w of me.army.wu) if (w.alive) w.bond = Math.min(100, w.bond + U.ri(6, 12));
    for (const s of me.army.sq) s.tr = Math.min(100, s.tr + 0.5);
    W.learn('feast');
    return `宴は大いに盛り上がった（金-${U.fmt(cost)}）。皆との絆が深まった。`;
  } });
A.def({ id: 'kenkin', cat: 'self', n: '献金', ap: 0, d: '私財を国庫に納める。功績になる。',
  run: async () => {
    const me = me_(); const opts = [0.1, 0.25, 0.5].map(f => Math.round(me.gold * f)).filter(v => v >= 100);
    if (!opts.length) return '納められるほどの私財がない。';
    const v = await HOOK.choose({ title: '献金', body: `私財 金${U.fmt(me.gold)}`, choices: [...opts.map(v => ({ v, label: `金${U.fmt(v)}` })), { v: null, label: 'やめる' }] });
    if (!v) return null;
    me.gold -= v; cty_().gold += v; me.flags.paid = (me.flags.paid || 0) + v;
    W.gainMerit(Math.round(v / 60), '献金');
    return `金${U.fmt(v)}を国庫に納めた。`;
  } });
A.def({ id: 'kaimono', cat: 'self', n: '市場', ap: 0, d: '兵糧・武具・名馬・兵法書を買う。',
  run: async () => UI.shop() });
A.def({ id: 'jinzai', cat: 'self', n: '人材探索', ap: 1, d: '在野の人材を探して部下に迎える。', req: () => tier_() >= 3 ? true : '三百人隊長・町長・書記官以上',
  run: async () => {
    const me = me_(), o = mo_();
    // 名が知れているほど人が集まる
    const luck = S.stat(o, 'mi') / 100 + (me.land.fac.school || 0) * 0.06 + S.fx(o, 'talent') + (S.lawOn(o.c, 'kakkei') ? 0.1 : 0) + S.renownLv() * 0.05;
    if (!U.ch(0.35 + luck * 0.5)) return '有望な人材は見つからなかった。';
    const tierT = Math.max(1, Math.min(7, tier_() - U.ri(0, 2)));
    const rr = (track_() === 'civ' ? D.RANK_ORDER_CIV : D.RANK_ORDER_MIL)[tierT - 1];
    const x = S.genOfficer(o.c, rr, { loc: me.loc });
    if (U.ch(0.15 + luck * 0.2)) { const k = U.pick(['bu', 'tou', 'chi', 'pol']); x[k] = U.clamp(x[k] + U.ri(12, 25), 1, 96); }
    const fee = Math.round(100 * tierT * tierT);
    const ok = await HOOK.choose({ title: '人材発見', body: `${x.n}（武${x.bu} 統${x.tou} 知${x.chi} 政${x.pol} 魅${x.mi}${x.tr.length ? '　特性：' + x.tr.map(t => D.TRAITS[t].n).join('・') : ''}）を見つけた。\n支度金 金${U.fmt(fee)}で迎えるか？`, choices: [{ v: 1, label: '迎える', disabled: me.gold < fee }, { v: 0, label: '見送る' }] });
    if (!ok) { x.alive = false; delete G.off[x.id]; return '見送った。'; }
    me.gold -= fee; x.lord = o.id; x.bond = 25; me.army.subs.push(x.id);
    W.learn('recruitOk');
    return `${x.n}が部下になった。`;
  } });
A.def({ id: 'jousou', cat: 'self', n: '上奏・献策', ap: 1, d: '上官や君主へ意見を申し上げる。舌戦で説き伏せれば通る。', req: () => rank_() === 'kuns' ? '君主には不要' : (tier_() >= 2 ? true : '五十人長・治安役以上'),
  run: async () => {
    const me = me_(), o = mo_(), c = o.c, cc = cty_();
    const ch = [];
    if (tier_() >= 7 && isMilLike()) ch.push({ v: 'war', label: '遠征の許可を求める', sub: '許可が出れば、自ら遠征軍を率いて隣国の大都市を攻める（前哨戦・野戦・攻城戦）' });
    if (isMilLike()) ch.push({ v: 'troops', label: '兵の補充を求める', sub: '欠員を国軍からすぐに埋める' });
    if (tier_() >= 6) ch.push({ v: 'policy', label: '国の方針を献策する', sub: '評定の方針を変えさせる' });
    if (track_() === 'civ' || rank_() === 'josh') ch.push({ v: 'budget', label: '予算を求める', sub: '内政の資金を国庫から引き出す' });
    ch.push({ v: null, label: 'やめる' });
    const k = await HOOK.choose({ title: '上奏', choices: ch });
    if (!k) return null;
    const target = G.off[me.boss] || G.off[cc.ruler];
    const res = await UI.debate(target, k === 'war' ? '攻略の許可' : '上奏');
    const bondB = (target?.bond || 0) / 200;
    if (k === 'troops') {
      if (res >= 0 || U.ch(0.4 + bondB)) { for (const s of me.army.sq.filter(s => !s.pv)) { s.tr = Math.round((s.tr * s.n + 25 * (s.max - s.n)) / Math.max(1, s.max)); s.n = s.max; } return '兵の補充が認められた。'; }
      return '補充は却下された。';
    }
    if (k === 'budget') {
      if (res >= 0 || U.ch(0.35 + bondB)) { const g = Math.round(500 * tier_() * tier_()); me.gold += g; return `内政資金として金${U.fmt(g)}が下された。`; }
      return '予算は認められなかった。';
    }
    if (k === 'policy') {
      const pol = await HOOK.choose({ title: '献策する方針', choices: [{ v: 'expand', label: '攻略' }, { v: 'develop', label: '内政' }, { v: 'military', label: '軍備' }, { v: 'order', label: '治安' }] });
      if (!pol) return null;
      if (res > 0 || (res === 0 && U.ch(0.4 + bondB))) { cc.policy = pol; W.gainMerit(15 * tier_(), '献策が採用された'); return '献策が採用された。'; }
      return '献策は退けられた。';
    }
    if (k === 'war') {
      const tg = S.adj(me.loc).concat(...S.adj(me.loc).map(q => S.adj(q))).filter((q, i, a) => a.indexOf(q) === i && G.prov[q].o !== c && G.prov[q].o && G.cty[G.prov[q].o]?.alive);
      const adjT = [...new Set(S.ownedProvs(c).flatMap(p => S.adj(p.id)).filter(q => G.prov[q].o !== c))];
      const opts = adjT.filter(q => tg.includes(q) || S.adj(q).includes(me.loc));
      const pid = await A.pickProv('遠征先（大都市）', opts.length ? opts : adjT, p => `${S.bigName(p.id)}（${S.cname(p.o)}）　守備${U.fmt(p.troops)}　${A.relStr(p.o)}`);
      if (!pid) return null;
      const tc = G.prov[pid].o;
      const ruler = G.off[cc.ruler];
      const pr = S.countryPower(c) / Math.max(1, S.countryPower(tc));
      let chance = 0.25 + (res > 0 ? 0.35 : res < 0 ? -0.2 : 0) + bondB + (ruler?.bond || 0) / 300 + (pr - 1) * 0.15 + (cc.policy === 'expand' ? 0.2 : 0) + (S.atWar(c, tc) ? 0.15 : -0.2);
      if (S.allied(c, tc)) chance = 0.02;
      if (!U.ch(U.clamp(chance, 0.03, 0.95))) return '遠征の許可は下りなかった。';
      if (!S.atWar(c, tc)) W.declareWar(c, tc);
      const maxT = { tenka: 600000, dais: 300000, shog: 100000, dgun: 150000 }[rank_()] || 80000;
      const avail = U.sum([...new Set([...S.adj(pid).filter(q => G.prov[q].o === c), me.loc])].map(q => G.prov[q]), p => p.o === c ? p.troops * 0.7 : 0);
      const troops = Math.round(Math.max(S.armyTotal(), Math.min(maxT, avail + S.armyTotal())));
      await HOOK.info({ title: '遠征の許可が下りた', seal: { rome: '元老院', carth: '評議会' }[c] || '王命', body: `${S.P[pid].name}の${S.bigName(pid)}を攻めよ。動員兵力 ${U.fmt(troops)}。\n前哨戦・野戦を経て城を攻める。野戦で敵の主力を殲滅すれば、城は戦わずに開く。` });
      if (isGunshi()) {
        const boss = G.off[me.boss];
        await W.launchPlayerCampaign(pid, troops, { lead: true });
        return boss ? `${boss.n}の遠征軍の総軍師として戦った。` : '';
      }
      await W.launchPlayerCampaign(pid, troops, { lead: true });
      return '';
    }
    return null;
  } });
A.def({ id: 'idou', cat: 'self', n: '移動', ap: 1, d: '軍の駐屯地を移す。', req: () => (tier_() >= 7 && isMilLike()) ? true : '将軍・軍師以上のみ',
  run: async () => {
    const me = me_(), o = mo_();
    const pid = await A.pickProv('移動先', S.ownedProvs(o.c).filter(p => p.id !== me.loc), p => `兵${U.fmt(p.troops)}${S.enemyNeighbors(p.id).length ? '　前線' : ''}`);
    if (!pid) return null;
    me.loc = pid; o.loc = pid;
    for (const id of me.army.subs) if (G.off[id]) G.off[id].loc = pid;
    return `${S.P[pid].name}へ軍を移した。`;
  } });

/* ======== 軍備 ======== */
A.trainGain = (s, mul = 1) => {
  const o = mo_(), me = me_();
  const g = (6 + S.stat(o, 'tou') / 12) * (1 + (me.land.fac.drill || 0) * 0.15) * Math.max(0.3, S.fxm(o, 'train') + (D.UT[s.t]?.cls === 'cav' ? S.fx(o, 'horse') : 0)) * S.lawMul(o.c, 'train') * mul * Math.max(0.08, 1 - s.tr / 112) * (s.n > 20000 ? 0.7 : s.n > 5000 ? 0.85 : 1);
  return g;
};
A.def({ id: 'kunren', cat: 'army', n: '訓練', ap: 1, d: '部隊を鍛え、練度を上げる。統率と練兵場で効果が変わる。', req: () => hasArmy() || '兵がいない',
  run: async () => {
    const me = me_();
    const s = await A.pickSquad('訓練する部隊');
    if (!s) return null;
    const list = s === 'all' ? me.army.sq.filter(x => x.n > 0) : [s];
    const out = [];
    for (const x of list) { const g = A.trainGain(x, s === 'all' ? 0.65 : 1); x.tr = Math.min(100, x.tr + g); out.push(`${D.UT[x.t].n}+${g.toFixed(1)}`); }
    for (const w of me.army.wu) if (w.alive) { w.xp += 10; if (w.xp >= 50 && w.bu < 90) { w.bu++; w.xp = 0; } }
    W.learn('train');
    return `訓練した。練度 ${out.join('、')}`;
  } });
A.def({ id: 'moukun', cat: 'army', n: '猛訓練', ap: 2, d: '過酷な訓練。効果は大きいが、脱落者が出る。', req: () => hasArmy() || '兵がいない',
  run: async () => {
    const me = me_();
    const s = await A.pickSquad('猛訓練する部隊');
    if (!s) return null;
    const list = s === 'all' ? me.army.sq.filter(x => x.n > 0) : [s];
    let lost = 0; const out = [];
    for (const x of list) {
      const g = A.trainGain(x, (s === 'all' ? 0.65 : 1) * 2.3); x.tr = Math.min(100, x.tr + g); out.push(`${D.UT[x.t].n}+${g.toFixed(1)}`);
      if (x.n > 5) { const l = Math.ceil(x.n * U.rf(0.005, 0.025)); x.n -= l; lost += l; }
    }
    for (const w of me.army.wu) if (w.alive) { w.xp += 25; w.bond = Math.max(0, w.bond - 3); if (w.xp >= 50 && w.bu < 92) { w.bu += 1; w.xp = 0; } if (U.ch(0.08)) w.hp = Math.max(30, w.hp - 40); }
    return `猛訓練！ ${out.join('、')}${lost ? `（脱落${lost}人）` : ''}`;
  } });
A.def({ id: 'hojuu', cat: 'army', n: '補充', ap: 1, d: '欠員を募兵で埋める（国軍分）。新兵が混じると練度は下がる。', req: () => hasArmy() || '兵がいない',
  run: async () => {
    const me = me_(); let add = 0;
    const p = G.prov[me.loc];
    for (const s of me.army.sq.filter(s => !s.pv && s.n < s.max)) {
      const k = Math.min(s.max - s.n, Math.round(p.troops * 0.05) + 5);
      if (k <= 0) continue;
      s.tr = Math.round((s.tr * s.n + 20 * k) / (s.n + k)); s.n += k; add += k; p.troops = Math.max(0, p.troops - k);
    }
    return add ? `${U.num(add)}人を補充した。` : '欠員はない。';
  } });
A.EQ_PRICE = [0, 0, 18, 40, 80, 150];
A.def({ id: 'soubi', cat: 'army', n: '装備強化', ap: 1, d: '武器・防具を良いものに替える。鍛冶場で安くなり上限も上がる。', req: () => hasArmy() || '兵がいない',
  run: async () => {
    const me = me_();
    const maxLv = Math.min(5, 2 + Math.floor((me.land.fac.smithy || 0) / 2) + (me.rank === 'kuns' || me.rank === 'josh' || (me.rank === 'daij' && me.min === 'shofu') ? 1 : 0));
    const s = await A.pickSquad('装備を強化する部隊', false);
    if (!s || s === 'all') return null;
    const disc = Math.max(0.3, 1 - (me.land.fac.smithy || 0) * 0.08 - (S.myOff().c === 'syra' ? 0.15 : 0) - S.fx(S.myOff(), 'smith'));
    const cost = (lv) => Math.round(s.n * A.EQ_PRICE[lv] * disc);
    const ch = [];
    if (s.wl < maxLv) ch.push({ v: 'w', label: `武器 Lv${s.wl}→${s.wl + 1}`, sub: `金${U.fmt(cost(s.wl + 1))}　攻撃+8%`, disabled: me.gold < cost(s.wl + 1) });
    if (s.al < maxLv) ch.push({ v: 'a', label: `防具 Lv${s.al}→${s.al + 1}`, sub: `金${U.fmt(cost(s.al + 1))}　防御+8%`, disabled: me.gold < cost(s.al + 1) });
    if (!ch.length) return `これ以上は強化できない（上限Lv${maxLv}。鍛冶場で上がる）。`;
    ch.push({ v: null, label: 'やめる' });
    const k = await HOOK.choose({ title: '装備強化', body: `${S.squadName(s)}　${U.num(s.n)}人`, choices: ch });
    if (!k) return null;
    if (k === 'w') { me.gold -= cost(s.wl + 1); s.wl++; return `武器をLv${s.wl}にした。`; }
    me.gold -= cost(s.al + 1); s.al++; return `防具をLv${s.al}にした。`;
  } });
A.def({ id: 'wariburi', cat: 'army', n: '部隊の割り振り', ap: 0, d: '誰にどれだけの兵を任せるかを人数で決める。合戦での任せ方も決められる。任務状は使わない。', req: () => (hasArmy() && (G.me.army.subs.length > 0 || G.me.army.sq.length > 1 || G.me.army.sq.some(s => s.pv))) || '部下か複数の隊が要る',
  run: async () => { if (typeof UI !== 'undefined' && UI) { UI.curTab = 'army'; UI._scrollAllot = true; } return null; } });
A.def({ id: 'hensei', cat: 'army', n: '兵種転換', ap: 0, d: '一部の兵を別の兵種に鍛え直す。金がかかり、練度が下がる。任務状は使わない（「軍」の割り振りからもできる）。', req: () => (hasArmy() && tier_() >= 2) || '五十人長以上',
  run: async () => A.convert() });
A.def({ id: 'gono', cat: 'army', n: '伍の仲間', ap: 1, d: '伍の四人と語らい、一人を鍛える。', req: () => (G.me.army.wu.length > 0) || '伍長・村長のみ',
  run: async () => {
    const me = me_();
    const ws = me.army.wu.filter(w => w.alive);
    const pick = await HOOK.choose({ title: '伍の仲間', body: '誰と過ごす？', choices: [...ws.map(w => ({ v: w.id, label: w.n, sub: `武${w.bu}　体${Math.round(w.hp)}　絆${Math.round(w.bond)}${w.tr ? '　' + D.TRAITS[w.tr].n : ''}` })), { v: null, label: 'やめる' }] });
    if (!pick) return null;
    const w = ws.find(x => x.id === pick);
    const k = await HOOK.choose({ title: w.n, choices: [{ v: 'train', label: '稽古をつける', sub: '武が上がる' }, { v: 'talk', label: '語らう', sub: '絆が上がる' }] });
    if (k === 'train') { const g = 1 + (S.stat(mo_(), 'bu') > w.bu + 10 ? U.ri(1, 2) : 0); w.bu = Math.min(95, w.bu + g); w.bond = Math.min(100, w.bond + 3); return `${w.n}に稽古をつけた。武+${g}（${w.bu}）`; }
    if (k === 'talk') { w.bond = Math.min(100, w.bond + U.ri(8, 15)); let s = `${w.n}と夜通し語り合った。絆${Math.round(w.bond)}`; if (w.bond >= 80 && !w.tr && U.ch(0.3)) { w.tr = U.pick(['kobu', 'tenun', 'moushou']); s += `　${w.n}は「${D.TRAITS[w.tr].n}」の素質を見せた。`; } return s; }
    return null;
  } });
A.def({ id: 'senjutsu', cat: 'army', n: '戦術研究', ap: 1, d: '兵法を学び、新しい戦術を会得する。', req: () => (S.isStaff() || st_('chi') >= 45) ? true : '軍師の道か知力45以上',
  run: async () => {
    const me = me_(), o = mo_();
    const st = { bu: S.stat(o, 'bu'), tou: S.stat(o, 'tou'), chi: S.stat(o, 'chi'), pol: S.stat(o, 'pol'), mi: S.stat(o, 'mi') };
    const can = D.TACTIC_ORDER.filter(t => !me.tac.includes(t));
    if (!can.length) return 'すべての戦術を会得している。';
    const cats = Object.keys(D.TACTIC_CATS);
    can.sort((a, b) => cats.indexOf(D.TACTICS[a].cat) - cats.indexOf(D.TACTICS[b].cat));
    const t = await HOOK.choose({ title: '戦術研究', body: `知力 ${st.chi}　会得 ${me.tac.length}/${D.TACTIC_ORDER.length}`, choices: [...can.map(t => ({ v: t, label: `${D.TACTICS[t].n}（${D.TACTIC_CATS[D.TACTICS[t].cat]}）`, sub: `要 ${D.tacticReqStr(t)}　${D.TACTICS[t].d}`, disabled: st.chi < D.TACTICS[t].req.chi - 15 })), { v: null, label: 'やめる' }] });
    if (!t) return null;
    const req = D.TACTICS[t].req.chi;
    let p = U.clamp(0.35 + (st.chi - req) / 60 + (S.isStaff() ? 0.15 + (tier_() >= 7 ? 0.1 : 0) : 0) + (me.eq.book ? 0.15 : 0) + S.fx(o, 'exp') * 0.3, 0.05, 0.95);
    if (!D.tacticReqOk(t, st)) p *= 0.4;
    if (U.ch(p)) { me.tac.push(t); o.tac = me.tac; return `戦術「${D.TACTICS[t].n}」を会得した！`; }
    me.exp.chi += 20;
    return `研究したが会得には至らなかった（知の経験+20）。`;
  } });

/* ======== 軍務 ======== */
A.def({ id: 'offers', cat: 'ops', n: '戦場へ', ap: 1, d: '今月の小競り合いや討伐に駆けつける。', dyn: true,
  req: () => G.offers.length ? true : '今月は戦の報せがない', run: async () => {
    const of = await HOOK.choose({ title: '戦場へ駆けつける', choices: [...G.offers.map(x => ({ v: x, label: x.title, sub: x.desc + (x.ally ? `　味方 約${U.fmt(x.ally + S.armyTotal())}` : '') })), { v: null, label: 'やめる' }] });
    if (!of) return null;
    return await A.runOffer(of);
  } });
A.runOffer = async (of) => {
  const spec = W.offerSpec(of);
  const br = await HOOK.battle(spec);
  const res = W.applyBattleResult(spec, br);
  W.afterOffer(of, res);
  return '';
};
A.def({ id: 'shokai', cat: 'ops', n: '哨戒', ap: 1, d: '国境を見回る。敵の斥候とぶつかることもある。', req: () => (isMilLike() && hasArmy()) || '武官のみ',
  run: async () => {
    const me = me_(), o = mo_();
    const hostile = S.adj(me.loc).filter(q => G.prov[q].o !== o.c && !S.allied(o.c, G.prov[q].o));
    if (hostile.length && U.ch(0.55)) {
      const q = U.pick(hostile); const ec = G.prov[q].o;
      const force = S.armyTotal();
      const foe = Math.max(5, Math.round(force * U.rf(0.4, 1.0)));
      const of = { id: U.uid(), kind: 'skirmish', pid: me.loc, from: q, ec, foe, ally: 0, title: '哨戒中の遭遇戦', desc: '' };
      await HOOK.info({ title: '敵の斥候隊と遭遇！', body: `${S.cname(ec)}軍 約${U.fmt(foe)}。` });
      return await A.runOffer(of);
    }
    W.gainMerit(Math.round(4 * tier_()), '哨戒');
    return '異常なし。国境の地形を頭に入れた。';
  } });
A.def({ id: 'teisatsu', cat: 'ops', n: '偵察', ap: 1, d: '隣の敵地を探り、守備兵や将を知る。', req: () => (isMilLike() || rank_() === 'guns') || '武官・総督のみ',
  run: async () => {
    const me = me_(), o = mo_();
    const opts = S.adj(me.loc).filter(q => G.prov[q].o !== o.c);
    const pid = await A.pickProv('偵察する州', opts, p => S.cname(p.o));
    if (!pid) return null;
    const p = G.prov[pid];
    const gens = S.officersOf(p.o, x => x.loc === pid && ['dais', 'shog', 'goz'].includes(x.r)).map(x => `${x.n}（統${x.tou}）`);
    W.taskEvent('scout', pid, true); W.learn('scout');
    me.flags.scouted = me.flags.scouted || {}; me.flags.scouted[pid] = G.turn;
    W.gainMerit(Math.round(5 * tier_()), '偵察');
    return `${S.P[pid].name}：守備兵 ${U.fmt(p.troops)}　城壁${Math.round(p.wall)}　将：${gens.join('、') || 'なし'}`;
  } });
A.def({ id: 'shutsugeki', cat: 'ops', n: '出撃（小規模戦闘）', ap: 2, d: '自軍だけで隣の敵地へ打って出る。許可は要らないが領土は奪えない。', req: () => (tier_() >= 7 && isMilLike()) ? true : '将軍・軍師以上のみ',
  run: async () => {
    const me = me_(), o = mo_();
    const opts = S.adj(me.loc).filter(q => G.prov[q].o !== o.c && !S.allied(o.c, G.prov[q].o) && S.dip(o.c, G.prov[q].o).st !== 'truce');
    const pid = await A.pickProv('出撃先', opts, p => `${S.cname(p.o)}　守備${U.fmt(p.troops)}　${A.relStr(p.o)}`);
    if (!pid) return null;
    const p = G.prov[pid];
    const force = S.armyTotal();
    const foe = Math.round(Math.max(200, Math.min(p.troops * 0.35, force * U.rf(0.7, 1.3))));
    const of = { id: U.uid(), kind: 'raid', pid, tgt: pid, from: pid, ec: p.o, foe, ally: 0, title: `${S.P[pid].name}への出撃`, desc: '' };
    G.offers.push(of);
    return await A.runOffer(of);
  } });
A.def({ id: 'kyoten', cat: 'ops', n: '拠点攻略', ap: 2, d: '隣の敵の中都市・小都市・地域を攻め取る。駐屯地の軍も援軍を出す。地域は五十人長、小都市は三百人隊長、中都市は千人隊長から。',
  req: () => !isMilLike() ? '武官・軍師のみ' : tier_() < 2 ? '五十人長以上のみ' : !hasArmy() ? '兵がいない' : (W.playerHoldTargets().length ? true : '攻め取れる敵の拠点が近くにない'),
  run: async () => {
    const hs = W.playerHoldTargets();
    const hid = await A.pickHold('攻め取る拠点', hs);
    if (!hid) return null;
    const of = W.holdOffer(G.hold[hid]);
    G.offers.push(of);
    await A.runOffer(of);
    if (G.over) return '';
    const h = G.hold[hid];
    return h.o === mo_().c ? `${S.P[h.pid].name}の${S.holdLabel(h)}を奪った。` : `${S.holdLabel(h)}は落ちなかった。`;
  } });
A.def({ id: 'shigan', cat: 'ops', n: '従軍志願', ap: 1, d: '近くで戦が起きたら必ず加わる（来月）。', req: () => (isMilLike() && tier_() <= 6) || '将軍より下の武官・軍師のみ',
  run: async () => { me_().flags.volunteer = G.turn + 1; return '次の戦に志願した。'; } });

/* ======== 管轄（文官） ======== */
const jurOK = () => !!G.me.jur || '管轄地を持つ文官のみ';
A.def({ id: 'kannou', cat: 'jur', n: '勧農', ap: 1, d: '農業を奨励する。', req: jurOK,
  run: async () => { const o = mo_(); const v = 3.5 * A.civPow('pol') * S.fxm(o, 'agri') * U.rf(0.8, 1.2); const d = A.jurAdd('agri', v); W.learn('kannou'); return `農業 +${d.toFixed(1)}（${Math.round(me_().jur.agri)}）`; } });
A.def({ id: 'kaikon', cat: 'jur', n: '開墾', ap: 1, d: '荒れ地を拓き、戸数と農業を増やす。金がかかる。', req: jurOK, cost: () => Math.round(G.me.jur ? G.me.jur.hh * 0.6 : 0),
  run: async () => { const j = me_().jur; const cost = Math.round(j.hh * 0.6); if (!A.spend(cost)) return '金が足りない。'; const add = Math.round(j.hh * 0.02 * A.civPow('pol') * S.fxm(mo_(), 'hh')); j.hh += add; A.jurAdd('agri', 1.2 * A.civPow('pol')); return `開墾した。戸数+${U.num(add)}（金-${U.fmt(cost)}）`; } });
A.def({ id: 'suiri', cat: 'jur', n: '水利', ap: 2, d: '用水路と堤を築く。農業が大きく伸び、洪水にも強くなる。', req: jurOK, cost: () => Math.round(G.me.jur ? G.me.jur.hh * 2 : 0),
  run: async () => { const j = me_().jur; const cost = Math.round(j.hh * 2); if (!A.spend(cost)) return '金が足りない。'; const d = A.jurAdd('agri', 7 * A.civPow('chi') * S.fxm(mo_(), 'agri') * U.rf(0.8, 1.2)); j.levee = (j.levee || 0) + 1 + S.fx(mo_(), 'levee'); W.learn('suiri'); return `水利工事が完了した。農業+${d.toFixed(1)}（金-${U.fmt(cost)}）`; } });
A.def({ id: 'ichiba', cat: 'jur', n: '市場の整備', ap: 1, d: '市場と港を整え、商いを盛んにする。', req: jurOK, cost: () => Math.round(G.me.jur ? G.me.jur.hh * 0.4 : 0),
  run: async () => { const j = me_().jur; const cost = Math.round(j.hh * 0.4); if (!A.spend(cost)) return '金が足りない。'; const d = A.jurAdd('comm', 3.5 * A.civPow('pol') * S.fxm(mo_(), 'comm') * U.rf(0.8, 1.2)); W.learn('ichiba'); return `商業 +${d.toFixed(1)}（${Math.round(j.comm)}）`; } });
A.def({ id: 'junsatsu', cat: 'jur', n: '巡察', ap: 1, d: '管轄を見回り治安を引き締める。盗賊を見つけることもある。', req: jurOK,
  run: async () => {
    const o = mo_(), j = me_().jur;
    const d = A.jurAdd('order', 4 * (S.stat(o, 'bu') + S.stat(o, 'pol')) / 120 * Math.max(0.3, S.fxm(o, 'order') + S.fx(o, 'bandit') * 0.5) * S.lawMul(o.c, 'dev'));
    W.learn('junsatsu');
    let s = `治安 +${d.toFixed(1)}（${Math.round(j.order)}）`;
    if (j.bandits > 0 && !G.offers.some(x => x.kind === 'bandit')) { const size = tier_() <= 2 ? U.ri(6, 24) : tier_() <= 4 ? U.ri(40, 250) : U.ri(300, 2500); G.offers.push({ id: U.uid(), kind: 'bandit', pid: j.prov, ec: 'bandit', foe: size, ally: 0, title: `${j.name}の盗賊討伐`, desc: `盗賊団 約${U.fmt(size)}の隠れ家を突き止めた。` }); s += '　盗賊の隠れ家を見つけた！（軍務「戦場へ」から討伐できる）'; }
    return s;
  } });
A.def({ id: 'hotou', cat: 'jur', n: '捕盗', ap: 1, d: '手勢を率いて盗賊を捕らえる（戦闘）。', req: () => (G.me.jur && G.me.jur.bandits > 0) ? true : '盗賊が出没していない',
  run: async () => {
    const j = me_().jur;
    const size = tier_() <= 2 ? U.ri(5, 20) : tier_() <= 4 ? U.ri(30, 200) : U.ri(300, 2000);
    const of = { id: U.uid(), kind: 'bandit', pid: j.prov, ec: 'bandit', foe: size, ally: 0, title: `${j.name}の捕盗`, desc: '' };
    G.offers.push(of);
    return await A.runOffer(of);
  } });
A.def({ id: 'koseki', cat: 'jur', n: '戸籍整備', ap: 1, d: '住民の名簿（戸籍）を正し、隠れた民を見つける。戸数が増えるが民は嫌がる。', req: jurOK,
  run: async () => { const j = me_().jur; const add = Math.round(j.hh * 0.015 * A.civPow('chi') * S.fxm(mo_(), 'hh')); j.hh += add; A.jurAdd('loyal', -1.5); A.jurAdd('order', 1.5); W.learn('koseki'); return `戸籍を整えた。戸数+${U.num(add)}`; } });
A.def({ id: 'kyouka', cat: 'jur', n: '教化', ap: 1, d: '学校と体育場を開き、読み書きと法を教えて民心と文化を高める。', req: jurOK,
  run: async () => { const j = me_().jur; const v = 3 * A.civPow('mi') * S.fxm(mo_(), 'cult'); j.cult = U.clamp(j.cult + v, 0, 100); const d = A.jurAdd('loyal', v * 0.8 * S.fxm(mo_(), 'loyal')); W.learn('kyouka'); return `文化+${v.toFixed(1)}　民心+${d.toFixed(1)}`; } });
A.def({ id: 'saiban', cat: 'jur', n: '裁判', ap: 1, d: '訴えを裁く。裁き方で治安と民心が変わる。', req: jurOK,
  run: async () => {
    const cases = [
      ['隣家の牛が畑を荒らしたと訴えが出た。', '法の通り牛の持ち主に償わせる', '双方の言い分を聞き、和解させる'],
      ['ある家の者が盗みを働いた。隣り合う家々にも責めを負わせる定めがある。', '定め通り隣の家々も罰する', '本人だけを罰する'],
      ['大地主が民の畑を奪ったという。', '大地主を厳しく罰する', '穏便に済ませ、大地主から献金を受ける'],
      ['兵役を逃れた若者が捕まった。', '法の通り罰する', '事情を聞き、次の徴兵で償わせる'],
    ];
    const c = U.pick(cases);
    const k = await HOOK.choose({ title: '裁判', body: c[0], choices: [{ v: 0, label: c[1] }, { v: 1, label: c[2] }] });
    W.learn('saiban');
    if (k === 0) { A.jurAdd('order', 3.5); A.jurAdd('loyal', c === cases[2] ? 3 : -1.5); W.gainMerit(4 * tier_(), '公正な裁き'); return '法に従って裁いた。'; }
    if (c === cases[2]) { me_().gold += 300 * tier_() * tier_(); A.jurAdd('loyal', -3); return '大地主から献金を受けた……。'; }
    A.jurAdd('loyal', 3); A.jurAdd('order', -0.5); return '情けをかけた。民は喜んだ。';
  } });
A.def({ id: 'choushu', cat: 'jur', n: '徴税', ap: 1, d: '税を取り立て国庫へ納める。功績になるが民心は下がる。', req: jurOK,
  run: async () => { const j = me_().jur; const g = Math.round(j.hh * (0.4 + j.comm / 100) * 12 * A.civPow('pol') * S.fxm(mo_(), 'tax')); cty_().gold += g; W.learn('choushu'); const fee = Math.round(g * 0.05); me_().gold += fee; me_().flags.paid = (me_().flags.paid || 0) + g; A.jurAdd('loyal', -2.5); W.gainMerit(Math.round(g / 400), '徴税'); return `金${U.fmt(g)}を国庫へ納めた（手当 ${U.fmt(fee)}）。`; } });
A.def({ id: 'chouhei', cat: 'jur', n: '徴兵', ap: 1, d: '兵を集めて州の守備へ送る。', req: jurOK,
  run: async () => { const j = me_().jur; const n = Math.round(j.hh * 0.06 * (j.loyal / 70) * S.fxm(mo_(), 'recruit')); G.prov[j.prov].troops += n; W.learn('chouhei'); A.jurAdd('loyal', -2); j.hh = Math.max(50, j.hh - Math.round(n * 0.1)); W.gainMerit(Math.round(n / 30), '徴兵'); return `${U.num(n)}人を徴兵した。`; } });
A.def({ id: 'shinjutsu', cat: 'jur', n: '穀物の施し', ap: 1, d: '蔵を開いて貧しい民に穀物を配る。兵糧を使う。', req: jurOK, cost: () => 0,
  run: async () => { const me = me_(), j = me.jur; const need = Math.round(j.hh * 0.5); if (me.food < need) { if (!A.spend(need * 30)) return '兵糧も金も足りない。'; } else me.food -= need; const d = A.jurAdd('loyal', 6); return `民に施しをした。民心+${d.toFixed(1)}`; } });
A.def({ id: 'shuchiku', cat: 'jur', n: '修築', ap: 1, d: '城壁や砦を修理する。', req: jurOK, cost: () => Math.round(G.me.jur ? G.me.jur.hh * 0.5 : 0),
  run: async () => { const o = mo_(), j = me_().jur; const cost = Math.round(j.hh * 0.5 * Math.max(0.3, 1 - S.fx(o, 'build'))); if (!A.spend(cost)) return '金が足りない。'; const v = 5 * S.fxm(o, 'fort'); W.learn('build'); j.def = U.clamp(j.def + v, 0, 100); const p = G.prov[j.prov]; p.wall = U.clamp(p.wall + v * A.jurShare() * 1.5, 0, 100); return `防備+${v}（${Math.round(j.def)}）`; } });
A.def({ id: 'suikyo', cat: 'jur', n: '推挙', ap: 1, d: '地元の優れた者を国に推挙する。', req: jurOK,
  run: async () => { const o = mo_(); if (!U.ch(0.45 + S.stat(o, 'mi') / 250)) return '推挙に値する者は見つからなかった。'; const x = S.genOfficer(o.c, U.pick(['kenj', 'senn', 'kenr', 'sanz'])); W.gainMerit(Math.round(12 * tier_()), `${x.n}を推挙`); x.bond = 30; return `${x.n}を国に推挙した。`; } });

/* ======== 部局（大臣） ======== */
const minOK = (m) => () => (G.me.rank === 'daij' && G.me.min === m) || (G.me.rank === 'josh') || `${D.MINISTRIES[m].n}のみ`;
const natPow = () => A.civPow('pol');
A.natWork = (n = 1) => { G.me.flags.natWork = (G.me.flags.natWork || 0) + n; };
A.def({ id: 'm_kannou', cat: 'min', n: '全国勧農', ap: 1, d: '全土の農業を底上げする。', req: minOK('chiso'), vis: () => G.me.min === 'chiso',
  run: async () => { const c = mo_().c; let s = 0; for (const p of S.ownedProvs(c)) { const v = U.rf(0.6, 1.4) * natPow(); p.agri = Math.min(100, p.agri + v); s += v; } A.natWork(); return `全国の農業が平均+${(s / S.ownedProvs(c).length).toFixed(1)}`; } });
A.def({ id: 'm_soko', cat: 'min', n: '穀物倉の管理', ap: 1, d: '倉の兵糧を正しく管理し、無駄を省く。', req: minOK('chiso'), vis: () => G.me.min === 'chiso',
  run: async () => { const cc = cty_(); const v = Math.round(S.countryTroops(mo_().c) * 2.5 * 0.6 * natPow()); cc.food += v; A.natWork(); return `兵糧 +${U.fmt(v)}袋`; } });
A.def({ id: 'm_suiri', cat: 'min', n: '大水利工事', ap: 2, d: '大運河を開き、沼を干拓する（プトレマイオス家がファイユームの湖を畑に変えたように）。都の周辺の農業が大きく伸びる。', req: minOK('chiso'), vis: () => G.me.min === 'chiso',
  run: async () => { const c = mo_().c, cc = cty_(); const cost = 3e7; if (cc.gold < cost) return `国庫が足りない（金${U.fmt(cost)}）。`; cc.gold -= cost; const cap = G.prov[W.capital(c)]; const ps = [cap, ...S.adj(cap.id).map(q => G.prov[q]).filter(p => p.o === c)]; for (const p of ps) p.agri = Math.min(100, p.agri + 6 * natPow()); A.natWork(3); W.gainMerit(120, '大水利工事'); return `大水利工事が完成した。${ps.map(p => S.P[p.id].name).join('・')}の農業が伸びた。`; } });
A.def({ id: 'm_kobo', cat: 'min', n: '官営工房', ap: 1, d: '武具の生産を増やす。国軍と自軍の装備が良くなる。', req: minOK('shofu'), vis: () => G.me.min === 'shofu',
  run: async () => { const me = me_(); const cc = cty_(); if (cc.gold < 5e6) return '国庫が足りない。'; cc.gold -= 5e6; cc.equip = Math.min(3, (cc.equip || 0) + 0.25); for (const s of me.army.sq) if (U.ch(0.35) && s.wl < 4) s.wl++; A.natWork(); return `武具の生産が増えた（国軍装備 +${(cc.equip).toFixed(2)}）。`; } });
A.def({ id: 'm_zaigen', cat: 'min', n: '財源確保', ap: 1, d: '塩田・鉱山・森の利と港の関税を国庫に集める。', req: minOK('shofu'), vis: () => G.me.min === 'shofu',
  run: async () => { const cc = cty_(); const v = Math.round(S.countryPop(mo_().c) * 10000 * 3 * natPow()); cc.gold += v; A.natWork(); return `国庫 +${U.fmt(v)}`; } });
A.def({ id: 'm_meihin', cat: 'min', n: '名品の作製', ap: 1, d: '工房の名工に名品を作らせる。', req: minOK('shofu'), vis: () => G.me.min === 'shofu',
  run: async () => { const me = me_(); if (!U.ch(0.4)) return '名工の納得のいく品はできなかった。'; const id = U.pick(['iron_sword', 'long_ji', 'rhino', 'iron_armor', U.ch(0.15) ? 'tanro' : 'horse']); me.items.push(id); return `名品「${D.ITEMS[id].n}」が完成した。`; } });
A.def({ id: 'm_hou', cat: 'min', n: '法の執行', ap: 1, d: '全国の治安を引き締める。', req: minOK('teii'), vis: () => G.me.min === 'teii',
  run: async () => { const c = mo_().c; for (const p of S.ownedProvs(c)) p.order = Math.min(100, p.order + U.rf(1, 3) * natPow() * S.fxm(mo_(), 'order')); A.natWork(); return '全国の治安が上がった。'; } });
A.def({ id: 'm_muhon', cat: 'min', n: '謀反の摘発', ap: 1, d: '忠誠の低い者を洗い出す。', req: () => ((G.me.rank === 'daij' && G.me.min === 'teii') || G.me.rank === 'gyos' || G.me.rank === 'josh') || '法務官・監察官・宰相のみ', vis: () => G.me.min === 'teii' || G.me.rank === 'gyos',
  run: async () => { const c = mo_().c; const sus = S.officersOf(c, x => x.loy < 45 && !x.player && !x.hist && x.id !== cty_().ruler); if (!sus.length || !U.ch(0.6 + S.stat(mo_(), 'chi') / 300)) return '怪しい者は見つからなかった。'; const x = U.pick(sus); x.ret = true; W.gainMerit(40 * tier_(), `${x.n}の謀反を摘発`); for (const o of S.officersOf(c)) o.loy = Math.min(100, o.loy + 1); return `${x.n}の謀反の企てを暴いた。`; } });
A.def({ id: 'm_shinzen', cat: 'min', n: '親善使節', ap: 1, d: '他国へ使節を送り関係を良くする。国庫を使う。', req: minOK('tenkaku'), vis: () => G.me.min === 'tenkaku',
  run: async () => { const c = await A.pickCountry('使節を送る国'); if (!c) return null; const cc = cty_(); const cost = 2e6; if (cc.gold < cost) return '国庫が足りない。'; cc.gold -= cost; const d = S.dip(mo_().c, c); const v = Math.round(U.ri(6, 14) * (0.6 + S.stat(mo_(), 'pol') / 150) * S.fxm(mo_(), 'dip')); d.rel = Math.min(100, d.rel + v); A.natWork(); W.learn('diplo'); return `${S.cname(c)}との関係 +${v}（${Math.round(d.rel)}）`; } });
A.def({ id: 'm_shisha', cat: 'min', n: '同盟・停戦の交渉', ap: 1, d: '使者として交渉にあたる。君主の承認が要る。', req: minOK('tenkaku'), vis: () => G.me.min === 'tenkaku',
  run: async () => A.diploPropose(true) });
A.def({ id: 'm_rikan', cat: 'min', n: '離間工作', ap: 1, d: '敵国の重臣に金を撒き、名将を遠ざけさせる。', req: () => ((G.me.rank === 'daij' && G.me.min === 'tenkaku') || S.isTop()) || '外交の長・宰相・君主のみ', vis: () => G.me.min === 'tenkaku',
  run: async () => A.rikan() });
A.def({ id: 'm_keibi', cat: 'min', n: '都の警備', ap: 1, d: '宮殿と都の門の守りを固める。暗殺や反乱を防ぎ、君主の信頼を得る。', req: minOK('eii'), vis: () => G.me.min === 'eii',
  run: async () => { G.flags.palaceGuard = G.turn + 6; const r = G.off[cty_().ruler]; if (r) r.bond = Math.min(100, r.bond + 5); A.natWork(); return '都と宮殿の警備を固めた。君主の信頼が増した。'; } });
A.def({ id: 'm_basei', cat: 'min', n: '軍馬の育成', ap: 1, d: '牧場を広げ軍馬を増やす。国の騎兵が強くなる。', req: minOK('taiboku'), vis: () => G.me.min === 'taiboku',
  run: async () => { const cc = cty_(); cc.horse = Math.min(3, (cc.horse || 0) + 0.25); for (const s of me_().army.sq) if (D.UT[s.t].cls === 'cav') s.tr = Math.min(100, s.tr + 3); A.natWork(); return `軍馬が増えた（騎兵の質 +${cc.horse.toFixed(2)}）。`; } });
A.def({ id: 'm_saishi', cat: 'min', n: '祭祀', ap: 1, d: '神殿の祭りと競技会を盛大に行い、民心を集める。', req: minOK('hojo'), vis: () => G.me.min === 'hojo',
  run: async () => { for (const p of S.ownedProvs(mo_().c)) p.loyal = Math.min(100, p.loyal + U.rf(1, 3)); A.natWork(); return '全国の民心が上がった。'; } });
A.def({ id: 'm_koyomi', cat: 'min', n: '暦と天文', ap: 1, d: '天を観測し、鳥占いで兆しを読み、災害に備える。一年の間、災害の被害が減る。', req: minOK('hojo'), vis: () => G.me.min === 'hojo',
  run: async () => { G.flags.calendar = G.turn + 12; A.natWork(); return '暦を整え、天変に備えた。'; } });
A.def({ id: 'm_jinzai', cat: 'min', n: '人材登用', ap: 1, d: '若い近習の中から才ある者を選び、国に新たな人材を迎える。', req: minOK('rouchu'), vis: () => G.me.min === 'rouchu',
  run: async () => { const c = mo_().c; const n = U.ri(1, 2) + (S.lawOn(c, 'kakkei') ? 1 : 0); const xs = []; for (let i = 0; i < n; i++) { const x = S.genOfficer(c, U.pick(['senn', 'sanz', 'goz', 'kenr', 'guns'])); x.age = U.ri(18, 30); if (U.ch(0.3)) x.chi = Math.min(95, x.chi + 15); xs.push(x.n); } A.natWork(); return `${xs.join('・')}を登用した。`; } });
A.def({ id: 'm_kinji', cat: 'min', n: '近侍', ap: 1, d: '君主の側近く仕え、信頼を得る。', req: minOK('rouchu'), vis: () => G.me.min === 'rouchu',
  run: async () => { const r = G.off[cty_().ruler]; if (!r) return null; r.bond = Math.min(100, r.bond + U.ri(8, 14)); return `${r.n}の信頼が増した（${Math.round(r.bond)}）。`; } });
A.def({ id: 'm_ozoku', cat: 'min', n: '一族の統制', ap: 1, d: '君主の一族と名門の動きに目を光らせ、反乱を防ぐ。', req: minOK('sosei'), vis: () => G.me.min === 'sosei',
  run: async () => { G.flags.royalWatch = G.turn + 12; A.natWork(); return '一族と名門の動きを抑えた。'; } });
A.def({ id: 'm_konin', cat: 'min', n: '婚姻外交', ap: 1, d: '君主の一族の婚姻で他国と結ぶ（王家どうしの縁組みは地中海の外交の常）。', req: minOK('sosei'), vis: () => G.me.min === 'sosei',
  run: async () => { const c = await A.pickCountry('婚姻を結ぶ国', c => S.dip(mo_().c, c).st !== 'war'); if (!c) return null; const d = S.dip(mo_().c, c); d.rel = Math.min(100, d.rel + U.ri(15, 28)); A.natWork(2); return `${S.cname(c)}と縁を結んだ。関係${Math.round(d.rel)}`; } });

/* ======== 監察（監察官） ======== */
const gyosOK = () => (G.me.rank === 'gyos' || G.me.rank === 'josh') || '監察官・宰相のみ';
A.def({ id: 'g_kansatsu', cat: 'min', n: '監察', ap: 1, d: '各地の官吏を監察し、不正を正す。', req: gyosOK, vis: () => G.me.rank === 'gyos',
  run: async () => { const c = mo_().c; const ps = U.shuffle(S.ownedProvs(c)).slice(0, 4); for (const p of ps) { p.order = Math.min(100, p.order + 3); p.loyal = Math.min(100, p.loyal + 1.5); } A.natWork(); let s = `${ps.map(p => S.P[p.id].name).join('・')}を監察した。`; if (U.ch(0.3)) { W.gainMerit(30 * tier_(), '汚職の摘発'); s += '　汚職を摘発した！'; } return s; } });
A.def({ id: 'g_dangai', cat: 'min', n: '弾劾', ap: 1, d: '問題のある大臣・総督を弾劾して罷免させる。', req: gyosOK, vis: () => G.me.rank === 'gyos',
  run: async () => {
    const c = mo_().c, cc = cty_();
    const ts = [...Object.values(cc.mins), ...S.ownedProvs(c).map(p => p.gov)].map(id => G.off[id]).filter(x => x && x.alive && !x.player && x.id !== cc.ruler);
    const pick = await HOOK.choose({ title: '弾劾', choices: [...ts.slice(0, 16).map(x => ({ v: x.id, label: `${x.n}（${x.min ? D.MINISTRIES[x.min].n : D.RANKS[x.r].name}）`, sub: `政${x.pol} 知${x.chi} 忠${Math.round(x.loy)}` })), { v: null, label: 'やめる' }] });
    if (!pick) return null;
    const x = G.off[pick];
    const res = await UI.debate(x, '弾劾');
    if (res > 0 || (res === 0 && U.ch(0.4))) {
      x.ret = true;
      if (x.min) { const n = S.genOfficer(c, 'daij'); n.min = x.min; cc.mins[x.min] = n.id; }
      for (const p of S.ownedProvs(c)) if (p.gov === x.id) { const n = S.genOfficer(c, 'guns', { loc: p.id }); p.gov = n.id; }
      const good = x.pol < 55 || x.loy < 55;
      W.gainMerit(good ? 60 * tier_() : 10, `${x.n}を弾劾`);
      return `${x.n}は罷免された。${good ? '役人たちは身を引き締めた。' : '恨みを買ったかもしれない。'}`;
    }
    const r = G.off[cc.ruler]; if (r) r.bond -= 6;
    return '弾劾は退けられた。';
  } });
A.def({ id: 'g_hosa', cat: 'min', n: '宰相の補佐', ap: 1, d: '宰相の片腕として国政を助ける。全土の内政が少し伸びる。', req: gyosOK, vis: () => G.me.rank === 'gyos',
  run: async () => { for (const p of S.ownedProvs(mo_().c)) { p.agri = Math.min(100, p.agri + 0.6 * natPow()); p.comm = Math.min(100, p.comm + 0.6 * natPow()); } A.natWork(); return '国政を補佐した。'; } });
A.def({ id: 'g_houan', cat: 'min', n: '法案の上奏', ap: 1, d: '新しい国法を君主に上奏する。舌戦に勝てば施行される。', req: () => (G.me.rank === 'gyos' || G.me.rank === 'daij') || '監察官・大臣のみ', vis: () => G.me.rank === 'gyos' || G.me.rank === 'daij',
  run: async () => {
    const cc = cty_();
    const opts = D.LAW_ORDER.filter(l => !cc.laws.includes(l));
    const l = await HOOK.choose({ title: '法案', choices: [...opts.map(l => ({ v: l, label: D.LAWS[l].n, sub: D.LAWS[l].d })), { v: null, label: 'やめる' }] });
    if (!l) return null;
    const res = await UI.debate(G.off[cc.ruler], '法案');
    if (res > 0 || (res === 0 && U.ch(0.35))) { if (cc.laws.length >= A.lawCap()) cc.laws.shift(); cc.laws.push(l); W.gainMerit(50 * tier_(), `法案「${D.LAWS[l].n}」`); return `国法「${D.LAWS[l].n}」が施行された。`; }
    return '法案は退けられた。';
  } });

/* ======== 国政（宰相・君主） ======== */
const topOK = () => S.isTop() || '宰相・君主のみ';
A.lawCap = () => { const cc = cty_(); const r = G.off[cc.ruler], j = G.off[cc.josh]; return 2 + Math.floor(((r ? S.stat(r, 'pol') : 50) + (j ? S.stat(j, 'pol') : 50)) / 70); };
A.def({ id: 'kokuhou', cat: 'nat', n: '国法', ap: 1, d: '国のルールを定める・廃する。', req: topOK,
  run: async () => {
    const cc = cty_(); const cap = A.lawCap();
    const ch = D.LAW_ORDER.map(l => ({ v: l, label: (cc.laws.includes(l) ? '【施行中】' : '') + D.LAWS[l].n, sub: D.LAWS[l].d }));
    ch.push({ v: null, label: 'やめる' });
    const l = await HOOK.choose({ title: `国法（${cc.laws.length}/${cap}）`, body: '施行中の法を選ぶと廃止、そうでない法を選ぶと施行する。', choices: ch });
    if (!l) return null;
    if (cc.laws.includes(l)) { cc.laws = cc.laws.filter(x => x !== l); return `「${D.LAWS[l].n}」を廃した。`; }
    if (cc.laws.length >= cap) return `これ以上の法は施行できない（上限${cap}。君主と宰相の政治力で増える）。`;
    if (rank_() === 'josh') { const r = G.off[cc.ruler]; if (r && !r.player && r.bond < 0 && U.ch(0.4)) return '君主が法の施行を許さなかった。'; }
    const noble = D.LAWS[l].eff.noble || 0;
    for (const o of S.officersOf(mo_().c)) o.loy = U.clamp(o.loy + noble * 0.5, 0, 100);
    cc.laws.push(l);
    S.chron(`${S.cname(mo_().c)}、国法「${D.LAWS[l].n}」を施行。`);
    return `国法「${D.LAWS[l].n}」を施行した。`;
  } });
A.def({ id: 'zeiritsu', cat: 'nat', n: '税率', ap: 0, d: '税を上げれば国庫が潤い、下げれば民心が上がる。', req: topOK,
  run: async () => { const cc = cty_(); const v = await HOOK.choose({ title: `税率（現在${Math.round(cc.tax * 100)}%）`, choices: [10, 15, 20, 25, 30].map(x => ({ v: x / 100, label: x + '%', sub: x <= 10 ? '民心が上がる' : x >= 25 ? '民心が下がる' : '' })) }); if (!v) return null; cc.tax = v; return `税率を${Math.round(v * 100)}%にした。`; } });
A.def({ id: 'zenkoku', cat: 'nat', n: '全国令', ap: 1, d: '国庫を投じて全土に施策を行う。', req: topOK,
  run: async () => {
    const cc = cty_(), c = mo_().c; const ps = S.ownedProvs(c);
    const cost = Math.round(S.countryPop(c) * 10000 * 4);
    const k = await HOOK.choose({ title: `全国令（金${U.fmt(cost)}）`, choices: [{ v: 'agri', label: '勧農令', sub: '全土の農業+2〜4' }, { v: 'comm', label: '商業振興令', sub: '全土の商業+2〜4' }, { v: 'order', label: '治安令', sub: '全土の治安+3〜6' }, { v: 'wall', label: '築城令', sub: '全土の城壁+3〜6' }, { v: 'levy', label: '徴兵令', sub: '全土で兵を集める。民心-3' }, { v: null, label: 'やめる' }] });
    if (!k) return null;
    if (cc.gold < cost) return '国庫が足りない。';
    cc.gold -= cost;
    for (const p of ps) {
      if (k === 'agri') p.agri = Math.min(100, p.agri + U.rf(2, 4) * natPow());
      if (k === 'comm') p.comm = Math.min(100, p.comm + U.rf(2, 4) * natPow());
      if (k === 'order') p.order = Math.min(100, p.order + U.rf(3, 6));
      if (k === 'wall') p.wall = Math.min(100, p.wall + U.rf(3, 6));
      if (k === 'levy') { p.troops += Math.round(p.pop * 10000 * 0.008); p.loyal = Math.max(5, p.loyal - 3); }
    }
    A.natWork(2);
    return '全国令を発した。';
  } });
A.def({ id: 'jinji', cat: 'nat', n: '人事', ap: 1, d: '大臣・総督・将軍を任命する。', req: topOK,
  run: async () => UI.appoint() });
A.def({ id: 'onshou', cat: 'nat', n: '恩賞', ap: 1, d: '臣下に金を与え、忠誠を高める。', req: topOK,
  run: async () => { const cc = cty_(); const cost = 5e6; if (cc.gold < cost) return '国庫が足りない。'; cc.gold -= cost; for (const o of S.officersOf(mo_().c)) { o.loy = Math.min(100, o.loy + U.ri(3, 8)); o.bond = Math.min(100, o.bond + 2); } return '臣下に恩賞を与えた。忠誠が上がった。'; } });

/* ======== 外交 ======== */
const dipOK = () => (S.isTop() || (G.me.rank === 'daij' && G.me.min === 'tenkaku')) || '宰相・君主（一部は外交の長）のみ';
A.def({ id: 'd_shinzen', cat: 'dip', n: '親善', ap: 1, d: '贈り物で関係を良くする。', req: topOK,
  run: async () => { const c = await A.pickCountry('贈り物をする国'); if (!c) return null; const cc = cty_(); const cost = 3e6; if (cc.gold < cost) return '国庫が足りない。'; cc.gold -= cost; const d = S.dip(mo_().c, c); const v = U.ri(8, 16); d.rel = Math.min(100, d.rel + v); return `${S.cname(c)}との関係 +${v}（${Math.round(d.rel)}）`; } });
A.diploPropose = async (asEnvoy = false) => {
  const myc = mo_().c;
  const c = await A.pickCountry('交渉相手');
  if (!c) return null;
  const d = S.dip(myc, c);
  const ch = [];
  if (d.st === 'peace' || d.st === 'truce') ch.push({ v: 'ally', label: '同盟を申し込む（2年）' });
  if (d.st === 'war') ch.push({ v: 'truce', label: '停戦を申し込む（1年）' });
  if (d.st === 'ally') ch.push({ v: 'break', label: '同盟を破棄する' });
  ch.push({ v: null, label: 'やめる' });
  const k = await HOOK.choose({ title: `${S.cname(c)}との交渉`, body: A.relStr(c), choices: ch });
  if (!k) return null;
  if (asEnvoy && !S.isTop()) { const r = G.off[cty_().ruler]; if (r && !r.player && U.ch(0.25 - r.bond / 400)) return '君主の許しが得られなかった。'; }
  const res = await UI.debate(G.off[G.cty[c].josh] || G.off[G.cty[c].ruler], '交渉');
  const pr = S.countryPower(myc) / Math.max(1, S.countryPower(c));
  if (k === 'ally') {
    const common = D.CORDER.some(x => x !== c && x !== myc && G.cty[x].alive && S.atWar(c, x) && S.atWar(myc, x));
    const p = 0.1 + d.rel / 150 + (common ? 0.25 : 0) + res * 0.18 + S.myFx('dip') * 0.3;
    if (U.ch(U.clamp(p, 0.02, 0.92))) { W.learn('diplo'); d.st = 'ally'; d.t = 24; d.rel = Math.max(d.rel, 30); A.natWork(); W.gainMerit(80 * tier_(), `${S.cname(c)}との同盟`); return `${S.cname(c)}と同盟を結んだ！`; }
    d.rel -= 3; return '同盟は断られた。';
  }
  if (k === 'truce') {
    const p = 0.15 + (1 / pr - 1) * -0.15 + (pr > 1 ? 0.25 : 0) + res * 0.2 + d.rel / 300 + S.myFx('dip') * 0.3;
    if (U.ch(U.clamp(p, 0.03, 0.9))) { W.learn('diplo'); d.st = 'truce'; d.t = 12; d.rel += 10; A.natWork(); return `${S.cname(c)}と停戦した。`; }
    return '停戦は断られた。';
  }
  if (k === 'break') { d.st = 'peace'; d.t = 0; d.rel -= 30; for (const o of S.officersOf(myc)) o.loy = Math.max(0, o.loy - 2); return `${S.cname(c)}との同盟を破棄した。`; }
  return null;
};
A.def({ id: 'd_kosho', cat: 'dip', n: '同盟・停戦', ap: 1, d: '同盟や停戦を申し込む。', req: topOK, run: async () => A.diploPropose(false) });
A.def({ id: 'd_sensen', cat: 'dip', n: '宣戦布告', ap: 1, d: '他国に戦争を仕掛ける。', req: topOK,
  run: async () => { const c = await A.pickCountry('宣戦する国', c => !S.atWar(mo_().c, c)); if (!c) return null; const d = S.dip(mo_().c, c); if (d.st === 'ally' || d.st === 'truce') { for (const o of S.officersOf(mo_().c)) o.loy = Math.max(0, o.loy - 4); S.log('盟約を破って宣戦した。諸国の信を失った。', 'bad'); for (const x of D.CORDER) if (x !== c && x !== mo_().c) S.dip(mo_().c, x).rel -= 8; } W.declareWar(mo_().c, c); return `${S.cname(c)}に宣戦布告した。`; } });
A.rikan = async () => {
  const c = await A.pickCountry('離間工作をしかける国');
  if (!c) return null;
  const cc = cty_(); const cost = 8e6;
  if (cc.gold < cost) return `国庫が足りない（金${U.fmt(cost)}）。`;
  const gens = S.officersOf(c, x => ['dais', 'shog'].includes(x.r)).sort((a, b) => (b.tou + b.chi) - (a.tou + a.chi)).slice(0, 6);
  const pick = await HOOK.choose({ title: '誰を陥れる？', choices: [...gens.map(x => ({ v: x.id, label: `${x.n}（${D.RANKS[x.r].name}）`, sub: `統${x.tou} 知${x.chi}` })), { v: null, label: 'やめる' }] });
  if (!pick) return null;
  cc.gold -= cost;
  const x = G.off[pick];
  const corrupt = S.officersOf(c, y => y.pol > 60 && y.mi < 45 && ['josh', 'daij'].includes(y.r)).length > 0;
  const p = 0.18 + S.stat(mo_(), 'chi') / 400 + (corrupt ? 0.2 : 0) - x.chi / 400 + S.myFx('plot') * 0.4 - S.fx(x, 'loy') * 0.2;
  if (U.ch(U.clamp(p, 0.05, 0.85))) { W.learn('plotOk'); x.ret = true; S.log(`${S.cname(c)}の${x.n}は讒言により失脚した。`, 'big'); S.chron(`${S.cname(c)}の${x.n}、讒言により失脚。`); W.gainMerit(150 * tier_(), `${x.n}の失脚工作`); return `工作は成功した。${x.n}は失脚した！`; }
  S.dip(mo_().c, c).rel -= 10;
  return '工作は見破られた。';
};
A.def({ id: 'd_rikan', cat: 'dip', n: '離間工作', ap: 1, d: '敵国の重臣を買収し、名将を失脚させる。', req: topOK, run: async () => A.rikan() });
A.def({ id: 'd_kofuku', cat: 'dip', n: '降伏勧告', ap: 1, d: '弱った国に降伏を迫る。成功すれば戦わずに併合できる。', req: topOK,
  run: async () => {
    const myc = mo_().c;
    const c = await A.pickCountry('降伏を勧める国', c => S.ownedProvs(c).length <= 4, c => `州${S.ownedProvs(c).length}　兵${U.fmt(S.countryTroops(c))}　${A.relStr(c)}`);
    if (!c) return null;
    const pr = S.countryPower(myc) / Math.max(1, S.countryPower(c));
    const res = await UI.debate(G.off[G.cty[c].josh] || G.off[G.cty[c].ruler], '降伏勧告');
    const p = (pr - 4) * 0.06 + res * 0.12 + (S.dip(myc, c).rel > 0 ? 0.08 : 0) + (c === 'ptol' ? 0.08 : 0);
    if (U.ch(U.clamp(p, 0.01, 0.8))) {
      for (const p2 of S.ownedProvs(c)) { p2.o = myc; p2.loyal = Math.max(20, p2.loyal - 10); const g = S.genOfficer(myc, 'guns', { loc: p2.id }); p2.gov = g.id; }
      W.killCountry(c, myc);
      S.chron(`${S.cname(c)}、${S.cname(myc)}に降伏。`);
      W.gainMerit(500 * tier_(), `${S.cname(c)}の降伏`);
      return `${S.cname(c)}は降伏した！ 全土が我が国のものとなった。`;
    }
    S.dip(myc, c).rel -= 15;
    return '降伏は拒まれた。';
  } });

/* ======== 軍令（宰相・君主） ======== */
A.def({ id: 'shuppei', cat: 'war', n: '遠征', ap: 1, d: '交戦中の国の大都市（州の都）へ遠征軍を送る。前哨戦・野戦を経て攻城戦。野戦で敵の主力を殲滅すれば城は開く。自ら率いる（親征）こともできる。', req: topOK,
  run: async () => {
    const c = mo_().c;
    const plans = W.campaignPlans(c);
    const tgts = [...new Set(plans.map(p => p.tgt))];
    if (!tgts.length) return '遠征できる敵の大都市がない（交戦中の国と接していない）。';
    const pid = await A.pickProv('遠征先（大都市）', tgts, p => { const pl = plans.find(x => x.tgt === p.id); const fs = S.foreignShare(p, true); return `${S.bigName(p.id)}（${S.cname(p.o)}）　守備${U.fmt(p.troops)}　城壁${Math.round(p.wall)}${fs > 0 ? `　周りの拠点${Math.round(fs * 100)}%を確保` : ''}　動員可能${U.fmt(pl.atk)}`; });
    if (!pid) return null;
    const pl = plans.find(x => x.tgt === pid);
    const avail = Math.round(U.sum([...new Set([pl.src, ...S.adj(pid).filter(q => G.prov[q].o === c)])].map(q => G.prov[q]), p => p.troops * 0.7));
    const amt = await HOOK.choose({ title: '動員する兵力', choices: [0.4, 0.7, 1].map(f => ({ v: Math.round(avail * f), label: U.fmt(avail * f) + '人' })).concat([{ v: null, label: 'やめる' }]) });
    if (!amt) return null;
    const gens = S.officersOf(c, x => ['dais', 'shog'].includes(x.r)).sort((a, b) => b.tou - a.tou).slice(0, 6);
    const who = await HOOK.choose({ title: '遠征軍の総大将', choices: [{ v: 'me', label: '自ら率いる（親征）', sub: '前哨戦・野戦・攻城戦を指揮する' }, ...gens.map(x => ({ v: x.id, label: x.n, sub: `統${x.tou} 武${x.bu} 知${x.chi}（観戦できる）` }))] });
    if (!who) return null;
    if (who === 'me') { await W.launchPlayerCampaign(pid, amt, { lead: true, src: pl.src }); return ''; }
    const watch = await HOOK.choose({ title: '戦の見届け', choices: [{ v: true, label: '観戦する' }, { v: false, label: '結果だけ聞く' }] });
    const res = await W.launchPlayerCampaign(pid, amt, { lead: false, cmd: who, watch, src: pl.src });
    return res ? (G.prov[pid].o === c ? `${S.P[pid].name}を攻め落とした！` : res.win === 'besiege' ? `${S.P[pid].name}の${S.bigName(pid)}を包囲した。月をまたいで城を締め上げる。` : `${S.P[pid].name}の攻略は失敗した。`) : null;
  } });
A.def({ id: 'haichi', cat: 'war', n: '兵の配置', ap: 1, d: '州から隣の州へ兵を移す。', req: topOK,
  run: async () => {
    const c = mo_().c;
    const from = await A.pickProv('どこから', S.ownedProvs(c).filter(p => p.troops > 2000), p => `兵${U.fmt(p.troops)}`);
    if (!from) return null;
    const to = await A.pickProv('どこへ', S.adj(from).filter(q => G.prov[q].o === c).map(q => G.prov[q]), p => `兵${U.fmt(p.troops)}${S.enemyNeighbors(p.id).length ? '　前線' : ''}`);
    if (!to) return null;
    const mv = Math.round(G.prov[from].troops * 0.5);
    G.prov[from].troops -= mv; G.prov[to].troops += mv;
    return `${S.P[from].name}から${S.P[to].name}へ${U.fmt(mv)}を移した。`;
  } });

/* ======== 私領 ======== */
A.def({ id: 'kensetsu', cat: 'land', n: '施設建設', ap: 1, d: '私領に施設を建てる・拡張する。数か月かかる。',
  run: async () => UI.build() });
A.def({ id: 'shihei', cat: 'land', n: '私兵募集', ap: 1, d: '私領で兵を募る。上限は兵舎と与えられた村で決まる。',
  run: async () => {
    const me = me_(); const cap = S.pvCap(); const have = U.sum(me.army.sq.filter(s => s.pv), s => s.n);
    if (have >= cap) return `私兵は上限です（${U.num(cap)}人）。兵舎を建てると増やせる。`;
    const per = A.PV_PRICE;
    const lim = Math.min(cap - have, Math.round(10 + me.land.fac.barracks * 25 + me.land.hh * 0.01));
    const maxN = Math.min(lim, Math.floor(me.gold / per));
    if (maxN < 1) return `金が足りない（1人あたり金${per}）。`;
    const ty = await HOOK.choose({ title: '募る兵種', choices: D.UT_TRAINABLE.filter(t => A.canField(t)).map(t => ({ v: t, label: D.UT[t].n, sub: D.UT[t].desc, img: (G.me && G.off[G.me.oid] && ASSET.url('unit/card_' + G.off[G.me.oid].c + '_' + t)) || ASSET.url('unit/card_' + t) })).concat([{ v: null, label: 'やめる' }]) });
    if (!ty) return null;
    const add = await HOOK.number({ title: `${D.UT[ty].n}を何人募る？`, body: `一度に募れるのは${U.num(lim)}人まで（兵舎と与えられた村で増える）。1人あたり金${per}・毎月 兵糧2.5袋と金15がかかる。\n私兵 ${U.num(have)}／上限${U.num(cap)}　金 ${U.fmt(me.gold)}`, min: 1, max: maxN, value: maxN, unit: '人', info: (n) => `金${U.fmt(n * per)}` });
    if (!add) return null;
    const n = Math.min(maxN, Math.max(1, Math.floor(add)));
    me.gold -= n * per;
    let sq = me.army.sq.find(s => s.pv && s.t === ty && !s.ld);
    if (!sq) { sq = S.newSquad(ty, 0, { pv: true, tr: 25 }); me.army.sq.push(sq); }
    sq.tr = Math.round((sq.tr * sq.n + 25 * n) / (sq.n + n)); sq.n += n; sq.max = sq.n;
    return `私兵の${D.UT[ty].n}を${U.num(n)}人募った（金-${U.fmt(n * per)}）。`;
  } });
// 兵種転換（一部の兵を別の兵種へ）
A.convCost = (t) => Math.round(D.UT[t].cost * 8);
// 隊 sqId の n 人を兵種 t に変える（金がかかり、練度は6割になる）。変えた人数を返す
A.convertTroops = (sqId, n, t) => {
  const me = G.me, A2 = me.army, s = A2.sq.find(x => x.id === sqId);
  if (!s || s.t === t || !D.UT[t] || !D.UT_TRAINABLE.includes(t) || !A.canField(t)) return 0;
  const per = A.convCost(t);
  n = Math.min(s.n, Math.floor(me.gold / per), Math.max(0, Math.floor(n)));
  if (n < 1) return 0;
  me.gold -= n * per;
  const share = s.pv ? n : Math.min(s.max, Math.round(s.max * n / Math.max(1, s.n)));
  const from = { tr: s.tr * 0.6, wl: s.wl, al: s.al, xp: s.xp || 0 };
  s.n -= n; s.max = Math.max(s.n, s.max - share);
  let ns = A2.sq.find(x => x.t === t && !!x.pv === !!s.pv && (x.ld || null) === (s.ld || null));
  if (!ns) { ns = S.newSquad(t, 0, { pv: s.pv, tr: from.tr, wl: s.wl, al: s.al, ld: s.ld || null }); ns.max = 0; A2.sq.push(ns); }
  S.mergeInto(ns, from, n, share);
  S.tidyArmy();
  return n;
};
A.convert = async () => {
  const me = G.me;
  const s = await A.pickSquad('転換する部隊', false); if (!s || s === 'all') return null;
  const types = D.UT_TRAINABLE.filter(t => t !== s.t && A.canField(t));
  if (!types.length) return '転換できる兵種がない（厩舎・工房・鍛冶場で増える）。';
  const t = await HOOK.choose({ title: '新しい兵種', body: '施設（厩舎・工房・鍛冶場）で選べる兵種が増える。', choices: types.map(t => ({ v: t, label: D.UT[t].n, sub: D.UT[t].desc + `　1人あたり金${A.convCost(t)}` })).concat([{ v: null, label: 'やめる' }]) });
  if (!t) return null;
  const per = A.convCost(t), maxN = Math.min(s.n, Math.floor(me.gold / per));
  if (maxN < 1) return `金が足りない（1人あたり金${per}）。`;
  const amt = await HOOK.number({ title: `何人を${D.UT[t].n}に転換する？`, body: `${S.squadName(s)}　${U.num(s.n)}人\n1人あたり金${per}。転換した兵の練度は6割になる。`, min: 1, max: maxN, value: maxN, unit: '人', info: (n) => `金${U.fmt(n * per)}` });
  if (!amt) return null;
  const n = A.convertTroops(s.id, amt, t);
  return n ? `${U.num(n)}人を${D.UT[t].n}に転換した（金-${U.fmt(n * per)}）。` : '転換できなかった。';
};
A.PV_PRICE = 60;
A.FOOD_PRICE = 8; // 市場の兵糧 1袋あたりの金
A.canField = (t) => {
  const req = D.UT_REQ[t]; if (!req) return true;
  const me = G.me;
  const myc = S.myOff().c;
  if (req.special === 'mount') return ['mace', 'rome'].includes(myc) && me.land.fac.school >= 1 || me.rank === 'dais' || me.rank === 'tenka';
  if (req.special === 'eleph') return D.ELEPH_C.includes(myc) && ((me.land.fac.stable || 0) >= 3 || S.tier() >= 7 || (me.rank === 'daij' && me.min === 'taiboku'));
  if (req.special === 'warb') return D.WARB_C.includes(myc) && ((me.land.fac.barracks || 0) >= 2 || S.tier() >= 6);
  return (me.land.fac[req.fac] || 0) >= req.lv || (S.tier() >= 7 && req.lv <= 2) || (me.rank === 'daij' && me.min === 'taiboku' && req.fac === 'stable');
};
A.def({ id: 'r_junsatsu', cat: 'land', n: '領地巡察', ap: 1, d: '私領を見回り、治安と民心を上げる。',
  run: async () => { const L = me_().land; L.order = Math.min(100, L.order + 6); L.loyal = Math.min(100, L.loyal + 4); let s = '領地を見回った。'; if (U.ch(0.12)) { const it = U.pick(['bronze_sword', 'leather', 'horse', 'weiliaozi']); me_().items.push(it); s += `　古い蔵から「${D.ITEMS[it].n}」が見つかった！`; } return s; } });
A.def({ id: 'nengu', cat: 'land', n: '年貢', ap: 0, d: '私領の年貢の重さを決める。',
  run: async () => { const L = me_().land; const v = await HOOK.choose({ title: '年貢', choices: [{ v: 0, label: '軽い', sub: '収入-25% 民心が上がる' }, { v: 1, label: '普通' }, { v: 2, label: '重い', sub: '収入+30% 民心が下がる' }] }); if (v == null) return null; L.tax = v; return `年貢を「${['軽い', '普通', '重い'][v]}」にした。`; } });

/* ---------- 実行 ---------- */
A.status = (a) => {
  const me = G.me;
  if (a.vis && !a.vis()) return { show: false };
  let ok = a.req ? a.req() : true;
  if (ok === true && a.ap > me.ap) ok = '任務状が足りない';
  if (ok === true && a.cost) { const c = a.cost(); if (c > me.gold) ok = `金が足りない（${U.fmt(c)}）`; }
  return { show: true, ok: ok === true, why: ok === true ? '' : ok };
};
A.visibleCats = () => {
  const r = G.me.rank, tr = D.RANKS[r].track;
  const cats = ['self'];
  if (hasArmy() || tr === 'mil') cats.push('army');
  if (tr === 'mil' || tr === 'staff' || G.offers.length || r === 'guns') cats.push('ops');
  if (G.me.jur) cats.push('jur');
  if (r === 'daij' || r === 'gyos') cats.push('min');
  if (S.isTop()) cats.push('nat', 'dip', 'war');
  if (r === 'daij' && G.me.min === 'tenkaku') cats.push('dip');
  cats.push('land');
  return [...new Set(cats)];
};
A.run = async (a) => {
  const st = A.status(a);
  if (!st.ok) return st.why;
  const me = G.me;
  const apBefore = me.ap;
  me.ap -= a.ap;
  let msg;
  try { msg = await a.run(); }
  catch (e) { console.error(e); msg = 'エラー：' + e.message; }
  if (msg === null) { me.ap = apBefore; return null; }
  if (msg) S.log(`${a.n}：${msg}`);
  await W.checkTasks();
  await W.checkPromotion();
  return msg;
};
