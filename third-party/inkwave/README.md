# Inkwave modules actually adapted

Source: https://github.com/jaydendavisnc/inkwave/tree/98ea29694ab3eebaaeaa995c2b525ac883a48de5
MIT Copyright (c) 2026 Jayden Davis; exact original LICENSE alongside this notice.

- `src/ui/ui-util.js` L81–96: Spring integrator adapted in `src/game/inkwaveSpring.ts`. TypeScript, fixed 60-step lookup for existing Phaser tween easing, no extra update listener. Applied to hero strike/number recovery and opening name/voice stagger; existing reduced-motion and owned tween cancellation remain.
- `src/audio/audio.js` L258–280: minGap and per-sound oldest-voice cap adapted to per-semantic multi-layer recipes in `AudioEngine.cue`. Existing app context, bus/mute/visibility, event identity and cleanup remain. Local round-robin variants replace pitch jitter; no domain RNG.
- `src/audio/audio.js` L425–449: 75ms paired confirmation timing adapted to actual recorded chip transaction layers, not its synthesized voices.

No InkWipe, V.tone/V.nz, shooter engine, fonts, songs, 3D assets or debug freeze were imported. Demo playback/hearing was not verified: parent's cloud browser stopped at5% with WebGL Disabled. These are actual code adaptations, not a claim of demo or human audiovisual acceptance.
