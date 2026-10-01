import type Phaser from 'phaser';

/** Keep layout / input in CSS pixels while the framebuffer uses device pixels. */
export function viewportMetrics() {
  const bounds=document.getElementById('app')!.getBoundingClientRect();
  const width=Math.max(1,Math.round(bounds.width)),height=Math.max(1,Math.round(bounds.height));
  const density=Math.min(3,Math.ceil(window.devicePixelRatio||1),Math.max(1,Math.floor(Math.sqrt(4_500_000/(width*height)))));
  return {width,height,density};
}

export function installViewport(game:Phaser.Game):void {
  const host=document.getElementById('app')!;
  const resize=()=>{
    const {width,height,density}=viewportMetrics();
    if(game.scale.width===width*density&&game.scale.height===height*density&&game.scale.zoom===1/density)return;
    game.scale.zoom=1/density;
    game.scale.resize(width*density,height*density);
  };
  const observer=new ResizeObserver(resize);observer.observe(host);
  window.visualViewport?.addEventListener('resize',resize);
  game.events.once('destroy',()=>{observer.disconnect();window.visualViewport?.removeEventListener('resize',resize);});
  resize();
}

export function cssViewport(scene:Phaser.Scene) {
  return {width:Math.round(scene.scale.width*scene.scale.zoom),height:Math.round(scene.scale.height*scene.scale.zoom)};
}

export function alignViewportCamera(scene:Phaser.Scene):void {
  scene.cameras.main.setOrigin(0,0).setZoom(1/scene.scale.zoom).setScroll(0,0);
  scene.cameras.main.roundPixels=true;
}
