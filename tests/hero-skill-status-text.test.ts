import {describe,expect,it,vi} from 'vitest';
import {updateHeroSkillStatusText} from '../src/game/HeroSkillStatusText';

function label(density:number){
  const node:any={scene:{scale:{zoom:1/density}},frame:{source:{resolution:1}},text:'',style:{resolution:1,fontSize:'11px',color:'#59646a'},x:51.5,y:32,scaleX:1,scaleY:1};
  node.setResolution=vi.fn((value:number)=>{node.style.resolution=value;return node;});
  node.setText=vi.fn((value:string)=>{node.text=value;return node;});
  node.setColor=vi.fn((value:string)=>{node.style.color=value;return node;});return node;
}
describe('device-density skill status bitmap',()=>{
  it.each([1,2,2.625,3])('uses the actual scene density %s without changing font size or transforms',density=>{
    const text=label(density);
    for(const status of ['条件未满足','可用','已用','已停用','已选择','待完成','已押两对','换牌中','结算中']){
      updateHeroSkillStatusText(text,status,'#3f606b');expect(text.style.resolution).toBe(density);expect(text.frame.source.resolution).toBe(density);expect(text.text).toBe(status);
      expect(text.style.fontSize).toBe('11px');expect([text.x,text.y,text.scaleX,text.scaleY]).toEqual([51.5,32,1,1]);
    }
    expect(text.setResolution).toHaveBeenCalledTimes(density===1?0:1);
  });
  it('avoids rerasterizing an unchanged status, and follows a later effective DPR change',()=>{
    const text=label(2);updateHeroSkillStatusText(text,'条件未满足','#59646a');vi.clearAllMocks();
    updateHeroSkillStatusText(text,'条件未满足','#59646a');expect(text.setResolution).not.toHaveBeenCalled();expect(text.setText).not.toHaveBeenCalled();expect(text.setColor).not.toHaveBeenCalled();
    text.scene.scale.zoom=1/3;updateHeroSkillStatusText(text,'条件未满足','#59646a');expect(text.setResolution).toHaveBeenCalledExactlyOnceWith(3);expect(text.setText).not.toHaveBeenCalled();
  });
  it('leaves scenes without the hero shortcut alone',()=>{expect(()=>updateHeroSkillStatusText(undefined,'已用','#59646a')).not.toThrow();});
  it('repairs a style-only density upgrade without enlarging the texture mapping or redrawing it',()=>{
    const text=label(3);text.style.resolution=3;text.text='条件未满足';updateHeroSkillStatusText(text,'条件未满足','#59646a');
    expect(text.frame.source.resolution).toBe(3);expect(text.setResolution).not.toHaveBeenCalled();expect(text.setText).not.toHaveBeenCalled();
  });
});
