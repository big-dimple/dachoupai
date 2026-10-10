import {touyeSnapshotToken} from '../src/domain/r2TouyeWager';
import {r2CreateJoker} from '../src/domain/r2Run';
import {expect,it} from 'vitest';
import {createRun,applyCommand} from '../src/domain/run';
import {newRunIdentity} from '../src/game/RunLaunch';
import {touyeComboCue} from '../src/game/TouyeComboCue';
const start=()=>createRun({rulesVersion:'r2',characterId:'touye',runId:'combo-guide',seed:'group-natural-17',openingRoute:'group',r2Identity:newRunIdentity('touye','group')});
it('owned actual modulo source provides next successful-play timing without promising a win',()=>{
 let s=start();expect(touyeComboCue(s)).toBeUndefined();s.jokers=[r2CreateJoker('huimaqiang','combo',4,'none',s)];
 for(const type of ['LeaveShop','EnterStage'] as const){const r=applyCommand(s,{runId:s.runId,commandId:type,expectedSeq:s.commandSeq,action:{type}});if(!r.ok)throw Error(r.code);s=r.state;}
 const before=structuredClone(s);expect(touyeComboCue(s)).toContain('第3手，还隔2手');expect(touyeComboCue(s)).toContain('两项实际生效');expect(touyeComboCue(s)).not.toContain('稳赢');expect(s).toEqual(before);
 s.stage!.playIndex=2;expect(touyeComboCue(s)).toContain('第3手，就是下一手');s.stage!.playIndex=3;expect(touyeComboCue(s)).toContain('第6手，还隔2手');
});
it('a real third-hand flush settles separate Touye and Huimaqiang multipliers',()=>{
 let s=start();const send=(action:Parameters<typeof applyCommand>[1]['action'])=>{const r=applyCommand(s,{runId:s.runId,commandId:'actual/'+s.commandSeq,expectedSeq:s.commandSeq,action});if(!r.ok)throw Error(r.code);s=r.state;};
 send({type:'RerollShop'});s.jokers=[r2CreateJoker('huimaqiang','combo',4,'none',s)];send({type:'LeaveShop'});send({type:'EnterStage'});
 const hand=['hearts-2','hearts-6','hearts-9','clubs-3','diamonds-8','spades-11','spades-4','diamonds-13'];
 const arrange=(ids:string[])=>{s.handOrder=ids;s.drawPile=s.deckInstances.map(c=>c.id).filter(id=>!ids.includes(id)&&!s.playedPile.includes(id)&&!s.discardPile.includes(id));};
 for(const id of ['spades-2','clubs-2']){arrange([id,...hand.slice(0,7)]);send({type:'PlayHand',selectedIds:[id]});}
 arrange(hand);const incoming=['hearts-11','hearts-13','clubs-7','spades-8','diamonds-4'];s.drawPile=s.drawPile.filter(id=>!incoming.includes(id)).concat([...incoming].reverse());
 const token=touyeSnapshotToken(hand.map(id=>s.deckInstances.find(c=>c.id===id)!),{fourStraight:false,fourFlush:false},s.stage!.index,s.stage!.playIndex+1,s.commandSeq);
 send({type:'DiscardHand',selectedIds:hand.slice(3),touyeBet:{target:'flush',snapshotToken:token}});send({type:'PlayHand',selectedIds:[...hand.slice(0,3),...incoming.slice(0,2)]});
 const t=s.lastTrace!;expect(t.handType).toBe('flush');expect(t.touyeWager?.outcome).toBe('won');const hero=t.events.find(e=>e.sourceType==='character'&&e.operation==='multiply-multiplier'),joker=t.events.find(e=>e.sourceInstanceId==='combo'&&e.phase==='jokerScore'&&e.operation==='multiply-multiplier');expect(hero?.value).toEqual({n:'2',d:'1'});expect(joker?.value).toEqual({n:'2',d:'1'});expect(t.events.indexOf(hero!)).toBeLessThan(t.events.indexOf(joker!));
});
