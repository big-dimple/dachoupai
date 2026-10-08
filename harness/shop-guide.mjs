import assert from 'node:assert/strict';
import { createServer, build, preview } from 'vite';
import { chromium } from 'playwright';
import { tapUI as tapNative, waitScene, confirmHeroRoute } from './ui.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const base = process.env.SHOP_GUIDE_OUTPUT ?? 'shots/w6-shop-guide';
await mkdir(base, { recursive: true });
const v = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true }, logLevel: 'error' });
let send;
try {
    const g = await v.ssrLoadModule('/src/domain/run.ts');
    send = (s, a) => { const r = g.applyCommand(s, { runId: s.runId, commandId: s.runId + '/command/' + (s.commandSeq + 1), expectedSeq: s.commandSeq, action: a }); assert.ok(r.ok, JSON.stringify(r)); return r.state; };
}
finally {
    await v.close();
}
await build({ mode: 'e2e', build: { outDir: base + '/build' }, logLevel: 'error' });
const server = await preview({ build: { outDir: base + '/build' }, preview: { host: '127.0.0.1', port: 5424, strictPort: true }, logLevel: 'error' }), browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--disable-gpu', '--disable-software-rasterizer'] });
const completed=[];
try {
    for (const device of [{ name: 'pc', width: 1366, height: 768 }, { name: 'phone', width: 390, height: 740 }, { name: 'narrow', width: 320, height: 740 }].filter(d=>!process.env.SHOP_GUIDE_CASE||process.env.SHOP_GUIDE_CASE.split(',').includes(d.name))) {
        const dir = base + '/' + device.name;
        await mkdir(dir, { recursive: true });
        const report = { device, head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), scope: 'Single fixed existing seed, real Title/character/default D0, chapter program declined via real UI. No imports, fabricated draws, future-deck reads or seed scans. Software probe, not human retention/device acceptance.', steps: [] };
        const tapUI = (page, key, name) => tapNative(page, key, name, device.name !== 'pc');
        const p = await browser.newPage({ viewport: { width: device.width, height: device.height }, hasTouch: device.name !== 'pc', reducedMotion: device.name==='pc'?'no-preference':'reduce' });
        p.on('dialog', d => d.accept());
        const waitCommand = (before, delta = 1) => p.waitForFunction(({ seq, delta }) => window.__harness.game.registry.get('runController').state.commandSeq === seq + delta, { seq: before.commandSeq, delta });
        const state = () => p.evaluate(() => window.__harness.game.registry.get('runController')?.state), settle = () => p.waitForFunction(() => { const g = window.__harness.game, s = g.registry.get('runController')?.state; if (!s)
            return false; if (['stage-cleared', 'run-lost', 'run-won'].includes(s.phase))
            return g.scene.isActive('intermission'); if (s.phase === 'shop')
            return g.scene.getScene('shop').ready; const a = g.scene.getScene('game'); return a.scene.isActive() && a.ready && !a.presentation && a.cardViews.every(v => !v.dealing && !a.tweens.isTweening(v.container)); }), shot = n => ['group-route','first-hand-entry','first-hand-guide','saved-source-guide','replacement-growth-20','after-sale-fresh-price','short-landscape'].includes(n)?p.screenshot({ path: dir + '/' + n + '.png', scale: 'css' }):Promise.resolve(), close = async () => { await p.getByRole('button', { name: '关闭', exact: true }).click(); await p.waitForTimeout(200); }, record = async (note, actions, before) => { const after = await state(); let expected = before; for (const a of actions)
            expected = send(expected, a); assert.deepEqual(after, expected); report.steps.push({ note, actions, before, after }); };
        try {
            await p.goto('http://127.0.0.1:5424/?harness=1&seed=group-natural-17');
            await waitScene(p, 'title');
            await shot('title');
            await tapUI(p, 'title', 'action/title-start');
            await waitScene(p, 'character-select');
            await tapUI(p, 'character-select', 'character/amo');
            await shot('amo-selected');
            await confirmHeroRoute(p);
            await waitScene(p, 'shop');
            await settle();
            report.initial = await state();
            assert.equal(report.initial.gold, 6);
            assert.equal(report.initial.seed, 'group-natural-17');
            assert.equal(report.initial.characterId, 'amo');
            await shot('initial-six-gold-shop');
            const beforeFocus = await state();
            if (device.name !== 'pc') {
                await tapUI(p, 'shop', 'action/chapter');
                assert.ok(await p.getByRole('button', { name: '选择节目单', exact: true }).isVisible());
                await close();
                assert.deepEqual(await state(), beforeFocus);
            }
            await tapUI(p, 'shop', 'action/build');
            await p.getByRole('button', { name: '选择同点成组', exact: true }).click();
            report.journeyCopy = await p.locator('dialog[open]').innerText();
            report.offerFirstScreen=await p.locator('dialog[open] .experience-card').first().evaluate(e=>{const r=e.getBoundingClientRect(),d=e.closest('dialog').getBoundingClientRect(),footer=e.closest('dialog').querySelector(':scope > .dialog-actions').getBoundingClientRect();return {top:r.top,bottom:r.bottom,dialog:d.bottom,visibleBottom:Math.min(d.bottom,footer.top),text:e.innerText};});assert.ok(report.offerFirstScreen.bottom<=report.offerFirstScreen.visibleBottom,'actual component and action must fit first screen');
            await shot('group-route');
            assert.ok(await p.locator('.first-chapter-guide').isVisible());
            await p.getByRole('button',{name:'略过此提示',exact:true}).click();
            assert.equal(await p.locator('.first-chapter-guide').count(),0);
            report.guideShopSkipped=await p.evaluate(()=>JSON.parse(localStorage.getItem('dachoupai-first-chapter-guide-v1')));
            await close();
            assert.deepEqual(await state(), beforeFocus);
            if (report.initial.program && !report.initial.program.choiceMade) {
                const before = await state();
                await tapUI(p, 'shop', 'action/chapter');
                await p.getByRole('button', { name: '选择节目单', exact: true }).click();
                report.programCopy = await p.locator('dialog[open]').innerText();
                await p.getByRole('button', { name: '本章不接', exact: true }).click();
                await waitCommand(before);
                await settle();
                await record('Optional chapter program declined via public UI', [{ type: 'ChooseProgram', programId: null }], before);
            }
            for (let stage = 0; stage < 3; stage++) {
                const shop = await state(), ids = stage === 0 ? ['b10'] : ['mantangcai', 'b03', 'b04', 'b07', 'c03', 'b11', 'b06', 'f09'], offer = ids.map(id => shop.shop.offers.find(o => o.definitionId === id && o.price <= shop.gold && !shop.jokers.some(j => j.definitionId === id))).find(Boolean);
                if (offer) {
                    if(stage===1){
                        await tapUI(p,'shop','action/build');
                        await p.getByRole('button',{name:'选择顺子接续',exact:true}).click();
                        await close();assert.deepEqual(await state(),shop);
                        await tapUI(p,'shop','offer/'+offer.offerId);
                        await p.getByRole('button',{name:'与持有牌比较',exact:true}).click();
                        report.replacementCopy=await p.locator('dialog[open]').innerText();
                        assert.ok(report.replacementCopy.includes('20')&&report.replacementCopy.includes('不继承成长')&&report.replacementCopy.includes('通用辅助')&&report.replacementCopy.includes('其它路线机会'));
                        await shot('replacement-growth-20');
                        assert.ok(await p.locator('.first-chapter-guide').isVisible());
                        await p.getByRole('button',{name:device.name==='narrow'?'不再显示':'本局不提示',exact:true}).click();
                        report.guideRunSkipped=await p.evaluate(()=>JSON.parse(localStorage.getItem('dachoupai-first-chapter-guide-v1')));
                        await p.getByRole('button',{name:'保留或管理这张',exact:true}).first().click();
                        await p.getByRole('button',{name:'出售',exact:true}).click();
                        await p.getByRole('button',{name:'取消',exact:true}).click();
                        assert.deepEqual(await state(),shop,'comparison and sale cancellation must leave the full saved run unchanged');
                        await p.reload();await waitScene(p,'title');assert.deepEqual(await state(),shop);
                        await tapUI(p,'title','action/title-continue');await waitScene(p,'shop');await settle();
                        await tapUI(p,'shop','offer/'+offer.offerId);assert.equal(await p.locator('.first-chapter-guide').count(),0,'skipping must survive reload while the next-shop hint would otherwise be eligible');
                        await p.getByRole('button',{name:'取消',exact:true}).click();assert.deepEqual(await state(),shop);report.eligibleSkipRestored=true;
                    }
                    await tapUI(p, 'shop', 'offer/' + offer.offerId);
                    report.steps.push({ note: 'Public purchase reasoning: group growth, two-pair multiplier or black scoring support; current offer copy retained', offer, copy: await p.locator('dialog[open]').innerText() });
                    await p.getByRole('button', { name: '取消', exact: true }).click();
                    assert.deepEqual(await state(), shop);
                    await tapUI(p, 'shop', 'offer/' + offer.offerId);
                    await p.getByRole('button', { name: '确认购买', exact: true }).click();
                    await waitCommand(shop);
                    await settle();
                    await record('Real purchase', [{ type: 'BuyOffer', offerId: offer.offerId }], shop);
                }
                else
                    report.steps.push({ note: 'No affordable desired component; continue with current build', offers: shop.shop.offers, gold: shop.gold });
                const before = await state();
                await tapUI(p, 'shop', 'action/start-stage');
                await waitCommand(before, 2);
                await waitScene(p, 'game');
                await settle();
                if (await p.getByRole('button', { name: '开始出牌', exact: true }).isVisible()){
                    const warning=p.getByRole('button',{name:'开始出牌',exact:true});
                    report.bossDismissBox=await warning.boundingBox();
                    await warning.click();report.bossDismissAt=await p.evaluate(()=>performance.now());
                    // Respect the production 350ms anti-click-through window; never bypass or weaken it.
                    await p.waitForTimeout(370);
                    report.bossDismissWait=await p.evaluate(at=>performance.now()-at,report.bossDismissAt);
                }
                await record('Real shop leave and stage entry', [{ type: 'LeaveShop' }, { type: 'EnterStage' }], before);
                await shot('stage-' + stage + '-entry');
                if(stage===0){
                    const beforeGuide=await state();
                    report.firstHandStatus=await p.evaluate(()=>window.__harness.game.scene.getScene('game').statusText.text);assert.ok(report.firstHandStatus.includes('怎么凑牌'));await shot('first-hand-entry');
                    await tapUI(p,'game','selection/hand-rules');
                    report.handGuideCopy=await p.locator('dialog[open]').innerText();
                    assert.ok(report.handGuideCopy.includes('当前公开手牌'));
                    await shot('first-hand-guide');
                    await p.getByRole('button',{name:'略过此提示',exact:true}).click();
                    await close();assert.deepEqual(await state(),beforeGuide);
                }
                let discarded = false;
                for (let turn = 0; turn < 4; turn++) {
                    const s = await state();
                    if (s.phase !== 'await-input')
                        break;
                    const hand = s.handOrder.map(id => s.deckInstances.find(c => c.id === id)), counts = new Map();
                    for (const c of hand) {
                        const xs = counts.get(c.rank) ?? [];
                        xs.push(c);
                        counts.set(c.rank, xs);
                    }
                    const groups = [...counts].filter(([, cs]) => cs.length >= 2).sort((a, b) => b[0] - a[0]);
                    if (!discarded && s.stage.discardsLeft >= (s.stage.boss?.definitionId === 'B01' && s.stage.playIndex === 0 ? 2 : 1) && groups.length < 3) {
                        const singles = hand.filter(c => counts.get(c.rank).length === 1).slice(0, 5).map(c => c.id);
                        if (singles.length && groups.length) {
                            for (const id of singles)
                                await tapUI(p, 'game', 'card/' + id);
                            await shot('stage-' + stage + '-discard-plan');
                            await tapUI(p, 'game', 'action/discard');
                            await waitCommand(s);
                            await settle();
                            await record('Keep public groups; discard singles to seek a spare assist group (no future draw read)', [{ type: 'DiscardHand', selectedIds: singles }], s);
                            discarded = true;
                            turn--;
                            continue;
                        }
                    }
                    const triples = groups.filter(([, cs]) => cs.length >= 3);
                    let selected = triples.length ? triples[0][1].slice(0, 3).map(c => c.id) : groups.length >= 2 ? groups.slice(0, 2).flatMap(([, cs]) => cs.slice(0, 2).map(c => c.id)) : groups.length ? groups[0][1].slice(0, 2).map(c => c.id) : [];
                    if (selected.length) {
                        for (const id of selected)
                            await tapUI(p, 'game', 'card/' + id);
                    }
                    else {
                        await p.waitForFunction(() => window.__harness.game.scene.getScene('game').aiButton.input.enabled);
                        await tapUI(p, 'game', 'selection/switch-type');
                    }
                    const keys = await p.evaluate(() => { const s = window.__harness.game.scene.getScene('game'), a = [], walk = xs => { for (const o of xs) {
                        if (o.name?.startsWith('selection/assist-') && !['selection/assist-prev', 'selection/assist-next'].includes(o.name) && o.input?.enabled)
                            a.push(o.name);
                        if (o.list)
                            walk(o.list);
                    } }; walk(s.children.list); return a; });
                    if(keys.length){await p.evaluate(()=>{const s=window.__harness.game.scene.getScene('game');window.__w6Touches??=[];s.input.once('pointerdown',(p,over)=>{window.__w6Touches.push({type:'all-down',at:performance.now(),targets:over.map(o=>o.name)});for(const o of over.filter(o=>o.name?.startsWith('selection/assist-'))){const at=performance.now();window.__w6Touches.push({type:'down',name:o.name,at});o.once('destroy',()=>window.__w6Touches.push({type:'destroy',name:o.name,at:performance.now(),afterDown:performance.now()-at}));}s.input.once('pointerup',()=>window.__w6Touches.push({type:'up',at:performance.now()}));});});await tapUI(p,'game',keys[0]);await p.waitForFunction(()=>window.__harness.game.scene.getScene('game').assistIds.length>0,{},{timeout:2500});}
                    const draft = await p.evaluate(() => { const s = window.__harness.game.scene.getScene('game'); return { selectedIds: [...s.selectedIds], assistIds: [...s.assistIds], copy: s.statusText.text }; });
                    if (stage === 0 && turn === 0) {
                        await p.setViewportSize(device.name === 'pc' ? { width: 1280, height: 720 } : { width: 740, height: 390 });
                        await p.waitForTimeout(250);
                        assert.deepEqual(await state(), s);
                        const rotated = await p.evaluate(() => { const g = window.__harness.game.scene.getScene('game'); return { selectedIds: [...g.selectedIds], assistIds: [...g.assistIds], copy: g.statusText.text }; });
                        assert.deepEqual(rotated.selectedIds, draft.selectedIds);
                        assert.deepEqual(rotated.assistIds, draft.assistIds);
                        await shot('selection-resized');
                        await p.setViewportSize({ width: device.width, height: device.height });
                        await p.waitForTimeout(250);
                    }
                    await shot('stage-' + stage + '-turn-' + turn + '-selected');
                    const actual = draft.assistIds.length ? { type: 'PlayAssistedHand', selectedIds: draft.selectedIds, assistIds: draft.assistIds } : { type: 'PlayHand', selectedIds: draft.selectedIds };
                    await tapUI(p, 'game', 'action/play');
                    await waitCommand(s);
                    await settle();
                    await record('Real hand; core and assist consume only chosen public cards', [actual], s);
                    report.steps.at(-1).draft = draft;report.steps.at(-1).touches=await p.evaluate(()=>window.__w6Touches??[]);
                    if (stage === 0 && turn === 0) {
                        const committed = await state();
                        await p.reload();
                        await waitScene(p, 'title');
                        assert.deepEqual(await state(), committed);
                        await tapUI(p, 'title', 'action/title-continue');
                        await waitScene(p, 'game');
                        await settle();
                        assert.deepEqual(await state(), committed);
                        const growthCopy=await p.evaluate(()=>{const s=window.__harness.game.scene.getScene('game');const objects=[],walk=xs=>{for(const o of xs){if(o.name==='growth/cause'||o.name==='growth/current')objects.push(o);if(o.list)walk(o.list);}};walk(s.children.list);return objects.map(o=>({name:o.name,text:o.text,bounds:o.getBounds()}));});assert.ok(growthCopy.some(o=>o.name==='growth/cause'&&o.text.includes('0 → 10')),'first saved growth reads domain zero');report.steps.push({note:'Restored first growth measured on actual canvas',growthCopy});
                        await tapUI(p,'game','selection/source-benefits');
                        report.savedGuideCopy=await p.locator('dialog[open]').innerText();
                        assert.ok(report.savedGuideCopy.includes('真实事件')&&report.savedGuideCopy.includes('10'));
                        await shot('saved-source-guide');
                        await p.getByRole('button',{name:'略过此提示',exact:true}).click();
                        await close();assert.deepEqual(await state(),committed);
                        await shot('first-hand-restored');
                        report.steps.push({ note: 'First committed hand reload/continue keeps complete run and RNG', after: committed });
                    }
                }
                const ended = await state();
                await shot('stage-' + stage + '-result');
                report.steps.push({ note: 'Measured actual result text regions', regions: await p.evaluate(() => { const scene = window.__harness.game.scene.getScene('intermission'); if (!scene.scene.isActive())
                        return []; return scene.children.list.flatMap(o => o.list ?? [o]).filter(o => ['result/assist-source', 'result/source-continuity', 'result/gap', 'result/score', 'growth/current', 'growth/cause', 'growth/next'].includes(o.name)).map(o => ({ name: o.name, text: o.text, bounds: o.getBounds() })); }) });
                if(ended.phase==='stage-cleared'){const regions=report.steps.at(-1).regions,g=regions.find(r=>r.name==='growth/current'),cause=regions.find(r=>r.name==='growth/cause'),total=regions.find(r=>r.name==='result/gap');assert.ok(g,'saved cumulative growth must be visible');assert.ok(g.text.includes(ended.jokers.find(j=>j.definitionId==='b10').growth.heat.n));assert.ok(cause.text.includes('→'),'actual chosen hand must explain growth');assert.ok(regions.filter(r=>r.name.startsWith('growth/')).every(r=>r.bounds.y+r.bounds.height<=total.bounds.y));}
                if (ended.lastTrace?.assist && ended.phase === 'stage-cleared') {
                    const regions = report.steps.at(-1).regions;
                    assert.ok(regions.some(r => r.name === 'result/assist-source' && r.text.includes('×' + ended.lastTrace.assist.multiplier)));
                    const source = regions.filter(r => ['result/assist-source', 'result/source-continuity'].includes(r.name)), total = regions.find(r => r.name === 'result/gap');
                    assert.ok(source.every(r => r.bounds.y + r.bounds.height <= total.bounds.y));if(source.length>1)assert.ok(source[0].bounds.y+source[0].bounds.height<=source[1].bounds.y,'assist contribution and saved growth must have separate rows');
                }
                if (ended.phase !== 'stage-cleared') {
                    report.outcome = { phase: ended.phase, stage, reason: ended.outcome };
                    break;
                }
                if (stage === 2) {
                    report.firstChapter = ended;
                    await p.reload();
                    await waitScene(p, 'title');
                    assert.deepEqual(await state(), ended);
                    await tapUI(p, 'title', 'action/title-continue');
                    await waitScene(p, 'intermission');
                    assert.deepEqual(await state(), ended);
                    await shot('boss-restored');
                }
                const prev = await state();
                await tapUI(p, 'intermission', 'action/continue-stage');
                await waitCommand(prev);
                await p.waitForTimeout(500);
                const current = await state();
                await record('Continue after stage via actual UI', [{ type: 'OpenShop' }], prev);
                await shot('stage-' + stage + '-continue');
                if (current.phase !== 'shop') {
                    report.continueDialog = await p.locator('dialog[open]').allTextContents();
                    break;
                }
            }
            assert.equal(report.firstChapter?.phase,'stage-cleared','fixed public route must really finish chapter one');report.final = await state();
            const held=report.final.jokers.find(j=>j.definitionId==='b10'),currentOffer=report.final.shop.offers.find(o=>!o.consumed&&o.price<=report.final.gold);
            assert.ok(held&&currentOffer);
            await tapUI(p,'shop','offer/'+currentOffer.offerId);
            await p.getByRole('button',{name:'与持有牌比较',exact:true}).click();
            const row=p.locator('.experience-card').filter({hasText:'练对子'}).first();
            await row.getByRole('button',{name:'保留或管理这张',exact:true}).click();
            await p.getByRole('button',{name:'出售',exact:true}).click();
            report.saleConfirmation=await p.locator('dialog[open]').innerText();assert.ok(report.saleConfirmation.includes('50'));
            await p.getByRole('button',{name:'确认出售',exact:true}).click();await waitCommand(report.final);await settle();
            await record('Explicit sale via replacement, no automatic buy',[{type:'SellJoker',instanceId:held.instanceId}],report.final);
            const afterSale=await state();assert.equal(afterSale.shop.offers.find(o=>o.offerId===currentOffer.offerId).consumed,false);
            report.freshOfferCopy=await p.locator('dialog[open]').innerText();assert.ok(report.freshOfferCopy.includes('余额 '+afterSale.gold));
            await p.locator('.dialog-purchase-summary').scrollIntoViewIfNeeded();await shot('after-sale-fresh-price');
            await p.getByRole('button',{name:'取消',exact:true}).click();assert.deepEqual(await state(),afterSale);
            report.afterSale=afterSale;
            if(device.name==='phone'){
                await p.setViewportSize({width:740,height:390});await p.waitForTimeout(300);
                await tapUI(p,'shop','offer/'+currentOffer.offerId);await p.getByRole('button',{name:'与持有牌比较',exact:true}).click();
                await shot('short-landscape');await close();assert.deepEqual(await state(),afterSale);
            }
            await p.reload();await waitScene(p,'title');assert.deepEqual(await state(),afterSale);
            await tapUI(p,'title','action/title-continue');await waitScene(p,'shop');await settle();
            await tapUI(p,'shop','offer/'+currentOffer.offerId);assert.equal(await p.locator('.first-chapter-guide').count(),0);await p.getByRole('button',{name:'取消',exact:true}).click();assert.deepEqual(await state(),afterSale);
            report.skipRestored=true;
            report.touches=await p.evaluate(()=>window.__w6Touches??[]);report.status = 'PROBE_COMPLETE';completed.push(report.final);
        }
        catch (e) {
            report.status = 'FAIL';
            report.error = String(e);report.errorStack=e.stack;report.failedState=await state();
            report.touches=await p.evaluate(()=>window.__w6Touches??[]);report.dialogs = await p.locator('dialog[open]').allTextContents();
            await p.screenshot({path:dir+'/FAIL.png',scale:'css'});
            process.exitCode = 1;
        }
        finally {
            await writeFile(dir + '/report.json', JSON.stringify(report, null, 2));
            console.log(JSON.stringify({ status: report.status, error: report.error, final: report.final && { phase: report.final.phase, stageIndex: report.final.stageIndex, gold: report.final.gold }, steps: report.steps.map(s => ({ note: s.note, score: s.after?.lastTrace?.finalScore, phase: s.after?.phase, stage: s.after?.stageIndex })) }));
            await p.close();
        }
    }
    for(const final of completed.slice(1))assert.deepEqual(final,completed[0],'same visible decisions must persist identical PC/phone runs');
}
finally {
    await browser.close();
    await new Promise(r => server.httpServer.close(r));
}
