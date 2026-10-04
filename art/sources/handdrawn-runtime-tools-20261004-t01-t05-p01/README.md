# Hand-drawn runtime bundle, consumable tools T01–T05 and P01 — 2026-10-04

Asset-only delivery for tool-t01 / T01 (练一招), tool-t02 / T02 (精简节目), tool-t03 / T03 (红桃染), tool-t04 / T04 (方片染), tool-t05 / T05 (梅花染), and tool-p01 / P01 (高牌星). This bundle contains 12 WebP files, this README, a manifest, and a portable verifier: 15 files total.

Base: `7b78777347dd854f5759870c7934b8c28279889e` (main at preparation).
Branch: `art/handdrawn-tools-20261004-t01-t05-p01`.
Name reference: `7b78777347dd854f5759870c7934b8c28279889e`, `src/content/r2-tools.json`.
The public delivery commit is the immutable commit containing this directory.

## Runtime contract

- Thumbnail canvas: 128 × 160; inset bounding box: 120 × 150, centered at (4, 5).
- Detail canvas: 615 × 768; inset bounding box: 576 × 720, centered at (19, 24), with 20 px of right outer padding.
- T01, T02, T03, and P01 sources are 1122 × 1402. T04 is 1073 × 1466 and T05 is 1060 × 1484; those two approved aspect-ratio exceptions are recorded without pretending they are 4:5. Their complete original aspect ratio is retained within nearest-integer-pixel rounding; exact fitted rectangles are recorded in the manifest.
- Full-source contain, centered ivory background `#F3EADB`, LANCZOS, WebP quality 82, method 6.
- No cropping, intentional stretching, semantic editing, or reconstruction. Every source pixel rectangle is contained.
- Each thumbnail is under 10,000 bytes; each detail is under 100,000 bytes. Runtime total: 214,916 bytes (thumbnails 15,684; details 199,232).
- Use visible thumbnails only and load details on demand. Never preload original PNGs.

## Verification

Run with Node.js 18 or newer from any working directory:

```sh
node art/sources/handdrawn-runtime-tools-20261004-t01-t05-p01/verify-runtime.mjs
```

The verifier uses Node built-ins and paths relative to itself. It checks exact inventory, rejects symlinked entries, checks approved source basenames and dimensions, SHA-256, byte counts, WebP header dimensions, budgets, and full-source contain geometry. It does not decode pixels. Full Pillow decode, source hash preservation, relocated execution, corrupted-byte rejection, symlink rejection, and native-thumbnail pixel review are performed separately before publication.

Only public source basenames, dimensions, byte counts, hashes, runtime specifications, and public repository references are recorded. Original PNGs are retained separately and excluded from this bundle. WebP outputs have no EXIF, XMP, or ICC metadata. No original PNGs, QA sheets, generation instructions, or private provenance are included.

These six consumable tools do not deliver the complete 51-tool set. Source category is tool-card with domain identities T01–T05 and P01, matching the representative-sample schema. The original domain (tool), source category (consumable-tool), and families remain explicit: T01 is utility, T02–T05 are tarot, and P01 is planet. T02 uses only the approved v2 source. Runtime production categories require engineering adaptation. No runtime registration, game-code changes, or in-game integration is included. This is not game-final aesthetic acceptance or physical-device validation.
