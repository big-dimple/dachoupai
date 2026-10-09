import type {PlayingCard} from '../cards/types';
import {R2_ENHANCEMENTS,type R2ToolEnhancement} from '../content/r2Tools';
export const ENHANCEMENT_BRIEF:Record<R2ToolEnhancement,string>={'heat-paper':'热+20','multiplier-paper':'倍+2','glass-paper':'×1.5','voice-paper':'留+1','gold-paper':'留金','encore-paper':'重计','lucky-paper':'幸运'};
export function enhancementText(card:Pick<PlayingCard,'enhancement'>):string {return card.enhancement?(R2_ENHANCEMENTS.find(e=>e.id===card.enhancement)?.name??card.enhancement)+' · '+ENHANCEMENT_BRIEF[card.enhancement]:'无增强';}
