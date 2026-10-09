import {it,expect} from 'vitest';
import {createRun} from '../src/domain/run';
import {CHARACTER_IDS} from '../src/domain/characters';
import {newRunIdentity} from '../src/game/RunLaunch';
import {heroStageContinuity} from '../src/game/HeroStageContinuity';
import {buildKeepsake} from '../src/game/BuildKeepsake';
import {heroStageFixture,heroSend} from '../harness/fixtures/hero-stage-continuity';
import {R2_TOOL_SUPPLY_VERSION,R2_TOOL_SUPPLY_HASH} from '../src/domain/r2GroupUpgrade';
const initial=(id:typeof CHARACTER_IDS[number])=>createRun({rulesVersion:'r2',openingRoute:'group',runId:'continuity/'+id,seed:'continuity',characterId:id,r2Identity:newRunIdentity(id,'group'),modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
it.each(CHARACTER_IDS)('%s distinguishes the upcoming stage from absent history without mutation',id=>{
 const s=initial(id),before=JSON.stringify(s),c=heroStageContinuity(s);expect(c).toBeDefined();expect(c!.last).toBeUndefined();expect(c!.decision).toBeTruthy();expect(buildKeepsake(s).hero.url).toContain('/'+id+'.selection.webp');expect(JSON.stringify(s)).toBe(before);
});
it('the saved one-layer gain is history, while stage end and next entry really reset charge',()=>{
 const f=heroStageFixture('azao');expect(f.cleared.phase).toBe('stage-cleared');expect(f.cleared.lastTrace!.azaoCharge!.after.charge).toBe(1);expect(f.cleared.stage!.azaoCharge!.charge).toBe(0);
 for(const s of [f.cleared,f.shop]){const before=JSON.stringify(s),c=heroStageContinuity(s)!;expect(c.last).toContain('0 → 1层');expect(c.last).toContain('已清层');expect(c.next).toContain('从0层');expect(JSON.stringify(s)).toBe(before);}
 expect(f.entered.stage!.azaoCharge!.charge).toBe(0);expect(heroStageContinuity(f.entered)).toBeUndefined();
});
it('burn history keeps the paid 12→2 while the shop decision reads current saved money',()=>{
 const f=heroStageFixture('xiemu'),c=heroStageContinuity(f.shop)!;expect(c.last).toContain('已燃10金，12→2');expect(c.last).toContain('实际×2');expect(c.decision).toContain('当前'+f.shop.gold+'金');expect(c.decision).toContain('未到账');expect(f.cleared.stage!.xiemuBurnUsed).toBe(true);expect(f.entered.stage!.xiemuBurnUsed).toBe(false);
 const changed=structuredClone(f.shop);changed.gold=4;const next=heroStageContinuity(changed)!;expect(next.last).toBe(c.last);expect(next.decision).toContain('还差6金');
});
it('old-stage quiet is not the next ordinary stage restriction, and actual upcoming quiet exempts trick',()=>{
 const f=heroStageFixture('azao'),s=structuredClone(f.shop);s.stage!.boss={definitionId:'B08',disabledSuit:null};expect(heroStageContinuity(s)!.next).not.toContain('停用');s.stageIndex=2;s.boss={definitionId:'B08',disabledSuit:null};expect(heroStageContinuity(s)!.next).toContain('静场');
 const trick=initial('laohuan');trick.stageIndex=2;trick.boss={definitionId:'B08',disabledSuit:null};expect(heroStageContinuity(trick)!.next).toContain('戏法次数');
});
it('skip has no role activation, no old identity promise, and terminal has no next stage',()=>{
 const s=heroSend(initial('azao'),{type:'SkipStage'}),c=heroStageContinuity(s)!;expect(c.last).toContain('没有出牌或角色发动');
 const old=createRun({rulesVersion:'r2',openingRoute:'group',runId:'old',seed:'old',characterId:'erxiang',r2Identity:{contentVersion:R2_TOOL_SUPPLY_VERSION,contentHash:R2_TOOL_SUPPLY_HASH},modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});expect(heroStageContinuity(old)).toBeUndefined();expect(buildKeepsake(old).hero.tip).toContain('+1.5');
 const f=heroStageFixture('azao');f.shop.phase='run-won';expect(heroStageContinuity(f.shop)).toBeUndefined();
});
it('disabled challenge never promises an upcoming use or interest gain',()=>{
 const s=createRun({rulesVersion:'r2',openingRoute:'group',runId:'disabled',seed:'challenge/q01/0',characterId:'xiemu',r2Identity:newRunIdentity('xiemu','group'),modeConfig:{mode:'challenge',difficulty:0,challengeId:'Q01',programsEnabled:false}}),c=heroStageContinuity(s)!;expect(c.next).toContain('停用');expect(c.decision).not.toContain('关末息');
});

it.each(['amo','erxiang','touye','laohuan'] as const)('%s returns through real commands without treating an ordinary hand as a used active ability',id=>{
 const f=heroStageFixture(id);expect(f.cleared.phase).toBe('stage-cleared');const c=heroStageContinuity(f.shop)!;expect(c.next).toContain('恢复为1次');expect(c.last).not.toContain('能力已用');expect(c.last).not.toContain('实际×2');expect(f.entered.phase).toBe('await-input');expect(heroStageContinuity(f.entered)).toBeUndefined();
});
