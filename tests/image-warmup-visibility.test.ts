import {afterEach,expect,it,vi} from 'vitest';
const status=vi.hoisted(()=>({mount:vi.fn(()=>({refresh:vi.fn(),destroy:vi.fn()})),load:vi.fn(async()=>{})}));
vi.mock('../src/game/ImageWarmupStatus',()=>({imageWarmupStatus:status.mount}));
vi.mock('../src/game/ArtTextureLoading',()=>({loadArtTexture:status.load}));
import {warmCatalogBackground} from '../src/game/StageImageWarmup';
const scene=()=>({game:{scene:{isActive:()=>true},registry:{get:()=>undefined},textures:{on:vi.fn(),off:vi.fn()},events:{on:vi.fn(),off:vi.fn(),once:vi.fn()}}});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();vi.clearAllMocks();});
it.each([['production','?harness=1&imageDebug=1'],['e2e','?harness=1'],['test','?imageDebug=1']])('%s keeps catalog warmup silent for %s without stopping transfers',(mode,search)=>{vi.stubEnv('MODE',mode);vi.stubGlobal('navigator',{connection:{}});vi.stubGlobal('location',{search});const s=scene();warmCatalogBackground(s as never);expect(status.mount).not.toHaveBeenCalled();expect(status.load).toHaveBeenCalled();s.game.events.once.mock.calls.find(c=>c[0]==='destroy')![1]();});
it('only an explicit imageDebug request in an E2E build mounts the diagnostic surface',()=>{vi.stubEnv('MODE','e2e');vi.stubGlobal('navigator',{connection:{}});vi.stubGlobal('location',{search:'?harness=1&imageDebug=1'});const s=scene();warmCatalogBackground(s as never);expect(status.mount).toHaveBeenCalledOnce();expect(status.load).toHaveBeenCalled();s.game.events.once.mock.calls.find(c=>c[0]==='destroy')![1]();});
