import {expect,it} from 'vitest';
import spec from '../docs/production/HERO_TEXT_SPEC_20261015.json';
import {CHARACTER_IDS} from '../src/domain/characters';
import {createRun,applyCommand,type R2RunState,type Action} from '../src/domain/run';
import {R2_TOUYE_WAGER_VERSION,R2_TOUYE_WAGER_HASH} from '../src/domain/r2GroupUpgrade';
import {newRunIdentity} from '../src/game/RunLaunch';
import {characterForRun,characterForNewRun,usesCurrentHeroText} from '../src/game/CharacterRunCopy';
import {HERO_CAST} from '../src/game/HeroIdentity';
import {heroExplanationCopy} from '../src/game/HeroExplanation';
import {HERO_QUICK_COPY} from '../src/game/HeroText';
import {heroSkillGuide} from '../src/game/HeroSkillGuide';
import {touyeChoice} from '../src/game/TouyeWagerCopy';
import {azaoChoice} from '../src/game/AzaoChargeCopy';
import {savedSkillName} from '../src/game/SettlementHighlights';

function send(s:R2RunState,action:Action){const r=applyCommand(s,{runId:s.runId,commandId:s.runId+'/'+s.commandSeq,expectedSeq:s.commandSeq,action});if(!r.ok)throw Error(r.code);return r.state;}
function enter(id:typeof CHARACTER_IDS[number],legacy=false){return send(send(createRun({rulesVersion:'r2',seed:'text-contract',runId:'copy/'+id+(legacy?'/legacy':''),characterId:id,...(legacy?{}:{r2Identity:newRunIdentity(id),openingRoute:'group' as const})}),{type:'LeaveShop'}),{type:'EnterStage'});}
function arrange(s:R2RunState,ids:string[]){s=structuredClone(s);s.handOrder=ids;s.drawPile=s.deckInstances.map(c=>c.id).filter(id=>!ids.includes(id)&&!s.playedPile.includes(id)&&!s.discardPile.includes(id));return s;}

it('adopts the exact six approved identities while keeping first-layer copy compact',()=>{
 const names={amo:'余音袅袅',touye:'跃马冲阵',laohuan:'众里寻他',erxiang:'垂帘听政',azao:'和亲',xiemu:'赏赐'};
 for(const id of CHARACTER_IDS){const approved=spec.heroes.find(h=>h.id===id)!,copy=characterForNewRun(id);
  expect(copy.passiveName).toBe(names[id]);expect(approved.mottoAttribution).toMatch(/摘句|游戏演绎/);
  expect(copy.passiveName).toBe(approved.skillName);expect(HERO_CAST[id]).toMatchObject({name:approved.name,title:approved.theme,intro:approved.story,quote:approved.motto});
  expect(copy.quickEffect).not.toBe(approved.skillSummary);expect(copy.quickEffect.length).toBeLessThanOrEqual(32);expect(copy.skillTags.length).toBeGreaterThanOrEqual(2);
  expect(copy.detailRules).toContain(approved.skillSummary);expect(copy.detailRules).not.toMatch(/AMO_ASSIST_TYPES|pending-refill|禁止套用|不能误写|不能许诺/);expect(HERO_QUICK_COPY[id].tags.every(t=>t.length<=10)).toBe(true);
 }
});
it('projects old identities to approved names while keeping their own rules and examples',()=>{
 for(const id of CHARACTER_IDS){const old=enter(id,true),before=structuredClone(old),copy=characterForRun(old);
  expect(usesCurrentHeroText(old)).toBe(false);expect(copy.passiveName).toBe(characterForNewRun(id).passiveName);expect(copy.skillTags).toEqual([]);expect(heroExplanationCopy(id,old).current).toBe(false);expect(old).toEqual(before);
 }
 const base=createRun({rulesVersion:'r2',seed:'old-wager',runId:'old-wager',characterId:'touye',r2Identity:{contentVersion:R2_TOUYE_WAGER_VERSION,contentHash:R2_TOUYE_WAGER_HASH},openingRoute:'group'});
 const old=arrange(send(send(base,{type:'LeaveShop'}),{type:'EnterStage'}),['spades-8','hearts-8','clubs-8','diamonds-2','spades-5','hearts-6','clubs-10','diamonds-13']);
 const current=arrange(enter('touye'),old.handOrder),ids=['diamonds-2'];
 expect(characterForRun(old).passiveName).toBe('跃马冲阵');expect(characterForRun(old).passiveDescription).toContain('已能凑出就不能押');
 expect(touyeChoice(old,ids).choices.find(c=>c.target==='three-kind')?.available).toBe(false);
 expect(touyeChoice(current,ids).choices.find(c=>c.target==='three-kind')?.available).toBe(true);
 expect(characterForRun(enter('laohuan',true)).passiveDescription).toContain('120');
});
it('same qualified type can release existing charge; copy changes never change the transaction',()=>{
 let s=arrange(enter('azao'),['spades-2','hearts-2','clubs-3','diamonds-3','spades-7','hearts-7','clubs-8','diamonds-8']);
 s=send(s,{type:'PlayHand',selectedIds:s.handOrder.slice(0,4)});
 s=arrange(s,['spades-7','hearts-7','clubs-8','diamonds-8','spades-9','hearts-10','clubs-11','diamonds-12']);
 const before=structuredClone(s),choice=azaoChoice(s,'two-pair');expect(choice.available).toBe(true);expect(choice.hold).toContain('同牌型未释放则清空');expect(choice.hold).toContain('仍可释放');expect(s).toEqual(before);
 const release=send(s,{type:'PlayHand',selectedIds:s.handOrder.slice(0,4),azaoRelease:true});expect(release.lastTrace?.azaoCharge).toMatchObject({release:true,multiplier:'1.5',after:{charge:0}});
 const hold=send(s,{type:'PlayHand',selectedIds:s.handOrder.slice(0,4)});expect(hold.lastTrace?.azaoCharge).toMatchObject({release:false,after:{charge:0}});
});
it('live used/disabled reasons and ordinary wager factor retain their authoritative meanings',()=>{
 let s=enter('laohuan');s=send(s,{type:'DiscardHand',selectedIds:[s.handOrder[0]],laohuanTrick:true});s=send(s,{type:'ChooseRefill',selectedIds:s.pendingRefill!.candidateIds.slice(0,s.pendingRefill!.required)});
 expect(heroSkillGuide(s).step).toContain('已用');expect(characterForRun(s).passiveName).toBe('众里寻他');
 const disabled=createRun({rulesVersion:'r2',seed:'challenge/q01/0',runId:'disabled',characterId:'xiemu',r2Identity:newRunIdentity('xiemu'),modeConfig:{mode:'challenge',difficulty:0,challengeId:'Q01',programsEnabled:false}});
 expect(heroExplanationCopy('xiemu',disabled).now).toContain('关闭角色能力');
 const ordinary=send(enter('touye'),{type:'PlayHand',selectedIds:[enter('touye').handOrder[0]]}),trace=ordinary.lastTrace!;
 const event=trace.events.find(e=>e.sourceType==='character'&&e.operation==='multiply-multiplier')!;
 expect(savedSkillName(ordinary,trace,event)).toBe('常规倍率');
});
