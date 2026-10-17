/**
 * 《唐宋牌》全部 72 张大丑牌／唐宋牌标准展示名字典
 * 1:1 严格对齐 72 张手绘卡牌美术原画命名（A01-F12）
 */
export const TANGSONG_CARD_NAMES: Readonly<Record<string, string>> = Object.freeze({
  // Group A (A01 - A12)
  pengci: '狭路相逢',
  tiesuanpan: '精打细算',
  a03: '掌灯破雾',
  a04: '乾坤锦囊',
  a05: '轻车熟路',
  a06: '一舞倾城',
  a07: '浮生半日',
  a08: '野火春风',
  a09: '清音穿云',
  a10: '慧眼识珠',
  a11: '梅开二度',
  a12: '一盏清茗',

  // Group B (B01 - B12)
  mantangcai: '满堂喝彩',
  b02: '心有灵犀',
  b03: '莫逆之交',
  b04: '琴瑟和鸣',
  b05: '凤鸣朝阳',
  b06: '重锤响鼓',
  b07: '宾主尽欢',
  b08: '平分秋色',
  b09: '技惊四座',
  b10: '炉火纯青',
  b11: '蓄势待发',
  b12: '绝处逢生',

  // Group C (C01 - C12)
  jiedongfeng: '巧借东风',
  c02: '朱砂点绛',
  c03: '挥毫泼墨',
  c04: '步步高升',
  c05: '辞旧迎新',
  c06: '青出于蓝',
  c07: '弦外之音',
  c08: '一步之遥',
  c09: '天衣无缝',
  c10: '稳如泰山',
  c11: '峰回路转',
  c12: '锦上添花',

  // Group D (D01 - D12)
  d01: '坐镇中军',
  d02: '奇兵突起',
  d03: '陈年佳酿',
  d04: '顾盼生威',
  d05: '小试牛刀',
  d06: '虚位以待',
  d07: '箭无虚发',
  d08: '余音绕梁',
  d09: '空谷传响',
  d10: '无中生有',
  d11: '一鼓作气',
  d12: '深藏不露',

  // Group E (E01 - E12)
  e01: '金玉满盘',
  e02: '宾至如归',
  e03: '聚宝金瓮',
  e04: '一本万利',
  e05: '鲜衣怒马',
  e06: '点石成金',
  e07: '天道酬勤',
  e08: '一掷千金',
  e09: '内有乾坤',
  e10: '倾囊相授',
  e11: '薪火相传',
  e12: '沙里淘金',

  // Group F (F01 - F12)
  huimaqiang: '回马枪',
  f02: '孤注一掷',
  f03: '双喜临门',
  f04: '两袖清风',
  f05: '青云直上',
  f06: '刹那芳华',
  f07: '逢凶化吉',
  f08: '上上大吉',
  f09: '始终如一',
  f10: '柳暗花明',
  f11: '越战越勇',
  f12: '压轴好戏'
});

/**
 * 获取面向玩家的唐宋正名（若未收录则降级为默认名或ID）
 */
export function cardDisplayName(definitionId: string, defaultName?: string): string {
  return TANGSONG_CARD_NAMES[definitionId] ?? defaultName ?? definitionId;
}

/** UI-only name projection; the original definition remains the rule/hash input. */
type CardNameSource={readonly id:string;readonly name:string};
export function cardDefinitionName(definition:CardNameSource):string;
export function cardDefinitionName(definition:CardNameSource|null|undefined):string|undefined;
export function cardDefinitionName(definition:CardNameSource|null|undefined):string|undefined {
  return definition?cardDisplayName(definition.id,definition.name):undefined;
}
