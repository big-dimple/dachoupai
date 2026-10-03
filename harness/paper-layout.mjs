/** D44 natural nine-card hand: native input, actual text bounds, responsive fire lanes. */
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {chooseCharacter,buyOffer,tapUI,waitScene,point} from './ui.mjs';

const baseline=process.env.PAPER_BASELINE==='1',dir=process.env.PAPER_DIR||`shots/d44/${baseline?'before':'after'}`;
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
const report={baseline,browser:browser.version(),renderer:'Canvas',runs:[],limits:['Linux browser input/viewport simulation; physical OnePlus, Android browser chrome and hardware WebGL NOT_RUN.','New character/Joker pictures are supplied by a separate art branch and are not part of this batch.']};
const ready=p=>p.waitForFunction(()=>{const s=window.__harness?.game.scene.getScene('game');return s?.ready&&s.cardViews.length===9&&s.cardViews.every(v=>!v.dealing&&!s.tweens.isTweening(v.container));});
async function observe(p){return p.evaluate(()=>{
  const g=window.__harness.game,s=g.scene.getScene('game'),l=s.view.layout;
  const bounds=o=>{const b=o.getBounds();return{x:b.x,y:b.y,width:b.width,height:b.height};};
  return {renderer:g.renderer.gl?'WebGL':'Canvas',fps:g.loop.actualFps,layout:l,selected:[...s.selectedIds],state:g.registry.get('runController').state,
    score:[s.resultText,...s.scoreLabels,s.scoreHeat,s.scoreMult,s.scoreTotal,s.breakdownText].filter(o=>o.visible&&o.text).map(o=>({text:o.text,bounds:bounds(o),font:o.style.fontSize})),
    cards:s.cardViews.map(v=>({id:v.card.id,visible:v.container.visible,x:v.container.x,y:v.container.y,scale:v.container.scaleX,hit:bounds(v.hit),rank:bounds(v.container.list.find(o=>o.name==='rank-index')),selection:v.selectionMark.visible?bounds(v.selectionMark):null})),
    assets:performance.getEntriesByType('resource').filter(e=>e.name.includes('/assets/')).map(e=>({path:new URL(e.name).pathname,bytes:e.encodedBodySize})),
    labels:[s.handCountText,s.pileText,s.rankButton.getData('label'),s.suitButton.getData('label')].filter(o=>o.visible).map(o=>({text:o.text,bounds:bounds(o)}))};
});}
function intersect(a,b){return a.x<b.x+b.width-.01&&b.x<a.x+a.width-.01&&a.y<b.y+b.height-.01&&b.y<a.y+a.height-.01;}
function validate(o){
  assert.equal(o.layout.handOverflow,false,'nine cards never page');assert.equal(o.cards.filter(c=>c.visible).length,9);
  for(const c of o.cards){assert.equal(c.scale,1);assert.ok(c.hit.width>=(o.layout.width<360?30:36)-.01);assert.ok(c.rank.x+c.rank.width<=c.hit.x+c.hit.width+.01,'whole rank/suit remains in exposed seat');}
  const controls=[...Object.values(o.layout.buttons),...Object.values(o.layout.tableActions)];
  for(const text of o.score){assert.ok(!intersect(text.bounds,o.layout.scoreFire),'real text outside fire footer: '+text.text);for(const control of controls)assert.ok(!intersect(text.bounds,control),'score text never covers control: '+text.text);assert.ok(!intersect(text.bounds,o.layout.hand),'score above hand');}
  for(let i=0;i<o.score.length;i++)for(let j=i+1;j<o.score.length;j++)assert.ok(!intersect(o.score[i].bounds,o.score[j].bounds),'distinct actual score text: '+o.score[i].text+' / '+o.score[j].text);
}
async function swipe(p,cdp,ids,indices){
  const positions=[];for(const i of indices)positions.push(await point(p,'game','card/'+ids[i]));
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...positions[0],id:1}]});
  for(const q of positions.slice(1))await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...q,id:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
}
try{
  for(const [width,height] of [[360,640],[390,740],[430,932],[844,360],[1280,720],[320,568]]){
    const touch=width<1000,context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:touch,deviceScaleFactor:touch?3:1,recordVideo:baseline?undefined:{dir:dir+'/video',size:{width,height}}}),p=await context.newPage(),cdp=await context.newCDPSession(p),r={viewport:{width,height},dpr:touch?3:1,checks:[],errors:[]};report.runs.push(r);
    p.on('pageerror',e=>r.errors.push(String(e)));
    try{
      await p.goto((process.env.PAPER_URL||'http://127.0.0.1:5244/')+'?harness=1&seed=d44-nine-69');await chooseCharacter(p,'amo',touch);await p.waitForFunction(()=>window.__harness.game.scene.getScene('shop').ready);
      await p.screenshot({path:`${dir}/${width}x${height}-shop.png`});
      const offer=await p.evaluate(()=>window.__harness.game.registry.get('runController').state.shop.offers.find(o=>o.definitionId==='d06'));
      assert.ok(offer,'natural hand-limit offer');await buyOffer(p,offer.offerId,touch);await p.waitForTimeout(370);await tapUI(p,'shop','action/start-stage',touch);await waitScene(p,'game');await ready(p);
      r.rest=await observe(p);await p.screenshot({path:`${dir}/${width}x${height}-rest.png`});
      if(baseline){r.checks.push('Baseline captured, existing collisions not accepted');continue;}
      validate(r.rest);r.checks.push('Nine visible distinct seats / actual score and control bounds');
      const ids=r.rest.state.handOrder;
      await swipe(p,cdp,ids,[0,1,2,3,4]);await p.waitForTimeout(180);r.five=await observe(p);validate(r.five);assert.deepEqual(r.five.selected,ids.slice(0,5));assert.deepEqual(r.five.state,r.rest.state);await p.screenshot({path:`${dir}/${width}x${height}-five.png`});
      await swipe(p,cdp,ids,[4,3,2,1,0]);assert.equal((await observe(p)).selected.length,0);r.checks.push('Both directions select/cancel; five limit; domain unchanged');
      await tapUI(p,'game','card/'+ids[8],touch);await p.waitForTimeout(180);let selected=await observe(p);assert.deepEqual(selected.selected,[ids[8]]);
      for(const name of ['action/sort-rank','action/sort-suit']){const before=await observe(p);await tapUI(p,'game',name,touch);await ready(p);const after=await observe(p);assert.deepEqual(after.selected,selected.selected);assert.deepEqual(after.state.rng,before.state.rng);validate(after);}
      for(const size of [{width:844,height:360},{width:844,height:300},{width:844,height:390},{width:390,height:640},{width:390,height:844},{width,height}]){
        const before=await observe(p);await p.setViewportSize(size);await ready(p);const after=await observe(p);validate(after);assert.deepEqual(after.selected,before.selected);assert.deepEqual(after.state,before.state);r.checks.push('Resize preserves seats/state '+size.width+'x'+size.height);
      }
      r.final=await observe(p);await p.screenshot({path:`${dir}/${width}x${height}-final.png`});assert.deepEqual(r.errors,[]);
    }catch(error){r.error=String(error);r.failure=await observe(p).catch(()=>null);await p.screenshot({path:`${dir}/${width}x${height}-failure.png`});throw error;}finally{await context.close();}
  }
  report.status='PASS';
}catch(error){report.status='FAIL';report.error=String(error);process.exitCode=1;}
finally{await browser.close();await writeFile(dir+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,runs:report.runs.map(r=>({viewport:r.viewport,checks:r.checks,error:r.error}))},null,2));}
