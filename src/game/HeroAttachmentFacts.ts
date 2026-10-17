import type {CharacterId} from './characters';
import type {ScoreTrace} from '../domain/scoreR2';

/** Saved IDs only. No draft qualification, arithmetic, new command or predicted outcome. */
export function savedHeroAttachment(trace:ScoreTrace,hero:CharacterId){
  const event=trace.events.find(e=>e.sourceType==='character'&&e.sourceDefinitionId===hero&&(
    hero==='amo'&&e.reasonKey==='amo.exile'&&trace.amoExile?.use||
    hero==='amo'&&e.reasonKey.startsWith('amo.assist.')&&!!trace.assist?.ids.length||
    hero==='erxiang'&&e.reasonKey==='erxiang.handoff'&&!!trace.erxiangHandoff?.targetId&&e.targetCardId===trace.erxiangHandoff.targetId||
    hero==='azao'&&e.reasonKey==='azao.multiply-multiplier'&&trace.azaoCharge?.release===true||
    hero==='xiemu'&&e.reasonKey==='xiemu.multiply-multiplier'&&!!trace.xiemuBurn?.cost||
    hero==='touye'&&!!trace.touyeWager?.commit&&(e.reasonKey.startsWith('touye.won.')||e.reasonKey.startsWith('touye.lost.'))));
  if(!event)return;
  const ids=hero==='amo'?(trace.amoExile?.use?trace.sets.activeScoringIds.length?trace.sets.activeScoringIds:trace.sets.playedIds:trace.assist!.ids):hero==='erxiang'?[trace.erxiangHandoff!.targetId!]:hero==='touye'?(trace.touyeWager?.outcome==='won'?trace.touyeWager.core?.activeNewIds:undefined):trace.sets.activeScoringIds.length?trace.sets.activeScoringIds:trace.sets.playedIds;
  return {event,targetIds:ids?[...ids]:undefined};
}
