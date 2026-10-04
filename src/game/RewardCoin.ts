import type Phaser from 'phaser';
import type {R2RunState} from '../domain/run';
import {assetUrl} from './theme';

export interface RewardCoinAsset {image:string|null;width:number;height:number;bytes:number|null;sha256:string|null}
// Approved public runtime delivery: f44320be03cf650bbf122d2764d669d00eeae1ff.
export const REWARD_COIN={key:'reward-coin-handdrawn-v1',image:'assets/effects/coin-reward/coin-reward-handdrawn.webp',width:256,height:256,bytes:15958,sha256:'45b2a3bf35c769d4527ac0ca63118ab6136c45a8e327734bcfd410ccd7644741',duration:800} as const;
interface Receipt {cleared:boolean;stageIndex:number;goldEarned:number;rewardClearId?:string}

/** Presentation-only identity. Restored results have no live cue; never dispatches money. */
export class RewardCoinCue {
  private consumed?:string;
  claim(run:R2RunState,result:Receipt):boolean {
    const stage=run.stage,id=stage?.clearId;
    if(!result.cleared||!stage||stage.skipResult||!id||result.rewardClearId!==id||this.consumed===id||
      !['stage-cleared','run-won'].includes(run.phase)||stage.index!==result.stageIndex||
      result.goldEarned<=0||result.goldEarned!==stage.goldEarned)return false;
    this.consumed=id;return true;
  }
}

/** One small settle, expressed as multipliers of the original display size. */
export function rewardCoinPose(elapsed:number) {
  const t=Math.min(1,Math.max(0,elapsed/REWARD_COIN.duration));
  const keys=[{t:0,x:.94,y:.9,angle:-.12,lift:-.04},{t:.42,x:1.035,y:.965,angle:.04,lift:.005},{t:.7,x:.99,y:1.015,angle:-.012,lift:-.004},{t:1,x:1,y:1,angle:0,lift:0}];
  const end=keys.findIndex(k=>k.t>=t),a=keys[Math.max(0,end-1)],b=keys[Math.max(0,end)],u=a===b?0:(t-a.t)/(b.t-a.t),s=(1-Math.cos(Math.PI*u))/2;
  const mix=(x:number,y:number)=>x+(y-x)*s;
  return {scaleX:mix(a.x,b.x),scaleY:mix(a.y,b.y),rotation:mix(a.angle,b.angle),offsetY:mix(a.lift,b.lift)};
}

/** Starts after controls render. One verified image; the optional descriptor is for isolated transport tests. */
export async function loadRewardCoin(scene:Phaser.Scene,signal:AbortSignal,asset:Readonly<RewardCoinAsset>=REWARD_COIN):Promise<boolean> {
  if(signal.aborted||!asset.image||asset.width!==256||asset.height!==256||!asset.bytes||asset.bytes>200*1024||!asset.sha256||!/^[a-f0-9]{64}$/.test(asset.sha256))return false;
  if(scene.textures.exists(REWARD_COIN.key))return true;
  const controller=new AbortController(),abort=()=>controller.abort(),image=new Image();let url:string|undefined,loaded=false;
  signal.addEventListener('abort',abort,{once:true});
  const timer=setTimeout(abort,5000);let rejectAbort!:()=>void;
  const canceled=new Promise<never>((_resolve,reject)=>{rejectAbort=()=>reject(new Error('reward-coin-aborted'));controller.signal.addEventListener('abort',rejectAbort,{once:true});});
  const transfer=async()=>{
    const options:RequestInit={signal:controller.signal,credentials:'same-origin',priority:'low'};
    const picture=await fetch(assetUrl(asset.image!),options);
    if(!picture.ok)throw Error('reward-coin-http');
    const blob=await picture.blob();
    if(blob.size!==asset.bytes||blob.size>200*1024||controller.signal.aborted)throw Error('reward-coin-budget');
    const digest=await crypto.subtle.digest('SHA-256',await blob.arrayBuffer());
    const hash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
    if(hash!==asset.sha256||controller.signal.aborted)throw Error('reward-coin-hash');
    url=URL.createObjectURL(blob);image.decoding='async';image.src=url;await image.decode();
    if(controller.signal.aborted||!scene.sys.settings.active||image.naturalWidth!==asset.width||image.naturalHeight!==asset.height)throw Error('reward-coin-stale');
    if(!scene.textures.exists(REWARD_COIN.key))scene.textures.addImage(REWARD_COIN.key,image);
    return true;
  };
  try {loaded=await Promise.race([transfer(),canceled]);return loaded;}
  catch {controller.abort();return false;}
  finally {
    clearTimeout(timer);signal.removeEventListener('abort',abort);controller.signal.removeEventListener('abort',rejectAbort);
    if(!loaded)image.removeAttribute('src');if(url)URL.revokeObjectURL(url);
  }
}

export function addRewardCoin(scene:Phaser.Scene,parent:Phaser.GameObjects.Container,x:number,y:number,size:number,clearId:string):Phaser.GameObjects.Image {
  const coin=scene.add.image(x,y,REWARD_COIN.key).setDisplaySize(size,size).setName('result/reward-coin');
  coin.setData('clearId',clearId).setData('rewardState','settled');parent.add(coin);return coin;
}

/** Wall time controls the one-shot lifetime; controls never wait for this promise. */
export function animateRewardCoin(scene:Phaser.Scene,coin:Phaser.GameObjects.Image,signal:AbortSignal,reduced:boolean):Promise<void> {
  if(signal.aborted){coin.destroy();return Promise.resolve();}
  if(reduced){coin.setData('rewardState','settled');return Promise.resolve();}
  const base={x:coin.x,y:coin.y,scaleX:coin.scaleX,scaleY:coin.scaleY,rotation:coin.rotation},size=coin.displayHeight;
  const pose=(elapsed:number)=>{const p=rewardCoinPose(elapsed);coin.setPosition(base.x,base.y+p.offsetY*size).setScale(base.scaleX*p.scaleX,base.scaleY*p.scaleY).setRotation(base.rotation+p.rotation);};
  return new Promise(resolve=>{
    const started=performance.now();let finished=false;
    const finish=(canceled=false)=>{
      if(finished)return;finished=true;clearTimeout(timer);scene.events.off('update',update);signal.removeEventListener('abort',abort);
      if(coin.active){if(canceled)coin.destroy();else {pose(REWARD_COIN.duration);coin.setData('rewardState','settled').setData('rewardEndedAt',performance.now());}}resolve();
    };
    const abort=()=>finish(true),update=()=>{if(!coin.active){finish();return;}pose(performance.now()-started);};
    const timer=setTimeout(()=>finish(),REWARD_COIN.duration);
    pose(0);coin.setData('rewardState','playing').setData('rewardStartedAt',started);
    signal.addEventListener('abort',abort,{once:true});scene.events.on('update',update);
  });
}
