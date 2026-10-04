# P08 fire contour revision2: actual-score static review

Evidence only: two PNGs + this README, based on main `6f470b63032537b63898a4a974d91872439bbf3f`. Previous rejected candidate remains in commit ac06348. No candidate source or runtime asset is included here or pushed to main. Original worktree retains GameScene/layout/ScoreFlame changes; b9 is verified input, not registered.

Candidate src fingerprint (sorted tracked src path/NUL/bytes/NUL): `b4ec1951b06bcabd8d9c56c446d4c25a225db9fc897b33d576ee3c457dbf6df6`. Embedded C03 revision `6f470b63032537b63898a4a974d91872439bbf3f`, modified=true, built `2026-10-04T13:00:23.517Z`. Runtime manifest unchanged:a052cc972a19c4fa6ec9afe980b556c9ea4b2e426ea9ac918b9036679036000d.

Both routes use Chromium software Canvas, CSS viewport as below, DPR1, ordinary motion sampled as static. Natural seed d43-fire-1/老幻, no purchases, EnterStage, select diamonds7/9/4/Q/10, native Play. Resolver already saved hand1200, target400, prior stage heat0, successful playIndex1. Both frames are **1200/400=3× target, actual tier2**, with displayed300 heat×4; filenames are not the intensity proof. Render loop paused on an actual postrender after frameFlash0, screenshot, resumed/native fast-forward; full saved state unchanged and fire released. Not checkpoint fixture, main/deployed frame, animation or device acceptance.

| CSS viewport / safe inset | Score board (x,y,w,h) | Fire window (x,y,w,h) | Opaque base (x,y,w,h) | Actual visible fire max/root minimum |
|---|---|---|---|---|
|390×740 / all0|12,153.6,366,132|151.08,179.6,222.92,52|151.08,230.6,222.92,55|44px /11px|
|844×300 /top12,bottom34,left/right0|188,72,318,58|355.36,74,148.64,28|355.36,101,148.64,29|24px /6px|

Visible heights come from warm-color detection of actual PNG pixels (R>170,65<G<210,B<180,R−B>40), not theoretical silhouette extents, motion or FPS. Engineering viewed both full PNGs: stronger red root/orange body and curled shoulders; candidate overall appearance remains for independent root review.

Portrait: total digits bounds249.04,236.6,91,41 at36px/res1.5; 本手得分 bounds159.08,248.6,56,16 at14px/res1.5, beside digits in55px base. Source bounds143,157.6,104,16,14px/res1.5, clean independent row. Original132px information frame unchanged. Played area305.6…532.4 and hand536.4…648, fixed56px actions652…708 unchanged; nine/14-row geometry not altered, existing223.2px/22px lift tests retained.

Short: total bounds399.18,103,61,26 at24px/res1.5, inside29px base101…130. Source218.68,73,104,16 at14px/res1.5. No down-extension: score frame ends130, stable hand hit area starts134 (4px gap), actions start202. Played area x514,y72,w318,h58 unchanged. No reduced font, hidden extra state, card/hand/action budget borrowing or overlay used to create fire space.

Actual visible Text bounds mutually disjoint, disjoint from paintable safety pieces/buttons; base disjoint from hand and played area.38 affected original fire/layout tests and typecheck PASS without assertion weakening; natural two-route saved-state/cleanup PASS. No final freeze, all-tier browser, overall aesthetics or OnePlus/realGPU/audio acceptance claimed.

Approved project-generated outer-contour reference delivery db7912a02eb3e7e07d985e6d27621ad41511f3b7 was hash/alpha/portable verified and actually viewed. Only outer contour informs procedural drawing; not used as sprite/internal paint. Continuous root, two broad asymmetric curls and unequal narrow secondary peaks; thick朱红 rim/root, saturated orange body, sparse warm core. Existing score target/2×/5×, caption/text/button protection, eventId, wall-clock flash, reduced, cancellation/fast-forward lifecycle unchanged. No old blocked Steam/Library retry or private input published.

- [390x740-actual-large.png](390x740-actual-large.png), PNG SHA256 `b0550fce81c168693791ebd9ec4c4eecc3709187291091b8910095138c0c64ff`.
- [844x300-actual-large.png](844x300-actual-large.png), PNG SHA256 `ff1bc92cdf9b60ebd712bdbcc8096a428338e23778922429bb06d7df5e636a1b`.
