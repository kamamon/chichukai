import json, sys
from playwright.sync_api import sync_playwright
errors = []
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=True, is_mobile=True)
    page = ctx.new_page()
    page.on('pageerror', lambda e: errors.append(f'[pageerror] {e}'))
    page.route('**/fonts.googleapis.com/**', lambda r: r.abort())
    page.route('**/fonts.gstatic.com/**', lambda r: r.abort())
    page.goto('file:///home/claude/roma/test/page.html')
    page.wait_for_function("typeof GEO !== 'undefined' && GEO.built", timeout=60000)
    page.evaluate("""(() => { S.newGame({ country: 'rome', rank: 'shog', min: 'chiso', sei: '李', mei: '信', age: 20, stats: { bu: 88, tou: 70, chi: 62, pol: 40, mi: 60 }, traits: ['kobu'], style: 'ins', diff: 1 }); UI.main('map');
      const me = S.myOff(); const pid = S.adj(G.me.loc).find(q => G.prov[q].o !== me.c) || G.me.loc;
      const spec = W.buildSpec({ kind: 'field', pid, title: 'T', A: { c: me.c, troops: 40000, cmd: me, officers: [] }, B: { c: 'carth', troops: 35000, cmd: S.bestGeneral('carth'), officers: [] }, me: 'A', role: 'commander' });
      HOOK.battle(spec); })()""")
    page.wait_for_timeout(800)
    page.click('#dep-go')
    page.wait_for_timeout(6000)
    for zoom in ['fit', 'mid', 'close']:
        page.evaluate(f"""(() => {{ const me = V.bt.units.find(u => u.me); if ('{zoom}' === 'fit') V.fitCamera(true); else V.centerOn(me, '{zoom}' === 'mid' ? 0.85 : 0.4); V.setSpeed(0); }})()""")
        page.wait_for_timeout(4000)
        r = page.evaluate("""(() => {
          const parts = ['syncTerrain','drawGround','drawHazards','drawFog','drawUnit','drawProj','drawFx','drawTexts','drawBanner','drawWeather','drawMini'];
          const acc = {}; const orig = {};
          for (const k of parts) { orig[k] = V[k]; acc[k] = 0; V[k] = function(...a) { const t = performance.now(); const r = orig[k].apply(this, a); acc[k] += performance.now() - t; return r; }; }
          const N = 20; const t0 = performance.now();
          for (let i = 0; i < N; i++) V.render();
          const tot = (performance.now() - t0) / N;
          for (const k of parts) V[k] = orig[k];
          const out = { z: +V.cam.z.toFixed(2), total: +tot.toFixed(1) }; for (const k of parts) out[k] = +(acc[k] / N).toFixed(2);
          return out; })()""")
        print(zoom, json.dumps(r))
    print('ERRORS', errors)
    b.close()
