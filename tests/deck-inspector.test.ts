import {describe,it,expect} from 'vitest';
import {deckInspectionText,type DeckInspectionState} from '../src/game/DeckInspector';

const fixture=():DeckInspectionState=>({phase:'await-input',deckInstances:[
  {id:'K/original',rank:13,suit:'hearts',enhancement:'glass-paper',edition:'foil'},
  {id:'A/shifted',rank:14,suit:'spades'},
  {id:'K/copy',rank:13,suit:'hearts',enhancement:'glass-paper',edition:'foil'},
  {id:'2/recolored',rank:2,suit:'clubs',enhancement:'heat-paper'},
  {id:'K/destroyed',rank:13,suit:'diamonds'},
  {id:'2/plain',rank:2,suit:'diamonds'},
],destroyedIds:['K/destroyed'],drawPile:['2/plain','K/copy','A/shifted'],handOrder:['K/original'],playedPile:['2/recolored'],discardPile:[]});
const counts=(text:string)=>text.split('\n\n').filter(line=>line.startsWith('花色：')||line.startsWith('点数：'));

describe('read-only deck inspection of saved card instances',()=>{
  it('counts clones independently, excludes destroyed records and prints every rank including zero',()=>{
    const s=fixture(),before=structuredClone(s),text=deckInspectionText(s,'all','all');
    expect(counts(text)).toEqual(['花色：♠ 1 · ♥ 2 · ♣ 1 · ♦ 1','点数：A：1张 · K：2张 · Q：0张 · J：0张 · 10：0张 · 9：0张 · 8：0张 · 7：0张 · 6：0张 · 5：0张 · 4：0张 · 3：0张 · 2：2张']);
    expect(text).toContain('全部有效牌组 · 所有增强 · 5 张');expect(text.match(/K♥/g)).toHaveLength(2);expect(text).not.toContain('K♦');expect(s).toEqual(before);
  });
  it('recomputes both statistics for remaining and enhancement filters without revealing draw order',()=>{
    const s=fixture();
    expect(counts(deckInspectionText(s,'remaining','all'))).toEqual(['花色：♠ 1 · ♥ 1 · ♣ 0 · ♦ 1','点数：A：1张 · K：1张 · Q：0张 · J：0张 · 10：0张 · 9：0张 · 8：0张 · 7：0张 · 6：0张 · 5：0张 · 4：0张 · 3：0张 · 2：1张']);
    expect(counts(deckInspectionText(s,'all','enhanced'))).toEqual(['花色：♠ 0 · ♥ 2 · ♣ 1 · ♦ 0','点数：A：0张 · K：2张 · Q：0张 · J：0张 · 10：0张 · 9：0张 · 8：0张 · 7：0张 · 6：0张 · 5：0张 · 4：0张 · 3：0张 · 2：1张']);
    expect(deckInspectionText(s,'all','none')).toContain('全部有效牌组 · 无增强 · 2 张');
    const a=deckInspectionText(s,'remaining','all');s.drawPile.reverse();expect(deckInspectionText(s,'remaining','all')).toBe(a);
  });
  it('uses the actual changed rank, suit and enhancement, with played/discard/hand markers retained',()=>{
    const s=fixture();s.deckInstances[1]={...s.deckInstances[1],rank:12,suit:'diamonds',enhancement:'gold-paper'};s.discardPile=['2/plain'];
    const text=deckInspectionText(s,'all','all');expect(text).toContain('Q♦');expect(text).toContain('点数：A：0张 · K：2张 · Q：1张');expect(text).toContain('K♥ 手牌 玻璃纸 闪箔');expect(text).toContain('2♣ 已打出 热度纸');expect(text).toContain('2♦ 已弃');
    expect(deckInspectionText(s,'remaining','enhanced')).toContain('本场剩余牌堆 · 有增强 · 2 张');
  });
  it('shop never treats a previous draw pile as the next-stage remainder and labels old zones',()=>{
    const s=fixture();s.phase='shop';const before=structuredClone(s),text=deckInspectionText(s,'remaining','all');
    expect(text).toContain('商店不显示下一场剩余牌堆');expect(text).toContain('全部有效持久牌组 · 所有增强 · 5 张');expect(text).toContain('K♥ 上场手牌');expect(text).toContain('2♣ 上场已打出');expect(counts(text)).toEqual(counts(deckInspectionText(s,'all','all')));expect(s).toEqual(before);
  });
  it('empty filters keep thirteen zero counts and readable empty-state text',()=>{
    const s=fixture();s.drawPile=['2/plain'];const text=deckInspectionText(s,'remaining','enhanced');
    expect(text).toContain('本场剩余牌堆 · 有增强 · 0 张');expect(counts(text)).toEqual(['花色：♠ 0 · ♥ 0 · ♣ 0 · ♦ 0','点数：A：0张 · K：0张 · Q：0张 · J：0张 · 10：0张 · 9：0张 · 8：0张 · 7：0张 · 6：0张 · 5：0张 · 4：0张 · 3：0张 · 2：0张']);expect(text).toContain('当前筛选没有牌。');
  });
});
