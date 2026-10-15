import {prepareDestination} from './LoadingScreen';
import type Phaser from 'phaser';

/** Cuts share the decoded resource gate without adding animation or domain callbacks. */
export class PaperFlow {
  constructor(_reduced:()=>boolean){}
  cancel():void {}
  run(_canvas:HTMLCanvasElement,_full=false):void {this.cancel();}
}
const cuts=new WeakMap<Phaser.Scene,object>();
export function paperSceneStart(scene:Phaser.Scene,key:string,data?:object,_full=false):void {
  const cut={};cuts.set(scene,cut);
  void prepareDestination(scene.game,key).then(prepared=>{if(!prepared||cuts.get(scene)!==cut||!scene.scene.isActive())return;cuts.delete(scene);if(data===undefined)scene.scene.start(key);else scene.scene.start(key,data);});
}
