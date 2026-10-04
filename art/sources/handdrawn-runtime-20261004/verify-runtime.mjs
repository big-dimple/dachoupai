// Portable, read-only verification. Uses Node built-ins only; no original PNGs.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(await fs.readFile(path.join(root, 'manifest.json'), 'utf8'));
const categories = {
  character: ['azao','amo','touye','laohuan','erxiang','xiemu'],
  court: ['j','q','k'],
  'functional-card': ['f04','e07','f09','f07','d07','a07','a08','c03','d02','e02','e09'],
};
const purposes = {character:['avatar','selection','portrait'],court:['court'],'functional-card':['thumbnail','detail']};
const folders = {character:'characters',court:'court','functional-card':'cards'};
const dimensions = data => {
  if (data.toString('ascii',0,4)!=='RIFF' || data.toString('ascii',8,12)!=='WEBP') throw new Error('Invalid WebP');
  for (let offset=12;offset+8<=data.length;) {
    const type=data.toString('ascii',offset,offset+4), length=data.readUInt32LE(offset+4), start=offset+8;
    if(start+length>data.length)throw new Error('Truncated WebP');
    if(type==='VP8X' && length>=10)return [1+data.readUIntLE(start+4,3),1+data.readUIntLE(start+7,3)];
    if(type==='VP8 ' && length>=10 && data.toString('hex',start+3,start+6)==='9d012a')return [data.readUInt16LE(start+6)&0x3fff,data.readUInt16LE(start+8)&0x3fff];
    if(type==='VP8L' && length>=5 && data[start]===0x2f){const b=data.readUInt32LE(start+1);return [1+(b&0x3fff),1+((b>>>14)&0x3fff)];}
    offset=start+length+(length%2);
  }
  throw new Error('WebP dimensions unavailable');
};
const ids=new Set(),files=new Set();let bytes=0;
for(const asset of manifest.assets){
  if(!categories[asset.category]?.includes(asset.id) || ids.has(asset.id))throw new Error('Wrong or duplicate asset ID');
  ids.add(asset.id);
  const allowed=purposes[asset.category];
  if(asset.outputs.length!==allowed.length || new Set(asset.outputs.map(o=>o.purpose)).size!==allowed.length)throw new Error('Wrong purpose count');
  for(const output of asset.outputs){
    const expected=`${folders[asset.category]}/${asset.id}.${output.purpose}.webp`;
    if(!allowed.includes(output.purpose)||output.path!==expected||path.isAbsolute(output.path)||output.path.split(/[\\/]/).includes('..')||files.has(output.path))throw new Error('Unsafe or wrong resource path');
    const file=path.resolve(root,output.path), stat=await fs.lstat(file);
    if(!file.startsWith(root+path.sep)||stat.isSymbolicLink()||!stat.isFile())throw new Error('Unsafe resource file');
    const data=await fs.readFile(file), actual=dimensions(data);
    if(data.length!==output.bytes||createHash('sha256').update(data).digest('hex')!==output.sha256||actual[0]!==output.width||actual[1]!==output.height)throw new Error(`Resource mismatch: ${output.path}`);
    files.add(output.path);bytes+=data.length;
  }
}
if(ids.size!==20||files.size!==43||bytes!==1262668||manifest.runtimeBytes!==bytes||manifest.runtimeFileCount!==files.size)throw new Error('Unexpected resource total');
console.log(JSON.stringify({status:'PASS',originalArtworks:20,runtimeFiles:43,runtimeBytes:bytes,sourcePngsRequired:false,externalPackagesRequired:false}));
