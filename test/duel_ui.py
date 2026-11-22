import sys, json
from playwright.sync_api import sync_playwright
OUT = '/home/claude/roma/test/shots/'
errors = []
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=True, is_mobile=True)
    page = ctx.new_page()
    page.on('console', lambda m: errors.append(f'[{m.type}] {m.text}') if m.type == 'error' and 'ERR_FAILED' not in m.text else None)
    page.on('pageerror', lambda e: errors.append(f'[pageerror] {e}'))
    page.route('**/fonts.googleapis.com/**', lambda r: r.abort())
    page.route('**/fonts.gstatic.com/**', lambda r: r.abort())
    page.goto('file:///home/claude/roma/test/page.html')
    page.wait_for_timeout(300)
    page.evaluate("""S.newGame({ country: 'carth', rank: 'shog', min: 'chiso', sei: '李', mei: '牧', age: 42, stats: { bu: 92, tou: 90, chi: 75, pol: 50, mi: 70 }, traits: ['moushou'], style: 'ins', diff: 1 }); UI.main('map');""")
    page.evaluate("""(() => { const me = W.snap(S.myOff()); const foe = W.snap(S.bestGeneral('rome')); foe.bu = 85; window._dr = null; UI.duel({ a: me, b: foe, ac: 'carth', bc: 'rome', title: '一騎打ち', battle: true, mounted: true }).then(r => window._dr = r); })()""")
    page.wait_for_timeout(600)
    page.screenshot(path=OUT + 'd_intro.png')
    page.wait_for_timeout(2600)
    page.screenshot(path=OUT + 'd_ready.png')
    # one exchange
    page.click('#d-acts button[data-k="pow"]')
    page.wait_for_timeout(520)
    page.screenshot(path=OUT + 'd_clash.png')
    page.wait_for_timeout(900)
    page.screenshot(path=OUT + 'd_after.png')
    # finish with auto
    shot_fin = False
    for i in range(16):
        if page.evaluate("window._dr !== null"): break
        btn = page.locator('#d-auto')
        if btn.count() and btn.is_enabled(): btn.click()
        for j in range(12):
            page.wait_for_timeout(150)
            if not shot_fin and page.evaluate("!!document.querySelector('#d-kanji:not([hidden])')"):
                page.wait_for_timeout(1300); page.screenshot(path=OUT + 'd_finish.png'); shot_fin = True
            if page.evaluate("window._dr !== null"): break
    page.wait_for_timeout(300)
    page.screenshot(path=OUT + 'd_end.png')
    print('result', page.evaluate("JSON.stringify(window._dr)"))
    print('errors', errors)
    b.close()
