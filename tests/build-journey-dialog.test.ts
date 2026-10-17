import {cardDisplayName} from '../src/game/tangsongCardNames';
import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import {showBuildJourney} from '../src/game/BuildJourneyDialog';
import type {DetailDialog} from '../src/game/DetailDialog';
import {buildJourneyPlan} from '../harness/fixtures/build-journey';
import {r2CreateJoker} from '../src/domain/r2Run';
import type {ExperienceCard} from '../src/game/JokerExperience';
import {createRun,type R2RunState} from '../src/domain/run';
import {newRunIdentity} from '../src/game/RunLaunch';
import {chooseBuildFocus} from '../src/game/BuildJourney';
import {r2PracticeQuotes} from '../src/domain/r2Practice';
beforeEach(()=>vi.stubGlobal('document',{querySelector:()=>null}));afterEach(()=>vi.unstubAllGlobals());
function previews(s:ReturnType<typeof buildJourneyPlan>){const open=vi.fn();showBuildJourney({open} as unknown as DetailDialog,s,{tools:()=>{},tool:()=>{},source:()=>{},deck:()=>{},continue:()=>{},continueLabel:'继续',ready:true},true);return (open.mock.calls[0][3] as {cards:ExperienceCard[]}).cards;}
it('three unselected previews never pass the first unrelated stock off as a matching route example',()=>{
 const s=buildJourneyPlan(true);s.shop!.offers=[{offerId:'actual/b10',definitionId:'b10',price:4,consumed:false}];const before=JSON.stringify(s),cards=previews(s);
 expect(cards[0].body).toContain('现货');expect(cards[0].body).toContain('路线直接条件');
 for(const card of cards.slice(1)){expect(card.body).not.toContain('现货：练对子');expect(card.body).toContain('暂无');expect(card.body).toContain('示意');}
 expect(JSON.stringify(s)).toBe(before);
});
it('a genuine all-route support can be shown but is explicitly labeled general support',()=>{
 const s=buildJourneyPlan(true);s.shop!.offers=[{offerId:'actual/d03',definitionId:'d03',price:4,consumed:false}];for(const card of previews(s)){expect(card.body).toContain(cardDisplayName('d03'));expect(card.body).toContain('通用辅助');}
});
it('carried growth is a held support example, never a matching zero-growth same-name offer',()=>{
 const s=buildJourneyPlan(true),j=r2CreateJoker('b10','carried',4,undefined,s);j.growth.heat={n:'20',d:'1'};s.jokers=[j];s.shop!.offers=[{offerId:'fresh/b10',definitionId:'b10',price:4,consumed:false}];
 for(const card of previews(s).slice(1)){expect(card.body).toContain('持有');expect(card.body).toContain('通用辅助');expect(card.body).toContain('暂无');}
});

it('default shop puts a priced inspection in the fixed actions and requests an opt-in ledger',async()=>{
 const {chooseBuildFocus,buildJourneyFacts}=await import('../src/game/BuildJourney'),s=buildJourneyPlan();s.shop!.offers=[{offerId:'actual/b04',definitionId:'b04',price:4,consumed:false}];chooseBuildFocus(s,'group');const before=JSON.stringify(s),open=vi.fn(),offers=vi.fn();
 showBuildJourney({open} as unknown as DetailDialog,s,{tools:()=>{},tool:()=>{},source:()=>{},deck:()=>{},offers,continue:()=>{},continueLabel:'继续',ready:true});
 const [title,,actions,options]=open.mock.calls[0],facts=buildJourneyFacts(s,'group'),choice=facts.decision.choices[0],offer=facts.offers.find(o=>o.id===choice.id)!;
 expect(title).toContain('这轮怎么选');expect(options.keepsakeCompact).toBe(true);expect(actions[0].label).toContain(offer.price+'金');expect(actions[0].primary).toBe(true);actions[0].run();expect(offers).toHaveBeenCalledWith(choice.id,offer.kind);expect(JSON.stringify(s)).toBe(before);
});
it('a no-buy decision keeps entry primary and an explicitly opened ledger retains the complete view',async()=>{
 const {chooseBuildFocus}=await import('../src/game/BuildJourney'),s=buildJourneyPlan(true);chooseBuildFocus(s,'group');s.shop!.offers=[];s.shop!.toolOffers=[];const open=vi.fn(),actions={tools:()=>{},tool:()=>{},source:()=>{},deck:()=>{},continue:()=>{},continueLabel:'继续',ready:true};
 showBuildJourney({open} as unknown as DetailDialog,s,actions);const row=open.mock.calls[0][2];expect(row.find((a:{primary?:boolean})=>a.primary)?.label).toBe('先留0金，进入牌桌');expect(open.mock.calls[0][3].keepsakeCompact).toBe(true);
 showBuildJourney({open} as unknown as DetailDialog,s,actions,false,true);expect(open.mock.calls[1][3].keepsakeCompact).toBeUndefined();expect(open.mock.calls[1][3].keepsake).toBeTruthy();
});

interface PracticeNode {tag:string;className:string;dataset:Record<string,string>;textContent:string;disabled:boolean;onclick?:()=>void;children:PracticeNode[];classList:{add:ReturnType<typeof vi.fn>};append:(...nodes:PracticeNode[])=>void;prepend:(...nodes:PracticeNode[])=>void;querySelector:()=>null;setAttribute:ReturnType<typeof vi.fn>}
function practiceRender(s:R2RunState,all=false,ready=true){
 const nodes:PracticeNode[]=[];
 const createElement=(tag:string):PracticeNode=>{const n:PracticeNode={tag,className:'',dataset:{},textContent:'',disabled:false,children:[],classList:{add:vi.fn()},append:(...children)=>n.children.push(...children),prepend:(...children)=>n.children.unshift(...children),querySelector:()=>null,setAttribute:vi.fn()};nodes.push(n);return n;};
 const intro=createElement('intro'),element={classList:{add:vi.fn()},dataset:{} as Record<string,string>,querySelector:()=>intro},open=vi.fn(()=>element),practice=vi.fn();
 vi.stubGlobal('document',{querySelector:()=>null,createElement});
 chooseBuildFocus(s,'group');showBuildJourney({open} as unknown as DetailDialog,s,{tools:()=>{},tool:()=>{},source:()=>{},deck:()=>{},continue:()=>{},continueLabel:'继续',ready,practice},false,all);
 return {nodes,element,open,practice};
}
it('paid upgrade cards remain independent in simple and complete pages and pass the exact quote and return mode',()=>{
 for(const all of [false,true]){
  const s=createRun({rulesVersion:'r2',seed:'dialog-practice',runId:'dialog-practice',characterId:'laohuan',r2Identity:newRunIdentity('laohuan','group'),openingRoute:'group'});s.gold=0;s.handLevels={pair:1};s.shop!.offers=[];s.shop!.toolOffers=[];
  const before=structuredClone(s),{nodes,element,practice}=practiceRender(s,all);
  const rows=nodes.filter(n=>n.className==='experience-card build-practice-option');expect(rows).toHaveLength(1);expect(rows[0].dataset).toMatchObject({handType:'pair',practiceHand:'pair',affordable:'false'});expect(element.dataset).toEqual({buildFocus:'group',buildAll:String(all)});
  const button=nodes.find(n=>n.tag==='button')!;expect(button.disabled).toBe(false);expect(button.textContent).toBe('查看差额与条件');button.onclick!();expect(practice).toHaveBeenCalledWith(r2PracticeQuotes(s)[0],all);expect(s).toEqual(before);
 }
});
it('old identities and consumed service quotas add no payable upgrade buttons',()=>{
 const old=buildJourneyPlan(true);expect(practiceRender(old).nodes.filter(n=>n.tag==='button')).toHaveLength(0);
 const s=createRun({rulesVersion:'r2',seed:'spent-practice',runId:'spent-practice',characterId:'laohuan',r2Identity:newRunIdentity('laohuan','group'),openingRoute:'group'});s.handLevels={pair:1};s.shop!.basicChoice!.purchase={definitionId:'T08',paidPrice:2,commandId:'spent',seq:s.commandSeq};
 const view=practiceRender(s);expect(view.nodes.filter(n=>n.tag==='button')).toHaveLength(0);expect(view.nodes.find(n=>n.className==='build-practice-status')!.textContent).toContain('本店自选已用');
});
