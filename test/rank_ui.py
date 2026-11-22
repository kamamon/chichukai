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
    page.wait_for_timeout(300)
    # 立場の選択
    page.evaluate("UI.cfg = UI.newCfg(); UI.setupRank()")
    page.wait_for_timeout(200)
    page.screenshot(path=OUT + 'r_select.png')
    picks = page.locator('#scr-setup .pick').count()
    print('rank picks', picks)
    sel_staff = page.locator('#scr-setup .pick[data-r="gunri"]').count()
    print('gunri selectable', sel_staff)
    page.locator('#scr-setup .pick[data-r="sanb"]').click()
    page.click('#s-next')
    page.wait_for_timeout(200)
    print('editor title', page.locator('#scr-edit .step-h small').inner_text())
    # ゲーム開始：将軍
    page.evaluate("""(() => { S.newGame({ country: 'rome', rank: 'shog', min: 'chiso', sei: '李', mei: '信', age: 28, stats: { bu: 90, tou: 80, chi: 60, pol: 40, mi: 70 }, traits: ['moushou', 'ikkigake'], style: 'ins', diff: 1 }); G.me.merit = 40000; G.me.rec.wins = 3; G.me.grade = 1; UI.main('map'); })()""")
    page.wait_for_timeout(300)
    print('header', page.locator('#hdr .hdr-id').inner_text())
    page.evaluate("UI.tab('ppl')")
    page.wait_for_timeout(300)
    page.screenshot(path=OUT + 'r_ppl.png', full_page=True)
    print('career', page.locator('.conds').inner_text().replace('\n', ' | '))
    page.click('#p-ladder')
    page.wait_for_timeout(300)
    page.screenshot(path=OUT + 'r_ladder.png')
    print('ladder rows', page.locator('.modal .lrow').count(), 'cur', page.locator('.modal .lrow.cur b').inner_text())
    page.locator('.modal .seg button').nth(1).click()
    page.wait_for_timeout(150)
    print('ladder tab2 rows', page.locator('.modal .lrow').count())
    page.locator('.modal .btn.seal').click()
    page.wait_for_timeout(200)
    page.click('#p-jue')
    page.wait_for_timeout(300)
    page.screenshot(path=OUT + 'r_jue.png')
    print('jue rows', page.locator('.modal .lrow').count())
    page.locator('.modal .btn.seal').click()
    page.wait_for_timeout(200)
    # 武名の演出（合戦の結果から）
    page.evaluate("""(() => {
      const spec = { role: 'commander', kind: 'field', title: '長平の戦い', pid: G.me.loc, sides: [{ player: true, cmdAll: true }, {}], ctx: null };
      const br = { winner: 0, sides: [{ start: 40000 }, { start: 90000 }], meKills: 900, duelWins: 1, slainInfo: [{ n: '趙括', hist: true, tier: 7 }], merit: { rearguard: 0 }, units: [] };
      W.renownFromBattle(spec, br, true);
      window._ff = W.flushFame();
    })()""")
    page.wait_for_timeout(2600)
    page.screenshot(path=OUT + 'r_fame.png')
    print('fame modal', page.locator('.modal.fame .fame-ep').all_inner_texts(), 'lines', page.locator('.modal.fame .fame-line').count())
    while page.locator('.modal .btn.seal').count():
        page.locator('.modal .btn.seal').first.click()
        page.wait_for_timeout(500)
        if page.locator('.modal.fame').count():
            page.wait_for_timeout(2200)
            page.screenshot(path=OUT + 'r_fame2.png')
    page.evaluate("UI.tab('ppl')")
    page.wait_for_timeout(300)
    page.screenshot(path=OUT + 'r_ppl2.png', full_page=True)
    print('header2', page.locator('#hdr .hdr-id').inner_text())
    print('epithets', page.locator('[data-epi]').all_inner_texts())
    # 天下の大将軍の演出
    page.evaluate("""(() => { G.me.rank = 'dais'; S.myOff().r = 'dais'; G.me.grade = 2; G.me.merit = 260000; G.me.fame = 999; G.me.rec.wins = 60; G.me.renown = 2500; G.me.stepT = -99; window._tp = W.checkPromotion(); })()""")
    page.wait_for_timeout(2600)
    page.screenshot(path=OUT + 'r_tenka.png')
    print('tenka', page.locator('.modal.fame.tenka .fame-ep').all_inner_texts())
    while page.locator('.modal .btn.seal').count():
        page.locator('.modal .btn.seal').first.click()
        page.wait_for_timeout(400)
    page.evaluate("UI.tab('army')")
    page.wait_for_timeout(300)
    print('army head', page.locator('#scr-main .step-h small').first.inner_text())
    # 横にはみ出さない
    print('overflow', page.evaluate("document.documentElement.scrollWidth > window.innerWidth"))
    print('errors', errors)
    b.close()
