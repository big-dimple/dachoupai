import type {Fraction} from '../domain/rational';
import {fractionText} from './scoreText';

/** A readable event overview; exact rational values stay in the saved trace and metadata. */
export function multiplierOverview(value:Fraction):string {
 const exact=fractionText(value);
 if(!exact.includes('/'))return exact.replaceAll(',','');
 const n=BigInt(value.n),d=BigInt(value.d),negative=n<0n,absolute=negative?-n:n;
 const hundredths=(absolute*200n+d)/(d*2n),whole=hundredths/100n,tail=(hundredths%100n).toString().padStart(2,'0').replace(/0+$/,'');
 return '≈'+(negative?'-':'')+whole.toString()+(tail?'.'+tail:'');
}
export function multiplierCaption(source:string,factor:string,before:Fraction,after:Fraction){
 return {text:source.replace(/\s*·\s*/g,'·')+' ×'+factor+' '+multiplierOverview(before)+'→'+multiplierOverview(after),
  exact:source+' · 实际 ×'+factor+' · '+fractionText(before)+' → '+fractionText(after)};
}
