import type {CharacterId} from '../domain/characters';

/** Player identities only. Technical IDs, saved rules and historical events stay unchanged. */
export const HERO_CAST={
 amo:{name:'苏轼',title:'风起赤壁',gender:'male',intro:'赤壁舟中，苏轼扣舷而歌，客人吹箫相和；余音未绝，牌局里也让剩余同点牌来相助。',quote:'余音袅袅，不绝如缕。'},
 touye:{name:'秦琼',title:'踏破山河',gender:'male',intro:'《旧唐书》记秦琼跃马持枪、冲入敌阵；牌局借他迎难而上的胆气，先定目标，再用换来的新牌争胜。',quote:'跃马冲阵，我先上！'},
 laohuan:{name:'辛弃疾',title:'墨影醉里挑灯看剑',gender:'male',intro:'《青玉案·元夕》写灯火中千百遍的寻觅与蓦然回首；牌局借这份寻觅，多看候选，亲手留下所需。',quote:'众里寻他千百度。'},
 erxiang:{name:'刘娥',title:'大宋之母',gender:'female',intro:'宋仁宗年幼即位，刘娥垂帘处理军国政事；牌局借她统筹政务的经历，把一张关键牌的普通点数调作倍率。',quote:'帘后听政，这一局由我定。'},
 azao:{name:'文成公主',title:'藏地迎宾',gender:'female',intro:'文成公主远赴吐蕃，与松赞干布成婚，成为唐蕃交往中的熟悉身影；牌局借这段远行，让不同牌型接续蓄层，再择机释放。',quote:'远赴吐蕃，结两地之好。'},
 xiemu:{name:'花蕊夫人',title:'执剑凌风',gender:'female',intro:'传世《花蕊夫人宫词》写到宫中散钱与买花钱；牌局借这份赏赐意象，将金币换作关键一手的倍率，也可留钱收息。',quote:'赏赐已备，这一手尽兴。'},
} as const satisfies Record<CharacterId,{name:string;title:string;gender:'male'|'female';intro:string;quote:string}>;
export const heroName=(id:CharacterId):string=>HERO_CAST[id].name;

/** Translate only explicit hero-copy call sites, never saved data or generic card/stage names. */
const legacyNames:Record<string,CharacterId>={'阿默':'amo','骰爷':'touye','老幻':'laohuan','二响':'erxiang','阿燥':'azao','谢幕人':'xiemu','谢幕':'xiemu'};
export function heroText(copy:string):string {return copy.replace(/谢幕人|阿默|骰爷|老幻|二响|阿燥|谢幕(?=·|燃金|普通)/g,name=>heroName(legacyNames[name]));}
