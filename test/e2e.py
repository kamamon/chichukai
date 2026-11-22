import sys, json, os, time, random
from playwright.sync_api import sync_playwright

OUT = '/home/claude/roma/test/shots/'
os.makedirs(OUT, exist_ok=True)
html = open('/home/claude/roma/dist/roma.html', encoding='utf-8').read()
page_html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>body{margin:0}[hidden]{display:none!important}</style></head><body>' + html + '</body></html>'
open('/home/claude/roma/test/page.html', 'w', encoding='utf-8').write(page_html)

rank = sys.argv[1] if len(sys.argv) > 1 else 'goch'
country = sys.argv[2] if len(sys.argv) > 2 else 'rome'
months = int(sys.argv[3]) if len(sys.argv) > 3 else 4
errors = []
shot_n = [0]
def shot(page, name):
    shot_n[0] += 1
    page.screenshot(path=OUT + f'e_{rank}_{shot_n[0]:02d}_{name}.png')

def handle_modals(page, budget=60, prefer=None):
    """click through modals; returns number handled"""
    n = 0
    t0 = time.time()
    while time.time() - t0 < budget:
        if os.environ.get('DBG'):
            st = page.evaluate("({m: document.querySelectorAll('.modal').length, bt: !!(typeof V !== 'undefined' && V.bt), ended: !!(typeof V !== 'undefined' && V.bt && V.bt.ended), paused: typeof V !== 'undefined' && V.bt && V.bt.paused, t: typeof V !== 'undefined' && V.bt && Math.round(V.bt.time), cur: UI.cur, title: (document.querySelector('.modal h3')||{}).innerText})")
            print('  dbg', json.dumps(st, ensure_ascii=False), flush=True)
        # duel modal
        if page.locator('#d-acts').count():
            btns = page.locator('#d-acts button:not([disabled])')
            if btns.count(): btns.nth(random.randrange(min(3, btns.count()))).click()
            else: page.evaluate("(() => { const c = document.querySelector('.dc-cv'); if (c) c.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); })()")
            page.wait_for_timeout(150); n += 1; continue
        # battle deploy
        if page.locator('#dep-go').count() and page.locator('#dep-go').is_visible():
            try: page.click('#dep-go', timeout=8000)
            except Exception as e:
                shot(page, 'depfail')
                print('dep-go fail', page.evaluate("(() => { const b = document.querySelector('#dep-go'); const r = b && b.getBoundingClientRect(); const el = r && document.elementFromPoint(r.left + r.width/2, r.top + r.height/2); return { r: r && [r.left|0, r.top|0, r.width|0, r.height|0], at: el && (el.tagName + '.' + el.className), modals: document.querySelectorAll('.modal').length, cut: document.querySelectorAll('.cutin').length, cur: UI.cur, hidden: !!document.querySelector('#scr-battle').hidden, bt: !!(V.bt), deploy: V.ui && V.ui.deploy }; })()"), flush=True)
                page.click('#dep-go', force=True)
            page.evaluate("V.ui && (V.ui.speed = 4, V.setSpeed(4))"); n += 1; continue
        if page.locator('.modal').count() == 0:
            if page.evaluate("!!(typeof V !== 'undefined' && V.bt && !V.bt.ended)"):
                page.wait_for_timeout(2500)
                if not getattr(handle_modals, 'shot_battle', False):
                    handle_modals.shot_battle = True; shot(page, 'battle')
                page.evaluate("(() => { const bt = V.bt; if (!bt || bt.ended || bt.paused || V.ui.deploy || V.ui.cutin) return; V.ui.closed = true; let g = 0; while (!bt.ended && !bt.paused && g++ < 4000) B.step(bt, 0.2); V.ui.closed = false; V.loop(); })()")
                page.wait_for_timeout(300)
                continue
            if page.evaluate("UI.cur === 'battle'"):
                page.wait_for_timeout(400); continue
            break
        if page.locator('#db-acts').count():
            btns = page.locator('#db-acts button:not([disabled])')
            if btns.count(): btns.nth(random.randrange(btns.count())).click()
            page.wait_for_timeout(150); n += 1; continue
        chs = page.locator('.modal .ch:not([disabled])')
        if chs.count():
            labels = [chs.nth(i).inner_text() for i in range(chs.count())]
            idx = 0
            if prefer:
                for i, l in enumerate(labels):
                    if prefer in l: idx = i; break
            # avoid やめる when possible
            if 'やめる' in labels[idx] and len(labels) > 1: idx = 0 if 'やめる' not in labels[0] else 1
            chs.nth(idx).click(); n += 1; page.wait_for_timeout(120); continue
        seal = page.locator('.modal .btn.seal')
        if seal.count():
            try: seal.first.click(timeout=4000)
            except Exception: seal.first.click(force=True)
            n += 1; page.wait_for_timeout(120); continue
        btn = page.locator('.modal button:not([disabled])')
        if btn.count(): btn.first.click(); n += 1; page.wait_for_timeout(120); continue
        break
    return n

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
    page.click('#t-new'); page.click(f'.pick[data-c="{country}"]'); page.click('#s-next'); page.click(f'.pick[data-r="{rank}"]'); page.click('#s-next')
    page.wait_for_timeout(200)
    page.click('#e-start'); page.wait_for_timeout(300)
    page.wait_for_function("typeof G !== 'undefined' && G && G.me && document.querySelector('.modal')", timeout=60000)
    handle_modals(page, 5)
    shot(page, 'start')
    for m in range(months):
        # use actions until AP runs out
        for k in range(6):
            ap = page.evaluate('G.me.ap')
            if ap <= 0: break
            ok = page.evaluate("""(() => { const cats = A.visibleCats(); const L = A.list.filter(a => cats.includes(a.cat)).filter(a => { const s = A.status(a); return s.show && s.ok && a.ap > 0; }); if (!L.length) return null; const pref = L.find(a => a.id === 'offers') || (Math.random() < 0.5 ? L.find(a => ['kunren','kannou','tanren','junsatsu'].includes(a.id)) : null) || L[Math.floor(Math.random()*L.length)]; window._a = pref.id; return pref.id; })()""")
            if not ok: break
            print('act', ok, flush=True)
            page.evaluate(f"void UI.runAct('{ok}')")
            page.wait_for_timeout(200)
            handle_modals(page, 240)
            if page.evaluate('!!G.over'): break
        if page.evaluate('!!G.over'): break
        page.click('#endturn')
        page.wait_for_timeout(200)
        handle_modals(page, 300)
        st = page.evaluate("({d: S.dateStr(), r: D.RANKS[G.me.rank].name, m: G.me.merit, g: G.me.gold, army: S.armyTotal(), over: G.over && G.over.kind, scr: UI.cur})")
        print('month', m, json.dumps(st, ensure_ascii=False))
        if st['over']: break
    shot(page, 'end')
    for t in ['map', 'act', 'army', 'dom', 'ppl']:
        page.click(f'#nav button[data-t="{t}"]'); page.wait_for_timeout(150)
    shot(page, 'ppl')
    print('ERRORS:', json.dumps(errors[:20], ensure_ascii=False, indent=1))
    b.close()
