import type Phaser from 'phaser';
import type {HeroClimaxValue,HeroClimaxView} from './HeroClimax';
import type {JokerKeyHighlight} from './JokerKeyHighlight';
import type {Box} from './layout';
import {heroClimaxLayout,reserveHeroClimaxHeader} from './HeroClimaxLayout';
import {heroFocusComposition,heroFocusCrop,heroFocusPose} from './HeroClimaxFocus';
import {mountHeroClimaxCaption} from './HeroClimaxCaption';
import {portraitFocusKey,portraitKey,selectionPortraitKey,avatarKey} from './portraits';
import {climaxSourceKey} from './ClimaxSourceArt';
import {jokerArtKey} from './jokerArt';
import {getCharacter} from './characters';
import {textDensity,crispText} from './TextRaster';
import {fitScoreLine} from './ScoreTextLayout';
import {heatText} from './scoreText';
import {SCORE_FONT,UI_FONT,PAPER_THEME as T,PAPER_CSS as C} from './theme';

/** Fixed eye strip, source and numeric lanes. Only peripheral ink releases once. */
export function mountHeroClimax(scene:Phaser.Scene,root:Phaser.GameObjects.Container,viewport:Box,key:JokerKeyHighlight,value:HeroClimaxValue,reduced:boolean):HeroClimaxView|undefined {
 const id=key.heroId;if(!id)return;
 const focusKey=portraitFocusKey(id),hasFocus=scene.textures.exists(focusKey),heroKey=[portraitKey(id),selectionPortraitKey(id),avatarKey(id)].find(k=>scene.textures.exists(k));if(!heroKey)return;
 const character=getCharacter(id),actualSource=!!key.fact.definitionId,density=textDensity(scene);
 let l=heroClimaxLayout(viewport.width,viewport.height,actualSource);const p=l.panel;
 const group=scene.add.container(0,0).setName('joker/key-focus').setData('eventId',key.eventId).setData('benefit',key.fact).setData('heroClimax',true).setData('starter',key.kind==='starter').setData('phase',reduced?'still':'charge').setData('bounds',viewport).setData('panel',p).setData('headlineWidth',l.nameW);root.add(group);
 const backdrop=scene.add.graphics().setName('hero/climax-backdrop');backdrop.fillStyle(0x17252a,1).fillPoints([{x:0,y:0},{x:viewport.width,y:0},{x:viewport.width,y:viewport.height},{x:0,y:viewport.height}],true);group.add(backdrop);
 group.setData('opaqueBackdrop',viewport);
 const board=scene.add.container(0,0).setName('hero/climax-board');group.add(board);
 const paper=scene.add.graphics();board.add(paper);
 const title=actualSource?key.fact.title:value.skillName??character.name;
 l=reserveHeroClimaxHeader(l,mountHeroClimaxCaption(scene,board,l,{title,owner:character.name+' · '+character.title,effect:value.note}));
 const composition=heroFocusComposition(l,actualSource),focusLayer=scene.add.container(0,0).setName('hero/focus-anchor');board.add(focusLayer);
 const images:Phaser.GameObjects.Image[]=[];
 const addCrop=(parent:Phaser.GameObjects.Container,texture:string,box:Box,crop:Box,name:string)=>{
  const source=scene.textures.get(texture).getSourceImage() as HTMLImageElement,scale=Math.min(box.width/crop.width,box.height/crop.height,1/density);
  const b={x:box.x+(box.width-crop.width*scale)/2,y:box.y,width:crop.width*scale,height:crop.height*scale};
  const image=scene.add.image(b.x+(source.width/2-crop.x)*scale,b.y+(source.height/2-crop.y)*scale,texture).setOrigin(.5).setCrop(crop.x,crop.y,crop.width,crop.height).setScale(scale).setName(name).setData('visibleBounds',b).setData('sampledCrop',crop);parent.add(image);images.push(image);return image;
 };
 const texture=hasFocus?focusKey:heroKey,source=scene.textures.get(texture).getSourceImage() as HTMLImageElement;
 const focus=addCrop(focusLayer,texture,composition.eyes,hasFocus?heroFocusCrop(id,source.width,source.height):{x:0,y:0,width:source.width,height:source.height},hasFocus?'hero/climax-eyes':'hero/climax-portrait').setData('camera',hasFocus?'stable-eye-strip':'still-portrait-fallback').setData('assetId',id+'.focus');
 const ink=scene.add.graphics().setName('hero/focus-ink'),b=focus.getData('visibleBounds') as Box;focusLayer.add(ink);
 // Broken pencil-like edge strokes remain outside the photo and all text lanes.
 const strokes=[[[b.x-10,b.y+8],[b.x-6,b.y+1],[b.x+12,b.y-3]],[[b.x-8,b.y+b.height-8],[b.x-4,b.y+b.height+3],[b.x+16,b.y+b.height+5]],[[b.x+b.width-14,b.y-4],[b.x+b.width+6,b.y-1],[b.x+b.width+10,b.y+9]],[[b.x+b.width-12,b.y+b.height+4],[b.x+b.width+5,b.y+b.height+1],[b.x+b.width+9,b.y+b.height-8]]];
 for(const [i,path] of strokes.entries()){ink.lineStyle(i%2?1.2:2,T.ink,.9);for(let n=1;n<path.length;n++)ink.lineBetween(path[n-1][0],path[n-1][1],path[n][0],path[n][1]);}
 ink.setData('strokes',strokes).setData('protectedPhoto',b);
 const sourceArt=[climaxSourceKey(key.fact.definitionId),jokerArtKey(key.fact.definitionId)].find(k=>k&&scene.textures.exists(k));
 if(actualSource&&sourceArt&&composition.source){
  const card=scene.add.container(0,0).setName('hero/climax-source-card').setData('detail',scene.textures.exists(climaxSourceKey(key.fact.definitionId)));focusLayer.add(card);
  const s=scene.textures.get(sourceArt).getSourceImage() as HTMLImageElement;
  addCrop(card,sourceArt,composition.source,{x:0,y:0,width:s.width,height:s.height},'hero/climax-source').setData('definitionId',key.fact.definitionId);
 }
 if(!l.short){const photoBottom=Math.max(...images.map(image=>{const b=image.getData('visibleBounds') as Box;return b.y+b.height;}));composition.labelY=photoBottom+10;composition.local.y=composition.total.y=composition.labelY+22;composition.local.height=composition.total.height=l.portrait?72:86;}
 const text=(parent:Phaser.GameObjects.Container,x:number,y:number,s:string,size:number,color:string,width:number,name:string)=>{const t=scene.add.text(x,y,s,{fontFamily:UI_FONT,fontSize:size+'px',fontStyle:'bold',color,resolution:density,wordWrap:{width,useAdvancedWrap:true}}).setPosition(x,y).setName(name);parent.add(t);crispText(t);return t;};
 const format=(s:string)=>/^\d{16,}$/.test(s)?'≈'+heatText(s):s;
 const number=(parent:Phaser.GameObjects.Container,box:Box,s:string,size:number,name:string)=>{const t=scene.add.text(box.x+box.width/2,box.y,format(s),{fontFamily:SCORE_FONT,fontSize:size+'px',fontStyle:'800',color:C.red,resolution:density}).setName(name).setData('exactValue',s);parent.add(t);fitScoreLine(t,box,size,true);return t;};
 const eyesLayer=scene.add.container(0,0).setName('hero/shot-eyes'),skillLayer=scene.add.container(0,0).setName('hero/shot-skill'),landingLayer=scene.add.container(0,0).setName('hero/shot-landing');board.add([eyesLayer,skillLayer,landingLayer]);
 const numbers=(layer:Phaser.GameObjects.Container)=>{
  if(value.landingValue){
   text(layer,composition.local.x,composition.labelY,value.label,14,C.jade,composition.local.width,'hero/climax-local-label');
   number(layer,composition.local,value.after,36,'hero/climax-local-effect');
   text(layer,composition.total.x,composition.labelY,value.landingLabel??value.label,14,C.jade,composition.total.width,'hero/climax-value-label');
   number(layer,composition.total,value.landingValue,l.short?58:l.portrait?64:84,'hero/climax-value');
  }else{
   text(layer,composition.row.x,composition.labelY,value.label,16,C.jade,composition.row.width,'hero/climax-value-label');
   number(layer,{x:composition.row.x,y:composition.local.y,width:composition.row.width,height:composition.local.height},value.after,l.short?58:72,'hero/climax-value');
  }
 };
 // Saved results stay visible during charge as well: no empty numeric placeholder.
 const readouts=scene.add.container(0,0).setName('hero/climax-readouts');board.add(readouts);numbers(readouts);
 const contentBottom=Math.max(...images.map(image=>{const b=image.getData('visibleBounds') as Box;return b.y+b.height;}),...readouts.list.map(o=>{const t=o as Phaser.GameObjects.Text;return t.y+t.displayHeight;}));
 const note=board.list.find(o=>o.name==='hero/climax-note') as Phaser.GameObjects.Text;note.setY(Math.ceil(contentBottom)+8);crispText(note);
 const summary=text(board,l.sourceCaption.x,note.y+note.height+5,value.accumulated??key.landing,14,C.jade,l.sourceCaption.width,'hero/climax-landing');
 const bottom=summary.y+summary.height+14,height=bottom-p.y,offset=Math.round(Math.max(12,(viewport.height-height)/2)-p.y);
 board.setY(offset);group.setData('panel',{...p,y:p.y+offset,height}).setData('contentHeight',height);
 for(const image of images){const b=image.getData('visibleBounds') as Box;image.setData('visibleBounds',{...b,y:b.y+offset});}
 paper.fillStyle(T.ink,.10).fillPoints([{x:p.x+3,y:p.y+8},{x:p.x+p.width,y:p.y+3},{x:p.x+p.width,y:bottom+3},{x:p.x+3,y:bottom+8}],true);
 paper.fillStyle(T.paperLight,1).fillPoints([{x:p.x,y:p.y+4},{x:p.x+p.width,y:p.y},{x:p.x+p.width,y:bottom-4},{x:p.x,y:bottom}],true);
 paper.lineStyle(2,T.ink,.85).lineBetween(p.x,p.y+4,p.x+p.width,p.y);
 paper.lineStyle(2,T.red,.7).lineBetween(p.x,bottom,p.x+p.width,bottom-4);
 let disposed=false,still=reduced,struck=false,strikeAt=0,shot='',releaseDone:(()=>void)|undefined;const started=performance.now(),owned=new Set<Phaser.Tweens.Tween>();
 const show=(next:string)=>{if(next===shot)return;shot=next;eyesLayer.setVisible(next==='eyes');skillLayer.setVisible(next==='skill');landingLayer.setVisible(next==='landing');group.setData('shot',next).setData('shotAt',performance.now());};
 const update=()=>{if(disposed||group.getData('phase')==='release')return;const now=performance.now();show(still?'landing':(!struck||now-started<180)?(hasFocus?'eyes':'skill'):now-strikeAt<600?'skill':'landing');ink.setAlpha(heroFocusPose(now-started,struck?now-strikeAt:undefined,still).alpha);};
 const settle=()=>{board.setPosition(0,offset).setAlpha(1);backdrop.setAlpha(1);ink.setAlpha(.24);show('landing');};
 const dispose=(destroy=true)=>{if(disposed)return;disposed=true;scene.events?.off('update',update);for(const t of owned)t.remove();owned.clear();releaseDone?.();releaseDone=undefined;if(destroy&&group.active)group.destroy();};
 group.once('destroy',()=>dispose(false));scene.events?.on('update',update);update();
 return {group,dispose,reduce:()=>{still=true;for(const t of owned)t.remove();owned.clear();settle();releaseDone?.();releaseDone=undefined;},
  strike:()=>{if(disposed||struck)return;struck=true;strikeAt=performance.now();group.setData('phase','strike').setData('strikeAt',strikeAt);update();},
  release:()=>new Promise<void>(resolve=>{if(disposed||still){resolve();return;}group.setData('phase','release').setData('releaseAt',performance.now());releaseDone=resolve;const t=scene.tweens.add({targets:[board,backdrop],alpha:0,duration:150,ease:'Cubic.easeIn',onComplete:()=>{releaseDone=undefined;resolve();}});owned.add(t);}),
 };
}
