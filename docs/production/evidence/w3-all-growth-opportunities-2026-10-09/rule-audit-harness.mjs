import {createServer} from '/workspace/dachoupai/node_modules/vite/dist/node/index.js';
const server=await createServer({root:'/workspace/dachoupai',server:{middlewareMode:true},logLevel:'error'});
const {R2_GROUP_UPGRADE_JOKERS:defs}=await server.ssrLoadModule('/src/content/r2GroupUpgradeJokers.ts');
const keys=['add-growth','add-coefficient','multiply-coefficient-once','update-score-growth','reset-coefficient'];
console.log(JSON.stringify(defs.flatMap(d=>{const writes=d.hooks.filter(h=>h.operations.some(o=>keys.includes(o.kind)));return writes.length?[{id:d.id,name:d.name,hooks:writes,reads:d.hooks.filter(h=>h.operations.some(o=>['read-growth','read-coefficient','consume-growth'].includes(o.kind))),oldOpportunity:!!d.hooks.find(h=>h.phase==='afterHand'&&h.operations.some(o=>o.kind==='add-growth'))}]:[]}),null,2));await server.close();
