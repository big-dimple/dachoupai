import type Phaser from 'phaser';
/** A picture-only completion owned by its existing layer; never redraws a scene or restarts input/tweens. */
export function whenTextureReady(scene:Phaser.Scene,owner:Phaser.GameObjects.GameObject,key:string,paint:()=>void):()=>void {
  let disposed=false;const event='addtexture-'+key;
  const dispose=()=>{if(disposed)return;disposed=true;scene.textures.off(event,ready);owner.off('destroy',dispose);scene.events.off('shutdown',dispose);};
  const ready=()=>{
    if(disposed)return;
    if(!owner.active||!scene.sys.settings.active){dispose();return;}
    if(!scene.textures.exists(key))return;
    dispose();paint();
  };
  scene.textures.on(event,ready);owner.once('destroy',dispose);scene.events.once('shutdown',dispose);ready();return dispose;
}
