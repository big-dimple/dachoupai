import {R2_TOOL_CATALOG,R2_TOOLS,R2_LONG_TERM_ITEMS,supportsR2Tool,type R2ToolFeature} from '../content/r2Tools';
import type {PlayingCard,Edition} from '../cards/types';

/** Only executable capabilities may enter a shelf, command or restorable state. */
export const R2_IMPLEMENTED_TOOL_FEATURES:readonly R2ToolFeature[]=Object.freeze([...R2_TOOL_CATALOG.initialSupportedFeatures,'card-delete','card-copy','rank-change','planet-upgrade','enhancements','lucky','editions','spectral','permanent-resources','hand-exchange','rare-reward','joker-sacrifice','specials-reset','gold-supply','free-reroll','long-term-items','first-boss-supply']);
export const R2_IMPLEMENTED_ITEM_IDS:readonly string[]=Object.freeze(R2_LONG_TERM_ITEMS.map(item=>item.id));
export const r2ToolSupported=(id:string):boolean=>{
  const definition=R2_TOOLS.find(tool=>tool.id===id);
  return !!definition&&supportsR2Tool(definition,R2_IMPLEMENTED_TOOL_FEATURES);
};
export const r2ItemSupported=(id:string):boolean=>R2_IMPLEMENTED_ITEM_IDS.includes(id)&&R2_LONG_TERM_ITEMS.some(item=>item.id===id);
export const r2EditionSupported=(edition:Edition|undefined):boolean=>edition===undefined||edition==='none'||R2_IMPLEMENTED_TOOL_FEATURES.includes('editions');
export const r2CardSpecialsSupported=(card:PlayingCard):boolean=>
  r2EditionSupported(card.edition)&&(card.enhancement===undefined||R2_IMPLEMENTED_TOOL_FEATURES.includes('enhancements')&&(card.enhancement!=='lucky-paper'||R2_IMPLEMENTED_TOOL_FEATURES.includes('lucky')));
