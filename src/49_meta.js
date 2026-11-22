/* =========================================================
   地中海覇道 — meta（実績・称号・年代記の記録・手引き）
   - 実績：条件を満たすと解除。称号（異名として名乗れる）が付くものもある
   - 解除した実績は端末にも残る（タイトル画面で見られる）
   ========================================================= */
const ACH = {};
D.ACH = [
  { id: 'first_blood', n: '初陣', d: '初めて合戦に出た', c: () => G.me.rec.battles >= 1 },
  { id: 'win10', n: '十勝', d: '合戦で十回勝った', c: () => G.me.rec.wins >= 10 },
  { id: 'win50', n: '百戦錬磨', d: '合戦で五十回勝った', c: () => G.me.rec.wins >= 50, title: '百戦の{m}' },
  { id: 'duel1', n: '一騎打ち', d: '一騎打ちに勝った', c: () => G.me.rec.duels >= 1 },
  { id: 'duel10', n: '無双', d: '一騎打ちで十勝した', c: () => G.me.rec.duels >= 10, title: '無双の{m}' },
  { id: 'slay_hist', n: '名将討ち', d: '史実の名のある将を討ち取った', c: () => (G.me.rec.slain || []).some(n => ACH.histNames().has(n)) },
  { id: 'kills10k', n: '万人斬り', d: '討った兵が一万を超えた', c: () => G.me.rec.kills >= 10000 },
  { id: 'kills100k', n: '戦場の死神', d: '討った兵が十万を超えた', c: () => G.me.rec.kills >= 100000, title: '戦場の死神' },
  { id: 'rank_shog', n: '将軍', d: '将軍になった', c: () => D.RANKS[G.me.rank]?.track === 'mil' && (D.RANKS[G.me.rank]?.tier || 0) >= 7 && (D.RANKS[G.me.startRank || 'goch']?.tier || 0) < 7 },
  { id: 'rank_dais', n: '大将軍', d: '大将軍になった', c: () => G.me.rank === 'dais' && G.me.startRank !== 'dais' },
  { id: 'tenka', n: '地中海の覇将', d: '武の頂点に立った', c: () => G.me.rank === 'tenka', title: '地中海無双' },
  { id: 'gunshi', n: '大軍師', d: '国の軍略の頂点に立った', c: () => G.me.rank === 'dgun' && G.me.startRank !== 'dgun' },
  { id: 'josh', n: '宰相', d: '宰相になった', c: () => G.me.rank === 'josh' && G.me.startRank !== 'josh' },
  { id: 'kuns', n: '国の主', d: '君主になった', c: () => G.me.rank === 'kuns' && G.me.startRank !== 'kuns', title: '{c}の主' },
  { id: 'jue_top', n: '身分の頂', d: `身分の頂（${(D.JUE[20] || {}).n || '最上位'}）に至った`, c: () => (G.me.jue || 1) >= 20 },
  { id: 'fame', n: '地中海に轟く', d: '武名が地中海に知れ渡った', c: () => S.renownLv() >= 4 },
  { id: 'epithet', n: '異名持ち', d: '異名で呼ばれるようになった', c: () => (G.me.epi || []).some(e => e.k !== 'ach') },
  { id: 'naval1', n: '海の勝利', d: '海戦に勝った', c: () => (G.me.rec.navalWins || 0) >= 1 },
  { id: 'sink50', n: '海神の怒り', d: '海戦で敵の船を通算五十隻沈めた', c: () => (G.me.rec.sunk || 0) >= 50, title: '海神の{m}' },
  { id: 'fieldpick', n: '地の利', d: '自分で選んだ戦場で勝った', c: () => (G.me.rec.fieldWins || 0) >= 1 },
  { id: 'fieldpick10', n: '戦場を選ぶ者', d: '自分で選んだ戦場で十回勝った', c: () => (G.me.rec.fieldWins || 0) >= 10, title: '地の利の{m}' },
  { id: 'city', n: '攻城', d: '遠征で大都市を落とした', c: () => (G.me.rec.cities || 0) >= 1 },
  { id: 'city5', n: '城取り', d: '五つの大都市を落とした', c: () => (G.me.rec.cities || 0) >= 5, title: '城取りの{m}' },
  { id: 'siege_food', n: '兵糧攻め', d: '包囲で城を開かせた', c: () => (G.me.rec.sieges || 0) >= 1 },
  { id: 'unify', n: '地中海統一', d: '自国が地中海を統一した', c: () => !!(G.over && G.over.kind === 'unify'), title: '統一の{m}' },
  { id: 'rich', n: '富豪', d: '金百万を蓄えた', c: () => G.me.gold >= 1000000 },
  { id: 'army50k', n: '五万の軍', d: '五万の兵を率いた', c: () => S.armyTotal() >= 50000 },
  { id: 'subs5', n: '人望', d: '部下が五人になった', c: () => G.me.army.subs.length >= 5 },
  { id: 'friend', n: '恩義', d: '深い恩義を感じてくれる友ができた', c: () => typeof PPL !== 'undefined' && PPL.friendsOf(S.myOff().id, 60).length >= 1 },
  { id: 'dangai', n: '弾劾', d: '弾劾を成功させた', c: () => (G.me.rec.dangai || 0) >= 1 },
  { id: 'coalition', n: '連合軍を退ける', d: '自国に迫った諸国の連合軍を退けた', c: () => (G.me.rec.coalitions || 0) >= 1 },
  { id: 'survive10', n: '十年', d: '十年を生き抜いた', c: () => G.year - (G.startYear ?? D.START_YEAR) >= 10 },
  { id: 'old', n: '長寿', d: '六十歳を越えた', c: () => S.myOff().age >= 60 },
  { id: 'traits10', n: '多芸', d: '特性を十個身につけた', c: () => (S.myOff().tr || []).length >= 10 },
  { id: 'tactics8', n: '兵法家', d: '戦術を八つ会得した', c: () => (G.me.tac || []).length >= 8 },
  { id: 'ctr', n: '工房', d: '自分で作った特性を身につけた', c: () => (S.myOff().tr || []).some(t => String(t).startsWith('cx_')) },
  { id: 'gov', n: '名総督', d: '管轄地の民心を九十まで高めた', c: () => !!(G.me.jur && G.me.jur.loyal >= 90) },
  { id: 'scen', n: '時代を巡る', d: '別の年代から物語を始めた', c: () => !!(G.scenario && G.scenario !== 'start') },
  { id: 'hard', n: '茨の道', d: '「難しい」で一年を生き抜いた', c: () => G.diff === 2 && G.year - (G.startYear ?? D.START_YEAR) >= 1 },
  { id: 'wu', n: '伍の絆', d: '伍の仲間と二年を共に戦った', c: () => (G.me.rank === 'goch' || G.me.rank === 'shic' || G.me.rank === 'tonc') && G.year - (G.startYear ?? D.START_YEAR) >= 2 && G.me.army.wu.some(w => w.alive && !w.fresh) },
];
ACH._hist = null;
ACH.histNames = () => { if (!ACH._hist) ACH._hist = new Set(D.HIST.map(h => h[0])); return ACH._hist; };
ACH.KEY = 'chichukai.ach';
// 端末に残す（タイトル画面用）
ACH.saved = () => { try { return JSON.parse(localStorage.getItem(ACH.KEY) || '{}'); } catch (e) { return {}; } };
ACH.persist = (id) => { try { const s = ACH.saved(); if (!s[id]) { s[id] = Date.now(); localStorage.setItem(ACH.KEY, JSON.stringify(s)); } } catch (e) {} };
ACH.has = (id) => !!(G && G.ach && G.ach[id]);
// 条件を調べて解除する。戻り値は新しく解除した実績
ACH.check = async (quiet) => {
  if (typeof G === 'undefined' || !G || !G.me) return [];
  G.ach = G.ach || {};
  const out = [];
  for (const a of D.ACH) {
    if (G.ach[a.id]) continue;
    let ok = false;
    try { ok = !!a.c(); } catch (e) { ok = false; }
    if (!ok) continue;
    G.ach[a.id] = { t: G.turn, d: S.dateStr() };
    ACH.persist(a.id);
    out.push(a);
    S.log(`【実績】「${a.n}」を解除した：${a.d}`, 'big');
    if (a.title) {
      const o = S.myOff();
      const n = a.title.replace('{m}', o.mei || o.n).replace('{c}', S.cname(o.c));
      G.me.epi = G.me.epi || [];
      if (!G.me.epi.some(e => e.n === n)) { G.me.epi.push({ n, k: 'ach', pts: 0, d: S.dateStr(), why: `実績「${a.n}」` }); S.log(`【称号】「${n}」を名乗れるようになった。`, 'big'); }
    }
  }
  ACH.pend = (ACH.pend || []).concat(out);
  if (!quiet && ACH.pend.length && typeof HOOK !== 'undefined' && typeof HOOK.cutin === 'function') {
    const show = ACH.pend.slice(0, 3); ACH.pend = [];
    for (const a of show) { try { await HOOK.cutin({ kind: 'banner', title: `実績「${a.n}」`, sub: a.d + (a.title ? '　称号を得た' : ''), color: '#f3d27a', snd: 'coin', dur: 2000 }); } catch (e) {} }
  } else if (!quiet) ACH.pend = [];
  return out;
};

/* ---------- 年代記の材料 ---------- */
// 年ごとにまとめた出来事：史実・功績・昇進・実績・亡き者
ACH.chronicle = () => {
  const me = G.me, o = S.myOff();
  const items = [];
  const yearOf = (d) => { const m = /前(\d+)年/.exec(d || ''); return m ? -parseInt(m[1], 10) : null; };
  for (const h of (G.hist || [])) items.push({ y: yearOf(h.d), d: h.d, s: h.s, k: 'hist' });
  for (const p of (me.rec.prom || [])) items.push({ y: yearOf(p.d), d: p.d, s: p.g != null ? `${D.RANKS[p.r]?.name || ''}（${['三', '二', '一'][p.g] || ''}等）に進む` : `${D.RANKS[p.r]?.name || ''}に昇る`, k: 'prom' });
  for (const id in (G.ach || {})) { const a = D.ACH.find(x => x.id === id); const r = G.ach[id]; if (a && r && r.d) items.push({ y: yearOf(r.d), d: r.d, s: `実績「${a.n}」`, k: 'ach' }); }
  for (const e of (me.epi || [])) items.push({ y: yearOf(e.d), d: e.d, s: `「${e.n}」と呼ばれる（${e.why || ''}）`, k: 'epi' });
  for (const g of (G.graves || [])) if (g.sub || g.bond >= 20) items.push({ y: g.y, d: `${g.y < 0 ? '前' + (-g.y) : g.y}年 ${g.m}月`, s: `${g.sub ? '部下の' : ''}${g.n}、${g.why}（享年${g.age}）`, k: 'grave' });
  const byYear = {};
  for (const it of items) { const y = it.y ?? G.year; (byYear[y] = byYear[y] || []).push(it); }
  const years = Object.keys(byYear).map(Number).sort((a, b) => a - b);
  return years.map(y => ({ y, items: byYear[y].sort((a, b) => (a.d || '').localeCompare(b.d || '')) }));
};

/* ---------- 手引き（はじめの数か月の「今月やるべきこと」） ---------- */
ACH.hint = () => {
  const me = G.me, o = S.myOff(), rk = D.RANKS[me.rank], tier = S.tier();
  const m = G.turn;
  if (G.flags.noHints) return null;
  const tr = rk.track;
  if (m === 0) return tr === 'mil' ? '「令」タブで行動を選ぼう。まずは「訓練」で兵を鍛え、「戦場へ」で小競り合いに出て功績を稼ぐ。任務状を使い切ったら「月を進める」。' : tr === 'civ' ? '「令」タブで行動を選ぼう。管轄地の内政（農業・治安・民心）を整えると、年に一度の考課で評価される。任務状を使い切ったら「月を進める」。' : '「令」タブで行動を選ぼう。「戦術研究」で兵法を学び、「上奏・献策」で将軍に策を献じる。任務状を使い切ったら「月を進める」。';
  if (m === 1) return '三か月ごとの評定で任務を受けられる。任務を果たすと功績が入り、功績が溜まると昇進する（「人物」タブの「出世の道」）。';
  if (m === 2) return tr === 'mil' ? '合戦ではまず部隊をタップして選び、地面で移動、敵で攻撃。右上の「2D／3D」で立体の戦場も見られる。敵将が近づけば一騎打ちを挑める。' : '「交流」で上官や君主との絆を深めると、上奏が通りやすく登用もしやすい。「人物」タブで派閥と恩怨も見ておこう。';
  if (m === 3) return '「軍」タブの「部隊の割り振り」で部下に兵を任せ、「合戦に出る部隊」で連れて行く兵を決めておける。';
  if (m === 4 && tier <= 3) return '伍長〜大隊長のうちは「鍛錬」で能力を伸ばし、「人材探索」で部下を見つけよう。部下は合戦で育ち、推薦で引き立てれば恩義ある友になる。';
  if (m === 5) return '大都市は「遠征」で、中都市・小都市・地域は「拠点攻略」で取る。遠征では強襲か包囲かを選べる。秋は「収穫の略奪」で敵の実りを奪える。';
  return null;
};
