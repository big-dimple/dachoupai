import {expect,it} from 'vitest';
import {CHARACTER_IDS} from '../src/domain/characters';
import {createRun} from '../src/domain/run';
import {heroSkillButton,heroSkillName,heroSkillTitle} from '../src/game/HeroSkillPresentation';
import {getCharacter} from '../src/game/characters';
import {characterForNewRun,characterForRun} from '../src/game/CharacterRunCopy';
import {heroPlaySample} from '../src/game/OpeningPlaySample';
import {heroSignature} from '../src/game/HeroSignature';
import {SELECTION_PRESENTATION} from '../src/game/SelectionPresentation';
const approved={amo:'余音袅袅',touye:'跃马冲阵',laohuan:'众里寻他',erxiang:'垂帘听政',azao:'和亲',xiemu:'赏赐'};
it('every hero exposes one approved name across current and historical display entry points without rewriting the save',()=>{
 for(const id of CHARACTER_IDS){
  const run=createRun({rulesVersion:'r2',seed:'legacy-name',runId:'legacy-name/'+id,characterId:id}),before=JSON.stringify(run),name=approved[id];
  expect(heroSkillName(id)).toBe(name);expect(getCharacter(id).passiveName).toBe(name);
  expect(characterForRun(run).passiveName).toBe(name);expect(characterForNewRun(id).passiveName).toBe(name);
  expect(heroPlaySample(id).tag).toBe(name);expect(heroSignature(id).tag).toBe(name);expect(SELECTION_PRESENTATION[id].tag).toBe(name);
  expect(heroSkillTitle(id)).toBe(getCharacter(id).name+' · '+name);expect(JSON.stringify(run)).toBe(before);
 }
});
it('the visual name stays bare while every hero shares separate state and accessible action copy',()=>{
 const cases=[
  [{available:true},'available','可用'],[{available:false},'unavailable','条件未满足'],
  [{available:false,used:true},'used','已用'],[{available:false,disabled:true},'disabled','已停用'],
  [{available:true,selected:true},'selected','已选择'],[{available:false,used:true,pending:true},'pending','待完成'],
 ] as const;
 for(const id of CHARACTER_IDS)for(const [flags,state,status] of cases){
  const before=JSON.stringify(flags),view=heroSkillButton(id,flags,'选牌后确认');
  expect(view).toMatchObject({label:heroSkillName(id),status,state,detail:'选牌后确认'});
  expect(view.label).not.toMatch(/技能|主动|可用|已用/);expect(view.ariaLabel).toContain('主动技能'+view.label);
  expect(view.ariaLabel).toContain(status);expect(view.ariaLabel).toContain('选牌后确认');expect(JSON.stringify(flags)).toBe(before);
 }
});
