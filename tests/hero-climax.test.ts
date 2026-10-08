import {it,expect,vi,afterEach} from 'vitest';
import {heroClimaxFixture,energySend} from '../harness/fixtures/hero-climax';
import {keyHighlight,type JokerKeyHighlight} from '../src/game/JokerKeyHighlight';
import {heroClimaxValue} from '../src/game/HeroClimax';
import {AudioEngine} from '../src/audio/AudioEngine';
const play=(kind:Parameters<typeof heroClimaxFixture>[0])=>{const f=heroClimaxFixture(kind),s=energySend(f.state,f.assistIds.length?{type:'PlayAssistedHand',selectedIds:f.selectedIds,assistIds:f.assistIds}:{type:'PlayHand',selectedIds:f.selectedIds});return {f,s,t:s.lastTrace!};};
const finalKey=({s,t}:ReturnType<typeof play>):JokerKeyHighlight=>({kind:'opening',eventId:t.events.find(e=>e.phase==='finalScore')!.eventId,heroId:s.characterId,cause:'真实得分',landing:t.finalScore,fact:{eventId:'',sourceInstanceId:'',definitionId:'',title:'开场得分',effect:t.finalScore,condition:'已保存',destination:'本手',next:'继续'}});
it('one saved opening reads actual multiplier, rejects generic/replay/wrong root and leaves state untouched',()=>{
 const p=play('multiply'),k=keyHighlight(p.s,p.t)!,before=JSON.stringify(p);expect(k.kind).toBe('opening');expect(heroClimaxValue(p.s,p.t,k)).toMatchObject({label:'实际倍率',before:'×2',after:'×3'});
 expect(heroClimaxValue(p.s,p.t,k,true)).toBeUndefined();expect(heroClimaxValue(p.s,p.t,{...k,kind:'multiply'})).toBeUndefined();expect(heroClimaxValue(p.s,{...p.t,rootId:'another-hand'},k)).toBeUndefined();expect(heroClimaxValue({...p.s,openingShow:{...p.s.openingShow!,handsScored:6}},p.t,k)).toBeUndefined();expect(JSON.stringify(p)).toBe(before);
});
it('real saved growth reads both snapshots without counting it as current score',()=>{
 const p=play('growth'),k=keyHighlight(p.s,p.t)!;expect(k.kind).toBe('starter');expect(heroClimaxValue(p.s,p.t,k)).toEqual({label:'成长已保存',before:'0',after:'0.25',note:'下手生效 · 不加本手分'});const event=p.t.events.find(e=>e.eventId===k.eventId)!;expect(event.before).toEqual(event.after);
});
it('fifth fallback displays actual final score; a lost run cannot enter the heroic foreground',()=>{
 const p=play('fifth');expect(p.s.openingShow?.handsScored).toBe(5);expect(heroClimaxValue(p.s,p.t,finalKey(p))).toMatchObject({label:'实际得分',after:p.t.finalScore});const lost=play('failure');expect(lost.s.phase).toBe('run-lost');expect(heroClimaxValue(lost.s,lost.t,finalKey(lost))).toBeUndefined();
});
afterEach(()=>vi.unstubAllGlobals());
it('withdrawn BGM never creates or requests a media element while recorded effects remain available',()=>{
 const Audio=vi.fn(),engine=new AudioEngine();vi.stubGlobal('Audio',Audio);expect(engine.musicAvailable).toBe(false);(engine as any).startMusic();expect(Audio).not.toHaveBeenCalled();expect((engine as any).scoreSamples).toBeInstanceOf(Map);
});
