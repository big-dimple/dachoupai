import {it,expect,vi} from 'vitest';
import {BUILD_DIRECTION_KEY,createBuildDirections,decodeBuildDirections,buildDirectionRunKey} from '../src/game/BuildDirectionPreferences';
import {createRun} from '../src/domain/run';
import {newRunIdentity} from '../src/game/RunLaunch';
import {buildDirectionSummary,chooseBuildFocus} from '../src/game/BuildJourney';
import {buildJourneyPlan} from '../harness/fixtures/build-journey';
const memory=()=>{const data=new Map<string,string>();return {data,getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);}};};
export function currentModes(){const seed='same-current-mode';return [0,1].map(difficulty=>createRun({seed,runId:`run/${seed}/amo`,characterId:'amo',rulesVersion:'r2',r2Identity:newRunIdentity('amo','group'),openingRoute:'group',modeConfig:{mode:'standard',difficulty:difficulty as 0|1,challengeId:null,programsEnabled:false}}));}
it('same current content, seed and character in D0/D1 never share a direction, including cold continuation',()=>{
 const [d0,d1]=currentModes();expect(d0.runId).toBe(d1.runId);expect(d0.contentHash).toBe(d1.contentHash);const before=[JSON.stringify(d0),JSON.stringify(d1)],storage=memory(),first=createBuildDirections(()=>storage),k0=buildDirectionRunKey(d0),k1=buildDirectionRunKey(d1);expect(k0).not.toBe(k1);
 first.choose(k0,'flush');expect(first.current(k1,d1.openingRoute)).toBe('group');first.choose(k1,'straight');expect(first.current(k0,d0.openingRoute)).toBe('flush');const cold=createBuildDirections(()=>storage);expect(cold.current(k0,d0.openingRoute)).toBe('flush');expect(cold.current(k1,d1.openingRoute)).toBe('straight');expect([JSON.stringify(d0),JSON.stringify(d1)]).toEqual(before);
});
it('a rejected write keeps each current mode separate in-page and falls back honestly on a cold page',()=>{
 const [d0,d1]=currentModes(),keys=[d0,d1].map(buildDirectionRunKey),first=createBuildDirections(()=>({getItem:()=>null,setItem:()=>{throw Error('quota');}}));expect(first.choose(keys[0],'flush')).toBe(false);expect(first.choose(keys[1],'straight')).toBe(false);expect(first.current(keys[0],'group')).toBe('flush');expect(first.current(keys[1],'group')).toBe('straight');expect(first.retention(keys[0])).toBe('session');expect(createBuildDirections(()=>memory()).current(keys[0],d0.openingRoute)).toBe('group');
});
it('a turn to flush survives a fresh page while other runs keep their own opening fallback',()=>{
 const storage=memory(),first=createBuildDirections(()=>storage);expect(first.current('A','group')).toBe('group');expect(first.choose('A','flush')).toBe(true);
 const restored=createBuildDirections(()=>storage);expect(restored.current('A','group')).toBe('flush');expect(restored.retention('A')).toBe('local');expect(restored.current('B','straight')).toBe('straight');
 restored.choose('B','group');restored.choose('A','straight');const next=createBuildDirections(()=>storage);expect(next.current('A','group')).toBe('straight');expect(next.current('B','flush')).toBe('group');
});
it('denied optional storage keeps the selected direction in-page, marks it honestly, and recovers on a later write',()=>{
 const storage=memory();let denied=true;const directions=createBuildDirections(()=>{if(denied)throw Error('quota');return storage;});expect(directions.choose('A','flush')).toBe(false);expect(directions.current('A','group')).toBe('flush');expect(directions.retention('A')).toBe('session');expect(storage.data.size).toBe(0);
 denied=false;expect(directions.choose('A','straight')).toBe(true);expect(directions.retention('A')).toBe('local');expect(createBuildDirections(()=>storage).current('A','group')).toBe('straight');
});
it('malformed, duplicate, oversized and unknown direction preferences cannot become a gameplay or direction value',()=>{
 for(const raw of ['{','null',JSON.stringify({version:2,entries:[]}),JSON.stringify({version:1,entries:[{runId:'A',focus:'victory'}]}),JSON.stringify({version:1,entries:[{runId:'A',focus:'flush'},{runId:'A',focus:'group'}]}),'x'.repeat(8193)])expect(decodeBuildDirections(raw)).toEqual([]);
 const storage=memory();storage.setItem(BUILD_DIRECTION_KEY,'broken');expect(createBuildDirections(()=>storage).current('A','group')).toBe('group');
});
it('preferences are bounded to eight recent runs and never touch current save data',()=>{
 const storage=memory();storage.setItem('actual-save','unchanged');const directions=createBuildDirections(()=>storage);for(let i=0;i<12;i++)directions.choose('run/'+i,'flush');expect(decodeBuildDirections(storage.getItem(BUILD_DIRECTION_KEY))).toHaveLength(8);expect(directions.current('run/0','group')).toBe('group');expect(directions.current('run/11','group')).toBe('flush');expect(storage.getItem('actual-save')).toBe('unchanged');
});
it('the visible turn keeps actual holdings/growth/seed/commands unchanged and distinguishes opening from current intent',()=>{
 const s=buildJourneyPlan();s.openingRoute='group';const before=JSON.stringify(s);const storage=memory();vi.stubGlobal('localStorage',storage);chooseBuildFocus(s,'flush');const summary=buildDirectionSummary(s);expect(summary).toContain('当前培养：同花集中');expect(summary).toContain('开局路线：同点成组');expect(summary).toContain('本机续局保留');expect(JSON.stringify(s)).toBe(before);vi.unstubAllGlobals();
});
