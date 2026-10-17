import {expect,it} from 'vitest';
import {createRun,type R2RunState} from '../src/domain/run';
import {newRunIdentity} from '../src/game/RunLaunch';
import {makeCheckpoint,readCheckpoint} from '../src/application/checkpoint';
import {workshopBossTransition as bossTransition} from '../harness/fixtures/workshop-layout';
import {shopBossPreparation,shopBossWarning,currentShopNotice,SHOP_BOSS_WARNING} from '../src/game/ShopBossPreparation';
function fresh(){return createRun({rulesVersion:'r2',runId:'shop-boss-current-stage',seed:'shop-boss-current-stage',characterId:'laohuan',r2Identity:newRunIdentity('laohuan','group'),openingRoute:'group',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});}
it('keeps a real current Boss preview and clears it immediately on victory, next warm shop and saved continue',()=>{
 const {before,won,after}=bossTransition();expect(shopBossWarning(before)).toBe(SHOP_BOSS_WARNING);expect(before.stageIndex).toBe(2);
 expect(won.stage!.boss).toBeTruthy();expect(won.stageIndex).toBe(3);expect(shopBossWarning(won)).toBeUndefined();expect(shopBossPreparation(after)).toBeUndefined();expect(after.shop!.visitIndex).toBe(3);
 for(const s of [before,after]){const cp=makeCheckpoint(s,[]),read=readCheckpoint(cp);expect(read.ok).toBe(true);if(read.ok)expect(!!shopBossPreparation(read.checkpoint.state as R2RunState)).toBe(s===before);}
});
it('rejects stale cached Boss copy after victory or restart while keeping ordinary action feedback',()=>{
 const {before,won,after}=bossTransition();for(const s of [fresh(),won,after])expect(currentShopNotice(s,SHOP_BOSS_WARNING)).toBeUndefined();expect(currentShopNotice(before,SHOP_BOSS_WARNING)).toBe(SHOP_BOSS_WARNING);expect(currentShopNotice(after,'购买已保存')).toBe('购买已保存');
});
it('requires the current shop visit and preparation phase rather than a previous or future Boss identity',()=>{
 const {before}=bossTransition();expect(shopBossPreparation({...before,shop:{...before.shop!,visitIndex:1}})).toBeUndefined();for(const phase of ['stage-cleared','await-input','stage-ready','run-lost'] as const)expect(shopBossPreparation({...before,phase})).toBeUndefined();
});
