import type Phaser from 'phaser';

/** Direct, unobscured cuts. No overlay canvas, wave, timing or domain callback. */
export class PaperFlow {
  constructor(_reduced:()=>boolean){}
  cancel():void {}
  run(_canvas:HTMLCanvasElement,_full=false):void {this.cancel();}
}
export function paperSceneStart(scene:Phaser.Scene,key:string,data?:object,_full=false):void {
  if(data===undefined)scene.scene.start(key);else scene.scene.start(key,data);
}
