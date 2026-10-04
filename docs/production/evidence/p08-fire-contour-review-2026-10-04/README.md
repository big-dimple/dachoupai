# P08 Doom thermal-kernel candidate review

**Review candidate only. main is unchanged; not a deployed build or final art/device acceptance.**

Published base: `6f470b63032537b63898a4a974d91872439bbf3f`.
Candidate src fingerprint: `1cf05d316a49ea8ac20e57b9601fdd60c2506fa7cc005b0cde0083921aa0c1fd` (sorted src path + NUL + bytes + NUL, including the new module).
Embedded build: `C03`, revision `6f470b63032537b63898a4a974d91872439bbf3f`, modified=true, builtAt `2026-10-04T13:33:58.719Z`.
Runtime manifest SHA256: `a052cc972a19c4fa6ec9afe980b556c9ea4b2e426ea9ac918b9036679036000d`. No art registration/manifest change in this candidate.

## Bounded change

The heat propagation/source core is adapted from the MIT Doom fire algorithm, fixed commit `854c39ff00f6f4688a674a4086d3c9f7c02497e1`, `playground/render-with-canvas/fire.js`. See [THIRD_PARTY_NOTICES.md](../../../../THIRD_PARTY_NOTICES.md) for the complete notice, attribution and adaptations. No upstream assets, DOM, timers or dependencies.
Polygon coverage/tongue generation is removed. Independent deterministic visual noise feeds normalized typed-array double buffers; propagation is row-clamped, each destination is written, and the bottom source uses x < width. Ambient cooling/wind scale adapt the coarse upstream grid. Cold heat is transparent; the P08 palette supplies the red root.
The prior foreground paper score base, label/digit fonts and CSS-space fire safety are retained. Only cosmetic heat/layout changes; actual score thresholds, rules, RNG, storage and published material mappings are unchanged. No prospective-score fire.

## Actual route and finite evidence

Chromium software Canvas, CSS viewport as below, DPR1, touch input, normal motion. Natural seed `d43-fire-1`; choose 老幻, buy nothing, enter the first stage; native-select ♦7/9/4/Q/10 and Play. Actual saved score1200 / target400 = 3×, **tier2 large fire**, not extreme. Pause after an actual rendered frame with total1200 and the transient frame flash ended; resume and native fast-forward. Both complete saved run snapshots matched after fast-forward and the fire instance was destroyed. No fixture score injection, recording, deployed-site or hardware-GPU claim.

| PNG | CSS viewport / safe inset(top,right,bottom,left) | local fire box(x,y,w,h) | foreground base(x,y,w,h) | SHA256 |
|---|---|---|---|---|
| [390x740-actual-large.png](390x740-actual-large.png) | 390×740 / 0,0,0,0 | 151.08, 179.60, 222.92, 52.00 | 151.08, 230.60, 222.92, 55.00 | `466cebf16a96c8c41bd59266b9e98f16571d167ecf323cb5709ed3037229caba` |
| [844x300-actual-large.png](844x300-actual-large.png) | 844×300 / 12,0,34,0 | 355.36, 74.00, 148.64, 28.00 | 355.36, 101.00, 148.64, 29.00 | `1b778ca3322af67062e27ae28918a9aa53a49b98490229a65a249997c634c87f` |

## Actual checks and limits

- 43 targeted tests PASS: unchanged fire/layout safety and strength contracts plus five thermal-core tests (source row/sentinels, lower-row clamp/full write, deterministic no Math.random, finite normalized heat, invalid/aliased input rejection). Includes three-tier area/brightness/height, connected root/unequal peak-valley contracts, reduced static no subsequent uploads, same-tier impact dedup, wall-clock flash expiry and destruction.
- Typecheck PASS. e2e Vite build and the two natural-score Canvas routes PASS. Actual Text bounds do not intersect fire-safe pieces or one another; total digits fit their opaque base; the base does not intersect hand, played area or action bodies.
- Actual primary fonts:390×740 total36px/label14px;844×300 total24px/caption14px; resolution1.5. Text remains legible without reducing prior font sizes. Warm-color static detection gives exposed height16–34 CSSpx portrait and8–18 CSSpx short landscape; these are color-threshold observations, not flame-area or animation acceptance.
- Engineer actually viewed both PNGs. Heat now has a continuous root and heat-driven irregular outline; residual pixel grain remains for independent review. No claim that root has viewed/accepted this new candidate.
- Implementation candidate: ready for review. Bounded technical checks: PASS. Final freeze/full CI: NOT_RUN for this review stage. Independent overall aesthetics: PENDING. OnePlus/real GPU/audio/motion experience: NOT_RUN.
- Resource batches are outside this candidate; their pending work is preserved. No private Library identities/links, private input screenshot, original art, runtime asset or full saved-run checkpoint is published here.
