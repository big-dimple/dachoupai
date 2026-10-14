import {getR2Tool,R2_ENHANCEMENTS,R2_TOOLS,type R2ToolEnhancement} from '../content/r2Tools';
import type {R2RunState} from '../domain/r2Run';
import type {R2ContentIdentity} from '../domain/r2ContentProfiles';
import {isR2BasicChoice,r2BasicChoiceIds} from '../domain/r2GroupUpgrade';
import {r2ToolAllowed,r2ToolSupported} from '../domain/r2ToolRuntime';

/** Player examples for existing enhancements only. Names/IDs and executable rules stay in the catalog. */
const copy:Record<R2ToolEnhancement,{purpose:string;summary:string;example:string;rules:string;aliases:string[]}>={
 'heat-paper':{purpose:'计分加热度',summary:'打出并计分时，每次热度+20。',example:'例如：给一张7加上热度纸；它参与计分时，除了点数热度，还加20热度。',rules:'普通计分和额外计分每次都加20热度；留在手里不加。',aliases:[]},
 'multiplier-paper':{purpose:'计分加倍率',summary:'打出并计分时，每次倍率+2。',example:'例如：这张牌计分前倍率是3，计分时加2，变成5。',rules:'普通计分和额外计分每次都加2倍率，是加法，不是乘2；留在手里不加。',aliases:[]},
 'glass-paper':{purpose:'加倍但可能碎',summary:'打出并计分时倍率×1.5；手后有1/4概率永久破碎。',example:'例如：倍率是10时，这张牌计分会把倍率乘到15；这一手结束后，它可能碎掉，以后抽不到。',rules:'玻璃牌就是带玻璃纸增强的扑克。每次普通或额外计分都乘1.5；本手结算后，每张实际计分的原牌只判一次1/4破碎，未过关也判。重计分不会增加破碎判定次数。留在手里或打出但不参与计分时，不加倍也不判破碎。破碎是永久删牌，可以低于主动删牌的最低张数。',aliases:['玻璃牌']},
 'voice-paper':{purpose:'留牌加倍率',summary:'留在手里，每次出牌倍率+1；打出去就不加。',example:'就像备用牌：你打出一对，把带留声纸的另一张牌留在手里，这手倍率就+1。',rules:'每次出牌，每张有效留牌加1倍率，只算一次；其他牌重计分不会让它多加。倍率是加1，不是乘倍。已打出、被用作助攻消耗或被Boss停用的牌都不算有效留牌。',aliases:['留牌加倍率','备用牌']},
 'gold-paper':{purpose:'留牌过关拿钱',summary:'过关那手留在手里，每张+1金；每场最多5金。',example:'例如：过关时还留着两张有效金纸牌，额外拿2金；没过关的出牌不会发这笔钱。',rules:'只读取实际过关那手的有效留牌，每张给1金，每场总共最多5金。打出、助攻消耗或停用的牌不算；之后补进手里的牌不追补这笔奖励。',aliases:['金牌']},
 'encore-paper':{purpose:'同一张再计分',summary:'打出并计分时，这张牌再计分1次。',example:'例如：这张7原本只计一次点数，现在再计一次；额外计分也会触发它的有效版次和相应丑牌能力。',rules:'第一次有效计分后，再计分1次；额外那次不会又触发返场纸，不能无限循环。与丑牌的额外计分共用每张最多4次上限。留在手里不触发。',aliases:['返场牌']},
 'lucky-paper':{purpose:'计分抽小奖',summary:'每次计分：1/5概率倍率+4，1/15概率+10金；每手最多20金。',example:'像两次独立抽奖：倍率奖和金币奖分别抽，可以都中、只中一个或都不中。',rules:'每次普通或额外计分，两项独立判定，先倍率后金币。金币奖每手最多20金，达到上限仍判定；金币不增加热度或倍率。留在手里不抽奖。',aliases:[]},
};

export function enhancementReference(id:R2ToolEnhancement){
 const definition=R2_ENHANCEMENTS.find(e=>e.id===id)!;
 return {name:definition.name+' · '+copy[id].purpose,...copy[id],rules:copy[id].rules+'\n失效牌不触发增强。每张扑克只能有一种增强，赋予新的会覆盖旧的；独立版次保留。增强装上后持续保留，不是每次出牌都要再买工具。'};
}

/** Poker details have no run identity argument; route to the identity-aware query rather than assume a supply version. */
export function enhancementCardHelp(id:R2ToolEnhancement):string {
 const tool=R2_TOOLS.find(t=>t.operation.kind==='set-enhancement'&&t.operation.enhancement===id)!;
 return copy[id].example+'\n获得：对应工具是“'+tool.name+'”。在商店的“道具”现货出现时可购买，买后从库存选牌并确认使用。具体本局能否获取、是否有基础自选入口，见菜单 → 图鉴查询 → 增强怎么获得。';
}

/** A known acquisition route is distinct from today's stock and from purchase/use eligibility. */
export function enhancementToolAcquisition(id:string,identity:R2ContentIdentity,run?:R2RunState):string|undefined {
 const tool=getR2Tool(id);if(tool.operation.kind!=='set-enhancement')return;
 if(!r2ToolSupported(id))return '当前版本未开放这件工具，无法通过它获得增强。';
 if(run&&!r2ToolAllowed(run,id))return '当前挑战禁止获取和赋予增强，这件工具在本局不可获得或使用。';
 const chooser=isR2BasicChoice(identity),fixed=chooser&&r2BasicChoiceIds(identity).includes(id);
 return '商店 → 道具 → '+(fixed?'基础自选，或出现同名商品时的本店现货':'本店现货')+'，购买“'+tool.name+'”。'+(fixed?'基础自选每店共选1件；仍须有合法可改目标。':'这是随机现货'+(chooser?'，不在基础自选':'')+'；每店不保证出现，还须有合法可改目标。')+'\n买后从库存选“'+tool.name+'”，选择'+(tool.target.kind==='cards'?(tool.target.minimum===tool.target.maximum?tool.target.maximum:tool.target.minimum+'–'+tool.target.maximum):'')+'张扑克并确认使用。商店可选有效牌组，待出牌时只选当前手牌。成功后消耗1件工具，使用不另付金币；覆盖旧增强会永久失去旧效果。';
}

export function enhancementAcquisition(id:R2ToolEnhancement,identity:R2ContentIdentity,run?:R2RunState):string {
 const direct=R2_TOOLS.find(t=>t.operation.kind==='set-enhancement'&&t.operation.enhancement===id)!;
 const route=enhancementToolAcquisition(direct.id,identity,run)!;
 if(!r2ToolSupported(direct.id)||run&&!r2ToolAllowed(run,direct.id))return route;
 const random=getR2Tool('S01');
 const alternative=random.operation.kind==='random-enhancement'&&r2ToolSupported(random.id)?'\n另一路是现货“献纸”：永久献出1张扑克，给1–2张未增强扑克随机增强；每张有1/7概率得到此增强，不能指定。':'';
 return route+alternative;
}

export function enhancementToolReference(id:string){
 const tool=getR2Tool(id);if(tool.operation.kind!=='set-enhancement')return;
 const reference=enhancementReference(tool.operation.enhancement);
 return {...reference,summary:'改'+(tool.target.kind==='cards'?(tool.target.minimum===tool.target.maximum?tool.target.maximum:tool.target.minimum+'–'+tool.target.maximum):'')+'张：'+reference.summary};
}
