import sys, json
from playwright.sync_api import sync_playwright
OUT = '/home/claude/roma/test/shots/'
kind = sys.argv[1] if len(sys.argv) > 1 else 'field'
troops = int(sys.argv[2]) if len(sys.argv) > 2 else 20000
errors = []
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=True, is_mobile=True)
    page = ctx.new_page()
    page.on('console', lambda m: errors.append(f'[{m.type}] {m.text}') if m.type in ('error', 'warning') and 'ERR_FAILED' not in m.text else None)
    page.on('pageerror', lambda e: errors.append(f'[pageerror] {e}'))
    page.route('**/fonts.googleapis.com/**', lambda r: r.abort())
    page.route('**/fonts.gstatic.com/**', lambda r: r.abort())
    page.goto('file:///home/claude/roma/test/page.html')
    page.wait_for_timeout(300)
    page.evaluate("MAP.init()")
    page.wait_for_function("MAP.ready === true", timeout=60000)
    page.evaluate("""S.newGame({ country: 'rome', rank: 'shog', min: 'chiso', sei: '李', mei: '信', age: 30, stats: { bu: 88, tou: 70, chi: 62, pol: 40, mi: 60 }, traits: ['kobu'], style: 'ins', diff: 1 }); UI.main('map');""")
    page.evaluate(f"""(() => {{ G.me.army.sortieAsk = false; G.me.army.sortiePre = 'all'; localStorage.setItem('chichukai.view3d', '1'); const me = S.myOff(); const pid = 'carthago'; const ec = 'carth';
      const spec = W.buildSpec({{ kind: '{kind}', pid, title: '邯鄲の戦い', A: {{ c: me.c, troops: {troops}, cmd: me, officers: [] }}, B: {{ c: ec, troops: {troops}, cmd: S.bestGeneral(ec), officers: [] }}, me: 'A', role: 'commander', cityOf: '{kind}' === 'siege' || '{kind}' === 'pass' ? 'B' : null }});
      window._spec = spec; HOOK.battle(spec).then(r => window._res = r); }})()""")
    page.wait_for_timeout(1500)
    print('view3d', page.evaluate("V.ui.view3d"), 'stats', page.evaluate("JSON.stringify(V3.stats)"))
    page.screenshot(path=OUT + 'b3_deploy.png')
    # 開戦（カットインはタップで飛ばす）
    page.click('#dep-go'); page.wait_for_timeout(700)
    if page.locator('.cutin').count(): page.locator('.cutin').tap()
    page.wait_for_timeout(600)
    page.evaluate("V.setSpeed(2)")
    page.wait_for_timeout(2500)
    print('stats', page.evaluate("JSON.stringify(V3.stats)"), 'q', page.evaluate("V3.quality"))
    page.screenshot(path=OUT + 'b3_run.png')
    # ズームイン＋回転
    page.evaluate("(() => { const me = V.bt.units.find(u => u.me); V3.centerOn(me, 1); V3.cam.dist = V.bt.W * 0.22; V3.cam.yaw = 0.6; V3.cam.pitch = 0.6; V3.clamp(); V3.setup(); })()")
    page.wait_for_timeout(600)
    print('stats', page.evaluate("JSON.stringify(V3.stats)"))
    page.screenshot(path=OUT + 'b3_close.png')
    # 城（攻城戦のとき）
    if page.evaluate("!!V.bt.city"):
        page.evaluate("(() => { const c = V.bt.city; V3.cam.x = c.x; V3.cam.y = c.y + V.bt.H * 0.08; V3.cam.dist = V.bt.W * 0.45; V3.cam.yaw = 0; V3.cam.pitch = 0.75; V3.clamp(); V3.setup(); })()")
        page.wait_for_timeout(400)
        page.screenshot(path=OUT + 'b3_city.png')
    # 俯瞰（高い）
    page.evaluate("(() => { V3.fit(); V3.cam.pitch = 1.3; V3.clamp(); V3.setup(); })()")
    page.wait_for_timeout(400)
    page.screenshot(path=OUT + 'b3_top.png')
    # タップで選択・移動
    page.evaluate("V.setSpeed(0)")
    me_pos = page.evaluate("(() => { const me = V.bt.units.find(u => u.me); const p = V3.project(me.x, me.y); return p ? [p[0], p[1]] : null; })()")
    print('me on screen', me_pos)
    if me_pos:
        page.touchscreen.tap(me_pos[0], me_pos[1]); page.wait_for_timeout(300)
        print('selected', page.evaluate("[...V.ui.sel]"))
        page.touchscreen.tap(195, 300); page.wait_for_timeout(300)
        print('order', page.evaluate("(() => { const me = V.bt.units.find(u => u.me); return me.order && me.order.type; })()"))
    page.screenshot(path=OUT + 'b3_sel.png')
    # perf sample
    t = page.evaluate("""(async () => { const t0 = performance.now(); let n = 0; const ms = []; while (performance.now() - t0 < 1500) { const a = performance.now(); V.render(); ms.push(performance.now() - a); n++; await new Promise(r => setTimeout(r, 0)); } ms.sort((a, b) => a - b); return { n, med: ms[ms.length >> 1].toFixed(1), p90: ms[Math.floor(ms.length * 0.9)].toFixed(1), stats: V3.stats }; })()""")
    print('perf', json.dumps(t))
    print('errors', errors[:5])
    b.close()
