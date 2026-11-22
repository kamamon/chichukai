/* =========================================================
   地中海覇道 — カットイン（開戦・突撃・討ち取り・勝敗・落城・昇進）
   UI.cutin({ kind, title, sub, a, b, side, color, dur }) → Promise
     kind: 'clash'（二将）/'single'（一将）/'banner'（文字だけ）/'duel'（一騎打ちの結果）
   タップで早送り。設定で切れる（G.flags.cutin === false）。
   ========================================================= */
UI.CUTIN_ON = () => !(typeof G !== 'undefined' && G && G.flags && G.flags.cutin === false);
UI._cutinQ = Promise.resolve();
UI.cutin = (o) => {
  if (!UI.CUTIN_ON() || UI.noCutin) return Promise.resolve(false);
  const run = () => new Promise((resolve) => {
    let root = U.$('#cutin-root');
    if (!root) { root = U.h('div', { id: 'cutin-root' }); document.body.append(root); }
    root.innerHTML = '';
    const kind = o.kind || 'banner';
    const colOf = (x) => { if (!x) return '#6d5a44'; const C = D.COUNTRIES[x.c]; const c = C ? C.color : x.c === 'nomad' ? D.NOMAD.color : D.BANDIT.color; return c === '#26262d' ? '#3b3b47' : c; };
    const nameOf = (x) => x ? U.esc(x.n) : '';
    const cOf = (x) => x && D.COUNTRIES[x.c] ? D.COUNTRIES[x.c].name : x && x.c === 'nomad' ? D.NOMAD.name : x ? D.BANDIT.name : '';
    const wrap = U.h('div', { class: `cutin k-${kind} ${o.cls || ''}`, role: 'img', 'aria-label': `${o.title || ''} ${o.sub || ''}` });
    const cv = U.h('canvas', { class: 'ci-fx' });
    wrap.append(cv);
    const panel = (x, pos, size, expr) => {
      const el = U.h('div', { class: `ci-panel ci-${pos}` }); el.style.setProperty('--pc', colOf(x));
      const por = U.h('div', { class: 'ci-por' }); por.append(PORT.canvas(x, size, { dark: true, expr: expr || 'normal' }));
      el.append(por, U.h('div', { class: 'ci-name' }, U.h('b', {}, x.n || ''), U.h('small', {}, [cOf(x), x.r && D.RANKS[x.r] ? D.RANKS[x.r].name : ''].filter(Boolean).join('・'))));
      return el;
    };
    const big = Math.min(window.innerWidth, window.innerHeight) < 500;
    if ((kind === 'clash' || kind === 'duel') && o.a && o.b) { wrap.append(panel(o.a, 'l', big ? 150 : 190, o.ea || (kind === 'clash' ? 'angry' : 'normal')), panel(o.b, 'r', big ? 150 : 190, o.eb || (kind === 'clash' ? 'angry' : 'normal'))); }
    else if (kind === 'single' && o.a) { wrap.append(panel(o.a, o.side === 1 ? 'r' : 'l', big ? 170 : 220, o.ea || 'angry')); }
    const txt = U.h('div', { class: 'ci-text' + (kind === 'single' ? (o.side === 1 ? ' at-l' : ' at-r') : '') }, U.h('b', { style: o.color ? { color: o.color } : null }, o.title || ''), o.sub ? U.h('small', {}, o.sub) : null);
    wrap.append(txt);
    if (kind === 'duel') wrap.append(U.h('div', { class: 'ci-vs' }, '対'));
    root.append(wrap);
    // 速度線と墨飛沫（canvas）
    const g = cv.getContext('2d');
    const W = cv.width = Math.round(window.innerWidth * Math.min(2, devicePixelRatio || 1)), H = cv.height = Math.round(window.innerHeight * Math.min(2, devicePixelRatio || 1));
    const px = Math.min(2, devicePixelRatio || 1);
    const rng = U.rng(PORT.hash((o.title || '') + (o.a ? o.a.n : '') + kind));
    const lines = []; for (let i = 0; i < 70; i++) lines.push({ a: rng() * 6.2832, l: 0.25 + rng() * 0.75, w: 0.6 + rng() * 2.2, s: 0.5 + rng() });
    const blobs = []; for (let i = 0; i < 9; i++) blobs.push({ x: 0.5 + (rng() - 0.5) * 0.9, y: 0.5 + (rng() - 0.5) * 0.9, r: 0.03 + rng() * 0.09, d: rng() * 0.25 });
    const t0 = performance.now(); const dur = o.dur || (kind === 'banner' ? 1700 : kind === 'single' ? 1500 : 1900);
    let done = false, out = false;
    const fxCol = o.fx || (kind === 'duel' || o.red ? '194,69,47' : '235,227,205');
    const draw = () => {
      if (done) return;
      const t = (performance.now() - t0) / 1000;
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
      const cx = W / 2, cy = H / 2, R = Math.hypot(W, H) / 2;
      // 速度線（中心から外へ）
      g.strokeStyle = `rgba(${fxCol},${0.55 * Math.min(1, t * 6) * (out ? 0.3 : 1)})`;
      g.lineCap = 'round';
      for (const l of lines) {
        const ph = (t * 2.2 * l.s) % 1;
        const r0 = R * (0.18 + 0.4 * ph), r1 = Math.min(R, r0 + R * l.l * 0.35);
        g.lineWidth = l.w * px; g.beginPath(); g.moveTo(cx + Math.cos(l.a) * r0, cy + Math.sin(l.a) * r0); g.lineTo(cx + Math.cos(l.a) * r1, cy + Math.sin(l.a) * r1); g.stroke();
      }
      // 墨の飛沫
      if (kind !== 'banner' || o.red) for (const b of blobs) {
        const k = U.clamp((t - b.d) * 3.5, 0, 1); if (k <= 0) continue;
        g.fillStyle = `rgba(${o.red || kind === 'duel' ? '120,20,10' : '20,14,8'},${0.5 * k * (out ? 0.4 : 1)})`;
        g.beginPath(); g.arc(b.x * W, b.y * H, b.r * Math.min(W, H) * (0.6 + 0.4 * k), 0, 6.2832); g.fill();
        g.beginPath(); g.arc(b.x * W + b.r * W * 0.9 * k, b.y * H - b.r * H * 0.6 * k, b.r * Math.min(W, H) * 0.25, 0, 6.2832); g.fill();
      }
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
    const finish = () => { if (done) return; done = true; root.innerHTML = ''; resolve(true); };
    const leave = () => { if (out) return; out = true; wrap.classList.add('out'); setTimeout(finish, 320); };
    const tm = setTimeout(leave, dur);
    wrap.onpointerdown = () => { clearTimeout(tm); leave(); };
    if (typeof SND !== 'undefined' && SND.play) SND.play(o.snd || (kind === 'banner' ? 'gong' : kind === 'duel' ? 'clash' : 'whoosh'));
    if (navigator.vibrate && kind !== 'banner') { try { navigator.vibrate(kind === 'duel' ? [30, 40, 60] : 25); } catch (e) {} }
  });
  const p = UI._cutinQ.then(run);
  UI._cutinQ = p.catch(() => {});
  return p;
};
// 合戦の中の演出（イベントの消化）
UI.battleEvent = async (bt, ev) => {
  const sideC = (s) => bt.sides[s].c;
  const snap = (ld, s) => Object.assign({ c: sideC(s) }, ld || {});
  if (ev.k === 'slay') {
    const victim = snap(ev.ld, ev.side), killer = ev.killer ? snap(ev.killer, 1 - ev.side) : null;
    const title = ev.killed ? `${ev.ld.n}、討ち取ったり！` : `${ev.ld.n}を捕縛！`;
    if (killer) return UI.cutin({ kind: 'single', a: killer, side: 1 - ev.side, ea: 'angry', title, sub: ev.isCmd ? '敵の総大将を討ち取った！' : ev.side === 0 ? `味方の将${ev.ld.n}が討たれた……` : '', red: true, snd: 'slay' });
    return UI.cutin({ kind: 'single', a: victim, side: ev.side, ea: 'pain', title: ev.side === 0 ? `${ev.ld.n}、討死……` : title, red: true, snd: 'slay' });
  }
  if (ev.k === 'duel') {
    const a = snap(ev.a, ev.sa), b = snap(ev.b, 1 - ev.sa);
    const win = ev.winner === 'a' ? a : ev.winner === 'b' ? b : null, lose = ev.winner === 'a' ? b : a;
    const title = !win ? '一騎打ち、引き分け' : `${win.n}、${lose.n}を${ev.fled ? '退ける' : ev.kill ? '討ち取る！' : '打ち破る！'}`;
    return UI.cutin({ kind: 'duel', a, b, ea: !win ? 'normal' : win === a ? 'joy' : 'pain', eb: !win ? 'normal' : win === b ? 'joy' : 'pain', title, sub: '一騎打ち', red: !!ev.kill, dur: 2100 });
  }
  if (ev.k === 'city') return UI.cutin({ kind: 'banner', title: ev.pass ? '峠の砦、陥落' : '落城', sub: ev.att === 0 ? (ev.pass ? '砦を制圧した！' : '城砦（アクロポリス）を制圧した！') : (ev.pass ? '砦を奪われた……' : '城砦を奪われた……'), color: ev.att === 0 ? '#f3d27a' : '#f08a74', red: true, snd: 'gong' });
  if (ev.k === 'gate') return UI.cutin({ kind: 'banner', title: '城門、破られる', sub: ev.att === 0 ? '門を打ち破った！ なだれ込め！' : '敵が城内へなだれ込んでくる！', dur: 1400, snd: 'crash' });
  if (ev.k === 'cmdDead') return UI.cutin({ kind: 'banner', title: ev.side === 0 ? '総大将、討死' : '敵総大将、討死！', sub: ev.side === 0 ? '全軍が動揺している……' : '敵軍は大きく動揺している！', color: ev.side === 0 ? '#f08a74' : '#f3d27a', red: true, dur: 1800, snd: 'slay' });
  if (ev.k === 'meDown') return UI.cutin({ kind: 'banner', title: ev.dead ? '討死……' : '深手を負った！', sub: ev.dead ? '' : '部下に担がれて後退する', color: '#f08a74', red: true, dur: 1600, snd: 'slay' });
};

/* ---------- 合戦の戦果（結果画面） ---------- */
UI.battleResult = (bt, r, body) => UI.modal((box, close) => {
  box.classList.add('result');
  const win = bt.winner === 0, lose = bt.winner === 1;
  const s0 = r.sides[0], s1 = r.sides[1];
  const sdA = bt.sides[0], sdB = bt.sides[1];
  const meU = bt.units.find(u => u.me);
  const myC = sdA.c;
  box.append(U.h('div', { class: 'mseal', 'aria-hidden': 'true' }, win ? '勝' : lose ? '敗' : '和'));
  box.append(U.h('div', { class: `rs-title ${win ? 'win' : lose ? 'lose' : ''}` }, win ? '勝利' : lose ? '敗北' : '引き分け'));
  box.append(U.h('div', { class: 'rs-reason' }, `${bt.spec.title || '合戦'}　${bt.reason || ''}`));
  const sideCard = (sd, s, cls) => {
    const por = sd.cmd && !sd.bandit && !sd.nomad ? PORT.canvas(Object.assign({ c: sd.c }, sd.cmd), 56, { expr: bt.winner < 0 ? 'calm' : (bt.winner === (cls === 'a' ? 0 : 1) ? 'joy' : 'pain') }) : null;
    const el = U.h('div', { class: `rs-side ${cls}` });
    const head = U.h('div', { class: 'rs-sh' }); if (por) head.append(por); head.append(U.h('div', {}, U.h('b', {}, sd.name), U.h('small', {}, sd.cmd ? sd.cmd.n : '')));
    const bar = U.h('div', { class: 'rs-bar' }, U.h('i', { class: 'alive' }), U.h('i', { class: 'dead' }), U.h('i', { class: 'rout' }));
    const nums = U.h('div', { class: 'rs-nums' }, U.h('span', {}, '出陣 ', U.h('b', { 'data-n': s.start }, '0')), U.h('span', {}, '残り ', U.h('b', { 'data-n': s.alive }, '0')), U.h('span', { class: 'd' }, '死傷 ', U.h('b', { 'data-n': s.dead }, '0')), U.h('span', { class: 'r' }, '潰走 ', U.h('b', { 'data-n': s.routed }, '0')));
    el.append(head, bar, nums);
    const tot = Math.max(1, s.start);
    setTimeout(() => { bar.querySelector('.alive').style.width = (s.alive / tot * 100) + '%'; bar.querySelector('.dead').style.width = (s.dead / tot * 100) + '%'; bar.querySelector('.rout').style.width = (s.routed / tot * 100) + '%'; }, 80);
    return el;
  };
  box.append(U.h('div', { class: 'rs-sides' }, sideCard(sdA, s0, 'a'), sideCard(sdB, s1, 'b')));
  if (bt.naval) box.append(U.h('p', { class: 'note', style: { textAlign: 'center', margin: '6px 0 0' } }, `沈んだ船　味方 ${U.num(bt.stat.sunk[0])}隻・敵 ${U.num(bt.stat.sunk[1])}隻`));
  // 主人公の働き
  if (sdA.player && bt.spec.role !== 'watch') {
    const me = typeof G !== 'undefined' && G ? S.myOff() : null;
    const rows = [];
    rows.push(['討った兵', bt.stat.meKills]);
    if (bt.stat.duelWins) rows.push(['一騎打ち勝利', bt.stat.duelWins]);
    if (bt.stat.points) rows.push(['要地の確保', bt.stat.points]);
    const mine = U.h('div', { class: 'rs-me' });
    if (me) mine.append(PORT.canvas(me, 64, { seal: true, expr: bt.meFate !== 'ok' ? 'pain' : win ? 'joy' : lose ? 'pain' : 'calm' }));
    const txt = U.h('div', { class: 'rs-met' }, U.h('b', {}, me ? me.n : '主人公'), U.h('div', { class: 'rs-kv' }, ...rows.map(([k, v]) => U.h('span', {}, k + ' ', U.h('b', { 'data-n': v }, '0')))));
    if (bt.meFate !== 'ok') txt.append(U.h('div', { class: 'rs-fate' }, bt.meFate === 'dead' ? '討ち死に……' : '深手を負った'));
    mine.append(txt);
    box.append(U.h('div', { class: 'sec-h sm rs-h' }, '戦功'), mine);
  }
  const slain = bt.stat.slain.filter(x => x.side === 1), lostG = bt.stat.slain.filter(x => x.side === 0), cap = (bt.stat.captured || []).filter(x => x.side === 1);
  const gens = (list, label, cls) => {
    if (!list.length) return;
    const wrap = U.h('div', { class: 'rs-gens' });
    for (const x of list) { const o = x.id && typeof G !== 'undefined' && G && G.off[x.id] ? G.off[x.id] : { n: x.n, c: cls === 'foe' ? sdB.c : myC, r: null }; const el = U.h('div', { class: `rs-gen ${cls}` }); el.append(PORT.canvas(Object.assign({ c: cls === 'foe' ? sdB.c : myC }, o), 44, { dark: true })); el.append(U.h('small', {}, x.n)); wrap.append(el); }
    box.append(U.h('div', { class: 'sec-h sm rs-h' }, label), wrap);
  };
  gens(slain, '討ち取った敵将', 'foe'); gens(cap, '捕らえた敵将', 'foe'); gens(lostG, '失った将', 'own');
  if (meU && meU.wu) {
    const wrap = U.h('div', { class: 'rs-wu' });
    for (const w of meU.wu) wrap.append(U.h('span', { class: w.dead ? 'dead' : w.out ? 'out' : '' }, `${w.n}：${w.dead ? '戦死' : w.out ? '負傷' : '無事'}（${w.kills || 0}人）`));
    box.append(U.h('div', { class: 'sec-h sm rs-h' }, '伍の仲間'), wrap);
  }
  const row = U.h('div', { style: { display: 'flex', gap: '8px', marginTop: '16px' } });
  if (bt.rec && bt.rec.length >= 2 && UI.replay) { const rb = U.h('button', { class: 'btn', style: { flex: 'none' } }, '戦況図'); rb.onclick = () => UI.replay(bt); row.append(rb); }
  const b = U.h('button', { class: 'btn seal', style: { flex: '1' } }, '戦場を去る');
  b.onclick = () => close(true);
  row.append(b); box.append(row);
  // 数を数え上げる
  const els = U.$$('[data-n]', box);
  const t0 = performance.now();
  const tick = () => { const k = Math.min(1, (performance.now() - t0) / 900); const e = 1 - Math.pow(1 - k, 3); for (const el of els) el.textContent = U.num(Math.round(+el.dataset.n * e)); if (k < 1 && box.isConnected) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
});
