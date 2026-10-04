#!/usr/bin/env python3
"""Read-only, location-independent checks for the delivered contour reference."""

import hashlib
import json
from pathlib import Path
import struct
import sys


EXPECTED_SHA256 = "7fd4742a2e91eeb8f07014a80de69c2a24491a4ad8ed9ded3f99094c84c5ea2c"
EXPECTED_BYTES = 45846
EXPECTED_SIZE = (768, 384)


def require(condition, message):
    if not condition:
        raise ValueError(message)


def main():
    try:
        from PIL import Image, features

        require(features.check("webp"), "Pillow must support WebP decoding")
        base = Path(__file__).resolve().parent
        manifest_path = base / "manifest.json"
        image_path = base / "reference.webp"
        require(not manifest_path.is_symlink(), "manifest must not be a symlink")
        require(not image_path.is_symlink(), "image must not be a symlink")
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        asset = manifest["asset"]
        require(manifest["schemaVersion"] == 1, "unsupported manifest schema")
        require(manifest["runtimeUse"] is False, "reference must not declare runtime use")
        require(manifest["runtimeBytesAdded"] == 0, "reference adds no runtime bytes")
        require(asset["path"] == "reference.webp", "unexpected asset path")
        require(asset["sha256"] == EXPECTED_SHA256, "manifest hash mismatch")
        require(asset["bytes"] == EXPECTED_BYTES, "manifest byte count mismatch")
        require((asset["width"], asset["height"]) == EXPECTED_SIZE, "manifest dimensions mismatch")
        require(asset["mode"] == "RGBA", "manifest must declare RGBA")

        data = image_path.read_bytes()
        require(len(data) == EXPECTED_BYTES, "image byte count mismatch")
        require(hashlib.sha256(data).hexdigest() == EXPECTED_SHA256, "image SHA-256 mismatch")
        require(data[:4] == b"RIFF" and data[8:12] == b"WEBP", "invalid WebP container")
        require(struct.unpack_from("<I", data, 4)[0] + 8 == len(data), "RIFF length mismatch")
        offset = 12
        chunks = []
        while offset < len(data):
            require(offset + 8 <= len(data), "truncated chunk header")
            kind = data[offset:offset + 4]
            length = struct.unpack_from("<I", data, offset + 4)[0]
            offset += 8 + length + (length & 1)
            require(offset <= len(data), "truncated chunk payload")
            chunks.append(kind)
        require(offset == len(data), "invalid chunk alignment")
        require(chunks == [b"VP8X", b"ALPH", b"VP8 "], "unexpected chunks, metadata, or animation")

        with Image.open(image_path) as image:
            require(image.format == "WEBP", "decoder format mismatch")
            require(getattr(image, "n_frames", 1) == 1, "image must have exactly one frame")
            image.load()  # Fully decode compressed pixel and alpha data.
            require(image.size == EXPECTED_SIZE, "decoded dimensions mismatch")
            require(image.mode == "RGBA", "decoded image must retain alpha")
            alpha = image.getchannel("A")
            require(alpha.getextrema() == (0, 255), "transparent and opaque alpha values required")
            require(any(0 < value < 255 for value in alpha.getdata()), "antialiased alpha required")
            require(hashlib.sha256(alpha.tobytes()).hexdigest() == asset["alphaSha256"], "alpha SHA-256 mismatch")

        print("PASS: 45846 bytes; SHA-256; 768x384 RGBA; full WebP decode; alpha; no metadata; one frame")
        return 0
    except (ImportError, OSError, ValueError, KeyError, TypeError, struct.error) as error:
        print("FAIL: " + str(error), file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
