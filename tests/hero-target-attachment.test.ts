import {describe,it,expect} from 'vitest';
import {HeroTargetAttachmentState,attachmentEdgePoint} from '../src/game/HeroTargetAttachmentState';
const draft={key:'run/stage/main-6c+6h',targetId:'instance/6h'},event={eventId:'saved/hero/1',targetCardId:draft.targetId,reasonKey:'erxiang.handoff'};
const context=()=>({generation:1,signal:new AbortController().signal});

describe('hero target intent ownership',()=>{
  it('uses the exact instance, keeps idle indefinitely, and does not require an idle hold before saving',()=>{
    const state=new HeroTargetAttachmentState();state.preview(draft);
    expect(state.value?.phase).toBe('travel');expect(state.consume(draft.targetId,event.eventId,context())).toBe(true);
    expect(state.value?.phase).toBe('committed');expect(state.release(event,context())).toBe(true);
    for(let i=0;i<5;i++)state.advance(50);expect(state.value).toBeUndefined();
    state.preview(draft);for(let i=0;i<100;i++)state.advance(50);
    expect(state.value).toMatchObject({targetId:'instance/6h',phase:'idle'});
  });
  it('never releases for the other six, another event or a stale callback',()=>{
    const state=new HeroTargetAttachmentState();state.preview(draft);state.consume(draft.targetId,event.eventId,context());
    expect(state.release({...event,targetCardId:'instance/6c'},context())).toBe(false);
    expect(state.release({...event,eventId:'another'},context())).toBe(false);
    expect(state.release({...event,reasonKey:'ordinary.points'},context())).toBe(false);
    state.preview({...draft,key:'retarget',targetId:'instance/6c'});
    expect(state.release(event,context())).toBe(false);expect(state.value?.targetId).toBe('instance/6c');
    const expired=new AbortController();expired.abort();expect(state.consume('instance/6c','stale',{generation:0,signal:expired.signal})).toBe(false);
    expect(state.consume(draft.targetId,event.eventId,context())).toBe(false);expect(state.value?.targetId).toBe('instance/6c');
  });
  it('same accepted intent survives card rebind/reorder without replaying source',()=>{
    const state=new HeroTargetAttachmentState();state.preview(draft);for(let i=0;i<5;i++)state.advance(50);
    const generation=state.value?.generation;state.preview({...draft});expect(state.value).toMatchObject({generation,phase:'idle'});
    state.preview(undefined);expect(state.value).toBeUndefined();
  });
  it('aborting a saved generation clears it, but cannot cancel a later target',()=>{
    const state=new HeroTargetAttachmentState(),old=new AbortController();state.preview(draft);state.consume(draft.targetId,event.eventId,{generation:1,signal:old.signal});
    state.preview({...draft,key:'new',targetId:'instance/6c'});old.abort();expect(state.value?.targetId).toBe('instance/6c');
    const active=new AbortController();state.consume('instance/6c','new-event',{generation:2,signal:active.signal});active.abort();expect(state.value).toBeUndefined();
  });
  it('hiding discards flight and release tails; reduced/off retain a static target',()=>{
    const state=new HeroTargetAttachmentState();state.preview(draft);state.advance(40);state.suspend();expect(state.value?.phase).toBe('idle');
    for(const mode of ['reduced','off'] as const){state.clear();state.setMotion(mode);state.preview(draft);for(let i=0;i<80;i++)state.advance(50);expect(state.value).toMatchObject({phase:'idle',clock:0,targetId:draft.targetId});state.consume(draft.targetId,event.eventId,context());expect(state.release(event,context())).toBe(true);expect(state.value).toBeUndefined();}
    state.setMotion('full');state.preview(draft);state.consume(draft.targetId,event.eventId,context());state.release(event,context());state.suspend();expect(state.value).toBeUndefined();
  });
  it('exterior ribbon samples never cover the printed face or card indices',()=>{
    for(const [width,height] of [[38,54],[74,105],[112,159]])for(let i=0;i<=200;i++){
      const p=attachmentEdgePoint(width,height,i/200);expect(Math.abs(p.x)>=width/2+2.99||Math.abs(p.y)>=height/2+2.99).toBe(true);
    }
  });
});
