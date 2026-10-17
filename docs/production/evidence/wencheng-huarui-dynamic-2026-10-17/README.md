# 文成公主 / 花蕊夫人实际 GameScene 动态检查

候选版本：`e2e64946f6fabe6fc0e8b369a6b3b52c5bda9d29`。独立分支：`verify/wencheng-huarui-dynamic-20261017`。只增加测试和证据，`src/`、`public/` 未改；不合 main，不查 CI，不部署。

**结果：功能检查四例 PASS；手机 Canvas 视觉检查 FAIL，待公共计分 owner 修复。** [assessment.json](assessment.json) 是本次总判定，不能把 [final/report.json](final/report.json) 的功能 PASS 写成视觉或整体验收通过。

## 已执行范围

Windows 本机 Chromium `153.0.8010.12`，DPR 1；PC `1366×768` 鼠标和模拟竖屏 `390×844` 触控。运行同一份候选 e2e 构建，真实导入、选牌、打开技能、选择、取消、出牌、回看；观察器不直接调用技能或演出私有方法。Canvas 是本机软件图形路径，不能推广成实体手机结果。

固定种子 `group-natural-17`，当前完整身份，standard/difficulty 0、programs 关闭。通过受控合法首场清关命令进入目标 600 的第二场；为限定测试长度安排手牌/抽牌堆，花蕊金币显式设为 35 或 9。导入 checkpoint 经过 `readCheckpoint` 校验。**这是受控状态导入测试，不是自然获取、平衡或完整长局证明。**

| 案例 | 功能 | POST_RENDER 帧 | 本次角色实际效果 |
|---|---|---:|---|
| 文成 PC | PASS | 1819 | 1 层 ×1.5，M 2→3，H 79、得分 237；同场重新蓄势后 H 95、得分 285 |
| 文成模拟竖屏 | PASS | 1830 | 同上；眼神来源倍率与累计得分存在下述 Canvas 裁切 |
| 花蕊 PC | PASS | 1403 | 选择付 20 金 ×3，提交后金币 35→15，M 2→6，H 79、得分 474 |
| 花蕊模拟竖屏 | PASS | 1436 | 同上；本例截图倍率 ×3 完整，不代表所有 Canvas 文字尺寸正确 |

每次实际出牌均与 `applyCommand` 的结果逐字段比较，journal 只增加一次，保存槽等于该状态的 checkpoint。PC 双击出牌仍只提交一次。Escape、技能草稿选择、显式取消均保持完整 state、journal 和保存槽。

- 文成：空充能不可释放；释放清空充能；正常两对重新充能后，同场第二次释放产生另一个真实 eventId。
- 花蕊：选择未扣金，出牌提交才扣 20 金；本场已用时快捷入口禁用、支付项禁用，下一手正常出牌不再次支付；9 金不可付 10 金，不合格手牌正常出牌没有角色得分事件。
- 取消、只读回看、正常蓄势、已用、不可用路径没有新增角色眼神事件，也没有误发上述角色 eventId 的得分 impact。

## 眼神与软件音效时序

从真实 manifest 获取专属 WebP，校验编码 SHA-256，再比较解码 RGBA SHA-256 与运行时纹理；不是依赖已撤销的 `blob:` URL 名称判断。两人运行时完整采样 `768×288`，各自 `hero-eyes-azao` / `hero-eyes-xiemu`，assetId 为自身 `.eyes`，camera=`dedicated-eye-strip`，没有串图。

| 角色 | WebP SHA-256 | 运行时解码像素 SHA-256 |
|---|---|---|
| 文成 | `f6d4675e5bc3787d3e9f2f0c54be6fe4c93c46d14bdf2dca27c7ae165d850a7a` | `5405b1cf74c0987b8131fc7b1c86f738921e9f089b7ae08dfdc26811d75db87c` |
| 花蕊 | `8b93601ca4cc0d4523da0be7f650f3dad987a76d562584f03e12148ecbe4009b` | `849a67d2733a57bfa3b83256b7d828c3f28ce94fd8cb00fdce4f16776e76e517` |

六次角色兑现均看到同一 eventId 的来源、真实倍率前值/后值与正确眼神同时出现。采样在 Phaser `POST_RENDER`，即 `renderer.postRender()` 后。眼神观测可见区间为 882.0–899.9ms。每次角色事件有一个 flight 调用和一个 multiply impact 调用；multiply impact 比首个 strike 渲染采样早 13.9–17.4ms。AudioContext 为 running、23 个样本已加载。此处仅证明软件调用与时序，**未做真人听感、物理振动或设备验收**。

原始帧、音效调用、时间标记在 `final/*-frames.json.gz`，每次兑现截图及技能面板也在 [final/](final/)。事件、倍率分数、有无误发与眼神映射见 [report.json](final/report.json)。

## 复现缺陷：Canvas 文字纹理分辨率与布局不一致

在本候选软件 Canvas 路径（renderer type 1），`TextRaster.crispText` 将 `Text.style.resolution` 改为 2，但 `frame.source.resolution` 仍为 1。Phaser 3.90.0 的 Canvas `batchSprite` 用后者除纹理尺寸，实际绘制文字为逻辑尺寸两倍。`getBounds()` 仍返回逻辑尺寸，因此仅以包围盒判定会漏报。WebGL 使用 style.resolution，不能用本结果断言 WebGL 同样失败。

最小复现：

1. 保持上述候选版本、Canvas fallback、`390×844` / DPR 1；使用 `harness/fixtures/wencheng-huarui-dynamic.ts` 的文成 checkpoint，已有 1 层。
2. 实际选 `spades-3 / hearts-3 / clubs-4 / diamonds-4`，点“和亲”→“本手释放 ×1.5”→出牌。
3. 来源节点 `score/source-value` 的 `×1.5` 逻辑范围 x=288..352（64px），但纹理宽 128、source resolution 1，实际绘制 x=288..416，超出右边 26px。连续 36 个渲染采样，跨度 582.1ms，包含 charge 与 strike。末位 5 被裁。
4. `score/total` 也受影响，例如 130 逻辑 x=264..333、实际 x=264..402；本手采到 243 个越界样本，最右到 x=455.93。该帧文字被右边界截断。

原图：[来源倍率裁切](mobile-readout-probe/source-value-overflow.png)、[累计得分裁切](mobile-readout-probe/number-overflow.png)。精确 frame、分辨率、实际绘制范围与结果：[summary.json](mobile-readout-probe/summary.json)、[frames.json.gz](mobile-readout-probe/frames.json.gz)。实际 POST_RENDER 截图与按 Canvas 绘制公式计算的范围一致。

**给 owner 的最小修复建议：** 在公共 `src/game/TextRaster.ts` 统一文本位图分辨率与 `frame.source.resolution`，或在创建文本时一次性确定一致的 resolution；先纠正 Canvas 绘制尺寸再复查来源落点和脉冲边界。不要仅缩小手机字体或凭逻辑 `getBounds()` 改来源位置。补一个 Canvas fallback 的可见像素/纹理尺寸回归，重验本复现；本分支按任务边界不修改该公共代码。

运行复现：先 `node harness/wencheng-huarui-dynamic.mjs` 构建并检查四例，然后 `node harness/wencheng-mobile-readout-probe.mjs`。本机需要 `PLAYWRIGHT_BROWSERS_PATH=C:/Users/wanghongping/AppData/Local/ms-playwright`。probe 预期退出 1 并报告上述缺陷；它仅支持 Canvas、camera zoom 1，其他渲染路径会拒绝据此下结论。

## 保留的测试修正与未执行项

- [initial-check/](initial-check/) 原始 FAIL：受控抽牌堆按错误方向安排（实际 `pop()`）；已用技能入口先打开说明、需再点“查看本场技能操作”。均修正测试，不算产品缺陷。
- [blob-url-check/](blob-url-check/) 原始 FAIL：测试误以已撤销的 blob URL 校验资源路径；改成真实字节/像素 SHA，不算产品缺陷。
- [poststep-check/](poststep-check/) 是旧采样报告；POST_STEP 在 render 前，toDataURL 会取上一帧。最终四例已改成 POST_RENDER。旧报告不是最终像素证据。
- [mobile-readout-probe/logical-only/](mobile-readout-probe/logical-only/) 保留仅检查逻辑包围盒时的初次 PASS；它没有检查实际 Canvas 绘制宽度，已被最终 FAIL 取代，不能用于签收。

未执行其他四英雄、文成 2/3 层或花蕊 10/30 金兑现、其他难度/模式、自然获取、长局、实体手机/横屏/听感/振动或人工美术身份理解。本次不能代替六人完整覆盖或 P08 整体完成。没有进行 main 合并、CI、部署、域名或资源改动。无权限阻塞；剩余问题是已复现公共 Canvas 文字缺陷，等待 owner 修复后重验。
