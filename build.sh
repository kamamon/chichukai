#!/bin/sh
set -e
cd "$(dirname "$0")"
mkdir -p dist/pages/icons test
OUT=dist/roma.html
{
  cat src/00_head.html
  cat src/01_body.html
  echo "<script>"
  echo "const DATA_JSON = $(python3 -c "import json; print(json.dumps({k: json.load(open('data/' + k + '.json', encoding='utf-8')) for k in ['hist', 'scenarios', 'lines', 'events']}, ensure_ascii=False, separators=(',', ':')))");"
  echo "const ASSET_LIST = $(python3 -c "import os, json; print(json.dumps({os.path.relpath(os.path.join(r, f), 'assets').rsplit('.', 1)[0]: os.path.relpath(os.path.join(r, f), 'assets') for r, d, fs in sorted(os.walk('assets')) for f in sorted(fs) if f.endswith('.webp')}, separators=(',', ':')))");"
  for f in 10_util 15_assets 20_data 22_traits 24_geo 26_hist 30_state 40_world 42_land 45_actions 46_events 47_siege 48_people 49_meta 50_mod 60_battle 62_field 63_fields 64_naval 70_battle_view 72_field_view 74_battle_3d 76_portrait 80_ui 81_map 82_ui_main 83_cutin 84_ui_mini 85_duel 86_sound 87_meta_ui 88_mod_ui 89_fields_ui 90_main; do cat src/$f.js; echo; done
  echo "</script>"
} > $OUT
# 構文チェック
python3 - <<'PY'
import re
s=open('dist/roma.html').read()
js=s[s.index('<script>')+8:s.rindex('</script>')]
open('dist/_check.js','w').write(js)
PY
node --check dist/_check.js && echo "SYNTAX_OK $(wc -c < $OUT) bytes"
# PWA 一式（GitHub Pages に置く）
mkdir -p dist/pages/icons
python3 - <<'PY'
html = open('dist/roma.html', encoding='utf-8').read()
page = '<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>body{margin:0}[hidden]{display:none!important}img{max-width:100%}</style></head><body>' + html + '</body></html>'
open('dist/pages/index.html', 'w', encoding='utf-8').write(page)
PY
cp pwa/manifest.webmanifest dist/pages/
cp pwa/icons/*.png dist/pages/icons/
rm -rf dist/pages/assets dist/pages/icons/splash && cp -r assets dist/pages/assets && cp -r pwa/icons/splash dist/pages/icons/splash
python3 - <<'PY2'
import os, re
p = 'dist/pages/index.html'; s = open(p, encoding='utf-8').read()
DEV = {(1320, 2868): (440, 956, 3), (1290, 2796): (430, 932, 3), (1206, 2622): (402, 874, 3), (1179, 2556): (393, 852, 3), (1284, 2778): (428, 926, 3), (1170, 2532): (390, 844, 3), (1242, 2688): (414, 896, 3), (1125, 2436): (375, 812, 3), (828, 1792): (414, 896, 2), (750, 1334): (375, 667, 2)}
links = ''.join(f'<link rel="apple-touch-startup-image" media="(device-width: {w}px) and (device-height: {h}px) and (-webkit-device-pixel-ratio: {r}) and (orientation: portrait)" href="icons/splash/splash-{W}x{H}.png">' for (W, H), (w, h, r) in DEV.items() if os.path.exists(f'dist/pages/icons/splash/splash-{W}x{H}.png'))
s = s.replace('<head>', '<head>' + links, 1)
open(p, 'w', encoding='utf-8').write(s)
PY2
VER=$(md5sum $OUT | cut -c1-10)
AVER=$(cd assets && find . -name '*.webp' -printf '%p %s\n' | sort | md5sum | cut -c1-10)
ALIST=$(cd assets && find . -name '*.webp' | sort | sed 's|^\./|./assets/|' | python3 -c "import sys, json; print(json.dumps([l.strip() for l in sys.stdin if l.strip()], separators=(',', ':')))")
sed -e "s/__VERSION__/$VER/" -e "s/__ASSET_VER__/$AVER/" pwa/sw.js | python3 -c "import sys; sys.stdout.write(sys.stdin.read().replace('__ASSETS__', sys.argv[1]))" "$ALIST" > dist/pages/sw.js
# テスト用ページ
python3 - <<'PY'
html = open('dist/roma.html', encoding='utf-8').read()
page = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>body{margin:0}[hidden]{display:none!important}</style></head><body>' + html + '</body></html>'
open('test/page.html', 'w', encoding='utf-8').write(page)
PY
rm -rf test/assets && ln -s ../assets test/assets
