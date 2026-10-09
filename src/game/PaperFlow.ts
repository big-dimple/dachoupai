import type Phaser from 'phaser';
import {gameSession} from './session';

/** Visual-only InkWipe adaptation. MIT (c) 2026 Jayden Davis, see third-party/inkwave.
 * Unlike upstream onMid, this controller never owns a route or a domain callback. */
export class PaperFlow {
  private frame?:number;
  private safety?:ReturnType<typeof setTimeout>;
  private token=0;
  private remove?:()=>void;
  constructor(private readonly reduced:()=>boolean){}
  cancel():void {
    this.token++;
    if(this.frame!==undefined)cancelAnimationFrame(this.frame);
    clearTimeout(this.safety);this.frame=undefined;this.safety=undefined;
    const remove=this.remove;this.remove=undefined;remove?.();
  }
  run(canvas:HTMLCanvasElement):void {
    this.cancel();if(this.reduced()||document.hidden)return;
    const bounds=canvas.getBoundingClientRect();if(!bounds.width||!bounds.height)return;
    const sheet=document.createElement('canvas'),ctx=sheet.getContext('2d');if(!ctx)return;
    sheet.className='paper-flow';sheet.setAttribute('aria-hidden','true');
    const ratio=Math.min(window.devicePixelRatio||1,1.5),w=bounds.width,h=bounds.height;
    sheet.width=Math.ceil(w*ratio);sheet.height=Math.ceil(h*ratio);
    Object.assign(sheet.style,{position:'fixed',left:bounds.left+'px',top:bounds.top+'px',width:w+'px',height:h+'px',pointerEvents:'none',zIndex:'19'});
    ctx.scale(ratio,ratio);document.body.append(sheet);
    const token=this.token,start=performance.now(),stop=()=>this.cancel();
    window.addEventListener('blur',stop);window.addEventListener('resize',stop);
    document.addEventListener('visibilitychange',stop);
    this.remove=()=>{sheet.remove();window.removeEventListener('blur',stop);window.removeEventListener('resize',stop);document.removeEventListener('visibilitychange',stop);};
    const frame=(now:number)=>{
      if(token!==this.token)return;
      const t=now-start;if(t>=240||this.reduced()){this.cancel();return;}
      ctx.clearRect(0,0,w,h);
      // Adapt upstream _edge's three waves to a narrow, translucent ink-on-paper strip.
      // No opaque screen cover, splat particles, title mark, or domain RNG.
      const y=-h*.13+(h*1.26)*t/240,band=Math.min(68,h*.085),alpha=Math.sin(Math.PI*t/240);
      const edge=(x:number)=>y+h*(.021*Math.sin(x/w*6.3+t*.0058)+.013*Math.sin(x/w*14.1-t*.0087)+.006*Math.sin(x/w*29.7+t*.0125));
      ctx.beginPath();for(let i=0;i<=32;i++){const x=w*i/32;i?ctx.lineTo(x,edge(x)):ctx.moveTo(x,edge(x));}
      for(let i=32;i>=0;i--){const x=w*i/32;ctx.lineTo(x,edge(x)+band);}ctx.closePath();
      ctx.fillStyle=`rgba(243,234,219,${alpha*.38})`;ctx.fill();
      ctx.beginPath();for(let i=0;i<=32;i++){const x=w*i/32;i?ctx.lineTo(x,edge(x)):ctx.moveTo(x,edge(x));}
      ctx.strokeStyle=`rgba(44,85,77,${alpha*.25})`;ctx.lineWidth=2;ctx.stroke();
      this.frame=requestAnimationFrame(frame);
    };
    // Upstream safety guard, shortened to this 240ms candidate's bounded lifetime.
    this.safety=setTimeout(()=>{if(token===this.token)this.cancel();},600);
    this.frame=requestAnimationFrame(frame);
  }
}
const flows=new WeakMap<Phaser.Game,PaperFlow>();
export function paperSceneStart(scene:Phaser.Scene,key:string,data?:object):void {
  // Phaser retains its normal immediate queued route. No mid-animation submission.
  if(data===undefined)scene.scene.start(key);else scene.scene.start(key,data);
  const canvas=scene.game?.canvas;if(!canvas||typeof document==='undefined')return;
  let flow=flows.get(scene.game);
  if(!flow){flow=new PaperFlow(()=>gameSession().reducedMotion||window.matchMedia('(prefers-reduced-motion: reduce)').matches);flows.set(scene.game,flow);scene.game.events.once('destroy',()=>flow?.cancel());}
  flow.run(canvas);
}
