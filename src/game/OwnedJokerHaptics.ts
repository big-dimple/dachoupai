/** Optional pickup acknowledgement, never a save-success signal. */
export function requestOwnedJokerPickupHaptic(touch:boolean):void {
  if(!touch||typeof navigator==='undefined'||typeof navigator.vibrate!=='function')return;
  try { navigator.vibrate(12); } catch { /* Unsupported or denied: visual pickup remains complete. */ }
}
