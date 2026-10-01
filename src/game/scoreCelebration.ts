/** Presentation only: awards describe the saved cumulative stage heat, never mutate it. */
export function scoreCelebration(beforeHeat:string,afterHeat:string,targetHeat:string):{cleared:boolean;tier:0|1|2|3;label:string;ratio:string;excess:string} {
  const before=BigInt(beforeHeat),after=BigInt(afterHeat),target=BigInt(targetHeat);
  if(target<=0n||before>=target||after<target)return {cleared:false,tier:0,label:'',ratio:'',excess:'0'};
  const tier=after>=target*5n?3:after>=target*3n?2:after>=target*2n?1:0;
  const tenths=after*10n/target;
  return {cleared:true,tier,label:['达成目标','双倍压场','三倍爆场','五倍炸场'][tier],ratio:`${tenths/10n}.${tenths%10n}`,excess:(after-target).toString()};
}
