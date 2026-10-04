import {describe,expect,it,vi} from 'vitest';
vi.mock('phaser',()=>({default:{Scene:class {}}}));
import {GameScene} from '../src/game/GameScene';
const sort=(GameScene.prototype as unknown as {sortHand(mode:'rank'|'suit'):Promise<void>}).sortHand;
const cards=[{id:'h2',rank:2,suit:'hearts'},{id:'cA',rank:14,suit:'clubs'},{id:'d2',rank:2,suit:'diamonds'},{id:'sA',rank:14,suit:'spades'}];
function setup(selected=['h2','cA'],candidate=false){
 const scene={ready:true,presentation:undefined as object|undefined,run:{phase:'await-input'},hand:cards,selectedIds:new Set(selected),candidateGhost:candidate?{key:'old-seat-order'}:undefined,candidateUndo:candidate?{revision:'old',ids:['sA']}:undefined,statusMessage:'已换组，仍需自己出牌；查看牌型可撤销',handInput:{cancel:vi.fn()},view:{cancelInteraction:vi.fn()},refreshSelection:vi.fn(),handPositions:vi.fn(()=>new Map()),command:vi.fn(async(_action:unknown)=>true),slideHandFrom:vi.fn(),updateControls:vi.fn(),showHandHint:vi.fn()};
 return scene;
}
describe('explicit hand sort returns selected cards before reordering',()=>{
 it.each(['rank','suit'] as const)('%s clears manual selection before the existing single ReorderHand command',async mode=>{
  const s=setup();s.command.mockImplementation(async action=>{expect(s.selectedIds.size).toBe(0);expect(s.candidateGhost).toBeUndefined();expect(s.candidateUndo).toBeUndefined();expect(s.refreshSelection).toHaveBeenCalledTimes(1);expect(action).toMatchObject({type:'ReorderHand'});return true;});
  await sort.call(s as unknown as GameScene,mode);expect(s.command).toHaveBeenCalledTimes(1);expect(s.handInput.cancel).toHaveBeenCalledOnce();expect(s.view.cancelInteraction).toHaveBeenCalledOnce();expect(s.statusMessage).not.toContain('选择已保留');
 });
 it.each(['rank','suit'] as const)('%s ends candidate ghost/undo and an interrupted gesture cannot put old selection back',async mode=>{
  const s=setup(['cA','sA'],true);s.handInput.cancel.mockImplementation(()=>{s.selectedIds=new Set(['d2']);});await sort.call(s as unknown as GameScene,mode);
  expect(s.selectedIds.size).toBe(0);expect(s.candidateGhost).toBeUndefined();expect(s.candidateUndo).toBeUndefined();
 });
 it('keeps no selection on repeated sort, including an already ordered hand',async()=>{
  const s=setup([]);await sort.call(s as unknown as GameScene,'rank');await sort.call(s as unknown as GameScene,'rank');await sort.call(s as unknown as GameScene,'suit');expect(s.selectedIds.size).toBe(0);expect(s.command).toHaveBeenCalledTimes(3);
 });
 it('a declined reorder leaves the deliberately returned selection empty and does not claim success',async()=>{
  const s=setup(['h2'],true);s.command.mockResolvedValue(false);await sort.call(s as unknown as GameScene,'rank');expect(s.selectedIds.size).toBe(0);expect(s.candidateGhost).toBeUndefined();expect(s.candidateUndo).toBeUndefined();expect(s.statusMessage).not.toContain('已排序');expect(s.slideHandFrom).not.toHaveBeenCalled();expect(s.showHandHint).not.toHaveBeenCalled();
 });
 it.each(['busy','presentation','other-phase'])('a %s scene does not clear selection, candidate history or queue a reorder',async reason=>{
  const s=setup(['h2'],true);if(reason==='busy')s.ready=false;if(reason==='presentation')s.presentation={};if(reason==='other-phase')s.run.phase='stage-ready';const ghost=s.candidateGhost,undo=s.candidateUndo;
  await sort.call(s as unknown as GameScene,'rank');expect([...s.selectedIds]).toEqual(['h2']);expect(s.candidateGhost).toBe(ghost);expect(s.candidateUndo).toBe(undo);expect(s.handInput.cancel).not.toHaveBeenCalled();expect(s.refreshSelection).not.toHaveBeenCalled();expect(s.command).not.toHaveBeenCalled();
 });
});
