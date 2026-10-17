import {expect,it} from 'vitest';
import {createRun} from '../src/domain/run';
import {newRunIdentity} from '../src/game/RunLaunch';
import {workshopChoices,workshopIntent} from '../src/game/WorkshopModel';
import {shopLayout,shopPortraitHeader,shopEmptyPortrait} from '../src/game/ShopLayout';
import {intersects} from '../src/game/layout';
import {workshopLayoutFixture} from '../harness/fixtures/workshop-layout';
const fixture=()=>createRun({rulesVersion:'r2',runId:'workshop-goals',seed:'workshop-goals',characterId:'laohuan',r2Identity:newRunIdentity('laohuan','group'),openingRoute:'group'});
it('controlled browser samples pass the unchanged strict checkpoint validator',()=>{for(const n of [0,5])for(const duplicate of [false,true])expect(workshopLayoutFixture(n,duplicate).state.jokers).toHaveLength(n);});
it('expanded real four-card stock remains valid for the native paging supplement',()=>{expect(workshopLayoutFixture(5,false,true).state.shop!.offers).toHaveLength(4);});
it('projects supported shifts, true A/2 limits and real suits without mutating or selecting cards',()=>{
 const run=fixture(),before=structuredClone(run);
 expect(workshopIntent(run,'T08',{rank:8})).toMatchObject({intent:{filter:{rank:8},label:'8 → 9'},count:4});
 expect(workshopIntent(run,'T08',{rank:13}).intent.label).toBe('K → A');
 expect(workshopIntent(run,'T08',{rank:14}).count).toBe(0);
 expect(workshopIntent(run,'T09',{rank:2}).reason).toBeTruthy();
 expect(workshopIntent(run,'T03',{suit:'hearts'}).count).toBe(0);
 expect(workshopIntent(run,'T03',{suit:'spades'}).count).toBe(13);
 expect(run).toEqual(before);
});
it('retains actual duplicate-offer price and unavailable shared quota from the domain projection',()=>{
 const run=fixture();run.gold=40;run.shop!.toolOffers[0].definitionId='T08';run.shop!.toolOffers[0].price=7;
 const duplicate=workshopChoices(run).find(r=>r.id==='T08')!;expect(duplicate.price).toBe(7);expect(duplicate.duplicate?.offerId).toBe(run.shop!.toolOffers[0].offerId);
 run.shop!.basicChoice!.purchase={definitionId:'T11',commandId:'used',paidPrice:2,seq:run.commandSeq};
 expect(workshopChoices(run).filter(r=>!r.duplicate).every(r=>!!r.reason)).toBe(true);
});
it('keeps four PC consumption regions and the large lower-right entry separate at empty and full ownership',()=>{
 for(const [w,h] of [[1000,768],[1280,720],[1366,768],[1912,954]])for(const n of [0,5]){
  const p=shopLayout(w,h,8,0,3,false,false,0,0,n),pc=p.pc!;expect(pc).toBeTruthy();
  const regions=[...pc.jokerOffers,pc.toolOffers,pc.workshop,pc.itemOffers];
  for(const [i,b] of regions.entries()){for(const next of regions.slice(i+1))expect(intersects(b,next)).toBe(false);expect(intersects(b,p.play)).toBe(false);expect(intersects(b,p.reroll)).toBe(false);}
  expect(p.play.width).toBeGreaterThanOrEqual(220);expect(p.play.y).toBeGreaterThan(pc.workshop.y+pc.workshop.height);expect(p.reroll.y+p.reroll.height).toBeLessThanOrEqual(pc.shopPanel.y);
  if(!n)expect(pc.ownedRail.height).toBeLessThanOrEqual(56);
 }
});
it('reserves four mobile categories with independent compact inventory and refresh, and only bounded empty art',()=>{
 for(const [w,h] of [[320,568],[360,640],[390,740],[430,932]]){
  const p=shopLayout(w,h,12,0,3),header=shopPortraitHeader(p),controls=[header.purse,header.inventory,header.reroll];
  for(const [i,b] of controls.entries()){expect(b.x).toBeGreaterThanOrEqual(0);for(const next of controls.slice(i+1))expect(intersects(b,next)).toBe(false);expect(intersects(b,p.tabs)).toBe(false);}
  const art=shopEmptyPortrait(p);if(art){expect(art.y+art.height).toBeLessThan(p.reroll.y);expect(art.y).toBeGreaterThan(p.shelf[0].y+p.shelf[0].height+104);}
 }
});
