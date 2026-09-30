import type {Fraction} from '../domain/rational';
export const heatText=(value:string):string=>value.length>15?`${value[0]}.${value.slice(1,3)}e${value.length-1}`:value.replace(/\B(?=(\d{3})+(?!\d))/g,',');
export function fractionText(value:Fraction):string {
  const n=BigInt(value.n),numerator=n<0n?-n:n,denominator=BigInt(value.d),sign=n<0n?'-':'';
  const whole=numerator/denominator;let remainder=numerator%denominator,decimal='';
  for(let i=0;i<4&&remainder;i++){remainder*=10n;decimal+=(remainder/denominator).toString();remainder%=denominator;}
  return remainder?`${heatText(value.n)}/${heatText(value.d)}`:sign+heatText(whole.toString())+(decimal?'.'+decimal:'');
}
