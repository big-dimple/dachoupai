import type Phaser from 'phaser';
import {JOKER_ART,jokerArtUrl} from './jokerArt';
import {assetUrl} from './theme';
import {prefetchDetailArt} from './DetailArt';
const attempted=new WeakMap<Phaser.Scene,Set<string>>();
/** Only the visible shelf / owned rack; failed thumbnails retain the existing mechanism fallback. */
export function requestJokerArt(scene:Phaser.Scene,ids:readonly string[],refresh:()=>void):void {
  let seen=attempted.get(scene);if(!seen){seen=new Set();attempted.set(scene,seen);}
  const missing=JOKER_ART.filter(art=>ids.includes(art.id)&&!scene.textures.exists(art.key)&&!seen!.has(art.key));
  if(missing.length){
    scene.load.maxParallelDownloads=2;scene.load.maxRetries=0;
    for(const art of missing){seen.add(art.key);scene.load.image(art.key,assetUrl(art.path),{responseType:'blob',timeout:5000});}
    scene.load.once('complete',()=>{if(scene.scene.isActive())refresh();});if(!scene.load.isLoading())scene.load.start();
  }
  // Two soon-visible details at most; never the entire registry.
  prefetchDetailArt(ids.slice(0,2).flatMap(id=>{const url=jokerArtUrl(id);return url?[url]:[];}));
}
