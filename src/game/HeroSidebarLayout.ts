import type {Box} from './layout';

/** Two readable status rows own the full sidebar width, below the avatar. */
export function heroSidebarRows(hud:Box){
 const row=(y:number,height:number):Box=>({x:hud.x+12,y:hud.y+y,width:hud.width-24,height});
 return {status:row(88,36),stage:row(128,18),heat:row(148,30),target:row(182,18),gold:row(204,36),progress:row(244,5)};
}

/** Compact existing display tokens; preserve the decision's layer, amount or target. */
export function shortHeroStatus(copy:string,skill:string):string {
 if(copy.includes('停用'))return '技能停用';
 if(copy.includes('已用'))return '本场已用';
 if(copy.includes('结束'))return '本场结束';
 const multiplier=copy.match(/×([\d.]+)/)?.[1],charge=copy.match(/蓄(\d)(?:层)?/)?.[1],paid=copy.match(/已选(?:付)?(\d+)金/)?.[1],points=copy.match(/已选(\d+)点/)?.[1],target=copy.match(/已押([^\s·，]+)/)?.[1];
 if(copy.includes('助攻')&&multiplier)return '助攻 ×'+multiplier;
 if(copy.includes('已选')&&multiplier)return '已选 ×'+multiplier;
 if(paid)return '已选'+paid+'金';
 if(points)return '已选'+points+'点';
 if(charge)return '蓄'+charge+'层'+(multiplier?' · ×'+multiplier:'');
 if(target)return '已押'+target;
 if(copy.includes('全留'))return '候选已全留';
 if(copy.includes('候选'))return '候选待留';
 if(copy.includes('条件未满足'))return '条件未满足';
 return copy.includes('已选')?'已选 · 点查看':skill;
}
