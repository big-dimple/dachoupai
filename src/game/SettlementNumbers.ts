/** Settlement-only first-layer receipts. Never use these rounded strings for rules or saving. */
export function settlementHeatText(value:string):string {
 const signed=BigInt(value),negative=signed<0n,n=negative?-signed:signed,sign=negative?'-':'';
 if(n<10000n)return sign+n.toString().replace(/\B(?=(\d{3})+(?!\d))/g,',');
 let divisor:bigint,suffix:string;
 if(n>=10n**15n){const exponent=n.toString().length-1;divisor=10n**BigInt(exponent);suffix='e'+exponent;}
 else if(n>=100000000n){divisor=100000000n;suffix='亿';}
 else {divisor=10000n;suffix='万';}
 const scaled=n*100n,rounded=(scaled+divisor/2n)/divisor,approximate=scaled%divisor!==0n;
 let whole=rounded/100n,tail=(rounded%100n).toString().padStart(2,'0').replace(/0+$/,'');
 if(suffix.startsWith('e')&&whole===10n){whole=1n;tail='';suffix='e'+n.toString().length;}
 return (approximate?'约':'')+sign+whole+(tail?'.'+tail:'')+suffix;
}

/** Full integers in the existing details; no scientific notation or precision loss. */
export const exactSettlementHeatText=(value:string):string=>BigInt(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g,',');
