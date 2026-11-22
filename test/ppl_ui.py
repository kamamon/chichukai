# people: officer card (personality/relations), faction card, factions action, graves, friends joining a battle
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
    page.wait_for_timeout(300)
    page.evaluate("""S.newGame({ country: 'carth', rank: 'shog', min: 'chiso', sei: '李', mei: '牧', age: 42, stats: { bu: 92, tou: 90, chi: 75, pol: 50, mi: 70 }, traits: ['moushou'], style: 'ins', diff: 1 }); UI.main('ppl');""")
    page.wait_for_timeout(500)
    print('factions', page.evaluate("(() => { const fs = PPL.factions('carth'); return Object.values(fs).map(f => f.n + ':' + f.ids.length + ':' + (f.leader ? f.leader.n : '-')).join(' '); })()"))
    print('fac card', page.locator('.fac-row').count(), 'friends card', page.locator('#p-graves').count())
    page.screenshot(path=OUT + 'ppl_tab.png', full_page=False)
    # officer card of a related officer
    page.evaluate("(() => { const o = Object.values(G.off).find(x => x.n === '郭開') || S.bestGeneral('carth'); UI.officerCard(o); })()")
    page.wait_for_timeout(500)
    print('card pers', page.evaluate("(() => { const el = document.querySelector('.modal.ocard .oc-bio'); return el ? el.innerText.slice(0, 40) : null; })()"), 'rels', page.locator('.oc-rel').count())
    page.screenshot(path=OUT + 'ppl_card.png')
    page.click('.modal.ocard .btn.seal'); page.wait_for_timeout(300)
    # faction action
    page.evaluate("void UI.runAct('habatsu')")
    page.wait_for_timeout(500)
    print('habatsu modal', page.evaluate("(() => { const m = document.querySelector('.modal'); return m ? m.innerText.slice(0, 120).replace(/\\n/g, ' / ') : null; })()"))
    page.screenshot(path=OUT + 'ppl_fac.png')
    btn = page.locator('.modal .ch:not([disabled])'); 
    if btn.count(): btn.last.click()
    page.wait_for_timeout(300)
    # kill a subordinate -> grave, then open graves
    page.evaluate("(() => { const id = G.me.army.subs[0]; if (id) W.killOfficer(id, '戦死'); UI.tab('ppl'); })()")
    page.wait_for_timeout(400)
    print('graves', page.evaluate("G.graves.length"), 'btn', page.locator('#p-graves').count())
    if page.locator('#p-graves').count():
        page.click('#p-graves'); page.wait_for_timeout(400); page.screenshot(path=OUT + 'ppl_graves.png')
        page.click('.modal .btn.seal'); page.wait_for_timeout(200)
    # friends join: make a friend with rel >= 40 and build a spec
    r = page.evaluate("""(() => { const me = S.myOff(); const f = S.officersOf('carth', o => !o.player && ['shog','goz'].includes(o.r) && !G.me.army.subs.includes(o.id) && o.id !== G.me.boss)[0]; if (!f) return 'nofriend'; PPL.addRel(f.id, me.id, 80); let n = 0; for (let i = 0; i < 20; i++) { const spec = W.buildSpec({ kind: 'field', pid: 'carthago', title: 't', A: { c: 'carth', troops: 20000, cmd: me, officers: [] }, B: { c: 'rome', troops: 20000, cmd: S.bestGeneral('rome'), officers: [] }, me: 'A', role: 'commander' }); if (spec.friends) n++; } return f.n + ' joined ' + n + '/20'; })()""")
    print('friends', r)
    # deploy intel shows personality + friend banner path
    page.evaluate("MAP.init()"); page.wait_for_function("MAP.ready === true", timeout=60000)
    page.evaluate("""(() => { G.me.army.sortieAsk = false; G.me.army.sortiePre = 'all'; const me = S.myOff(); const spec = W.buildSpec({ kind: 'field', pid: 'carthago', title: '邯鄲の戦い', A: { c: 'carth', troops: 20000, cmd: me, officers: [] }, B: { c: 'rome', troops: 20000, cmd: S.bestGeneral('rome'), officers: [] }, me: 'A', role: 'commander' }); if (!spec.friends) { const f = S.officersOf('carth', o => !o.player && ['shog','goz'].includes(o.r) && !G.me.army.subs.includes(o.id))[0]; spec.friends = [f.n]; spec.units.push({ side: 0, t: 'inf', n: 1000, tr: 55, wl: 2, al: 2, grp: 'front', ctrl: 'ai', ld: W.snap(f), friend: true }); } window._res = null; HOOK.battle(spec).then(r => window._res = r); })()""")
    page.wait_for_timeout(1500)
    print('intel', page.evaluate("(() => { const el = document.querySelector('.dep-intel'); return el ? el.innerText.replace(/\\n/g, ' / ').slice(0, 160) : null; })()"))
    page.screenshot(path=OUT + 'ppl_deploy.png')
    page.click('#dep-go'); page.wait_for_timeout(900)
    print('cutin', page.locator('.cutin').count(), page.evaluate("(() => { const el = document.querySelector('.cutin .ci-text b'); return el ? el.innerText : null; })()"))
    page.screenshot(path=OUT + 'ppl_friend.png')
    print('errors', errors)
    b.close()
