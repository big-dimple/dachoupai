import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {tapUI,waitScene} from './ui.mjs';
const out=process.env.BUDGET_OUT||'/tmp/viewport-budget';await mkdir(out,{recursive:true});
const server=await createServer({mode:'e2e',server:{host:'127.0.0.1',port:5463,strictPort:true},logLevel:'error'});await server.listen();
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),scope:'Read-only title/selector, actual canvas allocation and browser clicks; no run creation or natural play',cases:[]};
try{for(const [width,height,dpr]of [[390,740,3],[1366,768,1.25],[1920,1080,2],[5120,2880,1],[7680,4320,1],[8192,4320,2]]){
 const p=await browser.newPage({viewport:{width,height},deviceScaleFactor:dpr}),row={width,height,dpr,errors:[]};report.cases.push(row);p.on('pageerror',e=>row.errors.push(String(e)));
 try{await p.goto('http://127.0.0.1:5463/?harness=1');await waitScene(p,'title');
 row.metrics=await p.evaluate(()=>{const g=window.__harness.game,s=g.scene.getScene('title'),c=g.canvas,b=c.getBoundingClientRect();return {backing:[c.width,c.height],pixels:c.width*c.height,css:[b.width,b.height],layout:[s.view.layout.width,s.view.layout.height],camera:[s.cameras.main.zoomX,s.cameras.main.zoomY]};});
 assert.ok(row.metrics.pixels<=9000000);assert.deepEqual(row.metrics.css,[width,height]);assert.deepEqual(row.metrics.layout,[width,height]);if(width*height>9000000)assert.ok(row.metrics.camera.every(z=>z<1));
 await tapUI(p,'title','action/title-start');await waitScene(p,'character-select');assert.equal(await p.evaluate(()=>window.__harness.game.registry.get('runController')?.state??null),null,'opening the draft creates no run');
 await p.screenshot({path:out+'/'+width+'-clip.png',clip:{x:0,y:0,width:Math.min(800,width),height:Math.min(360,height)},scale:'css'});assert.deepEqual(row.errors,[]);row.status='PASS';
 }catch(e){row.status='FAIL';row.error=String(e.stack||e);throw e;}finally{await p.close();}
}report.status='PASS';}catch(e){report.status='FAIL';process.exitCode=1;}finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));await browser.close();await server.close();}
