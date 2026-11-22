import json, time
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=1, has_touch=True, is_mobile=True)
    page = ctx.new_page()
    page.on('console', lambda m: print('console', m.type, m.text, flush=True))
    page.on('pageerror', lambda e: print('pageerror', e, flush=True))
    page.route('**/fonts.googleapis.com/**', lambda r: r.abort())
    page.route('**/fonts.gstatic.com/**', lambda r: r.abort())
    page.goto('file:///home/claude/roma/test/page.html'); print('loaded', flush=True)
    page.wait_for_timeout(400)
    page.click('#t-new'); print('new', flush=True)
    page.click('.pick[data-c="rome"]'); page.click('#s-next'); page.click('.pick[data-r="goch"]'); page.click('#s-next'); print('edit', flush=True)
    page.wait_for_timeout(200)
    page.click('#e-start', no_wait_after=True); print('clicked start', flush=True)
    for i in range(10):
        page.wait_for_timeout(500)
        print(i, page.evaluate("({cur: UI.cur, m: document.querySelectorAll('.modal').length})"), flush=True)
    b.close()
