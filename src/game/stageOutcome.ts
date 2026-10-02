import type {ScoreTrace} from '../domain/scoreR2';

interface StageFacts {heat:string;targetHeat:string;handsLeft:number;playIndex:number;previousHandScore:string|null}
export type ClearKind='steady'|'narrow'|'comeback'|'overwhelming';

/** Presentation only. The run adds exactly finalScore to stage.heat before closing a stage. */
export function stageOutcome(stage:StageFacts,trace:ScoreTrace|null){
  const total=BigInt(stage.heat),target=BigInt(stage.targetHeat);
  const verified=!!trace&&stage.playIndex>0&&trace.finalScore===stage.previousHandScore&&BigInt(trace.finalScore)<=total;
  const last=verified?trace:null,before=last?total-BigInt(last.finalScore):null;
  const crossed=before!==null&&before<target&&total>=target;
  let kind:ClearKind='steady';
  if(total>=target){
    if(crossed&&stage.handsLeft===0&&stage.playIndex>1)kind='comeback';
    else if(total>=target*2n)kind='overwhelming';
    else if(stage.handsLeft<=1||total*10n<=target*11n)kind='narrow';
  }
  const highMultiplier=!!last&&BigInt(last.accumulator.M.n)>=10n*BigInt(last.accumulator.M.d);
  const title={steady:'好戏落幕，再赴一场',narrow:'险险过关，好戏没散',comeback:'最后一手，掀翻全场！',overwhelming:'一场好戏，满堂喝彩！'}[kind];
  return {kind,title,last,beforeHeat:before?.toString()??null,crossed,highMultiplier,intensity:kind==='comeback'||kind==='overwhelming'?3:highMultiplier?2:1} as const;
}
