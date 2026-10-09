/** Adapted from Inkwave ui-util.js L81–96, fixed 98ea296 (MIT, Jayden Davis).
 * Fixed-step samples give Phaser a deterministic settling ease without a new
 * update listener, timer, or callback surviving a destroyed/low-motion stage. */
class Spring {
  x=1;v=0;target=0;
  step(dt:number):number {
    const n=Math.min(8,Math.max(1,Math.ceil(dt/(1/120)))),h=Math.min(dt,.1)/n;
    for(let i=0;i<n;i++){const a=260*(this.target-this.x)-20*this.v;this.v+=a*h;this.x+=this.v*h;}
    return this.x;
  }
}
export function inkSettlingEase(seconds=.30):(t:number)=>number {
  const spring=new Spring(),samples=[0],count=60;
  for(let i=1;i<=count;i++)samples.push(1-spring.step(seconds/count));
  const end=samples[count];
  return t=>{const position=Math.max(0,Math.min(1,t))*count,i=Math.floor(position);return i===count?1:(samples[i]+(samples[i+1]-samples[i])*(position-i))/end;};
}
