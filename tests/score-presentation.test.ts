import {describe,it,expect} from 'vitest';
import {scoreBeat,scoreFireLevel} from '../src/game/scorePresentation';
import type {ScoreEvent} from '../src/domain/scoreR2';

const event=(sourceType:ScoreEvent['sourceType'],operation:string,phase:ScoreEvent['phase']='onCardScore'):ScoreEvent=>({
  eventId:'event/1',rootId:'hand/1',rootEventId:'event/1',phase,sourceType,sourceDefinitionId:'source',sourceInstanceId:'instance',
  targetCardId:'card/1',operation,value:{n:'10',d:'1'},before:{H:{n:'20',d:'1'},M:{n:'1',d:'1'}},after:{H:{n:'30',d:'1'},M:{n:'1',d:'1'}},
  reasonKey:'source',visibleCondition:{kind:'always'},retriggerDepth:0,
});
const length=(e:ScoreEvent)=>{const b=scoreBeat(e);return b.windup+b.flight+b.impact+b.rest;};

describe('deliberate one-source scoring presentation',()=>{
  it('gives every ordinary card time to be identified and read',()=>{
    expect(length(event('card','add-heat'))).toBeGreaterThanOrEqual(700);
    // Ten separate events remain ten complete beats; long chains are never squeezed into 5.2s.
    expect(Array.from({length:10},()=>length(event('card','add-heat'))).reduce((a,b)=>a+b,0)).toBeGreaterThan(7000);
  });
  it('holds multiplication longer than addition without merging retriggers',()=>{
    expect(length(event('joker','multiply-multiplier','jokerScore'))).toBeGreaterThan(length(event('joker','add-heat','jokerScore')));
    expect(length({...event('card','add-heat'),retriggerDepth:1})).toBeGreaterThanOrEqual(600);
  });
  it('shows growth and suppression without pretending they changed the accumulator',()=>{
    const growth=event('joker','add-growth','afterHand');growth.after=growth.before;
    expect(scoreBeat(growth).flight).toBe(0);expect(length(growth)).toBeGreaterThanOrEqual(500);
    const disabled=event('rule','ordinary-points-suppressed');disabled.after=disabled.before;
    expect(scoreBeat(disabled).flight).toBe(0);
  });
});

describe('flames follow the displayed exact total, never the final future result',()=>{
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
    expect(scoreFireLevel('0',(t*3n).toString(),t.toString())).toBe(3);
  });
});
