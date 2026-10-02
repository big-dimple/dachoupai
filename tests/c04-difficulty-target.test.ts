import {createHash} from 'node:crypto';
import {describe,expect,it,vi} from 'vitest';
import {SeededRng} from '../src/core/SeededRng';
import {drawR2Boss,r2StageSpec,type R2TourMode} from '../src/domain/r2Chapter';

// Independent adopted normal targets. Difficulty columns are literal final values.
const normalTargets=[
  ['400','480'],['600','720'],['800','960'],['1000','1200'],['1500','1800'],['2000','2400'],
  ['2400','2880'],['3600','4320'],['4800','5760'],['5600','6720'],['8400','10080'],['11200','13440'],
  ['13000','15600'],['19500','23400'],['26000','31200'],['30000','36000'],['45000','54000'],['60000','72000'],
  ['70000','84000'],['105000','126000'],['140000','168000'],['160000','192000'],['240000','288000'],['320000','384000'],
] as const;
const higherDifficulties=[1,2,3] as const;

describe('C04.1 pure difficulty targets without activating the v9 run',()=>{
  it('preserves all 24 D0 targets for omitted and explicit difficulty in either tour mode',()=>{
    for(const [index,[targetHeat]] of normalTargets.entries()){
      expect(r2StageSpec(index)?.targetHeat).toBe(targetHeat);
      for(const mode of ['normal','endless'] as const){
        expect(r2StageSpec(index,mode,0)?.targetHeat).toBe(targetHeat);
        expect(r2StageSpec(index,mode,0)).toEqual(r2StageSpec(index,mode));
      }
    }
  });
  it.each(higherDifficulties)('applies one final 6/5 multiplier to every normal target at D%i',difficulty=>{
    for(const [index,[,targetHeat]] of normalTargets.entries()){
      expect(r2StageSpec(index,'normal',difficulty)?.targetHeat,`stage ${index}`).toBe(targetHeat);
      expect(r2StageSpec(index,'endless',difficulty)).toEqual(r2StageSpec(index,'normal',difficulty));
    }
  });
  it.each([
    [24,'384000','460800'],[25,'576000','691200'],[26,'768000','921600'],
    [27,'921600','1105920'],[28,'1382400','1658880'],[29,'1843200','2211840'],
  ] as const)('keeps chapter 9/10 stage %i exact at every difficulty',(index,d0,higher)=>{
    expect(r2StageSpec(index,'endless',0)?.targetHeat).toBe(d0);
    for(const difficulty of higherDifficulties)expect(r2StageSpec(index,'endless',difficulty)).toEqual({
      index,name:`第 ${Math.floor(index/3)+1} 章 · ${['暖场','正场','压轴'][index%3]}`,
      intro:'打到目标热度即可过场，出牌和弃牌次数每场补满。',targetHeat:higher,
    });
  });
  // Python Fraction oracle: these exact final ceilings differ from scaling the already-ceiled D0 target.
  it.each([
    [39,'30576477','36691772'],[41,'61152953','73383543'],[44,'146767086','176120503'],
    [118,'352347323194959487','422816787833951384'],
    [297,'15259988984583130168017981854799618815344','18311986781499756201621578225759542578412'],
  ] as const)('rounds only once, after chapter, stage and difficulty fractions at stage %i',(index,d0,higher)=>{
    expect(r2StageSpec(index,'endless',0)?.targetHeat).toBe(d0);
    for(const difficulty of higherDifficulties)expect(r2StageSpec(index,'endless',difficulty)?.targetHeat).toBe(higher);
  });
  // Full-value SHA-256 from an offline Python Fraction oracle, including the final supported Boss target.
  it.each([
    [32295,'a2d5885c15237b930cb15ec3d2e183a82c581393765cb2b575e233e0c46fc601'],
    [32296,'de4300d89b7c9d74fe2c2e85b5d44074dab315127ede0c1f79987827ce532dd2'],
    [32297,'80ec31127d66eb66b16310f7b33d70cc03be0d010738dd18501892d1abc423ea'],
  ] as const)('retains an exact finite 4096-digit D1–D3 target at stage %i',(index,digest)=>{
    for(const difficulty of higherDifficulties){
      const target=r2StageSpec(index,'endless',difficulty)?.targetHeat;
      expect(target).toHaveLength(4096);
      expect(createHash('sha256').update(target!).digest('hex')).toBe(digest);
    }
  });
  it('does not expose stage 24 or later through normal mode at any difficulty',()=>{
    for(const difficulty of [0,...higherDifficulties])for(const index of [24,25,26,27,32297]){
      expect(r2StageSpec(index,'normal',difficulty)).toBeUndefined();
    }
  });
  it('rejects invalid numeric and coercible difficulty values rather than silently using D0',()=>{
    const invalid=[-1,4,1.5,Number.NaN,Number.POSITIVE_INFINITY,Number.NEGATIVE_INFINITY,Number.MAX_SAFE_INTEGER,
      '0','D1','',null,true,[],{},new Number(1)];
    for(const difficulty of invalid)for(const mode of ['normal','endless'] as const){
      expect(r2StageSpec(0,mode,difficulty as number),`${mode}: ${String(difficulty)}`).toBeUndefined();
    }
  });
  it('rejects unsafe stage indices, unsupported chapters and unknown tour modes at all difficulties',()=>{
    for(const difficulty of [0,...higherDifficulties]){
      for(const index of [-1,1.5,Number.NaN,Number.POSITIVE_INFINITY,Number.NEGATIVE_INFINITY,
        Number.MAX_SAFE_INTEGER,32298,32299,32300])expect(r2StageSpec(index,'endless',difficulty)).toBeUndefined();
      for(const mode of ['invalid','',null,1])expect(r2StageSpec(0,mode as R2TourMode,difficulty)).toBeUndefined();
    }
  });
  it('consumes no rule randomness and preserves the existing default Boss draw cursor',()=>{
    const zero={algorithm:'fnv1a-mulberry32-v1',state:0} as const;
    const rng=SeededRng.restore(zero),next=vi.spyOn(SeededRng.prototype,'next');
    try{
      for(const difficulty of [0,...higherDifficulties])for(const index of [0,23,24,39,297,32297]){
        r2StageSpec(index,'endless',difficulty);
      }
      expect(next).not.toHaveBeenCalled();expect(rng.snapshot()).toEqual(zero);
      expect(drawR2Boss(rng,[])).toEqual({definitionId:'B02',disabledSuit:null});
      expect(next).toHaveBeenCalledTimes(1);
      expect(rng.snapshot()).toEqual({algorithm:'fnv1a-mulberry32-v1',state:1831565813});
    }finally{next.mockRestore();}
  });
});
