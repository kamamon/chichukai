import sys, json, os
from playwright.sync_api import sync_playwright

OUT = '/home/claude/roma/test/shots/'
os.makedirs(OUT, exist_ok=True)
html = open('/home/claude/roma/dist/roma.html', encoding='utf-8').read()
page_html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>body{margin:0}[hidden]{display:none!important}</style></head><body>' + html + '</body></html>'
open('/home/claude/roma/test/page.html', 'w', encoding='utf-8').write(page_html)

scen = sys.argv[1] if len(sys.argv) > 1 else 'goch'
W_, H_ = (390, 844) if len(sys.argv) < 3 else map(int, sys.argv[2].split('x'))
errors = []
SETUP = {
  # rank, country, kind, A troops, B troops
  'goch': ("goch", "rome", "field", 30000, 26000, "carth"),
  'shog': ("shog", "rome", "field", 40000, 35000, "carth"),
  'siege': ("dais", "rome", "siege", 60000, 20000, "carth"),
  'pass': ("dais", "carth", "pass", 80000, 30000, "rome"),
  'small': ("hyak", "mace", "skirmish", 140, 120, "rome"),
  'watch': ("kuns", "rome", "field", 50000, 45000, "sele"),
}[scen]
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': W_, 'height': H_}, device_scale_factor=2, has_touch=True, is_mobile=W_ < 600)
    page = ctx.new_page()
    page.on('console', lambda m: errors.append(f'[{m.type}] {m.text}') if m.type in ('error',) and 'ERR_FAILED' not in m.text else None)
    page.on('pageerror', lambda e: errors.append(f'[pageerror] {e}'))
    page.route('**/fonts.googleapis.com/**', lambda r: r.abort())
    page.route('**/fonts.gstatic.com/**', lambda r: r.abort())
    page.goto('file:///home/claude/roma/test/page.html')
    page.wait_for_timeout(400)
    rank, country, kind, ta, tb, ec = SETUP
    js = f"""
    (() => {{
      const cfg = {{ country: '{country}', rank: '{rank}', min: 'chiso', sei: '李', mei: '信', age: 20, stats: {{ bu: 88, tou: 70, chi: 62, pol: 40, mi: 60 }}, traits: ['kobu', 'ikkigake'], style: 'ins', diff: 1 }};
      S.newGame(cfg);
      UI.main('map');
      const me = S.myOff();
      const pid = S.adj(G.me.loc).find(q => G.prov[q].o !== me.c) || G.me.loc;
      const role = '{scen}' === 'watch' ? 'watch' : (S.tier() >= 7 ? 'commander' : 'unit');
      const spec = W.buildSpec({{ kind: '{kind}', pid, title: 'テスト合戦', A: {{ c: me.c, troops: {ta}, cmd: role === 'unit' ? G.off[G.me.gen] : me, officers: [] }}, B: {{ c: '{ec}', troops: {tb}, cmd: S.bestGeneral('{ec}'), officers: [] }}, me: 'A', role, cityOf: '{kind}' === 'siege' || '{kind}' === 'pass' ? 'B' : null }});
      window._spec = spec;
      HOOK.battle(spec).then(r => {{ window._res = r; }});
      return spec.units.length;
    }})()
    """
    n = page.evaluate(js)
    print('units in spec', n)
    page.wait_for_timeout(800)
    page.screenshot(path=OUT + f'b_{scen}_0deploy.png')
    page.click('#dep-go')
    for i, wait in enumerate([3000, 6000, 8000]):
        page.wait_for_timeout(wait)
        page.screenshot(path=OUT + f'b_{scen}_{i+1}.png')
    info = page.evaluate("""(() => { const bt = V.bt; if (!bt) return {ended: true, res: window._res}; return { time: Math.round(bt.time), day: bt.day, ended: bt.ended, s0: B.strength(bt,0), s1: B.strength(bt,1), W: Math.round(bt.W), units: bt.units.length, me: (bt.units.find(u=>u.me)||{}).n, paused: bt.paused, log: bt.log.slice(0,6).map(l=>l.s) }; })()""")
    print(json.dumps(info, ensure_ascii=False))
    # tap own unit and use a command
    page.evaluate("""(() => { const bt = V.bt; if (!bt) return; const me = bt.units.find(u => u.me); if (me) { V.select([me.id]); V.centerOn(me, 0.5); } })()""")
    page.wait_for_timeout(500)
    page.screenshot(path=OUT + f'b_{scen}_4sel.png')
    # fast forward
    page.evaluate("""(() => { const bt = V.bt; if (!bt) return; V.ui.speed = 4; V.setSpeed(4); })()""")
    page.wait_for_timeout(9000)
    page.screenshot(path=OUT + f'b_{scen}_5.png')
    info = page.evaluate("""(() => { const bt = V.bt; if (!bt) return {ended: true, res: window._res && {w: window._res.winner}}; return { time: Math.round(bt.time), day: bt.day, ended: bt.ended, s0: B.strength(bt,0), s1: B.strength(bt,1), paused: bt.paused, modal: !!document.querySelector('.modal') }; })()""")
    print(json.dumps(info, ensure_ascii=False))
    # measure frame time
    ft = page.evaluate("""new Promise(res => { let n = 0, t0 = performance.now(); function f(){ n++; if (n < 60) requestAnimationFrame(f); else res((performance.now()-t0)/60); } requestAnimationFrame(f); })""")
    print('avg frame ms', round(ft, 1))
    print('ERRORS:', json.dumps(errors[:20], ensure_ascii=False, indent=1))
    b.close()
