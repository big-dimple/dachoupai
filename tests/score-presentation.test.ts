import {describe,it,expect} from 'vitest';
import {scoreBeat,scoreFireLevel} from '../src/game/scorePresentation';
import type {ScoreEvent} from '../src/domain/scoreR2';

const event=(sourceType:ScoreEvent['sourceType'],operation:string,phase:ScoreEvent['phase']='onCardScore'):ScoreEvent=>({
  eventId:'event/1',rootId:'hand/1',rootEventId:'event/1',phase,sourceType,sourceDefinitionId:'source',sourceInstanceId:'instance',
  targetCardId:'card/1',operation,value:{n:'10',d:'1'},before:{H:{n:'20',d:'1'},M:{n:'1',d:'1'}},after:{H:{n:'30',d:'1'},M:{n:'1',d:'1'}},
  reasonKey:'source',visibleCondition:{kind:'always'},retriggerDepth:0,
});
const length=(e:ScoreEvent,ordinal=0)=>{const b=scoreBeat(e,ordinal);return b.windup+b.flight+b.impact+b.rest;};
const multiplier=(sourceType:ScoreEvent['sourceType'],operation:string,phase:ScoreEvent['phase']='jokerScore'):ScoreEvent=>({
  ...event(sourceType,operation,phase),value:{n:'2',d:'1'},after:{H:{n:'20',d:'1'},M:{n:'2',d:'1'}},
});

describe('progressive one-source scoring presentation',()=>{
  it('accelerates by committed trace position and stops at a readable ordinary-card floor',()=>{
    const card=event('card','add-heat'),lengths=Array.from({length:20},(_,ordinal)=>length(card,ordinal));
    expect(lengths[0]).toBe(500);expect(lengths[8]).toBe(300);expect(lengths[19]).toBe(300);
    for(let i=1;i<=8;i++)expect(lengths[i]).toBeLessThan(lengths[i-1]);
    for(let ordinal=0;ordinal<20;ordinal++){
      const beat=scoreBeat(card,ordinal);
      expect([beat.windup,beat.flight,beat.impact,beat.rest].every(ms=>ms>0)).toBe(true);
      expect(lengths[ordinal]).toBeGreaterThanOrEqual(300);
    }
    // Long chains add full independent beats after reaching the floor; there is no hand-duration cap.
    expect(lengths.reduce((a,b)=>a+b,0)).toBeGreaterThan(20*300);
    expect(length(card,511)).toBe(300);
    expect(length(card)).toBe(500);
  });
  it('keeps role, additive multiplier and multiplicative multiplier beats distinct at the same position',()=>{
    const role=event('character','add-heat','characterScore'),add=multiplier('joker','add-multiplier'),multiply=multiplier('joker','multiply-multiplier');
    expect([length(role,0),length(role,8)]).toEqual([800,600]);
    expect([length(add,0),length(add,8)]).toEqual([600,400]);
    expect([length(multiplier('card','add-multiplier','onCardScore'),0),length(multiplier('card','add-multiplier','onCardScore'),8)]).toEqual([600,400]);
    expect([length(multiply,0),length(multiply,8)]).toEqual([1100,900]);
    for(const ordinal of [0,3,8,511]){
      const addition=scoreBeat(add,ordinal),product=scoreBeat(multiply,ordinal);
      expect(product.strength).toBe('multiply');expect(scoreBeat(role,ordinal).strength).toBe('role');
      expect(product.windup).toBeGreaterThanOrEqual(300);
      expect(product.windup).toBeGreaterThan(addition.windup);
      expect(product.impact).toBeGreaterThan(addition.impact);
      expect(product.rest).toBeGreaterThan(addition.rest);
    }
  });
  it('gives every retrigger its own highlight and never restarts the chain pace for a source',()=>{
    const repeats=Array.from({length:4},(_,i)=>({...event('card','add-heat'),eventId:'event/retrigger/'+i,rootEventId:'event/1',retriggerDepth:1}));
    const beats=repeats.map((e,i)=>scoreBeat(e,i+5));
    expect(beats).toHaveLength(repeats.length);
    expect(beats.every(b=>b.strength==='retrigger'&&b.windup>0&&b.flight>0&&b.impact>0&&b.rest>0)).toBe(true);
    expect(length(repeats[3],8)).toBeGreaterThanOrEqual(300);
    expect(length(repeats[3],8)).toBeLessThan(length(repeats[0],5));
    const cue=event('joker','retrigger-card');cue.after=cue.before;
    expect(scoreBeat(cue,8).strength).toBe('retrigger');expect(scoreBeat(cue,8).flight).toBe(0);
  });
  it('shows growth and suppression without pretending they changed the accumulator',()=>{
    const growth=event('joker','add-growth','afterHand');growth.after=growth.before;
    const disabled=event('rule','ordinary-points-suppressed');disabled.after=disabled.before;
    const cap=event('joker','retrigger-cap');cap.after=cap.before;
    const zeroCard=event('card','add-heat');zeroCard.after=zeroCard.before;zeroCard.value={n:'0',d:'1'};
    for(const ordinal of [0,8,511]){
      for(const e of [growth,disabled,cap,zeroCard]){
        expect(scoreBeat(e,ordinal).flight).toBe(0);
        expect(length(e,ordinal)).toBeGreaterThanOrEqual(300);
        expect(length(e,ordinal)).toBeLessThanOrEqual(500);
      }
    }
  });
  it('is a stateless playback mapping and leaves exact committed events intact',()=>{
    const input=multiplier('joker','multiply-multiplier'),snapshot=structuredClone(input),first=scoreBeat(input,3);
    scoreBeat(event('card','add-heat'),511);
    expect(scoreBeat(input,3)).toEqual(first);expect(input).toEqual(snapshot);
    expect(scoreBeat(input,-1)).toEqual(scoreBeat(input,0));
    expect(scoreBeat(input,Number.NaN)).toEqual(scoreBeat(input,0));
  });
});

describe('flames follow the displayed exact total, never the final future result',()=>{
  it('D27 uses only small and large fire: a finished below-target hand is dark and every >=2x score stays large',()=>{
    expect(scoreFireLevel('0','399','400')).toBe(0);
    expect(scoreFireLevel('0','799','400')).toBe(1);
    expect(scoreFireLevel('0','800','400')).toBe(2);
    expect(scoreFireLevel('0','1200','400')).toBe(2);
    expect(scoreFireLevel('0','40000','400')).toBe(2);
  });
  it('starts strictly over target and includes earlier credited hands',()=>{
    expect(scoreFireLevel('0','400','400')).toBe(0);
    expect(scoreFireLevel('0','401','400')).toBe(1);
    expect(scoreFireLevel('399','1','400')).toBe(0);
    expect(scoreFireLevel('399','2','400')).toBe(1);
  });
  it('can cool down after a negative wager and never adds the replay twice',()=>{
    expect(scoreFireLevel('0','600','400')).toBe(1);
    expect(scoreFireLevel('0','375','400')).toBe(0);
    expect(scoreFireLevel('0','200','400')).toBe(0);
  });
  it('keeps huge scores and thresholds exact',()=>{
    const t=10n**100n;
    expect(scoreFireLevel('0',(t*2n-1n).toString(),t.toString())).toBe(1);
    expect(scoreFireLevel('0',(t*2n).toString(),t.toString())).toBe(2);
    expect(scoreFireLevel('0',(t*3n).toString(),t.toString())).toBe(2);
  });
});
