import {touyeChoice} from '../src/game/TouyeWagerCopy';
import {touyeFixture,touyeSend,touyeBet} from './fixtures/touye-new-core';
import {SELECTION_PRESENTATION} from '../src/game/SelectionPresentation';
import {heroSignature} from '../src/game/HeroSignature';
import {it,expect} from 'vitest';
import {heroPlaySample,routePlaySample} from '../src/game/OpeningPlaySample';
import {createRun,applyCommand,type Action,type R2RunState} from '../src/domain/run';
import {newRunIdentity} from '../src/game/RunLaunch';
import type {Rank,Suit} from '../src/cards/types';
const suits:Record<string,Suit>={'♠':'spades','♥':'hearts','♣':'clubs','♦':'diamonds'};
const rank=(s:string):Rank=>({A:14,J:11,Q:12,K:13}[s]??Number(s)) as Rank;
const send=(s:R2RunState,action:Action)=>{const r=applyCommand(s,{runId:s.runId,commandId:'sample/'+s.commandSeq,expectedSeq:s.commandSeq,action});if(!r.ok)throw Error(r.code);return r.state;};
it.each(['group','straight','flush'] as const)('%s authored before/after matches actual purchase and tool commands',focus=>{
 const sample=routePlaySample(focus,'amo');let s=createRun({seed:'opening-sample',runId:'sample/'+focus,characterId:'amo',rulesVersion:'r2',openingRoute:focus,r2Identity:newRunIdentity('amo',focus),modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
 expect(s.jokers).toEqual([]);expect(s.routeStarter?.instanceId).toBeNull();expect(sample.result).toMatch(/^持起手牌时：/);
 sample.before.cards.forEach((value,i)=>Object.assign(s.deckInstances[i],{rank:rank(value.slice(0,-1)),suit:suits[value.slice(-1)]}));
 const ids=s.deckInstances.slice(0,sample.before.cards.length).map(c=>c.id),tool=focus==='flush'?'T03':'T09',stock=s.shop!.toolOffers.find(o=>o.definitionId===tool);
 s=send(s,stock?{type:'BuyOffer',offerId:stock.offerId}:{type:'BuyBasicTool',definitionId:tool,shopSeq:s.shop!.basicChoice!.shopSeq});
 const instance=s.consumables.find(c=>c.definitionId===tool)!;
 s=send(s,{type:'UseConsumable',instanceId:instance.instanceId,targetIds:sample.before.marked.map(i=>ids[i])});
 const after=ids.map(id=>s.deckInstances.find(c=>c.id===id)!);
 expect(after.map(c=>c.rank)).toEqual(sample.after.cards.map(v=>rank(v.slice(0,-1))));expect(after.map(c=>c.suit)).toEqual(sample.after.cards.map(v=>suits[v.slice(-1)]));
 expect(s.gold).toBe(focus==='flush'?2:4);
 expect(s.jokers).toEqual([]);expect(s.routeStarter?.instanceId).toBeNull();
});
it('wager example marks five discards from eight and keeps both outcomes and post-wager restrictions',()=>{
 const s=heroPlaySample('touye');expect(s.before.cards).toHaveLength(8);expect(s.before.marked).toHaveLength(5);expect(s.after.cards).toHaveLength(8);
 expect(s.result).toContain('×2');expect(s.result).toContain('×0.85');expect(s.result).toContain('非必中');expect(s.after.label).toContain('新摸Q♦参与两对');expect(s.before.label).not.toContain('未成');expect(s.cost).toContain('不能再弃');expect(s.cost).toContain('工具');expect(s.cost).toContain('调大丑牌');
});
it('the displayed wager succeeds only when its newly drawn Q actually joins the two-pair hand',()=>{
 const sample=heroPlaySample('touye');let s=createRun({seed:'selection-wager-example',runId:'selection/wager',characterId:'touye',rulesVersion:'r2',r2Identity:newRunIdentity('touye','group'),openingRoute:'group',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
 s=send(send(s,{type:'LeaveShop'}),{type:'EnterStage'});
 const cardId=(value:string)=>s.deckInstances.find(c=>c.rank===rank(value.slice(0,-1))&&c.suit===suits[value.slice(-1)])!.id;
 const before=sample.before.cards.map(cardId),incoming=sample.after.marked.map(i=>cardId(sample.after.cards[i]));
 s.handOrder=before;s.playedPile=[];s.discardPile=[];s.drawPile=[...s.deckInstances.map(c=>c.id).filter(id=>!before.includes(id)&&!incoming.includes(id)),...[...incoming].reverse()];
 const discard=sample.before.marked.map(i=>before[i]);
 s=send(s,{type:'DiscardHand',selectedIds:discard,touyeBet:{target:'two-pair',snapshotToken:touyeChoice(s,discard).snapshotToken}});
 expect(s.handOrder).toEqual(sample.after.cards.map(cardId));
 const after=send(s,{type:'PlayHand',selectedIds:s.handOrder.slice(0,4)});
 expect(after.lastTrace?.touyeWager).toMatchObject({outcome:'won',multiplier:'2',core:{activeNewIds:[incoming[0]]}});
 expect(after.lastTrace?.handType).toBe('two-pair');
});
it('selection permits an already formed wager and clearly names its real risk',()=>{
 const f=touyeFixture('mature-win',{identity:newRunIdentity('touye','group')});
 expect(SELECTION_PRESENTATION.touye.when).toContain('已成型也能押');
 expect(heroSignature('touye').beats[0].result).toContain('已成型');
 expect(()=>touyeSend(f.state,touyeBet(f.state,f.discard,f.target))).not.toThrow();
});
