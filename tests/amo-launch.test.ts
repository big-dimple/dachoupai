import {describe,expect,it} from 'vitest';
import {createRun,applyCommand,assertRunInvariants,type R2RunState} from '../src/domain/run';
import {CHARACTER_IDS} from '../src/domain/characters';
import {R2_RULESETS} from '../src/domain/r2Run';
import {R2_ASSIST_HASH,R2_ASSIST_VERSION} from '../src/domain/r2Assist';
import {newRunIdentity,launchIdentity} from '../src/game/RunLaunch';
import {characterForNewRun} from '../src/game/CharacterRunCopy';
import {getCharacter} from '../src/game/characters';
import {makeCheckpoint,readCheckpoint} from '../src/application/checkpoint';
const base={seed:'normal-launch',runId:'normal-launch',characterId:'amo' as const,rulesVersion:'r2' as const};
const step=(s:R2RunState,type:'LeaveShop'|'EnterStage')=>{const r=applyCommand(s,{runId:s.runId,commandId:type,expectedSeq:s.commandSeq,action:{type}});if(!r.ok)throw Error(r.code);return r.state;};
describe('normal new-game policy and exact retry creation',()=>{
 it('only the normal new Amo uses the frozen assist identity; raw createRun stays v11',()=>{
  for(const characterId of CHARACTER_IDS){
   const run=createRun({...base,characterId,r2Identity:newRunIdentity(characterId)});assertRunInvariants(run);
   expect(run.contentHash).toBe(characterId==='amo'?R2_ASSIST_HASH:'json-fnv-v1:bd4a1230833ab884');
   expect(run.contentVersion).toBe(characterId==='amo'?R2_ASSIST_VERSION:'quality-r2-content-v11');
   expect(run.handLevels).toEqual({});expect(readCheckpoint(makeCheckpoint(run,[])).ok).toBe(true);
  }
  expect(createRun(base).contentHash).toBe('json-fnv-v1:bd4a1230833ab884');
  expect(createRun(base).handLevels).toEqual({'high-card':3});
 });
 it.each(R2_RULESETS)('retry creates $contentVersion directly with fresh counters and exact identity',profile=>{
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
  expect(()=>createRun({...base,characterId:'erxiang',r2Identity:newRunIdentity('amo')})).toThrow('invalid-r2-profile');
  expect(()=>createRun({...base,rulesVersion:'r1',r2Identity:newRunIdentity('amo')})).toThrow('invalid-r2-profile');
 });
 it('Q01 keeps assist identity while disabling its ability; tutorial stays Erxiang v11',()=>{
  const q=createRun({...base,seed:'challenge/q01/0',r2Identity:newRunIdentity('amo'),modeConfig:{mode:'challenge',difficulty:0,challengeId:'Q01',programsEnabled:false}});
  expect(q.contentHash).toBe(R2_ASSIST_HASH);expect(q.handLevels).toEqual({});
  expect(()=>createRun({...base,r2Identity:newRunIdentity('amo'),modeConfig:{mode:'tutorial',difficulty:0,challengeId:null,programsEnabled:false}})).toThrow();
 });
 it('selector copy shares new-game policy without changing legacy or other character definitions',()=>{
  const amo=characterForNewRun('amo');expect(amo.passiveName).toBe('主手＋助攻（试行）');
  expect(amo.buildTip).not.toMatch(/单张|Lv3|高牌升级/);expect(amo.buildTip).toContain('不能助攻');
  expect(amo.passiveDescription).toMatch(/每场1次/);expect(amo.passiveDescription).toContain('对子×2／三条×4');
  expect(getCharacter('amo').buildTip).toContain('单张');
  for(const id of CHARACTER_IDS.filter(id=>id!=='amo'))expect(characterForNewRun(id)).toBe(getCharacter(id));
 });
});
