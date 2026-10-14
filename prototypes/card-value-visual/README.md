# 卡牌价值样板 · 当前第三轮独立原型

2026-10-14 父授权恢复独立原型工作。本轮仅在本目录：补版次这一轴，保持原五完整实空星/人物主体/统一比较，修短视窗滚动后关闭消失及新详情继承旧滚动。星值仍为固定展示输入，未接产品。

**当前可打开入口与精确前后证据见 [ROUND3.md](ROUND3.md)。** 仓库根执行 `node prototypes/card-value-visual/serve.mjs`，打开 http://127.0.0.1:5189/prototypes/card-value-visual/index.html 。当前验证 `node prototypes/card-value-visual/verify.mjs` 写入 `evidence/round3/after/`；同状态补充操作 `node prototypes/card-value-visual/inspect-round3.mjs` 写入 `evidence/round3/focused/`。

以下为2026-10-13第二轮原始记录，按f16e1725及当时验证器保留。旧“结束/停止扩展”只描述第二轮，不覆盖本次父授权；历史图和结果没有被重新覆盖。

---

# 第二轮：卡牌价值样板 · 单轮收敛

**本轮结束于视觉评审候选，不再自行扩展，也不接入产品。** 父审否决首版整体美学：人物偏小、三张长表单、每卡重复两行操作。本轮保留信息分轴，改成人物主导的卡面，去掉逐卡按钮。整体是否优于现有产品，仍交父审/用户判断；不以软件测试代签审美。

## 最终样板与原稿对照

| 尺寸 | 首版（已被父审否决） | 本轮默认 | 本轮五星样例 |
| --- | --- | --- | --- |
| 320×740 | [原稿](evidence/review-v1/prototype-320-default.png) | [本轮](evidence/round2/320-default.png) | [五星](evidence/round2/320-five.png) |
| 390×844 | [原稿](evidence/review-v1/prototype-390-default.png) | [本轮](evidence/round2/390-default.png) | [五星](evidence/round2/390-five.png) |
| 1366×900 | [原稿](evidence/review-v1/prototype-1366-default.png) | [本轮](evidence/round2/1366-default.png) | [五星](evidence/round2/1366-five.png) |

原稿是全页图，本轮默认是实际视窗；不是等高缩小拼贴。本轮另有 `*-full.png` 全页和各卡、选择、详情、对比截图。原稿源码冻结于 `ead4046e30fbb7ba3d32d13ca428f7dc9fdefdd4`；旧根目录 `evidence/prototype-*`、旧 `verification.json`、旧哈希索引均保持原样。新证据全部在 `evidence/round2/`，不能混用。

原有产品 main 的实际基线仍为 [手机390](evidence/baseline-390-shop.png)、[PC1366](evidence/baseline-1366-shop.png)，源 `f23c1fc2389242bacbb8f5d35733f1c344610727`。没有把产品基线改画后冒充实图。

## 唯一方案及取舍

- **人物优先**：完整 contain 原手绘，标题与独立黑白稀有小签在卡顶；星星、路线、一枚组合连环及短状态直接落在卡面下沿。
- **点牌看详情**：默认点整张牌打开条件。首层没有“选入对比／看条件”两行逐卡按钮。
- **统一比较**：底栏“选择对比”进入选择模式，点牌勾选/取消；最多两张，用同一底栏比较或取消。选择框和勾记不改稀有度。
- **手机横向卡列**：一次完整阅读一张，旁边只露出人物，提示可滑动。旁露卡的文字与星星隐藏，避免半颗星和半个标签。每张滑到完整位置后恢复全部信息。PC 三张同时并排。
- **组合装饰**：单环勾=无需搭档，虚实连环=缺搭档，双环勾=搭档齐备。文字仍给 `1/2`、`2/2`；包场用独立门槛符号及 `18/20金`，不伪装组合已成。
- **五星克制**：仅推荐条有旧金细边、五星与一枚小青蓝宝石。黑白稀有签不变；无整卡发光，无每局保底。

可测量的变化：每卡重复操作行由2变0；320的原画 contain 宽由约72px增至约170px，390由89px增至约191px（不是图片文件放大或新画）；统一操作在三种视窗首屏可见。具体几何见本轮验证记录。代价是手机不能同时读完三张，需要横滑；比较前需要进入选择模式。这些取舍是否更好仍需父审，不据此宣布整体美学通过。

## 本地复现与操作

仓库根目录运行：

```sh
node prototypes/card-value-visual/serve.mjs
```

打开 **http://127.0.0.1:5189/prototypes/card-value-visual/index.html**。

1. 默认看普通四星“满堂彩”；手机左右滑动，再看稀有两星“包场”和待搭配三星“再说一遍”。
2. 点卡看条件；关闭或 Esc 返回该卡。键盘 Tab 聚焦卡片、Enter 打开。
3. 点“已齐备”切换组合展示样例，第三张出现五星与双环勾；“缺搭档”恢复。
4. 点底栏“选择对比”，点两张卡；再点统一“比较这两张”。第三张选择会提示已满；再点已选卡可取消。关闭对比后选择保留；底栏“取消”退出选择模式，恢复点牌看详情。

不依赖外部网络、CDN、字体或新依赖；原图只读引用仓库。环境禁止 `file://`，已验证入口为本地回环服务器，不声称双击文件通过。原始阻止记录保留于 `evidence/file-protocol-blocked.json`。

## 展示事实与边界

三反例保持：普通满堂彩4星；稀有包场2星且购后18金未达20金；稀有再说一遍从缺一束光的3星展示切到搭档齐备的5星展示。每卡推荐旁常显“样例”；页首为“非实局推荐”。

**3→5是两份固定展示输入切换，不是补一个搭档必升两星的算法。** 齐备不等于已经结算，也不保证后续抽到或每局出现五星。推荐阈值、寿命、机会成本与出现频率均未在这里校准。

名称、稀有度和效果关系参考原 main 的 `r2-jokers.json`、`r2AssistJokers.ts`、`r2GroupUpgradeJokers.ts`、`r2RouteGrowthJokers.ts`；本样板没有导入它们、调用计分器或改产品规则。所有星数、现金、搭档存在性均为展示数据。

复用 `public/assets/handdrawn-p08/cards/` 内 `mantangcai.detail.webp`、`e08.detail.webp`、`b06.detail.webp`。资产原路径/哈希/出处记录仍见 `evidence/assets.json`。无新画、无改画、无廉价几何人物。

## 验证

```sh
node prototypes/card-value-visual/verify.mjs
# 如 Chromium 安装位置不同：
CHROMIUM_PATH=/path/to/chromium node prototypes/card-value-visual/verify.mjs
```

本轮 `evidence/round2/verification.json` 绑定当前 HTML/CSS/JS 哈希。320×740、390×844、1366×900，Chromium151/DPR1：

- 逐张完整滑入后检查文字边界、五颗完整实空星、无页面横溢出、44px控件；旁露仅原画，不截半个文字/星星。
- 手机 CDP 原生触摸滑动到第二张，不误开详情；实际 tap 打开/关闭详情。
- 三张详情开关、键盘Enter/Esc和焦点返回；无逐卡重复动作行。
- 比较模式、两张上限、取消单张、整体取消、普通/五星比较、关闭/Esc/焦点恢复；样例切换保留选择。
- 3↔5及1/2↔2/2同步、低动态；图片加载，无外部请求或JS错误。

截图 `*-e08.png`、`*-b06.png` 可检查三个反例，`*-conditions.png` 看条件，`*-selected.png` 看选择态，`*-compare.png` / `*-five-compare.png` 看比较。本轮完整截图哈希见 `evidence/round2/artifact-index.json`。实际查看了手机320/390默认、五星、条件及PC三卡/比较。

PASS仅指这个独立原型的软件操作与几何，不包含推荐正确性、交易/存档、自然五星频率、整局体验、实体设备、性能/听感、用户理解或上线验收。CI状态绑定最终提交另交，不借首版CI代签本轮。

## 范围与交接

依旧只改 `prototypes/card-value-visual/`，不改产品源码、推荐算法、资产、依赖、工作流、DELIVERY_PLAN 或并行 #143/#144。分支仍是 `prototype/card-value-visual-20261013`，只更新草稿 PR #145，不合并、不部署。

前轮已读取 AGENTS、统一计划、美术合同、UX 与PC区域合同；项目 `.agents/skills` 不存在，环境 `.agents` 为空。Astra 前轮实际读图并做设计起头；本轮按父审意见收敛，不再开新方案或新批次。

**后续会话按最新用户要求切回 Sol 6.1；当前轮次不重启。** 交接只等待父审对这一版的接受/拒绝。若仍不优于现有卡片，保留本候选与原稿，停止扩展，不再堆控件，不把局部技术通过转为产品接入授权。
