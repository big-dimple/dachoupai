/** Cosmetic only: true counts stay separate and only a decoded-ready gate permits 100%. */
export class LoadingProgress {
 private value=0;
 private last:number;
 constructor(private readonly started:number){this.last=started;}
 sample(now:number,decoded:number,total:number,ready:boolean,reduced:boolean):number {
  const actual=total?Math.min(1,decoded/total):0;
  const estimated=.06+.84*(1-Math.exp(-Math.max(0,now-this.started)/16000));
  const target=ready?1:Math.min(.96,Math.max(actual*.96,reduced?0:estimated));
  const delta=Math.max(0,Math.min(100,now-this.last));this.last=now;
  this.value=Math.max(this.value,reduced?target:this.value+(target-this.value)*(1-Math.exp(-delta/(ready?80:240))));
  return this.value;
 }
 complete():number {return this.value=1;}
}
