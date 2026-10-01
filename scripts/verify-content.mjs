import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';

const server=await createServer({server:{middlewareMode:true},appType:'custom'});
try {
  const {validateR2Content,R2_JOKERS}=await server.ssrLoadModule('/src/content/r2Schema.ts');
  const {R2_CONTENT_VERSION,R2_CONTENT_HASH}=await server.ssrLoadModule('/src/domain/r2Run.ts');
  const input=process.argv[2] ? JSON.parse(await readFile(process.argv[2],'utf8')) : R2_JOKERS;
  const errors=validateR2Content(input);
  // Conservative legal five-slot bound, including the four extra card triggers.
  const costs=errors.length ? [] : input.map(d=>({
    card:d.hooks.filter(h=>h.phase==='onCardScore').reduce((n,h)=>n+h.operations.length,0),
    held:d.hooks.filter(h=>h.phase==='onHeldCard').reduce((n,h)=>n+h.operations.length,0),
    whole:d.hooks.filter(h=>['jokerScore','afterHand','onStageClear'].includes(h.phase)).reduce((n,h)=>n+h.operations.reduce((sum,op)=>sum+(op.kind==='expire-after-hands'?2:1),0),0),
  }));
  let eventBound=0;
  for(let played=1;played<=5;played++) {
    const worst=costs.map(c=>5*played*c.card+(14-played)*c.held+c.whole).sort((a,b)=>b-a).slice(0,5).reduce((a,b)=>a+b,0);
    const rescueEvents=errors.length?0:input.some(d=>d.hooks.some(h=>h.phase==='beforeFailure'))?2:0;
    eventBound=Math.max(eventBound,3+5*played+worst+5*played+played+rescueEvents); // Includes lifetime count/destruction and the single saved rescue/destruction pair.
  }
  if(eventBound>512)errors.push(`content event bound ${eventBound} exceeds 512`);
  if(errors.length) {console.error(errors.join('\n'));process.exitCode=1;}
  else console.log(JSON.stringify({status:'PASS',definitions:input.length,contentVersion:R2_CONTENT_VERSION,contentHash:R2_CONTENT_HASH,conservativeEventBound:eventBound,readOnly:true},null,2));
} catch(error) {console.error(error.stack);process.exitCode=1;}
finally {await server.close();}
