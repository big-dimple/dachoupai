import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';

// Re-export reviewed crops; generation and human visual approval stay outside this tool.
const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestFile = path.join(project, 'art/sources/p07-characters/manifest.json');
const manifest = JSON.parse(await fs.readFile(manifestFile, 'utf8'));
const runtime = path.join(project, 'public/assets/characters-p07');
await fs.mkdir(runtime, {recursive:true});
const measure = async relative => {
  const data=await fs.readFile(path.join(project,relative));
  const meta=await sharp(data).metadata();
  await sharp(data).raw().toBuffer();
  return {path:relative,width:meta.width,height:meta.height,alpha:meta.hasAlpha,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')};
};
for (const character of manifest.characters) {
  if(!/^(amo|touye|laohuan|erxiang|azao|xiemu)$/.test(character.id))throw new Error('Unexpected character ID');
  const source=path.join(project,`art/sources/p07-characters/${character.id}.png`);
  const crop=character.avatarCropPixels,meta=await sharp(source).metadata();
  if(!crop||crop.width!==crop.height||crop.left<0||crop.top<0||crop.left+crop.width>meta.width||crop.top+crop.height>meta.height)throw new Error(`Unreviewed/outside avatar crop: ${character.id}`);
  await sharp(source).extract(crop).resize(256,256).webp({quality:88,effort:6}).toFile(path.join(runtime,`${character.id}.avatar.webp`));
  await sharp(source).resize({width:256,height:320,fit:'inside',withoutEnlargement:true}).webp({quality:88,effort:6}).toFile(path.join(runtime,`${character.id}.selection.webp`));
  await sharp(source).resize({width:615,height:768,fit:'inside',withoutEnlargement:true}).webp({quality:88,effort:6}).toFile(path.join(runtime,`${character.id}.portrait.webp`));
  character.source=await measure(`art/sources/p07-characters/${character.id}.png`);
  character.outputs=await Promise.all(['avatar','selection','portrait'].map(type=>measure(`public/assets/characters-p07/${character.id}.${type}.webp`)));
}
await fs.writeFile(manifestFile,JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({status:'PASS',characters:manifest.characters.length,outputs:manifest.characters.length*3,visualApproval:'NOT_GRANTED'}));
