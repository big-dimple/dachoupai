import {expect,it,vi,afterEach} from 'vitest';
import {sceneResources,boundedResources,PRELOAD_PIXEL_BUDGET,prepareSceneResources} from '../src/game/SceneResources';
import {loadArtTexture} from '../src/game/ArtTextureLoading';
import {growthSelectionPlan} from '../harness/fixtures/growth-selection';
import {CHARACTER_IDS} from '../src/domain/characters';
vi.mock('../src/game/ArtTextureLoading',()=>({loadArtTexture:vi.fn(),promoteArtTexture:vi.fn()}));
afterEach(()=>{vi.useRealTimers();vi.clearAllMocks();});
it('prepares the full small-card catalog within 20MiB decoded; no HD, music or missing hero URLs',()=>{
 const assets=sceneResources('title',undefined,true);expect(assets).toHaveLength(146);expect(new Set(assets.map(a=>a.key)).size).toBe(146);expect(assets.reduce((n,a)=>n+a.pixels,0)).toBeLessThanOrEqual(PRELOAD_PIXEL_BUDGET);
 expect(assets.filter(a=>a.key.startsWith('p08-joker'))).toHaveLength(72);expect(assets.filter(a=>a.key.startsWith('goods-art'))).toHaveLength(51);
 expect(assets.some(a=>/detail|music|cast-placeholders|characters\//.test(a.url))).toBe(false);
 expect(sceneResources('character-select')).toHaveLength(12);expect(assets.some(a=>/opening-portrait-|portrait-focus-/.test(a.key))).toBe(false);
});
it('uses actual public run sources only and never changes save/RNG or hidden deck order',()=>{const s=growthSelectionPlan().state,before=JSON.stringify(s),a=sceneResources('game',s);expect(a.some(a=>a.key==='p08-joker-c06')).toBe(true);expect(JSON.stringify(s)).toBe(before);const other=structuredClone(s);other.drawPile.reverse();expect(sceneResources('game',other)).toEqual(a);});
it('prepares exactly the saved hero eye strip before the table without expanding the startup catalog',()=>{
 for(const id of CHARACTER_IDS){const s={...growthSelectionPlan().state,characterId:id},before=JSON.stringify(s),assets=sceneResources('game',s);expect(assets.filter(a=>a.key.startsWith('hero-eyes-')).map(a=>a.key)).toEqual(['hero-eyes-'+id]);expect(assets.reduce((n,a)=>n+a.pixels,0)).toBeLessThanOrEqual(PRELOAD_PIXEL_BUDGET);expect(JSON.stringify(s)).toBe(before);}
 expect(sceneResources('title',undefined,true).some(a=>a.key.startsWith('hero-eyes-'))).toBe(false);
});
it('deduplicates and refuses images that exceed the planned pixel budget',()=>{const a={key:'a',url:'a',pixels:4};expect(boundedResources([a,a,{key:'huge',url:'x',pixels:99},{key:'empty',url:'',pixels:1}],4)).toEqual([a]);});
it('counts completion only when the shared decoding promise resolves',async()=>{
 let decoded!:()=>void;vi.mocked(loadArtTexture).mockImplementationOnce(()=>new Promise(resolve=>decoded=resolve));const updates:any[]=[];
 const done=prepareSceneResources({} as never,[{key:'a',url:'a',pixels:1}],p=>updates.push(p),new AbortController().signal);expect(updates.at(-1).loaded).toBe(0);decoded();const result=await done;expect(result.loaded).toBe(1);expect(result.failed).toBe(0);
});
it('deadline and cancellation return unfinished counts, never a fabricated 100 percent',async()=>{
 vi.useFakeTimers();vi.mocked(loadArtTexture).mockImplementation(()=>new Promise(()=>{}));const c=new AbortController(),assets=[{key:'a',url:'a',pixels:1}],done=prepareSceneResources({} as never,assets,()=>{},c.signal,300);
 await vi.advanceTimersByTimeAsync(300);expect(await done).toMatchObject({loaded:0,pending:1});const next=prepareSceneResources({} as never,assets,()=>{},c.signal);c.abort();expect(await next).toMatchObject({loaded:0,pending:1});
});
it('cached decoded textures start as loaded and are never passed to the transfer queue again',async()=>{
 vi.mocked(loadArtTexture).mockResolvedValue();const game={textures:{exists:(key:string)=>key==='cached'}} as never,updates:any[]=[];
 const result=await prepareSceneResources(game,[{key:'cached',url:'cached',pixels:1},{key:'new',url:'new',pixels:1}],p=>updates.push(p),new AbortController().signal);
 expect(updates[0].loaded).toBe(1);expect(result.loaded).toBe(2);expect(loadArtTexture).toHaveBeenCalledOnce();expect(vi.mocked(loadArtTexture).mock.calls[0][1]).toBe('new');
});
