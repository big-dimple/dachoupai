import {describe,it,expect,vi,beforeEach} from 'vitest';
import type Phaser from 'phaser';
const art=vi.hoisted(()=>({detail:vi.fn(),decode:vi.fn(),invalidate:vi.fn()}));
vi.mock('../src/game/DetailArt',()=>({detailArt:art.detail,decodeArtImage:art.decode,invalidateArt:art.invalidate}));
import {requestGoodsArt,retryGoodsArt,goodsArtLoadState,goodsArtKey} from '../src/game/GoodsArtLoading';
function fixture(){const callbacks=new Map<string,Set<()=>void>>(),textures=new Map();const events={once:(key:string,f:()=>void)=>{if(!callbacks.has(key))callbacks.set(key,new Set());callbacks.get(key)!.add(f);},off:(key:string,f:()=>void)=>callbacks.get(key)?.delete(f)};const scene={events,textures:{exists:(key:string)=>textures.has(key),addImage:vi.fn((key:string,image:unknown)=>textures.set(key,image))}};return {scene:scene as unknown as Phaser.Scene,add:scene.textures.addImage,shutdown:()=>[...callbacks.get('shutdown')??[]].forEach(f=>f()),callbacks};}
const tick=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
beforeEach(()=>{vi.clearAllMocks();art.detail.mockReset().mockResolvedValue('blob:thumb');art.decode.mockReset().mockResolvedValue({width:128,height:160});});
describe('scene-owned tool/item thumbnail loading',()=>{
  it('deduplicates redraws, paints decoded external images and reuses texture cache',async()=>{
    const f=fixture(),refresh=vi.fn();requestGoodsArt(f.scene,'T12','/game/assets/glass.webp',refresh);requestGoodsArt(f.scene,'T12','/game/assets/glass.webp',refresh);await tick();
    expect(art.detail).toHaveBeenCalledTimes(1);expect(art.detail.mock.calls[0][0]).toBe('/game/assets/glass.webp');expect(f.add).toHaveBeenCalledWith(goodsArtKey('T12'),{width:128,height:160});expect(goodsArtLoadState(f.scene,'T12')).toEqual({status:'loaded',attempts:1});expect(refresh).toHaveBeenCalledTimes(1);
    requestGoodsArt(f.scene,'T12','/game/assets/glass.webp',refresh);expect(art.detail).toHaveBeenCalledTimes(1);
  });
  it('keeps failures retryable without automatic repeated fetches and invalidates failed decode cache',async()=>{
    const f=fixture(),refresh=vi.fn();art.decode.mockRejectedValueOnce(Error('decode'));
    requestGoodsArt(f.scene,'T12','/thumb.webp',refresh);await tick();expect(goodsArtLoadState(f.scene,'T12').status).toBe('failed');expect(f.add).not.toHaveBeenCalled();expect(art.invalidate).toHaveBeenCalledWith('/thumb.webp','blob:thumb');
    requestGoodsArt(f.scene,'T12','/thumb.webp',refresh);expect(art.detail).toHaveBeenCalledTimes(1);expect(await retryGoodsArt(f.scene,'T12','/thumb.webp',refresh)).toBe(true);expect(goodsArtLoadState(f.scene,'T12').attempts).toBe(2);
  });
  it('aborts shutdown work, removes owned listeners and ignores late decode results',async()=>{
    const f=fixture(),refresh=vi.fn();let finish!:(value:string)=>void;art.detail.mockImplementationOnce(()=>new Promise<string>(yes=>{finish=yes;}));requestGoodsArt(f.scene,'S02','/thumb.webp',refresh);const signal=art.detail.mock.calls[0][2] as AbortSignal;
    f.shutdown();expect(signal.aborted).toBe(true);expect([...f.callbacks.values()].every(set=>set.size===0)).toBe(true);finish('blob:late');await tick();expect(f.add).not.toHaveBeenCalled();expect(refresh).not.toHaveBeenCalled();
    requestGoodsArt(f.scene,'S02','/thumb.webp',refresh);await tick();expect(f.add).toHaveBeenCalledTimes(1);
  });
});
