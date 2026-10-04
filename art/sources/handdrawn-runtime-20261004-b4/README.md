# Hand-drawn runtime bundle, batch 4 — 2026-10-04

Asset-only derivatives for approved `pengci` (碰瓷), `mantangcai` (满堂彩), `huimaqiang` (回马枪) and `jiedongfeng` (借东风). The bundle contains eight WebP files, this README, a manifest and a portable verifier. It changes no game code, mechanics or source PNGs.

Base: `7e1e9aa21b833a8c91f030167e0ff4895ef23322` (latest main at preparation).
Branch: `art/handdrawn-runtime-20261004-b4`.

## Runtime contract

- Thumbnail canvas: 128 × 160; maximum inner image: 120 × 150.
- Detail canvas: 615 × 768; maximum inner image: 576 × 720.
- Full-source contain, centered ivory background `#F3EADB`, LANCZOS, lossy WebP quality 82, method 6. No cropping, intentional stretching, reconstruction or generation.
- Pengci's original is 1073 × 1466, not 4:5. Its complete source fits at 110 × 150 in the thumbnail (left/right 9 px) and 527 × 720 in the detail (left/right 44 px). This difference is intentional and approved; never crop or stretch it to fill the inset.
- The other originals are 1122 × 1402, approximately rather than exactly 4:5. Their nearest integer-pixel contain sizes are 120 × 150 and 576 × 720.
- Every thumbnail is under 10,000 bytes; every detail is under 100,000 bytes. Total: 261,422 bytes (thumbnails 17,602; details 243,820).
- Load visible thumbnails only and details on demand. Never preload original PNGs.

## Verification

Run with Node.js 18 or newer from any working directory:

```sh
node art/sources/handdrawn-runtime-20261004-b4/verify-runtime.mjs
```

The verifier resolves paths relative to itself and requires only Node built-ins. It checks exact inventory, approved source filenames and dimensions, SHA-256, byte counts, WebP header dimensions, budgets and full-source contain geometry. It does not decode image pixels. All eight derivatives were separately decoded with Pillow and visually viewed at their actual thumbnail and detail sizes before publication. Relocated execution and corrupted-byte rejection are tested separately.

The manifest records immutable source filenames, dimensions, SHA-256, public repository content reference, encoder versions, output hashes and exact geometry. Source hashes were checked before and after export; original PNGs remain unchanged and are excluded from this repository bundle. The source images were generated with the official built-in image tool and independently approved before this non-semantic format conversion.

This bundle contains no original PNGs, QA images, private local paths or signed download URLs. Pixel review is limited to these derivatives; in-game integration, overall art acceptance and physical-device checks remain separate.
