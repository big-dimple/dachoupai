import type {Fraction} from '../domain/rational';
/** Display only: an approximation is always marked, including scientific notation. */
export function resultInteger(value:string):string {
 const negative=value.startsWith('-'),digits=negative?value.slice(1):value,sign=negative?'-':'';
 if(digits.length<=15)return sign+digits.replace(/\B(?=(\d{3})+(?!\d))/g,',');
 const approximate=/[1-9]/.test(digits.slice(3));
 return (approximate?'≈':'')+sign+digits[0]+'.'+digits.slice(1,3)+'e'+(digits.length-1);
}
export function resultFraction(value:Fraction):string {
 const n=BigInt(value.n),d=BigInt(value.d),a=n<0n?-n:n,sign=n<0n?'-':'';
 const whole=a/d;let remainder=a%d,decimal='';
 for(let i=0;i<2&&remainder;i++){remainder*=10n;decimal+=(remainder/d).toString();remainder%=d;}
 const integer=resultInteger(whole.toString());
 if(integer.includes('e'))return (remainder||decimal||integer.startsWith('≈')?'≈':'')+sign+integer.replace('≈','');
 return (remainder?'≈':'')+sign+integer+(decimal?'.'+decimal:'');
}
