# P0 Joker 文案消歧（仅 review）

产品源码 `b51cfac52af61847499b69d6b4707558285336a6`：先推 `fc89004` 检查点，再正常合入已审 main `193c93b8`。相对主线只改三个 Joker 文案文件和两个纯文案测试；不改美术、效果数值、身份、存档、版次、RNG 或 H 的入口/重试。Draft PR22，由父统一整合，未推 main。

- c07 完整条件为同花或同花顺，d07 保留全部打出牌均有效计分门槛；实际窄位安全回退“条件 ›”。回马枪“每3次×2”，f06 仍按真实余手显示。
- 843f 的 a03/a05/a06 主句说明“两对及以上牌型”，精确十种清单仍在细则，连续同/异型、助攻不参与、首手与下一手边界保持。旧 v10/v11 的单张/高牌规则保持；旧 a06 本来已有“打出高牌时”，没有把它报告成缺条件。
- 回看只读实际 trace 的 H/M 变化、成长增量和事件；+0/×1 与本手计分增益分开，新增成长说明下次生效。bodyActive/editionActive 动画语义保留，非计分记录没有被统称未触发，版次不会归入本体。
- 倍率主句统一为“本次出牌的倍率”，仍按实际槽序结算，不承诺最终得分必按此倍增。

本地冻结：2337 tests / 131 files、content、type/build、标准 Chromium desktop/mobile smoke、plan PASS，源码/index/HEAD 均保持。72 模板在 v10/v11/843f 全部无占位符；受保护路径逐字节同主线，包含 `r2AssistJokers` description 与旧发布快照。详细身份见 summary.json。

原生证据为软件 Canvas、DPR1、320×740 与390×740，使用通过存档校验的夹具和实际 PlayHand 生成的保存 trace。16 次详情/回看验证，实际字号≥14px、触点≥44px，单滚动区与固定操作区保持；打开/关闭、回看均保持完整 run/seq/RNG。最后商店补验等待三件商品入场动画结束；以 `shop-native-report.json` 与当前 shop PNG 为准，原两次过渡帧图/报告保留在 incomplete-shop 目录，不算可视通过。图片实际看过的集合精确记录于 image-manifest.json，其余只声明程序检查。

保留首两轮新测试夹具失败、第一次原生选择器失败、同 source 两个 v00-bot 5 秒超时和商店过渡帧。没有放宽超时、修改原 FAIL 或冒充真机/GPU/听感/平衡通过。

复现：将本目录 `native.mjs` 复制到仓库 `shots/p0-copy/native.mjs`，运行 `node shots/p0-copy/native.mjs`。只复核已构建版本商店时可用 `ONLY_SHOP=1 REUSE_BUILD=1 node shots/p0-copy/native.mjs`。脚本只在 shots 生成证据，不编辑产品或保存格式。

精确源码 Draft CI：`b51cfac52af61847499b69d6b4707558285336a6` / [37274152843](https://github.com/big-dimple/dachoupai/actions/runs/37274152843) 三项 success。证据提交后的新 head CI 状态另报，不冒充同一 SHA。
