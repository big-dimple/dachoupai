import type {R2RunState} from '../domain/run';
import {isR2BoundedClear,isR2RouteGrowth} from '../domain/r2GroupUpgrade';
import {R2_ROUTE_FAMILIES,r2RouteSnapshot,r2RouteFactor} from '../domain/r2RouteGrowth';
import {exactFractionText} from './scoreText';

/** Existing public ledger only. No qualification forecast or Joker ownership. */
export function shopRouteGrowthFacts(state:R2RunState){
 if(!isR2RouteGrowth(state))return undefined;
 const before=r2RouteSnapshot(state.routeGrowth);
 const factors=Object.fromEntries(R2_ROUTE_FAMILIES.map(f=>[f,r2RouteFactor(f,before[f],isR2BoundedClear(state)).toJSON()]));
 if(isR2BoundedClear(state))return {before,factors,preserved:'本局过关加成保留，出售不丢。',detail:'过关加成：成功清场'+before.clears+'次；'+R2_ROUTE_FAMILIES.map(f=>({G:'成组',S:'顺子',F:'同花'}[f])+' '+before[f]+'次 / ×'+exactFractionText(factors[f])).join('；')+'。\n本手只取实际所属族最高因子一次，单族上限×4；高牌×1。每族前三次合格清场因子为1；清场后入账，下手生效。出售不清零，买卖不增加加成。'};
 return {before,factors,preserved:'本局路线资历保留，出售不丢。',
  detail:'本局路线资历：成功清场'+before.clears+'次；'+R2_ROUTE_FAMILIES.map(f=>f+' '+before[f]+'次 / ×'+exactFractionText(factors[f])).join('；')+'。\n资历不绑定起手或持牌实例，出售不清零；按实际主手族读取，可重叠的族分别读取。每族前三次合格清场因子为1，清场后才入账，下手读取；本次买卖不增加资历。'};
}
