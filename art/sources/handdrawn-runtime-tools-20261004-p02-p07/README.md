# Hand-drawn runtime bundle, planet tools P02–P07 — 2026-10-04

Asset-only delivery for tool-p02 / P02 (对子星), tool-p03 / P03 (两对星), tool-p04 / P04 (三条星), tool-p05 / P05 (顺子星), tool-p06 / P06 (同花星), and tool-p07 / P07 (葫芦星). This bundle contains 12 WebP files, this README, a manifest, and a portable verifier: 15 files total.

Base: `1c103de6957eb3fd4c17d94d8f68c5a4d5466ca9` (main at preparation).
Branch: `art/handdrawn-tools-20261004-p02-p07`.
Name reference: `1c103de6957eb3fd4c17d94d8f68c5a4d5466ca9`, `src/content/r2-tools.json`.
The public delivery commit is the immutable commit containing this directory.

## Runtime contract

- Thumbnail canvas: 128 × 160; inset bounding box: 120 × 150, centered at (4, 5).
- Detail canvas: 615 × 768; inset bounding box: 576 × 720, centered at (19, 24), with 20 px of right outer padding.
- P02, P03, P05, P06, and P07 sources are 1122 × 1402. P04 is 1060 × 1484; this approved aspect-ratio exception is recorded without pretending it is 4:5. Complete original aspect ratios are retained within nearest-integer-pixel rounding; exact fitted rectangles are recorded in the manifest.
- Full-source contain, centered ivory background `#F3EADB`, LANCZOS, WebP quality 82, method 6.
- No cropping, intentional stretching, semantic editing, or reconstruction. Every source pixel rectangle is contained.
- Each thumbnail is under 10,000 bytes; each detail is under 100,000 bytes. Runtime total: 181,436 bytes (thumbnails 13,398; details 168,038).
- Use visible thumbnails only and load details on demand. Never preload original PNGs.

## Verification

Run with Node.js 18 or newer from any working directory:

```sh
node art/sources/handdrawn-runtime-tools-20261004-p02-p07/verify-runtime.mjs
```

The verifier uses Node built-ins and paths relative to itself. It checks exact inventory, rejects symlinked entries, checks approved source basenames and dimensions, SHA-256, byte counts, WebP header dimensions, budgets, and full-source contain geometry. It does not decode pixels. Full Pillow decode, source hash preservation, relocated execution, corrupted-byte rejection, symlink rejection, and native-thumbnail pixel review are performed separately before publication.

Only public source basenames, dimensions, byte counts, hashes, runtime specifications, and public repository references are recorded. Original PNGs are retained separately and excluded from this bundle. WebP outputs have no EXIF, XMP, or ICC metadata. No original PNGs, QA sheets, generation instructions, or private provenance are included.

These six consumable tools do not deliver the complete 51-tool set. Source category is tool-card with domain identities P02–P07, matching the representative-sample schema. The original domain (tool), source category (consumable-tool), and family (planet) remain explicit. Runtime production categories require engineering adaptation. No runtime registration, game-code changes, or in-game integration is included. This is not game-final aesthetic acceptance or physical-device validation.
