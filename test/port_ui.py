import sys
from playwright.sync_api import sync_playwright
OUT = '/home/claude/roma/test/shots/'
size = int(sys.argv[1]) if len(sys.argv) > 1 else 96
errors = []
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 900, 'height': 900}, device_scale_factor=2)
    page = ctx.new_page()
    page.on('console', lambda m: errors.append(f'[{m.type}] {m.text}') if m.type == 'error' and 'ERR_FAILED' not in m.text else None)
    page.on('pageerror', lambda e: errors.append(f'[pageerror] {e}'))
    page.route('**/fonts.googleapis.com/**', lambda r: r.abort())
    page.route('**/fonts.gstatic.com/**', lambda r: r.abort())
    page.goto('file:///home/claude/roma/test/page.html')
    page.wait_for_timeout(300)
    page.evaluate("""(size) => {
      S.newGame({ country: 'rome', rank: 'shog', min: 'chiso', sei: '李', mei: '信', age: 30, stats: { bu: 90, tou: 85, chi: 70, pol: 40, mi: 70 }, traits: ['moushou'], style: 'ins', diff: 1 });
      const root = document.createElement('div'); root.id = 'grid'; root.style.cssText = 'position:fixed;inset:0;background:#15211d;display:flex;flex-wrap:wrap;gap:6px;padding:8px;align-content:flex-start;z-index:999;overflow:auto';
      document.body.append(root);
      const offs = [S.myOff(), ...Object.values(G.off).filter(o => o.alive && !o.player)];
      // いろいろな国・官職・年齢を混ぜる
      offs.sort((a, b) => (D.RANKS[b.r]?.tier || 0) - (D.RANKS[a.r]?.tier || 0));
      const pick = [];
      const seen = {};
      for (const o of offs) { const k = o.c + o.r; if ((seen[k] || 0) >= 2) continue; seen[k] = (seen[k] || 0) + 1; pick.push(o); if (pick.length >= 54) break; }
      for (const o of pick) {
        const w = document.createElement('div'); w.style.cssText = 'display:flex;flex-direction:column;align-items:center;font-size:10px;color:#ddd;width:' + (size + 6) + 'px';
        w.append(PORT.canvas(o, size, { seal: true }));
        const l = document.createElement('div'); l.textContent = o.n + ' ' + (D.RANKS[o.r]?.name || '') + ' ' + o.age; w.append(l);
        root.append(w);
      }
      return pick.length;
    }""", size)
    page.wait_for_timeout(500)
    page.screenshot(path=OUT + 'portraits.png')
    print('errors', errors)
    b.close()
