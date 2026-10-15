import {afterEach,describe,expect,it,vi} from 'vitest';
import {requestOwnedJokerPickupHaptic} from '../src/game/OwnedJokerHaptics';

afterEach(()=>vi.unstubAllGlobals());
describe('optional owned-joker pickup feedback',()=>{
  it('requests a short pulse only for a touch pickup',()=>{
    const vibrate=vi.fn(()=>true);vi.stubGlobal('navigator',{vibrate});
    requestOwnedJokerPickupHaptic(false);expect(vibrate).not.toHaveBeenCalled();
    requestOwnedJokerPickupHaptic(true);expect(vibrate).toHaveBeenCalledExactlyOnceWith(12);
  });
  it.each([undefined,{}, {vibrate:()=>false}, {vibrate:()=>{throw new Error('denied');}}])('does not interrupt pickup when unavailable or denied: %o',navigator=>{
    vi.stubGlobal('navigator',navigator);
    expect(()=>requestOwnedJokerPickupHaptic(true)).not.toThrow();
  });
});
