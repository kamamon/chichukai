"""外で作った絵が各画面に出るかを撮って確かめる。usage: python3 test/art_ui.py [phone|desk]"""
import sys, json
from playwright.sync_api import sync_playwright
OUT = '/home/claude/roma/test/shots/'
mode = sys.argv[1] if len(sys.argv) > 1 else 'phone'
kind = sys.argv[2] if len(sys.argv) > 2 else 'field'
v3 = len(sys.argv) > 3 and sys.argv[3] == '3d'
W_, H_ = (390, 844) if mode == 'phone' else (1280, 800)
errors = []
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': W_, 'height': H_}, device_scale_factor=1, has_touch=mode == 'phone', is_mobile=mode == 'phone')
    page = ctx.new_page()
    page.on('console', lambda m: errors.append(f'[{m.type}] {m.text}') if m.type in ('error', 'warning') and 'ERR_FAILED' not in m.text else None)
    page.on('pageerror', lambda e: errors.append(f'[pageerror] {e}'))
    page.route('**/fonts.googleapis.com/**', lambda r: r.abort())
    page.route('**/fonts.gstatic.com/**', lambda r: r.abort())
    page.goto('file:///home/claude/roma/test/page.html')
    page.wait_for_function('typeof MAP !== "undefined" && MAP.ready', timeout=30000)
    page.wait_for_timeout(1500)
    print('assets', page.evaluate('ASSET.count'), 'on', page.evaluate('ASSET.on()'))
    page.screenshot(path=OUT + f'art_{mode}_1title.png')
    page.evaluate('UI.setupCountry()'); page.wait_for_timeout(900)
    page.screenshot(path=OUT + f'art_{mode}_2setup.png')
    # 遊び始めて、肖像と紋章
    page.evaluate("""(() => { const cfg = { scenario: 'start', country: 'carth', rank: 'shog', min: 'chiso', sei: 'バルカ', mei: 'ボミルカル', age: 30, stats: { bu: 80, tou: 80, chi: 70, pol: 50, mi: 60 }, traits: [], style: 'bal', diff: 1 }; S.newGame(cfg); UI.main('map'); })()""")
    page.wait_for_timeout(1200)
    page.screenshot(path=OUT + f'art_{mode}_3main.png')
    # 人物の札（ハンニバルとスキピオ）
    r = page.evaluate("""(() => { const h = Object.values(G.off).find(o => o.n === 'ハンニバル'); const s = Object.values(G.off).find(o => o.n === 'スキピオ'); const box = document.createElement('div'); box.id = 'pt'; box.style.cssText = 'position:fixed;left:0;top:0;z-index:999;background:#0e1614;padding:8px;display:flex;flex-wrap:wrap;gap:6px;width:380px'; for (const o of [h, s, Object.values(G.off).find(o => o.n === 'アルキメデス'), Object.values(G.off).find(o => o.n === 'ソフォニスバ'), Object.values(G.off).find(o => o.n === 'マゴ'), Object.values(G.off).find(o => !o.hist && o.alive)]) if (o) box.append(PORT.canvas(o, 120, { seal: o === h })); for (const c of D.CORDER) { const s2 = document.createElement('span'); s2.innerHTML = UI.cseal(c, 40); box.append(s2.firstChild); } document.body.append(box); return { h: !!h, key: h && PORT.faceKey(h), year: G.year, month: G.month }; })()""")
    print('faces', r)
    page.wait_for_timeout(600)
    page.screenshot(path=OUT + f'art_{mode}_4faces.png', clip={'x': 0, 'y': 0, 'width': 396, 'height': 340})
    page.evaluate("document.getElementById('pt').remove()")
    # 募る兵種（兵種カード）
    page.evaluate("""HOOK.choose({ title: '募る兵種', choices: ['inf', 'spear', 'hcav', 'eleph'].map(t => ({ v: t, label: D.UT[t].n, sub: D.UT[t].desc, img: ASSET.url('unit/card_' + t) })) }); 0""")
    page.wait_for_timeout(700)
    page.screenshot(path=OUT + f'art_{mode}_5recruit.png')
    page.keyboard.press('Escape'); page.evaluate("(() => { const m = document.querySelector('#modal-root'); if (m) m.innerHTML = ''; })()")
    # 戦場の札
    page.evaluate("""(() => { const e = FLD.build().find(x => x.hist === 'カンナエ') || FLD.build()[0]; const e2 = FLD.build().find(x => !x.hist && x.arch === 'lakeshore_defile'); UI.fieldDetail(e, true); window._fe = [e.id, e.k, e2 && e2.id]; })()""")
    page.wait_for_timeout(700)
    print('field', page.evaluate('window._fe'), page.evaluate("(() => { const i = document.querySelector('.farch'); return i && i.getAttribute('src'); })()"))
    page.screenshot(path=OUT + f'art_{mode}_6field.png')
    page.evaluate("(() => { const m = document.querySelector('#modal-root'); if (m) m.innerHTML = ''; })()")
    # 合戦（野戦）：地面と駒（2Dで）
    page.evaluate("""(() => { try { localStorage.setItem('chichukai.view3d', '""" + ('1' if v3 else '0') + """'); } catch (e) {} const me = S.myOff(); const ec = 'rome'; const spec = W.buildSpec({ kind: '""" + kind + """', pid: 'carthago', title: 'テスト合戦', A: { c: me.c, troops: 20000, cmd: me, officers: [] }, B: { c: ec, troops: 20000, cmd: S.bestGeneral(ec), officers: [] }, me: 'A', role: 'commander' }); G.me.army.sortieAsk = false; G.me.army.sortiePre = 'all'; HOOK.battle(spec); })()""")
    page.wait_for_timeout(1500)
    for k in range(6):
        if page.evaluate('!!(V.bt && V.bt.fine !== undefined)'): break
        if page.evaluate("!!document.querySelector('.fpick .btn.seal')"):
            page.screenshot(path=OUT + f'art_{mode}_6b_pick.png')
            page.evaluate("document.querySelector('.fpick .btn.seal').click()")
        else:
            btn = page.evaluate("(() => { const b = [...document.querySelectorAll('#modal-root button')].pop(); if (b) { b.click(); return b.textContent; } return null; })()")
            print('clicked', btn)
        page.wait_for_timeout(1500)
    page.evaluate("(() => { const d = document.querySelector('#bt-deploy'); if (d) d.style.display = 'none'; })()")
    print('fine type sample', page.evaluate("(() => { const f = V.bt.fine; if (!f) return null; const s = new Set(); for (let i = 0; i < f.type.length; i += 97) s.add(f.type[i]); return [...s].sort((a,b)=>a-b); })()"))
    def wait_tiles():
        for k in range(100):
            page.wait_for_timeout(120)
            if page.evaluate('V.ft ? V.ft.busy + V.ft.want.length : 0') == 0: break
        page.wait_for_timeout(200)
    def shot(name, zf, u=None):
        if u is not None and v3:
            page.evaluate(f"(() => {{ const u = V.bt.units.filter(x => x.side === 0)[{u}] || V.bt.units[0]; V.fitCamera(); V.centerOn(u, {zf} / 40); }})()")
        elif u is not None:
            page.evaluate(f"(() => {{ const u = V.bt.units.filter(x => x.side === 0)[{u}] || V.bt.units[0]; V.fitCamera(); V.cam.z *= {zf}; V.cam.x = u.x; V.cam.y = u.y; V.clampCam(); }})()")
        else:
            page.evaluate(f"(() => {{ V.fitCamera(); V.cam.z *= {zf}; V.clampCam(); }})()")
        wait_tiles(); page.screenshot(path=OUT + name)
    shot(f'art_{mode}_7{kind}_fit.png', 1)
    shot(f'art_{mode}_8{kind}{"3d" if v3 else ""}_z10.png', 10, 0)
    shot(f'art_{mode}_9{kind}{"3d" if v3 else ""}_z22.png', 22, 1)
    print('ERRORS', errors[:12])
    b.close()
