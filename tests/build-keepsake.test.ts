import {R2_TOOL_SUPPLY_VERSION,R2_TOOL_SUPPLY_HASH} from '../src/domain/r2GroupUpgrade';
import {expect,it} from 'vitest';
import {createRun} from '../src/domain/run';
import {r2CreateJoker} from '../src/domain/r2Run';
import {CHARACTER_IDS} from '../src/domain/characters';
import {newRunIdentity} from '../src/game/RunLaunch';
import {buildKeepsake} from '../src/game/BuildKeepsake';
import {buildTransitionPlan,journeySend} from '../harness/fixtures/build-journey';
it.each(CHARACTER_IDS)('%s uses its actual new identity and existing portrait without changing a state',id=>{
 const s=createRun({rulesVersion:'r2',openingRoute:'group',runId:'keepsake/'+id,seed:'keepsake',characterId:id,r2Identity:newRunIdentity(id,'group'),modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}}),before=JSON.stringify(s),p=buildKeepsake(s);
 expect(p.hero.url).toContain('/'+id+'.selection.webp');expect(p.hero.name).toBeTruthy();expect(p.hero.tip).toBeTruthy();expect(p.hero.modeNote).not.toContain('已发动');expect(JSON.stringify(s)).toBe(before);
 if(id==='erxiang'){expect(p.hero.tip).toContain('首次普通点数改加倍率');expect(p.hero.tip).toContain('每场一次');expect(p.hero.tip).not.toContain('重触');const old=createRun({rulesVersion:'r2',openingRoute:'group',runId:s.runId,seed:s.seed,characterId:id,r2Identity:{contentVersion:R2_TOOL_SUPPLY_VERSION,contentHash:R2_TOOL_SUPPLY_HASH},modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});expect(buildKeepsake(old).hero.tip).toContain('+1.5');}
});
it('a disabled role is named but never sold as a current benefit',()=>{
 const s=createRun({rulesVersion:'r2',openingRoute:'group',runId:'keepsake/disabled',seed:'challenge/q01/0',characterId:'azao',r2Identity:newRunIdentity('azao','group'),modeConfig:{mode:'challenge',difficulty:0,challengeId:'Q01',programsEnabled:false}});
 expect(buildKeepsake(s).hero.modeNote).toContain('停用');
});
it('real saved growth is separated from the just-scored hand and stays instance scoped',()=>{
 const p=buildTransitionPlan('straight');p.state.jokers[0].growth={};const ids=p.selected.slice(0,4);ids.forEach((id,i)=>{p.state.deckInstances.find(c=>c.id===id)!.rank=i<2?7:8;});
 const s=journeySend(p.state,{type:'PlayHand',selectedIds:ids}),before=JSON.stringify(s),g=buildKeepsake(s).growth[0];expect(g.metric).toContain('+10');expect(g.before).toBe('0');expect(g.after).toBe('10');expect(g.cause).toContain('两对');expect(g.read).toContain('实际读取 +0 热度');expect(JSON.stringify(s)).toBe(before);
 s.jokers[0].instanceId='new-instance';expect(buildKeepsake(s).growth[0].before).toBeUndefined();expect(buildKeepsake(s).growth[0].read).toBeUndefined();expect(buildKeepsake(s).growth[0].cause).toBe('从当前保存值继续培养');
 s.jokers=[];expect(buildKeepsake(s).growth).toEqual([]);
});
it('different held sources and zero growth remain visible without borrowing another key',()=>{
 const p=buildTransitionPlan('straight');p.state.jokers.push(r2CreateJoker('b03','other-growth',0,undefined,p.state));const before=JSON.stringify(p.state),rows=buildKeepsake(p.state).growth;
 expect(rows).toHaveLength(2);expect(rows.map(r=>r.instanceId)).toEqual(p.state.jokers.map(j=>j.instanceId));expect(rows[1].current).toBe('0');expect(JSON.stringify(p.state)).toBe(before);
});

it('actual coefficient reads show multiplication instead of inventing an additive gain',()=>{
 const p=buildTransitionPlan('straight');p.state.jokers=[r2CreateJoker('a06','coefficient',0,undefined,p.state)];
 const s=journeySend(p.state,{type:'PlayHand',selectedIds:p.selected}),g=buildKeepsake(s).growth[0];expect(g.read).toContain('实际读取 ×1.5 倍率');expect(g.read).not.toContain('+1.5');
});
