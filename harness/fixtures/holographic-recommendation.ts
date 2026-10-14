import {lockR2ChapterTargets} from '../../src/domain/r2Chapter';
import {createRun,applyCommand,assertRunInvariants,type R2RunState,type Action} from '../../src/domain/run';
import {newRunIdentity} from '../../src/game/RunLaunch';
import {r2CreateJoker} from '../../src/domain/r2Run';
import {r2Price} from '../../src/domain/r2Shop';

/** Controlled projection of root's visible five-slot counterexample, not its
 * natural save or acquisition history. No root/PR152 snapshot is rewritten. */
export function holographicRecommendationFixture(challenge=false){
 let s=createRun({seed:challenge?'challenge/q11/0':'holographic-recommendation',runId:'holographic-recommendation',characterId:'amo',rulesVersion:'r2',r2Identity:newRunIdentity('amo','group'),openingRoute:'group',modeConfig:{mode:challenge?'challenge':'standard',difficulty:0,challengeId:challenge?'Q11':null,programsEnabled:false}});
 for(const type of ['LeaveShop','SkipStage','OpenShop'] as const)s=holographicSend(s,{type});
 s.chapter=3;s.stageIndex=8;s.stage=null;s.boss={definitionId:'B09',disabledSuit:null};s.seenBossIds=['B01','B02','B09'];s.shop!.visitIndex=8;
 s.gold=38;s.purchaseCoupons=0;s.jokers=['mantangcai','b07','b04','f09','e11'].map(id=>r2CreateJoker(id,'held/'+id,id==='b04'?4:8,'none',s));
 s.jokers[1].edition='holographic';s.jokers[3].edition='foil';s.jokers[4].growth.coefficient={n:'7',d:'5'};
 s.routeGrowth={clears:8,G:8,S:0,F:0,settlements:Array.from({length:8},(_,stageIndex)=>({stageIndex,families:['G']}))};s.handLevels.pair=1;
 if(challenge)s.chapterDisabledJokerId='b07';
 s.shop!.offers=[{offerId:'public/e08',definitionId:'e08',price:r2Price('e08','none',s),edition:'none',consumed:false}];
 s.chapterTargetPlan=lockR2ChapterTargets(s.chapter,s.tourMode,s.difficulty,s.boss);
 assertRunInvariants(s);return s;
}
export function holographicSend(s:R2RunState,action:Action){
 const r=applyCommand(s,{runId:s.runId,commandId:s.runId+'/controlled/'+(s.commandSeq+1),expectedSeq:s.commandSeq,action});
 if(!r.ok)throw Error(r.code);assertRunInvariants(r.state);return r.state;
}
