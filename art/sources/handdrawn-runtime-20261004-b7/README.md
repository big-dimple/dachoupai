# Hand-drawn runtime bundle, batch 7 — 2026-10-04

Asset-only derivatives for b05 (合唱班), b10 (练对子), b08 (对半分), d05 (彩排), e03 (家底), e06 (旧物新用), f05 (越说越顺) and f11 (越挫越会). The bundle contains 16 WebP files, this README, a manifest and a portable verifier: 19 files total.

Base: `ea7e997a8d30d137d69d5a95193d16258a0bfbc2` (main at preparation).
Branch: `art/handdrawn-runtime-20261004-b7`.
Name reference: `ea7e997a8d30d137d69d5a95193d16258a0bfbc2`, `src/content/r2-jokers.json`.
The public delivery commit is the immutable commit that contains this directory; no game mechanics or implementation files are changed.

## Runtime contract

- Thumbnail canvas: 128 × 160; inset bounding box: 120 × 150, centered at (4, 5).
- Detail canvas: 615 × 768; inset bounding box: 576 × 720, centered at (19, 24), with 20 px of right outer padding.
- All eight approved sources are 1122 × 1402. Each exact fitted rectangle is recorded in the manifest.
- Full-source contain, centered ivory background `#F3EADB`, LANCZOS, WebP quality 82, method 6. Integer-pixel rounding is to nearest.
- No cropping, intentional stretching, semantic editing or reconstruction. Near-edge props remain contained. Existing marks at source boundaries are preserved without inventing missing content.
- Every thumbnail is under 10,000 bytes; every detail is under 100,000 bytes. Runtime total: 491,482 bytes (thumbnails 32,894; details 458,588).
- Use visible thumbnails only and load details on demand. Never preload original PNGs.

## Verification

Run with Node.js 18 or newer from any working directory:

```sh
node art/sources/handdrawn-runtime-20261004-b7/verify-runtime.mjs
```

The verifier uses Node built-ins and paths relative to itself. It checks exact inventory, approved source basenames and dimensions, SHA-256, byte counts, WebP header dimensions, budgets and full-source contain geometry. It does not decode pixels. Full Pillow decode, source hash preservation, relocated execution, corrupted-byte rejection and native-thumbnail pixel review are performed separately before publication.

Only public source basenames, dimensions, byte counts, hashes, runtime specifications and public repository references are recorded. Original PNGs are retained separately and excluded from the repository bundle. WebP outputs have no EXIF, XMP or ICC metadata. No original PNGs, QA sheets, private prompts or private provenance are included.

This is a derivative asset delivery, not in-game integration, overall aesthetic acceptance or physical-device validation.
