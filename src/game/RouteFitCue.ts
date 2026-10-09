import {R2_TOOLS} from '../content/r2Tools';
import type {R2RunState} from '../domain/run';
import {r2CreateJoker} from '../domain/r2Run';
import {currentBuildFocus} from './BuildDirectionPreferences';
import {toolSupportsFocus} from './BuildJourney';
import {shopRouteRelation} from './ShopRouteRelations';
export const ROUTE_TONE={group:{ink:0x3f606b,css:'#3F606B',label:'成组契合'},straight:{ink:0x8f6a3b,css:'#8F6A3B',label:'顺子契合'},flush:{ink:0xb8473a,css:'#B8473A',label:'同花契合'}};
/** Same current-profile effect relation on shelf, held faces and detail; never a purchase ranking. */
export function routeFitCue(state:R2RunState,kind:'jokers'|'tools'|'items',id:string,instanceId?:string){
 const focus=currentBuildFocus(state,state.openingRoute);if(!focus||kind==='items')return;
 const relation=kind==='jokers'?shopRouteRelation(state,state.jokers.find(j=>j.instanceId===instanceId)??r2CreateJoker(id,'display/'+id,0,'none',state),focus):undefined;
 const matches=relation?relation.kind==='direct'||relation.kind==='support':toolSupportsFocus(id,focus);
 return matches?{...ROUTE_TONE[focus],focus,reason:relation?.body??'改牌或升型可服务该方向；目标与代价需自行确认。',note:'契合用途 · 不代表必买或最优'}:undefined;
}
export function markRouteDetail(host:HTMLElement,cue:ReturnType<typeof routeFitCue>):void {
 if(!cue)return;host.dataset.routeFit=cue.focus;host.style.setProperty('--route-fit',cue.css);const tag=document.createElement('p');tag.className='route-fit-caption';tag.textContent=cue.label+' · '+cue.note;host.querySelector('.dialog-header')?.append(tag);
}

/** A purpose cue follows the operation, not a tool name or a promised next draw. */
export function toolPurpose(state:R2RunState,id:string):string {
 const op=R2_TOOLS.find(t=>t.id===id)?.operation,focus=currentBuildFocus(state,state.openingRoute);
 if(!op)return '';
 switch(op.kind){
 case 'shift-rank':return focus==='group'?'把相邻点数改成同点，培养对子／两对；不必等复制牌。':'微调点数，自己核对改后组合。';
 case 'delete-cards':return '永久删掉偏离方向的牌，缩小牌组；不保证下一手抽中核心。';
 case 'set-enhancement':return op.enhancement==='voice-paper'?'受益牌留在手中才加倍率，打出它不读取留牌加成。':op.enhancement==='gold-paper'?'过关时受益牌有效留在手中才给金币，不提高本手分数。':'给会参与计分的牌加增强；对子／两对也可用，无须同花。';
 case 'copy-card':return '复制已有好牌，可增加同点或同花色数量；原牌保留。';
 case 'random-enhancement':return '用一张牌换另外一至两张的随机增强；每张独立抽取，保存后揭晓。';
 case 'random-edition':return '为选中对象增加随机版次；保存后揭晓，不能预选结果。';
 case 'set-suit':case 'set-deck-suit':return '集中花色，点数保留；不会保证下一手成型。';
 case 'upgrade-hand':return '升级已发现的对应牌型，增加基础值；改牌与升型可以分步培养。';
 default:return '按下方实际对象与代价确认；用后查看保存结果。';
 }
}
