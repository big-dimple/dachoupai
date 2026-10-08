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

import {mountHeroClimax} from '../src/game/HeroClimax';
// Phaser emits DESTROY before clearing `active`/`scene`; mirror that order to catch recursive destruction.
function stageFixture(){
 const tweens:any[]=[];
 const object=(type='Object',text=''):any=>{const data=new Map(),events=new Map();const o:any={type,text,width:Math.max(10,text.length*20),height:24,scaleX:1,scaleY:1,alpha:1,active:true,list:[],scene:{},destroyCount:0};
  for(const name of ['setName','setAlpha','setX','setAngle'] as const)o[name]=(v:any)=>{o[{setName:'name',setAlpha:'alpha',setX:'x',setAngle:'angle'}[name]!]=v;return o;};
  for(const name of ['setOrigin','setStrokeStyle','setDisplaySize','fillStyle','fillPoints'])o[name]=()=>o;
  o.setText=(v:string)=>{o.text=v;o.width=v.length*20;return o;};o.setData=(k:string,v:any)=>{data.set(k,v);return o;};o.getData=(k:string)=>data.get(k);o.setPosition=(x:number,y:number)=>{o.x=x;o.y=y;return o;};o.setScale=(x:number,y=x)=>{o.scaleX=x;o.scaleY=y;return o;};o.add=(v:any)=>{o.list.push(v);return o;};o.addAt=(v:any,i:number)=>{o.list.splice(i,0,v);return o;};o.once=(e:string,f:()=>void)=>{events.set(e,f);return o;};o.destroy=()=>{o.destroyCount++;const f=events.get('destroy');events.delete('destroy');f?.();o.active=false;o.scene=undefined;};return o;
 };
 const scene:any={scale:{zoom:1},textures:{exists:()=>true,get:()=>({getSourceImage:()=>({width:160,height:200})})},tweens:{add:(config:any)=>{const t={config,remove:vi.fn()};tweens.push(t);return t;}},add:{container:()=>object('Container'),graphics:()=>object('Graphics'),rectangle:()=>object('Rectangle'),image:()=>object('Image'),text:(_:number,__:number,s:string)=>object('Text',s)}};
 const p=play('multiply'),key=keyHighlight(p.s,p.t)!,stage=mountHeroClimax(scene,object('Container'),{x:0,y:0,width:390,height:740},key,heroClimaxValue(p.s,p.t,key)!,false)!;
 return {stage,tweens};
}
it('external Phaser destruction clears owned tweens and release wait without recursively destroying the group',async()=>{
 const {stage,tweens}=stageFixture(),done=stage.release();stage.group.destroy();await done;expect((stage.group as any).destroyCount).toBe(1);expect(tweens.every(t=>t.remove.mock.calls.length===1)).toBe(true);stage.dispose();expect((stage.group as any).destroyCount).toBe(1);
});
it('switching to reduced motion during release settles its wait and leaves disposal idempotent',async()=>{
 const {stage}=stageFixture(),done=stage.release();stage.reduce();await done;stage.dispose();stage.dispose();expect((stage.group as any).destroyCount).toBe(1);
});
