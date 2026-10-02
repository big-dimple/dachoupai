import type Phaser from 'phaser';
import type {R2RunState} from '../domain/run';
import {assetUrl} from './theme';

export const REWARD_COIN={key:'reward-coin',image:'assets/effects/coin-reward/coin-reward.webp',atlas:'assets/effects/coin-reward/atlas.json',duration:800,frames:16} as const;
const frame=(index:number)=>`coin-${String(index).padStart(3,'0')}`;
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

export function rewardCoinFrame(elapsed:number):string {return frame(Math.min(15,Math.max(0,Math.floor(elapsed/50))));}
function validAtlas(value:any):boolean {
  return value?.meta?.size?.w===1024&&value?.meta?.size?.h===1024&&value?.meta?.durationMs===800&&
    Object.keys(value.frames??{}).length===16&&Array.from({length:16},(_,i)=>{
      const f=value.frames?.[frame(i)];return f&&!f.rotated&&!f.trimmed&&f.frame?.w===256&&f.frame?.h===256&&f.frame.x===i%4*256&&f.frame.y===Math.floor(i/4)*256;
    }).every(Boolean);
}

/** Starts after controls render. One small atlas, with owned cancellation and a five-second deadline. */
export async function loadRewardCoin(scene:Phaser.Scene,signal:AbortSignal):Promise<boolean> {
  if(signal.aborted)return false;if(scene.textures.exists(REWARD_COIN.key))return true;
  const controller=new AbortController(),abort=()=>controller.abort(),image=new Image();let url:string|undefined,loaded=false;
  signal.addEventListener('abort',abort,{once:true});
  const timer=setTimeout(abort,5000);let rejectAbort!:()=>void;
  const canceled=new Promise<never>((_resolve,reject)=>{rejectAbort=()=>reject(new Error('reward-coin-aborted'));controller.signal.addEventListener('abort',rejectAbort,{once:true});});
  const transfer=async()=>{
    const options:RequestInit={signal:controller.signal,credentials:'same-origin',priority:'low'};
    const [picture,data]=await Promise.all([fetch(assetUrl(REWARD_COIN.image),options),fetch(assetUrl(REWARD_COIN.atlas),options)]);
    if(!picture.ok||!data.ok)throw Error('reward-coin-http');
    const [blob,json]=await Promise.all([picture.blob(),data.blob()]);
    if(blob.size>200*1024||json.size>16*1024)throw Error('reward-coin-budget');
    const atlas=JSON.parse(await json.text());if(!validAtlas(atlas)||controller.signal.aborted)throw Error('reward-coin-atlas');
    url=URL.createObjectURL(blob);image.decoding='async';image.src=url;await image.decode();
    if(controller.signal.aborted||!scene.sys.settings.active||image.naturalWidth!==1024||image.naturalHeight!==1024)throw Error('reward-coin-stale');
    if(!scene.textures.exists(REWARD_COIN.key))scene.textures.addAtlas(REWARD_COIN.key,image,atlas);
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
  const coin=scene.add.image(x,y,REWARD_COIN.key,frame(15)).setDisplaySize(size,size).setName('result/reward-coin');
  coin.setData('clearId',clearId).setData('rewardState','settled');parent.add(coin);return coin;
}

/** Elapsed time can skip frames on a slow renderer; controls never wait for this promise. */
export function animateRewardCoin(scene:Phaser.Scene,coin:Phaser.GameObjects.Image,signal:AbortSignal,reduced:boolean):Promise<void> {
  if(signal.aborted){coin.destroy();return Promise.resolve();}
  if(reduced){coin.setFrame(frame(15));return Promise.resolve();}
  return new Promise(resolve=>{
    const started=performance.now();let finished=false;
    const finish=(canceled=false)=>{
      if(finished)return;finished=true;clearTimeout(timer);scene.events.off('update',update);signal.removeEventListener('abort',abort);
      if(coin.active){if(canceled)coin.destroy();else coin.setFrame(frame(15)).setData('rewardState','settled').setData('rewardEndedAt',performance.now());}resolve();
    };
    const abort=()=>finish(true),update=()=>{if(!coin.active){finish();return;}coin.setFrame(rewardCoinFrame(performance.now()-started));};
    const timer=setTimeout(()=>finish(),REWARD_COIN.duration);
    coin.setFrame(frame(0)).setData('rewardState','playing').setData('rewardStartedAt',started);
    signal.addEventListener('abort',abort,{once:true});scene.events.on('update',update);
  });
}
