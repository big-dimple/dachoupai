export const HAPTIC_PREFERENCE_KEY='dachoupai-haptics-v1';

/** Presentation preference only. Never stored in or migrated from a run checkpoint. */
export function readHapticPreference(value:unknown):boolean {
  if(value&&typeof value==='object'&&'version' in value&&value.version===1&&'enabled' in value&&typeof value.enabled==='boolean')return value.enabled;
  return true;
}
