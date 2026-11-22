import json, time, sys
from playwright.sync_api import sync_playwright
act = sys.argv[1] if len(sys.argv) > 1 else 'kunren'
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=1, has_touch=True, is_mobile=True)
    page = ctx.new_page()
    page.on('console', lambda m: print('console', m.type, m.text[:300], flush=True))
    page.on('pageerror', lambda e: print('pageerror', e, flush=True))
    page.route('**/fonts.googleapis.com/**', lambda r: r.abort())
    page.route('**/fonts.gstatic.com/**', lambda r: r.abort())
    page.goto('file:///home/claude/roma/test/page.html'); print('loaded', flush=True)
    page.wait_for_timeout(400)
    page.click('#t-new'); page.click('.pick[data-c="rome"]'); page.click('#s-next'); page.click('.pick[data-r="goch"]'); page.click('#s-next')
    page.wait_for_timeout(200)
    page.click('#e-start'); page.wait_for_timeout(500)
    for i in range(3):
        if page.locator('.modal button:not([disabled])').count(): page.locator('.modal button:not([disabled])').first.click(); page.wait_for_timeout(200)
    print('modals', page.evaluate("document.querySelectorAll('.modal').length"), flush=True)
    page.evaluate(f"void UI.runAct('{act}')")
    page.wait_for_timeout(1000)
    print(page.evaluate("(() => { const m = document.querySelector('.modal'); return m ? m.outerHTML.slice(0, 3000) : 'none'; })()"), flush=True)
    page.screenshot(path='/home/claude/roma/test/shots/dbg_act.png')
    chs = page.locator('.modal .ch:not([disabled])')
    print('ch count', chs.count(), flush=True)
    t0 = time.time()
    try:
        chs.nth(0).click(timeout=5000)
        print('clicked', time.time() - t0, flush=True)
    except Exception as e:
        print('click fail', str(e)[:500], flush=True)
    page.wait_for_timeout(1000)
    print(page.evaluate("(() => { const m = document.querySelector('.modal'); return m ? m.outerHTML.slice(0, 1500) : 'none'; })()"), flush=True)
    b.close()
