# 开工卡

- requirementId: W3-score-review-readable / delegated menu recap only
- inputSHA: 2ef9180c066308e06d7d09850983ea469aa67fd8 (latest origin/main at fetch)
- dependencies: saved ScoreTrace, existing BigInt readableFractionText/exactFractionText, identity resolver and Chinese operation copy; /workspace/.agents is empty and repository has no applicable .agents/skills.
- allowedFiles: src/game/ScoreReview.ts (new pure formatter), src/game/GameScene.ts (inspectLastTrace plus imports and removal of now-unused recap-only formatBreakdown), src/game/RunMenu.ts (inactive replay fallback plus imports), tests/score-review.test.ts (new), harness/score-review.mjs (new bounded read-only browser evidence), docs/production/evidence/score-review-readable-2026-10-13/**.
- nonGoals: scorer/domain/content/save/RNG, dynamic settlement, HeroClimax, hero selection, future growth rates/caps, asset work, old-save migration, full game playthrough, DELIVERY_PLAN.md changes.
- outputs: readable summary + Chinese actual source/operation counts; collapsed exact formula + raw events; local PC/mobile screenshots and unchanged state/journal/storage proof; isolated branch commit/push/Draft PR and exact CI links.
- acceptance: bounded numerical display, no raw event keys in default view, no rounding in scorer or saved trace, no fictional trigger counts, no horizontal overflow in collapsed or expanded diagnostic; menu + game detail localized validation, saving/refresh preserved.
- stopConditions: scope conflict / permission rejection reported with exact target; no main push/merge/force push. IntermissionScene.inspectLastHand is a separate adjacent recap with old exact display and is outside this delegated menu change (reported for parent coordination).

Latest user authorization starts coding and supersedes historical paused/serial scheduling text; this task does not rewrite that history or the unique execution plan.
