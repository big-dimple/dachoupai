import {Haptics,type HapticState} from './Haptics';

function availabilityText(state:HapticState):string {
  if(!state.apiSupported)return '此浏览器不提供振动能力，无法振动；Safari / iOS 暂不支持。';
  if(!state.enabled)return '触觉反馈已关闭。';
  if(state.availability==='activation-unavailable')return '此浏览器无法确认交互激活，触觉暂不可用。';
  if(state.availability==='needs-activation')return '请先点击或轻触页面；触觉需要用户交互后才可用。';
  if(state.availability==='hidden')return '页面回到前台后，新操作才可请求触觉。';
  return '已启用；是否有振动仍取决于设备及系统设置。';
}

/** An independent native control; neither reduced motion nor audio mute changes it. */
export function installHapticSetting(parent:HTMLElement,haptics:Haptics):()=>void {
  const row=document.createElement('label'),input=document.createElement('input'),hint=document.createElement('small');
  row.className='haptic-setting';input.type='checkbox';input.setAttribute('aria-label','触觉反馈');
  hint.id='haptic-availability';hint.className='audio-controls-hint';hint.setAttribute('role','status');input.setAttribute('aria-describedby',hint.id);
  row.append(input,document.createTextNode(' 触觉反馈'));parent.append(row,hint);
  const unsubscribe=haptics.subscribe(state=>{
    input.checked=state.enabled;input.disabled=!state.apiSupported;
    hint.textContent=availabilityText(state)+(state.preferenceSaved?'':' 本次选择已生效，浏览器未能保留设置。');
  });
  input.onchange=()=>haptics.setEnabled(input.checked);
  return ()=>{input.onchange=null;unsubscribe();row.remove();hint.remove();};
}
