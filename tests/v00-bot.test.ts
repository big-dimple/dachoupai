import {describe,expect,it} from 'vitest';
import {createRun,applyCommand,type R2RunState} from '../src/domain/run';
import {publicR2View} from '../src/testing/r2Bot';
import {chooseV00Action,V00_STYLES} from '../src/testing/v00Bot';
import {r2Price} from '../src/domain/r2Shop';

describe('V00 policies receive only player-visible information',()=>{
  it('offers three distinct family entries, rather than buying the same five every run',()=>{
    const s=createRun({seed:'visible-policy',characterId:'erxiang',runId:'policy',rulesVersion:'r2'});
    s.shop!.offers=['a05','b03','c06'].map(id=>({offerId:id,definitionId:id,price:r2Price(id),consumed:false}));
    expect(V00_STYLES.map(style=>chooseV00Action(publicR2View(s),style))).toEqual(['a05','b03','c06'].map(id=>({type:'BuyOffer',offerId:id})));
  });
  it('hidden deck order and every RNG cursor cannot affect the public decision',()=>{
    const s=createRun({seed:'visible-policy',characterId:'amo',runId:'policy',rulesVersion:'r2'}),hidden=structuredClone(s);
    hidden.drawPile.reverse();for(const cursor of Object.values(hidden.rng))cursor.state=(cursor.state+17)>>>0;
    expect(publicR2View(hidden)).toEqual(publicR2View(s));for(const style of V00_STYLES)expect(chooseV00Action(publicR2View(hidden),style)).toEqual(chooseV00Action(publicR2View(s),style));
    const view=publicR2View(s);for(const key of ['rng','drawPile','deckInstances','seed'])expect(Object.hasOwn(view,key)).toBe(false);
  });
  it.each(['single-held','groups','suit'] as const)('%s emits only valid ordinary commands on a natural run',style=>{
    let s=createRun({seed:'policy-valid-'+style,characterId:style==='single-held'?'amo':'erxiang',runId:'policy',rulesVersion:'r2'});
    for(let i=0;i<65;i++){const view=publicR2View(s),before=JSON.stringify(view),action=chooseV00Action(view,style);expect(JSON.stringify(view)).toBe(before);if(!action){expect(['run-won','run-lost','abandoned']).toContain(s.phase);break;}
      const r=applyCommand(s,{runId:s.runId,commandId:'policy-'+i,expectedSeq:s.commandSeq,action});expect(r.ok,r.ok?'':r.code).toBe(true);if(!r.ok)break;s=r.state as R2RunState;
    }
  });
});
