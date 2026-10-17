# 新加坡批次评审原始证据

被测产品：`7d7921e76ca794a14e715e3eac3b4d66143862ff`；旧基线：`ba49d4536a21c647a6710b047053def874d29ace`。文档分支的后续commit不是新测产品版本。[综合评审](../../reviews/SINGAPORE_REVIEW_20261017.md)与[待实施整改计划](../../reviews/REMEDIATION_PLAN_20261017.md)区分本地实测、静态综合及线上未跑。

原PNG/JSON/log从本地评审目录按字节复制，[evidence-manifest.json](evidence-manifest.json)记录43个原始文件的字节和SHA-256；这个43是文件数量，与旧交付的43局部测试无关。没有打包浏览器profile/cookie、缓存、token、账户数据或依赖目录；游戏状态均为固定种子的合成评审新局。原作者交付目录未修改。

## 日志与机器观察

- [targeted-tests.log](targeted-tests.log)：34项33通过/1失败，保留音频旧断言实际1.107/期望0.8815。
- [build.log](build.log)：产品构建通过，保留chunk警告。
- [flow-report.json](flow-report.json)：两个真实UI跳场失败与购买/弃牌/出牌技术短手。脚本status=DONE是采完，案内pageerror是产品FAIL。
- [minimal-domain-report.json](minimal-domain-report.json)、[minimal-domain.log](minimal-domain.log)：独立规则身份/预览定位；不属于自然UI试玩。
- [browser-report.json](browser-report.json)：三视口、父详情/zoom、72卡组件入口、六英雄黑底。72缩略图呈现不代表72高清全验。
- [async-report.json](async-report.json)、[fresh-fault-report.json](fresh-fault-report.json)：失败/迟到与safe变量。第一轮bothFailed命中已有缩略缓存；新fresh案才证明双图自然尺寸均0。
- [sampled-flow-report.json](sampled-flow-report.json)：为补impact帧重跑同一种子短手的只读采样，不是第二个完整自然局。
- [live-access-report.json](live-access-report.json)、[live-access.log](live-access.log)、[live-build-info.headers](live-build-info.headers)、[live-page.headers](live-page.headers)：线上代理拒绝原文；没取到build-info正文或游戏页面。
- [plan-check-baseline.log](plan-check-baseline.log)：改文档前已有12条invalid evidence record。后续检查结果另存，不回写原FAIL。
- [documentation-check.log](documentation-check.log)：新增文档链接、原证据哈希及仅文档范围检查；[staged-diff-check-raw.log](staged-diff-check-raw.log)保留原HTTP头CRLF/末尾空行触发的whitespace警告，未为洗绿改写HTTP原字节。作者Markdown/JSON的范围检查通过。

## 缺陷与短计分截图

|对象|截图|
|---|---|
|商店跳场前/后|[before](skip-shop-before.png) / [after](skip-shop-after.png)|
|入场跳场前/后|[before](skip-intro-before.png) / [after](skip-intro-after.png)|
|短横卡图越界/滚动无效|[zoom](short-zoom.png) / [scroll](short-zoom-after-scroll.png)|
|竖屏/PC正常卡图|[phone](phone-zoom.png) / [PC](pc-zoom.png)|
|首次详情徽标/a11无处理|[first detail](phone-detail.png) / [a11](pc-a11-no-zoom-handler.png)|
|高清失败/双图失败/迟到旧图|[detail failed](phone-zoom-detail-failed.png) / [both fresh](phone-zoom-both-failed-fresh.png) / [late](phone-zoom-late-old-keeps-new.png)|
|真实短手进入/选牌/技能说明/落定|[entry](score-short-entry.png) / [selected](score-short-selected.png) / [skill](score-short-skill.png) / [settled](score-short-settled.png)|
|计分impact原帧|[0](score-impact-0.png) / [1](score-impact-1.png) / [2](score-impact-2.png) / [3](score-impact-3.png)|

## 六英雄黑底与新苏轼

真实选角进入全图，实际看图及关闭返回：PC [苏轼](pc-hero-amo.png)、[秦琼](pc-hero-touye.png)、[辛弃疾](pc-hero-laohuan.png)、[刘娥](pc-hero-erxiang.png)、[文成公主](pc-hero-azao.png)、[花蕊夫人](pc-hero-xiemu.png)；另有[390×740苏轼](phone-hero-amo.png)和[740×320苏轼](short-hero-amo.png)。这些软件截图不代替美术批准、真机或独立眼原画验收。

本轮没有完成线上一局、试听或真机。没有因已有测试/资源数量将P08改done。新增status.json是本轮有缺陷评审记录，不替换原交付status。
