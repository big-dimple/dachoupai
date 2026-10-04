import {describe,it,expect,vi} from 'vitest';
import type Phaser from 'phaser';
import {layout,intersects,type Box} from '../src/game/layout';
vi.mock('phaser',()=>({default:{Scenes:{Events:{UPDATE:'update',SHUTDOWN:'shutdown',DESTROY:'destroy'}}}}));
import {ScoreFlame,scoreFlameFrameBands,orderScoreBrushLayers} from '../src/game/ScoreFlame';

function fixture(box={x:12,y:174,width:366,height:132},frame={x:4,y:4,width:382,height:732}){
  const callbacks=new Map<string,{fn:Function;context:unknown}[]>();
  let time=0;
  const events={on(type:string,fn:Function,context:unknown){callbacks.set(type,[...(callbacks.get(type)??[]),{fn,context}]);},
    once(type:string,fn:Function,context:unknown){this.on(type,fn,context);},
    off(type:string,fn:Function){callbacks.set(type,(callbacks.get(type)??[]).filter(e=>e.fn!==fn));},
    emit(type:string,delta=0){time+=delta;for(const e of [...(callbacks.get(type)??[])])e.fn.call(e.context,time,delta);}};
  const objects:any[]=[],mask={destroy:vi.fn()};
  const object=()=>{
    const data=new Map<string,unknown>(),o:any={name:'',visible:true,active:true,commands:[],destroyed:0};objects.push(o);
    for(const method of ['lineStyle','beginPath','moveTo','lineTo','strokePath','fillStyle','fillRect'])o[method]=(...args:unknown[])=>{o.commands.push([method,...args]);return o;};
    o.clear=()=>{o.commands=[];return o;};o.setName=(v:string)=>{o.name=v;return o;};o.setVisible=(v:boolean)=>{o.visible=v;return o;};o.setData=(k:string,v:unknown)=>{data.set(k,v);return o;};o.getData=(k:string)=>data.get(k);
    o.createGeometryMask=()=>mask;o.setMask=(v:unknown)=>{o.mask=v;return o;};o.destroy=()=>{o.active=false;o.destroyed++;};return o;
  };
  const scene={events,add:{graphics:object},textures:{createCanvas:vi.fn()},sys:{game:{loop:{now:0}}}};
  const flame=new ScoreFlame(scene as unknown as Phaser.Scene,{add(){},list:[]} as unknown as Phaser.GameObjects.Container,box,frame);
  return{flame,objects,events,callbacks,mask,scene,state:()=>flame.graphic.getData('strokeState') as any,updates:()=>callbacks.get('update')?.length??0};
}

describe('bounded cinnabar score strokes',()=>{
  it('owns exactly three Graphics and one shared CSS mask, without texture allocation or input',()=>{
    const f=fixture();expect(f.objects).toHaveLength(3);expect(f.scene.textures.createCanvas).not.toHaveBeenCalled();
    expect(f.objects.filter(o=>o.name!=='score/fire-safe-area').every(o=>o.mask===f.mask&&!o.input)).toBe(true);
    expect(f.updates()).toBe(0);f.flame.destroy();expect(f.mask.destroy).toHaveBeenCalledOnce();
  });
  it('gives a positive below-target hit two visible strokes through gather / unfold / fade',()=>{
    const f=fixture();f.flame.impact('actual-1');expect(f.state()).toMatchObject({level:0,localPhase:'gather',localAlpha:.9});
    expect(f.flame.graphic.visible).toBe(true);expect(f.objects.find(o=>o.name==='score/fire').commands.filter((c:any)=>c[0]==='strokePath')).toHaveLength(2);
    f.events.emit('update',70);expect(f.state().localPhase).toBe('unfold');f.events.emit('update',110);expect(f.state().localPhase).toBe('fade');
    f.events.emit('update',140);expect(f.state().localPhase).toBe('idle');expect(f.flame.graphic.visible).toBe(false);expect(f.updates()).toBe(0);f.flame.destroy();
  });
  it('keeps each local hit a readable corner on both score-board sides, including short landscape',()=>{
    for(const [width,height] of [[390,740],[844,300]]){
      const l=layout({width,height},{top:12,right:0,bottom:34,left:0}),f=fixture(l.scoreBoard,{x:4,y:4,width:width-8,height:height-8});
      f.flame.impact('below-target');f.events.emit('update',110);
      const paths=f.flame.graphic.getData('localStrokes') as {x:number;y:number}[][];
      expect(paths).toHaveLength(2);expect(f.state().localLineWidth).toBeGreaterThanOrEqual(4);
      for(const path of paths){expect(Math.max(...path.map(p=>p.y))-Math.min(...path.map(p=>p.y))).toBeGreaterThan(12);expect(Math.max(...path.map(p=>p.x))-Math.min(...path.map(p=>p.x))).toBeGreaterThan(8);}
      expect(paths[0][0].x-l.scoreBoard.x).toBeLessThan(6);expect(l.scoreBoard.x+l.scoreBoard.width-paths[1][0].x).toBeLessThan(6);f.flame.destroy();
    }
  });
  it.each([[1,180,3.5],[2,240,4.5],[3,280,5.5]] as const)('writes tier %i once with its width and wall-clock peak',(tier,peak,width)=>{
    const f=fixture();f.flame.set(tier);expect(f.state()).toMatchObject({framePhase:'write',frameAge:0,lineWidth:width});
    f.events.emit('update',peak);expect(f.state()).toMatchObject({framePhase:'fade',frameProgress:1});
    f.events.emit('update',900-peak);expect(f.state()).toMatchObject({framePhase:'static',frameAge:900});expect(f.updates()).toBe(0);
    const commands=f.objects.find(o=>o.name==='score/fire-frame').commands;expect(commands.filter((c:any)=>c[0]==='strokePath')).toHaveLength(tier===3?9:8);
    f.flame.set(tier);expect(f.state().frameAge).toBe(900);f.flame.destroy();
  });
  it('immediately retreats on downgrade, and a re-entered tier stays static',()=>{
    const f=fixture();f.flame.set(3);f.events.emit('update',40);f.flame.set(1);
    expect(f.state()).toMatchObject({level:1,frameAge:900,framePhase:'static'});expect(f.updates()).toBe(0);
    f.flame.set(3);expect(f.state()).toMatchObject({level:3,frameAge:900,framePhase:'static'});
    f.flame.set(0);expect(f.objects.find(o=>o.name==='score/fire-frame').visible).toBe(false);f.flame.destroy();
  });
  it('consumes crossed tiers so 0 → 3 → 1 → 2 never rewrites a lower frame',()=>{
    const f=fixture();f.flame.set(3);expect(f.state().entered).toEqual([1,2,3]);f.events.emit('update',40);
    for(const tier of [1,2,3] as const){f.flame.set(tier);expect(f.state()).toMatchObject({frameAge:900,framePhase:'static'});expect(f.updates()).toBe(0);}f.flame.destroy();
  });
  it('orders a nonempty paper/ink/foreground stack independently of a previously lifted caption',()=>{
    const nodes=['background','avatar','card/one','button/art','action/play','score/board-paper','score/board-border','score/total-pedestal','score/fire-frame','score/fire','score/total','score/source'].map(name=>({name,active:true}));
    const root={list:[...nodes],moveBelow(object:typeof nodes[number],anchor:typeof nodes[number]){this.list.splice(this.list.indexOf(object),1);this.list.splice(this.list.indexOf(anchor),0,object);},bringToTop(object:typeof nodes[number]){this.list.splice(this.list.indexOf(object),1);this.list.push(object);}};
    const byName=(name:string)=>nodes.find(n=>n.name===name)!,index=(name:string)=>root.list.indexOf(byName(name));
    const foreground=['avatar','card/one','button/art','action/play'].map(byName),texts=['score/total','score/source'].map(byName);
    for(let repetition=0;repetition<2;repetition++){
      root.bringToTop(byName('score/total-pedestal'));root.bringToTop(byName('score/source'));
      orderScoreBrushLayers(root as unknown as Phaser.GameObjects.Container,foreground as unknown as Phaser.GameObjects.GameObject[],texts as unknown as Phaser.GameObjects.GameObject[]);
      expect(index('background')).toBe(0);expect(index('score/fire-frame')).toBeLessThan(index('score/board-paper'));expect(index('score/board-paper')).toBeLessThan(index('score/total-pedestal'));
      expect(index('score/total-pedestal')).toBeLessThan(index('score/fire'));for(const node of [...foreground,...texts])expect(root.list.indexOf(node)).toBeGreaterThan(index('score/fire'));
    }
  });
  it('deduplicates reduced hits before early exit, and consumes each tier without update listeners',()=>{
    const f=fixture();f.flame.set(0,true);f.flame.impact('quiet');expect(f.state().localPhase).toBe('static');expect(f.updates()).toBe(0);
    const commands=JSON.stringify(f.objects.find(o=>o.name==='score/fire').commands);f.events.emit('update',1000);expect(JSON.stringify(f.objects.find(o=>o.name==='score/fire').commands)).toBe(commands);
    f.flame.set(2,true);expect(f.state().framePhase).toBe('static');f.flame.set(2,false);f.flame.impact('quiet');
    expect(f.flame.graphic.getData('impactCount')).toBe(1);expect(f.state().localPhase).toBe('idle');expect(f.updates()).toBe(0);f.flame.destroy();
  });
  it.each([{deltas:[1000]},{deltas:[100,100,700]}])('ends animation after suspension / slow frames $deltas',({deltas})=>{
    const f=fixture();f.flame.set(3);f.flame.impact('one');for(const d of deltas)f.events.emit('update',d);
    expect(f.state()).toMatchObject({frameAge:900,localAge:320});expect(f.updates()).toBe(0);f.flame.destroy();
  });
  it('clips actual long text, cards and buttons from both local and exterior bands',()=>{
    for(const [width,height] of [[390,740],[844,300]]){
      const l=layout({width,height},{top:12,right:0,bottom:34,left:0}),f=fixture(l.scoreBoard,{x:4,y:4,width:width-8,height:height-8});
      const guards=[...Object.values(l.buttons),...Object.values(l.tableActions),...l.cards.filter(c=>c.visible).map(c=>c.visual),
        {x:l.scoreBoard.x+2,y:l.scoreBoard.y+30,width:l.scoreBoard.width-4,height:28}];
      f.flame.setGuards(guards);const pieces=f.flame.graphic.getData('safePieces') as Box[],bands=[...f.flame.graphic.getData('localBands'),...f.flame.graphic.getData('frameBands')];
      for(const p of pieces){expect(p.width).toBeGreaterThan(0);for(const g of guards)expect(intersects(p,g)).toBe(false);expect(bands.some(b=>p.x>=b.x&&p.y>=b.y&&p.x+p.width<=b.x+b.width&&p.y+p.height<=b.y+b.height)).toBe(true);}
      f.flame.destroy();
    }
  });
  it('keeps exterior strokes in 8px bands clear of original hand/action bodies',()=>{
    for(const [width,height] of [[320,568],[390,740],[844,300],[1440,900]]){
      const frame=scoreFlameFrameBands({x:4,y:4,width:width-8,height:height-8})!,l=layout({width,height},{top:12,right:0,bottom:34,left:0});
      expect(frame.outer).toEqual({x:0,y:0,width,height});expect(frame.depth).toBe(8);
      for(const band of frame.bands)for(const b of [...l.cards.filter(c=>c.visible).map(c=>c.visual),...Object.values(l.tableActions)])expect(intersects(band,b)).toBe(false);
    }
    expect(scoreFlameFrameBands({x:4,y:4,width:NaN,height:100})).toBeUndefined();
  });
  it('uses no randomness and releases masks, Graphics and listeners exactly once on skip/shutdown/destroy',()=>{
    const random=vi.spyOn(Math,'random').mockImplementation(()=>{throw Error('cosmetic RNG forbidden');});
    try{const f=fixture();f.flame.set(3);f.flame.impact('one');f.events.emit('update',280);f.flame.destroy();f.flame.destroy();f.events.emit('shutdown');f.events.emit('destroy');
      expect(f.objects.every(o=>o.destroyed===1)).toBe(true);expect(f.mask.destroy).toHaveBeenCalledOnce();expect([...f.callbacks.values()].every(v=>v.length===0)).toBe(true);
    }finally{random.mockRestore();}
  });
});
