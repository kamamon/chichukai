#!/usr/bin/env python3
"""地中海の地理データ（経度・緯度）を 1000×720 の地図座標に直し、
src/20_data.js（州・隣接・仮の地図）と src/24_geo.js（陸・川・山…）へ差し込む。
使い方: python3 data/mk_geo.py
"""
import os, sys, json, re, math
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import geo_coast as GC, geo_prov as GP, geo_feat as GF, geo_towns as GT

def X(lon): return (lon + 10) * 20
def Y(lat): return (51 - lat) * 25.4
PUSH = 30  # 枠の上の点は外へ押し出す（ゆらしても枠の内側に海岸線が出ないように）
def proj(pt, push=True):
    lon, lat = pt
    x, y = X(lon), Y(lat)
    if push:
        if lon <= -10 + 1e-9: x = -PUSH
        if lon >= 40 - 1e-9: x = 1000 + PUSH
        if lat >= 51 - 1e-9: y = -PUSH
        if lat <= 23 + 1e-9: y = 720 + PUSH
    return (round(x, 1), round(y, 1))

def r1(v): return round(v, 1)
def js(v): return json.dumps(v, ensure_ascii=False, separators=(',', ':'))

def in_poly(poly, x, y):
    ins = False
    n = len(poly)
    j = n - 1
    for i in range(n):
        xi, yi = poly[i]; xj, yj = poly[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            ins = not ins
        j = i
    return ins

def dp(pts, tol):
    """Douglas–Peucker（閉じた輪にも使う）"""
    if len(pts) < 3: return pts
    keep = [False] * len(pts); keep[0] = keep[-1] = True
    st = [(0, len(pts) - 1)]
    while st:
        i, j = st.pop()
        ax, ay = pts[i]; bx, by = pts[j]
        dx, dy = bx - ax, by - ay; l2 = dx * dx + dy * dy
        md, mk = -1, -1
        for k in range(i + 1, j):
            px, py = pts[k][0] - ax, pts[k][1] - ay
            d = (px * px + py * py) if l2 < 1e-9 else (px * dy - py * dx) ** 2 / l2
            if d > md: md, mk = d, k
        if md > tol * tol:
            keep[mk] = True; st += [(i, mk), (mk, j)]
    return [p for p, k in zip(pts, keep) if k]

# ---------- 陸 ----------
lands = [
    {'n': 'ヨーロッパ', 'p': [proj(p) for p in GC.EUROPE]},
    {'n': 'アジアとアフリカ', 'p': [proj(p) for p in GC.ASIA_AFRICA]},
]
for n, pts in GC.ISLANDS.items():
    lands.append({'n': n, 'isle': 1, 'p': [proj(p, False) for p in pts]})

def on_land(x, y):
    return any(in_poly(L['p'], x, y) for L in lands)

# ---------- 州 ----------
provs = []
ids = set()
errs = []
for row in GP.PROV:
    pid, name, owner, lon, lat, pop, terr, cul, desc, extra = row
    if pid in ids: errs.append('dup ' + pid)
    ids.add(pid)
    x, y = r1(X(lon)), r1(Y(lat))
    if not on_land(x, y): errs.append('州が海の上: %s (%s,%s)' % (pid, x, y))
    if pid not in GT.TOWNS: errs.append('町の名がない: ' + pid)
    if cul not in GT.CULT: errs.append('文化がない: %s %s' % (pid, cul))
    p = {'id': pid, 'name': name, 'o': owner, 'x': x, 'y': y, 'pop': pop, 't': terr, 'cul': cul}
    if extra.get('cap'): p['cap'] = True
    if desc: p['desc'] = desc
    provs.append(p)
edges = []
seen = set()
for a, b in GP.LAND:
    k = tuple(sorted((a, b)))
    if a not in ids or b not in ids: errs.append('隣接に知らない州: %s-%s' % (a, b))
    if k in seen: errs.append('隣接が二重: %s-%s' % k)
    seen.add(k); edges.append([a, b])
for a, b in GP.SEA:
    k = tuple(sorted((a, b)))
    if a not in ids or b not in ids: errs.append('渡海に知らない州: %s-%s' % (a, b))
    if k in seen: errs.append('渡海が二重: %s-%s' % k)
    seen.add(k); edges.append([a, b, 1])
deg = {i: 0 for i in ids}
for e in edges: deg[e[0]] += 1; deg[e[1]] += 1
for i, d in deg.items():
    if d == 0: errs.append('孤立した州: ' + i)
# つながり
adj = {i: set() for i in ids}
for e in edges: adj[e[0]].add(e[1]); adj[e[1]].add(e[0])
st = [provs[0]['id']]; vis = set(st)
while st:
    c = st.pop()
    for n in adj[c]:
        if n not in vis: vis.add(n); st.append(n)
if len(vis) != len(ids): errs.append('つながっていない州: ' + ','.join(sorted(ids - vis)))
# 町の名の重複
allt = {}
for pid, ts in GT.TOWNS.items():
    for t in ts:
        if t in allt: errs.append('町の名が重複: %s (%s, %s)' % (t, allt[t], pid))
        allt[t] = pid
if errs:
    print('\n'.join(errs)); sys.exit(1)

# ---------- 地物 ----------
rivers = [{'n': n, 'w': w, **({'lab': 1} if lab else {}), 'p': [proj(p, False) for p in pts]} for (n, w, lab, pts) in GF.RIVERS]
lakes = []
for (n, lon, lat, rx, ry, rot, kind) in GF.LAKES:
    L = {'n': n, 'x': r1(X(lon)), 'y': r1(Y(lat)), 'rx': r1(max(1.2, rx * 20)), 'ry': r1(max(1.0, ry * 25.4)), 'rot': rot}
    if kind == 'marsh': L['marsh'] = 1
    if kind == 'salt': L['salt'] = 1
    lakes.append(L)
marsh = [{'x': r1(X(lon)), 'y': r1(Y(lat)), 'rx': r1(rx * 20), 'ry': r1(ry * 25.4)} for (lon, lat, rx, ry) in GF.MARSH]
ranges = [{'n': n, 'h': h, 'w': w, **({'lab': 1} if lab else {}), 'p': [proj(p, False) for p in pts]} for (n, h, w, lab, pts) in GF.RANGES]
masks = []
for (n, base, rough, flag, poly) in GF.MASKS:
    m = {'n': n, 'base': base, 'rough': rough, 'poly': [proj(p) for p in poly]}
    if flag == 'steppe': m['steppe'] = 1
    masks.append(m)
deserts = [{'n': n, 'x': r1(X(lon)), 'y': r1(Y(lat)), 'rx': r1(rx * 20), 'ry': r1(ry * 25.4)} for (n, lon, lat, rx, ry) in GF.DESERTS]
passes = [{'n': n, 'x': r1(X(lon)), 'y': r1(Y(lat))} for (n, lon, lat) in GF.PASSES]
sites = [{'n': n, 'x': r1(X(lon)), 'y': r1(Y(lat))} for (n, lon, lat) in GF.SITES]
regions = [{'n': n, 'x': r1(X(lon)), 'y': r1(Y(lat)), 's': s} for (n, lon, lat, s) in GF.REGIONS]
seas = [{'n': n, 'x': r1(X(lon)), 'y': r1(Y(lat))} for (n, lon, lat) in GF.SEAS]
straits = [{'n': n, 'x': r1(X(lon)), 'y': r1(Y(lat)), 'r': r} for (n, lon, lat, r) in GF.STRAITS]
for s in sites + passes:
    if not on_land(s['x'], s['y']) and s['n'] not in ('ヘラクレスの柱', 'ミュライ', 'エクノモス', 'アエガテス', 'ドレパナ'):
        print('注意: 名所が海の上', s['n'])

cult = {k: list(v) for k, v in GT.CULT.items()}

geo_js = '\n'.join([
    '/* @@GEO_DATA_BEGIN — data/mk_geo.py が作る（手で直さない）。経度・緯度を x=(経度+10)*20, y=(51-緯度)*25.4 で地図に */',
    '/* ---------- 陸（海が地。大陸と島の多角形） ---------- */',
    'GEO.LANDS = [\n' + ',\n'.join('  ' + js(L) for L in lands) + '\n];',
    '// 海峡・地峡（海岸線のゆらぎを弱める所）',
    'GEO.STRAITS = ' + js(straits) + ';',
    '/* ---------- 川 ---------- w:幅（単位） lab:名を描く */',
    'GEO.RIVERS = [\n' + ',\n'.join('  ' + js(R) for R in rivers) + '\n];',
    '/* ---------- 湖・沢 ---------- */',
    'GEO.LAKES = [\n' + ',\n'.join('  ' + js(L) for L in lakes) + '\n];',
    '// 湿地帯（湖にはならない低湿地）',
    'GEO.MARSH = ' + js(marsh) + ';',
    '/* ---------- 山脈 ---------- h:高さ0〜1 w:裾野の広さ */',
    'GEO.RANGES = [\n' + ',\n'.join('  ' + js(R) for R in ranges) + '\n];',
    '// 地勢の土台（高原・盆地・平野）',
    'GEO.MASKS = [\n' + ',\n'.join('  ' + js(M) for M in masks) + '\n];',
    'GEO.DESERTS = ' + js(deserts) + ';',
    '/* ---------- 長城・峠・名所 ---------- */',
    'GEO.WALLS = [];',
    'GEO.PASSES = ' + js(passes) + ';',
    'GEO.SITES = ' + js(sites) + ';',
    'GEO.REGIONS = ' + js(regions) + ';',
    'GEO.SEAS = ' + js(seas) + ';',
    '/* ---------- 州ごとの町（先頭は州都） ---------- */',
    'GEO.COUNTY_NAMES = {\n' + ',\n'.join('  %s: %s' % (k, js(v)) for k, v in GT.TOWNS.items()) + ',\n};',
    '// 村の名の音（文化ごと：前の音・後の音）',
    'GEO.CULT = {\n' + ',\n'.join('  %s: %s' % (k, js(v)) for k, v in cult.items()) + ',\n};',
    '/* @@GEO_DATA_END */',
])

# ---------- 仮の地図（地図ができるまで・題字の背景） ----------
deco_lands = []
for L in lands:
    pts = list(L['p'])
    if not L.get('isle') or len(pts) > 8:
        q = dp(pts + [pts[0]], 2.2)[:-1]
    else:
        q = pts
    if len(q) >= 3: deco_lands.append([[int(round(x)), int(round(y))] for x, y in q])
deco_rivers = [{'n': R['n'], 'w': round(min(3.2, R['w'] * 1.2), 1), 'p': [[int(round(x)), int(round(y))] for x, y in dp(R['p'], 2.5)]} for R in rivers if R['w'] >= 1.3]
prov_js = '\n'.join([
    '/* @@PROV_BEGIN — data/mk_geo.py が作る（手で直さない） */',
    '/* ---------- 州（戦略マップ 1000×720） ---------- */',
    '// t: 地勢 plain/hill/mount/forest/river/marsh/steppe/coast/desert  cul: 文化（村の名・肖像）',
    'D.PROVINCES = [\n' + ',\n'.join('  ' + js(p) for p in provs) + ',\n];',
    '// 隣接。三つ目が 1 なら海を渡る道（渡海）',
    'D.EDGES = [\n' + ',\n'.join('  ' + js(edges[i:i + 8])[1:-1] for i in range(0, len(edges), 8)) + ',\n];',
    '/* 地図の装飾（地図ができるまでの仮の絵：陸・大河） */',
    'D.MAPDECO = {\n  lands: ' + js(deco_lands) + ',\n  rivers: ' + js(deco_rivers) + ',\n};',
    '/* @@PROV_END */',
])

def splice(path, begin, end, body, fallback=None):
    s = open(path, encoding='utf-8').read()
    if begin in s:
        i = s.index(begin); j = s.index(end, i)
        j = s.index('\n', j) + 1 if '\n' in s[j:] else len(s)
        s = s[:i] + body + '\n' + s[j:]
    elif fallback:
        a, b = fallback
        i = s.index(a); j = s.index(b, i); j = s.index('\n', j) + 1
        s = s[:i] + body + '\n' + s[j:]
    else:
        raise SystemExit('印が見つからない: ' + path)
    open(path, 'w', encoding='utf-8').write(s)

splice(os.path.join(ROOT, 'src/24_geo.js'), '/* @@GEO_DATA_BEGIN', '/* @@GEO_DATA_END */', geo_js)
splice(os.path.join(ROOT, 'src/20_data.js'), '/* @@PROV_BEGIN', '/* @@PROV_END */', prov_js)
print('州 %d, 隣接 %d（渡海 %d）, 陸 %d, 川 %d, 湖 %d, 山 %d, 町 %d' % (len(provs), len(edges), sum(1 for e in edges if len(e) > 2), len(lands), len(rivers), len(lakes), len(ranges), len(allt)))
print('GEO data %.1f KB, PROV data %.1f KB' % (len(geo_js.encode()) / 1024, len(prov_js.encode()) / 1024))
