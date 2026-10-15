import type {TableLayout} from './layout';
import type {Fraction} from '../domain/rational';
import {readableFractionText} from './scoreText';
/** Short first-layer coefficients only; exact rule/detail strings never use these candidates. */
export function coefficientLabelCandidates(value:Fraction):string[] {
 const n=BigInt(value.n),d=BigInt(value.d),magnitude=n<0n?-n:n,denominator=d<0n?-d:d;
 // Keep the existing scientific notation for extreme values; ordinary growth uses familiar units.
 const [scale,suffix]:[bigint,string]=magnitude>=denominator*10n**15n?[1n,'']:magnitude>=denominator*10000n?[10000n,'万']:magnitude>=denominator*1000n?[1000n,'千']:[1n,''];
 const scaled={n:value.n,d:(d*scale).toString()};
 return [...new Set(([2,1] as const).map(places=>'×'+readableFractionText(scaled,places)+suffix))];
}

/** Exactly the same real label box on first mount and every refresh. */
export function jokerLabelRoom(layout:TableLayout,index:number):number {
 return layout.mode==='landscape'?layout.jokerLabels[index].width:layout.slots[index].width-6;
}
/** Ordered complete phrases only; a state value never falls back to a mechanism. */
export function fitJokerLabel(candidates:readonly string[],fits:(text:string)=>boolean,state=false):string {
 for(const text of candidates)if(fits(text))return text;
 const entry=state?'状态 ›':'条件 ›';
 return fits(entry)?entry:state?'状态':'条件';
}
