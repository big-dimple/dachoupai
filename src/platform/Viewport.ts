import type Phaser from 'phaser';

/** Keep layout / input in CSS pixels while the framebuffer uses device pixels. */
export function viewportMetrics() {
  const bounds=document.getElementById('app')!.getBoundingClientRect();
  const width=Math.max(1,Math.round(bounds.width)),height=Math.max(1,Math.round(bounds.height));
  // Preserve fractional browser zoom and native 3x phone pixels, within a bounded 9 MP framebuffer (including 1080p at DPR2).
  const density=Math.min(3,window.devicePixelRatio||1,Math.max(1,Math.sqrt(9_000_000/(width*height))));
  return {width,height,density};
}

export function installViewport(game:Phaser.Game):void {
  const host=document.getElementById('app')!;
  const resize=()=>{
    const {width,height,density}=viewportMetrics();
    const backingWidth=Math.ceil(width*density),backingHeight=Math.ceil(height*density);
    if(game.scale.width===backingWidth&&game.scale.height===backingHeight&&game.scale.zoom===1/density)return;
    game.scale.zoom=1/density;
    game.scale.resize(backingWidth,backingHeight);
    // Phaser autoRound floors backing/zoom CSS dimensions at fractional DPR.
    game.canvas.style.width=width+'px';game.canvas.style.height=height+'px';game.scale.updateBounds();
  };
  const observer=new ResizeObserver(resize);observer.observe(host);
  window.visualViewport?.addEventListener('resize',resize);
  window.addEventListener('resize',resize);
  let media:MediaQueryList;const watchDensity=()=>{media?.removeEventListener('change',changed);media=window.matchMedia(`(resolution: ${window.devicePixelRatio||1}dppx)`);media.addEventListener('change',changed);};
  const changed=()=>{resize();watchDensity();};watchDensity();
  game.events.once('destroy',()=>{observer.disconnect();window.visualViewport?.removeEventListener('resize',resize);window.removeEventListener('resize',resize);media.removeEventListener('change',changed);});
  resize();
}

export function cssViewport(scene:Phaser.Scene) {
  return {width:Math.round(scene.scale.width*scene.scale.zoom),height:Math.round(scene.scale.height*scene.scale.zoom)};
}

export function alignViewportCamera(scene:Phaser.Scene):void {
  scene.cameras.main.setOrigin(0,0).setZoom(1/scene.scale.zoom).setScroll(0,0);
  scene.cameras.main.roundPixels=true;
}
