import Phaser from 'phaser';
import {getR2Stage} from '../domain/r2Run';
import {heatText} from './scoreText';
import {runController,dispatchRun} from './runAdapter';
import {SceneView} from './SceneView';
export interface IntermissionResult {cleared:boolean;stageIndex:number;stageHeat:string;handsLeft:number;goldEarned:number}
export class IntermissionScene extends Phaser.Scene {
  private result!:IntermissionResult;
  private view!:SceneView;
  private lifecycle=0;
  private busy=false;
  constructor(){super('intermission');}
  init(data:IntermissionResult):void {this.result=data;}
  create():void {
    this.lifecycle++;this.busy=false;this.events.once('shutdown',()=>{this.lifecycle++;});
    if(!runController(this)){this.scene.start('character-select');return;}
    this.cameras.main.setBackgroundColor('#182b2a');this.view=new SceneView(this,()=>this.render());this.render();
  }
  private render():void {
    const v=this.view,l=v.layout,run=runController(this)!.state,stage=getR2Stage(this.result.stageIndex)!,next=this.result.cleared&&run.phase==='stage-cleared'?getR2Stage(run.stageIndex):undefined;
    v.clear();const x=l.mode==='portrait'?12:l.preview.x,w=l.mode==='portrait'?l.width-24:l.preview.width;
    const title=this.result.cleared?(run.phase==='run-won'?'今日巡演落幕':stage.name+'，过！'):'冷场了';v.text(x,80,title,28,undefined,w);
    const gap=(BigInt(stage.targetHeat)>BigInt(this.result.stageHeat)?BigInt(stage.targetHeat)-BigInt(this.result.stageHeat):0n).toString();
    v.text(x,126,heatText(this.result.stageHeat)+' / '+heatText(stage.targetHeat),28,'#f1c575',w);
    v.text(x,172,this.result.cleared?`过关奖励 +${this.result.goldEarned} 金\n剩余出牌 ${this.result.handsLeft}；现有金币 ${run.gold}`:`差 ${heatText(gap)} 热度\n剩余出牌 ${this.result.handsLeft}；弃牌 ${run.stage?.discardsLeft??0}`,14,undefined,w);
    if(next)v.text(x,230,`下一场：${next.name}\n${next.intro}`,14,undefined,w);
    v.button(l.buttons.play,next?'去货摊':'重新开局','action/continue-stage',()=>void this.next(),!this.busy);
    v.text(x,l.status.y,'本场结果和奖励已经保存，可从菜单回看上一手。',14,undefined,w);
  }
  private async next():Promise<void> {
    if(this.busy)return;this.busy=true;const lifecycle=this.lifecycle,run=runController(this)!.state;this.render();
    if(this.result.cleared&&run.phase==='stage-cleared'){
      const result=await dispatchRun(this,{type:'OpenShop'});if(lifecycle!==this.lifecycle||!this.scene.isActive())return;
      if(result.ok){this.scene.start('shop');return;}
    }else {this.scene.start('character-select');return;}
    this.busy=false;this.render();
  }
}
