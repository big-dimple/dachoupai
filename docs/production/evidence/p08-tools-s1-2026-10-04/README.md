# P08 four tool/item sample integration — review only

Original sample review base `6f470b63032537b63898a4a974d91872439bbf3f`; now normally merged/aligned to published main `7b8959d910cd97e46defbaca8ee5adeadf057e86`. Parent’s72/72 art registrations and Joker-only picture refresh are preserved; no fire candidate. This branch is for review, not deployed main.

Only approved public delivery commit `11ae7a464fdcf54c4e338da9171d827265742e3c` supplies tool-t12 **v2** glass, tool-p11, tool-s02 and item-u07. Consumer fetched only that source directory; eight WebP123306B passed individual size/SHA, full decoding, portable verification from another cwd, and actual thumbnail/detail pixel view. Original PNGs are not consumed or published here.

Tool-card/item-card use their own runtime manifest and four-ID registry. The published main165 handdrawn-p08 runtime4444474B and72/72 Joker registry, rules/RNG/save/score/fire/layout remain identical to main. Those final21 were integrated by the parent; this sample does not modify their registrations or art. Coverage here is **3/39 tools +1/12 permanent items**, not additional Joker faces; the other47 tool/item entries keep their existing procedural emblems.

## Implementation

ShopScene uses a bounded same-origin external thumbnail fetch/decode path, rather than passing URLs to addBase64. Only fallback SVGs use addBase64. Arrival paints only the current picture holder, preserving the interactive offer object and open/selected state; no whole-table render from a tool arrival. Scene shutdown aborts work and removes owned listeners; late results cannot install a texture or revive the scene. Loaded four-ID textures are reused. Decoder failures evict the corresponding failed cache entry for explicit retry.

The existing DetailArt queue/cache and DetailDialog fixed illustrated frame handle thumbnail first, HD only when opened, close/cancel, retry and mechanism fallback. Purchase and owned-use/item details share the descriptor; no separate overlay or new mode. Authoritative code continues to supply T12×1.5 and1/4 break, P11 same-suit full-house level+1, S02 edition5:3:2 plus5gold use cost, U07 consumable capacity+1. Artwork does not provide mechanics.

## Finite actual checks

- 148 final affected tests across seven files: goods registration/loading, existing tool-info text/fallback, DetailArt cancellation/cache, handdrawn mapping and Joker art/loading: PASS. Typecheck, production build and content/37-public-text privacy gate: PASS.
- [390×740 representative shop PNG](390-tools-s1-shop.png): engineer actually viewed. Native imported validator-approved fixture,100gold,one T12 tool offer; no HD requested before opening. The authoritative shelf cap is one tool; three separate legal fixtures inspect T12/P11/S02 plus U07. No gameplay quantity changed.
- All four actual textures/HD dimensions and visible HD byte hashes match approved output. BASE_URL `/tools-s1/` works; contain geometry, close/reopen cache, full-run/RNG invariance on all canceled inspections: PASS. U07 explicit native purchase deducts10gold once and persists one item, with rule RNG unchanged.
- 404 thumbnail+HD: mechanism fallback remains, explicit retries restore thumb/HD and fixed frame; canceled dialog does not mutate run: PASS.
- Native CDP touch down→thumbnail arrival→up opens correct detail with exact live interactive identity retained. Movement cancels without selection/dialog. Closing before late thumbnail/HD completion leaves dialog closed, removed image unchanged, only current shop picture updated: PASS. No extra screenshot or recording for these probes.

Detailed current validation source fingerprint, embedded C03 version/build timestamp, renderer, viewport/DPR/safe inset and finite results are in [summary.json](summary.json). The PNG is candidate/fixture evidence, not a main deployment or natural acquisition screenshot.

Implementation REVIEW_READY; bounded technical PASS; independent overall aesthetics PENDING; OnePlus/hardwareGPU/audio NOT_RUN. Final publication freeze/CI/main push NOT_RUN at this review stage. Parent coordinates integration with last21 resource branch and its independent Joker callback fix.

## Must-fix failure-path review correction

The original404 check proved cache/DOM fallback but missed the shelf image. A real callback observation before opening any detail reproduced `__MISSING`: failed status refresh called paintGoodsArt without an existing primary texture, destroying its valid procedural picture. The shared paint entrance now checks both active holder and texture existence before creating/removing children. Failed status notifications still reach details; neither initial failure nor repeated failed retry replaces the current valid image.

`harness/p08-tools-failure.mjs` observes actual Phaser children after the completed callback, with real HTTP404 and200 invalid-WebP responses. Each case proves the visible `goods-motif/T12`, retained image/hit identity and selected offer through failed native retry, unchanged render count, no run/RNG change, and successful later replacement only after texture installation. Both PASS. Final merged148 affected unit tests and production type/build PASS on the corrected source. Native down→arrival→up, movement cancellation and close/late callbacks also PASS using the same final Canvas build. No tolerance/timeout weakening, new picture or full freeze.

The existing PNG remains the original4266914 successful-path candidate, src fingerprint1804f73021a061e983a29202bf2bdc7f56e5eab6ded83971c356fe473b082bc0, C03 build14:06:05.335Z. It is not relabeled as a corrected-source screenshot. Its metadata is kept separately in summary.image. Final merged validation src fingerprinta56a38d037b52ea046bb034a3bcbf656ec8b157a522679d89c9c3c7ae2bf61a6, embedded9a25de17254387d11477165b4c959097e328a2a4 modified=true, build2026-10-04T14:35:14.362Z.

The parent’s independent last21 and Joker callback repair are inherited via normal merge, with no edits to that repair. The merged input probe delays original Joker thumbnails from the old shelf and the tool thumbnail, switches to tools, then releases both during native touch-down, movement cancellation or after closing a pending-HD detail. All original Joker textures and the tool texture actually arrive; exact hit identity, selection/cancel semantics, closed dialog/removed image and whole run/RNG remain correct: PASS. Main remains untouched.
