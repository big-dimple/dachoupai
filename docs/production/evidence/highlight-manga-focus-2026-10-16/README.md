# 高光固定眼神与结算残留空框修复

后续接入更新：新苏轼资源已在自有开发分支合入并校准眼神裁切，见[新图7案与390实际关键帧](../highlight-new-su-shi-focus-2026-10-16/README.md)。下文18案保持原资源/原SHA的历史边界。

基线main：`8728e18e823ef9cbe28a4350a566de21f1e3127c`。产品：`e1bb46db413936dc4a81e20f616233bc0e640a68`。独立分支：`fix/highlight-manga-focus-20261016`，独立worktree，未合main。P08仍为in_progress。

## 实际问题与修改

用户手机计分截图中的右下空框可以复现：结算隐藏了道具按钮底板与文字，InventoryFeedback独立挂在根容器的箱子图标、持有提醒框仍在绘制。现在两者随buttonArt统一隐藏/恢复；不需要改GameScene。持有T01时也检查了结算后重新打开道具箱、关闭后完整存档不变。

高光原来依次切换头部方图、完整立绘/来源图、单独大数字，固定大纸面留下不均衡空白。现在固定同一眼神条带和来源缩图，局部效果与累计值使用固定两列；去掉切镜带来的整立绘换位。纸面手机最高430px、PC最高386px且宽度最多720px，短横屏眼神/数字并排。原引言不再挤入眼神区，实际来源名称、角色与主题、已保存效果及累计结果继续显示。

外围使用四组少量断续墨线；短促蓄力后只释放一次，图像坐标、裁切、比例不随阶段改变，没有扫描、往复位移或图片缩放。少动效采用静态眼神与静态边线。计分红线移除数字内部的四向散射，只保留原外围笔触及实际文字避让。没有新图片、纹理、加载请求、输入拦截或额外队列等待；继续复用已有约1秒主体展示与原释放时间。

## 实际截图

以下均来自实际生产导入入口、公开选牌/技能/出牌操作后的原生浏览器画布，没有直接挂载高光、暂停场景或修改演出时钟。前后状态一致的受控e11+T01检查点不代表自然获取率。用户附件含设备个人信息，未复制进仓库。

| 尺寸 | 计分过程中残留图层：前 / 后 | 高光构图：前 / 后 |
| --- | --- | --- |
| 390×740 | [前](screens/before-score-390.png) / [后](screens/after-score-390.png) | [前](screens/before-focus-390.png) / [后](screens/after-focus-390.png) |
| 320×740 | [前](screens/before-score-320.png) / [后](screens/after-score-320.png) | [前](screens/before-focus-320.png) / [后](screens/after-focus-320.png) |
| 740×320 | [前](screens/before-score-740.png) / [后](screens/after-score-740.png) | [前](screens/before-focus-740.png) / [后](screens/after-focus-740.png) |
| 1366×768 | [前](screens/before-score-1366.png) / [后](screens/after-score-1366.png) | [前](screens/before-focus-1366.png) / [后](screens/after-focus-1366.png) |

[刘娥固定眼神与真实+6→累计8](screens/erxiang-stable-focus.png)；[DPR 2原生截图](screens/erxiang-dpr2.png)；[结算后道具箱恢复可点](screens/inventory-restored.png)。条带来自已存在的focus派生资源，不是独立眼神原画。

## 验证与可复用证据

[validation.json](validation.json)记录源码哈希、构建版本、检查命令与逐案结果。

- Windows Node22.20、Chromium153.0.8010.12，DPR 1及必要DPR 2；生产构建/TypeScript通过，原Vite大chunk提示保留。
- 6个测试文件58项通过：focus几何/单次释放、实际来源值、销毁/释放/少动效、文字布局及外围笔触物理裁剪。旧短横落位辅助函数与对应旧几何测试由实际固定构图测试替代；红线测试继续断言真实可见外围线段避让，不用空数组假通过。
- 最终18场景PASS：[常规12](final-report.json.gz)、[持有道具5](held-final-report.json.gz)、[DPR 2单案](dpr2-final-report.json.gz)。覆盖普通固定种子交棒、390/320/短横/PC、e11/f06真实来源、4倍速、少动效、快进、退出和回看后继续选牌。无页面错误。
- 每个实际渲染帧记录眼神x/y/scale/angle，逐事件完全固定；scaleX=scaleY且scale×DPR≤1，未放大采样像素。全部实际截图文字成对碰撞检查为0。
- [干净基线4案](before-report.json.gz)的build-info明确为8728e18且modified=false，分别复现箱子/提醒框残留；最终同输入4案的initial/saved/after/cold完整state/journal/storage/localStorage逐字段相等。残留图层观测从每案962–978次变为0；这是图层观测计数，不是设备帧率。普通种子刘娥前后完整数据也相等。
- GameScene、IntermissionScene、领域/内容/存档/音频/平台与public/art均无差异。HeroClimaxValue整个函数与基线逐字相同；只拆分表现组件。无原图或派生资源改动。

复跑：`HERO_TITLE_CAPTIONS=1 HERO_FOCUS_FIXED=1 HERO_TITLE_OUT=shots/<run> node harness/hero-source-title.mjs`，用`HERO_TITLE_CASES`选择validation中的案例。持有道具检查加`HERO_FOCUS_HELD_TOOL=1`；必要DPR 2用`HERO_TITLE_DPR=2`。`HERO_TITLE_BUILD_DIR`仅用于复用已留存且确认版本的E2E构建；检查基线残留加`HERO_FOCUS_BASELINE=1`。脚本自行退出浏览器和preview；gz可由Node zlib.gunzipSync读取。

观察器失败保留在observer-failures：原脚本假定苏轼主动入口必开dialog，实际上可能直接采纳助攻，首份基线报告的该案超时，未据此判产品失败；此前已PASS的刘娥单案仍留原报告。另一次选择了已含两项修复的dirty中间构建，无法复现残留；排除该错误基线后，改用明确clean的8728e18冻结构建重跑四案，不放宽最终0残留断言。

## 新苏轼资源的明确交叉点

新苏轼PNG与派生资源由另一worker负责。本分支继续用基线现有资源接口，未读取/改写该新图或manifest。`src/game/HeroClimaxFocus.ts`的amo条带`[.25,.177,.667,.271]`按旧amo.focus.webp校准；整合新苏轼focus时，必须看图复核并按新眼位更新这一组归一化坐标，补拍必要高光截图。本批苏轼截图只证明旧资源下的布局/固定动效，不能签成新苏轼图验收。其余五人坐标来自已检查的现有头部派生图。

## 边界

未改胜利页、计分逻辑、数值、技术ID、存档身份、队列时点或用户已验收原图；未生成新图或宣称独立眼神原画。没有CI/域名/部署操作。固定变换、无新纹理/请求/等待及浏览器运行是软件证据，不替代物理手机/GPU流畅度、真人对热血感/阅读的认可、听感或正式美术验收。新苏轼坐标的整合复核仍待执行。
