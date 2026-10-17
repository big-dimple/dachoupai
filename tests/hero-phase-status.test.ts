import {expect,it} from 'vitest';
import {CHARACTER_IDS} from '../src/domain/characters';
import {azaoChargeStep} from '../src/domain/r2AzaoCharge';
import {azaoChoice} from '../src/game/AzaoChargeCopy';
import {erxiangChoice} from '../src/game/ErxiangHandoffCopy';
import {xiemuChoice} from '../src/game/XiemuBurnCopy';
import {heroAbilityCue} from '../src/game/HeroAbilityCue';
import {heroStageFixture} from '../harness/fixtures/hero-stage-continuity';

it.each(CHARACTER_IDS)('%s says the stage ended, without treating the phase as a disabled ability',id=>{
 const s=heroStageFixture(id).cleared,before=structuredClone(s),cue=heroAbilityCue(s);
 expect(cue).toMatchObject({state:id==='xiemu'?'used':'ended',status:id==='xiemu'?'已用':'本场结束',available:false,opportunity:false,actionable:false});expect(cue!.state).not.toBe('disabled');expect(s).toEqual(before);
});
it('a same-type release clears charge, permits a fresh charge, and never sets permanent disable',()=>{
 const released=azaoChargeStep('two-pair',{before:{charge:1,previousQualifiedType:'two-pair'},release:true},true);
 expect(released.multiplier).toBe('1.5');expect(released.after).toEqual({charge:0,previousQualifiedType:null});expect(azaoChargeStep('two-pair',{before:released.after,release:false},true).after.charge).toBe(1);
 const ended=heroStageFixture('azao').cleared,c=azaoChoice(ended,'two-pair');expect(c.enabled).toBe(true);expect(c.available).toBe(false);expect(c.compact).toContain('本场已结束');expect(c.hold).not.toContain('停用');expect(heroAbilityCue(ended)!.detail).not.toContain('不蓄层、不释放');
});
it('the same phase confusion is removed from Liu E and Huarui while commands stay unavailable',()=>{
 const e=erxiangChoice(heroStageFixture('erxiang').cleared),x=xiemuChoice(heroStageFixture('xiemu').cleared,'two-pair');
 expect(e.enabled).toBe(true);expect(e.candidates).toEqual([]);expect(e.sentence).not.toContain('停用');expect(x.enabled).toBe(true);expect(x.choices.every(c=>!c.available)).toBe(true);expect(x.choices.every(c=>c.reason==='当前不在出牌阶段')).toBe(true);
});
it('actual B08 suppression still reports disabled during a live stage',()=>{
 const s=heroStageFixture('azao').state;s.stage!.boss={definitionId:'B08',disabledSuit:null};expect(azaoChoice(s,'two-pair')).toMatchObject({enabled:false,available:false});expect(heroAbilityCue(s)).toMatchObject({state:'disabled',status:'已停用'});
});
