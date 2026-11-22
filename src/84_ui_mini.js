/* =========================================================
   地中海覇道 — 一騎打ち・舌戦
   ========================================================= */
UI.DUEL_ACT = {
  atk: { n: '攻撃', d: '手堅く打つ' },
  pow: { n: '強撃', d: '攻撃に勝ち、受けに弱い' },
  grd: { n: '受け', d: '強撃を返す。気迫が溜まる' },
  sp:  { n: '必殺', d: '気迫を使う大技' },
  flee:{ n: '退く', d: '馬を返して逃れる' },
};
// [Aの倍率, Bの倍率]
UI.DUEL_M = {
  atk: { atk: [1, 1], pow: [0.6, 1.8], grd: [0.4, 0.35], sp: [0.6, 3], flee: [1.2, 0] },
  pow: { atk: [1.8, 0.6], pow: [1.5, 1.5], grd: [0.2, 1.3], sp: [1.2, 2.6], flee: [1.4, 0] },
  grd: { atk: [0.35, 0.4], pow: [1.3, 0.2], grd: [0, 0], sp: [0.6, 1.6], flee: [0.5, 0] },
  sp:  { atk: [3, 0.6], pow: [2.6, 1.2], grd: [1.6, 0.6], sp: [2.2, 2.2], flee: [3, 0] },
};
// 一騎打ちの画面は 85_duel.js

/* 舌戦 */
UI.DEB = { ri: { n: '理', d: '筋道を説く（知力）', k: 'chi' }, eki: { n: '利', d: '損得を示す（政治）', k: 'pol' }, jo: { n: '情', d: '心に訴える（魅力）', k: 'mi' } };
UI.DEB_BEATS = { ri: 'jo', jo: 'eki', eki: 'ri' };
UI.debate = (opp, topic) => {
  if (!opp) return Promise.resolve(0);
  return UI.modal((box, close) => {
    const me = S.myOff();
    const sA = { chi: S.stat(me, 'chi'), pol: S.stat(me, 'pol'), mi: S.stat(me, 'mi') };
    const sB = { chi: opp.chi || 50, pol: opp.pol || 50, mi: opp.mi || 50 };
    const bonus = S.fxm(me, 'debate'), obon = 1 + S.fx(opp, 'debate');
    let g = 50, round = 0, done = false, nextB = null;
    const log = [];
    box.innerHTML = `<div class="mseal" aria-hidden="true">舌戦</div><h3>舌戦：${U.esc(topic || '')}</h3>
      <div class="body">相手：${U.esc(opp.n)}（知${sB.chi} 政${sB.pol} 魅${sB.mi}）\n理は情に、情は利に、利は理に勝る。</div>
      <div class="gauge" aria-label="形勢"><b id="db-g"></b></div>
      <div style="display:flex;justify-content:space-between;font-size:12px;color:#5b4b31"><span>劣勢</span><span>優勢</span></div>
      <div class="duel-hint" id="db-hint"></div>
      <div class="duel-acts" id="db-acts"></div>
      <div class="duel-log" id="db-log"></div>`;
    const pickB = () => U.wpick(Object.keys(UI.DEB), k => Math.pow(sB[UI.DEB[k].k], 2));
    const hint = () => {
      nextB = pickB();
      const p = U.clamp(0.4 + (sA.chi - sB.chi) / 160, 0.15, 0.85);
      U.$('#db-hint', box).textContent = Math.random() < p ? { ri: `${opp.n}は理屈で攻めてきそうだ。`, eki: `${opp.n}は損得を並べてきそうだ。`, jo: `${opp.n}は情に訴えてきそうだ。` }[Math.random() < 0.85 ? nextB : pickB()] : `${opp.n}の出方が読めない。`;
    };
    const upd = () => {
      U.$('#db-g', box).style.left = `calc(${U.clamp(g, 0, 100)}% - 3px)`;
      U.$('#db-log', box).innerHTML = log.slice(-3).map(s => `<div>${s}</div>`).join('');
      const acts = U.$('#db-acts', box);
      acts.innerHTML = Object.keys(UI.DEB).map(k => `<button data-k="${k}" ${done ? 'disabled' : ''}>${UI.DEB[k].n}<small>${UI.DEB[k].d}・${sA[UI.DEB[k].k]}</small></button>`).join('');
      for (const b of U.$$('button', acts)) b.onclick = () => turn(b.dataset.k);
    };
    const finish = () => { done = true; upd(); const r = g >= 60 ? 1 : g <= 40 ? -1 : 0; if (r > 0 && typeof W !== 'undefined' && W.learn) W.learn('debateWin'); log.push(r > 0 ? '説き伏せた！' : r < 0 ? '言い負かされた……' : '物別れに終わった。'); upd(); setTimeout(() => close(r), 900); };
    const turn = (ka) => {
      if (done) return;
      round++;
      const kb = nextB || pickB();
      let pa = sA[UI.DEB[ka].k] * U.rf(0.8, 1.2) * bonus, pb = sB[UI.DEB[kb].k] * U.rf(0.8, 1.2) * obon;
      if (UI.DEB_BEATS[ka] === kb) { pa *= 1.5; pb *= 0.6; }
      else if (UI.DEB_BEATS[kb] === ka) { pb *= 1.5; pa *= 0.6; }
      const dg = (pa - pb) / 5;
      g = U.clamp(g + dg, 0, 100);
      log.push(`「${UI.DEB[ka].n}」対「${UI.DEB[kb].n}」— ${dg >= 0 ? '押した' : '押し返された'}（${dg >= 0 ? '+' : ''}${Math.round(dg)}）`);
      if (round >= 5 || g >= 85 || g <= 15) return finish();
      upd(); hint();
    };
    upd(); hint();
  });
};
