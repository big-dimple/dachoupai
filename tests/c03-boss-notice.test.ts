import {describe,expect,it} from 'vitest';
import {createDeck} from '../src/cards/deck';
import type {R2JokerInstance} from '../src/content/r2Schema';
import type {R2BossId} from '../src/domain/r2Chapter';
import {stageNotice,type StageNotice,type StageNoticeInput} from '../src/game/stageNotice';

const ids=['hearts-11','hearts-14','clubs-12','diamonds-13','spades-2'];
const owned=(definitionId:string):R2JokerInstance=>({instanceId:`owned/${definitionId}`,definitionId,paidPrice:4,growth:{}});
const fixture=(id:R2BossId):StageNoticeInput=>({phase:'await-input',stageIndex:20,boss:{definitionId:'B04',disabledSuit:null},deckInstances:createDeck(),handOrder:[...ids],stage:{
  index:20,targetHeat:'140000',initialTargetHeat:'140000',heat:'0',handsLeft:4,discardsLeft:3,playIndex:0,previousHandType:null,clearId:null,goldEarned:0,disabledIds:[],
  wagerSelected:false,wagerUsed:false,discardsUsed:0,skipResult:null,handLimit:8,previousHandScore:null,rescueUsed:false,
  initialHands:4,initialDiscards:3,discardSpent:0,discardGained:0,doubleDiscardBeforeFirstPlay:id==='B01',
  maxPlayedCount:0,ordinaryStraightSeen:false,ordinaryFlushSeen:false,quadRefundUsed:false,jokerSold:false,
  boss:{definitionId:id,disabledSuit:id==='B03'?'hearts':null},initialHandLimit:8,initialJokerIds:[],sealedJokerIds:[],
}});
const notice=(run:StageNoticeInput,selected:readonly string[]=ids):StageNotice=>stageNotice(run,selected)!;
const withJokers=(id:R2BossId,definitions:readonly string[])=>({...fixture(id),jokers:definitions.map(owned)});

describe('C03 compact sixteen-Boss entered-stage notices',()=>{
  it.each([
    ['B01','贵宾场'],['B02','低调点'],['B03','单色灯'],['B04','素颜场'],['B05','回音墙'],['B06','半边灯'],['B07','验票员'],['B08','静场'],
    ['B09','快板'],['B10','小舞台'],['B11','谢客'],['B12','挑剔'],['B13','逆着来'],['B14','催场'],['B15','逐个谢幕'],['B16','不吃名气'],
  ] as const)('%s reads the entry snapshot and supplies a short hint plus separately accessible response',(id,name)=>{
    const result=notice(fixture(id));expect(result).toBeDefined();expect(result.title.startsWith(name+' · ')).toBe(true);
    expect(result.description.length).toBeLessThanOrEqual(80);expect(result.details).toContain('应对：');
    expect(result.details.length).toBeGreaterThan(result.description.length);
    expect(result.disabledJokerIds).toEqual([]);expect(result.discardGoldCost).toBe(id==='B07'?1:0);
    expect(result.wagerDisabled).toBe(id==='B08');expect(result.jokerScoreDirection).toBe(id==='B13'?'right-to-left':'left-to-right');
    expect(result.targetIncreasePerDiscard).toBe(id==='B14'?'7000':'0');
  });
  it('B03 uses the entered heart parameter while a newer chapter forecast points to spades',()=>{
    const run=fixture('B03');run.boss={definitionId:'B03',disabledSuit:'spades'};run.stageIndex=21;
    const result=notice(run);expect(result.stageIndex).toBe(20);expect(result.symbol).toBe('♥');
    expect(result.disabledCardIds).toEqual(['hearts-11','hearts-14']);expect(result.details).toContain('♥');
  });
  it('never reads a forecast Boss or a hidden RNG cursor to present the current stage',()=>{
    const run=fixture('B12');Object.defineProperty(run,'boss',{get(){throw Error('notice-read-future-boss');}});
    Object.defineProperty(run,'rng',{get(){throw Error('notice-read-rule-rng');}});
    expect(notice(run).title).toContain('挑剔');
  });
  it('B05 names the previous type, distinguishes the first hand and explains only base heat halves',()=>{
    const run=fixture('B05');expect(notice(run).title).toContain('首手');
    run.stage!.previousHandType='pair';run.stage!.playIndex=1;
    const result=notice(run);expect(result.title).toContain('对子');expect(result.description).toContain('基础');
    expect(result.details).toContain('普通点数');expect(result.details).toContain('首手不减');
  });
  it('B06 reports current second/fourth instances and changes correctly after a public slot reorder',()=>{
    const run=withJokers('B06',['pengci','c05','f06','e02','tiesuanpan']);
    expect(notice(run).disabledJokerIds).toEqual(['owned/c05','owned/e02']);
    [run.jokers[0],run.jokers[1]]=[run.jokers[1],run.jokers[0]];
    expect(notice(run).disabledJokerIds).toEqual(['owned/pengci','owned/e02']);expect(notice(run).details).toContain('静态资源和经济');
  });
  it('keeps B09 hands-minus-one and B10 hand-capacity-minus-two separate',()=>{
    const quick=fixture('B09');quick.stage!.initialHands=3;quick.stage!.handsLeft=2;
    const smaller=fixture('B10');smaller.stage!.handLimit=6;smaller.stage!.initialHandLimit=6;
    expect(notice(quick).title).toContain('出牌−1');expect(notice(quick).description).toContain('3次');expect(notice(quick).details).toContain('最低2');
    expect(notice(smaller).title).toContain('手牌−2');expect(notice(smaller).description).toContain('6张');expect(notice(smaller).details).toContain('最低5');
  });
  it('B11 displays the actual saved capacity and limits refilling rather than deleting held cards',()=>{
    const run=fixture('B11');run.stage!.playIndex=2;run.stage!.handLimit=6;
    const result=notice(run);expect(result.title).toContain('上限6');expect(result.description).toContain('补牌');expect(result.details).toContain('不额外删除持牌');
    expect(run.handOrder).toEqual(ids);
  });
  it('B07 exposes one discard coin fee, B08 exposes a stopped wager and B12 exposes base-only half',()=>{
    expect(notice(fixture('B07'))).toMatchObject({discardGoldCost:1,discardCost:1});expect(notice(fixture('B07')).details).toContain('无钱仍可正常出牌');
    expect(notice(fixture('B08'))).toMatchObject({wagerDisabled:true});expect(notice(fixture('B08')).details).toContain('非计分过关奖励保留');
    expect(notice(fixture('B12')).description).toContain('基础');expect(notice(fixture('B12')).details).toContain('增强');
  });
  it('B13 only directs Joker scoring right-to-left and keeps other hook order in the detail',()=>{
    const result=notice(fixture('B13'));expect(result.symbol).toBe('←');expect(result.jokerScoreDirection).toBe('right-to-left');
    expect(result.details).toContain('本体和版次一起反序');expect(result.details).toContain('其他时点保持原序');
  });
  it('B14 announces the same fixed initial-target increment after repeated discards',()=>{
    const run=fixture('B14');run.stage!.discardsUsed=2;run.stage!.targetHeat='154000';
    const result=notice(run);expect(result.targetIncreasePerDiscard).toBe('7000');expect(result.description).toContain('7,000');
    expect(result.details).toContain('不复利');expect(result.details).toContain('返还弃牌额度仍计一次');
  });
  it('B15 follows sealed IDs after reorder and excludes a destroyed seal from live frame markers',()=>{
    const run=withJokers('B15',['pengci','c05','f06']);run.stage!.sealedJokerIds=['owned/f06','owned/c05'];
    expect(notice(run).disabledJokerIds).toEqual(['owned/c05','owned/f06']);
    run.jokers.reverse();expect(notice(run).disabledJokerIds).toEqual(['owned/f06','owned/c05']);
    run.jokers=run.jokers.filter(joker=>joker.definitionId!=='f06');expect(notice(run).disabledJokerIds).toEqual(['owned/c05']);
    expect(run.stage!.sealedJokerIds).toEqual(['owned/f06','owned/c05']);expect(notice(run).details).toContain('已封禁实例不会因调序恢复');
  });
  it('B16 marks rare instances including static C09 while explaining that static and economy still work',()=>{
    const run=withJokers('B16',['pengci','c05','f06','c09','tiesuanpan']);
    expect(notice(run).disabledJokerIds).toEqual(['owned/f06','owned/c09']);expect(notice(run).details).toContain('静态资源和经济效果保留');
  });
  it('ordinary stages publish all normal defaults regardless of the chapter Boss and stale selection',()=>{
    const run=withJokers('B16',['f06']);run.stage!.index=19;run.stage!.boss=null;
    expect(notice(run)).toMatchObject({warning:false,disabledCardIds:[],ordinarySuppressedIds:[],disabledJokerIds:[],wagerDisabled:false,jokerScoreDirection:'left-to-right',discardGoldCost:0,targetIncreasePerDiscard:'0'});
  });
  it('a missing entered Boss never guesses the restriction from the next chapter forecast',()=>{
    const run=fixture('B04');run.stage!.boss=null;expect(notice(run)).toMatchObject({warning:false,disabledCardIds:[],disabledJokerIds:[]});
  });
  it('ends all live notices outside await-input and never changes state/order while rendering',()=>{
    const run=withJokers('B06',['f06','c05']),selected=[...ids].reverse(),before=JSON.stringify({run,selected});
    notice(run,selected);expect(JSON.stringify({run,selected})).toBe(before);
    for(const phase of ['shop','stage-ready','stage-cleared','run-lost','run-won'] as const)expect(stageNotice({...run,phase})).toBeUndefined();
  });
});
