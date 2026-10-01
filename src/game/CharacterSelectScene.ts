import Phaser from 'phaser';
import {AudioEngine} from '../audio/AudioEngine';
import {CHARACTERS,getCharacter,type CharacterId} from './characters';
import {addAvatar,portraitURL} from './portraits';
import {startRun} from './runAdapter';
import {gameSession} from './session';
import {routeSavedRun} from './RunMenu';
import {SceneView} from './SceneView';
import {DetailDialog} from './DetailDialog';
import type {Box} from './layout';

interface SelectionOptions {freshSeed?:boolean;seed?:string;characterId?:CharacterId}
const ROLE_STAGE:Record<CharacterId,{ink:number;signature:string}>={
  amo:{ink:0x64708c,signature:'×3'},
  touye:{ink:0x9b693d,signature:'骰'},
  laohuan:{ink:0x3f7978,signature:'+120'},
  erxiang:{ink:0x9c5960,signature:'+1.5'},
  azao:{ink:0x58764c,signature:'+1'},
  xiemu:{ink:0xa74a3e,signature:'×2'},
};

/** The selector reserves its action row before sizing cards; it never borrows table space. */
function selectionLayout(width:number,height:number,top:number,bottom:number){
  const portrait=width<900&&height>width,short=height<500;
  const w=Math.min(1180,width-24),x=(width-w)/2,footerY=height-bottom-104;
  const summaryHeight=short?42:portrait?(width<360?124:100):106,summaryY=footerY-summaryHeight-12;
  const gridTop=top+(short?58:80),gap=portrait?10:14,cols=portrait?2:3,rows=6/cols;
  const cardWidth=(w-gap*(cols-1))/cols,cardHeight=(summaryY-12-gridTop-gap*(rows-1))/rows;
  const cards:Box[]=Array.from({length:6},(_,i)=>({x:x+(i%cols)*(cardWidth+gap),y:gridTop+Math.floor(i/cols)*(cardHeight+gap),width:cardWidth,height:cardHeight}));
  const cancelWidth=Math.floor(w*.22),detailWidth=Math.floor(w*.25),confirmWidth=w-cancelWidth-detailWidth-16;
  return {x,w,top,short,portrait,cards,summary:{x,y:summaryY,width:w,height:summaryHeight},cancel:{x,y:footerY,width:cancelWidth,height:48},details:{x:x+cancelWidth+8,y:footerY,width:detailWidth,height:48},confirm:{x:x+cancelWidth+detailWidth+16,y:footerY,width:confirmWidth,height:48},noticeY:footerY+56};
}

export class CharacterSelectScene extends Phaser.Scene {
  private choosing=false;
  private lifecycle=0;
  private selectedId?:CharacterId;
  private seed?:string;
  private notice='';
  private animateChoice=false;
  private view!:SceneView;
  private readonly dialog=new DetailDialog();
  private readonly audio=AudioEngine.shared;
  constructor(){super('character-select');}
  init(data?:SelectionOptions):void {
    this.selectedId=data?.characterId;
    this.seed=data?.seed??(data?.freshSeed?String(Date.now()):undefined);
  }
  create():void {
    this.choosing=false;this.notice='';this.animateChoice=false;this.lifecycle++;
    this.cameras.main.setBackgroundColor('#e4dac7');this.audio.setScene('menu');
    this.view=new SceneView(this,()=>this.render());
    this.events.once('shutdown',()=>{this.lifecycle++;this.dialog.close();});this.render();
  }
  private render():void {
    const v=this.view,l=v.layout,style=getComputedStyle(document.documentElement),bottom=parseFloat(style.getPropertyValue('--safe-bottom'))||0;
    const p=selectionLayout(l.width,l.height,l.hud.y,bottom);v.clear();v.paperBackground();
    v.text(p.x,p.top,'大丑牌',p.short?24:30,'#203744');
    v.text(p.x+(p.short?100:120),p.top+7,'选一位，演一局',14,'#48685f',Math.max(120,p.w-220));
    if(!p.short)v.text(p.x,p.top+43,'点选角色，再点「确认角色」',14,'#48685f',p.w-72);
    CHARACTERS.forEach((character,i)=>{
      const base=p.cards[i],selected=character.id===this.selectedId,b={...base,y:base.y-(selected?4:0)},first=v.root.length,tone=ROLE_STAGE[character.id];
      const frame=v.add(this.add.graphics());
      frame.fillStyle(0x192b30,.25).fillRoundedRect(b.x+2,b.y+5,b.width,b.height,8);
      frame.fillStyle(0xf4e5ca).fillRoundedRect(b.x,b.y,b.width,b.height,8);
      frame.lineStyle(selected?3:1,selected?0x367f75:0xa17b45).strokeRoundedRect(b.x,b.y,b.width,b.height,8);
      frame.lineStyle(1,0xfffae4,.85).strokeRoundedRect(b.x+4,b.y+4,b.width-8,b.height-8,5);
      const bg=v.rect(b,0xfff8e8).setFillStyle(0,0).setStrokeStyle(0);
      const compact=b.height<160,detailsHeight=p.portrait?76:70,headerHeight=compact?b.height:b.height-detailsHeight;
      v.material({x:b.x+5,y:b.y+5,width:b.width-10,height:headerHeight-5},tone.ink,0x233d43,5);
      const avatarSize=Math.min(compact?48:headerHeight-16,b.width*.46);
      const ax=b.x+10,ay=b.y+10;
      v.rect({x:ax-1,y:ay-1,width:avatarSize+2,height:avatarSize+2},0xe8cd8d).setStrokeStyle(1,0xd9bb7c);
      addAvatar(this,v.root,character,ax+avatarSize/2,ay+avatarSize/2,avatarSize);
      const tx=b.x+avatarSize+22,tw=b.width-avatarSize-34;
      this.singleLine(tx,b.y+14,character.name,compact?20:24,'#fff3d9',tw,18).setFontStyle('bold');
      if(!compact)this.singleLine(tx,b.y+46,character.title,14,'#dfc799',tw);
      if(compact)v.text(tx,b.y+42,character.passiveName,14,'#d9dbc0',tw);
      else {
        if(headerHeight>=100){
          this.singleLine(tx,b.y+73,tone.signature,p.portrait?26:38,'#ffe1a0',tw,22,true);
          if(!p.portrait&&headerHeight>170)v.text(tx,b.y+125,'“'+character.quote+'”',14,'#eee1c1',tw).setStyle({maxLines:2});
        }
        const abilityY=b.y+headerHeight+7;
        v.text(b.x+12,abilityY,character.passiveName,16,'#367f75',b.width-24);
        const lines=Math.max(1,Math.floor((b.y+b.height-6-(abilityY+24))/18));
        v.text(b.x+12,abilityY+24,character.passiveDescription,14,'#203744',b.width-24).setStyle({maxLines:lines});
      }
      if(selected){
        v.text(b.x+b.width-12,b.y+8,'✓',18,'#fff2c0').setOrigin(1,0);
        bg.setData('selected',true);
        if(this.animateChoice&&!gameSession().reducedMotion){
          const objects=v.root.list.slice(first).filter((o):o is Phaser.GameObjects.Rectangle|Phaser.GameObjects.Image|Phaser.GameObjects.Text=>o instanceof Phaser.GameObjects.Rectangle||o instanceof Phaser.GameObjects.Image||o instanceof Phaser.GameObjects.Text);
          objects.forEach(o=>{o.y+=4;});
          this.tweens.add({targets:objects,y:'-=4',duration:180,ease:'Cubic.easeOut'});
        }
      }
      v.target(bg,`character/${character.id}`,{tap:()=>this.select(character.id),detail:()=>this.inspect(character.id)});
    });
    this.animateChoice=false;
    const c=this.selectedId?getCharacter(this.selectedId):undefined,s=p.summary;
    v.rect(s,c?0xe3eddf:0xe9e1d1).setStrokeStyle(1,c?0x367f75:0xc0b49d);
    if(p.short)v.text(s.x+12,s.y+10,c?`${c.name} · ${c.passiveDescription}`:'点选一位角色；详情可查看完整能力。',14,'#203744',s.width-24);
    else {
      if(c){
        addAvatar(this,v.root,c,s.x+42,s.y+s.height/2,64);
        this.singleLine(s.x+86,s.y+12,`${c.name} · ${c.passiveName}`,20,'#203744',s.width-100,18);
        v.text(s.x+86,s.y+43,c.passiveDescription,14,'#203744',s.width-100).setLineSpacing(2);
        if(!p.portrait)v.text(s.x+86,s.y+74,'“'+c.quote+'”',14,'#48685f',s.width-100);
      }else {
        v.text(s.x+16,s.y+18,'这次，你用什么活儿撑场？',22,'#203744',s.width-32);
        v.text(s.x+16,s.y+56,'点选只改变选择。确认角色后，才会建立新局。',14,'#48685f',s.width-32);
      }
    }
    const existing=gameSession().run,canReturn=!!existing&&!['run-won','run-lost'].includes(existing.state.phase);
    v.button(p.cancel,this.selectedId?'取消选择':canReturn?'返回本局':'取消选择','action/cancel-character',()=>void this.cancelChoice(),!this.choosing&&(!!this.selectedId||canReturn));
    v.button(p.details,'角色详情','action/character-details',()=>{if(this.selectedId)this.inspect(this.selectedId);},!this.choosing&&!!this.selectedId);
    v.button(p.confirm,this.choosing?'正在开局…':'确认角色','action/confirm-character',()=>void this.confirmChoice(),!this.choosing&&!!this.selectedId,true);
    v.text(p.x,p.noticeY,this.notice||(this.selectedId?'已选 '+getCharacter(this.selectedId).name+'，确认后进入商店。':'先点选一位角色。完整能力随时可查。'),14,this.notice?'#aa3f35':'#48685f',p.w);
  }
  private singleLine(x:number,y:number,value:string,size:number,color:string,width:number,minSize=14,bold=false):Phaser.GameObjects.Text {
    const text=this.view.text(x,y,value,size,color);if(bold)text.setFontStyle('bold');
    for(let font=size;text.width>width&&font>minSize;)text.setFontSize(--font);
    return text;
  }
  private select(id:CharacterId):void {
    if(this.choosing)return;
    this.selectedId=id;this.notice='';this.animateChoice=true;this.audio.select();this.render();
  }
  private inspect(id:CharacterId):void {
    if(this.choosing)return;const c=getCharacter(id);
    this.dialog.open(c.name+' · '+c.title,c.passiveName+'\n'+c.passiveDescription+'\n\n“'+c.quote+'”'+(this.selectedId===id?'\n\n该角色已选中。关闭详情后，用底部「确认角色」进入商店。':''),this.selectedId===id?[]:[{label:'选中角色',run:()=>{this.select(id);this.dialog.close();}}],{portrait:{url:portraitURL(id),alt:c.name+'的巡演胸像'}});
  }
  private async cancelChoice():Promise<void> {
    if(this.choosing)return;
    if(this.selectedId){this.selectedId=undefined;this.notice='已取消选择，进度没有改变。';this.audio.cancel();this.render();return;}
    const existing=gameSession().run;if(!existing)return;
    if(existing.status!=='readonly'&&!await existing.flush()){this.notice='本局未保存，请从菜单重试保存或导出。';this.render();return;}
    this.audio.cancel();routeSavedRun(this.game);
  }
  private async confirmChoice():Promise<void> {
    if(this.choosing||!this.selectedId)return;
    const existing=gameSession().run;
    if(existing&&!['run-won','run-lost'].includes(existing.state.phase)){
      const d=this.dialog.open('开始新局？','确认将替换当前进行中的局。有效存档保留为备份；取消会保留当前进度。',[{label:'确认开始新局',primary:true,run:async()=>{if(await this.choose())this.dialog.close(d);}}],{closeLabel:'取消'});
      return;
    }
    await this.choose();
  }
  private async choose():Promise<boolean> {
    if(this.choosing||!this.selectedId)return false;
    this.choosing=true;this.notice='';const lifecycle=this.lifecycle,id=this.selectedId;this.render();
    const seed=this.seed??new URLSearchParams(location.search).get('seed')??String(Date.now());
    try {
      const controller=await startRun(this,seed,id);
      if(lifecycle!==this.lifecycle||!this.scene.isActive())return false;
      if(!controller||controller.status!=='idle'){this.notice=gameSession().notice||'新局尚未保存，请从菜单重试保存。';this.audio.invalid();return false;}
      this.audio.select();this.scene.start('shop');return true;
    }finally {if(lifecycle===this.lifecycle&&this.scene.isActive()){this.choosing=false;this.render();}}
  }
}
