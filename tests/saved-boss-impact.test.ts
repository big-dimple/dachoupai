import {describe,it,expect} from 'vitest';
import {createRun} from '../src/domain/run';
import {newRunIdentity} from '../src/game/RunLaunch';
import {r2JokerDefinitionsFor} from '../src/domain/r2ContentProfiles';
import {scoreR2Hand,type ScoreInput} from '../src/domain/scoreR2';
import {savedBossImpact} from '../src/game/SavedBossImpact';
const run=createRun({seed:'saved-impact-current',runId:'saved-impact',characterId:'erxiang',rulesVersion:'r2',r2Identity:newRunIdentity('erxiang','group'),openingRoute:'group',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
const hand=[2,4,6,10,12].map(rank=>run.deckInstances.find(c=>c.suit==='diamonds'&&c.rank===rank)!);
function score(extra:Partial<ScoreInput>={}){return scoreR2Hand({rulesVersion:'r2',runId:run.runId,rootId:'impact/hand',characterId:'erxiang',hand,selectedIds:hand.map(c=>c.id),disabledIds:[],jokers:[],definitions:r2JokerDefinitionsFor(run),handLevels:{},playIndex:1,handsBeforePlay:4,previousHandType:null,wager:false,rng:run.rng.rule,...extra});}
const boss=(definitionId:NonNullable<ScoreInput['boss']>['definitionId'])=>({definitionId,disabledSuit:null});
describe('saved Boss scoring impact, current identity',()=>{
 it('names actual ordinary-point targets without denying their other effects',()=>{
  const t=score({boss:boss('B02'),ordinaryPointsSuppressedIds:hand.slice(3).map(c=>c.id)}),before=JSON.stringify({run,t}),copy=savedBossImpact(run,t);
  expect(copy).toContain('低调点');expect(copy).toContain('10♦、Q♦ 普通点数归零');expect(copy).toContain('仍可成型和触发大丑牌效果');expect(copy).not.toContain('计分失效');expect(JSON.stringify({run,t})).toBe(before);
 });
 it('does not claim suppression if the saved hand has no suppressed targets',()=>expect(savedBossImpact(run,score({boss:boss('B02'),selectedIds:hand.slice(0,3).map(c=>c.id)}))).toBe(''));
 it('reads a real base reduction and distinguishes repeated from first/different hands',()=>{
  expect(savedBossImpact(run,score({boss:boss('B05'),previousHandType:'flush'}))).toContain('140 → 70');
  for(const previousHandType of [null,'pair'] as const)expect(savedBossImpact(run,score({boss:boss('B05'),previousHandType}))).toBe('');
  expect(savedBossImpact(run,score({boss:boss('B12')}))).toContain('140 → 70');
 });
 it('identifies only cards in the saved scoring set that actually lost scoring',()=>{
  const t=score({boss:boss('B04'),disabledIds:[hand[4].id]});expect(savedBossImpact(run,t)).toContain('Q♦ 计分失效');expect(savedBossImpact(run,t)).toContain('仍参与牌型');expect(savedBossImpact(run,t)).not.toContain('10♦ 计分失效');
 });
 it('uses saved source order and seals after the live inventory/seals have changed',()=>{
  const jokers=['b10','b11'].map(id=>({instanceId:'owned/'+id,definitionId:id,paidPrice:4,growth:{}}));
  const t=score({boss:boss('B06'),jokers}),live=structuredClone(run);live.jokers=[...jokers].reverse();live.boss=boss('B01');expect(savedBossImpact(live,t)).toContain('候场同伴 本手计分与版次停用');expect(savedBossImpact(live,t)).not.toContain('练对子 本手计分');
  const sealed=score({boss:boss('B15'),jokers,sealedJokerIds:[jokers[0].instanceId]});live.jokers=[];expect(savedBossImpact(live,sealed)).toContain('练对子 本手计分与版次停用');expect(savedBossImpact(live,sealed)).toContain('结算后成长保持原规则');
 });
 it('shows saved role restrictions without inventing lost scores or a failure cause',()=>{
  const copy=savedBossImpact(run,score({boss:boss('B08')}));expect(copy).toContain('角色计分能力与押注停用');expect(copy).not.toMatch(/失败|本可|损失.*热度/);
 });
 it('does not reuse a live/next Boss for an ordinary saved hand',()=>expect(savedBossImpact({...run,boss:boss('B12')},score())).toBe(''));
});
