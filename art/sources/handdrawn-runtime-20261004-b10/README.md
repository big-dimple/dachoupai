# Hand-drawn runtime bundle, batch 10 — 2026-10-04

Asset-only derivatives for a06 (独家戏), a12 (不铺张), b09 (四座皆惊), c11 (换轨), c12 (换一身), e10 (赠票), e12 (淘旧摊) and e05 (置办行头). The bundle contains 16 WebP files, this README, a manifest and a portable verifier: 19 files total.

Base: `6f470b63032537b63898a4a974d91872439bbf3f` (main at preparation).
Branch: `art/handdrawn-runtime-20261004-b10`.
Name reference: `6f470b63032537b63898a4a974d91872439bbf3f`, `src/content/r2-jokers.json`.
The public delivery commit is the immutable commit that contains this directory; no game mechanics or implementation files are changed.

## Runtime contract

- Thumbnail canvas: 128 × 160; inset bounding box: 120 × 150, centered at (4, 5).
- Detail canvas: 615 × 768; inset bounding box: 576 × 720, centered at (19, 24), with 20 px of right outer padding.
- Six approved sources are 1122 × 1402; e10 and e12 are 1073 × 1466 and retain their narrower full-image aspect ratio. Each exact fitted rectangle is recorded in the manifest.
- Full-source contain, centered ivory background `#F3EADB`, LANCZOS, WebP quality 82, method 6. Integer-pixel rounding is to nearest.
- No cropping, intentional stretching, semantic editing or reconstruction. Every source pixel rectangle is contained. Existing source-boundary composition is preserved: b09 elbows, e10/e12 sleeves and e05 right sleeve are close to original side edges; c12 is a waist-up composition with clothing continuing below the canvas; no missing content is invented.
- Every thumbnail is under 10,000 bytes; every detail is under 100,000 bytes. Runtime total: 391,320 bytes (thumbnails 30,274; details 361,046).
- Use visible thumbnails only and load details on demand. Never preload original PNGs.

## Verification

Run with Node.js 18 or newer from any working directory:

```sh
node art/sources/handdrawn-runtime-20261004-b10/verify-runtime.mjs
```

The verifier uses Node built-ins and paths relative to itself. It checks exact inventory, approved source basenames and dimensions, SHA-256, byte counts, WebP header dimensions, budgets and full-source contain geometry. It does not decode pixels. Full Pillow decode, source hash preservation, relocated execution, corrupted-byte rejection and native-thumbnail pixel review are performed separately before publication.

Only public source basenames, dimensions, byte counts, hashes, runtime specifications and public repository references are recorded. Original PNGs are retained separately and excluded from the repository bundle. WebP outputs have no EXIF, XMP or ICC metadata. No original PNGs, QA sheets, private prompts or private provenance are included.

This is a derivative asset delivery, not in-game integration, overall aesthetic acceptance or physical-device validation.
