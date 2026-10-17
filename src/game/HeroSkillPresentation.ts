import type {CharacterId} from '../domain/characters';
import {heroName} from './HeroIdentity';
import {heroTextSpec} from './HeroText';

/** Names are display projections; saved character IDs and rule identities stay untouched. */
export const heroSkillName=(id:CharacterId):string=>heroTextSpec(id).skillName;
export const heroSkillTitle=(id:CharacterId):string=>heroName(id)+' · '+heroSkillName(id);
export type HeroSkillState='available'|'used'|'unavailable'|'disabled'|'selected'|'pending'|'locked'|'drawing'|'settling'|'ended';
export type TouyeSkillPhase='drawing'|'settling';
const statuses:Record<HeroSkillState,string>={available:'可用',used:'已用',unavailable:'条件未满足',disabled:'已停用',selected:'已选择',pending:'待完成',locked:'已锁定',drawing:'换牌中',settling:'结算中',ended:'本场结束'};
export interface HeroSkillFlags {available:boolean;used?:boolean;disabled?:boolean;selected?:boolean;pending?:boolean;lockedTarget?:string;activity?:TouyeSkillPhase;ended?:boolean}
/** Animation phase is transient view state, never saved or derived from selected cards. */
export interface HeroSkillDraft {erxiangTargetId?:string|null;xiemuBurn?:number;azaoRelease?:boolean;assistCount?:number;touyePhase?:TouyeSkillPhase}

/** A stable visual name plus a separate common status; action instructions remain explicit. */
export function heroSkillButton(id:CharacterId,flags:HeroSkillFlags,detail=''){
 const state:HeroSkillState=flags.activity??(flags.lockedTarget?'locked':flags.pending?'pending':flags.used?'used':flags.ended?'ended':flags.disabled?'disabled':flags.selected?'selected':flags.available?'available':'unavailable');
 const label=heroSkillName(id),status=state==='locked'?'已押'+flags.lockedTarget:statuses[state];
 const actionable=!flags.ended&&state!=='locked'&&state!=='drawing'&&state!=='settling',attention=state==='available'||state==='selected'||state==='pending';
 return {label,status,state,detail,actionable,attention,ariaLabel:heroName(id)+'，主动技能'+label+'，'+status+(detail?'，'+detail:'')};
}
