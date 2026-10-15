/** Summarize read-only observer JSONL without dropping its raw artifact. */
import fs from 'node:fs';
const round=n=>Math.round(n*100)/100;
for(const file of process.argv.slice(2)){
 const rows=fs.readFileSync(file,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
 const snapshots=rows.filter(r=>r.kind==='snapshot'),groups=new Map();
 for(const r of rows.filter(r=>r.kind==='api'||r.kind==='input')){
  const key=r.label==='poststep'?'poststep':r.method;
  const list=groups.get(key)??[];list.push(r.ms);groups.set(key,list);
 }
 const stats=list=>{const sorted=[...list].sort((a,b)=>a-b);return {count:list.length,totalMs:round(list.reduce((a,b)=>a+b,0)),meanMs:round(list.reduce((a,b)=>a+b,0)/list.length),p95Ms:round(sorted[Math.floor((sorted.length-1)*.95)]),maxMs:round(sorted.at(-1))};};
 const phase=s=>({scene:s.scene,frames:s.frames.count,meanFrameMs:round(s.frames.totalMs/s.frames.count),meanFps:round(1000*s.frames.count/s.frames.totalMs),maxFrameMs:round(s.frames.maxMs),over100ms:s.frames.over100ms,meanStepMs:round(s.step.totalMs/s.step.count),maxStepMs:round(s.step.maxMs),meanRenderMs:round(s.render.totalMs/s.render.count),maxRenderMs:round(s.render.maxMs)});
 console.log(JSON.stringify({file,launch:rows.filter(r=>r.kind==='launch'),contexts:rows.filter(r=>r.kind==='context'),renderers:rows.filter(r=>r.kind==='renderer'),phaseStarts:rows.filter(r=>r.kind==='phase-start'),api:Object.fromEntries([...groups].map(([k,v])=>[k,stats(v)])),snapshots:snapshots.map(r=>({label:r.label,elapsedMs:round(r.elapsedMs),renderer:r.data?.renderer,phases:r.data?.phases.map(phase),decode:stats(r.data?.decodes.map(d=>d.ms)??[]),slowestDecodes:r.data?.decodes.toSorted((a,b)=>b.ms-a.ms).slice(0,5),resources:stats(r.data?.resources.map(r=>r.duration)??[]),longTasks:stats(r.data?.longTasks.map(r=>r.duration)??[])}))},null,2));
}
