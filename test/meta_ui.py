# scenarios picker, chronicle/achievements modal, hint card, intro pages
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
    page.wait_for_timeout(400)
    page.click('#t-new'); page.wait_for_timeout(300)
    print('scenario cards', page.locator('.pick.scn').count())
    page.click('.pick.scn[data-s="jingke"]'); page.wait_for_timeout(300)
    print('han disabled', page.evaluate("document.querySelector('.pick[data-c=\"ptol\"]').disabled"), 'qin provs', page.evaluate("document.querySelector('.pick[data-c=\"rome\"] .num').innerText"))
    page.screenshot(path=OUT + 'meta_scn.png')
    page.click('.pick[data-c="rome"]'); page.click('#s-next'); page.click('.pick[data-r="shog"]'); page.click('#s-next'); page.wait_for_timeout(200)
    page.evaluate("UI._introForce = true")
    page.click('#e-start'); page.wait_for_timeout(300)
    page.wait_for_function("typeof G !== 'undefined' && G && G.me && document.querySelector('.modal')", timeout=60000)
    print('year', page.evaluate("G.year"), 'scenario', page.evaluate("G.scenario"), 'zhao ruler', page.evaluate("G.off[G.cty.carth.ruler].n"))
    page.locator('.modal button').first.click(); page.wait_for_timeout(400)
    # intro pages
    n = 0
    for i in range(4):
        t = page.evaluate("(() => { const m = document.querySelector('.modal h3'); return m ? m.innerText : null; })()")
        if not t: break
        n += 1; print('intro page', t)
        if i == 0: page.screenshot(path=OUT + 'meta_intro.png')
        page.locator('.modal .ch').first.click(); page.wait_for_timeout(300)
    print('intro pages shown', n)
    # hint card
    page.evaluate("UI.tab('act')"); page.wait_for_timeout(300)
    print('hint card', page.locator('#hint-card').count(), page.evaluate("(() => { const h = document.querySelector('#hint-card p'); return h ? h.innerText.slice(0, 30) : null; })()"))
    page.screenshot(path=OUT + 'meta_hint.png')
    # unlock some achievements and open chronicle
    page.evaluate("G.me.rec.wins = 12; G.me.rec.duels = 11; G.me.gold = 2e6")
    page.evaluate("void ACH.check(false)"); page.wait_for_timeout(600)
    if page.locator('.cutin').count(): page.locator('.cutin').tap(); page.wait_for_timeout(300)
    print('ach', page.evaluate("Object.keys(G.ach).join(',')"), 'saved', page.evaluate("Object.keys(ACH.saved()).length"))
    page.evaluate("void UI.chronicle()"); page.wait_for_timeout(500)
    print('chron items', page.locator('.ch-it').count())
    page.screenshot(path=OUT + 'meta_chron.png')
    page.click('.modal .tabs button[data-k="ach"]'); page.wait_for_timeout(300)
    print('ach cards', page.locator('.ach').count(), 'on', page.locator('.ach.on').count())
    page.screenshot(path=OUT + 'meta_ach.png')
    page.click('.modal .btn.seal'); page.wait_for_timeout(200)
    # title shows achievement count
    page.evaluate("UI.title()"); page.wait_for_timeout(400)
    print('title note', page.evaluate("document.querySelector('.title-note').innerText.slice(-20)"))
    print('errors', errors)
    b.close()
