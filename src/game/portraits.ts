import Phaser from 'phaser';
import {type CharacterDefinition,type CharacterId} from './characters';
import {characterArt} from './CharacterArt';
import {portraitSquareCrop} from './portraitCrop';
import {PAPER_THEME,PAPER_CSS,UI_FONT} from './theme';
export const avatarKey=(id:CharacterId):string=>characterArt(id,'avatar').key;
export const avatarURL=(id:CharacterId):string=>characterArt(id,'avatar').url;
export const selectionPortraitKey=(id:CharacterId):string=>characterArt(id,'selection').key;
export const selectionPortraitURL=(id:CharacterId):string=>characterArt(id,'selection').url;
/** Same portrait is warmed for the selected hero and requested by details/highlights. */
export const portraitKey=(id:CharacterId):string=>characterArt(id,'portrait').key;
export const portraitURL=(id:CharacterId):string=>characterArt(id,'portrait').url;
/** The HUD uses reviewed face crops, never a stretched full portrait. */
export function addAvatar(scene:Phaser.Scene,container:Phaser.GameObjects.Container,character:CharacterDefinition,x:number,y:number,size=64):void {
  const key=avatarKey(character.id);
  if(scene.textures.exists(key)){
    const source=scene.textures.get(key).getSourceImage() as HTMLImageElement,crop=portraitSquareCrop(source.width,source.height,.5,.5);
    container.add(scene.add.image(x,y,key).setCrop(crop.x,crop.y,crop.width,crop.height).setScale(size/crop.width));
  }else{
    container.add(scene.add.rectangle(x,y,size,size,PAPER_THEME.paper,1).setStrokeStyle(1,PAPER_THEME.jade));
    container.add(scene.add.text(x,y,character.name[0],{fontFamily:UI_FONT,fontSize:'22px',color:PAPER_CSS.ink,resolution:Math.min(devicePixelRatio||1,2)}).setOrigin(.5));
  }
}
