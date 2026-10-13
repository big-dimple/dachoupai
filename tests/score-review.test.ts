import {describe,expect,it} from 'vitest';
import {createRun} from '../src/domain/run';
import {newRunIdentity} from '../src/game/RunLaunch';
import {r2CreateJoker} from '../src/domain/r2Run';
import {r2JokerDefinitionsFor} from '../src/domain/r2ContentProfiles';
import {scoreR2Hand,type ScoreInput} from '../src/domain/scoreR2';
import {SeededRng} from '../src/core/SeededRng';
import type {PlayingCard} from '../src/cards/types';
import {formatScoreReview,reviewOperationText,reviewScoreText} from '../src/game/ScoreReview';
import {exactFractionText} from '../src/game/scoreText';
const run=()=>createRun({seed:'review-only',runId:'review-only',characterId:'xiemu',rulesVersion:'r2',r2Identity:newRunIdentity('xiemu','straight'),openingRoute:'straight',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
function fixture(extra:Partial<ScoreInput>={}){
 const state=run(),hand:PlayingCard[]=[3,4,5,6,7].map((rank,i)=>({id:'p/'+i,rank:rank as PlayingCard['rank'],suit:'hearts',enhancement:'multiplier-paper'}));
 const input:ScoreInput={rulesVersion:'r2',runId:state.runId,rootId:'saved-review',characterId:'neutral',hand,selectedIds:hand.map(c=>c.id),disabledIds:[],jokers:[],definitions:r2JokerDefinitionsFor(state),handLevels:{},playIndex:1,handsBeforePlay:4,previousHandType:null,wager:false,rng:new SeededRng('review-only').snapshot(),amoScoreTiming:'assist-v1',routeGrowth:{clears:21,G:0,S:21,F:21},...extra};
 return {state,input,trace:scoreR2Hand(input)};
}
const visible=(review:ReturnType<typeof formatScoreReview>)=>review.title+'\n'+review.summary+'\n'+review.cards.map(c=>c.title+'\n'+c.body).join('\n');
describe('saved score review display only',()=>{
 it('uses readable decimals, preserves full fractions/raw ordered events, never mutates trace/state',()=>{
  const {state,trace}=fixture(),before=structuredClone({state,trace}),review=formatScoreReview(state,trace),text=visible(review);
  expect(text).toContain('≈');expect(text).not.toContain('精确倍率');expect(text).not.toContain(trace.accumulator.M.n+'/'+trace.accumulator.M.d);
  expect(text).not.toMatch(/route-growth|add-multiplier|reasonKey|eventId|e\+|1\.35\^/);
  expect(review.diagnostics).toContain('精确倍率 '+exactFractionText(trace.accumulator.M));expect(review.diagnostics).toContain('= '+trace.finalScore);
  expect(review.diagnostics.split('\n\n').slice(4)).toEqual(trace.events.map(e=>JSON.stringify(e)));
  expect({state,trace}).toEqual(before);
 });
 it('keeps each actually read family and historic count without inventing future rates/caps',()=>{
  const {state,trace}=fixture(),review=formatScoreReview(state,trace);
  const source=review.cards.filter(c=>c.title.startsWith('本局'));expect(source.map(c=>c.title)).toEqual(['本局顺子清场加成 · 本手计分','本局同花清场加成 · 本手计分']);
  for(const card of source){expect(card.body).toContain('此前21场');expect(card.body).toContain('不属于某张丑牌');expect(card.body).toContain('实际读取 1 次');expect(card.body).not.toContain('上限');}
  const only=structuredClone(trace);only.events=only.events.filter(e=>e.routeFamily!=='F');expect(formatScoreReview(state,only).cards.filter(c=>c.title.startsWith('本局'))).toHaveLength(1);
 });
 it('counts operation executions, not matching conditions, and separates same-named instances',()=>{
  const state=run(),j=r2CreateJoker('c07','one',8,undefined,state),j2=r2CreateJoker('c07','two',8,undefined,state);
  const {trace}=fixture({jokers:[j,j2]});const review=formatScoreReview(state,trace);
  const cards=review.cards.filter(c=>c.title.startsWith(r2JokerDefinitionsFor(state).find(d=>d.id==='c07')!.name));expect(cards.length).toBe(2);
  for(const card of cards){expect(card.body).toContain('额外再计分 1 次 · 实际触发 1 次');}
  const repeated=fixture({jokers:[r2CreateJoker('c02','red-one',4,undefined,state),r2CreateJoker('c02','red-two',4,undefined,state)]});
  const red=formatScoreReview(state,repeated.trace).cards.filter(c=>c.title.startsWith('红线'));expect(red).toHaveLength(2);for(const card of red)expect(card.body).toContain('+8 热度 · 实际触发 5 次');
  const zero=fixture({jokers:[r2CreateJoker('b10','unmet',4,undefined,state)]});
  expect(formatScoreReview(zero.state,zero.trace).cards.some(c=>c.title.includes(r2JokerDefinitionsFor(state).find(d=>d.id==='b10')!.name)&&c.body.includes('实际触发'))).toBe(false);
 });
 it('distinguishes random checks/misses, retriggers, and after-hand growth from scoring',()=>{
  const {state,trace}=fixture({jokers:[r2CreateJoker('c04','growth',4,undefined,run())]});
  const gain=trace.events.find(e=>e.operation==='add-growth')!,before=structuredClone(gain);
  expect(reviewOperationText(state,gain)).toContain('下手生效');expect(gain).toEqual(before);
  const review=formatScoreReview(state,trace);expect(review.cards.find(c=>c.title.includes('结算后记录'))?.body).toContain('实际记录 1 次');
  const check={...trace.events[1],operation:'lucky-multiplier-check',value:{n:'0',d:'1'}};
  const changed={...trace,events:[trace.events[0],check,trace.events.at(-1)!]};
  const card=formatScoreReview(state,changed).cards.find(c=>c.body.includes('实际检查'))!;expect(card.body).toContain('未命中');expect(card.body).toContain('实际检查 1 次');expect(card.body).not.toContain('实际触发');
 });
 it('formats read-coefficients/growth values without giant fractions or copying live growth',()=>{
  const {state,trace}=fixture(),event={...trace.events[1],operation:'multiply-coefficient',phase:'afterHand' as const,value:{n:'9',d:'8'},growthBefore:{n:'123456789012345678901234567890',d:'12345678901234567890123456789'},growthAfter:{n:'1111111101111111110111111111010',d:'98765431209876543120987654312'}};
  const text=reviewOperationText(state,event);expect(text).not.toContain('/');expect(text).toContain('下一次出牌生效');expect(text).toContain('≈');
 });
 it('keeps saved attribution after selling a source or changing current cash',()=>{
  const state=run(),j=r2CreateJoker('c04','sold',4,undefined,state),{trace}=fixture({jokers:[j]});
  const before=formatScoreReview(state,trace);state.jokers=[];state.gold=0;
  expect(formatScoreReview(state,trace)).toEqual(before);expect(before.cards.some(c=>c.title.startsWith('搭台阶'))).toBe(true);
 });
 it('marks big integer approximation and leaves exact integer receipt in diagnostics',()=>{
  expect(reviewScoreText('1234567890123456')).toBe('≈1.23e15');expect(reviewScoreText('1230000000000000')).toBe('1.23e15');expect(reviewScoreText('123456')).toBe('123,456');
  const {state,trace}=fixture(),large={...trace,finalScore:'123456789012345678901234567890',accumulator:{H:{n:'1'+'0'.repeat(400),d:'3'},M:{n:'1234567890123456789',d:'7'}}},review=formatScoreReview(state,large);
  expect(review.title).toContain('≈1.23e29');expect(review.summary).toContain('e399');expect(review.diagnostics).toContain(large.finalScore);
 });
});
