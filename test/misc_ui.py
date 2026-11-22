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
    page.evaluate("""(() => { S.newGame({ country: 'carth', rank: 'shog', min: 'chiso', sei: '龐', mei: '暖', age: 30, stats: { bu: 95, tou: 80, chi: 60, pol: 40, mi: 60 }, traits: ['moushou', 'ikkigake'], style: 'ins', diff: 1 }); UI.main('map'); })()""")
    # duel
    page.evaluate("""void UI.duel({ a: W.snap(S.myOff()), b: { n: '王翦', sei: '王', bu: 86, chi: 97, tr: [], st: 'chi' }, title: '一騎打ち：試し' }).then(r => window._duel = r)""")
    page.wait_for_timeout(300)
    page.screenshot(path=OUT + 'm_duel1.png')
    page.wait_for_timeout(3200)
    for i in range(40):
        if page.evaluate('!!window._duel'): break
        btn = page.locator('#d-acts button:not([disabled])')
        if btn.count(): btn.nth(i % 3).click()
        page.wait_for_timeout(700)
        if i == 2: page.screenshot(path=OUT + 'm_duel2.png')
    page.wait_for_timeout(1200)
    print('duel', page.evaluate('window._duel'))
    # debate
    page.evaluate("""void UI.debate(G.off[S.myCty().ruler], '攻略の許可').then(r => window._deb = r)""")
    page.wait_for_timeout(300)
    page.screenshot(path=OUT + 'm_debate.png')
    for i in range(8):
        if page.evaluate('window._deb !== undefined'): break
        btn = page.locator('#db-acts button:not([disabled])')
        if btn.count(): btn.nth(i % 3).click()
        page.wait_for_timeout(150)
    page.wait_for_timeout(1200)
    print('debate', page.evaluate('window._deb'))
    # battle with night
    page.evaluate("""(() => { G.me.army.sortieAsk = false; G.me.army.sortiePre = 'all'; const me = S.myOff(); const pid = G.me.loc; const spec = W.buildSpec({ kind: 'field', pid, title: '夜の試し', A: { c: me.c, troops: 22000, cmd: me }, B: { c: 'rome', troops: 20000, cmd: S.bestGeneral('rome') }, me: 'A', role: 'commander', maxDays: 2 }); HOOK.battle(spec).then(r => window._res = r); })()""")
    page.wait_for_timeout(600)
    try: page.click('#dep-go', timeout=8000)
    except Exception as e:
        page.screenshot(path=OUT + 'm_fail.png')
        print('dep-go fail', page.evaluate("(() => { const b = document.querySelector('#dep-go'); const r = b && b.getBoundingClientRect(); const el = r && document.elementFromPoint(r.left + r.width/2, r.top + r.height/2); return { r: r && [r.left, r.top, r.width, r.height], at: el && (el.tagName + '.' + el.className), modals: document.querySelectorAll('.modal').length, cut: document.querySelectorAll('.cutin').length, cur: UI.cur }; })()"))
        raise
    page.wait_for_timeout(500)
    page.evaluate("(() => { const bt = V.bt; V.ui.closed = true; let g = 0; while (!bt.ended && !bt.paused && g++ < 6000) B.step(bt, 0.2); V.ui.closed = false; V.loop(); })()")
    page.wait_for_timeout(800)
    page.screenshot(path=OUT + 'm_night.png')
    print('paused', page.evaluate('V.bt && V.bt.paused'), 'modal', page.locator('.modal h3').all_inner_texts())
    if page.locator('.modal .ch').count():
        page.locator('.modal .ch').first.click()
        page.wait_for_timeout(500)
        if page.locator('.modal .btn.seal').count(): page.locator('.modal .btn.seal').first.click()
    page.wait_for_timeout(500)
    page.evaluate("(() => { const bt = V.bt; if (!bt) return; V.ui.closed = true; let g = 0; while (!bt.ended && g++ < 8000) { if (bt.paused === 'night') { B.night(bt, {k:'rest'}); continue; } if (bt.paused) { bt.paused = null; bt.duel = bt.duelOffer = null; } B.step(bt, 0.2); } V.ui.closed = false; V.loop(); })()")
    page.wait_for_timeout(1500)
    page.screenshot(path=OUT + 'm_result.png')
    print('result modal', page.locator('.modal h3, .modal .big').all_inner_texts())
    if page.locator('.modal .btn.seal').count(): page.locator('.modal .btn.seal').first.click()
    page.wait_for_timeout(800)
    # promotions etc
    for i in range(6):
        if page.locator('.modal').count() == 0: break
        if page.locator('.modal .btn.seal').count(): page.locator('.modal .btn.seal').first.click()
        elif page.locator('.modal .ch').count(): page.locator('.modal .ch').first.click()
        page.wait_for_timeout(300)
    print('after', page.evaluate("({cur: UI.cur, res: window._res && window._res.winner, merit: G.me.merit, rank: G.me.rank})"))
    page.screenshot(path=OUT + 'm_after.png')
    # save / load roundtrip
    page.evaluate("void SAVE.save('1').then(r => window._sv = r)")
    page.wait_for_timeout(800)
    print('saved', page.evaluate('window._sv'))
    page.evaluate("void SAVE.load('1').then(r => window._ld = r)")
    page.wait_for_timeout(800)
    print('loaded', page.evaluate('window._ld'), page.evaluate('S.dateStr()'))
    print('ERRORS:', json.dumps(errors[:20], ensure_ascii=False, indent=1))
    b.close()
