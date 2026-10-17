import {it,expect,vi,afterEach} from 'vitest';
import {heroClimaxFixture,energySend} from '../harness/fixtures/hero-climax';
import {keyHighlight,type JokerKeyHighlight} from '../src/game/JokerKeyHighlight';
import {heroClimaxValue} from '../src/game/HeroClimax';
import {AudioEngine} from '../src/audio/AudioEngine';
const play=(kind:Parameters<typeof heroClimaxFixture>[0])=>{const f=heroClimaxFixture(kind),s=energySend(f.state,f.assistIds.length?{type:'PlayAssistedHand',selectedIds:f.selectedIds,assistIds:f.assistIds}:{type:'PlayHand',selectedIds:f.selectedIds});return {f,s,t:s.lastTrace!};};
const finalKey=({s,t}:ReturnType<typeof play>):JokerKeyHighlight=>({kind:'opening',eventId:t.events.find(e=>e.phase==='finalScore')!.eventId,heroId:s.characterId,cause:'真实得分',landing:t.finalScore,fact:{eventId:'',sourceInstanceId:'',definitionId:'',title:'开场得分',effect:t.finalScore,condition:'已保存',destination:'本手',next:'继续'}});
it('one saved opening reads actual multiplier, rejects generic/replay/wrong root and leaves state untouched',()=>{
 const p=play('multiply'),k=keyHighlight(p.s,p.t)!,before=JSON.stringify(p);expect(k.kind).toBe('opening');expect(heroClimaxValue(p.s,p.t,k)).toMatchObject({label:'本次倍率',before:'×1.5',after:'×1.5',accumulated:'累计倍率 2→3'});
 expect(heroClimaxValue(p.s,p.t,k,true)).toBeUndefined();expect(heroClimaxValue(p.s,p.t,{...k,kind:'multiply'})).toBeUndefined();expect(heroClimaxValue(p.s,{...p.t,rootId:'another-hand'},k)).toBeUndefined();expect(heroClimaxValue({...p.s,openingShow:{...p.s.openingShow!,handsScored:6}},p.t,k)).toBeUndefined();expect(JSON.stringify(p)).toBe(before);
});
it('real saved growth reads both snapshots without counting it as current score',()=>{
 const p=play('growth'),k=keyHighlight(p.s,p.t)!;expect(k.kind).toBe('starter');expect(heroClimaxValue(p.s,p.t,k)).toEqual({label:'成长已保存',before:'0',after:'0.5',note:'下手生效 · 不加本手分'});const event=p.t.events.find(e=>e.eventId===k.eventId)!;expect(event.before).toEqual(event.after);
});
it('fifth fallback displays actual final score; a lost run cannot enter the heroic foreground',()=>{
 const p=play('fifth');expect(p.s.openingShow?.handsScored).toBe(5);expect(heroClimaxValue(p.s,p.t,finalKey(p))).toMatchObject({label:'实际得分',after:p.t.finalScore});const lost=play('failure');expect(lost.s.phase).toBe('run-lost');expect(heroClimaxValue(lost.s,lost.t,finalKey(lost))).toBeUndefined();
});
afterEach(()=>vi.unstubAllGlobals());
it('licensed transition BGM is named and remains gesture-gated before any media request',()=>{
 const Audio=vi.fn(),engine=new AudioEngine();vi.stubGlobal('Audio',Audio);expect(engine.musicAvailable).toBe(true);expect(engine.musicTitle).toContain('Serenade - Schubert');(engine as any).startMusic();expect(Audio).not.toHaveBeenCalled();expect((engine as any).scoreSamples).toBeInstanceOf(Map);
});

import {mountHeroClimax} from '../src/game/HeroClimax';
// Phaser emits DESTROY before clearing active; callbacks must remain idempotent.
function stageFixture(reduced=false,eyes=true){
 const tweens:any[]=[],objects:any[]=[];
 const object=(type='Container'):any=>{const data=new Map(),events=new Map(),o:any={type,active:true,scaleX:1,scaleY:1,x:0,y:0,alpha:1,list:[],destroyCount:0};
  for(const [method,key] of [['setName','name'],['setAlpha','alpha']])o[method]=(v:any)=>{o[key]=v;return o;};
  o.setOrigin=()=>o;o.setCrop=(...v:any[])=>{o.crop=v;return o;};o.setScale=(v:number)=>{o.scaleX=o.scaleY=v;return o;};o.setData=(k:string,v:any)=>{data.set(k,v);return o;};o.getData=(k:string)=>data.get(k);o.add=(v:any)=>{o.list.push(v);return o;};o.once=(e:string,f:any)=>{events.set(e,f);return o;};o.destroy=()=>{o.destroyCount++;const f=events.get('destroy');events.delete('destroy');f?.();o.active=false;};objects.push(o);return o;};
 const scene:any={scale:{zoom:1},textures:{exists:(key:string)=>eyes||!key.startsWith('hero-eyes-'),get:(key:string)=>({getSourceImage:()=>key.startsWith('hero-eyes-')?{width:768,height:288}:{width:600,height:600}})},tweens:{add:(config:any)=>{const t={config,remove:vi.fn()};tweens.push(t);return t;}},add:{container:()=>object(),image:(x:number,y:number)=>Object.assign(object('Image'),{x,y})}};
 const p=play('multiply'),key=keyHighlight(p.s,p.t)!,root=object(),stage=mountHeroClimax(scene,root,{x:0,y:0,width:1366,height:768},key,heroClimaxValue(p.s,p.t,key)!,reduced,{eyes:{x:12,y:180,width:208,height:78}})!;
 return {stage,tweens,objects,scene,key,value:heroClimaxValue(p.s,p.t,key)!};
}
it('the key view contains only the full eye strip; score and table context remain outside its ownership',()=>{
 const {stage,objects}=stageFixture(),group=stage.group as any,eye=group.list[0];expect(stage.inline).toBe(true);expect(objects.filter(o=>o.type==='Image')).toHaveLength(1);expect(group.list).toHaveLength(1);expect(group.getData('opaqueBackdrop')).toBeUndefined();expect(eye.getData('sampledCrop')).toEqual({x:0,y:0,width:768,height:288});expect(eye.getData('camera')).toBe('dedicated-eye-strip');expect(eye.scaleX).toBe(eye.scaleY);expect(group.getData('bounds')).toEqual({x:12,y:180,width:208,height:78});stage.dispose();
});
it('strike changes only local opacity and never moves or stretches the eye texture',()=>{
 const {stage,tweens}=stageFixture(),eye=(stage.group as any).list[0],pose=[eye.x,eye.y,eye.scaleX,eye.scaleY];stage.strike();stage.strike();expect(tweens).toHaveLength(1);expect(tweens[0].remove).toHaveBeenCalledOnce();expect([eye.x,eye.y,eye.scaleX,eye.scaleY]).toEqual(pose);stage.reduce();expect([eye.x,eye.y,eye.scaleX,eye.scaleY]).toEqual(pose);stage.dispose();
});
it('external destruction cancels its opacity tween and resolves an outstanding release exactly once',async()=>{
 const {stage,tweens}=stageFixture(),done=stage.release();stage.group.destroy();await done;expect((stage.group as any).destroyCount).toBe(1);expect(tweens.every(t=>t.remove.mock.calls.length===1)).toBe(true);stage.dispose();expect((stage.group as any).destroyCount).toBe(1);
});
it('reduced motion is a static local eye view and can settle a release already in progress',async()=>{
 const initial=stageFixture(true);expect(initial.tweens).toHaveLength(0);initial.stage.strike();await initial.stage.release();expect(initial.tweens).toHaveLength(0);initial.stage.dispose();
 const {stage}=stageFixture(),done=stage.release();stage.reduce();await done;expect(stage.group.getData('phase')).toBe('still');stage.dispose();
});
it('an unavailable eye slot or texture cannot publish a fallback full-screen panel',()=>{
 const {scene,key,value,stage}=stageFixture();stage.dispose();const root:any={add:vi.fn()};expect(mountHeroClimax(scene,root,{x:0,y:0,width:390,height:740},key,value,false,{})).toBeUndefined();scene.textures.exists=()=>false;expect(mountHeroClimax(scene,root,{x:0,y:0,width:390,height:740},key,value,false,{eyes:{x:0,y:0,width:160,height:60}})).toBeUndefined();expect(root.add).not.toHaveBeenCalled();
});
