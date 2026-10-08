import {it,expect,vi} from 'vitest';
import {BUILD_DIRECTION_KEY,createBuildDirections,decodeBuildDirections} from '../src/game/BuildDirectionPreferences';
import {buildDirectionSummary,chooseBuildFocus} from '../src/game/BuildJourney';
import {buildJourneyPlan} from '../harness/fixtures/build-journey';
const memory=()=>{const data=new Map<string,string>();return {data,getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);}};};
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
 const s=buildJourneyPlan();s.openingRoute='group';const before=JSON.stringify(s);const storage=memory();vi.stubGlobal('localStorage',storage);chooseBuildFocus(s.runId,'flush');const summary=buildDirectionSummary(s);expect(summary).toContain('当前培养：同花集中');expect(summary).toContain('开局路线：同点成组');expect(summary).toContain('本机续局保留');expect(JSON.stringify(s)).toBe(before);vi.unstubAllGlobals();
});
