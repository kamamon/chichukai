import json
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
    page.click('#t-new'); page.click('.pick[data-c="carth"]'); page.click('#s-next'); page.click('.pick[data-r="shog"]'); page.click('#s-next')
    page.wait_for_timeout(300)
    # 工房を開く（通常モード）
    page.click('#e-tmake'); page.wait_for_timeout(300)
    page.screenshot(path=OUT + 'c_1list.png')
    # 新しく作る
    page.locator('.modal .ctr-top .btn.seal').click(); page.wait_for_timeout(200)
    page.fill('.modal input[aria-label="特性の名前"]', '鬼神')
    page.locator('.modal .ctr-eh .btn').click(); page.wait_for_timeout(200)
    page.screenshot(path=OUT + 'c_2pick.png')
    for k in ['atk', 'chg', 'bu', 'mv_forest']:
        page.locator(f'.modal [data-k="{k}"]').click()
    page.locator('.modal .ctr-bottom .btn.seal').click(); page.wait_for_timeout(200)
    # 値を入れる
    rows = page.locator('.modal .ctr-row')
    print('rows', rows.count())
    inp = rows.nth(0).locator('input'); inp.fill('15'); inp.press('Enter'); page.wait_for_timeout(100)
    page.screenshot(path=OUT + 'c_3edit.png')
    pw = page.locator('.modal .ctr-pwline').inner_text()
    print('power line:', pw.replace('\n', ' / '))
    page.locator('.modal .ctr-bottom .btn.seal').click(); page.wait_for_timeout(300)
    print('cfg traits after save', page.evaluate("UI.cfg.traits"))
    # 最強
    page.locator('.modal .ctr-top .btn.pri').click(); page.wait_for_timeout(300)
    page.screenshot(path=OUT + 'c_4max.png')
    page.locator('.modal .ctr-bottom .btn.seal').click(); page.wait_for_timeout(300)
    page.screenshot(path=OUT + 'c_5list2.png')
    # 通常モードで最強を付けようとする
    page.locator('.modal .ctr-card').first.locator('.btn.pri').first.click(); page.wait_for_timeout(200)
    print('toast', page.evaluate("[...document.querySelectorAll('.toast')].map(t => t.textContent)"))
    page.locator('.modal .ctr-bottom .btn.seal').click(); page.wait_for_timeout(300)
    # カスタムへ切り替えて最強を付ける
    page.locator('#e-mode button[data-m="custom"]').click(); page.wait_for_timeout(200)
    page.click('#e-tmake'); page.wait_for_timeout(300)
    page.locator('.modal .ctr-card').first.locator('.btn.pri').first.click(); page.wait_for_timeout(200)
    page.locator('.modal .ctr-bottom .btn.seal').click(); page.wait_for_timeout(300)
    print('cfg traits custom', page.evaluate("UI.cfg.traits.map(t => D.TRAITS[t].n)"))
    page.evaluate("document.querySelector('#e-traits').scrollIntoView()")
    page.screenshot(path=OUT + 'c_6editor.png')
    # 選ぶ画面に「自作」
    page.click('#e-tpick'); page.wait_for_timeout(300)
    page.locator('.modal .tp-cats [data-c="custom"]').click(); page.wait_for_timeout(200)
    print('picker custom items', page.locator('.modal .tp-list button.tp').count())
    page.screenshot(path=OUT + 'c_7picker.png')
    page.locator('.modal .btn.seal').click(); page.wait_for_timeout(200)
    # 開始
    page.click('#e-start')
    page.wait_for_function("typeof G !== 'undefined' && G && G.me && document.querySelector('.modal')", timeout=60000)
    page.locator('.modal button').first.click(); page.wait_for_timeout(300)
    print('player traits', page.evaluate("S.myOff().tr.map(t => D.TRAITS[t].n)"), 'mode', page.evaluate("G.mode"), 'bu', page.evaluate("S.stat(S.myOff(),'bu')"))
    # 人物タブから工房
    page.click('#nav button[data-t="ppl"]'); page.wait_for_timeout(300)
    page.click('#p-ctr'); page.wait_for_timeout(300)
    # 鬼神を部下に
    card = page.locator('.modal .ctr-card', has_text='鬼神')
    card.locator('.btn.pri').first.click(); page.wait_for_timeout(200)
    page.screenshot(path=OUT + 'c_8who.png')
    page.locator('.modal .ctr-wrow').nth(1).locator('.btn').click(); page.wait_for_timeout(200)
    print('sub has', page.evaluate("G.off[G.me.army.subs[0]].tr.map(t => D.TRAITS[t] ? D.TRAITS[t].n : t)"))
    page.screenshot(path=OUT + 'c_9who2.png')
    page.locator('.modal .ctr-bottom .btn.seal').click(); page.wait_for_timeout(200)
    page.locator('.modal .ctr-bottom .btn.seal').click(); page.wait_for_timeout(300)
    # セーブと読み直し
    page.evaluate("void SAVE.save('1').then(r => window._sv = r)"); page.wait_for_timeout(600)
    page.evaluate("void SAVE.load('1').then(r => window._ld = r)"); page.wait_for_timeout(600)
    print('after load', page.evaluate("S.myOff().tr.map(t => D.TRAITS[t] ? D.TRAITS[t].n : '??' + t)"), 'ctr', page.evaluate("Object.keys(G.ctr).length"))
    print('lib', page.evaluate("JSON.parse(localStorage.getItem('chichukai.ctraits.v1')).map(d => d.n)"))
    print('ERRORS:', json.dumps(errors[:20], ensure_ascii=False, indent=1))
    b.close()
