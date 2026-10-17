import type Phaser from 'phaser';
import type {Box,LayoutMode} from './layout';
import type {SceneView} from './SceneView';
import {PAPER_CSS,PAPER_THEME} from './theme';

const SORT_TITLE_HEIGHT=14;
export function handSortTitleBox(tools:Box):Box {return {...tools,height:SORT_TITLE_HEIGHT};}

/** A noninteractive caption sits above three full-size sorting hits. */
export function handActionControls(actions:Box,mode:LayoutMode,bottomLimit?:number){
 const height=Math.max(actions.height,SORT_TITLE_HEIGHT+44),footer={...actions,height,y:Math.min(actions.y,bottomLimit===undefined?actions.y:bottomLimit-height)};
 const sortWidth=mode==='desktop'?144:132,gap=6,sideWidth=(footer.width-sortWidth-2*gap)/2;
 const tools={x:footer.x+sideWidth+gap,y:footer.y,width:sortWidth,height:footer.height};
 const controlWidth=sortWidth/3,controlY=tools.y+SORT_TITLE_HEIGHT,controlHeight=tools.height-SORT_TITLE_HEIGHT;
 const hit=(index:number):Box=>({x:tools.x+index*controlWidth,y:controlY,width:controlWidth,height:controlHeight});
 const buttons={rank:hit(0),suit:hit(1),ai:hit(2)};
 const tableActions={discard:{...footer,width:sideWidth},play:{...footer,x:tools.x+tools.width+gap,width:sideWidth}};
 return {actions:footer,tools,buttons,tableActions};
}

export function renderHandSortGroup(scene:Phaser.Scene,view:SceneView,tools:Box):void {
 const title=handSortTitleBox(tools),g=scene.add.graphics();
 g.fillStyle(PAPER_THEME.jadeSoft).fillRoundedRect(tools.x,tools.y,tools.width,tools.height,6).lineStyle(1,PAPER_THEME.jade,.9).strokeRoundedRect(tools.x+.5,tools.y+.5,tools.width-1,tools.height-1,6);
 view.add(g.setName('action/sort-group').setData('bounds',tools));
 view.text(title.x+title.width/2,title.y+title.height/2,'理牌',11,PAPER_CSS.jade).setOrigin(.5).setName('action/sort-title');
}

export type HandAiButtonState='ready'|'working'|'paused'|'unavailable';
export function handAiButtonLabel(state:HandAiButtonState):string {
 return state==='ready'?'AI':state==='working'?'AI\n计算':state==='paused'?'AI\n稍候':'AI\n不可用';
}
