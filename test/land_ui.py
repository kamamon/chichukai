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
    page.wait_for_timeout(300)
    page.evaluate("MAP.init()")
    page.wait_for_function("MAP.ready === true", timeout=60000)
    page.evaluate("""(() => { S.newGame({ country: 'rome', rank: 'dais', min: 'chiso', sei: '李', mei: '信', age: 30, stats: { bu: 90, tou: 85, chi: 70, pol: 40, mi: 70 }, traits: ['moushou'], style: 'ins', diff: 1 });
      G.me.loc = 'apulia'; S.myOff().loc = 'apulia';
      // 河内と邯鄲のいくつかを奪っておく
      for (const h of S.holdsIn('campania').slice(0, 5)) W.takeHold(h, 'rome', 900);
      for (const h of S.holdsIn('carthago').filter(h => h.k !== 'mid').slice(0, 3)) W.takeHold(h, 'rome', 400);
      for (const h of S.holdsIn('apulia').slice(0, 2)) W.takeHold(h, 'carth', 700);
      UI.main('map'); })()""")
    page.wait_for_timeout(500)
    # 河内へ寄る
    page.evaluate("UI.map.cam.x = S.P.henei.x; UI.map.cam.y = S.P.henei.y; UI.map.cam.s = UI.map.fitS() * 4; UI.map.clamp(); UI.map.draw();")
    page.wait_for_timeout(2500)
    page.screenshot(path=OUT + 'l_map.png')
    page.evaluate("UI.map.select('campania')")
    page.wait_for_timeout(400)
    page.screenshot(path=OUT + 'l_sheet.png')
    print('hold rows', page.locator('#map-sheet .hrow').count(), 'attack btns', page.locator('#map-sheet [data-hold]').count())
    sh = page.locator('#map-sheet')
    sh.evaluate("el => el.scrollTop = el.scrollHeight")
    page.wait_for_timeout(200)
    page.screenshot(path=OUT + 'l_sheet2.png')
    # 出撃の選択（合戦の前）
    page.evaluate("""(() => { const spec = W.buildSpec({ kind: 'field', pid: 'campania', title: '試しの戦', A: { c: 'rome', troops: 3000, addMe: true, cmd: S.myOff() }, B: { c: 'sele', troops: 8000 }, me: 'A', role: 'commander' }); window._sp = spec; UI.sortie(spec).then(p => window._pick = p); })()""")
    page.wait_for_timeout(500)
    page.screenshot(path=OUT + 'l_sortie.png')
    print('sortie rows', page.locator('.modal .so-row').count(), page.locator('.modal .body').last.inner_text())
    page.locator('.modal .seg button[data-p="direct"]').click()
    page.wait_for_timeout(150)
    print('direct:', page.locator('.modal .body').last.inner_text())
    page.locator('.modal .so-row').first.locator('button', has_text='半分').click()
    page.wait_for_timeout(150)
    print('half:', page.locator('.modal .body').last.inner_text())
    page.locator('.modal .so-row').first.locator('button', has_text='留守').click()
    page.wait_for_timeout(150)
    print('direct stays home ->', page.locator('.modal .btn.seal').inner_text())
    page.screenshot(path=OUT + 'l_sortie2.png')
    page.locator('.modal .btn.seal').click()
    page.wait_for_timeout(300)
    print('pick', page.evaluate("JSON.stringify(window._pick)"))
    # 軍のタブ（出撃の選び方と解任）
    page.evaluate("UI.tab('army')")
    page.wait_for_timeout(300)
    page.screenshot(path=OUT + 'l_army.png', full_page=True)
    print('sortie pref', page.locator('.sortie-pref .seg button.on').inner_text())
    fire = page.locator('[data-fire]').first
    name = fire.evaluate("b => G.off[b.dataset.fire].n")
    fire.click(); page.wait_for_timeout(100)
    page.locator('[data-fire]').first.click(); page.wait_for_timeout(300)
    print('fired', name, 'still sub', page.evaluate(f"G.me.army.subs.some(id => G.off[id].n === {json.dumps(name)})"))
    page.locator('[data-sortie="auto"]').click(); page.wait_for_timeout(150)
    print('pref now', page.evaluate("JSON.stringify([G.me.army.sortieAsk, G.me.army.sortiePre])"))
    print('overflow', page.evaluate("document.documentElement.scrollWidth > window.innerWidth"))
    print('errors', errors)
    b.close()
