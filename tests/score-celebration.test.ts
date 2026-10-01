import {describe,it,expect} from 'vitest';
import {scoreCelebration} from '../src/game/scoreCelebration';

describe('real stage over-target celebration',()=>{
  it('never labels a below-target hand as a clear or overkill',()=>{
    expect(scoreCelebration('0','399','400')).toMatchObject({cleared:false,tier:0});
  });
  it.each([
    ['400',0,'达成目标'],['799',0,'达成目标'],['800',1,'双倍压场'],
    ['1199',1,'双倍压场'],['1200',2,'三倍爆场'],['1999',2,'三倍爆场'],['2000',3,'五倍炸场'],
  ] as const)('uses exact target boundaries at %s',(heat,tier,label)=>{
    expect(scoreCelebration('0',heat,'400')).toMatchObject({cleared:true,tier,label});
  });
  it('reports cumulative stage heat explicitly, including prior hands',()=>{
    expect(scoreCelebration('399','800','400')).toEqual({cleared:true,tier:1,label:'双倍压场',ratio:'2.0',excess:'400'});
    expect(scoreCelebration('800','800','400')).toMatchObject({cleared:false,tier:0});
  });
  it('keeps huge scores exact without Number overflow or rounded-up awards',()=>{
    const target=10n**100n;
    expect(scoreCelebration('0',(target*3n-1n).toString(),target.toString())).toMatchObject({tier:1,ratio:'2.9'});
    expect(scoreCelebration('0',(target*5n).toString(),target.toString())).toMatchObject({tier:3,excess:(target*4n).toString()});
  });
});
