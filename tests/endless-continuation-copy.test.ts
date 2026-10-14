import {describe,expect,it} from 'vitest';
import {endlessContinuationCopy} from '../src/game/EndlessContinuationCopy';
import {getR2Stage,R2_CONTENT_VERSION,R2_CONTENT_HASH,R2_LEGACY_CONTENT_VERSION,R2_LEGACY_CONTENT_HASH} from '../src/domain/r2Run';
import {R2_BOUNDED_CLEAR_VERSION,R2_BOUNDED_CLEAR_HASH,R2_ROUTE_GROWTH_VERSION,R2_ROUTE_GROWTH_HASH,R2_ACTIVE_MULT_VERSION,R2_ACTIVE_MULT_HASH,R2_CORE_BUILD_VERSION,R2_CORE_BUILD_HASH} from '../src/domain/r2GroupUpgrade';

const bounded={contentVersion:R2_BOUNDED_CLEAR_VERSION,contentHash:R2_BOUNDED_CLEAR_HASH};
const historical=[
  {contentVersion:R2_LEGACY_CONTENT_VERSION,contentHash:R2_LEGACY_CONTENT_HASH},
  {contentVersion:R2_CONTENT_VERSION,contentHash:R2_CONTENT_HASH},
  {contentVersion:R2_ROUTE_GROWTH_VERSION,contentHash:R2_ROUTE_GROWTH_HASH},
  {contentVersion:R2_ACTIVE_MULT_VERSION,contentHash:R2_ACTIVE_MULT_HASH},
];

describe('endless confirmation reads the actual run target contract',()=>{
  it('shows the core-build policy matching the actual saved-identity target lookup',()=>{
    const core={contentVersion:R2_CORE_BUILD_VERSION,contentHash:R2_CORE_BUILD_HASH};
    const before=structuredClone(core),copy=endlessContinuationCopy(Object.freeze(core));
    expect(copy).toContain('同场次目标按 1.35 倍递增，最终向上取整');
    expect(copy).not.toContain('1.1');expect(core).toEqual(before);
    expect(getR2Stage(21,'normal',0,core)?.targetHeat).toBe('20475');
    expect(getR2Stage(24,'endless',0,core)?.targetHeat).toBe('27642');
    expect(getR2Stage(25,'endless',0,core)?.targetHeat).toBe('41462');
    expect(getR2Stage(26,'endless',0,core)?.targetHeat).toBe('55283');
  });
  it('shows bounded growth and final rounding without changing its input',()=>{
    const before=structuredClone(bounded),copy=endlessContinuationCopy(Object.freeze(bounded));
    expect(copy).toContain('同场次目标按 1.1 倍递增，最终向上取整');
    expect(copy).not.toContain('2.4');expect(bounded).toEqual(before);
    expect(copy).toContain('保留当前牌组、大丑牌、成长、道具与金币，从第九章商店接续');
    expect(copy).toContain('取消可留在胜利页');
  });
  it.each(historical)('keeps 2.4 for saved $contentVersion',identity=>{
    const copy=endlessContinuationCopy(identity);
    expect(copy).toContain('同场次目标按 2.4 倍递增，最终向上取整');
    expect(copy).not.toContain('1.1');
    expect(getR2Stage(21,'normal',0,identity)?.targetHeat).toBe('160000');
    expect(getR2Stage(24,'endless',0,identity)?.targetHeat).toBe('384000');
  });
  it.each([
    {...bounded,contentHash:R2_CONTENT_HASH},
    {...bounded,contentVersion:R2_CONTENT_VERSION},
    {},
  ])('uses the same complete-identity boundary as target lookup',identity=>{
    expect(endlessContinuationCopy(identity)).toContain('目标按 2.4 倍');
    expect(getR2Stage(24,'endless',0,identity)?.targetHeat).toBe('384000');
  });
  // Independent exact values include stage/difficulty factors before the final ceiling.
  it.each([
    [0,['20475','30713','40950','22523','33784','45045','24775','37163','49550']],
    [1,['24570','36855','49140','27027','40541','54054','29730','44595','59460']],
    [2,['24570','36855','49140','27027','40541','54054','29730','44595','59460']],
    [3,['24570','36855','49140','27027','40541','54054','29730','44595','59460']],
  ] as const)('matches bounded C8–C10 targets at D%i', (difficulty,targets)=>{
    expect(endlessContinuationCopy(bounded)).toContain('目标按 1.1 倍');
    targets.forEach((target,offset)=>expect(getR2Stage(21+offset,offset<3?'normal':'endless',difficulty,bounded)?.targetHeat).toBe(target));
    // Multiplying the already rounded C9 warm-up would incorrectly produce 24776.
    expect(getR2Stage(27,'endless',0,bounded)?.targetHeat).toBe('24775');
  });
});
