/** Arm before input: a short, real rendered pulse may end before an input RPC returns. */
export function armResourcePulse({kind,seq,remaining}) {
  const game=window.__harness.game,slots=window.__smokeResourcePulses??={};
  if(slots[kind])throw Error('resource pulse observer already armed');
  const record={sample:null,observe:null};
  record.observe=()=>{
    const state=game.registry.get('runController').state,count=game.scene.getScene('game').resourceCounts[kind];
    if(state.commandSeq===seq&&count.text===remaining+' 次'&&count.scaleX>1.05){
      record.sample={commandSeq:state.commandSeq,text:count.text,scaleX:count.scaleX};
      game.events.off('poststep',record.observe);
    }
  };
  slots[kind]=record;game.events.on('poststep',record.observe);
}

export function stopResourcePulse(kind) {
  const record=window.__smokeResourcePulses?.[kind];if(!record)return null;
  window.__harness.game.events.off('poststep',record.observe);delete window.__smokeResourcePulses[kind];return record.sample;
}

export async function waitResourcePulse(page,kind) {
  try {
    await page.waitForFunction(kind=>!!window.__smokeResourcePulses?.[kind]?.sample,kind,{timeout:5000});
    return await page.evaluate(stopResourcePulse,kind);
  } finally {await page.evaluate(stopResourcePulse,kind);}
}
