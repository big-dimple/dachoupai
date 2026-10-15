import {heroTextSpec} from './HeroText';
import type {CharacterId} from './characters';

/** Selection-only language for the current six abilities. No strength scores or rule state. */
export interface SelectionPresentation {tag:string;hook:string;entry:string;when:string;cost:string}
export const SELECTION_PRESENTATION:Record<CharacterId,SelectionPresentation>={
 amo:{tag:heroTextSpec('amo').skillName,hook:'主手之外，再搭一组。',entry:'选主手 → 点英雄 → 选助攻',when:'两对及以上，剩牌有对子或三条。',cost:'助攻牌一起用掉；每场一次。'},
 touye:{tag:heroTextSpec('touye').skillName,hook:'赌刚摸的牌，撑起下一手。',entry:'选弃牌 → 点英雄押型并换牌',when:'选1–5张弃牌；已成型也能押。',cost:'成×2／否则×0.85；每场一次，押后不能再弃或改牌。'},
 laohuan:{tag:heroTextSpec('laohuan').skillName,hook:'最多多看两张，自己挑。',entry:'选弃牌 → 点英雄 → 戏法换牌',when:'选1–5张弃牌，付得起弃牌成本。',cost:'没留的本场不再抽；每场一次。'},
 erxiang:{tag:heroTextSpec('erxiang').skillName,hook:'让一张牌的点数，接住倍率。',entry:'选主手 → 点英雄 → 选牌交棒',when:'对子及以上，选一张有效计分牌。',cost:'这张普通点数不加热度；每场一次。'},
 azao:{tag:heroTextSpec('azao').skillName,hook:'换一招存劲，下一手再放。',entry:'出牌蓄势 → 点英雄 → 释放',when:'两对及以上蓄势；有层才能释放。',cost:'同牌型未释放则清空；合格时仍可释放。'},
 xiemu:{tag:heroTextSpec('xiemu').skillName,hook:'钱留着生息，也能烧成高潮。',entry:'选主手 → 点英雄 → 选燃金档',when:'两对及以上，至少留有10金。',cost:'出牌扣10／20／30金；每场一次。'},
};
