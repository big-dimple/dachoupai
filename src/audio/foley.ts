import sources from '../../public/assets/audio/foley-v1/sources.json';
export const FOLEY_SAMPLES = sources.assets;
export type Layer = { samples: string[]; duration: number; gain: number; delay?: number; rate?: number;attack?:number;hold?:number;filter?:{type:BiquadFilterType;frequency:number;end:number;sweep:number;Q:number} };
export type FoleyRecipe = { layers: Layer[]; gap: number; cap: number };
const layer=(samples:string[],duration:number,gain:number,delay=0,rate=1):Layer=>({samples,duration,gain,delay,rate});
const slides=['card-slide-1','card-slide-2','card-slide-3'],places=['card-place-1','card-place-2','card-place-3'],wood=['impactWood_light_000','impactWood_light_001'];
// Recorded bodies, not oscillator notes. Ordinary gestures stay below the key accent.
export const FOLEY = {
 deal:{layers:[layer(slides,.14,.020)],gap:.035,cap:3},
 hover:{layers:[layer(['chip-lay-1'],.06,.006)],gap:.055,cap:1},
 select:{layers:[{...layer(slides,.16,.032),attack:.008,hold:.48}],gap:.045,cap:2},
 cancel:{layers:[layer(['card-shove-1'],.16,.021)],gap:.055,cap:2},
 invalid:{layers:[layer(['impactSoft_medium_000'],.12,.027,0,.8)],gap:.12,cap:1},
 land:{layers:[layer(places,.13,.025)],gap:.035,cap:3},
 play:{layers:[layer(['card-fan-1'],.25,.029),layer(['impactWood_heavy_000'],.17,.037,.075)],gap:.08,cap:2},
 discard:{layers:[layer(['card-shove-1'],.24,.027)],gap:.08,cap:2},
 coin:{layers:[layer(['chip-lay-1','chip-lay-2'],.14,.027)],gap:.045,cap:3},
 spend:{layers:[layer(['chips-stack-1'],.13,.027)],gap:.04,cap:3},
 spendLast:{layers:[layer(['chips-stack-1'],.15,.032),layer(['impactSoft_medium_000'],.16,.024,.055)],gap:.04,cap:4},
 title:{layers:[layer(['impactBell_heavy_003'],.38,.030)],gap:.2,cap:1},
 confirm:{layers:[layer(['impactWood_light_001'],.16,.032),layer(['impactBell_heavy_003'],.30,.024,.075)],gap:.2,cap:2},
 curtain:{layers:[layer(['cloth2'],.32,.035),layer(['card-fan-1'],.22,.015,.075)],gap:.2,cap:2},
 add:{layers:[layer(wood,.12,.030)],gap:.045,cap:2},
 held:{layers:[layer(places,.14,.020)],gap:.04,cap:2},
 role:{layers:[layer(['impactWood_heavy_000'],.20,.043),layer(['impactBell_heavy_003'],.30,.025,.035)],gap:.10,cap:2},
 joker:{layers:[layer(['impactSoft_medium_000'],.18,.039),layer(['chip-lay-2'],.12,.017,.04)],gap:.08,cap:3},
 boss:{layers:[layer(['impactSoft_heavy_000'],.26,.042,0,.83)],gap:.12,cap:1},
 multiply:{layers:[layer(['impactSoft_heavy_000'],.25,.056),layer(['impactBell_heavy_000'],.38,.029,.025),layer(['card-fan-1'],.18,.013,.065)],gap:.10,cap:3},
 // Inkwave679d2db audio.js726–734 thump/spray/tail structure; recorded material only.
 key:{layers:[{...layer(['impactSoft_heavy_000'],.46,.057,0,.76),attack:.002,hold:.28,filter:{type:'lowpass',frequency:620,end:180,sweep:.16,Q:.65}},{...layer(['cloth2'],.30,.025,.02,1.1),attack:.005,hold:.32,filter:{type:'bandpass',frequency:2100,end:850,sweep:.18,Q:.75}},layer(['impactWood_heavy_000'],.16,.032,.045,.9),{...layer(['impactBell_heavy_003'],.52,.027,.115,.84),attack:.006,hold:.20,filter:{type:'lowpass',frequency:2600,end:1300,sweep:.28,Q:.6}}],gap:.18,cap:4},
 award:{layers:[layer(['impactSoft_heavy_000'],.28,.049),layer(['chips-collide-1'],.23,.033,.045),layer(['impactBell_heavy_000'],.46,.033,.075)],gap:.16,cap:3},
 flight:{layers:[layer(slides,.10,.012)],gap:.04,cap:2},
 retrigger:{layers:[layer(wood,.10,.029),layer(wood,.10,.026,.075,1.08)],gap:.10,cap:2},
 chanceHit:{layers:[layer(['chip-lay-2'],.15,.026)],gap:.09,cap:2},
 chanceMiss:{layers:[layer(['card-shove-1'],.13,.018)],gap:.09,cap:1},
 glass:{layers:[layer(['impactGlass_heavy_002'],.38,.043)],gap:.12,cap:1},
 tarot:{layers:[layer(['cards-pack-open-1'],.28,.030),layer(['impactWood_light_001'],.12,.023,.075)],gap:.12,cap:2},
 planet:{layers:[layer(['impactBell_heavy_003'],.36,.031),layer(['card-fan-1'],.23,.022,.075)],gap:.12,cap:2},
 spectral:{layers:[layer(['impactSoft_heavy_000'],.28,.043,0,.8),layer(['cloth2'],.28,.024,.075)],gap:.12,cap:2},
 utility:{layers:[layer(['card-shuffle'],.34,.030),layer(['chip-lay-1'],.12,.023,.075)],gap:.12,cap:2},
 purchase:{layers:[layer(['chips-collide-1'],.22,.031),layer(['chip-lay-2'],.16,.025,.075)],gap:.10,cap:2},
 sale:{layers:[layer(['card-shove-1'],.20,.021),layer(['chips-stack-1'],.20,.026,.075)],gap:.10,cap:2},
 reroll:{layers:[layer(['card-shuffle'],.37,.028)],gap:.15,cap:1},
 reveal:{layers:[layer(['cards-pack-open-1'],.32,.026),layer(['impactBell_heavy_003'],.34,.030,.075)],gap:.16,cap:2},
 success:{layers:[layer(['impactWood_heavy_000'],.23,.044),layer(['impactBell_heavy_000'],.48,.034,.075),layer(['chips-collide-1'],.22,.026,.17)],gap:.3,cap:3},
 failure:{layers:[layer(['impactSoft_heavy_000'],.30,.040,0,.75),layer(['card-shove-1'],.28,.023,.14,.8)],gap:.3,cap:2},
 rollHeat:{layers:[layer(['card-shuffle'],.18,.020)],gap:0,cap:1},
 rollMult:{layers:[layer(['chips-stack-1'],.18,.019)],gap:0,cap:1},
 rollTotal:{layers:[layer(['chips-collide-1'],.18,.021)],gap:0,cap:1},
} satisfies Record<string,FoleyRecipe>;
export type FoleyKind=keyof typeof FOLEY;
