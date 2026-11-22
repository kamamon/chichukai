/* =========================================================
   地中海覇道 — MOD の画面（人物・事件を作る、書き出す、読み込む）
   ========================================================= */
UI.modMenu = async () => {
  const d = MOD.load();
  const k = await UI.choose({ title: 'MOD', seal: 'MOD', body: `自分で人物や事件を足せる。人物は新しい物語を始めるときに世に出る。事件はすぐに起きるようになる。\n人物 ${d.officers.length}人・事件 ${d.events.length}件`, choices: [
    { v: 'off', label: '人物を作る', sub: '名・国・官職・能力・特性' },
    { v: 'ev', label: '事件を作る', sub: '題・本文・選択肢とその効果' },
    { v: 'list', label: '導入しているもの', sub: '一覧と削除', disabled: !d.officers.length && !d.events.length },
    { v: 'export', label: '書き出す', sub: '文字列をコピーして保管・共有', disabled: !d.officers.length && !d.events.length },
    { v: 'import', label: '読み込む', sub: '書き出した文字列を貼り付ける' },
    { v: null, label: '閉じる' },
  ] });
  if (k === 'off') { const o = await UI.modOfficer(); if (o) { MOD.addOfficer(o); UI.toast(`${o.n}を加えた（次の物語から）`); } return UI.modMenu(); }
  if (k === 'ev') { const e = await UI.modEvent(); if (e) { MOD.addEvent(e); UI.toast(`事件「${e.title}」を加えた`); } return UI.modMenu(); }
  if (k === 'list') { await UI.modList(); return UI.modMenu(); }
  if (k === 'export') { await UI.copyBox({ title: 'MOD の書き出し', body: 'この文字列を保管しておけば、別の端末で「読み込む」から戻せる。', text: MOD.export(), readonly: true }); return UI.modMenu(); }
  if (k === 'import') {
    const s = await UI.copyBox({ title: 'MOD を読み込む', body: '書き出した文字列を貼り付ける。', text: '' });
    if (s) { try { const r = MOD.import(s); UI.toast(`人物${r.officers}人・事件${r.events}件を読み込んだ`); } catch (e) { await UI.info({ title: '読み込めない', body: String(e.message || e) }); } }
    return UI.modMenu();
  }
};
UI.modList = () => UI.modal((box, close) => {
  const d = MOD.load();
  UI.head(box, { title: '導入している MOD' });
  const list = U.h('div', { class: 'list' });
  const render = () => {
    list.innerHTML = '';
    for (const o of d.officers) { const row = U.h('div', { class: 'card', style: { display: 'flex', gap: '8px', alignItems: 'center' } }); row.append(PORT.canvas({ n: o.n, sei: o.n.slice(0, 1), c: o.c, r: o.r, bu: o.bu, chi: o.chi, age: o.age }, 40)); row.append(U.h('div', { style: { flex: '1', minWidth: '0' } }, U.h('b', {}, o.n), U.h('div', { class: 'note' }, `${S.cname(o.c)}・${D.RANKS[o.r]?.name || ''}　武${o.bu} 統${o.tou} 知${o.chi} 政${o.pol} 魅${o.mi}`))); const del = U.h('button', { class: 'btn sm' }, '削除'); del.onclick = () => { MOD.remove('officers', o.id); render(); }; row.append(del); list.append(row); }
    for (const e of d.events) { const row = U.h('div', { class: 'card', style: { display: 'flex', gap: '8px', alignItems: 'center' } }); row.append(U.h('div', { style: { flex: '1', minWidth: '0' } }, U.h('b', {}, e.title), U.h('div', { class: 'note' }, `事件・選択肢 ${e.choices.length}`))); const del = U.h('button', { class: 'btn sm' }, '削除'); del.onclick = () => { MOD.remove('events', e.id); render(); }; row.append(del); list.append(row); }
    if (!d.officers.length && !d.events.length) list.append(U.h('p', { class: 'empty' }, '何もない。'));
  };
  render(); box.append(list);
  const c = U.h('button', { class: 'btn seal wide', style: { marginTop: '12px' } }, '閉じる'); c.onclick = () => close(); box.append(c);
}, { stack: true });
// 人物を作る
UI.modOfficer = () => UI.modal((box, close) => {
  box.classList.add('tall');
  UI.head(box, { title: '人物を作る', body: '新しい物語を始めるとき、この人物が世に出る。' });
  const o = { n: '', c: 'rome', r: 'shog', bu: 70, tou: 70, chi: 60, pol: 50, mi: 60, st: 'bal', age: 30, tr: [] };
  const ranks = Object.keys(D.RANKS).filter(r => r !== 'kuns' && r !== 'josh');
  box.insertAdjacentHTML('beforeend', `<div class="grid">
    <div class="field"><label for="m-n">名（十四文字まで）</label><input id="m-n" maxlength="14" placeholder="例：マハルバル"></div>
    <div class="field"><label for="m-c">国</label><select id="m-c">${D.CORDER.map(c => `<option value="${c}">${D.COUNTRIES[c].name}</option>`).join('')}</select></div>
    <div class="field"><label for="m-r">官職</label><select id="m-r">${ranks.map(r => `<option value="${r}" ${r === 'shog' ? 'selected' : ''}>${D.RANKS[r].name}</option>`).join('')}</select></div>
    <div class="field"><label for="m-st">型</label><select id="m-st"><option value="ins">本能型</option><option value="chi">知略型</option><option value="bal" selected>均衡型</option></select></div>
    <div class="field"><label for="m-age">年齢</label><input id="m-age" type="number" min="15" max="80" value="30"></div>
  </div>
  <div class="sec-h sm">能力</div>
  <div class="grid">${['bu', 'tou', 'chi', 'pol', 'mi'].map(k => `<div class="field"><label for="m-${k}">${{ bu: '武力', tou: '統率', chi: '知力', pol: '政治', mi: '魅力' }[k]}</label><input id="m-${k}" type="number" min="1" max="100" value="${o[k]}"></div>`).join('')}</div>
  <div class="sec-h sm">特性 <small class="note" id="m-trn">0</small></div>
  <div class="chipgrid" id="m-tr"></div>
  <div style="display:flex;gap:8px;margin-top:8px"><button class="btn sm" id="m-pick">特性を選ぶ（三つまで）</button></div>
  <div class="row" style="margin-top:12px;gap:8px"><div class="por" id="m-prev"></div><span class="note">肖像は名と国から自動で決まる</span></div>`);
  const prev = U.$('#m-prev', box);
  const upd = () => {
    o.n = U.$('#m-n', box).value.trim(); o.c = U.$('#m-c', box).value; o.r = U.$('#m-r', box).value; o.st = U.$('#m-st', box).value; o.age = U.clamp(+U.$('#m-age', box).value || 30, 15, 80);
    for (const k of ['bu', 'tou', 'chi', 'pol', 'mi']) o[k] = U.clamp(+U.$('#m-' + k, box).value || 50, 1, 100);
    U.$('#m-tr', box).innerHTML = o.tr.map(t => UI.traitChip(t, false, false)).join('') || '<p class="empty" style="margin:0">なし</p>';
    U.$('#m-trn', box).textContent = o.tr.length;
    prev.innerHTML = ''; if (o.n) prev.append(PORT.canvas({ n: o.n, sei: o.n.slice(0, 1), c: o.c, r: o.r, bu: o.bu, chi: o.chi, tou: o.tou, mi: o.mi, st: o.st, age: o.age }, 64));
    ok.disabled = !(o.n.length >= 1 && o.n.length <= 8);
  };
  for (const el of U.$$('input,select', box)) el.oninput = upd;
  U.$('#m-pick', box).onclick = async () => { const r = await UI.traitPicker({ selected: o.tr, max: 3, custom: false, cfg: { traits: o.tr, stats: {} } }); if (r) o.tr = r.slice(0, 3); upd(); };
  const row = U.h('div', { style: { display: 'flex', gap: '8px', marginTop: '14px' } });
  const ok = U.h('button', { class: 'btn seal', style: { flex: '1' } }, 'この人物を加える'); ok.onclick = () => { upd(); if (!ok.disabled) close(o); };
  const c = U.h('button', { class: 'btn' }, 'やめる'); c.onclick = () => close(null);
  row.append(ok, c); box.append(row);
  upd();
}, { stack: true });
// 事件を作る（簡単な作り：題・本文・条件・選択肢三つまで、効果二つまで）
UI.MOD_FX = [['gold', '金'], ['food', '兵糧'], ['merit', '功績'], ['fame', '名声'], ['exp_bu', '武の経験'], ['exp_tou', '統の経験'], ['exp_chi', '知の経験'], ['exp_pol', '政の経験'], ['exp_mi', '魅の経験'], ['bond_boss', '上官との絆'], ['bond_ruler', '君主との絆'], ['tr', '練度'], ['troops', '兵（割合%）']];
UI.MOD_WHEN = [['any', 'いつでも'], ['mil', '武官のとき'], ['civ', '文官のとき'], ['jur', '管轄地があるとき'], ['army', '兵がいるとき'], ['winter', '冬'], ['autumn', '秋'], ['high', '将軍・総督以上']];
UI.modEvent = () => UI.modal((box, close) => {
  box.classList.add('tall');
  UI.head(box, { title: '事件を作る', body: '題と本文を書き、選択肢ごとに効果を決める。本文の {name} は主人公の名、{boss} は上官、{ruler} は君主に置き換わる。' });
  const chRow = (i) => `<div class="card" style="margin-top:8px"><div class="field"><label for="m-cl${i}">選択肢${['一', '二', '三'][i]}${i ? '（空なら無し）' : ''}</label><input id="m-cl${i}" maxlength="24" placeholder="${['受けて立つ', '断る', '様子を見る'][i]}"></div>
    ${[0, 1].map(j => `<div class="row" style="gap:6px;margin-top:6px"><select id="m-fk${i}${j}" aria-label="効果の種類"><option value="">効果なし</option>${UI.MOD_FX.map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select><input id="m-fv${i}${j}" type="number" value="0" style="width:6em" aria-label="量"></div>`).join('')}
    <div class="note" style="margin-top:4px">金と兵糧は「格²×量」、功績は「格×量」で伸びる。</div></div>`;
  box.insertAdjacentHTML('beforeend', `<div class="field"><label for="m-t">題</label><input id="m-t" maxlength="16" placeholder="例：旅の商人"></div>
    <div class="field"><label for="m-b">本文</label><textarea id="m-b" rows="3" maxlength="200" placeholder="例：旅の商人が珍しい品を見せに来た。"></textarea></div>
    <div class="grid"><div class="field"><label for="m-w">起きやすさ</label><select id="m-w"><option value="0.5">まれ</option><option value="1" selected>ふつう</option><option value="2">よく</option></select></div>
    <div class="field"><label for="m-when">条件</label><select id="m-when">${UI.MOD_WHEN.map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></div></div>
    ${chRow(0)}${chRow(1)}${chRow(2)}`);
  const row = U.h('div', { style: { display: 'flex', gap: '8px', marginTop: '14px' } });
  const ok = U.h('button', { class: 'btn seal', style: { flex: '1' } }, 'この事件を加える');
  ok.onclick = () => {
    const title = U.$('#m-t', box).value.trim(), body = U.$('#m-b', box).value.trim();
    if (!title || !body) { UI.toast('題と本文を書いて'); return; }
    const when = {}; const wk = U.$('#m-when', box).value;
    if (wk === 'mil') when.track = ['mil']; if (wk === 'civ') when.track = ['civ']; if (wk === 'jur') when.jur = true; if (wk === 'army') when.has = ['army']; if (wk === 'winter') when.months = [10, 11, 12]; if (wk === 'autumn') when.months = [7, 8, 9]; if (wk === 'high') when.tier = [6, 10];
    const choices = [];
    for (let i = 0; i < 3; i++) {
      const label = U.$(`#m-cl${i}`, box).value.trim(); if (!label) continue;
      const fx = [];
      for (let j = 0; j < 2; j++) {
        const k = U.$(`#m-fk${i}${j}`, box).value, v = +U.$(`#m-fv${i}${j}`, box).value || 0; if (!k || !v) continue;
        if (k === 'gold' || k === 'food' || k === 'merit') fx.push([k, (v < 0 ? '-' : '') + 't' + Math.abs(v)]);
        else if (k.startsWith('exp_')) fx.push(['exp', k.slice(4), v]);
        else if (k.startsWith('bond_')) fx.push(['bond', k.slice(5), v]);
        else if (k === 'troops') fx.push(['troops', v / 100]);
        else fx.push([k, v]);
      }
      choices.push({ label, fx });
    }
    if (!choices.length) choices.push({ label: 'なるほど', fx: [] });
    close({ id: 'mod_' + U.uid(), title, body, w: +U.$('#m-w', box).value || 1, when, choices, mod: true });
  };
  const c = U.h('button', { class: 'btn' }, 'やめる'); c.onclick = () => close(null);
  row.append(ok, c); box.append(row);
}, { stack: true });
