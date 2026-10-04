# Hand-drawn runtime bundle, permanent items U08–U12 — 2026-10-04

Asset-only delivery for item-u08 / U08 (极简手册), item-u09 / U09 (复盘本), item-u10 / U10 (采购证), item-u11 / U11 (另一间摊), and item-u12 / U12 (开场彩头). The bundle contains 10 WebP files, this README, a manifest and a portable verifier: 13 files total.

Base: `8888e82ede1776e259096bbdfe4eef63fc6f2415` (main at preparation).
Branch: `art/handdrawn-items-20261004-u08-u12`.
Name reference: `8888e82ede1776e259096bbdfe4eef63fc6f2415`, `src/content/r2-tools.json`.
The public delivery commit is the immutable commit that contains this directory; no game mechanics or implementation files are changed.

## Runtime contract

- Thumbnail canvas: 128 × 160; inset bounding box: 120 × 150, centered at (4, 5).
- Detail canvas: 615 × 768; inset bounding box: 576 × 720, centered at (19, 24), with 20 px of right outer padding.
- All five approved sources are 1122 × 1402; their complete original aspect ratio is retained within integer-pixel rounding. Each exact fitted rectangle is recorded in the manifest.
- Full-source contain, centered ivory background `#F3EADB`, LANCZOS, WebP quality 82, method 6. Integer-pixel rounding is to nearest.
- No cropping, intentional stretching, semantic editing or reconstruction. Every source pixel rectangle is contained.
- Every thumbnail is under 10,000 bytes; every detail is under 100,000 bytes. Runtime total: 162,578 bytes (thumbnails 10,970; details 151,608).
- U09 left bookmark remains complete but close to the original edge (about 2%); the approved original is retained unchanged with full-source contain. Fine U09 card-group meaning at 74 × 96 still depends on the displayed title and rules.
- Use visible thumbnails only and load details on demand. Never preload original PNGs.

## Verification

Run with Node.js 18 or newer from any working directory:

```sh
node art/sources/handdrawn-runtime-items-20261004-u08-u12/verify-runtime.mjs
```

The verifier uses Node built-ins and paths relative to itself. It checks exact inventory, approved source basenames and dimensions, SHA-256, byte counts, WebP header dimensions, budgets and full-source contain geometry. It does not decode pixels. Full Pillow decode, source hash preservation, relocated execution, corrupted-byte rejection and native-thumbnail pixel review are performed separately before publication.

Only public source basenames, dimensions, byte counts, hashes, runtime specifications and public repository references are recorded. Original PNGs are retained separately and excluded from the repository bundle. WebP outputs have no EXIF, XMP or ICC metadata. No original PNGs, QA sheets, private prompts or private provenance are included.

These five permanent items do not deliver the complete 51-tool set. Source category is item-card with domain identities U08–U12, matching the representative-sample schema. Runtime production categories require engineering adaptation. No runtime registration, game-code modification or in-game integration is included. This is not game-final aesthetic acceptance or physical-device validation.
