import sys, json, os
from playwright.sync_api import sync_playwright
OUT = '/home/claude/roma/test/shots/'
pid = sys.argv[1] if len(sys.argv) > 1 else 'carthago'
kind = sys.argv[2] if len(sys.argv) > 2 else 'field'
troops = int(sys.argv[3]) if len(sys.argv) > 3 else 20000
frm = sys.argv[4] if len(sys.argv) > 4 else ''
weather = sys.argv[5] if len(sys.argv) > 5 else ''
W_, H_ = 390, 844
errors = []
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': W_, 'height': H_}, device_scale_factor=2, has_touch=True, is_mobile=True)
    page = ctx.new_page()
    page.on('console', lambda m: errors.append(f'[{m.type}] {m.text}') if m.type in ('error', 'warning') and 'ERR_FAILED' not in m.text else None)
    page.on('pageerror', lambda e: errors.append(f'[pageerror] {e}'))
    page.route('**/fonts.googleapis.com/**', lambda r: r.abort())
    page.route('**/fonts.gstatic.com/**', lambda r: r.abort())
    page.goto('file:///home/claude/roma/test/page.html')
    page.wait_for_function('typeof MAP !== "undefined" && MAP.ready', timeout=30000)
    js = f"""
    (() => {{
      const cfg = {{ country: 'rome', rank: 'shog', min: 'chiso', sei: '李', mei: '信', age: 20, stats: {{ bu: 88, tou: 70, chi: 62, pol: 40, mi: 60 }}, traits: ['kobu'], style: 'ins', diff: 1 }};
      S.newGame(cfg);
      UI.main('map');
      const me = S.myOff();
      const pid = '{pid}', ec = G.prov[pid].o === me.c ? 'carth' : G.prov[pid].o;
      const spec = W.buildSpec({{ kind: '{kind}', pid, from: '{frm}' || null, title: 'テスト合戦', A: {{ c: me.c, troops: {troops}, cmd: me, officers: [] }}, B: {{ c: ec, troops: {troops}, cmd: S.bestGeneral(ec), officers: [] }}, me: 'A', role: 'commander', cityOf: '{kind}' === 'siege' || '{kind}' === 'pass' ? 'B' : null, weather: '{weather}' || undefined }});
      window._spec = spec;
      G.me.army.sortieAsk = false; G.me.army.sortiePre = 'all';
      HOOK.battle(spec).then(r => {{ window._res = r; }});
      return {{ theme: spec.theme, site: spec.site && {{ town: spec.site.town, river: spec.site.river && spec.site.river.n, road: !!spec.site.road, forest: +spec.site.forest.toFixed(2), farm: +spec.site.farm.toFixed(2), v: spec.site.vlist.length }}, weather: spec.weather }};
    }})()
    """
    print(json.dumps(page.evaluate(js), ensure_ascii=False))
    page.wait_for_timeout(500)
    print(json.dumps(page.evaluate("(() => { const bt = V.bt; return { W: Math.round(bt.W), feat: { river: !!bt.feat.river, streams: bt.feat.streams.length, roads: bt.feat.roads.length, villages: bt.feat.villages.map(v => v.n), ponds: bt.feat.ponds.length } }; })()"), ensure_ascii=False))
    def wait_tiles():
        for k in range(100):
            page.wait_for_timeout(120)
            if page.evaluate('V.ft ? V.ft.busy + V.ft.want.length : 0') == 0: break
        page.wait_for_timeout(150)
    page.evaluate("(() => { const d = document.querySelector('#bt-deploy'); if (d) d.style.display = 'none'; const p = document.querySelector('#bt-panel'); if (p) p.style.opacity = '0.25'; })()")
    def shot(name, zf, fx=0.5, fy=0.5):
        page.evaluate(f"(() => {{ const bt = V.bt; V.fitCamera(); V.cam.z *= {zf}; V.cam.x = bt.W * {fx}; V.cam.y = bt.H * {fy}; V.clampCam(); }})()")
        wait_tiles()
        page.screenshot(path=OUT + name)
        print(name, 'level', page.evaluate('V.ft ? V.ft.levelFor(V.cam.z * V.dpr * V.bt.fine.cell) : -1'), 'tiles', page.evaluate('V.ft ? V.ft.tiles.size : 0'))
    shot(f'f_{pid}_0fit.png', 1)
    shot(f'f_{pid}_1z3.png', 3, 0.5, 0.55)
    shot(f'f_{pid}_2z8.png', 8, 0.5, 0.6)
    shot(f'f_{pid}_3z20.png', 20, 0.5, 0.62)
    # village close-up
    vx = page.evaluate("(() => { const v = V.bt.feat.villages[0]; return v ? [v.x / V.bt.W, v.y / V.bt.H] : null; })()")
    if vx: shot(f'f_{pid}_4vil.png', 14, vx[0], vx[1])
    tm = page.evaluate("(() => { const t = performance.now(); for (let i = 0; i < 20; i++) V.render(); return (performance.now() - t) / 20; })()")
    print('render ms', round(tm, 2))
    print('ERRORS', errors[:10])
    b.close()
