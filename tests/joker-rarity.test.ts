import {describe,it,expect} from 'vitest';
import type Phaser from 'phaser';
import {R2_JOKERS} from '../src/content/r2Schema';
import {JOKER_RARITY,createJokerRarityBadge,jokerRarityBadgeLayout,type JokerRarity} from '../src/game/JokerRarity';

function luminance(color:number):number {
  const channels=[color>>16&255,color>>8&255,color&255].map(channel=>{
    const value=channel/255;return value<=.04045?value/12.92:((value+.055)/1.055)**2.4;
  });
  return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;
}
function contrast(a:number,b:number):number {
  const values=[luminance(a),luminance(b)].sort((x,y)=>y-x);return (values[0]+.05)/(values[1]+.05);
}

function renderBadge(rarity:JokerRarity,compact:boolean) {
  const draws:{method:string;args:number[]}[]=[],data=new Map<string,unknown>();
  const plate:Record<string,unknown>={setName(){return this;}};
  for(const method of ['fillStyle','lineStyle','fillRoundedRect','strokeRoundedRect','fillCircle','beginPath','moveTo','lineTo','closePath','fillPath']){
    plate[method]=(...args:number[])=>{draws.push({method,args});return plate;};
  }
  const container={x:0,y:0,name:'',width:0,height:0,children:[] as unknown[],
    setName(name:string){this.name=name;return this;},
    setSize(width:number,height:number){this.width=width;this.height=height;return this;},
    setData(key:string,value:unknown){data.set(key,value);return this;},
    add(children:unknown[]){this.children.push(...children);return this;},
  };
  const label={x:0,y:0,width:0,height:0,text:'',fontSize:0,
    setName(){return this;},setOrigin(){return this;},
    // Deliberately wider/taller metrics exercise fitting rather than assuming one platform font.
    setFontSize(size:number){this.fontSize=size;this.width=this.text.length*size*1.12;this.height=size*1.4;return this;},
  };
  const scene={add:{
    container(x:number,y:number){container.x=x;container.y=y;return container;},
    graphics(){return plate;},
    text(x:number,y:number,text:string,style:{fontSize:string}){
      label.x=x;label.y=y;label.text=text;return label.setFontSize(parseFloat(style.fontSize));
    },
  }};
  createJokerRarityBadge(scene as unknown as Phaser.Scene,rarity,{x:17,y:23,compact});
  return {container,label,draws,data};
}

describe('Joker rarity identity',()=>{
  it('covers the actual three definition rarities with distinct full and compact identities',()=>{
    const actual=[...new Set(R2_JOKERS.map(joker=>joker.rarity))].sort();
    expect(Object.keys(JOKER_RARITY).sort()).toEqual(actual);
    expect(actual).toHaveLength(3);
    const styles=Object.values(JOKER_RARITY);
    for(const field of ['shape','symbol','label','compactLabel'] as const)expect(new Set(styles.map(style=>style[field])).size).toBe(actual.length);
    expect(styles.map(style=>style.label)).toEqual(['普通','特别','稀有']);
    expect(styles.every(style=>style.compactLabel.length===1&&style.label.startsWith(style.compactLabel))).toBe(true);
  });

  it('keeps small text and shape readable on every opaque rarity surface, including in grayscale',()=>{
    for(const style of Object.values(JOKER_RARITY)){
      expect(contrast(style.ink,style.paper)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(style.edge,style.paper)).toBeGreaterThanOrEqual(3);
      expect(style.css.ink).toMatch(/^#[0-9a-f]{6}$/);
      expect(parseInt(style.css.ink.slice(1),16)).toBe(style.ink);
      expect(parseInt(style.css.paper.slice(1),16)).toBe(style.paper);
    }
  });

  it('reserves separate shape and readable label boxes at full and narrow card sizes',()=>{
    for(const options of [{},{compact:true},{width:28},{width:34},{width:44},{width:52},{width:58},{width:64}]){
      const layout=jokerRarityBadgeLayout(options),{shape,text}=layout;
      expect(shape.x-shape.radius).toBeGreaterThanOrEqual(3);
      expect(shape.y-shape.radius).toBeGreaterThan(0);
      expect(shape.y+shape.radius).toBeLessThan(layout.height);
      expect(shape.x+shape.radius).toBeLessThan(text.x);
      expect(text.x+text.width).toBeLessThanOrEqual(layout.width-3);
      expect(text.width).toBeGreaterThanOrEqual(layout.fontSize*(layout.compact?1:2));
      expect(text.height).toBeGreaterThanOrEqual(layout.fontSize);
      expect(layout.fontSize).toBeGreaterThanOrEqual(12);
    }
    for(const slotWidth of [34,38,44]){
      const badge=jokerRarityBadgeLayout({compact:true});
      expect(badge.width+6).toBeLessThanOrEqual(slotWidth);
      expect(badge.compact).toBe(true);
    }
    expect(jokerRarityBadgeLayout().compact).toBe(false);
  });

  it('renders static opaque identity above the card art and fits real measured text inside the badge',()=>{
    for(const rarity of Object.keys(JOKER_RARITY) as JokerRarity[])for(const compact of [false,true]){
      const {container,label,draws,data}=renderBadge(rarity,compact),style=JOKER_RARITY[rarity],layout=jokerRarityBadgeLayout({compact});
      expect(container).toMatchObject({x:17,y:23,name:'rarity-badge',width:layout.width,height:layout.height});
      expect(data.get('rarity')).toBe(rarity);
      expect(container.children).toHaveLength(2);
      expect(container.children[1]).toBe(label);
      expect(draws[0]).toEqual({method:'fillStyle',args:[style.paper,1]});
      expect(draws[1].method).toBe('fillRoundedRect');
      expect(draws.filter(draw=>draw.method==='fillStyle').every(draw=>draw.args[1]===1)).toBe(true);
      const vertices=draws.filter(draw=>draw.method==='moveTo'||draw.method==='lineTo');
      if(rarity==='common')expect(draws.some(draw=>draw.method==='fillCircle')).toBe(true);
      else expect(vertices).toHaveLength(rarity==='rare'?8:4);
      expect(label.text).toBe(compact?style.compactLabel:style.label);
      expect(label.width).toBeLessThanOrEqual(layout.text.width);
      expect(label.height).toBeLessThanOrEqual(layout.text.height);
      expect(label.fontSize).toBeGreaterThanOrEqual(10);
    }
  });
});
