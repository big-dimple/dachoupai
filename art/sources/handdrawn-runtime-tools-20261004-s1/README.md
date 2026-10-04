# Hand-drawn runtime bundle, tool samples 1 — 2026-10-04

Asset-only representative samples for tool-t12 / T12 (玻璃面), item-u07 / U07 (双层箱), tool-p11 / P11 (同花葫芦星), and tool-s02 / S02 (镀影). The bundle contains 8 WebP files, this README, a manifest and a portable verifier: 11 files total.

Base: `6f470b63032537b63898a4a974d91872439bbf3f` (main at preparation).
Branch: `art/handdrawn-tool-samples-20261004`.
Name reference: `6f470b63032537b63898a4a974d91872439bbf3f`, `src/content/r2-tools.json`.
The public delivery commit is the immutable commit that contains this directory; no game mechanics or implementation files are changed.

## Runtime contract

- Thumbnail canvas: 128 × 160; inset bounding box: 120 × 150, centered at (4, 5).
- Detail canvas: 615 × 768; inset bounding box: 576 × 720, centered at (19, 24), with 20 px of right outer padding.
- All four approved sources are 1122 × 1402; their complete original aspect ratio is retained within integer-pixel rounding. Each exact fitted rectangle is recorded in the manifest.
- Full-source contain, centered ivory background `#F3EADB`, LANCZOS, WebP quality 82, method 6. Integer-pixel rounding is to nearest.
- No cropping, intentional stretching, semantic editing or reconstruction. Every source pixel rectangle is contained.
- Every thumbnail is under 10,000 bytes; every detail is under 100,000 bytes. Runtime total: 123,306 bytes (thumbnails 10,266; details 113,040).
- Use visible thumbnails only and load details on demand. Never preload original PNGs.

## Verification

Run with Node.js 18 or newer from any working directory:

```sh
node art/sources/handdrawn-runtime-tools-20261004-s1/verify-runtime.mjs
```

The verifier uses Node built-ins and paths relative to itself. It checks exact inventory, approved source basenames and dimensions, SHA-256, byte counts, WebP header dimensions, budgets and full-source contain geometry. It does not decode pixels. Full Pillow decode, source hash preservation, relocated execution, corrupted-byte rejection and native-thumbnail pixel review are performed separately before publication.

Only public source basenames, dimensions, byte counts, hashes, runtime specifications and public repository references are recorded. Original PNGs are retained separately and excluded from the repository bundle. WebP outputs have no EXIF, XMP or ICC metadata. No original PNGs, QA sheets, private prompts or private provenance are included.

These four representatives do not deliver the complete 51-tool set. Source categories are tool-card and item-card; final runtime production categories require engineering adaptation. No Joker registration, game-code modification or in-game integration is included. This is not game-final aesthetic acceptance or physical-device validation.
