# 四种标记与弹窗回退：第三轮独立原型

承接 PR145 第二轮 `f16e17253558d13bffd0c2316a12c44b2b1f171b`，不重做人物主导、横向卡列、点整牌详情和统一底栏比较。初查远端仍是f16，本地没有该原型写者/锁；沿原分支继续，提交前再次核远端head。项目 `.agents/skills` 不存在、环境 `.agents` 为空。总计划只读，不维护第二份排期。

最终可见原型代码 `27048f759ffd222f72934da8fcf30eb2a9891c39`；原尺寸截图/本地操作绑定该代码及HTML/CSS/JS哈希。最终review HEAD只增加本目录证据和观察器，精确SHA/CI由PR145实际回执核对。

## 打开与操作

仓库根运行 `node prototypes/card-value-visual/serve.mjs`，打开 **http://127.0.0.1:5189/prototypes/card-value-visual/index.html**。本轮该回环服务已实际启动，可继续打开；需要在另一环境查看时，先检出PR145分支再运行。仍不是托管站点或产品接入，不把旧file协议阻止记录改为双击可用。

1. 手机左右滑卡；点整牌看详情，关闭返回原卡列位置。
2. 稀有包场仍为两星样例，同时显示全息版次；普通满堂彩仍为四星。
3. “已齐备”切换到另一份固定展示输入，再说一遍显示五个实星；“缺搭档”恢复三实二空。不是加一个搭档必升两星的算法。
4. 统一底栏选择两张、比较、关闭、移出或取消；短视窗可滚动正文，关闭按钮始终保留。换一张详情或重新比较时从正文顶部开始。

## 确认的问题与修正

| 对象 | 实际前态 | 本轮结果 |
|---|---|---|
| 版次这一轴 | f16卡面、详情、比较未显示版次，页脚只有三轴 | 卡面小签、详情及比较分别显示独立版次；用既有全息“倍率+2”作静态展示输入，推荐星/稀有度/现金/组合条件不随它计算改变 |
| 短视窗比较关闭 | 390×568，原同一对包场＋再说一遍滚到底，关闭按钮top=-92/bottom=-48，整个控件在视窗外 | 分开固定标题/关闭区与正文滚动区；同一对滚到底关闭58×44，top=27，仍可实际点按 |
| 新正文滚动继承 | 中间代码544a8a7将滚动移入正文后，换卡详情保留前一张scrollTop，包场出现18px滚动、人物顶部被切出正文区 | 每次新详情/比较归零正文滚动；底层页面/横向卡列/比较选择保留。原中间图及复现记录未删 |
| 五颗星 | 本轮原尺寸f16的390×844原图中实空星完整；没有证实原五颗星裁切 | 保留原SVG与5个位置，不假造星条修复。逐卡、详情、比较和五星样例复核五完整实空星及文字边界 |

四个含义：推荐是固定展示评分；稀有度是卡牌固有类别；组合潜力用当前搭档/条件是否齐备表达，齐备不等于已触发；版次是独立附加效果，不改变稀有度，也不规定推荐星数。不引入新的潜力评分、稀有度或星级规则。

普通版次显示“无附加效果”，全息显示“倍率+2”，只用于原型解释既有版次。产品权威定义仍在仓库 `src/content/r2-tools.json` 的editions；本页不导入它、不调用计分器、不读保存，不声明这笔样例是一场真实交易或真实推荐。

人物contain宽与上一轮保持：390约190.59px，PC约224.22px；卡面仍没有嵌套按钮或重复动作行。版次与路线共用现有一行，不遮人物，不加新资产或整卡发光。推荐五星原金边/小宝石与黑白稀有签继续独立。

## 原尺寸前后证据

原第二轮历史图保持在 `evidence/round2/`；本轮重新实际打开f16所得原尺寸前态另在 `evidence/round3/before/`，没有覆盖历史。最终软件范围为Chromium、DPR1，PC1366×900、手机390×844；390×568只作同宽短视窗滚动边界。手机用CDP触摸横滑及真实tap，正文滚动用浏览器wheel；不是物理手机。

| 局部 | 本轮前态 | 最终代码 |
|---|---|---|
| PC人物卡列与四轴 | [f16原图](evidence/round3/before/1366x900-default.png) | [最终原图](evidence/round3/after/1366x900-default.png) |
| 手机人物主体/新增版次 | [f16默认](evidence/round3/before/390x844-default.png) | [最终默认](evidence/round3/after/390x844-default.png)、[稀有/全息/两星](evidence/round3/after/390x844-e08.png) |
| 手机五星 | 第二轮已有[五完整星](evidence/round2/390-five.png) | [本轮五完整星](evidence/round3/after/390x844-five.png) |
| 同一对短视窗滚到底关闭 | [f16包场＋再说一遍，关闭在视窗外](evidence/round3/before/390x568-compare-bottom.png) | [同一对最终关闭保留](evidence/round3/focused/390x568-same-pair-compare-bottom.png)、[关闭返回](evidence/round3/focused/390x568-same-pair-returned.png) |
| 换卡详情 | [中间代码544新滚动继承FAIL](evidence/round3/intermediate-544a8a7/390x568-next-detail.png) | [最终顶部重开](evidence/round3/focused/390x568-next-detail.png) |
| PC/手机详情与比较 | [f16 PC详情](evidence/round3/before/1366x900-detail.png)、[f16手机详情](evidence/round3/before/390x844-detail.png) | [最终PC详情](evidence/round3/after/1366x900-conditions.png)、[最终手机详情](evidence/round3/after/390x844-conditions.png)、[PC比较](evidence/round3/after/1366x900-compare.png)、[手机比较](evidence/round3/after/390x844-compare.png) |

上表最终PC、390默认/两星/五星、短视窗关闭和新详情原图已实际看像素。没有以SVG数量或PASS代签完整体验/整体审美。

## 有界操作与源码保护

- `node prototypes/card-value-visual/verify.mjs` → [最终验证](evidence/round3/after/verification.json)，三尺寸均PASS。复用第二轮场景，只增加本轮四轴、固定关闭与归零/返回检查；输出改为round3，保护旧round2。逐卡滑入、原生横滑不误开、tap开关、Enter/Esc、五完整星、3↔5固定样例、选择上限/移出/整体取消、两种比较、关闭焦点、低动态、零外部请求/JS错误均核。
- 真实wheel滚动前后关闭矩形相等；关闭详情后页面scrollY/卡列scrollLeft相等；新详情/比较scrollTop=0。标准两视窗统一动作仍在首屏，短视窗保留页面滚动，不冒称568高度整页塞进首屏。
- `node prototypes/card-value-visual/inspect-round3.mjs` → [同一对/换卡详细回执](evidence/round3/focused/report.json)，三尺寸均PASS；同一对包场＋再说一遍比较关闭后页面/卡列/两个选择完整相等。
- f16原始边界负例：[关闭消失](evidence/round3/before/comparison-scroll.json)；中间544回归：[18px继承](evidence/round3/intermediate-544a8a7/detail-reopen.json)。当时原有场景验证通过，但漏测重开；[中间验证](evidence/round3/intermediate-544a8a7/verification-initial.json)保留。新增重开断言后再修复，不放宽旧保护。
- [边界与资产对象](evidence/round3/boundaries.json)：src/tests/harness/public/art/docs/AGENTS/依赖/工作流逐对象和f16相同；只改 `prototypes/card-value-visual/`。三原图原路径及hash保持。`current()`固定3/5样例函数及star/stars渲染函数均原样，没有算法、实际价格或供给修改。
- `node --check app.js`、`node --check verify.mjs`、既有plan只读校验通过。仓库默认CI另按最终HEAD核查；它不代替原型专用操作检查。

本轮未接产品、不改src/结算/GameScene/总计划、不合main/不部署。PR145保持Draft。父实际操作、审美判断及产品接入决定仍OPEN；真实推荐正确性、稀有/五星频率、游戏交易/保存、真人理解、物理设备/听感均不由原型签收。不存在与结算开发窗口的文件交叉。
