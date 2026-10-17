import {expect,it} from 'vitest';
import {scoreContributions} from '../src/game/ScoreContribution';
import {scoreLineSegments} from '../src/game/ScoreGeometry';
import type {ScoreEvent} from '../src/domain/scoreR2';
const f=(n:string,d='1')=>({n,d});
const event:ScoreEvent={eventId:'local/1',rootId:'local',rootEventId:'local/1',phase:'jokerScore',sourceType:'joker',sourceDefinitionId:'f09',sourceInstanceId:'owned/f09',operation:'multiply-multiplier',value:f('3','2'),before:{H:f('20'),M:f('4')},after:{H:f('20'),M:f('6')},reasonKey:'test',visibleCondition:{kind:'always'},retriggerDepth:0};
it('shows committed heat/add/multiply values, including a falling factor and route multiplier',()=>{
  expect(scoreContributions(event)[0]).toMatchObject({target:'M',kind:'multiply',label:'×1.5',exact:'倍率 4 → 6'});
  expect(scoreContributions({...event,operation:'route-factor'})[0].label).toBe('×1.5');
  expect(scoreContributions({...event,after:{H:f('20'),M:f('17','5')}})[0].label).toBe('×0.85');
  expect(scoreContributions({...event,operation:'add-multiplier'})[0]).toMatchObject({kind:'add',label:'+2'});
  expect(scoreContributions({...event,operation:'add-heat',after:{H:f('27'),M:f('4')}})[0]).toMatchObject({target:'H',kind:'heat',label:'+7'});
  expect(scoreContributions({...event,phase:'afterHand',operation:'add-growth'})).toEqual([]);
});
it('clips source lines at protected digits rather than painting across them',()=>{
  expect(scoreLineSegments({x:0,y:10},{x:100,y:10},[{x:20,y:0,width:20,height:30},{x:70,y:0,width:10,height:30}])).toEqual([[{x:0,y:10},{x:20,y:10}],[{x:40,y:10},{x:70,y:10}],[{x:80,y:10},{x:100,y:10}]]);
  expect(scoreLineSegments({x:25,y:10},{x:25,y:20},[{x:20,y:0,width:20,height:30}])).toEqual([]);
});
