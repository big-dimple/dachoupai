export interface FullscreenState {active:boolean;supported:boolean;pending:boolean;message:string}
export interface FullscreenControls {
  getState():FullscreenState;
  toggle():Promise<void>;
  subscribe(listener:(state:FullscreenState)=>void):()=>void;
  dispose():void;
}
type LockableOrientation=ScreenOrientation&{lock?:(orientation:'landscape')=>Promise<void>};
let installed:FullscreenControls|undefined;

/** Call toggle directly from a user click. State always comes from the browser.
 * https://fullscreen.spec.whatwg.org/ — navigationUI is a preference, not a guarantee.
 * https://www.w3.org/TR/screen-orientation/ — orientation lock is optional and may reject.
 */
export function installFullscreen():FullscreenControls {
  if(installed)return installed;
  const target=document.documentElement,orientation=screen.orientation as LockableOrientation|undefined;
  const listeners=new Set<(state:FullscreenState)=>void>();
  let pending=false,message='',request=0,locked=false,disposed=false;
  const active=()=>!!document.fullscreenElement;
  const getState=():FullscreenState=>({active:active(),supported:typeof target.requestFullscreen==='function'&&!!document.fullscreenEnabled,pending,message});
  const publish=()=>{if(!disposed){const state=getState();listeners.forEach(listener=>listener(state));}};
  const unlock=()=>{if(locked){locked=false;try{orientation?.unlock();}catch{/* Exiting fullscreen must remain usable. */}}};
  const changed=()=>{if(!active()){request++;unlock();message='';}publish();};
  const failed=()=>{message='浏览器未允许全屏，游戏可继续。可旋转设备并收起浏览器工具栏。';publish();};
  const landscape=async(id:number)=>{
    if(!orientation?.lock){message='已进入全屏；此浏览器不支持自动横屏，请旋转设备。';publish();return;}
    try {
      await orientation.lock('landscape');
      if(disposed||id!==request||!active()){
        if(disposed||!active())try{orientation.unlock();}catch{/* Release a lock that resolved after fullscreen ended. */}
        return;
      }
      locked=true;message='';publish();
    }catch{
      if(!disposed&&id===request&&active()){message='已进入全屏；自动横屏未获允许，请旋转设备。';publish();}
    }
  };
  document.addEventListener('fullscreenchange',changed);
  document.addEventListener('fullscreenerror',failed);
  const controls:FullscreenControls={
    getState,
    async toggle(){
      if(disposed||pending)return;
      const entering=!active();
      if(entering&&!getState().supported){message=typeof target.requestFullscreen==='function'?'当前页面未获全屏权限，游戏可继续。可旋转设备并收起浏览器工具栏。':'此浏览器不支持全屏，游戏可继续。可旋转设备并收起浏览器工具栏。';publish();return;}
      const id=++request;pending=true;message='';publish();
      let entered=false;
      try {
        // Nothing asynchronous precedes this request: preserve the click's user activation.
        if(entering){await target.requestFullscreen({navigationUI:'hide'});entered=active();}
        else {unlock();await document.exitFullscreen();}
      }catch{message=entering?'浏览器未允许全屏，游戏可继续。可旋转设备并收起浏览器工具栏。':'退出全屏失败，请使用浏览器返回或退出全屏操作。';}
      finally {pending=false;publish();}
      // A direction-lock promise never blocks the game or the exit-fullscreen button.
      if(entered&&!disposed&&id===request)void landscape(id);
    },
    subscribe(listener){listeners.add(listener);listener(getState());return ()=>listeners.delete(listener);},
    dispose(){if(disposed)return;disposed=true;request++;unlock();document.removeEventListener('fullscreenchange',changed);document.removeEventListener('fullscreenerror',failed);listeners.clear();if(installed===controls)installed=undefined;},
  };
  installed=controls;return controls;
}
