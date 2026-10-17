# 选角主体构图：本地 dev 候选

基线 `f81724b57736c7d4f299cf1d95705a7ba3ef9497`，分支 `dev/character-select-immersion-20261017`。产品范围为 CharacterSelectScene、SelectionLayout、OpeningShowcaseLayout 和选角专属 SelectionStageView。原 main 工作区保持干净且 HEAD 未变。

PC 改为完整人物、姓名宣言、真实能力取舍三段构图，深墨背景用有限明暗平面分层，能力纸片按实际内容收高。取消移到左上角，对比为小入口，底部六人条与唯一朱红主选择保留。手机采用人物与短态度并排、短效果与条件居下、六人 3×2 与 56px 主按钮；短横屏另排。所有实际交互目标至少 44px，320 样本包含 34px 底部安全区。

宣言与题名复用 HERO_CAST / HERO_OPENING，能力复用 characterForNewRun 与 SELECTION_PRESENTATION 的 hook / when / cost。故事与技能例子保持按需展开。现有原画保持字节，主体全图等比显示，独立黑底原画查看器保持原实现。方向键与 1–6 换选、Enter 确认、Escape 返回；按住 Enter 不连续进入下一步，弹窗打开时键盘交由弹窗处理。按压复用 SceneView，迟到图片只更新当前人物的图像容器。

参考父线程已经完成的 board-race 实际代码研究，精确提交 `ab72bf69cae445df466c9cd204dba9fda96ce5dc`：driverSelect.css 的桌面三栏、次动作体量与唯一 GO，driverSelect.ts 的同一人物资料联动和取消语义。两张指定 Library 图均由本消费端下载到 Windows worktree 的 shots/reference，验证本地字节可读、保留 Library 元数据并逐张查看像素：`libfile_a5efb711df20819195009f669d394df5`、`libfile_54aafe60c20c8191a4ea8a2d530d3b5b`。文件大小与 SHA-256 见 browser-results.json。未引入外部代码、美术或雷达数值。

## 实际前后截图

| 视口 | 基线 | 本候选 |
|---|---|---|
| PC 1366×768 | [改前](before-pc.png) | [改后](after-pc.png) |
| 手机 390×740 | [改前](before-390.png) | [改后](after-390.png) |
| 手机 320×640 / bottom 34 | [改前](before-320.png) | [改后](after-320.png) |

补充：[路线](after-route-390.png)、[展开故事](after-story-390.png)、[黑底原画](after-portrait-390.png)。原始全量浏览器输出在该 worktree 的 shots/hero-selection-layout 和 shots/selection-input；只保留本次有审阅价值的九张图入库。

## 已执行验证

- 4 个相关单测文件共 18 项通过：selection-layout、opening-signature、hero-text-contract、hero-opening-intent。
- `npm run build` 通过；保持现有大 bundle 提示。产物文件名见 browser-results.json，没有修改资源清单。
- 已有 `harness/hero-selection-layout.mjs`：6 视口 ×（6 英雄 + 3 路线）共 54 个布局检查；六人换选、折叠故事/例子、全图、模式保留、缩窗、2 次开局商店保存及冷恢复通过。没有进行牌桌长局。
- 最终源码补充：1366×768 正常动态、390×740 / 320×640 / 568×320 低动态，24 个英雄视图通过实际文本边界、目标尺寸与无滚动溢出检查；键盘、Enter 长按、共享按压、延迟 1400ms 的秦琼原画返回后身份同步、触摸取消、路线返回与清除选择、浏览期间存档不变通过。
- 实际输入均为浏览器鼠标、键盘、触摸或原生触摸取消；只读 observer 用于检查状态和几何。浏览器与源文件 SHA-256、截图 SHA-256、结果计数保存在 [browser-results.json](browser-results.json)。测试发生在提交前，报告中的起始 HEAD 为基线，精确被测源码以这些文件指纹为准。
- `git diff --check` 通过；原工作区 status 干净、HEAD 仍为基线。

没有修改 GameScene、ShopScene、音频、资源清单、共享 Modal / ConfirmDialog / SceneView 或黑底原画查看器。共享确认弹窗高度由另一负责人处理。本候选只证明本地软件视口与输入检查；真人理解、观感、听感及物理设备验收保持未签，P08 保持 in_progress。不合并 main，不查询或等待 CI，不部署。
