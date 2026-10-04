# Hand-drawn runtime bundle, batch 8 — 2026-10-04

Asset-only derivatives for b06 (再说一遍), a11 (返个场), d04 (递个眼色), c07 (拖个尾音), d11 (三拍子), d08 (留声机), d09 (回声越来越近) and b12 (救个场). The bundle contains 16 WebP files, this README, a manifest and a portable verifier: 19 files total.

Base: `ea7e997a8d30d137d69d5a95193d16258a0bfbc2` (main at preparation).
Branch: `art/handdrawn-runtime-20261004-b8`.
Name reference: `ea7e997a8d30d137d69d5a95193d16258a0bfbc2`, `src/content/r2-jokers.json`.
The public delivery commit is the immutable commit that contains this directory; no game mechanics or implementation files are changed.

## Runtime contract

- Thumbnail canvas: 128 × 160; inset bounding box: 120 × 150, centered at (4, 5).
- Detail canvas: 615 × 768; inset bounding box: 576 × 720, centered at (19, 24), with 20 px of right outer padding.
- All eight approved sources are 1122 × 1402. Each exact fitted rectangle is recorded in the manifest.
- Full-source contain, centered ivory background `#F3EADB`, LANCZOS, WebP quality 82, method 6. Integer-pixel rounding is to nearest.
- No cropping, intentional stretching, semantic editing or reconstruction. Every source pixel rectangle is contained. Existing source-boundary composition is preserved: c07 ribbon tail exits the original bottom edge, and a11 cloak touches the original edges; no missing content is invented.
- Every thumbnail is under 10,000 bytes; every detail is under 100,000 bytes. Runtime total: 371,146 bytes (thumbnails 28,512; details 342,634).
- Use visible thumbnails only and load details on demand. Never preload original PNGs.

## Verification

Run with Node.js 18 or newer from any working directory:

```sh
node art/sources/handdrawn-runtime-20261004-b8/verify-runtime.mjs
```

The verifier uses Node built-ins and paths relative to itself. It checks exact inventory, approved source basenames and dimensions, SHA-256, byte counts, WebP header dimensions, budgets and full-source contain geometry. It does not decode pixels. Full Pillow decode, source hash preservation, relocated execution, corrupted-byte rejection and native-thumbnail pixel review are performed separately before publication.

Only public source basenames, dimensions, byte counts, hashes, runtime specifications and public repository references are recorded. Original PNGs are retained separately and excluded from the repository bundle. WebP outputs have no EXIF, XMP or ICC metadata. No original PNGs, QA sheets, private prompts or private provenance are included.

This is a derivative asset delivery, not in-game integration, overall aesthetic acceptance or physical-device validation.
