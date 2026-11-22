/* =========================================================
   地中海覇道 — UI: 本編（地図・行動・軍・領地・人物）
   ========================================================= */
UI.TABS = [
  { k: 'map', i: '地', n: '地図' },
  { k: 'act', i: '令', n: '行動' },
  { k: 'army', i: '軍', n: '軍' },
  { k: 'dom', i: '領', n: '領地・国' },
  { k: 'ppl', i: '人', n: '人物' },
];
UI.main = (tab) => {
  UI.show('main');
  const root = U.$('#scr-main');
  if (!root.dataset.built) {
    root.dataset.built = '1';
    root.innerHTML = `<header class="hdr" id="hdr"></header><main class="content" id="main-content"></main>
      <button class="endturn" id="endturn" aria-label="月を進める">月を<br>進める</button>
      <nav class="nav" id="nav">${UI.TABS.map(t => `<button data-t="${t.k}"><i aria-hidden="true">${t.i}</i>${t.n}</button>`).join('')}</nav>`;
    for (const b of U.$$('#nav button')) b.onclick = () => UI.tab(b.dataset.t);
    U.$('#endturn').onclick = () => UI.endTurn();
  }
  UI.tab(tab || UI.curTab || 'map');
};
UI.refresh = () => {
  if (UI.cur === 'main') { UI.header(); UI.tab(UI.curTab, true); }
  if (G && G.flags && G.flags.newTrait && G.flags.newTrait.length) { for (const t of G.flags.newTrait) UI.toast(`特性「${D.TRAITS[t]?.n || t}」を会得した`); G.flags.newTrait = []; }
};
UI.header = () => {
  const me = G.me, o = S.myOff(), rk = D.RANKS[me.rank];
  const ap = S.apMax();
  const aps = Array.from({ length: Math.max(ap, me.ap) }, (_, i) => `<i class="${i < me.ap ? '' : 'used'}"></i>`).join('');
  U.$('#hdr').innerHTML = `<div class="hdr-face">${PORT.tag(o, 40)}${UI.cseal(o.c, 16)}</div>
    <div class="hdr-id"><b>${U.esc(o.n)}　${S.rankLabel()}${me.min ? '・' + D.MINISTRIES[me.min].n : ''}</b><small>${S.dateStr()}（${D.SEASON(G.month)}）・${D.JUE[me.jue].n}・${S.P[me.loc]?.name || ''}${me.inj ? '・負傷' : ''}${S.epithet() ? `・「${U.esc(S.epithet())}」` : ''}</small></div>
    <div class="hdr-res"><span class="num">金 ${U.fmt(me.gold)}</span><span class="ap" title="任務状 ${me.ap}/${ap}" aria-label="任務状 残り${me.ap}">${aps}</span></div>
    <button class="bt-ic" id="hdr-menu" aria-label="メニュー">≡</button>`;
  U.$('#hdr-menu').onclick = () => UI.menu();
};
UI.tab = (k, keepScroll) => {
  UI.curTab = k;
  UI.header();
  for (const b of U.$$('#nav button')) b.classList.toggle('on', b.dataset.t === k);
  const c = U.$('#main-content');
  const y = keepScroll ? c.scrollTop : 0;
  c.className = 'content' + (k === 'map' ? ' full' : '');
  ({ map: UI.mapTab, act: UI.actTab, army: UI.armyTab, dom: UI.domTab, ppl: UI.pplTab })[k](c);
  if (keepScroll) c.scrollTop = y;
};

/* ---------- 月を進める ---------- */
UI.endTurn = async () => {
  if (UI._busy) return;
  const me = G.me;
  if (me.ap > 0) {
    const ok = await UI.choose({ title: '月を進める', body: `任務状がまだ${me.ap}枚残っている。`, choices: [{ v: 1, label: '月を進める' }, { v: 0, label: 'まだ行動する' }] });
    if (!ok) return;
  }
  UI._busy = true;
  SND.play('drum1');
  const btn = U.$('#endturn'); btn.disabled = true;
  const logBefore = G.log.length ? G.log[0] : null;
  try {
    await W.endMonth();
  } catch (e) { console.error(e); UI.toast('エラー：' + e.message); }
  UI._busy = false; btn.disabled = false;
  if (G.over) { await SAVE.auto(); return UI.ending(); }
  await SAVE.auto();
  // 月報
  const newLogs = [];
  for (const l of G.log) { if (l === logBefore) break; newLogs.push(l); }
  const lines = (G.report || []).concat(newLogs.slice(0, 14).map(l => (l.k === 'big' ? '◆' : l.k === 'bad' ? '▼' : l.k === 'good' ? '△' : '・') + l.s));
  if (G.offers.length) lines.push(`◆戦の報せが${G.offers.length}件ある（行動→軍務「戦場へ」）`);
  if (G.me.tasks.length) lines.push(`遂行中の任務：${G.me.tasks.map(t => t.desc).join('／')}`);
  await UI.info({ title: `${S.dateStr()} 月報`, body: lines.join('\n') || '特に変わったことはない。' });
  UI.refresh();
};

/* ---------- メニュー ---------- */
UI.menu = async () => {
  const k = await UI.choose({ title: '軍営', choices: [
    { v: 'log', label: '記録', sub: '出来事と年表' },
    { v: 'chron', label: '年代記・実績', sub: '歩んだ道と、解いた実績' },
    { v: 'fbook', label: '戦場図鑑', sub: `名のある戦場 ${typeof FLD !== 'undefined' ? FLD.count() : ''} か所` },
    { v: 'mod', label: 'MOD', sub: '人物や事件を自分で足す・書き出す' },
    { v: 'save', label: '保存', sub: 'セーブ枠への保存・書き出し' },
    { v: 'load', label: '読み込み' },
    { v: 'snd', label: `音：${SND.on ? 'あり' : 'なし'}`, sub: '効果音と音楽' },
    { v: 'cutin', label: `演出：${UI.CUTIN_ON() ? 'あり' : 'なし'}`, sub: '開戦・討ち取り・勝敗などのカットイン' },
    ...(ASSET.count ? [{ v: 'art', label: `絵の素材：${ASSET.on() ? '使う' : '使わない'}`, sub: '外で作った絵（肖像・戦場・兵など）。使わないと軽い表示になる' }] : []),
    { v: 'scale', label: `文字の大きさ：${UI.scaleName()}`, sub: '標準 → 大きめ → 特大 の順に切り替わる' },
    { v: 'help', label: '遊び方' },
    { v: 'title', label: 'タイトルへ', sub: '自動保存されている' },
    { v: null, label: '閉じる' },
  ] });
  if (k === 'snd') { SND.toggle(); UI.toast(SND.on ? '音を鳴らす' : '音を消した'); return; }
  if (k === 'art') { ASSET.set(!ASSET.on()); PORT._cache.clear(); ASSET._small.clear(); UI.toast(ASSET.on() ? '絵の素材を使う' : '絵の素材を使わない（軽い表示）'); UI.refresh(); return; }
  if (k === 'scale') { UI.setScale((UI.scaleIdx() + 1) % 3); UI.toast(`文字の大きさ：${UI.scaleName()}`); UI.refresh(); return; }
  if (k === 'cutin') { G.flags.cutin = !UI.CUTIN_ON(); UI.toast(UI.CUTIN_ON() ? 'カットインあり' : 'カットインなし'); return; }
  if (k === 'log') return UI.logView();
  if (k === 'chron') return UI.chronicle();
  if (k === 'fbook') return UI.fieldBook();
  if (k === 'mod') return UI.modMenu();
  if (k === 'save') return UI.saveMenu();
  if (k === 'load') return UI.loadMenu(true);
  if (k === 'help') return UI.help();
  if (k === 'title') { await SAVE.auto(); return UI.title(); }
};
UI.logView = () => UI.modal((box, close) => {
  UI.head(box, { title: '記録' });
  const tabs = U.h('div', { class: 'tabs' });
  const body = U.h('div', { class: 'log', style: { color: 'var(--ink)' } });
  const show = (k) => {
    for (const b of tabs.children) b.classList.toggle('on', b.dataset.k === k);
    const list = k === 'log' ? G.log.map(l => ({ d: l.d, s: l.s, k: l.k })) : G.hist.map(h => ({ d: h.d, s: h.s, k: 'big' }));
    body.innerHTML = list.length ? list.map(l => `<div><span>${l.d}</span><p style="margin:0">${U.esc(l.s)}</p></div>`).join('') : '<p>まだ何もない。</p>';
  };
  for (const [k, n] of [['log', '出来事'], ['hist', '年表']]) { const b = U.h('button', { 'data-k': k, class: 'btn sm' }, n); b.onclick = () => show(k); tabs.append(b); }
  box.append(tabs, body);
  const c = U.h('button', { class: 'btn seal wide', style: { marginTop: '12px' } }, '閉じる'); c.onclick = () => close(); box.append(c);
  show('log');
});

/* ---------- 地図 ---------- */
UI.mapTab = (c) => {
  c.innerHTML = `<div class="mapwrap" id="mapwrap"><canvas id="map-cv" aria-label="地中海の地図"></canvas>
    <div class="map-legend" id="map-legend"></div>
    <div class="map-tools"><button id="map-in" aria-label="拡大">＋</button><button id="map-out" aria-label="縮小">－</button><button id="map-me" aria-label="自分の所在へ">★</button></div>
    <div class="sheet" id="map-sheet" hidden></div></div>`;
  const leg = U.$('#map-legend');
  leg.innerHTML = D.CORDER.filter(x => G.cty[x].alive).map(x => `<span><i style="background:${D.COUNTRIES[x].color === '#26262d' ? '#2e2e38' : D.COUNTRIES[x].color}"></i>${D.COUNTRIES[x].name} ${S.ownedProvs(x).length}</span>`).join('');
  UI.map.init(U.$('#map-cv'));
  U.$('#map-in').onclick = () => UI.map.zoomBy(1.35);
  U.$('#map-out').onclick = () => UI.map.zoomBy(1 / 1.35);
  U.$('#map-me').onclick = () => { UI.map.focus(G.me.loc, true); UI.map.select(G.me.loc); };
};
UI.map = {
  init(cv) {
    this.cv = cv; this.ctx = cv.getContext('2d');
    this.resize();
    if (!this.cam) { this.cam = { x: S.P[G.me.loc].x, y: S.P[G.me.loc].y, s: 1 }; this.cam.s = Math.max(this.fitS() * 1.6, Math.min(this.vw, this.vh) / 380); }
    this.clamp();
    this.bind();
    if (!this._sub) { this._sub = () => { if (this.cv && document.body.contains(this.cv)) this.draw(); }; MAP.subs.add(this._sub); }
    MAP.init();
    this.draw();
    if (this.sel) this.select(this.sel);
    if (!this._rs) { this._rs = true; window.addEventListener('resize', () => { if (UI.curTab === 'map' && this.cv && document.body.contains(this.cv)) { this.resize(); this.draw(); } }); }
    // 生活感（隊商・煙・包囲の陣）はゆっくり動く：地図が見えているあいだだけ、たまに描き直す
    if (!this._life) this._life = setInterval(() => { if (this.cv && document.body.contains(this.cv) && !document.hidden && (!UI.cur || UI.cur === 'main')) this.req(); }, 1600);
  },
  resize() { const r = this.cv.getBoundingClientRect(); this.dpr = Math.min(2, window.devicePixelRatio || 1); this.vw = r.width || window.innerWidth; this.vh = r.height || window.innerHeight; this.cv.width = Math.round(this.vw * this.dpr); this.cv.height = Math.round(this.vh * this.dpr); },
  fitS() { return Math.min(this.vw / 1000, this.vh / 720); },
  maxS() { return Math.max(this.fitS() * 9, 22); },
  w2s(x, y) { return [(x - this.cam.x) * this.cam.s + this.vw / 2, (y - this.cam.y) * this.cam.s + this.vh / 2]; },
  s2w(x, y) { return [(x - this.vw / 2) / this.cam.s + this.cam.x, (y - this.vh / 2) / this.cam.s + this.cam.y]; },
  clamp() { const s0 = this.fitS(); this.cam.s = U.clamp(this.cam.s, s0 * 0.9, this.maxS()); this.cam.x = U.clamp(this.cam.x, 0, 1000); this.cam.y = U.clamp(this.cam.y, 0, 720); },
  req() { if (this._q) return; this._q = requestAnimationFrame(() => { this._q = 0; this.draw(); }); },
  zoomBy(f) {
    // なめらかに寄る
    const s0 = this.cam.s, s1 = U.clamp(s0 * f, this.fitS() * 0.9, this.maxS()), t0 = performance.now();
    cancelAnimationFrame(this._zq);
    const step = () => { const k = Math.min(1, (performance.now() - t0) / 180); this.cam.s = s0 * Math.pow(s1 / s0, k * (2 - k)); this.draw(); if (k < 1) this._zq = requestAnimationFrame(step); };
    step();
  },
  focus(pid, zoom) { const p = S.P[pid]; this.cam.x = p.x; this.cam.y = p.y + (this.sel ? 60 / this.cam.s : 0); if (zoom) this.cam.s = Math.max(this.cam.s, this.fitS() * 2.2); this.clamp(); this.req(); },
  ownerOf(pi) { if (pi < 0) return null; const P = D.PROVINCES[pi]; return P ? G.prov[P.id].o : null; },
  ccol(o, a) { const C = D.COUNTRIES[o] || D.BANDIT; const hex = (C.mapc || '#777').replace('#', ''), n = parseInt(hex, 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; },
  draw() {
    if (!this.cv || !document.body.contains(this.cv)) return;
    const g = this.ctx, s = this.cam.s, dpr = this.dpr, vw = this.vw, vh = this.vh;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = MAP.ready ? '#a1b6ae' : '#b3c3b9'; g.fillRect(0, 0, vw, vh);
    const ready = MAP.ready;
    const view = [this.cam.x - vw / 2 / s, this.cam.y - vh / 2 / s, this.cam.x + vw / 2 / s, this.cam.y + vh / 2 / s];
    const inView = (bb, pad) => bb[2] >= view[0] - pad && bb[0] <= view[2] + pad && bb[3] >= view[1] - pad && bb[1] <= view[3] + pad;
    const toWorld = () => g.setTransform(dpr * s, 0, 0, dpr * s, dpr * (vw / 2 - this.cam.x * s), dpr * (vh / 2 - this.cam.y * s));
    const px = 1 / s;
    if (ready) { MAP.drawBase(g, this.cam, vw, vh, dpr); this.seasonTint(g, vw, vh, dpr); }
    else {
      // 地図ができるまでの仮の絵
      toWorld();
      g.fillStyle = '#d6c8a0'; g.beginPath(); for (const L of D.MAPDECO.lands) { L.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); } g.fill('evenodd');
      g.strokeStyle = 'rgba(70,100,110,.6)'; g.lineCap = 'round';
      for (const rv of D.MAPDECO.rivers) { g.lineWidth = rv.w; g.beginPath(); rv.p.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); }
    }
    const myC = S.myOff().c;
    if (ready) {
      toWorld();
      const lod = MAP.lodFor(s * dpr);
      // 1. 領土の色（海と湖には塗らない）
      g.save(); g.clip(MAP.landPath(lod), 'evenodd');
      const NP = D.PROVINCES.length, paths = [];
      for (let pi = 0; pi < NP; pi++) {
        const pp = MAP.provPath(pi, lod); paths.push(pp);
        if (!inView(pp.bb, 0)) continue;
        const o = this.ownerOf(pi);
        g.fillStyle = this.ccol(o, 0.24); g.fill(pp.P, 'evenodd');
      }
      // 国境の内側に国の色の帯
      const foreign = Array.from({ length: NP }, () => []);
      const lines = { f: [], w: [], i: [], x: [] };
      GEO.borders.forEach((bd, bi) => {
        const a = bd.a, b = bd.b;
        if (a < 0 && b < 0) return;
        const bp = MAP.borderPts(bi, lod); if (!inView(bp.bb, 2)) return;
        if (a < 0 || b < 0) { if (Math.min(a, b) === -1) { lines.x.push(bp.p); foreign[Math.max(a, b)].push(bp.p); } return; }
        const oa = this.ownerOf(a), ob = this.ownerOf(b);
        if (oa === ob) { lines.i.push(bp.p); return; }
        foreign[a].push(bp.p); foreign[b].push(bp.p);
        (S.atWar(oa, ob) ? lines.w : lines.f).push(bp.p);
      });
      for (let pi = 0; pi < NP; pi++) {
        if (!foreign[pi].length || !inView(paths[pi].bb, 4)) continue;
        g.save(); g.clip(paths[pi].P, 'evenodd');
        g.beginPath(); for (const p of foreign[pi]) MAP.pathFlat(g, p, false);
        g.strokeStyle = this.ccol(this.ownerOf(pi), 0.55); g.lineWidth = Math.min(14, Math.max(7, s * 2.2)) * px; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke();
        g.restore();
      }
      // 奪われた拠点のまわりを、奪った国の色で
      if (G.hold) {
        const byP = {};
        for (const h of S.holdAll()) { if (h.o === G.prov[h.pid].o) continue; if (h.x < view[0] - 10 || h.x > view[2] + 10 || h.y < view[1] - 10 || h.y > view[3] + 10) continue; (byP[h.pid] = byP[h.pid] || []).push(h); }
        for (const pid in byP) {
          const pi = D.PROVINCES.findIndex(P => P.id === pid); if (pi < 0) continue;
          g.save(); g.clip(paths[pi].P, 'evenodd');
          for (const h of byP[pid]) {
            const r = { mid: 8, small: 5.5, area: 6.5 }[h.k] || 6;
            const gr = g.createRadialGradient(h.x, h.y, r * 0.1, h.x, h.y, r);
            gr.addColorStop(0, this.ccol(h.o, 0.62)); gr.addColorStop(0.6, this.ccol(h.o, 0.38)); gr.addColorStop(1, this.ccol(h.o, 0));
            g.fillStyle = gr; g.beginPath(); g.arc(h.x, h.y, r, 0, 6.2832); g.fill();
          }
          g.restore();
        }
      }
      g.restore();
      // 2. 境界線
      g.lineCap = 'round'; g.lineJoin = 'round';
      const strokeAll = (list, col, w, dash) => { if (!list.length) return; g.beginPath(); for (const p of list) MAP.pathFlat(g, p, false); g.strokeStyle = col; g.lineWidth = w * px; g.setLineDash(dash ? dash.map(d => d * px) : []); g.stroke(); };
      strokeAll(lines.i, 'rgba(58,44,28,.5)', 1, [5, 3.5]);
      strokeAll(lines.x, 'rgba(58,44,28,.55)', 1.2, [1.5, 3]);
      strokeAll(lines.f, 'rgba(38,28,18,.85)', 2, null);
      strokeAll(lines.w, 'rgba(38,28,18,.85)', 2.2, null);
      strokeAll(lines.w, 'rgba(204,62,40,.95)', 2.4, [7, 5]);
      g.setLineDash([]);
      // 3. 選んだ郡
      if (this.sel) {
        const pi = D.PROVINCES.findIndex(p => p.id === this.sel);
        if (pi >= 0) {
          const pp = paths[pi];
          g.fillStyle = 'rgba(255,244,214,.18)'; g.fill(pp.P, 'evenodd');
          g.strokeStyle = 'rgba(255,236,170,.9)'; g.lineWidth = 5 * px; g.stroke(pp.P);
          g.strokeStyle = '#b8862e'; g.lineWidth = 2 * px; g.stroke(pp.P);
        }
      }
      // 管轄の県
      const jc = G.me.jur && G.me.jur.county ? GEO.county(G.me.jur.county) : null;
      if (jc) {
        const jv = G.me.jur.vil != null ? jc.vil[G.me.jur.vil] : null, at = jv || jc;
        g.strokeStyle = '#c2452f'; g.lineWidth = 2 * px; g.setLineDash([4 * px, 3 * px]); g.beginPath(); g.arc(at.x, at.y, Math.max(jv ? 1.6 : 3.2, 16 * px), 0, 6.2832); g.stroke(); g.setLineDash([]);
        this._jur = at;
      } else this._jur = null;
    }
    // 4. 名前と印（画面の座標）
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const lab = new MAP.Labels();
    const fit = this.fitS(), z = s / fit;
    const HEAD = '"Zen Antique","Hiragino Mincho ProN","Yu Mincho",serif', BODY = '"Zen Kaku Gothic New","Hiragino Sans",sans-serif', DISP = '"Yuji Boku","Zen Antique",serif';
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    // 国名（大きく薄く）
    if (z < 5) for (const c of D.CORDER) {
      if (!G.cty[c].alive) continue;
      const ps = S.ownedProvs(c); if (!ps.length) continue;
      const tot = U.sum(ps, p => p.pop + 10), x = U.sum(ps, p => S.P[p.id].x * (p.pop + 10)) / tot, y = U.sum(ps, p => S.P[p.id].y * (p.pop + 10)) / tot;
      const [sx, sy] = this.w2s(x, y);
      g.font = `${Math.round(U.clamp(34 * s, 26, 84))}px ${DISP}`;
      g.fillStyle = `rgba(35,28,19,${U.clamp(0.24 - z * 0.03, 0.08, 0.2)})`;
      MAP.spaced(g, D.COUNTRIES[c].name, sx, sy, 0, false);
    }
    // 郡の印（先に場所を取る）
    const marks = [];
    const big = z >= 7;
    const r0 = U.clamp(5 * s, 4, 9);
    for (const P of D.PROVINCES) {
      const [sx, sy] = this.w2s(P.x, P.y);
      if (sx < -60 || sy < -60 || sx > vw + 60 || sy > vh + 60) continue;
      const pv = G.prov[P.id], isCap = W.capital(pv.o) === P.id;
      marks.push({ P, sx, sy, isCap, o: pv.o });
      if (big) lab.add(sx - 10, sy - 34, sx + 12, sy - 4); else lab.add(sx - r0 * 1.4, sy - r0 * 1.4, sx + r0 * 1.4, sy + r0 * 1.4);
    }
    const me = S.P[G.me.loc];
    if (me) { const [sx, sy] = this.w2s(me.x, me.y); lab.add(sx + r0, sy - 32, sx + r0 + 22, sy); }
    const label = (text, wx, wy, o) => {
      const [sx, sy] = this.w2s(wx, wy);
      if (sx < -80 || sy < -40 || sx > vw + 80 || sy > vh + 40) return false;
      g.font = o.font;
      const sp = o.sp || 0, n = [...text].length;
      const w = o.vert ? (o.size || 12) : g.measureText(text).width + sp * (n - 1), h = o.vert ? (o.size || 12) * n + sp * (n - 1) : (o.size || 12);
      const x0 = sx - w / 2 - 2, y0 = sy - h / 2 - 1, x1 = sx + w / 2 + 2, y1 = sy + h / 2 + 1;
      if (!o.force && !lab.fits(x0, y0, x1, y1)) return false;
      lab.add(x0, y0, x1, y1);
      g.fillStyle = o.color; g.strokeStyle = o.halo || 'rgba(238,228,198,.85)'; g.lineWidth = o.hw || 3;
      if (o.vert) { let yy = sy - h / 2 + (o.size || 12) / 2; for (const ch of text) { if (o.halo !== false) g.strokeText(ch, sx, yy); g.fillText(ch, sx, yy); yy += (o.size || 12) + sp; } }
      else if (sp) { if (o.halo === false) MAP.spaced(g, text, sx, sy, sp, false); else MAP.spaced(g, text, sx, sy, sp, true); }
      else { if (o.halo !== false) g.strokeText(text, sx, sy); g.fillText(text, sx, sy); }
      return true;
    };
    // 郡の名（いつも）
    for (const m of marks) {
      const yy = big ? m.sy + 18 + Math.min(26, s * 1.6) : m.sy + r0 + 10;
      if (z > 1.15 || m.isCap) label(m.P.name, ...this.s2w(m.sx, yy), { font: `${m.isCap ? 700 : 500} ${m.isCap ? 14 : 12.5}px ${BODY}`, size: 13, color: '#1f170e', force: true });
    }
    if (ready) {
      // 海・地方
      for (const sea of GEO.SEAS) label(sea.n, sea.x, sea.y, { font: `${Math.round(U.clamp(13 * Math.sqrt(z), 13, 22))}px ${HEAD}`, size: 16, sp: 6, color: 'rgba(40,78,88,.75)', halo: 'rgba(196,212,204,.7)' });
      if (z < 6) for (const r of GEO.REGIONS) label(r.n, r.x, r.y, { font: `${Math.round(U.clamp(15 * r.s * Math.sqrt(z), 13, 26))}px ${HEAD}`, size: 18, sp: 5, color: 'rgba(84,62,34,.5)', halo: false });
      // 山脈
      if (z >= 1.6) for (const R of GEO.ranges) {
        if (!R.lab && z < 3.5) continue;
        const a = R.pts, n = a.length >> 1, k = n >> 1;
        const dx = Math.abs(a[2 * n - 2] - a[0]), dy = Math.abs(a[2 * n - 1] - a[1]);
        label(R.n, a[2 * k], a[2 * k + 1], { font: `${R.lab ? 13 : 11}px ${HEAD}`, size: R.lab ? 13 : 11, sp: 4, vert: dy > dx * 1.2, color: 'rgba(92,60,32,.85)', halo: 'rgba(236,224,192,.7)' });
      }
      // 大河
      if (z >= 1.8) for (const rv of GEO.rivers) {
        if (!rv.lab && z < 4) continue;
        const a = rv.pts, n = a.length >> 1;
        for (const f of [0.5, 0.3, 0.7, 0.15, 0.85]) {
          const k = Math.floor(n * f), x = a[2 * k], y = a[2 * k + 1];
          if (x < view[0] || x > view[2] || y < view[1] || y > view[3]) continue;
          const k2 = Math.min(n - 1, k + 8), k1 = Math.max(0, k - 8);
          const ang = Math.atan2(a[2 * k2 + 1] - a[2 * k1 + 1], a[2 * k2] - a[2 * k1]);
          const off = Math.max(9, rv.w * s * 0.6 + 7);
          const lx = x - Math.sin(ang) * off / s, ly = y + Math.cos(ang) * off / s;
          if (label(rv.n, lx, ly, { font: `${rv.lab ? 12.5 : 11}px ${HEAD}`, size: 12, sp: 3, vert: Math.abs(Math.cos(ang)) < 0.45, color: 'rgba(30,72,92,.9)', halo: 'rgba(225,230,214,.75)' })) break;
        }
      }
      // 湖・砂漠
      if (z >= 2.5) for (const l of GEO.lakes) label(l.n, l.x, l.y, { font: `11px ${HEAD}`, size: 11, sp: 2, color: 'rgba(30,72,92,.85)', halo: 'rgba(215,226,216,.7)' });
      if (z >= 2) for (const d of GEO.DESERTS) label(d.n, d.x, d.y, { font: `11px ${HEAD}`, size: 11, sp: 4, color: 'rgba(120,88,40,.75)', halo: false });
      // 関・古戦場・長城
      if (z >= 3) for (const p of GEO.PASSES) label(p.n, p.x, p.y + Math.max(2.2, 12 / s), { font: `500 11px ${BODY}`, size: 11, color: '#4a2f1a' });
      if (z >= 4) for (const p of GEO.SITES) label('⚔' + p.n, p.x, p.y, { font: `11px ${BODY}`, size: 11, color: '#7a2a1a' });
      if (z >= 4) for (const w of GEO.walls) { const a = w.pts, k = (a.length >> 2) * 2; label(w.n, a[k], a[k + 1] - 10 / s, { font: `10.5px ${HEAD}`, size: 11, sp: 2, color: '#4b3d30' }); }
      // 県
      if (z >= 3.2) for (const t of GEO.counties) {
        if (t.seat) continue;
        if (t.x < view[0] - 4 || t.x > view[2] + 4 || t.y < view[1] - 4 || t.y > view[3] + 4) continue;
        label(t.n, t.x, t.y + Math.max(1.6, 0.8) + 9 / s, { font: `500 ${z >= 8 ? 12 : 11}px ${BODY}`, size: 11, color: '#2d2116' });
      }
      // 郷
      if (z >= 10) for (const it of MAP.vils) {
        const v = it.v; if (v.x < view[0] - 2 || v.x > view[2] + 2 || v.y < view[1] - 2 || v.y > view[3] + 2) continue;
        label(v.n, v.x, v.y + 0.9 + 7 / s, { font: `10px ${BODY}`, size: 10, color: '#4b3a28', hw: 2.5 });
      }
    }
    // 拠点の印（中都市は□、小都市は小さな□、地域は◇。奪われた拠点は白い縁）
    if (ready && G.hold && z >= 1.5) {
      // 自国の拠点は、選んだ郡か、十分に寄ったときだけ（地図が込み合わないように）
      const list = S.holdAll().filter(h => this.holdVis(h, z)).sort((a, b) => (a.o !== G.prov[a.pid].o) - (b.o !== G.prov[b.pid].o));
      for (const h of list) {
        const foreign = h.o !== G.prov[h.pid].o;
        const [sx, sy] = this.w2s(h.x, h.y);
        if (sx < -12 || sy < -12 || sx > vw + 12 || sy > vh + 12) continue;
        const col = D.COUNTRIES[h.o]?.mapc || '#777', fill = col === '#3a3a44' ? '#2b2b33' : col;
        const r = (h.k === 'mid' ? 4.6 : h.k === 'small' ? 3.6 : 3.4) * (foreign ? 1.1 : 0.85) * (z >= 6 ? 1.25 : 1);
        g.globalAlpha = foreign || this.sel === h.pid ? 1 : 0.72;
        g.fillStyle = fill; g.strokeStyle = foreign ? '#fff4e6' : '#231c13'; g.lineWidth = foreign ? 2 : 1;
        g.beginPath();
        if (h.k === 'area') { g.moveTo(sx, sy - r * 1.25); g.lineTo(sx + r * 1.25, sy); g.lineTo(sx, sy + r * 1.25); g.lineTo(sx - r * 1.25, sy); g.closePath(); }
        else g.rect(sx - r, sy - r, r * 2, r * 2);
        g.fill(); g.stroke();
        if (foreign) { g.strokeStyle = 'rgba(35,28,19,.55)'; g.lineWidth = 1; g.stroke(); }
        g.globalAlpha = 1;
        if (this.selHold === h.id) { g.strokeStyle = '#c2452f'; g.lineWidth = 2.5; g.beginPath(); g.arc(sx, sy, r * 2.4, 0, 6.2832); g.stroke(); }
        if (z >= 5 && h.k !== 'mid') label(h.n, h.x, h.y + 9 / s, { font: `500 10.5px ${BODY}`, size: 10, color: foreign ? '#7a2a1a' : '#3b2c1c', hw: 2.5 });
      }
    }
    // 郡の印
    for (const m of marks) {
      const col = D.COUNTRIES[m.o]?.mapc || '#777', fill = col === '#3a3a44' ? '#2b2b33' : col;
      g.strokeStyle = '#231c13'; g.fillStyle = fill;
      if (big) {
        // 旗
        const fx = m.sx, fy = m.sy - (ready ? Math.min(30, s * 1.9) : 0);
        g.lineWidth = 2; g.beginPath(); g.moveTo(fx, fy); g.lineTo(fx, fy - 28); g.stroke();
        g.fillRect(fx, fy - 28, 18, 13); g.lineWidth = 1; g.strokeRect(fx, fy - 28, 18, 13);
        g.fillStyle = '#fff4e6'; g.font = `11px ${DISP}`; g.fillText(D.COUNTRIES[m.o]?.name || '', fx + 9, fy - 21);
        if (m.isCap) { g.fillStyle = '#c9a14a'; g.beginPath(); g.arc(fx, fy - 30, 3, 0, 6.2832); g.fill(); }
      } else {
        g.lineWidth = 1.5;
        if (m.isCap) { g.fillRect(m.sx - r0 * 1.2, m.sy - r0 * 1.2, r0 * 2.4, r0 * 2.4); g.strokeRect(m.sx - r0 * 1.2, m.sy - r0 * 1.2, r0 * 2.4, r0 * 2.4); }
        else if (m.P.pass) { g.beginPath(); g.moveTo(m.sx, m.sy - r0 * 1.3); g.lineTo(m.sx + r0 * 1.2, m.sy + r0); g.lineTo(m.sx - r0 * 1.2, m.sy + r0); g.closePath(); g.fill(); g.stroke(); }
        else { g.beginPath(); g.arc(m.sx, m.sy, r0, 0, 6.28); g.fill(); g.stroke(); }
      }
      if (this.sel === m.P.id && !ready) { g.strokeStyle = '#c2452f'; g.lineWidth = 3; g.beginPath(); g.arc(m.sx, m.sy, r0 * 2.2, 0, 6.28); g.stroke(); }
    }
    // 主人公
    if (me) {
      const [sx, sy0] = this.w2s(me.x, me.y), sy = big && ready ? sy0 - Math.min(30, s * 1.9) : sy0, ox = big ? -24 : r0 + 2;
      g.strokeStyle = '#231c13'; g.lineWidth = 2; g.beginPath(); g.moveTo(sx + ox, sy); g.lineTo(sx + ox, sy - 30); g.stroke();
      g.fillStyle = '#c9a14a'; g.fillRect(sx + ox, sy - 30, 18, 16); g.strokeStyle = '#231c13'; g.lineWidth = 1; g.strokeRect(sx + ox, sy - 30, 18, 16);
      g.fillStyle = '#231c13'; g.font = `13px ${HEAD}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(S.mark(S.myOff()), sx + ox + 9, sy - 21.5);
      if (G.offers.length) { g.fillStyle = '#c2452f'; g.beginPath(); g.arc(sx - r0 - 6, sy - r0 - 6, 7, 0, 6.28); g.fill(); g.fillStyle = '#fff4e6'; g.font = '600 10px sans-serif'; g.fillText('戦', sx - r0 - 6, sy - r0 - 5.5); }
    }
    if (ready) this.drawLife(g, s, z, vw, vh, r0, big);
    if (ready && this._jur && z >= 2) { const [jx, jy] = this.w2s(this._jur.x, this._jur.y); g.font = `600 11px ${BODY}`; g.textAlign = 'center'; g.strokeStyle = 'rgba(238,228,198,.9)'; g.lineWidth = 3; g.strokeText('管轄', jx, jy - Math.max(14, 1.6 * s) - 8); g.fillStyle = '#a3321f'; g.fillText('管轄', jx, jy - Math.max(14, 1.6 * s) - 8); }
    if (!ready) { g.font = `13px ${BODY}`; g.fillStyle = 'rgba(35,28,19,.7)'; g.textAlign = 'center'; g.fillText('地図を描いています…', vw / 2, vh - 96); }
    // 縮尺
    if (ready) {
      const unitKm = 4.4, target = 90 / s * unitKm, pow = Math.pow(10, Math.floor(Math.log10(target))), nice = [1, 2, 5, 10].map(k => k * pow).filter(v => v <= target).pop() || pow;
      const wpx = nice / unitKm * s, x = 14, y = vh - 92;
      g.strokeStyle = '#231c13'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y - 4); g.lineTo(x, y); g.lineTo(x + wpx, y); g.lineTo(x + wpx, y - 4); g.stroke();
      g.font = `11px ${BODY}`; g.fillStyle = '#231c13'; g.textAlign = 'left'; g.strokeStyle = 'rgba(238,228,198,.85)'; g.lineWidth = 3;
      const tx = `${nice >= 1 ? nice : nice.toFixed(1)}km`; g.strokeText(tx, x + wpx + 6, y - 2); g.fillText(tx, x + wpx + 6, y - 2);
    }
  },
  // 季節の色合い（春は若葉、夏は濃く、秋は金色、冬は雪）
  seasonTint(g, vw, vh, dpr) {
    if (!G) return;
    const m = G.month;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const tint = m <= 3 ? 'rgba(130,190,90,.06)' : m <= 6 ? 'rgba(255,215,90,.05)' : m <= 9 ? 'rgba(225,150,60,.10)' : 'rgba(205,215,235,.16)';
    g.fillStyle = tint; g.fillRect(0, 0, vw, vh);
    if (m >= 10 || m <= 1) {
      // 北ほど雪
      const [, y0] = this.w2s(0, 150), [, y1] = this.w2s(0, 420);
      const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, `rgba(240,244,250,${m === 1 ? 0.22 : 0.34})`); gr.addColorStop(1, 'rgba(240,244,250,0)');
      g.fillStyle = gr; g.fillRect(0, 0, vw, vh);
    }
  },
  // 地図の生活感：包囲の陣、動き出す軍、戦の傷跡、隊商
  drawLife(g, s, z, vw, vh, r0, big) {
    if (!G) return;
    const t = (performance.now() / 1000);
    const myC = S.myOff().c;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    // 戦の傷跡：最近奪われた郡にくすぶる煙
    for (const P of D.PROVINCES) {
      const pv = G.prov[P.id]; if (pv.capturedAt == null || G.turn - pv.capturedAt > 3) continue;
      const [sx, sy] = this.w2s(P.x, P.y); if (sx < -40 || sy < -40 || sx > vw + 40 || sy > vh + 40) continue;
      const k = 1 - (G.turn - pv.capturedAt) / 4;
      g.fillStyle = `rgba(60,50,40,${0.22 * k})`; g.beginPath(); g.ellipse(sx, sy + r0 * 0.6, r0 * 2.6, r0 * 1.2, 0, 0, 6.2832); g.fill();
      for (let i = 0; i < 3; i++) { const ph = (t * 0.25 + i * 0.33) % 1; g.fillStyle = `rgba(90,84,76,${0.35 * k * (1 - ph)})`; g.beginPath(); g.arc(sx + (i - 1) * 4 + ph * 6, sy - r0 - ph * 26, 3 + ph * 6, 0, 6.2832); g.fill(); }
    }
    // 包囲の陣：城の周りに天幕
    for (const sg of (G.sieges || [])) {
      const P = S.P[sg.tgt]; if (!P) continue;
      const [sx, sy] = this.w2s(P.x, P.y); if (sx < -60 || sy < -60 || sx > vw + 60 || sy > vh + 60) continue;
      const col = D.COUNTRIES[sg.atk]?.mapc || '#777';
      const R = Math.max(14, r0 * 2.6);
      for (let i = 0; i < 6; i++) { const an = i / 6 * 6.2832 + 0.5; const x = sx + Math.cos(an) * R, y = sy + Math.sin(an) * R * 0.7; g.fillStyle = col; g.strokeStyle = '#231c13'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y - 5); g.lineTo(x + 5, y + 3); g.lineTo(x - 5, y + 3); g.closePath(); g.fill(); g.stroke(); }
      g.strokeStyle = 'rgba(194,69,47,.75)'; g.lineWidth = 1.5; g.setLineDash([3, 3]); g.beginPath(); g.ellipse(sx, sy, R + 7, (R + 7) * 0.7, 0, 0, 6.2832); g.stroke(); g.setLineDash([]);
      g.font = `600 10px ${V.fontHead ? V.fontHead() : 'serif'}`; g.fillStyle = '#fff4e6'; g.strokeStyle = 'rgba(35,28,19,.9)'; g.lineWidth = 3;
      const tx = `${S.cname(sg.atk)}軍 包囲${sg.months}か月`; g.strokeText(tx, sx, sy + R + 14); g.fillText(tx, sx, sy + R + 14);
    }
    // 動き出す軍：来月の遠征（評定で決まった攻略）
    for (const pd of (G.pend || [])) {
      if (pd.k !== 'camp' || !pd.plan) continue;
      const a = S.P[pd.plan.src], b = S.P[pd.plan.tgt]; if (!a || !b) continue;
      const [ax, ay] = this.w2s(a.x, a.y), [bx, by] = this.w2s(b.x, b.y);
      const ph = (t * 0.35) % 1; const mx = ax + (bx - ax) * (0.25 + ph * 0.5), my = ay + (by - ay) * (0.25 + ph * 0.5);
      g.strokeStyle = 'rgba(194,69,47,.6)'; g.lineWidth = 2; g.setLineDash([6, 5]); g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke(); g.setLineDash([]);
      const col = D.COUNTRIES[pd.c]?.mapc || '#777';
      g.strokeStyle = '#231c13'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(mx, my + 6); g.lineTo(mx, my - 10); g.stroke(); g.fillStyle = col; g.fillRect(mx, my - 10, 10, 7); g.strokeRect(mx, my - 10, 10, 7);
    }
    // 隊商：同じ国の隣り合う郡のあいだを行き来する（商いが盛んな郡ほど多い）
    if (z >= 1.2 && !(G.month >= 11 || G.month === 1)) {
      let n = 0;
      for (const P of D.PROVINCES) {
        const pv = G.prov[P.id]; if (pv.comm < 45) continue;
        for (const q of S.adj(P.id)) {
          if (q < P.id || G.prov[q].o !== pv.o) continue;
          const Q = S.P[q]; const h = (P.id.charCodeAt(0) * 7 + q.charCodeAt(1)) % 13;
          const ph = ((t * 0.04) + h / 13) % 1, dir = h % 2 ? 1 : -1;
          const k = dir > 0 ? ph : 1 - ph;
          const x = P.x + (Q.x - P.x) * k, y = P.y + (Q.y - P.y) * k;
          const [sx, sy] = this.w2s(x, y); if (sx < -10 || sy < -10 || sx > vw + 10 || sy > vh + 10) continue;
          g.fillStyle = 'rgba(120,90,50,.85)'; g.beginPath(); g.arc(sx, sy, 2, 0, 6.2832); g.fill(); g.beginPath(); g.arc(sx - dir * 4, sy + 1, 1.6, 0, 6.2832); g.fill();
          if (++n > 40) break;
        }
        if (n > 40) break;
      }
    }
  },
  bind() {
    const cv = this.cv; const ptrs = new Map(); let pinch = null, drag = null;
    const pos = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    cv.onpointerdown = (e) => { cv.setPointerCapture(e.pointerId); const [x, y] = pos(e); ptrs.set(e.pointerId, { x, y, sx: x, sy: y, moved: false }); if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: this.cam.s, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, camx: this.cam.x, camy: this.cam.y }; } else drag = { x, y, camx: this.cam.x, camy: this.cam.y }; };
    cv.onpointermove = (e) => {
      const p = ptrs.get(e.pointerId); if (!p) return; const [x, y] = pos(e); p.x = x; p.y = y; if (Math.hypot(x - p.sx, y - p.sy) > 8) p.moved = true;
      if (pinch && ptrs.size >= 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); const ns = pinch.s * d / Math.max(10, pinch.d); const wx = (pinch.cx - this.vw / 2) / pinch.s + pinch.camx, wy = (pinch.cy - this.vh / 2) / pinch.s + pinch.camy; const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2; this.cam.s = ns; this.clamp(); this.cam.x = wx - (cx - this.vw / 2) / this.cam.s; this.cam.y = wy - (cy - this.vh / 2) / this.cam.s; this.clamp(); this.req(); return; }
      if (drag && p.moved) { this.cam.x = drag.camx - (x - drag.x) / this.cam.s; this.cam.y = drag.camy - (y - drag.y) / this.cam.s; this.clamp(); this.req(); }
    };
    const up = (e) => { const p = ptrs.get(e.pointerId); if (!p) return; ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; if (!p.moved && ptrs.size === 0) this.tap(p.x, p.y); if (!ptrs.size) drag = null; };
    cv.onpointerup = up; cv.onpointercancel = up;
    cv.onwheel = (e) => { e.preventDefault(); const [x, y] = pos(e); const [wx, wy] = this.s2w(x, y); this.cam.s *= Math.exp(-e.deltaY * 0.0015); this.clamp(); this.cam.x = wx - (x - this.vw / 2) / this.cam.s; this.cam.y = wy - (y - this.vh / 2) / this.cam.s; this.clamp(); this.req(); };
  },
  // 拠点の印を描くか（奪われた拠点は早めに、自国の拠点は選んだ郡か十分に寄ったときだけ）
  holdVis(h, z) {
    if (h.o !== G.prov[h.pid].o) return z >= 1.5;
    return z >= 4.5 || (z >= 2.2 && this.sel === h.pid);
  },
  tap(x, y) {
    // 拠点の印（寄っているとき）
    const z = this.cam.s / this.fitS();
    this.selHold = null;
    if (G.hold && MAP.ready && z >= 1.5) {
      let hb = null, hd = 14;
      for (const h of S.holdAll()) { if (!this.holdVis(h, z)) continue; const [sx, sy] = this.w2s(h.x, h.y); const d = Math.hypot(sx - x, sy - y); if (d < hd) { hd = d; hb = h; } }
      if (hb) { this.selHold = hb.id; this.selCounty = null; this.select(hb.pid); return; }
    }
    let best = null, bd = 28;
    for (const P of D.PROVINCES) { const [sx, sy] = this.w2s(P.x, P.y); const d = Math.hypot(sx - x, sy - y); if (d < bd) { bd = d; best = P.id; } }
    this.selCounty = null;
    if (!best && MAP.ready) {
      const [wx, wy] = this.s2w(x, y);
      const pi = GEO.regionAt(wx, wy);
      if (pi >= 0) best = D.PROVINCES[pi].id;
      if (best && this.cam.s / this.fitS() >= 3) { const ct = U.minBy(GEO.byProv[best] || [], c => Math.hypot(c.x - wx, c.y - wy)); if (ct && Math.hypot(ct.x - wx, ct.y - wy) * this.cam.s < 40) this.selCounty = ct.id; }
    }
    if (best) this.select(best); else { this.sel = null; U.$('#map-sheet').hidden = true; this.draw(); }
  },
  select(pid) {
    this.sel = pid; this.draw();
    const sh = U.$('#map-sheet'); if (!sh) return;
    sh.hidden = false;
    sh.innerHTML = UI.provSheet(pid, this.selCounty, this.selHold);
    for (const b of U.$$('.gov-b[data-oid]', sh)) if (b.dataset.oid) b.onclick = () => UI.officerCard(G.off[b.dataset.oid]);
    U.$('#sh-x', sh).onclick = () => { this.sel = null; this.selHold = null; sh.hidden = true; this.draw(); };
    for (const b of U.$$('[data-act]', sh)) b.onclick = () => UI.runAct(b.dataset.act, pid);
    for (const b of U.$$('[data-hold]', sh)) b.onclick = () => { A._preHold = b.dataset.hold; UI.runAct('kyoten', pid); };
    const hs = U.$('.hrow.sel', sh); if (hs) setTimeout(() => { try { hs.scrollIntoView({ block: 'nearest' }); } catch (e) { /* */ } }, 30);
  },
};
// 郡の風土（全体マップから）
UI._pg = {};
UI.provGeo = (pid) => {
  if (UI._pg[pid]) return UI._pg[pid];
  const s = GEO.site(pid, { r: 10 });
  const cts = GEO.byProv[pid] || [];
  const d = [];
  if (s) {
    if (s.elev > 0.62) d.push('険しい山地'); else if (s.elev > 0.42 || s.rough > 0.07) d.push('起伏が多い'); else d.push('平らな土地');
    if (s.forest > 0.35) d.push('森が深い'); else if (s.forest > 0.18) d.push('林が点在する');
    if (s.farm > 0.5) d.push('麦畑とオリーブ畑が広がる');
    if (s.marsh > 0.2) d.push('沼沢が多い');
    if (s.steppe > 0.5) d.push('草原'); else if (s.sand > 0.5) d.push('砂漠に接する'); else if (s.sand > 0.25) d.push('砂地がある');
    if (s.river) d.push(`${s.river.n}のほとり`);
    if (s.coast) d.push('海に近い');
  }
  return (UI._pg[pid] = { desc: d.join('・'), counties: cts.length, villages: cts.reduce((a, c) => a + c.vil.length, 0) });
};
// 名品の効き目（能力と特殊効果）
UI.itemEff = (id) => {
  const it = D.ITEMS[id]; if (!it) return '';
  const a = Object.entries(it.eff || {}).map(([k, v]) => (UI.statName[k] || { hp: '体', duel: '一騎打ち', spd: '速さ' }[k] || k) + (v > 1 && v < 2 ? '×' + v : '+' + v));
  const b = Object.entries(it.fx || {}).map(([k, v]) => D.fxText(k, v)).filter(Boolean);
  return a.concat(b).join(' ');
};
UI.provInfoKnown = (pid) => {
  const myC = S.myOff().c, p = G.prov[pid];
  if (p.o === myC) return true;
  if (G.me.flags.spy && G.me.flags.spy > G.turn) return true;
  if (G.me.flags.scouted && G.me.flags.scouted[pid] && G.turn - G.me.flags.scouted[pid] < 4) return true;
  return false;
};
// 郡の拠点の一覧（支配の割合と、攻め取れる拠点の「攻略」）
UI.holdSection = (pid, selHold, known, approx) => {
  const p = G.prov[pid], myC = S.myOff().c, hs = G.hold ? S.holdsIn(pid) : [];
  if (!hs.length) return '';
  const shares = {}; shares[p.o] = 1 - S.foreignShare(p);
  for (const h of hs) if (h.o !== p.o) shares[h.o] = (shares[h.o] || 0) + h.sh;
  const col = (c) => { const x = D.COUNTRIES[c]?.mapc || '#777'; return x === '#3a3a44' ? '#55555f' : x; };
  const bar = Object.entries(shares).filter(([, v]) => v > 0).map(([c, v]) => `<i style="flex:${v.toFixed(3)};background:${col(c)}" title="${S.cname(c)}"></i>`).join('');
  const legend = Object.entries(shares).filter(([, v]) => v > 0).map(([c, v]) => `${S.cname(c)}${Math.round(v * 100)}%`).join('・');
  const kyo = A.list.find(a => a.id === 'kyoten'), canK = kyo && A.status(kyo).ok;
  const tg = new Set(canK ? W.playerHoldTargets().map(h => h.id) : []);
  const defStr = (h) => (h.o === myC || known) ? U.fmt(S.holdDef(h)) : approx(S.holdDef(h));
  const row = (h) => `<div class="hrow${h.o !== p.o ? ' fx' : ''}${h.id === selHold ? ' sel' : ''}">${UI.cseal(h.o, 22)}<div class="hr-m"><b>${U.esc(h.n)}</b><small>${D.HOLDK[h.k].n}${h.w ? `・城壁${h.w}` : ''}${h.o !== p.o ? `・${S.cname(h.o)}が占領` : ''}</small></div><span class="num hr-d">守り${defStr(h)}</span>${tg.has(h.id) ? `<button class="btn sm pri" data-hold="${h.id}">攻略</button>` : '<span></span>'}</div>`;
  return `<div class="sec-h sm">拠点 <small class="note">${legend}</small></div><div class="hbar" aria-hidden="true">${bar}</div>
    <div class="hrows">
      <div class="hrow big">${UI.cseal(p.o, 22)}<div class="hr-m"><b>${U.esc(S.bigName(pid))}</b><small>大都市（州の都）・城壁${known || p.o === myC ? Math.round(p.wall) : '？'}・遠征でしか取れない</small></div><span class="num hr-d">守り${(p.o === myC || known) ? U.fmt(p.troops) : approx(p.troops)}</span><span></span></div>
      ${hs.map(row).join('')}
    </div>`;
};
UI.provSheet = (pid, countyId, selHold) => {
  const P = S.P[pid], p = G.prov[pid], myC = S.myOff().c;
  const cts = GEO.built ? (GEO.byProv[pid] || []) : [];
  const selC = countyId ? GEO.county(countyId) : null;
  const known = UI.provInfoKnown(pid);
  const gov = G.off[p.gov];
  const gens = S.officersOf(p.o, x => x.loc === pid && ['dais', 'shog', 'goz'].includes(x.r)).slice(0, 4);
  const approx = n => known ? U.fmt(n) : '約' + U.fmt(n >= 10000 ? Math.round(n / 10000) * 10000 : n >= 1000 ? Math.round(n / 1000) * 1000 : n >= 100 ? Math.round(n / 100) * 100 : Math.max(10, Math.round(n / 10) * 10));
  const own = p.o === myC;
  const d = own ? null : S.dip(myC, p.o);
  const sgP = W.siegeOf ? W.siegeOf(pid) : null;
  const rel = (d ? `<span class="pill ${d.st === 'war' ? 'war' : d.st === 'ally' ? 'good' : ''}">${{ war: '交戦中', peace: '平時', ally: '同盟', truce: '停戦' }[d.st]}</span>` : '<span class="pill good">自国</span>') + (sgP ? `<span class="pill war">${S.cname(sgP.atk)}軍が包囲中（${sgP.months}か月）</span>` : '') + (W.supplyIndex && !own && d && d.st === 'war' ? `<span class="pill">補給線：${W.supplyLabel(W.supplyIndex(myC, pid))}</span>` : '');
  const acts = [];
  const adjEnemy = S.adj(G.me.loc).includes(pid) && !own;
  const st = (id) => { const a = A.list.find(x => x.id === id); return a ? A.status(a) : { show: false }; };
  if (own && pid !== G.me.loc && st('idou').ok) acts.push(['idou', 'ここへ移動']);
  if (adjEnemy && st('teisatsu').ok) acts.push(['teisatsu', '偵察']);
  if (adjEnemy && st('shutsugeki').ok && d.st !== 'ally' && d.st !== 'truce') acts.push(['shutsugeki', '出撃（小規模）']);
  if (!own && st('jousou').ok && D.RANKS[G.me.rank].tier >= 7 && S.ownedProvs(myC).some(q => S.adj(q.id).includes(pid))) acts.push(['jousou', '遠征を上奏']);
  if (!own && st('shuppei').ok && S.atWar(myC, p.o) && S.ownedProvs(myC).some(q => S.adj(q.id).includes(pid))) acts.push(['shuppei', '遠征']);
  if (pid === G.me.loc && G.offers.length && st('offers').ok) acts.push(['offers', `戦場へ（${G.offers.length}）`]);
  return `<div class="sheet-h">${UI.cseal(p.o, 34)}<h3>${P.name}</h3>${rel}<button class="btn sm sheet-x" id="sh-x">閉じる</button></div>
    ${P.desc ? `<p class="note" style="margin:0 0 8px">${P.desc}</p>` : ''}
    <div class="kv">
      <div><span>人口</span><b>${Math.round(p.pop)}万</b></div>
      <div><span>兵</span><b>${approx(p.troops)}</b></div>
      <div><span>城壁</span><b>${known ? Math.round(p.wall) : '？'}</b></div>
      <div><span>農業</span><b>${known ? Math.round(p.agri) : '？'}</b></div>
      <div><span>商業</span><b>${known ? Math.round(p.comm) : '？'}</b></div>
      <div><span>治安</span><b>${known ? Math.round(p.order) : '？'}</b></div>
      <div><span>民心</span><b>${known ? Math.round(p.loyal) : '？'}</b></div>
      <div><span>地勢</span><b>${D.TERRAIN_THEME[P.t].n}</b></div>
      <div><span>総督</span><b class="gov-b" data-oid="${gov ? gov.id : ''}">${gov ? PORT.tag(gov, 26) + ' ' + U.esc(gov.n) : '－'}</b></div>
    </div>
    ${gens.length && (own || known) ? `<p class="note" style="margin:8px 0 0">駐屯：${gens.map(x => `${U.esc(x.n)}（${D.RANKS[x.r].name}）`).join('、')}</p>` : ''}
    ${GEO.built ? (() => { const gg = UI.provGeo(pid); return gg.desc ? `<p class="note" style="margin:6px 0 0">風土：${gg.desc}（${gg.counties}市・${gg.villages}村）</p>` : ''; })() : ''}
    ${cts.length ? `<p class="note" style="margin:6px 0 0">町：${cts.map(c => c.id === countyId ? `<b style="color:var(--fg)">${U.esc(c.n)}</b>` : U.esc(c.n)).join('・')}${selC ? `　<span style="color:var(--bronze)">${U.esc(selC.n)}の村：${selC.vil.slice(0, 8).map(v => U.esc(v.n)).join('・')}${selC.vil.length > 8 ? ' ほか' : ''}</span>` : ''}</p>` : ''}
    ${UI.holdSection(pid, selHold, known, approx)}
    <p class="note" style="margin:6px 0 0">隣接：${S.adj(pid).map(q => S.P[q].name).join('・')}</p>
    ${G.me.loc === pid ? '<p class="note" style="color:var(--bronze);margin:6px 0 0">★ 主人公の所在</p>' : ''}
    ${acts.length ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">${acts.map(([k, n]) => `<button class="btn sm pri" data-act="${k}">${n}</button>`).join('')}</div>` : ''}`;
};
UI.runAct = async (id, pid) => {
  const a = A.list.find(x => x.id === id); if (!a) return;
  A._pre = pid;
  const msg = await A.run(a);
  A._pre = null;
  if (G.over) { await SAVE.auto(); return UI.ending(); }
  if (msg) await UI.info({ title: a.n, body: msg });
  UI.refresh();
};

/* ---------- 行動 ---------- */
UI.actTab = (c) => {
  const cats = A.visibleCats();
  const me = G.me;
  let html = `<div class="step-h" style="margin-top:0"><h2>行動</h2><small>任務状 ${me.ap} / ${S.apMax()}</small></div>`;
  html += UI.hintCard();
  if (G.offers.length) html += `<div class="card" style="border-color:var(--seal);margin-bottom:12px"><b style="color:#f2a08c">戦の報せ</b><div class="note">${G.offers.map(o => U.esc(o.desc)).join('<br>')}</div></div>`;
  if (me.tasks.length) html += `<div class="card" style="margin-bottom:12px"><b style="color:var(--bronze)">任務</b>${me.tasks.map(t => `<div class="note">・${U.esc(t.desc)}（期限 あと${Math.max(0, t.due - G.turn)}か月）</div>`).join('')}</div>`;
  for (const cat of A.CATS) {
    if (!cats.includes(cat.k)) continue;
    const list = A.list.filter(a => a.cat === cat.k).map(a => ({ a, s: A.status(a) })).filter(x => x.s.show);
    if (!list.length) continue;
    html += `<div class="sec-h">${cat.n}</div><div class="list">`;
    for (const { a, s } of list) {
      const cost = a.cost ? a.cost() : 0;
      html += `<button class="act" data-a="${a.id}" ${s.ok ? '' : 'disabled'}><b>${a.n}</b><span class="apcost">${a.ap ? '<i></i>'.repeat(a.ap) : '無償'}${cost ? `　金${U.fmt(cost)}` : ''}</span><small>${a.d}</small>${s.ok ? '' : `<span class="why">${U.esc(s.why)}</span>`}</button>`;
    }
    html += '</div>';
  }
  c.innerHTML = html;
  UI.bindHint(c);
  for (const b of U.$$('.act', c)) b.onclick = () => UI.runAct(b.dataset.a);
};

/* ---------- 軍 ---------- */
UI.armyTab = (c) => {
  const me = G.me, o = S.myOff(), A2 = me.army;
  S.tidyArmy();
  const tot = S.armyTotal(), cap = S.armyCap(), pv = U.sum(A2.sq.filter(s => s.pv), s => s.n);
  const rkA = D.RANKS[me.rank];
  let html = `<div class="step-h" style="margin-top:0"><h2>軍</h2><small>${U.fmt(tot)}人（国軍 ${U.fmt(tot - pv)}／上限${U.fmt(cap)}${rkA.tmax ? `・功績で最大${U.fmt(rkA.tmax)}` : ''}・私兵 ${U.fmt(pv)}／${U.fmt(S.pvCap())}）</small></div>`;
  const quick = ['kunren', 'moukun', 'hojuu', 'soubi', 'hensei', 'gono', 'senjutsu'].map(id => A.list.find(a => a.id === id)).filter(a => a && A.status(a).show);
  html += `<div style="display:flex;gap:6px;flex-wrap:wrap">${quick.map(a => `<button class="btn sm" data-a="${a.id}" ${A.status(a).ok ? '' : 'disabled'}>${a.n}${a.ap ? `（${a.ap}）` : ''}</button>`).join('')}</div>`;
  if (A2.wu.length) {
    html += `<div class="sec-h">伍</div><div class="grid wide">`;
    html += `<div class="card wucard"><div class="face" style="border-color:var(--bronze)">${U.esc(S.mark(o))}</div><div><b>${U.esc(o.n)}（伍長）</b><div class="note">武${S.stat(o, 'bu')}　統${S.stat(o, 'tou')}</div></div></div>`;
    for (const w of A2.wu) html += `<div class="card wucard ${w.alive ? '' : 'dead'}"><div class="face">${U.esc(w.n.slice(0, 1))}</div><div style="min-width:0"><b>${U.esc(w.n)}${w.fresh ? ' <span class="pill">新兵</span>' : ''}</b><div class="note">武${w.bu}　体${Math.round(w.hp)}　絆${Math.round(w.bond)}${w.tr ? '　' + D.TRAITS[w.tr].n : ''}</div>${UI.bar(w.hp, 100, w.hp < 50 ? 'rd' : '')}</div></div>`;
    html += `</div>`;
  }
  if (W.canPickSortie()) {
    const cur = A2.sortieAsk === false ? (A2.sortiePre || 'auto') : 'ask';
    html += `<div class="card sortie-pref"><b>合戦に出る部隊</b><div class="seg sm" role="group" aria-label="合戦に出る部隊の選び方">${[['ask', '毎回選ぶ'], ['auto', '敵の倍まで'], ['direct', '直属だけ'], ['all', '全軍']].map(([k, n]) => `<button data-sortie="${k}" class="${cur === k ? 'on' : ''}" aria-pressed="${cur === k}">${n}</button>`).join('')}</div><p class="note" style="margin:6px 0 0">${cur === 'ask' ? '合戦の前に、出撃する部隊と人数を選ぶ。' : cur === 'auto' ? '敵の兵の倍ほどになるまで、直属の隊と練度の高い隊から出す。' : cur === 'direct' ? '部下に任せた兵は留守を守り、直属の兵だけで出る。' : 'いつも全軍で出る。'}</p></div>`;
  }
  html += A2.sq.length || A2.subs.length ? UI.allotHtml() : `<div class="sec-h">部隊</div><p class="empty">兵はいない。</p>`;
  const tsm = me.tac.length > 10;
  html += `<div class="sec-h">会得した戦術 <small class="note">${me.tac.length}</small></div><div class="chipgrid">${me.tac.map(t => `<span class="tchip${tsm ? ' sm' : ''}" title="${U.esc(D.TACTICS[t].d)}"><b>${D.TACTICS[t].n}</b>${tsm ? '' : `<small>${D.TACTICS[t].d}</small>`}</span>`).join('') || '<p class="empty">まだない。「戦術研究」で会得できる。</p>'}</div>`;
  html += `<p class="note" style="margin-top:10px">合戦前の軍議で、会得した戦術から準備するものを選ぶ。準備できる数は総大将の知力で決まる。</p>`;
  c.innerHTML = html;
  for (const b of U.$$('[data-a]', c)) b.onclick = () => UI.runAct(b.dataset.a);
  UI.allotBind(c);
  if (UI._scrollAllot) { UI._scrollAllot = false; const el = U.$('#allot', c); if (el) requestAnimationFrame(() => el.scrollIntoView({ block: 'start' })); }
};

/* ---------- 部隊の割り振り（任務状は使わない） ---------- */
UI.allotOpen = null;   // 開いている「移す」の隊
UI.allotDst = null;    // 選んでいる移す先
UI.ALLOT_COL = ['#62b39b', '#c9a14a', '#c47a52', '#8b9bd6', '#c48fb4', '#6fb0c9', '#a3b86a', '#d6a37a', '#9fa8a0'];
UI.allotGroups = () => {
  const A2 = G.me.army, o = S.myOff();
  const gs = [{ id: '', off: o, name: o.n, role: '直属', sq: A2.sq.filter(s => !s.ld) }];
  for (const id of A2.subs) {
    const x = G.off[id]; if (!x || !x.alive) continue;
    gs.push({ id, off: x, name: x.n, role: id === A2.dep ? '副官' : '部下', sq: A2.sq.filter(s => s.ld === id) });
  }
  gs.forEach((g, i) => { g.n = U.sum(g.sq, s => s.n); g.col = UI.ALLOT_COL[i % UI.ALLOT_COL.length]; });
  return gs;
};
UI.allotHtml = () => {
  const A2 = G.me.army, gs = UI.allotGroups(), orders = A2.orders || {};
  const total = U.sum(gs, g => g.n);
  let html = `<div class="sec-h" id="allot">部隊の割り振り <small class="note">任務状は使わない</small></div>`;
  if (total > 0 && gs.length > 1) {
    html += `<div class="al-bar" aria-hidden="true">${gs.filter(g => g.n).map(g => `<i style="flex:${g.n};background:${g.col}"></i>`).join('')}</div>`;
    html += `<div class="al-leg">${gs.filter(g => g.n).map(g => `<span><i style="background:${g.col}"></i>${U.esc(g.id ? g.name : '直属')} ${Math.round(g.n / total * 100)}%</span>`).join('')}</div>`;
  }
  if (gs.length === 1 && G.me.army.wu.length === 0) html += `<p class="note" style="margin:0 0 8px">部下がいれば、ここで兵を任せられる（「人材探索」や昇進で部下が増える）。</p>`;
  for (const g of gs) {
    const x = g.off, me = !g.id;
    const mode = me ? 'self' : (orders[g.id] || 'self');
    html += `<div class="card ag" data-g="${g.id}"><div class="ag-h"><span class="ag-dot" style="background:${g.col}"></span>
      <div class="ag-who"><b>${U.esc(g.name)}</b> <span class="pill${g.role === '副官' ? ' good' : ''}">${g.role}</span>
      <small>${me ? '自ら率いる' : `統${S.stat(x, 'tou')} 武${S.stat(x, 'bu')} 知${S.stat(x, 'chi')}${(x.tr || []).length ? '・' + x.tr.slice(0, 2).map(t => D.TRAITS[t] ? D.TRAITS[t].n : '').filter(Boolean).join('・') : ''}`}</small></div>
      <div class="ag-n num"><b>${U.num(g.n)}</b><small>人</small></div></div>`;
    if (!me) {
      html += `<div class="ag-mode" role="group" aria-label="${U.esc(g.name)}の合戦での任せ方"><span class="ag-ml">合戦での任せ方</span>${Object.entries(S.ORDER_MODES).map(([k, v]) => `<button class="chip${mode === k ? ' on' : ''}" data-om="${g.id}" data-mode="${k}" title="${S.ORDER_DESC[k]}" aria-pressed="${mode === k}">${v}</button>`).join('')}</div>`;
      if (mode !== 'self') html += `<p class="note ${S.canLead(x) ? '' : 'warn'}" style="margin:0">${S.canLead(x) ? `開戦と同時に${U.esc(g.name)}が${S.ORDER_DESC[mode]}。` : '未熟なため、任せても持ち場を守るだけ（統率60か知力65以上で自ら判断する）。'}</p>`;
    }
    html += `<div class="ag-sqs">${g.sq.map(s => UI.sqRow(s, gs)).join('') || `<p class="empty sm">${me ? '直属の兵はいない。' : 'まだ兵を任せていない。'}</p>`}</div>`;
    if (!me) html += `<div class="ag-f">${g.role !== '副官' ? `<button class="btn sm ghost" data-dep="${g.id}">副官にする</button>` : ''}<button class="btn sm ghost" data-fire="${g.id}">解任する</button></div>`;
    html += `</div>`;
  }
  const canMerge = (() => { const k = new Set(); for (const s of A2.sq) { const key = [s.t, s.pv ? 1 : 0, s.ld || ''].join('|'); if (k.has(key)) return true; k.add(key); } return false; })();
  if (canMerge) html += `<div class="al-foot"><button class="btn sm" data-merge>同じ隊長・同じ兵種の隊をまとめる</button></div>`;
  return html;
};
UI.sqRow = (s, gs) => {
  const ut = D.UT[s.t], open = UI.allotOpen === s.id;
  let h = `<div class="sqr"><span class="ty">${ut.s}</span>
    <div class="sqr-m"><b>${ut.n}</b>${s.pv ? ' <span class="pill">私兵</span>' : ''}<small>練度${Math.round(s.tr)}・武器${s.wl}・防具${s.al}${!s.pv && s.max > s.n ? `・欠員${U.num(s.max - s.n)}` : ''}</small></div>
    <div class="sqr-n num"><b>${U.num(s.n)}</b></div>
    <button class="btn sm${open ? ' on' : ''}" data-mv="${s.id}" aria-expanded="${open}" ${s.n > 0 ? '' : 'disabled'}>${open ? '閉じる' : '移す'}</button></div>`;
  if (!open) return h;
  const dsts = gs.filter(g => g.id !== (s.ld || ''));
  const sel = dsts.some(g => g.id === UI.allotDst) ? UI.allotDst : (dsts[0] ? dsts[0].id : null);
  UI.allotDst = sel;
  h += `<div class="mv-ed" data-for="${s.id}">
    <div class="mv-row"><label for="mv-n">人数</label><input id="mv-n" type="number" inputmode="numeric" min="1" max="${s.n}" step="1" value="${s.n}"><span class="note">／${U.num(s.n)}人</span></div>
    <input id="mv-r" type="range" min="1" max="${s.n}" step="1" value="${s.n}" aria-label="人数">
    <div class="mv-q">${[[0.25, '¼'], [0.5, '半分'], [0.75, '¾'], [1, '全部']].map(([f, l]) => `<button class="chip" data-q="${f}">${l}</button>`).join('')}</div>
    ${dsts.length ? `<div class="mv-row col"><span class="note">任せる先</span><div class="mv-dst">${dsts.map(g => `<button class="chip${g.id === sel ? ' on' : ''}" data-dst="${g.id}" aria-pressed="${g.id === sel}">${U.esc(g.id ? g.name : '直属（自分）')}</button>`).join('')}</div></div>` : `<p class="note" style="margin:0">移す先がない。部下が増えると兵を任せられる。</p>`}
    <div class="mv-acts"><button class="btn sm seal" data-go ${dsts.length ? '' : 'disabled'}>移す</button></div>
    ${UI.convHtml(s)}
    ${s.pv ? `<div class="mv-acts"><button class="btn sm ghost" data-disband>解散する</button></div>` : ''}
  </div>`;
  return h;
};
// 兵種を変える（任務状は使わない）
UI.allotTy = null;
UI.convHtml = (s) => {
  if (S.tier() < 2) return '';
  const types = D.UT_TRAINABLE.filter(t => t !== s.t && A.canField(t));
  if (!types.length) return `<p class="note" style="margin:0">兵種を変えるには厩舎・工房・鍛冶場が要る。</p>`;
  if (!types.includes(UI.allotTy)) UI.allotTy = null;
  return `<div class="mv-row col"><span class="note">兵種を変える（金がかかり、練度は6割になる）</span>
    <div class="mv-ty">${types.map(t => `<button class="chip${t === UI.allotTy ? ' on' : ''}" data-ty="${t}" aria-pressed="${t === UI.allotTy}">${D.UT[t].n}<small> 金${A.convCost(t)}</small></button>`).join('')}</div></div>
    <div class="mv-acts"><button class="btn sm pri" data-conv disabled>兵種を選ぶ</button></div>`;
};
UI.allotBind = (c) => {
  const A2 = G.me.army;
  const redraw = () => UI.tab('army', true);
  for (const b of U.$$('[data-mv]', c)) b.onclick = () => { UI.allotOpen = UI.allotOpen === b.dataset.mv ? null : b.dataset.mv; redraw(); };
  for (const b of U.$$('[data-om]', c)) b.onclick = () => { S.setOrder(b.dataset.om, b.dataset.mode); redraw(); };
  for (const b of U.$$('[data-dep]', c)) b.onclick = () => { A2.dep = b.dataset.dep; UI.toast(`${G.off[A2.dep].n}を副官にした`); redraw(); };
  // 部下の解任（二度押しで）
  for (const b of U.$$('[data-fire]', c)) b.onclick = () => {
    const id = b.dataset.fire, x = G.off[id]; if (!x) return;
    if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = `${x.n}を解任する（もう一度押す）`; b.classList.add('warn'); return; }
    const n = U.sum(A2.sq.filter(s => s.ld === id), s => s.n);
    if (S.dismissSub(id)) { UI.toast(`${x.n}を解任した${n ? `。兵${U.num(n)}人は直属に戻った` : ''}`); S.log(`部下の${x.n}を解任した。`); }
    redraw();
  };
  // 合戦に出る部隊の選び方
  for (const b of U.$$('[data-sortie]', c)) b.onclick = () => { const v = b.dataset.sortie; if (v === 'ask') A2.sortieAsk = true; else { A2.sortieAsk = false; A2.sortiePre = v; } redraw(); };
  const mg = U.$('[data-merge]', c); if (mg) mg.onclick = () => { const k = S.mergeSquads(); UI.toast(k ? `${k}隊をまとめた` : 'まとめられる隊はない'); redraw(); };
  const ed = U.$('.mv-ed', c); if (!ed) return;
  const s = A2.sq.find(x => x.id === ed.dataset.for); if (!s) return;
  const inp = U.$('#mv-n', ed), rng = U.$('#mv-r', ed);
  const val = () => U.clamp(Math.floor(Number(inp.value) || 0), 0, s.n);
  inp.oninput = () => { rng.value = val() || 1; };
  inp.onchange = () => { inp.value = Math.max(1, val()); rng.value = inp.value; };
  rng.oninput = () => { inp.value = rng.value; };
  for (const b of U.$$('[data-q]', ed)) b.onclick = () => { inp.value = Math.max(1, Math.round(s.n * Number(b.dataset.q))); rng.value = inp.value; };
  for (const b of U.$$('[data-dst]', ed)) b.onclick = () => { UI.allotDst = b.dataset.dst; for (const x of U.$$('[data-dst]', ed)) { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', String(x === b)); } };
  // 兵種を変える
  const cv = U.$('[data-conv]', ed);
  const updConv = () => {
    if (!cv) return;
    const t = UI.allotTy, n = val();
    if (!t) { cv.disabled = true; cv.textContent = '兵種を選ぶ'; return; }
    const cost = n * A.convCost(t);
    cv.disabled = n < 1 || cost > G.me.gold;
    cv.textContent = cost > G.me.gold ? `金が足りない（金${U.fmt(cost)}）` : `${U.num(n)}人を${D.UT[t].n}に変える（金${U.fmt(cost)}）`;
  };
  for (const b of U.$$('[data-ty]', ed)) b.onclick = () => { UI.allotTy = UI.allotTy === b.dataset.ty ? null : b.dataset.ty; for (const x of U.$$('[data-ty]', ed)) { x.classList.toggle('on', x.dataset.ty === UI.allotTy); x.setAttribute('aria-pressed', String(x.dataset.ty === UI.allotTy)); } updConv(); };
  inp.addEventListener('input', updConv); inp.addEventListener('change', updConv); rng.addEventListener('input', updConv);
  for (const b of U.$$('[data-q]', ed)) b.addEventListener('click', updConv);
  if (cv) cv.onclick = () => {
    const t = UI.allotTy, n = val(); if (!t || n < 1) return;
    const k = A.convertTroops(s.id, n, t);
    if (k) { UI.toast(`${U.num(k)}人を${D.UT[t].n}に変えた（金-${U.fmt(k * A.convCost(t))}）`); S.log(`兵種転換：${U.num(k)}人を${D.UT[t].n}に変えた。`); UI.allotOpen = null; UI.allotTy = null; }
    else UI.toast('変えられなかった');
    redraw();
  };
  updConv();
  const go = U.$('[data-go]', ed);
  if (go) go.onclick = () => {
    const n = val(); if (n < 1) { UI.toast('人数を入れてください'); return; }
    const dst = UI.allotDst || null, who = dst ? G.off[dst].n : '直属';
    const moved = S.moveTroops(s.id, n, dst);
    if (moved) { UI.toast(`${D.UT[s.t].n}${U.num(moved)}人を${who}${dst ? 'に任せた' : 'に戻した'}`); UI.allotOpen = null; }
    redraw();
  };
  const db = U.$('[data-disband]', ed);
  if (db) db.onclick = () => {
    const n = val(); if (n < 1) { UI.toast('人数を入れてください'); return; }
    if (db.dataset.sure !== '1') { db.dataset.sure = '1'; db.textContent = `${U.num(n)}人を解散する（もう一度押す）`; db.classList.add('warn'); return; }
    const k = S.disband(s.id, n);
    if (k) { UI.toast(`私兵${U.num(k)}人を解散した。領地へ帰った`); S.log(`私兵${U.num(k)}人を解散し、領地へ帰した。`); UI.allotOpen = null; }
    redraw();
  };
};

/* ---------- 領地・国 ---------- */
UI.domSub = 'land';
UI.domTab = (c) => {
  const me = G.me;
  const subs = [['land', '私領']];
  if (me.jur) subs.push(['jur', '管轄']);
  subs.push(['nat', '国勢'], ['world', '諸国']);
  if (!subs.some(s => s[0] === UI.domSub)) UI.domSub = subs[0][0];
  let html = `<div class="tabs">${subs.map(([k, n]) => `<button data-s="${k}" class="${UI.domSub === k ? 'on' : ''}">${n}</button>`).join('')}</div>`;
  html += ({ land: UI.landView, jur: UI.jurView, nat: UI.natView, world: UI.worldView })[UI.domSub]();
  c.innerHTML = html;
  for (const b of U.$$('.tabs button', c)) b.onclick = () => { UI.domSub = b.dataset.s; UI.domTab(c); };
  for (const b of U.$$('[data-a]', c)) b.onclick = () => UI.runAct(b.dataset.a);
};
UI.landView = () => {
  const me = G.me, L = me.land, J = D.JUE[me.jue];
  const taxMul = [0.75, 1, 1.3][L.tax];
  const goldM = Math.round((L.hh * 32 + L.ha * 28) * taxMul * (1 + 0.3 * L.fac.market));
  const foodY = Math.round((L.ha * 12.5 + L.hh * 0.6) * taxMul * (1 + 0.3 * L.fac.farm) * (0.8 * 11 + 3));
  let html = `<div class="card"><div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap"><h3 style="font-size:20px">${U.esc(L.name)}の私領</h3><span class="pill">身分 ${J.n}</span></div>
    <div class="kv" style="margin-top:8px">
      <div><span>土地</span><b>${U.num(Math.round(L.ha * 20))}ユゲラ</b></div><div><span>与えられた村</span><b>${U.num(L.hh)}戸</b></div>
      <div><span>年貢</span><b>${['軽い', '普通', '重い'][L.tax]}</b></div><div><span>治安</span><b>${Math.round(L.order)}</b></div>
      <div><span>民心</span><b>${Math.round(L.loyal)}</b></div><div><span>金/月</span><b>${U.fmt(goldM)}</b></div>
      <div><span>兵糧/年</span><b>${U.fmt(foodY)}石</b></div><div><span>蓄え</span><b>${U.fmt(me.food)}石</b></div>
      <div><span>私兵</span><b>${U.num(U.sum(me.army.sq.filter(s => s.pv), s => s.n))}/${U.num(S.pvCap())}</b></div>
    </div>
    <p class="note" style="margin:8px 0 0">身分が上がるたびに土地が増え、上級騎士からは与えられた村（税を取れる戸）が付く。領主・諸侯ともなれば一つの都市を領する。</p></div>`;
  html += `<div class="sec-h">施設</div><div class="grid">`;
  for (const f of D.FAC_ORDER) {
    const lv = L.fac[f] || 0, b = L.build.find(x => x.f === f);
    html += `<div class="card"><b>${D.FAC[f].n}</b> <span class="pill">Lv${lv}${b ? ` → 建設中${b.left}月` : ''}</span><div class="note">${D.FAC[f].d}</div></div>`;
  }
  html += `</div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">${['kensetsu', 'shihei', 'r_junsatsu', 'nengu'].map(id => { const a = A.list.find(x => x.id === id); const s = A.status(a); return `<button class="btn sm" data-a="${id}" ${s.ok ? '' : 'disabled'}>${a.n}</button>`; }).join('')}</div>`;
  return html;
};
UI.jurView = () => {
  const j = G.me.jur, b = j.base;
  const d = (k) => { const v = Math.round(j[k] - b[k]); return v ? `<small style="color:${v > 0 ? 'var(--good)' : 'var(--bad)'}">${v > 0 ? '+' : ''}${v}</small>` : ''; };
  const row = (k, n) => `<div class="stat-row" style="grid-template-columns:3.5em 1fr 4.5em"><b style="font-size:14px">${n}</b>${UI.bar(j[k], 100, k === 'order' && j[k] < 40 ? 'rd' : '')}<span class="num" style="text-align:right">${Math.round(j[k])} ${d(k)}</span></div>`;
  let html = `<div class="card"><div style="display:flex;justify-content:space-between;gap:10px;align-items:baseline;flex-wrap:wrap"><h3 style="font-size:20px">${U.esc(j.name)}</h3><span class="note">${S.P[j.prov].name}・${U.num(j.hh)}戸 ${j.hh !== b.hh ? `<small style="color:var(--good)">(${j.hh - b.hh >= 0 ? '+' : ''}${U.num(j.hh - b.hh)})</small>` : ''}</span></div>
    ${row('agri', '農業')}${row('comm', '商業')}${row('order', '治安')}${row('loyal', '民心')}${row('cult', '文化')}${row('def', '防備')}
    <p class="note" style="margin:8px 0 0">${j.bandits ? `盗賊 ${j.bandits}団が出没している。` : '盗賊は鳴りを潜めている。'}　差分は今年の考課（九月末）からの伸び。</p></div>`;
  html += `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">${A.list.filter(a => a.cat === 'jur').map(a => { const s = A.status(a); return s.show ? `<button class="btn sm" data-a="${a.id}" ${s.ok ? '' : 'disabled'}>${a.n}</button>` : ''; }).join('')}</div>`;
  return html;
};
UI.natView = () => {
  const o = S.myOff(), c = o.c, cc = G.cty[c];
  const ps = S.ownedProvs(c);
  const ruler = G.off[cc.ruler], josh = G.off[cc.josh];
  const polN = { expand: '攻略', develop: '内政', military: '軍備', order: '治安', balance: '均衡' }[cc.policy] || '均衡';
  let html = `<div class="card"><div style="display:flex;gap:10px;align-items:center">${UI.cseal(c)}<h3 style="font-size:20px">${D.COUNTRIES[c].name}</h3><span class="pill">方針：${polN}</span></div>
    <div class="kv" style="margin-top:8px">
      <div><span>君主</span><b>${U.esc(ruler?.n || '－')}</b></div><div><span>宰相</span><b>${U.esc(josh?.n || '－')}</b></div>
      <div><span>国庫</span><b>${U.fmt(cc.gold)}</b></div><div><span>兵糧</span><b>${U.fmt(cc.food)}石</b></div>
      <div><span>兵</span><b>${U.fmt(S.countryTroops(c))}</b></div><div><span>人口</span><b>${Math.round(S.countryPop(c))}万</b></div>
      <div><span>州</span><b>${ps.length}</b></div><div><span>税率</span><b>${Math.round(cc.tax * 100)}%</b></div>
      <div><span>厭戦</span><b>${UI.wearyLabel(cc.weary)}</b></div>${W.lastStand(c) ? '<div><span>存亡</span><b style="color:#f2a08c">総動員</b></div>' : ''}
    </div>${(cc.weary || 0) >= 0.3 ? '<p class="note" style="margin:6px 0 0">急な拡大で民が疲れている。治安が下がり、新たな遠征に慎重になる。</p>' : ''}</div>`;
  html += `<div class="sec-h">国法</div><div class="chipgrid">${cc.laws.map(l => `<span class="tchip on"><b>${D.LAWS[l].n}</b><small>${D.LAWS[l].d}</small></span>`).join('') || '<p class="empty">施行中の国法はない。</p>'}</div>`;
  html += `<div class="sec-h">大臣</div><div class="kv">${D.MIN_ORDER.map(m => `<div><span>${D.MINISTRIES[m].n}</span><b>${U.esc(G.off[cc.mins[m]]?.n || '－')}</b></div>`).join('')}</div>`;
  html += `<div class="sec-h">州</div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>州</th><th>人口</th><th>兵</th><th>農</th><th>商</th><th>治</th><th>民</th><th>壁</th><th>総督</th></tr></thead><tbody>${ps.map(p => `<tr><td>${S.P[p.id].name}${S.enemyNeighbors(p.id).length ? ' <span class="pill war">前線</span>' : ''}</td><td>${Math.round(p.pop)}万</td><td>${U.fmt(p.troops)}</td><td>${Math.round(p.agri)}</td><td>${Math.round(p.comm)}</td><td>${Math.round(p.order)}</td><td>${Math.round(p.loyal)}</td><td>${Math.round(p.wall)}</td><td>${U.esc(G.off[p.gov]?.n || '－')}</td></tr>`).join('')}</tbody></table></div>`;
  return html;
};
UI.wearyLabel = (w) => { w = w || 0; return w < 0.1 ? 'なし' : w < 0.3 ? '少し' : w < 0.5 ? 'あり' : '強い'; };
UI.worldView = () => {
  const myC = S.myOff().c;
  const off = G.flags.offensive ? W.offensive(G.flags.offensive.a || W.HEGEMON) : null;
  let html = off ? `<p class="note" style="margin:0 0 8px">【${U.esc(off.title || '大攻勢')}】${S.cname(off.a || W.HEGEMON)}が総力を挙げて${S.cname(off.c)}を攻めている（あと${Math.max(0, off.until - G.turn)}か月ほど）。</p>` : '';
  html += `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>国</th><th>州</th><th>人口</th><th>兵</th><th>厭戦</th><th>君主</th><th>我が国と</th></tr></thead><tbody>`;
  for (const c of D.CORDER) {
    const cc = G.cty[c];
    if (!cc.alive) { html += `<tr><td>${D.COUNTRIES[c].name}</td><td colspan="6" class="note">滅亡</td></tr>`; continue; }
    const d = c === myC ? null : S.dip(myC, c);
    html += `<tr><td>${D.COUNTRIES[c].name}</td><td>${S.ownedProvs(c).length}</td><td>${Math.round(S.countryPop(c))}万</td><td>${U.fmt(S.countryTroops(c))}</td><td>${UI.wearyLabel(cc.weary)}${W.lastStand(c) ? ' <span class="pill war">存亡</span>' : ''}</td><td>${U.esc(G.off[cc.ruler]?.n || '－')}</td><td>${d ? `<span class="pill ${d.st === 'war' ? 'war' : d.st === 'ally' ? 'good' : ''}">${{ war: '交戦', peace: '平時', ally: '同盟', truce: '停戦' }[d.st]}</span> ${Math.round(d.rel)}` : '自国'}</td></tr>`;
  }
  html += `</tbody></table></div>`;
  html += `<div class="sec-h">各国の関係</div><div class="tbl-wrap"><table class="tbl"><thead><tr><th></th>${D.CORDER.map(c => `<th>${D.COUNTRIES[c].name}</th>`).join('')}</tr></thead><tbody>`;
  for (const a of D.CORDER) { html += `<tr><th>${D.COUNTRIES[a].name}</th>${D.CORDER.map(b => { if (a === b) return '<td>－</td>'; const d = S.dip(a, b); return `<td style="color:${d.st === 'war' ? '#f2a08c' : d.st === 'ally' ? 'var(--good)' : 'var(--fg2)'}">${{ war: '戦', peace: '平', ally: '盟', truce: '休' }[d.st]}</td>`; }).join('')}</tr>`; }
  html += `</tbody></table></div>`;
  return html;
};

/* ---------- 人物 ---------- */
UI.pplTab = (c) => {
  const me = G.me, o = S.myOff(), rk = D.RANKS[me.rank];
  const stats = Object.keys(UI.statName).map(k => {
    const v = S.stat(o, k), ex = me.exp[k], nd = 40 + o[k] * 0.8;
    return `<div class="stat-row" style="grid-template-columns:3.5em 1fr 2.6em"><b style="font-size:14px">${UI.statName[k]}</b><div>${UI.bar(v, 100, 'br')}<div class="bar" style="height:3px;margin-top:3px"><i style="width:${U.clamp(ex / nd * 100, 0, 100)}%"></i></div></div><span class="num" style="text-align:right">${v}</span></div>`;
  }).join('');
  const boss = G.off[me.boss], ruler = G.off[S.myCty().ruler], gen = G.off[me.gen];
  const rel = (x, role) => x ? `<button class="card rel-card" data-oid="${x.id}" style="display:flex;justify-content:space-between;gap:10px;align-items:center;width:100%;text-align:left;color:inherit">${PORT.tag(x, 52)}<div style="min-width:0;flex:1"><span class="note">${role}</span><br><b>${U.esc(x.n)}</b> <small class="note">${D.RANKS[x.r]?.name || ''}</small><div class="note">武${x.bu} 統${x.tou} 知${x.chi} 政${x.pol} 魅${x.mi}</div></div><div style="text-align:right;min-width:70px"><span class="note num">絆${Math.round(x.bond)}</span>${UI.bar(x.bond + 100, 200)}</div></button>` : '';
  const ep = S.epithet();
  const jn = S.jueNext();
  const jueNote = !jn ? '' : me.merit < jn.need ? `（次の${S.jueName(jn.j, jn.g)}まで功績${U.num(jn.need - me.merit)}）`
    : jn.t > S.tier() ? `（次の${S.jueName(jn.j, jn.g)}は${UI.tierName(jn.t)}以上の官職から）`
    : jn.fame && me.fame < jn.fame ? `（次の${S.jueName(jn.j, jn.g)}は名声${jn.fame}から）`
    : `（来月、${S.jueName(jn.j, jn.g)}に上がる）`;
  let html = `<div class="card prof"><div class="prof-face">${PORT.tag(o, 96, { seal: true })}<div class="banner-prev sm"><div class="pole"></div><div class="flag" style="background:${D.COUNTRIES[o.c].color === '#26262d' ? '#2e2e38' : D.COUNTRIES[o.c].color}">${U.esc(S.mark(o))}</div></div></div>
    <div style="min-width:0"><h2 style="font-size:24px">${U.esc(o.n)}</h2>${ep ? `<div class="epi">「${U.esc(ep)}」</div>` : ''}<div class="note">${S.cname(o.c)}・${S.rankLabel()}${me.min ? '（' + D.MINISTRIES[me.min].n + '）' : ''}・${o.age}歳・${UI.styleName[o.st]}</div>
    <div class="note">身分 ${S.jueLabel()}${jueNote}</div>
    <div class="note">名声 ${Math.round(me.fame)}${me.spouse ? `・妻 ${U.esc(me.spouse.n)}` : ''}${me.inj ? `・負傷（あと${me.inj}か月）` : ''}</div></div></div>
    ${UI.careerCard()}
    ${UI.renownCard()}
    <div class="sec-h">能力</div><div class="card">${stats}<p class="note" style="margin:6px 0 0">細い線は鍛錬の経験。</p></div>
    <div class="sec-h">特性 <small class="note">${o.tr.length}</small></div><div class="chipgrid">${o.tr.map(t => UI.traitChip(t, false, o.tr.length > 10)).join('') || '<p class="empty">なし</p>'}</div>
    <div class="sec-h">装備</div><div class="kv">${['weapon', 'armor', 'horse', 'book', 'treasure'].map(k => `<div><span>${{ weapon: '武器', armor: '鎧', horse: '馬', book: '書', treasure: '宝' }[k]}</span><b>${me.eq[k] ? D.ITEMS[me.eq[k]].n : '－'}</b></div>`).join('')}</div>
    <div class="sec-h">戦歴</div><div class="kv"><div><span>合戦</span><b>${me.rec.battles}</b></div><div><span>勝利</span><b>${me.rec.wins}</b></div><div><span>討った兵</span><b>${U.num(me.rec.kills)}</b></div><div><span>一騎打ち</span><b>${me.rec.duels}</b></div></div>
    ${me.rec.slain.length ? `<p class="note">討ち取った将：${me.rec.slain.slice(-12).map(U.esc).join('、')}</p>` : ''}
    <div class="sec-h">人物</div><div class="list">${rel(boss, '上官')}${gen && gen !== boss && gen.id !== o.id ? rel(gen, '所属軍の将') : ''}${ruler && ruler !== boss && !ruler.player ? rel(ruler, '君主') : ''}</div>
    ${UI.factionCard()}
    ${UI.friendsCard()}
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="btn sm pri" id="p-ctr">特性工房（自分で作る）</button><button class="btn sm" id="p-dir">人物録</button><button class="btn sm" id="p-items">持ち物</button></div>`;
  c.innerHTML = html;
  U.$('#p-dir').onclick = () => UI.directory();
  for (const b of U.$$('.rel-card', c)) b.onclick = () => UI.officerCard(G.off[b.dataset.oid]);
  const pg = U.$('#p-graves', c); if (pg) pg.onclick = () => UI.graves();
  const pf = U.$('#p-fac', c); if (pf) pf.onclick = async () => { await UI.runAct('habatsu'); UI.refresh(); };
  const self = U.$('.prof-face .por', c); if (self) self.onclick = () => UI.officerCard(o);
  U.$('#p-items').onclick = () => UI.items();
  U.$('#p-ctr').onclick = async () => { await UI.ctrWorkshop({ game: true }); UI.refresh(); };
  U.$('#p-ladder').onclick = () => UI.ladder();
  U.$('#p-jue').onclick = () => UI.jueList();
  for (const b of U.$$('[data-epi]', c)) b.onclick = () => { G.me.epiSel = +b.dataset.epi; UI.toast(`「${G.me.epi[G.me.epiSel].n}」を名乗る`); UI.refresh(); };
};
// 派閥の札
UI.factionCard = () => {
  if (typeof PPL === 'undefined' || S.isTop()) return '';
  const o = S.myOff(); const fs = PPL.factions(o.c); const my = PPL.myFac();
  const rows = Object.values(fs).map(f => `<div class="fac-row ${f.k === my ? 'me' : ''}"><div class="fac-h"><b>${f.n}</b>${f.k === my ? '<small class="note">（自分）</small>' : ''}<small class="note" style="margin-left:auto">${f.leader ? '筆頭 ' + U.esc(f.leader.n) : '－'}・${f.ids.length}人</small></div>${UI.bar(Math.round(f.share * 100), 100, f.k === my ? 'br' : '')}</div>`).join('');
  const rv = PPL.rivalFac();
  return `<div class="sec-h">派閥 <small class="note">${rv ? '対立：' + rv.n : ''}</small></div><div class="card">${rows}<div style="display:flex;gap:8px;margin-top:8px"><button class="btn sm" id="p-fac">派閥の詳細・鞍替え</button></div><p class="note" style="margin:6px 0 0">派閥が強いと昇進が通りやすい。対立派閥からは横槍や讒言が来る。弾劾で相手を退けられる。</p></div>`;
};
// 恩義と怨み（自分を中心に）
UI.friendsCard = () => {
  if (typeof PPL === 'undefined') return '';
  const o = S.myOff();
  const fr = PPL.friendsOf(o.id, 15).slice(0, 6), fo = PPL.foesOf(o.id, 15).slice(0, 6);
  const graves = (G.graves || []).filter(g => g.sub || g.bond >= 20 || g.hist);
  if (!fr.length && !fo.length && !graves.length) return '';
  const row = (y, v) => `<button class="card rel-card" data-oid="${y.id}" style="display:flex;gap:10px;align-items:center;width:100%;text-align:left;color:inherit">${PORT.tag(y, 44)}<div style="min-width:0;flex:1"><b>${U.esc(y.n)}</b> <small class="note">${S.cname(y.c)}・${D.RANKS[y.r]?.name || ''}</small><div class="note">${PPL.relLabel(v)}（${Math.round(v)}）${y.c === o.c && v >= 40 ? '・合戦に駆けつけることがある' : ''}</div></div></button>`;
  return `<div class="sec-h">恩と怨 <small class="note">あなたへの想い</small></div><div class="list">${fr.map(y => row(y, PPL.rel(y.id, o.id))).join('')}${fo.map(y => row(y, PPL.rel(y.id, o.id))).join('')}${!fr.length && !fo.length ? '<p class="empty">まだ深い縁はない。</p>' : ''}</div>${graves.length ? `<div style="margin-top:8px"><button class="btn sm" id="p-graves">亡き者たち（${graves.length}）</button></div>` : ''}`;
};
// 墓：亡くなった部下・縁のあった者・名のある将
UI.graves = () => UI.modal((box, close) => {
  const gs = (G.graves || []).slice().reverse();
  UI.head(box, { title: '亡き者たち', seal: '墓' });
  const list = gs.filter(g => g.sub || g.bond >= 20 || g.hist || g.tier >= 7).slice(0, 60);
  box.insertAdjacentHTML('beforeend', `<div class="list">${list.map(g => `<div class="card" style="display:flex;gap:10px;align-items:center">${PORT.tag({ id: g.id, n: g.n, sei: g.sei, c: g.c, r: g.r, age: g.age }, 44, { dark: true })}<div style="min-width:0;flex:1"><b style="color:inherit">${U.esc(g.n)}</b> <small class="note">${S.cname(g.c)}・${D.RANKS[g.r]?.name || ''}${g.sub ? '・部下' : ''}</small><div class="note">${g.y < 0 ? '前' + (-g.y) : g.y}年${g.m}月　${U.esc(g.why)}　享年${g.age}</div></div></div>`).join('') || '<p class="empty">まだ誰も失っていない。</p>'}</div>`);
  const b = U.h('button', { class: 'btn seal wide', style: { marginTop: '14px' } }, '閉じる'); b.onclick = () => close(); box.append(b);
}, { stack: true });
// 格（tier）を代表の官職で言う
UI.tierName = (t) => t >= 9 ? '宰相' : [D.RANK_ORDER_MIL[t - 1], D.RANK_ORDER_CIV[t - 1]].filter(Boolean).map(r => D.RANKS[r].name).join('・');
// 出世：今の官職・等級と、次の一段の条件
UI.careerCard = () => {
  const me = G.me, rk = D.RANKS[me.rank], st = S.nextStep();
  let h = `<div class="card" style="margin-top:10px"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><b>功績 ${U.num(me.merit)}</b><span class="note">${S.rankLabel()}・俸禄 金${U.fmt(S.pay())}／月</span></div>`;
  if (st) {
    const lo = S.gradeNeed(me.rank, me.grade || 0);
    const wait = S.stepWait(st);
    const conds = [
      { label: `功績${U.num(st.need)}`, ok: me.merit >= st.need, note: me.merit >= st.need ? '' : `あと${U.num(st.need - me.merit)}` },
      { label: `在任${st.mo}か月`, ok: wait === 0, note: wait ? `あと${wait}か月` : '' },
      ...st.req.map(x => ({ label: x.label, ok: x.ok, note: x.ok ? '' : `今は${x.have}` })),
    ];
    h += `<div class="note" style="margin-top:4px">次の${st.kind === 'rank' ? '昇進' : '昇格'}：<b style="color:var(--fg)">${S.rankName(st.r, st.kind === 'rank' && D.RANKS[st.r].track === 'top' ? null : st.g)}</b></div>`;
    h += UI.bar(Math.max(0, me.merit - lo), Math.max(1, st.need - lo), 'br');
    h += `<ul class="conds">${conds.map(x => `<li class="${x.ok ? 'ok' : ''}"><i aria-hidden="true">${x.ok ? '✓' : '・'}</i>${x.label}${x.note ? `<small>（${x.note}）</small>` : ''}</li>`).join('')}</ul>`;
  } else h += `<p class="note" style="margin:6px 0 0">${rk.track === 'top' ? '位人臣を極めた。' : 'この道の頂点に立った。'}</p>`;
  if (rk.tmax) h += `<p class="note" style="margin:6px 0 0">率いる兵の上限 ${U.fmt(S.armyCap())}（功績に応じて最大${U.fmt(rk.tmax)}）</p>`;
  h += `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button class="btn sm" id="p-ladder">出世の道</button><button class="btn sm" id="p-jue">身分の一覧</button></div></div>`;
  return h;
};
// 武名と異名
UI.renownCard = () => {
  const me = G.me, lv = S.renownLv(), cur = D.RENOWN[lv], nx = D.RENOWN[lv + 1], v = Math.round(me.renown || 0);
  const E = me.epi || [], ep = S.epithet();
  let h = `<div class="sec-h">武名</div><div class="card"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><b>${cur.n}</b><span class="note num">武名 ${U.num(v)}${nx ? ` ／ 次の「${nx.n}」まで ${U.num(nx.m - v)}` : ''}</span></div>`;
  if (nx) h += UI.bar(v - cur.m, nx.m - cur.m, 'br');
  h += `<p class="note" style="margin:6px 0 0">${lv ? `合戦では味方の士気+${lv}・敵の士気−${Math.round(lv * 1.5)}。主人公の隊は近くの敵を威圧する。人材も集まりやすい。${lv >= 3 ? '主人公が守る州には、敵が攻めてくるのをためらう。' : ''}` : '大きな戦で活躍する（敵将を討つ・一騎打ちに勝つ・寡兵で勝つなど）と武名が上がり、名が地中海に知れ渡っていく。'}</p>`;
  if (E.length) h += `<div class="chipgrid" style="margin-top:8px">${E.map((x, i) => `<button class="tchip ${ep === x.n ? 'on' : ''}" data-epi="${i}" aria-pressed="${ep === x.n}"><b>「${U.esc(x.n)}」</b><small>${U.esc(x.d)}　${U.esc(x.why || '')}</small></button>`).join('')}</div><p class="note" style="margin:6px 0 0">異名を押すと、それを名乗る。</p>`;
  else h += `<p class="note" style="margin:6px 0 0">異名はまだない。</p>`;
  return h + '</div>';
};
// 出世の道（官職の一覧）
UI.ladder = () => UI.modal((box, close) => {
  const me = G.me, rk = D.RANKS[me.rank];
  const order = rk.track === 'top' ? ['civ', 'staff', 'mil'] : [rk.track, ...['mil', 'staff', 'civ'].filter(t => t !== rk.track)];
  let tab = order[0];
  UI.head(box, { title: '出世の道', body: '官職は三等→二等→一等と進み、一等から次の官職へ上がる。一段ごとに功績と在任期間が要り、上の官職には名声や戦歴も要る。' });
  const seg = U.h('div', { class: 'seg', style: { marginTop: '10px' } });
  const list = U.h('div', { class: 'ladder' });
  const render = () => {
    seg.innerHTML = order.map(t => `<button data-t="${t}" class="${t === tab ? 'on' : ''}">${D.LADDER_NAME[t]}</button>`).join('');
    for (const b of seg.querySelectorAll('button')) b.onclick = () => { tab = b.dataset.t; render(); };
    const L = D.LADDER[tab].slice();
    if (tab !== 'mil') L.push('josh');
    const curIdx = L.indexOf(me.rank);
    list.innerHTML = L.map((r, i) => {
      const x = D.RANKS[r];
      const cls = r === me.rank ? 'cur' : (curIdx >= 0 && i < curIdx ? 'done' : '');
      const req = x.req ? S.reqList(r).map(q => q.label).join('・') : '';
      const grades = x.track !== 'top' && !x.nograde ? `<span class="gr">${D.GRADES.map((g, gi) => `<span class="${r === me.rank && (me.grade || 0) === gi ? 'on' : ''}">${g} ${U.num(S.gradeNeed(r, gi))}</span>`).join('')}</span>` : '';
      return `<div class="lrow ${cls}"><b>${x.name}</b><span class="num">功績${U.num(x.m)}</span><small>兵${U.fmt(x.troops)}${x.tmax ? '〜' + U.fmt(x.tmax) : ''}・俸禄 金${U.fmt(x.pay)}・一段${S.stepMonths(r)}か月${req ? '・' + req : ''}</small>${grades}</div>`;
    }).reverse().join('');
  };
  render();
  const b = U.h('button', { class: 'btn seal wide', style: { marginTop: '14px' } }, '閉じる');
  b.onclick = () => close(true);
  box.append(seg, list, b);
});
// 身分の一覧
UI.jueList = () => UI.modal((box, close) => {
  const me = G.me;
  UI.head(box, { title: '身分', body: '功績で上がる。一つの身分も下・中・上の三段に分かれ、一か月に一段ずつしか上がらない。高い身分には、それに見合う官職が要る。' });
  const list = U.h('div', { class: 'ladder' });
  list.innerHTML = D.JUE.slice(1).map((J, k) => {
    const j = k + 1, cls = j === me.jue ? 'cur' : j < me.jue ? 'done' : '';
    return `<div class="lrow ${cls}"><b>${J.n}</b><span class="num">功績${U.num(J.m)}</span><small>土地${U.num(Math.round(J.ha * 20))}ユゲラ${J.hh ? '・村' + U.num(J.hh) + '戸' : ''}${J.t ? `・${UI.tierName(J.t)}以上` : ''}${J.fame ? `・名声${J.fame}` : ''}</small>${j === me.jue ? `<span class="gr">${D.JUE_SUB.map((g, gi) => `<span class="${(me.jueG || 0) === gi ? 'on' : ''}">${g} ${U.num(S.jueNeed(j, gi))}</span>`).join('')}</span>` : ''}</div>`;
  }).reverse().join('');
  const b = U.h('button', { class: 'btn seal wide', style: { marginTop: '14px' } }, '閉じる');
  b.onclick = () => close(true);
  box.append(list, b);
});
UI.directory = () => UI.modal((box, close) => {
  UI.head(box, { title: '人物録' });
  const tabs = U.h('div', { class: 'tabs' });
  const body = U.h('div', { class: 'list' });
  const show = (c) => {
    for (const b of tabs.children) b.classList.toggle('on', b.dataset.c === c);
    const offs = S.officersOf(c).filter(o => !o.player).sort((a, b) => (D.RANKS[b.r]?.tier || 0) - (D.RANKS[a.r]?.tier || 0) || b.tou - a.tou).slice(0, 40);
    body.innerHTML = offs.map(o => `<button class="dir-row" data-oid="${o.id}">${PORT.tag(o, 46)}<div style="min-width:0"><b>${U.esc(o.n)}</b> <small>${D.RANKS[o.r]?.name || ''}${o.min ? '・' + D.MINISTRIES[o.min].n : ''}${o.hist ? '　史' : ''}</small><br><small>武${o.bu} 統${o.tou} 知${o.chi} 政${o.pol} 魅${o.mi}　${o.age}歳${o.tr.length ? '　' + o.tr.map(t => D.TRAITS[t].n).join('・') : ''}</small></div></button>`).join('');
    PORT.fill(body);
    for (const b of U.$$('[data-oid]', body)) b.onclick = () => UI.officerCard(G.off[b.dataset.oid]);
  };
  for (const c of D.CORDER.filter(c => G.cty[c].alive)) { const b = U.h('button', { 'data-c': c, class: 'btn sm' }, D.COUNTRIES[c].name); b.onclick = () => show(c); tabs.append(b); }
  box.append(tabs, body);
  const cb = U.h('button', { class: 'btn seal wide', style: { marginTop: '12px' } }, '閉じる'); cb.onclick = () => close(); box.append(cb);
  show(S.myOff().c);
});
// 人物の札（大きな肖像・能力・特性・来歴）
UI.officerCard = (o) => o && UI.modal((box, close) => {
  box.classList.add('ocard');
  const me = G.me, isMe = o.id === me.oid;
  const rk = D.RANKS[o.r];
  const stats = Object.keys(UI.statName).map(k => `<div class="stat-row" style="grid-template-columns:3.5em 1fr 2.6em"><b style="font-size:14px">${UI.statName[k]}</b>${UI.bar(S.stat(o, k), 100, 'br')}<span class="num" style="text-align:right">${S.stat(o, k)}</span></div>`).join('');
  const uniq = (o.tr || []).map(t => D.TRAITS[t]).filter(T => T && (T.cat === 'uniq' || T.uniq));
  const bond = o.bond != null && !isMe ? `<span class="pill ${o.bond >= 30 ? 'good' : o.bond <= -20 ? 'bad' : ''}">絆 ${Math.round(o.bond)}${typeof PPL !== 'undefined' && PPL.relLabel(o.bond) ? '・' + PPL.relLabel(o.bond) : ''}</span>` : '';
  const rel = o.id === me.boss ? '上官' : (me.army && me.army.subs.includes(o.id)) ? '部下' : o.id === S.myCty().ruler ? '君主' : '';
  const hasP = typeof PPL !== 'undefined';
  const pers = hasP && (D.RANKS[o.r]?.track || 'mil') !== 'civ' ? PPL.PERS[PPL.pers(o)] : null;
  const fac = hasP ? PPL.facOf(o) : null;
  const rels = hasP ? PPL.relsOf(o.id).slice(0, 6) : [];
  const extra = `${o.inj ? `<span class="pill bad">負傷（あと${o.inj}か月）</span>` : ''}${fac && PPL.FAC[fac] ? `<span class="pill">${PPL.FAC[fac].n}</span>` : ''}${o.xp != null && !isMe && me.army.subs.includes(o.id) ? `<span class="pill">修練 ${Math.round(o.xp)}/24</span>` : ''}`;
  const persHtml = pers ? `<div class="oc-bio"><p><b>用兵：${U.esc(pers.n)}</b>　${U.esc(pers.d)}</p></div>` : '';
  const relHtml = rels.length ? `<div class="sec-h sm" style="color:#6b5428">恩と怨</div><div class="oc-rels">${rels.map(r => { const y = G.off[r.id]; return `<button class="oc-rel ${r.v > 0 ? 'good' : 'bad'}" data-oid="${r.id}">${PORT.tag(y, 36)}<span><b>${U.esc(y.n)}</b><small>${PPL.relLabel(r.v) || (r.v > 0 ? '好意' : '不信')}（${Math.round(r.v)}）</small></span></button>`; }).join('')}</div>` : '';
  box.innerHTML = `<div class="oc-h"><div class="oc-por"></div><div class="oc-id"><h3>${U.esc(o.n)}</h3><div class="note">${S.cname(o.c)}・${rk ? rk.name : ''}${o.min && D.MINISTRIES[o.min] ? '（' + D.MINISTRIES[o.min].n + '）' : ''}・${o.age}歳・${UI.styleName[o.st] || ''}${o.hist ? '　<span class="pill">史実の人物</span>' : ''}${rel ? `　<span class="pill good">${rel}</span>` : ''} ${bond}</div>${o.loc && S.P[o.loc] ? `<div class="note">所在：${S.P[o.loc].name}</div>` : ''}</div></div>
    <div class="oc-stats">${stats}</div>
    ${extra ? `<div class="oc-pills">${extra}</div>` : ''}
    ${persHtml}
    ${uniq.length ? `<div class="oc-bio">${uniq.map(T => `<p><b>${U.esc(T.n)}</b>　${U.esc(T.d)}</p>`).join('')}</div>` : ''}
    <div class="sec-h sm" style="color:#6b5428">特性</div><div class="chipgrid">${(o.tr || []).map(t => UI.traitChip(t, false, (o.tr || []).length > 8)).join('') || '<p class="empty">なし</p>'}</div>
    ${(o.tac || []).length ? `<div class="sec-h sm" style="color:#6b5428">戦術</div><p class="note" style="margin:0;color:#5b4b31">${o.tac.map(t => D.TACTICS[t] ? D.TACTICS[t].n : '').filter(Boolean).join('・')}</p>` : ''}`;
  box.insertAdjacentHTML('beforeend', relHtml);
  for (const bb of U.$$('.oc-rel', box)) bb.onclick = () => { const y = G.off[bb.dataset.oid]; if (y) UI.officerCard(y); };
  U.$('.oc-por', box).append(PORT.canvas(o, 128, { seal: true }));
  const b = U.h('button', { class: 'btn seal wide', style: { marginTop: '14px' } }, '閉じる');
  b.onclick = () => close(true);
  box.append(b);
}, { stack: true });
UI.items = async () => {
  const me = G.me;
  const own = [...new Set(me.items)];
  if (!own.length) return UI.info({ title: '持ち物', body: '何も持っていない。市場で買える。' });
  const pick = await UI.choose({ title: '持ち物', body: '選ぶと装備する。', choices: own.map(id => ({ v: id, label: D.ITEMS[id].n + (Object.values(me.eq).includes(id) ? '（装備中）' : ''), sub: `${D.ITEMS[id].d}　${UI.itemEff(id)}` })).concat([{ v: null, label: '閉じる' }]) });
  if (pick) { me.eq[D.ITEMS[pick].k] = pick; UI.toast(`${D.ITEMS[pick].n}を装備した`); UI.refresh(); }
};

/* ---------- 市場・編成・人事・建設 ---------- */
UI.shop = async () => {
  const me = G.me;
  const stock = D.SHOP_BASE.filter(k => !me.items.includes(k));
  const fp = A.FOOD_PRICE;
  const pick = await UI.choose({ title: `市場（金 ${U.fmt(me.gold)}・兵糧 ${U.fmt(me.food)}袋）`, choices: [{ v: '_food', label: `兵糧を買う　1袋 金${fp}`, sub: '私兵の食い扶持や民への施しに使う', disabled: me.gold < fp }].concat(stock.map(k => ({ v: k, label: `${D.ITEMS[k].n}　金${U.fmt(D.ITEMS[k].price)}`, sub: D.ITEMS[k].d + '　' + UI.itemEff(k), disabled: me.gold < D.ITEMS[k].price }))).concat([{ v: null, label: '店を出る' }]) });
  if (!pick) return null;
  if (pick === '_food') {
    const maxN = Math.floor(me.gold / fp);
    const pvN = U.sum(me.army.sq.filter(s => s.pv), s => s.n);
    const want = U.clamp(Math.round(pvN * 2.5 * 6 / 100) * 100, 100, maxN);
    const n = await HOOK.number({ title: '兵糧を何袋買う？', body: `1袋 金${fp}。いまの蓄え ${U.fmt(me.food)}袋${pvN ? `（私兵${U.num(pvN)}人で月に${U.fmt(pvN * 2.5)}袋ほど減る）` : ''}`, min: 1, max: maxN, value: want, unit: '袋', info: (k) => `金${U.fmt(k * fp)}` });
    if (!n) return null;
    const k = Math.min(maxN, Math.max(1, Math.floor(n)));
    me.gold -= k * fp; me.food += k;
    return `兵糧${U.num(k)}石を買った（金-${U.fmt(k * fp)}）。`;
  }
  me.gold -= D.ITEMS[pick].price; me.items.push(pick); me.eq[D.ITEMS[pick].k] = pick;
  return `「${D.ITEMS[pick].n}」を買って身につけた。`;
};
UI.appoint = async () => {
  const o = S.myOff(), c = o.c, cc = G.cty[c];
  const k = await UI.choose({ title: '人事', choices: [
    { v: 'min', label: '大臣を任命する' },
    { v: 'gov', label: '総督を任命する' },
    { v: 'gen', label: '将軍に取り立てる', sub: '五千将から将軍へ' },
    { v: 'josh', label: '宰相を任命する', disabled: G.me.rank !== 'kuns' },
    { v: null, label: 'やめる' },
  ] });
  if (!k) return null;
  const pool = S.officersOf(c, x => !x.player && x.id !== cc.ruler).sort((a, b) => (b.pol + b.chi) - (a.pol + a.chi));
  if (k === 'min') {
    const m = await UI.choose({ title: 'どの職？', choices: D.MIN_ORDER.map(m => ({ v: m, label: D.MINISTRIES[m].n, sub: `現職：${G.off[cc.mins[m]]?.n || '空席'}`, disabled: cc.mins[m] === o.id })) });
    if (!m) return null;
    const x = await UI.choose({ title: `${D.MINISTRIES[m].n}に任ずる者`, choices: pool.filter(x => x.id !== cc.josh).slice(0, 14).map(x => ({ v: x.id, label: x.n, sub: `政${x.pol} 知${x.chi}　${D.RANKS[x.r]?.name || ''}` })) });
    if (!x) return null;
    const old = G.off[cc.mins[m]]; if (old && !old.player) { old.r = 'kenr'; old.min = null; }
    const nx = G.off[x]; nx.r = 'daij'; nx.min = m; cc.mins[m] = x; for (const mm in cc.mins) if (mm !== m && cc.mins[mm] === x) cc.mins[mm] = null;
    return `${nx.n}を${D.MINISTRIES[m].n}に任じた。`;
  }
  if (k === 'gov') {
    const pid = await A.pickProv('どの州？', S.ownedProvs(c).filter(p => p.id !== W.capital(c)), p => `総督：${G.off[p.gov]?.n || '－'}`);
    if (!pid) return null;
    const x = await UI.choose({ title: '総督に任ずる者', choices: pool.slice(0, 14).map(x => ({ v: x.id, label: x.n, sub: `政${x.pol} 統${x.tou}` })) });
    if (!x) return null;
    G.prov[pid].gov = x; G.off[x].loc = pid; if (G.off[x].r !== 'daij') G.off[x].r = 'guns';
    return `${G.off[x].n}を${S.P[pid].name}の総督にした。`;
  }
  if (k === 'gen') {
    const cands = S.officersOf(c, x => x.r === 'goz' || x.r === 'sanz').sort((a, b) => b.tou - a.tou).slice(0, 12);
    const x = await UI.choose({ title: '将軍に取り立てる者', choices: cands.map(x => ({ v: x.id, label: x.n, sub: `統${x.tou} 武${x.bu} 知${x.chi}` })).concat([{ v: null, label: 'やめる' }]) });
    if (!x) return null;
    G.off[x].r = 'shog'; G.off[x].loy = Math.min(100, G.off[x].loy + 15);
    return `${G.off[x].n}を将軍に取り立てた。`;
  }
  if (k === 'josh') {
    const x = await UI.choose({ title: '宰相に任ずる者', choices: pool.slice(0, 10).map(x => ({ v: x.id, label: x.n, sub: `政${x.pol} 知${x.chi}` })) });
    if (!x) return null;
    const old = G.off[cc.josh]; if (old && !old.player) old.r = 'daij';
    G.off[x].r = 'josh'; cc.josh = x;
    return `${G.off[x].n}を宰相に任じた。`;
  }
  return null;
};
UI.build = async () => {
  const me = G.me, L = me.land;
  const ch = D.FAC_ORDER.map(f => {
    const lv = L.fac[f] || 0;
    const cost = Math.round(D.FAC[f].base * Math.pow(2.1, lv));
    const busy = L.build.some(b => b.f === f);
    const maxLv = Math.min(5, 1 + Math.floor(me.jue / 3));
    return { v: f, label: `${D.FAC[f].n} Lv${lv}→${lv + 1}`, sub: `${D.FAC[f].d}　金${U.fmt(cost)}・${lv + 1}か月${busy ? '（建設中）' : ''}${lv >= maxLv ? `（身分が上がると拡張できる）` : ''}`, disabled: busy || lv >= 5 || lv >= maxLv || me.gold < cost || L.build.length >= 2 };
  });
  ch.push({ v: null, label: 'やめる' });
  const f = await UI.choose({ title: `施設建設（金 ${U.fmt(me.gold)}）`, body: '同時に建てられるのは二つまで。', choices: ch });
  if (!f) return null;
  const lv = L.fac[f] || 0, cost = Math.round(D.FAC[f].base * Math.pow(2.1, lv));
  me.gold -= cost; L.build.push({ f, left: lv + 1 });
  return `${D.FAC[f].n}の建設を始めた（${lv + 1}か月）。`;
};

/* ---------- 終幕 ---------- */
UI.ending = async () => {
  const o = S.myOff(), me = G.me, ov = G.over;
  const title = ov.kind === 'unify' ? '地中海統一' : ov.kind === 'death' ? '討死' : ov.kind === 'age' ? '天寿' : '終幕';
  const lines = [
    ov.text,
    `${S.dateStr()}　${o.n}（${o.age}歳）`,
    `最終官職：${S.rankLabel()}　身分：${S.jueLabel()}${S.epithet() ? `　異名「${S.epithet()}」` : ''}　武名：${D.RENOWN[S.renownLv()].n}`,
    `合戦 ${me.rec.battles}（勝${me.rec.wins}）・討った兵 ${U.num(me.rec.kills)}・一騎打ち ${me.rec.duels}`,
    me.rec.slain.length ? `討ち取った将：${me.rec.slain.slice(-8).join('、')}` : '',
    ov.kind === 'unify' ? (me.rank === 'kuns' ? '地中海のすべての岸が一つの国に従った。' : `${D.RANKS[me.rank].name}として統一の礎を築いた名は、長く語り継がれた。`) : '',
  ].filter(Boolean).join('\n');
  if (typeof ACH !== 'undefined') { try { await ACH.check(true); } catch (e) {} }
  const k = await UI.choose({ title, seal: ov.kind === 'unify' ? '統一' : '終', body: lines, choices: [{ v: 'chron', label: '年代記を読む' }, { v: 'title', label: 'タイトルへ' }, { v: 'load', label: 'セーブから再開する' }] });
  if (k === 'load') return UI.loadMenu(true);
  if (k === 'chron') { await UI.chronicle(); return UI.ending(); }
  UI.title();
};
