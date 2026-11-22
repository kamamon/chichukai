import sys, time, json
from playwright.sync_api import sync_playwright

SRC = '/home/claude/roma/dist/roma.html'
OUT = '/home/claude/roma/test/shots/'
import os
os.makedirs(OUT, exist_ok=True)
html = open(SRC, encoding='utf-8').read()
page_html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style></head><body>' + html + '</body></html>'
open('/home/claude/roma/test/page.html', 'w', encoding='utf-8').write(page_html)

rank = sys.argv[1] if len(sys.argv) > 1 else 'goch'
country = sys.argv[2] if len(sys.argv) > 2 else 'rome'
errors = []
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=True, is_mobile=True)
    page = ctx.new_page()
    page.on('console', lambda m: errors.append(f'[{m.type}] {m.text}') if m.type in ('error', 'warning') else None)
    page.on('pageerror', lambda e: errors.append(f'[pageerror] {e}'))
    page.route('**/fonts.googleapis.com/**', lambda r: r.abort())
    page.route('**/fonts.gstatic.com/**', lambda r: r.abort())
    page.goto('file:///home/claude/roma/test/page.html')
    page.wait_for_timeout(600)
    page.screenshot(path=OUT + '01_title.png')
    page.click('#t-new')
    page.wait_for_timeout(200)
    page.click(f'.pick[data-c="{country}"]')
    page.screenshot(path=OUT + '02_country.png')
    page.click('#s-next')
    page.wait_for_timeout(200)
    page.click(f'.pick[data-r="{rank}"]')
    page.screenshot(path=OUT + '03_rank.png', full_page=False)
    page.click('#s-next')
    page.wait_for_timeout(300)
    page.screenshot(path=OUT + '04_edit.png')
    page.evaluate("document.querySelector('.flow').scrollTop = 900")
    page.wait_for_timeout(100)
    page.screenshot(path=OUT + '04b_edit.png')
    page.click('#e-start')
    page.wait_for_timeout(500)
    page.screenshot(path=OUT + '05_start.png')
    # close intro modal
    page.click('.modal .btn.seal')
    page.wait_for_timeout(300)
    page.screenshot(path=OUT + '06_map.png')
    for t in ['act', 'army', 'dom', 'ppl']:
        page.click(f'#nav button[data-t="{t}"]')
        page.wait_for_timeout(250)
        page.screenshot(path=OUT + f'07_{t}.png')
    print('ERRORS:', json.dumps(errors, ensure_ascii=False, indent=1))
    b.close()
