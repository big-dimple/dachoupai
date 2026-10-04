import manifest from '../../public/assets/handdrawn-p08/manifest.json';
import {assetUrl} from './theme';
import type Phaser from 'phaser';
export const HANDDRAWN_ART=manifest.assets;
export const HANDDRAWN_SOURCE=manifest.sourceCommit;
export const handdrawnPath=(id:string,purpose:string):string|undefined=>{const output=HANDDRAWN_ART.find(a=>a.id===id)?.outputs.find(o=>o.purpose===purpose);return output?'assets/handdrawn-p08/'+output.path:undefined;};
export const COURT_ART=HANDDRAWN_ART.filter(a=>a.category==='court').map(a=>({rank:a.id==='j'?11:a.id==='q'?12:13,key:'p08-court-'+a.id,path:handdrawnPath(a.id,'court')!}));
export const courtArtKey=(rank:number):string|undefined=>COURT_ART.find(a=>a.rank===rank)?.key;
export function queueCourtArtLoads(scene:Phaser.Scene):void {for(const a of COURT_ART)if(!scene.textures.exists(a.key))scene.load.image(a.key,assetUrl(a.path),{responseType:'blob',timeout:5000});}
