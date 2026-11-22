import json
from playwright.sync_api import sync_playwright
OUT = '/home/claude/roma/test/shots/'
errors = []
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=True, is_mobile=True)
    page = ctx.new_page()
    page.on('pageerror', lambda e: errors.append(f'[pageerror] {e}'))
    page.route('**/fonts.googleapis.com/**', lambda r: r.abort())
    page.route('**/fonts.gstatic.com/**', lambda r: r.abort())
    page.goto('file:///home/claude/roma/test/page.html')
    page.wait_for_timeout(300)
    page.evaluate("""(() => { S.newGame({ country: 'carth', rank: 'shog', min: 'chiso', sei: '龐', mei: '暖', age: 30, stats: { bu: 95, tou: 80, chi: 60, pol: 40, mi: 60 }, traits: [], style: 'ins', diff: 1 }); UI.main('map');
      const me = S.myOff(); const pid = G.me.loc; const spec = W.buildSpec({ kind: 'field', pid, title: '文字の試し', A: { c: me.c, troops: 22000, cmd: me }, B: { c: 'rome', troops: 20000, cmd: S.bestGeneral('rome') }, me: 'A', role: 'commander', maxDays: 2 }); HOOK.battle(spec); })()""")
    page.wait_for_timeout(600)
    page.click('#dep-go')
    page.wait_for_timeout(400)
    page.evaluate("""(() => { const bt = V.bt; bt.paused = 'x'; const u = bt.units.find(u => u.side === 0 && u.mine) || bt.units[0];
      const L = ['任茂 討ち取ったり！', '潰走！', '挟撃！', '一騎打ち：龐暖 vs 邱衡', '包囲！', '陣を確保'];
      L.forEach((s, i) => B.text(bt, u.x + (i % 2) * 3, u.y, s, i % 2 ? 'good' : 'bad'));
      const e = bt.units.reduce((a, x) => (x.x < a.x ? x : a)); B.text(bt, 0, e.y, '潰走！', 'bad'); B.text(bt, bt.W, e.y, '潰走！', 'bad');
      V.cam.x = u.x; V.cam.y = u.y; })()""")
    page.wait_for_timeout(500)
    page.screenshot(path=OUT + 'txt_stack.png')
    print('ERRORS', errors)
    b.close()
