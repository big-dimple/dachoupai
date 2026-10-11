import {expect,it} from 'vitest';
import {newRunIdentity} from '../src/game/RunLaunch';
import {r2JokerDefinitionsFor} from '../src/domain/r2ContentProfiles';
import {jokerMemoryAbility,publicJokerMemoryContext} from '../src/game/JokerMemory';
import {R2_PUBLISHED_CONTENT} from '../src/domain/r2PublishedContent';

const identity=newRunIdentity('erxiang','straight');
const context=publicJokerMemoryContext({phase:'shop',gold:0,stage:null,lastTrace:null,shop:null},{hand:[],scoringLimited:false,deckSize:52,jokerSlots:5,jokerCount:0});
const definitions=r2JokerDefinitionsFor(identity);
const copy=(id:string)=>jokerMemoryAbility(definitions.find(d=>d.id===id)!,undefined,context).plain!;

it('current a03 shelf/detail main agrees with its first active card rule and retains legal retriggers',()=>{
 const p=copy('a03');
 expect(p.line).toBe('除高牌/对子外的首张有效计分牌 → 热度+15');
 expect(p.tile).toBe('非高牌/对子\n首计分牌\n热度+15');
 expect(p.essential).toContain('合法重触发时可再次获得');
 expect(p.details).toContain('首张有效计分牌的热度 +15');
 expect(p.line).not.toMatch(/每张|每手一次/);
});

it('per-card arithmetic applies only to matching effective scoring cards',()=>{
 for(const id of ['tiesuanpan','a08','b02','b05','c02','c03']){
  const p=copy(id);expect(p.line).toContain('每张符合条件的有效计分牌');
  expect(p.tile).toContain('每张匹配牌');
  expect(p.line).not.toContain('每手一次');
 }
 expect(copy('tiesuanpan').line).toContain('J/Q/K/A计分');
 expect(copy('c02').line).toContain('♥/♦计分');
 expect(copy('b05').line).toContain('同打≥3张同点牌');
});

it('held first-match limits keep one versus several recipients explicit',()=>{
 const first=copy('a10');expect(first.line).toContain('前1张 → 该有效保留牌倍率×1.25');
 expect(first.tile).not.toContain('每张');
 for(const id of ['d01','d02','b11','c10','d08']){
  const p=copy(id);expect(p.line).toContain('每张符合条件的有效保留牌');
  expect(p.tile).toContain('每张匹配留牌');
 }
});

it('joker-score arithmetic is once per qualified hand rather than per matching card',()=>{
 for(const id of ['pengci','c04','e08','f04']){
  const p=copy(id);expect(p.line).toContain('每手一次，');expect(p.tile).toContain('每手一次');
  expect(p.line).not.toContain('每张');
 }
 expect(copy('c04').line).toContain('热度+50');
 expect(copy('e08').line).toContain('倍率×1.8');
});

it('published a03 retains the single-play rule and original +35 amount',()=>{
 const old=R2_PUBLISHED_CONTENT.v11;
 const d=r2JokerDefinitionsFor({contentVersion:old.version,contentHash:old.hash}).find(d=>d.id==='a03')!;
 const p=jokerMemoryAbility(d,undefined,context).plain!;
 expect(p.line).toBe('只出1张 → 每手一次，热度+35');
 expect(p.line).not.toContain('+15');
});
