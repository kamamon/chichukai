import json, os
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
    page.wait_for_function("typeof GEO !== 'undefined' && GEO.built", timeout=60000)
    page.wait_for_timeout(1500)
    page.screenshot(path=OUT + 'v_title.png')
    page.evaluate("""(() => { S.newGame({ country: 'carth', rank: 'guns', min: 'chiso', sei: '龐', mei: '暖', age: 30, stats: { bu: 95, tou: 80, chi: 60, pol: 40, mi: 60 }, traits: ['moushou', 'ikkigake'], style: 'ins', diff: 1 }); G.cty.rome.weary = 0.42; G.cty.ptol.weary = 0.05; UI.main('dom'); })()""")
    page.wait_for_timeout(500)
    for sub in ['land', 'jur', 'nat', 'world']:
        btn = page.locator(f'.tabs button[data-s="{sub}"]')
        if btn.count():
            btn.click(); page.wait_for_timeout(250)
            page.screenshot(path=OUT + f'v_dom_{sub}.png', full_page=False)
    # 郡を2つまで減らして存亡表示
    page.evaluate("""(() => { const ps = S.ownedProvs('ptol'); for (const p of ps.slice(2)) W.capture(p.id, 'rome', 'ptol'); UI.domSub = 'world'; UI.main('dom'); })()""")
    page.wait_for_timeout(300)
    page.screenshot(path=OUT + 'v_dom_world2.png')
    print('ERRORS:', json.dumps(errors[:20], ensure_ascii=False, indent=1))
    b.close()
