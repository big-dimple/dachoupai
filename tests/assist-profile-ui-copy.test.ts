import {expect,it,vi} from 'vitest';
vi.mock('phaser',()=>({default:{Scene:class {}}}));
import {GameScene} from '../src/game/GameScene';
import {ShopScene} from '../src/game/ShopScene';
import {createRun,applyCommand} from '../src/domain/run';
import {R2_RULESETS,r2UsesAssist} from '../src/domain/r2Run';
import {CHARACTER_IDS,type CharacterId} from '../src/domain/characters';
import {r2CreateJoker} from '../src/domain/r2Run';
import {r2JokerDefinitionsFor} from '../src/domain/r2ContentProfiles';
import {jokerAbilityCopyForRun,publicJokerMemoryContext} from '../src/game/JokerMemory';
import {characterForRun} from '../src/game/CharacterRunCopy';
import legacy from './fixtures/r2-v10-amo-checkpoints.json';
const main=['spades-9','hearts-9','clubs-13','diamonds-13'],side=['spades-12','hearts-12'];
function state(prototype:boolean,identity?:{contentVersion:string;contentHash:string},characterId:CharacterId='amo'){
 let s=createRun({runId:'ui-copy',seed:'ui-copy',characterId,rulesVersion:'r2',...(identity?{r2Identity:identity}:prototype?{r2Profile:'amo-assist-v1' as const}:{})});
 for(const type of ['LeaveShop','EnterStage'] as const){const r=applyCommand(s,{runId:s.runId,commandId:type,expectedSeq:s.commandSeq,action:{type}});if(!r.ok)throw Error(r.code);s=r.state;}
 s.handOrder=[...main,...side,'clubs-6','diamonds-7'];s.drawPile=s.deckInstances.map(c=>c.id).filter(id=>!s.handOrder.includes(id));return s;
}
it('same-ID game and shop copy follows the current exact profile in both directions',()=>{
 const game=Object.create(GameScene.prototype) as any,shop=Object.create(ShopScene.prototype) as any;
 for(const prototype of [false,true,false,true])for(const id of ['pengci','a03','a05','a06','a10','a11','a12']){
  const s=state(prototype),j=r2CreateJoker(id,'same-instance',0);s.jokers=[j];
  Object.assign(game,{run:s,selectedIds:new Set(main),assistIds:prototype?side:[],playing:false,presentation:undefined});shop.run=s;
  const facts=game.selectionPreview(),ctx=game.memoryContext(j,facts);
  expect(game.jokerAbility(j,facts)).toEqual(jokerAbilityCopyForRun(s,id,j,ctx));
  expect(shop.jokerCopy(id,j)).toEqual(jokerAbilityCopyForRun(s,id,j,publicJokerMemoryContext(s,{hand:[],scoringLimited:false,deckSize:s.deckInstances.length,jokerSlots:5,jokerCount:1})));
  expect(game.candidateInput().definitions).toBe(r2JokerDefinitionsFor(s));expect(game.candidateInput().contentVersion).toContain(s.contentHash);
  if(prototype){expect(facts.heldIds).not.toContain(side[0]);expect(facts.assistConsumedIds).toEqual(side);}
 }
});
it('saved Amo role copy distinguishes assist, before-Joker v10 and after-Joker v11 without changing other characters',()=>{
 expect(characterForRun(state(true)).passiveName).toBe('主手＋助攻（试行）');
 expect(characterForRun(legacy.before.state as any).passiveDescription).toContain('之前');
 expect(characterForRun(state(false)).passiveDescription).toContain('之后');
});

it('all known identities bind game, shop and AI to the exact definition; only Amo shows assist',()=>{
 const game=Object.create(GameScene.prototype) as any,shop=Object.create(ShopScene.prototype) as any;
 for(const profile of R2_RULESETS)for(const characterId of CHARACTER_IDS){
  if(profile.contentVersion==='quality-r2-amo-assist-prototype-v1'&&characterId!=='amo')continue;
  const s=state(false,{contentVersion:profile.contentVersion,contentHash:profile.contentHash},characterId),defs=r2JokerDefinitionsFor(s);
  Object.assign(game,{run:s,selectedIds:new Set(main),assistIds:[],playing:false,presentation:undefined});shop.run=s;
  expect(game.assistProfile).toBe(r2UsesAssist(s));expect(game.assistProfile).toBe(characterId==='amo'&&profile.amoScoreTiming==='assist-v1');
  for(const id of ['a06','f10','d12','e04']){
   const j=r2CreateJoker(id,'same-instance',0,undefined,s);s.jokers=[j];const facts=game.selectionPreview();
   expect(game.jokerAbility(j,facts)).toEqual(jokerAbilityCopyForRun(s,id,j,game.memoryContext(j,facts)));
   expect(shop.jokerCopy(id,j)).toEqual(jokerAbilityCopyForRun(s,id,j,publicJokerMemoryContext(s,{hand:[],scoringLimited:false,deckSize:s.deckInstances.length,jokerSlots:5,jokerCount:1})));
   expect(game.candidateInput().definitions).toBe(defs);expect(game.candidateInput().contentVersion).toContain(s.contentHash);
  }
 }
});
