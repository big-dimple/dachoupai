import {applyCommand,createRun,type Action,type R2RunState} from '../../src/domain/run';
import {newRunIdentity} from '../../src/game/RunLaunch';
import {evaluateR2Hand} from '../../src/domain/evaluateR2';
import {touyeChoice} from '../../src/game/TouyeWagerCopy';
export const SIX_HEROES=['amo','erxiang','azao','xiemu','touye','laohuan'] as const;
type Hero=typeof SIX_HEROES[number];
const modeConfig={mode:'standard',difficulty:0,challengeId:null,programsEnabled:true} as const;
export const sixNewRun=(hero:Hero,seed:string)=>createRun({seed,runId:'run/'+seed+'/'+hero,characterId:hero,rulesVersion:'r2',r2Identity:newRunIdentity(hero,'group'),openingRoute:'group',modeConfig});
export function sixSend(state:R2RunState,action:Action):R2RunState {
  const r=applyCommand(state,{runId:state.runId,commandId:state.runId+'/command/'+(state.commandSeq+1),expectedSeq:state.commandSeq,action});if(!r.ok)throw Error(r.code);return r.state;
}
const enter=(s:R2RunState)=>sixSend(sixSend(s,{type:'LeaveShop'}),{type:'EnterStage'});
const cards=(s:R2RunState,ids:readonly string[])=>ids.map(id=>s.deckInstances.find(c=>c.id===id)!);
const pairs=(s:R2RunState)=>{const ranks=new Map<number,string[]>();for(const c of cards(s,s.handOrder))ranks.set(c.rank,[...(ranks.get(c.rank)??[]),c.id]);return [...ranks.entries()].filter(([,ids])=>ids.length>=2).sort((a,b)=>a[0]-b[0]).map(([,ids])=>ids.slice(0,2));};
const ordered=(s:R2RunState,ids:readonly string[])=>s.handOrder.filter(id=>ids.includes(id));
const twoPair=(s:R2RunState)=>{const p=pairs(s);return p.length>=2?ordered(s,[...p[0],...p[1]]):undefined;};
function* combinations(ids:readonly string[],count:number,start=0,prefix:string[]=[]):Generator<string[]>{if(!count){yield prefix;return;}for(let i=start;i<=ids.length-count;i++)yield* combinations(ids,count-1,i+1,[...prefix,ids[i]]);}
export interface SixNewRunPlan {hero:Hero;seed:string;shop:R2RunState;initial:R2RunState;prep:Action[];skill:Action[];skillBefore:R2RunState;skillAfter:R2RunState;nextStage:Action[];next:Action}
/** Seed-selected formal new games. No assignment to hand, deck, gold, stage, growth, levels or RNG. */
export function sixNewRunPlan(hero:Hero):SixNewRunPlan {
  for(let cursor=0;cursor<600;cursor++){
    const seed='six-new-'+cursor,shop=sixNewRun(hero,seed),initial=enter(shop);let state=initial;const prep:Action[]=[],skill:Action[]=[];
    if(hero==='amo'){
      const p=pairs(state);if(p.length<3)continue;
      skill.push({type:'PlayAssistedHand',selectedIds:ordered(state,[...p[0],...p[1]]),assistIds:p[2]});
    }else if(hero==='erxiang'){
      const p=pairs(state)[0];if(!p)continue;skill.push({type:'PlayHand',selectedIds:p,erxiangTargetId:p[0]});
    }else if(hero==='azao'){
      const first=twoPair(state);if(!first)continue;const action:Action={type:'PlayHand',selectedIds:first};state=sixSend(state,action);
      if(state.phase!=='await-input'||state.stage?.azaoCharge?.charge!==1)continue;const second=twoPair(state);if(!second)continue;
      prep.push(action);skill.push({type:'PlayHand',selectedIds:second,azaoRelease:true});
    }else if(hero==='xiemu'){
      let winner:Action|undefined;
      for(const ids of combinations(state.handOrder,5)){
        const type=evaluateR2Hand(cards(state,ids),{}).type;if(!['straight','flush','full-house','four-kind','straight-flush'].includes(type))continue;
        const action:Action={type:'PlayHand',selectedIds:ids},next=sixSend(state,action);if(next.phase==='stage-cleared'){winner=action;state=next;break;}
      }
      if(!winner)continue;prep.push(winner,{type:'OpenShop'},{type:'LeaveShop'},{type:'EnterStage'});state=enter(sixSend(state,{type:'OpenShop'}));
      const ids=twoPair(state);if(!ids||state.gold<10)continue;skill.push({type:'PlayHand',selectedIds:ids,xiemuBurn:10});
    }else if(hero==='touye'){
      const ids=state.handOrder.slice(0,5),choice=touyeChoice(state,ids).choices.find(c=>c.target==='two-pair'&&c.available);if(!choice)continue;
      const action:Action={type:'DiscardHand',selectedIds:ids,touyeBet:{target:'two-pair',snapshotToken:touyeChoice(state,ids).snapshotToken}},after=sixSend(state,action),main=twoPair(after);if(!main)continue;
      const score=sixSend(after,{type:'PlayHand',selectedIds:main});if(score.lastTrace?.touyeWager?.outcome!=='won')continue;
      skill.push(action,{type:'PlayHand',selectedIds:main});
    }else{
      const discard:Action={type:'DiscardHand',selectedIds:state.handOrder.slice(0,5),laohuanTrick:true},after=sixSend(state,discard);if(!after.pendingRefill||after.pendingRefill.required!==5)continue;
      skill.push(discard,{type:'ChooseRefill',selectedIds:after.pendingRefill.candidateIds.slice(0,5)});
    }
    const skillBefore=state;for(const action of skill)state=sixSend(state,action);const skillAfter=state,nextStage:Action[]=[];
    if(state.phase==='stage-cleared'){nextStage.push({type:'OpenShop'},{type:'LeaveShop'},{type:'EnterStage'});state=enter(sixSend(state,{type:'OpenShop'}));}
    if(state.phase!=='await-input')continue;
    return {hero,seed,shop,initial,prep,skill,skillBefore,skillAfter,nextStage,next:{type:'PlayHand',selectedIds:[state.handOrder[0]]}};
  }
  throw Error('no-new-run-plan/'+hero);
}
export const sixNewRunPlans=()=>SIX_HEROES.map(hero=>sixNewRunPlan(hero));
