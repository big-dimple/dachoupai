import Phaser from 'phaser';
import {AudioEngine} from '../audio/AudioEngine';
import {CHARACTERS,getCharacter,type CharacterId} from './characters';
import {addAvatar,avatarKey,portraitURL} from './portraits';
import {startRun} from './runAdapter';
import {gameSession} from './session';
import {routeSavedRun} from './RunMenu';
import {SceneView} from './SceneView';
import {DetailDialog} from './DetailDialog';
import type {Box} from './layout';

interface SelectionOptions {freshSeed?:boolean;seed?:string;characterId?:CharacterId}
const ROLE_STAGE:Record<CharacterId,number>={
  amo:0x64708c,
  touye:0x9b693d,
  laohuan:0x3f7978,
  erxiang:0x9c5960,
  azao:0x58764c,
  xiemu:0xa74a3e,
};

/** The selector reserves its action row before sizing cards; it never borrows table space. */
function selectionLayout(width:number,height:number,top:number,bottom:number){
  const portrait=width<640&&height>width,short=height<500;
  const w=Math.min(1180,width-24),x=(width-w)/2,footerY=height-bottom-104;
  const summaryHeight=short?42:portrait?100:90,summaryY=footerY-summaryHeight-12;
  const gridTop=top+(short?50:72),gap=portrait?10:14,cols=short&&width>=700||width>=1120?6:width>=640?3:2,rows=6/cols;
  const cardWidth=(w-gap*(cols-1))/cols,cardHeight=Math.min(390,(summaryY-14-gridTop-gap*(rows-1))/rows);
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
    this.cameras.main.setBackgroundColor('#153c40');this.audio.setScene('menu');
    this.view=new SceneView(this,()=>this.render());
    this.events.once('shutdown',()=>{this.lifecycle++;this.dialog.close();});this.render();
  }
  private render():void {
    const v=this.view,l=v.layout,style=getComputedStyle(document.documentElement),bottom=parseFloat(style.getPropertyValue('--safe-bottom'))||0;
    const p=selectionLayout(l.width,l.height,l.hud.y,bottom);v.clear();v.paperBackground();
    v.text(p.x,p.top,'巡演选角',p.short?24:30,'#fff2da').setFontFamily('Georgia, "Noto Serif SC", SimSun, serif').setFontStyle('bold');
    if(!p.short)v.text(p.x,p.top+42,'点选角色，再确认登台；完整能力见详情。',14,'#d5ddc9',p.w);
    CHARACTERS.forEach((character,i)=>{
      const base=p.cards[i],selected=character.id===this.selectedId,b={...base,y:base.y-(selected?4:0)},first=v.root.length,tone=ROLE_STAGE[character.id];
      const frame=v.add(this.add.graphics());
      frame.fillStyle(0x071c25,.5).fillRoundedRect(b.x+2,b.y+6,b.width,b.height,8);
      v.material(b,0xf9efdb,0xe8d8bb,8);
      const detailed=b.height>=235,bodyHeight=detailed?112:b.height>=145?60:42,picture={x:b.x+4,y:b.y+4,width:b.width-8,height:b.height-bodyHeight-4};
      v.material(picture,tone,0x203e46,5);
      this.drawPortrait(character.id,picture);
      if(picture.height>=100){
        const badge={x:b.x+10,y:b.y+10,width:Math.min(76,b.width-20),height:26};
        v.material(badge,0x3b3649,0x1b3039,4).setAlpha(.94);
        this.singleLine(badge.x+7,badge.y+4,character.title,14,'#fbe2ae',badge.width-14);
      }
      const textY=b.y+b.height-bodyHeight+6,name=this.singleLine(b.x+10,textY,character.name,detailed?23:20,'#203744',b.width-20,18,true);
      if(detailed){
        this.singleLine(b.x+10,name.y+name.height+4,character.passiveName,14,'#386d65',b.width-20);
        v.text(b.x+10,name.y+name.height+25,character.passiveDescription,14,'#203744',b.width-20).setLineSpacing(1).setStyle({maxLines:3});
      }else if(bodyHeight>=60)this.singleLine(b.x+10,name.y+name.height+3,character.passiveName,14,'#386d65',b.width-20);
      const edge=v.add(this.add.graphics());
      edge.lineStyle(selected?3:1,selected?0xf6d794:0xa88d60,.95).strokeRoundedRect(b.x+.5,b.y+.5,b.width-1,b.height-1,8);
      if(selected){
        v.material({x:b.x+b.width-54,y:b.y+10,width:44,height:26},0xf9dca3,0xc59658,4);
        v.text(b.x+b.width-32,b.y+14,'✓ 已选',14,'#3b382d').setOrigin(.5,0).setFontStyle('bold');
      }
      const wrap=this.wrapCard(first,b),bg=v.rect(base,0xfff8e8).setFillStyle(0,0).setStrokeStyle(0);
      if(selected){
        bg.setData('selected',true);
        if(this.animateChoice&&!this.reducedMotion()){const ty=wrap.art.y;wrap.art.y=ty+5;this.tweens.add({targets:wrap.art,y:ty,duration:180,ease:'Cubic.easeOut'});}
      }
      v.target(bg,`character/${character.id}`,{tap:()=>this.select(character.id),detail:()=>this.inspect(character.id),enter:wrap.enter,leave:wrap.leave});
    });
    this.animateChoice=false;
    const c=this.selectedId?getCharacter(this.selectedId):undefined,s=p.summary;
    v.material(s,c?0x284f50:0x343c4d,0x192e38,7);
    if(p.short)v.text(s.x+12,s.y+10,c?`${c.name} · ${c.passiveDescription}`:'点选一位角色；详情可查看完整能力。',14,'#fff1d8',s.width-24);
    else {
      if(c){
        addAvatar(this,v.root,c,s.x+42,s.y+s.height/2,64);
        this.singleLine(s.x+86,s.y+12,`${c.name} · ${c.passiveName}`,20,'#fff2da',s.width-100,18);
        v.text(s.x+86,s.y+43,c.passiveDescription,14,'#e7e8cf',s.width-100).setLineSpacing(2);
      }else {
        v.text(s.x+16,s.y+16,'这次，你用什么活儿撑场？',22,'#fff2da',s.width-32);
        v.text(s.x+16,s.y+51,'点选巡演卡。确认角色后建立新局。',14,'#d5ddc9',s.width-32);
      }
    }
    const existing=gameSession().run,canReturn=!!existing&&!['run-won','run-lost'].includes(existing.state.phase);
    v.button(p.cancel,this.selectedId?'取消选择':canReturn?'返回本局':'取消选择','action/cancel-character',()=>void this.cancelChoice(),!this.choosing&&(!!this.selectedId||canReturn));
    v.button(p.details,'角色详情','action/character-details',()=>{if(this.selectedId)this.inspect(this.selectedId);},!this.choosing&&!!this.selectedId);
    v.button(p.confirm,this.choosing?'正在开局…':'确认角色','action/confirm-character',()=>void this.confirmChoice(),!this.choosing&&!!this.selectedId,true);
    v.text(p.x,p.noticeY,this.notice||(this.selectedId?'已选 '+getCharacter(this.selectedId).name+'，确认后进入商店。':'先点选一位角色。完整能力随时可查。'),14,this.notice?'#ffd0b1':'#d5ddc9',p.w);
  }
  private reducedMotion():boolean {return gameSession().reducedMotion||window.matchMedia('(prefers-reduced-motion: reduce)').matches;}
  private drawPortrait(id:CharacterId,b:Box):void {
    const key=avatarKey(id);if(!this.textures.exists(key)){addAvatar(this,this.view.root,getCharacter(id),b.x+b.width/2,b.y+b.height/2,Math.min(b.width,b.height));return;}
    const image=this.add.image(0,0,key),sourceWidth=image.width,sourceHeight=image.height,scale=Math.max(b.width/sourceWidth,b.height/sourceHeight);
    const cw=b.width/scale,ch=b.height/scale,cx=(sourceWidth-cw)/2,cy=Phaser.Math.Clamp(sourceHeight*.4-ch/2,0,sourceHeight-ch);
    image.setCrop(cx,cy,cw,ch).setScale(scale).setPosition(b.x-cx*scale+sourceWidth*scale/2,b.y-cy*scale+sourceHeight*scale/2);this.view.add(image);
  }
  /** Card content drawn since `first` is wrapped into one hoverable, liftable container. */
  private wrapCard(first:number,b:Box):{art:Phaser.GameObjects.Container;enter:()=>void;leave:()=>void} {
    const v=this.view,cx=b.x+b.width/2,cy=b.y+b.height/2,art=this.add.container(cx,cy);
    for(const child of v.root.list.slice(first)){
      if(child instanceof Phaser.GameObjects.Image||child instanceof Phaser.GameObjects.Text||child instanceof Phaser.GameObjects.Graphics||child instanceof Phaser.GameObjects.Rectangle||child instanceof Phaser.GameObjects.Arc){
        child.setPosition(child.x-cx,child.y-cy);art.add(child);
      }
    }
    v.add(art);
    const glow=this.add.graphics().lineStyle(3,0xffe2a1,.92).strokeRoundedRect(-b.width/2-1,-b.height/2-1,b.width+2,b.height+2,8).setAlpha(0);art.add(glow);
    const reduced=()=>gameSession().reducedMotion||window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const leave=()=>{if(!art.active)return;this.tweens.killTweensOf(art);glow.setAlpha(0);if(reduced())art.setPosition(cx,cy).setScale(1);else this.tweens.add({targets:art,x:cx,y:cy,scaleX:1,scaleY:1,duration:120,ease:'Sine.easeOut'});};
    art.once('destroy',()=>this.tweens.killTweensOf(art));
    return {art,enter:()=>{if(!art.active||this.choosing)return;this.tweens.killTweensOf(art);glow.setAlpha(1);v.root.bringToTop(art);if(!reduced())this.tweens.add({targets:art,y:cy-5,scaleX:1.02,scaleY:1.02,duration:130,ease:'Sine.easeOut'});},leave};
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
    const body=[c.passiveName+'\n'+c.passiveDescription,'构筑思路\n'+c.buildTip,'“'+c.quote+'”'];
    if(this.selectedId===id)body.push('该角色已选中。关闭详情后，用底部「确认角色」进入商店。');
    this.dialog.open(c.name+' · '+c.title,body.join('\n\n'),this.selectedId===id?[]:[{label:'选中角色',run:()=>{this.select(id);this.dialog.close();}}],{portrait:{url:portraitURL(id),alt:c.name+'的巡演胸像'}});
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
