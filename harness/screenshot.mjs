/** Real startup using observed UI hit areas, mouse on desktop and touch on mobile. */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import {waitScene,chooseCharacter,tapUI} from './ui.mjs';
const root=process.cwd(),port=Number(process.env.SHOT_PORT||5199),base=`http://localhost:${port}/?harness=1`,verify=process.argv.includes('--verify-smoke');
const server=spawn(process.execPath,[path.join(root,'node_modules/vite/bin/vite.js'),'--mode','e2e','--port',String(port),'--strictPort'],{cwd:root,stdio:'ignore',windowsHide:true});let browser;
try {
  const deadline=Date.now()+30000;while(true){try{if((await fetch(base)).ok)break;}catch{}if(Date.now()>deadline)throw Error('smoke server timeout');await new Promise(r=>setTimeout(r,200));}
  browser=await chromium.launch();if(!verify)await mkdir('shots',{recursive:true});
  for(const [name,viewport] of Object.entries({desktop:{width:1280,height:800},mobile:{width:390,height:844}})){
    const touch=name==='mobile',context=await browser.newContext({viewport,hasTouch:touch}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
    await page.goto(base);await waitScene(page,'character-select');
    const count=await page.evaluate(()=>{const s=window.__harness.game.scene.getScene('character-select');const walk=list=>list.reduce((n,o)=>n+(o.name.startsWith('character/')?1:0)+(o.list?walk(o.list):0),0);return walk(s.children.list);});assert.equal(count,6);
    if(!verify)await page.screenshot({path:`shots/${name}-select.png`});
    await chooseCharacter(page,'amo',touch);assert.equal(await page.evaluate(()=>window.__harness.game.registry.get('runState').characterId),'amo');
    if(!verify)await page.screenshot({path:`shots/${name}-shop.png`});
    await tapUI(page,'shop','action/start-stage',touch);await waitScene(page,'game');await page.waitForFunction(()=>window.__harness.game.scene.getScene('game').cardViews.length>0);
    if(!verify)await page.screenshot({path:`shots/${name}-game.png`});assert.deepEqual(errors,[]);await context.close();console.log(`${name}: ok`);
  }
}finally{await browser?.close();server.kill();}
console.log(verify?'smoke: ok':'shots saved to shots/');
