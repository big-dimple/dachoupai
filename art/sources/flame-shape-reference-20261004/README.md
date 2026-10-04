# Flame outer-contour reference

This is one newly AI-generated project reference, exported once for the hand-drawn visual direction. It is not a third-party game screenshot and is not represented as a human-drawn original. The public source of this delivery is the Git commit containing this directory in `big-dimple/dachoupai`; this is delivery provenance, not a claim that GitHub generated the picture.

Only the outer silhouette has been approved as a reference: a continuous broad root with staggered broad and narrow flame tongues. The interior texture and large yellow areas are too heavy and must not be copied as the final treatment. Color, interior detail, animation, and the final in-game effect still require their own work and review.

This is an input for studying shape, not a runtime texture, animation sheet, runtime acceptance result, or whole-game visual approval. This delivery adds no runtime bytes and does not change the game or its existing assets. View the actual image before using its contour as guidance.

## Contents and conversion

- `reference.webp`: 768 × 384 RGBA, 45,846 bytes, transparent, quality 82. SHA-256: `7fd4742a2e91eeb8f07014a80de69c2a24491a4ad8ed9ded3f99094c84c5ea2c`.
- `manifest.json`: public source identity, dimensions, byte counts, SHA-256 values, conversion, and the limited review scope.
- `verify.py`: read-only integrity, full-decode, alpha, dimensions, and metadata checks.
- `README.md`: usage boundaries and verification instructions.

The 1774 × 887 RGBA source was proportionally resized to 768 × 384 with Lanczos and encoded as quality-82 WebP. No cropping, repainting, or content edits were performed. The resized alpha channel is preserved exactly. EXIF, XMP, and ICC metadata are absent. The original PNG is not part of this delivery and its SHA-256 remained unchanged during conversion.

## Verify after fetching

Requires Python 3 and Pillow with WebP support. From the repository root, run:

```sh
python3 art/sources/flame-shape-reference-20261004/verify.py
```

The script resolves the image and manifest relative to its own file, so it also works from any other working directory when invoked with the script's absolute path. It reads only these two adjacent files and changes nothing. A successful result verifies the delivered bytes, not visual quality, gameplay, animation, or device performance. Corrupt or changed bytes, unexpected dimensions, missing transparency, multiple frames, and metadata chunks are rejected.
