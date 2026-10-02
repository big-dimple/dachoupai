import {describe,expect,it} from 'vitest';
import {SeededRng} from '../src/core/SeededRng';
import {R2_AVAILABLE_CHAPTERS,R2_BOSSES,R2_TARGETS,drawR2Boss,r2StageSpec,r2ChapterBossIds} from '../src/domain/r2Chapter';
import {R2_CONTENT_HASH,R2_CONTENT_VERSION,R2_TARGETS as legacyTargets,getR2Stage} from '../src/domain/r2Run';

// Independent adopted targets, including both ends of the 24-stage plan.
const stages=[
  [0,'第 1 章 · 暖场','400'],[1,'第 1 章 · 正场','600'],[2,'第 1 章 · 压轴','800'],
  [3,'第 2 章 · 暖场','1000'],[4,'第 2 章 · 正场','1500'],[5,'第 2 章 · 压轴','2000'],
  [6,'第 3 章 · 暖场','2400'],[7,'第 3 章 · 正场','3600'],[8,'第 3 章 · 压轴','4800'],
  [9,'第 4 章 · 暖场','5600'],[10,'第 4 章 · 正场','8400'],[11,'第 4 章 · 压轴','11200'],
  [12,'第 5 章 · 暖场','13000'],[13,'第 5 章 · 正场','19500'],[14,'第 5 章 · 压轴','26000'],
  [15,'第 6 章 · 暖场','30000'],[16,'第 6 章 · 正场','45000'],[17,'第 6 章 · 压轴','60000'],
  [18,'第 7 章 · 暖场','70000'],[19,'第 7 章 · 正场','105000'],[20,'第 7 章 · 压轴','140000'],
  [21,'第 8 章 · 暖场','160000'],[22,'第 8 章 · 正场','240000'],[23,'第 8 章 · 压轴','320000'],
] as const;
const basic=['B01','B02','B03','B04'];
const middle=['B01','B02','B03','B04','B05','B06','B07','B08','B09','B10','B11','B12'];
const full=['B01','B02','B03','B04','B05','B06','B07','B08','B09','B10','B11','B12','B13','B14','B15','B16'];

describe('C03.1 pure eight-chapter specifications',()=>{
  it.each(stages)('plans stage %i as %s with target %s', (index,name,targetHeat)=>{
    expect(r2StageSpec(index)).toEqual({index,name,targetHeat,
      intro:'打到目标热度即可过场，出牌和弃牌次数每场补满。'});
  });
  it.each([-1,24,25,1.5,Number.NaN,Number.POSITIVE_INFINITY,Number.NEGATIVE_INFINITY,Number.MAX_SAFE_INTEGER])
    ('rejects an invalid planned stage index %s',index=>expect(r2StageSpec(index)).toBeUndefined());
  it('keeps the adopted bases and the existing import as one configuration',()=>{
    expect(R2_TARGETS).toEqual([400,1000,2400,5600,13000,30000,70000,160000]);
    expect(legacyTargets).toBe(R2_TARGETS);
  });
  it.each([[1,basic],[2,basic],[3,middle],[6,middle],[7,full],[8,full]] as const)
    ('declares only the nominal chapter %i Boss IDs', (chapter,ids)=>expect(r2ChapterBossIds(chapter)).toEqual(ids));
  it.each([-1,0,9,2.5,Number.NaN,Number.POSITIVE_INFINITY])
    ('rejects an invalid normal chapter %s',chapter=>expect(r2ChapterBossIds(chapter)).toBeUndefined());
});

describe('C03.1 versioned eight-chapter runtime contract',()=>{
  it('exposes all adopted normal stage specs and rejects an out-of-range next stage',()=>{
    expect(R2_AVAILABLE_CHAPTERS).toBe(8);
    expect(R2_BOSSES.map(boss=>boss.id)).toEqual(full);
    for(const [index,name,targetHeat] of stages)expect(getR2Stage(index)).toEqual({index,name,targetHeat,
      intro:'打到目标热度即可过场，出牌和弃牌次数每场补满。'});
    expect(getR2Stage(24)).toBeUndefined();
  });
  it('separates the explicit C03 new game from the published C02 content partition',()=>{
    expect(R2_CONTENT_VERSION).toBe('quality-r2-content-v8');
    expect(R2_CONTENT_HASH).toBe('json-fnv-v1:d49390df655bb6d3');
  });
  it.each([
    {seen:[],boss:{definitionId:'B02',disabledSuit:null},cursor:1831565813},
    {seen:['B01','B02'],boss:{definitionId:'B03',disabledSuit:'spades'},cursor:3663131626},
  ])('keeps the existing four-Boss draw vector for $seen',({seen,boss,cursor})=>{
    const rng=SeededRng.restore({algorithm:'fnv1a-mulberry32-v1',state:0});
    expect(drawR2Boss(rng,seen)).toEqual(boss);
    expect(rng.snapshot()).toEqual({algorithm:'fnv1a-mulberry32-v1',state:cursor});
  });
});
