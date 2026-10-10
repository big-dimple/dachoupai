import {it,expect,vi} from 'vitest';
vi.mock('phaser',()=>({default:{Scene:class {}}}));
import {createRun,type R2RunState,type Action} from '../src/domain/run';
import {newRunIdentity} from '../src/game/RunLaunch';
import {energySend,scoreEnergyFixture} from '../harness/fixtures/score-energy';
import {heroPayoffs,heroPayoffBeat} from '../src/game/HeroPayoff';
import {heroClimaxValue} from '../src/game/HeroClimax';
import {heroAbilityCue,savedHeroResult} from '../src/game/HeroAbilityCue';
import {heroActionShortcut} from '../src/game/HeroActionShortcut';
import {GameScene} from '../src/game/GameScene';
import {layout,intersects} from '../src/game/layout';
import {touyeChoice} from '../src/game/TouyeWagerCopy';
import {makeCheckpoint,readCheckpoint} from '../src/application/checkpoint';
import type {CharacterId} from '../src/domain/characters';
const hand=['spades-8','hearts-8','clubs-7','diamonds-7','spades-13','hearts-13','clubs-2','diamonds-4'];
function arrange(s:R2RunState,ids=hand,incoming:string[]=[]){s=structuredClone(s);s.handOrder=[...ids];s.drawPile=[...s.deckInstances.map(c=>c.id).filter(id=>!ids.includes(id)&&!incoming.includes(id)&&!s.playedPile.includes(id)&&!s.discardPile.includes(id)),...[...incoming].reverse()];expect(readCheckpoint(makeCheckpoint(s,[])).ok).toBe(true);return s;}
function entered(id:CharacterId){return arrange(energySend(energySend(createRun({seed:'group-natural-17',runId:'payoff/'+id,characterId:id,rulesVersion:'r2',r2Identity:newRunIdentity(id,'group'),openingRoute:'group',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}}),{type:'LeaveShop'}),{type:'EnterStage'}));}
const saved=(s:R2RunState,a:Action)=>{const next=energySend(s,a);expect(readCheckpoint(makeCheckpoint(next,[])).ok).toBe(true);return next;};
it('all five scoring abilities use their actual saved contribution, independently of opening stamps',()=>{
 const cases:[CharacterId,Action][]=[['amo',{type:'PlayAssistedHand',selectedIds:hand.slice(0,4),assistIds:hand.slice(4,6)}],['erxiang',{type:'PlayHand',selectedIds:hand.slice(0,2),erxiangTargetId:hand[0]}],['xiemu',{type:'PlayHand',selectedIds:hand.slice(0,4),xiemuBurn:10}],['azao',{type:'PlayHand',selectedIds:hand.slice(0,4),azaoRelease:true}]];
 for(const [id,a] of cases){let s=entered(id);if(id==='xiemu')s.gold=20;if(id==='azao'){s=arrange(entered(id),['spades-2','hearts-2','clubs-3','diamonds-3',...hand.slice(4)]);s=arrange(saved(s,{type:'PlayHand',selectedIds:s.handOrder.slice(0,4)}));}
  s=saved(s,a);const before=JSON.stringify(s),keys=heroPayoffs(s,s.lastTrace!);expect(keys.filter(k=>k.kind==='payoff')).toHaveLength(1);for(const k of keys)expect(heroClimaxValue({...s,openingShow:undefined},s.lastTrace!,k)?.label).toBe('实际倍率');expect(heroPayoffs(s,s.lastTrace!,true)).toEqual([]);expect(JSON.stringify(s)).toBe(before);
 }
 const ids=hand.slice(6),s=arrange(entered('touye'),hand,['clubs-8','diamonds-6']),bet={target:'three-kind' as const,snapshotToken:touyeChoice(s,ids).snapshotToken};const pending=saved(s,{type:'DiscardHand',selectedIds:ids,touyeBet:bet});const won=saved(pending,{type:'PlayHand',selectedIds:[hand[0],hand[1],'clubs-8']});expect(won.lastTrace!.touyeWager?.outcome).toBe('won');expect(heroPayoffs(won,won.lastTrace!).filter(k=>k.kind==='payoff')).toHaveLength(1);
 const lost=saved(pending,{type:'PlayHand',selectedIds:['diamonds-6']});expect(heroPayoffs(lost,lost.lastTrace!)).toEqual([]);
});
it('ordinary first pair, charge-only play and normal Touye multiplier cannot impersonate a burst',()=>{
 for(const id of ['erxiang','azao','touye','laohuan'] as const){const s=saved(entered(id),{type:'PlayHand',selectedIds:hand.slice(0,2)});expect(heroPayoffs(s,s.lastTrace!)).toEqual([]);}
});
it('all distinct real multiplication events keep trace order and same-event replay is excluded',()=>{
 const f=scoreEnergyFixture('multiply'),s=saved(f.state,{type:'PlayAssistedHand',selectedIds:f.selectedIds,assistIds:f.assistIds}),t=s.lastTrace!,keys=heroPayoffs(s,t);expect(keys.length).toBeGreaterThanOrEqual(3);expect(keys.map(k=>k.eventId)).toEqual(t.events.filter(e=>keys.some(k=>k.eventId===e.eventId)).map(e=>e.eventId));expect(heroPayoffs({...s,openingShow:undefined},t)).toEqual(keys);expect(heroPayoffs(s,{...t,events:[...t.events,...t.events]})).toEqual(keys);

});
it('the same owned multiplier triggers on a second saved hand with a distinct root',()=>{const f=scoreEnergyFixture('multiply');const a=saved(f.state,{type:'PlayHand',selectedIds:[f.state.handOrder[0]]});expect(a.phase).toBe('await-input');const b=saved(a,{type:'PlayHand',selectedIds:[a.handOrder[0]]});const first=heroPayoffs(a,a.lastTrace!),second=heroPayoffs(b,b.lastTrace!);expect(first.length).toBeGreaterThanOrEqual(2);expect(second.length).toBeGreaterThanOrEqual(2);expect(b.lastTrace!.rootId).not.toBe(a.lastTrace!.rootId);expect(second.every(k=>!first.some(old=>old.eventId===k.eventId))).toBe(true);});
it('unused legal opportunities remain visible before selection; used/poor/uncharged states do not pulse',()=>{
 for(const id of ['amo','erxiang','laohuan','touye'] as const)expect(heroAbilityCue(entered(id))).toMatchObject({opportunity:true,available:false});const x=entered('xiemu');expect(heroAbilityCue(x)?.opportunity).toBe(false);x.gold=10;expect(heroAbilityCue(x)).toMatchObject({opportunity:true,available:false});let a=arrange(entered('azao'),['spades-2','hearts-2','clubs-3','diamonds-3',...hand.slice(4)]);expect(heroAbilityCue(a)?.opportunity).toBe(false);a=saved(a,{type:'PlayHand',selectedIds:a.handOrder.slice(0,4)});expect(heroAbilityCue(a)).toMatchObject({opportunity:true,available:false});const used=saved(entered('erxiang'),{type:'PlayHand',selectedIds:hand.slice(0,2),erxiangTargetId:hand[0]});expect(heroAbilityCue(used)?.opportunity).toBe(false);
});
it('Laohuan reports saved retention without a previous score or invented multiplier',()=>{let s=entered('laohuan');s=saved(s,{type:'DiscardHand',selectedIds:[hand[0]],laohuanTrick:true});expect(savedHeroResult(s)).toBe('');s=saved(s,{type:'ChooseRefill',selectedIds:[s.pendingRefill!.candidateIds[0]]});expect(s.lastTrace).toBeNull();expect(savedHeroResult(s)).toContain('实际留牌已保存');});
it('shortcuts reserve legal hits while leaving hand, sort and play geometry intact across capacity/breakpoints',()=>{
 for(const [width,height] of [[1280,720],[1366,768],[1920,1080],[768,1024],[811,740],[812,740],[390,740],[320,740],[740,390]])for(const count of [8,9,14]){const l=layout({width,height},{top:0,right:0,bottom:0,left:0},undefined,{count}),before=structuredClone(l);const cells=heroActionShortcut(l.tableActions.discard,l.actions.x,l.mode==='portrait');expect(cells).toBeDefined();for(const box of [cells!.discard,cells!.shortcut]){expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width);expect(intersects(box,l.tableActions.play)).toBe(false);expect(intersects(box,l.buttons.rank)).toBe(false);expect(intersects(box,l.buttons.suit)).toBe(false);expect(intersects(box,l.hand)).toBe(false);}expect(intersects(cells!.discard,cells!.shortcut)).toBe(false);expect(l).toEqual(before);}
});
it('subject holds a real visible second on render updates and abort detaches without gameplay callbacks',async()=>{
 expect(heroPayoffBeat({windup:100,flight:200,impact:200,rest:500,strength:'multiply'},true)).toMatchObject({windup:0,flight:0,impact:1000,rest:0});let now=0;const clock=vi.spyOn(performance,'now').mockImplementation(()=>now),listeners=new Set<()=>void>(),data=new Map();const scene=Object.create(GameScene.prototype) as any;scene.events={on:(_:string,f:()=>void)=>listeners.add(f),off:(_:string,f:()=>void)=>listeners.delete(f)};scene.heroClimax={group:{setData:(k:string,v:any)=>data.set(k,v)}};const abort=new AbortController();let done=false;const p=scene.waitHeroSubject({signal:abort.signal}).then(()=>done=true);for(const n of [100,500,1099]){now=n;for(const f of listeners)f();await Promise.resolve();expect(done).toBe(false);}now=1100;for(const f of listeners)f();await p;expect(data.get('subjectHoldMs')).toBe(1000);expect(listeners.size).toBe(0);const q=scene.waitHeroSubject({signal:abort.signal});abort.abort();await q;expect(listeners.size).toBe(0);clock.mockRestore();
});
