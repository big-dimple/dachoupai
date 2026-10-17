import {expect,it} from 'vitest';
import {makeCheckpoint,readCheckpoint} from '../src/application/checkpoint';
import {R2_TOUYE_WAGER_HASH,R2_TOUYE_WAGER_VERSION} from '../src/domain/r2GroupUpgrade';
import {heroAbilityCue,savedHeroResult} from '../src/game/HeroAbilityCue';
import {newRunIdentity} from '../src/game/RunLaunch';
import {touyeChoice} from '../src/game/TouyeWagerCopy';
import {touyeBet,touyeFixture,touyeSend} from './fixtures/touye-new-core';

const current={identity:newRunIdentity('touye','group')};
it('locks only the saved wager target, independently of the next selected hand',()=>{
 const f=touyeFixture('four-straight',current),before=structuredClone(f.state);
 expect(heroAbilityCue(f.state,undefined,f.discard)).toMatchObject({state:'available',status:'可用',available:true});
 expect(touyeChoice(f.state).lockedTarget).toBeUndefined();expect(savedHeroResult(f.state)).toBe('');
 expect(f.state).toEqual(before);
 const pending=touyeSend(f.state,touyeBet(f.state,f.discard,f.target)),snapshot=structuredClone(pending);
 for(const ids of [[],f.play,[pending.handOrder[4]]]){
  const cue=heroAbilityCue(pending,undefined,ids);
  expect(cue).toMatchObject({label:'跃马冲阵',state:'locked',status:'已押顺子',detail:'出牌后结算',available:false,opportunity:false,actionable:false,attention:false});
  expect(cue!.ariaLabel).toContain('已押顺子，出牌后结算');
  expect(cue!.status+cue!.detail).not.toMatch(/待完成|成功|失败|达成|×/);
 }
 expect(touyeChoice(pending).status).toBe('已押顺子 · 出牌后结算');
 expect(savedHeroResult(pending)).toBe('');expect(pending).toEqual(snapshot);
 const restored=readCheckpoint(makeCheckpoint(pending,[]));expect(restored.ok).toBe(true);
 if(restored.ok)expect(heroAbilityCue(restored.checkpoint.state)).toMatchObject({status:'已押顺子',state:'locked',detail:'出牌后结算'});
});

it('keeps drawing and settling as temporary non-actionable display phases without predicting a result',()=>{
 const f=touyeFixture('four-straight',current),before=structuredClone(f.state);
 const starting=heroAbilityCue(f.state,undefined,f.discard,false,{touyePhase:'drawing'});
 expect(starting).toMatchObject({status:'换牌中',state:'drawing',available:false,opportunity:false,actionable:false,attention:false});
 expect(starting!.detail).not.toContain('已押');expect(f.state).toEqual(before);
 const pending=touyeSend(f.state,touyeBet(f.state,f.discard,f.target)),snapshot=structuredClone(pending);
 for(const [phase,status] of [['drawing','换牌中'],['settling','结算中']] as const){
  const cue=heroAbilityCue(pending,undefined,f.play,false,{touyePhase:phase});
  expect(cue).toMatchObject({state:phase,status,available:false,opportunity:false,actionable:false,attention:false});
  expect(cue!.detail).toContain('已押顺子');expect(cue!.detail).not.toMatch(/成功|失败|达成|×/);
 }
 expect(heroAbilityCue(pending)).toMatchObject({state:'locked',status:'已押顺子',detail:'出牌后结算'});
 expect(pending).toEqual(snapshot);
});

it.each(['mature-win','target-miss'] as const)('shows a saved %s result only after a real play',kind=>{
 const f=touyeFixture(kind,current),pending=touyeSend(f.state,touyeBet(f.state,f.discard,f.target));
 expect(heroAbilityCue(pending)).toMatchObject({status:'已押两对',detail:'出牌后结算'});
 expect(savedHeroResult(pending)).toBe('');
 const played=touyeSend(pending,{type:'PlayHand',selectedIds:f.play}),snapshot=structuredClone(played);
 expect(played.lastTrace!.touyeWager!.outcome).toBe(kind==='mature-win'?'won':'lost');
 const actual=touyeChoice(played).settled;
 expect(actual).toContain(kind==='mature-win'?'新摸牌成型×2':'没成所押牌型×0.85');
 expect(heroAbilityCue(played)).toMatchObject({state:'used',status:'已用',detail:actual,available:false,opportunity:false,attention:false});
 expect(savedHeroResult(played)).toContain(actual);expect(played).toEqual(snapshot);
});

it('keeps unselected, unavailable and disabled states separate from a committed wager',()=>{
 const f=touyeFixture('mature-win',current);
 expect(heroAbilityCue(f.state)).toMatchObject({state:'unavailable',status:'条件未满足',detail:'先选1–5张弃牌',available:false});
 f.state.stage!.discardsLeft=0;
 expect(heroAbilityCue(f.state,undefined,f.discard)).toMatchObject({state:'unavailable',status:'条件未满足',detail:'当前不能押目标',available:false,opportunity:false});
 const disabled=touyeFixture('mature-win',{...current,challenge:true});
 expect(heroAbilityCue(disabled.state,undefined,disabled.discard)).toMatchObject({state:'disabled',status:'已停用',detail:'本场角色能力停用',available:false,opportunity:false});
});

it('projects the actual locked target for an older wager identity without requiring new-core refill fields',()=>{
 const f=touyeFixture('mature-win',{identity:{contentVersion:R2_TOUYE_WAGER_VERSION,contentHash:R2_TOUYE_WAGER_HASH}});
 const pending=touyeSend(f.state,touyeBet(f.state,f.discard,'three-kind')),snapshot=structuredClone(pending);
 expect(pending.stage!.touyeWager!.commit!.refill).toBeUndefined();
 expect(heroAbilityCue(pending,undefined,f.play)).toMatchObject({state:'locked',status:'已押三条',detail:'出牌后结算',available:false,opportunity:false,actionable:false,attention:false});
 expect(touyeChoice(pending).newCore).toBe(false);expect(pending).toEqual(snapshot);
});
