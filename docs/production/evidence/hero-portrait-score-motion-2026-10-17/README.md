# 独立大英雄立绘计分模块

基线 `5cafa41ace1abbfd5d9fe4ad97f9bb10a00867a4`，分支 `dev/hero-portrait-score-motion-20261017`，模块产品 `b88d235b7e52bf968d8224e4171ef7180ec4e978`。仅新增独立模块/测试/按需片段脚本，**没有修改 GameScene、StageTableArt、HeroSidebarLayout 或共享 layout**，不阻塞源唐宋牌先发布。

## 复用与接口

现有 `StageTableArt` 将左侧图限制为100×140框，当前技能计分只驱动小头像。`ScorePosture`已有牌姿曲线，但它的18px/8%卡牌幅度、arrival前光效及生命周期不能直接用于扩大后的立绘。本模块复用 `scoreCardPose` 与 `scoreContributions`，仅补大图的安全幅度、arrival前零成功反馈和复位生命周期，不另建英雄高潮/眼神舞台。

```ts
const placement = heroPortraitLayout(availableSidebarArea,
  {width:image.width,height:image.height}, measuredTextAndControlBounds);
if (placement) {
  image.setPosition(placement.x,placement.y).setScale(placement.scale);
  portraitMotion = mountHeroPortraitScoreMotion(this,image,{
    heroId:this.characterId,bounds:placement.safeBounds,
    reducedMotion:()=>this.reducedMotion,
  });
}
```

owner 用实际文字/控件矩形取代旧固定y544/100×140限制；辅助函数返回最大的完整等比空闲区域，不移动文字/命中/计分区。传入居中原点的既有 Image，bounds 与 Image 使用相同父容器局部坐标。Image现有crop/mask不改，目标、金币和文字遮罩由owner继续拥有。优先复用已预热完整 `portraitKey`，迟到图沿已有 `whenTextureReady` 接入；未到图时不阻塞计分。

在真实 `showScoreEvent` 的 character 分支，与小头像共用同一个 arrival Promise，加入既有并行 sourceEffects，**不增加串行等待或新时槽**：

```ts
if (portraitMotion && this.presentation) sourceEffects.push(portraitMotion.play({
  trace:this.presentation.score,event,context,arrival:impact,
  duration:timing.impact,replay:this.presentation.replay,
}));
```

返回 `play(...) / reset() / destroy()`。事件必须与传入的已保存trace逐字段相同，sourceType为character且技术英雄ID匹配，真实H/M有变化才反应；纯准备/成长/零变化不冒称生效，真实减益使用冷色强调。预备仅等待arrival，不位移、不染光；impact/rebound复用曲线缩至4.5px/0.7°/2.4%并拟合安全边界，最后恢复原始位置、角度、两轴比例和四角tint。原图比例及字节保持，不新增图片、纹理、眼神面板或粒子。

AbortSignal、reset/快进、页面隐藏/blur、Scene pause/sleep/shutdown/destroy及Image销毁均清理并复位，旧回调不能覆盖新事件；重放直接不演。系统/游戏内减少动态只保留静态染光，不位移旋转缩放。无持续update监听，只有实际短动作使用一个tween。

接口是供owner采用的明确候选，尚未被owner确认：向唯一GameScene owner `01a147ec-1cdc-7048-a9f6-cb648f263023` 的协调消息被自动审批拒绝，理由为未识别可信用户的明确跨线程发送授权；消息未发送、未重试或绕过。接口与片段已在本线程交root转交。正式接线和左栏扩大由owner协调后完成。

## 实测与边界

- `npm exec vitest -- run tests/hero-portrait-score-motion.test.ts`：6项通过，含真实已保存苏轼助攻事件、错英雄/伪事件拒绝、arrival前取消、回弹、减少动态、隐藏/快进/重放/销毁、旧tween拒绝和安全几何。
- `npm run typecheck`、`npm run build`：通过，336模块；新模块未接入生产Scene，生产bundle不会因模块存在而自动启用它。保留既有大chunk提示。
- `node harness/hero-portrait-score-motion.mjs`：Windows/Node v22.20.0、Playwright Chromium、1366×900 DPR1受控模块检查通过。使用实际领域命令保存的苏轼助攻事件，但由脚本调用模块，**不是正式GameScene触发链已接、不是自然完整对局**。
- 同一既有立绘100×125→212×264.741，纹理为现有 `opening-portrait-amo`，615×768比例保持；捕获impact为y−4.5px、0.7°、比例1.024，随后完全复位；领域state字节一致。取消准备无假成功、重放不重演、OS低动态静态强调、隐藏及动作中销毁均通过。
- 浏览器运行在产品提交前相同的两份模块源上；[report.json](report.json)保留真实当时HEAD，随后原字节SHA256和产品Git blob逐一绑定于[source-binding.json](source-binding.json)，不改写执行时HEAD。

[实际受控过程视频](1366-module-process.webm)，[静止布局](1366-rest.png)、[impact](1366-impact.png)、[rebound](1366-rebound.png)、[静态降动态](1366-reduced.png)。这些是独立模块证据，不能签为owner最终合版效果。

其余五英雄观感、最终左栏的全部实际文字/遮罩、手机/窄横屏的owner布局选择、真实触发链、真人观感/听感/真机：NOT_RUN。无规则/存档/音频/资产/CI/域名/main操作。P08保持in_progress。
