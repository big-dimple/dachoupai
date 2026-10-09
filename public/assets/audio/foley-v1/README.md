# Semantic recorded foley v1

22 unmodified Kenney CC0 recordings, 208,651 bytes. `sources.json` records immutable download URLs, SHA256, duration and license. The mirror's general code license is unrelated to these separately declared CC0 sound packs. Official pack pages confirm CC0; original ZIP retrieval returned 403. `cloth2` remains sourced through the existing score-impact manifest for the cloth layer; no claim that a card shuffle is a cloth recording.

Runtime trims/levels/delays are explicit in `src/audio/foley.ts`; all source files stay unchanged. The engine rotates local variants and limits each semantic family before scheduling sample nodes; no gameplay RNG, synthetic beep fallback, delayed browser timer, or replay after decode. Defaults remain music30/effects80 and the historical Serenade recording is unchanged.

`heard:false` means no subjective/human audition occurred here. Short captured real WebAudio output is reviewable evidence, not a taste or device acceptance.
