import type {R2RunState} from '../domain/r2Run';
import {r2JokerDefinitionFor} from '../domain/r2ContentProfiles';
import {Rational} from '../domain/rational';
import {HAND_LABELS} from '../content/handLabels';
import {fractionText} from './scoreText';
import {jokerArtPreviewUrl} from './jokerArt';
export interface BuildGrowthProgress {instanceId:string;definitionId:string;name:string;key:string;current:string;metric:string;cause:string;next:string;before?:string;after?:string;url?:string}
/** Authoritative holdings plus the saved instance ledger, never a score/hand forecast or new history. */
export function buildGrowthProgress(state:R2RunState):BuildGrowthProgress[]{
 const rows:BuildGrowthProgress[]=[];
 for(const j of state.jokers){
  const d=r2JokerDefinitionFor(state,j.definitionId),ops=d.hooks.flatMap(h=>h.operations);
  for(const read of ops.filter(o=>o.kind==='read-growth'||o.kind==='read-coefficient')){
   if(read.kind!=='read-growth'&&read.kind!=='read-coefficient'||rows.some(r=>r.instanceId===j.instanceId&&r.key===read.key))continue;
   const zero={n:'0',d:'1'},value=j.growth[read.key]??(read.kind==='read-growth'?zero:undefined);if(!value)continue;
   const unit=read.kind==='read-coefficient'?'倍率':read.target==='heat'?'热度':'倍率',prefix=read.kind==='read-coefficient'?'×':'+';
   const write=d.hooks.find(h=>h.operations.some(o=>['add-growth','add-coefficient','multiply-coefficient-once','update-score-growth'].includes(o.kind)&&'key' in o&&o.key===read.key));if(!write)continue;
   const c=write.condition,next=c.kind==='hand-type-in'?'下手试'+c.values.slice(0,2).map(t=>HAND_LABELS[t]).join('／'):c.kind==='held-count'?'下手留'+c.minimum+'张再试':'下手按来源条件再试';
   const row:BuildGrowthProgress={instanceId:j.instanceId,definitionId:j.definitionId,name:d.name,key:read.key,current:fractionText(value),metric:'已积攒 '+prefix+fractionText(value)+' '+unit,cause:'从当前保存值继续培养',next,url:jokerArtPreviewUrl(j.definitionId)};
   const t=state.lastTrace,source=t?.sourceJokers.find(x=>x.instanceId===j.instanceId&&x.definitionId===j.definitionId),after=t?.jokers.find(x=>x.instanceId===j.instanceId&&x.definitionId===j.definitionId),events=t?.events.filter(e=>e.sourceType==='joker'&&e.sourceInstanceId===j.instanceId&&e.sourceDefinitionId===j.definitionId&&['add-growth','add-coefficient','multiply-coefficient','reset-growth'].includes(e.operation));
   if(t&&source&&after&&events?.length){
    const b=source.growth[read.key]??(read.kind==='read-growth'?zero:undefined),a=after.growth[read.key]??(read.kind==='read-growth'?zero:undefined);
    if(b&&a&&Rational.fromJSON(a).compare(Rational.fromJSON(b))>0){row.before=fractionText(b);row.after=fractionText(a);row.cause='上手'+HAND_LABELS[t.handType]+'促成 '+row.before+' → '+row.after;}
    else if(b&&a&&Rational.fromJSON(a).compare(Rational.fromJSON(b))<0&&events.some(e=>e.operation==='reset-growth')){row.before=fractionText(b);row.after=fractionText(a);row.cause='上手归零 '+row.before+' → '+row.after;}
    else row.cause='上手未新增，现存 '+row.current;
   }else if(t&&source&&after)row.cause='上手未新增，现存 '+row.current;
   rows.push(row);
  }
 }
 return rows;
}
