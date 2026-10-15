import type {CharacterId} from '../domain/characters';

/** Player identities only. Technical IDs, saved rules and historical events stay unchanged. */
export const HERO_CAST={
 amo:{name:'苏轼',title:'风起赤壁',gender:'male',intro:'以赤壁风月与旷达文心为意象，青年苏轼将未尽之意化作同伴相和的一着。',quote:'一局风起，余意相和。'},
 touye:{name:'秦琼',title:'踏破山河',gender:'male',intro:'取隋唐武将临阵决断的气概，青年秦琼在换牌前定下目标，以新锋争取下一手。',quote:'先定一策，再试新锋。'},
 laohuan:{name:'辛弃疾',title:'墨影醉里挑灯看剑',gender:'male',intro:'借稼轩词中的灯火与剑意，青年辛弃疾在候选牌间审势择锋，为下一手亲留所需。',quote:'灯下留锋，下一手见。'},
 erxiang:{name:'刘娥',title:'大宋之母',gender:'female',intro:'取北宋刘娥善理政局的意象，青年刘娥将一枚关键筹码移向倍率，以有限一着统筹全局。',quote:'一筹易位，满局生势。'},
 azao:{name:'文成公主',title:'藏地迎宾',gender:'female',intro:'以唐蕃交往与远行相逢为意象，青年文成公主在不同牌型间从容积势，于合适一手释放。',quote:'行有远路，势可渐成。'},
 xiemu:{name:'花蕊夫人',title:'执剑凌风',gender:'female',intro:'取蜀中女诗人的才情与不屈之意，青年花蕊夫人以执剑形象权衡藏锋留资或散金一搏。',quote:'锋可藏，金亦可舍。'},
} as const satisfies Record<CharacterId,{name:string;title:string;gender:'male'|'female';intro:string;quote:string}>;
export const heroName=(id:CharacterId):string=>HERO_CAST[id].name;
export const HERO_ART_NOTICE='正式立绘';
export const HERO_CAST_NOTICE='唐宋人物的架空青年形象；台词为游戏创作。';

/** Translate only explicit hero-copy call sites, never saved data or generic card/stage names. */
const legacyNames:Record<string,CharacterId>={'阿默':'amo','骰爷':'touye','老幻':'laohuan','二响':'erxiang','阿燥':'azao','谢幕人':'xiemu','谢幕':'xiemu'};
export function heroText(copy:string):string {return copy.replace(/谢幕人|阿默|骰爷|老幻|二响|阿燥|谢幕(?=·|燃金|普通)/g,name=>heroName(legacyNames[name]));}
