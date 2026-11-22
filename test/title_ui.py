import json, sys
from playwright.sync_api import sync_playwright
OUT = '/home/claude/roma/test/shots/'
errors = []
w, h = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (390, 844)
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2, has_touch=True, is_mobile=w < 600)
    page = ctx.new_page()
    page.on('console', lambda m: errors.append(f'[{m.type}] {m.text}') if m.type == 'error' and 'ERR_FAILED' not in m.text else None)
    page.on('pageerror', lambda e: errors.append(f'[pageerror] {e}'))
    page.route('**/fonts.googleapis.com/**', lambda r: r.abort())
    page.route('**/fonts.gstatic.com/**', lambda r: r.abort())
    page.goto('file:///home/claude/roma/test/page.html')
    page.wait_for_timeout(300)
    page.screenshot(path=OUT + f't_title0_{w}.png')
    page.wait_for_function("typeof GEO !== 'undefined' && GEO.built", timeout=60000)
    page.wait_for_timeout(2500)
    print('busy', page.evaluate("MAP.busyCount ? MAP.busyCount() : -1"), 'tiles', page.evaluate("MAP.world.tiles.size"))
    page.screenshot(path=OUT + f't_title1_{w}.png')
    print('ERRORS:', json.dumps(errors[:20], ensure_ascii=False, indent=1))
    b.close()
