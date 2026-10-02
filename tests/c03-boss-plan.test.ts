import {describe,expect,it,vi} from 'vitest';
import {SeededRng} from '../src/core/SeededRng';
import type {PlayingCard} from '../src/cards/types';
import {
  R2_AVAILABLE_CHAPTERS,R2_BOSSES,R2_TARGETS,drawR2Boss,r2BossHistoryValid,r2BossPlanValid,
  r2ChapterBossIds,r2DisabledCards,r2OrdinarySuppression,r2BossText,
} from '../src/domain/r2Chapter';

const basic=['B01','B02','B03','B04'] as const;
const middle=['B01','B02','B03','B04','B05','B06','B07','B08','B09','B10','B11','B12'] as const;
const full=['B01','B02','B03','B04','B05','B06','B07','B08','B09','B10','B11','B12','B13','B14','B15','B16'] as const;
const zero={algorithm:'fnv1a-mulberry32-v1',state:0} as const;
const once={algorithm:'fnv1a-mulberry32-v1',state:1831565813} as const;
const twice={algorithm:'fnv1a-mulberry32-v1',state:3663131626} as const;

describe('C03 Boss definition and chapter boundaries',()=>{
  it.each([
    ['B01','贵宾场',['第一手','2']],['B02','低调点',['第4/5','普通点数']],
    ['B03','单色灯',['花色','失效']],['B04','素颜场',['J/Q/K','A']],
    ['B05','回音墙',['连续','基础热度','减半','首手']],
    ['B06','半边灯',['第2/4槽','计分','静态','经济']],
    ['B07','验票员',['弃牌','1金','无钱','拒绝']],
    ['B08','静场',['角色计分','押注','过关奖励']],
    ['B09','快板',['进场','-1','最低2']],['B10','小舞台',['进场','-2','最低5']],
    ['B11','谢客',['每次','-1','最低5','补牌']],
    ['B12','挑剔',['等级','基础热度','减半','增强']],
    ['B13','逆着来',['右到左','版次','其他时点']],
    ['B14','催场',['初始目标','5%','向上取整','不复利']],
    ['B15','逐个谢幕',['最左','实例','调序']],
    ['B16','不吃名气',['稀有','计分','静态','经济']],
  ] as const)('publishes %s %s with its finite rule and response',(id,name,fragments)=>{
    const definition=R2_BOSSES.find(boss=>boss.id===id);
    expect(definition?.name).toBe(name);
    for(const fragment of fragments)expect(definition?.rule).toContain(fragment);
    expect(definition?.response.length).toBeGreaterThan(8);
  });
  it('keeps sixteen stable definitions and the adopted eight-chapter targets',()=>{
    expect(R2_BOSSES.map(boss=>boss.id)).toEqual(full);
    expect(R2_TARGETS).toEqual([400,1000,2400,5600,13000,30000,70000,160000]);
    expect(R2_AVAILABLE_CHAPTERS).toBe(8);
  });
  it.each([[1,basic],[2,basic],[3,middle],[6,middle],[7,full],[8,full]] as const)
    ('uses the ordered chapter %i nominal pool',(chapter,pool)=>expect(r2ChapterBossIds(chapter)).toEqual(pool));
});

describe('C03 Boss selection and independent RNG vectors',()=>{
  // These two cursor-0 four-pool vectors are published C02 expectations.
  it.each([
    {chapter:undefined,seen:[],boss:'B02',suit:null,cursor:once},
    {chapter:undefined,seen:['B01','B02'],boss:'B03',suit:'spades',cursor:twice},
    {chapter:2,seen:[],boss:'B02',suit:null,cursor:once},
    {chapter:3,seen:[],boss:'B04',suit:null,cursor:once},
    {chapter:6,seen:[],boss:'B04',suit:null,cursor:once},
    {chapter:7,seen:[],boss:'B05',suit:null,cursor:once},
    {chapter:8,seen:[],boss:'B05',suit:null,cursor:once},
    {chapter:3,seen:[...basic],boss:'B07',suit:null,cursor:once},
    {chapter:8,seen:[...middle],boss:'B14',suit:null,cursor:once},
    {chapter:2,seen:['B01','B02','B04'],boss:'B03',suit:'spades',cursor:twice},
  ])('draws $boss at chapter $chapter after $seen with the exact cursor',({chapter,seen,boss,suit,cursor})=>{
    const rng=SeededRng.restore(zero),before=[...seen];
    expect(drawR2Boss(rng,seen,chapter)).toEqual({definitionId:boss,disabledSuit:suit});
    expect(rng.snapshot()).toEqual(cursor);expect(seen).toEqual(before);
  });
  it('ignores known out-of-chapter IDs and repeated set membership',()=>{
    const rng=SeededRng.restore(zero);
    expect(drawR2Boss(rng,Object.freeze(['B01','B01','B13','B16']),1)).toEqual({definitionId:'B02',disabledSuit:null});
    expect(rng.snapshot()).toEqual(once);
  });
  it.each([[1,basic,'B02'],[6,middle,'B04'],[8,full,'B05']] as const)
    ('falls back to the same chapter %i full pool only after exhaustion',(chapter,seen,boss)=>{
      const rng=SeededRng.restore(zero);
      expect(drawR2Boss(rng,seen,chapter)).toEqual({definitionId:boss,disabledSuit:null});
      expect(rng.snapshot()).toEqual(once);
    });
  it.each([[1,basic],[6,middle],[8,full]] as const)
    ('maps every equal-probability fallback interval to one chapter %i ID',(chapter,pool)=>{
      for(const [index,id] of pool.entries()){
        const rng=SeededRng.restore(zero);
        const next=vi.spyOn(rng,'next').mockReturnValueOnce((index+0.5)/pool.length).mockReturnValueOnce(0.5);
        expect(drawR2Boss(rng,pool,chapter)).toEqual({definitionId:id,disabledSuit:id==='B03'?'clubs':null});
        expect(next).toHaveBeenCalledTimes(id==='B03'?2:1);
      }
    });
  it.each([
    [0.125,'spades'],[0.375,'hearts'],[0.625,'clubs'],[0.875,'diamonds'],
  ] as const)('uses exactly one extra B03 parameter draw for %s -> %s',(value,suit)=>{
    const rng=SeededRng.restore(zero),next=vi.spyOn(rng,'next').mockReturnValueOnce(0.5).mockReturnValueOnce(value);
    expect(drawR2Boss(rng,['B01','B02','B04'],1)).toEqual({definitionId:'B03',disabledSuit:suit});
    expect(next).toHaveBeenCalledTimes(2);
  });
  it.each([-1,0,9,1.5,Number.NaN,Number.POSITIVE_INFINITY,Number.MAX_SAFE_INTEGER])
    ('rejects invalid chapter %s before a draw',(chapter)=>{
      const rng=SeededRng.restore(zero),next=vi.spyOn(rng,'next');
      expect(()=>drawR2Boss(rng,[],chapter)).toThrow('invalid-boss-chapter');
      expect(next).not.toHaveBeenCalled();expect(rng.snapshot()).toEqual(zero);
    });
  it.each([
    {label:'unknown',seen:['B17']},{label:'wrong case',seen:['b01']},{label:'empty ID',seen:['']},
    {label:'number ID',seen:[1]},{label:'null ID',seen:[null]},{label:'sparse',seen:Array(1)},
    {label:'string array impostor',seen:'B01'},{label:'null',seen:null},
  ])('rejects invalid seen $label before a draw',({seen})=>{
    const rng=SeededRng.restore(zero),next=vi.spyOn(rng,'next');
    expect(()=>drawR2Boss(rng,seen as unknown as readonly string[],1)).toThrow('invalid-boss-seen');
    expect(next).not.toHaveBeenCalled();expect(rng.snapshot()).toEqual(zero);
  });
});

describe('C03 Boss complete history validation',()=>{
  it.each([
    {chapter:1,seen:['B04']},{chapter:2,seen:['B01','B03']},
    {chapter:6,seen:['B01','B02','B05','B06','B07','B12']},
    {chapter:8,seen:['B01','B02','B05','B06','B07','B12','B13','B16']},
  ])('accepts the complete chapter $chapter history',({chapter,seen})=>expect(r2BossHistoryValid(seen,chapter)).toBe(true));
  it.each([
    {label:'length too short',chapter:2,seen:['B01']},
    {label:'length too long',chapter:1,seen:['B01','B02']},
    {label:'late ID in first chapter',chapter:1,seen:['B05']},
    {label:'late ID in second chapter',chapter:2,seen:['B01','B12']},
    {label:'B13 before chapter seven',chapter:3,seen:['B01','B02','B13']},
    {label:'B16 before chapter seven',chapter:6,seen:['B01','B02','B05','B06','B07','B16']},
    {label:'premature basic repeat',chapter:2,seen:['B01','B01']},
    {label:'old basic pool exhaustion is not current pool exhaustion',chapter:5,seen:['B01','B02','B03','B04','B01']},
    {label:'repeat while chapter-eight candidates remain',chapter:8,seen:['B01','B02','B03','B04','B05','B06','B13','B01']},
    {label:'unknown ID',chapter:1,seen:['B17']},
    {label:'sparse ID',chapter:1,seen:Array(1)},
    {label:'array impostor',chapter:1,seen:'B01'},
    {label:'chapter zero',chapter:0,seen:[]},
    {label:'chapter nine',chapter:9,seen:[...basic,'B05','B06','B07','B08','B09']},
  ])('rejects $label',({chapter,seen})=>expect(r2BossHistoryValid(seen as readonly string[],chapter)).toBe(false));
});

describe('C03 Boss strict public plan validation',()=>{
  it('accepts exactly four suit parameters for B03 and null for the other fifteen definitions',()=>{
    for(const suit of ['spades','hearts','clubs','diamonds'])expect(r2BossPlanValid({definitionId:'B03',disabledSuit:suit})).toBe(true);
    for(const id of full.filter(id=>id!=='B03'))expect(r2BossPlanValid({definitionId:id,disabledSuit:null})).toBe(true);
  });
  it.each([
    {label:'missing suit',plan:{definitionId:'B01'}},
    {label:'missing definition',plan:{disabledSuit:null}},
    {label:'extra rule field',plan:{definitionId:'B01',disabledSuit:null,rule:'anything'}},
    {label:'unknown definition',plan:{definitionId:'B17',disabledSuit:null}},
    {label:'wrong case',plan:{definitionId:'b01',disabledSuit:null}},
    {label:'B03 null parameter',plan:{definitionId:'B03',disabledSuit:null}},
    {label:'B03 unknown parameter',plan:{definitionId:'B03',disabledSuit:'joker'}},
    {label:'non-B03 suit parameter',plan:{definitionId:'B04',disabledSuit:'hearts'}},
    {label:'array',plan:['B01',null]},
    {label:'null',plan:null},
    {label:'string',plan:'B01'},
    {label:'inherited required fields',plan:Object.create({definitionId:'B01',disabledSuit:null})},
  ])('rejects $label without normalizing it',({plan})=>expect(r2BossPlanValid(plan)).toBe(false));
});

describe('C03 Boss preserves published B01-B04 card semantics',()=>{
  const hand:PlayingCard[]=[
    {id:'c0',rank:11,suit:'hearts'},{id:'c1',rank:12,suit:'spades'},
    {id:'c2',rank:13,suit:'hearts'},{id:'c3',rank:14,suit:'clubs'},
    {id:'c4',rank:2,suit:'diamonds'},
  ];
  it('preserves B03 suit and B04 face disability without disabling the ace',()=>{
    expect(r2DisabledCards({definitionId:'B03',disabledSuit:'hearts'},2,hand)).toEqual(['c0','c2']);
    expect(r2DisabledCards({definitionId:'B04',disabledSuit:null},2,hand)).toEqual(['c0','c1','c2']);
    expect(r2DisabledCards({definitionId:'B03',disabledSuit:'hearts'},1,hand)).toEqual([]);
    expect(r2DisabledCards({definitionId:'B04',disabledSuit:null},1,hand)).toEqual([]);
  });
  it('does not manufacture card disabilities for the other fourteen definitions',()=>{
    for(const id of full.filter(id=>id!=='B03'&&id!=='B04'))
      expect(r2DisabledCards({definitionId:id,disabledSuit:null},2,hand)).toEqual([]);
  });
  it('keeps B02 fourth/fifth ordinary suppression in known hand order',()=>{
    expect(r2OrdinarySuppression({definitionId:'B02',disabledSuit:null},2,hand,['c4','c3','c2','c1','c0'])).toEqual(['c3','c4']);
    expect(r2OrdinarySuppression({definitionId:'B02',disabledSuit:null},1,hand,hand.map(card=>card.id))).toEqual([]);
    expect(r2OrdinarySuppression({definitionId:'B01',disabledSuit:null},2,hand,hand.map(card=>card.id))).toEqual([]);
  });
  it('preserves published B03 public parameter text',()=>{
    expect(r2BossText({definitionId:'B03',disabledSuit:'hearts'})).toBe(
      '单色灯 · ♥：公开花色本场失效；仍参与牌型，但不加点数或计分牌效果。\n应对：用其他花色计分，或保留失效牌来凑牌型。');
  });
});
