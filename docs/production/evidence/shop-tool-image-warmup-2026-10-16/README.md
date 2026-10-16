# Shop tool background image preparation

Base main2a8efe2a; product3ae914f6259d7c513284929a6b31bd8743909962; observer94b45dcc. Branch fix/shop-tool-background-images-20261016 is locally verified, not pushed or merged. Exact checks and paths: [status.json](status.json). Highlighter candidate b1a838e8 is separately verified and absent from this branch.

## Change and limits

Only ShopScene, MakeCardsDialog and new ShopToolImageWarmup change production code. The shop prepares actual held/current-offer/selectable-basic thumbnail URLs during idle/input-quiet time. Current visible or nearby panel cards prepare at most four HD candidates; no future shop stock or full-art-pack scan. Uses existing DetailArt cache/transfer arbitration and ImageWarmupQueue unchanged, two active jobs, one automatic retry, bounded16 thumbnail/4 HD decoded references. Shop shutdown, inventory identity change and panel/viewport retirement cancel optional owners. Hidden pages pause new work; saveData/2g policy skips optional preparation (policy source/unit review, not native device proof). No new visible loading copy.

No domain/gameplay/economy/RNG/save changes, new asset generation, originals/manifests edits or global startup budget changes. New70-image art pack has not been supplied and is not included. Existing real manifest drives this implementation.

## What was measured

Native fresh Chromium context,390x740 touch, low motion, title -> normal hero/group -> first shop6 gold -> inventory -> purchase pane -> actual T11 scroll/click -> decoded HD -> cancel -> repeat. Browser actions and passive fetch/decode/bitmap/texture/component/longtask observers only; full save state/journal/storage/localStorage unchanged when browsing/canceling. Table reports milliseconds from actual button action to HD visible, single local samples rather than a distribution. Dwell means1500ms in shop plus400ms browsing before tap.

| Network and entry | Before cold | After cold | Before hot | After hot |
|---|---:|---:|---:|---:|
| Local, immediate |102.8|105.2|79.6|79.1|
| Local, dwell |104.9|89.7|81.3|80.4|
| Controlled180ms response delay, immediate |302.9|186.2|79.3|76.7|
| Controlled180ms response delay, dwell |287.5|90.2|79.9|64.3|

Baseline T11 HD was requested only after tap. With dwell, preparation requested it about332ms before tap. Local baseline HD response5.5ms, bitmap3.7ms and display decode4.4ms; initial panel12.5/12.1ms and confirmation13.4/12.6ms. Thumbnail startup body2084B was already fetched; later DOM image request was300B revalidation, not a second full-body download. No T11 texture addition occurred on opening and no observed >=50ms shop longtask in these local samples. These observations do not reproduce or explain the user's multi-second device stall. Immediate local cold path is not faster; preparation benefits time spent in shop and constrained responses. Controlled routing disables browser HTTP cache, so it cannot prove real transfer-byte savings.

Raw before/after and slow reports keep exact build-info revisions. Later observer-only revisions reuse preserved product builds; runtime source exactly equals3ae. E2E fixture/build outputs, original failures and backups remain in ignored shots folders. [Final list](screens/after-list.png) and [confirmation](screens/after-detail.png) visually reviewed.

## Recovery and cancellation

Failure-once: background retry recovers, one automatic retry. Permanent503: background stops at two failed attempts; explicit open is third and explicit HD retry after network recovery is fourth. All observed HD transfers stay at most two concurrently; healthy repeat uses the same HD result. No blank tool face replaces the thumbnail.

Native leave proof uses2500ms delay only on image-element requests, leaving startup fetches undelayed. Before native EnterStage tap, two real tool thumbnail decodes are pending. Both sources are removed about432ms after decode start during scene retirement; no later tool request is started; resulting full save remains stable and pageerror0. Chromium's underlying decode promises can remain pending after source removal: this proves source/consumer retirement and no later optional jobs, not network byte cancellation.

Three stronger observer attempts remain as FAIL in observer-failures: first jobs finished before native leave; second delayed only after a shop marker that occurred too late; third correctly found pending work but wrongly assumed source removal must reject native decode. Final passive removeAttribute observer records actual retirement without changing application behavior. Original preliminary leave-inflight PASS proves only no later requests and is not promoted to in-flight cancellation proof.

## Checks and status

38 tests in4 files PASS:shop-tool-image-warmup,detail-art,image-warmup-queue,art-texture-loading. TypeScript/production build PASS with existing chunk-size warning. Native rotation39 cases PASS, including actual T11 BuyBasicTool -> LeaveShop -> EnterStage -> UseConsumable, cancel/return, resize and cold restore; source hashes in compressed report. No physical-device/GPU/perceived-stall/full-game acceptance claimed. P08 remains in_progress.

Reproduce: SHOP_IMAGE_PHASE=after SHOP_IMAGE_OUT=<new-directory> node harness/shop-tool-image-warmup.mjs. Slow comparison adds SHOP_IMAGE_DELAY=180. Fault checks use SHOP_IMAGE_FAULT=once|permanent. Confirmed leave uses SHOP_IMAGE_DELAY=2500 SHOP_IMAGE_DELAY_IMAGES_ONLY=1 SHOP_IMAGE_EARLY_EXIT=1 SHOP_IMAGE_DWELLS=400. Exact preserved builds may be selected with SHOP_IMAGE_REUSE_BUILD=1 and SHOP_IMAGE_BUILD_DIR; report.head is tested build revision and runnerHead is observer revision. Rotation optional output/build-directory flags do not change default behavior.

Publication: main and remote remain2a8efe2a. Separate approved highlight candidate b1a838e8 normal main FF/push was denied before execution twice, latest review treating delegated later authorization as untrusted despite transcript. No alternative push route attempted; shop branch publication also not attempted. Parent must resolve authorization review before publication.
