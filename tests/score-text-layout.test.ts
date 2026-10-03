import {describe,it,expect} from 'vitest';
import type Phaser from 'phaser';
import {compactScoreText,fitScoreLine,scoreFlightLanding} from '../src/game/ScoreTextLayout';

function fakeText(value:string){
  let font=26,wrap=0;const data=new Map<string,unknown>();
  const text={text:value,x:0,y:0,
    get width(){return wrap?Math.min(wrap,this.text.length*font*.6):this.text.length*font*.6;},
    get height(){return font*1.22*(wrap?Math.ceil(this.text.length*font*.6/wrap):1);},
    setText(value:string){this.text=value;return this;},setWordWrapWidth(value:number){wrap=value;return this;},
    setFontSize(value:number){font=value;return this;},setScale(){return this;},setOrigin(){return this;},
    setPosition(x:number,y:number){this.x=x;this.y=y;return this;},
    setData(key:string,value:unknown){data.set(key,value);return this;},getData:(key:string)=>data.get(key),
  };return text as unknown as Phaser.GameObjects.Text;
}
describe('score display space and exact value preservation',()=>{
  it('source flight stops outside the number cell from cards, role and Joker directions',()=>{
    const cell={x:120,y:100,width:100,height:32};
    for(const source of [{x:40,y:116},{x:170,y:260},{x:320,y:20},{x:170,y:116}]){
      const point=scoreFlightLanding(source,cell);
      expect(point.x<cell.x||point.x>cell.x+cell.width||point.y<cell.y||point.y>cell.y+cell.height).toBe(true);
      expect(Math.min(Math.abs(point.x-(cell.x-14)),Math.abs(point.x-(cell.x+cell.width+14)),Math.abs(point.y-(cell.y-14)),Math.abs(point.y-(cell.y+cell.height+14)))).toBeLessThan(.00001);
    }
  });
  it('fits long exact integers and ranges without crossing neighbouring numeric columns',()=>{
    for(const value of ['123,456,789,012,345','× 123,456,789','100,000,000–999,999,999','× 1,000,000/3']){
      const text=fakeText(value),area={x:100,y:200,width:88,height:40};fitScoreLine(text,area,26,true);
      expect(text.width).toBeLessThanOrEqual(area.width);expect(text.height).toBeLessThanOrEqual(area.height);
      expect(text.getData('fullText')).toBe(value);
      fitScoreLine(text,area,26,true);expect(text.getData('fullText')).toBe(value);
      fitScoreLine(text,{...area,width:360},26,true);expect(text.text).toBe(value);
    }
  });
  it('keeps current shorter values accurate after a large value was abbreviated',()=>{
    const text=fakeText('999,999,999,999');fitScoreLine(text,{x:0,y:0,width:88,height:32},26,true);
    text.setText('× 1.5');fitScoreLine(text,{x:0,y:0,width:88,height:32},26,true);
    expect(text.text).toBe('× 1.5');expect(text.getData('fullText')).toBe('× 1.5');
    expect(compactScoreText('× 1.5')).toBe('× 1.5');
  });
  it('clips a long source sentence to one actual row, preserving full copy for a wider layout',()=>{
    const value='熟面孔 · 乘倍率 ×1.5 · 实际来源收益';
    const text=fakeText(value);fitScoreLine(text,{x:0,y:0,width:180,height:24},17);
    expect(text.width).toBeLessThanOrEqual(180);expect(text.text.endsWith('…')).toBe(true);expect(text.getData('fullText')).toBe(value);
    fitScoreLine(text,{x:0,y:0,width:480,height:24},17);expect(text.text).toBe(value);
  });
});
