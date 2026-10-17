/** Read-only classification: frozen rule text is not itself a display regression. */
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import ts from 'typescript';
const out='docs/production/evidence/tool-copy-boundary-audit-2026-10-17';await mkdir(out,{recursive:true});
const sha=data=>createHash('sha256').update(data).digest('hex'),files=[];
async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const p=dir+'/'+entry.name;if(entry.isDirectory())await walk(p);else if(/\.(ts|json|html|svg)$/.test(p)){const s=await readFile(p,'utf8'),lines=s.split('\n'),hits=lines.flatMap((line,i)=>/大丑/.test(line)?[{line:i+1,text:line.trim()}]:[]);if(hits.length)files.push({file:p,sha256:sha(s),hits});}}}
await walk('src');await walk('public');
const bundle=await readFile('shots/tool-copy-boundary/live-bundle.js','utf8'),build=JSON.parse(await readFile('shots/tool-copy-boundary/live-build.json','utf8'));
const knownFrozen=new Set();
function frozenValues(x){if(typeof x==='string'&&/大丑/.test(x))knownFrozen.add(x);else if(x&&typeof x==='object')Object.values(x).forEach(frozenValues);}
for(const file of ['src/domain/r2PublishedContent.json','src/content/r2-jokers.json'])frozenValues(JSON.parse(await readFile(file,'utf8')));
for(const file of ['src/content/r2Modes.ts','src/domain/r2Chapter.ts']){const a=ts.createSourceFile(file,await readFile(file,'utf8'),ts.ScriptTarget.Latest,true);const collect=n=>{if(ts.isStringLiteral(n)&&/大丑/.test(n.text))knownFrozen.add(n.text);ts.forEachChild(n,collect);};collect(a);}
const ast=ts.createSourceFile('live.js',bundle,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),legacy=[],toolCopy=[];
function visit(node){
 if([ts.SyntaxKind.StringLiteral,ts.SyntaxKind.NoSubstitutionTemplateLiteral,ts.SyntaxKind.TemplateHead,ts.SyntaxKind.TemplateMiddle,ts.SyntaxKind.TemplateTail].includes(node.kind)){
  if(/大丑/.test(node.text)){
   let embedded;try{embedded=JSON.parse(node.text);}catch{}
   if(embedded&&typeof embedded==='object'){const fields=[];const collect=(x,path='')=>{if(typeof x==='string'&&/大丑/.test(x))fields.push({path,value:x});else if(x&&typeof x==='object')for(const[k,v]of Object.entries(x))collect(v,path+'/'+k);};collect(embedded);legacy.push({offset:node.pos,kind:'embedded-frozen-json',sha256:sha(node.text),fields});}
   else legacy.push({offset:node.pos,kind:knownFrozen.has(node.text)?'frozen-rule-text':'unclassified',value:node.text});
  }
  if(/稀有唐宋牌|受赠唐宋牌|永久牺牲.*唐宋牌|须有空唐宋牌槽|牺牲后按真实剩余唐宋牌/.test(node.text))toolCopy.push({offset:node.pos,value:node.text});
 }
 ts.forEachChild(node,visit);
}visit(ast);
const report={testedCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),live:{url:'https://pai.hp666.cc/',bundleURL:'https://pai.hp666.cc/assets/index-Jf_Uhwhc.js',build,bytes:Buffer.byteLength(bundle),sha256:sha(bundle),legacyStringNodes:legacy,currentToolCopyNodes:toolCopy},sourceHits:files};
await writeFile(out+'/source-and-live-bundle.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({revision:build.revision,bundleSha:report.live.sha256,legacyNodes:legacy.length,legacyKinds:legacy.map(r=>r.kind),unclassifiedLegacy:legacy.filter(r=>r.kind==='unclassified'),currentToolCopyNodes:toolCopy,sourceFiles:files.map(r=>({file:r.file,hits:r.hits.length}))},null,2));
