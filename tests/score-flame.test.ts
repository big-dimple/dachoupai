import {describe,it,expect,vi} from 'vitest';
import type Phaser from 'phaser';
import {layout,intersects} from '../src/game/layout';

vi.mock('phaser',()=>({default:{Scenes:{Events:{UPDATE:'update',SHUTDOWN:'shutdown',DESTROY:'destroy'}},Textures:{FilterMode:{LINEAR:0}}}}));
import {ScoreFlame,scoreFlameFrameBands} from '../src/game/ScoreFlame';

function fixture(box={x:15,y:125,width:360,height:40}){
  const objects:{name:string;visible:boolean;active:boolean;destroyed:number;[key:string]:unknown}[]=[],textures=new Map<string,{width:number;height:number;pixels?:ImageData}>();
  let uploads=0,allocations=0;
  const callbacks=new Map<string,{fn:Function;context:unknown}[]>();
  const events={
    on(type:string,fn:Function,context:unknown){callbacks.set(type,[...(callbacks.get(type)??[]),{fn,context}]);},
    once(type:string,fn:Function,context:unknown){this.on(type,fn,context);},
    off(type:string,fn:Function){callbacks.set(type,(callbacks.get(type)??[]).filter(entry=>entry.fn!==fn));},
    emit(type:string,delta=0){for(const entry of [...(callbacks.get(type)??[])])entry.fn.call(entry.context,0,delta);},
  };
  const object=()=>{
    const node:typeof objects[number]={name:'',visible:true,active:true,destroyed:0};objects.push(node);
    for(const method of ['clear','lineStyle','beginPath','moveTo','lineTo','strokePath','fillStyle','fillCircle','strokeRect','fillRect','setMask','add'])node[method]=()=>node;
    node.setName=(name:string)=>{node.name=name;return node;};node.setVisible=(visible:boolean)=>{node.visible=visible;return node;};node.setAlpha=(alpha:number)=>{node.alpha=alpha;return node;};
    node.createGeometryMask=()=>({destroy:vi.fn()});node.setMask=(mask:unknown)=>{node.mask=mask;return node;};node.setData=()=>node;node.setDisplaySize=()=>node;node.setAngle=()=>node;node.setFlipX=()=>node;
    node.destroy=()=>{node.active=false;node.destroyed++;};return node;
  };
  const scene={events,add:{graphics:object,image:object},textures:{
    createCanvas(key:string,width:number,height:number){
      const texture={width,height,setFilter(){return this;},refresh(){uploads++;},context:{
        createImageData(w:number,h:number){allocations++;return {width:w,height:h,data:new Uint8ClampedArray(w*h*4)} as ImageData;},
        putImageData(pixels:ImageData){(texture as {pixels?:ImageData}).pixels=pixels;},
      }};textures.set(key,texture);return texture;
    },exists:(key:string)=>textures.has(key),remove:(key:string)=>textures.delete(key),
  }};
  const flame=new ScoreFlame(scene as unknown as Phaser.Scene,{add(){}} as unknown as Phaser.GameObjects.Container,
    box,{x:8,y:8,width:374,height:828});
  return {flame,objects,textures,events,callbacks,uploads:()=>uploads,allocations:()=>allocations};
}

describe('bounded foreground score fire',()=>{
  it('clips heat texture, frame halo and all ember graphics with the same owned CSS-space safety mask',()=>{
    const f=fixture(),masked=f.objects.filter(o=>o.name==='score/fire'||o.name==='score/fire-heat'||o.name==='score/fire-frame'||o.name.startsWith('score/fire-frame-'));
    expect(masked.length).toBe(7);expect(masked.every(o=>!!o.mask&&o.mask===masked[0].mask)).toBe(true);
    const mask=masked[0].mask as {destroy:ReturnType<typeof vi.fn>};
    expect(f.objects.find(o=>o.name==='score/fire-safe-area')?.visible).toBe(false);
    f.flame.destroy();expect(mask.destroy).toHaveBeenCalledOnce();
    expect(f.objects.find(o=>o.name==='score/fire-safe-area')?.destroyed).toBe(1);
  });
  it('keeps all four frame bands in the outer 8px without covering hand or action bodies',()=>{
    for(const [width,height] of [[320,568],[390,844],[844,390],[1440,900]]){
      const frame=scoreFlameFrameBands({x:8,y:8,width:width-16,height:height-16})!;
      expect(frame.outer).toEqual({x:0,y:0,width,height});expect(frame.depth).toBe(8);
      const table=layout({width,height},{top:0,right:0,bottom:0,left:0});
      for(const band of frame.bands){
        expect(band.x).toBeGreaterThanOrEqual(0);expect(band.y).toBeGreaterThanOrEqual(0);
        expect(band.x+band.width).toBeLessThanOrEqual(width);expect(band.y+band.height).toBeLessThanOrEqual(height);
        for(const body of [...table.cards.filter(card=>card.visible).map(card=>card.visual),...Object.values(table.tableActions)])expect(intersects(band,body)).toBe(false);
      }
    }
    expect(scoreFlameFrameBands({x:8,y:8,width:NaN,height:100})).toBeUndefined();
  });
  it('shows four shared-texture frame flames only for large fire and reuses bounded buffers at 30Hz',()=>{
    const f=fixture(),images=()=>f.objects.filter(object=>object.name.startsWith('score/fire-frame-'));
    expect(images()).toHaveLength(4);expect(images().every(image=>!image.visible)).toBe(true);
    expect(f.textures.size).toBe(2);expect(f.allocations()).toBe(2);
    for(const texture of f.textures.values()){expect(texture.width).toBeLessThanOrEqual(256);expect(texture.height).toBeLessThanOrEqual(72);}
    f.events.emit('update',50);expect(f.uploads()).toBe(0);
    f.flame.set(1);expect(images().every(image=>!image.visible)).toBe(true);
    f.flame.set(2);expect(images().every(image=>image.visible)).toBe(true);
    const before=f.uploads();f.events.emit('update',16);f.events.emit('update',16);expect(f.uploads()).toBe(before);
    f.events.emit('update',16);expect(f.uploads()).toBe(before+2);expect(f.allocations()).toBe(2);
    f.flame.set(1);expect(images().every(image=>!image.visible)).toBe(true);f.flame.destroy();
  });
  it('increases large/extreme plume area, brightness and height with the same texture budget',()=>{
    const f=fixture(),[local,frame]=[...f.textures.values()];
    const measure=(texture:typeof local)=>{
      let area=0,alpha=0,firstRow=texture.height;
      for(let i=3;i<texture.pixels!.data.length;i+=4){
        const value=texture.pixels!.data[i];alpha+=value;
        if(value>=12){area++;firstRow=Math.min(firstRow,Math.floor(i/4/texture.width));}
      }
      return {area,alpha,height:texture.height-firstRow};
    };
    f.flame.set(1);const small=measure(local);
    f.flame.set(3);
    expect(f.objects.filter(object=>object.name.startsWith('score/fire-frame-')).every(image=>image.visible)).toBe(true);
    // Live tier transitions preserve the field; evaluate the same steady-volume
    // contract after bounded propagation, not after an artificial warm-start jump.
    for(let i=0;i<96;i++)f.events.emit('update',40);
    const large=measure(local),border=measure(frame);
    expect(large.area).toBeGreaterThan(small.area*3);expect(large.alpha).toBeGreaterThan(small.alpha*3);
    expect(small.height).toBeGreaterThanOrEqual(18);
    expect(large.height).toBeGreaterThan(small.height+8);expect(large.height).toBeGreaterThanOrEqual(local.height*.7);
    expect(border.area).toBeGreaterThan(frame.width*frame.height*.5);
    expect(f.objects.filter(object=>object.name.startsWith('score/fire-frame-')).every(image=>!image.visible)).toBe(true);
    f.flame.destroy();
  });
  it('distinguishes large from extreme volume without changing target /2x /5x semantics',()=>{
    const f=fixture();const local=[...f.textures.values()][0],measure=()=>{const p=local.pixels!,a=[];let top=p.height;for(let i=3;i<p.data.length;i+=4)if(p.data[i]>=12){a.push(p.data[i]);top=Math.min(top,Math.floor(i/4/p.width));}return {area:a.length,alpha:a.reduce((s,a)=>s+a,0),height:p.height-top};};
    f.flame.set(2,true);const large=measure();f.flame.set(3,true);const extreme=measure();expect(extreme.area).toBeGreaterThan(large.area*1.2);expect(extreme.alpha).toBeGreaterThan(large.alpha*1.2);expect(extreme.height).toBeGreaterThan(large.height);f.flame.destroy();
  });
  it('warms initial/static/resumed fields but advances live tier changes by exactly one step',()=>{
    for(const height of [28,40,52]){
      const f=fixture({x:15,y:125,width:220,height});
      const core=f.flame as unknown as {advanceHeat:()=>void;step:number};
      const advance=vi.spyOn(core,'advanceHeat'),warm=Math.min(96,height*2);
      f.flame.set(2);expect(advance).toHaveBeenCalledTimes(warm);
      const uploads=f.uploads(),step=core.step;advance.mockClear();
      f.flame.set(2);expect(advance).not.toHaveBeenCalled();expect(core.step).toBe(step);expect(f.uploads()).toBe(uploads);
      f.flame.set(3);expect(advance).toHaveBeenCalledTimes(1);expect(core.step).toBe(step+1);
      advance.mockClear();f.flame.set(2);expect(advance).toHaveBeenCalledTimes(1);
      advance.mockClear();f.flame.set(2,true);expect(advance).toHaveBeenCalledTimes(warm);expect(core.step).toBe(warm);
      advance.mockClear();f.events.emit('update',1000);expect(advance).not.toHaveBeenCalled();
      f.flame.set(2);expect(advance).toHaveBeenCalledTimes(warm);expect(core.step).toBe(warm);
      advance.mockClear();f.flame.set(0);expect(advance).not.toHaveBeenCalled();
      f.flame.set(1);expect(advance).toHaveBeenCalledTimes(warm);
      f.flame.destroy();
    }
  });
  it('paints a connected warm base across the score board with uneven rising lobes',()=>{
    const f=fixture(),local=[...f.textures.values()][0];f.flame.set(2);
    const pixels=local.pixels!.data,w=local.width,h=local.height,heights:number[]=[];
    for(let x=3;x<w-3;x++){
      let top=h,base=false;
      for(let y=0;y<h;y++)if(pixels[(y*w+x)*4+3]>=12){top=Math.min(top,y);if(y>=h-8)base=true;}
      expect(base,'no empty breaks in the detected warm base').toBe(true);heights.push(h-top);
    }
    expect(new Set(heights).size).toBeGreaterThan(12);
    f.flame.set(3);expect(f.allocations()).toBe(2);f.flame.destroy();
  });
  it('stops uploads and sparks for reduced motion, then hides and fully releases on cancellation',()=>{
    const f=fixture();f.flame.set(2);f.flame.set(2,true);const uploads=f.uploads();
    expect(f.objects.filter(object=>object.name.startsWith('score/fire-frame-')).every(image=>!image.visible)).toBe(true);
    for(let i=0;i<5;i++)f.events.emit('update',50);expect(f.uploads()).toBe(uploads);
    f.flame.set(0);expect(f.objects.every(object=>object.name==='score/fire'?!object.visible:object.name==='score/fire-frame'?!object.visible:true)).toBe(true);
    f.flame.destroy();f.flame.destroy();f.events.emit('shutdown');f.events.emit('destroy');
    expect(f.textures.size).toBe(0);expect([...f.callbacks.values()].every(entries=>entries.length===0)).toBe(true);
    expect(f.objects.every(object=>object.destroyed===1)).toBe(true);
  });
  it('preserves real-layout CSS height and multiple unequal peaks for every tier, including static reduced motion',()=>{
    for(const [width,height,count] of [[390,740,9],[360,740,14],[844,300,9],[1280,720,8]]){
      const b=layout({width,height},{top:0,right:0,bottom:0,left:0},undefined,{count}).scoreFire;
      expect(b.height).toBeGreaterThan(0);
      const f=fixture(b),local=[...f.textures.values()][0];expect(local.height).toBe(Math.min(72,Math.ceil(b.height)));
      for(const tier of [1,2,3] as const){
        f.flame.set(tier,true);const p=local.pixels!,tops:number[]=[];
        for(let x=2;x<p.width-2;x++){let top=p.height;for(let y=0;y<p.height;y++)if(p.data[(y*p.width+x)*4+3]>=24){top=y;break;}tops.push((p.height-top)*b.height/p.height);}
        expect(Math.max(...tops)).toBeGreaterThanOrEqual(b.height*(tier===1?.40:.60));
        expect(Math.max(...tops)-Math.min(...tops)).toBeGreaterThanOrEqual(b.height*.25);
        // Detect the final contour, independent of any procedural root coordinates.
        const groups:number[]=[];let start=-1;
        const floor=Math.min(...tops)+b.height*.15;
        for(let x=0;x<=tops.length;x++){if(x<tops.length&&tops[x]>floor){if(start<0)start=x;}else if(start>=0){let peak=start;for(let j=start;j<x;j++)if(tops[j]>tops[peak])peak=j;groups.push(peak);start=-1;}}
        expect(groups.length).toBeGreaterThanOrEqual(2);
        if(groups.length>=3){const gaps=groups.slice(1).map((x,i)=>x-groups[i]);expect(Math.max(...gaps)-Math.min(...gaps)).toBeGreaterThan(2);}
        const uploads=f.uploads();f.events.emit('update',1000);expect(f.uploads()).toBe(uploads);
      }
      f.flame.destroy();
    }
  });
  it('ends the edge ignition at260ms even between30Hz texture redraws',()=>{
    const f=fixture();f.flame.set(2);
    for(let i=0;i<5;i++)f.events.emit('update',50);
    expect(f.objects.filter(o=>o.name.startsWith('score/fire-frame-')).every(o=>o.visible)).toBe(true);
    f.events.emit('update',11);
    expect(f.objects.filter(o=>o.name.startsWith('score/fire-frame-')).every(o=>!o.visible)).toBe(true);
    f.flame.destroy();
  });
  it('uses wall-clock lifetime at 10FPS and after suspension, independently of heat dt',()=>{
    for(const deltas of [[100,100,61],[1000],[16,16,228]]){
      const f=fixture();f.flame.set(2);for(const delta of deltas)f.events.emit('update',delta);
      expect(f.objects.filter(o=>o.name.startsWith('score/fire-frame-')).every(o=>!o.visible)).toBe(true);f.flame.destroy();
    }
  });
  it('gives same-tier positive landings a bounded one-shot plume, without persistent frame light',()=>{
    const f=fixture();f.flame.set(2);for(let i=0;i<10;i++)f.events.emit('update',50);
    expect(f.objects.filter(o=>o.name.startsWith('score/fire-frame-')).every(o=>!o.visible)).toBe(true);
    const pixels=()=>[...f.textures.values()][0].pixels!.data.slice();const steady=pixels();
    f.flame.impact('source-1',1);expect(pixels()).not.toEqual(steady);const once=pixels(),uploads=f.uploads();
    f.flame.impact('source-1',1);expect(f.uploads()).toBe(uploads);expect(pixels()).toEqual(once);
    expect(f.objects.filter(o=>o.name.startsWith('score/fire-frame-')).every(o=>!o.visible)).toBe(true);
    for(let i=0;i<5;i++)f.events.emit('update',50);
    expect((f.flame as unknown as {surge:number}).surge).toBe(0);
    f.flame.set(2,true);const reduced=pixels();f.flame.impact('source-2',1);expect(pixels()).toEqual(reduced);
    f.flame.destroy();
  });
});
