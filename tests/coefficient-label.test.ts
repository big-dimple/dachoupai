import {expect,it} from 'vitest';
import {coefficientLabelCandidates} from '../src/game/JokerLabel';
it.each([
 ['3','2',['×1.5']],
 ['1587','800',['×≈1.98','×≈2']],
 ['36501','16000',['×≈2.28','×≈2.3']],
 ['123456','1',['×≈12.35万','×≈12.3万']],
 ['99995','10',['×≈10千']],
 ['1000000','1',['×100万']],
])('marks every lossy candidate for %s/%s but not exact scaled values',(n,d,want)=>{
 const value={n,d},before={...value};expect(coefficientLabelCandidates(value)).toEqual(want);expect(value).toEqual(before);
});
