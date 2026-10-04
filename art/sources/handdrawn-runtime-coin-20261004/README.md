# Hand-drawn reward coin runtime source — 2026-10-04

Asset-only delivery: one transparent, front-facing hand-drawn copper coin, manifest, this README, and a portable verifier (4 files). This directory does not register or integrate the image into the game.

Base: `58e9d223ee5f29b965532551e71afc6fc6785d51`.
Branch: `art/handdrawn-coin-20261004`.
The immutable delivery commit is the commit containing this directory.

## Export contract

- The complete 1254 × 1254 RGBA source is uniformly resized to 192 × 192 with LANCZOS, then centered at (32, 32) on a 256 × 256 transparent canvas.
- No cropping, stretching, drawing changes, alpha cleanup, or reconstruction. The source itself is unchanged and is not included.
- WebP quality 90, method 6; color is lossy, and the decoded alpha plane exactly matches the resized/padded alpha plane. The transparent square opening and exterior remain transparent.
- Runtime file: `runtime/coin-reward-handdrawn.webp`, 15,958 bytes, below the 100,000-byte budget. Decoded RGBA storage is 262,144 bytes, excluding engine copies.
- Content padding is 32 pixels on all sides. At alpha ≥ 8, the visible footprint is 177 × 176 pixels, or 69.14% × 68.75% of the full canvas. This gives about 39/50/66 pixels of visible coin when the full canvas displays at 56/72/96 CSS pixels.
- The 31 × 31 center test region and all padding are fully transparent. At 56/72/96 pixels, center-line fully transparent hole widths are 4/6/10 pixels. The export has been visually checked at these native sizes on paper, ink, and checker backgrounds.
- Load on demand. Preserve the full canvas and center anchor; do not crop to the visible outline. Loading behavior and animation are the consuming implementation's responsibility.

## Verification

Requires Python 3.9 or newer and Pillow 9.1 or newer with WebP support. Run from any working directory, supplying the script path:

```sh
python3 art/sources/handdrawn-runtime-coin-20261004/verify-runtime.py
```

The read-only verifier resolves all bundle paths relative to itself. It checks the exact four-file inventory, rejects symlinks, pins the approved source identity and runtime hash, validates byte budget and WebP chunks, fully decodes the image, and checks RGBA dimensions, transparent padding, corners, center opening, alpha hash, effective footprint, and resized 56/72/96-pixel openings. It requires no source PNG and makes no network calls.

Source preservation and equality between the resampled and encoded alpha planes were checked during export. The absent original cannot be independently re-exported by this verifier. The manifest records its actual dimensions, size, and SHA-256 for provenance; it contains no private source location. Relocated execution, changed-byte rejection, and file/directory symlink rejection are checked before publication.

Only the final WebP, public asset metadata, and verification instructions are included. The WebP contains no EXIF, XMP, or ICC metadata. Original PNGs and production review material are excluded. No additional copyright license is asserted by this bundle.

Renderer, loader, runtime registration, and main are unchanged by this delivery. This is a runtime source package; it does not establish in-game integration, device performance, or complete game-art acceptance.
