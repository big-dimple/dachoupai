export interface AudioPreferences {music:number;sfx:number}
export const DEFAULT_AUDIO:Readonly<AudioPreferences>={music:.30,sfx:.80};
const object=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'?value as Record<string,unknown>:{};
const gain=(value:unknown,fallback:number):number=>typeof value==='number'&&Number.isFinite(value)?Math.max(0,Math.min(1,value)):fallback;

/** Optional presentation settings only; never read or rewrite a game checkpoint. */
export function readAudioPreferences(current:unknown,legacyAudio?:unknown,legacyPresentation?:unknown):AudioPreferences {
  const saved=object(current);
  if(saved.version===2)return {music:gain(saved.music,DEFAULT_AUDIO.music),sfx:gain(saved.sfx,DEFAULT_AUDIO.sfx)};
  const audio=object(legacyAudio),presentation=object(legacyPresentation),master=gain(audio.master,1);
  if(presentation.muted===true)return {music:0,sfx:0};
  // A saved v1 master represented the old22%/100% mix. Preserve that choice,
  // including exact zero, instead of applying new defaults to an existing preference.
  if('master' in audio||'musicMuted' in audio)return {music:audio.musicMuted===true?0:.22*master,sfx:master};
  return {...DEFAULT_AUDIO};
}
