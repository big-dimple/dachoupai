# Hand-drawn runtime bundle, batch 2 — 2026-10-04

This asset-only bundle contains approved `tiesuanpan` and `f10` derivatives. It adds four WebP files plus this README, a manifest, and a portable verifier. It does not change game code, rules, or source PNGs.

Base: `fb709fe54181c47406e8281b1d80edb5b5f3880c` (latest main at preparation).
Branch: `art/handdrawn-runtime-20261004-b2`.

## Runtime contract

- Thumbnail: 128 × 160, inner image 120 × 150; padding 4/5/4/5 pixels.
- Detail: 615 × 768, inner image 576 × 720; padding left 19, top 24, right 20, bottom 24 pixels.
- Full-source contain, ivory background `#F3EADB`, LANCZOS, lossy WebP quality 82, method 6. No cropping, stretching, reconstruction, or generation.
- Every thumbnail is under 10,000 bytes and every detail is under 100,000 bytes.
- Total: 101,218 bytes (thumbnails 7,850; details 93,368).
- Load visible thumbnails only; load details on demand. Do not preload source PNGs.

## Verify after fetching

Run from any working directory with Node.js 18 or newer:

```sh
node art/sources/handdrawn-runtime-20261004-b2/verify-runtime.mjs
```

The verifier resolves all paths relative to itself and requires only Node built-ins. It verifies exact file inventory, SHA-256, byte counts, dimensions, budget and manifest contain geometry. It does not decode image pixels. All four WebP files were separately decoded with Pillow and visually viewed before publication.

`manifest.json` records each immutable source filename, original SHA-256, dimensions, encoder version, derivative SHA-256, and geometry. The original PNGs are preserved separately and intentionally excluded from this repository bundle; source hashes were checked before and after export. Runtime pixel review passed for both native-size small cards and detail images; in-game layout, physical-device and overall art acceptance remain separate integration checks.

The bundle contains no original PNGs, rejected candidates, QA images, private local paths, or signed download URLs.
