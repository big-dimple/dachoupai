import type {Fraction} from '../domain/rational';
export const heatText=(value:string):string=>value.length>15?`${value[0]}.${value.slice(1,3)}e${value.length-1}`:value.replace(/\B(?=(\d{3})+(?!\d))/g,',');
const grouped=(value:bigint):string=>value.toString().replace(/\B(?=(\d{3})+(?!\d))/g,',');
function parts(value:Fraction){
  let n=BigInt(value.n),d=BigInt(value.d);
  if(d===0n)throw new RangeError('Fraction denominator must be nonzero');
  if(d<0n){n=-n;d=-d;}
  return {n:n<0n?-n:n,d,sign:n<0n?'-':''};
}
/** Exact rule/audit text. Never shorten either side of a rational to scientific notation. */
export function exactFractionText(value:Fraction):string {
  const {n,d,sign}=parts(value),whole=n/d;let remainder=n%d,decimal='';
  for(let i=0;i<4&&remainder;i++){remainder*=10n;decimal+=(remainder/d).toString();remainder%=d;}
  return remainder?sign+grouped(n)+'/'+grouped(d):sign+grouped(whole)+(decimal?'.'+decimal:'');
}
/** Existing details keep their exact contract; first-layer consumers opt in below. */
export const fractionText=exactFractionText;
function roundedDecimal(n:bigint,d:bigint,places:number){
  const unit=10n**BigInt(places),scaled=n*unit,remainder=scaled%d;
  const rounded=scaled/d+(remainder*2n>=d?1n:0n);
  const tail=(rounded%unit).toString().padStart(places,'0').replace(/0+$/,'');
  return {text:(rounded/unit).toString()+(tail?'.'+tail:''),approximate:remainder!==0n,rounded,unit};
}
/** First-layer numbers: round half away from zero, mark only lost precision.
 * Two decimal places normally; three significant digits for >=1e15 or <0.01.
 * All arithmetic stays in BigInt, including exponent discovery and carry.
 */
export function readableFractionText(value:Fraction,places:1|2=2):string {
  const {n,d,sign}=parts(value);if(n===0n)return '0';
  if(n>=d*10n**15n||n*100n<d){
    let exponent=n.toString().length-d.toString().length;
    const below=exponent>=0?n<d*10n**BigInt(exponent):n*10n**BigInt(-exponent)<d;
    if(below)exponent--;
    const scaledN=exponent<0?n*10n**BigInt(-exponent):n,scaledD=exponent>0?d*10n**BigInt(exponent):d;
    const rounded=roundedDecimal(scaledN,scaledD,2);
    if(rounded.rounded>=10n*rounded.unit){rounded.text='1';exponent++;}
    return (rounded.approximate?'≈':'')+sign+rounded.text+'e'+exponent;
  }
  const rounded=roundedDecimal(n,d,places);
  return (rounded.approximate?'≈':'')+sign+rounded.text;
}
/** Saved score is a separate receipt: a rounded H×M is never an exact equation. */
export function readableScoreFormula(H:Fraction,M:Fraction,score:string):string {
  return readableFractionText(H)+' × '+readableFractionText(M)+' · 入账 '+heatText(score);
}
/** Optional animation input only. Large exact ratios land directly, without a lossy conversion. */
export function accumulatorRollValue(value:Fraction):number|undefined {
  const {n,d,sign}=parts(value),limit=BigInt(Number.MAX_SAFE_INTEGER);
  if(n>limit||d>limit)return;
  return (sign?-1:1)*Number(n)/Number(d);
}
