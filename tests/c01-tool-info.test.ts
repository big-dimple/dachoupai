import {describe,it,expect} from 'vitest';
import {R2_TOOLS,R2_LONG_TERM_ITEMS} from '../src/content/r2Tools';
import {ENHANCEMENTS,type PlayingCard} from '../src/cards/types';
import {toolInfo,itemInfo,cardSpecialText,editionLabel,editionEffectText,toolFamilyLabel} from '../src/game/r2ToolInfo';
import {scoreBeat} from '../src/game/scorePresentation';
import type {ScoreEvent} from '../src/domain/scoreR2';

const card:PlayingCard={id:'visible/card',rank:2,suit:'hearts'};
const detail=(id:string)=>{const info=toolInfo(id);return `${info.description}\n${info.cost}\n${info.risk}`;};
const staticEvent=(operation:string,phase:ScoreEvent['phase']='onCardScore'):ScoreEvent=>({
  eventId:'committed/1',rootId:'hand/1',rootEventId:'committed/1',phase,sourceType:'card',
  sourceDefinitionId:'lucky-paper',sourceInstanceId:card.id,targetCardId:card.id,operation,value:{n:'1',d:'1'},
  before:{H:{n:'7',d:'1'},M:{n:'1',d:'1'}},after:{H:{n:'7',d:'1'},M:{n:'1',d:'1'}},
  reasonKey:operation,visibleCondition:{kind:'always'},retriggerDepth:0,
});
const duration=(event:ScoreEvent,ordinal=0)=>Object.entries(scoreBeat(event,ordinal))
  .reduce((sum,[key,value])=>key==='strength'?sum:sum+(value as number),0);

describe('C01 public tool and item details',()=>{
  it('covers the adopted 39 tools and 12 persistent items without fallback placeholders',()=>{
    expect(R2_TOOLS).toHaveLength(39);expect(R2_LONG_TERM_ITEMS).toHaveLength(12);
    for(const row of R2_TOOLS){
      const info=toolInfo(row.id);
      expect(info.name).toBe(row.name);expect(info.family).toBe(row.family);
      expect(info.label).toContain(toolFamilyLabel(row.family));expect(info.label).toContain(row.name);
      for(const field of [info.description,info.cost,info.risk,info.artUrl])expect(field.length).toBeGreaterThan(8);
      expect(`${info.description}${info.risk}`).not.toMatch(/待实现|暂无|TODO|rng|nextSeed|drawPile/i);
    }
    for(const row of R2_LONG_TERM_ITEMS){
      const info=itemInfo(row.id);expect(info.name).toBe(row.name);
      expect(info.description).toContain('本局');expect(info.description).toContain('不可出售');
      expect(info.description).toContain('4');expect(info.artUrl).toMatch(/^data:image\/svg\+xml,/);
    }
    expect(()=>toolInfo('T00')).toThrow();expect(()=>itemInfo('U00')).toThrow();
    expect(['tarot','planet','spectral','utility'].map(family=>toolFamilyLabel(family as 'tarot')))
      .toEqual(['塔罗','星球','幻灵','补给']);
  });
  it('names each planet’s fixed discovered hand instead of presenting a general level selector',()=>{
    const names=['高牌','对子','两对','三条','顺子','同花','葫芦','四条','同花顺','五条','同花葫芦','同花五条'];
    names.forEach((name,index)=>{
      const text=detail(`P${String(index+1).padStart(2,'0')}`);
      expect(text).toContain(`固定升级${name}`);expect(text).toContain('+1');
      expect(text).toContain('已发现');expect(text).toContain('30');expect(text).toContain('已确定');
    });
  });
  it('separates purchase price, extra gold and lasting next-stage penalties',()=>{
    expect(toolInfo('S02').cost).toMatch(/基准售价：8金[\s\S]*额外使用代价：5金/);
    expect(toolInfo('S05').cost).toMatch(/基准售价：6金[\s\S]*额外使用代价：3金/);
    expect(detail('S03')).toMatch(/下一场[\s\S]*永久[\s\S]*出牌次数[\s\S]*−1/);
    expect(detail('S03')).toContain('累计最多2');expect(detail('S03')).toContain('至少2');
    expect(detail('S04')).toMatch(/下一场[\s\S]*永久[\s\S]*手牌上限[\s\S]*−1/);
    expect(detail('S04')).toContain('累计最多2');expect(detail('S04')).toContain('至少5');
    expect(detail('S03')).toContain('当前场');expect(detail('S04')).toContain('当前场');
  });
  it('publishes sacrifice order and weighted outcomes without revealing future random results',()=>{
    const sacrifice=detail('S01'),edition=detail('S02');
    expect(sacrifice).toContain('未增强');expect(sacrifice).toContain('不同');
    expect(sacrifice).toMatch(/商店[\s\S]*牌组[\s\S]*顺序[\s\S]*待出牌[\s\S]*手牌[\s\S]*顺序/);
    expect(sacrifice).toContain('点击顺序');expect((sacrifice.match(/1\/7/g)??[]).length).toBe(7);
    expect(edition).toContain('普通版次');expect(edition).toContain('扑克');expect(edition).toContain('大丑牌');
    expect(edition).toMatch(/闪箔[\s\S]*5\/10/);expect(edition).toMatch(/全息[\s\S]*3\/10/);
    expect(edition).toMatch(/多彩[\s\S]*2\/10/);expect(edition).toContain('稀有度');expect(edition).toContain('购入价');
  });
  it('retains full-copy, level-exchange, rare-reward and purification constraints',()=>{
    const copy=detail('S03'),exchange=detail('S05'),rare=detail('S06'),poly=detail('S07'),clear=detail('S08');
    for(const layer of ['点数','花色','增强','版次'])expect(copy).toContain(layer);
    expect(copy).toContain('底部');expect(copy).toContain('80');expect(copy).toContain('临时失效');
    expect(exchange).toContain('+3');expect(exchange).toContain('−1');expect(exchange).toContain('27');expect(exchange).toContain('至少2');
    expect(rare).toContain('全部金币');expect(rare).toContain('至少5');expect(rare).toContain('未持有');
    expect(rare).toContain('等概率');expect(rare).toContain('购买');expect(rare).toContain('普通版次');
    expect(poly).toContain('牺牲');expect(poly).toContain('购入价');expect(poly).toContain('成长');expect(poly).toContain('容量');
    expect(clear).toContain('至少4张');expect(clear).toContain('每张只计一次');expect(clear).toContain('本局一次');
    expect(clear).toContain('下一场');expect(clear).toContain('+1');expect(clear).toContain('14');
  });
  it('makes reward-only supply, spent-discard limits and free-reroll growth explicit',()=>{
    expect(detail('T16')).toContain('不可购买');expect(detail('T16')).toContain('首次Boss');
    expect(detail('T16')).toContain('2金');expect(detail('T16')).toContain('+5');
    expect(detail('T17')).toContain('入场');expect(detail('T17')).toContain('已用弃牌');
    expect(detail('T18')).toContain('刷新次数');expect(detail('T18')).toContain('付费刷新成长');
  });
  it('shows enhancement and edition as independent layers with public trigger timing',()=>{
    for(const enhancement of ENHANCEMENTS){
      const text=cardSpecialText({...card,enhancement,edition:'foil'});
      expect(text).toMatch(/^增强：.+；版次：闪箔/);expect(text).toContain('+25');
    }
    const lucky=cardSpecialText({...card,enhancement:'lucky-paper',edition:'polychrome'});
    for(const text of ['1/5','+4','1/15','+10','20','独立','额外计分','×1.5'])expect(lucky).toContain(text);
    const glass=cardSpecialText({...card,enhancement:'glass-paper'});
    expect(glass).toContain('1/4');expect(glass).toContain('一次');expect(glass).toContain('结算后');
    expect(cardSpecialText({...card,enhancement:'voice-paper'})).toContain('有效持牌');
    expect(cardSpecialText({...card,enhancement:'gold-paper'})).toContain('每场最多5');
    expect(cardSpecialText({...card,enhancement:'encore-paper'})).toContain('最多4');
    expect(cardSpecialText(card)).toBe('增强：无；版次：普通');
    expect([undefined,'none','foil','holographic','polychrome'].map(edition=>editionLabel(edition as 'none')))
      .toEqual(['普通','普通','闪箔','全息','多彩']);
    expect(editionEffectText('foil')).toContain('+25');expect(editionEffectText('holographic')).toContain('+2');
    const jokerEdition=editionEffectText('polychrome');
    for(const text of ['×1.5','独立','稀有度','自身全部计分能力后','未命中','持牌'])expect(jokerEdition).toContain(text);
  });
  it('describes persistent caps, read timing and nonretroactive qualifications',()=>{
    expect(itemInfo('U01').description).toMatch(/下一场[\s\S]*14/);
    expect(itemInfo('U03').description).toContain('当前场');
    expect(itemInfo('U05').description).toContain('3→4');
    expect(itemInfo('U06').description).toContain('至少1');expect(itemInfo('U07').description).toContain('最多4');
    expect(itemInfo('U08').description).toContain('16');expect(itemInfo('U08').description).toContain('玻璃');
    expect(itemInfo('U09').description).toContain('并列');expect(itemInfo('U09').description).toContain('不重选');
    expect(itemInfo('U10').description).toContain('自身');expect(itemInfo('U11').description).toContain('1→2');
    expect(itemInfo('U12').description).toContain('跳过');expect(itemInfo('U12').description).toContain('不追补');
    expect(itemInfo('U12').description).toContain('未持有');
  });
  it('returns small deterministic standalone vector emblems and 12 distinct hand constellations',()=>{
    const urls=[...R2_TOOLS.map(tool=>toolInfo(tool.id).artUrl),...R2_LONG_TERM_ITEMS.map(item=>itemInfo(item.id).artUrl)];
    for(const url of urls){
      expect(url.length).toBeLessThan(80000);
      const svg=decodeURIComponent(url.slice('data:image/svg+xml,'.length));
      expect(svg).toMatch(/<svg[^>]*xmlns="http:\/\/www.w3.org\/2000\/svg"/);
      expect(svg).toContain('viewBox="0 0 384 536"');expect(svg).toContain('<title>');
      expect(svg).not.toMatch(/<script|<foreignObject|<image|href=|https?:\/\/(?!www\.w3\.org\/2000\/svg)/);
    }
    const planets=R2_TOOLS.filter(tool=>tool.family==='planet').map(tool=>{
      const svg=decodeURIComponent(toolInfo(tool.id).artUrl.split(',')[1]);
      return svg.match(/<g id="constellation">([\s\S]*?)<\/g>/)?.[1];
    });
    expect(planets.every(Boolean)).toBe(true);expect(new Set(planets).size).toBe(12);
    expect(toolInfo('S01').artUrl).toBe(toolInfo('S01').artUrl);
  });
});

describe('C01 committed chance, lifecycle and reward beats',()=>{
  it('keeps probability checks quiet and separates them from actual destruction and gold grants',()=>{
    const checks=['lucky-multiplier-check','lucky-gold-check','lucky-gold-cap','glass-check'];
    for(const operation of checks){
      const event=staticEvent(operation,operation==='glass-check'?'afterHand':'onCardScore');
      for(const ordinal of [0,8,511]){
        expect(scoreBeat(event,ordinal).strength).toBe('light');expect(scoreBeat(event,ordinal).flight).toBe(0);
        expect(duration(event,ordinal)).toBeGreaterThanOrEqual(300);expect(duration(event,ordinal)).toBeLessThanOrEqual(420);
      }
    }
    const glass=staticEvent('glass-check','afterHand'),destroy=staticEvent('destroy-card','afterHand'),gold=staticEvent('add-gold');
    expect(scoreBeat(destroy).strength).toBe('medium');expect(duration(destroy)).toBeGreaterThan(duration(glass));
    expect(scoreBeat(gold).strength).toBe('medium');expect(duration(gold)).toBeGreaterThan(duration(staticEvent('lucky-gold-check')));
  });
  it('gives upgrade and received-tool rewards distinct readable beats without accumulator flight',()=>{
    const upgrade=staticEvent('upgrade-hand','onStageClear'),reward=staticEvent('reward-consumable','onStageClear');
    expect(scoreBeat(upgrade).strength).toBe('medium');expect(scoreBeat(reward).strength).toBe('medium');
    expect(duration(reward)).toBeGreaterThan(duration(upgrade));
    expect(scoreBeat(upgrade).flight).toBe(0);expect(scoreBeat(reward).flight).toBe(0);
  });
  it('retains every new event, accelerates only through position eight and leaves the source intact',()=>{
    for(const [operation,phase] of [['glass-check','afterHand'],['destroy-card','afterHand'],['destroy-joker','afterHand'],
      ['add-gold','onStageClear'],['upgrade-hand','onStageClear'],['reward-consumable','onStageClear']] as const){
      const event=staticEvent(operation,phase),before=structuredClone(event);
      const lengths=Array.from({length:9},(_,i)=>duration(event,i));
      for(let i=1;i<lengths.length;i++)expect(lengths[i]).toBeLessThan(lengths[i-1]);
      expect(scoreBeat(event,511)).toEqual(scoreBeat(event,8));expect(event).toEqual(before);
      expect(scoreBeat(event,8).windup).toBeGreaterThan(0);expect(scoreBeat(event,8).impact).toBeGreaterThan(0);
    }
  });
});
