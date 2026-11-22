import json
from playwright.sync_api import sync_playwright
errors = []
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=True, is_mobile=True)
    page = ctx.new_page()
    page.on('console', lambda m: errors.append(f'[{m.type}] {m.text}') if m.type == 'error' and 'ERR_FAILED' not in m.text else None)
    page.on('pageerror', lambda e: errors.append(f'[pageerror] {e}'))
    page.route('**/fonts.googleapis.com/**', lambda r: r.abort())
    page.route('**/fonts.gstatic.com/**', lambda r: r.abort())
    page.goto('http://127.0.0.1:8765/')
    page.wait_for_function("typeof GEO !== 'undefined' && GEO.built", timeout=60000)
    print('title', page.title(), 'worker', page.evaluate("!!(GEO.worker || GEO._worker || (GEO.prof && GEO.prof.worker))"))
    page.wait_for_timeout(1500)
    page.screenshot(path='/home/claude/roma/test/shots/gh_title.png')
    page.click('#t-new'); page.click('.pick[data-c="carth"]'); page.click('#s-next'); page.click('.pick[data-r="shog"]'); page.click('#s-next')
    page.wait_for_timeout(300)
    page.click('#e-start')
    page.wait_for_function("typeof G !== 'undefined' && G && G.me && document.querySelector('.modal')", timeout=60000)
    page.locator('.modal button').first.click()
    page.wait_for_timeout(2500)
    page.screenshot(path='/home/claude/roma/test/shots/gh_map.png')
    # battle
    page.evaluate("""(() => { const me = S.myOff(); const pid = S.adj(G.me.loc).find(q => G.prov[q].o !== me.c) || G.me.loc; const spec = W.buildSpec({ kind: 'field', pid, title: '試し', A: { c: me.c, troops: 20000, cmd: me }, B: { c: 'rome', troops: 18000, cmd: S.bestGeneral('rome') }, me: 'A', role: 'commander' }); HOOK.battle(spec).then(r => window._res = r); })()""")
    page.wait_for_timeout(1000)
    # 出撃する部隊を選ぶ（大きな軍のとき）
    if page.locator('.modal .so-row').count():
        print('sortie rows', page.locator('.modal .so-row').count())
        page.locator('.modal .btn.seal').click(); page.wait_for_timeout(800)
    page.click('#dep-go')
    page.wait_for_timeout(4000)
    page.screenshot(path='/home/claude/roma/test/shots/gh_battle.png')
    print('battle running', page.evaluate("!!(V.bt && !V.bt.ended)"), 'time', page.evaluate("V.bt && Math.round(V.bt.time)"))
    page.evaluate("void SAVE.save('1').then(r => window._sv = r)")
    page.wait_for_timeout(800)
    print('saved', page.evaluate('window._sv'), 'slots', page.evaluate("Object.keys(localStorage).filter(k => k.startsWith('chichukai')).length"))
    print('ERRORS:', json.dumps(errors[:20], ensure_ascii=False, indent=1))
    b.close()
