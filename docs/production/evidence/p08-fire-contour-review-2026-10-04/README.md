# P08 Doom thermal-kernel candidate review

**Review candidate only. main is unchanged; not a deployed build or final art/device acceptance.**

Published base: `6f470b63032537b63898a4a974d91872439bbf3f`.
Candidate src fingerprint: `4335772380cd2495d573d690858fdda01e2aed6fdcfccabe36dd9ae129b404f4` (sorted src path + NUL + bytes + NUL, including the new module).
Embedded build: `C03`, revision `6f470b63032537b63898a4a974d91872439bbf3f`, modified=true, builtAt `2026-10-04T13:44:27.846Z`.
Runtime manifest SHA256: `a052cc972a19c4fa6ec9afe980b556c9ea4b2e426ea9ac918b9036679036000d`. No art registration/manifest change in this candidate.

## Bounded change

The heat propagation/source core is adapted from the MIT Doom fire algorithm, fixed commit `854c39ff00f6f4688a674a4086d3c9f7c02497e1`, `playground/render-with-canvas/fire.js`. See [THIRD_PARTY_NOTICES.md](../../../../THIRD_PARTY_NOTICES.md) for the complete notice, attribution and adaptations. No upstream assets, DOM, timers or dependencies.
Polygon coverage/tongue generation is removed. Independent deterministic visual noise feeds normalized typed-array double buffers; propagation is row-clamped, each destination is written, and the bottom source uses x < width. Ambient cooling/wind scale adapt the coarse upstream grid. Cold heat is transparent; the P08 palette supplies the red root.
The prior foreground paper score base, label/digit fonts and CSS-space fire safety are retained. Only cosmetic heat/layout changes; actual score thresholds, rules, RNG, storage and published material mappings are unchanged. No prospective-score fire.

## Actual route and finite evidence

Chromium software Canvas, CSS viewport as below, DPR1, touch input, normal motion. Natural seed `d43-fire-1`; choose 老幻, buy nothing, enter the first stage; native-select ♦7/9/4/Q/10 and Play. Actual saved score1200 / target400 = 3×, **tier2 large fire**, not extreme. Pause after an actual rendered frame with total1200 and the transient frame flash ended; resume and native fast-forward. Both complete saved run snapshots matched after fast-forward and the fire instance was destroyed. No fixture score injection, recording, deployed-site or hardware-GPU claim.

| PNG | CSS viewport / safe inset(top,right,bottom,left) | local fire box(x,y,w,h) | foreground base(x,y,w,h) | SHA256 |
|---|---|---|---|---|
| [390x740-actual-large.png](390x740-actual-large.png) | 390×740 / 0,0,0,0 | 151.08, 179.60, 222.92, 52.00 | 151.08, 230.60, 222.92, 55.00 | `5cff07707be772efa07af1562db74ed9542f6d398fa07e6a56ec3d299fe681ed` |
| [844x300-actual-large.png](844x300-actual-large.png) | 844×300 / 12,0,34,0 | 355.36, 74.00, 148.64, 28.00 | 355.36, 101.00, 148.64, 29.00 | `341a0a74fbe05b6e47e0c624d61d11f9146f464e079cf312bfb5adb4ec8d0090` |

## Actual checks and limits

- 51 targeted tests PASS (44 heat/fire/layout plus seven existing CI-gate tests): unchanged fire/layout safety and strength contracts plus five thermal-core tests (source row/sentinels, lower-row clamp/full write, deterministic no Math.random, finite normalized heat, invalid/aliased input rejection). Includes three-tier area/brightness/height, connected root/unequal peak-valley contracts, reduced static no subsequent uploads, same-tier impact dedup, wall-clock flash expiry and destruction.
- Production build (including typecheck) PASS. e2e Vite build and the two natural-score Canvas routes PASS. Actual Text bounds do not intersect fire-safe pieces or one another; total digits fit their opaque base; the base does not intersect hand, played area or action bodies.
- Actual primary fonts:390×740 total36px/label14px;844×300 total24px/caption14px; resolution1.5. Text remains legible without reducing prior font sizes. No previous candidate pixel-height measurement is reused for these new PNGs.
- Engineer actually viewed both new PNGs: **visual target FAIL**. The large-fire natural frame now has a low root and three sparse fragmented spikes; horizontal grain persists and the short-landscape body is especially weak. Static/steady strength tests passing does not prove the natural transition frame looks like the required full fire. This bounded attempt stops here; no further tuning or claim that root has viewed/accepted it.
- Implementation candidate: ready for review. Bounded technical checks: PASS. Final freeze/full CI: NOT_RUN for this review stage. Engineer visual self-check: FAIL; independent overall aesthetics: PENDING. OnePlus/real GPU/audio/motion experience: NOT_RUN.
- Resource batches are outside this candidate; their pending work is preserved. No private Library identities/links, private input screenshot, original art, runtime asset or full saved-run checkpoint is published here.

## One bounded revision after independent review

Only tier2 large fuel changed from `.48+.51*wave` to `.12+.87*wave³`; noise, cooling, palette, filter, masks, fonts and geometry were not retuned. The lower baseline and narrower supply do not achieve the desired natural-frame body, so no additional contour experiment follows.

Live tier changes preserve the heat field and advance exactly one step. Same-tier/reduced-identical calls return without propagation or upload. Initial ignition, static reduced fields and reduced-to-live recovery retain bounded warm starts. New assertions cover heights28/40/52 and upgrade/downgrade/repeated calls/restore/off. Old steady area/brightness/height thresholds are unchanged; a live transition is measured after96 bounded normal simulation updates, while immediate edge ignition and wall-clock expiration are separately asserted. This is a unit simulation, not a longer browser timeout.

Vite now emits `THIRD_PARTY_NOTICES.txt` from the single root notice. Actual production `dist/THIRD_PARTY_NOTICES.txt` and the custom e2e output were both read and compared byte-for-byte with the root notice: PASS, 2223 bytes, SHA256 `66e656fdc9922cc178fbd91aa4d0791655ce33795aa7b05f9c956c6441e78033`. The [actual emitted notice snapshot](THIRD_PARTY_NOTICES.dist.txt) preserves those bytes. Project license and dependencies remain unchanged.
