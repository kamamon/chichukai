/* =========================================================
   地中海覇道 — UI: 基本部品・タイトル・主人公の作成
   ========================================================= */
const UI = {};
UI.show = (name) => {
  for (const s of U.$$('.screen')) s.hidden = s.id !== 'scr-' + name;
  UI.cur = name;
  if (typeof SND !== 'undefined') SND.bgm(name === 'battle' ? 'battle' : name === 'title' ? 'title' : 'map');
};
UI.toast = (s) => {
  const root = U.$('#toast-root');
  const el = U.h('div', { class: 'toast' }, s);
  root.append(el);
  setTimeout(() => el.remove(), 2400);
};

/* ---------- 竹簡のモーダル ---------- */
UI._mq = Promise.resolve();
UI.modal = (build, opt) => {
  const run = () => new Promise((resolve) => {
    const root = U.$('#modal-root');
    const wrap = U.h('div', { class: 'mwrap', role: 'dialog', 'aria-modal': 'true' });
    const box = U.h('div', { class: 'modal' });
    wrap.append(box); root.append(wrap);
    const close = (v) => { wrap.remove(); resolve(v); };
    build(box, close);
    const f = box.querySelector('button:not(:disabled)'); if (f) setTimeout(() => { try { f.focus({ preventScroll: true }); } catch (e) {} }, 30);
  });
  if (opt && opt.stack) return run();   // 今開いている札の上に重ねる
  const p = UI._mq.then(run);
  UI._mq = p.catch(() => {});
  return p;
};
UI.head = (box, o) => {
  if (o.seal) box.append(U.h('div', { class: 'mseal', 'aria-hidden': 'true' }, o.seal));
  if (o.big) box.append(U.h('div', { class: 'big' }, o.title));
  else box.append(U.h('h3', {}, o.title || ''));
  // 語り手の肖像（o.who：人物）
  if (o.who && typeof PORT !== 'undefined') {
    const w = U.h('div', { class: 'who' }); w.append(PORT.canvas(o.who, 64, { seal: false }));
    const rk = D.RANKS[o.who.r];
    w.append(U.h('div', { class: 'who-t' }, U.h('b', {}, o.who.n || ''), U.h('small', {}, [o.who.c && D.COUNTRIES[o.who.c] ? D.COUNTRIES[o.who.c].name : '', rk ? rk.name : ''].filter(Boolean).join('・'))));
    if (o.body) { w.append(U.h('div', { class: 'body who-b' }, o.body)); box.append(w); return; }
    box.append(w);
  }
  if (o.body) box.append(U.h('div', { class: 'body' }, o.body));
};
UI.choose = (o) => UI.modal((box, close) => {
  UI.head(box, o);
  const ch = U.h('div', { class: 'choices' });
  for (const c of o.choices) {
    const b = U.h('button', { class: 'ch' + (c.img ? ' ch-im' : ''), disabled: !!c.disabled }, c.img ? U.h('img', { class: 'ch-img', src: c.img, alt: '', loading: 'lazy', decoding: 'async' }) : null, U.h('b', {}, c.label), c.sub ? U.h('small', {}, c.sub) : null);
    b.onclick = () => close(c.v);
    ch.append(b);
  }
  box.append(ch);
});
UI.info = (o) => UI.modal((box, close) => {
  UI.head(box, o);
  const b = U.h('button', { class: 'btn seal wide', style: { marginTop: '16px' } }, o.ok || '承知した');
  b.onclick = () => close(true);
  box.append(b);
});
// 異名・武名・地中海の覇将の演出（漆の札に金の文字。諸国の反応が順に浮かぶ）
UI.fame = (o) => UI.modal((box, close) => {
  box.classList.add('fame');
  if (o.kind === 'tenka') box.classList.add('tenka');
  if (box.parentElement) box.parentElement.classList.add('fame-wrap');
  box.append(U.h('div', { class: 'mseal', 'aria-hidden': 'true' }, o.seal || '武名'));
  box.append(U.h('div', { class: 'fame-k' }, o.title || '武名'));
  if (o.lead) box.append(U.h('p', { class: 'fame-lead' }, o.lead));
  if (o.epithet) box.append(U.h('div', { class: 'fame-ep' }, `「${o.epithet}」`));
  if (o.name && o.epithet) box.append(U.h('div', { class: 'fame-name' }, o.name));
  if (o.note) box.append(U.h('p', { class: 'fame-note' }, o.note));
  const L = o.lines || [];
  if (L.length) {
    const wrap = U.h('div', { class: 'fame-lines' });
    L.forEach((l, i) => {
      const who = l.who ? U.h('b', {}, l.who) : U.h('span', { html: UI.cseal(l.c, 28) });
      wrap.append(U.h('div', { class: 'fame-line', style: { animationDelay: `${(1 + i * 0.3).toFixed(2)}s` } }, who, U.h('span', {}, l.s)));
    });
    box.append(wrap);
  }
  const b = U.h('button', { class: 'btn seal wide', style: { marginTop: '18px' } }, o.ok || (o.kind === 'tenka' ? '地中海に名を刻む' : '承知した'));
  b.onclick = () => close(true);
  box.append(b);
});
// 出撃する部隊と人数を選ぶ（合戦の前）
UI.wantSortie = (spec) => {
  if (!G || !spec || !spec.args || spec.role === 'watch' || !spec.sides[0] || !spec.sides[0].player) return false;
  return W.canPickSortie();
};
UI.sortie = (spec) => UI.modal((box, close) => {
  const A2 = G.me.army, gs = W.playerGroups();
  const meKey = spec.args.me || 'A', X = spec.args[meKey] || {};
  const enemy = U.sum(spec.units.filter(u => u.side === 1), u => u.n);
  const total = U.sum(gs, g => g.n);
  let preset = A2.sortiePre || 'auto';
  let pick = W.sortiePick(spec, preset);
  UI.head(box, { title: '出撃する部隊', seal: '出陣', body: `${spec.title}　敵 約${U.fmt(enemy)}` });
  const pre = U.h('div', { class: 'seg sm', role: 'group', 'aria-label': 'おまかせ', style: { marginTop: '10px' } });
  const rows = U.h('div', { class: 'sortie-rows' });
  const sum = U.h('div', { class: 'body', style: { marginTop: '10px', fontSize: '13.5px' } });
  const remember = U.h('label', { class: 'sortie-rem' }, U.h('input', { type: 'checkbox', id: 'so-rem' }), U.h('span', {}, '次からこの選び方で、聞かずに出る（「軍」で変えられる）'));
  const go = U.h('button', { class: 'btn seal wide', style: { marginTop: '12px' } }, 'この陣容で出陣');
  const brought = () => U.sum(gs, g => pick[g.key] || 0);
  const allies = () => X.addMe ? (X.troops || 0) : Math.max(0, (X.troops || 0) - brought());
  const upd = () => {
    const b = brought(), al = allies();
    sum.textContent = `出撃 ${U.num(b)}人（全軍 ${U.num(total)}人）${al ? `　味方の援軍 約${U.fmt(al)}` : ''}　→ 味方 約${U.fmt(b + al)} 対 敵 約${U.fmt(enemy)}`;
    for (const x of pre.querySelectorAll('button')) x.classList.toggle('on', x.dataset.p === preset);
    remember.querySelector('input').disabled = preset === 'custom';
    // 直属を出さないと、主人公は護衛だけを連れて出る
    const mainOut = gs.some(g => !g.ld && (pick[g.key] || 0) > 0);
    go.textContent = !b ? '護衛だけを連れて出る' : mainOut ? 'この陣容で出陣' : 'この陣容で出陣（自分は護衛と出る）';
  };
  const renderRows = () => {
    rows.innerHTML = '';
    for (const g of gs) {
      const who = g.ld ? (G.off[g.ld]?.n || '部下') : '直属';
      const row = U.h('div', { class: 'so-row' });
      const lab = U.h('div', { class: 'so-l' }, U.h('b', {}, `${who}・${D.UT[g.t].n}`), U.h('small', {}, `${U.num(g.n)}人・練度${g.tr}`));
      const num = U.h('input', { type: 'number', inputmode: 'numeric', min: '0', max: String(g.n), step: '1', value: String(pick[g.key] || 0), 'aria-label': `${who}の${D.UT[g.t].n}の出撃人数` });
      const rng = U.h('input', { type: 'range', min: '0', max: String(g.n), step: String(Math.max(1, Math.round(g.n / 200))), value: String(pick[g.key] || 0), 'aria-label': `${who}の${D.UT[g.t].n}の出撃人数` });
      const set = (v) => { v = U.clamp(Math.round(Number(v) || 0), 0, g.n); pick[g.key] = v; num.value = String(v); rng.value = String(v); row.classList.toggle('off', !v); preset = 'custom'; upd(); };
      num.onchange = () => set(num.value); rng.oninput = () => set(rng.value);
      const q = U.h('div', { class: 'so-q' }, ...[[0, '留守'], [0.5, '半分'], [1, '全部']].map(([f, l]) => U.h('button', { class: 'chip', onclick: () => set(g.n * f) }, l)));
      row.append(lab, U.h('div', { class: 'so-n' }, num, U.h('small', {}, `／${U.num(g.n)}`)), rng, q);
      row.classList.toggle('off', !(pick[g.key] > 0));
      rows.append(row);
    }
  };
  for (const [k, n] of [['auto', '敵の倍まで'], ['direct', '直属だけ'], ['all', '全軍']]) pre.append(U.h('button', { 'data-p': k, onclick: () => { preset = k; pick = W.sortiePick(spec, k); renderRows(); upd(); } }, n));
  renderRows(); upd();
  go.onclick = () => {
    if (remember.querySelector('input').checked && preset !== 'custom') { A2.sortieAsk = false; A2.sortiePre = preset; }
    else if (preset !== 'custom') A2.sortiePre = preset;
    close(Object.assign({}, pick));
  };
  const foot = U.h('div', { class: 'so-foot' }, sum, remember, go);
  box.append(pre, rows, foot);
});
UI.multiPick = (o) => UI.modal((box, close) => {
  UI.head(box, o);
  const sel = new Set(o.chosen || []);
  const ch = U.h('div', { class: 'choices' });
  const count = U.h('div', { class: 'body', style: { marginTop: '8px', fontSize: '13px' } });
  const upd = () => { count.textContent = `選択中 ${sel.size}/${o.max}`; for (const b of ch.querySelectorAll('button.ch')) b.classList.toggle('on', sel.has(b.dataset.v)); };
  let lastG = null;
  for (const it of o.items) {
    if (it.g && it.g !== lastG) { lastG = it.g; ch.append(U.h('div', { class: 'ch-g' }, it.g)); }
    const b = U.h('button', { class: 'ch' + (it.dim ? ' dim' : ''), 'data-v': it.v, disabled: !!it.dis && !sel.has(it.v) }, U.h('b', {}, it.label), it.sub ? U.h('small', {}, it.sub) : null);
    b.onclick = () => { if (sel.has(it.v)) sel.delete(it.v); else if (sel.size < o.max) sel.add(it.v); else UI.toast(`最大${o.max}つまで`); upd(); };
    ch.append(b);
  }
  box.append(ch, count);
  const row = U.h('div', { style: { display: 'flex', gap: '8px', marginTop: '12px' } });
  const ok = U.h('button', { class: 'btn seal', style: { flex: 1 } }, '決定');
  const cancel = U.h('button', { class: 'btn' }, 'やめる');
  ok.onclick = () => close([...sel]); cancel.onclick = () => close(null);
  row.append(cancel, ok); box.append(row);
  upd();
});
// 数を入れる（入力欄・つまみ・早押し）
UI.askNumber = (o) => UI.modal((box, close) => {
  UI.head(box, o);
  const min = o.min ?? 0, max = Math.max(min, o.max ?? 0), step = o.step || 1;
  let v = U.clamp(Math.round(o.value ?? max), min, max);
  const inp = U.h('input', { type: 'number', inputmode: 'numeric', min, max, step, value: v, 'aria-label': o.title });
  const rng = U.h('input', { type: 'range', min, max, step, value: v, 'aria-label': o.title });
  const info = U.h('div', { class: 'na-info', 'aria-live': 'polite' });
  const ok = U.h('button', { class: 'btn seal', style: { flex: 1 } }, '決定');
  const upd = (nv, from) => {
    v = U.clamp(Math.round(Number(nv) || 0), min, max);
    if (from !== 'inp') inp.value = v;
    if (from !== 'rng') rng.value = v;
    info.textContent = `${U.num(v)}${o.unit || ''}${o.info ? '　' + o.info(v) : ''}`;
    ok.disabled = v < Math.max(1, min);
  };
  inp.oninput = () => upd(inp.value, 'inp');
  inp.onchange = () => upd(inp.value);
  inp.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); if (!ok.disabled) ok.click(); } };
  rng.oninput = () => upd(rng.value, 'rng');
  const q = U.h('div', { class: 'na-q' }, ...[[0.25, '¼'], [0.5, '半分'], [0.75, '¾'], [1, '最大']].map(([f, l]) => { const b = U.h('button', { class: 'chip' }, l); b.onclick = () => upd(Math.max(min, Math.round(max * f))); return b; }));
  box.append(U.h('div', { class: 'numask' }, U.h('div', { class: 'na-row' }, inp, U.h('span', { class: 'na-unit' }, `／${U.num(max)}${o.unit || ''}`)), rng, q, info));
  const cancel = U.h('button', { class: 'btn' }, 'やめる');
  ok.onclick = () => { upd(inp.value); close(v); };
  cancel.onclick = () => close(null);
  box.append(U.h('div', { style: { display: 'flex', gap: '8px', marginTop: '14px' } }, cancel, ok));
  upd(v);
  if (window.matchMedia && window.matchMedia('(pointer: fine)').matches) setTimeout(() => { try { inp.focus({ preventScroll: true }); inp.select(); } catch (e) {} }, 40);
});
UI.copyBox = (o) => UI.modal((box, close) => {
  UI.head(box, o);
  const ta = U.h('textarea', { readonly: o.readonly ? true : null, id: 'copy-ta', 'aria-label': o.title });
  ta.value = o.text || '';
  box.append(ta);
  const row = U.h('div', { style: { display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' } });
  if (o.readonly) {
    const cp = U.h('button', { class: 'btn seal' }, 'コピー');
    cp.onclick = async () => { try { await navigator.clipboard.writeText(ta.value); UI.toast('コピーした'); } catch (e) { ta.focus(); ta.select(); UI.toast('選択した。長押しでコピーして'); } };
    row.append(cp);
  } else {
    const ok = U.h('button', { class: 'btn seal' }, '読み込む');
    ok.onclick = () => close(ta.value.trim());
    row.append(ok);
  }
  const c = U.h('button', { class: 'btn' }, '閉じる'); c.onclick = () => close(null);
  row.append(c); box.append(row);
});

/* ---------- 画面の大きさ（文字の大きさ） ---------- */
UI.SCALES = [[1, '標準'], [1.12, '大きめ'], [1.25, '特大']];
UI.scaleIdx = () => { try { return U.clamp(+localStorage.getItem('chichukai.scale') || 0, 0, 2); } catch (e) { return 0; } };
UI.scaleName = () => UI.SCALES[UI.scaleIdx()][1];
UI.setScale = (i) => {
  try { localStorage.setItem('chichukai.scale', String(i)); } catch (e) {}
  const k = UI.SCALES[i][0];
  for (const id of ['app', 'modal-root', 'toast-root', 'cutin-root']) { const el = document.getElementById(id); if (el) el.style.zoom = k === 1 ? '' : String(k); }
  window.dispatchEvent(new Event('resize'));
};
UI.applyScale = () => { const i = UI.scaleIdx(); if (i) UI.setScale(i); };

/* ---------- 共通の小物 ---------- */
UI.cseal = (c, size) => { const C = D.COUNTRIES[c] || D.BANDIT; const em = typeof ASSET !== 'undefined' && ASSET.url('nation/emblem_' + c); if (em) return `<span class="cseal em"${size ? ` style="width:${size}px;height:${size}px"` : ''}><img src="${em}" alt="${C.name}" decoding="async"></span>`; return `<span class="cseal" style="background:${C.color === '#26262d' ? '#2e2e38' : C.color}${size ? `;width:${size}px;height:${size}px;font-size:${Math.round(size * 0.58)}px` : ''}">${C.name}</span>`; };
UI.bar = (v, max = 100, cls = '') => `<div class="bar ${cls}"><i style="width:${U.clamp(v / max * 100, 0, 100)}%"></i></div>`;
UI.statName = { bu: '武力', tou: '統率', chi: '知力', pol: '政治', mi: '魅力' };
UI.styleName = { ins: '本能型', chi: '知略型', bal: '均衡型' };

/* ---------- タイトル ---------- */
UI.title = async () => {
  UI.show('title');
  const root = U.$('#scr-title');
  const has = await SAVE.hasAny();
  const art = UI.titleArt();
  root.classList.toggle('has-art', !!art);
  root.innerHTML = `${art}
    <canvas class="title-map" aria-hidden="true"></canvas>
    <div class="title-wrap">
      <div class="title-main">
        <div class="title-sub">ローマとカルタゴ・地中海戦記</div>
        <h1 class="title-v">地中海覇道</h1>
        <div class="title-seal" aria-hidden="true">覇権</div>
      </div>
      <div class="title-btns">
        <button class="btn seal" id="t-new">新しく始める</button>
        ${has ? '<button class="btn pri" id="t-cont">続きから</button>' : ''}
        <button class="btn" id="t-load">セーブを読み込む</button>
        <button class="btn ghost" id="t-help">遊び方</button>
        <button class="btn ghost" id="t-mod">MOD</button>
      </div>
      <p class="title-note">紀元前218年、ハンニバルがアルペスを越える。ローマ・カルタゴ・マケドニア・セレウコス朝・プトレマイオス朝・シュラクサイ・ヌミディアの七つの国が地中海の覇を競う。伍長から君主まで、好きな立場で覇権を目指せ。${typeof ACH !== 'undefined' && Object.keys(ACH.saved()).length ? `<br><span class="note">解いた実績 ${Object.keys(ACH.saved()).length} / ${D.ACH.length}</span>` : ''}</p>
    </div>`;
  UI.drawTitleMap(U.$('.title-map', root));
  // 肖像・紋章・地面の絵を先に読んでおく（遊び始めるころには揃う）
  ASSET.preload([...ASSET.keys('face/'), ...ASSET.keys('nation/emblem_')]);
  setTimeout(() => ASSET.preload([...ASSET.keys('ground/'), ...ASSET.keys('unit/tok_'), ...ASSET.keys('unit/ship_')]), 1500);
  if (typeof PWA !== 'undefined') setTimeout(() => { try { PWA.banner(); } catch (e) {} }, 1200);
  U.$('#t-new').onclick = () => UI.setupCountry();
  if (has) U.$('#t-cont').onclick = () => UI.loadMenu();
  U.$('#t-load').onclick = () => UI.loadMenu(true);
  const tm = U.$('#t-mod'); if (tm) tm.onclick = () => UI.modMenu();
  U.$('#t-help').onclick = () => UI.help();
};
UI.titleArt = () => {
  const a = ASSET.url('title/title_16x9'), b = ASSET.url('title/title_9x16');
  if (!a && !b) return '';
  return `<picture class="title-art" aria-hidden="true">${a && b ? `<source media="(max-aspect-ratio: 4/5)" srcset="${b}">` : ''}<img src="${a || b}" alt="" decoding="async"></picture>`;
};
UI.drawTitleMap = (cv) => {
  // 画面いっぱいに地中海の地形を薄く敷く（地図の絵は全体マップと同じタイルを使う）
  let vw = 1, vh = 1, dpr = 1;
  const fit = () => { const r = cv.getBoundingClientRect(); vw = Math.max(1, r.width); vh = Math.max(1, r.height); dpr = 1; cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr); };
  const g = cv.getContext('2d');
  const fade = () => {
    // 上下を闇に溶かす
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'destination-out';
    const lg = g.createLinearGradient(0, 0, 0, cv.height);
    lg.addColorStop(0, 'rgba(0,0,0,.55)'); lg.addColorStop(0.18, 'rgba(0,0,0,0)'); lg.addColorStop(0.55, 'rgba(0,0,0,0)'); lg.addColorStop(0.85, 'rgba(0,0,0,.92)'); lg.addColorStop(1, 'rgba(0,0,0,1)');
    g.fillStyle = lg; g.fillRect(0, 0, cv.width, cv.height);
    g.globalCompositeOperation = 'source-over';
  };
  const paint = () => {
    if (!document.body.contains(cv)) { MAP.subs.delete(paint); window.removeEventListener('resize', onResize); return; }
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
    const s = Math.max(vw / 720, vh / 560);
    const cam = { x: 560, y: 350, s };
    if (MAP.ready && MAP.world) {
      MAP.world.draw(g, cam, vw, vh, dpr);
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalCompositeOperation = 'color'; g.fillStyle = '#7a5a2a'; g.fillRect(0, 0, cv.width, cv.height);
      g.globalCompositeOperation = 'multiply'; g.fillStyle = '#8c7c66'; g.fillRect(0, 0, cv.width, cv.height); g.globalCompositeOperation = 'source-over';
      g.setTransform(s * dpr, 0, 0, s * dpr, (vw / 2 - cam.x * s) * dpr, (vh / 2 - cam.y * s) * dpr);
      g.fillStyle = '#e8c36a';
      for (const p of D.PROVINCES) { g.beginPath(); g.arc(p.x, p.y, p.cap ? 4.5 : 2.6, 0, 6.28); g.fill(); }
      fade();
      cv.classList.add('real');
      return;
    }
    g.setTransform(s * dpr, 0, 0, s * dpr, (vw / 2 - cam.x * s) * dpr, (vh / 2 - cam.y * s) * dpr);
    g.strokeStyle = '#c9a14a'; g.lineWidth = 2;
    for (const rv of D.MAPDECO.rivers) { g.beginPath(); rv.p.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); }
    g.fillStyle = '#c9a14a';
    for (const p of D.PROVINCES) { g.beginPath(); g.arc(p.x, p.y, p.cap ? 6 : 3.5, 0, 6.28); g.fill(); }
    g.strokeStyle = 'rgba(201,161,74,.6)'; g.lineWidth = 1;
    for (const [a, b] of D.EDGES) { const A = S.P[a], Bp = S.P[b]; g.beginPath(); g.moveTo(A.x, A.y); g.lineTo(Bp.x, Bp.y); g.stroke(); }
    fade();
  };
  const onResize = () => { fit(); paint(); };
  window.addEventListener('resize', onResize);
  fit();
  MAP.subs.add(paint);
  paint();
  MAP.init().then(() => paint()).catch(() => {});
};
UI.help = () => UI.info({
  title: '遊び方', body:
`1. 時代と国、立場（伍長〜大将軍、書記官〜大軍師、村長〜監察官、宰相・君主）を選び、主人公の能力を決める。
2. 毎月「任務状」の数だけ行動できる。立場ごとにできることが違う。
   ・武官：訓練・装備・拠点攻略・遠征・戦場へ駆けつける
   ・「軍」タブの「部隊の割り振り」で、部下に何人任せるか・合戦での任せ方・兵種の転換を決められる（任務状は使わない）。気に入らない部下は解任できる（兵は直属に戻るが、本人は恨み、ほかの部下も少し不安がる）
   ・「軍」タブの「合戦に出る部隊」で、合戦のたびに連れて行く兵を選ぶか、「敵の倍まで」「直属だけ」「全軍」から決めておける。出なかった兵は留守で、損害を受けない
   ・「人物」タブの「特性工房」で、自分だけの特性を作って付けられる
   ・文官：管轄地の内政、大臣は国政、宰相・君主は国法・外交・戦争
3. 行動を終えたら「月を進める」。各国が動き、戦や事件が起きる。
4. 合戦はリアルタイム。部隊をタップして選び、地面で移動、敵で攻撃。
   隊ごとの士気、挟撃、伏兵、射撃区域、攻城、一騎打ちを駆使せよ。
   ・開戦前は「布陣のターン」。軍議の札から「布陣へ」を押すと、帯だけを残して地図が広く出る。部隊（下の札でも選べる）をタップして選び、置きたい所をタップ（引いても動く）。旗の下の札と下の札に兵種（歩兵・長槍・散兵・投石・軽騎・重騎・戦象など）が出る。札の色は兵科（歩兵は生成り、射撃兵は青緑、騎兵は金、戦象・鎌戦車は朱、攻城兵器は茶）。陣形・伏兵・分割もここで決められる。「このまま開戦」で飛ばせる。
   ・「分割」で分けた別動隊は、本隊の近くに戻して「結合」で一つに戻せる。
   ・戦場は立体（3D）で見られる。一本指で動かし、二本指で回す・傾ける・近づける。右の「2D／3D」で切り替え。
   ・一騎打ちは立体の動画で、馬と武者が駆け違いざまに斬り結ぶ。相手の動きを読み、攻撃・強撃・受け・必殺を選ぶ。気迫が満ちると必殺が出せる。深手を負えば落馬し、徒歩の立ち合いになる。画面をタップすると動きを早送りできる。
   ・敵将には「用兵」の個性がある（猪突・堅実・智謀・騎将・攻城・守城）。布陣の画面で敵将の用兵が分かる。
   ・開戦・突撃・討ち取り・勝敗・落城などはカットインで知らせる（軍営の「演出」で切れる）。
   ・ファランクスは正面に強く、側面と背後、森や岩場のようなでこぼこの地に弱い。戦象は馬を怯えさせるが、散兵の投げ槍や矢を浴びると驚いて暴れ、逃げる道すがら味方を踏みつける。ガリアの戦士は最初の突撃が激しいが、長引くと崩れやすい。
   ・【戦場選び】統率70以上の総大将は、開戦前に戦場を選べる（統率が高いほど候補が増え、最大五つ）。選んだ側が有利な側（絵の下）に布陣し、士気も上がる。隘路・湖畔の隘路・渡し・尾根・浜辺・湿地・森・陣営の柵・廃墟・段々畑など、名のある戦場は二千以上。カンナエやトラシメヌスのような史実の戦場も、その近くで戦えば候補に出る。敵将の統率が上なら、敵が選ぶ。軍営の「戦場図鑑」で、戦ったことのある戦場を見返せる。
   ・【障害物】柵・堀・逆茂木・荷車の砦・石垣・岩塊・家並みは、通れないか、通りにくい。隙間に敵を誘い込め。
   ・【市街戦】大きな都は、城壁を破られても通りに荷車と石を積み、家々に籠もって抵抗することがある（攻城戦のあとの市街戦）。家並みは通れず、通りと広場を奪い合う。
   ・【海戦】海を渡る遠征では、守り手の艦隊が沖で迎え撃つことがある。海に面した州では海賊が出る（「戦場へ」から海賊討伐）。兵は海兵として船に乗る（五段櫂船・三段櫂船・快速船・櫓のある大型艦。国ごとに船と漕ぎ手の腕が違う）。速く突っ込めば衝角で敵船の横腹や艫を破って沈める（「突撃」）。舳先どうしはお互いに傷む。ローマの船は渡し橋（コルウス）で敵船をつかまえ、軍団兵が乗り移って戦う。浅瀬は重い船の足を取る。海峡・湾・群島・港口・岬・河口など、海の戦場も四百あまり。負ければ船とともに兵も海に消える。
5. 功績を挙げると昇進する。官職は三等→二等→一等と一段ずつ進み、一段ごとに在任期間が要る。上の官職には名声や戦歴も要る。
   ・将軍・大将軍は功績に応じて率いる兵が増える（将軍は最大十万、大将軍は最大五十万）。
   ・身分（二十一段）は下・中・上の三段に分かれ、一か月に一段ずつ上がる。身分が上がると土地（私領）が増える。
6. 土地は州（大都市）の下に中都市・小都市・地域があり、ひとつずつ奪い合う。
   ・中都市・小都市・地域は「拠点攻略」（地図で拠点をタップ→攻略）で取る。小さな拠点から順に、位が上がるほど大きな拠点を任される。奪った拠点の実りはこちらのものになり、拠点を奪われた州は治安と民心が下がり、守りも弱る。
   ・州そのもの（大都市）は「遠征」で取る。前哨戦で拠点を破り、敵が城を出てくれば野戦、城に籠もれば攻城戦。野戦で敵の主力を殲滅すれば、攻城戦の前に開城させられる。大都市が落ちると、その州の拠点の多くも降る。
   ・大都市を前にして「包囲」を選べば、月をまたいで城を囲める。兵糧攻め・水攻め（川沿いの州）・坑道・内応・強襲を選び、敵の救援軍を迎え撃つ。囲まれた側は救援を送るか、城に耐えさせる。
   ・海を挟んだ州へは船で渡る（地図の点線が航路）。守り手の艦隊が出てくれば、まず海戦。勝てば上陸できる。
   ・補給線（自領からの遠さ）が細いと、遠征軍の士気が下がり包囲中の兵が減る。冬の遠征は兵を損ない、雨の季節は川沿いの攻めが鈍る。夏から秋は「刈り入れ」で敵の実りを奪える（敵も奪いに来る）。
7. 大きな戦で活躍すると武名が上がり、「〇〇の鬼神」のような異名で呼ばれる。名が地中海に轟けば、合戦で敵がひるむ。武官の頂点は「地中海の覇将」。
8. 人の縁。将たちのあいだには恩と怨があり、国には王家と門閥・宰相派・将軍派の派閥がある（「人物」タブ）。
   ・自分の派閥が弱いと昇進に横槍が入り、対立派閥から讒言が来る。「弾劾」で相手を退けられるが、負ければこちらが傷つく。「派閥」で鞍替えもできる。
   ・部下は合戦で育ち、深手を負い、絆が薄いと引き抜かれ、怨めば寝返る。「部下の推薦」で引き立てた部下は、格が追いつくと巣立って友となり、合戦に駆けつけてくれる。
   ・亡くなった部下や縁のあった者は「亡き者たち」に残る。
9. 実績と年代記。節目ごとに実績が解け、称号を名乗れるものもある。軍営の「年代記・実績」で、歩んだ道を年ごとに読み返せる。
10. 時代を選べる。はじめの画面で、始まりの年を選ぶ。
11. MOD。軍営やタイトルの「MOD」で、自分で作った人物や事件を足せる。書き出した文字列を読み込めば別の端末でも使える。
12. 自国が地中海を統一すれば終幕。

・地図は二本指（またはホイール）で拡大できる。寄るほど町や村、川や道まで細かく見える。州をタップすると町と拠点の一覧。
・他国に奪われた拠点は白い縁の印と、奪った国の色のにじみで示される。自国の拠点の印は、州を選ぶか大きく寄ると出る。
・合戦の戦場は、全体マップのその土地の地形（川・湖・森・畑・村・道・海辺）からつくられる。戦場を選んだときは、選んだ名のある戦場の形になる。
・三か月ごとに評定があり、上官から任務を受けられる。
・九月末に年度の考課があり、一年の働きが評価される。
・急に領土を広げた国は「厭戦」で慎重になる。州を失い残り二州以下になった国は「存亡」の総動員で粘る。
・史実の年が来ると、その国は総力を挙げた大攻勢をかける（ハンニバルのイタリア遠征、スキピオのアフリカ遠征など）。史実の人物も年を追って世に出てくる（カスタムで切れる）。
・ホーム画面に追加すると、アプリとして全画面で遊べる（iPhoneは共有→ホーム画面に追加）。音は軍営の「音」で切れる。`});

/* ---------- 国の選択 ---------- */
UI.newCfg = () => ({ scenario: 'start', country: 'rome', rank: 'goch', min: 'chiso', sei: '', mei: '', age: 20, stats: { bu: 50, tou: 50, chi: 50, pol: 50, mi: 50 }, bonus: 0, traits: [], tactics: [], style: 'bal', diff: 1, loc: null, squadNames: [], deputy: null, banner: 0, mode: 'normal', custom: null });
UI.setupCountry = () => {
  UI.cfg = UI.cfg || UI.newCfg();
  UI.show('setup');
  const root = U.$('#scr-setup');
  const SC = D.scenario(UI.cfg.scenario);
  UI.cfg.scenario = SC.id;
  const ownerOf = (p) => (SC.owners && SC.owners[p.id]) || p.o;
  const deadC = new Set(SC.dead || []);
  if (deadC.has(UI.cfg.country)) UI.cfg.country = D.CORDER.find(c => !deadC.has(c)) || 'rome';
  const cards = D.CORDER.map(c => {
    const C = D.COUNTRIES[c];
    const ps = D.PROVINCES.filter(p => ownerOf(p) === c);
    const pop = U.sum(ps, p => p.pop);
    const n = ps.length;
    const dead = deadC.has(c);
    const ban = ASSET.url('nation/banner_' + c);
    return `<button class="pick ${UI.cfg.country === c ? 'on' : ''}${ban ? ' has-ban' : ''}" data-c="${c}" ${dead ? 'disabled' : ''}>${ban ? `<img class="pick-ban" src="${ban}" alt="" loading="lazy" decoding="async">` : ''}
      <div class="row">${UI.cseal(c)}<div><b>${C.name}</b><br><small>${dead ? 'すでに滅んでいる' : C.trait}</small></div></div>
      <small>${C.desc}</small>
      <small class="num">${dead ? '－' : `${n}州・人口${pop}万`}</small></button>`;
  }).join('');
  const scen = D.SCENARIOS.map(sc => `<button class="pick scn ${SC.id === sc.id ? 'on' : ''}" data-s="${sc.id}">${ASSET.url('title/scen_' + sc.id) ? `<img class="scn-art" src="${ASSET.url('title/scen_' + sc.id)}" alt="" loading="lazy" decoding="async">` : ''}<b>${sc.sub}　${sc.n}</b><small>${sc.d}</small></button>`).join('');
  root.innerHTML = `<div class="flow pad"><div class="flow-in">
    <div class="step-h"><h2>時代と国</h2><small>一 / 三</small></div>
    <div class="sec-h">始まりの年</div>
    <div class="grid" id="s-scn">${scen}</div>
    <div class="sec-h">仕える国</div>
    <div class="grid wide">${cards}</div>
    <p class="note" style="margin-top:14px">${SC.d}</p>
  </div></div>
  <div class="bottom-bar"><button class="btn" id="s-back">戻る</button><button class="btn seal" id="s-next">次へ</button></div>`;
  for (const b of U.$$('.pick[data-c]', root)) b.onclick = () => { if (UI.cfg.country !== b.dataset.c) { UI.cfg.sei = ''; UI.cfg.mei = ''; UI.cfg.cul = null; UI.cfg.squadNames = []; } UI.cfg.country = b.dataset.c; UI.cfg.loc = null; for (const x of U.$$('.pick[data-c]', root)) x.classList.toggle('on', x === b); };
  for (const b of U.$$('.pick.scn', root)) b.onclick = () => { UI.cfg.scenario = b.dataset.s; UI.setupCountry(); };
  U.$('#s-back').onclick = () => UI.title();
  U.$('#s-next').onclick = () => UI.setupRank();
};
UI.RANK_GROUPS = [
  ['君主と宰相', ['kuns', 'josh'], ''],
  ['武官（将軍の系列）', D.LADDER.mil.filter(r => D.SELECTABLE.includes(r)).reverse(), '頂点は「地中海の覇将」。大将軍として武名を地中海に轟かせた者だけが至る。'],
  ['軍師（幕僚の系列）', D.LADDER.staff.slice().reverse(), '大軍師の先は宰相。軍師からは合戦で総軍師として全軍に指示を出せる。'],
  ['文官（官吏の系列）', D.LADDER.civ.slice().reverse(), '監察官の先は宰相。'],
];
UI.rankPower = (r) => {
  const rk = D.RANKS[r];
  const out = [];
  if (r === 'kuns') out.push('国法・外交・戦争・人事のすべて', '親征');
  else if (r === 'josh') out.push('国法・外交・戦争の決定', '人事・評定');
  else if (r === 'gyos') out.push('監察・弾劾・法案の上奏');
  else if (r === 'daij') out.push('大臣の一つの国政');
  else if (rk.track === 'staff') { if (rk.tier >= 7) out.push('戦術の管理・軍議', '合戦で全軍に指示'); else out.push('軍議で策を献じる', '将の軍で戦う'); }
  else if (rk.track === 'mil') {
    if (rk.tier >= 7) out.push('小規模戦闘を自由に', '攻略の上奏（戦争は許可制）');
    else out.push('上官の下で戦う');
    if (r === 'goch') out.push('組の四人を管理');
  } else if (rk.track === 'civ') out.push(`${D.JUR[r]?.n || ''}の内政`, r === 'teic' ? '盗賊の捕縛' : '');
  out.push(`兵${U.fmt(rk.troops)}${rk.tmax ? '〜' + U.fmt(rk.tmax) : ''}`, `任務状${rk.ap}`);
  return out.filter(Boolean).join('・');
};
UI.setupRank = () => {
  UI.show('setup');
  const root = U.$('#scr-setup');
  const c = UI.cfg.country;
  const holder = (r) => {
    const h = D.HIST.find(x => x[1] === c && x[2].split(':')[0] === r && ['kuns', 'josh'].includes(r));
    return h ? `（史実では${h[0]}）` : '';
  };
  let html = '';
  for (const [g, rs, note] of UI.RANK_GROUPS) {
    html += `<div class="sec-h">${g}</div>${note ? `<p class="note" style="margin:-4px 0 8px">${note}</p>` : ''}<div class="grid wide">`;
    for (const r of rs) {
      const rk = D.RANKS[r];
      const pos = rk.track === 'top' ? -1 : (D.LADDER[rk.track] || []).indexOf(r);
      html += `<button class="pick ${UI.cfg.rank === r ? 'on' : ''}" data-r="${r}"><span class="tag">${pos >= 0 ? '第' + U.kanjiNum(pos + 1) + '階' : ''}</span><b>${rk.name}</b><small>${rk.desc}${holder(r)}</small><small style="color:var(--jade)">${UI.rankPower(r)}</small></button>`;
    }
    html += '</div>';
  }
  root.innerHTML = `<div class="flow pad"><div class="flow-in">
    <div class="step-h"><h2>立場</h2><small>二 / 三　${D.COUNTRIES[c].name}</small></div>
    <p class="note">立場によって、できることも、戦場での役目も変わる。低い身分から成り上がるのも、君主として国を動かすのも自由だ。</p>
    ${html}
  </div></div>
  <div class="bottom-bar"><button class="btn" id="s-back">戻る</button><button class="btn seal" id="s-next">能力を決める</button></div>`;
  for (const b of U.$$('.pick', root)) b.onclick = () => { UI.cfg.rank = b.dataset.r; for (const x of U.$$('.pick', root)) x.classList.toggle('on', x === b); };
  U.$('#s-back').onclick = () => UI.setupCountry();
  U.$('#s-next').onclick = () => UI.editor();
};

/* ---------- 主人公の作成 ---------- */
UI.PRESETS = {
  '猛将': { bu: 92, tou: 72, chi: 40, pol: 24, mi: 56 },
  '名将': { bu: 72, tou: 90, chi: 74, pol: 30, mi: 58 },
  '軍師': { bu: 26, tou: 60, chi: 95, pol: 62, mi: 50 },
  '宰相': { bu: 22, tou: 44, chi: 78, pol: 95, mi: 70 },
  '万能': { bu: 62, tou: 64, chi: 62, pol: 60, mi: 62 },
};
UI.CUSTOM_PRESETS = {
  '覇王': { bu: 110, tou: 110, chi: 100, pol: 90, mi: 110 },
  '武神': { bu: 120, tou: 95, chi: 55, pol: 30, mi: 70 },
  '神算': { bu: 35, tou: 90, chi: 120, pol: 95, mi: 75 },
  '平凡': { bu: 50, tou: 50, chi: 50, pol: 50, mi: 50 },
};
UI.statCost = (v) => { let c = 0; for (let i = 41; i <= v; i++) c += i > 80 ? 2 : 1; for (let i = 40; i > v; i--) c -= 1; return c; };
UI.traitCost = (id) => { const T = D.TRAITS[id]; if (!T) return 0; if (T.custom) return T.cost; if (T.neg) return -6; return T.lv >= 3 ? 20 : T.lv === 2 ? 8 : 0; };
UI.TRAIT_MAX = 3;
UI.pool = (cfg) => 100 + (cfg.age >= 45 ? 30 : cfg.age >= 30 ? 15 : 0) + cfg.bonus + (D.RANKS[cfg.rank].tier >= 7 ? 20 : 0);
UI.used = (cfg) => U.sum(Object.values(cfg.stats), v => UI.statCost(v)) + U.sum(cfg.traits, t => UI.traitCost(t));
UI.tacMax = (cfg) => cfg.mode === 'custom' ? D.TACTIC_ORDER.length : 1 + Math.floor(cfg.stats.chi / 25) + (D.RANKS[cfg.rank].track === 'staff' ? 2 : 0) + (D.RANKS[cfg.rank].tier >= 7 ? 1 : 0);
UI.effStats = (cfg) => { const st = Object.assign({}, cfg.stats); for (const t of cfg.traits) { const T = D.TRAITS[t]; if (T) for (const k of S.STATK) if (T.fx[k]) st[k] += T.fx[k]; } return st; };
UI.defaultTactics = (cfg) => {
  const st = UI.effStats(cfg);
  const ok = D.TACTIC_ORDER.filter(t => D.tacticReqOk(t, st));
  const pref = ['shazone', 'kenjin', 'taiko', 'fukuhei', 'sekkou', 'heitan_b', 'kakei', 'houi', 'kanchou', 'ryugen', 'gekibun', 'tsuigeki', 'kyoba', 'yahei'];
  const out = [], max = Math.min(UI.tacMax(cfg), 8);
  for (const t of pref) if (ok.includes(t) && out.length < max) out.push(t);
  for (const t of ok) if (!out.includes(t) && out.length < max) out.push(t);
  return out;
};
UI.customDefaults = () => ({ gold: 1, food: 1, troops: 1, jue: 0, ap: 0, noDeath: false, noAge: false, hist: true, aggr: 1, train: 0 });
UI.CUSTOM_OPTS = [
  { k: 'gold', n: '初期の金', o: [[1, '標準'], [5, '×5'], [20, '×20'], [100, '×100']] },
  { k: 'food', n: '初期の兵糧', o: [[1, '標準'], [5, '×5'], [20, '×20'], [100, '×100']] },
  { k: 'troops', n: '初期の兵', o: [[1, '標準'], [2, '×2'], [5, '×5']] },
  { k: 'train', n: '兵の練度', o: [[0, '標準'], [60, '精鋭'], [85, '最精鋭']] },
  { k: 'ap', n: '任務状（毎月の行動）', o: [[0, '標準'], [1, '+1'], [2, '+2'], [3, '+3']] },
  { k: 'jue', n: '身分', o: [[0, '立場の通り'], [9, '上級騎士'], [14, '王の友'], [19, '領主'], [20, '諸侯']] },
  { k: 'aggr', n: '他国の好戦性', o: [[0.5, '低い'], [1, '標準'], [1.6, '高い']] },
  { k: 'hist', n: '史実の流れ（事件・大攻勢・人物の登場）', o: [[true, 'あり'], [false, 'なし']] },
  { k: 'noDeath', n: '主人公の討ち死に', o: [[false, 'あり'], [true, 'なし']] },
  { k: 'noAge', n: '寿命', o: [[false, 'あり'], [true, 'なし']] },
];
UI.editor = () => {
  const cfg = UI.cfg;
  if (!cfg.mode) cfg.mode = 'normal';
  if (!cfg.custom) cfg.custom = UI.customDefaults();
  if (!cfg.sei) { const nm = S.genName(null, cfg.country); cfg.sei = nm.sei; cfg.mei = nm.mei; cfg.cul = nm.cul; }
  if (cfg.rank === 'goch' || cfg.rank === 'ritei') { if (cfg.squadNames.length !== 4) cfg.squadNames = [0, 1, 2, 3].map(() => S.genName(null, cfg.country).n); }
  if (D.RANKS[cfg.rank].tier >= 2 && !UI._deps) UI._deps = S.makeDeputyCandidates(3);
  if (!cfg.deputy && UI._deps) cfg.deputy = UI._deps[0];
  // 初期の能力：立場に合わせたプリセット
  if (!cfg._init || cfg._init !== cfg.rank) {
    cfg._init = cfg.rank;
    const tr = D.RANKS[cfg.rank].track;
    const pre = tr === 'staff' ? '軍師' : tr === 'civ' || cfg.rank === 'josh' ? '宰相' : cfg.rank === 'kuns' ? '万能' : (D.RANKS[cfg.rank].tier >= 6 ? '名将' : '猛将');
    cfg.stats = Object.assign({}, UI.PRESETS[pre]);
    cfg.traits = tr === 'staff' ? ['gunryaku', 'fukuhei'] : tr === 'civ' ? ['nousei', 'houka'] : cfg.rank === 'kuns' || cfg.rank === 'josh' ? ['jinbou', 'benzetsu'] : ['kobu', 'totsu'];
    if (cfg.mode !== 'custom') UI.fitPool(cfg);
    cfg.style = tr === 'staff' ? 'chi' : 'bal';
    cfg.tactics = UI.defaultTactics(cfg);
  }
  UI.show('edit');
  UI.renderEditor();
};
UI.fitPool = (cfg) => {
  let guard = 0;
  while (UI.used(cfg) > UI.pool(cfg) && guard++ < 500) { const k = U.maxBy(Object.keys(cfg.stats), k => cfg.stats[k]); cfg.stats[k]--; }
};
UI.editorErrors = (cfg) => {
  const errs = [];
  if (!cfg.sei || !cfg.mei) errs.push('名前を入れて');
  if (cfg.mode !== 'custom') {
    if (UI.pool(cfg) - UI.used(cfg) < 0) errs.push('能力ptが足りない');
    if (cfg.traits.length > UI.TRAIT_MAX) errs.push(`特性は${UI.TRAIT_MAX}つまで`);
    if (cfg.traits.some(t => D.TRAITS[t]?.uniq)) errs.push('固有の特性はカスタムのみ');
    if (cfg.tactics.length > UI.tacMax(cfg)) errs.push(`戦術は${UI.tacMax(cfg)}つまで`);
    const st = UI.effStats(cfg);
    if (cfg.tactics.some(t => !D.tacticReqOk(t, st))) errs.push('条件を満たさない戦術がある');
  }
  return errs;
};
UI.traitChip = (t, removable, compact) => { const T = D.TRAITS[t]; if (!T) return ''; return `<span class="tchip on lv${T.lv}${T.neg ? ' neg' : ''}${T.custom ? ' cx' : ''}${compact ? ' sm' : ''}" title="${U.esc(T.d)}"><b>${'★'.repeat(T.lv >= 3 ? 1 : 0)}${U.esc(T.n)}${removable ? `<i class="x" data-rmt="${t}" role="button" aria-label="外す">✕</i>` : ''}</b>${compact ? '' : `<small>${U.esc(T.d)}</small>`}</span>`; };
UI.renderEditor = () => {
  const cfg = UI.cfg, root = U.$('#scr-edit');
  const custom = cfg.mode === 'custom';
  const rk = D.RANKS[cfg.rank];
  const pool = UI.pool(cfg), used = UI.used(cfg), left = pool - used;
  const C = D.COUNTRIES[cfg.country];
  const smax = custom ? 120 : 100, smin = custom ? 1 : 10;
  const steps = custom ? [-10, -1, 1, 10] : [-5, -1, 1, 5];
  const statRows = Object.keys(UI.statName).map(k => `
    <div class="stat-row"><b>${UI.statName[k].slice(0, 1)}<small style="font-size:11px;color:var(--fg2);font-family:var(--font-body)">${UI.statName[k].slice(1)}</small></b>
      ${UI.bar(cfg.stats[k], smax, 'br')}
      <span class="num" style="text-align:right;font-size:17px">${cfg.stats[k]}</span>
      <div class="stepper">${steps.map(d => `<button data-k="${k}" data-d="${d}" aria-label="${UI.statName[k]}を${Math.abs(d)}${d > 0 ? '上げる' : '下げる'}">${d > 0 ? '＋' : '−'}${Math.abs(d) === 1 ? '' : Math.abs(d)}</button>`).join('')}</div>
    </div>`).join('');
  const scOw = (D.scenario(cfg.scenario) || {}).owners || {};
  const myProvs = D.PROVINCES.filter(p => (scOw[p.id] || p.o) === cfg.country && !p.pass);
  const locOpts = myProvs.map(p => `<option value="${p.id}" ${cfg.loc === p.id ? 'selected' : ''}>${p.name}${p.cap ? '（都）' : ''}</option>`).join('');
  const needLoc = rk.track === 'mil' || rk.track === 'staff' || (rk.track === 'civ' && rk.tier <= 6);
  const deps = UI._deps && rk.tier >= 2 ? UI._deps.map((d, i) => `<button class="tchip ${cfg.deputy === d ? 'on' : ''}" data-dep="${i}"><b>${d.n}（${d.kind}）</b><small>武${d.stats.bu} 統${d.stats.tou} 知${d.stats.chi} 政${d.stats.pol} 魅${d.stats.mi}　${d.tr.map(t => D.TRAITS[t].n).join('・')}</small></button>`).join('') : '';
  const tmax = UI.tacMax(cfg), st = UI.effStats(cfg);
  const tcompact = cfg.tactics.length > 8;
  const tacChips = cfg.tactics.map(t => { const T = D.TACTICS[t]; const ok = custom || D.tacticReqOk(t, st); return `<span class="tchip on ${ok ? '' : 'neg'}${tcompact ? ' sm' : ''}" title="${U.esc(T.d)}"><b>${U.esc(T.n)}<i class="x" data-rmc="${t}" role="button" aria-label="外す">✕</i></b>${tcompact ? '' : `<small>${U.esc(T.d)}${ok ? '' : `（要 ${D.tacticReqStr(t)}）`}</small>`}</span>`; }).join('');
  const errs = UI.editorErrors(cfg);
  const customRows = custom ? UI.CUSTOM_OPTS.map(op => `<div class="opt-row"><span>${op.n}</span><div class="seg sm" data-opt="${op.k}">${op.o.map(([v, n], i) => `<button data-i="${i}" class="${cfg.custom[op.k] === v ? 'on' : ''}">${n}</button>`).join('')}</div></div>`).join('') : '';
  root.innerHTML = `<div class="flow pad"><div class="flow-in">
    <div class="step-h"><h2>主人公</h2><small>三 / 三　${C.name}の${rk.name}</small></div>
    <div class="seg" id="e-mode"><button data-m="normal" class="${custom ? '' : 'on'}">通常</button><button data-m="custom" class="${custom ? 'on' : ''}">カスタム</button></div>
    <p class="note">${custom ? 'カスタム：能力（1〜120）・特性・戦術・初期条件を自由に決められる。' : '通常：能力ptの範囲で作る。特性は3つまで（上位の特性はptを使う）。戦術は知力に応じた数だけ。'}</p>
    <div class="card" style="display:flex;gap:16px;align-items:center">
      <div class="e-face" id="e-face">${PORT.tag(PORT.fromCfg(cfg), 84, { seal: false })}<div class="flag" id="e-flag" style="background:${C.color === '#26262d' ? '#2e2e38' : C.color}">${U.esc((cfg.sei || '？').slice(0, 1))}</div></div>
      <div style="flex:1;min-width:0">
        <div class="row2">
          <div class="field"><label for="e-mei">名</label><input id="e-mei" maxlength="10" value="${U.esc(cfg.mei)}" autocomplete="off"></div>
          <div class="field"><label for="e-sei">${(cfg.cul || S.cultOf(cfg.country)) === 'latin' ? '氏族名' : '家・部族'}</label><input id="e-sei" maxlength="10" value="${U.esc(cfg.sei)}" autocomplete="off"></div>
        </div>
        <div class="field"><label for="e-age">年齢 ${cfg.age}歳 <span class="note">${custom ? '' : '（若いほど伸びしろ、年長ほど能力ptが多い）'}</span></label><input id="e-age" type="range" min="15" max="${custom ? 80 : 55}" value="${cfg.age}" style="min-height:24px;padding:0;background:transparent;border:0"></div>
      </div>
    </div>
    <div class="sec-h">能力</div>
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
        ${custom ? '<div class="note">自由に設定（1〜120）</div>' : `<div>残り <span class="pts num" id="e-left" style="color:${left < 0 ? 'var(--bad)' : 'var(--bronze)'}">${left}</span> / ${pool}</div>`}
        <div class="seg">${Object.keys(custom ? Object.assign({}, UI.PRESETS, UI.CUSTOM_PRESETS) : UI.PRESETS).map(p => `<button data-pre="${p}">${p}</button>`).join('')}${custom ? '' : '<button id="e-dice" title="才能のボーナスを振り直す">才能を占う</button>'}</div>
      </div>
      ${custom ? '' : `<p class="note" style="margin:6px 0 2px">81以上は1上げるのに2pt。才能ボーナス：+${cfg.bonus}</p>`}
      ${statRows}
    </div>
    <div class="sec-h">戦い方</div>
    <div class="seg" id="e-style">${Object.keys(UI.styleName).map(s => `<button data-s="${s}" class="${cfg.style === s ? 'on' : ''}">${UI.styleName[s]}</button>`).join('')}</div>
    <p class="note">${{ ins: '本能型：突撃と乱戦に強く、伏兵を勘で察する。読めない動きで敵を崩す。', chi: '知略型：軍議で準備できる戦術が一つ増え、射撃区域と伏兵の効果が上がる。', bal: '均衡型：兵の士気が少し高い。どんな戦場でも崩れにくい。' }[cfg.style]}</p>
    <div class="sec-h">特性 <small class="note">${custom ? `${cfg.traits.length}個` : `${cfg.traits.length}/${UI.TRAIT_MAX}　★や上位はpt消費・短所はpt還元`}</small></div>
    <div class="chipgrid" id="e-traits">${cfg.traits.map(t => UI.traitChip(t, true, cfg.traits.length > 8)).join('') || '<p class="empty">なし</p>'}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><button class="btn sm pri" id="e-tpick">特性を選ぶ（全${D.TRAIT_ORDER.length + D.CTR_IDS.length}種）</button><button class="btn sm" id="e-tmake">特性を作る${D.CTR_IDS.length ? `（自作${D.CTR_IDS.length}）` : ''}</button>${custom ? '' : '<button class="btn sm" id="e-trand">おまかせ</button>'}</div>
    <div class="sec-h">戦術 <small class="note">${cfg.tactics.length}${custom ? '' : '/' + tmax}　軍議で準備できる策</small></div>
    <div class="chipgrid" id="e-tacs">${tacChips || '<p class="empty">なし</p>'}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><button class="btn sm pri" id="e-cpick">戦術を選ぶ（全${D.TACTIC_ORDER.length}種）</button>${custom ? '<button class="btn sm" id="e-call">すべて会得</button>' : '<button class="btn sm" id="e-cauto">おまかせ</button>'}</div>
    ${cfg.rank === 'daij' ? `<div class="sec-h">担当（大臣）</div><div class="chipgrid" id="e-min">${D.MIN_ORDER.map(m => `<button class="tchip ${cfg.min === m ? 'on' : ''}" data-m="${m}"><b>${D.MINISTRIES[m].n}</b><small>${D.MINISTRIES[m].d}</small></button>`).join('')}</div>` : ''}
    ${needLoc ? `<div class="sec-h">${rk.track === 'civ' ? '赴任地' : '配属'}</div><div class="field"><label for="e-loc">${rk.track === 'civ' ? '管轄する州' : '駐屯する州（空欄なら最前線）'}</label><select id="e-loc"><option value="">${rk.track === 'civ' ? 'おまかせ' : '最前線（おまかせ）'}</option>${locOpts}</select></div>` : ''}
    ${cfg.squadNames.length && (cfg.rank === 'goch' || cfg.rank === 'ritei') ? `<div class="sec-h">組の仲間</div><div class="grid">${cfg.squadNames.map((n, i) => `<div class="field"><label for="e-wu${i}">${['一', '二', '三', '四'][i]}人目</label><input id="e-wu${i}" data-wu="${i}" maxlength="4" value="${U.esc(n)}"></div>`).join('')}</div>` : ''}
    ${deps ? `<div class="sec-h">副官</div><p class="note">統率60以上か知力65以上の副官なら、合戦で部隊を任せて別動隊を率いられる。</p><div class="chipgrid" id="e-dep">${deps}</div>` : ''}
    ${custom ? `<div class="sec-h">カスタム設定</div><div class="card opts">${customRows}</div>` : ''}
    <div class="sec-h">難易度</div>
    <div class="seg" id="e-diff">${['易しい', '普通', '難しい'].map((d, i) => `<button data-d="${i}" class="${cfg.diff === i ? 'on' : ''}">${d}</button>`).join('')}</div>
    <p class="note">難しいほど主人公が討ち死にしやすく、敵の将は判断が早く兵も精強で、他国の国力も増す。讒言や引き抜きも増える。</p>
  </div></div>
  <div class="bottom-bar"><span class="grow note" style="color:var(--bad)">${U.esc(errs[0] || '')}</span><button class="btn" id="e-back">戻る</button><button class="btn seal" id="e-start" ${errs.length ? 'disabled' : ''}>この者で始める</button></div>`;
  const rerender = () => { const y = U.$('.flow', root).scrollTop; UI.renderEditor(); U.$('.flow', root).scrollTop = y; };
  const updStart = () => { const e = UI.editorErrors(cfg); U.$('#e-start').disabled = e.length > 0; U.$('.bottom-bar .grow', root).textContent = e[0] || ''; };
  const updFace = () => { const f = U.$('#e-face'); if (!f) return; const old = f.querySelector('.por'); if (old) old.remove(); f.insertAdjacentHTML('afterbegin', PORT.tag(PORT.fromCfg(cfg), 84)); PORT.fill(f); };
  U.$('#e-sei').oninput = (e) => { cfg.sei = e.target.value.trim(); U.$('#e-flag').textContent = (cfg.sei || '？').slice(0, 1); updStart(); updFace(); };
  U.$('#e-mei').oninput = (e) => { cfg.mei = e.target.value.trim(); updStart(); updFace(); };
  U.$('#e-age').onchange = (e) => { cfg.age = +e.target.value; rerender(); };
  U.$('#e-age').oninput = (e) => { const l = U.$('label[for=e-age]'); if (l) l.firstChild.textContent = `年齢 ${e.target.value}歳 `; };
  for (const b of U.$$('#e-mode button', root)) b.onclick = () => {
    const m = b.dataset.m; if (m === cfg.mode) return;
    cfg.mode = m;
    if (m === 'normal') { for (const k in cfg.stats) cfg.stats[k] = U.clamp(cfg.stats[k], 10, 100); cfg.traits = cfg.traits.filter(t => !D.TRAITS[t]?.uniq).slice(0, UI.TRAIT_MAX); UI.fitPool(cfg); const st2 = UI.effStats(cfg); cfg.tactics = cfg.tactics.filter(t => D.tacticReqOk(t, st2)).slice(0, UI.tacMax(cfg)); }
    rerender();
  };
  for (const b of U.$$('.stepper button', root)) b.onclick = () => {
    const k = b.dataset.k, d = +b.dataset.d;
    const nv = U.clamp(cfg.stats[k] + d, smin, smax);
    const old = cfg.stats[k]; cfg.stats[k] = nv;
    if (!custom && UI.pool(cfg) - UI.used(cfg) < 0 && d > 0) { cfg.stats[k] = old; let v = old; while (v < nv) { cfg.stats[k] = v + 1; if (UI.pool(cfg) - UI.used(cfg) < 0) { cfg.stats[k] = v; break; } v++; } }
    rerender();
  };
  for (const b of U.$$('[data-pre]', root)) b.onclick = () => { cfg.stats = Object.assign({}, UI.PRESETS[b.dataset.pre] || UI.CUSTOM_PRESETS[b.dataset.pre]); if (!custom) UI.fitPool(cfg); rerender(); };
  const dice = U.$('#e-dice'); if (dice) dice.onclick = () => { cfg.bonus = U.ri(0, 30); rerender(); UI.toast(`才能 +${cfg.bonus}`); };
  for (const b of U.$$('#e-style button', root)) b.onclick = () => { cfg.style = b.dataset.s; rerender(); };
  for (const x of U.$$('[data-rmt]', root)) x.onclick = (e) => { e.stopPropagation(); cfg.traits = cfg.traits.filter(t => t !== x.dataset.rmt); rerender(); };
  for (const x of U.$$('[data-rmc]', root)) x.onclick = (e) => { e.stopPropagation(); cfg.tactics = cfg.tactics.filter(t => t !== x.dataset.rmc); rerender(); };
  U.$('#e-tpick').onclick = async () => {
    const r = await UI.traitPicker({ selected: cfg.traits, max: custom ? 60 : UI.TRAIT_MAX, custom, cfg });
    if (r) { cfg.traits = r; if (!custom) UI.fitPool(cfg); rerender(); }
  };
  U.$('#e-tmake').onclick = async () => { await UI.ctrWorkshop({ cfg }); rerender(); };
  const trand = U.$('#e-trand'); if (trand) trand.onclick = () => { const role = S.roleOf(cfg.rank); cfg.traits = S.genTraits(role === 'staff' ? 'staff' : role, rk.tier, 2).filter(t => UI.traitCost(t) <= 8); UI.fitPool(cfg); rerender(); };
  U.$('#e-cpick').onclick = async () => {
    const st2 = UI.effStats(cfg);
    const res = await UI.multiPick({
      title: '戦術', body: custom ? '会得している戦術を選ぶ（いくつでも）。' : `会得している戦術を選ぶ（最大${UI.tacMax(cfg)}つ）。条件を満たすものだけ選べる。合戦では知力に応じた数を軍議で準備する。`,
      items: D.TACTIC_ORDER.map(t => ({ v: t, label: D.TACTICS[t].n, sub: `${D.TACTICS[t].d}　要 ${D.tacticReqStr(t)}`, g: D.TACTIC_CATS[D.TACTICS[t].cat], dis: !custom && !D.tacticReqOk(t, st2) })).sort((a, b) => D.TACTIC_ORDER.indexOf(a.v) - D.TACTIC_ORDER.indexOf(b.v)).sort((a, b) => Object.values(D.TACTIC_CATS).indexOf(a.g) - Object.values(D.TACTIC_CATS).indexOf(b.g)),
      max: UI.tacMax(cfg), chosen: cfg.tactics.slice(),
    });
    if (res) { cfg.tactics = res; rerender(); }
  };
  const call = U.$('#e-call'); if (call) call.onclick = () => { cfg.tactics = D.TACTIC_ORDER.slice(); rerender(); };
  const cauto = U.$('#e-cauto'); if (cauto) cauto.onclick = () => { cfg.tactics = UI.defaultTactics(cfg); rerender(); };
  for (const b of U.$$('#e-min .tchip', root)) b.onclick = () => { cfg.min = b.dataset.m; rerender(); };
  const loc = U.$('#e-loc'); if (loc) loc.onchange = () => { cfg.loc = loc.value || null; };
  for (const inp of U.$$('[data-wu]', root)) inp.oninput = () => { cfg.squadNames[+inp.dataset.wu] = inp.value.trim() || S.genName(null, cfg.country).n; };
  for (const b of U.$$('#e-dep .tchip', root)) b.onclick = () => { cfg.deputy = UI._deps[+b.dataset.dep]; rerender(); };
  for (const b of U.$$('#e-diff button', root)) b.onclick = () => { cfg.diff = +b.dataset.d; rerender(); };
  for (const seg of U.$$('[data-opt]', root)) for (const b of U.$$('button', seg)) b.onclick = () => { const op = UI.CUSTOM_OPTS.find(o => o.k === seg.dataset.opt); cfg.custom[op.k] = op.o[+b.dataset.i][0]; rerender(); };
  U.$('#e-back').onclick = () => UI.setupRank();
  U.$('#e-start').onclick = () => UI.startGame();
};
/* 特性を選ぶ（分類と検索） */
UI.traitPicker = (o) => UI.modal((box, close) => {
  const sel = new Set(o.selected || []);
  const custom = !!o.custom;
  let cat = 'all', q = '';
  box.classList.add('tall');
  UI.head(box, { title: '特性', body: custom ? '好きなだけ選べる。固有は史実の人物の特性。' : `${o.max}つまで。★（上位）は能力pt20、二段目は8、短所はpt+6。固有はカスタムのみ。` });
  const search = U.h('input', { type: 'search', class: 'tp-search', placeholder: '名前や効果で探す（例：騎兵、森、農業）', 'aria-label': '特性を探す' });
  const cats = U.h('div', { class: 'tp-cats' });
  const list = U.h('div', { class: 'tp-list' });
  const count = U.h('div', { class: 'body', style: { fontSize: '13px', marginTop: '6px' } });
  const mk = (k, n) => { const b = U.h('button', { class: 'chip' + (cat === k ? ' on' : ''), 'data-c': k }, n); b.onclick = () => { cat = k; for (const x of cats.children) x.classList.toggle('on', x.dataset.c === k); render(); }; return b; };
  cats.append(mk('all', 'すべて'), mk('sel', '選択中'));
  for (const k of D.TRAIT_CAT_ORDER) cats.append(mk(k, D.TRAIT_CATS[k]));
  const cost = () => U.sum([...sel], t => UI.traitCost(t));
  const upd = () => { count.textContent = custom ? `選択中 ${sel.size}` : `選択中 ${sel.size}/${o.max}　特性のpt ${cost()}`; };
  const render = () => {
    const qq = q.trim();
    const ids = D.TRAIT_ORDER.concat(D.CTR_IDS).filter(id => {
      const T = D.TRAITS[id]; if (!T) return false;
      if (cat === 'sel') { if (!sel.has(id)) return false; }
      else if (cat !== 'all' && T.cat !== cat) return false;
      if (qq && !(T.n.includes(qq) || T.d.includes(qq) || D.TRAIT_CATS[T.cat].includes(qq))) return false;
      return true;
    });
    list.innerHTML = ids.slice(0, 400).map(id => {
      const T = D.TRAITS[id];
      const dis = !custom && (T.uniq || T.cat === 'king' && !['kuns', 'josh'].includes(o.cfg?.rank));
      const mark = T.lv >= 3 ? '★' : T.lv === 2 ? '◆' : '';
      return `<button class="tp ${sel.has(id) ? 'on' : ''} ${T.neg ? 'neg' : ''}" data-t="${id}" ${dis ? 'disabled' : ''}><b>${mark}${U.esc(T.n)}<em>${D.TRAIT_CATS[T.cat]}${!custom && UI.traitCost(id) ? `・${UI.traitCost(id) > 0 ? '' : '+'}${Math.abs(UI.traitCost(id))}pt` : ''}</em></b><small>${U.esc(T.d)}</small></button>`;
    }).join('') + (ids.length > 400 ? `<p class="note">ほか${ids.length - 400}件（検索で絞り込める）</p>` : '') + (ids.length ? '' : `<p class="empty">${cat === 'custom' && !qq ? 'まだない。主人公の画面の「特性を作る」で作れる。' : '見つからない'}</p>`);
    upd();
  };
  list.onclick = (e) => {
    const b = e.target.closest('button.tp'); if (!b || b.disabled) return;
    const id = b.dataset.t;
    if (sel.has(id)) sel.delete(id);
    else {
      if (sel.size >= o.max) { UI.toast(`最大${o.max}つまで`); return; }
      const fam = S.traitFam(id);
      for (const x of [...sel]) if (x !== id && S.traitFam(x) === fam && /\d$/.test(id)) sel.delete(x);
      sel.add(id);
    }
    for (const x of list.querySelectorAll('button.tp')) x.classList.toggle('on', sel.has(x.dataset.t));
    upd();
  };
  let tmr = null;
  search.oninput = () => { clearTimeout(tmr); tmr = setTimeout(() => { q = search.value; render(); }, 120); };
  box.append(search, cats, list, count);
  const row = U.h('div', { style: { display: 'flex', gap: '8px', marginTop: '10px' } });
  const clr = U.h('button', { class: 'btn' }, '全部外す'); clr.onclick = () => { sel.clear(); render(); };
  const cancel = U.h('button', { class: 'btn' }, 'やめる'); cancel.onclick = () => close(null);
  const ok = U.h('button', { class: 'btn seal', style: { flex: 1 } }, '決定'); ok.onclick = () => close([...sel]);
  row.append(clr, cancel, ok); box.append(row);
  render();
});
/* ---------- 特性工房：自分で特性を作る ---------- */
// 主人公の作成で、自作の特性を付ける・外す（通常モードは数と能力ptの範囲で）
UI.ctrToggleCfg = (cfg, id) => {
  const T = D.TRAITS[id]; if (!T) return false;
  if (cfg.traits.includes(id)) { cfg.traits = cfg.traits.filter(t => t !== id); return true; }
  if (cfg.mode !== 'custom') {
    if (cfg.traits.length >= UI.TRAIT_MAX) { UI.toast(`通常モードの特性は${UI.TRAIT_MAX}つまで。カスタムならいくつでも付けられる`); return false; }
    const left = UI.pool(cfg) - UI.used(cfg);
    if (T.cost > left) { UI.toast(`能力ptが足りない（残り${left}pt・この特性は${T.cost}pt）。カスタムなら自由に付けられる`); return false; }
  }
  cfg.traits.push(id);
  return true;
};
UI.ctrWorkshop = (o = {}) => UI.modal((box, close) => {
  box.classList.add('tall', 'ctr');
  const cfg = o.cfg || null, inGame = !!o.game && typeof G !== 'undefined' && !!G;
  const normalCfg = !!cfg && cfg.mode !== 'custom';
  let view = 'list', cur = null, pick = null, who = null, gateOk = false;
  const btn = (label, cls, on) => { const b = U.h('button', { class: 'btn sm' + (cls ? ' ' + cls : '') }, label); if (on) b.onclick = on; return b; };
  const R = () => { const y = box.scrollTop; box.innerHTML = ''; ({ list: vList, edit: vEdit, pick: vPick, who: vWho })[view](); box.scrollTop = y; };
  const go = (v) => { view = v; box.innerHTML = ''; ({ list: vList, edit: vEdit, pick: vPick, who: vWho })[view](); box.scrollTop = 0; };

  // 作った特性の一覧
  const vList = () => {
    UI.head(box, { title: '特性工房', body: '自分だけの特性を作って付けられる。作った特性はこのブラウザに残り、付けた特性はセーブにも写る。' + (normalCfg ? '\n通常モードでは強さに応じた能力ptを使う。カスタムなら自由に付けられる。' : '') });
    box.append(U.h('div', { class: 'ctr-top' },
      btn('＋ 新しく作る', 'seal', () => { cur = { id: 'cx_' + U.uid(), n: '', d: '', fx: {}, side: false, sk: null }; go('edit'); }),
      btn('最強の特性を作る', 'pri', () => { cur = D.ctrMax(); go('edit'); })));
    const ids = D.CTR_IDS.filter(id => D.TRAITS[id]).sort((a, b) => (D.TRAITS[b].ts || 0) - (D.TRAITS[a].ts || 0));
    if (!ids.length) box.append(U.h('p', { class: 'empty' }, 'まだない。「新しく作る」か「最強の特性を作る」から始める。'));
    for (const id of ids) {
      const T = D.TRAITS[id];
      const users = inGame ? S.ctrUsers(id) : [];
      const card = U.h('div', { class: 'ctr-card' + (T.neg ? ' neg' : '') });
      card.append(U.h('div', { class: 'ctr-h' }, U.h('b', {}, (T.lv >= 3 ? '★' : '') + T.n), U.h('span', { class: 'ctr-pw' }, `強さ ${U.num(T.pw)}${normalCfg ? `・${T.cost}pt` : ''}`)));
      card.append(U.h('small', {}, T.d));
      if (users.length) card.append(U.h('small', { class: 'ctr-users' }, '付けている人：' + users.map(x => (x.player ? '自分' : x.n)).join('・')));
      const acts = U.h('div', { class: 'ctr-acts' });
      if (cfg) { const on = cfg.traits.includes(id); acts.append(btn(on ? '主人公から外す' : '主人公に付ける', on ? '' : 'pri', () => { UI.ctrToggleCfg(cfg, id); R(); })); }
      if (inGame) acts.append(btn('付ける・外す', 'pri', () => { who = id; go('who'); }));
      acts.append(btn('直す', '', () => { cur = D.ctrDef(id); go('edit'); }));
      acts.append(btn('写す', '', () => { const d = D.ctrDef(id); d.id = 'cx_' + U.uid(); d.n = (d.n + 'の写し').slice(0, 12); S.ctrPut(d); R(); }));
      const del = btn('消す', 'ghost');
      del.onclick = () => {
        if (del.dataset.sure !== '1') { del.dataset.sure = '1'; del.textContent = 'もう一度押すと消す'; return; }
        if (cfg) cfg.traits = cfg.traits.filter(t => t !== id);
        UI.toast(S.ctrDelete(id) ? `「${T.n}」を消した` : '工房からは消した（付けている人がいるので、このゲームでは残る）');
        R();
      };
      acts.append(del);
      card.append(acts);
      box.append(card);
    }
    box.append(U.h('div', { class: 'ctr-bottom' }, U.h('button', { class: 'btn seal', style: { flex: 1 }, onclick: () => close(true) }, '閉じる')));
  };

  // 作る・直す
  const vEdit = () => {
    const isNew = !D.TRAITS[cur.id];
    UI.head(box, { title: isNew ? '特性を作る' : `「${D.TRAITS[cur.id].n}」を直す` });
    const nm = U.h('input', { type: 'text', maxlength: 12, value: cur.n || '', placeholder: '例：地中海無双', 'aria-label': '特性の名前', autocomplete: 'off' });
    const ds = U.h('input', { type: 'text', maxlength: 80, value: cur.d || '', placeholder: '空欄なら効果から自動でつくる', 'aria-label': '特性の説明', autocomplete: 'off' });
    box.append(U.h('div', { class: 'ctr-f' }, U.h('label', {}, '名前（12文字まで）'), nm, U.h('label', {}, '説明'), ds));
    const pwl = U.h('div', { class: 'ctr-pwline', 'aria-live': 'polite' });
    box.append(pwl);
    box.append(U.h('div', { class: 'ctr-top' },
      btn('最強にする', 'pri', () => { const m = D.ctrMax(cur); cur.fx = m.fx; cur.side = true; cur.sk = m.sk; if (!String(cur.n || '').trim()) cur.n = m.n; R(); }),
      btn('効果をすべて外す', '', () => { cur.fx = {}; cur.side = false; cur.sk = null; R(); })));
    const keys = Object.keys(cur.fx);
    box.append(U.h('div', { class: 'ctr-eh' }, U.h('b', {}, `効果 ${keys.length}件`), btn('＋ 効果を足す', 'seal', () => { pick = new Set(Object.keys(cur.fx)); go('pick'); })));
    const list = U.h('div', { class: 'ctr-fx' });
    if (!keys.length) list.append(U.h('p', { class: 'empty' }, 'まだ効果がない。「効果を足す」から選ぶ。'));
    for (const k of keys) {
      const L = D.fxLim(k), t = D.FXK[k][1];
      const row = U.h('div', { class: 'ctr-row' }, U.h('span', { class: 'ctr-k', title: D.FXK[k][0] }, D.FXK[k][0]));
      if (t === 'f') row.append(U.h('span', { class: 'ctr-flag' }, 'あり'));
      else {
        const inp = U.h('input', { type: 'text', inputmode: 'numeric', value: String(D.fxToUi(k, cur.fx[k])), 'aria-label': `${D.FXK[k][0]}（${L.min}〜${L.max}${L.unit}）` });
        const setv = (x) => { x = U.clamp(Math.round(Number(x) || 0), L.min, L.max); inp.value = String(x); if (x === 0) cur.fx[k] = 0; else cur.fx[k] = D.fxFromUi(k, x); upd(); };
        inp.onchange = () => setv(String(inp.value).replace(/[^0-9-]/g, ''));
        inp.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); inp.blur(); } };
        const pm = U.h('button', { class: 'ctr-pm', 'aria-label': `${D.FXK[k][0]}の正負を入れ替える` }, '±');
        pm.onclick = () => setv(-Number(String(inp.value).replace(/[^0-9-]/g, '') || 0));
        row.append(inp, U.h('span', { class: 'ctr-u' }, t === 'r' ? '%減' : L.unit), pm);
      }
      const x = U.h('button', { class: 'ctr-x', 'aria-label': `${D.FXK[k][0]}を外す` }, '✕');
      x.onclick = () => { delete cur.fx[k]; R(); };
      row.append(x);
      list.append(row);
    }
    box.append(list);
    const cb = U.h('input', { type: 'checkbox', checked: cur.side ? true : null });
    cb.onchange = () => { cur.side = cb.checked; upd(); };
    box.append(U.h('label', { class: 'ctr-opt' }, cb, U.h('span', {}, '総大将なら全軍に効く', U.h('small', {}, '自分が総大将の合戦では、能力以外の効果が味方の全部隊に効く（強さは2倍）'))));
    const sel = U.h('select', { 'aria-label': '合戦で使える戦法' }, U.h('option', { value: '' }, '戦法なし'), ...D.CTR_SKILLS().map(k => U.h('option', { value: k, selected: cur.sk === k ? true : null }, `${D.SKILLS[k].n}：${D.SKILLS[k].d}`)));
    sel.onchange = () => { cur.sk = sel.value || null; upd(); };
    box.append(U.h('div', { class: 'ctr-f' }, U.h('label', {}, '合戦で使える戦法'), sel));
    const save = U.h('button', { class: 'btn seal', style: { flex: 1 } }, '保存する');
    const upd = () => {
      cur.n = nm.value; cur.d = ds.value;
      const pw = D.ctrPower(cur);
      const tier = pw < 0 ? '短所' : pw >= 50 ? '地中海に比類なし' : pw >= 8 ? '★上位' : pw >= 4 ? '二段目' : '一段目';
      pwl.innerHTML = `強さ <b>${U.num(pw)}</b>　${tier}<br><small>通常モードで付けるなら${U.num(D.ctrCost(pw))}pt（組み込みの★は20pt）。カスタムなら自由に付けられる。</small>`;
      const live = Object.keys(cur.fx).some(k => cur.fx[k]) || cur.sk;
      save.disabled = !String(cur.n).trim() || !live;
    };
    nm.oninput = upd; ds.oninput = upd;
    save.onclick = () => {
      const T = S.ctrPut(cur); if (!T) return;
      if (isNew && cfg && !cfg.traits.includes(T.id)) UI.ctrToggleCfg(cfg, T.id);
      UI.toast(`「${T.n}」を${isNew ? '作った' : '直した'}`);
      go('list');
    };
    box.append(U.h('div', { class: 'ctr-bottom' }, btn('やめる', '', () => go('list')), save));
    upd();
  };

  // 効果を選ぶ
  const vPick = () => {
    UI.head(box, { title: '効果を選ぶ', body: '足したい効果をいくつでも選ぶ。数はあとで決める。' });
    const q = U.h('input', { type: 'search', class: 'tp-search', placeholder: '効果を探す（例：騎兵、森、農業、一騎打ち）', 'aria-label': '効果を探す' });
    const wrap = U.h('div', { class: 'ctr-pick' });
    const cnt = U.h('div', { class: 'note', style: { marginTop: '6px', color: '#5b4b31' } });
    const draw = () => {
      const qq = q.value.trim();
      wrap.innerHTML = D.FXG.map(([g, ks]) => {
        const vis = ks.filter(k => !qq || D.FXK[k][0].includes(qq) || g.includes(qq));
        return vis.length ? `<div class="ctr-g">${g}</div><div class="ctr-chips">${vis.map(k => `<button class="chip${pick.has(k) ? ' on' : ''}" data-k="${k}" aria-pressed="${pick.has(k)}">${D.FXK[k][0]}</button>`).join('')}</div>` : '';
      }).join('') || '<p class="empty">見つからない</p>';
      cnt.textContent = `選んでいる効果 ${pick.size}件`;
    };
    wrap.onclick = (e) => {
      const b = e.target.closest('[data-k]'); if (!b) return;
      const k = b.dataset.k;
      if (pick.has(k)) pick.delete(k); else pick.add(k);
      b.classList.toggle('on', pick.has(k)); b.setAttribute('aria-pressed', String(pick.has(k)));
      cnt.textContent = `選んでいる効果 ${pick.size}件`;
    };
    let tmr = null;
    q.oninput = () => { clearTimeout(tmr); tmr = setTimeout(draw, 120); };
    box.append(q, wrap, cnt);
    box.append(U.h('div', { class: 'ctr-bottom' },
      btn('戻る', '', () => go('edit')),
      btn('全部選ぶ', '', () => { for (const k in D.FXK) if (k !== 'noRetreat') pick.add(k); draw(); }),
      U.h('button', { class: 'btn seal', style: { flex: 1 }, onclick: () => { for (const k of Object.keys(cur.fx)) if (!pick.has(k)) delete cur.fx[k]; for (const k of pick) if (!(k in cur.fx)) cur.fx[k] = D.fxFromUi(k, D.fxLim(k).def); go('edit'); } }, '決定')));
    draw();
  };

  // 遊んでいるゲームで、自分や部下に付ける
  const vWho = () => {
    const T = D.TRAITS[who];
    if (!T) { go('list'); return; }
    UI.head(box, { title: `「${T.n}」を付ける`, body: '付ける人を選ぶ。外すこともできる。' });
    if (G.mode !== 'custom' && !gateOk) {
      box.append(U.h('p', { class: 'body ctr-gate' }, 'このゲームは通常モード。自作の特性を途中から付けると、このゲームはカスタム扱いになる（遊び方は変わらない）。'));
      box.append(U.h('div', { class: 'ctr-bottom' }, btn('戻る', '', () => go('list')), U.h('button', { class: 'btn seal', style: { flex: 1 }, onclick: () => { G.mode = 'custom'; gateOk = true; R(); } }, 'カスタム扱いにして続ける')));
      return;
    }
    const me = S.myOff();
    const people = [me, ...G.me.army.subs.map(id => G.off[id]).filter(x => x && x.alive && x !== me)];
    const list = U.h('div', { class: 'ctr-who' });
    for (const x of people) {
      const on = (x.tr || []).includes(who);
      const info = x.player ? S.rankLabel() : `${D.RANKS[x.r] ? D.RANKS[x.r].name : ''}${x.id === G.me.army.dep ? '・副官' : ''}　統${S.stat(x, 'tou')} 武${S.stat(x, 'bu')} 知${S.stat(x, 'chi')}`;
      list.append(U.h('div', { class: 'ctr-wrow' }, U.h('div', { style: { minWidth: 0 } }, U.h('b', {}, x.player ? `${x.n}（自分）` : x.n), U.h('small', {}, info)),
        btn(on ? '外す' : '付ける', on ? '' : 'pri', () => {
          x.tr = on ? x.tr.filter(t => t !== who) : (x.tr || []).concat(who);
          S.ctrSync();
          UI.toast(on ? `${x.n}から「${T.n}」を外した` : `${x.n}に「${T.n}」を付けた`);
          R();
        })));
    }
    if (people.length === 1) list.append(U.h('p', { class: 'note', style: { color: '#5b4b31' } }, '部下がいれば、部下にも付けられる。'));
    box.append(list);
    box.append(U.h('div', { class: 'ctr-bottom' }, U.h('button', { class: 'btn seal', style: { flex: 1 }, onclick: () => go('list') }, '戻る')));
  };
  vList();
});
UI.startGame = async () => {
  const cfg = UI.cfg;
  const c2 = Object.assign({}, cfg, { stats: Object.assign({}, cfg.stats), traits: cfg.traits.slice(), tactics: cfg.tactics.slice(), custom: cfg.mode === 'custom' ? Object.assign({}, cfg.custom) : null });
  // 地図（町・村）ができるのを待つ
  if (!GEO.built) { UI.toast('地中海の地図を描いています…'); await Promise.race([MAP.init(), U.sleep(30000)]); }
  S.newGame(c2);
  UI.cfg = null; UI._deps = null;
  G.flags.courier = true;
  await SAVE.auto();
  UI.main('map');
  const o = S.myOff(), rk = D.RANKS[G.me.rank];
  const boss = G.off[G.me.boss];
  const lines = [
    `${S.cname(o.c)}の${S.rankLabel()}${G.me.min ? '（' + D.MINISTRIES[G.me.min].n + '）' : ''}、${o.n}。`,
    `所在：${S.P[G.me.loc].name}`,
    boss ? `上官：${boss.n}（${D.RANKS[boss.r]?.name || ''}）` : '',
    G.me.army.sq.length ? `兵：${U.fmt(S.armyTotal())}` : '',
    G.me.jur ? `管轄：${G.me.jur.name}（${U.num(G.me.jur.hh)}戸）` : '',
    `毎月の任務状：${S.apMax()}　行動を終えたら「月を進める」`,
  ].filter(Boolean).join('\n');
  await UI.info({ title: '出立', seal: '任官', body: lines });
  if (!UI.introSeen()) await UI.intro();
};
