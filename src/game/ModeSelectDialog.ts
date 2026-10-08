import {R2_MODE_CATALOG,r2RunModeConfig,type R2ModeSelection,type R2ModeId,type R2Difficulty,type R2ChallengeId} from '../content/r2Modes';
import {r2DifficultyUnlocked,r2ModeUnlocked} from '../domain/r2Progress';
import {readRunProgress} from '../platform/RunProgress';
import {DetailDialog} from './DetailDialog';
import {gameSession} from './session';

export const DEFAULT_MODE_SELECTION:R2ModeSelection={mode:'standard',difficulty:0,challengeId:null,programsEnabled:true};
export interface ModeChoice {modeConfig:R2ModeSelection;seed?:string}
interface ModeDialogOptions {
  initial?:ModeChoice;chooseLabel?:string;choose:(choice:ModeChoice)=>void;resumed:()=>void;
}

/** The existing native detail modal keeps mode controls readable on a narrow, scrollable screen. */
export class ModeSelectDialog {
  private readonly detail=new DetailDialog();
  close():void {this.detail.close();}
  open(options:ModeDialogOptions):void {
    const initial=options.initial??{modeConfig:DEFAULT_MODE_SELECTION},form=document.createElement('div');
    form.style.display='grid';form.style.gap='12px';form.style.minWidth='0';
    const field=(caption:string,control:HTMLElement)=>{
      const label=document.createElement('label'),text=document.createElement('span');text.textContent=caption;
      label.style.display='grid';label.style.gap='6px';label.style.margin='0';label.style.minWidth='0';
      control.style.width='100%';control.style.boxSizing='border-box';control.style.minWidth='0';
      label.append(text,control);form.append(label);return label;
    };
    const mode=document.createElement('select'),difficulty=document.createElement('select'),challenge=document.createElement('select');
    mode.dataset.modeField='mode';difficulty.dataset.modeField='difficulty';challenge.dataset.modeField='challenge';
    for(const row of R2_MODE_CATALOG.modes)mode.add(new Option(row.name,row.id));
    mode.value=initial.modeConfig.mode;
    for(const row of R2_MODE_CATALOG.difficulties)difficulty.add(new Option(row.label,String(row.id)));
    difficulty.value=String(initial.modeConfig.difficulty);
    for(const row of R2_MODE_CATALOG.challenges)challenge.add(new Option(`${row.id} · ${row.name}`,row.id));
    challenge.value=initial.modeConfig.challengeId??'Q01';
    field('玩法',mode);const difficultyField=field('难度',difficulty),challengeField=field('挑战规则',challenge);
    const seed=document.createElement('input');seed.type='text';seed.maxLength=4096;seed.autocomplete='off';seed.dataset.modeField='seed';
    seed.value=initial.modeConfig.mode==='standard'?initial.seed??'':'';seed.placeholder='留空将在确认登台时生成新种子';
    const seedField=field('普通局种子',seed),fixedSeed=document.createElement('select');fixedSeed.dataset.modeField='fixed-seed';
    const fixedSeedField=field('固定种子',fixedSeed),tutorial=document.createElement('div'),skip=document.createElement('button');
    tutorial.style.lineHeight='1.7';tutorial.style.overflowWrap='anywhere';skip.type='button';skip.textContent='跳过教程，回普通 D0';skip.dataset.modeAction='skip-tutorial';
    tutorial.append(document.createTextNode('教程固定二响，种子 r2/tutorial/core-v1。练习出牌、弃牌和购买；教程不发放难度或挑战资格。'),document.createElement('br'),skip);form.append(tutorial);
    const programs=document.createElement('input');programs.type='checkbox';programs.dataset.modeField='programs';
    let programsPreference=initial.modeConfig.mode==='tutorial'?true:initial.modeConfig.programsEnabled;
    const programsLabel=document.createElement('label');programsLabel.append(programs,document.createTextNode('开启章节节目单'));form.append(programsLabel);
    const progressLine=document.createElement('p');progressLine.style.margin='0';progressLine.style.fontSize='14px';progressLine.style.lineHeight='1.7';
    progressLine.setAttribute('role','status');form.append(progressLine);
    let busy=false;
    const selection=():R2ModeSelection=>({mode:mode.value as R2ModeId,difficulty:mode.value==='standard'?Number(difficulty.value) as R2Difficulty:0,
      challengeId:mode.value==='challenge'?challenge.value as R2ChallengeId:null,programsEnabled:mode.value==='tutorial'?false:programsPreference});
    const choice=():ModeChoice=>({modeConfig:selection(),seed:mode.value==='standard'?seed.value||undefined:mode.value==='tutorial'?
      R2_MODE_CATALOG.tutorial.config.seedPolicy.values[0]:fixedSeed.value});
    const showStatus=(message:string)=>{const status=dialog.querySelector<HTMLParagraphElement>('.dialog-status')!;status.textContent=message;status.hidden=false;};
    const chooseAction={label:options.chooseLabel??'进入选角',primary:true,disabled:false,run:()=>{
      if(busy)return;const selected=choice(),progress=readRunProgress();
      if(!r2ModeUnlocked(progress.progress,selected.modeConfig)){showStatus('新开此模式需要对应的标准八章首通资格；已有该模式存档可用「继续此模式」。');refresh();return;}
      this.detail.close(dialog);options.choose(selected);
    }};
    const resumeAction={label:'继续此模式',disabled:false,run:async()=>{
      if(busy)return;const selected=selection();busy=true;refresh();
      try {
        const session=gameSession(),resumed=await session.resumeMode(selected);
        if(!this.detail.active(dialog))return;
        if(resumed){this.detail.close(dialog);options.resumed();}
        else showStatus(session.notice||'所选模式尚无已保存进度。');
      }finally {busy=false;if(this.detail.active(dialog))refresh();}
    }};
    const dialog=this.detail.open('巡演模式','',[chooseAction,resumeAction],{closeLabel:'取消'});
    dialog.dataset.dialogKind='mode-select';dialog.querySelector('.dialog-eyebrow')!.textContent='选择这一次巡演';
    const copy=dialog.querySelector('.dialog-copy')!;copy.prepend(form);
    const body=dialog.querySelector<HTMLParagraphElement>('.dialog-body')!;body.style.marginTop='16px';body.style.overflowWrap='anywhere';
    const buttons=dialog.querySelectorAll<HTMLButtonElement>('.dialog-actions button');buttons[0].dataset.modeAction='choose';buttons[1].dataset.modeAction='resume';
    const refresh=()=>{
      const selected=selection(),config=r2RunModeConfig(selected),current=readRunProgress(),progress=current.progress;
      difficultyField.hidden=selected.mode!=='standard';challengeField.hidden=selected.mode!=='challenge';seedField.hidden=selected.mode!=='standard';
      fixedSeedField.hidden=selected.mode!=='challenge';tutorial.hidden=selected.mode!=='tutorial';programs.disabled=busy||selected.mode==='tutorial';programs.checked=config.programsEnabled;
      for(const field of [difficultyField,challengeField,seedField,fixedSeedField])field.style.display=field.hidden?'none':'grid';
      for(const option of difficulty.options){const id=Number(option.value);option.textContent=`D${id}${r2DifficultyUnlocked(progress,id)?'':' · 待上一难度首通'}`;}
      mode.options[1].textContent=progress.standardWins.some(Boolean)?'挑战':'挑战 · 待标准八章首通';
      if(selected.mode==='challenge'){
        const prior=fixedSeed.value||initial.seed;fixedSeed.replaceChildren();
        config.seedPolicy.values.forEach((value,i)=>fixedSeed.add(new Option(`种子 ${i+1} · ${value}`,value)));
        if(prior&&config.seedPolicy.values.includes(prior))fixedSeed.value=prior;
      }
      const cleared=progress.standardWins.flatMap((complete,i)=>complete?[`D${i}`]:[]);
      progressLine.textContent=current.ok?(cleared.length?`标准八章首通：${cleared.join('、')}。角色与全部72张大丑牌始终可用。`:
        '标准八章首通后解锁 D1 与挑战，随后逐档解锁；六位角色与72张大丑牌始终可用。'):
        '解锁记录读取失败，普通 D0 与教程仍可新开；现有模式存档可继续。';
      const rules=selected.mode==='challenge'?R2_MODE_CATALOG.challenges.find(row=>row.id===selected.challengeId)!.description:
        selected.mode==='tutorial'?'固定二响与教学种子，可随时跳过；节目单关闭。':`D${selected.difficulty}${selected.difficulty===0?' · 目标基准':' · 最终目标 ×6/5'}。`;
      body.textContent=`${rules}\n\n手牌 ${config.baseHandSize} · 每场出牌 ${config.baseHands} · 弃牌 ${config.baseDiscards}\n开局 ${config.initialGold} 金 · 大丑牌 ${config.jokerSlots} 槽 · 基础利息上限 ${config.baseInterestCap}\n${config.reroll.allowed?`付费刷新 ${config.reroll.start}–${config.reroll.cap} 金`:'付费与免费刷新均关闭'}\n\n${config.programsEnabled?'章节节目单开启，可选择一项或不选。':'章节节目单关闭。'}确认角色并保存成功后才建立新局。继续会使用此模式上次保存的种子与进度。`;
      chooseAction.disabled=busy||!r2ModeUnlocked(progress,selected);resumeAction.disabled=busy||gameSession().working||!!gameSession().pendingRun;
      buttons[0].disabled=chooseAction.disabled;buttons[1].disabled=resumeAction.disabled;
      for(const control of [mode,difficulty,challenge,seed,fixedSeed,skip])control.disabled=busy;
    };
    const clearStatus=()=>{dialog.querySelector<HTMLParagraphElement>('.dialog-status')!.hidden=true;};
    for(const control of [mode,difficulty,challenge])control.addEventListener('change',()=>{clearStatus();refresh();});
    programs.addEventListener('change',()=>{programsPreference=programs.checked;clearStatus();refresh();});
    skip.onclick=()=>{mode.value='standard';difficulty.value='0';programsPreference=true;clearStatus();refresh();mode.focus();};
    refresh();mode.focus({preventScroll:true});
  }
}
