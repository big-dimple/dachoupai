import {createRun,applyCommand,assertRunInvariants} from '../../src/domain/run';
import {newRunIdentity} from '../../src/game/RunLaunch';
import {r2Price} from '../../src/domain/r2Shop';
import {r2ChapterBossIds} from '../../src/domain/r2Chapter';
import {isR2RouteGrowth,R2_SUIT_CHOICE_VERSION,R2_SUIT_CHOICE_HASH} from '../../src/domain/r2GroupUpgrade';

/** Controlled invariant-valid shop projection, not natural progress or acquisition. */
export function f06RecommendationFixture(chapter=6,options:{disabled?:boolean;boss?:boolean;legacy?:boolean}={}){
 const modeConfig=options.disabled?{mode:'challenge' as const,difficulty:0 as const,challengeId:'Q11' as const,programsEnabled:false}:{mode:'standard' as const,difficulty:0 as const,challengeId:null,programsEnabled:false};
 const r2Identity=options.legacy?{contentVersion:R2_SUIT_CHOICE_VERSION,contentHash:R2_SUIT_CHOICE_HASH}:newRunIdentity('laohuan','group');
 let s=createRun({seed:options.disabled?'challenge/q11/0':'f06-recommendation',runId:'f06-recommendation',characterId:'laohuan',rulesVersion:'r2',r2Identity,openingRoute:'group',modeConfig});
 for(const type of ['LeaveShop','SkipStage','OpenShop'] as const){const r=applyCommand(s,{runId:s.runId,commandId:s.runId+'/fixture/'+(s.commandSeq+1),expectedSeq:s.commandSeq,action:{type}});if(!r.ok)throw Error(r.code);s=r.state;}
 s.tourMode=chapter>8?'endless':'normal';s.chapter=chapter;s.stageIndex=Math.max(1,(chapter-1)*3)+(options.boss?2:0);s.stage=null;
 if(chapter>8){s.totalHeat='1';s.normalCompletion={clearId:s.runId+'/clear/23',totalHeat:'1'};}
 s.gold=40;s.purchaseCoupons=0;s.jokers=[];s.shop!.visitIndex=s.stageIndex;
 s.seenBossIds=[];
 for(let c=1;c<=chapter;c++){
  const pool=r2ChapterBossIds(c,s.tourMode)!,unseen=pool.filter(id=>!s.seenBossIds.includes(id)&&id!=='B16');
  s.seenBossIds.push(options.boss&&c===chapter?'B16':unseen[0]??pool[0]);
 }
 s.boss={definitionId:s.seenBossIds.at(-1)! as typeof s.boss.definitionId,disabledSuit:null};
 if(isR2RouteGrowth(s)){const settlements=Array.from({length:chapter-1},(_,i)=>({stageIndex:i*3+2,families:[]}));s.routeGrowth={clears:settlements.length,G:0,S:0,F:0,settlements};}
 if(options.disabled)s.chapterDisabledJokerId='f06';
 s.shop!.offers=[{offerId:'public/f06',definitionId:'f06',price:r2Price('f06','none',s),edition:'none',consumed:false}];
 assertRunInvariants(s);return s;
}
