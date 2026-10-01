import type Phaser from 'phaser';
import {gameSession} from './session';
import {heatText} from './scoreText';
import {HAND_LABELS} from '../content/handLabels';
import {MAX_IMPORT_BYTES} from '../application/checkpoint';
import type {GameScene} from './GameScene';
import {buildInfo} from '../platform/buildInfo';
import {AudioEngine} from '../audio/AudioEngine';

function download(text:string,name:string):void {
  const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),link=document.createElement('a');
  link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function routeSavedRun(game:Phaser.Game):void {
  const session=gameSession(),run=session.run;if(!run)return;
  game.registry.set('runController',run);game.registry.set('runState',run.state);game.registry.set('characterId',run.state.characterId);game.registry.set('seed',run.state.seed);
  const state=run.state;
  const target=state.phase==='shop'?'shop':['stage-ready','await-input'].includes(state.phase)?'game':state.stage?'intermission':'character-select';
  for(const key of ['character-select','shop','game','intermission'])game.scene.stop(key);
  game.scene.start(target,target==='intermission'?{cleared:state.phase==='stage-cleared'||state.phase==='run-won',stageIndex:state.stage!.index,stageHeat:state.stage!.heat,handsLeft:state.stage!.handsLeft,goldEarned:state.stage!.goldEarned}:undefined);
}

/** Progress and presentation preferences survive scene changes. */
export function installRunMenu(game:Phaser.Game):void {
  const session=gameSession(),audio=AudioEngine.shared,host=document.createElement('div'),toggle=document.createElement('button'),panel=document.createElement('section'),status=document.createElement('p');
  try{const saved=JSON.parse(localStorage.getItem('dachoupai-audio-v1')??'null');if(typeof saved?.musicMuted==='boolean')audio.musicMuted=saved.musicMuted;if(typeof saved?.master==='number'&&Number.isFinite(saved.master))audio.setVolume('master',saved.master);}catch{/* Optional preferences cannot block boot. */}
  host.className='run-menu';toggle.textContent='菜单';toggle.setAttribute('aria-expanded','false');panel.hidden=true;panel.setAttribute('aria-label','进度与演出设置');
  const close=()=>{panel.hidden=true;toggle.setAttribute('aria-expanded','false');};
  toggle.onclick=()=>{panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));};
  const button=(name:string,action:()=>void|Promise<unknown>,container:HTMLElement=panel)=>{const b=document.createElement('button');b.textContent=name;b.onclick=()=>{void action();};container.append(b);return b;};
  panel.append(status);
  const resume=button('继续本局',()=>{if(!session.run)return;routeSavedRun(game);close();});
  const start=button('开始新局',async()=>{
    if(session.run&&!await session.run.flush())return;
    if(session.run&&!window.confirm('返回选角开始新局？选择新角色前会再次确认，已有存档保留为备份。'))return;
    for(const key of ['shop','game','intermission'])game.scene.stop(key);game.scene.start('character-select');close();
  });
  button('保存并退出',async()=>{
    if(!window.confirm('保存已经确定的结果并退出？稍后可继续本局。'))return;
    if(session.run&&!await session.run.flush())return;
    for(const key of ['shop','game','intermission'])game.scene.stop(key);game.scene.start('character-select');close();
  });
  const retry=button('重试保存',async()=>{if(await session.retry()){routeSavedRun(game);close();}});
  const reload=button('重试读取',()=>session.initialize());
  const takeover=button('接管写入',async()=>{
    if(!await session.takeOver()||!session.run)return;
    routeSavedRun(game);
    // setInteractive objects enter Phaser's input list on the following step.
    await new Promise<void>(resolve=>game.events.once('poststep',resolve));close();
  });
  const saveTools=document.createElement('details'),saveSummary=document.createElement('summary');saveSummary.textContent='存档工具';saveTools.append(saveSummary);panel.append(saveTools);
  const exportRun=button('导出本局',()=>{if(session.run)download(session.run.exportJSON(),'dachoupai-checkpoint.json');},saveTools);
  button('局详情',()=>{const state=session.state();status.textContent=state?'角色 '+state.characterId+'\nSEED '+state.seed+'\n规则 '+state.rulesVersion+' · 内容 '+state.contentVersion:'当前没有进行中的局。';});
  button('版本信息',()=>{status.textContent=`版本 ${buildInfo.version} · ${buildInfo.revision.slice(0,12)}${buildInfo.modified?'（含本地修改）':''}\n构建 ${buildInfo.builtAt}\n当前可玩内容：24张大丑牌、两章。`;});
  button('导出保留数据',async()=>{try{download(await session.storage.exportRetained(),'dachoupai-retained-data.json');}catch{status.textContent='导出失败，原数据未修改。';}},saveTools);
  const file=document.createElement('input');file.type='file';file.accept='.json,application/json';file.hidden=true;
  const importRun=button('导入本局',()=>file.click(),saveTools);file.onchange=async()=>{
    const selected=file.files?.[0];file.value='';if(!selected)return;
    if(selected.size>MAX_IMPORT_BYTES){status.textContent='导入失败：文件过大，原进度未修改。';return;}
    if(session.run&&!window.confirm('用导入的完整存档替换当前进度？当前有效存档会保留为备份。'))return;
    if(await session.importJSON(await selected.text())){routeSavedRun(game);close();}
  };panel.append(file);
  const speedLabel=document.createElement('label'),speed=document.createElement('select');speedLabel.textContent='演出速度 ';
  for(const value of [1,2,4]){const option=document.createElement('option');option.value=String(value);option.textContent=`${value}×`;speed.append(option);}speed.value=String(session.speed);speedLabel.append(speed);panel.append(speedLabel);
  const muted=document.createElement('input'),muteLabel=document.createElement('label');muted.type='checkbox';muted.checked=session.muted;muteLabel.append(muted,document.createTextNode(' 静音'));panel.append(muteLabel);
  const reduced=document.createElement('input'),reducedLabel=document.createElement('label');reduced.type='checkbox';reduced.checked=session.reducedMotion;reducedLabel.append(reduced,document.createTextNode(' 减少动态'));panel.append(reducedLabel);
  const presentation=()=>session.preferences(Number(speed.value) as 1|2|4,muted.checked,reduced.checked);
  speed.onchange=presentation;muted.onchange=()=>{presentation();if(!muted.checked)void audio.unlock();};reduced.onchange=presentation;
  const music=document.createElement('input'),musicLabel=document.createElement('label');music.type='checkbox';music.checked=audio.musicMuted;musicLabel.append(music,document.createTextNode(' 关闭背景音乐'));panel.append(musicLabel);music.onchange=()=>{audio.musicMuted=music.checked;saveAudio();};
  const volume=document.createElement('input'),volumeLabel=document.createElement('label');volume.type='range';volume.min='0';volume.max='100';volume.value=String(Math.round(audio.getVolume('master')*100));volume.setAttribute('aria-label','总音量');volumeLabel.append(document.createTextNode('总音量'),volume);panel.append(volumeLabel);volume.oninput=()=>{audio.setVolume('master',Number(volume.value)/100);saveAudio();};
  function saveAudio():void {try{localStorage.setItem('dachoupai-audio-v1',JSON.stringify({musicMuted:audio.musicMuted,master:audio.getVolume('master')}));}catch{/* Audio preferences are optional. */}}
  const forward=button('快进当前手',()=>{const scene=game.scene.getScene('game') as GameScene;if(scene.scene.isActive())scene.fastForward();close();});
  const replay=button('回看上一手',()=>{
    const state=session.state();if(!state?.lastTrace)return;
    const scene=game.scene.getScene('game') as GameScene;
    if(scene.scene.isActive()){scene.replayLastTrace();close();return;}
    status.textContent=HAND_LABELS[state.lastTrace.handType]+' · '+heatText(state.lastTrace.finalScore)+' 热度\n'+state.lastTrace.events.map(e=>e.reasonKey+'：'+e.operation+' '+e.value.n+'/'+e.value.d).join('\n');
  });
  session.subscribe(()=>{
    const run=session.run;
    if(run){game.registry.set('runController',run);game.registry.set('runState',run.state);}else{game.registry.remove('runController');game.registry.remove('runState');}
    status.textContent=!session.loaded?session.notice||'正在读取完整存档…':!session.lease.writable?'另一页面持有写入权，本页只读。接管会读取最新完整进度。':run?.status==='paused'?'未保存：'+(run.lastError==='quota-exceeded'?'存储空间不足':'存储暂时不可用')+'。后续操作已暂停，重试会保存同一结果；也可导出内存结果。':run?.status==='saving'?'正在保存，请稍候…':run?.status==='readonly'?'进度已在另一页面更新。请接管并读取最新存档。':session.notice|| (run?'已保存 · 第 '+run.state.chapter+' 章 · 金币 '+run.state.gold:'没有进行中的局，请选择角色。');
    resume.disabled=session.working||!run||!['idle','readonly'].includes(run.status);retry.hidden=run?.status!=='paused';reload.hidden=session.loaded;takeover.hidden=session.lease.writable&&run?.status!=='readonly';
    takeover.disabled=session.working;
    start.disabled=session.working||!session.loaded||!session.lease.writable||run?.status==='saving'||run?.status==='paused';exportRun.disabled=!run;importRun.disabled=session.working||!session.loaded||!session.lease.writable;
    forward.disabled=!game.scene.isActive('game');replay.disabled=!run?.state.lastTrace;
    if(run?.status==='paused'||run?.status==='readonly'||session.notice||!session.lease.writable){panel.hidden=false;toggle.setAttribute('aria-expanded','true');if(run?.status==='paused'||session.notice)saveTools.open=true;}
  });
  host.append(toggle,panel);document.body.append(host);
}
