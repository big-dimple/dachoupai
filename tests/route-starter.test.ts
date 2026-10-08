import {describe,expect,it} from 'vitest';
import {createRun,applyCommand,type Action,type R2RunState} from '../src/domain/run';
import {CHARACTER_IDS,type CharacterId} from '../src/domain/characters';
import {stableHash} from '../src/domain/hash';
import {R2_AZAO_CHARGE_HASH,R2_ROUTE_STARTERS,R2_ROUTE_STARTER_HASH,R2_ROUTE_STARTER_VERSION,type R2OpeningRoute} from '../src/domain/r2GroupUpgrade';
import {makeCheckpoint,readCheckpoint} from '../src/application/checkpoint';
import {SavedRun,type SaveSlots,type SaveStore} from '../src/application/SavedRun';
import {evaluateR2Hand} from '../src/domain/evaluateR2';
import {r2JokerDefinitionsFor} from '../src/domain/r2ContentProfiles';
import {newRunIdentity,launchIdentity} from '../src/game/RunLaunch';
import {starterOffer,starterShopCue,starterSelection} from '../src/game/RouteStarter';
import {keyHighlight,keyHighlightBeat,starterRepeatBeat} from '../src/game/JokerKeyHighlight';
import {scoreBeat} from '../src/game/scorePresentation';

const identity={contentVersion:R2_ROUTE_STARTER_VERSION,contentHash:R2_ROUTE_STARTER_HASH};
const mode={mode:'standard' as const,difficulty:0 as const,challengeId:null,programsEnabled:false};
const seeds={group:'group-natural-17',straight:'route-first-19',flush:'route-first-4'};
const start=(route:R2OpeningRoute,characterId:CharacterId=CHARACTER_IDS[0],seed=seeds[route])=>createRun({seed,runId:'starter/'+characterId+'/'+route,characterId,rulesVersion:'r2',r2Identity:newRunIdentity(characterId,route),openingRoute:route,modeConfig:mode});
const readChanged=(original:R2RunState,changed:R2RunState)=>{const cp=makeCheckpoint(original,[]);cp.state=changed;const {checksum,...payload}=cp;cp.checksum=stableHash(payload);return readCheckpoint(cp);};
const send=(s:R2RunState,action:Action)=>{const r=applyCommand(s,{runId:s.runId,commandId:s.runId+'/command/'+(s.commandSeq+1),expectedSeq:s.commandSeq,action});if(!r.ok)throw Error(r.code);expect(readCheckpoint(makeCheckpoint(r.state,[])).ok).toBe(true);return r.state;};
function natural(route:R2OpeningRoute){let s=start(route,'erxiang');const offer=s.shop!.offers.find(o=>o.definitionId===R2_ROUTE_STARTERS[route])!;s=send(s,{type:'BuyOffer',offerId:offer.offerId});s=send(send(s,{type:'LeaveShop'}),{type:'EnterStage'});const hand=s.handOrder.map(id=>s.deckInstances.find(c=>c.id===id)!);
 const types=route==='group'?['pair','two-pair','three-kind','full-house','four-kind']:[route,'straight-flush'];
 const walk=(at:number,picked:typeof hand):string[]|undefined=>{if(picked.length&&types.includes(evaluateR2Hand(picked,{}).type))return picked.map(c=>c.id);if(picked.length===5)return;for(let i=at;i<hand.length;i++){const out=walk(i+1,[...picked,hand[i]]);if(out)return out;}};
 const ids=walk(0,[])!;expect(ids).toBeDefined();return {before:s,ids,after:send(s,{type:'PlayHand',selectedIds:ids})};}

describe('atomic first-shelf route contract',()=>{
 for(const characterId of CHARACTER_IDS)for(const route of Object.keys(R2_ROUTE_STARTERS) as R2OpeningRoute[])it(characterId+'/'+route+' keeps three original-price offers and a truly corresponding affordable ordinary card',()=>{
  const s=start(route,characterId),offer=s.shop!.offers.find(o=>o.definitionId===R2_ROUTE_STARTERS[route])!;
  expect(s.contentHash).toBe(R2_AZAO_CHARGE_HASH);expect(s.shop!.offers).toHaveLength(3);expect(offer.edition).toBe('none');expect(offer.price).toBe(route==='flush'?6:4);expect(offer.price).toBeLessThanOrEqual(s.gold);expect(starterOffer(s,offer)?.label).toContain('起手');expect(readCheckpoint(makeCheckpoint(s,[])).ok).toBe(true);expect(start(route,characterId)).toEqual(s);
  const old=createRun({seed:s.seed,runId:s.runId,characterId,rulesVersion:'r2',r2Profile:'group-upgrade-v1',modeConfig:mode});expect(r2JokerDefinitionsFor(s)).toBe(r2JokerDefinitionsFor(old));expect(s.rng).toEqual(old.rng);expect(s.shop!.toolOffers).toEqual(old.shop!.toolOffers);expect(s.shop!.itemOffers).toEqual(old.shop!.itemOffers);
  expect(s.shop!.offers.filter((o,i)=>JSON.stringify(o)!==JSON.stringify(old.shop!.offers[i])).length).toBeLessThanOrEqual(1);
  const refreshed=send(s,{type:'RerollShop'}),oldRefresh=send(old,{type:'RerollShop'});expect(refreshed.shop).toEqual(oldRefresh.shop);expect(refreshed.rng).toEqual(oldRefresh.rng);
 });
 it('isolates old identities, invalid route fields, original receipt and initial shelf tampering',()=>{
  expect(()=>createRun({seed:'x',runId:'x',characterId:'amo',rulesVersion:'r2',r2Identity:identity})).toThrow('invalid-opening-route');
  expect(()=>createRun({seed:'x',runId:'x',characterId:'amo',rulesVersion:'r2',r2Profile:'group-upgrade-v1',openingRoute:'group'})).toThrow('invalid-opening-route');
  const s=start('group');for(const change of [(s:R2RunState)=>s.openingRoute='flush',(s:R2RunState)=>s.shop!.offers[2].definitionId='d10',(s:R2RunState)=>delete s.openingRoute,(s:R2RunState)=>s.routeStarter!.instanceId='invented']){const changed=structuredClone(s);change(changed);expect(readChanged(s,changed).ok).toBe(false);}
 });
 it('retains special mode economics and explicit affordable boundary without modifying prices',()=>{
  const s=createRun({seed:'mode/seed',runId:'mode/seed',characterId:'amo',rulesVersion:'r2',r2Identity:identity,openingRoute:'flush',modeConfig:{...mode,difficulty:3}});expect(s.gold).toBe(4);expect(starterShopCue(s)).toContain('不保障');expect(readCheckpoint(makeCheckpoint(s,[])).ok).toBe(true);
  const retry=createRun({seed:s.seed,runId:s.runId,characterId:s.characterId,rulesVersion:'r2',r2Identity:launchIdentity(s.characterId,{kind:'retry',run:s}),openingRoute:s.openingRoute,modeConfig:{...mode,difficulty:3}});expect(retry).toEqual(s);
 });
 it('save failure retries the identical candidate and never re-generates the route, shelf or RNG',async()=>{
  const s=start('flush'),old=start('group'),slots:SaveSlots={revision:0,current:makeCheckpoint(old,[]),previous:null};let fail=true;const candidates:string[]=[];
  const store:SaveStore={read:async()=>slots,commit:async(rev,cp,backup)=>{candidates.push(JSON.stringify(cp));if(fail)throw Error('quota-exceeded');expect(rev).toBe(0);expect(backup).toEqual(slots.current);slots.current=cp;return 1;}};
  const pending=await SavedRun.start(store,s,slots);expect(pending.status).toBe('paused');expect(slots.current).toEqual(makeCheckpoint(old,[]));fail=false;expect((await pending.retry()).ok).toBe(true);expect(candidates[1]).toBe(candidates[0]);expect(SavedRun.restore(store,{...slots,revision:1}).state).toEqual(s);
 });
});

describe('first saved source highlight',()=>{
 it.each(['group','straight','flush'] as R2OpeningRoute[])('%s natural purchase and actual hand stamp one real event, no preview score',route=>{
  const p=natural(route),stamp=p.after.routeStarter!,event=p.after.lastTrace!.events.find(e=>e.eventId===stamp.eventId)!;
  expect(stamp.instanceId).toBe(p.before.routeStarter!.instanceId);expect(stamp.rootId).toBe(p.after.lastTrace!.rootId);expect(starterSelection(p.before,stamp.instanceId!,p.after.lastTrace!.handType)?.ready).toBe(true);expect(starterSelection(p.before,stamp.instanceId!,p.after.lastTrace!.handType,true)?.ready).toBe(false);
  const key=keyHighlight(p.after,p.after.lastTrace!)!;expect(key.kind).toBe('starter');expect(key.route).toBe(route);expect(key.heroId).toBe('erxiang');expect(keyHighlight(p.after,p.after.lastTrace!,'0','999999',false)).toBeUndefined();
  const beat=keyHighlightBeat(scoreBeat(event),false,key.kind);expect(beat.windup+beat.flight+beat.impact+beat.rest).toBe(1000);const repeat=starterRepeatBeat(scoreBeat(event));expect(repeat.windup+repeat.flight+repeat.impact+repeat.rest).toBe(290);
  const invalid=structuredClone(p.after);invalid.routeStarter!.eventId=stamp.rootId+'/event/0';expect(readChanged(p.after,invalid).ok).toBe(false);
  if(route==='flush'){expect(event.operation).toBe('add-growth');expect(event.before).toEqual(event.after);expect(key.landing).toContain('本手分数不变');expect(key.fact.effect).toContain('0.25');
   const next=p.after.phase==='stage-cleared'?send(send(send(p.after,{type:'OpenShop'}),{type:'LeaveShop'}),{type:'EnterStage'}):p.after;
   const second=send(next,{type:'PlayHand',selectedIds:[next.handOrder[0]]});expect(second.routeStarter).toEqual(stamp);expect(keyHighlight(second,second.lastTrace!,'0','999999')).toBeUndefined();expect(second.lastTrace!.events.some(e=>e.operation==='read-growth'&&e.sourceInstanceId===stamp.instanceId&&e.value.n!=='0')).toBe(true);const read=second.lastTrace!.events.find(e=>e.operation==='read-growth'&&e.sourceInstanceId===stamp.instanceId)!;const crossing=(BigInt(read.before.H.n)*BigInt(read.before.M.n)/(BigInt(read.before.H.d)*BigInt(read.before.M.d))+1n).toString();expect(keyHighlight(second,second.lastTrace!,'0',crossing)).toBeUndefined();
  }
 });
 it('nonmatching first hand has no positive starter event or false full highlight',()=>{
  const p=natural('group'),single=send(p.before,{type:'PlayHand',selectedIds:[p.before.handOrder[0]]});expect(single.routeStarter!.eventId).toBeNull();expect(keyHighlight(single,single.lastTrace!,'0','999999')).toBeUndefined();expect(starterSelection(p.before,p.before.routeStarter!.instanceId!,'high-card')?.ready).toBe(false);
 });
});
