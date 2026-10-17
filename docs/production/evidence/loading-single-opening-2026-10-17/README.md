# 单次开场与后续局部资源准备

独立分支 `fix/loading-single-opening-20261017`，基于 `e82c7df8d3e004cb9ad5a86b27389496d397b2ad`。本批只修加载基础层；被测产品源码 SHA-256 见 [report.json](report.json)，重放入口为 [harness/loading-single-opening.mjs](../../../../harness/loading-single-opening.mjs)。不修改共享计划。

## 根因与修复

静态定位：`main.ts` 只有一处 `new Phaser.Game`。原 `LoadingScreen` 缓存初始整屏 dialog 的克隆模板；进入首页后，`prepareDestination` 只要发现目标场景缺少纹理，就会再克隆同一整屏开场。`LoadingProgress` 还按经过的时间估算进度，即使没有新增解码也会前进。没有用户 15:01 当时的网络记录，本批不把静态定位写成该次会话的抓包结论。

- 仅 Boot 可认领最初 HTML 的 `#resource-loading`，移除开场模板缓存与克隆。该节点退出后不会重新生成。
- 后续场景仍有真实解码就绪门，缺资源时使用右下角 `#resource-preparation`；无品牌/山水/扇牌开场，没有整屏遮罩背景。原生 modal 保留焦点和输入阻挡，等待期间不能继续提交被遮挡的动作。
- 进度只平滑追随已解码数量，显示实际 `已就绪 / 总数`，取消按时间估算以及就绪后的额外 420ms 等待；只有恢复状态为 ready 才允许 100%。
- 首屏就绪门覆盖 8 项纸面资源和六人 12 项小图，共 20 项；修补 Phaser 初载纸面失败后仍可能进首页的问题。其余目录沿现有后台预载，不把 146 项目录、高清原画、眼神图或音乐放进首屏门。
- 自动重试、离线恢复、暂停/继续与取消沿用现有 ResourceRecovery。未调整规则、经济、存档、素材或音频。

## 实际检查

Windows / Node v22.20.0 / Chromium 153.0.8010.12；本机构建和浏览器输入，传输层受控延迟及 503。不是物理设备或玩家主观验收。

| 检查 | 结果与证据 |
| --- | --- |
| 5 文件定向单测 | PASS，32 项；loading-progress / scene-resources / resource-recovery / art-texture-loading / image-warmup-queue |
| TypeScript | PASS，`tsc --noEmit`，退出码 0 |
| e2e 构建 | PASS，harness 内 `vite.build`，退出码 0 |
| 1366×900 和 390×844 冷启动 | PASS；延迟一张必需人物小图，未就绪时不进首页、进度小于 100%；纸面首次 503 后自动成功 |
| 首页→选角→首店→牌桌 | PASS；每个文档整屏开场节点只出现 1 次，首店缺图只创建局部准备窗；实际 court 纹理解码完成才进入 |
| 局部等待 Escape→继续、503 恢复 | PASS；已解码缓存保留，按钮至少 44px，面板均在视口内 |
| 再次访问 / reload→首页→选角 | PASS；同一浏览器上下文，新的文档各开场一次，进入后没有第二个整屏开场，页面始终 1 canvas |
| 已保存牌局冷续局 | PASS；受控延迟苏轼眼神图，只显示局部等待；恢复后完整 run JSON 与刷新前完全相同，SHA-256 `2c6c05ca5510ae9cd80be28ad5d56ebc06c64c4a8803fe637a8b81fbbe8195b7` |
| 浏览器错误 / 未就绪 100% | PASS；三案例均无 pageerror，所有采样中的非 ready 进度均小于 1 |
| 差异与工作区检查 | PASS；`git diff --check`；仅本批源码、测试、harness、专属证据 |

实际截图已通过工具打开检查：[首次开场 390](390-opening.png)、[局部准备 390](390-local.png)、[局部准备 PC](pc-local.png)、[冷续局 PC](pc-restore-local.png)。PC 局部面板 380×178，390 局部面板 356×178；无开场装饰，普通切场保留当前页面。

## 范围与限制

没有改 ShopScene、GameScene、BlindSelect、TitleScene、RunMenu、共用鉴赏模块或音乐/音效。既有冷续局路由先停止场景，因此冷续局等待时是纸底加局部准备窗；牌桌在资源解码完成后绘制。普通选角切场等待保留当前选角画面。

没有 CI、部署、域名操作，没有 main 推送。物理设备、用户原始 15:01 会话复核、主观等待感受和最终整体验收为 NOT_RUN；这批软件证据不解锁 P08 或正式门。
