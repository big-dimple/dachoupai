import {describe,it,expect,vi,beforeEach} from 'vitest';
import type Phaser from 'phaser';
const art=vi.hoisted(()=>({detail:vi.fn(),promote:vi.fn()}));
vi.mock('../src/game/ArtTextureLoading',()=>({loadArtTexture:art.detail,promoteArtTexture:art.promote}));
import {requestGoodsArt,retryGoodsArt,goodsArtLoadState,goodsArtKey} from '../src/game/GoodsArtLoading';
let lastFixture:{add:(key:string,image:unknown)=>void}|undefined;
function fixture(){const callbacks=new Map<string,Set<()=>void>>(),textures=new Map();const events={once:(key:string,f:()=>void)=>{if(!callbacks.has(key))callbacks.set(key,new Set());callbacks.get(key)!.add(f);},off:(key:string,f:()=>void)=>callbacks.get(key)?.delete(f)};const scene={game:{},events,textures:{exists:(key:string)=>textures.has(key),addImage:vi.fn((key:string,image:unknown)=>textures.set(key,image))}};lastFixture={add:scene.textures.addImage};return {scene:scene as unknown as Phaser.Scene,add:scene.textures.addImage,shutdown:()=>[...callbacks.get('shutdown')??[]].forEach(f=>f()),callbacks};}
const tick=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
beforeEach(()=>{vi.clearAllMocks();art.detail.mockReset().mockImplementation(async(_game,key)=>{lastFixture?.add(key,{width:128,height:160});});});
describe('scene-owned tool/item thumbnail loading',()=>{
  it('deduplicates redraws, paints decoded external images and reuses texture cache',async()=>{
    const f=fixture(),refresh=vi.fn();requestGoodsArt(f.scene,'T12','/game/assets/glass.webp',refresh);requestGoodsArt(f.scene,'T12','/game/assets/glass.webp',refresh);await tick();
    expect(art.detail).toHaveBeenCalledTimes(1);expect(art.detail.mock.calls[0][2]).toBe('/game/assets/glass.webp');expect(f.add).toHaveBeenCalledWith(goodsArtKey('T12'),{width:128,height:160});expect(goodsArtLoadState(f.scene,'T12')).toEqual({status:'loaded',attempts:1});expect(refresh).toHaveBeenCalledTimes(1);
    requestGoodsArt(f.scene,'T12','/game/assets/glass.webp',refresh);expect(art.detail).toHaveBeenCalledTimes(1);
  });
  it('keeps failures retryable without automatic repeated fetches and invalidates failed decode cache',async()=>{
    const f=fixture(),refresh=vi.fn();art.detail.mockRejectedValueOnce(Error('decode'));
    requestGoodsArt(f.scene,'T12','/thumb.webp',refresh);await tick();expect(goodsArtLoadState(f.scene,'T12').status).toBe('failed');expect(f.add).not.toHaveBeenCalled();
    requestGoodsArt(f.scene,'T12','/thumb.webp',refresh);expect(art.detail).toHaveBeenCalledTimes(1);expect(await retryGoodsArt(f.scene,'T12','/thumb.webp',refresh)).toBe(true);expect(goodsArtLoadState(f.scene,'T12').attempts).toBe(2);
  });
  it('aborts shutdown work, removes owned listeners and ignores late decode results',async()=>{
    const f=fixture(),refresh=vi.fn();let finish!:(value:string)=>void;art.detail.mockImplementationOnce(()=>new Promise<string>(yes=>{finish=yes;}));requestGoodsArt(f.scene,'S02','/thumb.webp',refresh);await tick();const signal=art.detail.mock.calls[0][3] as AbortSignal;
    f.shutdown();expect(signal.aborted).toBe(true);expect([...f.callbacks.values()].every(set=>set.size===0)).toBe(true);finish('blob:late');await tick();expect(f.add).not.toHaveBeenCalled();expect(refresh).not.toHaveBeenCalled();
    requestGoodsArt(f.scene,'S02','/thumb.webp',refresh);await tick();expect(f.add).toHaveBeenCalledTimes(1);
  });
  it('prioritizes the real top fan face while leaving covered decorative choices speculative',async()=>{
    const f=fixture();Object.assign(f.scene,{children:{list:[{name:'shop/goods-art/T09',getData:(key:string)=>key==='basicChoiceArt'}, {name:'shop/goods-art/T08',getData:(key:string)=>key==='basicChoiceArt'||key==='primary'}]}});
    requestGoodsArt(f.scene,'T09','/covered',()=>{});requestGoodsArt(f.scene,'T08','/visible',()=>{});await tick();
    expect(art.detail.mock.calls.map(call=>[call[2],call[4]])).toEqual([['/covered',false],['/visible',true]]);
  });

  it('promotes a loading covered card when the same ID becomes primary without subscribing or retrying again',async()=>{
    const f=fixture(),refresh=vi.fn();let primary=false,finish!:()=>void;
    Object.assign(f.scene,{children:{list:[{name:'shop/goods-art/T09',getData:(key:string)=>key==='basicChoiceArt'||key==='primary'&&primary}]}});
    art.detail.mockImplementationOnce(()=>new Promise<void>(resolve=>finish=resolve));
    requestGoodsArt(f.scene,'T09','/top',refresh);await tick();expect(art.detail.mock.calls[0][4]).toBe(false);
    primary=true;requestGoodsArt(f.scene,'T09','/top',refresh);requestGoodsArt(f.scene,'T09','/top',refresh);await tick();
    expect(art.promote).toHaveBeenCalledExactlyOnceWith(f.scene.game,goodsArtKey('T09'));expect(art.detail).toHaveBeenCalledOnce();expect(goodsArtLoadState(f.scene,'T09').attempts).toBe(1);
    f.add(goodsArtKey('T09'),{});finish();await tick();expect(refresh).toHaveBeenCalledOnce();expect(goodsArtLoadState(f.scene,'T09').status).toBe('loaded');f.shutdown();
  });
  it('does not promote or refresh a covered card after shutdown before the redraw microtask',async()=>{
    const f=fixture(),refresh=vi.fn();let primary=false,finish!:()=>void;
    Object.assign(f.scene,{children:{list:[{name:'shop/goods-art/T09',getData:(key:string)=>key==='basicChoiceArt'||key==='primary'&&primary}]}});
    art.detail.mockImplementationOnce(()=>new Promise<void>(resolve=>finish=resolve));requestGoodsArt(f.scene,'T09','/top',refresh);await tick();
    primary=true;requestGoodsArt(f.scene,'T09','/top',refresh);f.shutdown();await tick();expect(art.promote).not.toHaveBeenCalled();finish();await tick();expect(refresh).not.toHaveBeenCalled();expect(f.add).not.toHaveBeenCalled();
  });

});
