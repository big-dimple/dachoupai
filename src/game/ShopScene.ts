import Phaser from 'phaser';
import {getR2Joker,rerollPrice,salePrice,r2Pool} from '../domain/r2Shop';
import type {R2RunState,Action} from '../domain/run';
import {getR2Stage,R2_LIMITS} from '../domain/r2Run';
import {dispatchRun,runController} from './runAdapter';
import {heatText} from './scoreText';
import {SceneView} from './SceneView';
import {DetailDialog} from './DetailDialog';
import {gameSession} from './session';
import {fractionText} from './scoreText';

export class ShopScene extends Phaser.Scene {
  private run!:R2RunState;
  private busy=false;
  private lifecycle=0;
  private view!:SceneView;
  private readonly dialog=new DetailDialog();
  constructor(){super('shop');}
  private get ready():boolean {return !this.busy&&runController(this)?.status==='idle'&&gameSession().lease.writable;}
  create():void {
    this.busy=false;this.lifecycle++;this.events.once('shutdown',()=>{this.lifecycle++;this.dialog.close();});
    const run=runController(this)?.state;if(!run||run.phase!=='shop'){this.scene.start('character-select');return;}this.run=run;
    this.cameras.main.setBackgroundColor('#182b2a');this.view=new SceneView(this,()=>this.render());this.render();
  }
  private render():void {
    const v=this.view,l=v.layout;v.clear();const h=l.hud,stage=getR2Stage(this.run.stageIndex)!;
    v.text(h.x,h.y,'后台货摊',22);v.text(h.x,h.y+34,'金币 '+this.run.gold,22,'#f1c575');
    v.text(h.x,h.y+66,`下一场 ${stage.name}\n目标 ${heatText(stage.targetHeat)}`,14,'#dddacb',h.width-(l.mode==='portrait'?74:0));
    this.run.jokers.forEach((j,i)=>{
      const b=l.slots[i],d=getR2Joker(j.definitionId),r=v.rect(b,0xf3eadb);
      v.text(b.x+6,b.y+6,d.name,14,'#24313b',b.width-12);v.text(b.x+6,b.y+b.height-24,`售 ${salePrice(j.paidPrice)}`,14,'#24313b');
      v.target(r,`joker/${j.instanceId}`,{tap:()=>this.inspectJoker(j.instanceId),detail:()=>this.inspectJoker(j.instanceId),drag:(x)=>this.moveJoker(j.instanceId,x),holdToDrag:true});
    });
    for(let i=this.run.jokers.length;i<R2_LIMITS.jokerSlots;i++){const b=l.slots[i];v.rect(b);v.text(b.x+6,b.y+12,'空槽',14);}
    const offers=this.run.shop!.offers.filter(o=>!o.consumed);
    offers.forEach((o,i)=>{
      const b=l.shelf[i],d=getR2Joker(o.definitionId),r=v.rect(b,0xf3eadb);v.text(b.x+8,b.y+12,d.name,22,'#24313b',b.width-16);
      v.text(b.x+8,b.y+74,`${o.price} 金币\n查看详情`,14,'#24313b',b.width-16);
      if(b.width>160&&b.height>160)v.text(b.x+8,b.y+122,d.description,14,'#24313b',b.width-16);
      v.target(r,`offer/${o.offerId}`,{tap:()=>this.inspectOffer(o.offerId),detail:()=>this.inspectOffer(o.offerId)});
    });
    if(!offers.length)v.text(l.shelf[0].x,l.shelf[0].y,'货架已空，可换一批或进入牌桌。',14,undefined,l.preview.width);
    const cost=rerollPrice(this.run.shop!.rerollCount);
    v.button(l.buttons.discard,`换牌 ${cost} 金`, 'action/reroll',()=>void this.send({type:'RerollShop'}),this.ready&&this.run.gold>=cost&&r2Pool(this.run.jokers.map(j=>j.definitionId)).length>0);
    v.button(l.buttons.play,this.run.stageIndex===0?'开局':'下一场','action/start-stage',()=>void this.send({type:'LeaveShop'}),this.ready,true);
    v.button(l.buttons.forward,'构筑详情','action/build',()=>this.inspectBuild());
    v.text(l.status.x,l.status.y,this.busy?'正在保存…':'点卡面看详情，再确认买卖',14,undefined,l.status.width);
  }
  private inspectBuild():void {this.dialog.open('当前构筑',this.run.jokers.map(j=>getR2Joker(j.definitionId).name+'：'+getR2Joker(j.definitionId).description).join('\n')||'尚无大丑牌。');}
  private inspectOffer(id:string):void {
    const o=this.run.shop!.offers.find(o=>o.offerId===id);if(!o||o.consumed||this.busy)return;const d=getR2Joker(o.definitionId),after=this.run.gold-o.price;
    const reason=!this.ready?'当前只读或未保存，请查看菜单':this.run.jokers.length>=5?'槽位已满':this.run.jokers.some(j=>j.definitionId===o.definitionId)?'已装备同名牌':after<0?'金币不足':'';
    const dialog=this.dialog.open(d.name+' · 购买详情',d.description+`\n价格 ${o.price} 金币；现有 ${this.run.gold}，购买后 ${after}。\n利息档 ${Math.min(5,Math.floor(this.run.gold/5))} → ${Math.max(0,Math.min(5,Math.floor(after/5)))}。\n当前构筑：`+(this.run.jokers.map(j=>getR2Joker(j.definitionId).name).join('、')||'空')+(reason?'\n'+reason:''),[{label:'确认购买',disabled:!!reason,run:async()=>{if(await this.send({type:'BuyOffer',offerId:id}))this.dialog.close(dialog);}}]);
  }
  private inspectJoker(id:string):void {
    const j=this.run.jokers.find(j=>j.instanceId===id);if(!j||this.busy)return;const d=getR2Joker(j.definitionId),index=this.run.jokers.indexOf(j);
    const growth=Object.entries(j.growth).map(([k,v])=>k+' '+fractionText(v)).join('、')||'无';
    const dialog=this.dialog.open(d.name+' · 构筑详情',d.description+'\n当前成长：'+growth+`\n实际买价 ${j.paidPrice}；售价 ${salePrice(j.paidPrice)}。`,[
      {label:'左移',disabled:index===0,run:async()=>{await this.reorder(index,index-1);if(this.dialog.active(dialog))this.inspectJoker(id);}},
      {label:'右移',disabled:index===this.run.jokers.length-1,run:async()=>{await this.reorder(index,index+1);if(this.dialog.active(dialog))this.inspectJoker(id);}},
      {label:'出售',disabled:!this.ready,run:()=>{const confirmation=this.dialog.open('出售确认',`出售第 ${index+1} 槽的「${d.name}」获得 ${salePrice(j.paidPrice)} 金币。\n该牌成长将丢失，当前成长：${growth}。`,[{label:'确认出售',run:async()=>{if(await this.send({type:'SellJoker',instanceId:id}))this.dialog.close(confirmation);}}]);}},
    ]);
  }
  private async reorder(from:number,to:number):Promise<void> {const ids=this.run.jokers.map(j=>j.instanceId);const [id]=ids.splice(from,1);ids.splice(to,0,id);await this.send({type:'ReorderJokers',ids});}
  private moveJoker(id:string,x:number):void {const from=this.run.jokers.findIndex(j=>j.instanceId===id),slots=this.view.layout.slots,to=slots.findIndex(b=>x>=b.x&&x<=b.x+b.width);if(from>=0&&to>=0&&to<this.run.jokers.length&&from!==to)void this.reorder(from,to);}
  private async send(action:Action):Promise<boolean> {
    if(!this.ready)return false;this.busy=true;const lifecycle=this.lifecycle;this.render();
    try {const result=await dispatchRun(this,action);if(lifecycle!==this.lifecycle||!this.scene.isActive())return false;
      if(!result.ok){if(result.code==='save-failed')this.dialog.close();else this.dialog.open('操作未提交',result.code);return false;}
      this.run=result.state;if(action.type==='LeaveShop')this.scene.start('game');return true;
    }finally {if(lifecycle===this.lifecycle){this.busy=false;if(this.scene.isActive())this.render();}}
  }
}
