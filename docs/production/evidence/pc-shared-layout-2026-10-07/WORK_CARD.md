# PC shared layout repair

- requirementId: U03/U06; PC regression reported by user on 2026-10-07.
- inputSHA: 0c35a824e4ab29b8c9d213722060c714324f853b (latest main confirmed).
- dependencies: shared existing layout, actual text bounds, unchanged saved rules; W2/W3/W4 remain open.
- allowedFiles: src/game/layout.ts, src/game/GameScene.ts, src/game/ToolInventoryEntry.ts, tests/layout.test.ts, harness/pc-shared-layout.mjs, this evidence directory. Separate documentation commit: docs/production/JOKER_TRIGGER_HIGHLIGHT.md and DELIVERY_PLAN.md.
- nonGoals: gameplay values, save/domain, assets, full art, new PC implementation, rollback, GPU/FPS acceptance, long recordings, W4 implementation.
- outputs: isolated repair branch and draft PR; main coordination stays with parent.
- acceptance: real HUD text bounds outside score; right DOM controls outside rack; nine cards one page; 10–14 reachable readable window where needed, arrows recalculated from final hand; portrait nine/two-row contract protected. Desktop 1280×720, 1366×768, 1920×1080, 1912×954, 768×1024, 811×812/812×811; phones 390×740, 320×740, 740×390, each 8/9/14 and five selections; repeated sorting/AI cut.
- stopConditions: domain or art changes required, unreadable targets, protected branch bypass. Serial execution, no additional agents. User PC/physical GPU/audio acceptance remains NOT_RUN.

First full test exposed a mobile contract fingerprint change from recalculating unused portrait arrows. Corrected by retaining those unchanged portrait coordinates; desktop window arrows still use final hand. First browser matrix passed before that correction; it is retained as intermediate dirty-source evidence, not exact final verification.
