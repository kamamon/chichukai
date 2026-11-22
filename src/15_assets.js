/* =========================================================
   地中海覇道 — 外で作った絵（assets/）。
   build.sh が assets/ の中身を ASSET_LIST に書き出す。無い絵は今までどおりプログラムで描く。
   設定「絵の素材」で使わない（軽い表示）にもできる。
   ========================================================= */
const ASSET = (() => {
  const LIST = typeof ASSET_LIST !== 'undefined' ? ASSET_LIST : {};
  const BASE = typeof ASSET_BASE !== 'undefined' ? ASSET_BASE : 'assets/';
  const imgs = new Map();
  let onCache = null;
  const A = {
    count: Object.keys(LIST).length,
    on() { if (onCache == null) { try { onCache = localStorage.getItem('chichukai.art') !== '0'; } catch (e) { onCache = true; } } return onCache && A.count > 0; },
    set(v) { onCache = !!v; try { localStorage.setItem('chichukai.art', v ? '1' : '0'); } catch (e) {} },
    has: (k) => A.on() && !!LIST[k],
    url: (k) => (A.has(k) ? BASE + LIST[k] : null),
    // 読み込み済みの絵（なければ null を返し、読み込みを始める）
    img(k, cb) {
      if (!A.has(k)) return null;
      let r = imgs.get(k);
      if (!r) {
        r = { im: new Image(), ok: false, bad: false, cbs: [] };
        r.im.decoding = 'async';
        r.im.onload = () => { r.ok = true; const f = r.cbs; r.cbs = []; for (const x of f) try { x(r.im); } catch (e) {} };
        r.im.onerror = () => { r.bad = true; const f = r.cbs; r.cbs = []; for (const x of f) try { x(null); } catch (e) {} };
        r.im.src = BASE + LIST[k];
        imgs.set(k, r);
      }
      if (r.ok) return r.im;
      if (cb && !r.bad) r.cbs.push(cb);
      return null;
    },
    preload: (keys) => Promise.all(keys.filter(A.has).map((k) => new Promise((res) => { if (A.img(k, res)) res(); else setTimeout(res, 9000); }))),
    keys: (prefix) => Object.keys(LIST).filter((k) => k.startsWith(prefix)),
    // 地面40種の名（D.TILE の順）
    TILE: ['plain', 'rough', 'forest', 'hill', 'mountain', 'river', 'ford', 'marsh', 'road', 'wall', 'gate', 'city', 'burnt', 'path', 'gate_broken', 'field', 'irrigated', 'village', 'brook', 'grove', 'rocks', 'pond', 'sand', 'bridge', 'steppe', 'sea', 'shallow_sea', 'cliff', 'dunes', 'orchard', 'palisade', 'ditch', 'abatis', 'boulder', 'wagon_fort', 'stone_wall', 'ruins', 'houses', 'temple', 'plaza'],
    tileKey: (t) => 'ground/detail_' + String(t).padStart(2, '0') + '_' + A.TILE[t],
    // 小さく縮めた絵（毎回の縮小を避ける）
    _small: new Map(),
    small(k, size) {
      const key = k + '|' + size; let c = A._small.get(key);
      if (c) return c;
      const im = A.img(k); if (!im) return null;
      c = document.createElement('canvas'); c.width = size; c.height = Math.round(size * im.naturalHeight / im.naturalWidth);
      const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(im, 0, 0, c.width, c.height);
      A._small.set(key, c); return c;
    },
  };
  return A;
})();
