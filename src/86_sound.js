/* =========================================================
   地中海覇道 — 音（WebAudio で合成。音源ファイルは使わない）
   SND.play(k) 効果音 / SND.bgm(k) 場面の音楽 / SND.toggle()
   最初の操作のあとで鳴り始める（ブラウザの決まり）
   ========================================================= */
const SND = {
  ctx: null, master: null, music: null, sfx: null, on: true, bgmK: null, _timer: null, _next: 0, _step: 0, _ready: false, _last: {},
  init() {
    if (SND._ready) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
      const c = SND.ctx = new AC();
      const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(c.destination);
      SND.master = c.createGain(); SND.master.gain.value = SND.on ? 1 : 0; SND.master.connect(comp);
      SND.sfx = c.createGain(); SND.sfx.gain.value = 0.6; SND.sfx.connect(SND.master);
      SND.music = c.createGain(); SND.music.gain.value = 0.22; SND.music.connect(SND.master);
      // ノイズ
      SND.noiseBuf = SND.mkNoise(c);
      // 残響（手続きで作った響き：早い反射＋指数で減衰する尾）。効果音と音楽から少しずつ送る
      try {
        SND.verb = c.createConvolver(); SND.verb.buffer = SND.mkImpulse(c, 1.7, 2.4);
        SND.verbGain = c.createGain(); SND.verbGain.gain.value = 0.9; SND.verb.connect(SND.verbGain); SND.verbGain.connect(SND.master);
        const s1 = c.createGain(); s1.gain.value = 0.22; SND.sfx.connect(s1); s1.connect(SND.verb);
        const s2 = c.createGain(); s2.gain.value = 0.35; SND.music.connect(s2); s2.connect(SND.verb);
      } catch (e) {}
      SND.samples = {};
      SND._ready = true;
      // よく鳴る短い音は一度だけ描き出して使い回す（軽く、音色が揃う）
      setTimeout(() => SND.prerender(), 300);
      if (SND.bgmK) SND.bgm(SND.bgmK, true);
      return true;
    } catch (e) { return false; }
  },
  load() { try { const v = localStorage.getItem('chichukai.snd'); if (v != null) SND.on = v !== '0'; } catch (e) {} },
  save() { try { localStorage.setItem('chichukai.snd', SND.on ? '1' : '0'); } catch (e) {} },
  toggle(v) { SND.on = v == null ? !SND.on : !!v; SND.save(); if (SND.master) SND.master.gain.setTargetAtTime(SND.on ? 1 : 0, SND.ctx.currentTime, 0.05); if (SND.on && SND.ctx && SND.ctx.state === 'suspended') SND.ctx.resume().catch(() => {}); return SND.on; },
  unlock() {
    const go = () => { if (!SND.init()) return; if (SND.ctx.state === 'suspended') SND.ctx.resume().catch(() => {}); };
    for (const ev of ['pointerdown', 'keydown', 'touchend']) document.addEventListener(ev, go, { passive: true });
  },
  now() { return SND.ctx.currentTime; },
  mkNoise(c) { const len = Math.round(c.sampleRate * 1.5), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0); let r = 12345; for (let i = 0; i < len; i++) { r = (r * 1103515245 + 12345) & 0x7fffffff; d[i] = (r / 0x7fffffff) * 2 - 1; } return buf; },
  mkImpulse(c, dur, decay) {
    const sr = c.sampleRate, len = Math.round(sr * dur), buf = c.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch); let r = 777 + ch * 99;
      for (let i = 0; i < len; i++) { r = (r * 1103515245 + 12345) & 0x7fffffff; const t = i / len; d[i] = ((r / 0x7fffffff) * 2 - 1) * Math.pow(1 - t, decay) * (i < sr * 0.01 ? i / (sr * 0.01) : 1); }
      // 早い反射
      for (const [at, g] of [[0.019, 0.5], [0.031, 0.35], [0.047, 0.28], [0.071, 0.2]]) { const k = Math.round(at * sr * (1 + ch * 0.07)); if (k < len) d[k] += g; }
    }
    return buf;
  },
  SAMPLED: { tap: 0.12, clash: 0.32, block: 0.25, arrows: 0.7, hoof: 0.7, coin: 0.45, page: 0.2, drum1: 0.45, rout: 0.6, whoosh: 0.4 },
  async prerender() {
    if (!SND._ready || typeof OfflineAudioContext === 'undefined') return;
    for (const k in SND.SAMPLED) {
      if (SND.samples[k]) continue;
      try {
        const sr = SND.ctx.sampleRate, off = new OfflineAudioContext(1, Math.ceil(sr * SND.SAMPLED[k]), sr);
        const live = { ctx: SND.ctx, sfx: SND.sfx, noise: SND.noiseBuf };
        SND.ctx = off; SND.sfx = off.destination; SND.noiseBuf = SND.mkNoise(off);
        try { SND.gen(k, 0.005); } finally { SND.ctx = live.ctx; SND.sfx = live.sfx; SND.noiseBuf = live.noise; }
        const buf = await off.startRendering();
        SND.samples[k] = buf;
      } catch (e) { break; }
    }
  },
  // ---- 部品 ----
  osc(type, f, t0, dur, vol, dest, opt = {}) {
    const c = SND.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0);
    if (opt.f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, opt.f1), t0 + (opt.ft || dur));
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + (opt.a || 0.005)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let node = o;
    if (opt.lp) { const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(opt.lp, t0); if (opt.lp1) lp.frequency.exponentialRampToValueAtTime(opt.lp1, t0 + dur); node.connect(lp); node = lp; }
    node.connect(g); g.connect(dest || SND.sfx);
    o.start(t0); o.stop(t0 + dur + 0.05);
    return o;
  },
  noise(t0, dur, vol, dest, opt = {}) {
    const c = SND.ctx, s = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter();
    s.buffer = SND.noiseBuf; s.loop = true;
    f.type = opt.type || 'bandpass'; f.frequency.setValueAtTime(opt.f || 1000, t0); if (opt.f1) f.frequency.exponentialRampToValueAtTime(opt.f1, t0 + dur); f.Q.value = opt.q || 0.8;
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + (opt.a || 0.004)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(dest || SND.sfx);
    s.start(t0); s.stop(t0 + dur + 0.05);
  },
  pluck(f, t0, dur, vol, dest) {
    // 琴の音（倍音を重ねて早く減衰）
    SND.osc('sine', f, t0, dur, vol, dest, { a: 0.004 });
    SND.osc('triangle', f * 2, t0, dur * 0.5, vol * 0.35, dest, { a: 0.003 });
    SND.osc('sine', f * 3.01, t0, dur * 0.3, vol * 0.15, dest, { a: 0.003 });
  },
  drum(t0, f, vol, dest, dur = 0.35) {
    SND.osc('sine', f, t0, dur, vol, dest, { f1: f * 0.45, ft: dur * 0.6, a: 0.003 });
    SND.noise(t0, 0.08, vol * 0.5, dest, { f: 900, type: 'lowpass' });
  },
  // ---- 効果音 ----
  play(k, opt) {
    if (!SND.on) return;
    if (!SND._ready && !SND.init()) return;
    if (SND.ctx.state === 'suspended') return;
    const now = performance.now(), gap = { clash: 90, tap: 40, arrows: 300, hoof: 200 }[k] || 0;
    if (gap && now - (SND._last[k] || 0) < gap) return;
    SND._last[k] = now;
    const pan = opt && typeof opt.pan === 'number' ? Math.max(-1, Math.min(1, opt.pan)) : 0;
    // 描き出し済みの音があれば、それを少し音程を揺らして鳴らす
    const smp = SND.samples && SND.samples[k];
    if (smp) {
      try {
        const c = SND.ctx, src = c.createBufferSource(); src.buffer = smp; src.playbackRate.value = 0.94 + Math.random() * 0.12;
        let node = src;
        if (pan && c.createStereoPanner) { const pn = c.createStereoPanner(); pn.pan.value = pan; node.connect(pn); node = pn; }
        const g = c.createGain(); g.gain.value = opt && opt.vol != null ? opt.vol : 1; node.connect(g); g.connect(SND.sfx);
        src.start();
      } catch (e) {}
      return;
    }
    SND.gen(k, SND.now(), pan);
  },
  gen(k, t, pan) {
    const S2 = SND;
    let dest = null;
    if (pan && S2.ctx.createStereoPanner) { try { const pn = S2.ctx.createStereoPanner(); pn.pan.value = pan; pn.connect(S2.sfx); dest = pn; } catch (e) { dest = null; } }
    const osc0 = S2.osc, noise0 = S2.noise;
    if (dest) { S2.osc = (type, f, t0, dur, vol, d2, opt) => osc0(type, f, t0, dur, vol, d2 || dest, opt); S2.noise = (t0, dur, vol, d2, opt) => noise0(t0, dur, vol, d2 || dest, opt); }
    try {
      switch (k) {
        case 'tap': S2.noise(t, 0.04, 0.12, null, { f: 1800, type: 'highpass' }); S2.osc('sine', 660, t, 0.05, 0.08); break;
        case 'whoosh': S2.noise(t, 0.32, 0.35, null, { f: 300, f1: 2400, q: 1.2 }); break;
        case 'clash': S2.noise(t, 0.09, 0.3, null, { f: 3200, q: 2 }); for (const f of [2150, 3300, 5200]) S2.osc('sine', f * (0.95 + Math.random() * 0.1), t, 0.16 + Math.random() * 0.1, 0.07); break;
        case 'clash_big': S2.osc('sine', 90, t, 0.4, 0.45, null, { f1: 40, ft: 0.3 }); S2.noise(t, 0.14, 0.45, null, { f: 2600, q: 1.5 }); for (const f of [1800, 2700, 4100, 6200]) S2.osc('sine', f, t, 0.35, 0.09); break;
        case 'block': S2.osc('triangle', 180, t, 0.14, 0.35, null, { f1: 120 }); S2.noise(t, 0.06, 0.25, null, { f: 700, type: 'lowpass' }); break;
        case 'slay': S2.osc('sine', 110, t, 0.5, 0.5, null, { f1: 35, ft: 0.4 }); S2.noise(t, 0.25, 0.4, null, { f: 1200, f1: 200 }); S2.osc('sawtooth', 440, t + 0.05, 0.5, 0.08, null, { f1: 110, lp: 1200 }); break;
        case 'gong': for (const [f, v, d] of [[164, 0.3, 2.6], [246, 0.18, 2.2], [412, 0.12, 1.8], [655, 0.08, 1.4]]) S2.osc('sine', f, t, d, v, null, { f1: f * 0.98, ft: d, a: 0.01 }); S2.noise(t, 0.08, 0.25, null, { f: 2500 }); break;
        case 'horn': { const o = S2.osc('sawtooth', 196, t, 0.9, 0.22, null, { f1: 294, ft: 0.25, lp: 1600, a: 0.08 }); const o2 = S2.osc('square', 98, t, 0.9, 0.08, null, { f1: 147, ft: 0.25, lp: 800, a: 0.1 }); const lfo = S2.ctx.createOscillator(), lg = S2.ctx.createGain(); lfo.frequency.value = 6; lg.gain.value = 4; lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(t + 1); break; }
        case 'drums': for (let i = 0; i < 3; i++) S2.drum(t + i * 0.22, i === 2 ? 55 : 80, 0.6); S2.drum(t + 0.75, 50, 0.8, null, 0.6); break;
        case 'drum1': S2.drum(t, 70, 0.5); break;
        case 'hoof': for (let i = 0; i < 4; i++) S2.drum(t + i * 0.11 + (i % 2) * 0.03, 120 - i * 6, 0.22, null, 0.12); break;
        case 'sp': S2.osc('sine', 220, t, 0.7, 0.25, null, { f1: 1760, ft: 0.6, a: 0.05 }); S2.noise(t, 0.6, 0.2, null, { f: 500, f1: 5000, q: 1.5 }); for (let i = 0; i < 4; i++) S2.osc('sine', 2200 + i * 300, t + 0.5 + i * 0.05, 0.3, 0.05); break;
        case 'finish': S2.play('gong'); S2.noise(t, 0.5, 0.35, null, { f: 200, f1: 3000 }); S2.noise(t + 0.3, 2.2, 0.3, null, { f: 500, f1: 900, q: 0.4, a: 0.6, type: 'lowpass' }); break;
        case 'victory': { const sc = [294, 330, 370, 440, 494, 587]; sc.forEach((f, i) => S2.pluck(f, t + i * 0.12, 1.2, 0.25)); setTimeout(() => S2.play('gong'), 700); break; }
        case 'defeat': { [294, 262, 220, 196, 147].forEach((f, i) => S2.osc('triangle', f, t + i * 0.3, 0.9, 0.2, null, { lp: 900 })); S2.drum(t + 1.5, 45, 0.7, null, 0.8); break; }
        case 'duel_intro': S2.play('horn'); S2.drum(t + 0.3, 60, 0.6, null, 0.5); S2.drum(t + 0.6, 60, 0.6, null, 0.5); break;
        case 'crash': S2.noise(t, 0.6, 0.6, null, { f: 300, f1: 80, type: 'lowpass' }); S2.osc('sine', 70, t, 0.8, 0.5, null, { f1: 30 }); for (let i = 0; i < 6; i++) S2.noise(t + 0.1 + Math.random() * 0.4, 0.06, 0.2, null, { f: 1500 + Math.random() * 2000 }); break;
        case 'arrows': S2.noise(t, 0.4, 0.22, null, { f: 1800, f1: 600, q: 1.5 }); for (let i = 0; i < 5; i++) S2.noise(t + i * 0.05, 0.07, 0.1, null, { f: 3000, type: 'highpass' }); break;
        case 'rout': S2.osc('sawtooth', 330, t, 0.5, 0.1, null, { f1: 165, lp: 1200 }); break;
        case 'neigh': { const o = S2.osc('sawtooth', 620, t, 0.55, 0.12, null, { f1: 380, ft: 0.5, lp: 2200, a: 0.03 }); const lfo = S2.ctx.createOscillator(), lg = S2.ctx.createGain(); lfo.frequency.value = 22; lg.gain.value = 60; lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(t + 0.6); break; }
        case 'roar': S2.noise(t, 2.4, 0.35, null, { f: 420, f1: 800, q: 0.5, a: 0.5, type: 'lowpass' }); S2.noise(t + 0.2, 1.8, 0.15, null, { f: 1200, q: 0.8, a: 0.4 }); break;
        case 'coin': S2.osc('sine', 1320, t, 0.25, 0.15); S2.osc('sine', 1760, t + 0.08, 0.3, 0.12); break;
        case 'page': S2.noise(t, 0.12, 0.15, null, { f: 2200, f1: 900, type: 'bandpass' }); break;
        default: break;
      }
    } catch (e) {}
    if (dest) { S2.osc = osc0; S2.noise = noise0; }
  },
  // ---- 音楽（場面ごとに生成） ----
  SCALES: { map: [293.66, 329.63, 369.99, 440, 493.88, 587.33, 659.25], title: [220, 261.63, 293.66, 329.63, 392, 440, 523.25], battle: [146.83, 174.61, 196, 220, 261.63], duel: [164.81, 196, 220, 246.94, 293.66] },
  bgm(k, force) {
    if (k === SND.bgmK && !force) return;
    SND.bgmK = k;
    if (SND._timer) { clearInterval(SND._timer); SND._timer = null; }
    if (!k || !SND._ready) return;
    SND._step = 0; SND._next = SND.now() + 0.1; SND._note = 3;
    SND._timer = setInterval(SND.schedule, 200);
  },
  schedule() {
    if (!SND.on || !SND._ready || !SND.bgmK) return;
    const c = SND.ctx, k = SND.bgmK, sc = SND.SCALES[k] || SND.SCALES.map;
    const beat = k === 'battle' ? 0.5 : k === 'duel' ? 0.42 : k === 'title' ? 0.9 : 0.75;
    while (SND._next < c.currentTime + 0.6) {
      const t = SND._next, s = SND._step;
      const M = SND.music;
      if (k === 'battle' || k === 'duel') {
        // 太鼓：ドン・ドン・ドドン
        const pat = k === 'duel' ? [1, 0, 0.6, 0, 1, 0.5, 0, 0.7] : [1, 0, 0, 0.5, 1, 0, 0.6, 0];
        const v = pat[s % 8]; if (v) SND.drum(t, v === 1 ? 62 : 90, 0.5 * v, M, 0.3);
        if (s % 16 === 0) SND.noise(t, beat * 16.5, 0.05, M, { f: 400, f1: 700, q: 0.3, a: 2.0, type: 'lowpass' });
        if (s % 16 === 8) SND.noise(t, 0.5, 0.12, M, { f: 2000, f1: 500 });
        if (s % 4 === 2 && Math.random() < 0.5) SND.pluck(sc[Math.floor(Math.random() * sc.length)] / 2, t, 1.0, 0.18, M);
      } else {
        // 低く長い笙のような持続音（八拍ごとに言い換える）
        if (s % 8 === 0) { const f = sc[s % 16 === 0 ? 0 : 3] / 4; SND.osc('sine', f, t, beat * 8.4, 0.07, M, { a: 1.2, lp: 600 }); SND.osc('triangle', f * 1.005, t, beat * 8.4, 0.03, M, { a: 1.6, lp: 500 }); }
        // 琴：音階の上を歩く。四拍ごとに低い音
        if (s % 4 === 0) SND.pluck(sc[0] / 2, t, 2.2, 0.22, M);
        if (Math.random() < (k === 'title' ? 0.55 : 0.7)) {
          SND._note = U.clamp(SND._note + (Math.random() < 0.5 ? -1 : 1) * (Math.random() < 0.8 ? 1 : 2), 0, sc.length - 1);
          SND.pluck(sc[SND._note], t + (Math.random() < 0.3 ? beat * 0.5 : 0), 1.6, 0.2, M);
        }
        if (s % 8 === 6 && Math.random() < 0.4) SND.pluck(sc[Math.min(sc.length - 1, SND._note + 2)], t + beat * 0.5, 1.2, 0.12, M);
      }
      SND._next += beat; SND._step++;
    }
  },
};
SND.load();
SND.unlock();
// 画面のボタンの音
document.addEventListener('click', (e) => { const b = e.target && e.target.closest ? e.target.closest('button') : null; if (b && !b.disabled) SND.play('tap'); }, true);
