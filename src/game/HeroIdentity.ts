import type {CharacterId} from '../domain/characters';

/** Player identities only. Technical IDs, saved rules and historical events stay unchanged. */
export const HERO_CAST={
 amo:{name:'苏轼',title:'风起赤壁',gender:'male',intro:'豁达机敏的青年文士；善用余牌，让同伴助攻破局。',quote:'余牌未尽，便还有一着。'},
 touye:{name:'秦琼',title:'踏破山河',gender:'male',intro:'沉着果敢的青年武将；押定下一手，再用新牌争胜。',quote:'看清代价，再押这一手。'},
 laohuan:{name:'辛弃疾',title:'墨影醉里挑灯看剑',gender:'male',intro:'豪迈敏锐的青年词客；多看候选，亲手留下所需之牌。',quote:'留住好牌，且看下一着。'},
 erxiang:{name:'刘娥',title:'大宋之母',gender:'female',intro:'果决善谋的青年女杰；将核心牌的普通点数转作倍率。',quote:'这一点，落在要紧处。'},
 azao:{name:'文成公主',title:'藏地迎宾',gender:'female',intro:'从容坚毅的青年使者；换型积势，把握时机释放。',quote:'先蓄其势，再定这一局。'},
 xiemu:{name:'花蕊夫人',title:'执剑凌风',gender:'female',intro:'清丽聪慧的青年才女；留钱收息，也可燃金换取倍率。',quote:'留一分余地，也留一分锋芒。'},
} as const satisfies Record<CharacterId,{name:string;title:string;gender:'male'|'female';intro:string;quote:string}>;
export const heroName=(id:CharacterId):string=>HERO_CAST[id].name;
export const HERO_ART_NOTICE='正式立绘';
export const HERO_CAST_NOTICE='唐宋人物的架空青年形象；台词为游戏创作。';

/** Translate only explicit hero-copy call sites, never saved data or generic card/stage names. */
const legacyNames:Record<string,CharacterId>={'阿默':'amo','骰爷':'touye','老幻':'laohuan','二响':'erxiang','阿燥':'azao','谢幕人':'xiemu','谢幕':'xiemu'};
export function heroText(copy:string):string {return copy.replace(/谢幕人|阿默|骰爷|老幻|二响|阿燥|谢幕(?=·|燃金|普通)/g,name=>heroName(legacyNames[name]));}
