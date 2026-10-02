export interface CardAbilityCopy {condition:string;value:string;state?:string;flavor:string;rules:string}
/** Curated sample copy only: no mass rewrite of the content registry or its numeric rules. */
export function cardAbilityCopy(id:string,context:{gold:number;discardsUsed?:number;inStage?:boolean;disabledReason?:string}):CardAbilityCopy|undefined {
  if(id==='f09')return {condition:context.disabledReason?'本场计分被封禁':context.inStage&&(context.discardsUsed??0)>0?'这场已经弃过牌了':'这场一张都没弃？',
    value:context.disabledReason||context.inStage&&(context.discardsUsed??0)>0?'本场不再加成':'整手倍率 ×1.5',
    state:context.disabledReason??(context.inStage?(context.discardsUsed??0)>0?'下场恢复':'每次出牌都能触发':'进场后，守住不弃牌就生效'),
    flavor:'稿子不换，好戏照演。',rules:'每次出牌时，只要本场成功弃牌次数为0，整手倍率乘1.5。成功弃牌后本场失效；返还弃牌次数也不能恢复资格。下一场重新判定。'};
  if(id==='f04')return {condition:'只剩 3 金币或更少？',value:'整手倍率 +3',state:context.disabledReason??`现在 ${context.gold} 金币 · ${context.gold<=3?'满足条件':'尚未满足'}`,flavor:'钱包躺平，倍率上班。',rules:'出牌计分时检查当前金币数。金币≤3，整手倍率加3；不是乘3。金币增加后重新判定。'};
}
