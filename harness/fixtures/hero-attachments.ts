import {createRun,type R2RunState} from '../../src/domain/run';
import {newRunIdentity} from './legacy-assist-launch';
import {energySend} from './score-energy';
import {touyeChoice} from '../../src/game/TouyeWagerCopy';
import type {CharacterId} from '../../src/domain/characters';
const hand=['spades-8','hearts-8','clubs-7','diamonds-7','spades-13','hearts-13','clubs-2','diamonds-4'];
function arrange(state:R2RunState,ids=hand,incoming:string[]=[]){
  const s=structuredClone(state);s.handOrder=[...ids];s.drawPile=[...s.deckInstances.map(c=>c.id).filter(id=>!ids.includes(id)&&!incoming.includes(id)&&!s.playedPile.includes(id)&&!s.discardPile.includes(id)&&!s.destroyedIds.includes(id)),...[...incoming].reverse()];return s;
}
/** Controlled public hands; charge, wager and candidate provenance use actual commands. */
export function heroAttachmentFixture(hero:CharacterId){
  let s=createRun({seed:'group-natural-17',runId:'controlled/attachment/'+hero,characterId:hero,rulesVersion:'r2',r2Identity:newRunIdentity(hero,'group'),openingRoute:'group',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
  s=arrange(energySend(energySend(s,{type:'LeaveShop'}),{type:'EnterStage'}));s.gold=40;
  if(hero==='azao'){s=arrange(s,['spades-2','hearts-2','clubs-3','diamonds-3',...hand.slice(4)]);s=arrange(energySend(s,{type:'PlayHand',selectedIds:s.handOrder.slice(0,4)}));}
  if(hero==='touye'){
    const ids=hand.slice(6);s=arrange(s,hand,['clubs-8','diamonds-6']);const bet={target:'three-kind' as const,snapshotToken:touyeChoice(s,ids).snapshotToken};s=energySend(s,{type:'DiscardHand',selectedIds:ids,touyeBet:bet});
    const selectedIds=[hand[0],hand[1],'clubs-8'];return {state:s,selectedIds,action:{type:'PlayHand' as const,selectedIds},targetIds:s.stage!.touyeWager!.commit!.refill!.refilledIds};
  }
  if(hero==='laohuan'){
    s=energySend(s,{type:'DiscardHand',selectedIds:hand.slice(0,5),laohuanTrick:true});if(!s.pendingRefill)throw Error('Expected saved refill candidates');
    const selectedIds=s.pendingRefill.candidateIds.slice(0,s.pendingRefill.required);return {state:s,selectedIds,action:{type:'ChooseRefill' as const,selectedIds},targetIds:selectedIds};
  }
  const selectedIds=hero==='erxiang'?hand.slice(0,2):hand.slice(0,4),assistIds=hero==='amo'?hand.slice(4,6):undefined,targetId=hero==='erxiang'?hand[0]:undefined;
  const action=hero==='amo'?{type:'PlayAssistedHand' as const,selectedIds,assistIds:assistIds!}:{type:'PlayHand' as const,selectedIds,...(targetId?{erxiangTargetId:targetId}:{}),...(hero==='azao'?{azaoRelease:true}:{}),...(hero==='xiemu'?{xiemuBurn:10 as const}:{})};
  return {state:s,selectedIds,assistIds,targetId,action,targetIds:assistIds??(targetId?[targetId]:selectedIds)};
}
