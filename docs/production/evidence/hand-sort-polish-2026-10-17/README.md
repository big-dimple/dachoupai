# 理牌区域精修

基线 main `9e015286d1d223afad0a6e6b2860fcfed1457faf`，独立分支 `dev/hand-sort-polish-20261017`。被测源码指纹见 [report.json](report.json)，测试使用基线加本包源码；提交 SHA 以交付回执为准。

## 参考输入与变更

用户参考 `libfile_1795969f366c8191902c806f5bd85654` 已按当前 Library 技能在消费端材料化并本机 `view_image` 看像素：574×83，SHA-256 `d629c96ab59837e2d96413821689708d798fbdaab396277c4bca7ee64d9adaa4`。Windows 原版 helper 在元数据阶段报 `AttributeError: module 'os' has no attribute 'setxattr'`；随后在**同一台机器的 Ubuntu-Dev WSL** 运行同一未修改 helper，向 `/mnt/d/ai/dachoupai/dachoupai/.codex-remote-attachments/hand-sort-polish-materials/reference.png` 成功写入并校验 Library 元数据，再从对应 Windows 路径查看。没有使用父级 cloud 路径、绕过元数据或重新上传输入图；临时下载描述已删除。

原三个功能紧贴青灰框，粗 hover 来自 `SceneView` 的通用 2px glow。现在：

- “理牌”仍为组内顶部 11px 弱标题，三功能下排、左右等宽与所有布局几何保持；两条 1px / 低对比短竖线停在按钮中段，不穿文字。
- 仅三个理牌按钮在 mouse hover 时纸面与文字轻抬约 2px，浅底、细阴影、1px 低对比边缘；输入矩形不移动、不缩放。触控不保留 hover，失焦/后台/禁用清理表现，销毁时移除事件与 tween。
- reduced motion 只保留浅底反馈，位移为 0。`GameScene`、布局、技能、全局字体、原有键盘/手牌焦点通路及 CSS focus 样式均未修改；没有新增排序键盘导航，也没有删除已有焦点提示。
- 只在三个技术 ID `action/sort-rank`、`action/sort-suit`、`selection/switch-type` 安装呈现。`SelectionStageView` 同样复用 sort 皮肤，已明确排除，其他按钮保留原路径。
- 没有新增字体资产。现有 woff 仅用于分数字体；本机有 Microsoft YaHei / YaHei UI 常规、粗体与细体。排序标签维持 14px、使用现有 UI_FONT / 本地 500 字重请求，沿当前 framebuffer 倍率与 `crispText` 对齐。通过 Phaser 公开 `getTextMetrics` 与实际墨迹边界做单行光学居中；本次 DPR2 点数/花色/AI 的墨迹中心分别同为 PC y716、手机 y792。多行计算/稍候/不可用仍使用原居中区间。

## 验证

- PASS：`npm exec -- vitest run tests/hand-sort-visual.test.ts tests/hand-action-controls.test.ts tests/scene-view-refresh.test.ts tests/ai-hand-action-cancellation.test.ts`，4 文件 / 35 项。覆盖固定44px hit、鼠标视觉位移、触控/低动态、禁用/后台/失焦清理、销毁监听释放、变化中的 AI 文案与 enabled 状态、三技术 ID 范围以及原交互/AI取消回归。
- PASS：`npm run build`（包含 `tsc --noEmit`）、`git diff --check`。`GameScene.ts`、`layout.ts`、`theme.ts`、`style.css` 与字体目录均无改动。
- PASS：一次有限本地检查：编译 e2e 产物，受校验的当前身份首场存档通过真实导入 UI 进入游戏；PC1366×768 mouse hover / reduced motion，390×844 mouse→touch，DPR2。hover 不改变 state/journal/save slots，hit 固定；手机真实触控排序只产生一笔 `ReorderHand`，结果与 reducer、保存 checkpoint 完全相同，触后视觉归位。早期检查把合法排序误当 no-op 的断言 FAIL 已纠正为真实命令 oracle；没有改变产品语义来通过检查。

短截图已查看：[PC静态](pc-rest.png)、[PC悬停](pc-hover.png)、[手机静态](phone-rest.png)、[手机悬停](phone-hover.png)。图是受控软件浏览器、非真人审美或物理设备批准。临时局部检查位于忽略的 `shots/hand-sort-polish/check.mjs`，没有新增产品入口或全矩阵脚本。

接入通过 `SceneView` 既有 sort 分支完成，无需 GameScene 补丁。仅 dev 普通提交/push，不操作 main、CI、域名、部署或长局；P08 与正式/真人/设备验收门保持。
