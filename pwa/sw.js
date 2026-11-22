/* 地中海覇道 — service worker（オフラインでも遊べるように、ページと絵を保存する） */
const VERSION = '__VERSION__';
const CACHE = 'chichukai-' + VERSION;
const ART = 'chichukai-art-__ASSET_VER__';
const ASSETS = __ASSETS__;
const CORE = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('chichukai-') && k !== CACHE && k !== ART).map((k) => caches.delete(k)))).then(() => self.clients.claim()).then(precacheArt));
});
// 絵の素材：入れ替えたときだけ取り直す（遊びながら少しずつ保存し、全部そろえばオフラインでも絵が出る）
function precacheArt() {
  return caches.open(ART).then(async (c) => {
    for (let i = 0; i < ASSETS.length; i += 8) {
      const part = ASSETS.slice(i, i + 8);
      await Promise.all(part.map((u) => c.match(u).then((hit) => hit || c.add(u).catch(() => {}))));
    }
  }).catch(() => {});
}
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin && url.pathname.includes('/assets/')) {
    e.respondWith(caches.open(ART).then((c) => c.match(req).then((hit) => hit || fetch(req).then((res) => { if (res && res.ok) c.put(req, res.clone()); return res; }))));
    return;
  }
  // ページ本体：まず網から（新しい版を取る）。だめなら保存したもの
  if (req.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/')) {
    e.respondWith(fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; }).catch(() => caches.match(req).then((r) => r || caches.match('./index.html'))));
    return;
  }
  // 字（Google Fonts）と絵：保存したものを返しつつ、裏で新しくする
  if (url.origin === self.location.origin || url.hostname.endsWith('googleapis.com') || url.hostname.endsWith('gstatic.com')) {
    e.respondWith(caches.match(req).then((cached) => {
      const net = fetch(req).then((res) => { if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return res; }).catch(() => cached);
      return cached || net;
    }));
  }
});
