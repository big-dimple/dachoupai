import {it,expect} from 'vitest';
import {catalogFacts,queryCatalog,type CatalogQuery} from '../src/game/Catalog';
import {growthPlan,firstGrowthIds} from '../harness/fixtures/growth-opportunity';
import {r2CreateJoker} from '../src/domain/r2Run';
import {applyCommand,createRun} from '../src/domain/run';
import {newRunIdentity} from '../src/game/RunLaunch';
const query:CatalogQuery={name:'',kind:'',use:'',source:''};
const one=(s:ReturnType<typeof growthPlan>|undefined,id:string)=>catalogFacts(s).entries.find(e=>e.id===id)!;
it('offers four public rule categories without creating a run or promising a collection ledger',()=>{
 const f=catalogFacts();expect(f.identity).toEqual(newRunIdentity('erxiang','group'));expect(f.label).toBe('当前新局规则资料');
 expect(new Set(f.entries.map(e=>e.kind))).toEqual(new Set(['joker','tool','item','hand']));expect(f.entries.filter(e=>e.kind==='joker')).toHaveLength(72);expect(f.entries.filter(e=>e.kind==='hand')).toHaveLength(12);
 for(const e of f.entries){expect(e.sources).toEqual([]);expect(e.current).toContain('没有当前保存局');expect(e.current).not.toMatch(/现存|已见|未见/);}
 expect(new Set(f.entries.map(e=>e.key)).size).toBe(f.entries.length);
});
it('name search and intersecting purpose/source/category filters return an honest empty result',()=>{
 const s=growthPlan('d03'),f=catalogFacts(s),held=one(s,'d03');
 expect(queryCatalog(f.entries,{...query,name:'  '+held.name+' '})).toEqual([held]);
 expect(queryCatalog(f.entries,{...query,name:'不存在的名字'})).toEqual([]);
 expect(queryCatalog(f.entries,{...query,name:'保存'})).not.toContainEqual(held);
 expect(queryCatalog(f.entries,{...query,kind:'joker',use:'成长',source:'持有'})).toEqual([held]);
 expect(queryCatalog(f.entries,{...query,kind:'tool',source:'持有'})).toEqual([]);
 expect(queryCatalog([{...held,name:'ＡＢＣ'}],{...query,name:'abc'})).toHaveLength(1);
});
it('same definition uses its saved identity, while actual growth stays distinct from general rules',()=>{
 const old=growthPlan('d03',true),now=growthPlan('d03');
 expect(one(old,'a06').rules).not.toEqual(one(now,'a06').rules);
 now.jokers=[r2CreateJoker('b10','owned/b10',6,'none',now)];now.jokers[0].growth.heat={n:'20',d:'1'};
 const e=one(now,'b10');expect(e.current).toContain('20');expect(e.current).toContain('实际买价 6');expect(e.sources).toContain('持有');expect(e.rules).not.toContain('现存');
 expect(one(now,'a06').current).not.toContain('现存');
 const bad=structuredClone(now);bad.contentHash='bad';expect(()=>catalogFacts(bad)).toThrow();
});
it('current shelf requires the shop phase and an unconsumed offer',()=>{
 const s=createRun({seed:'catalog/shelf',runId:'catalog/shelf',characterId:'erxiang',rulesVersion:'r2',r2Profile:'group-upgrade-v1'}),id=s.shop!.offers[0].definitionId;
 expect(one(s,id).sources).toContain('现货');for(const o of s.shop!.offers)o.consumed=true;expect(one(s,id).sources).not.toContain('现货');
 for(const o of s.shop!.offers)o.consumed=false;s.phase='await-input';expect(one(s,id).sources).not.toContain('现货');
});
it('last-hand sources require actual matching source events, rather than every trace snapshot',()=>{
 const s=growthPlan('d03'),r=applyCommand(s,{runId:s.runId,commandId:s.runId+'/command/'+(s.commandSeq+1),expectedSeq:s.commandSeq,action:{type:'PlayHand',selectedIds:firstGrowthIds}});expect(r.ok).toBe(true);if(!r.ok)return;
 expect(one(r.state,'d03').sources).toContain('上手来源');expect(one(r.state,r.state.lastTrace!.handType).sources).toContain('上手来源');
 const next=structuredClone(r.state);next.lastTrace!.events=[];expect(one(next,'d03').sources).not.toContain('上手来源');
 next.lastTrace!.events=structuredClone(r.state.lastTrace!.events);next.lastTrace!.sourceJokers=[];expect(one(next,'d03').sources).not.toContain('上手来源');
});
it('saved tool counts, long-term ownership and hand levels are explicit, without predicting scores',()=>{
 const s=growthPlan('d03'),f=catalogFacts(),tool=f.entries.find(e=>e.kind==='tool')!,item=f.entries.find(e=>e.kind==='item')!;
 s.consumables=[{instanceId:'c/1',definitionId:tool.id},{instanceId:'c/2',definitionId:tool.id}];s.longTermItems=[item.id];s.handLevels.straight=5;
 expect(one(s,tool.id).current).toContain('2 件');expect(one(s,item.id).sources).toContain('持有');expect(one(s,'straight').current).toContain('Lv5');expect(one(s,'straight').rules).toContain('基础倍率 6');expect(one(s,'flush').current).toContain('Lv1规则参考');
});
it('querying cannot mutate the checkpoint or use hidden draw order and RNG',()=>{
 const s=growthPlan('d03'),before=structuredClone(s),facts=catalogFacts(s);queryCatalog(facts.entries,{...query,use:'成长'});expect(s).toEqual(before);
 const other=structuredClone(s);other.drawPile.reverse();for(const rng of Object.values(other.rng))rng.state=(rng.state+19)>>>0;expect(catalogFacts(other)).toEqual(facts);
});
it('purpose tags follow actual identity operations, including rescue and permanent resource rewards',()=>{
 const current=growthPlan('d03'),legacy=growthPlan('d03',true);
 for(const id of ['a06','c05','e11','f12'])expect(one(current,id).uses).toContain('成长');
 expect(one(legacy,'a06').uses).not.toContain('成长');expect(one(current,'U12').uses).toContain('资源');
 expect(one(current,'U03').uses).toContain('资源');expect(one(current,'f07').uses).toContain('资源');
});
