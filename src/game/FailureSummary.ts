import type {R2RunState} from '../domain/r2Run';
import {HAND_LABELS} from '../content/handLabels';
import {heatText} from './scoreText';
import {stageOutcome} from './stageOutcome';

/** Explain only committed terminal facts, never infer a strategy or replay a score. */
export function failureSummary(run:Pick<R2RunState,'stage'|'outcome'|'lastTrace'>){
  const stage=run.stage;
  const reason=run.outcome?.reason==='hands-exhausted'?'出牌次数已用完':run.outcome?.reason==='no-legal-cards'?'已无可出牌':run.outcome?.reason==='abandoned'?'已结束本局':'本局已结束';
  const trace=stage?stageOutcome(stage,run.lastTrace).last:null;
  return {
    reason,
    lastHand:trace?'最后一手：'+HAND_LABELS[trace.handType]+' · '+heatText(trace.finalScore)+' 热度':'最后一手记录不可用',
    resources:stage?'剩余出牌 '+stage.handsLeft+' 次 · 弃牌 '+stage.discardsLeft+' 次':'本场资源记录不可用',
  };
}
