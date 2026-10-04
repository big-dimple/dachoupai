import type Phaser from 'phaser';
import {gameSession} from './session';
import {heatText} from './scoreText';
import {HAND_LABELS} from '../content/handLabels';
import {MAX_IMPORT_BYTES} from '../application/checkpoint';
import type {GameScene} from './GameScene';
import {buildInfo,formatBuildInfo} from '../platform/buildInfo';
import {AudioEngine} from '../audio/AudioEngine';
import {readAudioPreferences} from '../audio/preferences';
import {installFullscreen} from '../platform/Fullscreen';
import {R2_JOKERS} from '../content/r2Schema';
import {R2_AVAILABLE_CHAPTERS} from '../domain/r2Chapter';

function download(text:string,name:string):void {
  const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),link=document.createElement('a');
  link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export interface RunMenuActions {
  viewDeck?:()=>void;
  viewRules?:()=>void;
  viewLastHand?:()=>void;
}
export function routeSavedRun(game:Phaser.Game):void {
  const session=gameSession(),run=session.run;if(!run||session.pendingRun||session.working)return;
  game.registry.set('runController',run);game.registry.set('runState',run.state);game.registry.set('characterId',run.state.characterId);game.registry.set('seed',run.state.seed);
  const state=run.state;
  const target=state.phase==='shop'?'shop':['stage-ready','await-input'].includes(state.phase)?'game':state.stage?'intermission':'character-select';
  for(const key of ['title','character-select','shop','game','intermission'])game.scene.stop(key);
  game.scene.start(target,target==='intermission'?{cleared:state.phase==='stage-cleared'||state.phase==='run-won',stageIndex:state.stage!.index,stageHeat:state.stage!.heat,handsLeft:state.stage!.handsLeft,goldEarned:state.stage!.goldEarned}:undefined);
}

/** Progress and presentation preferences survive scene changes. */
export function installRunMenu(game:Phaser.Game,getActions:()=>RunMenuActions|undefined=()=>game.registry.get('runMenuActions') as RunMenuActions|undefined):void {
  const session=gameSession(),audio=AudioEngine.shared,fullscreen=installFullscreen();
  const host=document.createElement('div'),toggle=document.createElement('button'),fullButton=document.createElement('button'),modal=document.createElement('dialog'),panel=document.createElement('section'),status=document.createElement('p');
  const fullscreenInfo=document.createElement('p'),fullscreenNotice=document.createElement('p'),dock=document.createElement('button'),dockPanel=document.createElement('div');
  dock.className='fullscreen-dock';dock.type='button';dock.textContent='⛶';dock.hidden=true;dock.setAttribute('aria-label','展开全屏控制');dock.setAttribute('aria-expanded','false');dockPanel.className='fullscreen-dock-panel';dockPanel.hidden=true;
  const collapseDock=()=>{dockPanel.hidden=true;dock.setAttribute('aria-expanded','false');};
  const syncDock=()=>{const active=fullscreen.getState().active;dock.hidden=!active||modal.open;fullButton.hidden=active;toggle.hidden=active&&!modal.open;collapseDock();};
  dock.onclick=()=>{dockPanel.hidden=!dockPanel.hidden;dock.setAttribute('aria-expanded',String(!dockPanel.hidden));};
  let previousFocus:HTMLElement|undefined,attentionKey='',noticeTimer:ReturnType<typeof setTimeout>|undefined;
  const stored=(key:string):unknown=>{try{return JSON.parse(localStorage.getItem(key)??'null');}catch{return null;}};
  const audioPreferences=readAudioPreferences(stored('dachoupai-audio-v2'),stored('dachoupai-audio-v1'),stored('dachoupai-presentation-v1'));
  audio.setVolume('master',1);audio.muted=false;audio.musicMuted=false;
  audio.setVolume('music',audioPreferences.music);audio.setVolume('sfx',audioPreferences.sfx);audio.setVolume('ui',audioPreferences.sfx);
  host.className='run-menu';toggle.className='run-menu-toggle';fullButton.className='run-fullscreen-toggle';
  toggle.type=fullButton.type='button';toggle.textContent='菜单';toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls','run-menu-modal');
  modal.id='run-menu-modal';modal.className='run-menu-modal';modal.setAttribute('aria-labelledby','run-menu-heading');panel.className='run-menu-panel';
  const heading=document.createElement('h2');heading.id='run-menu-heading';heading.textContent='本局与设置';panel.append(heading);
  status.className='run-menu-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');panel.append(status);
  fullscreenInfo.className='run-menu-fullscreen-info';fullscreenInfo.hidden=true;
  fullscreenNotice.className='run-fullscreen-notice';fullscreenNotice.hidden=true;fullscreenNotice.setAttribute('role','status');
  const restoreAnchor=()=>{
    host.prepend(fullButton,toggle);syncDock();toggle.textContent='菜单';toggle.setAttribute('aria-expanded','false');
    toggle.setAttribute('aria-label',toggle.classList.contains('needs-attention')?'菜单，有进度提示待处理':'菜单');
    if(previousFocus?.isConnected&&!previousFocus.hidden)previousFocus.focus({preventScroll:true});else (dock.hidden?toggle:dock).focus({preventScroll:true});previousFocus=undefined;
  };
  const close=()=>{if(modal.open){if(typeof modal.close==='function')modal.close();else modal.removeAttribute('open');}restoreAnchor();};
  const open=()=>{
    if(modal.open)return;previousFocus=document.activeElement instanceof HTMLElement?document.activeElement:undefined;
    refreshPlayback();
    // The same two fixed buttons enter the modal top layer; their viewport anchors do not move.
    modal.prepend(fullButton,toggle);toggle.textContent='关闭';toggle.setAttribute('aria-expanded','true');toggle.setAttribute('aria-label','关闭菜单');fullscreenNotice.hidden=true;clearTimeout(noticeTimer);
    if(typeof modal.showModal==='function')modal.showModal();else modal.setAttribute('open','');syncDock();
    const action=[retry,reload,takeover,resume].find(button=>!button.hidden&&!button.disabled);(action??toggle).focus({preventScroll:true});
  };
  toggle.onclick=()=>modal.open?close():open();
  modal.addEventListener('cancel',event=>{event.preventDefault();close();});
  modal.addEventListener('close',()=>{if(toggle.parentElement===modal)restoreAnchor();});
  modal.addEventListener('click',event=>{if(event.target===modal)close();});
  modal.addEventListener('keydown',event=>{if(event.key==='Escape'&&typeof modal.showModal!=='function'){event.preventDefault();close();}});
  const button=(name:string,action:()=>void|Promise<unknown>,container:HTMLElement=panel)=>{
    const b=document.createElement('button');b.type='button';b.textContent=name;
    b.onclick=async()=>{if(b.disabled)return;try{await action();}catch{status.textContent='操作未完成，原进度保留。请重试或导出存档。';open();}};
    container.append(b);return b;
  };
  const primary=document.createElement('div');primary.className='run-menu-primary';panel.append(primary);
  const resume=button('继续本局',()=>{
    const run=session.run;if(!run){close();return;}
    const target=run.state.phase==='shop'?'shop':['stage-ready','await-input'].includes(run.state.phase)?'game':run.state.stage?'intermission':'character-select';
    // Closing a menu on the current scene preserves the player's unsubmitted card selection.
    if(game.registry.get('runController')!==run||!game.scene.isActive(target))routeSavedRun(game);close();
  },primary);resume.className='dialog-primary';
  const inspect=document.createElement('div');inspect.className='run-menu-inspect';panel.append(inspect);
  const inspectButtons=(['viewDeck','viewRules','viewLastHand'] as const).map((key,index)=>{
    const action=button(['查看牌组','规则 / 物品','上手详情'][index],()=>{
      const callback=getActions()?.[key];if(typeof callback!=='function'){refreshPlayback();return;}
      close();callback();
    },inspect);
    action.dataset.menuAction=key;return {key,button:action};
  });
  const recovery=document.createElement('div');recovery.className='run-menu-recovery';panel.append(recovery);
  const retry=button('重试保存',async()=>{if(await session.retry()){routeSavedRun(game);close();}},recovery);
  const exportCandidate=button('导出未保存候选',()=>{if(session.pendingRun)download(session.pendingRun.exportJSON(),'dachoupai-unsaved-candidate.json');},recovery);
  const cancelCandidate=button('取消候选，保留原局',()=>{
    if(!session.pendingRun||!window.confirm('放弃尚未保存的新局或导入候选？原局会保留。需要保留候选时，请先导出。'))return;
    if(session.cancelPending())close();
  },recovery);
  const reload=button('重试读取',()=>session.initialize(),recovery);
  const takeover=button('接管写入',async()=>{
    if(!await session.takeOver()||!session.run)return;
    routeSavedRun(game);
    await new Promise<void>(resolve=>game.events.once('poststep',resolve));close();
  },recovery);
  const settingsTools=document.createElement('details'),settingsSummary=document.createElement('summary');settingsSummary.textContent='画面与声音';settingsTools.className='run-menu-settings-tools';settingsTools.append(settingsSummary);
  const settings=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent='演出与音量';settings.className='run-menu-settings';settings.append(legend);settingsTools.append(settings);panel.append(settingsTools);
  panel.append(fullscreenInfo);
  const saveTools=document.createElement('details'),saveSummary=document.createElement('summary');saveSummary.textContent='进度与存档';saveTools.append(saveSummary);
  const start=button('开始新局',async()=>{
    if(session.run&&!await session.run.flush())return;
    if(session.run&&!window.confirm('返回选角开始新局？选择新角色前会再次确认，已有存档保留为备份。'))return;
    for(const key of ['title','shop','game','intermission'])game.scene.stop(key);game.scene.start('character-select');close();
  },saveTools);
  const exit=button('保存并退出',async()=>{
    if(!window.confirm('保存已经确定的结果并退出？稍后可继续本局。'))return;
    if(session.run&&!await session.run.flush())return;
    for(const key of ['title','shop','game','intermission'])game.scene.stop(key);game.scene.start('character-select');close();
  },saveTools);
  const exportRun=button('导出本局',()=>{if(session.run)download(session.run.exportJSON(),'dachoupai-checkpoint.json');},saveTools);
  button('导出保留数据',async()=>{try{download(await session.storage.exportRetained(),'dachoupai-retained-data.json');}catch{status.textContent='导出失败，原数据未修改。';}},saveTools);
  const file=document.createElement('input');file.type='file';file.accept='.json,application/json';file.hidden=true;
  const importRun=button('导入本局',()=>file.click(),saveTools);file.onchange=async()=>{
    try{
      const selected=file.files?.[0];file.value='';if(!selected)return;
      if(selected.size>MAX_IMPORT_BYTES){status.textContent='导入失败：文件过大，原进度未修改。';return;}
      if(session.run&&!window.confirm('用导入的完整存档替换当前进度？当前有效存档会保留为备份。'))return;
      if(await session.importJSON(await selected.text())){routeSavedRun(game);close();}
    }catch{status.textContent='无法读取导入文件，原进度未修改。';open();}
  };panel.append(file);
  const speedLabel=document.createElement('label'),speed=document.createElement('select');speedLabel.textContent='演出速度 ';
  for(const value of [1,2,4]){const option=document.createElement('option');option.value=String(value);option.textContent=`${value}×`;speed.append(option);}speed.value=String(session.speed);speedLabel.append(speed);settings.append(speedLabel);
  const reduced=document.createElement('input'),reducedLabel=document.createElement('label');reduced.type='checkbox';reduced.checked=session.reducedMotion;reducedLabel.append(reduced,document.createTextNode(' 减少动态'));settings.append(reducedLabel);
  const presentation=()=>session.preferences(Number(speed.value) as 1|2|4,reduced.checked);
  speed.onchange=presentation;reduced.onchange=presentation;
  const audioControls=document.createElement('div');audioControls.className='audio-controls';settings.append(audioControls);
  for(const [bus,label]of [['music','背景音量'],['sfx','音效音量']] as const){
    const row=document.createElement('label'),name=document.createElement('span'),range=document.createElement('input'),value=document.createElement('output');
    row.className='audio-volume-label';name.textContent=label;range.type='range';range.min='0';range.max='100';range.step='1';range.value=String(Math.round(audio.getVolume(bus)*100));range.setAttribute('aria-label',label);value.textContent=range.value+'%';value.className='audio-volume-value';
    row.append(name,range,value);audioControls.append(row);
    range.oninput=()=>{const volume=Number(range.value)/100;audio.setVolume(bus,volume);if(bus==='sfx')audio.setVolume('ui',volume);value.textContent=range.value+'%';void audio.unlock();saveAudio();};
  }
  const audioHint=document.createElement('small');audioHint.className='audio-controls-hint';audioHint.textContent='拖到 0% 即关闭这一类声音';audioControls.append(audioHint);
  function saveAudio():void {try{localStorage.setItem('dachoupai-audio-v2',JSON.stringify({version:2,music:audio.getVolume('music'),sfx:audio.getVolume('sfx')}));}catch{/* Audio preferences are optional. */}}
  saveAudio();
  const playbackTools=document.createElement('details'),playbackSummary=document.createElement('summary');playbackSummary.textContent='回看与演出';playbackTools.className='run-menu-playback-tools';playbackTools.append(playbackSummary);panel.append(playbackTools);
  const playback=document.createElement('div');playback.className='run-menu-playback';playbackTools.append(playback);
  const forward=button('快进当前手',()=>{const scene=game.scene.getScene('game') as GameScene;if(scene.scene.isActive())scene.fastForward();close();},playback);
  const replay=button('回看上一手',()=>{
    const state=session.state();if(!state?.lastTrace)return;
    const scene=game.scene.getScene('game') as GameScene;
    if(scene.scene.isActive()){scene.replayLastTrace();close();return;}
    status.textContent=HAND_LABELS[state.lastTrace.handType]+' · '+heatText(state.lastTrace.finalScore)+' 热度\n'+state.lastTrace.events.map(e=>e.reasonKey+'：'+e.operation+' '+e.value.n+'/'+e.value.d).join('\n');
  },playback);
  function refreshPlayback():void {
    const presenting=game.scene.isActive('game')&&(game.scene.getScene('game') as GameScene).isPresenting;
    forward.disabled=!presenting;replay.disabled=presenting||!session.run?.state.lastTrace;
    const actions=getActions();for(const entry of inspectButtons)entry.button.hidden=typeof actions?.[entry.key]!=='function';
    inspect.hidden=inspectButtons.every(entry=>entry.button.hidden);
  }
  panel.append(saveTools);
  const infoTools=document.createElement('details'),infoSummary=document.createElement('summary'),info=document.createElement('p');infoSummary.textContent='本局与版本';infoTools.append(infoSummary);panel.append(infoTools);
  button('局详情',()=>{const state=session.state();info.textContent=state?'角色 '+state.characterId+'\nSEED '+state.seed+'\n规则 '+state.rulesVersion+' · 内容 '+state.contentVersion:'当前没有进行中的局。';},infoTools);
  button('版本信息',()=>{info.textContent=`${formatBuildInfo(buildInfo)}\n当前可玩内容：${R2_JOKERS.length}张大丑牌、${R2_AVAILABLE_CHAPTERS}章。`;},infoTools);infoTools.append(info);
  function refreshState():void {
    const run=session.run,pending=session.pendingRun,saving=pending??run;
    if(run){game.registry.set('runController',run);game.registry.set('runState',run.state);}else{game.registry.remove('runController');game.registry.remove('runState');}
    status.textContent=!session.loaded?session.notice||'正在读取完整存档…':pending?'新局或导入尚未保存，原局已保留。'+(saving?.status==='saving'?'正在保存同一候选…':saving?.status==='readonly'?'候选已只读，可导出或取消后接管。':'请重试保存，或先导出候选再取消。'):!session.lease.writable?'另一页面持有写入权，本页只读。接管会读取最新完整进度。':run?.status==='paused'?'未保存：'+(run.lastError==='quota-exceeded'?'存储空间不足':'存储暂时不可用')+'。后续操作已暂停，重试会保存同一结果；也可导出内存结果。':run?.status==='saving'?'正在保存，请稍候…':run?.status==='readonly'?'进度已在另一页面更新。请接管并读取最新存档。':session.notice|| (run?'已保存 · 第 '+run.state.chapter+' 章 · 金币 '+run.state.gold:'没有进行中的局，请选择角色。');
    resume.textContent=run?'继续本局':'返回游戏';resume.disabled=session.working||!!pending||!!run&&!['idle','readonly'].includes(run.status);retry.hidden=saving?.status!=='paused';retry.disabled=session.working;exportCandidate.hidden=!pending;cancelCandidate.hidden=!pending;cancelCandidate.disabled=session.working||saving?.status==='saving';reload.hidden=session.loaded;reload.disabled=session.working||!!pending||!session.notice;takeover.hidden=!session.loaded||session.lease.writable&&run?.status!=='readonly'&&saving?.status!=='readonly';
    takeover.disabled=session.working||!!pending;
    start.disabled=session.working||!!pending||!session.loaded||!session.lease.writable||run?.status==='saving'||run?.status==='paused';exit.disabled=start.disabled;exportRun.disabled=!run;importRun.disabled=session.working||!!pending||!session.loaded||!session.lease.writable;
    refreshPlayback();
    const warningNotice=session.notice&&!session.notice.startsWith('导入成功'),critical=session.loaded?!!pending||run?.status==='paused'||run?.status==='readonly'||!!warningNotice||!session.lease.writable:!!session.notice;
    toggle.classList.toggle('needs-attention',critical);toggle.setAttribute('aria-label',modal.open?'关闭菜单':critical?'菜单，有进度提示待处理':'菜单');status.dataset.tone=critical?'warning':run?.status==='saving'?'pending':'normal';
    const key=critical?`${saving?.status}/${saving?.lastError}/${session.notice}/${session.lease.writable}/${!!pending}`:'';
    if(key&&key!==attentionKey){if(run?.status==='paused'||session.notice)saveTools.open=true;open();}attentionKey=key;
  }
  fullButton.onclick=()=>{if(modal.open)close();void fullscreen.toggle();};
  const unsubscribeFullscreen=fullscreen.subscribe(state=>{
    fullButton.textContent=state.active?'退出全屏':'全屏';fullButton.setAttribute('aria-label',state.active?'退出全屏':'进入全屏');syncDock();fullButton.setAttribute('aria-pressed',String(state.active));fullButton.setAttribute('aria-busy',String(state.pending));fullButton.disabled=state.pending;
    fullButton.title=state.active?'退出浏览器全屏':'全屏游玩，减少浏览器工具栏占用';
    fullscreenInfo.textContent=state.message;fullscreenInfo.hidden=!state.message;
    clearTimeout(noticeTimer);fullscreenNotice.textContent=state.message;fullscreenNotice.hidden=!state.message||modal.open;
    if(state.message&&!modal.open)noticeTimer=setTimeout(()=>{fullscreenNotice.hidden=true;},7000);
  });
  button('菜单',()=>{collapseDock();open();},dockPanel);button('退出全屏',()=>{collapseDock();void fullscreen.toggle();},dockPanel);
  modal.append(panel);host.append(fullButton,toggle,dock,dockPanel,fullscreenNotice,modal);document.body.append(host);
  const unsubscribe=session.subscribe(refreshState);refreshState();
  const refreshMenuActions=(_parent:unknown,key:string)=>{if(key==='runMenuActions')refreshPlayback();};
  for(const event of ['setdata','changedata','removedata'])game.registry.events.on(event,refreshMenuActions);
  game.events.once('destroy',()=>{unsubscribe();unsubscribeFullscreen();for(const event of ['setdata','changedata','removedata'])game.registry.events.off(event,refreshMenuActions);clearTimeout(noticeTimer);fullscreen.dispose();if(modal.open)modal.close();host.remove();});
}
