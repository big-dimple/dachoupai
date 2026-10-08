import type {CharacterId} from './characters';
import type {BuildFocus} from './BuildJourney';

/** Opening promises describe existing abilities, never a strength ranking or route lock. */
export const HERO_OPENING:Record<CharacterId,{story:string;taunt:string;play:string;accent:string}>={
 amo:{story:'灯坏了，他照样演完最后一幕。',taunt:'少说一句，照样抢你的场。',play:'先凑两对或更大的组合，再用余下同点牌助攻。每场一次，副组会消耗。',accent:'#26313A'},
 touye:{story:'收工后的最后一盏灯，总留给他再试一把。',taunt:'你算你的，我敢再押一手。',play:'平时有稳定加成；每场可押一手，有机会翻倍，也可能变弱。',accent:'#B8473A'},
 laohuan:{story:'漏雨的小后台，也能被他变成惊喜登场。',taunt:'袖子空的？你的掌声可不空。',play:'连续的顺子、同花或同花顺，能多添热度。也可以尝试其他路线。',accent:'#386D65'},
 erxiang:{story:'从街边到大舞台，他总能接住冷场。',taunt:'你刚开口，场子已经归我了。',play:'对子、两对、三条会多添倍率；更大的同点组合不享受这项加成。',accent:'#B8473A'},
 azao:{story:'这个包袱没收尾，他已经想好下一招。',taunt:'老一套？我换个活儿压你一头。',play:'换一种牌型会多添倍率；第一手和重复牌型不触发。',accent:'#386D65'},
 xiemu:{story:'散场前，他还会向空座位鞠一次躬。',taunt:'别急着鼓掌，最后才轮到我。',play:'最后可用出牌翻倍；这一手过关还能多收金币。也可以提早过关。',accent:'#26313A'},
};
export const OPENING_ROUTES:Record<BuildFocus,{title:string;example:string;play:string}>={
 group:{title:'同点成组',example:'7 · 7 ＋ Q · Q',play:'留同点，凑两对或三条。'},
 straight:{title:'顺子接续',example:'3 → 4 → 5 → 6 → 7',play:'留不同点数，接成连续牌。'},
 flush:{title:'同花集中',example:'集中一种花色',play:'留同花色，慢慢集中牌组。'},
};
