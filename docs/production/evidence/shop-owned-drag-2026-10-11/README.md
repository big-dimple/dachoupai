# 商店已持大丑牌直接拖拽：有限操作证据

优先级：批次一/W1/W2必要组件/W3，用户即时操作返修；与道具滚动独立开发，父串行集成。原商店已经有隐形拖拽入口，缺少拖起、插入与落下反馈；本项不是新增规则。唯一执行入口仍为 DELIVERY_PLAN 当前段。

## 版本与范围

- 基线：`41d0990bf94698110446d0e4caeebd54d327a972`，独立只读 worktree；before/report.json 绑定其 src 树且无修改。
- 产品：`698832e`；正常合入父发布 main `44a140ec3361e4aa9e06d8bf7705344a4c2e419b`，保 PR115 全部倍率显示和计划；初验11688e4的提起图实际视觉FAIL后，以1dbc766补纸影、5484d26留4px提示间隔；缩窗竞态0d922b8与主指针恢复7ca642e补正后，最终冻结验收源码 `3cfd32c8a3bc024bd84661db52b90ab9ec976974`，src 树 `10aad2d6088e088d822d52bcb688bbc3d58cc1af`，after/report.json 记录源码无修改。
- 仅 ShopScene、独立 OwnedJokerInput、JokerReorder 落点适配、定向测试/harness、本文证据与[父同步草案](plan-handoff.md)；按父最新指令，DELIVERY_PLAN 当前段由道具滚动包统一更新，本包不写。SceneView、牌桌、道具选择/预览/结果组件、style.css、领域/内容/概率/随机/数值/价格/保存格式/美术音频均同 44a140e；没有 PR113 拣入。
- Chromium 软件 Canvas，PC1366×768、手机390×740与390×844、320×568；普通动态模式，PC真实 mouse、手机真实 CDP touch＋原生 DOM/文件导入。受控当前 basic-suit-choice 身份、第二场商店五张持牌，不代表自然取得、18组合、真人审美或物理设备触感。

## 画面与操作

| 尺寸 | 原持牌区 | 原拖动中 | 新提示 | 新拖动中 | 落下保存 |
|---|---|---|---|---|---|
| PC1366×768 | [before](before/1366x768-idle.png) | [原位无预览](before/1366x768-dragging.png) | [持牌区短提示](after/1366x768-idle.png) | [提起/让位/插入线](after/1366x768-dragging.png) | [新位置与已保存](after/1366x768-dropped.png) |
| 390×740 | [before](before/390x740-idle.png) | [原位无预览](before/390x740-dragging.png) | [长按拖动换位](after/390x740-idle.png) | [真实横向换位](after/390x740-dragging.png) | [顺序已保存](after/390x740-dropped.png) |
| 390×844 | [before](before/390x844-idle.png) | [原位无预览](before/390x844-dragging.png) | [新提示](after/390x844-idle.png) | [真实横向换位](after/390x844-dragging.png) | [落下](after/390x844-dropped.png) |
| 320×568 | [before](before/320x568-idle.png) | [原位无预览](before/320x568-dragging.png) | [新提示](after/320x568-idle.png) | [真实横向换位](after/320x568-dragging.png) | [落下](after/320x568-dropped.png) |

手机长按约350毫秒即提起，有[390×740提起图](after/390x740-lifted.png)，横移才换位；轻触仍查看。复用牌桌 PointerIntent 与原生 pan-y 表层模式，让浏览器处理纵向 pan/cancel；持牌始终为原实例，其他原卡即时让位，纸墨插入线标出最终位置。移出持牌区变淡并提示松手取消，落下才执行原 ReorderJokers，原选择音＋“顺序已保存”反馈保留。未购商品没有进入输入表层。左/右移仍为详情层可访问备用；原短横屏收起持牌管理布局保持，本次没有重画短横屏库存。

本人实际查看主 PC/手机/320 原尺寸 PNG：PC/390提示在持牌区附近，320紧凑版复用上方概览栏可见提示；卡名/原画/插入线可见，拖起与其余牌让位有区别，落下新顺序与底部保存反馈可见。该软件像素检查不等于父独立审美或用户设备签收。

## 保存、取消与时序

[基线记录](before/report.json)中三个手机尺寸的“持牌区外释放”确实多提交一笔；PC原代码已检查 y，保留其 PASS。修复后四尺寸全部无此提交。

[最终操作记录](after/report.json)与各阶段完整 state/journal/localStorage 的[压缩原始证据](after/full-state-journal-storage.json.gz)保留：

- 提起与拖动中完整保存不变；首牌移至第四槽后，完整 state 与真实 applyCommand 完全相等，journal 精确增加一个同 action/expectedSeq 的命令，seq 仅加1。
- 同槽、越界释放、普通提前纵滑、仅长按后释放、原生 touchCancel、Escape、blur、受控 hidden、多指、实际 pointer capture 释放、resize、受控丢失释放后主指针恢复、菜单模态中断均保完整保存且不打开详情、不丢牌；多指/hidden 属受控信号，不冒称物理后台。
- 纸间隙按最近最终槽位插入，支持向前/向后；纯落点测试覆盖空槽、纵向越界、未知与非有限坐标。原保存测试覆盖失败保旧顺序、retry只一次、stale及非法排列无写入、重复回执不二次提交。
- 普通轻触只开详情；左右备用仍能提交保存；未购商品划动无购买、出售或换位；协议时序跨过原长按阈值时商品仍可查看，原行为保持，取消不变保存。刷新恢复完整 state 与 journal。

真实计分先核源码：scoreR2 的每个 hook 按实例数组顺序执行，本槽 hook 与本槽版次原顺序保持；B13 jokerScore 原逆序例外保留。ReorderJokers 原本只合法于 shop/await-input，骰爷下一手锁仍由原命令拒绝，本项只在 ready 商店接操作。

[操作时序对照](order-audit.json)：相同真实手牌/RNG、二响、当前身份、第一手同一实际牌；商店用原命令将“开门见喜 f03 加2M→不换词 f09 ×1.5”换为相反顺序，实际结算 **108→84**，事件完整保留。此受控领域核算证明槽序会改变现有计分，不是自然试玩或平衡验收；未改任何公式。可运行 `node harness/shop-owned-order-audit.mjs` 重核。

## 验证与原失败

初验虽原生断言绿，实际[原提起图](initial-visual-FAIL/390x740-lifted.png)中的上移牌遮住提示，明确视觉拒收。1dbc766删除上移、保轻放大并加原卡纸影，5484d26补4px纸间距；[原审记录](initial-visual-FAIL/visual-review.json)保留，最终重核四尺寸全套原生操作，不能以初验绿替代像素验收。

`npm exec vitest run tests/joker-reorder.test.ts tests/pointer-release-time.test.ts tests/shop-layout.test.ts tests/r2-run.test.ts tests/score-text.test.ts tests/readable-multiplier-source.test.ts`：134通过；`npm run typecheck`通过。`node harness/shop-owned-drag.mjs`：四尺寸原生输入全部 PASS；基线通过隔离 worktree/DRAG_ROOT 重跑。

[原观察器失败](original-observer-failures.json)及六份原始 gzip 保留，没有借重试抹除：首次夹具误放首店违反 opening-save 合同（未运行浏览器）；随后观察器将PC短点击误称长按、未释放合成第二指、并在活 dev 服务修改源码导致热重载、只尝试释放0–9而实际touch pointerId更大、把商品原长按查看错误列为“禁止详情”。后轮原生协议时序也可跨过原商品长按阈值，额外禁止其原查看的断言已移除并保全保存相等，持牌拖拽禁止详情的断言全部保持。分别修正真实等待/完整指针结束/冻结源码/实际捕获ID/商品原查看合同；没有放宽保存相等或取消断言。上述观察器失败不误写为产品失败。产品已证实的原手机越界提交 FAIL 保留于 before；最终轮另有真实[PC缩窗立即释放竞态 FAIL](product-resize-FAIL/report.json)：5484d26时浏览器已变但Phaser尚未重绘，误提交一笔。0d922b8直接响应window resize并核按下/释放的视口尺寸，原断言不放宽，四尺寸重核通过；7ca642e另在主指针恢复前先取消旧预览，并补受控信号断言，不冒称实机丢失释放。

最终 draft PR、精确 HEAD CI 与父独审结论由 PR/交接读取；工程绿不签整体体验，父唯一串行合 main，本代理未合并或部署。
