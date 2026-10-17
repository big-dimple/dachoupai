import {it,expect} from 'vitest';
import {R2_TOOLS} from '../src/content/r2Tools';
import {createRun} from '../src/domain/run';
import {r2CreateJoker} from '../src/domain/r2Run';
import {r2JokerDefinitionFor} from '../src/domain/r2ContentProfiles';
import {newRunIdentity} from '../src/game/RunLaunch';
import {jokerAbilityCopyForRun,publicJokerMemoryContext} from '../src/game/JokerMemory';
import {r2JokerStateText} from '../src/game/r2Help';
import {shopRouteRelation} from '../src/game/ShopRouteRelations';
import {toolUseCost} from '../src/game/r2ToolInfo';
import {findShopSynergy} from '../src/game/ShopSynergy';

const setup=(characterId:'erxiang'|'touye'='erxiang')=>createRun({rulesVersion:'r2',seed:'player-copy-closeout',runId:'player-copy-closeout',characterId,r2Identity:newRunIdentity(characterId,'flush'),openingRoute:'flush'});
it('c06 separates one effect, growth timing and the actual zero or carried multiplier',()=>{
 const s=setup(),d=r2JokerDefinitionFor(s,'c06'),j=r2CreateJoker('c06','held',6,'none',s),ctx=publicJokerMemoryContext(s,{hand:[],scoringLimited:false,deckSize:52,jokerSlots:5,jokerCount:1});
 const fresh=jokerAbilityCopyForRun(s,'c06',undefined,ctx).plain!;expect(fresh.status).toBe('未购买；买入后倍率成长从+0开始');
 for(const stored of ['0','2']){
  j.growth.multiplier={n:stored,d:'1'};const before=structuredClone({s,j}),p=jokerAbilityCopyForRun(s,'c06',j,ctx).plain!;
  expect(p.effectLine).toContain('倍率成长');expect(p.effectLine).not.toMatch(/同花|下一手/);expect(p.timingLine).toContain('同花');expect(p.timingLine).toContain('新增下一手生效');expect(p.timingLine).toContain('已有成长每手可用');
  expect(p.status).toBe('已存倍率+'+stored);expect(r2JokerStateText(j,d)).toContain('倍率成长 '+stored);expect(p.timingLine).toContain('同花葫芦');expect(p.timingLine).toContain('同花五条');expect(p.essential).not.toContain('同花葫芦、同花五条也增加成长');expect(p.details).toContain('同花葫芦、同花五条也增加成长');expect(p.details).toContain('出售后丢失');expect({s,j}).toEqual(before);
 }
 const relation=shopRouteRelation(s,j,'flush');expect(relation.body.split(d.description)).toHaveLength(2);expect(relation.body).not.toMatch(/保存事件|用途不表示|对应动作|实例/);
 j.growth={};expect(r2JokerStateText(j,d)).toContain('倍率成长 0');
});
it('legacy c06 exclusions remain visible instead of being mistaken for duplicate inclusions',()=>{
 const s=createRun({rulesVersion:'r2',r2Profile:'group-upgrade-v1',seed:'legacy-c06-exclusions',runId:'legacy-c06-exclusions',characterId:'erxiang'}),j=r2CreateJoker('c06','held',6,'none',s),ctx=publicJokerMemoryContext(s,{hand:[],scoringLimited:false,deckSize:52,jokerSlots:5,jokerCount:1});
 const p=jokerAbilityCopyForRun(s,'c06',j,ctx).plain!;expect(p.essential).toContain('同花葫芦、同花五条不增加成长');expect(p.timingLine).not.toContain('同花葫芦');
});
it('a scoring ban stays explicit while growth timing remains visible',()=>{
 const s=setup(),j=r2CreateJoker('c06','held',6,'none',s),ctx=publicJokerMemoryContext(s,{hand:[],scoringLimited:true,deckSize:52,jokerSlots:5,jokerCount:1}),p=jokerAbilityCopyForRun(s,'c06',j,ctx).plain!;
 expect(p.status).toContain('计分停用');expect(p.status).toContain('本手不计入');expect(p.timingLine).toContain('新增下一手生效');
});
it('owned tools show the use cost separately and retain permanent sacrifice and penalty facts',()=>{
 const use=(id:string)=>toolUseCost(R2_TOOLS.find(t=>t.id===id)!);
 expect(use('S02')).toContain('5金');expect(use('S02')).not.toContain('售价');expect(use('S03')).toContain('永久出牌次数');expect(use('S04')).toContain('永久手牌上限');expect(use('S07')).toContain('永久牺牲');expect(use('S03')).toContain('成功后消耗1件工具');
});
it('the Qin Qiong no-discard tradeoff survives player-copy shortening without a gold synergy',()=>{
 const s=setup('touye');s.gold=28;s.jokers=[r2CreateJoker('b10','held',4,'none',s)];s.shop!.offers=[{offerId:'f09',definitionId:'f09',price:6,edition:'none',consumed:false}];
 expect(findShopSynergy(s,'f09')).toMatchObject({hasSynergy:false,heroSynergy:false,tradeoff:'走不弃牌打法可用；发动秦琼弃牌技能会停用本场加成。'});
});
