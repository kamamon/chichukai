"""地中海覇道 — 外で作った素材を、ゲームで使う大きさと形式（WebP）にそろえる。
usage: python3 -I tools/assets.py <素材の元フォルダ> <リポジトリ>
元フォルダは 指示書どおりの title/ face/ nation/ field/ ground/ unit/ icon/ （png か jpg）。
原本が届いたら、同じコマンドでやり直せばよい（大きいほうが綺麗になるだけ）。
"""
import sys, os, glob
from PIL import Image, ImageFilter

SRC, REPO = sys.argv[1], sys.argv[2]
OUT = os.path.join(REPO, 'assets')
ICONS = os.path.join(REPO, 'pwa', 'icons')

# 種類ごとの最大の大きさ（長い辺）と画質
RULE = {
    'title/title_16x9': (1920, 80), 'title/title_9x16': (1400, 82), 'title/scen_': (1280, 80),
    'face/': (512, 82), 'nation/emblem_': (256, 88), 'nation/banner_': (384, 86),
    'field/': (768, 78), 'ground/': (256, 84), 'unit/card_': (384, 80),
    'unit/tok_': (192, 90), 'unit/ship_': (512, 88),
}
# 継ぎ目を目立たなくする地面（自然の模様だけ。道・壁・建物の繰り返しはそのまま）
SEAMLESS = {'01', '02', '03', '05', '07', '19', '21', '25', '26', '27', '28', '32', '33'}


def rule(rel):
    for k, v in RULE.items():
        if rel.startswith(k):
            return v
    return None


def seamless(im):
    """半分ずらした絵を縁に重ねて、上下左右がつながるようにする"""
    w, h = im.size
    rolled = Image.new(im.mode, (w, h))
    rolled.paste(im.crop((w // 2, h // 2, w, h)), (0, 0))
    rolled.paste(im.crop((0, h // 2, w // 2, h)), (w - w // 2, 0))
    rolled.paste(im.crop((w // 2, 0, w, h // 2)), (0, h - h // 2))
    rolled.paste(im.crop((0, 0, w // 2, h // 2)), (w - w // 2, h - h // 2))
    mask = Image.new('L', (w, h))
    px = mask.load()
    band = 0.32
    for y in range(h):
        for x in range(w):
            ex = min(x, w - 1 - x) / (w * band)
            ey = min(y, h - 1 - y) / (h * band)
            m = max(0.0, 1.0 - min(1.0, min(ex, ey)))
            px[x, y] = int(255 * (m * m * (3 - 2 * m)))
    return Image.composite(rolled, im, mask)


def save(im, rel, q, alpha):
    dst = os.path.join(OUT, rel + '.webp')
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    if alpha:
        im.save(dst, 'WEBP', quality=q, method=6, exact=False)
    else:
        im.convert('RGB').save(dst, 'WEBP', quality=q, method=6)
    return os.path.getsize(dst)


total, n = 0, 0
for f in sorted(glob.glob(os.path.join(SRC, '*', '*.*'))):
    rel = os.path.relpath(f, SRC).rsplit('.', 1)[0].replace(os.sep, '/')
    r = rule(rel)
    if not r:
        continue
    mx, q = r
    im = Image.open(f)
    alpha = im.mode in ('RGBA', 'LA') or 'transparency' in im.info
    im = im.convert('RGBA' if alpha else 'RGB')
    if max(im.size) > mx:
        s = mx / max(im.size)
        im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    if rel.startswith('ground/'):
        # 地面は「模様（明暗）」だけを使う：灰色にして明るさの平均を真ん中(128)に寄せる。色・季節・雪はゲームの描画のまま
        im = im.resize((256, 256), Image.LANCZOS)
        if rel.split('_')[1] in SEAMLESS:
            im = seamless(im)
        g = im.convert('L')
        mean = sum(i * c for i, c in enumerate(g.histogram())) / (256 * 256)
        im = g.point(lambda v: max(0, min(255, int(round(128 + (v - mean) * 1.35))))).convert('RGB')
        rel = rel.replace('ground/tile_', 'ground/detail_')
    if rel.startswith('unit/tok_') and im.size != (192, 192):
        c = Image.new('RGBA', (192, 192)); im.thumbnail((192, 192), Image.LANCZOS)
        c.paste(im, ((192 - im.width) // 2, (192 - im.height) // 2)); im = c
    total += save(im, rel, q, alpha)
    n += 1

# ホーム画面のアイコン（四角い原本から）
app = glob.glob(os.path.join(SRC, 'icon', 'app_icon.*'))
if app:
    im = Image.open(app[0]).convert('RGB')
    s = min(im.size); im = im.crop(((im.width - s) // 2, (im.height - s) // 2, (im.width + s) // 2, (im.height + s) // 2))
    for name, size in (('icon-192.png', 192), ('icon-512.png', 512), ('apple-touch-icon.png', 180)):
        im.resize((size, size), Image.LANCZOS).save(os.path.join(ICONS, name), optimize=True)
    # マスク用：絵柄を中央の8割に収め、周りは角の色で埋める
    bg = im.getpixel((4, 4))
    m = Image.new('RGB', (512, 512), bg)
    inner = im.resize((410, 410), Image.LANCZOS)
    m.paste(inner, (51, 51))
    m.save(os.path.join(ICONS, 'icon-maskable-512.png'), optimize=True)
# 起動画面（iPhone の画面の大きさごと）
sp = glob.glob(os.path.join(SRC, 'icon', 'splash.*'))
if sp:
    im = Image.open(sp[0]).convert('RGB')
    os.makedirs(os.path.join(ICONS, 'splash'), exist_ok=True)
    for w, h in ((1320, 2868), (1290, 2796), (1206, 2622), (1179, 2556), (1284, 2778), (1170, 2532), (1242, 2688), (1125, 2436), (828, 1792), (750, 1334)):
        s = max(w / im.width, h / im.height)
        r = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
        r = r.crop(((r.width - w) // 2, (r.height - h) // 2, (r.width - w) // 2 + w, (r.height - h) // 2 + h))
        r = r.filter(ImageFilter.GaussianBlur(0.6)).quantize(colors=64, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
        r.save(os.path.join(ICONS, 'splash', f'splash-{w}x{h}.png'), optimize=True)
print(f'{n} files, {total / 1024 / 1024:.1f} MB')
