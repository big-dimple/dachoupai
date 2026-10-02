import {afterEach,describe,expect,it,vi} from 'vitest';
import {resolveR2ModeConfig,type R2ModeConfig,type R2ProgramId} from '../src/content/r2Modes';
import {SeededRng,type RngSnapshot} from '../src/core/SeededRng';
import type {R2HandType} from '../src/domain/evaluateR2';
import {
  abandonR2Program,chooseR2Program,lockR2ProgramChapter,r2ProgramQualified,
  r2ProgramStateValid,r2ProgramUpgradeCandidates,sealR2ProgramChoice,type R2ProgramState,
} from '../src/domain/r2Programs';

function config(selection:unknown={mode:'standard'}):R2ModeConfig {
  const result=resolveR2ModeConfig(selection);
  if(!result.ok)throw Error(result.code);
  return result.config;
}
const standard=config(),q06=config({mode:'challenge',challengeId:'Q06'});
const zero:RngSnapshot={algorithm:'fnv1a-mulberry32-v1',state:0};
const twice:RngSnapshot={algorithm:'fnv1a-mulberry32-v1',state:3663131626};
const usage=(values:Partial<Record<R2HandType,number>>)=>values;
function program(patch:Partial<R2ProgramState>={}):R2ProgramState {
  return {chapter:1,offerIds:['PG01','PG02'],selectedId:null,choiceMade:false,
    abandoned:false,lastOpportunityClear:false,claimed:false,...patch};
}
function selected(id:R2ProgramId,patch:Partial<R2ProgramState>={}):R2ProgramState {
  return program({offerIds:[id,id==='PG01'?'PG02':'PG01'],selectedId:id,choiceMade:true,...patch});
}
afterEach(()=>vi.restoreAllMocks());

describe('C04.2 chapter program lock / independent D31 goldens',()=>{
  it('locks exactly two public distinct contracts with the literal cursor-zero vector',()=>{
    expect(lockR2ProgramChapter(standard,1,zero)).toEqual({
      program:program({offerIds:['PG02','PG01']}),cursor:twice,
    });
  });
  it('preserves literal restore vectors including unsigned cursor wraparound',()=>{
    for(const [state,offers,next] of [
      [1,['PG03','PG01'],3663131627],
      [42,['PG03','PG02'],3663131668],
      [4294967295,['PG04','PG01'],3663131625],
    ] as const){
      const cursor:RngSnapshot={algorithm:'fnv1a-mulberry32-v1',state};
      expect(lockR2ProgramChapter(standard,7,cursor)).toEqual({
        program:program({chapter:7,offerIds:[...offers]}),
        cursor:{algorithm:'fnv1a-mulberry32-v1',state:next},
      });
    }
  });
  it('maps all twelve equal-probability intervals to ordered pairs after removal',()=>{
    const rows=[
      [0.125,1/6,['PG01','PG02']],[0.125,0.5,['PG01','PG03']],[0.125,5/6,['PG01','PG04']],
      [0.375,1/6,['PG02','PG01']],[0.375,0.5,['PG02','PG03']],[0.375,5/6,['PG02','PG04']],
      [0.625,1/6,['PG03','PG01']],[0.625,0.5,['PG03','PG02']],[0.625,5/6,['PG03','PG04']],
      [0.875,1/6,['PG04','PG01']],[0.875,0.5,['PG04','PG02']],[0.875,5/6,['PG04','PG03']],
    ] as const;
    for(const [first,second,expected] of rows){
      const next=vi.spyOn(SeededRng.prototype,'next').mockReturnValueOnce(first).mockReturnValueOnce(second);
      const integer=vi.spyOn(SeededRng.prototype,'integer');
      expect(lockR2ProgramChapter(standard,1,zero).program?.offerIds).toEqual(expected);
      expect(integer.mock.calls).toEqual([[0,3],[0,2]]);
      expect(next).toHaveBeenCalledTimes(2);
      vi.restoreAllMocks();
    }
  });
  it('uses Q06 three-contract intervals and never offers the unusable free-reroll contract',()=>{
    expect(lockR2ProgramChapter(q06,1,zero)).toEqual({
      program:program({offerIds:['PG01','PG02']}),cursor:twice,
    });
    for(const [first,second,expected] of [
      [1/6,0.25,['PG01','PG02']],[1/6,0.75,['PG01','PG03']],
      [0.5,0.25,['PG02','PG01']],[0.5,0.75,['PG02','PG03']],
      [5/6,0.25,['PG03','PG01']],[5/6,0.75,['PG03','PG02']],
    ] as const){
      const next=vi.spyOn(SeededRng.prototype,'next').mockReturnValueOnce(first).mockReturnValueOnce(second);
      const integer=vi.spyOn(SeededRng.prototype,'integer');
      expect(lockR2ProgramChapter(q06,1,zero).program?.offerIds).toEqual(expected);
      expect(integer.mock.calls).toEqual([[0,2],[0,1]]);
      expect(next).toHaveBeenCalledTimes(2);vi.restoreAllMocks();
    }
  });
  it('returns no program without restoring or drawing when the run switch is off',()=>{
    const restore=vi.spyOn(SeededRng,'restore'),next=vi.spyOn(SeededRng.prototype,'next');
    for(const mode of [config({mode:'standard',programsEnabled:false}),config({mode:'tutorial'}),
      config({mode:'challenge',challengeId:'Q06',programsEnabled:false})]){
      const result=lockR2ProgramChapter(mode,1,zero);
      expect(result).toEqual({program:null,cursor:zero});expect(result.cursor).toBe(zero);
    }
    expect(restore).not.toHaveBeenCalled();expect(next).not.toHaveBeenCalled();
  });
  it('leaves the caller cursor and frozen configuration untouched for deterministic retries',()=>{
    const cursor=Object.freeze({...zero}),before=JSON.stringify(standard);
    const first=lockR2ProgramChapter(standard,1,cursor);
    expect(lockR2ProgramChapter(standard,1,cursor)).toEqual(first);
    expect(cursor).toEqual(zero);expect(JSON.stringify(standard)).toBe(before);
    expect(first.cursor).not.toBe(cursor);
  });
  it('rejects invalid chapter bounds before any random draw and permits the existing endless cap',()=>{
    const next=vi.spyOn(SeededRng.prototype,'next');
    const q12=config({mode:'challenge',challengeId:'Q12'});
    for(const chapter of [0,-1,0.5,NaN,Infinity,10767,Number.MAX_SAFE_INTEGER])
      expect(()=>lockR2ProgramChapter(standard,chapter,zero)).toThrow('invalid-program-chapter');
    for(const [mode,chapter] of [[q06,9],[q12,1],[q12,2]] as const)
      expect(()=>lockR2ProgramChapter(mode,chapter,zero)).toThrow('invalid-program-chapter');
    expect(next).not.toHaveBeenCalled();
    expect(lockR2ProgramChapter(standard,10766,zero).program?.chapter).toBe(10766);
    expect(lockR2ProgramChapter(q12,3,zero).program?.chapter).toBe(3);
  });
});

describe('C04.2 program selection and abandonment',()=>{
  it('accepts a first offered choice without changing the locked offers or caller state',()=>{
    const input=program(),before=structuredClone(input),result=chooseR2Program(input,'PG02');
    expect(result).toEqual({ok:true,program:program({selectedId:'PG02',choiceMade:true})});
    expect(input).toEqual(before);
    if(result.ok){
      expect(chooseR2Program(result.program,'PG01')).toEqual({ok:false,code:'program-choice-made'});
      expect(chooseR2Program(result.program,'PG02')).toEqual({ok:false,code:'program-choice-made'});
      expect(chooseR2Program(result.program,null)).toEqual({ok:false,code:'program-choice-made'});
    }
  });
  it('rejects a non-offered or unknown contract without consuming the first choice',()=>{
    const input=program(),before=structuredClone(input);
    for(const id of ['PG03','PG04','PG05','pg01',undefined])
      expect(chooseR2Program(input,id as R2ProgramId)).toEqual({ok:false,code:'invalid-program-offer'});
    expect(input).toEqual(before);expect(chooseR2Program(input,'PG01').ok).toBe(true);
  });
  it('records an explicit no-choice once and cannot later select a contract',()=>{
    const result=chooseR2Program(program(),null);
    expect(result).toEqual({ok:true,program:program({choiceMade:true})});
    if(result.ok)expect(chooseR2Program(result.program,'PG01')).toEqual({ok:false,code:'program-choice-made'});
  });
  it('allows abandoning the chosen contract without penalty or replacing its identity',()=>{
    const input=selected('PG02'),before=structuredClone(input),result=abandonR2Program(input);
    expect(result).toEqual({ok:true,program:selected('PG02',{abandoned:true})});
    expect(input).toEqual(before);
    if(result.ok){
      expect(chooseR2Program(result.program,'PG01')).toEqual({ok:false,code:'program-choice-made'});
      expect(r2ProgramQualified(result.program,usage({pair:3}),20)).toBe(false);
    }
  });
  it('rejects abandonment before selection, after declining, twice, or after claiming',()=>{
    for(const input of [program(),program({choiceMade:true})])
      expect(abandonR2Program(input)).toEqual({ok:false,code:'no-selected-program'});
    expect(abandonR2Program(selected('PG01',{abandoned:true}))).toEqual({ok:false,code:'program-abandoned'});
    expect(abandonR2Program(selected('PG01',{claimed:true}))).toEqual({ok:false,code:'program-reward-claimed'});
  });
  it('seals an unanswered offer on first entry without choosing or drawing and preserves previous choices',()=>{
    const input=program(),before=structuredClone(input),next=vi.spyOn(SeededRng.prototype,'next');
    const sealed=sealR2ProgramChoice(input);
    expect(sealed).toEqual(program({choiceMade:true}));expect(input).toEqual(before);
    expect(chooseR2Program(sealed,'PG01')).toEqual({ok:false,code:'program-choice-made'});
    for(const state of [selected('PG01'),selected('PG02',{abandoned:true}),program({choiceMade:true})])
      expect(sealR2ProgramChoice(state)).toEqual(state);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('C04.2 program qualification / chapter-only aggregates supplied by commands',()=>{
  it('requires three actual different hand types for PG01, rather than three total plays or stored zeroes',()=>{
    const input=selected('PG01');
    expect(r2ProgramQualified(input,usage({'high-card':1,pair:1,flush:1}),0)).toBe(true);
    expect(r2ProgramQualified(input,usage({'high-card':9,pair:1,flush:0}),99)).toBe(false);
    expect(r2ProgramQualified(input,usage({'high-card':1,pair:1}),99)).toBe(false);
    expect(r2ProgramQualified(input,{'high-card':1,pair:1,'unknown-type':99} as Partial<Record<R2HandType,number>>,99)).toBe(false);
    for(const invalid of [0,-1,NaN,Infinity,0.5,Number.MAX_SAFE_INTEGER+1])
      expect(r2ProgramQualified(input,usage({'high-card':1,pair:1,flush:invalid}),99)).toBe(false);
  });
  it('requires one real hand-type count of three for PG02 instead of summing different types',()=>{
    const input=selected('PG02');
    expect(r2ProgramQualified(input,usage({pair:3}),0)).toBe(true);
    expect(r2ProgramQualified(input,usage({pair:2,flush:2,'high-card':2}),99)).toBe(false);
    for(const invalid of [-1,NaN,Infinity,3.5,Number.MAX_SAFE_INTEGER+1])
      expect(r2ProgramQualified(input,usage({pair:invalid}),99)).toBe(false);
  });
  it('qualifies PG03 at exactly fifteen finite integer gold before rewards, independent of other programs',()=>{
    const input=selected('PG03');
    expect(r2ProgramQualified(input,{},15)).toBe(true);expect(r2ProgramQualified(input,{},16)).toBe(true);
    for(const gold of [0,14,-1,14.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1])
      expect(r2ProgramQualified(input,usage({pair:9,flush:9,'high-card':9}),gold)).toBe(false);
  });
  it('qualifies PG04 only from the saved real last-opportunity clear flag',()=>{
    expect(r2ProgramQualified(selected('PG04'),usage({pair:100}),100)).toBe(false);
    expect(r2ProgramQualified(selected('PG04',{lastOpportunityClear:true}),{},0)).toBe(true);
  });
  it('never qualifies an unselected, abandoned, already claimed, or non-offered program',()=>{
    const next=vi.spyOn(SeededRng.prototype,'next');
    const used=usage({'high-card':3,pair:3,flush:3});
    for(const id of ['PG01','PG02','PG03','PG04'] as const){
      const input=selected(id,{lastOpportunityClear:true}),before=structuredClone(input);
      for(const patch of [{selectedId:null},{choiceMade:false},{abandoned:true},{claimed:true},
        {offerIds:['PG01','PG02'].filter(offer=>offer!==id) as R2ProgramId[]}])
        expect(r2ProgramQualified({...input,...patch},used,99)).toBe(false);
      expect(input).toEqual(before);
    }
    expect(r2ProgramQualified(program({choiceMade:true,lastOpportunityClear:true}),used,99)).toBe(false);
    expect(next).not.toHaveBeenCalled();
  });
  it('lists actual used upgradable hands in the fixed twelve-type order, including baseline level one',()=>{
    const used=usage({'flush-five':1,'five-kind':1,flush:2,'high-card':1,pair:5,'two-pair':0,'straight-flush':3});
    const levels=usage({'flush-five':29,'five-kind':30,flush:29,pair:1,'straight-flush':30});
    const before=structuredClone({used,levels});
    expect(r2ProgramUpgradeCandidates(used,levels)).toEqual(['high-card','pair','flush','flush-five']);
    expect({used,levels}).toEqual(before);
    expect(r2ProgramUpgradeCandidates({'flush-five':1,'high-card':1,pair:1},{}))
      .toEqual(['high-card','pair','flush-five']);
  });
  it('skips zero/invalid usage and capped/invalid levels without any random draw for an empty upgrade pool',()=>{
    const next=vi.spyOn(SeededRng.prototype,'next');
    expect(r2ProgramUpgradeCandidates({},{})).toEqual([]);
    expect(r2ProgramUpgradeCandidates(usage({pair:1,flush:1}),usage({pair:30,flush:30}))).toEqual([]);
    for(const bad of [-1,0,NaN,Infinity,0.5,Number.MAX_SAFE_INTEGER+1])
      expect(r2ProgramUpgradeCandidates(usage({pair:bad}),{})).toEqual([]);
    for(const bad of [-1,0,NaN,Infinity,1.5,31])
      expect(r2ProgramUpgradeCandidates(usage({pair:1}),usage({pair:bad}))).toEqual([]);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('C04.2 strict program-state persistence boundary',()=>{
  it('accepts only finite state relationships and does not invent missing claim history',()=>{
    for(const state of [program(),program({choiceMade:true}),program({choiceMade:true,lastOpportunityClear:true}),
      selected('PG01'),selected('PG02',{abandoned:true}),selected('PG01',{claimed:true}),
      selected('PG02',{claimed:true}),selected('PG03',{claimed:true}),
      selected('PG04',{claimed:true,lastOpportunityClear:true})]){
      expect(r2ProgramStateValid(state,standard,1)).toBe(true);
      expect(r2ProgramStateValid(JSON.parse(JSON.stringify(state)),standard,1)).toBe(true);
    }
    // Counts and historical PG03 gold are not fields of this snapshot; root run validation owns those facts.
    const noPrototype=Object.assign(Object.create(null),program());
    expect(r2ProgramStateValid(noPrototype,standard,1)).toBe(true);
  });
  it('requires null when disabled and rejects bad chapter pointers or Q06/Q12 out-of-pool snapshots',()=>{
    const off=config({mode:'standard',programsEnabled:false}),q12=config({mode:'challenge',challengeId:'Q12'});
    expect(r2ProgramStateValid(null,off,1)).toBe(true);
    expect(r2ProgramStateValid(program(),off,1)).toBe(false);expect(r2ProgramStateValid(null,standard,1)).toBe(false);
    expect(r2ProgramStateValid(program(),q06,1)).toBe(true);
    expect(r2ProgramStateValid(program({offerIds:['PG01','PG04']}),q06,1)).toBe(false);
    expect(r2ProgramStateValid(program({chapter:3}),q12,3)).toBe(true);
    expect(r2ProgramStateValid(program(),q12,1)).toBe(false);
    expect(r2ProgramStateValid(program({chapter:10766}),standard,10766)).toBe(true);
    for(const chapter of [0,-1,1.5,NaN,Infinity,10767,Number.MAX_SAFE_INTEGER])
      expect(r2ProgramStateValid(program({chapter}),standard,chapter)).toBe(false);
    expect(r2ProgramStateValid(program(),standard,2)).toBe(false);
    expect(r2ProgramStateValid(program({chapter:9}),q06,9)).toBe(false);
  });
  it('rejects missing/extra fields, malformed offers, invalid booleans and impossible choice/claim combinations',()=>{
    for(const state of [undefined,[],{},'PG01',new Date(),Object.create(program()),
      {...program(),gold:4},...Object.keys(program()).map(key=>{
        const state:Record<string,unknown>={...program()};delete state[key];return state;
      }),...[
        {offerIds:[]},{offerIds:['PG01']},{offerIds:['PG01','PG02','PG03']},{offerIds:['PG01','PG01']},
        {offerIds:['PG01','PG05']},{offerIds:['pg01','PG02']},{offerIds:Array(2)},
        {selectedId:'PG05',choiceMade:true},{selectedId:'PG03',choiceMade:true},
        {selectedId:'PG01'},{abandoned:true},{claimed:true},{lastOpportunityClear:true},
        {choiceMade:true,abandoned:true},{choiceMade:true,claimed:true},
        {selectedId:'PG01',choiceMade:true,abandoned:true,claimed:true},
        ...['choiceMade','abandoned','lastOpportunityClear','claimed'].map(key=>({[key]:1})),
      ].map(patch=>({...program(),...patch})),selected('PG04',{claimed:true})])
      expect(r2ProgramStateValid(state,standard,1)).toBe(false);
  });
  it('rejects accessors, symbols, hidden fields and sparse/extra array data without executing getters',()=>{
    const getter=vi.fn(()=>{throw Error('must not read executable data');});
    const accessor=Object.defineProperty(program(),'selectedId',{get:getter,enumerable:true});
    const hidden=Object.defineProperty(program(),'claimed',{value:false,enumerable:false});
    const symbol=Object.assign(program(),{[Symbol('hidden')]:false});
    const offerAccessor=Object.defineProperty(['PG01','PG02'],'0',{get:getter,enumerable:true});
    const extraOffers=Object.assign(['PG01','PG02'],{extra:'PG03'});
    const inheritedOffers=Object.setPrototypeOf(['PG01','PG02'],Object.create(Array.prototype,{
      [Symbol.iterator]:{get:getter},
    }));
    for(const value of [accessor,hidden,symbol,program({offerIds:offerAccessor as R2ProgramId[]}),
      program({offerIds:extraOffers as R2ProgramId[]}),program({offerIds:inheritedOffers})])
      expect(r2ProgramStateValid(value,standard,1)).toBe(false);
    expect(getter).not.toHaveBeenCalled();
  });
});
