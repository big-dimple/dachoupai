# Hand-drawn runtime bundle, consumable tools T06–T11 — 2026-10-04

Asset-only delivery for tool-t06 / T06 (黑桃染), tool-t07 / T07 (复印一张), tool-t08 / T08 (往上挪), tool-t09 / T09 (往下挪), tool-t10 / T10 (加厚纸), and tool-t11 / T11 (大字号). This bundle contains 12 WebP files, this README, a manifest, and a portable verifier: 15 files total.

Base: `8888e82ede1776e259096bbdfe4eef63fc6f2415` (main at preparation).
Branch: `art/handdrawn-tools-20261004-t06-t11`.
Name reference: `8888e82ede1776e259096bbdfe4eef63fc6f2415`, `src/content/r2-tools.json`.
The public delivery commit is the immutable commit containing this directory.

## Runtime contract

- Thumbnail canvas: 128 × 160; inset bounding box: 120 × 150, centered at (4, 5).
- Detail canvas: 615 × 768; inset bounding box: 576 × 720, centered at (19, 24), with 20 px of right outer padding.
- All six approved sources are 1122 × 1402. Their complete original aspect ratio is retained within nearest-integer-pixel rounding; exact fitted rectangles are recorded in the manifest.
- Full-source contain, centered ivory background `#F3EADB`, LANCZOS, WebP quality 82, method 6.
- No cropping, intentional stretching, semantic editing, or reconstruction. Every source pixel rectangle is contained.
- Each thumbnail is under 10,000 bytes; each detail is under 100,000 bytes. Runtime total: 178,950 bytes (thumbnails 12,814; details 166,136).
- Use visible thumbnails only and load details on demand. Never preload original PNGs.

## Verification

Run with Node.js 18 or newer from any working directory:

```sh
node art/sources/handdrawn-runtime-tools-20261004-t06-t11/verify-runtime.mjs
```

The verifier uses Node built-ins and paths relative to itself. It checks exact inventory, rejects symlinked entries, checks approved source basenames and dimensions, SHA-256, byte counts, WebP header dimensions, budgets, and full-source contain geometry. It does not decode pixels. Full Pillow decode, source hash preservation, relocated execution, corrupted-byte rejection, symlink rejection, and native-thumbnail pixel review are performed separately before publication.

Only public source basenames, dimensions, byte counts, hashes, runtime specifications, and public repository references are recorded. Original PNGs are retained separately and excluded from this bundle. WebP outputs have no EXIF, XMP, or ICC metadata. No original PNGs, QA sheets, generation instructions, or private provenance are included.

These six consumable tools do not deliver the complete 51-tool set. Source category is tool-card with domain identities T06–T11, matching the representative-sample schema. Runtime production categories require engineering adaptation. No runtime registration, game-code changes, or in-game integration is included. This is not game-final aesthetic acceptance or physical-device validation.
