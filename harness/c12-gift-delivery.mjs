/** Controlled production-built component, actual rule + SavedRun receipts. No GameScene integration claim. */
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {gzipSync} from 'node:zlib';
import {resolve} from 'node:path';
import {build,preview} from 'vite';
import {chromium} from 'playwright';

const out=process.env.C12_GIFT_OUT??'shots/c12-gift-delivery',git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
await mkdir(out,{recursive:true});
const report={source:git('rev-parse','HEAD'),sourceStatus:git('status','--short'),scope:'Actual c12 rule/save data; isolated production-built delivery component with a harness source-motion callback. GameScene hookup, natural acquisition, human visual acceptance and physical device NOT_RUN.',cases:[]};
await build({mode:'e2e',build:{outDir:out+'/build',rollupOptions:{input:resolve('harness/c12-gift-component.html')}},logLevel:'error'});
const server=await preview({build:{outDir:out+'/build'},preview:{host:'127.0.0.1',port:5193,strictPort:true},logLevel:'error'});
const browser=await chromium.launch({channel:'msedge'});report.browser=browser.version();
try{
  for(const spec of [{id:'pc',width:1366,height:768},{id:'phone',width:390,height:844,touch:true},{id:'full',width:390,height:844,full:true,touch:true},{id:'reduced',width:390,height:740,reduced:true},{id:'cancel',width:1366,height:768,cancel:true}]){
    const dir=out+'/'+spec.id;await mkdir(dir,{recursive:true});const context=await browser.newContext({viewport:{width:spec.width,height:spec.height},deviceScaleFactor:spec.touch?2:1,isMobile:!!spec.touch,hasTouch:!!spec.touch,reducedMotion:spec.reduced?'reduce':'no-preference',recordVideo:{dir,size:{width:spec.width,height:spec.height}}});
    const page=await context.newPage(),row={spec,errors:[]};report.cases.push(row);page.on('pageerror',e=>row.errors.push(String(e)));
    try{
      await page.goto('http://127.0.0.1:5193/harness/c12-gift-component.html?'+new URLSearchParams({...spec.full?{full:'1'}:{},...spec.reduced?{reduced:'1'}:{}}));
      await page.waitForFunction(()=>window.__c12Gift?.observed.status==='ready');
      assert.ok(await page.evaluate(()=>window.__c12Gift.scene.textures.exists('p08-joker-c12')),'actual c12 art loaded; missing-texture placeholder is not evidence');
      const initial=await page.evaluate(()=>window.__c12Gift.observed.data);row.data={before:initial.before,after:initial.after,facts:initial.facts,duplicate:initial.duplicate.duplicate,restoredDuplicate:initial.restoredDuplicate.duplicate,noDuplicateWrite:initial.noDuplicateWrite};
      assert.equal(initial.firstResult.state.lastTrace.handType,'flush');assert.equal(initial.firstResult.state.lastTrace.finalScore,'700');assert.equal(initial.after.lastTrace.handType,'straight');assert.equal(initial.after.lastTrace.finalScore,'580');
      assert.equal(initial.facts.length,1);assert.equal(initial.facts[0].rewardDefinitionId,'T04');assert.equal(initial.facts[0].sourceInstanceId,'owned/c12');assert.equal(initial.facts[0].destination,spec.full?'gold':'tools');assert.ok(initial.noDuplicateWrite);
      const action=page.getByRole('button',{name:'播放已保存到账',exact:true});if(spec.touch)await action.tap();else await action.click();
      if(!spec.reduced){await page.waitForFunction(()=>window.__c12Gift.observed.frames.some(f=>f.source.y < -7));await page.screenshot({path:dir+'/source.png'});}
      if(spec.cancel){
        await page.waitForFunction(()=>window.__c12Gift.observed.frames.some(f=>f.phase==='flight'));
        await page.getByRole('button',{name:'快进',exact:true}).click();
      }else{
        if(!spec.reduced){await page.waitForFunction(()=>window.__c12Gift.observed.frames.some(f=>f.flight>.35&&f.flight<.8));await page.screenshot({path:dir+'/flight.png'});}
        await page.waitForFunction(()=>window.__c12Gift.observed.arrivals.length===1);await page.screenshot({path:dir+'/arrival.png'});
      }
      await page.waitForFunction(()=>window.__c12Gift.observed.status==='done');
      let observed=await page.evaluate(()=>window.__c12Gift.observed);assert.equal(observed.outcomes[0],spec.cancel?'cancelled':'complete');assert.equal(observed.arrivals.length,spec.cancel?0:1);
      if(!spec.cancel){assert.ok(observed.frames.some(f=>f.phase==='arrival'&&f.caption.includes(spec.full?'道具箱已满 +2金':'方片染 +1')&&f.caption.includes(spec.full?'30→32':'0→1/2')));assert.ok(observed.frames.some(f=>spec.full?f.gold==='金币 32':f.inventory==='道具箱 1/2'));}
      for(const frame of observed.frames.filter(f=>f.phase==='arrival')){const a=frame.payload.bounds,b=frame.target;assert.ok(a.x+a.width<=b.x||a.x>=b.x+b.width||a.y+a.height<=b.y||a.y>=b.y+b.height,'arrival icon does not cover the real destination label');}
      if(spec.reduced){assert.ok(observed.frames.every(f=>f.source.y===0&&f.source.angle===0));assert.ok(!observed.frames.some(f=>f.phase==='flight'));}
      else assert.ok(observed.frames.some(f=>Math.abs(f.source.angle)>1));
      await page.getByRole('button',{name:'重复结算',exact:true}).click();await page.waitForFunction(()=>window.__c12Gift.observed.outcomes.length===2);
      observed=await page.evaluate(()=>window.__c12Gift.observed);assert.equal(observed.outcomes[1],'duplicate');assert.equal(observed.arrivals.length,spec.cancel?0:1);
      const tail=observed.frames.at(-1);assert.equal(tail.nodes,0);assert.deepEqual(tail.source,{x:0,y:0,angle:0});assert.deepEqual(observed.data.after,initial.after);await page.screenshot({path:dir+'/clean.png'});
      await writeFile(dir+'/frames.json.gz',gzipSync(JSON.stringify(observed.frames)));await writeFile(dir+'/saved-data.json.gz',gzipSync(JSON.stringify(initial)));row.status='PASS';row.frames=observed.frames.length;row.arrivals=observed.arrivals;row.outcomes=observed.outcomes;row.sourcePeak=Math.min(...observed.frames.map(f=>f.source.y));row.flightSamples=observed.frames.filter(f=>f.phase==='flight').length;assert.deepEqual(row.errors,[]);
    }finally{await page.close();await context.close();}
  }
  report.status='PASS';
}catch(error){report.status='FAIL';report.error=String(error);process.exitCode=1;console.error(error);}
finally{await browser.close();await server.httpServer.close();await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(report.status,report.cases.map(c=>({id:c.spec.id,status:c.status,frames:c.frames})));}
