import {createHash} from 'node:crypto';
import {describe,expect,it,vi} from 'vitest';
import {SeededRng} from '../src/core/SeededRng';
import {
  R2_ENDLESS_CONTRACT,R2_ENDLESS_MAX_CHAPTER,drawR2Boss,r2BossHistoryValid,r2ChapterBossIds,r2StageSpec,
  type R2TourMode,
} from '../src/domain/r2Chapter';

const full=['B01','B02','B03','B04','B05','B06','B07','B08','B09','B10','B11','B12','B13','B14','B15','B16'];
const zero={algorithm:'fnv1a-mulberry32-v1',state:0} as const;
const once={algorithm:'fnv1a-mulberry32-v1',state:1831565813} as const;
const twice={algorithm:'fnv1a-mulberry32-v1',state:3663131626} as const;
const normalTargets=[
  '400','600','800','1000','1500','2000','2400','3600','4800','5600','8400','11200',
  '13000','19500','26000','30000','45000','60000','70000','105000','140000','160000','240000','320000',
];

// Exact independent D30 values. No expected target is calculated from production helpers.
const endlessTargets=[
  [24,'384000'],[25,'576000'],[26,'768000'],[27,'921600'],[28,'1382400'],[29,'1843200'],
  [36,'12740199'],[37,'19110298'],[38,'25480397'],
  [39,'30576477'],[40,'45864715'],[41,'61152953'],
  [42,'73383543'],[43,'110075315'],[44,'146767086'],
  [117,'234898215463306325'],[118,'352347323194959487'],[119,'469796430926612649'],
  [297,'15259988984583130168017981854799618815344'],
  [298,'22889983476874695252026972782199428223015'],
  [299,'30519977969166260336035963709599237630687'],
] as const;

describe('C03.4 exact endless targets and finite mode boundaries',()=>{
  it('exports the finite target contract for versioned hashing',()=>{
    expect(R2_ENDLESS_MAX_CHAPTER).toBe(10766);
    expect(R2_ENDLESS_CONTRACT).toEqual({
      normalChapters:8,firstChapter:9,maximumChapter:10766,baseHeat:'160000',
      multiplier:{n:'12',d:'5'},stageMultipliers:[{n:'1',d:'1'},{n:'3',d:'2'},{n:'2',d:'1'}],
      rounding:'ceil-final-target',integerDigits:4096,bossPool:'B01-B16',
    });
  });
  it('keeps all 24 normal targets in default, explicit normal, and historical endless lookups',()=>{
    for(const [index,targetHeat] of normalTargets.entries()){
      expect(r2StageSpec(index)?.targetHeat).toBe(targetHeat);
      expect(r2StageSpec(index,'normal')).toEqual(r2StageSpec(index));
      expect(r2StageSpec(index,'endless')).toEqual(r2StageSpec(index));
    }
    expect(r2StageSpec(24)).toBeUndefined();expect(r2StageSpec(24,'normal')).toBeUndefined();
  });
  it.each(endlessTargets)('plans exact explicit endless stage %i as %s',(index,targetHeat)=>{
    expect(r2StageSpec(index,'endless')).toEqual({index,targetHeat,
      name:`第 ${Math.floor(index/3)+1} 章 · ${['暖场','正场','压轴'][index%3]}`,
      intro:'打到目标热度即可过场，出牌和弃牌次数每场补满。'});
  });
  // These full-value hashes were calculated offline with integer division, not Rational or r2StageSpec.
  it.each([
    [32295,'e99dfec23a2e771a00c43e0d1dbc93d2b1c59bb234f7f926515b0506138c4103'],
    [32296,'75e59e2d3599c079532764140d18e1e1cf9f95e6367e0cdd78d6a2dbf68383f9'],
    [32297,'6dbee8eacaaa1924355a3e83031d24ac4059cfd880386e780f662b7bc75babad'],
  ] as const)('retains the exact 4096-digit target at final supported stage %i',(index,digest)=>{
    const target=r2StageSpec(index,'endless')?.targetHeat;expect(target).toHaveLength(4096);
    expect(createHash('sha256').update(target!).digest('hex')).toBe(digest);
  });
  it.each([-1,32298,32299,32300,1.5,Number.NaN,Number.POSITIVE_INFINITY,Number.MAX_SAFE_INTEGER])
    ('rejects unsupported endless stage %s before arithmetic',index=>expect(r2StageSpec(index,'endless')).toBeUndefined());
  it.each(['invalid','',null,1])('rejects an unknown mode %s in every pure entry point',mode=>{
    const invalid=mode as R2TourMode;
    expect(r2StageSpec(0,invalid)).toBeUndefined();expect(r2ChapterBossIds(1,invalid)).toBeUndefined();
    expect(r2BossHistoryValid(['B01'],1,invalid)).toBe(false);
    const rng=SeededRng.restore(zero),next=vi.spyOn(rng,'next');
    expect(()=>drawR2Boss(rng,[],1,invalid)).toThrow('invalid-boss-chapter');
    expect(next).not.toHaveBeenCalled();expect(rng.snapshot()).toEqual(zero);
  });
});

describe('C03.4 chapter pools, no-repeat history and exhausted fallback',()=>{
  it.each([9,17,10766])('uses the ordered full pool only in explicit endless chapter %i',chapter=>{
    expect(r2ChapterBossIds(chapter,'endless')).toEqual(full);
    expect(r2ChapterBossIds(chapter)).toBeUndefined();expect(r2ChapterBossIds(chapter,'normal')).toBeUndefined();
  });
  it.each([0,10767,1.5,Number.NaN,Number.POSITIVE_INFINITY])
    ('rejects invalid endless chapter %s without drawing',chapter=>{
      expect(r2ChapterBossIds(chapter,'endless')).toBeUndefined();
      const rng=SeededRng.restore(zero),next=vi.spyOn(rng,'next');
      expect(()=>drawR2Boss(rng,[],chapter,'endless')).toThrow('invalid-boss-chapter');
      expect(next).not.toHaveBeenCalled();expect(rng.snapshot()).toEqual(zero);
    });
  it.each([
    {seen:full.slice(0,8),chapter:9,boss:'B11',suit:null,cursor:once},
    {seen:full,chapter:17,boss:'B05',suit:null,cursor:once},
    {seen:full.filter(id=>id!=='B03'),chapter:10766,boss:'B03',suit:'spades',cursor:twice},
  ])('selects $boss at explicit endless chapter $chapter with the exact cursor',({seen,chapter,boss,suit,cursor})=>{
    const before=[...seen],rng=SeededRng.restore(zero);
    expect(drawR2Boss(rng,seen,chapter,'endless')).toEqual({definitionId:boss,disabledSuit:suit});
    expect(rng.snapshot()).toEqual(cursor);expect(seen).toEqual(before);
  });
  it('maps all sixteen fallback intervals uniformly after the complete pool was seen',()=>{
    for(const [index,id] of full.entries()){
      const rng=SeededRng.restore(zero),next=vi.spyOn(rng,'next')
        .mockReturnValueOnce((index+0.5)/16).mockReturnValueOnce(0.5);
      expect(drawR2Boss(rng,full,17,'endless')).toEqual({definitionId:id,disabledSuit:id==='B03'?'clubs':null});
      expect(next).toHaveBeenCalledTimes(id==='B03'?2:1);
    }
  });
  it.each([
    {seen:full.slice(0,9),chapter:9},
    {seen:full,chapter:16},
    {seen:[...full,'B03'],chapter:17},
    {seen:[...full,...Array<string>(10750).fill('B05')],chapter:10766},
  ])('accepts complete explicit endless history at chapter $chapter',({seen,chapter})=>{
    expect(r2BossHistoryValid(seen,chapter,'endless')).toBe(true);
    expect(r2BossHistoryValid(seen,chapter)).toBe(false);
  });
  it.each([
    {label:'first-chapter late Boss',seen:['B13'],chapter:1},
    {label:'premature repeat',seen:[...full.slice(0,8),'B01'],chapter:9},
    {label:'history shorter than chapter',seen:full.slice(0,8),chapter:9},
    {label:'history longer than chapter',seen:full.slice(0,10),chapter:9},
    {label:'unknown repeated ID',seen:[...full,'B17'],chapter:17},
    {label:'beyond protected maximum',seen:[...full,...Array<string>(10751).fill('B05')],chapter:10767},
  ])('rejects $label without assuming an endless default',({seen,chapter})=>
    expect(r2BossHistoryValid(seen,chapter,'endless')).toBe(false));
  it('rejects an unknown seen ID before consuming either rule draw',()=>{
    const rng=SeededRng.restore(zero),next=vi.spyOn(rng,'next');
    expect(()=>drawR2Boss(rng,['B17'],9,'endless')).toThrow('invalid-boss-seen');
    expect(next).not.toHaveBeenCalled();expect(rng.snapshot()).toEqual(zero);
  });
  it.each([
    {seen:[],boss:'B02',suit:null,cursor:once},
    {seen:['B01','B02'],boss:'B03',suit:'spades',cursor:twice},
  ])('preserves the published default four-pool RNG vector for $seen',({seen,boss,suit,cursor})=>{
    const rng=SeededRng.restore(zero);
    expect(drawR2Boss(rng,seen)).toEqual({definitionId:boss,disabledSuit:suit});expect(rng.snapshot()).toEqual(cursor);
  });
});
