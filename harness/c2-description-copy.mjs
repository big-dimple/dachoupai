import {createServer} from 'vite';
import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
const root=process.env.C2_COPY_ROOT??process.cwd(),out=process.env.C2_COPY_OUTPUT??'/tmp/c2-description-copy';
const server=await createServer({root,cacheDir:'/tmp/c2-copy-vite-'+(process.env.C2_COPY_TAG??'current'),server:{middlewareMode:true,hmr:false},appType:'custom',logLevel:'error'});
try{
 const run=await server.ssrLoadModule('/src/domain/run.ts'),domain=await server.ssrLoadModule('/src/domain/r2Run.ts'),profiles=await server.ssrLoadModule('/src/domain/r2GroupUpgrade.ts'),copy=await server.ssrLoadModule('/src/game/JokerMemory.ts'),content=await server.ssrLoadModule('/src/domain/r2ContentProfiles.ts');
 const ids=['mantangcai','c04','c06','jiedongfeng','e11','f10'],legacy={},current=[];
 for(const p of domain.R2_RULESETS){
  const identity={contentVersion:p.contentVersion,contentHash:p.contentHash},s=run.createRun({seed:'c2-copy',runId:'c2-copy',rulesVersion:'r2',characterId:'amo',r2Identity:identity,...(profiles.isR2RouteStarter(p)?{openingRoute:'group'}:{})});
  const rows=[],context=copy.publicJokerMemoryContext(s,{hand:[],scoringLimited:false,deckSize:s.deckInstances.length,jokerSlots:5,jokerCount:0});
  for(const id of ids)for(const inStage of [false,true])for(const owned of [false,true]){
   const ctx={...context,inStage},j=owned?domain.r2CreateJoker(id,id,8,undefined,identity):undefined;
   const before=JSON.stringify({identity,s,ctx,j});const ability=copy.jokerAbilityCopyForRun(identity,id,j,ctx);
   if(JSON.stringify({identity,s,ctx,j})!==before)throw Error('copy mutated input');rows.push({id,inStage,owned,ability});
  }
  const sha256=createHash('sha256').update(JSON.stringify(rows)).digest('hex');
  if(profiles.isR2RouteGrowth(p))current.push({identity,rows});else legacy[p.contentVersion]={contentHash:p.contentHash,sha256,rows:rows.length};
 }
 await mkdir(out,{recursive:true});await writeFile(out+'/copies.json',JSON.stringify({legacy,current},null,2)+'\n');
 console.log(JSON.stringify({legacyProfiles:Object.keys(legacy).length,currentRows:current[0].rows.length,scope:'static public copy render; no scoring or commands'},null,2));
}finally{await server.close();}
