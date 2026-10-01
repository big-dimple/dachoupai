import {it,expect} from 'vitest';
import {R2_JOKERS} from '../src/content/r2Schema';
import {JOKER_ART} from '../src/game/jokerArt';

it('every Joker in the current playable pool has its own illustration mapping',()=>{
  const ids=JOKER_ART.map(a=>a.id);
  expect(new Set(ids).size).toBe(ids.length);
  expect([...ids].sort()).toEqual(R2_JOKERS.map(j=>j.id).sort());
});
