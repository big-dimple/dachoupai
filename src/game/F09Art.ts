import Phaser from 'phaser';

/** Original pixels, feathered region masks. Motion stays inside the painted silhouette.
 * No invented back/side or replacement painting. Faces and outer contours stay still. */
const regions=[{name:'script',x:.31,y:.60,rx:.14,ry:.14,dx:.002,dy:-.002,angle:-.35},
  {name:'sleeve',x:.73,y:.66,rx:.10,ry:.18,dx:.003,dy:.002,angle:.3}] as const;
export function mountF09Art(scene:Phaser.Scene,parent:Phaser.GameObjects.Container,width:number,height:number,reduced:()=>boolean,key='p07-joker-f09',alignedLayers=true):void {
  const source=scene.textures.get(key).getSourceImage() as HTMLImageElement;
  const base=scene.add.image(0,0,key).setDisplaySize(width,height);parent.add(base);
  const layers=(alignedLayers?regions:[]).map(region=>{
    const textureKey=key+'-region-'+region.name;
    if(!scene.textures.exists(textureKey)){
      const texture=scene.textures.createCanvas(textureKey,256,320)!;const c=texture.context;
      c.drawImage(source,0,0,256,320);c.globalCompositeOperation='destination-in';
      c.save();c.translate(region.x*256,region.y*320);c.scale(region.rx*256,region.ry*320);
      const mask=c.createRadialGradient(0,0,.40,0,0,1);mask.addColorStop(0,'#fff');mask.addColorStop(1,'#fff0');
      c.fillStyle=mask;c.fillRect(-8,-8,16,16);c.restore();texture.refresh();
    }
    const image=scene.add.image(0,0,textureKey).setDisplaySize(width,height);parent.add(image);return {image,region};
  });
  const light=scene.add.graphics();light.fillStyle(0xffd48b,.12).fillEllipse(-width*.35,-height*.34,width*.23,height*.27);parent.add(light);
  const update=(_time:number)=>{
    const enabled=parent.getData('f09-active')!==false,sealed=parent.getData('f09-sealed')===true,still=reduced()||!enabled;
    const wave=still?0:Math.sin(_time/1750),pulse=parent.getData('f09-trigger')?1.7:1;
    for(const {image,region} of layers)image.setPosition(wave*width*region.dx*pulse,wave*height*region.dy*pulse).setAngle(wave*region.angle*pulse).setAlpha(sealed?.4:1);
    light.setAlpha(still||!alignedLayers?0:.35+.3*Math.sin(_time/2400));base.setTint(sealed?0x999e96:0xffffff);
  };
  scene.events.on('update',update);parent.once('destroy',()=>scene.events.off('update',update));
}

export function mountF09Detail(frame:HTMLElement,image:HTMLImageElement,inactive:boolean,reduced:boolean,bodyInactive=false,alignedLayers=true):void {
  const window=document.createElement('div');window.className='f09-art-window';window.dataset.inactive=String(inactive);window.dataset.reduced=String(reduced||bodyInactive);
  image.replaceWith(window);window.append(image);image.width=615;image.height=768;
  for(const region of alignedLayers?regions:[]){const layer=image.cloneNode() as HTMLImageElement;layer.alt='';layer.setAttribute('aria-hidden','true');layer.className='f09-layer f09-'+region.name;window.append(layer);}
  if(alignedLayers){const lamp=document.createElement('span');lamp.className='f09-lamp';window.append(lamp);}
  frame.classList.add('f09-art-frame');
  frame.addEventListener('pointermove',event=>{if(event.pointerType!=='mouse'||reduced)return;const b=frame.getBoundingClientRect();frame.style.setProperty('--lean',`${((event.clientX-b.left)/b.width-.5)*3}deg`);});
  frame.addEventListener('pointerleave',()=>frame.style.setProperty('--lean','0deg'));
}
