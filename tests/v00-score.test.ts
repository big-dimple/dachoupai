import {describe,expect,it} from 'vitest';
import {R2_JOKERS,type R2JokerInstance} from '../src/content/r2Schema';
import {scoreR2Hand,type ScoreInput} from '../src/domain/scoreR2';
import {SeededRng} from '../src/core/SeededRng';
import type {PlayingCard,Rank,Suit} from '../src/cards/types';

const card=(id:string,rank:Rank,suit:Suit='spades'):PlayingCard=>({id,rank,suit});
const owned=(id:string,growth:R2JokerInstance['growth']={}):R2JokerInstance=>({instanceId:'owned/'+id,definitionId:id,paidPrice:4,growth});
type Extras=Partial<ScoreInput>&{gold?:number;discardsUsed?:number;ordinaryPointsSuppressedIds?:readonly string[]};
function score(hand:PlayingCard[],ids:string[],jokers:R2JokerInstance[],extras:Extras={}) {
  return scoreR2Hand({rulesVersion:'r2',runId:'golden',rootId:'golden/hand',characterId:'neutral',hand,selectedIds:ids,disabledIds:[],jokers,definitions:R2_JOKERS,handLevels:{},playIndex:1,handsBeforePlay:4,previousHandType:null,wager:false,rng:new SeededRng('golden').snapshot(),...extras});
}
const single=[card('two',2)],pair=[card('s8',8),card('h8',8,'hearts'),card('king',13,'diamonds'),card('low',2,'clubs')];
const straight=[card('a',14),card('2',2,'clubs'),card('3',3,'hearts'),card('4',4,'diamonds'),card('5',5)];
const flush=[2,4,6,8,10].map((r,i)=>card('red'+i,r as Rank,'hearts'));

describe('V00 independent scoring goldens, no target or legacy-golden changes',()=>{
  it('publishes the exact 24 planned identities and no dead future definitions',()=>{
    expect(R2_JOKERS.map(d=>d.id).sort()).toEqual(['pengci','tiesuanpan','a03','a05','mantangcai','b02','b03','b04','jiedongfeng','c02','c04','c06','d01','d03','d05','d10','e01','e03','e05','e08','huimaqiang','f02','f03','f09'].sort());
  });
  it('A03 sees actual played=1, and happens after the character multiplier',()=>{
    const j=[owned('a03')];expect(score(single,['two'],j).finalScore).toBe('57');expect(score(single,['two'],j,{characterId:'amo'}).finalScore).toBe('171');
    expect(score([single[0],card('3',3)],['two','3'],j).finalScore).toBe('23');
  });
  it.each([['a05',single,['two'],'heat',6,90,'22','28'],['b03',pair,['s8','h8'],'multiplier',.25,3,'102','114'],['c06',flush,flush.map(c=>c.id),'multiplier',.25,4,'680','722']] as const)('%s grows after this hand, caps and survives a JSON checkpoint',(id,hand,ids,key,step,cap,first,next)=>{
    let j=[owned(id)];const initial=JSON.stringify(j),a=score([...hand],[...ids],j);expect(a.finalScore).toBe(first);expect(JSON.stringify(j)).toBe(initial);
    expect(a.events.at(-1)?.phase).toBe('afterHand');j=JSON.parse(JSON.stringify(a.jokers));expect(score([...hand],[...ids],j).finalScore).toBe(next);
    for(let i=0;i<Math.ceil(cap/step)+2;i++)j=score([...hand],[...ids],j).jokers;
    expect(Number(j[0].growth[key].n)/Number(j[0].growth[key].d)).toBe(cap);
    const nonsingle=[card('7',7),card('9',9)];const before=JSON.stringify(j);const no=score(nonsingle,nonsingle.map(c=>c.id),j);expect(JSON.stringify(no.jokers)).toBe(before);
  });
  it('B02 counts paired ranks in played; only active scoring cards trigger, with one final floor',()=>{
    const j=[owned('b02')];expect(score(pair,pair.map(c=>c.id),j).finalScore).toBe('127');
    const disabled=score(pair,pair.map(c=>c.id),j,{disabledIds:['s8']});expect(disabled.finalScore).toBe('96');
    expect(disabled.events.filter(e=>e.sourceDefinitionId==='b02').map(e=>e.targetCardId)).toEqual(['h8']);
    expect(score(single,['two'],j).finalScore).toBe('22');
  });
  it('B04 needs two different groups, not one four-kind group',()=>{
    const two=[card('2s',2),card('2h',2,'hearts'),card('4s',4),card('4h',4,'hearts'),card('k',13)];
    expect(score(two,two.map(c=>c.id),[owned('b04')]).finalScore).toBe('308');
    const four=[card('8s',8),card('8h',8,'hearts'),card('8d',8,'diamonds'),card('8c',8,'clubs'),card('k',13)];
    expect(score(four,four.map(c=>c.id),[owned('b04')]).finalScore).toBe('2464'); // (320+4*8)*7; one rank-group, no B04.
  });
  it('C02 ignores red kickers and held cards; C04 applies only to straight or straight-flush',()=>{
    expect(score(pair,pair.map(c=>c.id),[owned('c02')]).finalScore).toBe('118');
    expect(score(pair,['s8'],[owned('c02')]).finalScore).toBe('28');
    expect(score(straight,straight.map(c=>c.id),[owned('c04')]).finalScore).toBe('800');
    expect(score(flush,flush.map(c=>c.id),[owned('c04')]).finalScore).toBe('680');
  });
  it('D01 takes the first four eligible held J/Q/K in hand order, never A or played',()=>{
    const hand=[...single,card('low',3),card('j1',11),card('q1',12),card('k1',13),card('j2',11,'hearts'),card('q2',12,'hearts'),card('a',14)];
    const r=score(hand,['two'],[owned('d01')]);expect(r.finalScore).toBe('66');
    expect(r.events.filter(e=>e.sourceDefinitionId==='d01').map(e=>e.targetCardId)).toEqual(['j1','q1','k1','j2']);
    expect(score(hand,['j1','q1','k1','j2','q2'],[owned('d01')]).events.filter(e=>e.sourceDefinitionId==='d01')).toEqual([]);
  });
  it('D03 growth is next-hand only and requires at least three held',()=>{
    const hand=[...single,card('3',3),card('4',4),card('5',5)],a=score(hand,['two'],[owned('d03')]);expect(a.finalScore).toBe('22');expect(a.jokers[0].growth.heat).toEqual({n:'4',d:'1'});
    expect(score(hand,['two'],a.jokers).finalScore).toBe('26');expect(score(single,['two'],a.jokers).jokers).toEqual(a.jokers);
    expect(score(hand,['two'],[owned('d03',{heat:{n:'60',d:'1'}})]).jokers[0].growth.heat).toEqual({n:'60',d:'1'});
  });
  it('D10 empty slots exclude all occupied instances and cap at four',()=>{
    expect(score(single,['two'],[owned('d10')]).finalScore).toBe('70');expect(score(single,['two'],[owned('d10'),owned('e01')]).finalScore).toBe('58');
    expect(score(single,['two'],[owned('d10'),owned('e01'),owned('d05'),owned('e05'),owned('a05')]).finalScore).toBe('22');
  });
  it('E03 and E08 read current public gold, including boundaries',()=>{
    for(const [gold,result] of [[0,'22'],[1,'24'],[29,'80'],[30,'82'],[100,'82']] as const)expect(score(single,['two'],[owned('e03')],{gold}).finalScore).toBe(result);
    expect(score(single,['two'],[owned('e08')],{gold:19}).finalScore).toBe('22');expect(score(single,['two'],[owned('e08')],{gold:20}).finalScore).toBe('39');
  });
  it('F02/F03/F09 use actual remaining hands, first play and successful discard count',()=>{
    const cases:[string,Extras,string,string][]=[['f02',{handsBeforePlay:1},'92','22'],['f03',{playIndex:1},'66','22'],['f09',{discardsUsed:0},'33','22']];
    for(const [id,extras,yes,no] of cases){expect(score(single,['two'],[owned(id)],extras).finalScore).toBe(yes);expect(score(single,['two'],[owned(id)],id==='f02'?{handsBeforePlay:2}:id==='f03'?{playIndex:2}:{discardsUsed:1}).finalScore).toBe(no);}
  });
  it('B02 Boss suppresses fourth/fifth ordinary points while their explicit Joker effects still apply',()=>{
    const ids=straight.map(c=>c.id),r=score(straight,ids,[owned('c04'),owned('tiesuanpan')],{ordinaryPointsSuppressedIds:ids.slice(3)});
    // Straight base125 + ordinary(A,2,3)=16 + A iron25 + stair50 =216; M4.
    expect(r.finalScore).toBe('864');expect(r.sets.activeScoringIds).toEqual(ids);
    expect(r.events.filter(e=>e.operation==='ordinary-points-suppressed').map(e=>[e.sourceDefinitionId,e.targetCardId])).toEqual([['B02','4'],['B02','5']]);
    const red=[...flush],rr=score(red,red.map(c=>c.id),[owned('c02')],{ordinaryPointsSuppressedIds:red.slice(3).map(c=>c.id)});expect(rr.finalScore).toBe('768');
    expect(rr.events.filter(e=>e.sourceDefinitionId==='c02')).toHaveLength(5);
  });
  it('mixed +M/×M still follows slot order and previews never grow live instances',()=>{
    const j=[owned('f09'),owned('pengci')],before=JSON.stringify(j);expect(score(single,['two'],j).finalScore).toBe('77');expect(score(single,['two'],[...j].reverse()).finalScore).toBe('99');expect(JSON.stringify(j)).toBe(before);
  });
});
