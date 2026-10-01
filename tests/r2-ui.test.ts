import {expect,it} from 'vitest';
import {r2ScoreOperationText,r2TransactionText} from '../src/game/r2Help';
import type {ScoreEvent} from '../src/domain/scoreR2';

const event=(operation:string,phase:ScoreEvent['phase']='jokerScore'):ScoreEvent=>({
  eventId:'event/ui',rootId:'hand/ui',rootEventId:'event/ui',phase,sourceType:'joker',sourceDefinitionId:'c05',sourceInstanceId:'joker/original',
  operation,value:{n:'40',d:'1'},before:{H:{n:'20',d:'1'},M:{n:'1',d:'1'}},after:{H:{n:'60',d:'1'},M:{n:'1',d:'1'}},
  reasonKey:'c05',visibleCondition:{kind:'always'},retriggerDepth:0,
});

it('distinguishes stored heat consumed now from growth for the next hand',()=>{
  const consumed=r2ScoreOperationText(event('consume-growth'));
  expect(consumed).toContain('40');expect(consumed).toContain('热度');expect(consumed).toMatch(/消费|清空/);expect(consumed).not.toMatch(/倍率|下手/);
  const growth=r2ScoreOperationText({...event('add-growth','afterHand'),after:event('add-growth').before});
  expect(growth).toContain('下手');
  expect(r2ScoreOperationText({...event('reset-growth','afterHand'),value:{n:'0',d:'1'}})).toContain('归零');
});

it('explains rescue resources and instance destruction without presenting them as score',()=>{
  const rescue=r2ScoreOperationText({...event('rescue-hand','beforeFailure'),sourceDefinitionId:'f07',value:{n:'1',d:'1'},after:event('rescue-hand').before,resourceBefore:0,resourceAfter:1});
  expect(rescue).toContain('出牌');expect(rescue).toContain('0 → 1');expect(rescue).not.toContain('倍率');
  expect(r2ScoreOperationText({...event('destroy-joker','afterHand'),sourceDefinitionId:'f06',value:{n:'0',d:'1'},after:event('destroy-joker').before})).toContain('销毁');
  const gold=r2ScoreOperationText({...event('add-gold','onStageClear'),sourceDefinitionId:'b08',value:{n:'2',d:'1'},after:event('add-gold').before,resourceBefore:9,resourceAfter:11});
  expect(gold).toContain('金');expect(gold).toContain('9 → 11');expect(gold).not.toMatch(/倍率|热度/);
});

it('uses the committed transaction delta and identifies the surviving growth source',()=>{
  const transaction={type:'joker-transaction' as const,phase:'onSellJoker' as const,definitionId:'e06',instanceId:'joker/survivor',operation:'add-growth',amount:'1/2'};
  const text=r2TransactionText(transaction);
  expect(text).toContain('旧物新用');expect(text).toContain('0.5');expect(text).toContain('成长');
});
