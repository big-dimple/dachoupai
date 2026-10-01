import Phaser from 'phaser';
import type {CharacterDefinition,CharacterId} from './characters';
import {portraitSquareCrop} from './portraitCrop';
export const avatarKey=(id:CharacterId):string=>`avatar-${id}`;
export const avatarURL=(id:CharacterId):string=>`${import.meta.env.BASE_URL}assets/p00/characters/${id}.avatar.webp`;
/** Candidate detail busts are requested only when a player opens character details. */
export const portraitURL=(id:CharacterId):string=>`${import.meta.env.BASE_URL}assets/p00/characters/${id}.portrait.webp`;
export function queueAvatarLoads(scene:Phaser.Scene,characters:CharacterDefinition[]):void {
  for(const character of characters)if(!scene.textures.exists(avatarKey(character.id)))scene.load.image(avatarKey(character.id),avatarURL(character.id));
}
/** HUD and selector use independent square exports, never a stretched full portrait. */
export function addAvatar(scene:Phaser.Scene,container:Phaser.GameObjects.Container,character:CharacterDefinition,x:number,y:number,size=64):void {
  const key=avatarKey(character.id);
  if(scene.textures.exists(key)){
    const source=scene.textures.get(key).getSourceImage() as HTMLImageElement,crop=portraitSquareCrop(source.width,source.height,.5,.5);
    container.add(scene.add.image(x,y,key).setCrop(crop.x,crop.y,crop.width,crop.height).setScale(size/crop.width));
  }else{
    container.add(scene.add.rectangle(x,y,size,size,character.accent,.25));
    container.add(scene.add.text(x,y,character.name[0],{fontSize:'22px',color:'#fff',resolution:Math.min(devicePixelRatio||1,2)}).setOrigin(.5));
  }
}
