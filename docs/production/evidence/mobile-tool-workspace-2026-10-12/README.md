# 手机献纸选牌与随机现货 · 有限修复候选

基于已发布 main `b4b247f61f54e1a27d5143ece3ebf42829202b90`，产品与复用脚本提交 `0e11e150e63a7b6cb9fb97cdf2a27145ebd599f8`。本目录只保存必要整屏、紧凑报告和压缩完整存档证据。修前真实基线及原夹具失败仍见[旧证据提交](https://github.com/big-dimple/dachoupai/blob/89a96c432f32814bf6e17c2def8013a15d7303a5/docs/production/evidence/mobile-tool-workspace-2026-10-12/README.md)，不重复其附件传输或大量历史日志。

## 有限实现

- ConsumableDialog：标题、单行步骤、受益/牺牲身份固定显示；牺牲永久移除、不退款保持可见。完整收据/用途/销毁入口收纳，原销毁确认保留；增强覆盖、永久删除及其他使用成本仍在确认附近。选牌区优先，取消保留工具。
- MakeCardsDialog：默认购买，随机现货前置，手机横排完整显示名称、用途、实付价。与基础自选同名的真实现货只保留一个 BuyOffer 入口；售罄不会恢复成另一购买座位。库存和基础自选仍可达，买来使用/存着保持。
- 仅必要专属 CSS、相关行投影测试与 `harness/mobile-tool-workspace.mjs`。ShopScene、GameScene、领域/价格/评分/拖拽、并行结算、DELIVERY_PLAN 均未修改。

## 本机实际验证与完整像素

复用旧提交的合法当前身份夹具：30 金、已有 T08、实际生成 offer ID 的 S01（8 金），先按原 RerollShop 生成目录，再经 checkpoint 校验与正常菜单导入。每个尺寸均从真实商店入口购买献纸，保存后 22 金；K♠（热度纸+闪箔）独立牺牲，320 用 1 受益，其余用 8♥/9♣ 两受益。不是自然获得、用户存档或正式域名。

| CSS 视口 | 选牌区高度 | 购买首屏 | 选定后整屏 |
|---|---:|---|---|
| 320×640 | 408px（原 123px） | [现货](after/320x640-purchase-first-view.png) | [1 受益](after/320x640-sacrifice-selected.png) |
| 390×640 | 408px（原 198px） | [现货](after/390x640-purchase-first-view.png) | [2 受益](after/390x640-sacrifice-selected.png) |
| 412×740 | 508px | [现货](after/412x740-purchase-first-view.png) | [2 受益](after/412x740-sacrifice-selected.png) |
| 320×528 | 296px | [现货](after/320x528-purchase-first-view.png) | [短屏](after/320x528-sacrifice-selected.png) |
| 390×528 | 296px | [现货](after/390x528-purchase-first-view.png) | [短屏](after/390x528-sacrifice-selected.png) |
| 412×628 | 396px | [现货](after/412x628-purchase-first-view.png) | [短屏](after/412x628-sacrifice-selected.png) |
| PC1366×768 | 536px | [现货](after/1366x768-purchase-first-view.png) | [选牌/预览同屏](after/1366x768-sacrifice-selected.png) |

全部上述整屏已用 view_image 实际看过。390 随机现货由修前 y≈1336 改到 y≈207–322，首屏底 542；最短 320×528 现货完整落在 y≈207–342，首屏底 430。三种短高度从常规高度扣除 112px，为浏览器栏预留空间；这是软件视口覆盖，未冒称物理手机或真实浏览器栏实测。DPR1/系统 Chromium/低动态。

七行均实际购入、1–2 受益+独立牺牲、点数/花色整理与筛选、筛选外选择保留、选满后取消重选、预览返回保滚动、取消完整 state/journal/storage 不变。每次使用的完整 state/RNG/journal/原子 storage.current/previous 同原 applyCommand，一次支付、一次消费。390×640 另实际买来存着，只有购买没有使用；[增强覆盖提示](after/390x640-replacement-risk.png)明确失去热度纸/热+20→倍率纸/倍+2，取消仍零写。

390×528 实际注入 IndexedDB saves 事务 QuotaExceededError；错误出现，完整持久状态仍等于购后；原“重试保存”按钮只保存原候选一次，随机结果、牺牲与工具消耗同原命令。[失败整屏](after/390x528-save-failed.png)保留既有菜单滚动位置与重试入口，不代签菜单所有项同时可见。

[最短屏预览](after/320x528-preview.png)、[紧凑报告](report.json)、[压缩完整 state/journal/storage 与滚动观测](after/full-state-journal-storage.json.gz)。72 定向测试/8 文件、typecheck、build 通过；最终提交 CI 单独核验，不借旧绿 CI。

## 已保留失败与剩余边界

首版实际像素发现预览按钮压住步骤，[原失败图](failures/header-overlap.png)保持，已修标题行高度；受益筛选计数误含牺牲牌已按角色修正。另有折叠收据 innerText、公开目标顺序及菜单导入路径三项观察器错误，产品协议未变，原失败报告压缩在 [reports.json.gz](failures/reports.json.gz)。

本代理只看仓库基线和本机画面，未下载或看到用户原图；附件传输故障不重试，父负责原图最终对照。本候选不签真实设备/自然获取/正式域名/全游戏，draft PR 供父独审合并，不推进 main。
