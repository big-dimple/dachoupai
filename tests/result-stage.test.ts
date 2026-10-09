import {it,expect,vi,afterEach} from 'vitest';
import {loadResultSourceArt} from '../src/game/ResultStageArt';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {resultStageFacts,resultStagePlan} from '../src/game/ResultStage';
import type {R2RunState} from '../src/domain/r2Run';
afterEach(()=>{vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllGlobals();});
function transport(decode:()=>Promise<void>=()=>Promise.resolve()){
 const image={naturalWidth:160,naturalHeight:224,src:'',decoding:'',decode,removeAttribute:vi.fn(function(this:{src:string}){this.src='';})};
 vi.stubGlobal('Image',class {constructor(){return image;}});
 vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:result-source');vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
 const scene={sys:{settings:{active:true}},textures:{exists:vi.fn(()=>false),addImage:vi.fn()}} as any;
 return {scene,image};
}
it('optional source transport installs a decoded current image and frees its URL',async()=>{
 const {scene,image}=transport();vi.stubGlobal('fetch',vi.fn(async()=>new Response('art')));
 expect(await loadResultSourceArt(scene,'card','/card.webp',new AbortController().signal,()=>true)).toBe(true);
 expect(scene.textures.addImage).toHaveBeenCalledWith('card',image);expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:result-source');
 scene.textures.exists.mockReturnValue(true);expect(await loadResultSourceArt(scene,'card','/card.webp',new AbortController().signal,()=>true)).toBe(true);expect(fetch).toHaveBeenCalledTimes(1);
});
it('leaving/retrying cancels a delayed request even when transport ignores abort; late response installs nothing',async()=>{
 const {scene}=transport();let respond!:(r:Response)=>void;vi.stubGlobal('fetch',vi.fn(()=>new Promise<Response>(r=>respond=r)));
 const request=new AbortController(),loading=loadResultSourceArt(scene,'card','/card.webp',request.signal,()=>true);request.abort();expect(await loading).toBe(false);
 respond(new Response('late'));await Promise.resolve();await Promise.resolve();expect(scene.textures.addImage).not.toHaveBeenCalled();expect(URL.createObjectURL).not.toHaveBeenCalled();
});
it.each(['destroyed','reused'])('an old decoded image cannot mutate a %s scene and releases image/URL resources',async kind=>{
 let finish!:()=>void,current=true;const {scene,image}=transport(()=>new Promise<void>(r=>finish=r));vi.stubGlobal('fetch',vi.fn(async()=>new Response('art')));
 const loading=loadResultSourceArt(scene,'card','/card.webp',new AbortController().signal,()=>current);await vi.waitFor(()=>expect(finish).toBeTypeOf('function'));
 current=kind==='destroyed';scene.sys.settings.active=kind!=='destroyed';finish();expect(await loading).toBe(false);expect(scene.textures.addImage).not.toHaveBeenCalled();expect(image.src).toBe('');expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:result-source');
});
it('optional stalled art times out without installing a late response or leaving timers',async()=>{
 vi.useFakeTimers();const {scene}=transport();let respond!:(r:Response)=>void;vi.stubGlobal('fetch',vi.fn(()=>new Promise<Response>(r=>respond=r)));
 const loading=loadResultSourceArt(scene,'card','/card.webp',new AbortController().signal,()=>true);await vi.advanceTimersByTimeAsync(5000);expect(await loading).toBe(false);expect(vi.getTimerCount()).toBe(0);
 respond(new Response('late'));await vi.advanceTimersByTimeAsync(0);expect(scene.textures.addImage).not.toHaveBeenCalled();expect(URL.createObjectURL).not.toHaveBeenCalled();
});
it('shutdown during decode releases resources immediately; the old decode completion stays harmless',async()=>{
 let finish!:()=>void;const {scene,image}=transport(()=>new Promise<void>(r=>finish=r));vi.stubGlobal('fetch',vi.fn(async()=>new Response('art')));
 const request=new AbortController(),loading=loadResultSourceArt(scene,'card','/card.webp',request.signal,()=>true);await vi.waitFor(()=>expect(finish).toBeTypeOf('function'));
 request.abort();expect(await loading).toBe(false);expect(image.src).toBe('');expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:result-source');
 finish();await Promise.resolve();expect(scene.textures.addImage).not.toHaveBeenCalled();
});
const ordinary=JSON.parse(readFileSync('docs/production/evidence/w2-build-keepsake-2026-10-09/report.json','utf8')).profiles[0].transactions.find((t:{label:string})=>t.label==='normal continuation hand').state as R2RunState;
const high=JSON.parse(gunzipSync(readFileSync('docs/production/evidence/w5-natural-flush-midgame-2026-10-09/report.json.gz')).toString()).final as R2RunState;
const lost=JSON.parse(readFileSync('docs/production/evidence/pc-shop-2026-10-07/controlled-lose.json','utf8')).state as R2RunState;
it('ordinary saved b10 clear accents the actual character/source and keeps read10 separate from saved20',()=>{const before=JSON.stringify(ordinary),f=resultStageFacts(ordinary,true);expect(f.character).toBe('erxiang');expect(f.source?.definitionId).toBe('b10');expect(f.growth).toMatchObject({definitionId:'b10',before:'10',after:'20'});expect(f.intensity).toBe(1);expect(f.trace!.finalScore).toBe('325');expect(JSON.stringify(ordinary)).toBe(before);});
it('actual high/growth flush has a stronger score accent and c06 saved growth, with no unearned Erxiang portrait',()=>{const f=resultStageFacts(high,true);expect(f.intensity).toBe(2);expect(f.source?.definitionId).toBe('c06');expect(f.character).toBeUndefined();expect(f.growth).toMatchObject({before:'2.25',after:'2.5'});expect(f.trace!.finalScore).toBe('3802');});
it('failure, skipped and stale trace cannot become a success-source or growth celebration',()=>{for(const f of [resultStageFacts(lost,false),resultStageFacts({...ordinary,phase:'await-input'},true),resultStageFacts(ordinary,true,true),resultStageFacts({...ordinary,stage:{...ordinary.stage!,previousHandScore:'1'}},true)]){expect(f.trace).toBeNull();expect(f.source).toBeUndefined();expect(f.character).toBeUndefined();expect(f.growth).toBeUndefined();expect(f.intensity).toBe(1);}});
it('a zero-benefit character or joker event is not promoted just because its source appears in the trace',()=>{const s=structuredClone(ordinary);s.lastTrace!.events=s.lastTrace!.events.map(e=>e.sourceType==='character'?{...e,after:e.before,value:{n:'0',d:'1'}}:e);expect(resultStageFacts(s,true).character).toBeUndefined();});
it.each([{x:192,y:94,width:980,height:430},{x:12,y:108,width:366,height:356},{x:12,y:108,width:296,height:356},{x:12,y:76,width:446,height:194}])('result/source regions fit and remain separate at real PC, phone and short geometries',b=>{const p=resultStagePlan(b,b.height<200);for(const box of [p.score,p.source]){expect(box.x).toBeGreaterThanOrEqual(b.x);expect(box.y).toBeGreaterThanOrEqual(b.y);expect(box.x+box.width).toBeLessThanOrEqual(b.x+b.width);expect(box.y+box.height).toBeLessThanOrEqual(b.y+b.height);expect(box.width).toBeGreaterThan(100);expect(box.height).toBeGreaterThan(100);}expect(p.split?p.score.x>=p.source.x+p.source.width:p.source.y>=p.score.y+p.score.height).toBe(true);});
