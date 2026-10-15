import {R2_HAND_TYPES,type HandRules,type R2HandType} from '../domain/evaluateR2';
import {R2_BASE_SCORES,SCORE_LIMITS} from '../domain/scoreR2';
import {Rational} from '../domain/rational';
import {HAND_LABELS} from '../content/handLabels';
import {fractionText} from './scoreText';
import {r2RulesetFor,type R2RunState} from '../domain/r2Run';
import {isR2ActiveMultTiming,isR2RouteGrowth,isR2ErxiangHandoff,isR2LaohuanRefill} from '../domain/r2GroupUpgrade';

type HandRuleIdentity=Pick<R2RunState,'contentVersion'|'contentHash'|'characterId'>;
/** Saved version/hash govern timing; the chosen hero never opts an old save into a new clock. */
export function handScoringOrder(identity?:HandRuleIdentity):string {
 const profile=identity&&r2RulesetFor(identity),start='当前等级牌型基础 → 逐有效计分牌的普通点数、强化、版次、该牌大丑牌与重触发 → 留手强化／大丑牌';
 if(!identity||!profile)return start+'。角色与整手大丑牌的具体先后，以该局已保存身份和计分记录为准。';
 const whole='按持有顺序的整手大丑牌及各自版次（逆场按相反顺序）',route=isR2RouteGrowth(identity)?' → 本手相关族加成':'';
 if(isR2ActiveMultTiming(identity)&&['touye','xiemu','azao'].includes(identity.characterId)){
   const effect=identity.characterId==='touye'?'押约结果倍率（有押约时）':identity.characterId==='xiemu'?'谢幕燃金倍率（本手实际燃金时）':'阿燥释放倍率（本手实际释放时）';
   const ordinary=identity.characterId==='touye'?' → 骰爷普通加成（未押约时）':'';
   return start+ordinary+' → '+whole+route+' → '+effect+(identity.characterId==='touye'?'。普通加成与押约结果互斥，不叠加。':'。');
 }
 if(identity.characterId==='amo'){
   if(profile.amoScoreTiming==='assist-v1')return start+' → '+whole+route+' → 阿默助攻倍率（合法主手与副组时）；没有单张×3。';
   if(profile.amoScoreTiming==='after-joker')return start+' → '+whole+route+' → 阿默单张×3（仅打出1张时）。';
   return start+' → 阿默单张×3（仅打出1张时） → '+whole+route+'。';
 }
 if(identity.characterId==='erxiang'&&isR2ErxiangHandoff(identity))return start+' → '+whole+route+'。二响交棒在对应牌的首次普通点数步骤处理，不是整手后的倍率。';
 if(identity.characterId==='laohuan'&&isR2LaohuanRefill(identity))return start+' → '+whole+route+'。老幻戏法弃属于补牌操作，不在计分链额外加角色热度。';
 return start+' → 角色计分（符合该局规则时） → '+whole+route+'。';
}

const algorithms:Record<R2HandType,string>={
 'high-card':'所选1–5张未组成其他牌型时，最高点数的一张计分。',
 pair:'2张相同点数成型；可选2–5张，其余为附带牌。',
 'two-pair':'两组不同点数的对子成型；可选4或5张。',
 'three-kind':'3张相同点数成型；可选3／4／5张。补另一对子会成为葫芦，第四张同点会成为四条。',
 straight:'5张不同点数连续，花色不限。A可用于A2345或10JQKA，不能跨越QKA2。',
 flush:'5张相同花色，点数不限。',
 'full-house':'5张中，3张相同点数＋另2张相同点数。',
 'four-kind':'4张相同点数成型；可选4或5张。',
 'straight-flush':'5张相同花色且点数连续；始终需要5张。只判同花顺，不另叠顺子或同花。',
 'five-kind':'5张相同点数；复制得到的不同牌可一起使用。',
 'flush-house':'5张相同花色且组成葫芦；复制得到的不同牌可一起使用。',
 'flush-five':'5张相同花色、相同点数；复制得到的不同牌可一起使用。',
};
export function handTypeRuleReference(type:R2HandType,levels:Partial<Record<R2HandType,number>>={},rules:HandRules={}){
  const discovered=levels[type]!==undefined,level=levels[type]??1,[heat,mult,heatStep,multStep]=R2_BASE_SCORES[type];
  const H=heat+(level-1)*heatStep,M=Rational.fromJSON(mult).add(Rational.fromJSON(multStep).multiply(new Rational(BigInt(level-1))));
  const extra=type==='straight'&&rules.fourStraight?' 当前规则：4张普通顺子；同花顺仍5张。':type==='flush'&&rules.fourFlush?' 当前规则：4张普通同花；同花顺仍5张。':'';
  return HAND_LABELS[type]+' · '+(discovered?'Lv'+level:'未发现 · 按Lv1基准')+'\n'+algorithms[type]+extra+'\n基础热度 '+H+' · 基础倍率 '+fractionText(M.toJSON())+'\n每级：热度 +'+heatStep+' · 倍率 +'+fractionText(multStep);

}
/** Public reference only: reads current saved levels, never evaluates a player's score. */
export function handRuleReference(levels:Partial<Record<R2HandType,number>>,rules:HandRules={},identity?:HandRuleIdentity):string {
 const rows=R2_HAND_TYPES.map(type=>handTypeRuleReference(type,levels,rules));
 return '按当前保存的等级列出全部12型；同一次选牌只判一种牌型。目录顺序不代表当前收益高低。\n\n'+rows.join('\n\n')+'\n\n判型优先顺序（先符合者）：'+[...R2_HAND_TYPES].reverse().map(t=>HAND_LABELS[t]).join(' → ')+(rules.fourStraight&&rules.fourFlush?'\n同时持有两条四牌规则时，4张同花连续判普通同花，不是同花顺。':'')+'\n\n普通点数：2–10按牌面，J／Q／K为10，A为11。只加有效计分牌；附带牌仍参与判型、打出张数和重复条件。Boss停用的牌仍成型但计分效果停用；普通点数0只停止普通点数，其他效果保留。\n\n计分顺序：'+handScoringOrder(identity)+'各次 +热度、+倍率、×倍率即时发生；先乘不会追溯乘后加的倍率。最后热度×倍率，只向下取整一次。\n固定顺序示例：4倍先+2再×1.5为9倍；先×1.5再+2为8倍。\n\n仅正式打出会发现牌型，不自动升级；升级只作用已有发现型，满级'+SCORE_LIMITS.handLevel+'。未发现项按Lv1参考显示，不写入存档。';
}

/** Read-only front layer for all twelve types; exact order and scoring rules remain below. */
export function handTypeRuleCards(levels:Partial<Record<R2HandType,number>>,rules:HandRules={}){
 return R2_HAND_TYPES.map(type=>{const lines=handTypeRuleReference(type,levels,rules).split('\n');return {title:lines[0],body:lines.slice(1).join('\n')};});
}
