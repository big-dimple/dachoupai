import {it,expect,vi} from 'vitest';
vi.mock('phaser',()=>({default:{Scene:class {}}}));
import {GameScene} from '../src/game/GameScene';
import {createRun,applyCommand} from '../src/domain/run';
import {newRunIdentity} from '../src/game/RunLaunch';
import {heroExplanationCopy} from '../src/game/HeroExplanation';
it('removes chosen sacrifice from public held-card feedback before commitment without mutating the run',()=>{
 let run=createRun({rulesVersion:'r2',runId:'exile-ui',seed:'exile-ui',characterId:'amo',r2Identity:newRunIdentity('amo'),openingRoute:'group'});
 for(const action of [{type:'LeaveShop'},{type:'EnterStage'}] as const){const r=applyCommand(run,{runId:run.runId,commandId:'ui/'+run.commandSeq,expectedSeq:run.commandSeq,action});if(!r.ok)throw Error(r.code);run=r.state;}
 const view=Object.create(GameScene.prototype) as any;Object.assign(view,{run,selectedIds:new Set(run.handOrder.slice(0,2)),assistIds:[],amoExile:true});
 const before=structuredClone(run),chosen=view.selectionPreview();expect(chosen.heldIds).toEqual([]);expect(chosen.discardedIds).toHaveLength(6);
 view.amoExile=false;expect(view.selectionPreview().heldIds).toHaveLength(6);expect(run).toEqual(before);
 const explanation=heroExplanationCopy('amo',run);expect(explanation.hero.passiveName).toBe('贬谪');expect(explanation.hero.detailRules).toContain('4倍');expect(explanation.when).not.toContain('两对');
});
