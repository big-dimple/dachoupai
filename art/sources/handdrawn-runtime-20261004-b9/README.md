# Hand-drawn runtime bundle, batch 9 — 2026-10-04

Asset-only derivatives for a05 (熟面孔), b03 (老搭档), c06 (越染越深), d03 (等得住), a10 (后台眼神), b11 (候场同伴), c10 (压住书页) and d12 (留点悬念). The bundle contains 16 WebP files, this README, a manifest and a portable verifier: 19 files total.

Base: `530b62d183b02db4193ac4fe40ed0f756d476dce` (main at preparation).
Branch: `art/handdrawn-runtime-20261004-b9`.
Name reference: `530b62d183b02db4193ac4fe40ed0f756d476dce`, `src/content/r2-jokers.json`.
The public delivery commit is the immutable commit that contains this directory; no game mechanics or implementation files are changed.

## Runtime contract

- Thumbnail canvas: 128 × 160; inset bounding box: 120 × 150, centered at (4, 5).
- Detail canvas: 615 × 768; inset bounding box: 576 × 720, centered at (19, 24), with 20 px of right outer padding.
- All eight approved sources are 1122 × 1402. Each exact fitted rectangle is recorded in the manifest.
- Full-source contain, centered ivory background `#F3EADB`, LANCZOS, WebP quality 82, method 6. Integer-pixel rounding is to nearest.
- No cropping, intentional stretching, semantic editing or reconstruction. Every source pixel rectangle is contained. Existing source-boundary composition is preserved: a05 and b03 sleeves touch their original side edges, a10 curtain continues through original edges, and c10 book corners remain near their original edges; no missing content is invented.
- Every thumbnail is under 10,000 bytes; every detail is under 100,000 bytes. Runtime total: 367,772 bytes (thumbnails 28,516; details 339,256).
- Use visible thumbnails only and load details on demand. Never preload original PNGs.

## Verification

Run with Node.js 18 or newer from any working directory:

```sh
node art/sources/handdrawn-runtime-20261004-b9/verify-runtime.mjs
```

The verifier uses Node built-ins and paths relative to itself. It checks exact inventory, approved source basenames and dimensions, SHA-256, byte counts, WebP header dimensions, budgets and full-source contain geometry. It does not decode pixels. Full Pillow decode, source hash preservation, relocated execution, corrupted-byte rejection and native-thumbnail pixel review are performed separately before publication.

Only public source basenames, dimensions, byte counts, hashes, runtime specifications and public repository references are recorded. Original PNGs are retained separately and excluded from the repository bundle. WebP outputs have no EXIF, XMP or ICC metadata. No original PNGs, QA sheets, private prompts or private provenance are included.

This is a derivative asset delivery, not in-game integration, overall aesthetic acceptance or physical-device validation.
