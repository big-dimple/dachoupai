import type Phaser from 'phaser';
export const FRAMEBUFFER_PIXELS=9_000_000;
const logicalSizes=new WeakMap<Phaser.Game,{width:number;height:number}>();

/** Keep layout / input in CSS pixels while the framebuffer uses device pixels. */
export function viewportMetrics() {
  const bounds=document.getElementById('app')!.getBoundingClientRect();
  const width=Math.max(1,Math.round(bounds.width)),height=Math.max(1,Math.round(bounds.height));
  // Preserve fractional browser zoom and native 3x phone pixels, within a bounded 9 MP framebuffer (including 1080p at DPR2).
  let density=Math.min(3,window.devicePixelRatio||1,Math.sqrt(FRAMEBUFFER_PIXELS/(width*height)));
  const fits=(d:number)=>Math.max(1,Math.ceil(width*d))*Math.max(1,Math.ceil(height*d))<=FRAMEBUFFER_PIXELS;
  // Ceil is part of the real allocation. Account for its extra row/column as well.
  if(!fits(density)){let low=0,high=density;for(let i=0;i<48;i++){const middle=(low+high)/2;if(fits(middle))low=middle;else high=middle;}density=low;}
  return {width,height,density};
}

export function installViewport(game:Phaser.Game):void {
  const host=document.getElementById('app')!;
  const syncInputBounds=()=>{
    game.scale.updateBounds();
    // updateBounds alone leaves Phaser's pointer conversion at the previous CSS size.
    const {baseSize,canvasBounds,displayScale}=game.scale;
    displayScale.set(baseSize.width/canvasBounds.width,baseSize.height/canvasBounds.height);
  };
  const resize=()=>{
    const {width,height,density}=viewportMetrics();
    logicalSizes.set(game,{width,height});
    const backingWidth=Math.ceil(width*density),backingHeight=Math.ceil(height*density);
    if(game.scale.width===backingWidth&&game.scale.height===backingHeight&&game.scale.zoom===1/density){game.canvas.style.width=width+'px';game.canvas.style.height=height+'px';syncInputBounds();return;}
    game.scale.zoom=1/density;
    game.scale.resize(backingWidth,backingHeight);
    // Phaser autoRound floors backing/zoom CSS dimensions at fractional DPR.
    game.canvas.style.width=width+'px';game.canvas.style.height=height+'px';syncInputBounds();
  };
  const observer=new ResizeObserver(resize);observer.observe(host);
  window.visualViewport?.addEventListener('resize',resize);
  window.addEventListener('resize',resize);
  let media:MediaQueryList;const watchDensity=()=>{media?.removeEventListener('change',changed);media=window.matchMedia(`(resolution: ${window.devicePixelRatio||1}dppx)`);media.addEventListener('change',changed);};
  const changed=()=>{resize();watchDensity();};watchDensity();
  game.events.once('destroy',()=>{observer.disconnect();window.visualViewport?.removeEventListener('resize',resize);window.removeEventListener('resize',resize);media.removeEventListener('change',changed);logicalSizes.delete(game);});
  resize();
}

export function cssViewport(scene:Phaser.Scene) {
  const logical=logicalSizes.get(scene.game);if(logical)return logical;
  return {width:Math.round(scene.scale.width*scene.scale.zoom),height:Math.round(scene.scale.height*scene.scale.zoom)};
}

export function alignViewportCamera(scene:Phaser.Scene):void {
  scene.cameras.main.setOrigin(0,0).setZoom(1/scene.scale.zoom).setScroll(0,0);
  // A bounded framebuffer can be smaller than CSS space; rounding must not change layout/input.
  const logical=logicalSizes.get(scene.game);if(logical&&scene.scale.zoom>1){scene.cameras.main.zoomX=scene.scale.width/logical.width;scene.cameras.main.zoomY=scene.scale.height/logical.height;}
  scene.cameras.main.roundPixels=true;
}
