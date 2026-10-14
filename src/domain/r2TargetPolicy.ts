import {isR2BoundedClear,isR2CoreBuild} from './r2GroupUpgrade';
import {R2_CORE_BUILD_TARGET_CONTRACT,R2_BOUNDED_TARGET_CONTRACT,R2_ENDLESS_CONTRACT} from './r2Chapter';
/** Presentation must consume this identity reader, never infer policy from score. */
export function r2TargetPolicyFor(identity:{contentVersion?:unknown;contentHash?:unknown}) {
 return structuredClone(isR2CoreBuild(identity)?R2_CORE_BUILD_TARGET_CONTRACT:isR2BoundedClear(identity)?R2_BOUNDED_TARGET_CONTRACT:R2_ENDLESS_CONTRACT);
}
