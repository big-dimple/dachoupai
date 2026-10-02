"""Shared paths and explicit font selection; usable without Blender or Pillow."""
from pathlib import Path
import hashlib
import os
import shutil

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUTPUT = ROOT / 'shots/p0-build/assets'
DEFAULT_REVIEW = ROOT / 'shots/p0-build/review'
FONT_LICENSE = 'https://github.com/notofonts/noto-cjk/blob/main/Serif/LICENSE'


def review_path(value):
    path = Path(value).expanduser().resolve()
    public = (ROOT / 'public').resolve()
    if path == public or public in path.parents:
        raise ValueError('Review output must be outside public; use shots/p0-build/review')
    return path


def add_output_arguments(parser):
    parser.add_argument('--output-root', type=Path, default=DEFAULT_OUTPUT,
                        help='Asset root containing models/textures/sprites/renders (default: shots/p0-build/assets)')
    parser.add_argument('--review-root', type=Path, default=DEFAULT_REVIEW,
                        help='Non-public preview directory; raw PNGs are kept in its raw/ child')


def add_font_arguments(parser):
    parser.add_argument('--font', type=Path, default=os.environ.get('P0_FONT'),
                        help='Explicit artwork font file, or set P0_FONT; retain its license')
    parser.add_argument('--allow-font-fallback', action='store_true',
                        help='Opt in to installed Noto fallback; output may differ from the original SC variable font')


def font_candidates():
    # Do not download fonts or consult mutable fontconfig caches.
    bases = [Path(os.environ.get('WINDIR', 'C:/Windows')) / 'Fonts',
             Path('/usr/share/fonts/truetype/noto'), Path('/usr/share/fonts/opentype/noto'),
             Path('/usr/local/share/fonts'), Path.home() / '.local/share/fonts',
             Path('/Library/Fonts'), Path.home() / 'Library/Fonts']
    names = ['NotoSerifSC-VF.ttf', 'NotoSerifCJKsc-Regular.otf', 'NotoSerifCJK-Regular.ttc']
    return [base / name for name in names for base in bases]


def resolve_font(explicit=None, allow_fallback=False, candidates=None):
    if explicit:
        path = Path(explicit).expanduser().resolve()
        if not path.is_file():
            raise ValueError(f'Configured font does not exist: {path}')
        return path
    available = next((p for p in (font_candidates() if candidates is None else candidates)
                      if p.is_file()), None)
    if not allow_fallback:
        hint = f' Installed fallback: {available}.' if available else ''
        raise ValueError('Artwork font required: use --font /path/to/licensed-font or P0_FONT.'
                         + hint + ' --allow-font-fallback explicitly accepts a different font.')
    if available is None:
        raise ValueError('No installed Noto fallback found; supply --font /path/to/licensed-font')
    print(f'FONT_FALLBACK {available} (visual equivalence to original Noto Serif SC is NOT verified)', flush=True)
    return available.resolve()


def font_record(path, fallback=False):
    return {'file': path.name, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
            'selection': 'explicit-fallback' if fallback else 'explicit-path',
            'collectionFace': 0 if path.suffix.lower() == '.ttc' else None,
            'originalFontLicense': FONT_LICENSE,
            'visualEquivalenceToOriginal': 'NOT_VERIFIED'}


def raster_python(explicit=None):
    command = explicit or os.environ.get('P0_RASTER_PYTHON')
    if command:
        return command
    for name in ['python3', 'python']:
        if executable := shutil.which(name):
            return executable
    raise ValueError('Pillow Python not found; pass --raster-python or set P0_RASTER_PYTHON')
