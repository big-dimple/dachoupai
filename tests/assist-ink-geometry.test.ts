import {it,expect} from 'vitest';
import {assistInkCurls,clearInkRuns} from '../src/game/AssistInkGeometry';
import {HeroTargetAttachmentState,ASSIST_INJECTION_MS} from '../src/game/HeroTargetAttachmentState';

it('clips diagonal segments that cross print or controls even when both endpoints are outside',()=>{
  const print={x:10,y:10,width:20,height:30};expect(clearInkRuns([{x:0,y:0},{x:40,y:50}],[print],4)).toEqual([]);
  expect(clearInkRuns([{x:0,y:5},{x:40,y:5}],[print],4)).toHaveLength(1);
  expect(clearInkRuns([{x:0,y:7},{x:40,y:7}],[print],4)).toEqual([]);
});
it('has deterministic moving curls with a bounded geometry budget and keeps the stroke outside printed faces',()=>{
  const face={x:185,y:646,width:64,height:92},blocked=[face,{x:266,y:593,width:112,height:44}];
  expect(assistInkCurls(face,0)).toEqual(assistInkCurls(face,0));expect(assistInkCurls(face,400)).not.toEqual(assistInkCurls(face,0));
  for(const time of [0,120,450,900,1500,2100]){const curls=assistInkCurls(face,time);expect(curls).toHaveLength(3);expect(curls.every(p=>p.length===43)).toBe(true);
    for(const run of curls.flatMap(p=>clearInkRuns(p,blocked,5)))for(const p of run)for(const b of blocked)expect(p.x<b.x-5||p.x>b.x+b.width+5||p.y<b.y-5||p.y>b.y+b.height+5).toBe(true);
  }
});
it('the longer Su Shi injection is cosmetic, may save immediately, and never resumes after hiding',()=>{
  const state=new HeroTargetAttachmentState(),draft={key:'assist',targetId:'a',targetIds:['a','b'],kind:'assist' as const,releaseReason:'amo.assist.'};state.preview(draft);
  for(let i=0;i<6;i++)state.advance(50);expect(state.value?.phase).toBe('travel');expect(ASSIST_INJECTION_MS).toBeLessThan(500);state.suspend();expect(state.value?.phase).toBe('idle');
  state.preview({...draft,key:'new'});const ctx={generation:1,signal:new AbortController().signal};expect(state.consume('a','actual-saved-event',ctx)).toBe(true);expect(state.release({eventId:'actual-saved-event',reasonKey:'amo.assist.pair'},ctx)).toBe(true);
});
