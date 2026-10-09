import type {R2RunState} from '../domain/r2Run';
import {heatText} from './scoreText';
import {buildKeepsake} from './BuildKeepsake';
import {r2JokerDefinitionFor} from '../domain/r2ContentProfiles';
import {jokerArtPreviewUrl} from './jokerArt';

/** A terminal portrait of saved holdings, not a purchase history or a replay of rewards. */
export function finaleKeepsake(run:R2RunState){
 if(!['run-won','run-lost'].includes(run.phase))return undefined;
 const live=run.deckInstances.filter(c=>!run.destroyedIds.includes(c.id)),keepsake=buildKeepsake(run);
 const summary=`累计 ${heatText(run.totalHeat)} 热度 · 余额 ${run.gold} 金\n牌组 ${live.length} 张 · 增强 ${live.filter(c=>c.enhancement!==undefined).length} 张 · 库存工具 ${run.consumables.length} 件`;
 const continuation=run.phase==='run-won'&&run.mode==='standard'&&run.normalCompletion?'继续无尽会保留这些牌、成长、工具和金币。返回选角不接续本局。':'本局已结束；同局重试从开局重新开始，不继承这份构筑。';
 keepsake.terminal=true;
 for(const row of keepsake.growth)row.next=run.phase==='run-won'&&run.mode==='standard'&&run.normalCompletion?'自愿接续无尽时，沿此保存值继续':'本局最终保存值；重试从开局重新培养';
 return {summary,continuation,keepsake,cards:run.jokers.map(j=>({title:r2JokerDefinitionFor(run,j.definitionId).name,url:jokerArtPreviewUrl(j.definitionId),body:keepsake.growth.filter(g=>g.instanceId===j.instanceId).map(g=>g.metric+'\n'+(g.read??'')+'\n'+g.cause).join('\n')||'本局最终持有 · 实际发动见最后一手',details:r2JokerDefinitionFor(run,j.definitionId).description}))};
}
