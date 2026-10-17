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
// Phaser emits DESTROY before clearing `active`/`scene`; mirror that order to catch recursive destruction.
function stageFixture(detail=true){
 const tweens:any[]=[];
 const object=(type='Object',text=''):any=>{const data=new Map(),events=new Map();const o:any={type,text,width:Math.max(10,text.length*20),height:24,scaleX:1,scaleY:1,alpha:1,active:true,list:[],scene:{},style:{fontSize:'44px'},visible:true,destroyCount:0};
  for(const name of ['setName','setAlpha','setX','setY','setAngle','setVisible'] as const)o[name]=(v:any)=>{o[{setName:'name',setAlpha:'alpha',setX:'x',setY:'y',setAngle:'angle',setVisible:'visible'}[name]!]=v;return o;};
  for(const name of ['setOrigin','setCrop','setStrokeStyle','setDisplaySize','fillStyle','fillPoints','clear','lineStyle','strokeCircle','lineBetween','fillEllipse'])o[name]=()=>o;
  o.lineBetween=vi.fn(()=>o);o.getBounds=()=>({x:o.x,y:o.y,width:o.width*o.scaleX,height:o.height*o.scaleY});Object.defineProperty(o,'displayHeight',{get:()=>o.height*o.scaleY});Object.defineProperty(o,'displayWidth',{get:()=>o.width*o.scaleX});o.setFontSize=()=>o;o.setWordWrapWidth=()=>o;
  o.setText=(v:string)=>{o.text=v;o.width=v.length*20;return o;};o.setData=(k:string,v:any)=>{data.set(k,v);return o;};o.getData=(k:string)=>data.get(k);o.setPosition=(x:number,y:number)=>{o.x=x;o.y=y;return o;};o.setScale=(x:number,y=x)=>{o.scaleX=x;o.scaleY=y;return o;};o.add=(v:any)=>{o.list.push(...(Array.isArray(v)?v:[v]));return o;};o.addAt=(v:any,i:number)=>{o.list.splice(i,0,v);return o;};o.once=(e:string,f:()=>void)=>{events.set(e,f);return o;};o.destroy=()=>{o.destroyCount++;const f=events.get('destroy');events.delete('destroy');f?.();o.active=false;o.scene=undefined;};return o;
 };
 const listeners=new Set();const scene:any={events:{on:(_:string,f:any)=>listeners.add(f),off:(_:string,f:any)=>listeners.delete(f)},scale:{zoom:1},textures:{exists:(key:string)=>detail||!key.startsWith('climax-source/'),get:()=>({getSourceImage:()=>({width:615,height:768})})},tweens:{add:(config:any)=>{const t={config,remove:vi.fn()};tweens.push(t);return t;}},add:{container:()=>object('Container'),graphics:()=>object('Graphics'),rectangle:()=>object('Rectangle'),tileSprite:()=>object('TileSprite'),image:()=>object('Image'),text:(_:number,__:number,s:string)=>object('Text',s)}};
 const p=play('multiply'),key=keyHighlight(p.s,p.t)!,stage=mountHeroClimax(scene,object('Container'),{x:0,y:0,width:390,height:740},key,heroClimaxValue(p.s,p.t,key)!,false)!;
 return {stage,tweens,listeners};
}
it('external Phaser destruction clears owned tweens and release wait without recursively destroying the group',async()=>{
 const {stage,tweens}=stageFixture(),done=stage.release();stage.group.destroy();await done;expect((stage.group as any).destroyCount).toBe(1);expect(tweens.every(t=>t.remove.mock.calls.length===1)).toBe(true);stage.dispose();expect((stage.group as any).destroyCount).toBe(1);
});
it('switching to reduced motion during release settles its wait and leaves disposal idempotent',async()=>{
 const {stage}=stageFixture(),done=stage.release();stage.reduce();await done;stage.dispose();stage.dispose();expect((stage.group as any).destroyCount).toBe(1);
});

it('charge and arrival own their clocks; repeated strike does not replay either one',()=>{
 const {stage,tweens}=stageFixture();stage.strike();const count=tweens.length;expect(count).toBe(2);stage.strike();expect(tweens).toHaveLength(count);stage.reduce();expect(tweens.every(t=>t.remove.mock.calls.length===1)).toBe(true);stage.dispose();
});
it('charge already contains one saved numeric readout and a full-viewport backdrop, with stable placement when reducing',()=>{
 const {stage}=stageFixture(),group=stage.group as any,board=group.list.find((o:any)=>o.name==='hero/climax-board');
 expect(group.getData('shot')).toBe('eyes');expect(group.getData('opaqueBackdrop')).toEqual({x:0,y:0,width:390,height:740});
 const readouts=board.list.find((o:any)=>o.name==='hero/climax-readouts');expect(readouts.visible).toBe(true);expect(readouts.list.filter((o:any)=>o.name==='hero/climax-value')).toHaveLength(1);
 const y=board.y;stage.strike();expect(board.y).toBe(y);stage.reduce();expect(board.y).toBe(y);stage.dispose();
});

it('missing optional detail keeps the same-source thumbnail still during the existing impact',()=>{const {stage,tweens}=stageFixture(false),board=(stage.group as any).list.find((o:any)=>o.type==='Container'),card=board.list.flatMap((o:any)=>o.list??[]).find((o:any)=>o.name==='hero/climax-source-card');expect(card.getData('detail')).toBe(false);stage.strike();expect(card.scaleX).toBe(1);expect(tweens.some(t=>t.config.targets===card)).toBe(false);stage.dispose();});

it('visible source route and before/after numeric landing follow the tween clock even at fast playback',()=>{
 let now=0;const clock=vi.spyOn(performance,'now').mockImplementation(()=>now),{stage,listeners,tweens}=stageFixture();
 const board=(stage.group as any).list.find((o:any)=>o.name==='hero/climax-board'),layers=board.list.filter((o:any)=>o.name?.startsWith('hero/shot-'));
 const caption=board.list.find((o:any)=>o.name==='hero/climax-note');
 expect(caption.text).toBeTruthy();
 const tick=()=>{for(const f of listeners) (f as ()=>void)();expect(layers.filter((o:any)=>o.visible)).toHaveLength(1);expect(caption.visible).toBe(true);expect(caption.scaleX).toBe(1);expect(layers.flatMap((o:any)=>o.list).filter((o:any)=>o.name==='hero/climax-note')).toHaveLength(0);};
 const readout=board.list.find((o:any)=>o.name==='hero/climax-readouts').list.find((o:any)=>o.name==='hero/climax-value');const before=readout.text;
 expect(stage.group.getData('shot')).toBe('eyes');const charge=tweens[0].config;charge.targets.t=80;charge.onUpdate();tick();expect(readout.text).toBe(before);expect(stage.group.getData('shot')).toBe('skill');
 charge.targets.t=160;charge.onUpdate();expect(readout.text).toBe(before);now=70;stage.strike();tick();expect(readout.text).not.toBe(before);expect(stage.group.getData('shot')).toBe('skill');
 const tween=tweens[1].config;const advance=(age:number)=>{tween.targets.t=age;tween.onUpdate();tick();};
 expect(layers.find((o:any)=>o.name==='hero/shot-skill').list.find((o:any)=>o.name==='hero/contribution-route').lineBetween.mock.calls.length).toBeGreaterThan(0);
 advance(292);expect(readout.scaleX).toBeCloseTo(1.54);advance(500);expect(stage.group.getData('shot')).toBe('landing');
 stage.reduce();tick();expect(stage.group.getData('shot')).toBe('landing');stage.dispose();expect(listeners.size).toBe(0);clock.mockRestore();
});
