import {heroStageContinuity,type HeroStageContinuity} from './HeroStageContinuity';
import type {R2RunState} from '../domain/r2Run';
import {r2JokerDefinitionFor} from '../domain/r2ContentProfiles';
import {fractionText} from './scoreText';
import {r2RunModeConfig} from '../content/r2Modes';
import {characterForRun} from './CharacterRunCopy';
import {selectionPortraitURL} from './portraits';
import {buildGrowthProgress,type BuildGrowthProgress} from './BuildGrowthProgress';
export interface BuildKeepsake {
 terminal?:boolean;
 continuity?:HeroStageContinuity;
 hero:{name:string;ability:string;tip:string;details?:string;url:string;modeNote:string};
 growth:(BuildGrowthProgress&{read?:string})[];
}
/** Current identity and held instance ledger only; no command, forecast or invented history. */
export function buildKeepsake(state:R2RunState):BuildKeepsake {
 const hero=characterForRun(state),tip=hero.buildTip.split('。')[0]+'。';
 return {continuity:heroStageContinuity(state),hero:{name:hero.name,ability:hero.passiveName,tip,details:tip===hero.buildTip?undefined:hero.buildTip,url:selectionPortraitURL(state.characterId),modeNote:r2RunModeConfig(state).characterAbilityEnabled?'打法提示 · 能否使用按本场条件':'本模式角色能力停用 · 不产生角色收益'},growth:buildGrowthProgress(state).map(row=>{
  const trace=state.lastTrace;if(!trace?.sourceJokers.some(j=>j.instanceId===row.instanceId&&j.definitionId===row.definitionId)||!trace.jokers.some(j=>j.instanceId===row.instanceId&&j.definitionId===row.definitionId))return row;
  const ops=r2JokerDefinitionFor(state,row.definitionId).hooks.flatMap(h=>h.operations).filter(o=>o.kind==='read-growth'||o.kind==='read-coefficient');
  if(new Set(ops.map(o=>'key' in o?o.key:'')).size!==1||new Set(ops.map(o=>o.kind+('target' in o?o.target:''))).size!==1)return {...row,read:'上手读取明细见该来源'};
  const op=ops.find(o=>'key' in o&&o.key===row.key);if(!op||op.kind!=='read-growth'&&op.kind!=='read-coefficient')return row;
  const reads=trace.events.filter(e=>e.sourceType==='joker'&&e.sourceInstanceId===row.instanceId&&e.sourceDefinitionId===row.definitionId&&e.operation===op.kind);
  const unit=op.kind==='read-coefficient'?'倍率':op.target==='heat'?'热度':'倍率',prefix=op.kind==='read-coefficient'?'×':'+';
  const read=reads.length?'上手实际读取 '+[...new Set(reads.map(e=>prefix+fractionText(e.value)))].join('／')+' '+unit+' · '+reads.length+'次':'上手未读取此成长 · 无该来源读取事件';
  return {...row,read};
 })};
}
