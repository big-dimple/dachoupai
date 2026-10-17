import {expect,it} from 'vitest';
import {shortHeroStatus} from '../src/game/HeroSidebarLayout';
it.each([
 ['和亲 · 蓄1层 · 可放×1.5','蓄1层 · ×1.5'],['文成公主·蓄2·放×2.5','蓄2层 · ×2.5'],
 ['文成公主·已选×4','已选 ×4'],['赏赐 · 已选付30金','已选30金'],['垂帘听政 · 已选11点','已选11点'],
 ['苏轼·已选助攻×4','助攻 ×4'],['跃马冲阵 · 已押同花顺','已押同花顺'],['辛弃疾·候选已存，待留牌','候选待留'],
 ['辛弃疾·候选不足，已全留','候选已全留'],['和亲 · 已停用','技能停用'],['赏赐 · 已用','本场已用'],
 ['和亲 · 本场已结束','本场结束'],['垂帘听政 · 条件未满足','条件未满足'],
])('keeps the actual decision tokens in %s', (copy,expected)=>expect(shortHeroStatus(copy,'技能名')).toBe(expected));
