/* =========================================================
   地中海覇道 — MOD（人物と事件を自分で足す）
   - 端末に残す（localStorage）。書き出した文字列を読み込めば別の端末でも使える
   - 人物：新しい物語を始めるときに世に出る
   - 事件：JSON の事件（EV.J）として、組み込みの事件と同じように起きる
   ========================================================= */
const MOD = {
  KEY: 'chichukai.mods',
  data: null,
  load() { if (MOD.data) return MOD.data; try { const v = JSON.parse(localStorage.getItem(MOD.KEY) || 'null'); MOD.data = v && typeof v === 'object' ? { officers: v.officers || [], events: v.events || [] } : { officers: [], events: [] }; } catch (e) { MOD.data = { officers: [], events: [] }; } return MOD.data; },
  save() { try { localStorage.setItem(MOD.KEY, JSON.stringify(MOD.load())); } catch (e) {} },
  officers() { return MOD.load().officers.filter(MOD.validOfficer); },
  events() { return MOD.load().events.filter(MOD.validEvent); },
  validOfficer(o) { return !!(o && typeof o.n === 'string' && o.n.length >= 1 && o.n.length <= 14 && D.COUNTRIES[o.c] && D.RANKS[o.r] && ['bu', 'tou', 'chi', 'pol', 'mi'].every(k => typeof o[k] === 'number')); },
  validEvent(e) { return !!(e && typeof e.id === 'string' && typeof e.title === 'string' && Array.isArray(e.choices) && e.choices.every(c => c && typeof c.label === 'string' && (!c.fx || Array.isArray(c.fx)))); },
  addOfficer(o) { const d = MOD.load(); o.id = o.id || ('mod_' + U.uid()); d.officers = d.officers.filter(x => x.id !== o.id).concat([o]); MOD.save(); return o; },
  addEvent(e) { const d = MOD.load(); e.id = e.id || ('mod_' + U.uid()); e.mod = true; d.events = d.events.filter(x => x.id !== e.id).concat([e]); MOD.save(); return e; },
  remove(kind, id) { const d = MOD.load(); d[kind] = d[kind].filter(x => x.id !== id); MOD.save(); },
  clear() { MOD.data = { officers: [], events: [] }; MOD.save(); },
  // 書き出し・読み込み（文字列）
  export() { const d = MOD.load(); return JSON.stringify({ chichukai_mod: 1, officers: d.officers, events: d.events }); },
  import(str) {
    let v; try { v = JSON.parse(str); } catch (e) { throw new Error('JSON として読めない'); }
    if (!v || typeof v !== 'object') throw new Error('形式が違う');
    const offs = (v.officers || []).filter(MOD.validOfficer), evs = (v.events || []).filter(MOD.validEvent);
    for (const o of offs) MOD.addOfficer(Object.assign({}, o));
    for (const e of evs) MOD.addEvent(Object.assign({}, e));
    return { officers: offs.length, events: evs.length };
  },
  // 新しい物語に人物を加える
  apply() {
    if (typeof G === 'undefined' || !G || !G.off) return 0;
    let n = 0;
    for (const m of MOD.officers()) {
      if (!G.cty[m.c] || !G.cty[m.c].alive) continue;
      if (Object.values(G.off).some(o => o.mod && o.n === m.n)) continue;
      const row = [m.n, m.c, m.r, m.bu, m.tou, m.chi, m.pol, m.mi, m.age || 28, (m.tr || []).filter(t => D.TRAITS[t]), m.st || 'bal', null];
      const rk = D.RANKS[m.r];
      let role = m.r;
      if (rk.track === 'top') role = 'daij';
      if (role === 'daij') { const free = D.MIN_ORDER.find(k => !G.cty[m.c].mins[k]); role = free ? 'daij:' + free : 'guns'; }
      try { const o = S.histOfficer(row, false, { age: m.age || 28, role }); if (o) { o.hist = false; o.mod = true; o.death = null; n++; } } catch (e) { console.warn('mod officer', m, e); }
    }
    if (n) S.log(`MOD の人物 ${n}人が世に出た。`);
    return n;
  },
};
