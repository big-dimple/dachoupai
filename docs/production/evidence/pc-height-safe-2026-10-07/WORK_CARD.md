# 500px/safe-inset boundary repair

Input: ae13ebae272776d02b5c629ee071d4b027726e4d. Parent read-only review reproduced inventory outside usable viewport at1024×500 safe24/34 (470–514 vs usable bottom466), and1280×500 safe0/34. First directed FAIL retained; it also exposed history bottom552 at desktop500/safe0.

Scope: only src/game/layout.ts mode budget, tests/tool-inventory-entry.test.ts boundary regression, harness/pc-height-safe.mjs and this evidence directory. Prior plan/ordering, highlight design, asset reconciliation, manifests and all existing evidence remain unchanged. No gameplay/asset/audio changes, no new PC implementation, no recordings or FPS acceptance.

The full sidebar reserves HUD/score/inventory plus a two-line history: history top8+510,34px allowance,8px bottom clearance =>560px usable height. Auto layout now uses height-safe.top-safe.bottom and reuses the existing landscape/short-screen strategy below560px. Portrait priority remains; requested modes remain explicit. Old auto-landscape heights below500 and original large-desktop/mobile fixtures retain their strategy. Inventory touch height remains44 and fonts unchanged.

Directed static coverage: widths1024/1280/1920; heights499/500/501 and559/560/561; top/bottom0/12/24/34 each; left/right0/0,12/24,24/12;9/14 cards,1728 combinations. Check safe containment of inventory/history/controls/cards, inventory isolation,44px controls and nine seats on one page.

Finite native software Canvas matrix:7 viewport/inset combinations ×9/14, simulated CSS safe values, actual text/entry bounds, five selections, real inventory open/close and sort; no run mutation during selection/inspection. Three key PNGs only. These are controlled validator-approved imports, not natural acquisition or physical device acceptance. Parent/user PC acceptance remains pending.
