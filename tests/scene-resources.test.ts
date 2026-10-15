import {expect,it,vi,afterEach} from 'vitest';
import {sceneResources,boundedResources,PRELOAD_PIXEL_BUDGET,prepareSceneResources} from '../src/game/SceneResources';
import {loadArtTexture} from '../src/game/ArtTextureLoading';
import {growthSelectionPlan} from '../harness/fixtures/growth-selection';
vi.mock('../src/game/ArtTextureLoading',()=>({loadArtTexture:vi.fn(),promoteArtTexture:vi.fn()}));
afterEach(()=>{vi.useRealTimers();vi.clearAllMocks();});
it('prepares the full small-card catalog within 16MiB decoded; no HD, music or missing hero URLs',()=>{
 const assets=sceneResources('title',undefined,true);expect(assets).toHaveLength(134);expect(new Set(assets.map(a=>a.key)).size).toBe(134);expect(assets.reduce((n,a)=>n+a.pixels,0)).toBeLessThanOrEqual(PRELOAD_PIXEL_BUDGET);
 expect(assets.filter(a=>a.key.startsWith('p08-joker'))).toHaveLength(72);expect(assets.filter(a=>a.key.startsWith('goods-art'))).toHaveLength(51);
 expect(assets.some(a=>/detail|music|cast-placeholders|characters\//.test(a.url))).toBe(false);
 expect(sceneResources('character-select')).toEqual([]);
});
it('uses actual public run sources only and never changes save/RNG or hidden deck order',()=>{const s=growthSelectionPlan().state,before=JSON.stringify(s),a=sceneResources('game',s);expect(a.some(a=>a.key==='p08-joker-c06')).toBe(true);expect(JSON.stringify(s)).toBe(before);const other=structuredClone(s);other.drawPile.reverse();expect(sceneResources('game',other)).toEqual(a);});
it('deduplicates and refuses images that exceed the planned pixel budget',()=>{const a={key:'a',url:'a',pixels:4};expect(boundedResources([a,a,{key:'huge',url:'x',pixels:99},{key:'empty',url:'',pixels:1}],4)).toEqual([a]);});
it('counts completion only when the shared decoding promise resolves',async()=>{
 let decoded!:()=>void;vi.mocked(loadArtTexture).mockImplementationOnce(()=>new Promise(resolve=>decoded=resolve));const updates:any[]=[];
 const done=prepareSceneResources({} as never,[{key:'a',url:'a',pixels:1}],p=>updates.push(p),new AbortController().signal);expect(updates.at(-1).loaded).toBe(0);decoded();const result=await done;expect(result.loaded).toBe(1);expect(result.failed).toBe(0);
});
it('deadline and cancellation return unfinished counts, never a fabricated 100 percent',async()=>{
 vi.useFakeTimers();vi.mocked(loadArtTexture).mockImplementation(()=>new Promise(()=>{}));const c=new AbortController(),assets=[{key:'a',url:'a',pixels:1}],done=prepareSceneResources({} as never,assets,()=>{},c.signal,300);
 await vi.advanceTimersByTimeAsync(300);expect(await done).toMatchObject({loaded:0,pending:1});const next=prepareSceneResources({} as never,assets,()=>{},c.signal);c.abort();expect(await next).toMatchObject({loaded:0,pending:1});
});
