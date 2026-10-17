/** Display brand only; repository, rules identities and persistence keys are independent. */
export const GAME_NAME='唐宋牌';
export const GAME_DESCRIPTION='唐宋人物题材的牌组构筑游戏';

/** Display text only. Never apply this to rule definitions, save data or protocol keys. */
export function playerText(copy:string):string {return copy.replace(/大丑牌|大丑/g,GAME_NAME);}
