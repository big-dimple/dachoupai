# 六英雄资源合同与受控接入证据

基线：`4d2ff4ca8487f2f00b55516822d1a28ac3c1751f`。产品提交：`fe2cf0bcfe6d78480c7a7091df8060c401671808`、`7ae1d5d75d0fc39de69bfdacdb14947598286c06`；产品源树 `7fc85b9bca2019f2ad776b697f9a3f866c5dae8b`。后续只整理观察器、文档和证据，最终提交身份由Git记录；不能将后续文档SHA误记为新产品。

[交接清单与Chat提示](../../HERO_ART_HANDOFF_20261015.md)含六人区别稿、12原图/24候选规格、原图来源缺口、安全区、预加载/回退合同与不包含范围。现有18图技术审计通过不代表新的年轻成年人物或独立眼神图已制作/取回/图审/接入。本任务没有生成美术图片。

## 已完成工程与软件检查

- `CharacterArt.ts`以现行manifest统一18图的URL、纹理key和精确尺寸。角色key拒收异ID、异用途、异源和不同查询串；canvas与详情缓存入库前拒收实际错误尺寸；DOM角色图隐藏错误尺寸但保留姓名/操作。
- `verify-hero-art.mjs`审计现行文件，并提供`--template`及`--incoming <manifest>`；incoming逐一核12原图、24输出、来源/许可记录、人审与原图/输出哈希绑定、实际格式/完整解码、预算、裁切安全区及固定等比导出产物。它不机器认证年龄、脸部语义或许可真实性，也不自动发布。
- [75项定向单测](checks/unit-tests.txt)、[25项交接正反例](checks/validator-tests.txt)、[typecheck](checks/typecheck.txt)、[build](checks/build.txt)通过。没有因本轮仅改观察器而重跑既有全量门。
- [18图实际审计](checks/current-assets.json)、[精确产品/保护树](checks/product-scope.json)、[独立审查](checks/independent-review.md)。GameScene、ShopScene、领域、应用保存层、声音、public/assets及art/sources与基线逐Git对象一致；公共GameScene/ShopScene改动清单均为空。

## 原失败与恢复定位

`diagnostic/`、`diagnostic2/`、`diagnostic3/`、`final/`是暂停前观察器运行目录；其中`final/`名称不表示通过，`final/report.json`实际为FAIL。原报告与PNG保留。旧助攻命名入口、关闭弹窗后的防误触窗口，以及一次Vite导航干扰均未用产品改动绕过。

`resumed-diagnostic/`保留恢复后18秒高光等待失败。失败时完整选牌/助攻与夹具相同，保存状态已到stage-cleared、commandSeq=4、真实finalScore=2095，且playing/presentation仍true；原PNG显示逐张计分尚在运行。观察器现在等待导入后的发牌动画结束、核对完整选牌，再给真实高光阶段有界60秒等待。没有修改产品演出或数值，没有以增加超时替代最终状态/实际纹理断言。

恢复期间的`resumed-pc*`、`resumed-mobile/`、`verified-pc/`、`verified-mobile/`及`canvas-pc/`也保留中间观察器FAIL或被替代的未完成运行，不用目录名称冒充通过。已具体定位：①旧DOM断言把合法同ID selection缩略回退误判成错误尺寸，应按URL用途区分；②瞬时strike轮询改为postrender持久捕获；③截图使用TimeStep.stop()/start()丢失callback，产生`TypeError: this.callback is not a function`，改为sleep()/wake(true)保存回调。原capture PNG能证明有限静帧，但旧循环被观察器打断后的时间与结束状态不签通过。

最终观察器明确禁用GPU与软件WebGL rasterizer，使用Phaser Canvas；snapshot记录rendererType以实际结果为准。高光前经原生设置选4x，捕获后经原生菜单快进，再比对完整状态/日志/存储与原命令。它不证明普通速度连续演出时长。`canvas-pc-final/`及`canvas-mobile-final/`是最终定向运行目录，实际结果以下方完成回执为准。

[完整URL细化首次单测失败记录](checks/url-normalization-first-failure.md)保留三例DOM模拟环境无baseURI导致的错误及修正；原断言未放松。

## 验收限制

受控浏览器使用原生选角、详情、商店入场和合法checkpoint导入后的一笔真实命令；公开夹具不是自然获取或随机经营证据。device-scale PNG保留实际浏览器DPR，同时记录canvas backing像素和渲染缩放。高光截图由观察器在postrender目标阶段以sleep/wake短暂停loop截图并立即恢复，只能证明该帧构图/纹理与来源，不能作为连续演出时长或物理设备帧率证据。

当前图仍为旧过渡资源。新12原图、年轻群像/眼神图审、新eyes工程接线、高清文字返工、整体美术、真实设备、听感、自然经营与整体游戏验收均未由本任务签收。

## 最终PC回执

[canvas-pc-final/report.json](canvas-pc-final/report.json)在产品7ae1d5d7、源树7fc85b9b运行：1366×768/DPR1正常与wrong-size两例均PASS，rendererType=1（Canvas）。正常六角色逐一核同ID主图，详情/商店/牌桌与高光读取原有资源；wrong-size将真实selection字节送至portrait URL，坏立绘未进入角色纹理缓存，合法同ID缩略仍可见。两例都在postrender记录charge→strike后sleep截图、wake恢复，原生4x/快进结束后完整state/journal/storage存入各`*-state.json.gz`，state与权威命令结果一致，pageerror为空。

主线程已实际查看[正常高光](canvas-pc-final/1366-dpr1-normal-climax.png)和[错误立绘时高光](canvas-pc-final/1366-dpr1-wrong-size-climax.png)、选角及缩略回退详情。两张最终高光PNG是同ID功能牌f09的实际来源兑现帧，不把该卡面人物当成阿默新画像；英雄眼部裁切可在同源树中间run的[有限眼部帧](resumed-pc/1366-dpr1-normal-climax.png)复核，该run整体仍FAIL，不借该帧签演出完成。所有人物图仍为过渡资产。

## 父任务整合窗口

`GameScene.ts`、`ShopScene.ts`修改均为0。已有产品提交改动集中于新`CharacterArt.ts`、`characters.ts`/`portraits.ts`单源映射，`CharacterSelectScene.ts`/`StageImageWarmup.ts`/`HeroClimax.ts`/`JokerKeyHighlightView.ts`只替换共享key读取；`ArtTextureLoading.ts`/`DetailArt.ts`加角色专属精确尺寸守卫，`DetailDialog.ts`/`SelectionComparison.ts`/`BuildKeepsakeView.ts`加DOM尺寸拒收。父集成时需保留其它包已有业务逻辑，仅整合这些局部接线。未改原画、规则、价格、RNG、存档格式、演出时槽、声音或场景公共操作。

## 最终手机与完整回执复核

[手机报告](canvas-mobile-final/report.json)与[实际看图范围](canvas-mobile-final/README.md)：390×740/DPR3的normal、missing、wrong-size、late、avatar-only、name-only，以及320×640/DPR2 normal，共7例PASS。390帧缓冲1170×2220，320为640×1280；实际rendererType均为1。正常390逐一核六角色，迟到图不会替换已切换的角色，缺图按同ID缩略/头像/姓名回退。三项高光用例实际主图是来源功能牌，不冒称六英雄独立眼神覆盖。

使用新增`harness/verify-hero-art-evidence.mjs`复核两份最终报告：[9例/53张原PNG/5笔完整回执](checks/browser-evidence-check.json)全部通过。PNG完整解码且物理尺寸等于CSS视口×浏览器DPR；每笔before/after的state与current存储、journal逐字段相等，after与权威expected状态一致，恰好追加一笔原命令、存储revision只增1、previous检查点完整保留。其余4例没有高光命令，不扩大覆盖。

主线程另实际看过390六角选中谢幕人、wrong-size详情及normal高光PNG。当前谢幕人等旧脸仍在图中，它们是待替换证据，不是年轻新图批准。320牌桌截图在发牌过渡，辅助文字存在叠层，不能据此签稳定全桌排版；本任务未修改该布局。原生4x/快进、软件Canvas、有限静帧及完整保存正确，不等于整体游戏、普通速度演出时长、真实设备、听感或新美术验收。

复核命令（不启动浏览器）：

```sh
node harness/verify-hero-art-evidence.mjs docs/production/evidence/hero-art-contract-2026-10-15/canvas-pc-final docs/production/evidence/hero-art-contract-2026-10-15/canvas-mobile-final
```

开发分支交付，不合main、不部署、不重试Forbidden PR。新人物制作继续由dot在ChatGPT Chat执行；本任务只交资源合同、可执行提示/验证与接入准备，模型、免费或额度归属不作保证。
