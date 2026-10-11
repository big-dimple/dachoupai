import type {Fraction} from '../domain/rational';
import {fractionText,readableFractionText} from './scoreText';

/** A readable event overview; exact rational values stay in the saved trace and metadata. */
export function multiplierOverview(value:Fraction,compact=false):string {
 const n=BigInt(value.n),d=BigInt(value.d);
 return readableFractionText(value,compact&&(n<0n?-n:n)>=(d<0n?-d:d)*100n?1:2);
}
export function multiplierCaption(source:string,factor:Fraction,before:Fraction,after:Fraction,compact=false){
 return {text:source.replace(/\s*·\s*/g,'·')+' ×'+readableFractionText(factor)+' '+multiplierOverview(before,compact)+'→'+multiplierOverview(after,compact),
  exact:source+' · 实际 ×'+fractionText(factor)+' · '+fractionText(before)+' → '+fractionText(after)};
}

/** Visible effect copy only; the caller keeps the saved/audit effect unchanged. */
export function readableMultiplierEffect(effect:string,value:Fraction):string {
 return effect.replace('×'+fractionText(value),'×'+readableFractionText(value));
}
