import {isR2RouteStarter} from '../src/domain/r2GroupUpgrade';
import {describe,expect,it} from 'vitest';
import {createRun,applyCommand,assertRunInvariants,type R2RunState} from '../src/domain/run';
import {CHARACTER_IDS} from '../src/domain/characters';
import {R2_RULESETS} from '../src/domain/r2Run';
import {R2_GROUP_UPGRADE_HASH,R2_GROUP_UPGRADE_VERSION} from '../src/domain/r2GroupUpgrade';
import {R2_ASSIST_HASH,R2_ASSIST_VERSION} from '../src/domain/r2Assist';
import {newRunIdentity,launchIdentity} from '../src/game/RunLaunch';
import {characterForNewRun} from '../src/game/CharacterRunCopy';
import {getCharacter} from '../src/game/characters';
import {makeCheckpoint,readCheckpoint} from '../src/application/checkpoint';
const base={seed:'normal-launch',runId:'normal-launch',characterId:'amo' as const,rulesVersion:'r2' as const};
const step=(s:R2RunState,type:'LeaveShop'|'EnterStage')=>{const r=applyCommand(s,{runId:s.runId,commandId:type,expectedSeq:s.commandSeq,action:{type}});if(!r.ok)throw Error(r.code);return r.state;};
describe('normal new-game policy and exact retry creation',()=>{
 it('all six normal new games use the frozen group identity; raw createRun stays v11',()=>{
  for(const characterId of CHARACTER_IDS){
   const run=createRun({...base,characterId,r2Identity:newRunIdentity(characterId)});assertRunInvariants(run);
   expect(run.contentHash).toBe(R2_GROUP_UPGRADE_HASH);
   expect(run.contentVersion).toBe(R2_GROUP_UPGRADE_VERSION);
   expect(run.handLevels).toEqual({});expect(readCheckpoint(makeCheckpoint(run,[])).ok).toBe(true);
  }
  expect(createRun(base).contentHash).toBe('json-fnv-v1:bd4a1230833ab884');
  expect(createRun(base).handLevels).toEqual({'high-card':3});
 });
 it.each(R2_RULESETS.filter(p=>!isR2RouteStarter(p)))('retry creates $contentVersion directly with fresh counters and exact identity',profile=>{
  const r2Identity={contentVersion:profile.contentVersion,contentHash:profile.contentHash};
  const old=step(step(createRun({...base,r2Identity}),'LeaveShop'),'EnterStage');
  const fresh=createRun({...base,r2Identity:launchIdentity('amo',{kind:'retry',run:old})});
  expect(fresh.contentVersion).toBe(old.contentVersion);expect(fresh.contentHash).toBe(old.contentHash);
  expect(fresh.seed).toBe(old.seed);expect(fresh.stage).toBeNull();expect(fresh.lastTrace).toBeNull();expect(fresh.commandSeq).toBe(1);expect(fresh.receipts).toHaveLength(1);
  expect(makeCheckpoint(fresh,[]).journal).toEqual([]);
  const entered=step(step(fresh,'LeaveShop'),'EnterStage');
  expect(entered.rng).toEqual(old.rng);expect(entered.handOrder).toEqual(old.handOrder);
  expect(entered.stage?.assistUsed).toBe(profile.amoScoreTiming==='assist-v1'?false:undefined);
  expect(entered.handLevels).toEqual(profile.amoScoreTiming==='assist-v1'?{}:{'high-card':3});
 });
 it('rejects mixed, unknown, extra, conflicting and wrong-character identity inputs',()=>{
  const identities=[{contentVersion:R2_ASSIST_VERSION,contentHash:'json-fnv-v1:bd4a1230833ab884'},{contentVersion:'unknown',contentHash:R2_ASSIST_HASH},{...newRunIdentity('amo'),extra:1},Object.assign([] ,newRunIdentity('amo')),null];
  for(const r2Identity of identities)expect(()=>createRun({...base,r2Identity} as any)).toThrow('invalid-r2-identity');
  expect(()=>createRun({...base,r2Profile:'amo-assist-v1',r2Identity:newRunIdentity('amo')})).toThrow('invalid-r2-identity');
  expect(()=>createRun({...base,characterId:'erxiang',r2Identity:{contentVersion:R2_ASSIST_VERSION,contentHash:R2_ASSIST_HASH}})).toThrow('invalid-r2-profile');
  expect(()=>createRun({...base,rulesVersion:'r1',r2Identity:newRunIdentity('amo')})).toThrow('invalid-r2-profile');
 });
 it('Q01 keeps group identity while disabling its ability; tutorial requires Erxiang',()=>{
  const q=createRun({...base,seed:'challenge/q01/0',r2Identity:newRunIdentity('amo'),modeConfig:{mode:'challenge',difficulty:0,challengeId:'Q01',programsEnabled:false}});
  expect(q.contentHash).toBe(R2_GROUP_UPGRADE_HASH);expect(q.handLevels).toEqual({});
  expect(()=>createRun({...base,r2Identity:newRunIdentity('amo'),modeConfig:{mode:'tutorial',difficulty:0,challengeId:null,programsEnabled:false}})).toThrow();
 });
 it('selector copy shares new-game policy without changing legacy or other character definitions',()=>{
  const amo=characterForNewRun('amo');expect(amo.passiveName).toBe('主手＋助攻');
  expect(amo.buildTip).not.toMatch(/单张|Lv3|高牌升级/);expect(amo.buildTip).toContain('不能助攻');
  expect(amo.passiveDescription).toMatch(/每场1次/);expect(amo.passiveDescription).toContain('对子×2／三条×4');
  expect(characterForNewRun('azao').passiveDescription).toContain('重复合格牌也可释放');
  expect(characterForNewRun('xiemu').passiveName).toBe('留钱／燃金');
  expect(characterForNewRun('xiemu').passiveDescription).toContain('燃10／20／30金');
  expect(getCharacter('xiemu').passiveDescription).toContain('最后可用出牌');
  expect(characterForNewRun('laohuan').passiveDescription).toContain('多看最多2张');
  expect(characterForNewRun('touye').passiveDescription).toContain('目标当前整手已能凑出就不能押');
  expect(getCharacter('touye').passiveDescription).toContain('50%');
  expect(getCharacter('laohuan').passiveDescription).toContain('额外 +120');
  expect(getCharacter('amo').buildTip).toContain('单张');
  expect(characterForNewRun('erxiang').passiveName).toBe('交棒');
  expect(characterForNewRun('erxiang').passiveDescription).toContain('首次普通点数不计热度');
  expect(getCharacter('erxiang').passiveDescription).toBe('对子、两对、三条的倍率 +1.5。');
 });
});
