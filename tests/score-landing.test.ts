import {expect,it} from 'vitest';
import {layout,intersects} from '../src/game/layout';
import {scoreLandingBox} from '../src/game/ScoreLanding';
import {gameToolInventoryBox} from '../src/game/ToolInventoryEntry';
it.each([[1366,768],[1920,1080],[390,740],[320,740],[740,390],[768,1024]])('%s×%s final landing stays in the played workplane, away from readable HUD and live actions',(width,height)=>{
 for(const count of [8,9,14]){
  const l=layout({width,height},{top:0,right:0,bottom:0,left:0},undefined,{count}),b=scoreLandingBox(l);
  expect(b.width).toBeGreaterThan(0);expect(b.height).toBeGreaterThan(0);
  expect(b.x).toBeGreaterThanOrEqual(0);expect(b.y).toBeGreaterThanOrEqual(0);expect(b.x+b.width).toBeLessThanOrEqual(width);expect(b.y+b.height).toBeLessThanOrEqual(height);
  for(const protectedBox of [l.hud,l.scoreBoard,l.hand,l.actions,gameToolInventoryBox(l),...l.slots])expect(intersects(b,protectedBox)).toBe(false);
 }
});

it('abort removes the owned landing once; later manual cleanup and pre-aborted mounting cannot publish stale UI',async()=>{
 const {mountScoreLanding}=await import('../src/game/ScoreLanding');
 const nodes:any[]=[];
 const object=(text='')=>{const data=new Map(),o:any={text,width:text.length*8,height:18,active:true,destroyCount:0,list:[]};
 for(const method of ['setName','fillStyle','fillRoundedRect','lineStyle','strokeRoundedRect','setWordWrapWidth','setScale','setPosition','setOrigin'])o[method]=()=>o;
 o.setData=(k:string,v:any)=>{data.set(k,v);return o;};o.getData=(k:string)=>data.get(k);o.setText=(v:string)=>{o.text=v;o.width=v.length*8;return o;};o.setFontSize=()=>o;o.add=(v:any)=>{o.list.push(...(Array.isArray(v)?v:[v]));return o;};o.destroy=()=>{o.active=false;o.destroyCount++;};nodes.push(o);return o;};
 const scene:any={textures:{exists:()=>false},add:{container:()=>object(),graphics:()=>object(),text:(_:number,__:number,text:string,style:any)=>Object.assign(object(text),{style})}},parent=object(),l=layout({width:390,height:740},{top:0,right:0,bottom:0,left:0});
 const trace:any={rootId:'saved/root',handType:'pair',finalScore:'123',accumulator:{H:{n:'41',d:'1'},M:{n:'3',d:'1'}}},abort=new AbortController();
 const landing=mountScoreLanding(scene,parent,l,trace,false,abort.signal,'#80551f')!;expect(landing.total.style.color).toBe('#80551f');expect(landing.total.getData('exactScore')).toBe('123');const group=parent.list[0];abort.abort();expect(group.active).toBe(false);landing.dispose();expect(group.destroyCount).toBe(1);
 const before=nodes.length;expect(mountScoreLanding(scene,parent,l,trace,false,abort.signal)).toBeUndefined();expect(nodes).toHaveLength(before);
});
