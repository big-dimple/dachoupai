# Shared layout result (2026-10-07)

Base main: `0c35a824e4ab29b8c9d213722060c714324f853b`.
Product repair: `6e504b6d583ba0a0127e346d83488e533ca24911`.
Independent W4 documentation: `337a9a09f9fd3ccf98d50fd87edafe4d3fa0afff`.
Final native matrix frozen clean source: `77b1051692d020ad71ec46d6ffab293bb8cf67f8` (same src/tests as 337a9a0; only harness scope/evidence changed).

Desktop HUD has a dedicated 250px region for actual two-line gold text and progress; the score and tool inventory follow below it. Desktop rack starts below the fixed DOM controls. The final hand rectangle owns capacity, window gutters, start index and arrows. Nine seats remain on one page. At 768×1024 fourteen cards use a nine-seat window with at least 39px exposed columns; native arrow clicks reach all fourteen. At 811×812 fourteen cards use a window, at 812×811 all fourteen fit. Large desktop faces cap at 96px (80px minimum); the workplane has a bounded 1.25 scale on spare wide/tall tables. Portrait geometry and the original mobile layout fingerprint remain intact.

Validation:

- Directed tests: layout/selection/tool inventory, then mobile historical fingerprint: PASS.
- Full npm verify: typecheck, 2449 tests / 135 files, production build PASS. Source bytes match final frozen source; first fingerprint FAIL retained with correction in WORK_CARD.
- Content verification and production plan validator: PASS (not gameplay acceptance).
- Final clean compiled Canvas: 30 native viewport/count combinations, actual HUD text bounds, five selections, repeated four sorts, two AI cuts for each 8/9/14 capacity, no run mutation during selection/AI, and fourteen-card window reachability PASS. ResizeObserver dimensions explicitly awaited.
- Standard unmodified system Chromium smoke: desktop 1280×720 / DPR1 and phone 390×740 / DPR3 PASS. Build source 337a9a0, src/tests byte-identical to final frozen source. No timeouts or assertions relaxed.
- Three key final screenshots retained; all three viewed as complete images during this task. They show empty Joker slots in controlled fixtures, not a naturally acquired build.

W4 highlight design and serial 6.1/default Medium constraint are documented in the independent documentation commit. W2/W3 dependencies and current PC repair priority remain; no effects implemented. No domain, gameplay values, saved identity, assets, audio or separate PC project changes.

User PC acceptance, physical phones, hardware GPU, listening and overall aesthetic acceptance: NOT_RUN. No recordings or FPS acceptance performed. The cloud checks do not close those gates. Main remains parent-coordinated; draft PR only.

## Follow-up landscape scope self-check

On 2026-10-07, 270 read-only SSR comparisons of complete landscape layouts and playedFootprint against baseline 0c35a824 passed (see landscape-self-check.json). Runtime layout callers do not force a tall landscape mode: the auto landscape branch requires height <500px. At reachable landscape heights the new scratch cardWidth expression remains80, and its override never executes; playedArea height <500 keeps footprint scale1. No mobile landscape regression or product edit was found. This is a geometry equality check, not a new native or device acceptance. No unchanged browser matrix was rerun.
