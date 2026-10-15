import spec from '../../docs/production/HERO_TEXT_SPEC_20261015.json';
import type {CharacterId} from '../domain/characters';

/** Display copy only. Saved identities and ability availability remain authoritative. */
export function heroTextSpec(id:CharacterId){return spec.heroes.find(hero=>hero.id===id)!;}
export const HERO_QUICK_COPY:Record<CharacterId,{effect:string;tags:readonly string[]}>= {
 amo:{effect:'余牌对子×2，三条×4；助攻牌一起消耗。',tags:['两对及以上','每场1次']},
 touye:{effect:'押下一手，新补牌成型×2；否则×0.85。',tags:['弃1–5张','每场1次','已成型也可押']},
 laohuan:{effect:'多看最多2张，亲自留下应补张数。',tags:['弃1–5张','每场1次','照付弃牌成本']},
 erxiang:{effect:'一张核心牌的首次普通点数，改加倍率。',tags:['对子及以上','每场1次']},
 azao:{effect:'换型蓄至3层，释放×1.5／2.5／4。',tags:['两对及以上','有层可释放','可重新蓄势']},
 xiemu:{effect:'付10／20／30金换×2／3／4，也可留钱收息。',tags:['两对及以上','主动每场1次','需足额金币']},
};

/** Keep implementation terms in the document, out of the player-facing rules. */
export function heroDetailRules(id:CharacterId):string {
 const hero=heroTextSpec(id);
 return [hero.skillSummary,...hero.detailRules].join('\n\n').replaceAll('现行AMO_ASSIST_TYPES集合','现行合格牌型').replaceAll('pending-refill','待选补牌').replaceAll('Joker','大丑牌');
}

export function mountHeroTags(dialog:HTMLDialogElement,tags:readonly string[]):void {
 if(!tags.length)return;
 const row=document.createElement('ul');row.className='hero-skill-tags';row.setAttribute('aria-label','技能条件与次数');
 for(const tag of tags){const item=document.createElement('li');item.textContent=tag;row.append(item);}
 const intro=dialog.querySelector('.dialog-intro');intro?.prepend(row);
 const style=document.createElement('style');style.textContent='.hero-skill-tags{display:flex;flex-wrap:wrap;gap:5px;list-style:none;padding:0;margin:0 0 10px}.hero-skill-tags li{font:600 13px/1.5 system-ui,sans-serif;color:#386d65;background:#e5eee5;border:1px solid #b8cabc;border-radius:5px;padding:3px 6px}';dialog.append(style);
}
