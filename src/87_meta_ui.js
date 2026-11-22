/* =========================================================
   地中海覇道 — meta UI（年代記・実績・手引き）
   ========================================================= */
// 年代記と実績
UI.chronicle = (tab) => UI.modal((box, close) => {
  box.classList.add('tall', 'chron');
  const o = S.myOff(), me = G.me;
  UI.head(box, { title: '年代記', seal: '史' });
  const head = U.h('div', { class: 'ch-head' });
  head.innerHTML = `<div class="ch-por"></div><div><b>${U.esc(o.n)}</b>${S.epithet() ? `<div class="epi">「${U.esc(S.epithet())}」</div>` : ''}<div class="note">${S.cname(o.c)}・${S.rankLabel()}・${o.age}歳　${G.startYear != null ? `前${-G.startYear}年` : ''}より${Math.max(0, G.year - (G.startYear ?? D.START_YEAR))}年</div><div class="note">合戦 ${me.rec.battles}（勝${me.rec.wins}）・討った兵 ${U.num(me.rec.kills)}・一騎打ち ${me.rec.duels}・落とした城 ${me.rec.cities || 0}</div></div>`;
  U.$('.ch-por', head).append(PORT.canvas(o, 72, { seal: true }));
  box.append(head);
  const tabs = U.h('div', { class: 'tabs' });
  const body = U.h('div', { class: 'ch-body' });
  const show = (k) => {
    for (const b of tabs.children) b.classList.toggle('on', b.dataset.k === k);
    if (k === 'chron') {
      const years = ACH.chronicle();
      body.innerHTML = years.length ? years.map(y => `<div class="ch-year"><div class="ch-y">${y.y < 0 ? '前' + (-y.y) + '年' : y.y + '年'}</div><div class="ch-items">${y.items.map(it => `<div class="ch-it ${it.k}"><span>${U.esc((it.d || '').replace(/^前\d+年\s*/, ''))}</span><p>${U.esc(it.s)}</p></div>`).join('')}</div></div>`).join('') : '<p class="empty">まだ何も記されていない。</p>';
    } else {
      const got = G.ach || {}, saved = ACH.saved();
      const n = D.ACH.filter(a => got[a.id]).length;
      body.innerHTML = `<p class="note" style="margin:0 0 8px">この物語で ${n} / ${D.ACH.length}　（これまでに ${Object.keys(saved).length} 種を解除）</p><div class="ach-grid">${D.ACH.map(a => { const g = got[a.id]; const ever = !!saved[a.id]; return `<div class="ach ${g ? 'on' : ever ? 'ever' : ''}"><b>${U.esc(a.n)}</b><small>${g || ever ? U.esc(a.d) : '？？？'}</small>${a.title ? `<small class="ach-t">称号「${U.esc(a.title.replace('{m}', o.mei || o.n).replace('{c}', S.cname(o.c)))}」</small>` : ''}${g ? `<small class="note">${U.esc(g.d || '')}</small>` : ''}</div>`; }).join('')}</div>`;
    }
  };
  for (const [k, n] of [['chron', '年代記'], ['ach', '実績']]) { const b = U.h('button', { 'data-k': k, class: 'btn sm' }, n); b.onclick = () => show(k); tabs.append(b); }
  box.append(tabs, body);
  const c = U.h('button', { class: 'btn seal wide', style: { marginTop: '12px' } }, '閉じる'); c.onclick = () => close(); box.append(c);
  show(tab || 'chron');
}, { stack: true });

// 今月の手引き（はじめの数か月）
UI.hintCard = () => {
  if (typeof ACH === 'undefined' || !G || G.flags.noHints) return '';
  const h = ACH.hint(); if (!h) return '';
  return `<div class="card hint" id="hint-card"><b>今月の手引き</b><p>${U.esc(h)}</p><div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn sm" id="hint-off">もう表示しない</button></div></div>`;
};
UI.bindHint = (root) => { const b = U.$('#hint-off', root); if (b) b.onclick = () => { G.flags.noHints = true; UI.refresh(); }; };

// はじめての手引き（三枚）。端末ごとに一度
UI.INTRO_KEY = 'chichukai.intro';
UI.introSeen = () => { if (typeof navigator !== 'undefined' && navigator.webdriver && !UI._introForce) return true; try { return !!localStorage.getItem(UI.INTRO_KEY); } catch (e) { return true; } };
UI.intro = async () => {
  const pages = [
    { t: '物語の進め方', b: '毎月、「任務状」の数だけ行動できる。「令」タブで行動を選び、使い切ったら右下の「月を進める」。\n各国が動き、戦や事件が起き、三か月ごとに評定で任務を受ける。' },
    { t: '功績と出世', b: '合戦・任務・内政で功績が溜まると昇進する。官職は三等→二等→一等と進み、身分も上がる。\n大きな戦で活躍すれば武名が上がり、異名で呼ばれる。実績を解くと称号も得られる。' },
    { t: '合戦と人の縁', b: '合戦は、開戦前の「布陣のターン」で陣を組んでから始まる。部隊をタップして動かし、敵将が近づけば一騎打ち。立体の戦場も見られる。\n将たちには用兵の個性と恩怨があり、国には派閥がある。部下を育て、友を得て、地中海の覇者へ。' },
  ];
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    const k = await UI.choose({ title: p.t, seal: '手引き', body: p.b + `\n\n（${i + 1} / ${pages.length}）`, choices: [{ v: 1, label: i === pages.length - 1 ? '始める' : '次へ' }, { v: 0, label: '手引きを飛ばす' }] });
    if (!k) break;
  }
  try { localStorage.setItem(UI.INTRO_KEY, '1'); } catch (e) {}
};

/* ---------- 戦況図（合戦の再生） ---------- */
UI.replay = (bt) => UI.modal((box, close) => {
  box.classList.add('replay');
  UI.head(box, { title: '戦況図', seal: '図' });
  const rec = bt.rec || [];
  const W = Math.min(360, Math.round(window.innerWidth - 56)), H = Math.round(W * bt.H / bt.W);
  const cv = U.h('canvas', { class: 'rp-cv', width: W * 2, height: H * 2, style: { width: W + 'px', height: Math.min(H, Math.round(window.innerHeight * 0.5)) + 'px' } });
  const g = cv.getContext('2d'); g.scale(2, 2);
  // 地形
  const terr = document.createElement('canvas'); terr.width = bt.cols; terr.height = bt.rows;
  const tc = terr.getContext('2d'); const T = bt._terrSnap || bt.terr;
  for (let i = 0; i < bt.cols * bt.rows; i++) { tc.fillStyle = D.TILE[T[i]].c; tc.fillRect(i % bt.cols, Math.floor(i / bt.cols), 1, 1); }
  const info = U.h('div', { class: 'rp-info' });
  const logEl = U.h('div', { class: 'rp-log' });
  const range = U.h('input', { type: 'range', min: 0, max: rec.length - 1, value: 0, step: 1, class: 'rp-range', 'aria-label': '時' });
  const play = U.h('button', { class: 'btn sm' }, '▶ 再生');
  let i = 0, timer = 0;
  const names = bt.units.map(u => u.ld ? u.ld.n : D.UT[u.t].n);
  const draw = () => {
    const f = rec[i]; if (!f) return;
    g.imageSmoothingEnabled = false; g.drawImage(terr, 0, 0, W, H); g.imageSmoothingEnabled = true;
    // 城
    if (bt.city) { g.strokeStyle = 'rgba(60,40,20,.8)'; g.lineWidth = 2; g.strokeRect(bt.city.x0 / bt.W * W, bt.city.y0 / bt.H * H, (bt.city.x1 - bt.city.x0) / bt.W * W, (bt.city.y1 - bt.city.y0) / bt.H * H); }
    // 軌跡（直前の数コマ）
    for (let k = Math.max(0, i - 6); k < i; k++) { const a = rec[k], al = 0.08 + 0.1 * (k - (i - 6)) / 6; for (let j = 0; j < a.u.length; j++) { const p = a.u[j]; if (!p) continue; const u = bt.units[j]; g.fillStyle = u.side === 0 ? `rgba(233,225,204,${al})` : `rgba(212,85,58,${al})`; g.beginPath(); g.arc(p[0] / bt.W * W, p[1] / bt.H * H, 2, 0, 6.2832); g.fill(); } }
    for (let j = 0; j < f.u.length; j++) {
      const p = f.u[j]; if (!p) continue; const u = bt.units[j];
      const x = p[0] / bt.W * W, y = p[1] / bt.H * H, s = Math.max(3, Math.min(9, Math.sqrt(p[2]) * 0.09 * W / 360));
      g.globalAlpha = p[3] ? 0.5 : 1;
      g.fillStyle = u.side === 0 ? (u.me ? '#f3d27a' : '#e9e1cc') : '#d4553a';
      g.strokeStyle = 'rgba(20,14,8,.7)'; g.lineWidth = 1;
      g.beginPath(); g.rect(x - s, y - s * 0.6, s * 2, s * 1.2); g.fill(); g.stroke();
      g.globalAlpha = 1;
      if (u.me || u.hq) { g.fillStyle = '#231c13'; g.font = `9px ${V.fontHead ? V.fontHead() : 'serif'}`; g.textAlign = 'center'; g.fillText(names[j].slice(0, 3), x, y - s - 2); }
    }
    const s0 = f.u.reduce((a, p, j) => a + (p && bt.units[j].side === 0 ? p[2] : 0), 0), s1 = f.u.reduce((a, p, j) => a + (p && bt.units[j].side === 1 ? p[2] : 0), 0);
    info.textContent = `${f.d}日目 ${V.timeLabel ? V.timeLabel(f.t - (f.d - 1) * bt.dayLen) : Math.round(f.t) + '秒'}　味方 ${U.fmt(s0)}　敵 ${U.fmt(s1)}`;
    const lines = (bt.log || []).filter(l => l.t <= f.t && l.t > f.t - 20).slice(0, 3);
    logEl.innerHTML = lines.map(l => `<div>${U.esc(l.s)}</div>`).join('');
    range.value = i;
  };
  const stop = () => { if (timer) { clearInterval(timer); timer = 0; play.textContent = '▶ 再生'; } };
  play.onclick = () => { if (timer) return stop(); if (i >= rec.length - 1) i = 0; play.textContent = '■ 止める'; timer = setInterval(() => { i++; if (i >= rec.length) { i = rec.length - 1; stop(); } draw(); }, 140); };
  range.oninput = () => { stop(); i = +range.value; draw(); };
  box.append(cv, info, U.h('div', { class: 'rp-ctl' }, play, range), logEl);
  const b = U.h('button', { class: 'btn seal wide', style: { marginTop: '12px' } }, '閉じる'); b.onclick = () => { stop(); close(); }; box.append(b);
  draw();
}, { stack: true });
