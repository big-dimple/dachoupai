import {expect,it,vi} from 'vitest';
vi.mock('phaser',()=>({default:{Scene:class{}}}));
import {GameScene} from '../src/game/GameScene';
import {R2_JOKERS} from '../src/content/r2Schema';
import {bossCardPressure} from '../src/game/BossPressure';

it('replays the recorded Boss context rather than the current regular stage or next chapter Boss',()=>{
  const scene=Object.create(GameScene.prototype) as any,card={id:'king',rank:13,suit:'hearts'};
  Object.assign(scene,{run:{stageIndex:3,stage:{boss:null},jokers:[]},presentation:{score:{cards:[card],sets:{playedIds:['king']},sourceJokers:[],bossContext:{boss:{definitionId:'B04',disabledSuit:null},sealedJokerIds:[]}}}});
  Object.defineProperty(scene,'jokerDefinitions',{value:R2_JOKERS});
  const context=scene.bossPressureContext();expect(context.boss.definitionId).toBe('B04');expect(bossCardPressure(context,'king')?.label).toBe('计分失效');expect(context.hand).toBe(scene.presentation.score.cards);
});
it('clears an old B02 overlay after the card leaves the affected selection without blocking input',()=>{
  const scene=Object.create(GameScene.prototype) as any,cleanup=vi.fn(),data=new Map<string,unknown>([['bossPressure',{kind:'ordinary-points',detail:'old'}],['bossPressureCleanup',cleanup]]);
  scene.bossPressureContext=()=>({boss:{definitionId:'B02',disabledSuit:null},stageIndex:2,hand:[{id:'one',rank:2,suit:'hearts'}],selectedIds:['one'],jokers:[],definitions:R2_JOKERS,sealedJokerIds:[]});
  const container={getData:(key:string)=>data.get(key),setData:vi.fn().mockReturnThis()};
  scene.refreshCardPressure({card:{id:'one'},container});expect(cleanup).toHaveBeenCalledOnce();expect(container.setData).toHaveBeenCalledWith('bossDisabled',false);
});
