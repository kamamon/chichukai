/* =========================================================
   地中海覇道 — 戦場選び（開戦前）と戦場図鑑
   ========================================================= */
// 合戦の前に戦場を決める。統率の高い総大将が候補から選び、有利な側（A側）に布陣する
UI.fieldChoice = async (spec) => {
  if (typeof FLD === 'undefined' || !FLD.applicable(spec) || spec.field) return spec;
  let dc;
  try { dc = FLD.decide(spec); } catch (e) { console.warn(e); return spec; }
  if (!dc.cands.length) return spec;
  const meIn = !!spec.sides[0].player;
  if (dc.chooser < 0) {
    // どちらの将も選べない：成り行きの戦場。地の利は守る側に
    FLD.apply(spec, dc.cands[0], FLD.defender(spec), 'none');
    return spec;
  }
  if (dc.chooser === 0 && meIn && spec.sides[0].cmdAll) {
    const e = await UI.fieldPick(spec, dc);
    FLD.apply(spec, e || dc.cands[0], 0, 'me');
    return spec;
  }
  const e = FLD.aiPick(spec, dc.cands, dc.chooser);
  FLD.apply(spec, e, dc.chooser, dc.chooser === 0 ? 'ally' : 'foe');
  if (meIn) await UI.fieldNotice(spec, e, dc);
  return spec;
};
// 候補の札（絵・名・型・利）
UI.HIST_FIELD = Object.fromEntries('カンナエ:cannae,トラシメヌス:trasimene,トレビア:trebia,ティキヌス:ticinus,ザマ:zama,メタウルス:metaurus,イリパ:ilipa,バエクラ:baecula,キュノスケファライ:cynoscephalae,マグネシア:magnesia,ラフィア:raphia,パニオン:panium,ピュドナ:pydna,テラモン:telamon,クラスティディウム:clastidium,ベネウェントゥム:beneventum,ヘルドニア:herdonia,アスクルム:asculum,バグラダスの戦場:bagradas,大平原:great_plains,テルモピュライ:thermopylae,テンペの谷:tempe,キリキアの門:cilician_gates,アオオスの隘路:aoos,カウディウムの谷:caudium,アルペスの峠:alps_pass,ピュレネの峠:pyrenees_pass,シリアの門:syrian_gates,ミュライ:mylae,エクノムス:ecnomus,ドレパナ:drepana,アエガテス:aegates,リリュバエウム沖:lilybaeum,シュラクサイの大港:syracuse_harbor,エブロ河口:ebro,サラミス:salamis,アルテミシオン:artemisium,アイゴスポタモイ:aegospotami,キオス:chios,ラデ:lade,ミュオネソス:myonessus,エウリュメドン:eurymedon,キュプロスのサラミス:salamis_cyprus'.split(',').map(s => s.split(':')));
UI.fieldArt = (e) => (e.hist && ASSET.url('field/hist_' + UI.HIST_FIELD[e.hist])) || ASSET.url('field/arch_' + e.arch);
UI.fieldCard = (e, aSide, opt = {}) => {
  const A = FLD.ARCH[e.arch];
  const card = U.h('div', { class: 'fcard' + (opt.on ? ' on' : '') });
  const pic = U.h('div', { class: 'fpic' });
  const cv = FLD.thumb(e.id, aSide, 120, 160); if (cv) { const c2 = cv.cloneNode(); c2.getContext('2d').drawImage(cv, 0, 0); pic.append(c2); }
  const body = U.h('div', { class: 'fbody' });
  body.innerHTML = `<b>${U.esc(e.n)}</b><small class="fcat">${FLD.CATS[A.cat]}・${e.sea ? FLD.SEAS[e.sea].n : FLD.BIOMES[e.bio].n}${e.hist ? '・<span class="fhist">史実の戦場</span>' : ''}</small>`
    + `<ul class="fhints">${A.hints.map(h => `<li>${U.esc(h)}</li>`).join('')}</ul>`
    + (e.d ? `<small class="note">${U.esc(e.d)}</small>` : '')
    + (opt.note ? `<small class="fnote">${opt.note}</small>` : '');
  const art = UI.fieldArt(e);
  if (art) body.prepend(U.h('img', { class: 'farch', src: art, alt: '', decoding: 'async' }));
  card.append(pic, body);
  return card;
};
// 主人公が選ぶ
UI.fieldPick = (spec, dc) => UI.modal((box, close) => {
  box.classList.add('tall', 'fpick');
  const foe = spec.sides[1], ft = dc.tou[1];
  UI.head(box, { title: '戦場を選ぶ', seal: '地の利', body: `統率${dc.tou[0]}のあなたは、${dc.cands.length}つの候補から戦場を選べる。選んだ戦場では、こちらが有利な側（絵の下）に布陣する。敵将${foe.cmd ? foe.cmd.n : ''}の統率は${ft}。` });
  // 兵の顔ぶれ（選ぶ手がかり）
  const share = (s, f) => { const us = spec.units.filter(u => u.side === s); const t = U.sum(us, u => u.n) || 1; return Math.round(U.sum(us.filter(f), u => u.n) / t * 100); };
  const mob = u => ['cav', 'chr'].includes(D.UT[u.t]?.cls);
  const n0 = U.sum(spec.units.filter(u => u.side === 0), u => u.n), n1 = U.sum(spec.units.filter(u => u.side === 1), u => u.n);
  if (spec.kind === 'naval') {
    const fast = u => !!D.UT[u.t]?.fast, heavy = u => (D.UT[u.t]?.mass || 0) >= 6;
    const ships = s => U.sum(spec.units.filter(u => u.side === s), u => Math.max(1, Math.round(u.n / (D.UT[u.t]?.crew || 100))));
    box.append(U.h('p', { class: 'note', style: { margin: '0 0 8px' } }, `船 約${ships(0)}隻 対 約${ships(1)}隻（海兵 ${U.fmt(n0)} 対 ${U.fmt(n1)}）・速い船 ${share(0, fast)}% 対 ${share(1, fast)}%・重い船 ${share(0, heavy)}% 対 ${share(1, heavy)}%`));
  } else box.append(U.h('p', { class: 'note', style: { margin: '0 0 8px' } }, `兵 ${U.fmt(n0)} 対 ${U.fmt(n1)}・騎兵と戦象 ${share(0, mob)}% 対 ${share(1, mob)}%`));
  const list = U.h('div', { class: 'flist' });
  const best = U.maxBy(dc.cands, e => FLD.prefer(spec, e, 0));
  for (const e of dc.cands) {
    const card = UI.fieldCard(e, 0, { note: e === best ? '軍師の見立て：この兵の顔ぶれなら、ここが最も有利。' : '' });
    const b = U.h('button', { class: 'btn seal sm' }, 'ここで戦う');
    b.onclick = () => close(e);
    U.$('.fbody', card).append(b);
    list.append(card);
  }
  box.append(list);
}, { stack: true });
// 敵（または味方の将）が選んだ
UI.fieldNotice = (spec, e, dc) => UI.modal((box, close) => {
  box.classList.add('fpick');
  const sd = spec.sides[dc.chooser], who = sd.cmd ? sd.cmd.n : '総大将', foe = dc.chooser === 1;
  UI.head(box, { title: '戦場', seal: '地の利', body: foe ? `敵将${who}（統率${dc.tou[1]}）が戦場を選んだ。敵は有利な側（絵の上）に布陣している。` : `味方の総大将${who}（統率${dc.tou[0]}）が戦場を選んだ。こちらが有利な側（絵の下）に布陣する。` });
  box.append(UI.fieldCard(e, dc.chooser));
  const b = U.h('button', { class: 'btn seal wide', style: { marginTop: '10px' } }, '布陣へ'); b.onclick = () => close(); box.append(b);
}, { stack: true });

/* ---------- 戦場図鑑 ---------- */
UI.fieldBook = () => UI.modal((box, close) => {
  box.classList.add('tall', 'fbook');
  FLD.build();
  const seen = FLD.seenAll();
  const nSeen = FLD.LIST.filter(e => seen[e.id]).length;
  UI.head(box, { title: '戦場図鑑', seal: '図', body: `地中海の名のある戦場 ${FLD.LIST.length} か所。戦ったことのある戦場は ${nSeen} か所。統率の高い将は、開戦前に戦場を選べる。` });
  const tabs = U.h('div', { class: 'tabs fb-tabs' });
  const body = U.h('div', { class: 'fb-body' });
  let obs = null;
  const show = (b) => {
    for (const t of tabs.children) t.classList.toggle('on', t.dataset.b === b);
    if (obs) obs.disconnect();
    const list = b === 'hist' ? FLD.LIST.filter(e => e.hist) : b === 'sea' ? FLD.LIST.filter(e => e.sea && !e.hist) : FLD.LIST.filter(e => e.bio === b && !e.hist && !e.sea);
    // 海の戦場は海の名ごとに、ほかは地形の分類ごとに
    const keyOf = e => b === 'sea' ? e.sea : FLD.ARCH[e.arch].cat;
    const order = b === 'sea' ? FLD.SEA_ORDER : Object.keys(FLD.CATS), title = k => b === 'sea' ? FLD.SEAS[k].n : FLD.CATS[k];
    const cats = {}; for (const e of list) (cats[keyOf(e)] = cats[keyOf(e)] || []).push(e);
    body.innerHTML = '';
    const n = list.filter(e => seen[e.id]).length;
    body.append(U.h('p', { class: 'note', style: { margin: '2px 0 8px' } }, `${b === 'hist' ? '史実の戦場' : b === 'sea' ? '海戦の戦場' : FLD.BIOMES[b].n}：${n} / ${list.length}`));
    for (const c of order) {
      if (!cats[c]) continue;
      body.append(U.h('div', { class: 'sec-h' }, title(c)));
      const g = U.h('div', { class: 'fb-grid' });
      for (const e of cats[c]) {
        const k = seen[e.id] || 0;
        const it = U.h('div', { class: 'fb-it' + (k ? ' on' : ''), 'data-id': e.id });
        it.innerHTML = `<div class="fb-pic"></div><b>${k ? U.esc(e.n) : '？？？'}</b><small>${FLD.ARCH[e.arch].n[0]}${k ? `・${k}度` : ''}</small>`;
        it.onclick = () => UI.fieldDetail(e, !!k);
        g.append(it);
      }
      body.append(g);
    }
    // 見たことのある戦場だけ、見えたときに絵を描く
    obs = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver((ents) => {
      for (const en of ents) {
        if (!en.isIntersecting) continue;
        const el = en.target; obs.unobserve(el);
        const id = el.dataset.id; if (!seen[id]) continue;
        setTimeout(() => { const cv = FLD.thumb(id, 0, 66, 88); if (cv) { const c2 = cv.cloneNode(); c2.getContext('2d').drawImage(cv, 0, 0); U.$('.fb-pic', el).append(c2); } }, 0);
      }
    }, { root: box }) : null;
    if (obs) for (const el of U.$$('.fb-it.on', body)) obs.observe(el);
  };
  const add = (k, n) => { const b = U.h('button', { 'data-b': k, class: 'btn sm' }, n); b.onclick = () => show(k); tabs.append(b); };
  add('hist', '史実');
  for (const b of FLD.BIOME_ORDER) add(b, FLD.BIOMES[b].n);
  add('sea', '海');
  box.append(tabs, body);
  const c = U.h('button', { class: 'btn seal wide', style: { marginTop: '12px' } }, '閉じる'); c.onclick = () => { if (obs) obs.disconnect(); close(); }; box.append(c);
  show('hist');
}, { stack: true });
UI.fieldDetail = (e, known) => UI.modal((box, close) => {
  box.classList.add('fpick');
  const A = FLD.ARCH[e.arch];
  UI.head(box, { title: known ? e.n : '？？？', body: known ? '' : `まだ戦ったことのない${A.n[0]}。${e.sea ? FLD.SEAS[e.sea].n : FLD.BIOMES[e.bio].n}のどこかにある。` });
  if (known) box.append(UI.fieldCard(e, 0));
  const b = U.h('button', { class: 'btn wide', style: { marginTop: '10px' } }, '戻る'); b.onclick = () => close(); box.append(b);
}, { stack: true });
