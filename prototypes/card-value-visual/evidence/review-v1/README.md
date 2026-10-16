# 卡牌价值视觉样板

这是独立视觉评审样板：手机纵向横卡，PC 三列。先判断推荐，再读路线与条件；沿用成熟手绘、象牙纸、青蓝和朱红。**不是产品接入、星级校准或游戏体验验收。**

## 冻结输入与范围

- 基于已 fetch 核实的 main：`f23c1fc2389242bacbb8f5d35733f1c344610727`。
- 阅读 `AGENTS.md`、`docs/production/DELIVERY_PLAN.md` 当前统一计划和推荐合同、`ART.md`、`UX.md`、`PC_SHOP_REGION_CONTRACT.md`。计划内旧暂停要求由本轮“只做独立原型”授权限定覆盖；产品仍不启动。
- 仓库 main 的 `.agents/skills` 不存在；`/workspace/.agents` 为空；执行环境技能目录没有项目设计技能。已读取 Library 技能，按明确仓库交付目标保持本地仓库路线，没有新增 Library/Sites 副本。按用户指定调用 Astra 做单一方案设计与两次实际图审，意见已落实；不以模型图审代签用户审美。
- 只读核实并行草稿：#143 `b4ead147080d92878efeb8df679825d52bf6c711`、#144 `899df1034df899e1cc9f33caea1f8819ee7bfc5d`。未检出、合并或修改这两条分支。
- 全部新增文件仅在 `prototypes/card-value-visual/`。产品源码、星级算法、总计划、资产、依赖与工作流不改。无购买、游戏保存、领域调用、随机数或网络服务集成。

## 本地复现

仓库根目录运行（只需 Node；预览不需构建或安装新依赖）：

```sh
node prototypes/card-value-visual/serve.mjs
```

打开 **http://127.0.0.1:5189/prototypes/card-value-visual/index.html**。

1. 默认看普通四星、稀有两星、缺搭档三星三个反例。
2. 点每张“看生效/组合条件”；再收起。
3. 点“已齐备”，第三张呈现五颗完整实星、旧金细边和小宝石；点“缺搭档”恢复。
4. 选两张，点“对比所选”；第三张选入会给出“已选满”反馈。可移出、重选；关闭按钮或 Esc 返回原按钮焦点。

没有远程字体、CDN、远程图片或外部请求。HTML/CSS/JS 均本地引用，原画从仓库 `public/assets/handdrawn-p08/cards` 读取，不能只拷贝 HTML 离开仓库。环境 Chromium 禁止 `file://`（原始失败见 `evidence/file-protocol-blocked.json`），因此已验证入口为 localhost，不声称双击文件已通过。

## 一套主方案及取舍

| 维度 | 首层识别 | 为什么这样做 |
| --- | --- | --- |
| 推荐指数 | 永远五颗完整实/空 SVG 星＋短语；每卡标“推荐指数·样例” | 不靠总分、稀有签或卡框代替推荐 |
| 固有稀有度 | 名称旁黑白形状＋“普通/稀有”完整字签 | 在灰度或推荐变化时仍保有固定身份 |
| 路线契合 | 独立“路线”行，青蓝“契合成组/各路线通用” | 无箭头，避免误认触发顺序；通用不代表高推荐 |
| 组合/门槛 | 黑墨“无需搭档/已满足1/2/门槛未满足”及一行缺件 | 圆点只辅助；展开可见具体已满足与缺失条件 |
| 五星 | 只在推荐条出现旧金镶边、五金星、小青蓝切面宝石 | 不改稀有签、不整卡发光，不造供给配额或保底 |
| 选择 | 描边按钮变深青“已选入对比”；朱红只给可执行对比按钮 | 不与稀有/五星材质争夺语义 |

手机用滚动换取完整人物与 14px 关键决策文字，不把三张硬压在首屏。对比入口在卡列下方，不悬浮压字；代价是手机需要滑过三张卡。PC 保留并排对照，所有尺寸使用同一字段顺序。这里刻意只展示价值判断与比较，不接入价格/购买区域，也不声称替代完整商店。

## 展示数据，不是真实推荐

`app.js` 明确硬编码两组展示状态，没有导入或仿造产品推荐算法。

| 例子 | 固有稀有度 | 展示推荐 | 条件示例 |
| --- | --- | --- | --- |
| 满堂彩 | 普通 | 4/5 | 成组直接加热，不需额外搭档 |
| 包场 | 稀有 | 2/5 | 可用于各路线，但样例购后18金低于20金门槛 |
| 再说一遍 | 稀有 | 3/5 → 5/5 | 葫芦 KKK22、最大同点组在前；从缺“一束光”切至已有搭档 |

**3→5 是切换两份美术展示样例，不是“补一个搭档必升两星”、不是每局保证五星，也不是新算法规则。** “齐备”只表示样例列出的条件满足，不声称已经触发、已经结算或未来必定抽到。五星何时真的成立、阈值、寿命、机会成本及出现频率都留给独立推荐合同。

名称、稀有度和展开中的效果关系参考当前 main 的 `src/content/r2-jokers.json`、`r2AssistJokers.ts`、`r2GroupUpgradeJokers.ts`、`r2RouteGrowthJokers.ts`；推荐数值/购后现金/搭档存在性均是展示输入。没有调用计分器或给出模拟净收益。

## 现有画面与素材

在实施前运行 main 原生标题→阿默→同点成组→首店，实际查看手机390×844、PC1366×900两图；只观察开局货架，没有自然整局。脚本 `capture-baseline.mjs` 可复现此路径（依赖现有 Vite/Playwright 与 `/usr/bin/chromium`），seed 固定 `card-value-baseline`。`evidence/baseline.json` 记录身份与货架，不把它当样例推荐的算法证据。

原画只读复用：`mantangcai.detail.webp`、`e08.detail.webp`、`b06.detail.webp`。无新人物、无生成卡面、无修改原图。原仓库 `public/assets/handdrawn-p08/manifest.json` 记录资产来源；本目录 `evidence/assets.json` 保存原路径、SHA-256 和原 manifest 条目。继承来源记录不等于重新认证商用权利。

基线观察：手机三列小卡导致说明断行碎，星行没有文字维度标签；PC 原画完整，但推荐与条件堆在卡底。样板把字段固定分行，条件细则折叠。对比是布局方向对照，不是同一游戏状态的产品 before/after。

## 截图与验证

最终原型图均在 `evidence/`，以下是优先评审入口：

| 尺寸 | 默认全页 | 五星全页 | 比较视窗 |
| --- | --- | --- | --- |
| 320×740 | [320默认](evidence/prototype-320-default.png) | [320五星](evidence/prototype-320-five.png) | [320对比](evidence/prototype-320-compare.png) |
| 390×844 | [390默认](evidence/prototype-390-default.png) | [390五星](evidence/prototype-390-five.png) | [390对比](evidence/prototype-390-compare.png) |
| 1366×900 | [PC默认](evidence/prototype-1366-default.png) | [PC五星](evidence/prototype-1366-five.png) | [PC对比](evidence/prototype-1366-compare.png) |

同目录另有 `*-viewport.png`（实际首屏）、`*-conditions.png`（展开条件）、`*-five-compare.png`、`*-reduced.png`。`baseline-390-shop.png` 与 `baseline-1366-shop.png` 为现有产品图。`evidence/artifact-index.json` 固定每张图的字节与哈希。

复查命令（复用仓库现有开发依赖）：

```sh
node prototypes/card-value-visual/verify.mjs
# Chromium 路径不同时：
CHROMIUM_PATH=/path/to/chromium node prototypes/card-value-visual/verify.mjs
```

`evidence/verification.json` 绑定 HTML/CSS/JS 哈希。Chromium151、DPR1 的 320/390/1366 软件视窗：图片加载、无页面/卡内横溢出、关键文字 Range 不越卡、每条五颗完整星、44px 控件、条件开合、3↔5样例/条件同步、两张选择上限与移出、普通/五星对比、关闭/Esc/焦点恢复、切样例保留选择、低动态、无外部请求、无 JS 错误通过。还实际查看了最终默认/五星/比较/展开图，检查文字与星星。

首版与失败不抹除：`evidence/initial-review/` 保存悬浮条遮卡、320标题拆行、PC过高的首版图；`compact-layout-overflow.json` 为收紧头部后390宽溢出的检查失败（320已通过），随后固定小牌网格修复。`compact-layout-overflow.png` 是诊断时320正常视窗，**不是390失败图**。未隐藏横向溢出来过检查。最后一次统一比较面板的五星颜色后，旧观察器把已关闭对比弹窗中的五星也算入主卡，产生 `hidden-dialog-selector-failure.json`；现明确检查 `.card .five`，比较面板仍单独验证，两类显示对象不混计。首提交 da8f3776 保存了该失败观察器；最终交付以后续修复 SHA 为准。

验证边界：只验本静态原型；未验真实推荐正确性、自然五星频率、交易/存档、整局体验、触屏实体设备、用户理解、音效/性能或正式部署。这里的 PASS 不能签上线、游戏体验验收或 #143/#144 通过。保留草稿 PR，未合并。
