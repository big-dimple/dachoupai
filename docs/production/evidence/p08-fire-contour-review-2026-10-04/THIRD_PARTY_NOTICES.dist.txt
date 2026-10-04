# Third-party notices

## Doom fire propagation adaptation

The small heat propagation/source functions in `src/game/DoomFireHeat.ts` are
adapted from `filipedeschamps/doom-fire-algorithm`, commit
`854c39ff00f6f4688a674a4086d3c9f7c02497e1`,
`playground/render-with-canvas/fire.js`: `calculateFirePropagation`,
`updateFireIntensityPerPixel`, and `createFireSource`.
The Canvas implementation README credits **@mccraveiro**.

Source: https://github.com/filipedeschamps/doom-fire-algorithm/blob/854c39ff00f6f4688a674a4086d3c9f7c02497e1/playground/render-with-canvas/fire.js

License: https://github.com/filipedeschamps/doom-fire-algorithm/blob/854c39ff00f6f4688a674a4086d3c9f7c02497e1/LICENSE

Changes: normalized 0–36 heat to 0–1; deterministic cosmetic noise instead of
Math.random; same-row clamping and gather-based double buffering (every cell
written, no out-of-range source row); exact x < width fuel row; bounded ambient
cooling and wind scale for the denser heat texture. No upstream
DOM, timers, renderer, palette, assets or dependencies are included. This notice
applies to the adapted component and does not change the project license.

MIT License

Copyright (c) 2019 Filipe Deschamps

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
