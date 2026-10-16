import {expect,it} from 'vitest';
import {CHARACTER_IDS} from '../src/domain/characters';
import {createRun} from '../src/domain/run';
import {newRunIdentity} from '../src/game/RunLaunch';
import {heroExplanationCopy} from '../src/game/HeroExplanation';
import {heroStageFixture} from '../harness/fixtures/hero-stage-continuity';

it('six explanations retain real skill names, usage conditions and phase-specific reasons without changing saves',()=>{
 for(const id of CHARACTER_IDS){
  const fixture=heroStageFixture(id);
  for(const run of [fixture.state,fixture.cleared,fixture.shop]){
   const before=structuredClone(run),copy=heroExplanationCopy(id,run);
   expect(copy.hero.id).toBe(id);expect(copy.hero.passiveName).toBeTruthy();expect(copy.when).toBeTruthy();expect(copy.effect).toBeTruthy();expect(copy.now).toBeTruthy();expect(run).toEqual(before);
   if(run.phase==='shop')expect(copy.now).toContain('筹备商店');
   if(run.phase==='stage-cleared')expect(copy.now).toContain('本场已结束');
  }
 }
});
it('opening and disabled modes explain availability; saved old passive abilities do not show modern examples',()=>{
 for(const id of CHARACTER_IDS){expect(heroExplanationCopy(id).now).toContain('开始对局');expect(heroExplanationCopy(id,undefined,false).now).toContain('关闭');
  const old=createRun({rulesVersion:'r2',characterId:id,seed:'old-explanation',runId:'old/'+id});
  const copy=heroExplanationCopy(id,old);expect(copy.current).toBe(false);expect(copy.hero.passiveDescription).toBeTruthy();
 }
 const run=createRun({rulesVersion:'r2',characterId:'xiemu',seed:'challenge/q01/0',runId:'disabled-explanation',r2Identity:newRunIdentity('xiemu','group'),modeConfig:{mode:'challenge',difficulty:0,challengeId:'Q01',programsEnabled:false}});
 expect(heroExplanationCopy('xiemu',run).now).toContain('本模式关闭角色能力');
});
