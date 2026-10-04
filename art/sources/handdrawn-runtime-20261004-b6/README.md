# Hand-drawn runtime bundle, batch 6 — 2026-10-04

Asset-only derivatives for a03 (一束光), b02 (对上眼), b04 (一唱一和), c04 (搭台阶), d01 (候场席), f02 (最后一句), d10 (空位有价) and e01 (小费盒). The bundle contains 16 WebP files, this README, a manifest and a portable verifier: 19 files total.

Base: `a05592252a88382a8b04c4c38e65500e7951b4fc` (main at preparation).
Branch: `art/handdrawn-runtime-20261004-b6`.
Mechanics/name reference: `76557f24ed646f7cd8012c407d55e4e3ef347811`, `src/content/r2-jokers.json`.
The delivery commit is the immutable commit that contains this directory; no game mechanics or implementation files are changed.

## Runtime contract

- Thumbnail canvas: 128 × 160; inset bounding box: 120 × 150, centered at (4, 5).
- Detail canvas: 615 × 768; inset bounding box: 576 × 720, centered at (19, 24), with 20 px of right outer padding.
- Sources retain their approved dimensions: a03/f02/d10 are 1122 × 1402; b02/b04/c04 are 1073 × 1466; d01/e01 are 1060 × 1484. The narrower sources receive additional side padding, not cropping or stretching. Each exact fitted rectangle is recorded in the manifest.
- Full-source contain, centered ivory background `#F3EADB`, LANCZOS, WebP quality 82, method 6. Integer-pixel rounding is to nearest.
- No cropping, intentional stretching, semantic editing or reconstruction. Near-edge props remain contained. Existing marks at source boundaries are preserved without inventing missing content. d10 and e01 remain object-only images.
- Every thumbnail is under 10,000 bytes; every detail is under 100,000 bytes. Runtime total: 398,114 bytes (thumbnails 26,714; details 371,400).
- Use visible thumbnails only and load details on demand. Never preload original PNGs.

## Verification

Run with Node.js 18 or newer from any working directory:

```sh
node art/sources/handdrawn-runtime-20261004-b6/verify-runtime.mjs
```

The verifier uses Node built-ins and paths relative to itself. It checks exact inventory, approved source basenames and dimensions, SHA-256, byte counts, WebP header dimensions, budgets and full-source contain geometry. It does not decode pixels. Full Pillow decode, source hash preservation, relocated execution, corrupted-byte rejection and native-thumbnail pixel review are performed separately before publication.

Only public source basenames, dimensions, byte counts, hashes, runtime specifications and public repository references are recorded. Original PNGs are retained separately and excluded from the repository bundle. WebP outputs have no EXIF, XMP or ICC metadata. No original PNGs, QA sheets, private prompts or private provenance are included.

This is a derivative asset delivery, not in-game integration, overall aesthetic acceptance or physical-device validation.
