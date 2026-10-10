import type {Fraction} from '../domain/rational';
import {fractionText} from './scoreText';

/** A readable event overview; exact rational values stay in the saved trace and metadata. */
export function multiplierOverview(value:Fraction,compact=false):string {
 const exact=fractionText(value);
 const n=BigInt(value.n),d=BigInt(value.d),negative=n<0n,absolute=negative?-n:n;
 const places=compact&&absolute>=d*100n?1:2,unit=places===1?10n:100n;
 if(!exact.includes('/')&&(!compact||absolute<d*100n||(absolute*unit)%d===0n))return exact.replaceAll(',','');
 const rounded=(absolute*unit*2n+d)/(d*2n),whole=rounded/unit,tail=(rounded%unit).toString().padStart(places,'0').replace(/0+$/,'');
 return '≈'+(negative?'-':'')+whole.toString()+(tail?'.'+tail:'');
}
export function multiplierCaption(source:string,factor:string,before:Fraction,after:Fraction,compact=false){
 return {text:source.replace(/\s*·\s*/g,'·')+' ×'+factor+' '+multiplierOverview(before,compact)+'→'+multiplierOverview(after,compact),
  exact:source+' · 实际 ×'+factor+' · '+fractionText(before)+' → '+fractionText(after)};
}
