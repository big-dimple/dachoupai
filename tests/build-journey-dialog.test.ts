import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import {showBuildJourney} from '../src/game/BuildJourneyDialog';
import type {DetailDialog} from '../src/game/DetailDialog';
import {buildJourneyPlan} from '../harness/fixtures/build-journey';
import {r2CreateJoker} from '../src/domain/r2Run';
import type {ExperienceCard} from '../src/game/JokerExperience';
beforeEach(()=>vi.stubGlobal('document',{querySelector:()=>null}));afterEach(()=>vi.unstubAllGlobals());
function previews(s:ReturnType<typeof buildJourneyPlan>){const open=vi.fn();showBuildJourney({open} as unknown as DetailDialog,s,{tools:()=>{},tool:()=>{},source:()=>{},deck:()=>{},continue:()=>{},continueLabel:'继续',ready:true},true);return (open.mock.calls[0][3] as {cards:ExperienceCard[]}).cards;}
it('three unselected previews never pass the first unrelated stock off as a matching route example',()=>{
 const s=buildJourneyPlan(true);s.shop!.offers=[{offerId:'actual/b10',definitionId:'b10',price:4,consumed:false}];const before=JSON.stringify(s),cards=previews(s);
 expect(cards[0].body).toContain('现货');expect(cards[0].body).toContain('路线直接条件');
 for(const card of cards.slice(1)){expect(card.body).not.toContain('现货：练对子');expect(card.body).toContain('暂无');expect(card.body).toContain('示意');}
 expect(JSON.stringify(s)).toBe(before);
});
it('a genuine all-route support can be shown but is explicitly labeled general support',()=>{
 const s=buildJourneyPlan(true);s.shop!.offers=[{offerId:'actual/d03',definitionId:'d03',price:4,consumed:false}];for(const card of previews(s)){expect(card.body).toContain('等得住');expect(card.body).toContain('通用辅助');}
});
it('carried growth is a held support example, never a matching zero-growth same-name offer',()=>{
 const s=buildJourneyPlan(true),j=r2CreateJoker('b10','carried',4,undefined,s);j.growth.heat={n:'20',d:'1'};s.jokers=[j];s.shop!.offers=[{offerId:'fresh/b10',definitionId:'b10',price:4,consumed:false}];
 for(const card of previews(s).slice(1)){expect(card.body).toContain('持有');expect(card.body).toContain('通用辅助');expect(card.body).toContain('暂无');}
});
