import {afterEach,expect,it,vi} from 'vitest';
import {characterArt,assertCharacterArtDimensions,assertCharacterArtReference,validCharacterImage} from '../src/game/CharacterArt';
import {CHARACTERS} from '../src/game/characters';
import {avatarKey,avatarURL,selectionPortraitKey,selectionPortraitURL,portraitKey,portraitURL} from '../src/game/portraits';
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();vi.restoreAllMocks();vi.resetModules();});
it('all six identities and three roles share the same manifest URLs, keys and exact pixel sizes',()=>{
 const urls=new Set<string>(),keys=new Set<string>();
 for(const c of CHARACTERS)for(const purpose of ['avatar','selection','portrait'] as const){
  const a=characterArt(c.id,purpose),url={avatar:avatarURL,selection:selectionPortraitURL,portrait:portraitURL}[purpose](c.id),key={avatar:avatarKey,selection:selectionPortraitKey,portrait:portraitKey}[purpose](c.id);
  expect(a.url).toBe(url);expect(a.key).toBe(key);expect(()=>assertCharacterArtReference(key,url)).not.toThrow();
  expect(()=>assertCharacterArtDimensions(url,a.width,a.height)).not.toThrow();
  expect(()=>assertCharacterArtDimensions(url,a.width-1,a.height)).toThrow('character-art-dimensions');
  if(purpose==='portrait')expect(c.portrait).toBe(url);urls.add(url);keys.add(key);
 }
 expect(urls.size).toBe(18);expect(keys.size).toBe(18);
});
it('a swapped hero, role or arbitrary URL cannot populate a character key; unrelated art is unaffected',()=>{
 expect(()=>assertCharacterArtReference(avatarKey('amo'),avatarURL('azao'))).toThrow('character-art-reference');
 expect(()=>assertCharacterArtReference(portraitKey('amo'),selectionPortraitURL('amo'))).toThrow('character-art-reference');
 expect(()=>assertCharacterArtReference(avatarKey('amo'),'/old-face.webp')).toThrow('character-art-reference');
 expect(()=>assertCharacterArtReference('wrong-key',avatarURL('amo'))).toThrow('character-art-reference');
 expect(()=>assertCharacterArtReference('joker-key','/card.webp')).not.toThrow();
 expect(()=>assertCharacterArtDimensions('/card.webp',128,160)).not.toThrow();
 expect(validCharacterImage({src:portraitURL('amo'),naturalWidth:256,naturalHeight:320} as HTMLImageElement)).toBe(false);
});
it('the real transfer rejects a small wrong-size face before publication, then an explicit retry can recover',async()=>{
 const textures=new Map(),addImage=vi.fn((key,image)=>textures.set(key,image));
 const game={textures:{exists:(key:string)=>textures.has(key),addImage}} as any;
 let width=256,height=320;
 vi.stubGlobal('Image',class{src='';decoding='async';naturalWidth=width;naturalHeight=height;async decode(){}removeAttribute(){}});
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(new Blob(['controlled-decode']),{headers:{'content-type':'image/webp'}})));
 const {loadArtTexture}=await import('../src/game/ArtTextureLoading'),signal=new AbortController().signal;
 await expect(loadArtTexture(game,portraitKey('amo'),portraitURL('amo'),signal)).rejects.toMatchObject({retryable:false,message:expect.stringContaining('character-art-dimensions')});
 expect(addImage).not.toHaveBeenCalled();width=615;height=768;
 await loadArtTexture(game,portraitKey('amo'),portraitURL('amo'),signal);expect(addImage).toHaveBeenCalledOnce();
 await expect(loadArtTexture(game,portraitKey('amo'),portraitURL('azao'),signal)).rejects.toThrow('character-art-reference');
 expect(fetch).toHaveBeenCalledTimes(2);
});
it('detail upgrades reject wrong-size bitmaps and release them before caching a blob',async()=>{
 const close=vi.fn();let width=256,height=320;
 vi.stubGlobal('createImageBitmap',async()=>({width,height,close}));
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(new Blob(['controlled-decode']))));
 const {detailArt}=await import('../src/game/DetailArt');
 await expect(detailArt(portraitURL('amo'))).rejects.toThrow('detail-image-unavailable');expect(close).toHaveBeenCalledOnce();
 width=615;height=768;const blob=await detailArt(portraitURL('amo'));expect(blob).toMatch(/^blob:/);expect(fetch).toHaveBeenCalledTimes(2);
});

it('deployment subpaths remain inside Vite BASE_URL and participate in exact reference checks',async()=>{
 vi.stubEnv('BASE_URL','/dachoupai/');vi.resetModules();
 const art=await import('../src/game/CharacterArt'),a=art.characterArt('amo','portrait');
 expect(a.url).toBe('/dachoupai/assets/handdrawn-p08/characters/amo.portrait.webp');
 expect(()=>art.assertCharacterArtReference(a.key,a.url)).not.toThrow();
 expect(()=>art.assertCharacterArtReference(a.key,'/assets/handdrawn-p08/characters/amo.portrait.webp')).toThrow('character-art-reference');
});

it('same-path foreign origins and query variants cannot impersonate a manifest texture URL',()=>{
 vi.stubGlobal('document',{baseURI:'https://game.example/dachoupai/'});
 const a=characterArt('amo','avatar');
 expect(()=>assertCharacterArtReference(a.key,'https://game.example'+a.url)).not.toThrow();
 expect(()=>assertCharacterArtReference(a.key,'https://other.example'+a.url)).toThrow('character-art-reference');
 expect(()=>assertCharacterArtReference(a.key,a.url+'?variant=another')).toThrow('character-art-reference');
});
