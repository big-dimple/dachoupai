import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {tapUI,waitScene,openSelector} from '../../../../harness/ui.mjs';
const out='docs/production/evidence/tangsong-visible-name-2026-10-17';await mkdir(out,{recursive:true});
const v=await createServer({mode:'e2e',cacheDir:'shots/.vite-name-check',server:{host:'127.0.0.1',port:5688,strictPort:true},logLevel:'error'});await v.listen();
const b=await chromium.launch(),ctx=await b.newContext({viewport:{width:1366,height:768}}),p=await ctx.newPage(),report={base:'c4525b2c2faf77ad2df0b5486e0ea64276856d04',browser:b.version(),scope:'Fresh local context; actual title/version menu and ordinary-mode controls. No run started, no unlocks or imported player save. Not a complete UI, mobile or physical-device review.',errors:[]};
p.on('pageerror',e=>report.errors.push(String(e)));p.setDefaultTimeout(60000);
try{
 await p.goto('http://127.0.0.1:5688/?harness=1',{waitUntil:'domcontentloaded'});await waitScene(p,'title');
 const before=await p.evaluate(()=>Object.fromEntries(Object.entries(localStorage).sort()));
 await p.locator('.run-menu-toggle').click();await p.getByText('本局与版本',{exact:true}).click();await p.getByRole('button',{name:'版本信息',exact:true}).click();report.version=await p.locator('.run-menu-modal').innerText();assert.match(report.version,/72张唐宋牌/);assert.doesNotMatch(report.version,/大丑/);await p.screenshot({path:out+'/version-menu.png',scale:'css'});await p.locator('.run-menu-toggle').click();
 await openSelector(p);await tapUI(p,'character-select','action/select-mode');await p.locator('[data-dialog-kind="mode-select"]').waitFor();report.mode=await p.locator('[data-dialog-kind="mode-select"]').innerText();assert.match(report.mode,/72张唐宋牌/);assert.match(report.mode,/唐宋牌 5 槽/);assert.doesNotMatch(report.mode,/大丑/);await p.screenshot({path:out+'/mode-normal.png',scale:'css'});await p.getByRole('button',{name:'取消',exact:true}).click();
 report.noRun=await p.evaluate(()=>!window.__harness.game.registry.get('runController'));assert.ok(report.noRun);report.localStorageBefore=before;report.localStorageAfter=await p.evaluate(()=>Object.fromEntries(Object.entries(localStorage).sort()));
 // Existing menu hint preference is deliberately marked when the menu is viewed.
 const withoutHint=value=>Object.fromEntries(Object.entries(value).filter(([key])=>key!=='dachoupai-fullscreen-hint-v1'));assert.deepEqual(withoutHint(report.localStorageAfter),withoutHint(before));assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.error=e.stack;process.exitCode=1;await p.screenshot({path:out+'/observer-failure.png',scale:'css'}).catch(()=>{});}
finally{await writeFile(out+'/native.json',JSON.stringify(report,null,2));await b.close();await v.close();console.log(JSON.stringify({status:report.status,noRun:report.noRun,errors:report.errors,error:report.error}));}
