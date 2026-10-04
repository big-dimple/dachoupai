# Hand-drawn runtime bundle, batch 5 — 2026-10-04

Asset-only derivatives for b07 (人人有份), a09 (短节目), d06 (搬张椅子), a04 (小口袋), e04 (滚个零头), c05 (换布景), c02 (红线) and f03 (开门见喜). The bundle contains 16 WebP files, this README, a manifest and a portable verifier: 19 files total.

Base: `7e1e9aa21b833a8c91f030167e0ff4895ef23322` (latest main at preparation).
Branch: `art/handdrawn-runtime-20261004-b5`.
Mechanics/name reference: `76557f24ed646f7cd8012c407d55e4e3ef347811`, `src/content/r2-jokers.json`.
The delivery commit is the immutable commit that contains this directory; no game mechanics or implementation files are changed.

## Runtime contract

- Thumbnail canvas: 128 × 160; full-source content: 120 × 150, centered at (4, 5).
- Detail canvas: 615 × 768; full-source content: 576 × 720, centered at (19, 24), with 20 px of right padding.
- All sources are 1122 × 1402, approximately 4:5. Full-source contain, centered ivory background `#F3EADB`, LANCZOS, WebP quality 82, method 6.
- No cropping, intentional stretching, semantic editing, reconstruction or added pixels inside the source image. Near-edge props remain contained. The c05 cloth already continues beyond the original source edge; no missing cloth is invented. e04 remains an object-only image.
- Every thumbnail is under 10,000 bytes; every detail is under 100,000 bytes. Runtime total: 483,450 bytes (thumbnails 34,756; details 448,694).
- Use visible thumbnails only and load details on demand. Never preload original PNGs.

## Verification

Run with Node.js 18 or newer from any working directory:

```sh
node art/sources/handdrawn-runtime-20261004-b5/verify-runtime.mjs
```

The verifier uses Node built-ins and paths relative to itself. It checks exact inventory, approved source basenames and dimensions, SHA-256, byte counts, WebP header dimensions, budgets and full-source contain geometry. It does not decode pixels. Full Pillow decode, source hash preservation, relocated execution, corrupted-byte rejection and native-thumbnail pixel review are performed separately before publication.

Only public source basenames, dimensions, byte counts, hashes, runtime specifications and public repository references are recorded. Original PNGs are retained separately and excluded from the repository bundle. WebP outputs have no EXIF, XMP or ICC metadata. No original PNGs, QA sheets, private prompts or private provenance are included.

This is a derivative asset delivery, not in-game integration, overall aesthetic acceptance or physical-device validation.
