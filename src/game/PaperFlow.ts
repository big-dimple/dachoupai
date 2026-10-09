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
  run(canvas:HTMLCanvasElement,full=false):void {
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
    if(full){document.addEventListener('pointerdown',stop,true);document.addEventListener('keydown',stop,true);}
    this.remove=()=>{sheet.remove();window.removeEventListener('blur',stop);window.removeEventListener('resize',stop);document.removeEventListener('visibilitychange',stop);document.removeEventListener('pointerdown',stop,true);document.removeEventListener('keydown',stop,true);};
    const duration=full?1000:240;sheet.dataset.mode=full?'full':'light';
    const drawFull=(t:number)=>{
      // Inkwave679d2db WIPE380/500/1000 + three-wave sheets, adapted to existing paper palette.
      const cubic=(p:number)=>p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2;
      const edge=(x:number,y:number,phase=0)=>y+h*(.018*Math.sin(x/w*6.3+t*.004+phase)+.010*Math.sin(x/w*14.1-t*.007)+.004*Math.sin(x/w*29.7+t*.01));
      const sheetPath=(y:number,up:boolean,color:string,phase=0)=>{ctx.beginPath();ctx.moveTo(-20,up?h+20:-20);for(let i=0;i<=48;i++){const x=w*i/48;ctx.lineTo(x,edge(x,y,phase));}ctx.lineTo(w+20,up?h+20:-20);ctx.closePath();ctx.fillStyle=color;ctx.fill();};
      if(t<500){ctx.fillStyle='#F3EADB';ctx.fillRect(0,0,w,h);const p=cubic(Math.min(1,t/380)),y=-h*.3+h*1.42*p;sheetPath(y+h*.045,false,'#3F606B');sheetPath(y,false,'#26313A',.7);
        for(let i=0;i<18;i++){const age=Math.max(0,t-i*11),x=w*(.06+(i%9)/10)+Math.sin(i*7)*age*.10,y0=edge(x,y)+h*.05+age*age*.00042;ctx.fillStyle=i%3?'#26313A':'#3F606B';ctx.beginPath();ctx.ellipse(x,y0,h*(.003+(i%3)*.003),h*(.009+(i%3)*.006),-.3,0,Math.PI*2);ctx.fill();}
      }else {const p=cubic(Math.min(1,(t-500)/460)),y=-h*.12+h*1.3*p;sheetPath(y-h*.025,true,'#F3EADB');sheetPath(y+h*.012,true,'#3F606B');sheetPath(y+h*.035,true,'#26313A',.6);}
      if(t>220&&t<720){const p=Math.min(1,(t-220)/160),alpha=Math.min(1,(720-t)/180),size=Math.min(w,h)*.18;ctx.save();ctx.translate(w/2,h*.46);ctx.rotate(-.045);ctx.globalAlpha=Math.max(0,alpha);ctx.strokeStyle='#B8473A';ctx.lineWidth=4;ctx.strokeRect(-size*p,-size*p,size*2*p,size*2*p);ctx.fillStyle='#F3EADB';ctx.font=`bold ${Math.round(size*.68)}px Georgia,"Noto Serif SC",SimSun,serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('登台',0,0);ctx.restore();}
    };
    const frame=(now:number)=>{
      if(token!==this.token)return;
      const t=now-start;if(t>=duration||this.reduced()){this.cancel();return;}
      ctx.clearRect(0,0,w,h);
      if(full){drawFull(t);this.frame=requestAnimationFrame(frame);return;}
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
    this.safety=setTimeout(()=>{if(token===this.token)this.cancel();},duration+360);
    this.frame=requestAnimationFrame(frame);
  }
}
const flows=new WeakMap<Phaser.Game,PaperFlow>();
export function paperSceneStart(scene:Phaser.Scene,key:string,data?:object,full=false):void {
  // Phaser retains its normal immediate queued route. No mid-animation submission.
  if(data===undefined)scene.scene.start(key);else scene.scene.start(key,data);
  const canvas=scene.game?.canvas;if(!canvas||typeof document==='undefined')return;
  let flow=flows.get(scene.game);
  if(!flow){flow=new PaperFlow(()=>gameSession().reducedMotion||window.matchMedia('(prefers-reduced-motion: reduce)').matches);flows.set(scene.game,flow);scene.game.events.once('destroy',()=>flow?.cancel());}
  flow.run(canvas,full);
}
