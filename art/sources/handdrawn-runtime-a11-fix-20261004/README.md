# Hand-drawn a11 anatomy correction — 2026-10-04

Asset-only derivatives for a11 (返个场), category `functional-card`, domain ID `a11`. The approved v2 artwork aligns the head, neck, shoulders and torso and retains the white robe, red cloak and folded fan. This package contains two WebPs, this README, a manifest and a portable verifier: five files total.

Base: `3938cee365994910d7d79f62fc91701273f2efe0` (main at preparation).
Branch: `art/handdrawn-a11-fix-20261004`.
Name reference: `3938cee365994910d7d79f62fc91701273f2efe0`, `src/content/r2-jokers.json`.
The public delivery commit is the immutable commit containing this directory.

## Derivative contract

- Thumbnail: 128 × 160 canvas, 120 × 150 full-source content, at (4, 5).
- Detail: 615 × 768 canvas, 576 × 720 full-source content, at (19, 24), with 20 px outer padding on the right.
- Source: 1122 × 1402, preserved byte-for-byte during export. The v1 source and old b8 outputs remain unchanged.
- Full-source contain, centered warm ivory `#F3EADB`, LANCZOS, WebP quality 82, method 6. Integer-pixel fit rounds to nearest.
- No cropping, intentional stretching, semantic editing or reconstruction during export. Source-boundary composition is retained; no missing content is invented.
- Thumbnail 3,756 bytes, detail 45,940 bytes; total 49,696 bytes. Limits remain strictly below 10,000 and 100,000 bytes respectively.
- Use visible thumbnails and load details on demand. Do not preload source PNGs.

## Consumer handoff

Take only `art/sources/handdrawn-runtime-a11-fix-20261004/` from the immutable delivery commit. Do not merge the source branch or its parent history. This package does not change the runtime manifest, registration, gameplay, source code or main. A separate integration step must replace only the existing a11 images and their exact provenance after checking this package.

## Verification

Run with Node.js 18 or newer, from any working directory:

```sh
node art/sources/handdrawn-runtime-a11-fix-20261004/verify-runtime.mjs
```

The portable verifier requires only Node built-ins and paths relative to itself. It verifies the exact inventory, a11 identity, source basename/hash/dimensions, output SHA-256 and byte counts, WebP header dimensions, budgets and full-source contain geometry. It rejects runtime symlinks, metadata and animation chunks. It does not decode pixels. Full Pillow decoding, preserved source hashes, relocated execution, corrupted-byte rejection and 128/74-pixel visual inspection are performed separately before publication.

Only public source basenames, dimensions, byte counts, hashes, derivative specifications and repository references are included. Original PNGs, prompts and QA sheets are excluded. Outputs have no EXIF, XMP or ICC metadata.

This is an asset input delivery; in-game integration and target-device validation are separate and are not claimed here.
