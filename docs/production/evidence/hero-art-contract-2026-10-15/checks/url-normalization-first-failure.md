# URL normalization first targeted failure

At the uncommitted complete-URL refinement after fe2cf0bc, `npx vitest run tests/character-art.test.ts tests/art-texture-loading.test.ts tests/detail-art.test.ts` returned 3 failed / 30 passed. The three DetailArt progressive retry/close cases failed because their existing DOM stub has no document.baseURI. Relative URLs passed to new URL therefore threw before decode; the prior pathname implementation had always supplied a fallback base.

Resolved by retaining the deterministic nonbrowser fallback when document.baseURI is absent. Real browsers still normalize to their document base URI and reject foreign origins/query variants. No assertions or deadlines were weakened. This is a recorded failure summary, not a copied raw test log; final raw targeted result is recorded separately.
