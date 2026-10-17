import {it,expect,vi} from 'vitest';
import type Phaser from 'phaser';
import {ShopSynergyPreview} from '../src/game/ShopSynergyPreview';
import type {ShopSynergyResult} from '../src/game/ShopSynergy';

function scene(){
 const roots:{destroy:ReturnType<typeof vi.fn>}[]=[],pulses:{remove:ReturnType<typeof vi.fn>}[]=[];
 const node=()=>{const n:Record<string,unknown>={height:42,destroy:vi.fn()};for(const key of ['setDepth','setName','setData','setOrigin','setY','add','lineStyle','strokeRoundedRect','fillStyle','fillRoundedRect'])n[key]=()=>n;return n;};
 const stub={scale:{zoom:1/3},add:{container:()=>{const n=node();roots.push(n as typeof roots[number]);return n;},graphics:node,text:node},tweens:{add:()=>{const pulse={remove:vi.fn()};pulses.push(pulse);return pulse;}}};
 return {scene:stub as unknown as Phaser.Scene,roots,pulses};
}
const result:ShopSynergyResult={hasSynergy:true,heroSynergy:false,tag:'条件交集',reason:'各自按时点触发',cashNote:'购后24金',heldInstanceIds:['held'],matches:[{instanceId:'held',name:'炉火纯青',shortReason:'同走对子',reason:'对子条件交集'}]};
const box={x:20,y:120,width:64,height:90},held=new Map([['held',box]]);
it('changing candidate and clearing removes each old pulse and overlay exactly once',()=>{
 const s=scene(),preview=new ShopSynergyPreview();preview.show(s.scene,'offer/first','候选',result,held,box,false,false);
 expect(s.pulses).toHaveLength(1);preview.show(s.scene,'offer/second','候选',result,held,box,false,true);
 expect(s.pulses[0].remove).toHaveBeenCalledOnce();expect(s.roots[0].destroy).toHaveBeenCalledWith(true);
 preview.clear();preview.clear();expect(s.pulses[1].remove).toHaveBeenCalledOnce();expect(s.roots[1].destroy).toHaveBeenCalledOnce();
});
it('reduced motion and hidden owned rails retain readable feedback without starting a pulse',()=>{
 const s=scene(),preview=new ShopSynergyPreview();preview.show(s.scene,'offer','候选',result,held,box,true,true);expect(s.pulses).toHaveLength(0);
 preview.show(s.scene,'offer','候选',result,new Map(),box,false,true);expect(s.pulses).toHaveLength(0);preview.clear();expect(s.roots.every(r=>r.destroy.mock.calls.length===1)).toBe(true);
});
