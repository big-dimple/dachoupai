import {expect,it} from 'vitest';
import {createRun,applyCommand} from '../src/domain/run';
import {CHARACTER_IDS,type CharacterId} from '../src/domain/characters';
import {newRunIdentity} from '../src/game/RunLaunch';
import {heroSkillGuide} from '../src/game/HeroSkillGuide';
import {r2SelectionFacts} from '../src/domain/r2SelectionFacts';
import {r2JokerDefinitionsFor} from '../src/domain/r2ContentProfiles';
const start=(id:CharacterId)=>{let s=createRun({seed:'hero-guide',runId:'hero-guide/'+id,rulesVersion:'r2',characterId:id,openingRoute:'group',r2Identity:newRunIdentity(id,'group'),modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});const r=applyCommand(s,{runId:s.runId,commandId:'enter',expectedSeq:s.commandSeq,action:{type:'LeaveShop'}});if(!r.ok)throw Error(r.code);const entered=applyCommand(r.state,{runId:s.runId,commandId:'enter-stage',expectedSeq:r.state.commandSeq,action:{type:'EnterStage'}});if(!entered.ok)throw Error(entered.code);return entered.state;};
it('six current skills give their actual steps and risks without mutating the run',()=>{
 for(const id of CHARACTER_IDS){const s=start(id),before=structuredClone(s),c=heroSkillGuide(s);expect(c.active).toBe(true);expect(c.step).toBeTruthy();expect(c.effect).toBeTruthy();expect(c.risk).toBeTruthy();expect(s).toEqual(before);}
 expect(heroSkillGuide(start('touye')).step).toContain('选1–5张弃牌');expect(heroSkillGuide(start('touye')).effect).toContain('×0.85');
 expect(heroSkillGuide(start('laohuan')).effect).toContain('最多2张');expect(heroSkillGuide(start('erxiang')).effect).toContain('改加倍率');
 expect(heroSkillGuide(start('xiemu')).effect).toContain('×2／3／4');expect(heroSkillGuide(start('azao')).effect).toContain('×1.5／2.5／4');expect(heroSkillGuide(start('amo')).risk).toContain('随本手消耗');
});
it('Touye unavailable, selected and pending steps come from existing real choices',()=>{
 const s=start('touye'),ids=[s.handOrder[0]],facts=r2SelectionFacts({hand:s.handOrder.map(id=>s.deckInstances.find(c=>c.id===id)!),selectedIds:ids,jokers:s.jokers,definitions:r2JokerDefinitionsFor(s),disabledIds:[]});expect(heroSkillGuide(s,facts,ids).step).toContain('选下一手目标');
 s.stage!.discardsLeft=0;expect(heroSkillGuide(s,facts,ids).step).toContain('弃牌次数不足');
});
it('old automatic abilities remain passive; old Touye keeps its actual wager',()=>{
 for(const id of CHARACTER_IDS){const s=createRun({seed:'old-guide',runId:'old-guide/'+id,rulesVersion:'r2',characterId:id});const c=heroSkillGuide(s);if(id==='touye'){expect(c.active).toBe(true);expect(c.risk).toContain('50%');}else{expect(c.active).toBe(false);expect(c.step).toContain('被动技能');}}
});
