import {afterEach,expect,it,vi} from 'vitest';
vi.mock('phaser',()=>({default:{Scene:class {}}}));
vi.mock('../src/game/runAdapter',()=>({dispatchRun:vi.fn(),runController:vi.fn()}));
import {GameScene} from '../src/game/GameScene';
import {dispatchRun} from '../src/game/runAdapter';
import {AiHandCandidateCache,type AiHandInput} from '../src/game/AiHandCandidates';
import {R2_JOKERS} from '../src/content/r2Schema';
const input:AiHandInput={hand:[{id:'a',rank:14,suit:'spades'}],jokers:[],definitions:R2_JOKERS,disabledIds:[],boss:null,stageIndex:0,sealedJokerIds:[],challengeDisabledJokerId:null,resources:{gold:3,handsLeft:4,playIndex:0,discardsUsed:0,stageHeat:'0',target:'400'},contentVersion:'test',score:{characterId:'amo',amoScoreTiming:'after-joker',handLevels:{},previousHandType:null,wager:false,jokerSlots:5,previousHandScore:null}};
type Operation='command'|'playSelected'|'discardSelected';
function setup(ready=true){
 const cache=new AiHandCandidateCache(),oldReady=vi.fn(),newReady=vi.fn();cache.update(input,oldReady);
 const scene=Object.create(GameScene.prototype) as Record<string,any>;
 Object.defineProperties(scene,{ready:{value:ready},hand:{value:input.hand},handsLeft:{value:4},heat:{value:'0'}});
 Object.assign(scene,{aiCandidates:cache,aiCursor:{key:'old',index:0,selection:'a'},run:{phase:'await-input',gold:3,consumables:[],lastTrace:null,handOrder:['a'],stage:{discardsLeft:3}},selectedIds:new Set(['a']),assistIds:[],lifecycle:1,intent:0,playing:false,presentation:undefined,cardViews:[],clearHover:vi.fn(),updateControls:vi.fn(),alive:()=>true,statusMessage:'',refreshSelection:vi.fn(()=>{expect(scene.playing).toBe(false);cache.update(input,newReady);})});
 return{scene,cache,oldReady,newReady};
}
const invoke=(scene:Record<string,any>,operation:Operation)=>operation==='command'?scene.command({type:'ReorderHand',ids:['a']}):scene[operation]();
afterEach(()=>{vi.useRealTimers();vi.clearAllMocks();});
it.each(['command','playSelected','discardSelected'] as const)('%s cancels pending old work before dispatch and rebuilds it after a failed action',async operation=>{
 vi.useFakeTimers();const {scene,cache,oldReady,newReady}=setup();
 vi.mocked(dispatchRun).mockImplementation(async()=>{expect(scene.playing).toBe(true);expect(cache.result).toBeUndefined();expect(scene.aiCursor).toBeUndefined();return{ok:false,code:'stale-sequence'} as never;});
 await invoke(scene,operation);expect(dispatchRun).toHaveBeenCalledOnce();expect(scene.refreshSelection).toHaveBeenCalledOnce();expect(cache.result?.status).toBe('working');
 await vi.runAllTimersAsync();expect(oldReady).not.toHaveBeenCalled();expect(newReady).toHaveBeenCalledOnce();expect(cache.result?.status).toBe('ready');
});
it.each(['command','playSelected','discardSelected'] as const)('%s that fails the existing busy gate keeps its current computation',async operation=>{
 vi.useFakeTimers();const {scene,cache,oldReady,newReady}=setup(false),cursor=scene.aiCursor;
 await invoke(scene,operation);expect(dispatchRun).not.toHaveBeenCalled();expect(scene.aiCursor).toBe(cursor);expect(scene.refreshSelection).not.toHaveBeenCalled();
 await vi.runAllTimersAsync();expect(oldReady).toHaveBeenCalledOnce();expect(newReady).not.toHaveBeenCalled();expect(cache.result?.status).toBe('ready');
});
