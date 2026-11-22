# 布陣のターン（配置フェーズ）のテスト：帯だけが出て地図が広い／タップで置ける／分割→結合／開戦
import sys, json, os
from playwright.sync_api import sync_playwright

OUT = '/home/claude/roma/test/shots/'
os.makedirs(OUT, exist_ok=True)
html = open('/home/claude/roma/dist/roma.html', encoding='utf-8').read()
page_html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>body{margin:0}[hidden]{display:none!important}</style></head><body>' + html + '</body></html>'
open('/home/claude/roma/test/page.html', 'w', encoding='utf-8').write(page_html)

scen = sys.argv[1] if len(sys.argv) > 1 else 'field'
W_, H_ = (390, 844) if len(sys.argv) < 3 else map(int, sys.argv[2].split('x'))
errors = []
SETUP = {
  'field': ("shog", "rome", "field", 40000, 35000, "carth"),
  'defend': ("dais", "rome", "siege", 20000, 50000, "carth", 'A'),
  'siege': ("dais", "rome", "siege", 60000, 20000, "carth", 'B'),
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
    rank, country, kind, ta, tb, ec = SETUP[:6]
    city_of = SETUP[6] if len(SETUP) > 6 else 'null'
    js = f"""
    (() => {{
      localStorage.setItem('chichukai.view3d', '1');
      const cfg = {{ country: '{country}', rank: '{rank}', min: 'chiso', sei: '李', mei: '信', age: 20, stats: {{ bu: 88, tou: 70, chi: 62, pol: 40, mi: 60 }}, traits: ['kobu', 'ikkigake'], style: 'ins', diff: 1 }};
      S.newGame(cfg);
      UI.main('map');
      const me = S.myOff();
      const pid = S.adj(G.me.loc).find(q => G.prov[q].o !== me.c) || G.me.loc;
      const spec = W.buildSpec({{ kind: '{kind}', pid, title: 'テスト合戦', A: {{ c: me.c, troops: {ta}, cmd: me, officers: [] }}, B: {{ c: '{ec}', troops: {tb}, cmd: S.bestGeneral('{ec}'), officers: [] }}, me: 'A', role: 'commander', cityOf: {('null' if city_of == 'null' else repr(city_of))} }});
      window._spec = spec; G.me.army.sortieAsk = false;
      HOOK.battle(spec).then(r => {{ window._res = r; }});
      return spec.units.length;
    }})()
    """
    n = page.evaluate(js)
    print('units in spec', n)
    page.wait_for_timeout(800)
    page.screenshot(path=OUT + f'pl_{scen}_0card.png')
    st = page.evaluate("(() => ({ view3d: V.ui.view3d, place: !!document.querySelector('#dep-place'), go: document.querySelector('#dep-go').textContent }))()")
    print('card', json.dumps(st, ensure_ascii=False))
    assert st['place'], 'no 布陣へ button'
    page.click('#dep-place')
    page.wait_for_timeout(500)
    page.screenshot(path=OUT + f'pl_{scen}_1place.png')
    st = page.evaluate("""(() => { const r = document.querySelector('#scr-battle'); const vis = (sel) => { const e = document.querySelector(sel); if (!e) return null; const cs = getComputedStyle(e); return cs.display !== 'none' && !e.hidden; };
      return { placing: V.ui.placing, view3d: V.ui.view3d, prev: V.ui.view3dPrev, cls: r.className, top: vis('.bt-top'), panel: vis('.bt-panel'), mini: vis('#bt-mini'), place: vis('#bt-place'), chips: document.querySelectorAll('#pl-units .chip').length, acts: [...document.querySelectorAll('#pl-acts .cmd')].map(b => b.dataset.k), hint: document.querySelector('#pl-hint').textContent, topH: document.querySelector('.pl-top').offsetHeight, botH: document.querySelector('.pl-bot').offsetHeight, z: V.cam.z, zone: V.deployZone(V.bt.units.find(u => u.me)) }; })()""")
    print('placing', json.dumps(st, ensure_ascii=False))
    assert st['placing'] and st['top'] is False and st['panel'] is False and st['mini'] is False and st['place'], 'HUD not hidden'
    assert st['view3d'] is False and st['prev'] is True, '3D not switched to plan view'
    assert st['chips'] >= 2 and 'form' in st['acts'], 'chips/acts missing'
    free = H_ - st['topH'] - st['botH']
    print('free height', free, 'of', H_)
    assert free > H_ * 0.6, 'bars too tall'
    # 布陣範囲が画面内に収まっている
    zpix = page.evaluate("""(() => { const z = V.deployZone(V.bt.units.find(u => u.me)); const [x0, y0] = V.w2s(z.x0, z.y0), [x1, y1] = V.w2s(z.x1, z.y1); return { x0, y0, x1, y1 }; })()""")
    print('zone px', json.dumps({k: round(v) for k, v in zpix.items()}))
    assert zpix['x0'] >= -2 and zpix['x1'] <= W_ + 2 and zpix['y1'] <= H_ - st['botH'] + 2 and zpix['y0'] >= st['topH'] - 40, 'zone not fitted'
    # タップで置く：本隊を選び、範囲内の空き地をタップ
    mv = page.evaluate("""(() => { const bt = V.bt; const me = bt.units.find(u => u.me); V.select([me.id]); const z = V.deployZone(me);
      // 空いている所を探す
      let tx = me.x, ty = me.y; for (let k = 0; k < 40; k++) { const x = z.x0 + (z.x1 - z.x0) * (0.1 + 0.8 * Math.random()), y = z.y0 + (z.y1 - z.y0) * (0.15 + 0.7 * Math.random()); const [sx, sy] = V.w2s(x, y); if (!V.hit(sx, sy) && B.passable(bt, B.ti(bt, x, y), me.mv, 0)) { tx = x; ty = y; break; } }
      const [sx, sy] = V.w2s(tx, ty); const before = { x: me.x, y: me.y }; V.tap(sx, sy); return { before, after: { x: me.x, y: me.y }, target: { x: tx, y: ty }, home: me.home, sel: [...V.ui.sel] }; })()""")
    print('tap place', json.dumps({k: (v if not isinstance(v, dict) else {kk: round(vv, 1) for kk, vv in v.items()}) for k, v in mv.items()}))
    assert abs(mv['after']['x'] - mv['target']['x']) < 1 and abs(mv['after']['y'] - mv['target']['y']) < 1, 'unit not placed at tap'
    assert mv['sel'], 'selection lost after placing'
    page.wait_for_timeout(300)
    page.screenshot(path=OUT + f'pl_{scen}_2moved.png')
    # 分割 → 結合（布陣中）
    sp = page.evaluate("""(() => { const bt = V.bt; const u = bt.units.filter(x => B.canCommand(bt, x) && !x.wu && x.n >= 10 && !x.ut.fixed && x.onwall == null)[0]; if (!u) return null; V.select([u.id]); const n0 = u.n; const v = B.split(bt, u); V.select([u.id]); V.renderPanel(); const acts = [...document.querySelectorAll('#pl-acts .cmd')].map(b => b.dataset.k); return { n0, un: u.n, vn: v.n, acts, canMerge: B.canMerge(bt, u), chips: document.querySelectorAll('#pl-units .chip').length }; })()""")
    print('split', json.dumps(sp))
    assert sp and 'merge' in sp['acts'] and sp['canMerge'], 'merge button missing after split'
    page.click('#pl-acts .cmd[data-k="merge"]')
    page.wait_for_timeout(300)
    mg = page.evaluate("""(() => { const bt = V.bt; const sel = V.selUnits(); const u = sel[0]; return { n: u && u.n, alive: bt.units.filter(B.alive).length, acts: [...document.querySelectorAll('#pl-acts .cmd')].map(b => b.dataset.k), hint: document.querySelector('#bt-hint').textContent }; })()""")
    print('merge', json.dumps(mg, ensure_ascii=False))
    assert mg['n'] == sp['n0'] and 'merge' not in mg['acts'], 'merge failed'
    # 元の配置
    page.click('#pl-reset')
    page.wait_for_timeout(200)
    rs = page.evaluate("""(() => { const bt = V.bt; const me = bt.units.find(u => u.me); const d = V.dep0.find(x => x.id === me.id); return { ok: Math.abs(me.x - d.x) < 0.01 && Math.abs(me.y - d.y) < 0.01 }; })()""")
    assert rs['ok'], 'reset failed'
    # 軍議へ戻る → 3D に戻り、札が出る
    page.click('#pl-back')
    page.wait_for_timeout(300)
    bk = page.evaluate("(() => ({ placing: V.ui.placing, view3d: V.ui.view3d, card: !document.querySelector('#bt-deploy').hidden, cls: document.querySelector('#scr-battle').className }))()")
    print('back', json.dumps(bk))
    assert not bk['placing'] and bk['view3d'] and bk['card'] and 'placing' not in bk['cls'], 'back to card failed'
    # 再び布陣へ → 開戦
    page.click('#dep-place')
    page.wait_for_timeout(300)
    page.screenshot(path=OUT + f'pl_{scen}_3again.png')
    page.click('#pl-go')
    page.wait_for_timeout(3500)
    page.screenshot(path=OUT + f'pl_{scen}_4battle.png')
    st = page.evaluate("""(() => { const bt = V.bt; const vis = (sel) => { const e = document.querySelector(sel); if (!e) return null; return getComputedStyle(e).display !== 'none' && !e.hidden; }; return { started: bt.started, placing: V.ui.placing, deploy: V.ui.deploy, view3d: V.ui.view3d, top: vis('.bt-top'), panel: vis('.bt-panel'), place: vis('#bt-place'), time: Math.round(bt.time), paused: bt.paused, cutin: V.ui.cutin }; })()""")
    print('battle', json.dumps(st))
    assert st['started'] and not st['placing'] and st['top'] and st['panel'] and st['place'] is False and st['view3d'], 'battle start state wrong'
    page.wait_for_timeout(2500)
    st = page.evaluate("(() => ({ time: Math.round(V.bt.time), s0: B.strength(V.bt, 0), s1: B.strength(V.bt, 1) }))()")
    print('running', json.dumps(st))
    assert st['time'] > 1, 'battle not running'
    print('ERRORS:', json.dumps(errors[:20], ensure_ascii=False, indent=1))
    b.close()
