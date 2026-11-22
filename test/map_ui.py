import json, sys, time
from playwright.sync_api import sync_playwright
OUT = '/home/claude/roma/test/shots/'
errors = []
W, H, DPR = (int(sys.argv[1]), int(sys.argv[2]), float(sys.argv[3])) if len(sys.argv) > 3 else (390, 844, 2)
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=DPR, has_touch=True, is_mobile=W < 600)
    page = ctx.new_page()
    page.on('console', lambda m: errors.append(f'[{m.type}] {m.text}') if m.type in ('error', 'warning') and 'ERR_FAILED' not in m.text else None)
    page.on('pageerror', lambda e: errors.append(f'[pageerror] {e}'))
    page.route('**/fonts.googleapis.com/**', lambda r: r.abort())
    page.route('**/fonts.gstatic.com/**', lambda r: r.abort())
    t0 = time.time()
    page.goto('file:///home/claude/roma/test/page.html')
    page.wait_for_function('typeof MAP !== "undefined" && MAP.ready', timeout=30000)
    print('geo ready after', round(time.time() - t0, 2), 's; worker:', page.evaluate('!!GEO.worker'), 'buildMs', page.evaluate('GEO.buildMs'))
    page.wait_for_timeout(1500)
    page.screenshot(path=OUT + 'map_0title.png')
    page.click('#t-new'); page.click('.pick[data-c="carth"]'); page.click('#s-next'); page.click('.pick[data-r="shog"]'); page.click('#s-next')
    page.wait_for_timeout(300)
    page.click('#e-start'); page.wait_for_timeout(800)
    for i in range(5):
        if page.locator('.modal .btn.seal').count(): page.locator('.modal .btn.seal').first.click(); page.wait_for_timeout(200)
    page.wait_for_timeout(500)
    def shot(name, x, y, z):
        page.evaluate(f"(() => {{ const m = UI.map; m.cam.x = {x}; m.cam.y = {y}; m.cam.s = m.fitS() * {z}; m.clamp(); m.draw(); }})()")
        # wait for tiles
        for k in range(60):
            page.wait_for_timeout(150)
            busy = page.evaluate('MAP.busyCount()')
            if busy == 0: break
        page.evaluate('UI.map.draw()')
        page.wait_for_timeout(100)
        page.screenshot(path=OUT + name)
        print(name, 'tiles', page.evaluate('MAP.world.tiles.size'), 'level', page.evaluate('MAP.world.levelFor(UI.map.cam.s * UI.map.dpr)'))
    shot('map_1fit.png', 500, 360, 1)
    shot('map_2z2.png', 560, 300, 2.2)
    shot('map_3z5.png', 572, 290, 5)
    shot('map_4z12.png', 572, 290, 12)
    shot('map_5z25.png', 575, 295, 25)
    shot('map_6max.png', 573, 292, 60)
    shot('map_7guanzhong.png', 300, 335, 8)
    shot('map_8loess.png', 330, 210, 14)
    shot('map_9coast.png', 840, 300, 10)
    # draw timing
    tm = page.evaluate("(() => { const t = performance.now(); for (let i = 0; i < 10; i++) UI.map.draw(); return (performance.now() - t) / 10; })()")
    print('draw ms', round(tm, 2))
    page.evaluate("(() => { const m = UI.map; m.cam.s = m.fitS(); m.cam.x = 500; m.cam.y = 360; })()")
    tm = page.evaluate("(() => { const t = performance.now(); for (let i = 0; i < 10; i++) UI.map.draw(); return (performance.now() - t) / 10; })()")
    print('draw ms fit', round(tm, 2))
    # tap a province region
    page.evaluate("(() => { const m = UI.map; m.cam.x = 572; m.cam.y = 290; m.cam.s = m.fitS() * 6; m.draw(); })()")
    page.mouse.click(W / 2 + 40, H / 2 + 30)
    page.wait_for_timeout(300)
    page.screenshot(path=OUT + 'map_10tap.png')
    print('ERRORS', errors[:12])
    b.close()
