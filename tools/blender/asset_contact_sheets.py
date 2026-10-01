"""Create compact A00 review contact sheets from unchanged rasters and fresh GLB renders.
Usage: PYTHON tools/blender/asset_contact_sheets.py --renders shots/a00-render --out DIR
Requires Pillow; does not generate replacement game art.
"""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, __version__ as pillow_version

ROOT = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser()
parser.add_argument('--renders', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
parser.add_argument('--oblique', type=Path)
args = parser.parse_args()
args.out = args.out.resolve()
if args.out == ROOT / 'public' or ROOT / 'public' in args.out.parents:
    raise ValueError('Review output must not overwrite public assets')
args.out.mkdir(parents=True, exist_ok=True)
font = ImageFont.load_default(size=13)
reviewed = set()


def tile(image, size):
    bg = Image.new('RGB', size, '#ddd8cf')
    d = ImageDraw.Draw(bg)
    for y in range(0, size[1], 12):
        for x in range(0, size[0], 12):
            if (x // 12 + y // 12) % 2: d.rectangle((x, y, x + 11, y + 11), fill='#b9bbb9')
    im = image.convert('RGBA')
    im.thumbnail(size, Image.Resampling.LANCZOS)
    bg.paste(im, ((size[0] - im.width) // 2, (size[1] - im.height) // 2), im)
    return bg


def sheet(name, items, cols=5, size=(192, 192)):
    w, h = size
    output = Image.new('RGB', (cols * w, ((len(items) + cols - 1) // cols) * (h + 30)), '#f3eadb')
    d = ImageDraw.Draw(output)
    for n, (key, label, im) in enumerate(items):
        x, y = n % cols * w, n // cols * (h + 30)
        output.paste(tile(im, size), (x, y))
        d.text((x + 3, y + h + 3), label, font=font, fill='#24313b')
        reviewed.add(key)
    output.save(args.out / (name + '.webp'), quality=88, method=6)


assets = ROOT / 'public/assets'
portraits = []
for p in sorted((assets / 'characters').glob('*.png')):
    portraits.append((p.relative_to(ROOT).as_posix(), p.stem + ' original', Image.open(p)))
sheet('characters-original', portraits, 6, (192, 320))
avatars = []
for p in sorted((assets / 'characters').glob('*.webp')):
    avatars.append((p.relative_to(ROOT).as_posix(), p.stem, Image.open(p)))
sheet('characters-avatar', avatars, 6, (128, 128))
small = Image.new('RGB', (6 * 140, 168), '#f3eadb')
d = ImageDraw.Draw(small)
for n, (key, label, im) in enumerate(avatars):
    small.paste(im.resize((64, 64), Image.Resampling.LANCZOS), (n * 140, 0))
    small.paste(im.resize((48, 48), Image.Resampling.LANCZOS), (n * 140, 78))
    d.text((n * 140, 133), label.replace('.avatar', ''), font=font, fill='#24313b')
small.save(args.out / 'avatars-64-48.webp', quality=95)

model_items = []
for p in sorted(args.renders.glob('*.png')):
    if p.stem.startswith('clip-'): continue
    model_items.append(('public/assets/models/' + p.stem + '.glb', p.stem, Image.open(p)))
sheet('glb-static', model_items, 5, (224, 224))
clips = []
for p in sorted(args.renders.glob('clip-*.png')):
    clips.append(('public/assets/models/card-animation-templates.glb', p.stem, Image.open(p)))
sheet('glb-animation-samples', clips, 5, (192, 192))
for name in ['bend', 'flip']:
    frames = [tile(Image.open(p), (320, 320)) for p in sorted(args.renders.glob(f'clip-{name}-*.png'))]
    if not frames: continue
    frames[0].save(args.out / f'clip-{name}.webp', save_all=True, append_images=frames[1:], duration=250, loop=0, quality=80)

for name, paths, cols, size in [
    ('textures', sorted((assets / 'textures').rglob('*.png')), 5, (160, 160)),
    ('existing-renders', sorted((assets / 'renders').rglob('*.webp')), 5, (192, 160)),
]:
    sheet(name, [(p.relative_to(ROOT).as_posix(), p.stem, Image.open(p)) for p in paths], cols, size)

atlas_frames = []
for p in sorted((assets / 'sprites').rglob('*.json')):
    data = json.loads(p.read_text(encoding='utf8'))
    atlas = Image.open(p.with_suffix('.png'))
    for label, entry in data['frames'].items():
        f = entry['frame']
        atlas_frames.append((p.relative_to(ROOT).as_posix(), label, atlas.crop((f['x'], f['y'], f['x'] + f['w'], f['y'] + f['h']))))
        reviewed.add(p.with_suffix('.png').relative_to(ROOT).as_posix())
sheet('atlas-frames', atlas_frames, 8, (112, 112))
if args.oblique:
    sheet('bend-oblique', [('public/assets/models/card-animation-templates.glb', p.stem, Image.open(p))
          for p in sorted(args.oblique.glob('clip-bend-*.png'))], 5, (192, 192))
    edge_sources = [args.renders / 'poker-card-master.png', args.renders / 'joker-frame-common.png',
                    args.renders / 'word-out-of-control.png', assets / 'sprites/p0/hit-cinnabar.png']
    edge = Image.new('RGB', (4 * 192, 2 * 216), '#f3eadb')
    d = ImageDraw.Draw(edge)
    for n, p in enumerate(edge_sources):
        im = Image.open(p).convert('RGBA')
        if p.stem == 'hit-cinnabar': im = im.crop((768, 256, 1024, 512))
        im.thumbnail((192, 192), Image.Resampling.LANCZOS)
        for row, color in enumerate(['#ffffff', '#182c2b']):
            bg = Image.new('RGB', (192, 192), color)
            bg.paste(im, ((192 - im.width) // 2, (192 - im.height) // 2), im)
            edge.paste(bg, (n * 192, row * 216))
            d.text((n * 192 + 2, row * 216 + 193), p.stem, font=font, fill='#24313b')
    edge.save(args.out / 'alpha-light-dark.webp', quality=95)
print(f'A00_CONTACTS: {len(reviewed)} source paths previewed; Pillow {pillow_version}')
