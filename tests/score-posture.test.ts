import {describe,it,expect} from 'vitest';
import {EffectQueue} from '../src/core/EffectQueue';
import {ScorePosture,type ScoreAnimate} from '../src/game/ScorePosture';

function fixture(){
  const target={active:true,y:205,angle:7,scaleX:.7,scaleY:.8,setY(v:number){this.y=v;return this;},setAngle(v:number){this.angle=v;return this;},setScale(x:number,y:number){this.scaleX=x;this.scaleY=y;return this;}};
  const light={active:true,alpha:.12,setAlpha(v:number){this.alpha=v;return this;}};
  const running:{tick:(t:number)=>void;finish:()=>void}[]=[];
  const animate:ScoreAnimate=(config,context)=>new Promise(resolve=>{
    const cursor=config.targets as {t:number};const finish=()=>{context.signal.removeEventListener('abort',finish);resolve();};
    context.signal.addEventListener('abort',finish,{once:true});
    running.push({tick:t=>{cursor.t=t;(config.onUpdate as (()=>void))();},finish});
  });
  return {target,light,running,posture:new ScorePosture(animate)};
}
const flush=async()=>{await Promise.resolve();await Promise.resolve();};

describe('one card pose owner through the EffectQueue lifecycle',()=>{
  it('actual ticks lift each card 18px, alternate tilt, rebound and restore the captured pose',async()=>{
    const f=fixture(),controller=new AbortController(),context={generation:1,signal:controller.signal};
    for(let ordinal=0;ordinal<2;ordinal++){
      const done=f.posture.play(f.target,{context,arrival:Promise.resolve(),duration:200,ordinal,reducedMotion:false,faceGlow:f.light});await flush();
      f.running[ordinal].tick(.3);expect(f.target.y).toBe(187);expect(f.target.angle).toBe(ordinal?4.5:9.5);expect(f.target.scaleX).toBeCloseTo(.756);
      f.running[ordinal].tick(.38);expect(f.target.y).toBe(187);
      f.running[ordinal].tick(.76);expect(f.target.y).toBe(207);f.running[ordinal].finish();await done;
      expect(f.target).toMatchObject({y:205,angle:7,scaleX:.7,scaleY:.8});expect(f.light.alpha).toBe(.12);
    }
  });
  it('clear during flight settles the wait and never starts the card tween',async()=>{
    const f=fixture(),queue=new EffectQueue();queue.enqueue(context=>f.posture.play(f.target,{context,arrival:new Promise(()=>{}),duration:200,ordinal:0,reducedMotion:false,faceGlow:f.light}));
    const done=queue.drain();await flush();queue.clear();await done;expect(f.running).toHaveLength(0);expect(f.light.alpha).toBe(.12);
  });
  it('retrigger restores first, cancels its old tween and rejects stale writes and stale cleanup',async()=>{
    const f=fixture(),context={generation:1,signal:new AbortController().signal},options={context,arrival:Promise.resolve(),duration:200,reducedMotion:false};
    const first=f.posture.play(f.target,{...options,ordinal:0});await flush();f.running[0].tick(.3);
    const second=f.posture.play(f.target,{...options,ordinal:1});await flush();f.running[1].tick(.3);await first;
    f.running[0].tick(1);expect(f.target.y).toBe(187);expect(f.target.angle).toBe(4.5);f.running[1].finish();await second;expect(f.target.y).toBe(205);
  });
  it('fast-forward abort restores mid-rebound; reduced motion never translates or rotates the card',async()=>{
    const f=fixture(),abort=new AbortController(),context={generation:1,signal:abort.signal};
    const done=f.posture.play(f.target,{context,arrival:Promise.resolve(),duration:200,ordinal:0,reducedMotion:false});await flush();f.running[0].tick(.5);abort.abort();await done;expect(f.target.y).toBe(205);
    const reduced=f.posture.play(f.target,{context:{generation:2,signal:new AbortController().signal},arrival:Promise.resolve(),duration:150,ordinal:0,reducedMotion:true,faceGlow:f.light});await flush();f.running[1].tick(.3);expect(f.target).toMatchObject({y:205,angle:7,scaleX:.7,scaleY:.8});f.running[1].finish();await reduced;
  });
  it('a late call from an aborted generation cannot cancel the current card owner',async()=>{
    const f=fixture(),expired=new AbortController();expired.abort();const options={arrival:Promise.resolve(),duration:200,ordinal:0,reducedMotion:false};
    const done=f.posture.play(f.target,{...options,context:{generation:2,signal:new AbortController().signal}});await flush();f.running[0].tick(.3);
    await f.posture.play(f.target,{...options,context:{generation:1,signal:expired.signal}});expect(f.target.y).toBe(187);f.running[0].finish();await done;
  });
});
