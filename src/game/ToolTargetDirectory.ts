import type {PlayingCard,Suit} from '../cards/types';
import type {R2ToolDefinition} from '../content/r2Tools';
/** Display eligibility only. Multi-card no-change companions remain selectable; commands decide the combination. */
export function toolCardTargetStatus(tool:R2ToolDefinition,card:PlayingCard,role:'target'|'donor',donorId?:string){
 if(role==='donor')return {eligible:true,changes:true,reason:''};
 if(card.id===donorId)return {eligible:false,changes:false,reason:'已作牺牲牌'};
 if(tool.target.kind==='card-sacrifice'&&card.enhancement!==undefined)return {eligible:false,changes:false,reason:'须无增强'};
 if(tool.target.kind==='card-or-joker'&&(card.edition??'none')!=='none')return {eligible:false,changes:false,reason:'须普通版次'};
 const op=tool.operation;
 const changes=op.kind==='shift-rank'?(op.delta>0?card.rank<op.maximum:card.rank>op.minimum):op.kind==='set-suit'?card.suit!==op.suit:op.kind==='set-enhancement'?card.enhancement!==op.enhancement:true;
 return {eligible:true,changes,reason:changes?'':'此牌本身无变化'};
}
export function toolCardMatches(card:PlayingCard,rank:string,suit:string):boolean{return (!rank||String(card.rank)===rank)&&(!suit||card.suit===suit as Suit);}
