import {afterEach,expect,it,vi} from 'vitest';
vi.mock('phaser',()=>({default:{Scene:class{}}}));
vi.mock('../src/game/HeroDiscardChoice',()=>({showHeroDiscardChoice:vi.fn(()=>({classList:{add:vi.fn()}}))}));
vi.mock('../src/game/HeroSkillGuide',async original=>({...await original<typeof import('../src/game/HeroSkillGuide')>(),mountHeroSkillGuide:vi.fn()}));
import {GameScene} from '../src/game/GameScene';
import {showHeroDiscardChoice} from '../src/game/HeroDiscardChoice';
import {heroSkillGuide} from '../src/game/HeroSkillGuide';
import {laohuanDiscardFixture,laohuanSend,XIN_STRAIGHT,XIN_DISCARD} from './fixtures/laohuan-discard-handoff';

afterEach(()=>vi.clearAllMocks());
function setup(){
 const s=Object.create(GameScene.prototype) as any;let modal:any;
 const dialog:any={open:vi.fn(()=>modal={classList:{add:vi.fn()},querySelector:()=>null}),active:(d:any)=>d===modal,close:()=>{modal=undefined;}};
 Object.defineProperties(s,{ready:{value:true},hand:{get:()=>s.run.handOrder.map((id:string)=>s.run.deckInstances.find((c:any)=>c.id===id))}});
 Object.assign(s,{run:laohuanDiscardFixture(),selectedIds:new Set(XIN_STRAIGHT),lifecycle:1,dialog,discardSelected:vi.fn()});return{s,dialog};
}
it('reminder return and direct skill use start a separate discard draft, never the five-card straight',()=>{
 const{s,dialog}=setup(),before=structuredClone(s.run);s.inspectRole();
 expect(showHeroDiscardChoice).toHaveBeenCalledOnce();expect(dialog.open).not.toHaveBeenCalled();expect([...s.selectedIds]).toEqual(XIN_STRAIGHT);expect(s.discardSelected).not.toHaveBeenCalled();
 const[,run,valid,next,copy]=vi.mocked(showHeroDiscardChoice).mock.calls[0];expect(run).toBe(s.run);expect(valid()).toBe(true);expect(copy.summaryBody).toContain('空选择');next([XIN_DISCARD[0]]);
 const confirm=dialog.open.mock.calls.at(-1)![2][0];expect(confirm.label).toBe('确认弃1张并换牌');expect(dialog.open.mock.calls.at(-1)![3].summaryBody).toContain('2♦');expect(s.discardSelected).not.toHaveBeenCalled();
 confirm.run();confirm.run();expect(s.discardSelected).toHaveBeenCalledExactlyOnceWith(true,undefined,before.commandSeq,[XIN_DISCARD[0]]);expect([...s.selectedIds]).toEqual(XIN_STRAIGHT);expect(s.run).toEqual(before);
});
it('closing or changing lifecycle/state rejects stale confirmation without consuming anything',()=>{
 for(const stale of ['close','lifecycle','state']as const){const{s,dialog}=setup(),before=structuredClone(s.run);s.inspectRole();const valid=vi.mocked(showHeroDiscardChoice).mock.calls.at(-1)![2],next=vi.mocked(showHeroDiscardChoice).mock.calls.at(-1)![3];next([XIN_DISCARD[0]]);const confirm=dialog.open.mock.calls.at(-1)![2][0];if(stale==='close')dialog.close();else if(stale==='lifecycle')s.lifecycle++;else s.run=structuredClone(s.run);confirm.run();expect(s.discardSelected).not.toHaveBeenCalled();expect([...s.selectedIds]).toEqual(XIN_STRAIGHT);expect(s.run).toEqual(before);if(stale!=='close')expect(valid()).toBe(false);}
});
it.each([0,1])('candidate guidance uses the domain required count with existing hand gap %i',gap=>{
 const before=laohuanDiscardFixture(gap),ids=XIN_DISCARD.slice(gap),pending=laohuanSend(before,{type:'DiscardHand',selectedIds:ids,laohuanTrick:true});expect(pending.pendingRefill!.required).toBe(3);expect(heroSkillGuide(pending).step).toBe('第3步 · 选3张候选留下');expect(pending.discardPile).toEqual(ids);expect(pending.handOrder).toEqual(XIN_STRAIGHT);
 const kept=pending.pendingRefill!.candidateIds.slice(0,3),after=laohuanSend(pending,{type:'ChooseRefill',selectedIds:kept});expect(after.handOrder).toEqual([...XIN_STRAIGHT,...kept]);expect(after.stage!.discardsUsed).toBe(1);expect(after.stage!.laohuanTrickUsed).toBe(true);expect(after.pendingRefill).toBe(null);
});
