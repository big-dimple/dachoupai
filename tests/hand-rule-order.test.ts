import {describe,it,expect} from 'vitest';
import {handRuleReference,handScoringOrder} from '../src/game/HandRuleReference';
import {newRunIdentity} from '../src/game/RunLaunch';
import {R2_RULESETS} from '../src/domain/r2Run';
import {isR2ActiveMultTiming} from '../src/domain/r2GroupUpgrade';
import {makeCheckpoint,readCheckpoint} from '../src/application/checkpoint';
import {activeRunFixture,routeIdentity} from './fixtures/p1a-active-mult';
import {touyeFixture,touyeBet,touyeSend} from './fixtures/touye-new-core';
import type {R2RunState} from '../src/domain/run';

describe('hand rule order follows saved identity and actual character events',()=>{
  for(const hero of ['touye','xiemu','azao'] as const)for(const current of [true,false])it(hero+' '+(current?'current late active':'frozen early active'),()=>{
    const identity=current?newRunIdentity(hero,'group'):routeIdentity;
    let state:R2RunState;
    if(hero==='touye'){const f=touyeFixture(current?'mature-win':'unformed-win',{identity,jokers:['e03']});state=touyeSend(touyeSend(f.state,touyeBet(f.state,f.discard,f.target)),{type:'PlayHand',selectedIds:f.play});}
    else {const f=activeRunFixture(hero,60,0,identity);state=touyeSend(f.state,f.action);}
    expect(readCheckpoint(makeCheckpoint(state,[])).ok).toBe(true);
    const before=JSON.stringify(state),trace=state.lastTrace!,role=trace.events.findIndex(e=>e.sourceType==='character'&&e.phase==='characterScore'),whole=trace.events.findIndex(e=>e.phase==='jokerScore'),route=trace.events.findIndex(e=>e.phase==='routeGrowth');
    expect(role).toBeGreaterThan(-1);expect(whole).toBeGreaterThan(-1);expect(route).toBeGreaterThan(-1);
    const copy=handRuleReference(state.handLevels,{},state),order=handScoringOrder(state);
    if(current){expect(role).toBeGreaterThan(whole);expect(role).toBeGreaterThan(route);const label=hero==='touye'?'跃马冲阵结果倍率':hero==='xiemu'?'花蕊夫人 · 赏赐倍率':'文成公主 · 和亲倍率';expect(order.indexOf(label)).toBeGreaterThan(order.indexOf('整手唐宋牌'));expect(order.indexOf(label)).toBeGreaterThan(order.indexOf('本手相关族加成'));if(hero==='touye')expect(order).toContain('普通加成与押约结果互斥');}
    else {expect(role).toBeLessThan(whole);expect(role).toBeLessThan(route);expect(order.indexOf('角色计分')).toBeLessThan(order.indexOf('整手唐宋牌'));expect(order).not.toMatch(/跃马冲阵结果倍率|花蕊夫人 · 赏赐倍率|文成公主 · 和亲倍率/);}
    expect(copy).toContain(order);expect(JSON.stringify(state)).toBe(before);
  });
  it('recognizes both version and hash for every saved timing identity',()=>{
    for(const profile of R2_RULESETS){const identity={...profile,characterId:'xiemu' as const},order=handScoringOrder(identity);expect(order.includes('花蕊夫人 · 赏赐倍率')).toBe(isR2ActiveMultTiming(identity));}
    const identity={...newRunIdentity('xiemu'),characterId:'xiemu' as const,contentHash:routeIdentity.contentHash};expect(handScoringOrder(identity)).not.toContain('花蕊夫人 · 赏赐倍率');expect(handScoringOrder(identity)).toContain('以该局已保存身份和计分记录为准');
  });
  it('keeps the three historical Amo timing contracts distinct and never adds solo ×3 to assist saves',()=>{
    const profile=(timing:'before-joker'|'after-joker'|'assist-v1')=>({...R2_RULESETS.find(p=>p.amoScoreTiming===timing)!,characterId:'amo' as const});
    const before=handScoringOrder(profile('before-joker')),after=handScoringOrder(profile('after-joker')),assist=handScoringOrder(profile('assist-v1'));
    expect(before.indexOf('苏轼单张×3')).toBeLessThan(before.indexOf('整手唐宋牌'));expect(after.indexOf('苏轼单张×3')).toBeGreaterThan(after.indexOf('整手唐宋牌'));expect(assist).toContain('苏轼 · 余音袅袅倍率');expect(assist).not.toContain('苏轼单张×3');expect(assist).toContain('没有单张×3');
  });
  it('current Su Shi explains integer score ×4 after all ordinary scoring and excludes sacrificed held effects',()=>{
    const identity={...newRunIdentity('amo'),characterId:'amo' as const},order=handScoringOrder(identity),copy=handRuleReference({}, {},identity);
    expect(order.indexOf('苏轼 · 贬谪')).toBeGreaterThan(order.indexOf('本手相关族加成'));expect(order).toContain('弃掉的余牌不参与留手效果');
    expect(copy).toContain('先将正常得分向下取整');expect(copy).not.toContain('只向下取整一次');expect(copy).not.toMatch(/单张×3|副组/);
  });
  it('does not invent final role multipliers for current handoff/refill or missing identity',()=>{
    const erxiang=handScoringOrder({...newRunIdentity('erxiang'),characterId:'erxiang'}),laohuan=handScoringOrder({...newRunIdentity('laohuan'),characterId:'laohuan'});
    expect(erxiang).toContain('刘娥 · 垂帘听政在对应牌的首次普通点数步骤');expect(laohuan).toContain('补牌操作');for(const copy of [erxiang,laohuan,handScoringOrder()])expect(copy).not.toMatch(/跃马冲阵结果倍率|花蕊夫人 · 赏赐倍率|文成公主 · 和亲倍率|苏轼单张×3/);
  });
});
