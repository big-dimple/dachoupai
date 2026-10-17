import {expect,it,vi} from 'vitest';
import {normalizeTextSetter,playerTextValue} from '../src/game/PlayerFacingText';

it('normalizes display strings and arrays without changing technical IDs or the source array',()=>{
 const rows=['牺牲1张大丑牌','大丑能力','dachoupai / jokerScore / S07'];
 expect(playerTextValue(rows)).toEqual(['牺牲1张唐宋牌','唐宋牌能力','dachoupai / jokerScore / S07']);
 expect(rows[0]).toBe('牺牲1张大丑牌');expect(playerTextValue('大丑牌')).toBe('唐宋牌');
});

it('guards every text creation/update through the shared setter and preserves receiver and chaining',()=>{
 class Text {value:unknown='';setText(value:string|string[]){this.value=value;return this;}}
 const original=Text.prototype.setText,stop=normalizeTextSetter(Text.prototype);
 expect(normalizeTextSetter(Text.prototype)).toBe(stop);
 const a=new Text(),b=new Text();expect(a.setText('大丑牌')).toBe(a);expect(a.value).toBe('唐宋牌');
 b.setText(['大丑牌槽','大丑奖励']);expect(b.value).toEqual(['唐宋牌槽','唐宋牌奖励']);expect(a.value).toBe('唐宋牌');
 stop();expect(Text.prototype.setText).toBe(original);
});

it('leaves numeric/null runtime inputs and callback ownership to the original renderer',()=>{
 const original=vi.fn(function(this:{setText:unknown},value:unknown){return {owner:this,value};}),target={setText:original};
 const stop=normalizeTextSetter(target);
 expect(target.setText(null as unknown as string)).toEqual({owner:target,value:null});
 expect(target.setText(3 as unknown as string)).toEqual({owner:target,value:3});
 stop();expect(target.setText).toBe(original);
});
