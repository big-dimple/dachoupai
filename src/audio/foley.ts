import sources from '../../public/assets/audio/foley-v1/sources.json';
import gamefeel from '../../public/assets/audio/gamefeel-rfc/sources.json';
export const FOLEY_SAMPLES = [...sources.assets,...gamefeel.assets];
export type Layer = { samples: string[]; duration: number; gain: number; delay?: number; rate?: number; attack?: number; hold?: number; pulse?:boolean; filter?: {type:BiquadFilterType;frequency:number;end:number;sweep:number;Q:number} };
export type FoleyRecipe = {layers:Layer[];gap:number;cap:number;priority:number};
const layer=(samples:string[],duration:number,gain:number,delay=0,rate=1):Layer=>({samples,duration,gain,delay,rate});
const low=(item:Layer,hz=2600,end=hz):Layer=>({...item,filter:{type:'lowpass',frequency:hz,end,sweep:item.duration*.8,Q:.55}});
const air=(item:Layer):Layer=>({...item,attack:.008,hold:.24,filter:{type:'bandpass',frequency:1800,end:950,sweep:item.duration*.8,Q:.55}});
const recipe=(layers:Layer[],gap:number,cap:number,priority=1):FoleyRecipe=>({layers,gap,cap,priority});
const slides=['card-slide-1','card-slide-2','card-slide-3'],places=['card-place-1','card-place-2','card-place-3'];
const wood=['impactWood_light_000','impactWood_light_001'];
const paper=(duration:number,gain:number,delay=0)=>air(layer(slides,duration,gain,delay));
const body=(duration:number,gain:number,delay=0,rate=.82)=>low({...layer(['impactSoft_heavy_000'],duration,gain,delay,rate),attack:.003,hold:.25},720,200);
const bell=(duration:number,gain:number,delay=0,rate=1)=>low({...layer(['impactBell_heavy_003','impactBell_heavy_000'],duration,gain,delay,rate),attack:.006,hold:.22},2800,1500);
const strike=(gain:number,delay=0)=>low({...layer(wood,.16,gain,delay),attack:.0005,hold:.48},3700,2200);
const penta=['sfx-penta-1-gong','sfx-penta-2-shang','sfx-penta-3-jiao','sfx-penta-4-zhi','sfx-penta-5-yu'];
const scoreNote=(duration:number,gain:number,delay=0)=>low({...layer(penta,duration,gain,delay,.75),pulse:true,attack:.003,hold:.22},2800,1400);
const scoreWood=(duration:number,gain:number,delay=0)=>low({...layer(wood,duration,gain,delay),attack:.0015,hold:.25},2800,1500);
const crystal=(duration:number,gain:number,delay=0,rate=.94)=>low({...layer(['impactGlass_heavy_002'],duration,gain,delay,rate),attack:.002,hold:.12},4600,1900);
const drum=(duration:number,gain:number)=>low({...layer(['sfx-wardrum-mult-hit'],duration,gain),attack:.003,hold:.22},900,220);
const victoryBell=(duration:number,gain:number,delay=0,rate=.9)=>low({...layer(['sfx-temple-bell-victory'],duration,gain,delay,rate),attack:.005,hold:.18},2600,1300);
const multiplierLayers=()=>[crystal(.075,.027),drum(.14,.028),crystal(.045,.009,.035,.84)];
// One material palette. Priority: texture 0, gesture 1, source/transaction 2,
// chain accent 3, committed award/ending 4. Recorded bodies only, no oscillators.
export const FOLEY = {
 deal:recipe([paper(.14,.016)],.035,3,0),
 hover:recipe([low(layer(['chip-lay-1'],.055,.0045),2000)],.09,1,0),
 select:recipe([low({...layer(slides,.14,.030),attack:.004,hold:.36},3100),low(layer(['chip-lay-1','chip-lay-2'],.055,.007,.022),2400)],.055,4),
 cancel:recipe([paper(.13,.020),low(layer(places,.08,.006,.035,.9),1800)],.065,4),
 invalid:recipe([low(layer(['impactSoft_medium_000'],.10,.023,0,.8),1000),paper(.09,.007,.04)],.16,2),
 land:recipe([low(layer(places,.14,.026),3400),strike(.006,.025)],.055,4),
 play:recipe([air(layer(['card-fan-1'],.24,.027)),low(layer(['impactWood_heavy_000'],.18,.031,.065),2200)],.12,4,2),
 discard:recipe([air(layer(['card-shove-1'],.22,.025)),low(layer(places,.09,.010,.08,.82),1600)],.10,4),
 coin:recipe([low(layer(['chip-lay-1','chip-lay-2'],.12,.022),2900)],.07,2),
 spend:recipe([low(layer(['chips-stack-1'],.12,.024),2500)],.04,3),
 spendLast:recipe([low(layer(['chips-stack-1'],.14,.027),2100),low(layer(['impactSoft_medium_000'],.13,.017,.055),1000)],.04,4,2),
 title:recipe([bell(.36,.028)],.3,1,2),
 confirm:recipe([strike(.025),bell(.28,.019,.075)],.2,2,2),
 curtain:recipe([air(layer(['cloth2'],.32,.028)),paper(.20,.012,.075)],.3,2,2),
 add:recipe([{...layer(wood,.18,.029),attack:.0005,hold:.60}],.055,2,1),
 held:recipe([low(layer(places,.12,.018),2200)],.065,2,1),
 role:recipe([low(layer(['impactWood_heavy_000'],.20,.034),2400),bell(.30,.019,.06)],.16,2,3),
 joker:recipe([low(layer(['impactSoft_medium_000'],.14,.028),1500),low(layer(['chip-lay-2'],.10,.012,.045),2800)],.10,4,2),
 boss:recipe([body(.26,.036,0,.75),paper(.15,.014,.075)],.2,2,3),
 multiply:recipe(multiplierLayers(),.12,6,3),
 // One bounded pentatonic sample per ordinary arrival, with thin/medium/full
 // material balances. Only real multiplication adds fractured glass and drum.
 scoreAdd:recipe([scoreNote(.090,.022),scoreWood(.050,.009)],0,6,2),
 scoreKey:recipe([scoreNote(.105,.025),body(.075,.012,.018,.8),scoreWood(.055,.006,.028)],0,6,3),
 scoreBurst:recipe([scoreNote(.115,.026),body(.095,.020,.02,.8),paper(.060,.006,.035)],0,6,3),
 scoreMultiply:recipe(multiplierLayers(),0,6,3),
 // Explicit owned-source double beat: the motion emits rebound separately.
 scoreDoubleImpact:recipe([crystal(.065,.025),drum(.075,.028)],0,4,3),
 scoreRebound:recipe([low({...layer(wood,.060,.019,0,.88),attack:.0015,hold:.18},2400,1300)],0,3,2),
 // Inkwave679d2db audio.js726–734 body/air/tail structure already adapted here (MIT).
 key:recipe([body(.40,.047,0,.76),air(layer(['cloth2'],.26,.021,.02,1.1)),low(layer(['impactWood_heavy_000'],.14,.025,.05,.9),2100),bell(.43,.022,.12,.84)],.20,4,3),
 award:recipe([body(.26,.039),low(layer(['chips-collide-1'],.18,.025,.045),3000),victoryBell(.35,.018,.09)],.25,3,4),
 // Absolute saved single-hand score, not the target-relative overkill tier.
 awardMillion:recipe([body(.32,.043),strike(.023,.045),low(layer(['chips-collide-1'],.19,.023,.12),2900),victoryBell(.43,.020,.20)],.38,4,4),
 awardHundredMillion:recipe([body(.37,.044,0,.75),strike(.026,.055),strike(.019,.15),air(layer(['card-fan-1'],.23,.017,.21)),victoryBell(.47,.021,.30,.85)],.5,5,4),
 awardTrillion:recipe([body(.42,.044,0,.70),strike(.025,.07),strike(.021,.17),strike(.018,.29),air(layer(['card-fan-1'],.27,.018,.36)),victoryBell(.52,.022,.45,.82)],.65,6,4),
 flight:recipe([paper(.10,.009)],.065,2,0),
 retrigger:recipe([strike(.027),{...strike(.022,.085),rate:1.08}],.13,4,2),
 chanceHit:recipe([low(layer(['chip-lay-2'],.13,.023),2800),paper(.10,.007,.035)],.12,2,2),
 chanceMiss:recipe([paper(.12,.015)],.12,1,1),
 glass:recipe([low({...layer(['impactGlass_heavy_002'],.26,.032),attack:.002,hold:.22},3200,1800),body(.16,.015,.04)],.2,2,2),
 tarot:recipe([air(layer(['cards-pack-open-1'],.26,.028)),strike(.019,.08),paper(.16,.012,.14)],.22,3,2),
 planet:recipe([paper(.17,.020),bell(.37,.026,.085),strike(.012,.17)],.22,3,2),
 spectral:recipe([body(.32,.033,0,.76),air(layer(['cloth2'],.27,.022,.07)),bell(.28,.012,.16,.8)],.25,3,2),
 utility:recipe([air(layer(['card-shuffle'],.29,.026)),low(layer(places,.12,.021,.12),2600),low(layer(['chip-lay-1'],.10,.014,.18),2800)],.22,3,2),
 purchase:recipe([low(layer(['chips-collide-1'],.18,.030),4200),low(layer(['chip-lay-2'],.13,.024,.075),3600),paper(.12,.009,.11)],.16,3,2),
 sale:recipe([paper(.18,.019),low(layer(['chips-stack-1'],.18,.024,.075),2600)],.16,2,2),
 reroll:recipe([air(layer(['card-shuffle'],.31,.023)),low(layer(places,.12,.015,.18),2500)],.25,2,2),
 reveal:recipe([air(layer(['cards-pack-open-1'],.28,.025)),bell(.36,.024,.095),paper(.16,.011,.17)],.25,3,3),
 success:recipe([low({...layer(['impactWood_heavy_000'],.26,.034),attack:.003,hold:.3},1400,700),low(layer(['chips-collide-1'],.19,.022,.08),3000),bell(.44,.025,.18),bell(.29,.013,.31,1.15)],.6,4,4),
 failure:recipe([body(.40,.035,0,.70),air(layer(['card-shove-1'],.27,.022,.14,.8)),low(layer(places,.13,.012,.30,.72),1200)],.6,3,4),
 rollHeat:recipe([paper(.13,.015)],0,1,0),
 rollMult:recipe([low(layer(['chips-stack-1'],.13,.014),2200)],0,1,0),
 rollTotal:recipe([low(layer(['chips-collide-1'],.14,.015),2400)],0,1,0),
} satisfies Record<string,FoleyRecipe>;
export type FoleyKind=keyof typeof FOLEY;
