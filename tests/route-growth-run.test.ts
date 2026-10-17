import {afterEach,describe,expect,it,vi} from 'vitest';
import {createRun,applyCommand,type Command,type R2RunState} from '../src/domain/run';
import {assertR2Invariants,r2CreateJoker,r2ScoreContext,R2_RULESETS} from '../src/domain/r2Run';
import {newRunIdentity,launchIdentity} from '../harness/fixtures/legacy-assist-launch';
import {CHARACTER_IDS} from '../src/domain/characters';
import {isR2RouteGrowth,isR2RouteStarter,R2_ROUTE_STARTERS,type R2OpeningRoute} from '../src/domain/r2GroupUpgrade';
import {r2RouteSnapshot,type R2RouteFamily} from '../src/domain/r2RouteGrowth';
import {r2DisabledCards,lockR2ChapterTargets,type R2BossPlan} from '../src/domain/r2Chapter';
import {makeCheckpoint,readCheckpoint,type Checkpoint} from '../src/application/checkpoint';
import {SavedRun,type SaveStore,type SaveSlots} from '../src/application/SavedRun';
import {stableHash} from '../src/domain/hash';
import * as scoring from '../src/domain/scoreR2';
const pair=['spades-12','hearts-12'],quad=['spades-9','hearts-9','clubs-9','diamonds-9'],flush=['hearts-2','hearts-5','hearts-8','hearts-10','hearts-13'];
function command(s:R2RunState,action:Command['action']):Command{return {runId:s.runId,commandId:s.runId+'/command/'+(s.commandSeq+1),expectedSeq:s.commandSeq,action};}
function send(s:R2RunState,action:Command['action']):R2RunState {const r=applyCommand(s,command(s,action));if(!r.ok)throw Error(r.code+JSON.stringify(r.diagnostic));return r.state;}
function start(characterId:typeof CHARACTER_IDS[number]='amo',route:R2OpeningRoute='group') {return createRun({seed:'c2-bounded',runId:'c2-bounded',characterId,rulesVersion:'r2',r2Identity:newRunIdentity(characterId,route),openingRoute:route,modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});}
function arrange(s:R2RunState,ids:string[]):R2RunState {
  const available=s.deckInstances.filter(c=>!s.playedPile.includes(c.id)&&!s.discardPile.includes(c.id)&&!s.destroyedIds.includes(c.id)),padding=available.filter(c=>!ids.includes(c.id)).slice(0,s.stage!.handLimit-ids.length).map(c=>c.id);
  s.handOrder=[...ids,...padding];s.drawPile=available.map(c=>c.id).filter(id=>!s.handOrder.includes(id));s.stage!.disabledIds=s.stage!.boss?r2DisabledCards(s.stage!.boss,s.stageIndex,s.handOrder.map(id=>s.deckInstances.find(c=>c.id===id)!)):[];
  assertR2Invariants(s);return s;
}
function fixture(ids:string[]=[],boss?:R2BossPlan){let s=send(start(),{type:'LeaveShop'});s.shop=null;s.jokers=ids.map(id=>r2CreateJoker(id,id,8,undefined,s));if(boss){
 const number=Number(boss.definitionId.slice(1)),chapter=number<=4?1:number<=12?3:7,index=chapter*3-1;
 const history=['B01','B02','B03','B04','B05','B06'].slice(0,chapter-1);
 Object.assign(s,{chapter,stageIndex:index,seenBossIds:[...history,boss.definitionId],boss});
 s.chapterTargetPlan=lockR2ChapterTargets(chapter,s.tourMode,s.difficulty,boss);
 for(let i=2;i<index;i+=3){s.routeGrowth!.settlements.push({stageIndex:i,families:[]});s.routeGrowth!.clears++;}
 }return send(s,{type:'EnterStage'});}
function round(s:R2RunState,journal:Command[]=[]){const cp=makeCheckpoint(s,journal),result=readCheckpoint(JSON.parse(JSON.stringify(cp)));expect(result).toEqual({ok:true,checkpoint:cp});return cp;}
function mutation(s:R2RunState,change:(s:any)=>void,journal:Command[]=[]){const cp=round(s,journal),bad=structuredClone(cp);change(bad.state);const {checksum,...payload}=bad;return readCheckpoint({...payload,checksum:stableHash(payload)});}
function successful(s:R2RunState){const core=['spades-9','hearts-9'];for(const id of core)s.deckInstances.find(c=>c.id===id)!.enhancement='multiplier-paper';s.jokers.find(j=>j.definitionId==='b10')!.growth.heat={n:'100',d:'1'};return send(arrange(s,core),{type:'PlayHand',selectedIds:core});}
afterEach(()=>vi.restoreAllMocks());
describe('C2 run history and strict recovery',()=>{
  it.each(CHARACTER_IDS)('%s launches every selected route with six-hero/basic-choice capabilities and fresh history',characterId=>{
    for(const route of Object.keys(R2_ROUTE_STARTERS) as R2OpeningRoute[]){const s=start(characterId,route);expect(isR2RouteGrowth(s)).toBe(true);expect(s.routeGrowth).toEqual({clears:0,G:0,S:0,F:0,settlements:[]});expect(s.shop!.offers.some(o=>o.definitionId===R2_ROUTE_STARTERS[route])).toBe(true);expect(s.shop!.basicChoice).toEqual({shopSeq:1,purchase:null});round(s);}
  });
  it('four actual clears use their before-hand N; restore/retry/next stage never backfeed the winning hand',()=>{
    let s=fixture(['mantangcai','b10']);
    for(let n=1;n<=4;n++){
      if(n>1)s=send(send(send(s,{type:'OpenShop'}),{type:'LeaveShop'}),{type:'EnterStage'});
      // Boss draw is kept; these controlled enhanced pairs reach the first four actual targets.
      s=successful(s);expect(s.phase).toBe('stage-cleared');expect(s.routeGrowth!.G).toBe(n);expect(s.lastTrace!.routeGrowth!.before.G).toBe(n-1);expect(s.lastTrace!.routeGrowth!.factors.G).toEqual({n:'1',d:'1'});round(s);
    }
    expect(mutation(s,v=>{v.lastTrace.routeGrowth.before.G=4;}).ok).toBe(false);
    const fourthScore=s.lastTrace!.finalScore,restored=readCheckpoint(round(s));if(!restored.ok)throw Error(restored.code);expect(restored.checkpoint.state.lastTrace!.finalScore).toBe(fourthScore);
    const fresh=createRun({seed:s.seed,runId:s.runId,characterId:s.characterId,rulesVersion:'r2',r2Identity:launchIdentity(s.characterId,{kind:'retry',run:s}),openingRoute:s.openingRoute,modeConfig:{mode:s.mode,difficulty:s.difficulty,challengeId:s.challengeId,programsEnabled:s.programsEnabled}});expect(fresh.routeGrowth!.G).toBe(0);round(fresh);
    s=send(send(send(s,{type:'OpenShop'}),{type:'LeaveShop'}),{type:'EnterStage'});s=successful(s);expect(s.lastTrace!.routeGrowth!.factors.G).toEqual({n:'27',d:'20'});expect(s.lastTrace!.finalScore).toBe('1968');round(s);
  });
  it('G then F clears both once, counts can sum beyond clears, and duplicate commands award nothing',()=>{
    let s=arrange(fixture(),pair);s=send(s,{type:'PlayHand',selectedIds:pair});expect(s.phase).toBe('await-input');expect(s.routeGrowth!.G).toBe(0);expect(s.stage!.routeGrowth!.eligible).toEqual(['G']);
    s=arrange(s,flush);const c=command(s,{type:'PlayHand',selectedIds:flush}),r=applyCommand(s,c);expect(r.ok).toBe(true);if(!r.ok)throw Error(r.code);s=r.state;
    expect(r2RouteSnapshot(s.routeGrowth)).toEqual({clears:1,G:1,S:0,F:1});expect(s.lastTrace!.routeGrowth!.before).toEqual({clears:0,G:0,S:0,F:0});expect(s.lastTrace!.handType).toBe('flush');round(s,[c]);expect(applyCommand(s,c).state).toEqual(s);
    expect(mutation(s,v=>{v.routeGrowth.G=2;}).ok).toBe(false);expect(mutation(s,v=>{v.routeGrowth.settlements.push({...v.routeGrowth.settlements[0]});v.routeGrowth.clears++;}).ok).toBe(false);
  });
  it('qualifies earlier actual G even if the winning hand is high-card; assist does not qualify a family',()=>{
    let s=fixture();s.deckInstances.find(c=>c.id===pair[0])!.enhancement='multiplier-paper';s=send(arrange(s,pair),{type:'PlayHand',selectedIds:pair});expect(s.stage!.heat).toBe('220');
    s.deckInstances.find(c=>c.id==='clubs-14')!.enhancement='multiplier-paper';s=send(arrange(s,['clubs-14']),{type:'PlayHand',selectedIds:['clubs-14']});expect(s.lastTrace!.handType).toBe('high-card');expect(s.lastTrace!.routeGrowth!.factors).toEqual({});s.deckInstances.find(c=>c.id==='hearts-14')!.enhancement='multiplier-paper';s=send(arrange(s,['hearts-14']),{type:'PlayHand',selectedIds:['hearts-14']});expect(s.routeGrowth!.G).toBe(1);round(s);
    let assisted=fixture();const main=flush,assist=['spades-9','hearts-9'];assisted=arrange(assisted,[...main,...assist]);assisted=send(assisted,{type:'PlayAssistedHand',selectedIds:main,assistIds:assist});expect(assisted.routeGrowth!.G).toBe(0);expect(assisted.routeGrowth!.F).toBe(1);round(assisted);
  });
  it('failed clears, skips, abandon and restoration grant no history',()=>{
    let s=send(arrange(fixture(),pair),{type:'PlayHand',selectedIds:pair});for(const id of ['clubs-2','clubs-3','clubs-4'])s=send(arrange(s,[id]),{type:'PlayHand',selectedIds:[id]});expect(s.phase).toBe('run-lost');expect(s.routeGrowth!.G).toBe(0);expect(s.stage!.routeGrowth!.eligible).toEqual(['G']);round(s);
    let skipped=send(start(),{type:'LeaveShop'});skipped=send(skipped,{type:'SkipStage'});expect(skipped.routeGrowth!.clears).toBe(0);round(skipped);
    const abandoned=send(fixture(),{type:'AbandonRun'});expect(abandoned.routeGrowth!.clears).toBe(0);round(abandoned);
  });
  it('dual main types award exactly their own families and persist additive growth under a score ban',()=>{
    let sf=fixture(['c04','c06']);const core=['hearts-3','hearts-4','hearts-5','hearts-6','hearts-7'];sf=send(arrange(sf,core),{type:'PlayHand',selectedIds:core});expect(r2RouteSnapshot(sf.routeGrowth)).toEqual({clears:1,G:0,S:1,F:1});expect(sf.jokers[0].growth.heat).toEqual({n:'10',d:'1'});expect(sf.jokers[1].growth.multiplier).toEqual({n:'1',d:'2'});round(sf);
    let fh=fixture();for(const [i,id] of core.entries())fh.deckInstances.find(c=>c.id===id)!.rank=([5,5,5,7,7] as const)[i];fh=send(arrange(fh,core),{type:'PlayHand',selectedIds:core});expect(r2RouteSnapshot(fh.routeGrowth)).toEqual({clears:1,G:1,S:0,F:1});round(fh);
    let disabled=fixture(['mantangcai','c06'],{definitionId:'B06',disabledSuit:null});disabled=send(arrange(disabled,flush),{type:'PlayHand',selectedIds:flush});expect(disabled.lastTrace!.events.some(e=>e.sourceDefinitionId==='c06'&&e.operation==='read-growth')).toBe(false);expect(disabled.jokers[1].growth.multiplier).toEqual({n:'1',d:'2'});round(disabled);
  });
  it('buy, sell, rebuy and reroll cannot create or reset route history; e11 retains own coefficient',()=>{
    let s=start();s.gold=40;s.jokers=[r2CreateJoker('e11','fan',8,undefined,s),r2CreateJoker('b10','old',4,undefined,s)];s.jokers[0].growth.coefficient={n:'17',d:'10'};
    s=send(s,{type:'SellJoker',instanceId:'old'});expect(s.jokers[0].growth.coefficient).toEqual({n:'17',d:'10'});expect(s.shop!.soldJoker).toBe(true);round(s);
    s=send(s,{type:'RerollShop'});expect(s.shop!.soldJoker).toBe(true);expect(s.routeGrowth!.clears).toBe(0);round(s);
    s=send(send(s,{type:'LeaveShop'}),{type:'EnterStage'});for(const id of quad)s.deckInstances.find(c=>c.id===id)!.enhancement='multiplier-paper';s=send(arrange(s,quad),{type:'PlayHand',selectedIds:quad});expect(s.jokers[0].growth.coefficient).toEqual({n:'17',d:'10'});expect(s.routeGrowth!.G).toBe(1);round(s);
    s=send(s,{type:'OpenShop'});s=send(s,{type:'SellJoker',instanceId:'fan'});s.shop!.offers[0]={offerId:'fresh-fan',definitionId:'e11',price:8,consumed:false};s=send(s,{type:'BuyOffer',offerId:'fresh-fan'});expect(s.jokers[0].growth.coefficient).toEqual({n:'1',d:'1'});expect(s.routeGrowth!.G).toBe(1);round(s);
  });
  it.each(R2_RULESETS.filter(p=>!isR2RouteGrowth(p)))('legacy $contentVersion saves reject route fields and preserve their exact retry identity',p=>{
    const s=createRun({seed:'old-c2',runId:'old-c2',characterId:'amo',rulesVersion:'r2',r2Identity:{contentVersion:p.contentVersion,contentHash:p.contentHash},...(isR2RouteStarter(p)?{openingRoute:'group' as const}:{}),modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});round(s);expect(Object.hasOwn(s,'routeGrowth')).toBe(false);expect(launchIdentity('amo',{kind:'retry',run:s})).toEqual({contentVersion:p.contentVersion,contentHash:p.contentHash});expect(mutation(s,v=>{v.routeGrowth={clears:0,G:0,S:0,F:0,settlements:[]};}).ok).toBe(false);
  });
  it('new profile rejects missing history, missing snapshots, edited eligibility and changed global timing',()=>{
    const s=successful(fixture(['mantangcai','b10']));
    for(const change of [(v:any)=>{delete v.routeGrowth;},(v:any)=>{delete v.stage.routeGrowth;},(v:any)=>{delete v.lastTrace.routeGrowth;},(v:any)=>{v.stage.routeGrowth.eligible=['F'];},(v:any)=>{v.lastTrace.events.find((e:any)=>e.operation==='route-factor').phase='jokerScore';},(v:any)=>{v.lastTrace.events.find((e:any)=>e.operation==='route-factor').value={n:'27',d:'20'};}])expect(mutation(s,change).ok).toBe(false);
  });
  it('rejects paired edits of an earlier main type and family even with a recomputed checksum and unchanged commands',()=>{
    let s=arrange(fixture(),pair);const first=command(s,{type:'PlayHand',selectedIds:pair});s=send(s,first.action);s=arrange(s,['clubs-3']);const second=command(s,{type:'PlayHand',selectedIds:['clubs-3']});s=send(s,second.action);
    expect(s.stage!.routeGrowth!.handTypes).toEqual(['pair','high-card']);expect(s.stage!.routeGrowth!.eligible).toEqual(['G']);
    const change=(v:any)=>{v.stage.routeGrowth.handTypes[0]='flush';v.stage.routeGrowth.eligible=['F'];};
    // Both normal retained journal and an intentionally empty/truncated journal
    // reject the edit: bounded source commands are also bound to existing receipts.
    for(const journal of [[first,second],[],[second]])expect(mutation(s,change,journal).ok).toBe(false);
    for(const corrupt of [(v:any)=>{delete v.stage.routeGrowth.sources;},(v:any)=>{v.stage.routeGrowth.sources[0].extra=true;},(v:any)=>{v.stage.routeGrowth.sources[0].rules.extra=true;},(v:any)=>{v.stage.routeGrowth.sources[0].command.action.selectedIds=['clubs-3'];},(v:any)=>{v.stage.routeGrowth.sources[0].command.commandId='uncommitted';},(v:any)=>{v.stage.routeGrowth.sources.reverse();},(v:any)=>{v.lastTrace.bossContext.previousHandType='flush';}])expect(mutation(s,corrupt,[first,second]).ok).toBe(false);
    s=arrange(s,['clubs-4']);const third=command(s,{type:'PlayHand',selectedIds:['clubs-4']});s=send(s,third.action);expect(s.phase).toBe('await-input');
    // The earliest hand is now older than lastTrace.previousHandType. Its own
    // source still closes the edit even when only the newest command is retained.
    expect(mutation(s,change,[third]).ok).toBe(false);expect(mutation(s,change,[]).ok).toBe(false);round(s,[first,second,third]);
  });
  it('reclassifies legal mixed main selections from their command sources before and after clear, including an unrelated assist',()=>{
    let s=arrange(fixture(),pair);const first=command(s,{type:'PlayHand',selectedIds:pair});s=send(s,first.action);const before=round(s,[first]);expect(before.state.routeGrowth!.G).toBe(0);expect(before.state.stage!.routeGrowth!.sources[0].cards.map(c=>c.id)).toEqual(pair);
    s=arrange(s,[...flush,'clubs-9','diamonds-9']);const second=command(s,{type:'PlayAssistedHand',selectedIds:flush,assistIds:['clubs-9','diamonds-9']});s=send(s,second.action);
    const after=round(s,[first,second]);expect(after.state.stage!.routeGrowth!.handTypes).toEqual(['pair','flush']);expect(after.state.stage!.routeGrowth!.sources[1].cards.map(c=>c.id)).toEqual(flush);expect(after.state.routeGrowth).toMatchObject({clears:1,G:1,S:0,F:1});expect(after.state.lastTrace!.routeGrowth!.before).toEqual({clears:0,G:0,S:0,F:0});
    // Later shop edits are legal; stage-cleared itself has no tool-use window.
    s=send(s,{type:'OpenShop'});s.consumables=[{instanceId:'rank-tool',definitionId:'T08'}];
    s=send(s,{type:'UseConsumable',instanceId:'rank-tool',targetIds:[pair[0]]});
    expect(s.deckInstances.find(c=>c.id===pair[0])!.rank).toBe(13);
    expect(s.stage!.routeGrowth!.sources[0].cards[0].rank).toBe(12);round(s);
  });
  it('rejects the independently reproduced 411-heat forged-F save and restores its legitimate G clear',()=>{
    let s=createRun({seed:'review',runId:'review',characterId:'amo',rulesVersion:'r2',r2Identity:newRunIdentity('amo','group'),openingRoute:'group',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
    const journal:Command[]=[],play=(action:Command['action'])=>{const c=command(s,action);s=send(s,action);journal.push(c);};play({type:'LeaveShop'});play({type:'EnterStage'});
    for(const id of ['clubs-14','diamonds-14'])Object.assign(s.deckInstances.find(c=>c.id===id)!,{enhancement:'multiplier-paper',edition:'polychrome'});
    for(const selectedIds of [pair,['clubs-3']]){s=arrange(s,selectedIds);play({type:'PlayHand',selectedIds});}
    const cp=round(s,journal);expect(s.phase).toBe('await-input');
    expect(mutation(s,v=>{v.stage.routeGrowth.handTypes[0]='flush';v.stage.routeGrowth.eligible=['F'];},journal).ok).toBe(false);
    const restored=readCheckpoint(cp);if(!restored.ok)throw Error(restored.code);s=restored.checkpoint.state;
    for(const id of ['clubs-14','diamonds-14']){s=arrange(s,[id]);play({type:'PlayHand',selectedIds:[id]});}
    expect(s.phase).toBe('stage-cleared');expect(s.stage!.heat).toBe('411');expect(s.routeGrowth).toMatchObject({clears:1,G:1,S:0,F:0});round(s,journal);
  });
  it('rejects a genuine prior-stage main source, including an entry edited back to its genuine old boundary',()=>{
    let s=createRun({seed:'review',runId:'review',characterId:'amo',rulesVersion:'r2',r2Identity:newRunIdentity('amo','group'),openingRoute:'group',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
    const journal:Command[]=[],play=(action:Command['action'])=>{const c=command(s,action);s=send(s,action);journal.push(c);};play({type:'LeaveShop'});play({type:'EnterStage'});
    for(const id of ['clubs-14','diamonds-14'])Object.assign(s.deckInstances.find(c=>c.id===id)!,{enhancement:'multiplier-paper',edition:'polychrome'});
    for(const selectedIds of [pair,['clubs-3'],['clubs-14'],['diamonds-14']]){s=arrange(s,selectedIds);play({type:'PlayHand',selectedIds});}
    expect(s.stage!.heat).toBe('411');const oldSource=structuredClone(s.stage!.routeGrowth!.sources[0]),oldEntry=structuredClone(s.stage!.routeGrowth!.entry);
    play({type:'OpenShop'});play({type:'LeaveShop'});play({type:'EnterStage'});
    expect(s.stage!.routeGrowth!.entry).toEqual({commandId:'review/command/10',seq:10,type:'EnterStage'});round(s,journal);
    for(const selectedIds of [['spades-2','hearts-3'],['clubs-4'],['diamonds-5']]){s=arrange(s,selectedIds);play({type:'PlayHand',selectedIds});}
    expect(s.phase).toBe('await-input');expect(s.stage!.routeGrowth!.handTypes).toEqual(['high-card','high-card','high-card']);expect(s.stage!.routeGrowth!.eligible).toEqual([]);
    const replace=(v:any)=>{v.stage.routeGrowth.sources[0]=structuredClone(oldSource);v.stage.routeGrowth.handTypes[0]='pair';v.stage.routeGrowth.eligible=['G'];};
    for(const log of [journal,[],[journal.at(-1)!]]){
      expect(mutation(s,replace,log).ok).toBe(false);
      expect(mutation(s,v=>{replace(v);v.stage.routeGrowth.entry=structuredClone(oldEntry);},log).ok).toBe(false);
      round(s,log);
    }
    for(const corrupt of [(v:any)=>{delete v.stage.routeGrowth.entry;},(v:any)=>{v.stage.routeGrowth.entry.extra=true;},(v:any)=>{v.stage.routeGrowth.entry.seq++;},(v:any)=>{v.stage.routeGrowth.entry.type='SkipStage';},(v:any)=>{v.stage.routeGrowth.entry.commandId='uncommitted';}])expect(mutation(s,corrupt,journal).ok).toBe(false);
    const recovered=readCheckpoint(round(s,[]));if(!recovered.ok)throw Error(recovered.code);s=recovered.checkpoint.state;
    const selectedIds=['clubs-14','clubs-3','clubs-6','clubs-10','clubs-13'];s=arrange(s,selectedIds);play({type:'PlayHand',selectedIds});
    expect(s.phase).toBe('stage-cleared');expect(s.stage!.routeGrowth!.eligible).toEqual(['F']);expect(s.routeGrowth).toMatchObject({clears:2,G:1,S:0,F:1});round(s,[]);round(s,journal);
  });
});

describe('C1 rescue fixes inside C2, on real commands',()=>{
  const formed=['spades-9','hearts-9','clubs-10','diamonds-10'];
  it('an already-formed opener arms on first successful discard, never on illegal or second discard, consumes on legal play',()=>{
    let s=arrange(fixture(['f10']),[...formed,'spades-2']);const before=structuredClone(s),bad=applyCommand(s,command(s,{type:'DiscardHand',selectedIds:['missing']}));expect(bad.ok).toBe(false);expect(bad.state).toEqual(before);
    s=send(s,{type:'DiscardHand',selectedIds:['spades-2']});expect(s.jokers[0].counters!.rescueArmed).toBe(true);round(s);
    s=send(s,{type:'DiscardHand',selectedIds:[s.handOrder.find(id=>!formed.includes(id))!]});expect(s.jokers[0].counters!.rescueArmed).toBe(true);round(s);
    const invalid=applyCommand(s,command(s,{type:'PlayHand',selectedIds:['missing']}));expect(invalid.state).toEqual(s);expect(s.jokers[0].counters!.rescueArmed).toBe(true);
    s=send(arrange(s,formed),{type:'PlayHand',selectedIds:formed});expect(s.lastTrace!.events.filter(e=>e.operation==='rescue-multiplier')).toHaveLength(1);expect(s.lastTrace!.events.filter(e=>e.operation==='consume-rescue')).toHaveLength(1);expect(s.jokers[0].counters!.rescueArmed).toBe(false);round(s);
  });
  it('no-money discard cannot arm; the legal discard pays its real B07 cost',()=>{
    let s=arrange(fixture(['f10'],{definitionId:'B07',disabledSuit:null}),[...formed,'spades-2']);s.gold=0;const before=structuredClone(s),r=applyCommand(s,command(s,{type:'DiscardHand',selectedIds:['spades-2']}));expect(r).toMatchObject({ok:false,code:'not-enough-gold'});expect(r.state).toEqual(before);
    s.gold=1;s=send(s,{type:'DiscardHand',selectedIds:['spades-2']});expect(s.gold).toBe(0);expect(s.stage!.discardSpent).toBe(1);expect(s.jokers[0].counters!.rescueArmed).toBe(true);round(s);
  });
  it('first legal non-Q hand expires rescue even without clearing; subsequent discard/play cannot rearm',()=>{
    let s=arrange(fixture(['f10']),[...formed,'spades-2','clubs-3']);s=send(s,{type:'DiscardHand',selectedIds:['spades-2']});s=send(arrange(s,['clubs-3']),{type:'PlayHand',selectedIds:['clubs-3']});expect(s.phase).toBe('await-input');expect(s.jokers[0].counters!.rescueArmed).toBe(false);expect(s.lastTrace!.events.some(e=>e.operation==='rescue-multiplier')).toBe(false);round(s);
    s=send(s,{type:'DiscardHand',selectedIds:[s.handOrder.find(id=>!formed.includes(id))!]});expect(s.jokers[0].counters!.rescueArmed).toBe(false);s=send(arrange(s,formed),{type:'PlayHand',selectedIds:formed});expect(s.lastTrace!.events.some(e=>e.operation==='rescue-multiplier')).toBe(false);round(s);
  });
  it.each(['B06','B16'] as const)('%s scoring ban still consumes the first legal rescue and keeps global eligibility',boss=>{
    const owned=boss==='B06'?['mantangcai','f10']:['f10'];let s=arrange(fixture(owned,{definitionId:boss,disabledSuit:null}),[...formed,'spades-2']);s=send(s,{type:'DiscardHand',selectedIds:['spades-2']});s=send(arrange(s,formed),{type:'PlayHand',selectedIds:formed});
    expect(s.lastTrace!.events.some(e=>e.operation==='rescue-multiplier')).toBe(false);expect(s.lastTrace!.events.filter(e=>e.operation==='consume-rescue')).toHaveLength(1);expect(s.jokers.find(j=>j.definitionId==='f10')!.counters!.rescueArmed).toBe(false);expect(s.stage!.routeGrowth!.eligible).toEqual(['G']);expect(s.lastTrace!.routeGrowth!.factors.G).toEqual({n:'1',d:'1'});round(s);
  });
  it.each(['B03','B04','B06','B08','B13','B15','B16'] as const)('%s actual clear commits route growth and restores its precise trace',boss=>{
    let s=fixture(['mantangcai','b10','c06','jiedongfeng','e11'],{definitionId:boss,disabledSuit:boss==='B03'?'diamonds':null});s.deckInstances.find(c=>c.id==='spades-9')!.enhancement='glass-paper';
    s.handLevels['four-kind']=30;for(const id of quad)s.deckInstances.find(c=>c.id===id)!.enhancement='glass-paper';s=send(arrange(s,quad),{type:'PlayHand',selectedIds:quad});expect(s.phase).toBe('stage-cleared');expect(s.routeGrowth!.G).toBe(1);expect(s.routeGrowth!.F).toBe(0);expect(s.lastTrace!.routeGrowth!.before.G).toBe(0);round(s);
  });
});

class MemoryStore implements SaveStore {
  slots:SaveSlots={revision:0,current:null,previous:null};fail=false;
  async read(){return structuredClone(this.slots);}
  async commit(revision:number,current:Checkpoint,previous:Checkpoint|null){if(this.fail)throw new DOMException('quota','QuotaExceededError');expect(revision).toBe(this.slots.revision);this.slots={revision:revision+1,current:structuredClone(current),previous:structuredClone(previous)};return this.slots.revision;}
}
describe('C2 atomic save-before-publish',()=>{
  it('retains an earlier G source through a failed F clear save, cold restore, retry and duplicate',async()=>{
    let s=send(arrange(fixture(),pair),{type:'PlayHand',selectedIds:pair});s=arrange(s,flush);
    const store=new MemoryStore(),saved=await SavedRun.start(store,s,store.slots),before=structuredClone(saved.state),slots=structuredClone(store.slots),c=command(s,{type:'PlayHand',selectedIds:flush});store.fail=true;
    expect((await saved.submit(c)).ok).toBe(false);expect(saved.state).toEqual(before);expect(store.slots).toEqual(slots);expect(SavedRun.restore(store,store.slots).state).toEqual(before);
    const pending=JSON.parse(saved.exportJSON());expect(readCheckpoint(pending).ok).toBe(true);expect(pending.state.stage.routeGrowth.handTypes).toEqual(['pair','flush']);expect(pending.state.stage.routeGrowth.sources).toHaveLength(2);expect(pending.state.routeGrowth).toMatchObject({clears:1,G:1,S:0,F:1});expect(pending.state.lastTrace.routeGrowth.before).toEqual({clears:0,G:0,S:0,F:0});
    store.fail=false;expect((await saved.retry()).ok).toBe(true);expect(saved.exportJSON()).toBe(JSON.stringify(pending,null,2));expect((await saved.submit(c))).toMatchObject({ok:true,duplicate:true});expect(SavedRun.restore(store,store.slots).state).toEqual(saved.state);
  });
  it('clear counts, qualification, trace and receipt commit once together after a failed save',async()=>{
    let s=fixture(['mantangcai','b10']);for(const id of pair)s.deckInstances.find(c=>c.id===id)!.enhancement='multiplier-paper';s.jokers[1].growth.heat={n:'100',d:'1'};s=arrange(s,pair);
    const store=new MemoryStore(),saved=await SavedRun.start(store,s,store.slots),before=structuredClone(saved.state),c=command(s,{type:'PlayHand',selectedIds:pair});store.fail=true;
    const result=await saved.submit(c);expect(result.ok).toBe(false);expect(saved.state).toEqual(before);expect(store.slots.current).toEqual(makeCheckpoint(before,[]));const pending=JSON.parse(saved.exportJSON());expect(pending.state.routeGrowth.G).toBe(1);expect(pending.state.lastTrace.routeGrowth.before.G).toBe(0);expect(readCheckpoint(pending).ok).toBe(true);
    store.fail=false;expect((await saved.retry()).ok).toBe(true);expect(saved.exportJSON()).toEqual(JSON.stringify(pending,null,2));expect(saved.state.routeGrowth!.G).toBe(1);expect((await saved.submit(c)).ok).toBe(true);expect(saved.state.routeGrowth!.G).toBe(1);expect(SavedRun.restore(store,store.slots).state).toEqual(saved.state);
  });
  it('numeric-length diagnostics return the entire original state without committing any hand',()=>{
    const s=arrange(fixture(['mantangcai','b10']),pair);s.stage!.heat='9'.repeat(4096);const before=structuredClone(s),r=applyCommand(s,command(s,{type:'PlayHand',selectedIds:pair}));expect(r).toMatchObject({ok:false,code:'score-diagnostic',diagnostic:{code:'numeric-length-limit'}});expect(r.state).toEqual(before);expect(s).toEqual(before);
  });
  it('a clear-event budget overflow consumes no cards, RNG, cash, growth, eligibility or receipt',()=>{
    const s=arrange(fixture(['mantangcai','b10']),pair);for(const id of pair)s.deckInstances.find(c=>c.id===id)!.enhancement='multiplier-paper';s.jokers[1].growth.heat={n:'100',d:'1'};const before=structuredClone(s),real=scoring.scoreR2Hand;
    vi.spyOn(scoring,'scoreR2Hand').mockImplementation(input=>{const t=structuredClone(real(input)),pad=structuredClone(t.events.at(-1)!);while(t.events.length<511)t.events.push({...pad,eventId:`${t.rootId}/event/${t.events.length}`,rootEventId:`${t.rootId}/event/${t.events.length}`});return t;});
    const r=applyCommand(s,command(s,{type:'PlayHand',selectedIds:pair}));expect(r).toMatchObject({ok:false,code:'score-diagnostic',diagnostic:{code:'event-limit'}});expect(r.state).toEqual(before);expect(s).toEqual(before);
  });
});
