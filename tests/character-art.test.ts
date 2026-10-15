import {afterEach,expect,it,vi} from 'vitest';
import {CHARACTER_ART,characterArt,characterArtKey,assertCharacterArtDimensions,assertCharacterArtReference,type CharacterArtAsset} from '../src/game/CharacterArt';
import {CHARACTERS} from '../src/game/characters';
import {avatarURL,portraitURL,selectionPortraitURL} from '../src/game/portraits';
const catalog=CHARACTER_ART as CharacterArtAsset[];
afterEach(()=>{catalog.splice(0);vi.unstubAllGlobals();vi.restoreAllMocks();});
const register=()=>{const a:CharacterArtAsset={id:'amo',purpose:'portrait',key:characterArtKey('amo','portrait'),path:'test-approved-art.webp',url:'https://game.example/test-approved-art.webp',width:615,height:768,bytes:64,sha256:'test-fixture',format:'webp'};catalog.push(a);return a;};
it('all six unavailable identities have stable keys and no image URL, including deployment subpaths',()=>{
 expect(catalog).toEqual([]);for(const c of CHARACTERS)for(const p of ['avatar','selection','portrait'] as const){expect(characterArt(c.id,p)).toBeUndefined();expect({avatar:avatarURL,selection:selectionPortraitURL,portrait:portraitURL}[p](c.id)).toBe('');expect(characterArtKey(c.id,p)).toContain(c.id);}
});
it('unregistered hero keys cannot fetch an empty image, deleted placeholder or archived old face',async()=>{
 const fetch=vi.fn();vi.stubGlobal('fetch',fetch);const {loadArtTexture}=await import('../src/game/ArtTextureLoading');
 for(const url of ['', '/assets/cast-placeholders/amo.portrait.svg','/assets/handdrawn-p08/characters/amo.portrait.webp'])await expect(loadArtTexture({textures:{exists:()=>false}} as never,characterArtKey('amo','portrait'),url,new AbortController().signal)).rejects.toThrow('character-art-reference');expect(fetch).not.toHaveBeenCalled();
});
it('future approved art retains exact URL/id/role/dimension checks; synthetic registration is test-only',()=>{
 const a=register();expect(()=>assertCharacterArtReference(a.key,a.url)).not.toThrow();
 for(const url of ['/old.webp',a.url+'?other=1',a.url.replace('game.example','other.example')])expect(()=>assertCharacterArtReference(a.key,url)).toThrow('character-art-reference');
 expect(()=>assertCharacterArtReference(characterArtKey('azao','portrait'),a.url)).toThrow('character-art-reference');expect(()=>assertCharacterArtReference(characterArtKey('amo','avatar'),a.url)).toThrow();
 expect(()=>assertCharacterArtDimensions(a.url,615,768)).not.toThrow();expect(()=>assertCharacterArtDimensions(a.url,256,320)).toThrow('character-art-dimensions');
});
it('actual transfer still rejects wrong dimensions before publishing and explicit recovery decodes first',async()=>{
 const a=register(),textures=new Map(),addImage=vi.fn((key,image)=>textures.set(key,image)),game={textures:{exists:(k:string)=>textures.has(k),addImage}} as any;let width=256,height=320;
 vi.stubGlobal('Image',class{src='';decoding='async';naturalWidth=width;naturalHeight=height;async decode(){}removeAttribute(){}});
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(new Blob(['controlled']),{headers:{'content-type':'image/webp'}})));
 const {loadArtTexture}=await import('../src/game/ArtTextureLoading'),signal=new AbortController().signal;
 await expect(loadArtTexture(game,a.key,a.url,signal)).rejects.toMatchObject({retryable:false,message:expect.stringContaining('character-art-dimensions')});expect(addImage).not.toHaveBeenCalled();width=615;height=768;
 await loadArtTexture(game,a.key,a.url,signal);expect(addImage).toHaveBeenCalledOnce();await loadArtTexture(game,a.key,a.url,signal);expect(fetch).toHaveBeenCalledTimes(2);
});
