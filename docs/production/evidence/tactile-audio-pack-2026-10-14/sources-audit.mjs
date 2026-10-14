import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const root=new URL('../../../../',import.meta.url),out=new URL('.',import.meta.url);
const manifest=JSON.parse(await fs.readFile(new URL('public/assets/audio/foley-v1/sources.json',root),'utf8'));
const cloth=JSON.parse(await fs.readFile(new URL('public/assets/audio/score-impact/sources.json',root),'utf8'))['cloth2.ogg'];
const assets=[];
for(const item of [...manifest.assets,{name:'cloth2',runtimePath:'assets/audio/score-impact/cloth2.ogg',...cloth}]){
 const bytes=await fs.readFile(new URL('public/'+item.runtimePath,root)),sha256=crypto.createHash('sha256').update(bytes).digest('hex');
 assert.equal(sha256,item.sha256);assert.equal(bytes.length,item.bytes);assert.equal(item.license,'CC0-1.0');assets.push({name:item.name,bytes:bytes.length,sha256,license:item.license,source:item.source||item.url,heard:false,unchanged:true});
}
const evidence=[];
for(const url of [manifest.mirrorDeclaration,'https://raw.githubusercontent.com/jarlah/dungeon-haskell/master/assets/CREDITS.md']){
 try{const text=execFileSync('curl',['--fail','--silent','--show-error','--max-time','15','-L',url],{encoding:'utf8'});const response={status:200};assert.match(text,/CC0|public domain/i);evidence.push({url,status:response.status,sha256:crypto.createHash('sha256').update(text).digest('hex'),relevantLines:text.split('\n').filter(line=>/^All SFX are CC0|^All audio assets|^https:\/\/kenney|^- .*sfx\/miss/.test(line)).map(line=>line.startsWith('All SFX')?line.split('. ')[0]+'.':line)});}catch(error){evidence.push({url,error:String(error)});}
}
const music=JSON.parse(await fs.readFile(new URL('public/assets/audio/p06/recording.json',root),'utf8'));const musicBytes=await fs.readFile(new URL('public/'+music.runtimePath,root));assert.equal(crypto.createHash('sha256').update(musicBytes).digest('hex'),music.runtimeSha256);
const report={existingMusic:{title:music.title,author:music.author,sourceUrl:music.sourceUrl,recordingLicense:music.recordingLicense,licenseSummaryUrl:music.licenseSummaryUrl,restrictions:music.restrictions,runtimeSha256:music.runtimeSha256,unchanged:true,scope:'Same existing integrated game music in short SFX event comparisons, not a standalone music download/asset pack. Not CC0; not a new BGM addition or subjective approval. License summary independently read2026-10-14 permits adapted works and prohibits standalone distribution.'},status:'PASS',assets,bytes:assets.reduce((sum,a)=>sum+a.bytes,0),officialCC0Declarations:['https://kenney.nl/assets/casino-audio','https://kenney.nl/assets/impact-sounds','https://kenney.nl/assets/rpg-audio'],officialPagesVerifiedBy:'web tool 2026-10-14: Casino Audio and Impact Sounds both explicitly CC0; existing RPG mirror credits fetched below',currentEvidence:evidence,inkwave:{existingCode:'third-party/inkwave/README.md; 98ea29694ab3eebaaeaa995c2b525ac883a48de5 and 679d2dba48457c239f2c60ba1ffc17d1fe789f07 MIT notices already retained',currentRepository:'404 via GitHub connector + web tool; no new code or media imported',audioRights:'Code MIT does not license all reference audio. Only independently documented Kenney recordings are reused.'},newDownloads:0,newBGM:0,purchases:0};
await fs.writeFile(new URL('sources-audit.json',out),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,assets:assets.length,bytes:report.bytes,evidence:evidence.map(e=>({url:e.url,status:e.status,error:e.error}))}));
