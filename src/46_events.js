/* =========================================================
   地中海覇道 — events
   ========================================================= */
const EV = {};
HOOK.duel = async (o) => ({ win: U.ch(o.a.bu / (o.a.bu + o.b.bu)), hpLeft: 50 });

EV.myC = () => S.myOff().c;
EV.done = id => !!G.flags['ev_' + id];
EV.mark = id => { G.flags['ev_' + id] = G.turn; };
EV.alive = c => G.cty[c] && G.cty[c].alive;
EV.histOff = n => Object.values(G.off).find(o => o.hist && o.n === n);
// その土地の馬（馬商人・褒美）
EV.horseKey = () => { const cul = (S.P[G.me.loc] || {}).cul; const k = (cul === 'numid' || cul === 'punic') ? 'numi_horse' : (cul === 'greek' || cul === 'maced') ? 'thess_horse' : 'hu_horse'; return D.ITEMS[k] ? k : 'hu_horse'; };

EV.generic = [
  { id: 'harvest', w: () => (G.month === 8 || G.month === 9) ? 6 : 0, run: async () => {
      const me = G.me;
      if (me.jur) { A.jurAdd('agri', 1); A.jurAdd('loyal', 2); }
      const f = Math.round(me.land.ha * 40 + 50 * S.tier());
      me.food += f;
      await HOOK.info({ title: '豊作', body: `今年は天候に恵まれ、豊作となった。\n私領の兵糧 +${U.num(f)}袋${me.jur ? '\n管轄の民も喜んでいる。' : ''}` });
    } },
  { id: 'locust', w: () => (G.month >= 6 && G.month <= 8) ? 3 : 0, run: async () => {
      const me = G.me; const p = G.prov[me.loc];
      const cal = G.flags.calendar && G.flags.calendar > G.turn;
      p.agri = Math.max(5, p.agri - (cal ? 1 : 4));
      if (!me.jur) { await HOOK.info({ title: '蝗害', body: `${S.P[me.loc].name}に蝗の大群が押し寄せ、作物を食い荒らした。${cal ? '（暦の備えで被害は抑えられた）' : ''}` }); return; }
      const need = Math.round(me.jur.hh * 0.4);
      const k = await HOOK.choose({ title: '蝗害', body: `${me.jur.name}の畑が蝗に食い荒らされた。民が飢えている。`, choices: [{ v: 1, label: `蔵を開く（兵糧${U.num(need)}袋）`, disabled: me.food < need }, { v: 0, label: '耐えさせる' }] });
      if (k) { me.food -= need; A.jurAdd('loyal', 4); } else { A.jurAdd('loyal', -6); me.jur.hh = Math.round(me.jur.hh * 0.97); }
      A.jurAdd('agri', cal ? -1 : -4);
    } },
  { id: 'flood', w: () => (G.month >= 6 && G.month <= 8 && ['river', 'marsh'].includes(S.P[G.me.loc].t)) ? 4 : 0, run: async () => {
      const me = G.me; const lv = me.jur?.levee || 0;
      const cal = G.flags.calendar && G.flags.calendar > G.turn;
      const dmg = Math.max(0, (cal ? 2 : 5) - lv * 2);
      G.prov[me.loc].agri = Math.max(5, G.prov[me.loc].agri - dmg);
      if (me.jur) { A.jurAdd('agri', -dmg); me.jur.hh = Math.round(me.jur.hh * (1 - dmg / 150)); }
      await HOOK.info({ title: '洪水', body: `大雨で川があふれた。${dmg ? `田畑が流された（農業-${dmg}）。` : '堤が持ちこたえ、被害はなかった。'}` });
    } },
  { id: 'plague', w: 1.5, run: async () => {
      const me = G.me; if (!hasArmy()) return;
      const k = await HOOK.choose({ title: '疫病', body: '陣中で疫病が流行りはじめた。', choices: [{ v: 1, label: '名医を招く（金）', sub: `金${U.fmt(400 * S.tier() * S.tier())}`, disabled: me.gold < 400 * S.tier() * S.tier() }, { v: 0, label: '自然に収まるのを待つ' }] });
      const f = k ? 0.01 : 0.05 * Math.max(0.2, 1 - S.myFx('health') - S.myFx('heal') * 0.5);
      if (k) me.gold -= 400 * S.tier() * S.tier();
      for (const s of me.army.sq) s.n = Math.max(0, s.n - Math.ceil(s.n * f));
      for (const w of me.army.wu) if (w.alive) w.hp = Math.max(20, w.hp - (k ? 5 : 30));
      S.log(k ? '名医のおかげで疫病は収まった。' : '疫病で兵が倒れた。', k ? 'good' : 'bad');
    } },
  { id: 'sage', w: 2, run: async () => {
      const me = G.me, o = S.myOff();
      const nm = S.genName();
      const k = await HOOK.choose({ title: '名士来訪', body: `旅の学者・${nm.n}が訪ねてきた。「地中海の形勢を語りましょう」`, choices: [{ v: 'learn', label: '教えを請う', sub: '能力の経験が増える' }, { v: 'recruit', label: '仕えてほしいと頼む', sub: '部下になるかもしれない', disabled: S.tier() < 2 }, { v: 'recommend', label: '国に推挙する', sub: '功績になる' }] });
      if (k === 'learn') { const s = U.pick(['chi', 'pol', 'tou']); me.exp[s] += 45; S.log(`${nm.n}の教えを受けた。`, 'good'); }
      if (k === 'recruit') { if (U.ch(0.3 + S.stat(o, 'mi') / 200)) { const x = S.genOfficer(o.c, (D.RANK_ORDER_CIV)[Math.max(0, S.tier() - 2)], { loc: me.loc }); x.n = nm.n; x.sei = nm.sei; x.mei = nm.mei; x.chi = Math.min(95, x.chi + 15); x.lord = o.id; x.bond = 30; me.army.subs.push(x.id); S.log(`${nm.n}が部下になった。`, 'good'); } else S.log(`${nm.n}は去っていった。`); }
      if (k === 'recommend') { W.gainMerit(Math.round(8 * S.tier()), `${nm.n}を推挙`); S.genOfficer(o.c, 'kenr'); }
    } },
  { id: 'assassin', w: () => S.tier() >= 6 ? 1.2 : 0, run: async () => {
      if (G.flags.palaceGuard > G.turn && S.isTop()) { await HOOK.info({ title: '刺客', body: '刺客が忍び込んだが、衛兵が捕らえた。' }); return; }
      const nm = S.genName();
      const foe = { n: nm.n, sei: nm.sei, bu: U.ri(66, 86), tou: 30, chi: 40, mi: 20, tr: [], wep: 'dagger', c: 'bandit' };
      await HOOK.info({ title: '刺客！', body: `深夜、${nm.n}と名乗る刺客が斬りかかってきた！` });
      const r = await HOOK.duel({ a: W.snap(S.myOff()), b: foe, title: '刺客との死闘', noFlee: false });
      if (r.win) { G.me.fame += 20; S.log('刺客を返り討ちにした。', 'good'); }
      else if (r.fled) { G.me.inj = 1; S.log('刺客から逃れたが、手傷を負った。', 'bad'); }
      else { G.me.inj = 3; S.log('刺客に深手を負わされた……（3か月）', 'bad'); if (G.diff >= 2 && !(G.custom && G.custom.noDeath) && U.ch(0.25 * Math.max(0, 1 - S.myFx('luck') * 2))) G.over = { kind: 'death', text: `${S.myOff().n}は刺客の凶刃に倒れた。` }; }
    } },
  { id: 'feast', w: () => G.me.boss ? 2 : 0, run: async () => {
      const b = G.off[G.me.boss]; if (!b) return;
      const k = await HOOK.choose({ title: '酒宴', body: `上官の${b.n}から酒宴に招かれた。`, choices: [{ v: 2, label: 'とことん付き合う', sub: '絆が大きく上がる' }, { v: 1, label: 'ほどほどに付き合う' }, { v: 0, label: '断る' }] });
      b.bond = U.clamp(b.bond + [-4, 5, 10][k], -100, 100);
      if (k === 2 && U.ch(0.25)) { S.log('飲みすぎて翌月まで二日酔いだった……（任務状-1）'); G.me.ap = Math.max(0, G.me.ap - 1); }
    } },
  { id: 'tournament', w: () => (S.isMil() && S.tier() <= 5) ? 1.5 : 0, run: async () => {
      const k = await HOOK.choose({ title: '武芸競技会', body: '軍中で、剣と槍の腕を競う競技会が開かれる。出場するか？', choices: [{ v: 1, label: '出場する' }, { v: 0, label: '見物する' }] });
      if (!k) return;
      let wins = 0;
      for (let i = 0; i < 3; i++) {
        const nm = S.genName();
        const foe = { n: nm.n, sei: nm.sei, bu: U.ri(48, 66) + i * 8, tou: 40, chi: 40, mi: 30, tr: [] };
        const r = await HOOK.duel({ a: W.snap(S.myOff()), b: foe, title: `武芸競技会 ${['一回戦', '準決勝', '決勝'][i]}`, sport: true });
        if (!r.win) break; wins++;
      }
      const gold = [0, 300, 900, 3000][wins] * S.tier();
      G.me.gold += gold;
      if (wins === 3) { G.me.fame += 30; W.gainMerit(20 * S.tier(), '競技会で優勝'); G.me.items.push(U.pick(['iron_sword', 'horse', 'rhino'])); }
      await HOOK.info({ title: '武芸競技会', body: wins === 3 ? `見事優勝した！ 賞金 金${U.fmt(gold)}と名品を賜った。` : `${wins}勝で敗れた。${gold ? '賞金 金' + U.fmt(gold) : ''}` });
    } },
  { id: 'marriage', w: () => (!G.me.spouse && S.myOff().age >= 17 && S.myOff().age <= 42) ? 1.2 : 0, run: async () => {
      const cands = [
        { k: '名家の出', bonus: { mi: 3, pol: 2 }, d: '魅力+3・政治+2' },
        { k: '武門の出', bonus: { bu: 2, tou: 2 }, d: '武力+2・統率+2' },
        { k: '豪商の出', bonus: {}, gold: 1, d: '毎月の収入が増える' },
      ];
      const ch = U.shuffle(cands).slice(0, 2).map(c => { const nm = S.genName().n; return { v: Object.assign({ nm }, c), label: `${nm}（${c.k}）`, sub: c.d }; });
      ch.push({ v: null, label: '今は断る' });
      const pick = await HOOK.choose({ title: '縁談', body: '縁談が持ち込まれた。', choices: ch });
      if (!pick) return;
      G.me.spouse = { n: pick.nm, k: pick.k }; G.me.spouseBonus = pick.bonus; if (pick.gold) G.me.land.hh += 120;
      S.log(`${G.me.spouse.n}と結ばれた。`, 'good'); S.chron(`${S.myOff().n}、${G.me.spouse.n}を娶る。`);
    } },
  { id: 'desert', w: () => (hasArmy() && S.avgTraining() < 50 && S.armyTotal() >= 50) ? 2 : 0, run: async () => {
      const k = await HOOK.choose({ title: '脱走兵', body: '夜陰にまぎれて逃げようとした兵が捕まった。', choices: [{ v: 1, label: '軍律に従い厳罰に処す', sub: '練度+3、ただし兵は萎縮する' }, { v: 0, label: '事情を聞いて許す', sub: '絆が上がるが、脱走が続くかもしれない' }] });
      for (const s of G.me.army.sq) { if (k) s.tr = Math.min(100, s.tr + 3); else s.n = Math.max(0, s.n - Math.ceil(s.n * 0.01)); }
      for (const w of G.me.army.wu) if (w.alive) w.bond += k ? -3 : 5;
    } },
  { id: 'spy', w: () => S.isMil() || S.isTop() ? 1.5 : 0.5, run: async () => {
      const k = await HOOK.choose({ title: '間者', body: '敵国の間者を捕らえた。', choices: [{ v: 'kill', label: '斬る' }, { v: 'turn', label: '寝返らせて二重間者にする', sub: '知力で成否が決まる' }, { v: 'free', label: '逃がす' }] });
      if (k === 'kill') { G.me.fame += 3; }
      if (k === 'turn') { if (U.ch(S.stat(S.myOff(), 'chi') / 130)) { W.gainMerit(15 * S.tier(), '二重間者'); G.me.flags.spy = G.turn + 6; S.log('間者を寝返らせた。敵の内情が筒抜けになる。', 'good'); } else S.log('間者に逃げられた。', 'bad'); }
    } },
  { id: 'jealous', w: () => (G.me.boss && G.me.merit > D.RANKS[G.me.rank].m * 1.2 + 100) ? 1.2 * (typeof PPL !== 'undefined' ? PPL.diff().harsh : 1) : 0, run: async () => {
      const b = G.off[G.me.boss]; if (!b) return;
      const k = await HOOK.choose({ title: '上官の嫉妬', body: `${b.n}が、手柄を立てる主人公を快く思っていないらしい。`, choices: [{ v: 'gift', label: '贈り物をする', sub: `金${U.fmt(300 * S.tier() * S.tier())}`, disabled: G.me.gold < 300 * S.tier() * S.tier() }, { v: 'endure', label: '黙って耐える' }, { v: 'debate', label: '直談判する（舌戦）' }] });
      if (k === 'gift') { G.me.gold -= 300 * S.tier() * S.tier(); b.bond += 12; }
      if (k === 'endure') b.bond -= 3;
      if (k === 'debate') { const r = await UI.debate(b, '直談判'); if (r > 0) { b.bond += 10; W.gainMerit(10 * S.tier(), '上官を説き伏せた'); } else b.bond -= 15; }
    } },
  { id: 'subfeat', w: () => G.me.army.subs.length ? 1.5 : 0, run: async () => {
      const x = G.off[U.pick(G.me.army.subs)]; if (!x || !x.alive) return;
      W.gainMerit(Math.round(10 * S.tier()), `部下${x.n}の手柄`);
      x.bond = Math.min(100, x.bond + 5); const k = U.pick(['bu', 'tou', 'chi']); x[k] = Math.min(95, x[k] + 1);
    } },
  { id: 'merchant', w: 1.5, run: async () => {
      const id = U.pick(Object.keys(D.ITEMS).filter(k => D.ITEMS[k].rare));
      const it = D.ITEMS[id]; const price = Math.round(it.price * U.rf(0.55, 0.85));
      const k = await HOOK.choose({ title: '行商人', body: `怪しげな行商人が「${it.n}」を売りに来た。${it.d}`, choices: [{ v: 1, label: `買う（金${U.fmt(price)}）`, disabled: G.me.gold < price }, { v: 0, label: '見送る' }] });
      if (k) { G.me.gold -= price; G.me.items.push(id); S.log(`名品「${it.n}」を手に入れた！`, 'good'); }
    } },
  { id: 'petition', w: () => G.me.jur ? 2.5 : 0, run: async () => {
      const k = await HOOK.choose({ title: '民の陳情', body: `${G.me.jur.name}の民が、橋の修理を願い出てきた。`, choices: [{ v: 1, label: `願いを聞く（金${U.fmt(G.me.jur.hh * 0.3)}）`, disabled: G.me.gold < G.me.jur.hh * 0.3 }, { v: 0, label: '退ける' }] });
      if (k) { G.me.gold -= Math.round(G.me.jur.hh * 0.3); A.jurAdd('loyal', 5); A.jurAdd('comm', 1); } else A.jurAdd('loyal', -3);
    } },
  { id: 'bribe', w: () => S.tier() >= 4 ? 1.2 : 0, run: async () => {
      const g = 600 * S.tier() * S.tier();
      const k = await HOOK.choose({ title: '賄賂', body: `ある有力者が「どうか、よしなに」と金${U.fmt(g)}を差し出してきた。`, choices: [{ v: 1, label: '受け取る' }, { v: 0, label: 'きっぱり断る' }] });
      if (k) { G.me.gold += g; G.me.flags.bribes = (G.me.flags.bribes || 0) + 1; if (U.ch(0.25)) { W.gainMerit(-40 * S.tier(), '収賄が露見'); } }
      else G.me.fame += 8;
    } },
  { id: 'slander', w: () => S.tier() >= 6 && !S.isTop() ? (typeof PPL !== 'undefined' ? PPL.diff().harsh : 1) : 0, run: async () => {
      const cc = S.myCty(); const r = G.off[cc.ruler]; if (!r) return;
      const sl = typeof PPL !== 'undefined' ? PPL.slanderer() : null;
      const k = await HOOK.choose({ title: '讒言', who: sl || undefined, body: `${sl ? sl.n + 'が' : '何者かが'}「${S.myOff().n}に二心あり」と${r.n}に吹き込んだらしい。`, choices: [{ v: 1, label: `${EV.rt(S.myOff().c)}の前で潔白を訴える（舌戦）` }, { v: 0, label: '行いで示す' }] });
      if (k) { const res = await UI.debate(r, '弁明'); r.bond += res > 0 ? 10 : -10; if (sl && res > 0) { sl.bond = Math.max(-100, (sl.bond || 0) - 15); W.gainMerit(Math.round(6 * S.tier()), `${sl.n}の讒言を退けた`); } } else r.bond -= 4;
      if (sl) PPL.addRel(sl.id, S.myOff().id, -15);
    } },
  { id: 'wu_trouble', w: () => G.me.army.wu.some(w => w.alive) ? 3 : 0, run: async () => {
      const w = U.pick(G.me.army.wu.filter(w => w.alive));
      const k = await HOOK.choose({ title: '伍の仲間', body: `${w.n}が浮かない顔をしている。故郷の家族が気がかりらしい。`, choices: [{ v: 1, label: '話を聞き、金を送ってやる', sub: `金${U.num(200)}`, disabled: G.me.gold < 200 }, { v: 2, label: '一緒に剣を振って気を晴らす' }, { v: 0, label: '戦場に私情は不要だと諭す' }] });
      if (k === 1) { G.me.gold -= 200; w.bond = Math.min(100, w.bond + 15); }
      if (k === 2) { w.bond = Math.min(100, w.bond + 6); w.bu = Math.min(95, w.bu + 1); }
      if (k === 0) { w.bond = Math.max(0, w.bond - 5); w.bu = Math.min(95, w.bu + 1); }
    } },
  { id: 'book', w: 1, run: async () => {
      const me = G.me;
      const can = D.TACTIC_ORDER.filter(t => !me.tac.includes(t) && D.TACTICS[t].req.chi <= S.stat(S.myOff(), 'chi') + 10);
      if (!can.length) return;
      const t = U.pick(can);
      const k = await HOOK.choose({ title: '兵法書', body: `古い兵法書を手に入れた。「${D.TACTICS[t].n}」について記されている。`, choices: [{ v: 1, label: '読みふける（任務状-1）', disabled: me.ap < 1 }, { v: 0, label: '書庫にしまう' }] });
      if (k) { me.ap--; me.tac.push(t); S.log(`戦術「${D.TACTICS[t].n}」を会得した！`, 'good'); }
    } },
  { id: 'gift', w: () => { const r = G.off[S.myCty().ruler]; return r && !r.player && r.bond >= 45 ? 1.2 : 0; }, run: async () => {
      const r = G.off[S.myCty().ruler]; const g = 800 * S.tier() * S.tier();
      G.me.gold += g;
      await HOOK.info({ title: '下賜', body: `${r.n}から日頃の働きをねぎらわれ、金${U.fmt(g)}を賜った。` });
    } },
  { id: 'revolt', w: () => G.me.jur && G.me.jur.loyal < 30 ? 4 : 0, run: async () => {
      const j = G.me.jur;
      const size = Math.round(j.hh * 0.03);
      G.offers.push({ id: U.uid(), kind: 'bandit', pid: j.prov, ec: 'bandit', foe: size, ally: 0, title: `${j.name}の民の反乱`, desc: `圧政に耐えかねた民 約${U.fmt(size)}が蜂起した。` });
      await HOOK.info({ title: '民の反乱', body: `${j.name}で民が蜂起した！（軍務「戦場へ」から鎮圧できる）` });
    } },
];

/* ---------- 史実の事件のための道具 ---------- */
// 生きて仕えている史実の人物（c を指定すればその国の者だけ）
EV.live = (n, c) => { const o = EV.histOff(n); return o && o.alive && !o.ret && !o.player && (!c || o.c === c) ? o : null; };
EV.rt = (c) => (D.RULER_T && D.RULER_T[c]) || '王';
EV.isKing = (c) => EV.myC() === c && G.me.rank === 'kuns';
EV.isTopOf = (c) => EV.myC() === c && S.isTop();
EV.owns = (c, pid) => !!(G.prov[pid] && G.prov[pid].o === c);
EV.ITALY = ['roma', 'etruria', 'umbria', 'picenum', 'ariminum', 'campania', 'samnium', 'apulia', 'lucania', 'bruttium', 'tarentum', 'cisalpina', 'liguria'];
EV.IBERIA = ['cartnova', 'castulo', 'saguntum', 'celtiberia', 'ilergetes', 'lusitania', 'gades', 'baleares'];
EV.SICILY = ['syracusae', 'leontini', 'messana', 'agrigentum', 'lilybaeum'];
EV.AFRICA = ['utica', 'byzacium', 'sicca', 'emporia', 'hippo'];
EV.GREECE = ['thessalia', 'euboea', 'athenae', 'corinth', 'achaea', 'sparta', 'aetolia'];
EV.ASIA = ['lydia', 'phrygia', 'pergamon', 'bithynia', 'galatia', 'ionia', 'caria', 'lycia'];
EV.COELE = ['judaea', 'damascus', 'gaza', 'phoenicia'];
EV.war = (a, b) => { if (EV.alive(a) && EV.alive(b) && a !== b && !S.atWar(a, b)) W.declareWar(a, b); };
EV.peace = (a, b, t = 120, rel = 0) => { if (!EV.alive(a) || !EV.alive(b) || a === b) return; const d = S.dip(a, b); d.st = 'truce'; d.t = t; d.rel = Math.max(d.rel, rel); };
EV.ally = (a, b, t = 0) => { if (!EV.alive(a) || !EV.alive(b) || a === b) return; const d = S.dip(a, b); d.st = 'ally'; d.t = t; d.rel = Math.max(d.rel, 40); };
EV.rel = (a, b, v) => { if (!EV.alive(a) || !EV.alive(b) || a === b) return; const d = S.dip(a, b); d.rel = U.clamp(d.rel + v, -100, 100); };
EV.pay = (from, to, f) => { if (!EV.alive(from) || !EV.alive(to)) return 0; const g = Math.round(Math.max(0, G.cty[from].gold) * f); G.cty[from].gold -= g; G.cty[to].gold += g; return g; };
// 州を明け渡す（講和の割譲・寝返り）。守備兵は keep の割合だけ残る。割譲は厭戦を生まない
EV.cede = (pids, to, keep = 0.4) => {
  if (!EV.alive(to)) return [];
  const got = [], w0 = G.cty[to].weary || 0;
  for (const pid of pids) {
    const p = G.prov[pid]; if (!p || p.o === to || !G.cty[p.o]) continue;
    if (p.gov && p.gov === G.cty[p.o].ruler) p.gov = null;   // 都を明け渡しても、王はその場で討たれない（落ちのびる）
    W.capture(pid, to, p.o); p.troops = Math.round(p.troops * keep); got.push(pid);
  }
  G.cty[to].weary = w0;
  return got;
};
// 人物の役目（宰相・大臣・総督・主人公の部下）を空ける
EV.vacate = (x) => {
  const cc = G.cty[x.c];
  if (cc) {
    if (cc.josh === x.id) cc.josh = S.genOfficer(x.c, 'josh').id;
    if (cc.gyos === x.id) cc.gyos = S.genOfficer(x.c, 'gyos').id;
    for (const m in cc.mins) if (cc.mins[m] === x.id) { const n = S.genOfficer(x.c, 'daij'); n.min = m; cc.mins[m] = n.id; }
  }
  for (const p of Object.values(G.prov)) if (p.gov === x.id && !(G.cty[p.o] && G.cty[p.o].ruler === x.id)) p.gov = S.genOfficer(p.o, 'guns', { loc: p.id }).id;
  const A = G.me.army;
  if (A.subs.includes(x.id)) { A.subs = A.subs.filter(i => i !== x.id); if (A.dep === x.id) A.dep = null; if (A.stg === x.id) A.stg = null; for (const s of A.sq) if (s.ld === x.id) s.ld = null; }
  x.min = null; x.lord = null;
};
// 人物を他国へ移す（亡命・寝返り）。君主だったなら国元で跡継ぎが立つ。経歴はそこで終わる
EV.moveOff = (x, c, r, loc) => {
  if (!x || !x.alive || x.player || !EV.alive(c) || x.c === c) return false;
  const from = x.c, cc = G.cty[from], wasRuler = !!(cc && cc.ruler === x.id);
  EV.vacate(x);
  x.c = c; if (r && D.RANKS[r]) x.r = r; x.ret = false; x.royal = false; x.carStop = true;
  x.loc = loc && EV.owns(c, loc) ? loc : W.capital(c);
  if (G.me.boss === x.id) { G.me.boss = null; S.setupChainAfterPromotion(); }
  if (G.me.gen === x.id) G.me.gen = (W.pickCommander(S.myOff().c, G.me.loc) || {}).id || null;
  if (wasRuler && cc.alive) W.succession(from);
  return true;
};
// 跡継ぎの名簿（D.HEIRS）：その年までの名と、name は使い終えたことにする
EV.markHeirs = (c, name) => { for (const [y, n] of (D.HEIRS[c] || [])) if (y <= G.year || n === name) G.flags['heir_' + n] = 1; };
// 史実の人物 x を c の君主に据える。前の君主は退く（主人公が君主なら何もしない）
EV.crown = (x, c, why) => {
  const cc = G.cty[c];
  if (!x || !x.alive || x.player || !cc || !cc.alive) return false;
  const old = G.off[cc.ruler];
  if (old && old.player) return false;
  if (old && old.id === x.id) return true;
  EV.vacate(x);
  x.c = c; x.r = 'kuns'; x.ret = false; x.royal = true; x.carStop = true; x.loc = W.capital(c) || x.loc;
  cc.ruler = x.id;
  if (old) { if (old.alive) old.ret = true; for (const p of S.ownedProvs(c)) if (p.gov === old.id) p.gov = x.id; if (G.me.boss === old.id) G.me.boss = x.id; }
  EV.markHeirs(c, x.n);
  S.log(`${S.cname(c)}で${x.n}が${EV.rt(c)}となった。${why || ''}`, c === EV.myC() ? 'big' : 'info');
  S.chron(`${S.cname(c)}、${x.n}が${EV.rt(c)}となる。`);
  return true;
};
// 史実の行（本編の名簿か、いまのシナリオの extra）
EV.histRow = (n) => D.HIST.find(h => h[0] === n) || (((D.scenario(G.scenario) || {}).extra) || []).find(h => h[0] === n) || null;
// 経歴（hist.json の16番目 [[年, 官職], ...]）：その年が来たら官職が改まる。君主・宰相・監察官・大臣・総督、他国へ移った者は動かさない
EV.careerOf = (n) => { const h = EV.histRow(n); return h && Array.isArray(h[15]) ? h[15] : null; };
EV.syncCareer = (o, force) => {
  if (!o || !o.hist || !o.alive || o.player || o.carStop) return false;
  const car = EV.careerOf(o.n); if (!car) return false;
  const cc = G.cty[o.c];
  if (['kuns', 'josh', 'gyos', 'daij', 'guns'].includes(o.r) || (cc && (cc.ruler === o.id || cc.josh === o.id || cc.gyos === o.id))) return false;
  let r = null; for (const [y, k] of car) if (G.year >= y && D.RANKS[k]) r = k;
  if (!r) return false;
  if (r === o.r || (!force && o.carR === r)) { o.carR = r; return false; }
  o.r = r; o.carR = r; o.merit = Math.max(o.merit || 0, D.RANKS[r].m || 0);
  return true;
};
EV.syncCareers = (force) => { let n = 0; for (const o of Object.values(G.off)) if (o.hist && o.alive && !o.player && EV.syncCareer(o, force)) n++; return n; };
// 史実の人物が世に出たとき：経歴・王家・因縁を整える
EV.afterSpawn = (o) => {
  if (!o) return;
  EV.syncCareer(o, true);
  if (typeof PPL !== 'undefined') { if (PPL.tagRoyal) PPL.tagRoyal(o); if (PPL.seedHistRel) PPL.seedHistRel(o); }
};
// 新しい物語のはじめ（PPL.init から）：経歴・王家・居場所・跡継ぎの名簿を、はじまりの年に合わせる
EV.histInit = () => {
  const sc = D.scenario(G.scenario) || {};
  EV.syncCareers(true);
  if (typeof PPL !== 'undefined' && PPL.tagRoyal) for (const o of Object.values(G.off)) PPL.tagRoyal(o);
  // 他国へ移っている人物（亡命・寝返り）
  for (const n in sc.moves || {}) { const o = EV.histOff(n); const [c, r, loc] = sc.moves[n]; if (o && o.alive && !o.player && G.cty[c] && G.cty[c].alive && o.c !== c) EV.moveOff(o, c, r, loc); }
  // 名簿にない王（名だけ）は、立てた王にその名をつける
  for (const c in sc.rulers || {}) {
    const n = sc.rulers[c], cc = G.cty[c]; if (!cc || !cc.alive || EV.histOff(n)) continue;
    const r = G.off[cc.ruler]; if (r && !r.player && !r.hist) { r.n = n; Object.assign(r, S.splitName(n)); r.royal = true; }
  }
  // はじめの居場所
  for (const n in sc.locs || {}) { const o = EV.histOff(n), pid = sc.locs[n]; if (o && o.alive && !o.player && EV.owns(o.c, pid)) o.loc = pid; }
  // 国力の補正 boost: { 国: { troops: 倍, gold: 倍, wall: 加算, only: [州] } }（only があれば兵と城壁はその州だけ）
  for (const c in sc.boost || {}) {
    const b = sc.boost[c], cc = G.cty[c]; if (!cc || !cc.alive) continue;
    for (const p of S.ownedProvs(c)) { if (b.only && !b.only.includes(p.id)) continue; if (b.troops) p.troops = Math.round(p.troops * b.troops); if (b.wall) p.wall = Math.min(100, p.wall + b.wall); }
    if (b.gold) cc.gold = Math.round(cc.gold * b.gold);
  }
  // 跡継ぎの名簿：古い代の名は使い終え、いちばん新しい名もすでに王か、もう仕えていなければ使い終える
  for (const c of D.CORDER) {
    const L = (D.HEIRS[c] || []).filter(([y]) => y <= G.year); if (!L.length || !G.cty[c]) continue;
    const ruler = G.off[G.cty[c].ruler];
    L.forEach(([, n], i) => { if (i < L.length - 1 || (ruler && ruler.n === n) || (EV.histOff(n) && !EV.live(n, c))) G.flags['heir_' + n] = 1; });
  }
};
// 史実の跡継ぎ（D.HEIRS）：いちばん新しい名を使う。その名の史実の人物が国にいれば、新しく作らずにその人が立つ（まだ世に出ていなければここで出す）
EV.baseSuccession = W.succession;
W.succession = (c) => {
  const cc = G.cty[c]; if (!cc) return;
  const old = G.off[cc.ruler];
  if (old && old.player) return;
  if (!W.histOn()) return EV.baseSuccession(c);
  const list = (D.HEIRS[c] || []).filter(([y, n]) => G.year >= y && !G.flags['heir_' + n]);
  for (const [, n] of list) G.flags['heir_' + n] = 1;
  const hs = list[list.length - 1];
  if (hs) {
    const n = hs[1];
    const same = Object.values(G.off).filter(o => o.hist && o.n === n);
    let x = same.find(o => o.alive && !o.player && o.c === c && (!old || o.id !== old.id));
    if (!x && !same.length) {
      const row = EV.histRow(n);
      if (!row) { G.flags['heir_' + n] = 0; return EV.baseSuccession(c); }   // 名だけの跡継ぎ：新しく立てて名づける
      if (!(row[11] && row[11] < G.year)) { x = S.histOfficerSafe(row, c); if (x) { G.flags.histSpawn = G.flags.histSpawn || {}; G.flags.histSpawn[n] = G.turn || -1; EV.afterSpawn(x); } }
    }
    if (x) {
      EV.vacate(x);
      x.c = c; x.r = 'kuns'; x.ret = false; x.royal = true; x.carStop = true; x.loc = W.capital(c) || x.loc;
      cc.ruler = x.id;
      if (G.me && S.myOff().c === c) G.flags.rulerDied = G.turn;
      if (old) for (const p of S.ownedProvs(c)) if (p.gov === old.id) p.gov = x.id;
      S.log(`${S.cname(c)}で${x.n}が${EV.rt(c)}となった。`, c === EV.myC() ? 'big' : 'info');
      S.chron(`${S.cname(c)}、${x.n}が${EV.rt(c)}となる。`);
      return;
    }
  }
  EV.baseSuccession(c);
};

// 国の兵を減らす（near の州の近くから）
EV.loseTroops = (c, n, near) => {
  let ps = S.ownedProvs(c);
  if (near) { const nb = ps.filter(p => p.id === near || S.adj(p.id).includes(near)); if (nb.length) ps = nb.concat(ps.filter(p => !nb.includes(p))); }
  let left = n;
  for (const p of ps) { if (left <= 0) break; const take = Math.min(p.troops * 0.8, left); p.troops = Math.round(p.troops - take); left -= take; }
  return n - left;
};
// 史実の合戦の場所：pref が国境にあればそこ、なければ pref に一番近い国境の州
EV.frontNear = (c, foe, pref) => {
  const cand = S.border(c, foe); if (!cand.length) return null;
  const P0 = S.P[pref] || S.P[W.capital(c)];
  const p = cand.find(x => x.id === pref) || U.minBy(cand, x => Math.hypot(S.P[x.id].x - P0.x, S.P[x.id].y - P0.y));
  const from = U.maxBy(S.adj(p.id).filter(q => G.prov[q].o === foe), q => G.prov[q].troops);
  return from ? { pid: p.id, from } : null;
};
// 史実の合戦：主人公が関われるなら参戦できる。返り値は勝った国（o.kind: 'naval' で海戦、o.weather で天候）
EV.histBattle = async (o) => {
  const my = EV.myC(), me = G.me;
  const mine = my === o.atk.c ? 'atk' : my === o.def.c ? 'def' : null;
  const involved = mine && (S.isMilLike() || S.isTop()) && S.tier() >= 3 && me.inj === 0 && (S.isTop() || S.tier() >= 7 || me.loc === o.pid || S.adj(o.pid).includes(me.loc));
  S.log(`【${o.title}】${o.text}`, 'big'); S.chron(o.title + '。');
  if (involved) {
    const k = await HOOK.choose({ title: o.title, seal: '史実', body: `${o.text}\n${S.cname(o.atk.c)}軍 約${U.fmt(o.atk.troops)}　対　${S.cname(o.def.c)}軍 約${U.fmt(o.def.troops)}`, choices: [{ v: 1, label: '戦場へ向かう' }, { v: 0, label: '他の将に任せる' }] });
    if (k) {
      const role = S.isStaff() ? (S.tier() >= 7 ? 'gunshi' : 'unit') : (S.isTop() || S.tier() >= 7 ? 'commander' : 'unit');
      const X = mine === 'atk' ? o.atk : o.def, Y = mine === 'atk' ? o.def : o.atk;
      const myCmd = role === 'commander' ? S.myOff() : (EV.live(X.cmd) || W.pickCommander(X.c, o.pid));
      const foeCmd = EV.live(Y.cmd) || W.pickCommander(Y.c, o.pid);
      const kind = o.kind === 'naval' && typeof NAV !== 'undefined' ? 'naval' : 'field';
      const spec = W.buildSpec({ kind, pid: o.pid, from: o.from, title: o.title, weather: o.weather, A: { c: X.c, troops: Math.max(S.armyTotal(), X.troops), cmd: myCmd, officers: [] }, B: { c: Y.c, troops: Y.troops, cmd: foeCmd, officers: [] }, me: 'A', role, maxDays: kind === 'naval' ? 1 : 2, ctx: { hist: o.id } });
      const br = await HOOK.battle(spec);
      W.applyBattleResult(spec, br);
      await W.checkPromotion();
      if (br.winner === 0) return X.c;
      if (br.winner === 1) return Y.c;
      return null;
    }
  }
  return U.ch(o.pAtk) ? o.atk.c : o.def.c;
};
// 主人公がその戦場の近くにいる、その国の武官か
EV.nearMil = (c, pids, tmin = 3) => EV.myC() === c && S.isMilLike() && S.tier() >= tmin && G.me.inj === 0 && pids.includes(G.me.loc);

/* ---------- 史実イベント（前264〜前146年） ----------
   どの事件も、国や人物がすでに亡い・立場が違うときは何もしないか、形を変えて起こる */
EV.hist = [
  /* ===== 第一次ポエニ戦争（前264年のシナリオ） ===== */
  { id: 'messana264', y: -264, m: 5, run: async () => {
      if (!EV.alive('rome') || !EV.alive('carth')) return;
      if (!S.atWar('rome', 'carth')) {
        if (EV.isTopOf('rome')) { const k = await HOOK.choose({ title: 'メッサナの救援', seal: '史実', body: 'カルタゴとシュラクサイに囲まれたメッサナの傭兵たち（マメルティニ）が、ローマに助けを求めてきた。海峡を渡れば、カルタゴとの大戦になる。', choices: [{ v: 1, label: 'シキリアへ渡る（カルタゴと開戦）' }, { v: 0, label: '見送る' }] }); if (!k) return; }
        EV.war('rome', 'carth');
      }
      S.log('【メッサナ】執政官アッピウス・クラウディウスが海峡を渡り、メッサナに入った。ローマとカルタゴの長い戦争がはじまる。', 'big'); S.chron('ローマ軍、メッサナへ渡る。第一次ポエニ戦争はじまる。');
    } },
  { id: 'hiero263', y: -263, m: 6, run: async () => {
      if (!EV.alive('syra') || !EV.alive('rome') || !S.atWar('rome', 'syra')) return;
      let ok = true;
      if (EV.isTopOf('syra')) ok = !!(await HOOK.choose({ title: 'ローマとの和', seal: '史実', body: 'ローマの二人の執政官がシュラクサイの近くまで迫り、多くの町がローマに降った。ローマは「銀百タラントンを払えば和を結ぼう」と言う。', choices: [{ v: 1, label: 'ローマと和を結び、盟友となる' }, { v: 0, label: 'カルタゴとともに戦い続ける' }] }));
      else if (EV.isTopOf('rome')) ok = !!(await HOOK.choose({ title: 'ヒエロンの申し出', seal: '史実', body: 'シュラクサイのヒエロン王が和を求めてきた。「銀百タラントンを払い、ローマの軍に麦を送りましょう」', choices: [{ v: 1, label: '受け入れて盟友とする' }, { v: 0, label: '退ける' }] }));
      if (!ok) return;
      const d = S.dip('carth', 'syra'); if (d.st === 'ally') { d.st = 'peace'; d.t = 0; d.rel = -20; }
      EV.ally('rome', 'syra');
      EV.pay('syra', 'rome', 0.1);
      S.log('シュラクサイのヒエロン二世がローマと和を結び、ローマの盟友となった。', 'big'); S.chron('ヒエロン二世、ローマと結ぶ。');
    } },
  { id: 'chremonides262', y: -262, m: 3, run: async () => {
      if (!EV.alive('mace') || !EV.alive('ptol') || !S.atWar('mace', 'ptol')) return;
      const tg = ['athenae', 'sparta'].filter(p => EV.owns('ptol', p)); if (!tg.length) return;
      if (EV.isTopOf('ptol') && tg.includes('athenae')) {
        const k = await HOOK.choose({ title: 'アテナイの飢え', seal: '国難', body: 'マケドニアに囲まれたアテナイが飢えている。艦隊を送って救うか。', choices: [{ v: 1, label: '艦隊を送る（国庫の一割）' }, { v: 0, label: '見捨てる' }] });
        if (k) { G.cty.ptol.gold = Math.round(G.cty.ptol.gold * 0.9); if (U.ch(0.5)) { S.log('エジプトの艦隊がアテナイに麦を届けた。町はもちこたえた。', 'good'); return; } }
      }
      EV.cede(tg, 'mace', 0.5);
      EV.peace('mace', 'ptol', 60, -10);
      S.log('【クレモニデス戦争】アテナイがアンティゴノス二世に降った。マケドニアとエジプトは和を結んだ。', 'big'); S.chron('アテナイ、マケドニアに降る。');
    } },
  { id: 'agrigentum262', y: -262, m: 9, run: async () => {
      if (!EV.alive('rome') || !EV.alive('carth') || !S.atWar('rome', 'carth') || !EV.owns('carth', 'agrigentum')) return;
      const from = S.adj('agrigentum').find(q => EV.owns('rome', q)) || S.adj('agrigentum').find(q => G.cty[G.prov[q].o] && S.dip('rome', G.prov[q].o).st === 'ally'); if (!from) return;
      const at = Math.round(Math.min(S.countryTroops('rome') * 0.15, 40000)), df = Math.max(10000, Math.round(G.prov.agrigentum.troops * 0.8));
      const win = await EV.histBattle({ id: 'agrigentum262', title: 'アクラガス包囲', pid: 'agrigentum', from, text: 'ローマ軍がシキリア南岸の町アクラガスを囲んだ。カルタゴの老将ハンノが救いに来る。', atk: { c: 'rome', troops: at, cmd: '' }, def: { c: 'carth', troops: df, cmd: 'ハンノ（老将）' }, pAtk: 0.65 });
      if (win === 'rome') { EV.cede(['agrigentum'], 'rome', 0.5); S.log('アクラガスが落ちた。町の人々は奴隷として売られた。', 'big'); }
      else if (win === 'carth') EV.loseTroops('rome', Math.round(at * 0.4), from);
    } },
  { id: 'mylae260', y: -260, m: 7, run: async () => {
      if (!EV.alive('rome') || !EV.alive('carth') || !S.atWar('rome', 'carth')) return;
      const pid = ['messana', 'lilybaeum', 'agrigentum'].find(p => G.prov[p] && G.prov[p].o === 'rome') || 'messana';
      const du = EV.live('ドゥイリウス', 'rome'), hg = EV.live('ハンニバル（ギスコの子）', 'carth');
      const win = await EV.histBattle({ id: 'mylae260', kind: 'naval', title: 'ミュライの海戦', pid, from: 'lilybaeum', text: `${du ? '執政官ドゥイリウス' : 'ローマの艦隊'}が、船の舳先に「カラス」と呼ぶ乗船橋をつけてカルタゴ艦隊に挑む。橋を敵船に落として兵が乗り込み、海の戦いを陸の戦いに変えるつもりだ。`, atk: { c: 'rome', troops: 25000, cmd: du ? 'ドゥイリウス' : '' }, def: { c: 'carth', troops: 26000, cmd: hg ? 'ハンニバル（ギスコの子）' : '' }, pAtk: 0.75 });
      if (win === 'rome') { EV.loseTroops('carth', Math.round(S.countryTroops('carth') * 0.04), 'lilybaeum'); if (du) du.fame = (du.fame || 0) + 60; S.log('ローマははじめて海で勝った。ドゥイリウスには、夜道を笛吹きと松明に先導させて帰る栄誉が許された。', 'big'); }
      else if (win === 'carth') EV.loseTroops('rome', 10000, pid);
      if (hg && win === 'rome' && U.ch(0.5)) W.killOfficer(hg.id, '敗戦の責めで磔', false);
    } },
  { id: 'ecnomus256', y: -256, m: 8, run: async () => {
      if (!EV.alive('rome') || !EV.alive('carth') || !S.atWar('rome', 'carth')) return;
      const rg = EV.live('レグルス', 'rome');
      const tgt = ['utica', 'byzacium'].find(p => EV.owns('carth', p)); if (!tgt) return;
      S.log('【エクノモス岬の海戦】三百を超える船どうしがぶつかり、ローマ艦隊が勝った。執政官レグルスがアフリカへ渡る。', 'big'); S.chron('エクノモス岬の海戦。レグルス、アフリカへ。');
      EV.loseTroops('carth', Math.round(S.countryTroops('carth') * 0.05), 'carthago');
      const at = Math.round(Math.min(S.countryTroops('rome') * 0.12, 25000)), df = Math.round(Math.min(S.countryTroops('carth') * 0.2, 30000));
      const win = await EV.histBattle({ id: 'ecnomus256', title: 'アディスの戦い', pid: tgt, from: 'carthago', text: `アフリカに上陸した${rg ? 'レグルス' : 'ローマ軍'}が、カルタゴの領地を荒らしながら都へ迫る。`, atk: { c: 'rome', troops: at, cmd: rg ? 'レグルス' : '' }, def: { c: 'carth', troops: df, cmd: '' }, pAtk: 0.65 });
      if (win === 'rome') { EV.cede([tgt], 'rome', 0.3); G.prov[tgt].troops = Math.max(G.prov[tgt].troops, Math.round(at * 0.7)); }
      else if (win === 'carth') EV.loseTroops('rome', Math.round(at * 0.4), 'lilybaeum');
    } },
  { id: 'bagradas255', y: -255, m: 5, run: async () => {
      if (!EV.alive('rome') || !EV.alive('carth') || !S.atWar('rome', 'carth')) return;
      const pid = ['utica', 'byzacium'].find(p => EV.owns('rome', p)); if (!pid) return;
      const xa = EV.live('クサンティッポス', 'carth'), rg = EV.live('レグルス', 'rome');
      const at = Math.round(Math.min(S.countryTroops('carth') * 0.25, 16000)), df = Math.max(8000, G.prov[pid].troops);
      const win = await EV.histBattle({ id: 'bagradas255', title: 'バグラダス川の戦い', pid, from: 'carthago', text: `${xa ? 'スパルタの傭兵隊長クサンティッポスがカルタゴの兵を鍛え直し、' : ''}平原に戦象を並べてローマ軍に挑む。`, atk: { c: 'carth', troops: at, cmd: xa ? 'クサンティッポス' : '' }, def: { c: 'rome', troops: df, cmd: rg ? 'レグルス' : '' }, pAtk: 0.8 });
      if (win !== 'carth') return;
      EV.cede([pid], 'carth', 0.3);
      if (rg) { rg.ret = true; S.log('執政官レグルスは捕らえられた。のちに和平の使いとしてローマへ送られたが、「和を結ぶな」と元老院に説き、誓いどおりカルタゴへ戻って殺されたという。', 'big'); S.chron('レグルス、カルタゴの捕虜となる。'); }
    } },
  { id: 'drepana249', y: -249, m: 6, run: async () => {
      if (!EV.alive('rome') || !EV.alive('carth') || !S.atWar('rome', 'carth')) return;
      const pu = EV.live('クラウディウス・プルケル', 'rome');
      let k = 1;
      if (EV.myC() === 'rome' && (S.isTop() || S.tier() >= 7)) k = await HOOK.choose({ title: '聖なる鶏', seal: '史実', body: 'ドレパナの港のカルタゴ艦隊を襲う前、占いの聖なる鶏が餌を食べない。凶兆だ。', choices: [{ v: 0, label: '占いに従い、出撃を見合わせる' }, { v: 1, label: '「食べぬなら飲ませてやれ」と鶏を海へ投げ込んで出撃する' }] });
      if (!k) { S.log('ローマ艦隊は出撃を見合わせた。', 'good'); return; }
      EV.loseTroops('rome', Math.round(S.countryTroops('rome') * 0.06), 'lilybaeum');
      if (pu) pu.ret = true;
      S.log(`【ドレパナの海戦】${pu ? 'クラウディウス・プルケルは' : 'ローマ艦隊は'}鶏を海へ投げ込んで出撃し、艦隊のほとんどを失った。`, 'big'); S.chron('ドレパナの海戦。ローマ艦隊、大敗。');
    } },
  { id: 'hamilcar247', y: -247, m: 4, run: async () => {
      const hm = EV.live('ハミルカル・バルカ', 'carth'); if (!hm || !EV.alive('rome') || !S.atWar('rome', 'carth')) return;
      const pid = ['lilybaeum', 'agrigentum', 'messana'].find(p => EV.owns('carth', p)); if (pid) hm.loc = pid;
      S.log('ハミルカル・バルカ（「雷光」）がシキリアの指揮をとり、エリュクスの山から敵を悩ませる。この年、彼に長男ハンニバルが生まれた。', 'big'); S.chron('ハミルカル・バルカ、シキリアの将となる。長男ハンニバル生まれる。');
    } },
  { id: 'aegates241', y: -241, m: 3, run: async () => {
      if (!EV.alive('rome') || !EV.alive('carth') || !S.atWar('rome', 'carth')) return;
      const lc = EV.live('ルタティウス・カトゥルス', 'rome');
      const win = await EV.histBattle({ id: 'aegates241', kind: 'naval', title: 'アエガテス諸島の海戦', pid: 'lilybaeum', from: 'carthago', weather: 'wind', text: `市民の寄付で造った${lc ? 'ルタティウス・カトゥルス' : 'ローマ'}の新しい艦隊が、強い風の中、麦を積んで重いカルタゴの救援艦隊に襲いかかる。`, atk: { c: 'rome', troops: 30000, cmd: lc ? 'ルタティウス・カトゥルス' : '' }, def: { c: 'carth', troops: 25000, cmd: '' }, pAtk: 0.8 });
      if (win !== 'rome') return;
      EV.loseTroops('carth', Math.round(S.countryTroops('carth') * 0.05), 'lilybaeum');
      let ok = true;
      if (EV.isTopOf('carth')) ok = !!(await HOOK.choose({ title: 'ルタティウスの和約', seal: '国難', body: 'シキリアの軍は飢えている。ローマは「シキリアから去り、賠償金を払え」と言う。', choices: [{ v: 1, label: '和を結ぶ（シキリアを渡す）' }, { v: 0, label: '戦い続ける' }] }));
      else if (EV.isTopOf('rome')) ok = !!(await HOOK.choose({ title: 'ルタティウスの和約', seal: '史実', body: 'カルタゴが和を求めてきた。シキリアを明け渡し、銀三千二百タラントンを払うという。', choices: [{ v: 1, label: '和を結ぶ' }, { v: 0, label: '退けて戦い続ける' }] }));
      if (!ok) return;
      EV.cede(EV.SICILY.filter(p => EV.owns('carth', p)), 'rome', 0.3);
      EV.pay('carth', 'rome', 0.25);
      EV.peace('rome', 'carth', 240, -20);
      S.log('ルタティウスの和約。カルタゴはシキリアから去り、二十三年続いた戦争が終わった。', 'big'); S.chron('ルタティウスの和約。シキリアはローマのものとなる。');
    } },
  { id: 'mercenary240', y: -240, m: 6, run: async () => {
      if (!EV.alive('carth')) return;
      const pid = ['utica', 'byzacium', 'sicca'].find(p => EV.owns('carth', p)) || W.capital('carth'); if (!pid) return;
      await EV.rebellion('carth', pid, 25000, '傭兵戦争', '給金を払ってもらえなかったシキリア帰りの傭兵たちが、マトスとスペンディオスに率いられて反乱を起こした！リビアの町々も加わっている。');
    } },
  { id: 'sardinia238', y: -238, m: 5, run: async () => {
      if (!EV.alive('rome') || !EV.alive('carth') || S.atWar('rome', 'carth')) return;
      const isl = ['sardinia', 'corsica'].filter(p => EV.owns('carth', p)); if (!isl.length) return;
      if (EV.isTopOf('carth')) { const k = await HOOK.choose({ title: 'サルディニアの強奪', seal: '国難', body: 'サルディニアの傭兵がローマに寝返った。ローマは島を渡せと迫り、断れば戦争だと言う。傭兵戦争で国は疲れきっている。', choices: [{ v: 1, label: '島を渡す（屈辱を忍ぶ）' }, { v: 0, label: '拒む（ローマと戦争）' }] }); if (!k) { EV.war('rome', 'carth'); return; } }
      EV.cede(isl, 'rome', 0.4);
      EV.rel('rome', 'carth', -30);
      S.log('ローマはカルタゴの弱みにつけこみ、サルディニアとコルシカを奪った。カルタゴの人々は、この恨みを忘れなかった。', 'big'); S.chron('ローマ、サルディニアとコルシカを奪う。');
    } },
  { id: 'oath237', y: -237, m: 5, run: async () => {
      const hm = EV.live('ハミルカル・バルカ', 'carth'); if (!hm) return;
      const pid = ['gades', 'cartnova', 'castulo'].find(p => EV.owns('carth', p)); if (!pid) return;
      hm.loc = pid;
      G.cty.carth.gold += Math.round(S.countryPop('carth') * 10000 * 4);
      S.log('ハミルカル・バルカがヒスパニアへ渡り、銀山と兵を手に入れる。出発の前、九歳の息子ハンニバルは祭壇に手を置き、「生涯ローマの敵であり続ける」と誓った。', 'big'); S.chron('ハミルカル、ヒスパニアへ。ハンニバルの誓い。');
    } },
  { id: 'telamon225', y: -225, m: 6, run: async () => {
      if (!EV.alive('rome')) return;
      const pid = ['etruria', 'cisalpina', 'ariminum'].find(p => EV.owns('rome', p)); if (!pid) return;
      await EV.rebellion('rome', pid, 50000, 'ガリア人の大侵攻', 'ボイイ族とインスブレス族が、アルペスの向こうの戦士ガエサタエを呼び、五万でエトルリアへ攻め込んだ！', { raid: 'gaul' });
      S.chron('テラモンの戦い。');
    } },
  { id: 'clastidium222', y: -222, m: 5, run: async () => {
      const mc = EV.live('マルケッルス', 'rome'); if (!mc) return;
      mc.fame = (mc.fame || 0) + 80;
      S.log('クラスティディウムの戦い：マルケッルスがガリアの王ウィリドマルスを一騎打ちで討ち取り、その鎧をユピテルに捧げた。', 'big'); S.chron('マルケッルス、ガリアの王を一騎打ちで討つ。');
    } },
  { id: 'hamilcar228', y: -228, m: 12, run: async () => {
      const hm = EV.live('ハミルカル・バルカ'); if (!hm) return;
      W.killOfficer(hm.id, '川で溺れて没', false);
      S.chron('ハミルカル・バルカ、ヒスパニアで没す。婿のハスドルバルが後を継ぐ。');
    } },
  { id: 'hannibal221', y: -221, m: 6, run: async () => {
      const hn = EV.live('ハンニバル', 'carth'); if (!hn) return;
      if (D.RANKS[hn.r].tier < 8) hn.r = 'dais';
      const pid = ['cartnova', 'castulo', 'gades'].find(p => EV.owns('carth', p)); if (pid) hn.loc = pid;
      S.log('ヒスパニアのカルタゴ軍を率いたハスドルバル（美男）が、イベリア人に暗殺された。兵たちは二十六歳のハンニバルを将に選んだ。', 'big'); S.chron('ハンニバル、ヒスパニアの将となる。');
    } },
  { id: 'saguntum219', y: -219, m: 4, run: async () => {
      if (!EV.alive('carth') || !EV.live('ハンニバル', 'carth')) return;
      if (!EV.owns('carth', 'saguntum')) EV.cede(['saguntum'], 'carth', 0.3);
      EV.rel('rome', 'carth', -30);
      S.log('ハンニバルがローマの友邦サグントゥムを八か月囲み、攻め落とした。', 'big'); S.chron('サグントゥム陥落。');
    } },
  { id: 'war218', y: -218, m: 3, run: async () => {
      if (!EV.alive('rome') || !EV.alive('carth') || S.atWar('rome', 'carth')) return;
      if (EV.isTopOf('rome')) { const k = await HOOK.choose({ title: 'カルタゴへの宣戦', seal: '史実', body: 'サグントゥムを落としたハンニバルの引き渡しを、カルタゴは拒んだ。使節のファビウスがトガの襞を握って言う。「ここに平和と戦争がある。どちらでも選べ」', choices: [{ v: 1, label: '戦争を選ぶ（カルタゴに宣戦）' }, { v: 0, label: 'まだ待つ' }] }); if (!k) return; }
      EV.war('rome', 'carth');
    } },

  /* ===== 第二次ポエニ戦争（ハンニバル戦争） ===== */
  { id: 'alps218', y: -218, m: 10, run: async () => {
      const hn = EV.live('ハンニバル', 'carth');
      if (!hn || !EV.alive('rome') || !S.atWar('rome', 'carth') || EV.ITALY.some(p => EV.owns('carth', p))) return;
      const tgt = ['cisalpina', 'liguria', 'etruria'].find(p => EV.owns('rome', p)); if (!tgt) return;
      const me = G.me;
      const army = Math.round(Math.min(S.countryTroops('carth') * 0.25, 46000));
      EV.loseTroops('carth', army, 'ilergetes');
      let joinMe = false;
      if (EV.myC() === 'carth' && S.isMilLike() && S.tier() >= 2 && S.tier() <= 8 && me.inj === 0) {
        const k = await HOOK.choose({ title: 'アルペス越え', seal: '史実', who: hn, body: 'ハンニバルが歩兵五万・騎兵九千・戦象三十七頭を率いてヒスパニアを発つ。ピュレネを越え、ロダヌス川を渡り、雪のアルペスを越えてイタリアへ攻め込むという。', choices: [{ v: 1, label: 'ハンニバルに従ってアルペスを越える', sub: '兵を失うが、イタリアで戦える' }, { v: 0, label: 'ヒスパニアに残る' }] });
        joinMe = !!k;
      }
      if (joinMe) { me.loc = tgt; S.myOff().loc = tgt; }
      EV.cede([tgt], 'carth', 0);
      // アルペスで半分近くを失うが、ローマに背いたボイイ族とインスブレス族が加わる
      G.prov[tgt].troops = Math.max(Math.round(army * 0.6), 26000) + 20000;
      G.prov[tgt].loyal = Math.max(G.prov[tgt].loyal, 60);
      G.prov[tgt].wall = Math.max(G.prov[tgt].wall, 45);
      for (const n of ['ハンニバル', 'マゴ', 'マハルバル', 'ハンノ（ボミルカルの子）', 'カルタロ']) { const o = EV.live(n, 'carth'); if (o) o.loc = tgt; }
      const text = `ハンニバルが雪のアルペスを越え、${S.P[tgt].name}に現れた。生き残ったのは歩兵二万・騎兵六千ほど。ローマに背いたガリア人が続々と加わっている。`;
      S.log(`【アルペス越え】${text}`, 'big'); S.chron('ハンニバル、アルペスを越えてイタリアに入る。');
      if (joinMe) {
        for (const s of me.army.sq) s.n = Math.max(0, Math.round(s.n * 0.7));
        W.learn('snow'); W.learn('mount'); W.gainMerit(Math.round(30 * S.tier()), 'アルペス越え'); me.fame += 15;
        S.setupChainAfterPromotion();
        await HOOK.info({ title: 'アルペス越え', seal: '史実', body: `雪と寒さと山の民の襲撃で、多くの兵と馬、戦象を失った。それでも軍は、イタリアの平原を見下ろす峠にたどり着いた。\n${text}` });
      } else if (EV.myC() === 'rome') await HOOK.info({ title: 'アルペス越え', seal: '国難', body: text });
    } },
  { id: 'trebia218', y: -218, m: 12, run: async () => {
      if (!EV.alive('rome') || !EV.alive('carth') || !S.atWar('rome', 'carth')) return;
      const pid = ['cisalpina', 'liguria', 'etruria'].find(p => EV.owns('carth', p)); if (!pid) return;
      const from = S.adj(pid).find(q => EV.owns('rome', q)); if (!from) return;
      const hn = EV.live('ハンニバル', 'carth'), se = EV.live('センプロニウス', 'rome');
      const at = Math.round(Math.min(S.countryTroops('rome') * 0.12, 40000)), df = Math.max(25000, G.prov[pid].troops);
      const win = await EV.histBattle({ id: 'trebia218', title: 'トレビア川の戦い', pid, from, weather: 'snow', text: `ティキヌスの騎兵戦で執政官プブリウス・スキピオが傷つき、十八歳の息子が父を救い出した。冬至の朝、もう一人の執政官${se ? 'センプロニウス' : ''}が、凍えるトレビア川を渡ってハンニバルに挑む。`, atk: { c: 'rome', troops: at, cmd: se ? 'センプロニウス' : '' }, def: { c: 'carth', troops: df, cmd: hn ? 'ハンニバル' : '' }, pAtk: 0.2 });
      G.flags.trebia = win;
      if (win === 'carth') { EV.loseTroops('rome', Math.round(at * 0.6), from); const sc = EV.live('スキピオ', 'rome'); if (sc) sc.fame = (sc.fame || 0) + 20; S.log('川の茂みに伏せていたマゴの兵が背後から襲い、ローマ軍は総崩れとなった。', 'big'); }
      else if (win === 'rome') { EV.cede([pid], 'rome', 0.3); EV.loseTroops('carth', Math.round(df * 0.5), pid); }
    } },
  { id: 'arno217', y: -217, m: 4, run: async () => {
      const hn = EV.live('ハンニバル', 'carth'); if (!hn || !EV.ITALY.some(p => EV.owns('carth', p))) return;
      if (!hn.tr.includes('ty_oneeye')) hn.tr.push('ty_oneeye');
      EV.loseTroops('carth', 3000, EV.ITALY.find(p => EV.owns('carth', p)));
      S.log('ハンニバルは水びたしのアルヌス川の沼地を、四日四晩眠らずに抜けた。その間に目の病にかかり、片目の光を失った。', 'big'); S.chron('ハンニバル、沼地で片目を失う。');
    } },
  { id: 'raphia217', y: -217, m: 6, run: async () => {
      if (!EV.alive('sele') || !EV.alive('ptol') || !S.atWar('sele', 'ptol')) return;
      const fr = EV.frontNear('ptol', 'sele', 'gaza'); if (!fr) return;
      const an = EV.live('アンティオコス三世', 'sele');
      const at = Math.round(Math.min(S.countryTroops('sele') * 0.35, 68000)), df = Math.round(Math.min(S.countryTroops('ptol') * 0.4, 75000));
      const win = await EV.histBattle({ id: 'raphia217', title: 'ラフィアの戦い', pid: fr.pid, from: fr.from, text: `${an ? 'アンティオコス三世' : 'セレウコス朝の大王'}の七万と、プトレマイオス四世の七万がガザの南で向かい合う。アジアの象百二頭とアフリカの象七十三頭。エジプト人のファランクスがはじめて戦場に立ち、王妃アルシノエは兵の前に出て、勝てば一人に金二ムナを与えると約束した。`, atk: { c: 'sele', troops: at, cmd: an ? 'アンティオコス三世' : '' }, def: { c: 'ptol', troops: df, cmd: 'アンドロマコス' }, pAtk: 0.35 });
      G.flags.raphia = win;
      if (win === 'ptol') {
        EV.loseTroops('sele', Math.round(at * 0.25), fr.from);
        EV.cede(EV.COELE.filter(p => EV.owns('sele', p)), 'ptol', 0.4);
        EV.peace('sele', 'ptol', 120, -20);
        const th = EV.live('テオドトス', 'sele'); if (th && U.ch(0.5)) W.killOfficer(th.id, '戦死', false);
        S.log('アンティオコスの象はアフリカの象を追い散らし、大王の騎兵は敵の左翼を破った。だが追撃に夢中になるうちに、エジプトのファランクスが勝負を決めた。コイレ・シリアはふたたびエジプトのものとなった。', 'big');
      } else if (win === 'sele') {
        EV.loseTroops('ptol', Math.round(df * 0.3), fr.pid);
        EV.cede([fr.pid], 'sele', 0.4);
        EV.peace('sele', 'ptol', 60, -30);
      }
    } },
  { id: 'trasimene217', y: -217, m: 6, run: async () => {
      if (!EV.alive('rome') || !EV.alive('carth') || !S.atWar('rome', 'carth')) return;
      const hn = EV.live('ハンニバル', 'carth'); if (!hn) return;
      const base = EV.ITALY.find(p => EV.owns('carth', p)); if (!base) return;
      const pid = ['etruria', 'umbria', 'ariminum'].find(p => EV.owns('rome', p)); if (!pid) return;
      const from = S.adj(pid).includes(base) ? base : (S.adj(pid).find(q => q !== pid) || base);
      const fl = EV.live('フラミニウス', 'rome');
      const at = Math.max(30000, G.prov[base].troops), df = Math.round(Math.min(S.countryTroops('rome') * 0.1, 25000));
      const win = await EV.histBattle({ id: 'trasimene217', title: 'トラシメヌス湖畔の戦い', pid, from, weather: 'fog', text: `朝霧の湖畔の細い道を、執政官${fl ? 'フラミニウス' : ''}の軍が急ぐ。丘の上には、ハンニバルの全軍が息をひそめている。`, atk: { c: 'carth', troops: at, cmd: 'ハンニバル' }, def: { c: 'rome', troops: df, cmd: fl ? 'フラミニウス' : '' }, pAtk: 0.85 });
      G.flags.trasimene = win;
      if (win === 'carth') { EV.loseTroops('rome', Math.round(df * 0.9), pid); if (fl && fl.alive) W.killOfficer(fl.id, '戦死'); S.log('ローマ軍は霧の中で三方から襲われ、湖へ追い落とされた。一万五千が討たれ、同じほどが捕らえられた。', 'big'); }
      else if (win === 'rome') EV.loseTroops('carth', Math.round(at * 0.4), base);
    } },
  { id: 'fabius217', y: -217, m: 7, run: async () => {
      if (!EV.alive('rome') || !S.atWar('rome', 'carth') || !EV.ITALY.some(p => EV.owns('carth', p))) return;
      const fb = EV.histOff('ファビウス'); if (!fb || !fb.alive || fb.c !== 'rome' || fb.player) return;
      if (EV.isTopOf('rome')) {
        const k = await HOOK.choose({ title: '独裁官', seal: '国難', who: fb, body: '敗報にローマは震えている。老練なファビウスを独裁官（六か月かぎりの全権の将）に任じ、決戦を避けて敵を疲れさせる策をとるか。', choices: [{ v: 1, label: 'ファビウスを独裁官に任じる', sub: '守りを固め、イタリアのカルタゴ軍を少しずつ削る' }, { v: 0, label: '新しい軍団で決戦を挑む', sub: '兵は増えるが、守りは薄いまま' }] });
        if (!k) { for (const p of S.ownedProvs('rome')) p.troops = Math.round(p.troops * 1.08); S.log('ローマは新しい軍団を集めた。'); return; }
        if (fb.ret) { fb.ret = false; fb.r = 'dais'; fb.loc = W.capital('rome'); }
      }
      if (fb.ret) return;
      for (const pid of EV.ITALY) { const p = G.prov[pid]; if (!p) continue; if (p.o === 'carth') p.troops = Math.round(p.troops * 0.9); else if (p.o === 'rome') p.wall = Math.min(100, p.wall + 10); }
      G.flags.fabius = G.turn + 18;
      fb.fame = (fb.fame || 0) + 40;
      S.log('【ファビウス、独裁官となる】ファビウスは決戦を避け、山の上からハンニバルの軍につきまとって、糧秣を集める部隊を一つずつ討った。人々は彼を「ぐずぐず屋（クンクタトル）」と笑ったが、ローマは息を吹き返した。', 'big');
      S.chron('ファビウス、独裁官となる。');
    } },
  { id: 'naupactus217', y: -217, m: 8, run: async () => {
      if (!EV.alive('mace')) return;
      EV.rel('mace', 'rome', -15);
      S.log('ナウパクトスの和約で、マケドニアとアイトリアの戦争が終わった。アイトリアのアゲラオスは「西の空の雲がギリシアに覆いかぶさる前に、手を結ぼう」と説いた。若いフィリッポスの目は、イタリアに向いている。'); S.chron('ナウパクトスの和約。');
    } },
  { id: 'achaeus216', y: -216, m: 5, run: async () => {
      const ac = EV.live('アカイオス', 'sele'); if (!ac || !EV.alive('sele')) return;
      const pid = ['lydia', 'phrygia', 'pergamon'].find(p => EV.owns('sele', p)); if (!pid) return;
      if (EV.isKing('sele')) {
        const k = await HOOK.choose({ title: 'アカイオスの野心', seal: '密議', who: ac, body: '小アジアを任せた一族のアカイオスが、サルディスで王の冠をかぶったという。', choices: [{ v: 1, label: '使者を送って説き伏せる（舌戦）' }, { v: 0, label: '兵を挙げて討つ' }] });
        if (k) { const r = await UI.debate(ac, '王位の簒奪'); if (r > 0) { ac.bond = (ac.bond || 0) + 20; S.log('アカイオスは冠を捨てて従った。', 'good'); return; } }
      }
      ac.ret = true;
      await EV.rebellion('sele', pid, 30000, 'アカイオスの反乱', 'サルディスでアカイオスが王を名乗り、小アジアを奪おうとしている！');
    } },
  { id: 'cannae216', y: -216, m: 8, run: async () => {
      if (!EV.alive('rome') || !EV.alive('carth') || !S.atWar('rome', 'carth')) return;
      const hn = EV.live('ハンニバル', 'carth'); if (!hn) return;
      const base = EV.ITALY.find(p => EV.owns('carth', p)); if (!base) return;
      const pid = ['apulia', 'samnium', 'lucania', 'campania'].find(p => EV.owns('rome', p)); if (!pid) return;
      const from = S.adj(pid).find(q => EV.owns('rome', q)) || base;
      const pa = EV.live('アエミリウス・パウルス', 'rome'), va = EV.live('ウァッロ', 'rome');
      const at = Math.round(Math.min(S.countryTroops('rome') * 0.3, 86000)), df = Math.max(40000, Math.round(G.prov[base].troops * 1.1));
      const win = await EV.histBattle({ id: 'cannae216', title: 'カンナエの戦い', pid, from, text: `執政官${[va ? 'ウァッロ' : '', pa ? 'パウルス' : ''].filter(Boolean).join('と')}が八万の大軍でハンニバルに挑む。ハンニバルは中央を薄く張り出し、両翼にアフリカの精兵を隠している。`, atk: { c: 'rome', troops: at, cmd: va ? 'ウァッロ' : (pa ? 'アエミリウス・パウルス' : '') }, def: { c: 'carth', troops: df, cmd: 'ハンニバル' }, pAtk: 0.15 });
      G.flags.cannae = win;
      if (win === 'carth') {
        EV.loseTroops('rome', Math.round(at * 0.8), pid);
        for (const n of ['アエミリウス・パウルス', 'ミヌキウス']) { const o = EV.live(n, 'rome'); if (o && U.ch(0.85)) W.killOfficer(o.id, '戦死'); }
        EV.cede([pid], 'carth', 0); G.prov[pid].troops = Math.round(df * 0.8);
        hn.fame = (hn.fame || 0) + 150;
        const mh = EV.live('マハルバル', 'carth');
        S.log(`ローマ軍は前後左右から包まれ、一日で五万が討たれた。${mh ? 'マハルバルは「五日後にはカピトリウムで食事ができます。騎兵を先に行かせてください」と迫ったが、ハンニバルは動かなかった。「あなたは勝つことを知っているが、勝利の使い方を知らない」' : ''}`, 'big');
      } else if (win === 'rome') {
        EV.loseTroops('carth', Math.round(df * 0.6), base);
        S.log('ローマの大軍がハンニバルの包囲を押し破った！', 'big');
      }
    } },
  { id: 'capua216', y: -216, m: 10, run: async () => {
      if (G.flags.cannae !== 'carth' || !EV.alive('rome') || !EV.alive('carth') || !S.atWar('rome', 'carth')) return;
      const tg = ['campania', 'bruttium'].filter(p => EV.owns('rome', p)); if (!tg.length) return;
      if (EV.nearMil('rome', tg) || (EV.myC() === 'rome' && tg.includes(G.me.loc) && S.tier() >= 3)) {
        const k = await HOOK.choose({ title: 'カプアの離反', seal: '国難', body: 'カンナエの敗報に、町の民会がハンニバルを迎え入れようとしている。', choices: [{ v: 1, label: 'ローマ派の人々を集めて引き止める', sub: '魅力と政治しだい' }, { v: 0, label: '町を出て味方の陣へ退く' }] });
        if (k && U.ch(0.25 + (S.stat(S.myOff(), 'mi') + S.stat(S.myOff(), 'pol')) / 400)) { tg.splice(tg.indexOf(G.me.loc), 1); W.gainMerit(Math.round(40 * S.tier()), '町の離反を防いだ'); S.log('説得が実り、町はローマにとどまった。', 'good'); }
      }
      if (!tg.length) return;
      EV.cede(tg, 'carth', 0.6);
      S.log('イタリア第二の都カプアがハンニバルに門を開き、ブルッティウムの人々もローマに背いた。', 'big'); S.chron('カプアとブルッティウム、カルタゴにつく。');
    } },
  { id: 'litana216', y: -216, m: 12, run: async () => {
      const po = EV.live('ポストゥミウス', 'rome'); if (!po || !EV.alive('rome')) return;
      EV.loseTroops('rome', 20000, 'cisalpina');
      W.killOfficer(po.id, '戦死', false);
      S.log('ガリア・キサルピナへ向かったポストゥミウスの軍が、リタナの森でボイイ族の罠にかかって全滅した。木を切りかけておき、軍が通ると押し倒したのだ。', 'big'); S.chron('リタナの森の戦い。');
    } },
  { id: 'philip215', y: -215, m: 6, run: async () => {
      if (!EV.alive('mace') || !EV.alive('carth') || !EV.alive('rome') || !S.atWar('rome', 'carth') || S.dip('mace', 'carth').st === 'ally') return;
      if (EV.isTopOf('mace')) {
        const k = await HOOK.choose({ title: 'ハンニバルとの盟約', seal: '史実', body: 'カンナエの勝報を聞き、ファロスのデメトリオスが「今こそイタリアへ」と勧める。ハンニバルと盟約を結び、ローマと戦うか。', choices: [{ v: 1, label: 'ハンニバルと盟約を結ぶ（ローマと開戦）' }, { v: 0, label: '結ばない' }] });
        if (!k) return;
      } else if (!EV.live('フィリッポス五世', 'mace')) return;
      EV.ally('mace', 'carth');
      EV.war('mace', 'rome');
      S.log('マケドニアのフィリッポス五世がハンニバルと盟約を結んだ。使者がローマの船に捕まり、盟約は露見した。', 'big'); S.chron('フィリッポス五世、ハンニバルと結ぶ。第一次マケドニア戦争。');
    } },
  { id: 'hiero215', y: -215, m: 8, run: async () => {
      const hi = EV.live('ヒエロン二世', 'syra'); if (!hi) return;
      W.killOfficer(hi.id, '九十歳で没', false);
      S.chron('シュラクサイのヒエロン二世、九十歳で没す。五十年あまりローマの友であった。');
    } },
  { id: 'sardinia215', y: -215, m: 9, run: async () => {
      if (!EV.alive('rome') || !EV.alive('carth') || !S.atWar('rome', 'carth') || !EV.owns('rome', 'sardinia')) return;
      const hc = EV.live('ハスドルバル・カルウス', 'carth'), tq = EV.live('トルクァトゥス', 'rome');
      const win = await EV.histBattle({ id: 'sardinia215', title: 'サルディニアの反乱', pid: 'sardinia', from: 'corsica', text: 'サルディニアの豪族ハンプシコラがローマに背き、カルタゴの将ハスドルバル・カルウスが艦隊で加勢に来た。', atk: { c: 'carth', troops: 15000, cmd: hc ? 'ハスドルバル・カルウス' : '' }, def: { c: 'rome', troops: Math.max(10000, G.prov.sardinia.troops), cmd: tq ? 'トルクァトゥス' : '' }, pAtk: 0.25 });
      if (win === 'carth') EV.cede(['sardinia'], 'carth', 0.3);
      else if (win === 'rome' && hc) { hc.ret = true; S.log('ハスドルバル・カルウスは捕らえられた。', 'big'); }
    } },
  { id: 'syracuse214', y: -214, m: 3, run: async () => {
      if (!EV.alive('syra') || !EV.alive('rome') || !EV.alive('carth') || S.atWar('syra', 'rome')) return;
      let side = 'carth';
      if (EV.isTopOf('syra')) {
        side = await HOOK.choose({ title: 'シュラクサイの岐路', seal: '国難', body: 'ハンニバルの使いヒッポクラテスとエピキュデスが「ローマはもう終わりだ。カルタゴと結べば、シキリア全土があなたのものに」と説く。', choices: [{ v: 'carth', label: 'カルタゴと結ぶ（ローマと開戦）' }, { v: 'rome', label: 'ヒエロン王の遺言どおり、ローマの友であり続ける' }] });
      } else {
        const hy = EV.live('ヒエロニュモス', 'syra');
        if (hy && G.cty.syra.ruler === hy.id) { W.killOfficer(hy.id, '暗殺'); S.log('若い王ヒエロニュモスは、レオンティノイの町の細い道で暗殺された。', 'big'); }
        const ad = EV.live('アドラノドロス', 'syra'); if (ad) W.killOfficer(ad.id, '殺害', false);
        const ep = EV.live('エピキュデス', 'syra'); if (ep && G.cty.syra.ruler !== ep.id) EV.crown(ep, 'syra', '（ヒッポクラテスとともに将軍に選ばれた）');
      }
      if (side !== 'carth') { EV.ally('rome', 'syra'); return; }
      const d = S.dip('rome', 'syra'); d.st = 'peace'; d.t = 0;
      EV.ally('syra', 'carth');
      EV.war('rome', 'syra');
      S.log('シュラクサイはローマを捨ててカルタゴと結んだ。マルケッルスがシキリアへ向かう。', 'big'); S.chron('シュラクサイ、カルタゴにつく。');
    } },
  { id: 'archimedes213', y: -213, m: 5, run: async () => {
      if (!EV.alive('syra') || !S.atWar('rome', 'syra') || !EV.owns('syra', 'syracusae')) return;
      const ar = EV.live('アルキメデス', 'syra'); if (!ar) return;
      const mc = EV.live('マルケッルス', 'rome');
      EV.loseTroops('rome', Math.round(Math.min(S.countryTroops('rome') * 0.03, 10000)), 'syracusae');
      G.prov.syracusae.wall = Math.min(100, G.prov.syracusae.wall + 15);
      ar.fame = (ar.fame || 0) + 100;
      const text = `${mc ? 'マルケッルス' : 'ローマ軍'}が陸と海からシュラクサイに攻めかかった。だがアルキメデスの投石機が大石を降らせ、城壁から伸びた鉄の爪がローマの船を吊り上げて、逆さまに海へ落とした。${mc ? 'マルケッルスは「われわれは百の手を持つ巨人と戦っているようだ」と嘆いた。' : ''}`;
      S.log(`【アルキメデスの兵器】${text}`, 'big'); S.chron('アルキメデスの兵器、ローマ軍を退ける。');
      if (EV.myC() === 'rome' || EV.myC() === 'syra') await HOOK.info({ title: 'アルキメデスの兵器', seal: '史実', who: ar, body: text });
    } },
  { id: 'aratus213', y: -213, m: 9, run: async () => {
      const ar = EV.live('アラトス', 'mace'); if (!ar || !EV.alive('mace')) return;
      if (EV.isKing('mace')) {
        const k = await HOOK.choose({ title: 'アラトスの諫言', seal: '密議', who: ar, body: '老いたアラトスが、メッセネでの乱暴をやめるよう、何度も王をいさめている。側近のタウリオンが「毒で静かに除けます」とささやく。', choices: [{ v: 0, label: '除かせる' }, { v: 1, label: '諫言を聞き入れる' }] });
        if (k) { ar.bond = (ar.bond || 0) + 20; for (const c of D.CORDER) if (c !== 'mace') EV.rel('mace', c, 3); return; }
      }
      W.killOfficer(ar.id, '毒殺', false);
      S.log('アカイアの老政治家アラトスが、ゆっくり効く毒で死んだ。フィリッポス五世の命だと噂された。', 'big'); S.chron('アラトス、毒殺される。');
    } },
  { id: 'achaeus213', y: -213, m: 11, run: async () => {
      const ac = EV.histOff('アカイオス'); if (!ac || !ac.alive || !ac.ret || ac.player) return;
      W.killOfficer(ac.id, '処刑', false);
      S.log('サルディスの城にこもったアカイオスは、クレタ人ボリスの裏切りで捕らえられ、処刑された。', 'big'); S.chron('アカイオス、処刑される。');
    } },
  { id: 'tarentum212', y: -212, m: 2, run: async () => {
      if (!EV.alive('rome') || !EV.alive('carth') || !S.atWar('rome', 'carth') || !EV.owns('rome', 'tarentum') || !EV.live('ハンニバル', 'carth')) return;
      if (!S.adj('tarentum').some(q => EV.owns('carth', q)) && G.flags.cannae !== 'carth') return;
      EV.cede(['tarentum'], 'carth', 0.3);
      G.prov.tarentum.troops += 12000;
      S.log('タレントゥムの若者たちが夜に門を開き、ハンニバルを町へ入れた。ローマの守備隊は城山にこもって抵抗を続ける。', 'big'); S.chron('タレントゥム、ハンニバルに寝返る。');
    } },
  { id: 'anabasis212', y: -212, m: 4, run: async () => {
      const an = EV.live('アンティオコス三世', 'sele'); if (!an || !EV.alive('sele') || G.cty.sele.ruler !== an.id) return;
      const east = ['seleucia', 'galatia'].find(p => EV.owns('sele', p)) || W.capital('sele');
      an.loc = east; G.flags.anabasis = G.year;
      EV.loseTroops('sele', Math.round(S.countryTroops('sele') * 0.15), east);
      const me = G.me;
      if (EV.myC() === 'sele' && S.isMilLike() && S.tier() >= 3 && S.tier() <= 8 && me.inj === 0) {
        const k = await HOOK.choose({ title: '東方遠征', seal: '史実', who: an, body: 'アンティオコス三世が、アレクサンドロス大王の道をたどって東の果てへ向かう。アルメニア、パルティア、バクトリア、そしてインドへ。', choices: [{ v: 1, label: '遠征に加わる', sub: '数年のあいだ東の果てで戦う' }, { v: 0, label: '西に残る' }] });
        if (k) { me.flags.anabasis = true; me.loc = east; S.myOff().loc = east; W.learn('steppe', 2); W.gainMerit(Math.round(40 * S.tier()), '東方遠征'); }
      }
      S.log('アンティオコス三世が東方遠征に出た。七年をかけて、パルティアとバクトリアを従わせ、インドの王から象を得る旅である。', 'big'); S.chron('アンティオコス三世、東方遠征へ。');
    } },
  { id: 'gracchus212', y: -212, m: 6, run: async () => {
      const gr = EV.live('グラックス', 'rome'); if (!gr || !S.atWar('rome', 'carth')) return;
      W.killOfficer(gr.id, '戦死', false);
      S.log('解放した奴隷兵を率いてベネウェントゥムで勝ったグラックスが、ルカニア人の裏切りで待ち伏せにあい、討たれた。ハンニバルは彼を手厚く葬った。', 'big'); S.chron('グラックス、ルカニアで討たれる。');
    } },
  { id: 'syracuse212', y: -212, m: 9, run: async () => {
      if (!EV.alive('syra') || !EV.alive('rome') || !S.atWar('rome', 'syra') || !EV.owns('syra', 'syracusae')) return;
      const from = S.adj('syracusae').find(q => EV.owns('rome', q)) || EV.SICILY.find(q => EV.owns('rome', q)); if (!from) return;
      const mc = EV.live('マルケッルス', 'rome');
      const at = Math.round(Math.min(S.countryTroops('rome') * 0.1, 30000)), df = Math.max(8000, G.prov.syracusae.troops);
      const win = await EV.histBattle({ id: 'syracuse212', title: 'シュラクサイ陥落', pid: 'syracusae', from, text: 'アルテミスの祭りの夜、町じゅうが酒に酔っている。ローマ兵が、手薄なエピポライの城壁に梯子をかける。', atk: { c: 'rome', troops: at, cmd: mc ? 'マルケッルス' : '' }, def: { c: 'syra', troops: df, cmd: 'エピキュデス' }, pAtk: 0.8 });
      if (win !== 'rome') return;
      const ar = EV.live('アルキメデス', 'syra');
      if (ar) { W.killOfficer(ar.id, '戦死', false); S.log('アルキメデスは砂に描いた図形を見つめていた。踏み込んだローマ兵に「わたしの円を乱すな」と言い、その場で斬られた。マルケッルスは深く悲しんだという。', 'big'); S.chron('アルキメデス、ローマ兵に殺される。'); }
      EV.pay('syra', 'rome', 0.5);
      EV.cede(['syracusae', 'leontini'].filter(p => EV.owns('syra', p)), 'rome', 0.3);
      S.log('シュラクサイはローマの手に落ち、町の宝と美術品はローマへ運ばれた。', 'big'); S.chron('シュラクサイ陥落。');
    } },
  { id: 'capua211', y: -211, m: 4, run: async () => {
      if (!EV.alive('rome') || !EV.alive('carth') || !S.atWar('rome', 'carth') || !EV.owns('carth', 'campania')) return;
      const from = S.adj('campania').find(q => EV.owns('rome', q)); if (!from) return;
      if (EV.live('ハンニバル', 'carth')) { S.log('カプアを救うため、ハンニバルはローマの城壁の三マイル手前まで迫った。「ハンニバルが門の前にいる！」と町は騒いだが、カプアを囲むローマ軍は動かなかった。', 'big'); S.chron('ハンニバル、ローマの門前に迫る。'); const rp = G.prov[W.capital('rome')]; if (rp) rp.agri = Math.max(10, rp.agri - 6); }
      const fv = EV.live('フルウィウス', 'rome');
      const at = Math.round(Math.min(S.countryTroops('rome') * 0.15, 50000)), df = Math.max(10000, G.prov.campania.troops);
      const win = await EV.histBattle({ id: 'capua211', title: 'カプア包囲', pid: 'campania', from, text: '二重の堀と柵でカプアを囲んだローマ軍が、飢えた町に最後の攻撃をかける。', atk: { c: 'rome', troops: at, cmd: fv ? 'フルウィウス' : 'アッピウス・クラウディウス' }, def: { c: 'carth', troops: df, cmd: '' }, pAtk: 0.8 });
      if (win === 'rome') { EV.cede(['campania'], 'rome', 0.3); S.log('カプアは降った。ハンニバルについた貴族たちは処刑され、町は自治を奪われた。', 'big'); }
      const ap = EV.live('アッピウス・クラウディウス', 'rome'); if (ap && U.ch(0.7)) W.killOfficer(ap.id, '包囲中の傷がもとで没', false);
    } },
  { id: 'baetis211', y: -211, m: 6, run: async () => {
      if (!EV.alive('rome') || !EV.alive('carth') || !S.atWar('rome', 'carth') || !EV.IBERIA.some(p => EV.owns('carth', p))) return;
      const ps = EV.live('プブリウス・スキピオ', 'rome'), gs = EV.live('グナエウス・スキピオ', 'rome');
      if (!ps && !gs) return;
      if (EV.nearMil('rome', ['emporiae', 'massilia', ...EV.IBERIA])) {
        const k = await HOOK.choose({ title: 'ケルティベリア人の傭兵', seal: '史実', body: 'ローマに雇われたケルティベリア人二万が、カルタゴの金に転びそうだという噂がある。二人のスキピオは兵を分けて、三つのカルタゴ軍に挑もうとしている。', choices: [{ v: 1, label: '兵を分けるのは危ういと進言する', sub: '知力しだい' }, { v: 0, label: '命令に従う' }] });
        if (k && U.ch(0.2 + S.stat(S.myOff(), 'chi') / 160)) { W.gainMerit(Math.round(50 * S.tier()), 'スキピオ兄弟を救った'); S.log('進言が容れられ、ローマ軍は兵を分けずに退いた。二人のスキピオは生きのびた。', 'good'); EV.loseTroops('rome', 6000, 'emporiae'); return; }
      }
      for (const o of [ps, gs]) if (o) W.killOfficer(o.id, '戦死', false);
      EV.loseTroops('rome', Math.round(Math.min(S.countryTroops('rome') * 0.05, 20000)), 'emporiae');
      const mr = EV.live('マルキウス', 'rome'); if (mr) { mr.fame = (mr.fame || 0) + 50; if (D.RANKS[mr.r].tier < 6) mr.r = 'goz'; }
      S.log(`【上バエティスの戦い】傭兵に見捨てられた二人のスキピオが、別々の戦場で相次いで討たれた。${mr ? '騎士ルキウス・マルキウスが残った兵をまとめ、エブロ川の線を守った。' : ''}`, 'big'); S.chron('プブリウスとグナエウスのスキピオ兄弟、ヒスパニアで戦死。');
    } },
  { id: 'aetolia211', y: -211, m: 9, run: async () => {
      if (!EV.alive('rome') || !EV.alive('mace') || !S.atWar('rome', 'mace') || !EV.owns('mace', 'aetolia')) return;
      if (EV.isTopOf('mace')) {
        const k = await HOOK.choose({ title: 'アイトリアの離反', seal: '国難', body: 'ローマの将ラエウィヌスが、アイトリア同盟に「奪った土地はお前たちに、戦利品はローマに」と同盟を持ちかけている。', choices: [{ v: 1, label: 'アイトリアに金を贈って引き止める（国庫の一割）' }, { v: 0, label: '捨て置く' }] });
        if (k) { G.cty.mace.gold = Math.round(G.cty.mace.gold * 0.9); if (U.ch(0.6)) { S.log('アイトリア人は思いとどまった。', 'good'); return; } }
      }
      EV.cede(['aetolia'], 'rome', 0.6);
      S.log('アイトリア同盟がローマと結び、マケドニアに背いた。', 'big'); S.chron('ローマとアイトリア同盟、盟約を結ぶ。');
    } },
  { id: 'scipio210', y: -210, m: 10, run: async () => {
      const sc = EV.live('スキピオ', 'rome'); if (!sc || !EV.alive('carth') || !S.atWar('rome', 'carth')) return;
      if (EV.isTopOf('rome')) { const k = await HOOK.choose({ title: 'ヒスパニアの将', seal: '史実', who: sc, body: '父と叔父を失ったヒスパニアの軍を、誰も引き受けようとしない。二十五歳のスキピオがただ一人名乗り出た。', choices: [{ v: 1, label: 'スキピオに任せる' }, { v: 0, label: '若すぎる' }] }); if (!k) return; }
      if (D.RANKS[sc.r].tier < 8) sc.r = 'dais';
      const pid = ['emporiae', 'ilergetes', 'saguntum', 'massilia'].find(p => EV.owns('rome', p));
      if (pid) { sc.loc = pid; const la = EV.live('ラエリウス', 'rome'); if (la) la.loc = pid; }
      sc.fame = (sc.fame || 0) + 40;
      S.log('二十五歳のスキピオが、執政官と同じ全権を与えられてヒスパニアへ渡った。', 'big'); S.chron('スキピオ、ヒスパニアの将となる。');
    } },
  { id: 'muttines210', y: -210, m: 9, run: async () => {
      const mu = EV.live('ムットゥネス', 'carth'); if (!mu || !EV.alive('rome') || !S.atWar('rome', 'carth')) return;
      if (EV.isTopOf('carth')) { const k = await HOOK.choose({ title: 'ムットゥネスの不満', seal: '人事', who: mu, body: 'シキリアで活躍するリビア人の騎将ムットゥネスを、本国の将たちが妬み、指揮を取り上げようとしている。', choices: [{ v: 1, label: 'ムットゥネスをかばう' }, { v: 0, label: '将たちの言うとおりにする' }] }); if (k) { mu.bond = (mu.bond || 0) + 20; return; } }
      const sic = EV.SICILY.filter(p => EV.owns('carth', p));
      EV.moveOff(mu, 'rome', 'goz');
      if (sic.length) EV.cede([sic[0]], 'rome', 0.3);
      S.log(`カルタゴの騎将ムットゥネスが、指揮を奪われた恨みからローマに寝返った。${sic.length ? S.P[sic[0]].name + 'の門が開かれた。' : ''}彼はのちにローマの市民となる。`, 'big'); S.chron('ムットゥネス、ローマに寝返る。');
    } },
  { id: 'cartnova209', y: -209, m: 3, run: async () => {
      const sc = EV.live('スキピオ', 'rome'); if (!sc || !EV.alive('carth') || !S.atWar('rome', 'carth') || !EV.owns('carth', 'cartnova')) return;
      const from = S.adj('cartnova').find(q => EV.owns('rome', q)) || ['emporiae', 'ilergetes', 'saguntum'].find(q => EV.owns('rome', q)) || 'saguntum';
      const win = await EV.histBattle({ id: 'cartnova209', title: 'カルタゴ・ノウァ攻略', pid: 'cartnova', from, text: 'スキピオが七日で海岸を駆け下り、カルタゴ・ノウァを囲んだ。漁師が「夕方には潟の水が引く」と教えた。', atk: { c: 'rome', troops: 27000, cmd: 'スキピオ' }, def: { c: 'carth', troops: Math.max(4000, Math.round(G.prov.cartnova.troops * 0.5)), cmd: '' }, pAtk: 0.85 });
      if (win !== 'rome') return;
      EV.cede(['cartnova'], 'rome', 0.3);
      G.prov.cartnova.troops += 15000;
      EV.pay('carth', 'rome', 0.12);
      sc.fame = (sc.fame || 0) + 80;
      S.log('「海の神ネプトゥヌスが道を開く」――潟を歩いて渡ったローマ兵が城壁を越え、カルタゴ・ノウァは一日で落ちた。銀と武器庫と、イベリアの部族の人質がスキピオの手に入った。人質を家へ帰したスキピオの名は、ヒスパニアじゅうに広まった。', 'big'); S.chron('スキピオ、カルタゴ・ノウァを落とす。');
    } },
  { id: 'tarentum209', y: -209, m: 6, run: async () => {
      if (!EV.owns('carth', 'tarentum') || !EV.alive('rome') || !S.atWar('rome', 'carth')) return;
      const fb = EV.live('ファビウス', 'rome');
      EV.cede(['tarentum'], 'rome', 0.2);
      const ca = EV.live('カルタロ', 'carth'); if (ca) W.killOfficer(ca.id, '戦死', false);
      S.log(`${fb ? '老ファビウス' : 'ローマ軍'}がタレントゥムを取り戻した。町を守っていたブルッティウム人の隊長が、門を内から開いたのだ。`, 'big'); S.chron('ローマ、タレントゥムを奪い返す。');
    } },
  { id: 'baecula208', y: -208, m: 4, run: async () => {
      const sc = EV.live('スキピオ', 'rome'), hd = EV.live('ハスドルバル', 'carth');
      if (!sc || !EV.alive('carth') || !S.atWar('rome', 'carth')) return;
      const pid = ['castulo', 'saguntum', 'celtiberia', 'gades'].find(p => EV.owns('carth', p)); if (!pid) return;
      const from = S.adj(pid).find(q => EV.owns('rome', q)) || 'cartnova';
      const win = await EV.histBattle({ id: 'baecula208', title: 'バエクラの戦い', pid, from, text: `スキピオが、丘の上に陣取った${hd ? 'ハスドルバル' : 'カルタゴ軍'}に両側から攻め上る。`, atk: { c: 'rome', troops: 35000, cmd: 'スキピオ' }, def: { c: 'carth', troops: Math.max(20000, Math.round(G.prov[pid].troops * 0.8)), cmd: hd ? 'ハスドルバル' : '' }, pAtk: 0.75 });
      if (win !== 'rome') return;
      EV.cede([pid], 'rome', 0.3);
      if (hd) { G.flags.hasdrubalMarch = G.year; S.log('ハスドルバルは軍資金と戦象を連れて戦場を抜け出し、兄の待つイタリアへ向かった。', 'big'); }
    } },
  { id: 'marcellus208', y: -208, m: 7, run: async () => {
      const mc = EV.live('マルケッルス', 'rome'); if (!mc || !EV.live('ハンニバル', 'carth') || !EV.ITALY.some(p => EV.owns('carth', p))) return;
      const me = G.me;
      if (EV.myC() === 'rome' && S.isMilLike() && S.tier() >= 3 && me.inj === 0 && (me.gen === mc.id || me.boss === mc.id)) {
        const k = await HOOK.choose({ title: '丘の偵察', seal: '史実', who: mc, body: 'マルケッルスが自ら少数の騎兵を連れて、陣の前の丘を見に行くという。丘のふもとの林が気になる。', choices: [{ v: 1, label: '林を先に調べるよう進言する' }, { v: 0, label: '護衛としてついていく' }] });
        if (k && U.ch(0.3 + S.stat(S.myOff(), 'chi') / 200)) { W.gainMerit(Math.round(40 * S.tier()), 'マルケッルスを救った'); mc.bond = (mc.bond || 0) + 30; S.log('林にはヌミディア騎兵が伏せていた。マルケッルスは危うく難を逃れた。', 'good'); return; }
      }
      W.killOfficer(mc.id, '戦死', false);
      S.log('「ローマの剣」マルケッルスが、偵察に出たところをヌミディア騎兵の伏兵に討たれた。ハンニバルは亡骸を手厚く焼き、灰を息子のもとへ送った。', 'big'); S.chron('マルケッルス、伏兵に討たれる。');
    } },
  { id: 'metaurus207', y: -207, m: 6, run: async () => {
      const hd = EV.live('ハスドルバル', 'carth'); if (!hd || !EV.alive('rome') || !S.atWar('rome', 'carth')) return;
      if (!G.flags.hasdrubalMarch && !EV.ITALY.some(p => EV.owns('carth', p))) return;
      const pid = ['ariminum', 'picenum', 'umbria', 'etruria'].find(p => EV.owns('rome', p)); if (!pid) return;
      const from = S.adj(pid).find(q => EV.owns('carth', q)) || 'cisalpina';
      const ne = EV.live('クラウディウス・ネロ', 'rome'), li = EV.live('リウィウス', 'rome');
      const at = Math.max(30000, Math.round(Math.min(S.countryTroops('carth') * 0.15, 35000)));
      if (!G.flags.hasdrubalMarch) EV.loseTroops('carth', at, 'ilergetes');
      const df = Math.round(Math.min(S.countryTroops('rome') * 0.12, 45000));
      const win = await EV.histBattle({ id: 'metaurus207', title: 'メタウルス川の戦い', pid, from, text: `アルペスを越えたハスドルバルが兄に宛てた手紙を、ローマ兵が奪った。南でハンニバルと向き合っていた${ne ? 'ネロ' : '執政官'}は、六日で四百キロを駆けて北の${li ? 'リウィウス' : '軍'}と合流した。陣のラッパが二度鳴るのを聞いて、ハスドルバルは敵の執政官が二人いると悟った。`, atk: { c: 'carth', troops: at, cmd: 'ハスドルバル' }, def: { c: 'rome', troops: df, cmd: ne ? 'クラウディウス・ネロ' : (li ? 'リウィウス' : '') }, pAtk: 0.2 });
      if (win === 'rome') {
        if (hd.alive) W.killOfficer(hd.id, '戦死');
        S.log('ハスドルバルは敵の中へ馬を乗り入れて討ち死にした。ネロはその首をハンニバルの陣へ投げ込ませた。弟の顔を見たハンニバルは「カルタゴの運命が見えた」と言ったという。', 'big'); S.chron('メタウルス川の戦い。ハスドルバル戦死。');
      } else if (win === 'carth') {
        const base = EV.ITALY.find(p => EV.owns('carth', p)); if (base) G.prov[base].troops += Math.round(at * 0.6);
        S.log('ハスドルバルの軍がローマ軍を破り、兄の軍と合流した！', 'big');
      }
    } },
  { id: 'ilipa206', y: -206, m: 5, run: async () => {
      const sc = EV.live('スキピオ', 'rome'); if (!sc || !EV.alive('carth') || !S.atWar('rome', 'carth')) return;
      const spain = EV.IBERIA.filter(p => p !== 'baleares' && EV.owns('carth', p)); if (!spain.length) return;
      const pid = ['gades', 'castulo', 'lusitania', 'celtiberia'].find(p => spain.includes(p)) || spain[0];
      const from = S.adj(pid).find(q => EV.owns('rome', q)) || 'cartnova';
      const hg = EV.live('ハスドルバル（ギスコの子）', 'carth');
      const df = Math.max(50000, Math.round(Math.min(S.countryTroops('carth') * 0.3, 74000)));
      const win = await EV.histBattle({ id: 'ilipa206', title: 'イリパの戦い', pid, from, text: '何日も同じ布陣を見せてきたスキピオが、その朝は兵に早く食事をさせ、精兵を両翼に置きかえて夜明けに打って出た。', atk: { c: 'rome', troops: 48000, cmd: 'スキピオ' }, def: { c: 'carth', troops: df, cmd: hg ? 'ハスドルバル（ギスコの子）' : 'マゴ' }, pAtk: 0.8 });
      if (win !== 'rome') return;
      EV.loseTroops('carth', Math.round(df * 0.6), pid);
      EV.cede(spain, 'rome', 0.3);
      sc.fame = (sc.fame || 0) + 100;
      const mg = EV.live('マゴ', 'carth'); if (mg && EV.owns('carth', 'baleares')) mg.loc = 'baleares';
      S.log('イリパでカルタゴ軍は総崩れとなった。ガデスも門を開き、カルタゴはヒスパニアを失った。', 'big'); S.chron('イリパの戦い。カルタゴ、ヒスパニアを失う。');
    } },
  { id: 'masinissa206', y: -206, m: 9, run: async () => {
      const ms = EV.live('マシニッサ', 'numi'); if (!ms || !EV.alive('rome')) return;
      EV.rel('rome', 'numi', 25);
      const sc = EV.live('スキピオ', 'rome'); if (sc && typeof PPL !== 'undefined') PPL.addRelBoth(sc.id, ms.id, 30);
      S.log('スキピオはアフリカへ渡ってシュファクス王と会い、ガデスの近くではマシニッサとひそかに手を結んだ。'); S.chron('マシニッサ、スキピオと結ぶ。');
    } },
  { id: 'sophonisba205', y: -205, m: 3, run: async () => {
      if (!EV.alive('numi') || !EV.alive('carth')) return;
      const sy = EV.live('シュファクス', 'numi');
      if (EV.isTopOf('numi')) {
        const k = await HOOK.choose({ title: 'ソフォニスバとの婚礼', seal: '史実', body: 'カルタゴの将ハスドルバル（ギスコの子）が、娘ソフォニスバを妃に差し出し、同盟を求めてきた。', choices: [{ v: 1, label: '娶ってカルタゴと結ぶ' }, { v: 0, label: '断る' }] });
        if (!k) return;
      } else if (!sy || G.cty.numi.ruler !== sy.id) return;
      EV.ally('numi', 'carth');
      if (S.atWar('rome', 'carth')) EV.war('numi', 'rome');
      const ms = EV.live('マシニッサ', 'numi');
      if (ms && sy && G.cty.numi.ruler === sy.id && EV.alive('rome')) { EV.moveOff(ms, 'rome', 'shog'); S.log('国を追われたマシニッサは、わずかな騎兵とともにローマに身を寄せた。', 'big'); }
      S.log('ヌミディア王シュファクスがカルタゴの娘ソフォニスバを娶り、カルタゴと結んだ。', 'big'); S.chron('シュファクス、ソフォニスバを娶ってカルタゴと結ぶ。');
    } },
  { id: 'theban205', y: -205, m: 6, run: async () => {
      if (!EV.alive('ptol') || !EV.owns('ptol', 'thebais')) return;
      await EV.rebellion('ptol', 'thebais', 20000, 'テーバイの反乱', '上エジプトで土着のハルウェンネフェルが立ち、ファラオを名乗った！');
    } },
  { id: 'phoenice205', y: -205, m: 6, run: async () => {
      if (!EV.alive('rome') || !EV.alive('mace') || !S.atWar('rome', 'mace')) return;
      let ok = true;
      if (EV.isTopOf('mace')) ok = !!(await HOOK.choose({ title: 'フォイニケの和約', seal: '史実', body: 'アイトリア人がローマを見捨てて和を結んだ。ローマもカルタゴとの戦いに専念したがっている。エペイロスのフォイニケで和を結ぶか。', choices: [{ v: 1, label: '和を結ぶ' }, { v: 0, label: '戦い続ける' }] }));
      else if (EV.isTopOf('rome')) ok = !!(await HOOK.choose({ title: 'フォイニケの和約', seal: '史実', body: 'マケドニアとの戦いを終わらせ、カルタゴに力を集めるか。', choices: [{ v: 1, label: '和を結ぶ' }, { v: 0, label: '戦い続ける' }] }));
      if (!ok) return;
      EV.peace('rome', 'mace', 60, -10);
      S.log('フォイニケの和約で、ローマとマケドニアの戦いは終わった。', 'big'); S.chron('フォイニケの和約。');
    } },
  { id: 'mago205', y: -205, m: 8, run: async () => {
      const mg = EV.live('マゴ', 'carth'); if (!mg || !EV.alive('rome') || !S.atWar('rome', 'carth') || !EV.owns('rome', 'liguria')) return;
      EV.cede(['liguria'], 'carth', 0.2);
      G.prov.liguria.troops += 14000;
      mg.loc = 'liguria';
      S.log('マゴがバレアレスから海を渡ってゲヌアを奪い、リグリア人とガリア人を集めはじめた。', 'big'); S.chron('マゴ、リグリアに上陸。');
    } },
  { id: 'anabasis205', y: -205, m: 9, run: async () => {
      if (!G.flags.anabasis || !EV.alive('sele')) return;
      const an = EV.live('アンティオコス三世', 'sele'), cap = W.capital('sele'); if (!cap) return;
      G.prov[cap].troops += 30000;
      G.cty.sele.gold += Math.round(S.countryPop('sele') * 10000 * 10);
      if (an) { an.loc = cap; an.fame = (an.fame || 0) + 150; }
      if (G.me.flags.anabasis) { delete G.me.flags.anabasis; W.gainMerit(Math.round(80 * S.tier()), '東方遠征から凱旋'); G.me.fame += 40; if (S.myOff().c === 'sele') { G.me.loc = cap; S.myOff().loc = cap; } }
      S.log('アンティオコスが百五十頭の戦象と山のような財宝を連れて、東方から戻った。人々は彼を「大王（メガス）」と呼んだ。', 'big'); S.chron('アンティオコス三世、東方から凱旋。「大王」と呼ばれる。');
    } },
  { id: 'scopas204', y: -204, m: 6, run: async () => {
      const sk = EV.live('スコパス', 'mace'); if (!sk || !EV.alive('ptol')) return;
      EV.moveOff(sk, 'ptol', 'shog');
      S.log('アイトリアの将スコパスが、エジプトの金で傭兵を集める役を引き受け、アレクサンドリアへ移った。'); S.chron('スコパス、エジプトに仕える。');
    } },
  { id: 'africa204', y: -204, m: 8, run: async () => {
      const sc = EV.live('スキピオ', 'rome'); if (!sc || !EV.alive('carth') || !S.atWar('rome', 'carth')) return;
      if (EV.AFRICA.some(p => EV.owns('rome', p))) return;
      const pid = ['utica', 'byzacium', 'sicca'].find(p => EV.owns('carth', p)); if (!pid) return;
      const from = ['lilybaeum', 'sardinia', 'agrigentum', 'syracusae'].find(p => EV.owns('rome', p)) || 'carthago';
      const hn = EV.live('ハンノ（ハミルカルの子）', 'carth'), ms = EV.live('マシニッサ', 'rome');
      const win = await EV.histBattle({ id: 'africa204', title: 'スキピオのアフリカ上陸', pid, from, text: `四百の輸送船がシキリアのリリュバエウムを発ち、ウティカの近くの岬に着いた。スキピオは船を降りるときにつまずいて地に手をつき、「アフリカよ、お前をつかんだぞ」と叫んだ。${ms ? 'マシニッサの騎兵がわざと逃げて、カルタゴの騎兵を誘い出す。' : ''}`, atk: { c: 'rome', troops: 30000, cmd: 'スキピオ' }, def: { c: 'carth', troops: Math.max(15000, Math.round(Math.min(S.countryTroops('carth') * 0.2, 30000))), cmd: hn ? 'ハンノ（ハミルカルの子）' : '' }, pAtk: 0.75 });
      if (win === 'rome') { EV.cede([pid], 'rome', 0.2); G.prov[pid].troops += 20000; sc.loc = pid; if (ms) ms.loc = pid; const la = EV.live('ラエリウス', 'rome'); if (la) la.loc = pid; if (hn && hn.alive) W.killOfficer(hn.id, '戦死'); S.log('ローマ軍はアフリカに足場を築いた（「コルネリウスの陣」）。', 'big'); }
      else if (win === 'carth') EV.loseTroops('rome', 12000, from);
    } },
  { id: 'philopator204', y: -204, m: 9, run: async () => {
      if (!EV.alive('ptol')) return;
      const p4 = EV.live('プトレマイオス四世', 'ptol'), ar = EV.live('アルシノエ三世', 'ptol');
      if (!p4 && !ar) return;
      if (ar) W.killOfficer(ar.id, '暗殺', false);
      if (p4) W.killOfficer(p4.id, '病没', false);
      S.log('プトレマイオス四世が世を去った。側近のソシビオスとアガトクレスは王の死をしばらく隠し、王妃アルシノエを殺して、六歳の王子の後見となった。', 'big'); S.chron('プトレマイオス四世没。幼いプトレマイオス五世が立つ。');
    } },
  { id: 'greatplains203', y: -203, m: 4, run: async () => {
      const sc = EV.live('スキピオ', 'rome'); if (!sc || !EV.alive('carth') || !S.atWar('rome', 'carth')) return;
      const base = EV.AFRICA.find(p => EV.owns('rome', p)); if (!base) return;
      // 都ではない、隣のカルタゴの地で戦う（都は落とさない）
      const pid = S.adj(base).find(q => EV.owns('carth', q) && q !== W.capital('carth') && !S.P[q].cap) || base;
      const hg = EV.live('ハスドルバル（ギスコの子）', 'carth');
      const df = Math.round(Math.min(S.countryTroops('carth') * 0.3, 40000));
      S.log('冬の夜、スキピオはシュファクスとハスドルバルの葦と木の陣に火を放った。炎から飛び出した兵が次々に討たれた。', 'big');
      EV.loseTroops('carth', Math.round(df * 0.4), base);
      const win = await EV.histBattle({ id: 'greatplains203', title: '大平原の戦い', pid, from: base, text: '焼け出されたカルタゴとヌミディアの残兵に、ケルティベリアの傭兵四千が加わって、大平原に陣を敷く。', atk: { c: 'rome', troops: 30000, cmd: 'スキピオ' }, def: { c: 'carth', troops: Math.round(df * 0.7), cmd: hg ? 'ハスドルバル（ギスコの子）' : '' }, pAtk: 0.85 });
      G.flags.greatplains = win;
      if (win !== 'rome') return;
      if (pid !== base) EV.cede([pid], 'rome', 0.3);
      if (!EV.alive('numi')) return;
      if (EV.isTopOf('numi')) {
        const k = await HOOK.choose({ title: 'ローマとの和', seal: '国難', body: 'カルタゴの軍は焼かれ、ローマの騎兵がキルタに迫る。ローマと結ぶか。', choices: [{ v: 1, label: 'ローマと結び、カルタゴと手を切る' }, { v: 0, label: 'カルタゴとともに戦う' }] });
        if (k) { const d = S.dip('rome', 'numi'); d.st = 'ally'; d.t = 0; d.rel = 50; const d2 = S.dip('numi', 'carth'); if (d2.st === 'ally') { d2.st = 'peace'; d2.t = 0; } }
        return;
      }
      const sy = EV.live('シュファクス', 'numi');
      if (!sy || G.cty.numi.ruler !== sy.id) return;
      sy.ret = true;
      S.log('ラエリウスとマシニッサがキルタまで追い、シュファクス王を捕らえた。', 'big'); S.chron('シュファクス、ローマに捕らえられる。');
      const ms = EV.histOff('マシニッサ');
      if (ms && ms.alive && !ms.player && EV.crown(ms, 'numi', '（ローマの後ろ盾を得て、父祖の国を取り戻した）')) {
        const d = S.dip('rome', 'numi'); d.st = 'ally'; d.t = 0; d.rel = 60;
        const d2 = S.dip('numi', 'carth'); if (d2.st === 'ally') { d2.st = 'peace'; d2.t = 0; }
        EV.war('numi', 'carth');
        const so = EV.live('ソフォニスバ'); if (so) { W.killOfficer(so.id, '毒をあおいで自害', false); S.log('マシニッサはソフォニスバを妃に迎えたが、スキピオは彼女をローマへ引き渡せと命じた。マシニッサは毒を送り、ソフォニスバは「婚礼の贈り物として受け取りましょう」と言って飲み干した。', 'big'); }
      } else if (G.cty.numi.ruler === sy.id) W.succession('numi');
    } },
  { id: 'recall203', y: -203, m: 9, run: async () => {
      const hn = EV.live('ハンニバル', 'carth'); if (!hn || !EV.alive('rome') || !S.atWar('rome', 'carth')) return;
      if (!EV.AFRICA.some(p => EV.owns('rome', p)) && G.flags.greatplains !== 'rome') return;
      const held = EV.ITALY.filter(p => EV.owns('carth', p));
      if (EV.isTopOf('carth')) { const k = await HOOK.choose({ title: 'ハンニバルの召還', seal: '国難', who: hn, body: `スキピオの軍が都に迫っている。イタリアで十五年戦ってきたハンニバルを呼び戻すか。${held.length ? 'イタリアに残る地はローマに戻るだろう。' : ''}`, choices: [{ v: 1, label: 'ハンニバルを呼び戻す' }, { v: 0, label: 'イタリアで戦わせ続ける' }] }); if (!k) return; }
      const cap = W.capital('carth');
      if (cap && EV.myC() === 'carth' && held.includes(G.me.loc)) { G.me.loc = cap; S.myOff().loc = cap; S.setupChainAfterPromotion(); }
      let army = 0;
      for (const pid of held) { army += Math.round(G.prov[pid].troops * 0.6); G.prov[pid].troops = Math.round(G.prov[pid].troops * 0.2); }
      EV.cede(held, 'rome', 1);
      if (cap) G.prov[cap].troops += army;
      for (const n of ['ハンニバル', 'マハルバル', 'ハンノ（ボミルカルの子）']) { const o = EV.live(n, 'carth'); if (o && cap) o.loc = cap; }
      const mg = EV.live('マゴ', 'carth'); if (mg) W.killOfficer(mg.id, '傷がもとで船の上で没', false);
      S.log('本国の求めに応じ、ハンニバルは十五年戦ったイタリアを去った。浜辺に立つ彼は、涙を流しながら振り返ったという。', 'big'); S.chron('ハンニバル、イタリアを去る。');
    } },
  { id: 'agathocles203', y: -203, m: 10, run: async () => {
      const ag = EV.live('アガトクレス', 'ptol'); if (!ag) return;
      W.killOfficer(ag.id, '群衆に殺された', false);
      const al = EV.live('アリストメネス', 'ptol'), cc = G.cty.ptol;
      if (al && cc && cc.alive && cc.josh !== al.id && !(EV.myC() === 'ptol' && G.me.rank === 'josh')) { const old = G.off[cc.josh]; if (old && !old.player && old.id !== al.id) old.ret = true; EV.vacate(al); al.r = 'josh'; cc.josh = al.id; }
      S.log('幼い王の後見として権勢をふるったアガトクレスが、怒ったアレクサンドリアの群衆に引き裂かれた。', 'big'); S.chron('アガトクレス、群衆に殺される。');
    } },
  { id: 'zama202', y: -202, m: 10, run: async () => {
      if (!EV.alive('rome') || !EV.alive('carth') || !S.atWar('rome', 'carth')) return;
      const sc = EV.live('スキピオ', 'rome'), hn = EV.live('ハンニバル', 'carth');
      if (!sc && !hn) return;
      const friend = (p) => G.prov[p] && (EV.owns('rome', p) || (G.cty[G.prov[p].o] && S.dip('rome', G.prov[p].o).st === 'ally'));
      if (!EV.AFRICA.concat(['cirta', 'carthago']).some(friend)) return;   // ローマはアフリカに足場がない
      const pid = ['sicca', 'byzacium', 'utica'].find(p => EV.owns('carth', p)) || W.capital('carth'); if (!pid) return;
      const from = S.adj(pid).find(friend) || EV.AFRICA.find(friend) || 'lilybaeum';
      const ms = EV.live('マシニッサ');
      const df = Math.max(40000, Math.round(Math.min(S.countryTroops('carth') * 0.4, 50000)));
      const win = await EV.histBattle({ id: 'zama202', title: 'ザマの戦い', pid, from, text: `決戦の前、${hn && sc ? 'ハンニバルとスキピオは両軍のあいだで会い、言葉を交わした。和はならなかった。' : ''}カルタゴは八十頭の戦象を先頭に立てる。スキピオは中隊のあいだに通り道をあけて象をやり過ごす構えだ。${ms ? 'ローマの側には、ヌミディア王マシニッサの騎兵六千がいる。' : ''}`, atk: { c: 'rome', troops: 40000, cmd: sc ? 'スキピオ' : '' }, def: { c: 'carth', troops: df, cmd: hn ? 'ハンニバル' : '' }, pAtk: 0.8 });
      G.flags.zama = win;
      if (win === 'carth') { EV.loseTroops('rome', 25000, from); EV.cede(EV.AFRICA.filter(p => EV.owns('rome', p)), 'carth', 0.3); S.log('ハンニバルがスキピオを破った！ ローマ軍はアフリカから退く。', 'big'); return; }
      if (win !== 'rome') return;
      EV.loseTroops('carth', Math.round(df * 0.7), pid);
      if (sc) sc.fame = (sc.fame || 0) + 200;
      S.log('戦象は通り道を駆け抜けていき、最後はローマとヌミディアの騎兵がカルタゴ軍の背後を突いた。ハンニバルの古参兵は一歩も退かずに討たれた。', 'big'); S.chron('ザマの戦い。スキピオ、ハンニバルを破る。');
      let ok = true;
      if (EV.isTopOf('carth')) ok = !!(await HOOK.choose({ title: 'スキピオの講和', seal: '国難', body: 'ハンニバル自身が「和を結ぶほかない」と言う。ローマの条件は重い。海の外の領地をすべて手放し、軍船は十隻に減らし、象を差し出し、銀一万タラントンを五十年かけて払い、ローマの許しなく戦争をしないこと。', choices: [{ v: 1, label: '和を結ぶ' }, { v: 0, label: '都にこもって最後まで戦う' }] }));
      if (!ok) return;
      const over = EV.IBERIA.concat(EV.SICILY, EV.ITALY, ['sardinia', 'corsica']).filter(p => EV.owns('carth', p));
      EV.cede(over, 'rome', 0.3);
      if (EV.alive('numi') && S.dip('rome', 'numi').st === 'ally') EV.cede(['sicca'].filter(p => EV.owns('carth', p)), 'numi', 0.3);
      EV.pay('carth', 'rome', 0.5);
      EV.peace('rome', 'carth', 600, -20);
      if (EV.alive('numi') && S.atWar('numi', 'carth')) EV.peace('numi', 'carth', 240, -30);
      const hg = EV.live('ハスドルバル（ギスコの子）'); if (hg) W.killOfficer(hg.id, '自害', false);
      S.log('カルタゴは和を結んだ。地中海の西はローマのものとなった。人々はスキピオを「アフリカヌス」と呼んだ。', 'big'); S.chron('第二次ポエニ戦争終わる。');
    } },

  /* ===== マケドニア戦争と東方 ===== */
  { id: 'panium200', y: -200, m: 7, run: async () => {
      if (!EV.alive('sele') || !EV.alive('ptol') || !S.atWar('sele', 'ptol')) return;
      const fr = EV.frontNear('ptol', 'sele', 'judaea'); if (!fr) return;
      const an = EV.live('アンティオコス三世', 'sele'), sk = EV.live('スコパス', 'ptol');
      const at = Math.round(Math.min(S.countryTroops('sele') * 0.3, 60000)), df = Math.round(Math.min(S.countryTroops('ptol') * 0.3, 40000));
      const win = await EV.histBattle({ id: 'panium200', title: 'パニオンの戦い', pid: fr.pid, from: fr.from, text: 'ヨルダン川の源、パンの神の洞窟のそばで、アンティオコスの重装騎兵と象が、スコパスの率いるエジプト軍に挑む。', atk: { c: 'sele', troops: at, cmd: an ? 'アンティオコス三世' : '' }, def: { c: 'ptol', troops: df, cmd: sk ? 'スコパス' : '' }, pAtk: 0.8 });
      if (win === 'sele') { EV.cede(EV.COELE.filter(p => EV.owns('ptol', p)), 'sele', 0.4); S.log('コイレ・シリアはセレウコス朝のものとなった。', 'big'); }
      else if (win === 'ptol') EV.loseTroops('sele', Math.round(at * 0.4), fr.from);
    } },
  { id: 'cynoscephalae197', y: -197, m: 6, run: async () => {
      if (!EV.alive('rome') || !EV.alive('mace') || !S.atWar('rome', 'mace')) return;
      const fr = EV.frontNear('mace', 'rome', 'thessalia'); if (!fr) return;
      const fl = EV.live('フラミニヌス', 'rome'), ph = EV.live('フィリッポス五世', 'mace');
      const df = Math.max(20000, Math.round(Math.min(S.countryTroops('mace') * 0.4, 26000)));
      const win = await EV.histBattle({ id: 'cynoscephalae197', title: 'キュノスケファライの戦い', pid: fr.pid, from: fr.from, weather: 'fog', text: '霧の「犬の頭」の丘で、両軍は思いがけずぶつかった。ファランクスの右翼が丘を駆け下り、ローマの左翼を押しまくる。だが左翼のファランクスは、まだ隊列が整っていない。', atk: { c: 'rome', troops: 26000, cmd: fl ? 'フラミニヌス' : '' }, def: { c: 'mace', troops: df, cmd: ph ? 'フィリッポス五世' : '' }, pAtk: 0.8 });
      if (win === 'mace') { EV.loseTroops('rome', 12000, fr.from); return; }
      if (win !== 'rome') return;
      EV.loseTroops('mace', Math.round(df * 0.5), fr.pid);
      S.log('名もない一人の軍団副官が、二十の中隊を率いてファランクスの背後に回った。長い槍は向きを変えられず、ファランクスは崩れた。', 'big'); S.chron('キュノスケファライの戦い。ローマ、マケドニアを破る。');
      let ok = true;
      if (EV.isTopOf('mace')) ok = !!(await HOOK.choose({ title: 'フラミニヌスの講和', seal: '国難', body: 'ローマは、マケドニアの軍がギリシアの町々から出ていくこと、千タラントンの賠償、王子を人質に出すことを求めている。', choices: [{ v: 1, label: '和を結ぶ（ギリシアを手放す）' }, { v: 0, label: '戦い続ける' }] }));
      if (!ok) return;
      EV.cede(EV.GREECE.filter(p => EV.owns('mace', p)), 'rome', 0.3);
      EV.pay('mace', 'rome', 0.25);
      EV.peace('rome', 'mace', 240, -10);
      S.log('マケドニアはギリシアから兵を引いた。', 'big'); S.chron('第二次マケドニア戦争終わる。');
    } },
  { id: 'hannibal196', y: -196, m: 5, run: async () => {
      const hn = EV.live('ハンニバル', 'carth'); if (!hn || !EV.alive('carth') || S.atWar('rome', 'carth')) return;
      G.cty.carth.gold += Math.round(S.countryPop('carth') * 10000 * 6);
      for (const p of S.ownedProvs('carth')) p.order = Math.min(100, p.order + 5);
      if (!EV.isTopOf('carth')) EV.crown(hn, 'carth', '（民会に選ばれ、国の財政を立て直す）');
      S.log('ハンニバルがスフェス（最高の役人）に選ばれ、私腹を肥やす長老たちを退けた。カルタゴは税を上げずに賠償金を払えるようになった。', 'big'); S.chron('ハンニバル、スフェスとなる。');
    } },
  { id: 'rosetta196', y: -196, m: 3, run: async () => {
      if (!EV.alive('ptol')) return;
      for (const p of S.ownedProvs('ptol')) if (['alexandria', 'memphis', 'thebais', 'pelusium'].includes(p.id)) { p.loyal = Math.min(100, p.loyal + 6); p.order = Math.min(100, p.order + 4); }
      S.log('メンフィスで若い王プトレマイオス五世の戴冠を祝い、神官たちが王の恵みをたたえる布告を出した。布告は神聖文字・民衆文字・ギリシア文字の三つで石に刻まれた。'); S.chron('メンフィスの布告（のちのロゼッタの石）。');
    } },
  { id: 'isthmia196', y: -196, m: 6, run: async () => {
      if (!EV.alive('rome')) return;
      const gr = EV.GREECE.filter(p => EV.owns('rome', p)); if (!gr.length) return;
      for (const pid of gr) { G.prov[pid].loyal = Math.min(100, G.prov[pid].loyal + 20); G.prov[pid].order = Math.min(100, G.prov[pid].order + 8); }
      const fl = EV.live('フラミニヌス', 'rome'); if (fl) fl.fame = (fl.fame || 0) + 80;
      S.log(`【イストミア祭】${fl ? 'フラミニヌス' : 'ローマの将'}がコリントスの競技場で「ギリシア人は自由である」と告げた。歓声があまりに大きく、空を飛ぶ鳥が落ちたという。`, 'big'); S.chron('ギリシア人の自由の宣言。');
    } },
  { id: 'hannibalexile195', y: -195, m: 7, run: async () => {
      const hn = EV.live('ハンニバル', 'carth'); if (!hn || !EV.alive('carth') || !EV.alive('sele') || S.atWar('rome', 'carth')) return;
      if (EV.isTopOf('carth')) { const k = await HOOK.choose({ title: 'ローマの使節', seal: '国難', who: hn, body: 'ローマの使節が来た。「ハンニバルはアンティオコス王と通じている。引き渡せ」', choices: [{ v: 0, label: 'ハンニバルを逃がす' }, { v: 1, label: 'ハンニバルをかばう（ローマとの仲が悪くなる）' }] }); if (k) { EV.rel('rome', 'carth', -30); return; } }
      EV.moveOff(hn, 'sele', 'gunshi', 'antiochia');
      const an = EV.live('アンティオコス三世', 'sele'); if (an && typeof PPL !== 'undefined') PPL.addRelBoth(an.id, hn.id, 20);
      S.log('ローマの使節が来ると知ったハンニバルは、夜のうちに馬で海辺へ走り、船でアンティオコス大王のもとへ逃れた。', 'big'); S.chron('ハンニバル、アンティオコスのもとへ亡命。');
    } },
  { id: 'cleopatra193', y: -193, m: 4, run: async () => {
      if (!EV.alive('sele') || !EV.alive('ptol')) return;
      if (S.atWar('sele', 'ptol')) EV.peace('sele', 'ptol', 120, 30); else EV.rel('sele', 'ptol', 30);
      S.log('アンティオコス大王の娘クレオパトラが、エジプトの若い王プトレマイオス五世に嫁いだ。', 'big'); S.chron('クレオパトラ一世、エジプト王に嫁ぐ。');
    } },
  { id: 'antiochus192', y: -192, m: 10, run: async () => {
      if (!EV.alive('sele') || !EV.alive('rome') || S.atWar('rome', 'sele')) return;
      const an = EV.live('アンティオコス三世', 'sele');
      if (EV.isTopOf('sele')) { const k = await HOOK.choose({ title: 'ギリシアへ', seal: '史実', body: 'アイトリア人が「ギリシアをローマから解き放ってほしい」と招いている。わずか一万の兵でギリシアへ渡るか。ハンニバルは「イタリアを突くべきだ」と言う。', choices: [{ v: 1, label: 'ギリシアへ渡る（ローマと開戦）' }, { v: 0, label: '渡らない' }] }); if (!k) return; }
      else if (!an || G.cty.sele.ruler !== an.id) return;
      EV.war('sele', 'rome');
      const tgt = ['aetolia', 'euboea', 'thessalia'].find(p => EV.owns('rome', p));
      if (tgt) { EV.cede([tgt], 'sele', 0.2); G.prov[tgt].troops += 10000; if (an) an.loc = tgt; }
      S.log('アンティオコス大王が一万の兵でギリシアに渡り、デメトリアスに上陸した。', 'big'); S.chron('アンティオコス三世、ギリシアへ渡る。');
    } },
  { id: 'nabis192', y: -192, m: 11, run: async () => {
      const nb = EV.live('ナビス'); if (!nb) return;
      W.killOfficer(nb.id, '暗殺', false);
      S.log('スパルタの僭主ナビスが、味方のはずのアイトリア人に暗殺された。'); S.chron('ナビス、暗殺される。');
    } },
  { id: 'thermopylae191', y: -191, m: 4, run: async () => {
      if (!EV.alive('rome') || !EV.alive('sele') || !S.atWar('rome', 'sele')) return;
      const pid = EV.GREECE.find(p => EV.owns('sele', p)); if (!pid) return;
      const from = S.adj(pid).find(q => EV.owns('rome', q) || (G.cty[G.prov[q].o] && S.dip('rome', G.prov[q].o).st === 'ally')) || S.adj(pid)[0];
      const gl = EV.live('アキリウス・グラブリオ', 'rome'), ca = EV.live('カトー', 'rome'), an = EV.live('アンティオコス三世', 'sele');
      const win = await EV.histBattle({ id: 'thermopylae191', title: 'テルモピュライの戦い', pid, from, text: `アンティオコスは、かつてスパルタの三百人が戦った狭い峠に陣を敷いた。${ca ? 'カトーが夜の山道を回り込み、背後の峰を奪いに向かう。' : ''}`, atk: { c: 'rome', troops: 22000, cmd: gl ? 'アキリウス・グラブリオ' : '' }, def: { c: 'sele', troops: Math.max(10000, G.prov[pid].troops), cmd: an ? 'アンティオコス三世' : '' }, pAtk: 0.85 });
      if (win !== 'rome') return;
      EV.cede(EV.GREECE.filter(p => EV.owns('sele', p)), 'rome', 0.3);
      if (an) an.loc = W.capital('sele');
      if (ca) ca.fame = (ca.fame || 0) + 40;
      S.log('背後の峰から現れたローマ兵に、アンティオコスの軍は総崩れとなった。大王はわずかな兵とアジアへ逃げ帰った。', 'big'); S.chron('テルモピュライの戦い。アンティオコス、ギリシアから逃れる。');
    } },
  { id: 'magnesia190', y: -190, m: 12, run: async () => {
      if (!EV.alive('rome') || !EV.alive('sele') || !S.atWar('rome', 'sele')) return;
      const pid = ['lydia', 'ionia', 'pergamon', 'phrygia'].find(p => EV.owns('sele', p)); if (!pid) return;
      const from = S.adj(pid).find(q => EV.owns('rome', q)) || S.adj(pid).find(q => G.prov[q].o !== 'sele') || 'thracia';
      const ls = EV.live('ルキウス・スキピオ', 'rome'), sc = EV.live('スキピオ', 'rome'), an = EV.live('アンティオコス三世', 'sele');
      if (EV.live('ハンニバル', 'sele')) S.log('この夏、ハンニバルの率いたアンティオコスの艦隊は、エウリュメドン川の沖でロドスの艦隊に敗れた。');
      const df = Math.max(50000, Math.round(Math.min(S.countryTroops('sele') * 0.45, 72000)));
      const win = await EV.histBattle({ id: 'magnesia190', title: 'マグネシアの戦い', pid, from, weather: 'fog', text: `シピュロス山のふもとで、${ls ? 'ルキウス・スキピオ' : 'ローマ軍'}が七万の大王の軍に挑む。${sc ? '兄のアフリカヌスは病の床にあり、助言だけを送った。' : ''}大王の軍には鎌戦車、戦象、重装騎兵、ラクダに乗った弓兵まで並ぶ。`, atk: { c: 'rome', troops: 30000, cmd: ls ? 'ルキウス・スキピオ' : (sc ? 'スキピオ' : '') }, def: { c: 'sele', troops: df, cmd: an ? 'アンティオコス三世' : '' }, pAtk: 0.8 });
      G.flags.magnesia = win;
      if (win === 'sele') { EV.loseTroops('rome', 15000, from); return; }
      if (win !== 'rome') return;
      EV.loseTroops('sele', Math.round(df * 0.6), pid);
      if (ls) ls.fame = (ls.fame || 0) + 100;
      S.log(`鎌戦車は散兵の投げ槍に馬を倒されて味方の中へ暴れ込み、大王の軍は崩れた。${ls ? 'ルキウスは「アシアティクス」と呼ばれるようになった。' : ''}`, 'big'); S.chron('マグネシアの戦い。ローマ、アンティオコスを破る。');
    } },
  { id: 'apamea188', y: -188, m: 6, run: async () => {
      if (!EV.alive('rome') || !EV.alive('sele') || !S.atWar('rome', 'sele') || G.flags.magnesia !== 'rome') return;
      let ok = true;
      if (EV.isTopOf('sele')) ok = !!(await HOOK.choose({ title: 'アパメイアの和約', seal: '国難', body: 'ローマは、タウロス山脈より西の小アジアをすべて手放し、一万五千タラントンを払い、象と艦隊を差し出し、ハンニバルを引き渡せと言う。', choices: [{ v: 1, label: '和を結ぶ' }, { v: 0, label: '戦い続ける' }] }));
      if (!ok) return;
      EV.cede(EV.ASIA.filter(p => EV.owns('sele', p)), 'rome', 0.3);
      EV.pay('sele', 'rome', 0.4);
      EV.peace('rome', 'sele', 240, -10);
      const hn = EV.live('ハンニバル', 'sele'); if (hn) { hn.ret = true; S.log('ハンニバルはクレタへ、さらにビテュニアへと逃れた。', 'big'); }
      S.log('アパメイアの和約。セレウコス朝は小アジアを失った。ペルガモンとロドスが、ローマの友として栄える。', 'big'); S.chron('アパメイアの和約。');
    } },
  { id: 'scipiotrial187', y: -187, m: 3, run: async () => {
      const sc = EV.live('スキピオ', 'rome'), ca = EV.live('カトー', 'rome'); if (!sc || !ca) return;
      if (typeof PPL !== 'undefined') PPL.addRelBoth(sc.id, ca.id, -20);
      S.log('カトーの一派が、アンティオコスから受け取った金の行方をめぐってスキピオ兄弟を訴えた。アフリカヌスは帳簿を人々の前で破り捨て、「今日はザマで勝った日だ。神々に感謝しに行こう」と言って立ち去った。', 'big'); S.chron('スキピオ兄弟の裁判。');
    } },
  { id: 'antiochus187', y: -187, m: 7, run: async () => {
      const an = EV.live('アンティオコス三世', 'sele'); if (!an) return;
      W.killOfficer(an.id, '神殿を襲って討たれた', false);
      S.chron('アンティオコス大王、エリュマイスで神殿の宝を奪おうとして殺される。');
    } },
  { id: 'cato184', y: -184, m: 3, run: async () => {
      const ca = EV.live('カトー', 'rome'); if (!ca || !EV.alive('rome')) return;
      const cc = G.cty.rome;
      if (cc.ruler === ca.id || cc.josh === ca.id || cc.gyos === ca.id) return;
      if (EV.myC() === 'rome' && G.me.rank === 'gyos') { S.log('カトーが監察官の座を狙っている。'); return; }
      const old = G.off[cc.gyos]; if (old && old.id !== ca.id && !old.player) old.ret = true;
      EV.vacate(ca); ca.r = 'gyos'; ca.carStop = true; cc.gyos = ca.id;
      for (const p of S.ownedProvs('rome')) p.order = Math.min(100, p.order + 4);
      const fm = EV.live('フラミニヌス', 'rome'); if (fm && typeof PPL !== 'undefined') PPL.addRelBoth(fm.id, ca.id, -25);
      S.log('カトーが監察官（ケンソル）に選ばれた。贅沢な品に重い税をかけ、ふるまいの悪い元老院議員を名簿から外した。フラミニヌスの弟も追い出された。', 'big'); S.chron('カトー、監察官となる。');
    } },
  { id: 'three183', y: -183, m: 6, run: async () => {
      const out = [];
      const hn = EV.histOff('ハンニバル'); if (hn && hn.alive && !hn.player) { W.killOfficer(hn.id, '毒をあおいで自害', false); out.push('ローマの引き渡し要求に追い詰められたハンニバルが、ビテュニアで「ローマ人の長い心配を終わらせてやろう」と毒をあおいだ'); }
      const sc = EV.histOff('スキピオ'); if (sc && sc.alive && !sc.player) { W.killOfficer(sc.id, '病没', false); out.push('スキピオ・アフリカヌスがリテルヌムの別荘で世を去った。墓には「恩知らずの祖国よ、お前はわが骨を持つことはない」と刻ませた'); }
      const ph = EV.histOff('フィロポイメン'); if (ph && ph.alive && !ph.player) { W.killOfficer(ph.id, '毒殺', false); out.push('「最後のギリシア人」フィロポイメンがメッセネ人に捕らえられ、毒を飲まされた'); }
      if (!out.length) return;
      S.log(`【三人の将の死】${out.join('。')}。`, 'big'); S.chron('ハンニバル、スキピオ、フィロポイメンが同じ年に世を去る。');
    } },
  { id: 'demetrius180', y: -180, m: 5, run: async () => {
      const dm = EV.live('デメトリオス（王子）', 'mace'), pe = EV.live('ペルセウス', 'mace'); if (!dm || !pe) return;
      if (EV.isKing('mace')) {
        const k = await HOOK.choose({ title: '王子の密告', seal: '密議', who: pe, body: 'ペルセウスが「弟デメトリオスはローマと通じ、王位を狙っています」と、フラミニヌスの手紙を見せた。', choices: [{ v: 0, label: 'デメトリオスを除く' }, { v: 1, label: '手紙を疑い、調べさせる' }] });
        if (k) { if (U.ch(0.6)) { S.log('手紙は偽物だった。', 'good'); pe.bond = (pe.bond || 0) - 20; } return; }
      }
      W.killOfficer(dm.id, '毒殺', false);
      S.log('ローマ寄りの王子デメトリオスが、兄ペルセウスの偽の手紙を信じた父王に殺された。のちに手紙が偽りと知ったフィリッポスは、ひどく悔やんだという。', 'big'); S.chron('マケドニアの王子デメトリオス、殺される。');
    } },
  { id: 'philip179', y: -179, m: 8, run: async () => {
      const ph = EV.live('フィリッポス五世', 'mace'); if (!ph) return;
      W.killOfficer(ph.id, '病没', false);
      S.chron('フィリッポス五世没。');
    } },
  { id: 'heliodorus175', y: -175, m: 9, run: async () => {
      const s4 = EV.live('セレウコス四世', 'sele'); if (!s4 || G.cty.sele.ruler !== s4.id) return;
      const he = EV.live('ヘリオドロス', 'sele'); if (he) he.ret = true;
      W.killOfficer(s4.id, '暗殺', false);
      S.log('セレウコス四世が大臣ヘリオドロスに暗殺された。ローマで人質となっていた弟のアンティオコスが戻り、王位を奪った。', 'big'); S.chron('セレウコス四世、暗殺される。');
    } },
  { id: 'pydna168', y: -168, m: 6, run: async () => {
      if (!EV.alive('rome') || !EV.alive('mace') || !S.atWar('rome', 'mace')) return;
      const fr = EV.frontNear('mace', 'rome', 'pella'); if (!fr) return;
      const pa = EV.live('アエミリウス・パウルス（子）', 'rome'), pe = EV.live('ペルセウス', 'mace'), sg = EV.live('スルピキウス・ガッルス', 'rome');
      S.log(`ピュドナの前の夜、月が欠けて赤く染まった。${sg ? '軍団副官スルピキウス・ガッルスが「これは自然の理で、前もってわかることだ」と兵に説いていたので、ローマ兵は落ち着いていた。' : 'マケドニアの兵は凶兆におびえた。'}`, 'big');
      const df = Math.max(30000, Math.round(Math.min(S.countryTroops('mace') * 0.5, 43000)));
      const win = await EV.histBattle({ id: 'pydna168', title: 'ピュドナの戦い', pid: fr.pid, from: fr.from, text: 'ファランクスの長槍の林が、ローマの軍団を押し返す。だが平らでない地面で、ファランクスの列に隙間ができはじめた。', atk: { c: 'rome', troops: 38000, cmd: pa ? 'アエミリウス・パウルス（子）' : '' }, def: { c: 'mace', troops: df, cmd: pe ? 'ペルセウス' : '' }, pAtk: 0.85 });
      if (win === 'mace') { EV.loseTroops('rome', 15000, fr.from); return; }
      if (win !== 'rome') return;
      EV.loseTroops('mace', Math.round(df * 0.6), fr.pid);
      if (pa) pa.fame = (pa.fame || 0) + 150;
      S.log('ローマの中隊がファランクスの隙間に切り込み、長槍は役に立たなくなった。二万のマケドニア兵が討たれた。', 'big'); S.chron('ピュドナの戦い。');
      let give = true;
      if (EV.isTopOf('mace')) give = !!(await HOOK.choose({ title: 'ピュドナの後', seal: '国難', body: 'ファランクスは崩れた。町々はローマに降りはじめている。', choices: [{ v: 1, label: '降伏する（王国の終わり）' }, { v: 0, label: '残った兵で戦い続ける' }] }));
      if (!give) { EV.cede([fr.pid], 'rome', 0.3); return; }
      if (pe) { pe.ret = true; S.log('ペルセウスは捕らえられ、ローマの凱旋式で引き回された。', 'big'); }
      EV.pay('mace', 'rome', 0.8);
      EV.cede(S.ownedProvs('mace').map(p => p.id), 'rome', 0.3);
      S.log('アレクサンドロス大王の国、マケドニアの王国は終わった。ローマに運ばれた王の財宝はあまりに多く、ローマ市民はこの後、税を払わずにすむようになった。', 'big'); S.chron('マケドニア王国滅ぶ。');
    } },
  { id: 'eleusis168', y: -168, m: 7, run: async () => {
      if (!EV.alive('sele') || !EV.alive('ptol') || !EV.alive('rome')) return;
      const egypt = ['alexandria', 'memphis', 'pelusium', 'thebais'].filter(p => EV.owns('sele', p));
      if (!S.atWar('sele', 'ptol') && !egypt.length) return;
      const pl = EV.live('ポピリウス・ラエナス', 'rome');
      let obey = true;
      if (EV.isTopOf('sele')) obey = !!(await HOOK.choose({ title: 'エレウシスの日', seal: '国難', who: pl || undefined, body: `アレクサンドリアの郊外エレウシスで、ローマの使節${pl ? 'ポピリウス・ラエナス' : ''}が元老院の決議を突きつけた。「エジプトから出ていけ」。考えさせてほしいと言うと、使節は杖で王のまわりの砂に円を描いた。「この円から出る前に答えよ」`, choices: [{ v: 1, label: 'ローマの言うとおりにする' }, { v: 0, label: '拒む（ローマと戦争になる）' }] }));
      if (!obey) { EV.war('rome', 'sele'); return; }
      EV.cede(egypt, 'ptol', 0.4);
      EV.peace('sele', 'ptol', 120, -20);
      if (pl) pl.fame = (pl.fame || 0) + 80;
      S.log('【エレウシスの日】ローマの使節が砂に描いた円の中で、アンティオコス四世は「元老院の言うとおりにしよう」と答え、エジプトから兵を引いた。', 'big'); S.chron('エレウシスの日。');
    } },
  { id: 'polybius167', y: -167, m: 3, run: async () => {
      const po = EV.live('ポリュビオス'); if (!po || !EV.alive('rome')) return;
      if (po.c !== 'rome') EV.moveOff(po, 'rome', 'gunshi'); else { po.r = 'gunshi'; po.carStop = true; }
      const ae = EV.live('小スキピオ', 'rome'); if (ae && typeof PPL !== 'undefined') PPL.addRelBoth(po.id, ae.id, 40);
      S.log('アカイアの名士千人が人質としてイタリアへ送られた。その一人ポリュビオスは、パウルスの息子・小スキピオと親しくなり、ローマがなぜ五十三年で世界の主になったのかを書きはじめた。', 'big'); S.chron('ポリュビオス、人質としてローマへ。');
    } },
  { id: 'maccabees167', y: -167, m: 12, run: async () => {
      if (!EV.alive('sele') || !EV.owns('sele', 'judaea')) return;
      await EV.rebellion('sele', 'judaea', 12000, 'マカバイの反乱', 'イェルサレムの神殿にギリシアの神を祀らせたことに怒り、祭司マタティアとその子ユダ・マカバイが山にこもって反乱を起こした！');
    } },

  /* ===== 第三次ポエニ戦争とギリシア ===== */
  { id: 'cato153', y: -153, m: 5, run: async () => {
      const ca = EV.live('カトー', 'rome'); if (!ca || !EV.alive('carth') || !EV.alive('rome')) return;
      EV.rel('rome', 'carth', -30);
      const ns = EV.live('スキピオ・ナシカ', 'rome');
      if (EV.myC() === 'rome' && S.tier() >= 6) {
        const k = await HOOK.choose({ title: 'カルタゴは滅ぶべし', seal: '史実', who: ca, body: `アフリカから戻ったカトーが、元老院でみずみずしいイチジクを見せた。「これは三日前にカルタゴで摘んだものだ。それほど近くに、あれほど栄えた敵がいる」。${ns ? 'ナシカは「強い敵がいるからこそローマは引き締まっている」と、カルタゴを残せと言う。' : ''}`, choices: [{ v: 'cato', label: 'カトーに賛成する' }, { v: 'nasica', label: 'カルタゴを残すべきだと言う' }, { v: 0, label: 'どちらにもつかない' }] });
        if (k === 'cato') { ca.bond = (ca.bond || 0) + 15; if (ns) ns.bond = (ns.bond || 0) - 10; }
        if (k === 'nasica') { ca.bond = (ca.bond || 0) - 15; if (ns) ns.bond = (ns.bond || 0) + 15; EV.rel('rome', 'carth', 15); }
      }
      S.log('「カルタゴは滅ぼされねばならぬ」――カトーは元老院で演説するたびに、何を論じていてもこう締めくくった。', 'big'); S.chron('カトー「カルタゴは滅ぼされねばならぬ」。');
    } },
  { id: 'oroscopa151', y: -151, m: 6, run: async () => {
      if (!EV.alive('carth') || !EV.alive('numi') || S.atWar('carth', 'numi')) return;
      const fr = EV.frontNear('numi', 'carth', 'sicca'); if (!fr) return;
      if (EV.isTopOf('carth')) { const k = await HOOK.choose({ title: 'マシニッサとの戦い', seal: '国難', body: '九十歳近いマシニッサが、またカルタゴの土地を奪った。ローマとの講和は「ローマの許しなく戦争をしない」と定めている。それでも戦うか。', choices: [{ v: 1, label: '兵を挙げる（ローマを怒らせる）' }, { v: 0, label: '耐える' }] }); if (!k) return; }
      EV.war('carth', 'numi');
      const at = Math.round(Math.min(S.countryTroops('carth') * 0.35, 58000)), df = Math.round(Math.min(S.countryTroops('numi') * 0.35, 50000));
      const win = await EV.histBattle({ id: 'oroscopa151', title: 'オロスコパの戦い', pid: fr.pid, from: fr.from, text: '老いたマシニッサが、鞍もなしに馬に乗って自ら兵を率いる。', atk: { c: 'carth', troops: at, cmd: 'ハスドルバル（最後の将）' }, def: { c: 'numi', troops: df, cmd: 'マシニッサ' }, pAtk: 0.2 });
      if (win === 'numi') { EV.loseTroops('carth', Math.round(at * 0.6), fr.from); EV.peace('carth', 'numi', 60, -40); }
      else if (win === 'carth') EV.cede([fr.pid], 'carth', 0.3);
      EV.rel('rome', 'carth', -40); G.flags.casusBelli = G.year;
      S.log('カルタゴが講和の定めを破ってマシニッサと戦ったことを、ローマは戦争の口実にした。', 'big'); S.chron('カルタゴ、マシニッサと戦う。');
    } },
  { id: 'carthage149', y: -149, m: 3, run: async () => {
      if (!EV.alive('rome') || !EV.alive('carth')) return;
      let resist = true;
      if (EV.isTopOf('carth')) resist = !!(await HOOK.choose({ title: 'ローマの最後通告', seal: '国難', body: 'ローマの大軍がウティカに上陸した。カルタゴは言われるまま人質三百人を送り、鎧二十万と投石機二千を差し出した。すると執政官が告げた。「町を捨て、海から十マイル離れた所に住め」', choices: [{ v: 1, label: '拒む。武器を作り直し、最後まで戦う' }, { v: 0, label: '従う（カルタゴはローマに降る）' }] }));
      EV.loseTroops('carth', Math.round(S.countryTroops('carth') * 0.3), W.capital('carth'));
      if (!resist) { EV.cede(S.ownedProvs('carth').map(p => p.id), 'rome', 0.2); S.log('カルタゴの人々は町を捨てた。', 'big'); return; }
      EV.war('rome', 'carth');
      if (EV.owns('carth', 'utica')) EV.cede(['utica'], 'rome', 0.5);
      const cap = W.capital('carth'); if (cap) { G.prov[cap].troops += 30000; G.prov[cap].wall = Math.min(100, G.prov[cap].wall + 20); }
      S.log('「町を捨てよ」という命令に、カルタゴの人々は立ち上がった。神殿も広場も工房になり、昼も夜も剣と盾が作られた。女たちは髪を切って投石機の綱にした。ウティカはローマについた。', 'big'); S.chron('第三次ポエニ戦争はじまる。');
    } },
  { id: 'andriscus149', y: -149, m: 6, run: async () => {
      if (EV.alive('mace') || !EV.alive('rome') || !EV.owns('rome', 'pella')) return;
      await EV.rebellion('rome', 'pella', 25000, '偽フィリッポスの乱', 'ペルセウスの子フィリッポスを名乗るアンドリスコスが、トラキア人の兵を連れてマケドニアに現れ、王を名乗った！');
      const mt = EV.live('メテッルス', 'rome'); if (mt) mt.fame = (mt.fame || 0) + 60;
    } },
  { id: 'masinissa148', y: -148, m: 12, run: async () => {
      const ms = EV.live('マシニッサ', 'numi'); if (!ms) return;
      W.killOfficer(ms.id, '九十歳で没', false);
      S.log('ヌミディアのマシニッサが九十歳で世を去った。死の前に小スキピオを呼び、王国を三人の息子に分けるよう頼んだ。', 'big'); S.chron('マシニッサ、九十歳で没す。');
    } },
  { id: 'carthage146', y: -146, m: 4, run: async () => {
      if (!EV.alive('rome') || !EV.alive('carth') || !S.atWar('rome', 'carth')) return;
      const cap = W.capital('carth'); if (!cap) return;
      const from = S.adj(cap).find(q => EV.owns('rome', q) || (G.cty[G.prov[q].o] && S.dip('rome', G.prov[q].o).st === 'ally')) || 'lilybaeum';
      const ae = EV.live('小スキピオ', 'rome'), hd = EV.live('ハスドルバル（最後の将）', 'carth');
      const at = Math.round(Math.min(S.countryTroops('rome') * 0.1, 40000));
      const win = await EV.histBattle({ id: 'carthage146', title: 'カルタゴ陥落', pid: cap, from, text: `${ae ? '小スキピオ' : 'ローマ軍'}が港の防壁を破り、町へ攻め入る。六日六晩、家々の屋根から屋根へ戦いが続く。`, atk: { c: 'rome', troops: at, cmd: ae ? '小スキピオ' : '' }, def: { c: 'carth', troops: Math.max(20000, G.prov[cap].troops), cmd: hd ? 'ハスドルバル（最後の将）' : '' }, pAtk: 0.85 });
      if (win === 'carth') { EV.loseTroops('rome', Math.round(at * 0.4), from); return; }
      if (win !== 'rome') return;
      const p = G.prov[cap]; p.pop = Math.max(5, Math.round(p.pop * 0.2)); p.comm = 5; p.agri = Math.max(5, p.agri - 20); p.wall = 10;
      const po = EV.live('ポリュビオス');
      S.log(`カルタゴは焼かれ、生き残った五万人は奴隷として売られた。${hd ? '最後まで戦ったハスドルバルは降り、その妻は子どもとともに燃える神殿に身を投げた。' : ''}${ae ? '燃える町を見つめた小スキピオは涙を流し、ホメロスの詩を口ずさんだ。「いつの日か、聖なるイリオスも滅びるだろう」' : ''}${po && ae ? '――そばにいたポリュビオスに、彼は「いつかローマにも同じ日が来るのではないか」と言った。' : ''}`, 'big');
      EV.cede(S.ownedProvs('carth').map(x => x.id), 'rome', 0.2);
      if (hd && hd.alive && !hd.player) hd.ret = true;
      S.chron('カルタゴ滅亡。');
    } },
  { id: 'corinth146', y: -146, m: 9, run: async () => {
      if (!EV.alive('rome') || !EV.owns('rome', 'corinth')) return;
      await EV.rebellion('rome', 'corinth', 20000, 'アカイア戦争', 'アカイア同盟がローマに逆らい、コリントスに兵を集めた！');
      const p = G.prov.corinth; p.pop = Math.max(5, Math.round(p.pop * 0.5)); p.comm = Math.max(5, p.comm - 25);
      const mu = EV.live('ムンミウス', 'rome'); if (mu) mu.fame = (mu.fame || 0) + 60;
      S.log('ムンミウスはコリントスを焼き払い、町の美術品を船でローマへ運んだ。同じ年、カルタゴとコリントスという二つの古い都が地上から消えた。', 'big'); S.chron('コリントス、ローマに焼かれる。');
    } },
];
EV.hist.sort((a, b) => a.y - b.y || a.m - b.m);
// 後から世に出る史実の人物
EV.spawnHist = () => {
  if (G.month !== 1 || (G.custom && G.custom.hist === false)) return;
  G.flags.histSpawn = G.flags.histSpawn || {};
  for (const h of D.HIST) {
    if (!h[14] || h[14] > G.year || G.flags.histSpawn[h[0]]) continue;
    if (h[11] && h[11] < G.year) continue;   // シナリオの年にはもう亡い
    G.flags.histSpawn[h[0]] = G.turn || -1;
    if (Object.values(G.off).some(o => o.hist && o.n === h[0])) continue;
    let c = h[1];
    if (!EV.alive(c)) { const alive = D.CORDER.filter(EV.alive); if (!alive.length) continue; c = U.pick(alive); }
    const o = S.histOfficerSafe(h, c);
    if (o) { EV.afterSpawn(o); S.log(`${S.cname(o.c)}に${o.n}が現れた（${D.RANKS[o.r].name}）。`, o.c === EV.myC() ? 'good' : 'info'); }
  }
};
S.histOfficerSafe = (h, c) => { try { const hh = h.slice(); hh[1] = c; return S.histOfficer(hh, true); } catch (e) { console.error(e); return null; } };

/* ---------- 日々の出来事（追加） ---------- */
EV.generic.push(
  { id: 'festival', w: () => 0.6 + (G.me.land.fac.shrine || 0) * 1.2, run: async () => {
      const me = G.me, L = me.land, cost = Math.round(300 * S.tier() + L.hh * 2);
      const k = await HOOK.choose({ title: '村祭り', body: '秋の実りを祝う祭りが開かれる。民は領主の顔を見たがっている。', choices: [{ v: 1, label: `酒と肉を振る舞う（金${U.fmt(cost)}）`, disabled: me.gold < cost }, { v: 0, label: '顔だけ出す' }] });
      if (k) { me.gold -= cost; L.loyal = Math.min(100, L.loyal + 8); me.fame += 3; if (me.jur) A.jurAdd('loyal', 3); S.log('祭りは大いに賑わった。', 'good'); }
      else { L.loyal = Math.min(100, L.loyal + 2); }
    } },
  { id: 'omen', w: 0.9, run: async () => {
      const me = G.me, o = S.myOff();
      const what = U.pick(['日食', '彗星', '赤い月', '季節外れの雪']);
      const k = await HOOK.choose({ title: '天の兆し', body: `${what}が現れた。民は「神々がお怒りだ。何か悪いことが起こる」と恐れている。`, choices: [{ v: 'rite', label: `祭祀を行い、民を鎮める（金${U.fmt(200 * S.tier())}）`, disabled: me.gold < 200 * S.tier() }, { v: 'reason', label: '「天の運行にすぎぬ」と説く', sub: '知力しだい' }, { v: 0, label: '捨て置く' }] });
      if (k === 'rite') { me.gold -= 200 * S.tier(); G.prov[me.loc].order = Math.min(100, G.prov[me.loc].order + 3); me.land.loyal = Math.min(100, me.land.loyal + 3); }
      else if (k === 'reason') { if (U.ch(S.stat(o, 'chi') / 120)) { me.exp.chi += 30; me.fame += 4; S.log('理を説いて民の動揺を鎮めた。', 'good'); } else { me.land.loyal = Math.max(5, me.land.loyal - 3); S.log('民は納得しなかった。', 'bad'); } }
      else { G.prov[me.loc].order = Math.max(5, G.prov[me.loc].order - 2); }
    } },
  { id: 'quake', w: 0.4, run: async () => {
      const me = G.me, p = G.prov[me.loc];
      p.wall = Math.max(5, p.wall - U.ri(4, 12)); p.agri = Math.max(5, p.agri - U.ri(1, 4));
      if (me.jur) { A.jurAdd('def', -6); A.jurAdd('loyal', -2); }
      const fixc = Math.round(500 * S.tier());
      const k = await HOOK.choose({ title: '地震', body: `${S.P[me.loc].name}で大きな地震があり、城壁や家々が崩れた。`, choices: [{ v: 1, label: `私財で復旧を助ける（金${U.fmt(fixc)}）`, disabled: me.gold < fixc }, { v: 0, label: '役所に任せる' }] });
      if (k) { me.gold -= fixc; p.wall = Math.min(100, p.wall + 6); me.fame += 5; if (me.jur) A.jurAdd('loyal', 4); }
    } },
  { id: 'drought', w: () => (G.month >= 5 && G.month <= 7 && S.P[G.me.loc].y < 400) ? 2.2 : 0, run: async () => {
      const me = G.me, p = G.prov[me.loc];
      if (!me.jur) { p.agri = Math.max(5, p.agri - 3); await HOOK.info({ title: '日照り', body: `${S.P[me.loc].name}は日照りが続き、作物が枯れはじめた。` }); return; }
      const cost = Math.round(me.jur.hh * 0.6);
      const k = await HOOK.choose({ title: '日照り', body: `${me.jur.name}で日照りが続いている。`, choices: [{ v: 'well', label: `井戸を掘らせる（金${U.fmt(cost)}）`, disabled: me.gold < cost }, { v: 'rain', label: '雨乞いの祭りを開く' }, { v: 0, label: '耐えさせる' }] });
      if (k === 'well') { me.gold -= cost; A.jurAdd('agri', 1); A.jurAdd('loyal', 3); }
      else if (k === 'rain') { if (U.ch(0.35)) { A.jurAdd('loyal', 4); S.log('祭りの三日後、雨が降った！', 'good'); } else { A.jurAdd('agri', -3); A.jurAdd('loyal', -1); } }
      else { A.jurAdd('agri', -4); A.jurAdd('loyal', -3); }
    } },
  { id: 'horsetrader', w: () => S.isMil() ? 1.3 : 0.4, run: async () => {
      const me = G.me, hk = EV.horseKey(), H = D.ITEMS[hk], price = Math.round(H.price * 0.6);
      const k = await HOOK.choose({ title: '馬商人', body: `遠くから来た馬商人が、よく肥えた${H.n}を連れている。${H.d || ''}`, choices: [{ v: 'buy', label: `${H.n}を買う（金${U.fmt(price)}）`, disabled: me.gold < price }, { v: 'herd', label: '騎兵の馬をまとめて買う', sub: '騎兵の練度+', disabled: me.gold < price * 2 || !me.army.sq.some(s => ['lcav', 'hcav', 'harch'].includes(s.t)) }, { v: 0, label: '見送る' }] });
      if (k === 'buy') { me.gold -= price; me.items.push(hk); S.log(`${H.n}を手に入れた。`, 'good'); }
      if (k === 'herd') { me.gold -= price * 2; for (const s of me.army.sq) if (['lcav', 'hcav', 'harch'].includes(s.t)) s.tr = Math.min(100, s.tr + 6); S.log('騎兵の馬を入れ替えた。', 'good'); }
    } },
  { id: 'swordsmith', w: 0.8, run: async () => {
      const me = G.me;
      const rares = Object.keys(D.ITEMS).filter(k => D.ITEMS[k].rare && !me.items.includes(k) && D.ITEMS[k].k === 'weapon');
      if (!rares.length) return;
      const it = U.pick(rares), price = Math.round(D.ITEMS[it].price * U.rf(0.55, 0.85));
      const k = await HOOK.choose({ title: '名工', body: `流浪の鍛冶師が「${D.ITEMS[it].n}」を携えてきた。${D.ITEMS[it].d}`, choices: [{ v: 1, label: `買い取る（金${U.fmt(price)}）`, disabled: me.gold < price }, { v: 0, label: '断る' }] });
      if (k) { me.gold -= price; me.items.push(it); S.log(`${D.ITEMS[it].n}を手に入れた！`, 'good'); }
    } },
  { id: 'enemydeserter', w: () => D.CORDER.some(c => c !== S.myOff().c && S.atWar(S.myOff().c, c)) ? 1.4 : 0, run: async () => {
      const me = G.me, o = S.myOff();
      const foe = D.CORDER.find(c => c !== o.c && EV.alive(c) && S.atWar(o.c, c));
      if (!foe) return;
      const k = await HOOK.choose({ title: '敵の脱走兵', body: `${S.cname(foe)}の陣から逃げてきた兵が、敵の内情を話したいと言う。`, choices: [{ v: 'intel', label: '話を聞く', sub: '数か月、敵の様子がわかる' }, { v: 'recruit', label: '自分の兵に加える' }, { v: 0, label: '間者かもしれない、追い返す' }] });
      if (k === 'intel') { if (U.ch(0.8)) { me.flags.spy = G.turn + 3; S.log('敵の配置がわかった（3か月）。', 'good'); } else { S.log('偽の情報をつかまされた。', 'bad'); } }
      if (k === 'recruit') { let sq = me.army.sq.find(s => s.pv && s.t === 'inf'); if (!sq) { sq = S.newSquad('inf', 0, { pv: true, tr: 40 }); me.army.sq.push(sq); } const n = U.ri(3, 12) * Math.max(1, S.tier() - 1); sq.n += n; sq.max = Math.max(sq.max, sq.n); S.log(`脱走兵${n}人が加わった。`); }
    } },
  { id: 'banditsurrender', w: () => G.me.jur && G.me.jur.bandits > 0 ? 1.5 : 0, run: async () => {
      const me = G.me, j = me.jur;
      const n = U.ri(8, 30) * Math.max(1, j.bandits);
      const k = await HOOK.choose({ title: '盗賊の帰順', body: `${j.name}の盗賊の頭目が「足を洗いたい」と申し出てきた。手下は${n}人ほど。`, choices: [{ v: 'army', label: '私兵として召し抱える' }, { v: 'farm', label: '土地を与えて農に戻す' }, { v: 'punish', label: '捕らえて罰する' }] });
      j.bandits = Math.max(0, j.bandits - 1);
      if (k === 'army') { let sq = me.army.sq.find(s => s.pv && s.t === 'inf'); if (!sq) { sq = S.newSquad('inf', 0, { pv: true, tr: 30 }); me.army.sq.push(sq); } sq.n += n; sq.max = Math.max(sq.max, sq.n); A.jurAdd('order', -2); }
      if (k === 'farm') { j.hh += Math.round(n / 2); A.jurAdd('order', 3); A.jurAdd('loyal', 2); }
      if (k === 'punish') { A.jurAdd('order', 6); A.jurAdd('loyal', -2); me.fame += 2; }
      W.learn('bandit');
    } },
  { id: 'refugees', w: () => G.me.jur && D.CORDER.some(c => c !== S.myOff().c && S.atWar(S.myOff().c, c)) ? 1.2 : 0, run: async () => {
      const me = G.me, j = me.jur, n = U.ri(60, 300) * Math.max(1, S.tier() - 2), food = Math.round(n * 1.5);
      const k = await HOOK.choose({ title: '流民', body: `戦乱を逃れた流民およそ${U.num(n)}人が${j.name}にたどり着いた。`, choices: [{ v: 1, label: `受け入れて兵糧を分ける（兵糧${U.num(food)}袋）`, disabled: me.food < food }, { v: 0, label: '追い返す' }] });
      if (k) { me.food -= food; j.hh += Math.round(n / 4); A.jurAdd('loyal', 2); me.fame += 3; } else { A.jurAdd('order', 1); }
    } },
  { id: 'lawsuit', w: () => G.me.jur ? 1.3 : 0, run: async () => {
      const me = G.me, o = S.myOff();
      const rich = S.genName().n, poor = S.genName().n, bribe = Math.round(300 * S.tier() + me.jur.hh * 0.05);
      const k = await HOOK.choose({ title: '訴え', body: `有力者の${rich}が、農民の${poor}の畑を奪ったと訴えが出た。${rich}は密かに金${U.fmt(bribe)}を差し出してきた。`, choices: [{ v: 'fair', label: '法に従って裁く' }, { v: 'bribe', label: '金を受け取り、豪族に味方する' }] });
      if (k === 'fair') { A.jurAdd('loyal', 4); A.jurAdd('order', 2); me.fame += 4; W.learn('saiban'); if (S.hasTrait(o, 'houka')) W.gainMerit(10 * S.tier(), '公正な裁き'); }
      else { me.gold += bribe; A.jurAdd('loyal', -6); if (U.ch(0.25)) { S.log('賄賂が露見し、上官の不興を買った。', 'bad'); W.gainMerit(-15 * S.tier(), '収賄'); } }
    } },
  { id: 'hunt', w: 1.0, run: async () => {
      const me = G.me, o = S.myOff();
      const k = await HOOK.choose({ title: '狩り', body: '近くの山で大きな狩りが催される。', choices: [{ v: 1, label: '参加して腕を見せる' }, { v: 0, label: '遠慮する' }] });
      if (!k) return;
      const r = U.rf(0, 1) + S.stat(o, 'bu') / 200 + S.fx(o, 'luck');
      if (r > 0.9) { me.exp.bu += 40; me.exp.tou += 15; me.fame += 6; S.log(`大鹿と${['numid', 'punic', 'egypt'].includes(S.P[me.loc]?.cul) ? 'ライオン' : '大猪'}を仕留め、名を上げた。`, 'good'); if (U.ch(0.25)) { const hk = EV.horseKey(); me.items.push(hk); S.log(`褒美に${D.ITEMS[hk].n}を賜った。`, 'good'); } }
      else if (r > 0.45) { me.exp.bu += 20; }
      else { me.inj = Math.max(me.inj, 1); S.log('落馬して怪我をした。', 'bad'); }
    } },
  { id: 'caravan', w: () => 0.6 + (G.me.land.fac.market || 0) * 0.3, run: async () => {
      const me = G.me, amt = Math.round(Math.max(1000, me.gold * 0.25));
      const k = await HOOK.choose({ title: '交易船への出資', body: `交易船の船主が出資者を探している。「ぶどう酒とオリーブ油を運べば、倍になって戻りますぞ」`, choices: [{ v: 1, label: `金${U.fmt(amt)}を出資する`, disabled: me.gold < amt }, { v: 0, label: '断る' }] });
      if (!k) return;
      me.gold -= amt;
      const r = U.rf(0, 1) + S.fx(S.myOff(), 'trade') + S.fx(S.myOff(), 'comm') * 0.5;
      if (r > 0.45) { const back = Math.round(amt * U.rf(1.4, 2.4)); me.gold += back; S.log(`船が戻り、金${U.fmt(back)}になった。`, 'good'); }
      else S.log('船は嵐に遭い、帰ってこなかった……', 'bad');
    } },
  { id: 'brewfeast', w: () => (G.me.land.fac.brewery || 0) > 0 ? 1.2 : 0, run: async () => {
      const me = G.me;
      const subs = me.army.subs.map(id => G.off[id]).filter(x => x && x.alive);
      for (const x of subs) x.bond = Math.min(100, x.bond + 4);
      for (const w of me.army.wu) if (w.alive) w.bond = Math.min(100, (w.bond || 0) + 4);
      await HOOK.info({ title: '新酒', body: `今年のぶどう酒ができた。部下たちと酌み交わし、絆が深まった。` });
    } },
  { id: 'jixia', w: () => (['mace', 'ptol'].includes(S.myOff().c) ? 1.5 : 0.5) * (S.stat(S.myOff(), 'chi') >= 60 ? 1 : 0.4), run: async () => {
      const me = G.me, o = S.myOff();
      const k = await HOOK.choose({ title: '哲学者の論争', body: `${U.pick(['アテナイの柱廊（ストア）', 'アテナイのアカデメイア', 'アレクサンドリアの学堂（ムセイオン）', 'ロドスの弁論の学校'])}から来た論客が「国を治めるのは法か、徳か」と論争を挑んできた。`, choices: [{ v: 1, label: '受けて立つ（舌戦）' }, { v: 0, label: '断る' }] });
      if (!k) return;
      const r = await UI.debate({ n: S.genName().n, chi: U.ri(60, 88), pol: U.ri(50, 80), tr: [] }, '法と徳');
      if (r > 0) { me.exp.chi += 50; me.exp.pol += 20; me.fame += 8; W.learn('debateWin'); S.log('論客を言い負かし、名声が上がった。', 'good'); }
      else { me.exp.chi += 15; }
    } },
  { id: 'firetown', w: 0.5, run: async () => {
      const me = G.me, L = me.land, tw = L.fac.tower || 0;
      const dmg = Math.max(0, U.ri(2, 8) - tw * 2);
      L.hh = Math.max(0, Math.round(L.hh * (1 - dmg / 100)));
      await HOOK.info({ title: '火事', body: dmg ? `私領の町で火事が起き、家々が焼けた（戸数-${dmg}%）。` : `私領の町で火事が起きたが、${(D.FAC.tower && D.FAC.tower.n) || '見張りの塔'}の見張りがすぐ気づき、大事には至らなかった。` });
    } },
);

// opt.raid: 反乱ではなく部族の襲来（D.RAIDERS の鍵）。opt.foe: 敵軍の名
EV.rebellion = async (c, pid, size, title, text, opt = {}) => {
  const my = EV.myC();
  const me = G.me;
  let involved = my === c && (S.isTop() || (S.isMil() && (me.loc === pid || S.adj(pid).includes(me.loc)) && S.tier() >= 2) || (me.rank === 'daij' && me.min === 'eii' && pid === W.capital(c)));
  S.log(`【${title}】${text}`, 'big'); S.chron(text);
  if (involved) {
    const lead = S.tier() >= 7 || S.isTop();
    const k = await HOOK.choose({ title, seal: opt.raid ? '襲来' : '反乱', body: `${text}\n${opt.raid ? '敵' : '反乱軍'} 約${U.fmt(size)}。`, choices: [{ v: 'fight', label: lead ? '自ら鎮圧に向かう' : '鎮圧軍に加わる' }, { v: 'auto', label: '他の将に任せる' }] });
    if (k === 'fight') {
      const force = Math.max(S.armyTotal(), Math.round(size * (lead ? 1.3 : 1.1)));
      const B = opt.raid ? { c, troops: size, cmd: W.tempLeader(c, 7), nomad: true, raid: opt.raid } : { c, troops: size, cmd: W.tempLeader(c, 7), bandit: false, rebel: true };
      const spec = W.buildSpec({ kind: 'field', pid, title, A: { c, troops: force, cmd: lead ? S.myOff() : W.pickCommander(c, pid) }, B, me: 'A', role: lead ? 'commander' : 'unit', maxDays: 1, ctx: opt.raid ? { kind: 'nomad' } : { rebel: true } });
      if (opt.foe) spec.sides[1].name = opt.foe;
      else if (!opt.raid) spec.sides[1].name = title.replace(/の乱|の反乱/, '') + '反乱軍';
      if (!opt.raid) spec.sides[1].rebel = true;
      const br = await HOOK.battle(spec);
      const res = W.applyBattleResult(spec, br);
      if (br.winner === 0) { W.gainMerit(Math.round(size / 20 + 40 * S.tier()), opt.raid ? `${title}を退けた` : `${title}の鎮圧`); S.log(opt.raid ? `${title}を退けた。` : `${title}は鎮圧された。`, 'good'); }
      else { G.prov[pid].loyal = Math.max(5, G.prov[pid].loyal - 20); G.prov[pid].troops = Math.max(0, G.prov[pid].troops - size); S.log(opt.raid ? `${title}を防げなかった。${S.P[pid].name}が荒らされた。` : `${title}の鎮圧に失敗した。各地が動揺している。`, 'bad'); }
      await W.checkPromotion();
      return;
    }
  }
  const p = G.prov[pid];
  if (p.troops > size * 1.2 || U.ch(0.7)) { p.troops = Math.max(0, p.troops - Math.round(size * 0.5)); S.log(opt.raid ? `${title}は退けられた。` : `${title}は鎮圧された。`); }
  else { p.loyal = Math.max(5, p.loyal - 20); p.troops = Math.max(0, p.troops - size); S.log(`${title}で${S.P[pid].name}が荒廃した。`, 'bad'); }
};

/* ---------- 君主の座をめぐる事件（ローマなら執政官、カルタゴならスフェス） ---------- */
EV.throne = async () => {
  const me = G.me, o = S.myOff(), cc = S.myCty(), rt = EV.rt(o.c);
  const ruler = G.off[cc.ruler];
  if (!ruler || ruler.player) return;
  if (!['josh', 'dais', 'tenka'].includes(me.rank)) return;
  const power = me.fame + (me.rank === 'josh' ? 150 : 100);
  // 君主が老いて崩御 → 禅譲の可能性
  if (G.flags.rulerDied === G.turn - 1 || (ruler.bond >= 70 && me.fame >= 350 && U.ch(0.04))) {
    const k = await HOOK.choose({ title: `${rt}の座`, seal: '継承', body: `${rt}は「この国を託せるのは${o.n}しかおらぬ」と言い残した。重臣たちは、あなたが${rt}となることを求めている。`, choices: [{ v: 1, label: `${rt}の座に就く` }, { v: 0, label: `固辞して新しい${rt}を支える` }] });
    if (k) { EV.becomeKing(); return; }
    me.fame += 40; ruler.bond = 100; return;
  }
  // 謀反の誘い
  if (ruler.bond < -10 && power > 300 && U.ch(0.06)) {
    const k = await HOOK.choose({ title: '謀反の誘い', seal: '密議', body: `不満を抱く将たちが密かに訪れた。「いまの${rt}は国を誤らせる。あなたこそ${rt}にふさわしい」`, choices: [{ v: 'rebel', label: '兵を挙げる（内乱）' }, { v: 'report', label: `${rt}に密告する` }, { v: 'ignore', label: '聞かなかったことにする' }] });
    if (k === 'report') { ruler.bond += 25; W.gainMerit(50 * S.tier(), '謀反の密告'); return; }
    if (k !== 'rebel') return;
    const loyal = Math.round(S.countryTroops(o.c) * 0.25);
    const mine = Math.round(S.armyTotal() + loyal * U.rf(0.6, 1.1));
    const spec = W.buildSpec({ kind: 'field', pid: W.capital(o.c), title: `${rt}の座をめぐる内乱`, A: { c: o.c, troops: mine, cmd: o }, B: { c: o.c, troops: loyal, cmd: S.bestGeneral(o.c, [o.id]) }, me: 'A', role: 'commander', maxDays: 2, ctx: { rebel: true } });
    spec.sides[1].name = `${rt}の軍`; spec.sides[1].rebel = true; spec.sides[0].name = '反乱軍';
    const br = await HOOK.battle(spec);
    W.applyBattleResult(spec, br);
    if (br.winner === 0) EV.becomeKing();
    else G.over = { kind: 'death', text: `${o.n}の謀反は失敗し、一族もろとも誅された。` };
  }
};
EV.becomeKing = () => {
  const me = G.me, o = S.myOff(), cc = S.myCty();
  const old = G.off[cc.ruler]; if (old && !old.player) old.ret = true;
  if (me.rank === 'josh') { cc.josh = S.genOfficer(o.c, 'josh').id; }
  cc.ruler = o.id; me.rank = 'kuns'; o.r = 'kuns'; me.jur = null; me.loc = W.capital(o.c); o.loc = me.loc;
  for (const p of S.ownedProvs(o.c)) if (p.gov === old?.id) p.gov = o.id;
  me.rec.prom.push({ d: S.dateStr(), r: 'kuns' });
  const rt = EV.rt(o.c);
  S.log(`${o.n}が${S.cname(o.c)}の${rt}となった！`, 'big'); S.chron(`${o.n}、${S.cname(o.c)}の${rt}となる。`);
};

/* ---------- 月ごとの処理 ---------- */
/* ---------- JSON で書いた事件（データとして追加できる） ----------
   { id, title, w, when: { tier:[lo,hi], months:[..], has:['army'|'subs'|'boss'|'jur'], track:[..], jur:bool, flag:'name'|'!name', rank:[..] },
     body, who: 'boss'|'ruler'|'sub', choices: [{ label, sub, need:{gold,food,has}, fx:[...], roll:{stat,p,ok,ng}, debate:{vs,ok,ng} }] }
   fx: [kind, ...args]。数は 't300'（功績なら 300×格、金なら 300×格²）のように格で伸ばせる */
EV.J = {};
EV.J.num = (v, kind) => {
  if (typeof v === 'number') return v;
  const m = /^(-?)t(\d+(?:\.\d+)?)$/.exec(String(v)); if (!m) return parseFloat(v) || 0;
  const t = S.tier(), n = parseFloat(m[2]) * (kind === 'gold' || kind === 'food' ? t * t : t);
  return m[1] ? -n : n;
};
EV.J.pick = (ctx, who) => {
  const me = G.me, o = S.myOff(), cc = S.myCty();
  if (who === 'boss') return G.off[me.boss] || G.off[cc.ruler] || null;
  if (who === 'ruler') return G.off[cc.ruler] || null;
  if (who === 'sub') { if (!ctx.sub) { const subs = me.army.subs.map(id => G.off[id]).filter(x => x && x.alive); ctx.sub = subs.length ? U.pick(subs) : null; } return ctx.sub; }
  if (who === 'random') { const xs = S.officersOf(o.c, x => !x.player && x.loc === me.loc); return xs.length ? U.pick(xs) : (G.off[me.boss] || null); }
  return null;
};
EV.J.text = (s, ctx) => {
  const me = G.me, o = S.myOff(), cc = S.myCty();
  const sub = EV.J.pick(ctx, 'sub');
  return String(s || '').replace(/\{name\}/g, o.n).replace(/\{boss\}/g, (G.off[me.boss] || G.off[cc.ruler] || {}).n || '上官').replace(/\{ruler\}/g, (G.off[cc.ruler] || {}).n || '王').replace(/\{country\}/g, S.cname(o.c)).replace(/\{loc\}/g, S.P[me.loc]?.name || '').replace(/\{season\}/g, D.SEASON(G.month)).replace(/\{sub\}/g, sub ? sub.n : '部下').replace(/\{jur\}/g, me.jur ? me.jur.name : '');
};
EV.J.has = (k) => {
  const me = G.me;
  if (k === 'army') return me.army.sq.some(s => s.n > 0);
  if (k === 'subs') return me.army.subs.some(id => G.off[id] && G.off[id].alive);
  if (k === 'boss') return !!(me.boss && G.off[me.boss] && G.off[me.boss].alive);
  if (k === 'jur') return !!me.jur;
  return true;
};
EV.J.weight = (ev) => {
  const w = ev.when || {}, me = G.me, tr = D.RANKS[me.rank]?.track || 'mil', t = S.tier();
  if (w.tier && (t < w.tier[0] || t > w.tier[1])) return 0;
  if (w.months && !w.months.includes(G.month)) return 0;
  if (w.track && !w.track.includes(tr)) return 0;
  if (w.rank && !w.rank.includes(me.rank)) return 0;
  if (w.jur === true && !me.jur) return 0; if (w.jur === false && me.jur) return 0;
  if (w.has && !w.has.every(EV.J.has)) return 0;
  if (w.flag) { const neg = w.flag[0] === '!', f = neg ? w.flag.slice(1) : w.flag; const v = !!G.flags['j_' + f]; if (neg ? v : !v) return 0; }
  if (w.chance != null && !U.ch(w.chance)) return 0;
  return ev.w == null ? 1 : ev.w;
};
EV.J.need = (nd, ctx) => {
  if (!nd) return true;
  const me = G.me;
  if (nd.gold != null && me.gold < EV.J.num(nd.gold, 'gold')) return false;
  if (nd.food != null && me.food < EV.J.num(nd.food, 'food')) return false;
  if (nd.has && !nd.has.every(EV.J.has)) return false;
  return true;
};
EV.J.apply = async (list, ctx) => {
  const me = G.me, o = S.myOff();
  for (const f of list || []) {
    const [k, a, b, c] = f;
    try {
      if (k === 'gold') me.gold += Math.round(EV.J.num(a, 'gold'));
      else if (k === 'food') me.food = Math.max(0, me.food + Math.round(EV.J.num(a, 'food')));
      else if (k === 'merit') W.gainMerit(Math.round(EV.J.num(a, 'merit')), ctx.ev.title);
      else if (k === 'fame') me.fame = Math.max(0, (me.fame || 0) + EV.J.num(a));
      else if (k === 'exp') me.exp[a] = (me.exp[a] || 0) + EV.J.num(b);
      else if (k === 'bond') { const x = EV.J.pick(ctx, a); if (x) x.bond = U.clamp((x.bond || 0) + EV.J.num(b), -100, 100); }
      else if (k === 'tr') for (const s of me.army.sq) s.tr = U.clamp(s.tr + EV.J.num(a), 0, 100);
      else if (k === 'troops') for (const s of me.army.sq) s.n = Math.max(0, Math.min(s.max, Math.round(s.n * (1 + EV.J.num(a)))));
      else if (k === 'jur') { if (me.jur) { if (a === 'hh') me.jur.hh = Math.round(me.jur.hh * (1 + EV.J.num(b))); else A.jurAdd(a, EV.J.num(b)); } }
      else if (k === 'flag') { if (EV.J.num(b)) G.flags['j_' + a] = G.turn || -1; else delete G.flags['j_' + a]; }
      else if (k === 'log') S.log(EV.J.text(a, ctx), b || 'info');
      else if (k === 'item') { if (D.ITEMS[a] && !me.items.includes(a)) { me.items.push(a); S.log(`「${D.ITEMS[a].n}」を手に入れた。`, 'good'); } }
      else if (k === 'inj') me.inj = Math.max(me.inj || 0, Math.round(EV.J.num(a)));
      else if (k === 'loy') { for (const id of me.army.subs) { const x = G.off[id]; if (x) x.loy = U.clamp((x.loy || 70) + EV.J.num(a), 0, 100); } }
      else if (k === 'rel') { const x = EV.J.pick(ctx, a); if (x && typeof PPL !== 'undefined') PPL.addRel(x.id, o.id, EV.J.num(b)); }
      else if (k === 'learn') W.learn(a, 1);
      else if (k === 'chron') S.chron(EV.J.text(a, ctx));
    } catch (e) { console.warn('event fx', f, e); }
  }
};
EV.J.run = async (ev) => {
  const ctx = { ev };
  const who = ev.who ? EV.J.pick(ctx, ev.who) : null;
  const choices = (ev.choices || []).map((ch, i) => ({ v: i, label: EV.J.text(ch.label, ctx), sub: ch.sub ? EV.J.text(ch.sub, ctx) : (ch.need && ch.need.gold != null ? `金${U.fmt(EV.J.num(ch.need.gold, 'gold'))}` : ch.need && ch.need.food != null ? `兵糧${U.fmt(EV.J.num(ch.need.food, 'food'))}` : undefined), disabled: !EV.J.need(ch.need, ctx) }));
  if (!choices.length) { await HOOK.info({ title: EV.J.text(ev.title, ctx), body: EV.J.text(ev.body, ctx), who: who || undefined }); return; }
  const k = await HOOK.choose({ title: EV.J.text(ev.title, ctx), seal: ev.seal || undefined, who: who || undefined, body: EV.J.text(ev.body, ctx), choices });
  const ch = ev.choices[k == null ? 0 : k]; if (!ch) return;
  await EV.J.apply(ch.fx, ctx);
  if (ch.roll) {
    const st = ch.roll.stat ? S.stat(S.myOff(), ch.roll.stat) : 50;
    const p = U.clamp((ch.roll.p ?? 0.5) + (st - 50) / 200, 0.05, 0.95);
    await EV.J.apply(U.ch(p) ? ch.roll.ok : ch.roll.ng, ctx);
  }
  if (ch.debate) {
    const vs = EV.J.pick(ctx, ch.debate.vs || 'boss');
    const r = vs && typeof UI !== 'undefined' && UI.debate ? await UI.debate(vs, EV.J.text(ev.title, ctx)) : (U.ch(0.5) ? 1 : -1);
    await EV.J.apply(r > 0 ? ch.debate.ok : ch.debate.ng, ctx);
  }
  if (ev.once) G.flags['ev_' + ev.id] = G.turn || -1;
};
// JSON の事件を一覧（組み込み＋MOD）
EV.jsonEvents = () => {
  const base = (typeof DATA_JSON !== 'undefined' && DATA_JSON.events) ? DATA_JSON.events : [];
  const mod = (typeof MOD !== 'undefined' && MOD.events) ? MOD.events() : [];
  return base.concat(mod);
};
EV.monthly = async () => {
  EV.spawnHist();
  // 年のはじめに、史実の人物の官職を経歴に合わせる
  if (G.month === 1 && !(G.custom && G.custom.hist === false)) EV.syncCareers(false);
  const y0 = G.startYear ?? -9999;
  for (const h of (G.custom && G.custom.hist === false ? [] : EV.hist)) {
    if (EV.done(h.id)) continue;
    if (G.year > h.y || (G.year === h.y && G.month >= h.m)) {
      EV.mark(h.id);
      // 物語のはじまりより前の年の事件は起こさない
      if (h.y >= y0 && (G.year === h.y || (G.year === h.y + 1 && G.month <= h.m))) { try { await h.run(); } catch (e) { console.error(e); } }
      if (G.over) return;
    }
  }
  await W.coalitionCheck();
  await EV.throne();
  if (G.over) return;
  if (U.ch(0.42)) {
    const ev = U.wpick(EV.generic, e => typeof e.w === 'function' ? e.w() : e.w);
    if (ev && (typeof ev.w !== 'function' || ev.w() > 0)) { try { await ev.run(); } catch (e) { console.error(e); } }
  } else if (U.ch(0.3)) {
    // データで書かれた事件
    const list = EV.jsonEvents().filter(e => !(e.once && EV.done(e.id)));
    const ev = list.length ? U.wpick(list, EV.J.weight) : null;
    if (ev && EV.J.weight(ev) > 0) { try { await EV.J.run(ev); } catch (e) { console.error(e); } }
  }
};
