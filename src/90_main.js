/* =========================================================
   地中海覇道 — 保存と起動
   ========================================================= */
const SAVE = {
  KEY: 'chichukai.v1.',
  SLOTS: ['auto', '1', '2', '3'],
  cloud: null, uid: null, cloudTried: false,
  async initCloud() {
    if (SAVE.cloudTried) return; SAVE.cloudTried = true;
    try {
      if (!window.claude || typeof window.claude.use !== 'function') return;
      const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
      if (!db || !user || typeof user.id !== 'function') return;
      const uid = await user.id();
      if (!uid) return;
      SAVE.cloud = db; SAVE.uid = uid;
    } catch (e) { SAVE.cloud = null; }
  },
  ref(slot) { return SAVE.cloud.collection('data/users/' + SAVE.uid).doc('save-' + slot); },
  async pack(json) {
    try {
      if (typeof CompressionStream === 'function') {
        const cs = new CompressionStream('gzip');
        const buf = await new Response(new Blob([json]).stream().pipeThrough(cs)).arrayBuffer();
        let bin = ''; const bytes = new Uint8Array(buf);
        for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
        return 'gz:' + btoa(bin);
      }
    } catch (e) {}
    return 'raw:' + btoa(unescape(encodeURIComponent(json)));
  },
  async unpack(str) {
    str = String(str || '').trim();
    if (str.startsWith('{')) return str;
    if (str.startsWith('gz:')) {
      const bin = atob(str.slice(3)); const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const ds = new DecompressionStream('gzip');
      return await new Response(new Blob([bytes]).stream().pipeThrough(ds)).text();
    }
    if (str.startsWith('raw:')) return decodeURIComponent(escape(atob(str.slice(4))));
    throw new Error('読み込めない形式です');
  },
  meta() { const o = S.myOff(); return { date: S.dateStr(), name: o.n, rank: S.rankLabel(), c: S.cname(o.c), ts: Date.now() }; },
  _chain: {},
  async save(slot) {
    if (!G) return false;
    const data = await SAVE.pack(S.serialize());
    const rec = { meta: SAVE.meta(), data };
    let ok = false;
    try { localStorage.setItem(SAVE.KEY + slot, JSON.stringify(rec)); ok = true; } catch (e) {}
    if (SAVE.cloud) {
      // 同じ文書への書き込みは一つずつ
      const p = (SAVE._chain[slot] || Promise.resolve()).then(() => SAVE.ref(slot).set(rec)).then(() => true, () => false);
      SAVE._chain[slot] = p;
      if (!ok) ok = await p;
    }
    return ok;
  },
  async read(slot) {
    let loc = null, cl = null;
    try { const s = localStorage.getItem(SAVE.KEY + slot); if (s) loc = JSON.parse(s); } catch (e) {}
    await Promise.race([SAVE.ready || Promise.resolve(), U.sleep(1500)]);
    if (SAVE.cloud) { try { const snap = await Promise.race([SAVE.ref(slot).get(), U.sleep(4000).then(() => null)]); if (snap && snap.exists) cl = snap.data(); } catch (e) {} }
    if (loc && cl) return (cl.meta?.ts || 0) > (loc.meta?.ts || 0) ? cl : loc;
    return loc || cl;
  },
  async list() {
    const out = [];
    for (const s of SAVE.SLOTS) { const r = await SAVE.read(s); if (r && r.meta) out.push({ slot: s, meta: r.meta }); }
    return out;
  },
  async hasAny() { try { for (const s of SAVE.SLOTS) if (localStorage.getItem(SAVE.KEY + s)) return true; } catch (e) {} const l = await Promise.race([SAVE.list(), U.sleep(2500).then(() => [])]); return l.length > 0; },
  async load(slot) {
    const r = await SAVE.read(slot);
    if (!r) throw new Error('セーブが見つかりません');
    const json = await SAVE.unpack(r.data);
    await SAVE.waitMap();
    S.load(json);
    return true;
  },
  // 古いセーブの郡を拠点に分けるには地図（県・郷）が要る
  async waitMap() { if (typeof GEO !== 'undefined' && !GEO.built) { UI.toast('地中海の地図を描いています…'); await Promise.race([MAP.init(), U.sleep(30000)]); } },
  auto() { return SAVE.save('auto'); },
};

UI.saveMenu = async () => {
  const list = await SAVE.list();
  const by = Object.fromEntries(list.map(x => [x.slot, x.meta]));
  const ch = ['1', '2', '3'].map(s => ({ v: s, label: `枠${s}に保存`, sub: by[s] ? `${by[s].c}・${by[s].name}（${by[s].rank}）${by[s].date}` : '空き' }));
  ch.push({ v: 'export', label: 'セーブを書き出す', sub: '文字列をコピーして、別の端末で読み込める' });
  ch.push({ v: null, label: 'やめる' });
  const k = await UI.choose({ title: '保存', body: SAVE.cloud ? '保存は端末とアカウントの両方に残る。' : '保存はこの端末のブラウザに残る。念のため書き出しもしておくと安心。', choices: ch });
  if (!k) return;
  if (k === 'export') { const code = await SAVE.pack(S.serialize()); return UI.copyBox({ title: 'セーブの書き出し', body: 'この文字列を保管しておけば、「セーブを読み込む」から再開できる。', text: code, readonly: true }); }
  const ok = await SAVE.save(k);
  UI.toast(ok ? `枠${k}に保存した` : '保存できなかった（書き出しを使って）');
};
UI.loadMenu = async (withImport) => {
  const list = await SAVE.list();
  const ch = list.map(x => ({ v: x.slot, label: `${x.slot === 'auto' ? '自動保存' : '枠' + x.slot}：${x.meta.c}・${x.meta.name}`, sub: `${x.meta.rank}　${x.meta.date}` }));
  if (withImport) ch.push({ v: 'import', label: '書き出した文字列から読み込む' });
  ch.push({ v: null, label: 'やめる' });
  const k = await UI.choose({ title: '読み込み', body: list.length ? '' : '保存されたデータがない。', choices: ch });
  if (!k) return;
  try {
    if (k === 'import') {
      const code = await UI.copyBox({ title: 'セーブを読み込む', body: '書き出した文字列を貼り付ける。', text: '' });
      if (!code) return;
      const json = await SAVE.unpack(code); await SAVE.waitMap(); S.load(json);
    } else await SAVE.load(k);
    UI.map.cam = null;
    UI.main('map');
    UI.toast(`${S.dateStr()}から再開`);
  } catch (e) { UI.info({ title: '読み込めなかった', body: e.message }); }
};

/* ---------- 合戦との接続 ---------- */
HOOK.battle = async (spec) => {
  // 出撃する部隊を選ぶ（大きな軍のとき）
  if (UI.wantSortie(spec)) {
    const A2 = G.me.army;
    const pick = A2.sortieAsk === false ? W.sortiePick(spec, A2.sortiePre || 'auto') : await UI.sortie(spec);
    if (pick) spec = W.rebuildSpec(spec, pick);
  }
  // 戦場を選ぶ（統率の高い将が候補から選び、有利な側に布陣する）
  try { spec = await UI.fieldChoice(spec); } catch (e) { console.warn(e); }
  const res = await V.run(spec);
  if (G) { UI.show('main'); UI.refresh(); }
  return res;
};
HOOK.choose = (o) => UI.choose(o);
HOOK.info = (o) => UI.info(o);
HOOK.fame = (o) => UI.fame(o);
HOOK.cutin = (o) => UI.cutin(o);
HOOK.number = (o) => UI.askNumber(o);
HOOK.duel = (o) => UI.duel(o);

/* ---------- アプリとして（service worker・ホーム画面に追加） ---------- */
const PWA = {
  prompt: null, standalone: false,
  init() {
    try { PWA.standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true; } catch (e) {}
    try {
      if ('serviceWorker' in navigator && /^https?:/.test(location.protocol) && !/claude\.ai|claudeusercontent/.test(location.hostname)) navigator.serviceWorker.register('./sw.js').catch(() => {});
    } catch (e) {}
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); PWA.prompt = e; PWA.banner(); });
  },
  // タイトル画面に、ホーム画面へ入れる案内を出す
  banner() {
    if (PWA.standalone || UI.cur !== 'title') return;
    try { const t = +localStorage.getItem('chichukai.installHint') || 0; if (Date.now() - t < 7 * 864e5) return; } catch (e) {}
    const root = U.$('#scr-title'); if (!root || U.$('.install', root)) return;
    const ios = /iP(hone|ad|od)/.test(navigator.userAgent) && !window.MSStream;
    if (!PWA.prompt && !ios) return;
    const el = U.h('div', { class: 'install', role: 'note' },
      U.h('img', { src: 'icons/icon-192.png', alt: '', onerror: (e) => { e.target.hidden = true; } }),
      U.h('div', { class: 't' }, U.h('b', {}, 'アプリとして遊べます'), ios ? '共有ボタン → 「ホーム画面に追加」で全画面になります。' : 'ホーム画面に入れると全画面で、オフラインでも遊べます。'),
      PWA.prompt ? U.h('button', { class: 'btn sm pri', onclick: async () => { try { PWA.prompt.prompt(); await PWA.prompt.userChoice; } catch (e) {} PWA.prompt = null; el.remove(); } }, '入れる') : null,
      U.h('button', { class: 'x', 'aria-label': '閉じる', onclick: () => { el.remove(); try { localStorage.setItem('chichukai.installHint', String(Date.now())); } catch (e) {} } }, '✕'));
    root.append(el);
  },
};

/* ---------- 起動 ---------- */
window.addEventListener('error', (e) => { try { UI.toast('エラー：' + (e.message || '')); } catch (x) {} });
window.addEventListener('unhandledrejection', (e) => { try { UI.toast('エラー：' + (e.reason && e.reason.message || '')); } catch (x) {} });
SAVE.ready = SAVE.initCloud();
try { window.claude?.hot?.snapshot?.(() => (G ? { save: S.serialize(), tab: UI.curTab || 'map' } : {})); } catch (e) {}
const boot = (data) => {
  try { PORT.watch(); } catch (e) { console.warn(e); }
  try { PWA.init(); } catch (e) { console.warn(e); }
  try { UI.applyScale(); } catch (e) { console.warn(e); }
  try { S.ctrBoot(); } catch (e) { console.warn(e); }
  try { MAP.init(); } catch (e) { console.warn(e); }
  try {
    if (data && data.save) { S.load(data.save); UI.main(data.tab || 'map'); return; }
  } catch (e) {}
  UI.title();
};
try {
  if (window.claude?.hot?.ready) window.claude.hot.ready(boot);
  else boot(window.claude?.hot?.data ?? {});
} catch (e) { boot({}); }
