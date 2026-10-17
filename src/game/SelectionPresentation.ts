import {heroSkillName} from './HeroSkillPresentation';
import type {CharacterId} from './characters';

/** Selection-only language for the current six abilities. No strength scores or rule state. */
export interface SelectionPresentation {tag:string;hook:string;entry:string;when:string;cost:string}
export const SELECTION_PRESENTATION:Record<CharacterId,SelectionPresentation>={
 amo:{tag:'贬谪',hook:'舍弃余牌，让这一手得分变为4倍。',entry:'选出牌 → 选贬谪 → 确认出牌',when:'选好1–5张出牌，至少还剩1张可弃。',cost:'出牌时弃掉全部余牌；每场一次。'},
 touye:{tag:heroSkillName('touye'),hook:'赌刚摸的牌，撑起下一手。',entry:'选弃牌 → 点击技能按钮押型并换牌',when:'选1–5张弃牌；已成型也能押。',cost:'成×2／否则×0.85；每场一次，押后不能再弃或改牌。'},
 laohuan:{tag:heroSkillName('laohuan'),hook:'最多多看两张，自己挑。',entry:'选弃牌 → 点击技能按钮 → 确认换牌',when:'选1–5张弃牌，付得起弃牌成本。',cost:'没留的本场不再抽；每场一次。'},
 erxiang:{tag:heroSkillName('erxiang'),hook:'让一张牌的点数，接住倍率。',entry:'选主手 → 点击技能按钮 → 选一张计分牌',when:'对子及以上，选一张有效计分牌。',cost:'这张普通点数不加热度；每场一次。'},
 azao:{tag:heroSkillName('azao'),hook:'换一招存劲，下一手再放。',entry:'出牌蓄势 → 点击技能按钮 → 释放',when:'两对及以上蓄势；有层才能释放。',cost:'同牌型未释放则清空；合格时仍可释放。'},
 xiemu:{tag:heroSkillName('xiemu'),hook:'钱留着生息，也能烧成高潮。',entry:'选主手 → 点击技能按钮 → 选择支付档',when:'两对及以上，至少留有10金。',cost:'出牌扣10／20／30金；每场一次。'},
};
