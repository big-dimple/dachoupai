import {chromium} from 'playwright';
import {createServer} from 'vite';
import {waitScene,tapUI,confirmHeroRoute} from '../../harness/ui.mjs';
import {writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const server=await createServer({mode:'e2e',server:{host:'127.0.0.1',port:5188,strictPort:true}});await server.listen();
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const records=[];
try{for(const width of [390,1366]){
const context=await browser.newContext({viewport:{width,height:width===390?844:900},hasTouch:width===390,deviceScaleFactor:1});const page=await context.newPage();
await page.goto('http://127.0.0.1:5188/?harness=1&seed=card-value-baseline');await waitScene(page,'title');await tapUI(page,'title','action/title-start');await waitScene(page,'character-select');await tapUI(page,'character-select','character/amo');await confirmHeroRoute(page,false,'group');await waitScene(page,'shop');await page.waitForTimeout(1200);
await page.screenshot({path:`prototypes/card-value-visual/evidence/baseline-${width}-shop.png`});
const info=await page.evaluate(()=>{const s=window.__harness.game.registry.get('runController').state;return{characterId:s.characterId,openingRoute:s.openingRoute,contentVersion:s.contentVersion,offers:s.shop.offers};});records.push({width,info});await context.close();
}}finally{await browser.close();await server.close();}
await writeFile('prototypes/card-value-visual/evidence/baseline.json',JSON.stringify({base:execFileSync('git',['rev-parse','origin/main'],{encoding:'utf8'}).trim(),kind:'local main runtime, natural opening shop only',records},null,2));
