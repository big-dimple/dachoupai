import {describe,it,expect} from 'vitest';
import {createRun,applyCommand,type R2RunState} from '../src/domain/run';
import {newRunIdentity} from '../src/game/RunLaunch';
import {r2CreateJoker} from '../src/domain/r2Run';
import {xiemuChoice} from '../src/game/XiemuBurnCopy';
function fixture(gold:number,held=true){let s=createRun({seed:'group-natural-17',runId:'controlled/cash-choice',characterId:'xiemu',rulesVersion:'r2',r2Identity:newRunIdentity('xiemu','group'),openingRoute:'group',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}}) as R2RunState;for(const type of ['LeaveShop','EnterStage'] as const){const r=applyCommand(s,{runId:s.runId,commandId:s.runId+'/'+s.commandSeq,expectedSeq:s.commandSeq,action:{type}});if(!r.ok)throw Error(r.code);s=r.state;}s=structuredClone(s);s.gold=gold;if(held)s.jokers=[r2CreateJoker('e08','controlled/held/e08',8,'none',s)];return s;}
describe('burn choice names lost public held-card gold gates',()=>{
 it('warns for20 ->10 before the command and leaves saved data unchanged',()=>{const s=fixture(20),before=structuredClone(s);expect(xiemuChoice(s,'two-pair').choices[0].details).toContain('包场：花后10金，不满足≥20金门槛');expect(s).toEqual(before);});
 it('keeps the inclusive20 boundary and warns only for tiers that cross it',()=>{const choices=xiemuChoice(fixture(30),'two-pair').choices;expect(choices[0].details).not.toContain('包场');expect(choices[1].details).toContain('包场');expect(choices[2].details).toContain('包场');});
 it('does not invent ownership, a new loss for an already unmet gate or affordable payment',()=>{expect(xiemuChoice(fixture(20,false),'two-pair').choices[0].details).not.toContain('包场');expect(xiemuChoice(fixture(19),'two-pair').choices[0].details).not.toContain('包场');const c=xiemuChoice(fixture(9),'two-pair').choices[0];expect(c.available).toBe(false);expect(c.details).not.toContain('包场');});
});
