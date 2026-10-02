import {describe,expect,it} from 'vitest';
import {R2_JOKERS,type R2JokerInstance} from '../src/content/r2Schema';
import {previewR2Hand,r2ScoringDisabledJokerIds,scoreR2Hand,type ScoreInput} from '../src/domain/scoreR2';
import {cardAbilityCopy,type CardAbilityContext} from '../src/game/CardCopy';

const ids=['f09','f04','a03','pengci','huimaqiang'];
const owned=(id:string,edition:R2JokerInstance['edition']='none'):R2JokerInstance=>({instanceId:'owned/'+id,definitionId:id,paidPrice:6,growth:{},edition});
const base:Omit<ScoreInput,'rng'>={rulesVersion:'r2',runId:'copy',rootId:'copy/hand',characterId:'neutral',
  hand:[{id:'a',rank:2,suit:'spades'},{id:'b',rank:5,suit:'hearts'},{id:'c',rank:9,suit:'diamonds'}],selectedIds:['a'],disabledIds:[],
  jokers:ids.map(id=>owned(id)),definitions:R2_JOKERS,handLevels:{},playIndex:3,handsBeforePlay:4,previousHandType:null,wager:false,gold:3,discardsUsed:0};
const context=(input:typeof base,id:string):CardAbilityContext=>({gold:input.gold??0,discardsUsed:input.discardsUsed,inStage:true,
  playIndex:input.playIndex-1,selectedCount:input.selectedIds.length,instanceId:'owned/'+id,preview:previewR2Hand(input)});

describe('five Joker shared condition and benefit copy',()=>{
  it('keeps curated numeric benefits aligned with the official content and actual preview events',()=>{
    const before=JSON.stringify(base),preview=previewR2Hand(base);
    for(const id of ids){
      const copy=cardAbilityCopy(id,{...context(base,id),preview})!,operation=R2_JOKERS.find(def=>def.id===id)!.hooks[0].operations[0];
      if(operation.kind!=='add-heat'&&operation.kind!=='add-multiplier'&&operation.kind!=='multiply-multiplier')throw Error('unexpected sample operation');
      const target=operation.kind==='add-heat'?'热度':'倍率',symbol=operation.kind==='multiply-multiplier'?'×':'+';
      expect(copy.benefit).toBe(target+symbol+Number(operation.value.n)/Number(operation.value.d));
      expect(copy.narrow).toBe(symbol+Number(operation.value.n)/Number(operation.value.d)+(operation.kind==='multiply-multiplier'?'':operation.kind==='add-heat'?'热':'倍'));
      expect(copy).toMatchObject({bodyActive:true,editionActive:false,state:'本手会触发'});expect(copy.summary).toContain(copy.benefit);expect(copy.compact).toBe('本手'+copy.narrow);
    }
    expect(JSON.stringify(base)).toBe(before);expect(cardAbilityCopy('f05',{gold:3})).toBeUndefined();
  });

  it('distinguishes multiple played high cards from exactly one played card, including disabled cards',()=>{
    const many={...base,selectedIds:['a','b']};
    expect(cardAbilityCopy('a03',context(many,'a03'))).toMatchObject({bodyActive:false,state:'本手打出 2 张 · 需要恰好 1 张'});
    expect(cardAbilityCopy('pengci',context(many,'pengci'))?.bodyActive).toBe(true);
    const pair={...many,hand:base.hand.map(card=>card.id==='b'?{...card,rank:2 as const}:card)};
    expect(cardAbilityCopy('pengci',context(pair,'pengci'))).toMatchObject({bodyActive:false,state:'本手牌型：对子 · 需要高牌'});
    const disabled={...base,disabledIds:['a']};expect(previewR2Hand(disabled).sets.activeScoringIds).toEqual([]);
    expect(cardAbilityCopy('a03',context(disabled,'a03'))?.bodyActive).toBe(true);
  });

  it('does not turn missing selection/ledger/instance identity into a failed condition',()=>{
    for(const id of ['a03','pengci']){
      expect(cardAbilityCopy(id,{gold:3,inStage:true})).toMatchObject({state:'选牌后判断',compact:'待选牌',narrow:'待选'});
      expect(cardAbilityCopy(id,{gold:3,inStage:true})?.bodyActive).toBeUndefined();
      const noLedger=cardAbilityCopy(id,{gold:3,inStage:true,selectedCount:1,instanceId:'owned/'+id});
      expect(noLedger?.bodyActive).toBeUndefined();expect(noLedger?.state).toContain('等待本手预览');
      expect(cardAbilityCopy(id,{gold:3,inStage:true,preview:previewR2Hand(base)})?.bodyActive).toBeUndefined();
    }
  });

  it.each([0,1,2,3,4,5])('uses completed count %i to label the next play and matches the official third-play boundary',completed=>{
    const next=completed+1,input={...base,playIndex:next},known=cardAbilityCopy('huimaqiang',{gold:3,inStage:true,playIndex:completed})!;
    expect(known.state).toContain(`下一手是本场第 ${next} 次`);expect(known.bodyActive).toBeUndefined();
    expect(cardAbilityCopy('huimaqiang',context(input,'huimaqiang'))?.bodyActive).toBe(next%3===0);
    expect(known.compact).toContain(next%3===0?'×2':`待第${Math.ceil(next/3)*3}手`);
  });

  it.each([
    ['f09','polychrome'],['f04','holographic'],['a03','foil'],['pengci','holographic'],['huimaqiang','polychrome'],
  ] as const)('%s never mistakes its %s edition math for an active body effect', (id,edition)=>{
    const input={...base,jokers:[owned(id,edition)],discardsUsed:1,gold:4,playIndex:2,selectedIds:['a','b'],hand:base.hand.map(card=>card.id==='b'?{...card,rank:2 as const}:card)};
    const copy=cardAbilityCopy(id,context(input,id))!;
    expect(copy).toMatchObject({bodyActive:false,editionActive:true});
    expect(copy.narrow).toBe(id==='f09'?'已弃':id==='huimaqiang'?'待3':'未触发');
    if(id==='f09')expect(copy).toMatchObject({condition:'已弃牌',value:'本场不再×1.5',state:'本体下场恢复 · 特殊版次仍正常结算'});
  });

  it('a known Boss seal disables the body and edition even without a selected hand',()=>{
    const input={...base,jokers:[owned('f09','polychrome')],boss:{definitionId:'B15' as const,disabledSuit:null},sealedJokerIds:['owned/f09']};
    expect(r2ScoringDisabledJokerIds(input.boss,input.jokers,R2_JOKERS,input.sealedJokerIds)).toEqual(['owned/f09']);
    expect(cardAbilityCopy('f09',context(input,'f09'))).toMatchObject({bodyActive:false,editionActive:false});
    expect(cardAbilityCopy('f09',{gold:3,inStage:true,disabledReason:'封牌'})).toMatchObject({bodyActive:false,editionActive:false,value:'本体与版次均不计分',compact:'计分封禁',narrow:'封禁'});
  });

  it('uses the f04 hand-start snapshot even when actual lucky gold arrives before its scoring slot',()=>{
    const input={...base,jokers:[owned('f04')],hand:[{...base.hand[0],enhancement:'lucky-paper' as const}]};
    const rng={algorithm:'fnv1a-mulberry32-v1' as const,state:2325297529},before=JSON.stringify({input,rng});
    const trace=scoreR2Hand({...input,rng});expect(trace.goldDelta).toBe(10);
    expect(trace.events.find(event=>event.operation==='add-gold')?.resourceAfter).toBe(13);
    const copy=cardAbilityCopy('f04',{gold:13,inStage:true,instanceId:'owned/f04',events:trace.events});
    expect(copy).toMatchObject({bodyActive:true,value:'整手倍率 +3',state:'本手已触发'});
    expect(copy?.rules).toContain('本手开始时的金币快照');expect(JSON.stringify({input,rng})).toBe(before);
    expect(cardAbilityCopy('f04',context({...base,gold:4},'f04'))?.bodyActive).toBe(false);
  });

  it('recorded events take priority over a preview and later-stage discard state',()=>{
    const input={...base,jokers:[owned('f09','polychrome')]},rng={algorithm:'fnv1a-mulberry32-v1' as const,state:17};
    const active=scoreR2Hand({...input,rng}),inactive=scoreR2Hand({...input,discardsUsed:1,rng});
    expect(cardAbilityCopy('f09',{...context(input,'f09'),events:inactive.events})).toMatchObject({bodyActive:false,editionActive:true});
    expect(cardAbilityCopy('f09',{...context(input,'f09'),discardsUsed:1,events:active.events})).toMatchObject({bodyActive:true,value:'整手倍率 ×1.5',state:'本手已触发'});
    expect(cardAbilityCopy('f09',{...context(input,'f09'),instanceId:'some-other-instance'})).toMatchObject({bodyActive:false,editionActive:false});
  });

  it('shop copy remains prospective when the save still contains prior-stage counters',()=>{
    const prior={gold:3,inStage:false,discardsUsed:4,playIndex:5};
    expect(cardAbilityCopy('f09',prior)).toMatchObject({value:'整手倍率 ×1.5',compact:'不弃×1.5'});
    expect(cardAbilityCopy('huimaqiang',prior)?.state).toContain('每场重新计数');
    for(const id of ids)expect(cardAbilityCopy(id,prior)?.bodyActive).toBeUndefined();
    expect(cardAbilityCopy('f04',prior)?.state).toContain('满足条件');expect(cardAbilityCopy('f04',{...prior,gold:4})?.state).toContain('尚未满足');
    expect(cardAbilityCopy('f09',{...prior,disabledReason:'本章封角：不换词计分被封禁'})).toMatchObject({
      condition:'本场计分被封禁',value:'本体与版次均不计分',state:'本章封角：不换词计分被封禁',compact:'计分封禁',narrow:'封禁',bodyActive:false,editionActive:false,
    });
  });
});
