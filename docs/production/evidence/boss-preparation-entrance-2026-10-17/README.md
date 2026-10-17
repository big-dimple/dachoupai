# Boss 备战预告 · 独立模块

基线 `212e23d547d4fcfdd886f9dfe80699318e77a738`；开发分支 `dev/boss-preparation-entrance-20261017`。只新增 `BossPreparationPresentation.ts/.css`、专属单测和本说明。ShopScene、AudioEngine、共享 DetailDialog、章节数值、领域命令与存档均未修改；尚待 ShopScene owner 接入，不能把本模块交付写成线上功能已启用。

界面为真实 Boss 名和“压轴将至”，依次展示短限制、已锁定目标、完整规则和原 `response` 备战建议。一个“进入备战商店”主动作和“收起预告”；无伪造人物图、外部素材、剧情对白或音乐技术解释。纸墨、墨色题头与压轴印章使用专属 CSS；淡入 180ms、低动态关闭淡入，操作从挂载起即可用，没有动画等待。

## 最小接线契约

由 ShopScene owner 在有效 controller/saved run 检查完成、首个 `render()` 后、`resumeMakeCards()` 或其它弹窗前调用一次；不要放到每次 `render()` 中。原 `create()` 中立即 `setScene('boss')` 的行为需由该 owner 移到可见回调。

```ts
const status = presentBossPreparation(this.dialog, snapshot, {
  valid: () => this.scene.isActive() && this.lifecycle === life &&
    runController(this) === owner && owner.state === snapshot,
  onReveal: () => {
    this.audio.setScene('boss'); // 使用既有250ms渐变
    this.audio.sourceCue('boss'); // 可选，仅此次可见信号一次
  },
  onFinish: () => this.resumeMakeCards(),
});
```

- `shown`：已经挂载预告；先保持当前曲，只有 `onReveal` 开始 Boss 音乐渐变。
- `seen`：该完整身份的本 Boss 场次已可见过，允许直接保持或设为 Boss 音轨，不重复登场信号。
- `not-applicable`：不是已保存的压轴前商店，沿用普通商店路径。
- `deferred`：当前 owner 无效或已有模态；不切 Boss 曲、不记已见，由 owner 在模态结束后的合适时机重试。

`onReveal` 在已挂载、非后台、具有可见布局的动画帧执行一次，并再次核对 `valid`。后台恢复后才可发信号。`onFinish('prepare'|'dismissed')` 在共享弹窗的关闭与焦点恢复结束后的微任务执行，仍核对 `valid`；只恢复原店内展示流程，不发送 OpenShop/LeaveShop。场景 shutdown 继续使用既有 `dialog.close()`，会清掉帧和可见性监听。任何保存失败或候选尚未发布，都应保持在原保存流程，不从此模块绕过。

展示历史是可选的 `sessionStorage` UI 状态，独立键 `dachoupai.boss-preparation-seen.v1`，最多64项，存储不可用时回退当前模块内存。键包含 run/角色/内容版本与hash/模式/挑战/难度/节目单/巡演模式/场次/Boss参数；同一页返回、刷新和相同身份重试不重复，后续新 Boss 场次仍可登场。它不改变 checkpoint、RNG 或业务存档。

## 实际检查与待验

- `npm test -- --run tests/boss-preparation-presentation.test.ts tests/blind-select-presentation.test.ts tests/stage-identity.test.ts`：3文件49项 PASS，含本模块29项。覆盖16种原Boss定义、锁定目标、完整身份去重、损坏/拒绝存储、后台恢复、可见一次信号、立即继续、关闭取消、过期owner、清理后回调与音频不可用。
- `npm run build`：类型检查与生产构建 PASS，既有大 bundle 提示保留。新模块尚未被生产入口引用，构建通过不等于 Shop/audio 已整合。
- `git diff --check`：PASS。
- 本包没有新开本地浏览器、截图矩阵或自然长局；没有查 CI/域名、部署、main 推送或新增权限。

dot 待验：整合同一提交后，用已有正场结束/压轴前商店的合格存档进入；先出现 Boss 名/限制/目标/建议，音乐与可见登场同步渐变。立即继续、收起/Escape、返回/刷新同场均不重新发奖或反复登场；普通商店仍走普通曲。390/320竖屏及短横确认正文可滚、主/次操作可达，再听一次音量与渐变。界面实际观感、听感、ShopScene 接线和真机均为 NOT_RUN/PENDING；不签 P08 整体完成。
