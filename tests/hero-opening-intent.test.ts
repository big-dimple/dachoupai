import {it,expect,vi,afterEach} from 'vitest';
import {createRun} from '../src/domain/run';
import {deferOpeningIntent} from '../src/game/HeroOpeningIntent';
import {chooseBuildFocus,currentBuildFocus} from '../src/game/BuildJourney';
import {firstChapterGuide} from '../src/game/FirstChapterGuide';
afterEach(()=>vi.unstubAllGlobals());
function fixture(id:string){
 const data=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>data.set(k,v)});
 const run=(suffix:string)=>({state:createRun({seed:'opening-recovery',runId:id+suffix,characterId:'amo',rulesVersion:'r2',r2Profile:'group-upgrade-v1'}),status:'idle'});
 const old=run('/old'),candidate=run('/candidate'),listeners=new Set<()=>void>();
 const session={run:old,pendingRun:candidate as typeof candidate|undefined,subscribe:(fn:()=>void)=>{listeners.add(fn);return ()=>{listeners.delete(fn);};}};
 const changed=()=>[...listeners].forEach(fn=>fn());chooseBuildFocus(old.state.runId,'group');return {old,candidate,session,listeners,changed};
}
it('save failure and repeated retry do not publish direction, then the exact saved candidate gets it once',()=>{
 const f=fixture('opening-success'),before=JSON.stringify(f.old.state);deferOpeningIntent(f.session,f.candidate,'flush');f.changed();f.changed();
 expect(currentBuildFocus(f.old.state.runId)).toBe('group');expect(currentBuildFocus(f.candidate.state.runId)).toBeUndefined();expect(firstChapterGuide(f.candidate.state)).toBeUndefined();
 f.session.run=f.candidate;f.session.pendingRun=undefined;f.changed();expect(f.listeners.size).toBe(0);expect(currentBuildFocus(f.candidate.state.runId)).toBe('flush');expect(firstChapterGuide(f.candidate.state)?.body).toContain('同花集中');
 chooseBuildFocus(f.candidate.state.runId,'straight');f.changed();expect(currentBuildFocus(f.candidate.state.runId)).toBe('straight');expect(JSON.stringify(f.old.state)).toBe(before);
});
it('canceling the candidate preserves the original run intent and releases the one-shot listener',()=>{
 const f=fixture('opening-cancel');deferOpeningIntent(f.session,f.candidate,'flush');f.session.pendingRun=undefined;f.changed();expect(currentBuildFocus(f.old.state.runId)).toBe('group');expect(f.listeners.size).toBe(0);expect(firstChapterGuide(f.candidate.state)).toBeUndefined();
});
it('same public run ID is insufficient: a different object or non-idle candidate cannot publish the draft',()=>{
 for(const mismatch of ['object','status']){const f=fixture('opening-'+mismatch);deferOpeningIntent(f.session,f.candidate,'straight');f.session.run=mismatch==='object'?{...f.candidate}:f.candidate;if(mismatch==='status')f.candidate.status='readonly';f.session.pendingRun=undefined;f.changed();expect(currentBuildFocus(f.old.state.runId)).toBe('group');expect(currentBuildFocus(f.candidate.state.runId)).toBeUndefined();expect(f.listeners.size).toBe(0);}
});
