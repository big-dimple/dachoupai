# Hand-drawn runtime bundle, consumable tools T13–T18 — 2026-10-04

Asset-only delivery for tool-t13 / T13 (留个声), tool-t14 / T14 (金边纸), tool-t15 / T15 (返场票), tool-t16 / T16 (小红包), tool-t17 / T17 (再想想), and tool-t18 / T18 (免费逛摊). This bundle contains 12 WebP files, this README, a manifest, and a portable verifier: 15 files total.

Base: `7d44b8bcada32942acded87d70abe78dea12f275` (main at preparation).
Branch: `art/handdrawn-tools-20261004-t13-t18`.
Name reference: `7d44b8bcada32942acded87d70abe78dea12f275`, `src/content/r2-tools.json`.
The public delivery commit is the immutable commit containing this directory.

## Runtime contract

- Thumbnail canvas: 128 × 160; inset bounding box: 120 × 150, centered at (4, 5).
- Detail canvas: 615 × 768; inset bounding box: 576 × 720, centered at (19, 24), with 20 px of right outer padding.
- All six approved sources are 1122 × 1402. Their complete original aspect ratio is retained within nearest-integer-pixel rounding; exact fitted rectangles are recorded in the manifest.
- Full-source contain, centered ivory background `#F3EADB`, LANCZOS, WebP quality 82, method 6.
- No cropping, intentional stretching, semantic editing, or reconstruction. Every source pixel rectangle is contained.
- Each thumbnail is under 10,000 bytes; each detail is under 100,000 bytes. Runtime total: 227,088 bytes (thumbnails 13,980; details 213,108).
- Use visible thumbnails only and load details on demand. Never preload original PNGs.

## Verification

Run with Node.js 18 or newer from any working directory:

```sh
node art/sources/handdrawn-runtime-tools-20261004-t13-t18/verify-runtime.mjs
```

The verifier uses Node built-ins and paths relative to itself. It checks exact inventory, rejects symlinked entries, checks approved source basenames and dimensions, SHA-256, byte counts, WebP header dimensions, budgets, and full-source contain geometry. It does not decode pixels. Full Pillow decode, source hash preservation, relocated execution, corrupted-byte rejection, symlink rejection, and native-thumbnail pixel review are performed separately before publication.

Only public source basenames, dimensions, byte counts, hashes, runtime specifications, and public repository references are recorded. Original PNGs are retained separately and excluded from this bundle. WebP outputs have no EXIF, XMP, or ICC metadata. No original PNGs, QA sheets, generation instructions, or private provenance are included.

These six consumable tools do not deliver the complete 51-tool set. Source category is tool-card with domain identities T13–T18, matching the representative-sample schema. Runtime production categories require engineering adaptation. No runtime registration, game-code changes, or in-game integration is included. This is not game-final aesthetic acceptance or physical-device validation.
