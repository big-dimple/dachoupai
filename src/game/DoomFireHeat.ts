/**
 * Adapted MIT Doom fire core; Copyright (c) 2019 Filipe Deschamps.
 * Canvas example README author: @mccraveiro. Full notice: THIRD_PARTY_NOTICES.md.
 * Source commit 854c39ff00f6f4688a674a4086d3c9f7c02497e1,
 * playground/render-with-canvas/fire.js (propagation/per-pixel/source functions).
 * No rule RNG, global timers, DOM or renderer dependencies.
 */
const bounded=(value:number)=>Number.isFinite(value)?Math.max(0,Math.min(1,value)):0;
function grid(width:number,height:number,length:number):void {
  if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||width*height!==length)throw new RangeError('Invalid cosmetic heat grid');
}

/** Upstream source value36 becomes1; write exactly one bottom row. */
export function createDoomFireSource(target:Float32Array,width:number,height:number,fuel:Float32Array):void {
  grid(width,height,target.length);
  if(fuel.length!==width)throw new RangeError('Invalid cosmetic fuel row');
  const bottom=(height-1)*width;
  for(let x=0;x<width;x++)target[bottom+x]=bounded(fuel[x]);
}

/**
 * Below-pixel transfer with0/1/2 decay and left drift, from the upstream kernel.
 * Gather the source at x+decay instead of scattering to x-decay: every output
 * cell is written, no holes/races and clamping never crosses a row boundary.
 * cooling/height is the original decay/36 scaled to this CSS heat-grid height.
 * Optional ambient loss stops zero-decay channels pinning the top; driftScale
 * adapts the original coarse-pixel wind to our denser bounded heat texture.
 */
export function propagateDoomFire(current:Float32Array,next:Float32Array,width:number,height:number,
  noise:Float32Array,step:number,cooling:number,fuel:Float32Array,minimumCooling=0,driftScale=1):void {
  grid(width,height,current.length);
  if(current===next||next.length!==current.length||!noise.length||fuel.length!==width)throw new RangeError('Invalid cosmetic double buffer');
  const frame=step>>>0,loss=Number.isFinite(cooling)?Math.max(0,cooling)/height:0;
  const floor=Number.isFinite(minimumCooling)?Math.max(0,minimumCooling)/height:0,drift=bounded(driftScale);
  for(let y=0;y<height-1;y++)for(let x=0;x<width;x++){
    const sample=bounded(noise[((y+frame*3)*67+x+frame*5)%noise.length]);
    const decay=Math.min(2,Math.floor(sample*3)),sourceX=Math.min(width-1,x+Math.floor(decay*drift));
    next[y*width+x]=Math.max(0,bounded(current[(y+1)*width+sourceX])-decay*loss-floor);
  }
  createDoomFireSource(next,width,height,fuel);
}
