import json, sys
from playwright.sync_api import sync_playwright
speed = int(sys.argv[1]) if len(sys.argv) > 1 else 4
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=True, is_mobile=True)
    page = ctx.new_page()
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
    page.wait_for_timeout(5000)
    page.evaluate(f"V.setSpeed({speed})")
    page.wait_for_timeout(1500)
    r = page.evaluate("""new Promise(res => {
      const acc = { step: 0, render: 0, hud: 0, frames: 0 };
      const os = B.step, orr = V.render, oh = V.hud;
      B.step = function(...a) { const t = performance.now(); const r = os.apply(this, a); acc.step += performance.now() - t; return r; };
      V.render = function(...a) { const t = performance.now(); const r = orr.apply(this, a); acc.render += performance.now() - t; acc.frames++; return r; };
      V.hud = function(...a) { const t = performance.now(); const r = oh.apply(this, a); acc.hud += performance.now() - t; return r; };
      const t0 = performance.now();
      setTimeout(() => { B.step = os; V.render = orr; V.hud = oh; const el = performance.now() - t0; res({ frames: acc.frames, frameMs: +(el / acc.frames).toFixed(1), stepMsPerFrame: +(acc.step / acc.frames).toFixed(2), renderMs: +(acc.render / acc.frames).toFixed(2), hudMsPerFrame: +(acc.hud / acc.frames).toFixed(2) }); }, 3000);
    })""")
    print('speed', speed, json.dumps(r))
    b.close()
