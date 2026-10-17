import {expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {GAME_NAME,playerText} from '../src/game/Brand';
import {heroText} from '../src/game/HeroIdentity';
import {heroDetailRules} from '../src/game/HeroText';
import {CHARACTER_IDS} from '../src/domain/characters';
import {characterForRun} from '../src/game/CharacterRunCopy';
import {R2_PUBLISHED_CONTENT} from '../src/domain/r2PublishedContent';
import {R2_ASSIST_VERSION} from '../src/domain/r2AssistIdentity';
import {R2_RULESETS,r2CreateJoker} from '../src/domain/r2Run';
import {createRun} from '../src/domain/run';
import {isR2RouteStarter} from '../src/domain/r2GroupUpgrade';
import {newRunIdentity} from '../src/game/RunLaunch';
import {makeCheckpoint,readCheckpoint} from '../src/application/checkpoint';
import {R2_BOSSES,r2BossText} from '../src/domain/r2Chapter';
import {R2_MODE_CATALOG,r2ModeStorageKey} from '../src/content/r2Modes';
import {R2_TOOLS,R2_LONG_TERM_ITEMS,R2_EDITIONS} from '../src/content/r2Tools';
import {r2JokerDefinitionsFor} from '../src/domain/r2ContentProfiles';
import {jokerAbilityCopyForRun,publicJokerMemoryContext} from '../src/game/JokerMemory';
import {toolInfo,itemInfo,editionEffectText} from '../src/game/r2ToolInfo';
import {bossScope} from '../src/game/StageIdentity';
import {programPreparationFacts} from '../src/game/ProgramDialog';

const clean=(value:unknown)=>expect(JSON.stringify(value)).not.toMatch(/大丑/);
it('normalizes display aliases without renaming technical identifiers or inferring rules',()=>{
 expect(playerText('大丑牌 · 5槽；大丑能力 ×2')).toBe('唐宋牌 · 5槽；唐宋牌能力 ×2');
 expect(playerText('唐宋牌 / Joker / jokerScore / r2:hash / dachoupai')).toBe('唐宋牌 / Joker / jokerScore / r2:hash / dachoupai');
 expect(heroText('骰爷 · 整手大丑牌之后，倍率×3')).toBe('秦琼 · 整手唐宋牌之后，倍率×3');
 expect(GAME_NAME).toBe('唐宋牌');
});

it('all six hero rules and every tool/item/edition display use the current card term',()=>{
 for(const id of CHARACTER_IDS){clean(heroDetailRules(id));const s=createRun({rulesVersion:'r2',characterId:id,seed:'terms-current',runId:'terms/'+id,r2Identity:newRunIdentity(id,'group'),openingRoute:'group'}),before=JSON.stringify(s);clean(characterForRun(s));expect(JSON.stringify(s)).toBe(before);}
 for(const d of R2_TOOLS)clean(toolInfo(d.id));for(const d of R2_LONG_TERM_ITEMS)clean(itemInfo(d.id));
 for(const edition of R2_EDITIONS)clean(editionEffectText(edition.id));
});

it('projects all 72 cards for every saved ruleset without rewriting any definition, checkpoint or storage partition',()=>{
 for(const identity of R2_RULESETS){
  const r2Identity={contentVersion:identity.contentVersion,contentHash:identity.contentHash},s=createRun({rulesVersion:'r2',characterId:identity.contentVersion===R2_ASSIST_VERSION||identity.amoScoreTiming==='exile-v1'?'amo':'touye',seed:'terms-old',runId:'terms/'+identity.contentVersion,r2Identity,...(isR2RouteStarter(r2Identity)?{openingRoute:'group' as const}:{})});
  const definitions=r2JokerDefinitionsFor(s),checkpoint=makeCheckpoint(s,[]),key=r2ModeStorageKey(s,s.contentHash),before=JSON.stringify({s,definitions,checkpoint,key});
  expect(definitions).toHaveLength(72);expect(readCheckpoint(checkpoint).ok).toBe(true);clean(characterForRun(s));
  const ctx=publicJokerMemoryContext(s,{hand:[],scoringLimited:false,deckSize:s.deckInstances.length,jokerSlots:5,jokerCount:0});
  for(const d of definitions){const j=r2CreateJoker(d.id,'terms/'+d.id,4,'none',s);clean(jokerAbilityCopyForRun(s,d.id,j,ctx));}
  expect(JSON.stringify({s,definitions,checkpoint:makeCheckpoint(s,[]),key:r2ModeStorageKey(s,s.contentHash)})).toBe(before);
  expect(s.contentHash).toBe(identity.contentHash);
 }
});

it('keeps frozen boss and challenge text as hash input while their player projections contain no old name',()=>{
 const before=JSON.stringify({bosses:R2_BOSSES,modes:R2_MODE_CATALOG});
 expect(before).toContain('大丑牌');
 for(const boss of R2_BOSSES){const plan={definitionId:boss.id,disabledSuit:boss.id==='B03'?'clubs' as const:null};clean(heroText(r2BossText(plan)));clean(bossScope(plan));}
 for(const challenge of R2_MODE_CATALOG.challenges){clean(heroText(challenge.description));const seed=challenge.config.seedPolicy.kind==='fixed-set'?challenge.config.seedPolicy.values[0]:'terms-challenge',s=createRun({rulesVersion:'r2',seed,runId:'terms/'+challenge.id,characterId:'touye',modeConfig:{mode:'challenge',difficulty:0,challengeId:challenge.id,programsEnabled:false}});clean(programPreparationFacts(s));}
 expect(JSON.stringify({bosses:R2_BOSSES,modes:R2_MODE_CATALOG})).toBe(before);
 expect(createHash('sha256').update(readFileSync('src/domain/r2PublishedContent.json')).digest('hex')).toBe('47d2b0b0abcc923dc3495bd9059948bf3b8bf279a3da9f11b91696504421dc5f');
 expect(R2_PUBLISHED_CONTENT.v10.hash).not.toBe(R2_PUBLISHED_CONTENT.v11.hash);
});

it('retains no display-source old-name literals outside the explicit alias adapter',()=>{
 for(const file of readdirSync('src/game').filter(f=>/\.(ts|json)$/.test(f)&&f!=='Brand.ts'))expect(readFileSync('src/game/'+file,'utf8'),file).not.toMatch(/大丑/);
 clean(readFileSync('README.md','utf8'));clean(readFileSync('docs/production/PRODUCT.md','utf8'));clean(readFileSync('docs/production/HERO_TEXT_SPEC_20261015.json','utf8'));
 expect(readFileSync('package.json','utf8')).toContain('"name": "dachoupai"');
});
