#!/usr/bin/env python3
"""Read-only final-file verification; Python 3.9+ and Pillow with WebP support."""
import hashlib
import io
import json
import os
from pathlib import Path
import stat
import struct
import sys

try:
    from PIL import Image, features
except ImportError:
    sys.exit('FAIL: Pillow with WebP support is required.')

ROOT = Path(os.path.abspath(__file__)).parent
SOURCE_HASH = 'e2212ea923b13ef3e89cc5a47baadff649ed308469f0a61c845b7b44607b7652'
RUNTIME_HASH = '45b2a3bf35c769d4527ac0ca63118ab6136c45a8e327734bcfd410ccd7644741'


def require(condition, message):
    if not condition:
        raise ValueError(message)


def regular(relative, directory=False):
    p = ROOT / relative
    mode = p.lstat().st_mode
    require(not stat.S_ISLNK(mode), 'Symlink rejected: ' + relative)
    require(stat.S_ISDIR(mode) if directory else stat.S_ISREG(mode),
            'Unexpected file type: ' + relative)
    return p


def verify():
    require(not ROOT.is_symlink(), 'Symlinked bundle root rejected')
    require(features.check('webp'), 'Pillow WebP decoder is required')
    root_names = {'README.md', 'manifest.json', 'verify-runtime.py', 'runtime'}
    require({p.name for p in ROOT.iterdir()} == root_names, 'Unexpected bundle inventory')
    for name in root_names - {'runtime'}:
        regular(name)
    regular('runtime', directory=True)
    require({p.name for p in (ROOT / 'runtime').iterdir()} == {'coin-reward-handdrawn.webp'},
            'Unexpected runtime inventory')
    m = json.loads(regular('manifest.json').read_text(encoding='utf-8'))
    require(m['schemaVersion'] == 1 and m['batch'] == 'handdrawn-runtime-coin-20261004'
            and m['id'] == 'coin-reward-handdrawn', 'Unexpected identity')
    s, e, r, a = (m[k] for k in ('source', 'export', 'runtime', 'alphaVerification'))
    require(s == {'filename': 'coin-reward-handdrawn-v1-original.png', 'format': 'PNG',
                  'mode': 'RGBA', 'width': 1254, 'height': 1254, 'bytes': 2541237,
                  'sha256': SOURCE_HASH, 'unchanged': True, 'includedInBundle': False},
            'Source provenance contract differs')
    require(e['format'] == 'WEBP' and e['quality'] == 90 and e['method'] == 6
            and e['lossless'] is False and e['resampling'] == 'LANCZOS', 'Encoder contract differs')
    require(e['canvasWidth'] == e['canvasHeight'] == 256 and e['backgroundRGBA'] == [0, 0, 0, 0],
            'Canvas contract differs')
    require(e['sourceCropPixels'] == {'left': 0, 'top': 0, 'width': 1254, 'height': 1254}
            and e['contentRectPixels'] == {'left': 32, 'top': 32, 'width': 192, 'height': 192}
            and e['paddingPixels'] == {'left': 32, 'top': 32, 'right': 32, 'bottom': 32},
            'Full-source uniform fit / padding contract differs')
    require(all(e[k] is True for k in ('noCrop', 'noStretch', 'noRetouching', 'noAlphaCleanup',
                                      'alphaPreservedFromResample')), 'Export preservation contract differs')
    require(r['path'] == 'runtime/coin-reward-handdrawn.webp', 'Unexpected runtime path')
    raw = regular(r['path']).read_bytes()
    require(len(raw) == r['bytes'] == 15958 and len(raw) <= r['budgetBytes'] == 100000
            and r['withinBudget'] is True, 'Runtime byte budget differs')
    require(hashlib.sha256(raw).hexdigest() == r['sha256'] == RUNTIME_HASH, 'Runtime SHA-256 mismatch')
    require(raw[:4] == b'RIFF' and raw[8:12] == b'WEBP'
            and struct.unpack('<I', raw[4:8])[0] + 8 == len(raw), 'Invalid RIFF header')
    pos, chunks = 12, []
    while pos < len(raw):
        require(pos + 8 <= len(raw), 'Truncated chunk header')
        tag, length = raw[pos:pos+4], struct.unpack('<I', raw[pos+4:pos+8])[0]
        pos += 8 + length + (length % 2)
        require(pos <= len(raw), 'Truncated chunk payload')
        chunks.append(tag)
    require(pos == len(raw) and chunks == [b'VP8X', b'ALPH', b'VP8 '], 'Unexpected WebP chunks or metadata')
    with Image.open(io.BytesIO(raw)) as image:
        image.load()
        require(image.format == r['format'] == 'WEBP' and image.mode == r['mode'] == 'RGBA'
                and image.size == (r['width'], r['height']) == (256, 256), 'Decoded format differs')
        require(not any(k in image.info for k in ('exif', 'xmp', 'icc_profile'))
                and r['metadataFields'] == [], 'Unexpected private metadata')
        require(r['decodedBytesRGBA'] == 262144, 'Decoded byte accounting differs')
        alpha = image.getchannel('A')
        require(list(alpha.getextrema()) == a['extrema'] == [0, 255], 'Alpha extrema differ')
        require(hashlib.sha256(alpha.tobytes()).hexdigest() == a['alphaPlaneSHA256'], 'Alpha plane hash differs')
        require(a['centerPixel'] == [128, 128] and alpha.getpixel((128, 128)) == a['centerAlpha'] == 0,
                'Center opening is not transparent')
        corners = [alpha.getpixel(p) for p in ((0, 0), (255, 0), (0, 255), (255, 255))]
        require(corners == a['cornerAlphas'] == [0, 0, 0, 0], 'Corners are not transparent')
        require(a['transparentHoleBoxPixels'] == [112, 112, 143, 143]
                and alpha.crop((112, 112, 143, 143)).getextrema() == (0, 0), 'Square opening differs')
        for box in ((0, 0, 256, 32), (0, 224, 256, 256), (0, 32, 32, 224), (224, 32, 256, 224)):
            require(alpha.crop(box).getextrema() == (0, 0), 'Padding is not transparent')
        require(list(alpha.getbbox()) == a['nonzeroBBoxPixels'] == [37, 38, 219, 218], 'Alpha footprint differs')
        require(a['effectiveThreshold'] == 8, 'Unexpected effective-alpha threshold')
        bbox = alpha.point(lambda value: 255 if value >= 8 else 0).getbbox()
        require(list(bbox) == a['effectiveBBoxPixels'] == [40, 40, 217, 216], 'Effective footprint differs')
        require(a['effectiveCanvasFraction'] == [(bbox[2] - bbox[0]) / 256, (bbox[3] - bbox[1]) / 256],
                'Footprint fraction differs')
        require(all(a[k] is True for k in ('decoded', 'resampledAlphaExactMatch', 'holeBoxFullyTransparent',
                                          'canvasEdgesFullyTransparent', 'paddingFullyTransparent')),
                'Alpha-validation contract differs')
        require(set(a['smallSizeChecks']) == {'56', '72', '96'}, 'Unexpected small-size checks')
        for size in (56, 72, 96):
            plane = image.resize((size, size), Image.Resampling.LANCZOS).getchannel('A')
            mid = size // 2
            left = right = mid
            while left >= 0 and plane.getpixel((left, mid)) == 0:
                left -= 1
            while right < size and plane.getpixel((right, mid)) == 0:
                right += 1
            actual = {'centerAlpha': plane.getpixel((mid, mid)),
                      'transparentHoleWidthAtCenterPixels': right - left - 1}
            require(actual == a['smallSizeChecks'][str(size)] and actual['centerAlpha'] == 0
                    and actual['transparentHoleWidthAtCenterPixels'] >= 4, 'Small-size opening differs')
    require(m['integration'] == {'included': False, 'loadPolicy': 'on demand', 'rendererModified': False,
                                  'loaderModified': False}, 'Asset-only contract differs')
    print(json.dumps({'status': 'PASS', 'runtimeFiles': 1, 'runtimeBytes': len(raw),
                      'decodedRGBA': True, 'alphaChecks': 'PASS', 'sourcePngsRequired': False,
                      'integrationIncluded': False}))


if __name__ == '__main__':
    try:
        verify()
    except (KeyError, ValueError, OSError, TypeError) as error:
        sys.exit('FAIL: ' + str(error))
