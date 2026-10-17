import {afterEach,expect,it,vi} from 'vitest';
import {AudioEngine} from '../src/audio/AudioEngine';
import {FOLEY_SAMPLES} from '../src/audio/foley';
import {scoreSourceProcessFixture} from '../harness/fixtures/score-source-process';
import {energySend} from '../harness/fixtures/score-energy';
import {scorePhrase} from '../src/game/ScorePhrase';
import {exactFractionText,readableFractionText,accumulatorRollValue} from '../src/game/scoreText';
import {OwnedCardTilt,ownedTiltLayer} from '../src/game/OwnedCardTilt';
import {ownedJokerScoreLayer,cancelOwnedJokerScoreMotion} from '../src/game/OwnedJokerScoreMotion';
import {jokerStrikeBeat} from '../src/game/JokerScoreStrike';
import {scoreBeat} from '../src/game/scorePresentation';

afterEach(()=>vi.unstubAllGlobals());
const param=()=>{const p={value:1,setValueAtTime:vi.fn(),linearRampToValueAtTime:vi.fn(),exponentialRampToValueAtTime:vi.fn(),setTargetAtTime:vi.fn(),cancelScheduledValues:vi.fn()};return p;};
it('keeps one voice owner for missing-sample synthesis on natural end/abort and never doubles an available recording',()=>{
 vi.stubGlobal('document',{hidden:false});const sources:any[]=[],gain=()=>({gain:param(),connect:vi.fn(),disconnect:vi.fn()});
 const source=(kind:string)=>{const s={kind,frequency:param(),playbackRate:param(),buffer:null,onended:null as null|(()=>void),start:vi.fn(),stop:vi.fn(),connect:vi.fn(),disconnect:vi.fn()};sources.push(s);return s;};
 const engine=new AudioEngine(),inside=engine as any;
 inside.context={state:'running',currentTime:1,createGain:gain,createOscillator:()=>source('oscillator'),createBufferSource:()=>source('recording'),createBiquadFilter:()=>({frequency:param(),Q:param(),connect:vi.fn(),disconnect:vi.fn()})};inside.gains={master:gain(),music:gain(),sfx:gain(),ui:gain()};inside.unlocked=true;
 for(const kind of ['add','multiply','award'] as const){const from=sources.length,signal=new AbortController(),remove=vi.spyOn(signal.signal,'removeEventListener');engine.scoreImpact({},kind,kind,1,0,{signal:signal.signal});expect(inside.voices.size).toBe(1);const voices=sources.slice(from);expect(voices.length).toBe(kind==='add'?2:1);const callback=voices[0].onended;expect(callback).toBeTypeOf('function');callback!();expect(inside.voices.size).toBe(0);for(const node of voices){expect(node.disconnect).toHaveBeenCalledOnce();expect(node.onended).toBeNull();}expect(remove).toHaveBeenCalledOnce();}
 const presentation={},abort=new AbortController(),from=sources.length;engine.scoreImpact(presentation,'cancel','add',1,0,{signal:abort.signal});abort.abort();expect(inside.voices.size).toBe(0);for(const node of sources.slice(from))expect(node.disconnect).toHaveBeenCalledOnce();const count=sources.length;engine.scoreImpact(presentation,'cancel','add');expect(sources).toHaveLength(count);
 inside.masterMuted=true;engine.scoreImpact({},'muted','award');expect(sources).toHaveLength(count);inside.masterMuted=false;
 for(const sample of FOLEY_SAMPLES)inside.scoreSamples.set(sample.name,{name:sample.name,duration:.3});engine.scoreImpact({},'recorded','multiply');expect(sources.slice(count).length).toBeGreaterThan(0);expect(sources.slice(count).every(s=>s.kind==='recording')).toBe(true);engine.cancelPresentation();expect(inside.voices.size).toBe(0);
});

it('consumes saved event order with exact 1.5 and large rationals while hit holds remain on the existing phrase clock',()=>{
 const f=scoreSourceProcessFixture('chain'),trace=energySend(f.state,{type:'PlayAssistedHand',selectedIds:f.selectedIds,assistIds:f.assistIds}).lastTrace!,before=JSON.stringify(trace),beats=scorePhrase(trace.events,f.state.stage!.targetHeat);
 expect([...beats.keys()]).toEqual(trace.events.map(e=>e.eventId));expect(JSON.stringify(trace)).toBe(before);
 expect(readableFractionText({n:'3',d:'2'})).toBe('1.5');const large={n:'18014398509481987',d:'2'};expect(exactFractionText(large)).toBe('9,007,199,254,740,993.5');expect(accumulatorRollValue(large)).toBeUndefined();expect(readableFractionText(large)).toBe('≈9.01e15');
 for(const speed of [1,2,4]){const event=trace.events.find(e=>e.sourceType==='joker')!,beat=jokerStrikeBeat(scoreBeat(event),true,speed);expect(beat.strike!.hold/speed).toBeGreaterThanOrEqual(40);expect(beat.strike!.hold/speed).toBeLessThanOrEqual(60);}
});

class Pose {
 active=true;type='Container';x=0;y=0;rotation=0;scaleX=1;scaleY=1;name='';width=80;height=112;list:Pose[]=[];parentContainer?:Pose;data=new Map<string,any>();
 setName(v:string){this.name=v;return this;}setData(k:string,v:any){this.data.set(k,v);return this;}getData(k:string){return this.data.get(k);}add(nodes:Pose|Pose[]){for(const node of Array.isArray(nodes)?nodes:[nodes]){node.parentContainer?.remove(node);this.list.push(node);node.parentContainer=this;}return this;}remove(nodes:Pose|Pose[]){for(const n of Array.isArray(nodes)?nodes:[nodes]){this.list=this.list.filter(o=>o!==n);n.parentContainer=undefined;}return this;}
 setPosition(x:number,y:number){this.x=x;this.y=y;return this;}setRotation(v:number){this.rotation=v;return this;}setScale(x:number,y=x){this.scaleX=x;this.scaleY=y;return this;}getLocalPoint(x:number,y:number){return {x:x-this.x,y:y-this.y};}
}
it('freezes several layered poses at zero effective delta and cancels/replays without touching layout, hitbox or base art',()=>{
 const marker=new Pose().setPosition(300,160),frame=new Pose(),art=new Pose().setPosition(4,-13).setData('f09-active',true);marker.add([frame,art]).setData('frame',frame);
 const canvas={getBoundingClientRect:()=>({width:1366,height:768})},scene={add:{container:()=>new Pose()},game:{canvas}} as any;
 const spring=ownedJokerScoreLayer(scene,marker as any),tilt=ownedTiltLayer(scene,spring),controller=new OwnedCardTilt(scene,marker as any,tilt,()=>true);marker.setData('ownedTilt',controller);
 spring.setPosition(7,-4).setRotation(.05).setScale(.97);const outer=JSON.stringify([marker.x,marker.y,marker.rotation,marker.scaleX,marker.scaleY,frame.width,frame.height]),springPose=JSON.stringify([spring.x,spring.y,spring.rotation,spring.scaleX,spring.scaleY]);
 controller.point(330,180);for(let i=0;i<10;i++)controller.update(1/60,false);expect(tilt.rotation).toBeGreaterThan(0);expect(art.y).toBeGreaterThan(-13);expect(art.y).toBeLessThan(-11);
 const snapshot=()=>JSON.stringify([tilt.rotation,tilt.scaleX,tilt.scaleY,art.x,art.y,controller.motion.rotation.velocity]);const held=snapshot();for(let i=0;i<6;i++)controller.update(0,false);expect(snapshot()).toBe(held);
 expect(art.parentContainer).toBe(tilt);expect(tilt.parentContainer).toBe(spring);expect(spring.parentContainer).toBe(marker);
 cancelOwnedJokerScoreMotion(marker as any);expect([tilt.rotation,tilt.scaleX,tilt.scaleY,art.x,art.y]).toEqual([0,1,1,4,-13]);controller.point(270,140);controller.update(.1,false);expect(tilt.rotation).toBeLessThan(0);controller.update(1/60,true);expect([tilt.rotation,art.x,art.y]).toEqual([0,4,-13]);controller.destroy();controller.update(1,false);
 expect(JSON.stringify([marker.x,marker.y,marker.rotation,marker.scaleX,marker.scaleY,frame.width,frame.height])).toBe(outer);expect(JSON.stringify([spring.x,spring.y,spring.rotation,spring.scaleX,spring.scaleY])).toBe(springPose);
});
