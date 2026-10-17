import type Phaser from 'phaser';
import type {Edition} from '../cards/types';
import type {Box} from './layout';
import {gameSession} from './session';

/** A narrow, transparent-centre edge. No shader, particle emitter, tween or extra texture. */
export const IRIDESCENCE_FRAME_MS=1000/15;
export const IRIDESCENCE_CYCLE_MS=7200;
const managers=new WeakMap<Phaser.Scene,IridescenceManager>();
const palette=[0xf17eae,0xd79bfa,0x85b6f5,0x57d9db,0x9bdd9d,0xf4d282,0xf4a17c,0xf17eae];
type Point={x:number;y:number};
type Entry={host:Phaser.GameObjects.Container;edge:Phaser.GameObjects.Graphics;bounds:Box;path:Point[];lastPhase?:number;remove:()=>void};

export function iridescenceColor(position:number):number {
  const p=((position%1+1)%1)*(palette.length-1),i=Math.floor(p),t=p-i,a=palette[i],b=palette[i+1];
  const channel=(shift:number)=>Math.round(((a>>shift)&255)*(1-t)+((b>>shift)&255)*t);
  return (channel(16)<<16)|(channel(8)<<8)|channel(0);
}

/** Equal-distance samples keep the travelling highlight smooth around all four corners. */
export function iridescencePath(b:Box,segments=64):Point[] {
  const inset=2,x=b.x+inset,y=b.y+inset,w=b.width-inset*2,h=b.height-inset*2,r=Math.min(5,w/4,h/4);
  const horizontal=w-2*r,vertical=h-2*r,arc=Math.PI*r/2,perimeter=2*(horizontal+vertical)+4*arc;
  const parts=[horizontal,arc,vertical,arc,horizontal,arc,vertical,arc];
  return Array.from({length:segments+1},(_,i)=>{
    let d=perimeter*(i%segments)/segments,n=0;while(n<7&&d>parts[n])d-=parts[n++];
    if(n===0)return {x:x+r+d,y};
    if(n===2)return {x:x+w,y:y+r+d};
    if(n===4)return {x:x+w-r-d,y:y+h};
    if(n===6)return {x,y:y+h-r-d};
    const corner=(n-1)/2,angle=-Math.PI/2+corner*Math.PI/2+d/r;
    return {x:[x+w-r,x+w-r,x+r,x+r][corner]+Math.cos(angle)*r,y:[y+r,y+h-r,y+h-r,y+r][corner]+Math.sin(angle)*r};
  });
}

function visible(entry:Entry,scene:Phaser.Scene):boolean {
  const camera=scene.cameras.main;
  if(scene.sys?.settings.visible===false||!camera.visible||camera.alpha<=0)return false;
  for(let node:Phaser.GameObjects.Container|null=entry.host;node;node=node.parentContainer)
    if(!node.visible||!node.active||node.alpha<=0||(node.cameraFilter&camera.id)!==0)return false;
  const m=entry.host.getWorldTransformMatrix(),b=entry.bounds;
  let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
  for(const [x,y] of [[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]]){
    const wx=m.a*x+m.c*y+m.tx,wy=m.b*x+m.d*y+m.ty;
    left=Math.min(left,wx);right=Math.max(right,wx);top=Math.min(top,wy);bottom=Math.max(bottom,wy);
  }
  const v=camera.worldView;
  return right>v.x&&bottom>v.y&&left<v.right&&top<v.bottom;
}

function draw(entry:Entry,phase:number):void {
  const g=entry.edge,path=entry.path,count=path.length-1;
  g.clear();
  // Both passes share one path: a soft inner feather and a fine coloured edge, never nested frames.
  for(let i=0;i<count;i++){
    const a=path[i],b=path[i+1],position=i/count,color=iridescenceColor(position-phase);
    const glint=Math.pow((1+Math.cos((position-phase)*Math.PI*4))/2,12);
    g.lineStyle(3.4,color,.12+.10*glint).lineBetween(a.x,a.y,b.x,b.y);
    g.lineStyle(1.6,color,.80+.18*glint).lineBetween(a.x,a.y,b.x,b.y);
  }
  entry.lastPhase=phase;
  g.setData('phase',phase).setData('draws',(g.getData('draws')??0)+1);
}

class IridescenceManager {
  readonly entries=new Set<Entry>();
  private elapsed=0;
  private cadence=IRIDESCENCE_FRAME_MS;
  private disposed=false;
  private hidden=document.hidden;
  private readonly media=typeof window!=='undefined'?window.matchMedia('(prefers-reduced-motion: reduce)'):undefined;
  private readonly unsubscribe:()=>void;
  constructor(private readonly scene:Phaser.Scene){
    scene.events.on('update',this.update);
    scene.events.once('shutdown',this.dispose);
    scene.events.once('destroy',this.dispose);
    document.addEventListener('visibilitychange',this.refresh);
    this.media?.addEventListener('change',this.refresh);
    this.unsubscribe=gameSession().subscribe(this.refresh);
  }
  add(entry:Entry):void {
    this.entries.add(entry);entry.edge.once('destroy',entry.remove);this.refresh();
  }
  remove(entry:Entry):void {
    this.entries.delete(entry);entry.edge.off('destroy',entry.remove);
    if(!this.entries.size)this.dispose();
  }
  private reduced():boolean {return gameSession().reducedMotion||this.media?.matches===true;}
  private readonly refresh=()=>{
    this.hidden=document.hidden;
    if(this.hidden){for(const e of this.entries)e.edge.setData('motion','hidden');return;}
    this.cadence=IRIDESCENCE_FRAME_MS;this.update(0,0);
  };
  private readonly update=(_time:number,delta:number)=>{
    if(this.disposed||this.hidden)return;
    const still=this.reduced();if(!still)this.elapsed+=Math.min(delta,IRIDESCENCE_FRAME_MS*2);
    this.cadence+=delta;if(this.cadence<IRIDESCENCE_FRAME_MS)return;this.cadence%=IRIDESCENCE_FRAME_MS;
    // No dependency on hover, scoring or playback speed; hidden tabs never catch up.
    const phase=this.elapsed/IRIDESCENCE_CYCLE_MS%1;
    for(const e of this.entries){
      const shown=visible(e,this.scene);e.edge.setVisible(shown).setData('motion',shown?(still?'static':'flowing'):'culled');
      if(!shown)continue;
      const next=still?0:phase;if(e.lastPhase!==next)draw(e,next);
    }
  };
  private readonly dispose=()=>{
    if(this.disposed)return;this.disposed=true;
    this.scene.events.off('update',this.update);this.scene.events.off('shutdown',this.dispose);this.scene.events.off('destroy',this.dispose);
    document.removeEventListener('visibilitychange',this.refresh);this.media?.removeEventListener('change',this.refresh);this.unsubscribe();
    for(const e of [...this.entries]){e.edge.off('destroy',e.remove);e.edge.destroy();}
    this.entries.clear();managers.delete(this.scene);
  };
}

/** bounds use host-local coordinates. Call after the artwork, before names/value labels.
 * The returned graphic has no input; destroying it or its host unsubscribes automatically.
 * A non-polychrome edition creates no object, listener, texture or manager.
 */
export function mountPolychromeCardIridescence(scene:Phaser.Scene,host:Phaser.GameObjects.Container,bounds:Box,edition?:Edition):Phaser.GameObjects.Graphics|undefined {
  if(edition!=='polychrome'||bounds.width<12||bounds.height<12)return;
  const edge=scene.add.graphics().setName('card/polychrome-iridescence').setData('edition','polychrome').setData('bounds',{...bounds});
  host.add(edge);
  const manager=managers.get(scene)??new IridescenceManager(scene);managers.set(scene,manager);
  const entry:Entry={host,edge,bounds:{...bounds},path:iridescencePath(bounds,bounds.width<100?48:64),remove:()=>manager.remove(entry)};
  manager.add(entry);return edge;
}
