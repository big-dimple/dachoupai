# Inkwave modules actually adapted

Source: https://github.com/jaydendavisnc/inkwave/tree/98ea29694ab3eebaaeaa995c2b525ac883a48de5
MIT Copyright (c) 2026 Jayden Davis; exact original LICENSE alongside this notice. The same full notice is shipped in the web distribution at `public/assets/licenses/Inkwave-MIT.txt` (runtime `assets/licenses/Inkwave-MIT.txt`).

- `src/ui/ui-util.js` L81–96: Spring integrator adapted in `src/game/inkwaveSpring.ts`. TypeScript, fixed 60-step lookup for existing Phaser tween easing, no extra update listener. Applied to hero strike/number recovery and opening name/voice stagger; existing reduced-motion and owned tween cancellation remain.
- `src/audio/audio.js` L258–280: minGap and per-sound oldest-voice cap adapted to per-semantic multi-layer recipes in `AudioEngine.cue`. Existing app context, bus/mute/visibility, event identity and cleanup remain. Local round-robin variants replace pitch jitter; no domain RNG.
- `src/audio/audio.js` L425–449: 75ms paired confirmation timing adapted to actual recorded chip transaction layers, not its synthesized voices.

- `src/ui/menu-art.js` InkWipe L285–309, L344–384: cancellation/token guard, rAF starvation timeout and three-wave edge adapted in `src/game/PaperFlow.ts`. A 240ms narrow translucent paper/ink strip replaces the opaque full wipe, particles and SQUID mark. Scene routes execute immediately exactly once; no delayed onMid callback. App/OS reduced motion, blur, visibility, resize and game destruction cancel the visual layer. No asset or domain RNG added.

No V.tone/V.nz, shooter engine, fonts, songs, 3D assets or debug freeze were imported. Demo playback/hearing was not verified: parent's cloud browser stopped at5% with WebGL Disabled. These are actual code adaptations, not a claim of demo or human audiovisual acceptance.

## 2026-10-09 complete opening rhythm adaptation

Exact new reference: https://github.com/jaydendavisnc/inkwave/tree/679d2dba48457c239f2c60ba1ffc17d1fe789f07 (MIT, Copyright (c) 2026 Jayden Davis). Earlier98ea adaptations and full licence remain.

- styles/ui.css64–72,778–785: title entrance and squash/ring timing adapted to the existing title art and existing Phaser spring easing.
- src/ui/menus.js582–589: bounded200ms confirmation followed by the existing immediate scene route.
- src/ui/menu-art.js209–226,258–310,372–448: moving bounded droplets, expanding rings and1000ms cover/reveal, in existing paper/ink/red palette. Title and first saved hero stage share InkBurst; foreground motion remains behind numerical readout. Route/hero remain one saved-event stage; the existing extra500ms is unchanged. Full reveal may be skipped by input without owning or repeating the route. Reduced motion bypasses it. The earlier light240ms adaptation remains for other transitions.
- src/audio/audio.js726–734: low body / filtered air / tail structure adapted using existing licensed recorded material only. No upstream synthesized noise/tone imported. This is code-reference adaptation; upstream full browser playback and subjective listening were not verified.

Reference file SHA-256 (downloaded exact revision, not bundled wholesale):
- `LICENSE`: `aa94b137dc8ec64c7f78f66c71070a78c528a100e26fcfbd30eec06737413f41`
- `styles_ui.css`: `fc8cb1d9594213f176460a8da864c18e331165c1f6b12dd1f626b9c53114c1d2`
- `src_ui_menus.js`: `891956f92b600674f359aaa25cf6c10097d42baa0f51f82d4fb446a233a33111`
- `src_ui_menu-art.js`: `6b4d3ef8a227b507f09acb4731efb088399c4a0e424cc093f9e1a7bf305ef7a3`
- `src_audio_audio.js`: `402a7dedc9a7cea7aefbdff540dd62fb02c22a966b71cdeb83a83fe7bdb98e9b`
