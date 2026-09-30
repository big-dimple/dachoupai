import Phaser from 'phaser';
import {CHARACTERS,type CharacterId} from './characters';
import {addAvatar} from './portraits';
import {startRun} from './runAdapter';
import {gameSession} from './session';
import {SceneView} from './SceneView';
import {DetailDialog} from './DetailDialog';

export class CharacterSelectScene extends Phaser.Scene {
  private choosing=false;
  private lifecycle=0;
  private view!:SceneView;
  private readonly dialog=new DetailDialog();
  constructor(){super('character-select');}
  create():void {
    this.choosing=false;this.lifecycle++;this.cameras.main.setBackgroundColor('#182b2a');
    this.view=new SceneView(this,()=>this.render());
    this.events.once('shutdown',()=>{this.lifecycle++;this.dialog.close();});this.render();
  }
  private render():void {
    const v=this.view,l=v.layout;v.clear();
    v.text(12,12,'大丑牌 · 选择角色',22);v.text(12,42,'查看身份，确认后开局',14);
    CHARACTERS.forEach((character,i)=>{
      const b=l.characterCards[i],bg=v.rect(b),compact=l.mode==='landscape';
      addAvatar(this,v.root,character,b.x+40,b.y+40,64);
      const tx=compact?b.x+84:b.x+10,ty=compact?b.y+10:b.y+78;
      v.text(tx,ty,character.name,22);v.text(tx,ty+30,character.passiveName,14,'#f1c575',b.width-(compact?94:20));
      const lines=Math.floor((b.height-142)/20);
      if(!compact&&lines>0)v.text(b.x+10,ty+54,character.passiveDescription,14,'#dddacb',b.width-20).setStyle({maxLines:lines});
      v.target(bg,`character/${character.id}`,{tap:()=>this.inspect(character.id),detail:()=>this.inspect(character.id)});
    });
  }
  private inspect(id:CharacterId):void {
    if(this.choosing)return;const c=CHARACTERS.find(c=>c.id===id)!;
    this.dialog.open(c.name+' · '+c.title,c.passiveDescription,[{label:'选择并开局',run:()=>this.choose(id)}]);
  }
  private async choose(id:CharacterId):Promise<void> {
    if(this.choosing)return;this.choosing=true;const lifecycle=this.lifecycle,existing=gameSession().run;
    if(existing&&!['run-won','run-lost'].includes(existing.state.phase)&&!window.confirm('开始新局将替换当前进度。有效存档保留为备份，是否继续？')){this.choosing=false;return;}
    const seed=new URLSearchParams(location.search).get('seed')??String(Date.now());
    const controller=await startRun(this,seed,id);
    if(lifecycle!==this.lifecycle||!this.scene.isActive())return;
    if(!controller||controller.status!=='idle'){this.choosing=false;return;}
    this.scene.start('shop');
  }
}
