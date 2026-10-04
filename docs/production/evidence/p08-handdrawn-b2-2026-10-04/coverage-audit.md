# A03/P08 只读覆盖盘点

注册入口：`jokerArt.ts`/runtime manifest；牌桌 `renderJokers→jokerMechanism`、商店 `drawJokerPicture`、两场景同详情 `inspectJoker/jokerPortrait` 与 `attachJokerFallback`；共用程序图为 `JokerMotif.ts`，缩略加载和失败重试为 `JokerArtLoading.ts`。本盘点只是注册／路径／源码检查，不是全部72运行或整体审美验收。

新手绘13：tiesuanpan, f09, a07, a08, c03, d02, d07, e02, e07, f04, f07, e09, f10。

保留旧图22：pengci, mantangcai, huimaqiang, jiedongfeng, a03, a05, b02, b03, b04, c02, c04, c06, d01, d03, d05, d10, e01, e03, e05, e08, f02, f03。

程序机制fallback37：a04, a06, b05, b06, b07, b08, c05, c07, c08, d04, d06, e04, e06, f05, f06, a09, a10, a11, a12, b09, b10, b11, b12, c09, c10, c11, c12, d08, d09, d11, d12, e10, e11, e12, f08, f11, f12。

原已发布基线是新11/旧23/机制38；本已批准两图增量中，铁算盘由旧图替换，f10由机制fallback替换，所以是新13/旧22/机制37。无其他ID换图或借图；全部35已注册ID的缩略／详情路径都实际存在。每ID名称／key／路径见[完整72表](coverage-audit.json)。

下一小批精确建议：`c08 少一级`，当前通用票据／计数线图，静态 `four-straight`，无hooks；表现“少一级的连续四张”，完整条件：A234合法、QKA2不合法、保留5张顺子、同花顺仍5张。`c09 少一块布`，当前程序四张同花图，静态 `four-flush`，无hooks；表现“四块同色布／四张同花”，完整条件：普通同花4/5张，同花顺和扩展同花仍5张，双four的4张同花连续判普通同花。两者计分／版次被Boss停用不移除持有静态规则，出售才去；短入口4张顺子／4张同花与常驻例外保留。不生成图、不接未approved素材，排在已批准铁算盘/f10后。
