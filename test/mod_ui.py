# MOD: create an officer and an event via the UI, export/import, and see them in a new game
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
    page.evaluate("MOD.clear()")
    print('title mod btn', page.locator('#t-mod').count())
    page.click('#t-mod'); page.wait_for_timeout(300)
    page.evaluate("[...document.querySelectorAll('.modal .ch')].find(b => b.innerText.includes('人物を作る')).click()"); page.wait_for_timeout(400)
    page.fill('#m-n', '王離'); page.select_option('#m-c', 'rome'); page.select_option('#m-r', 'goz'); page.fill('#m-bu', '82')
    page.evaluate("document.querySelector('#m-n').dispatchEvent(new Event('input'))"); page.wait_for_timeout(200)
    page.screenshot(path=OUT + 'mod_officer.png')
    page.evaluate("[...document.querySelectorAll('.modal button')].find(b => b.innerText === 'この人物を加える').click()"); page.wait_for_timeout(400)
    print('officers', page.evaluate("MOD.officers().length"))
    # event
    page.evaluate("[...document.querySelectorAll('.modal .ch')].find(b => b.innerText.includes('事件を作る')).click()"); page.wait_for_timeout(400)
    page.fill('#m-t', '旅の商人'); page.fill('#m-b', '旅の商人が{name}に珍しい品を見せに来た。'); page.fill('#m-cl0', '買う'); page.select_option('#m-fk00', 'gold'); page.fill('#m-fv00', '-100'); page.select_option('#m-fk01', 'fame'); page.fill('#m-fv01', '3'); page.fill('#m-cl1', '断る')
    page.screenshot(path=OUT + 'mod_event.png')
    page.evaluate("[...document.querySelectorAll('.modal button')].find(b => b.innerText === 'この事件を加える').click()"); page.wait_for_timeout(400)
    print('events', page.evaluate("JSON.stringify(MOD.events()[0])")[:200])
    exp = page.evaluate("MOD.export()")
    page.evaluate("[...document.querySelectorAll('.modal .ch')].find(b => b.innerText.includes('閉じる')).click()"); page.wait_for_timeout(200)
    # import round trip
    page.evaluate("MOD.clear()"); print('after clear', page.evaluate("MOD.officers().length"))
    print('import', page.evaluate("JSON.stringify(MOD.import(" + json.dumps(exp) + "))"))
    # new game: officer appears, event runnable
    page.evaluate("""S.newGame({ country: 'rome', rank: 'shog', min: 'chiso', sei: '李', mei: '信', age: 25, stats: { bu: 80, tou: 70, chi: 60, pol: 50, mi: 60 }, traits: ['kobu'], style: 'ins', diff: 1 }); UI.main('map');""")
    page.wait_for_timeout(300)
    print('mod officer in game', page.evaluate("(() => { const o = Object.values(G.off).find(x => x.mod); return o ? o.n + ':' + o.c + ':' + o.r + ':' + o.bu : null; })()"))
    print('json events incl mod', page.evaluate("EV.jsonEvents().length"), page.evaluate("EV.jsonEvents().filter(e => e.mod).length"))
    page.evaluate("void EV.J.run(EV.jsonEvents().find(e => e.mod))"); page.wait_for_timeout(500)
    print('event modal', page.evaluate("(() => { const m = document.querySelector('.modal h3'); return m ? m.innerText : null; })()"), page.evaluate("(() => { const m = document.querySelector('.modal p, .modal .body'); return m ? m.innerText.slice(0, 40) : null; })()"))
    page.screenshot(path=OUT + 'mod_run.png')
    gold0 = page.evaluate("G.me.gold")
    page.evaluate("[...document.querySelectorAll('.modal .ch')].find(b => b.innerText.includes('買う')).click()"); page.wait_for_timeout(300)
    print('gold', gold0, '->', page.evaluate("G.me.gold"), 'fame', page.evaluate("G.me.fame"))
    print('errors', errors)
    b.close()
