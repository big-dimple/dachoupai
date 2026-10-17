import type Phaser from 'phaser';
import type {SceneView} from './SceneView';
import {modalBlocksCanvas} from './DetailDialog';
import {resultPlacement} from './IntermissionLayout';
import {PAPER_CSS,PAPER_THEME} from './theme';
import type {Box} from './layout';

function measuredContent(content:Phaser.GameObjects.Container):Box {
  const boxes:Box[]=[];
  const walk=(list:Phaser.GameObjects.GameObject[])=>{for(const object of list){
    const item=object as Phaser.GameObjects.Image&{list?:Phaser.GameObjects.GameObject[]};
    if(!item.visible)continue;
    if(item.list){walk(item.list);continue;}
    // Graphics without an explicit paper box report the origin, not their drawn bounds.
    const box=item.getData('bounds')??(item.type==='Graphics'?undefined:item.getBounds());
    if(box?.width>0&&box.height>0)boxes.push(box);
  }};walk(content.list);
  const x=Math.min(...boxes.map(b=>b.x)),y=Math.min(...boxes.map(b=>b.y));
  return {x,y,width:Math.max(...boxes.map(b=>b.x+b.width))-x,height:Math.max(...boxes.map(b=>b.y+b.height))-y};
}

/** Local result scrolling; no saved state, camera movement or shared scene input changes. */
export function mountResultViewport(scene:Phaser.Scene,view:SceneView,content:Phaser.GameObjects.Container,top:number,bottom:number,offset:number,remember:(offset:number)=>void){
  const bounds=measuredContent(content),initial=resultPlacement(top,bottom,bounds,offset);
  const readingBottom=bottom-(initial.overflow>0?22:0),placement=resultPlacement(top,readingBottom,bounds,offset);
  const canvas=scene.game.canvas,mask=view.add(scene.add.graphics().setVisible(false));
  mask.fillStyle(0xffffff).fillRect(0,top,view.layout.width,readingBottom-top);
  content.setMask(mask.createGeometryMask());
  const hint=placement.overflow>0?view.text(bounds.x,bottom-18,'上下滑动查看结算',14,PAPER_CSS.jade,bounds.width).setName('result-scroll/hint'):undefined;
  const rail=placement.overflow>0?view.add(scene.add.graphics()).setName('result-scroll/rail'):undefined;
  let scroll=placement.scroll,drag:{id:number;y:number;offset:number;moving:boolean}|undefined;
  const update=(next:number)=>{
    const p=resultPlacement(top,readingBottom,bounds,next);scroll=p.scroll;content.y=p.y;remember(scroll);
    content.setData('viewport',{top,bottom:readingBottom,contentTop:bounds.y,contentHeight:bounds.height,overflow:p.overflow,scroll});
    if(hint)hint.setText(scroll>=p.overflow-1?'已到末尾 · 可继续':'上下滑动查看结算');
    if(rail){const h=readingBottom-top,thumb=Math.max(32,h*h/bounds.height);rail.clear().fillStyle(PAPER_THEME.jade,.35).fillRoundedRect(Math.min(view.layout.width-5,bounds.x+bounds.width+5),top+(h-thumb)*scroll/p.overflow,3,thumb,1.5);}
  };
  update(scroll);
  const blocked=(e:{clientX:number;clientY:number})=>modalBlocksCanvas(e.clientX,e.clientY);
  const wheel=(e:WheelEvent)=>{if(!placement.overflow||blocked(e))return;e.preventDefault();view.cancelInteraction();update(scroll+e.deltaY*(e.deltaMode===1?18:e.deltaMode===2?readingBottom-top:1));};
  const down=(e:PointerEvent)=>{
    if(!placement.overflow||blocked(e))return;
    const r=canvas.getBoundingClientRect(),y=(e.clientY-r.top)*view.layout.height/r.height;
    if(y<top||y>readingBottom){e.stopImmediatePropagation();return;}
    if(e.button===0)drag={id:e.pointerId,y:e.clientY,offset:scroll,moving:false};
  };
  const move=(e:PointerEvent)=>{
    if(!drag||drag.id!==e.pointerId)return;
    const delta=(drag.y-e.clientY)*view.layout.height/canvas.getBoundingClientRect().height;
    if(Math.abs(delta)>8)drag.moving=true;
    if(drag.moving){if(e.cancelable)e.preventDefault();view.cancelInteraction();update(drag.offset+delta);}
  };
  const end=()=>{drag=undefined;};
  const key=(e:KeyboardEvent)=>{
    if(!placement.overflow||document.querySelector('dialog[open]')||e.ctrlKey||e.metaKey||e.altKey||/INPUT|TEXTAREA|SELECT/.test((e.target as Element)?.tagName))return;
    const delta=e.key==='ArrowDown'?48:e.key==='ArrowUp'?-48:e.key==='PageDown'?readingBottom-top-48:e.key==='PageUp'?top-readingBottom+48:0;
    if(delta||e.key==='Home'||e.key==='End'){e.preventDefault();view.cancelInteraction();update(e.key==='Home'?0:e.key==='End'?placement.overflow:scroll+delta);}
  };
  canvas.addEventListener('wheel',wheel,{passive:false});canvas.addEventListener('pointerdown',down,true);
  window.addEventListener('pointermove',move,{capture:true,passive:false});window.addEventListener('pointerup',end,true);window.addEventListener('pointercancel',end,true);window.addEventListener('blur',end);window.addEventListener('keydown',key);
  return ()=>{canvas.removeEventListener('wheel',wheel);canvas.removeEventListener('pointerdown',down,true);window.removeEventListener('pointermove',move,true);window.removeEventListener('pointerup',end,true);window.removeEventListener('pointercancel',end,true);window.removeEventListener('blur',end);window.removeEventListener('keydown',key);content.clearMask(true);};
}
