import {HERO_CAST} from './HeroIdentity';
import type {CharacterId} from './characters';
import type {BuildFocus} from './BuildJourney';

/** Opening promises describe existing abilities, never a strength ranking or route lock. */
export const HERO_OPENING:Record<CharacterId,{story:string;taunt:string;accent:string}>={
 amo:{story:HERO_CAST.amo.intro,taunt:HERO_CAST.amo.quote,accent:'#26313A'},
 touye:{story:HERO_CAST.touye.intro,taunt:HERO_CAST.touye.quote,accent:'#B8473A'},
 laohuan:{story:HERO_CAST.laohuan.intro,taunt:HERO_CAST.laohuan.quote,accent:'#386D65'},
 erxiang:{story:HERO_CAST.erxiang.intro,taunt:HERO_CAST.erxiang.quote,accent:'#B8473A'},
 azao:{story:HERO_CAST.azao.intro,taunt:HERO_CAST.azao.quote,accent:'#386D65'},
 xiemu:{story:HERO_CAST.xiemu.intro,taunt:HERO_CAST.xiemu.quote,accent:'#26313A'},
};
export const OPENING_ROUTES:Record<BuildFocus,{title:string;example:string;play:string}>={
 group:{title:'同点成组',example:'7 · 7 ＋ Q · Q',play:'留同点，凑两对或三条。'},
 straight:{title:'顺子接续',example:'3 → 4 → 5 → 6 → 7',play:'留不同点数，接成连续牌。'},
 flush:{title:'同花集中',example:'集中一种花色',play:'留同花色，慢慢集中牌组。'},
};
