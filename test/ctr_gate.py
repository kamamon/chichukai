import json
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
    page.evaluate("""(() => { S.newGame({ country: 'rome', rank: 'goch', min: 'chiso', sei: '李', mei: '信', age: 20, stats: { bu: 70, tou: 60, chi: 50, pol: 40, mi: 50 }, traits: ['kobu'], style: 'ins', diff: 1 }); S.ctrPut({ id: 'cx_test1', n: '剣聖', fx: { bu: 30, duel: 2 } }); UI.main('ppl'); })()""")
    page.wait_for_timeout(300)
    print('mode before', page.evaluate('G.mode'))
    page.click('#p-ctr'); page.wait_for_timeout(300)
    page.locator('.modal .ctr-card', has_text='剣聖').locator('.btn.pri').first.click(); page.wait_for_timeout(200)
    print('gate shown', page.locator('.modal .ctr-gate').count())
    page.screenshot(path='/home/claude/roma/test/shots/c_10gate.png')
    page.locator('.modal .ctr-bottom .btn.seal').click(); page.wait_for_timeout(200)
    page.locator('.modal .ctr-wrow').first.locator('.btn').click(); page.wait_for_timeout(200)
    print('mode after', page.evaluate('G.mode'), 'traits', page.evaluate("S.myOff().tr"), 'bu', page.evaluate("S.stat(S.myOff(), 'bu')"))
    page.locator('.modal .ctr-bottom .btn.seal').click(); page.wait_for_timeout(150)
    page.locator('.modal .ctr-bottom .btn.seal').click(); page.wait_for_timeout(300)
    page.screenshot(path='/home/claude/roma/test/shots/c_11ppl.png')
    # 一騎打ちで武力が効いているか
    page.evaluate("""void UI.duel({ a: W.snap(S.myOff()), b: { n: '王翦', sei: '王', bu: 86, chi: 97, tr: [], st: 'chi' }, title: '試し' }).then(r => window._d = r)""")
    for i in range(16):
        if page.evaluate('!!window._d'): break
        btn = page.locator('#d-acts button:not([disabled])')
        if btn.count(): btn.first.click()
        page.wait_for_timeout(150)
    page.wait_for_timeout(1200)
    print('duel', page.evaluate('window._d'))
    print('ERRORS:', json.dumps(errors, ensure_ascii=False))
    b.close()
