# 商店四区、自选三路与当前 Boss 预告

## 追加：货架直接显示额外收益

四区主体已推送 `c0480291da2e51876a5089021221648b0bd5eedb`。本追加采用统一文案适配器原提交 `4b74ebc71aa760700d978057f7fd7fa46ca3bdaf`（本分支正常 cherry-pick 为 `28429044e0c5cba565b4186b719b92dfa315596b`），不另写加成数值来源。

PC 与竖屏货架直接显示原有本体说明、原有“多彩”身份及额外倍率×1.5；闪箔额外热度+25、全息额外倍率+2分别显示。额外收益行独立于原画和价格，购买详情也采用统一说明。展示与页面测量不发购买或使用命令。

追加验证：[extra-tests.txt](extra-tests.txt) 为4个文件46项通过，[extra-build.txt](extra-build.txt) 为类型与生产构建通过。[report-extra.json](report-extra.json) 记录1912×954、1366×768、390×740、320×568和390×740空持有共5组受控页面验证；均无脚本异常、同商品文字重叠或状态写入。截图：[PC](1912x954-held5-extra.png)、[390竖屏](390x740-held5-extra.png)、[320竖屏](320x568-held5-extra.png)、[空持有](390x740-held0-extra.png)。首次断言曾误用其他游戏的50/10预期，原始失败保留于 `extra-test-expectation-first-FAIL.txt`；最终断言读取本项目25/2/1.5实际目录。

后续范围：据整合负责人反馈，图鉴→全部规则资料→谢幕镀彩仍为旧的左图右文详情布局；本次货架和购买详情改进不代表图鉴已重排。多彩动态边缘、忘招暖金提示由独立组件负责人接线，本提交不包含动画，也不改GameScene。完成本追加后释放ShopScene窗口。

分支 `dev/shop-workshop-structure-20261017`；基线 `4b0de064480a9c518f6443984ef6a465c4b3323d`，正常包含 `68affa5c` 热修。交付提交以 Git 回执为准。P08 保持 in_progress。

## 实际结果

- PC 四主消费区同时显示：购买唐宋牌、消耗工具、自选做牌、长期物品。随机工具数量只算真实 offer，不再追加巨大工坊伪商品。自选服务置于主消费内容；顶部刷新显示符号和真实费用，背包显示数量，右下大型进入牌桌。空持有收紧为52px顶部栏；人物用完整、全色局部构图，移除全屏18%灰影。
- 竖屏四类同排，自选与库存分开；无持有时以人物与服务捷径使用空间。保留商品实测文字高度和五持有条件省略热修；扩展四张货架时分页占分类行，不遮商品图。
- 三路有共享节点、连线、选路高亮及其余路径暗化／叉；确认前可返回换路。真实保存成功才按现有共享凭证显示三路已用。点数、原花色只带入筛选，首次选牌仍为空。真实报价、购买入库存、选牌、预览、使用、失败恢复均沿原确认链路。
- Boss 警示从当前 `phase=shop`、当前商店 visitIndex 与当前 stageIndex 的备战事实派生；旧缓存固定句不会带进普通商店。普通商店每次 render 校验音乐场景为 shop；保留真实 Boss 预告 onReveal 才切 Boss 音乐。未改 AudioEngine 或 GameScene。

## 可直接审查的实图

| 内容 | 证据 |
| --- | --- |
| PC 四区、左侧目标、顶部排序、右下主按钮 | [1912×954 五持有](1912x954-held5.png)、[1280×720](1280x720-held5.png) |
| 竖屏空／满持有 | [390 空持有](390x740-held0.png)、[390 五持有](390x740-held5.png)、[320×568](320x568-held5.png) |
| 三路与可逆选路 | [未选路](390-route-choice.png)、[改牌已选](390-route-selected.png)、[三路已用](390-shared-used.png) |
| 实际费用与空选牌 | [点数报价](390-rank-quote.png)、[初始无勾选](390-rank-target-empty.png)、[8→9预览](390-rank-preview.png) |
| 服务／染色 | [牌型报价](1366-practice-quote.png)、[染色预览](1366-dye-preview.png) |
| 保存失败／恢复 | [失败](1366-save-failed.png)、[恢复](1366-save-recovered.png) |
| Boss 前／后／继续及旧UI缓存 | [真实备战](1366-boss-preparation.png)、[胜利后下一商店](1366-boss-victory-next-shop.png)、[恢复](1366-boss-next-shop-restored.png)、[缓存再校验](1366-stale-boss-cache-cleared.png) |
| 四张货架分页 | [初页](390x740-held5-expanded.png)、[第二页](390-expanded-page2.png) |

## 有界验证

`tests.txt`：12个相关文件、136项通过（追加展示变更另记）。`build.txt`：`tsc --noEmit && vite build` 通过，保留既有大包提示。最终截图批次 [report.json](report.json) 为10组实际页面，全部零脚本异常、真实命中区无重叠；[report-expanded.json](report-expanded.json) 为四张货架单次补查；[report-boss.json](report-boss.json) 为最终 render 音乐校验补查。

实际 DOM／Canvas 点击完成 PC 牌型升级、染色、手机8→9、可逆选路、购买取消、存储提交失败与菜单重试、共享已用跨收费刷新。每次命令后整份运行状态和持久化状态均与未修改领域执行结果一致；具体命令与状态摘要见 report 的 commandChecks。

Boss 样本由真实领域命令完成两次跳过普通场、Boss出牌胜利、下一章开店；仅明确提升公开牌型等级作工程样本，不冒称自然获得或真人实战。实际浏览器通过 Boss 预告→出牌胜利→下一章商店→公共存档导入；另注入旧 UI 文案和 Boss 音乐缓存，用实际 resize 验证重新派生且存档不变。自然现场残留完整触发仍未复现；父级自然实战另记。

首轮失败均保留：两份 fixture 校验 FAIL、fixture第三轮测试日志、旧布局断言 FAIL、未关闭结果面板导致原生点击被阻挡的 runner FAIL、误用 U01 的扩展样本 FAIL。修正样本／脚本后未放宽生产校验、未 force 点击。

软件 Chromium、鼠标／触摸及严格导入样本只证明本表覆盖范围；不代签物理设备、听感、美术原图或审美验收。未做完整18局、CI、部署、域名操作或 main 推送。领域、内容数据、原图和 manifest 无差异。

期间一次后续 ShopScene 样式微调因旧占用禁改约束被自动审批拒绝；收到后续明确的唯一 owner 和 ShopScene 修复指令后正常获准，未绕过拒绝。当前无剩余审批阻塞。
