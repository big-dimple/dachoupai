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
 expect(s.result).toContain('×2');expect(s.result).toContain('×0.85');expect(s.after.label).toContain('非必中');expect(s.cost).toContain('不能再弃');expect(s.cost).toContain('工具');expect(s.cost).toContain('调大丑牌');
});
