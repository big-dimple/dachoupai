import {heroSkillName} from './HeroSkillPresentation';
import {usesErxiangHandoff} from '../domain/r2ErxiangHandoff';
import {usesTouyeWager,usesTouyeNewCore} from '../domain/r2TouyeWager';
import {usesLaohuanRefill} from '../domain/r2LaohuanRefill';
import {usesXiemuBurn} from '../domain/r2XiemuBurn';
import {isR2AzaoCharge} from '../domain/r2GroupUpgrade';
import {HERO_QUICK_COPY,heroDetailRules} from './HeroText';
import {newRunIdentity} from './RunLaunch';
import type {CharacterId} from '../domain/characters';
import {getCharacter} from './characters';
import type {R2RunState} from '../domain/r2Run';
import {R2_ASSIST_CONTRACT} from '../domain/r2Assist';
import {r2UsesAssist} from '../domain/r2Run';
import {R2_PUBLISHED_CONTENT} from '../domain/r2PublishedContent';
import {R2_S04_FINISH_VERSION,R2_S04_FINISH_HASH} from '../domain/r2GroupUpgrade';

/** Saved-run copy is scoped to its identity; character selection uses the actual new-game identity. */
function characterDetailsForRun(run:Pick<R2RunState,'characterId'|'contentVersion'|'contentHash'>){
 const character=getCharacter(run.characterId);
 if(usesErxiangHandoff(run))return {...character,openingPlay:'对子及以上，出牌前点击技能按钮选计分牌：一张核心普通点数改加倍率，本场一次。',buildTip:'对子及以上，选一张有效核心把首次普通点数改加倍率；每场一次，可留到后手。',passiveDescription:'每场一次，指定本手有效核心：首次普通点数不计热度、改加同值倍率。增强、版次与后续重触保持原规则；0点、失效牌或角色封禁不可发动。取消不消耗，出牌保存成功才用掉。'};
 if(usesTouyeNewCore(run))return {...character,openingPlay:'1选弃牌，2押牌型换牌，3用新摸牌成型。已成型也可押；成×2／不成×0.85。',buildTip:'1选1–5张弃牌；2押下一手牌型并换牌；3至少用一张刚摸回的牌凑成目标。成功×2，否则×0.85；每场一次。',passiveDescription:'1. 选1–5张要弃的牌。\n2. 押下一手牌型，再确认换牌；手里已成型也可押。\n3. 下一手至少用一张刚摸回的牌凑成所押牌型，倍率×2；否则×0.85。新牌只当配牌、没打出或被封住，都不算。\n每场一次，只赌下一手。押后不能再弃牌、用改牌工具或更换、调整唐宋牌。照常花弃牌次数；不押时×1.15。返回或继续存档仍保留押注；静场、禁用角色能力的挑战不能押。'};
 if(usesTouyeWager(run))return {...character,openingPlay:'弃牌前点英雄押未成目标，只赌下一手；成型×2，未成×0.85，本场一次。',buildTip:'每场一次，弃前押当前整手尚凑不出的成组、顺子或同花；只赌下一手，不能再弃牌。成型×2，未成×0.85；普通不押×1.15。',passiveDescription:'每场一次，押目标与真实弃牌一起提交；目标当前整手已能凑出就不能押。只赌下一次真实出牌，成型×2、未成×0.85替代普通×1.15，不另扣金币；普通弃牌成本照旧。押后不能再弃、改牌工具或调序唐宋牌，返回恢复保约。静场/无能力挑战停用，'};
 if(usesLaohuanRefill(run))return {...character,openingPlay:'弃牌前点击技能按钮确认换牌，多看最多两张并自己留牌，本场一次。',buildTip:'每场一次额外择牌：真实弃牌后多看最多2张，自己留应补数；没留的本场不再抽。三条路线都可用。',passiveDescription:'每场一次，照付实际弃牌成本，提交保存后多看最多2张，手选应补数；未留候选进已用区、不算再次弃牌。候选不足全留，收起或恢复仍是同批；完成前不能出/弃/用工具。静场可用，无能力挑战停用；'};
 if(usesXiemuBurn(run))return {...character,openingPlay:'两对及以上，出牌前可付10／20／30金换倍率，也可留钱收息。',buildTip:'每场一次，两对及以上可付10／20／30金，角色时点×2／3／4；先扣真金，持币收益和关末息读余钱。留钱还有有限关末息。',passiveDescription:'每场一次主动付10／20／30金，角色时点倍率×2／3／4，仅两对及以上主手。不足不降档。成功额外关末息：奖励前金币每5金给1，最多2金；不算本次奖励再生息。静场不付、关末息保留；无能力挑战全停。'};
 if(run.characterId==='azao'&&isR2AzaoCharge(run))return {...character,openingPlay:'两对及以上先蓄势；有层时出牌前点英雄释放，换型可继续蓄。',buildTip:'两对及以上先蓄1层，下一手可主动释放。换牌型可继续蓄；重复牌型不释放会清空。弃牌保留，场间清空。',passiveDescription:'两对及以上：首手蓄1层，连续换牌型最多3层。主动释放当前1／2／3层，倍率×1.5／2.5／4；重复合格牌也可释放。释放手不再蓄。重复牌型不释放、对子或高牌出牌清空；弃牌保留，进场／结束清空。'};
 if(run.characterId!=='amo')return character;
 if(r2UsesAssist(run))return {...character,openingPlay:'两对及以上，出牌前可用剩余同点牌助攻；副组真消耗，本场一次。',buildTip:'先凑两对、三条、顺子、同花或更高主手，再决定是否用剩余同点对子／三条助攻。每场一次，可留到关键手；高牌和对子仅兜底，不能助攻。副组会真消耗，不算主手或留手。',passiveDescription:'每场'+R2_ASSIST_CONTRACT.usesPerStage+'次：两对及以上主手＋剩余对子×'+R2_ASSIST_CONTRACT.pair+'／三条×'+R2_ASSIST_CONTRACT.three+'。副组真消耗，不算主手或留手；高牌、对子不能助攻。'};
 if(run.contentHash===R2_PUBLISHED_CONTENT.v10.hash)return {...character,passiveDescription:'高牌 Lv3 开局；只打出1张时，倍率 ×3，在整手唐宋牌之前结算。'};
 return {...character,passiveDescription:'高牌 Lv3 开局；只打出1张时，整手唐宋牌之后，最终倍率 ×3。'};
}

export function characterForNewRun(characterId:CharacterId){return characterForRun({characterId,...newRunIdentity(characterId,characterId==='erxiang'||characterId==='azao'||characterId==='xiemu'||characterId==='laohuan'||characterId==='touye'?'group':undefined)});}

export function usesCurrentHeroText(run:Pick<R2RunState,'characterId'|'contentVersion'|'contentHash'>):boolean {
 return run.contentVersion===R2_S04_FINISH_VERSION&&run.contentHash===R2_S04_FINISH_HASH;
}
export function characterForRun(run:Pick<R2RunState,'characterId'|'contentVersion'|'contentHash'>){
 const c=characterDetailsForRun(run),current=usesCurrentHeroText(run),quick=HERO_QUICK_COPY[run.characterId];
 return {...c,openingPlay:'openingPlay' in c?c.openingPlay:c.buildTip,
  passiveName:heroSkillName(run.characterId),
  quickEffect:current?quick.effect:('openingPlay' in c?c.openingPlay:c.buildTip),
  skillTags:current?quick.tags:[] as readonly string[],
  detailRules:current?heroDetailRules(run.characterId):c.passiveDescription};
}
