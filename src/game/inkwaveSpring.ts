/** Adapted from Inkwave ui-util.js L81–96, fixed 98ea296 (MIT, Jayden Davis).
 * Fixed-step samples give Phaser a deterministic settling ease without a new
 * update listener, timer, or callback surviving a destroyed/low-motion stage. */
export class InkSpring {
  x=1;v=0;target=0;
  constructor(private stiffness=260,private damping=20){}
  step(dt:number):number {
    if(!Number.isFinite(dt)||dt<=0)return this.x;
    const elapsed=Math.min(dt,.1),n=Math.max(1,Math.ceil(elapsed/(1/240))),h=elapsed/n;
    for(let i=0;i<n;i++){const a=this.stiffness*(this.target-this.x)-this.damping*this.v;this.v+=a*h;this.x+=this.v*h;}
    return this.x;
  }
}
export function inkSettlingEase(seconds=.30):(t:number)=>number {
  const spring=new InkSpring(),samples=[0],count=60;
  for(let i=1;i<=count;i++)samples.push(1-spring.step(seconds/count));
  const end=samples[count];
  return t=>{const position=Math.max(0,Math.min(1,t))*count,i=Math.floor(position);return i===count?1:(samples[i]+(samples[i+1]-samples[i])*(position-i))/end;};
}

/** A sampled damped impulse. Phaser's cancellable tween is its only running clock;
 * bounded physical substeps make the curve independent of render hitches. */
export function inkSpringImpulse(seconds=.7){
  const spring=new InkSpring(400,10),count=Math.ceil(seconds*240),samples=[1];
  for(let i=1;i<=count;i++)samples.push(spring.step(seconds/count));
  const firstMinimum=samples.findIndex((value,i)=>i>0&&i<count&&value<samples[i-1]&&value<=samples[i+1]);
  return {reboundAt:firstMinimum/count,value:(t:number)=>{
    const p=Math.max(0,Math.min(1,Number.isFinite(t)?t:1));if(p===1)return 0;
    const at=p*count,i=Math.floor(at);return samples[i]+(samples[i+1]-samples[i])*(at-i);
  }};
}
export const OWNED_SCORE_SPRING=inkSpringImpulse();
