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
    page.click('#t-new'); page.click('.pick[data-c="carth"]'); page.click('#s-next'); page.click('.pick[data-r="shog"]'); page.click('#s-next')
    page.wait_for_timeout(300)
    page.screenshot(path=OUT + 'u_editor.png')
    page.evaluate("MAP.init()")
    page.evaluate("""(() => { S.newGame({ country: 'carth', rank: 'shog', min: 'chiso', sei: '李', mei: '牧', age: 42, stats: { bu: 80, tou: 90, chi: 75, pol: 50, mi: 70 }, traits: ['kobu'], style: 'bal', diff: 1 }); UI.main('ppl'); })()""")
    page.wait_for_timeout(400)
    page.screenshot(path=OUT + 'u_ppl.png')
    page.click('#p-dir'); page.wait_for_timeout(400)
    page.screenshot(path=OUT + 'u_dir.png')
    page.locator('.modal .btn.seal').click(); page.wait_for_timeout(200)
    # battle panel
    page.wait_for_function("MAP.ready === true", timeout=60000)
    page.evaluate("""(() => { G.me.army.sortieAsk = false; G.me.army.sortiePre = 'all'; const me = S.myOff(); const pid = S.adj(G.me.loc).find(q => G.prov[q].o !== me.c) || G.me.loc; const spec = W.buildSpec({ kind: 'field', pid, title: '試し', A: { c: me.c, troops: 20000, cmd: me }, B: { c: 'rome', troops: 18000, cmd: S.bestGeneral('rome') }, me: 'A', role: 'commander' }); HOOK.battle(spec).then(r => window._res = r); })()""")
    page.wait_for_timeout(1200)
    page.screenshot(path=OUT + 'u_deploy.png')
    print('errors', errors)
    b.close()
