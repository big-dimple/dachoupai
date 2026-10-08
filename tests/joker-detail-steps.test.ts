import {it,expect} from 'vitest';
import {jokerAbilityCopyForRun,publicJokerMemoryContext} from '../src/game/JokerMemory';
import {r2JokerDefinitionsFor} from '../src/domain/r2ContentProfiles';
import {createRun} from '../src/domain/run';
import {R2_PUBLISHED_CONTENT} from '../src/domain/r2PublishedContent';
import {R2_ASSIST_VERSION,R2_ASSIST_HASH} from '../src/domain/r2AssistIdentity';
import {R2_COMBO_GROWTH_VERSION,R2_COMBO_GROWTH_HASH} from '../src/domain/r2ComboGrowth';
import {R2_GROUP_UPGRADE_VERSION,R2_GROUP_UPGRADE_HASH} from '../src/domain/r2GroupUpgrade';
const identities=[R2_PUBLISHED_CONTENT.v10,R2_PUBLISHED_CONTENT.v11,{version:R2_ASSIST_VERSION,hash:R2_ASSIST_HASH},{version:R2_COMBO_GROWTH_VERSION,hash:R2_COMBO_GROWTH_HASH},{version:R2_GROUP_UPGRADE_VERSION,hash:R2_GROUP_UPGRADE_HASH}].map(i=>({contentVersion:i.version,contentHash:i.hash}));
const s=createRun({rulesVersion:'r2',seed:'detail-steps',characterId:'amo',runId:'detail-steps'});
const ctx=publicJokerMemoryContext(s,{hand:[],scoringLimited:false,deckSize:52,jokerSlots:5,jokerCount:0});
const copy=(id:string,identity=identities.at(-1)!)=>jokerAbilityCopyForRun(identity,id,undefined,ctx).plain!;
const words=(text:string)=>text.replace(/[\s，；。]/g,'');
it('five identities preserve all default condition/effect words and limits across the shared grouping',()=>{
 for(const identity of identities)for(const d of r2JokerDefinitionsFor(identity)){
  const before=JSON.stringify({d,ctx}),p=copy(d.id,identity);
  if(p.fallback){expect(p.steps).toBeDefined();expect(words(p.steps!.steps.map(s=>s.when+s.effect).join(''))).toBe(words(p.line));for(const limit of p.essential.split(/\n|；/).filter(Boolean))expect(p.steps!.limits).toContain(limit);expect(p.steps!.status).toBe(p.status);expect(p.details).toContain(p.line);}
  else expect(p.steps).toBeUndefined();
  expect(JSON.stringify({d,ctx})).toBe(before);
 }
});
it('rescue groups startup and next-play payoff without losing qualification or mandatory consumption',()=>{
 for(const identity of identities.slice(-2)){
  const p=copy('f10',identity),rows=p.steps!;
  expect(rows.steps).toHaveLength(2);expect(rows.steps[0].when).toContain('本场未出牌');expect(rows.steps[0].when).toContain('第一次成功弃牌前');expect(rows.steps[0].effect).toContain('备好一次救火');expect(rows.steps[1].when).toContain('下一次出牌若为两对及以上');expect(rows.steps[1].effect).toContain('倍率×3');
  expect(rows.limits.join('\n')).toContain('计分被封禁也作废');expect(rows.limits.join('\n')).toContain('不重武装');expect(rows.limits).toContain('两对及以上：不含对子、高牌。');expect(rows.status).toContain('尚未购买');
 }
});
it('coefficient ceilings stay upfront for growth and reset families',()=>{
 for(const identity of identities.slice(2))for(const id of ['a06','e11']){
  const d=r2JokerDefinitionsFor(identity).find(d=>d.id===id)!,op=d.hooks.flatMap(h=>h.operations).find(o=>o.kind==='add-coefficient'||o.kind==='multiply-coefficient-once');if(!op){expect(copy(id,identity).steps!.limits.join('\n')).not.toContain('系数上限');continue;}if(!('cap'in op))throw Error('coefficient cap required');
  expect(copy(id,identity).steps!.limits.join('\n')).toContain('系数上限×');
 }
 expect(copy('e11').steps!.limits.join('\n')).toContain('卖出其他');
});
it('resource overflow and repeat-use restrictions survive progressive disclosure',()=>{
 expect(copy('e10').steps!.limits.join('\n')).toContain('放满');
 expect(copy('b06').steps!.limits.join('\n')).toContain('失效牌参与选组');
 expect(copy('c12').steps!.steps.map(s=>s.when+s.effect).join('')).toContain('过关');
 expect(copy('b10').steps).toBeUndefined();expect(copy('e03').steps).toBeUndefined();
});
