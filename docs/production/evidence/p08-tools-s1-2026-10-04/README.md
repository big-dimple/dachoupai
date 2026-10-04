# P08 four tool/item sample integration — review only

Published base `6f470b63032537b63898a4a974d91872439bbf3f`; no fire candidate or last21 functional-card registrations. This branch is for parent review/alignment, not deployed main.

Only approved public delivery commit `11ae7a464fdcf54c4e338da9171d827265742e3c` supplies tool-t12 **v2** glass, tool-p11, tool-s02 and item-u07. Consumer fetched only that source directory; eight WebP123306B passed individual size/SHA, full decoding, portable verification from another cwd, and actual thumbnail/detail pixel view. Original PNGs are not consumed or published here.

Tool-card/item-card use their own runtime manifest and four-ID registry. Existing123 handdrawn-p08 images, Joker registry51new/6old/15mechanism, rules/RNG/save/score/fire/layout are unchanged. Coverage here is **3/39 tools +1/12 permanent items**, not additional Joker faces; the other47 tool/item entries keep their existing procedural emblems.

## Implementation

ShopScene uses a bounded same-origin external thumbnail fetch/decode path, rather than passing URLs to addBase64. Only fallback SVGs use addBase64. Arrival paints only the current picture holder, preserving the interactive offer object and open/selected state; no whole-table render from a tool arrival. Scene shutdown aborts work and removes owned listeners; late results cannot install a texture or revive the scene. Loaded four-ID textures are reused. Decoder failures evict the corresponding failed cache entry for explicit retry.

The existing DetailArt queue/cache and DetailDialog fixed illustrated frame handle thumbnail first, HD only when opened, close/cancel, retry and mechanism fallback. Purchase and owned-use/item details share the descriptor; no separate overlay or new mode. Authoritative code continues to supply T12×1.5 and1/4 break, P11 same-suit full-house level+1, S02 edition5:3:2 plus5gold use cost, U07 consumable capacity+1. Artwork does not provide mechanics.

## Finite actual checks

- 45 affected tests across goods registration/loading, existing tool-info text/fallback, DetailArt cancellation/cache and existing handdrawn mapping: PASS. Typecheck, production build and content/28-public-text privacy gate: PASS.
- [390×740 representative shop PNG](390-tools-s1-shop.png): engineer actually viewed. Native imported validator-approved fixture,100gold,one T12 tool offer; no HD requested before opening. The authoritative shelf cap is one tool; three separate legal fixtures inspect T12/P11/S02 plus U07. No gameplay quantity changed.
- All four actual textures/HD dimensions and visible HD byte hashes match approved output. BASE_URL `/tools-s1/` works; contain geometry, close/reopen cache, full-run/RNG invariance on all canceled inspections: PASS. U07 explicit native purchase deducts10gold once and persists one item, with rule RNG unchanged.
- 404 thumbnail+HD: mechanism fallback remains, explicit retries restore thumb/HD and fixed frame; canceled dialog does not mutate run: PASS.
- Native CDP touch down→thumbnail arrival→up opens correct detail with exact live interactive identity retained. Movement cancels without selection/dialog. Closing before late thumbnail/HD completion leaves dialog closed, removed image unchanged, only current shop picture updated: PASS. No extra screenshot or recording for these probes.

Detailed source fingerprint, embedded C03 version/build timestamp, renderer, viewport/DPR/safe inset and finite results are in [summary.json](summary.json). The PNG is candidate/fixture evidence, not a main deployment or natural acquisition screenshot.

Implementation REVIEW_READY; bounded technical PASS; independent overall aesthetics PENDING; OnePlus/hardwareGPU/audio NOT_RUN. Final publication freeze/CI/main push NOT_RUN at this review stage. Parent coordinates integration with last21 resource branch and its independent Joker callback fix.
