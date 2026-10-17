import type {CharacterId} from '../domain/characters';
import {heroName} from './HeroIdentity';
import {heroTextSpec} from './HeroText';

/** Names are display projections; saved character IDs and rule identities stay untouched. */
export const heroSkillName=(id:CharacterId):string=>heroTextSpec(id).skillName;
export const heroSkillTitle=(id:CharacterId):string=>heroName(id)+' · '+heroSkillName(id);
export type HeroSkillState='available'|'used'|'unavailable'|'disabled'|'selected'|'pending';
const statuses:Record<HeroSkillState,string>={available:'可用',used:'已用',unavailable:'条件未满足',disabled:'已停用',selected:'已选择',pending:'待完成'};
export interface HeroSkillFlags {available:boolean;used?:boolean;disabled?:boolean;selected?:boolean;pending?:boolean}
export interface HeroSkillDraft {erxiangTargetId?:string|null;xiemuBurn?:number;azaoRelease?:boolean;assistCount?:number}

/** A stable visual name plus a separate common status; action instructions remain explicit. */
export function heroSkillButton(id:CharacterId,flags:HeroSkillFlags,detail=''){
 const state:HeroSkillState=flags.pending?'pending':flags.used?'used':flags.disabled?'disabled':flags.selected?'selected':flags.available?'available':'unavailable';
 const label=heroSkillName(id),status=statuses[state];
 return {label,status,state,detail,ariaLabel:heroName(id)+'，主动技能'+label+'，'+status+(detail?'，'+detail:'')};
}
