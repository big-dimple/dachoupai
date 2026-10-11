# 道具选牌滚动与焦点：有限原生验收

本项是用户反馈“指定扑克选一张就跳走，须再往下拖”的独立最小修复，不并入PR113，不承担dot的18组合自然试玩，不合main。与商店拖拽包不共享产品文件。

## 源码与复现

- 初始main：`41d0990`；原始对照见 [before/report.json](before/report.json)。目标组件blob `5c3637e5f64449c1de38152a0e70c8b880efada9`，与父合PR115后的main `44a140ec3361e4aa9e06d8bf7705344a4c2e419b` 相同。
- 正常快进同步PR115后实施：首修提交 `5972724ddb50f4d8b0ee0ee1d5675a6a7b2686a7`，blob `99c9c5816d99acd9c0a970817bbcf3b75e9c60c0`。底部取消满选出现30px滚动范围收缩后，必要补正产品提交 `e875770083a4c7cd9b46a96a69456a1d513491fc`，最终组件blob `0759384753976407bc938dee6aaa48c44970599b`。最终选择报告开始于5972724工作树并记录最终blob，最终保存报告开始于e875770；运行期间产品内容未变，可与最终HEAD逐字节核对。
- 原因：`refresh()` 每次选择都调用目录更新，`grid.append(...全部卡节点)` 暂时移走包含焦点的控件，浏览器丢失输入焦点并重新定位滚动锚点。原生手机多选首次 `scrollTop 886→599`，PC对应内容 `429→205`；取消/选满交换及单选切换也发生位移。每次都移出52个卡节点，焦点落到BODY。
- 修复仅在 `ConsumableDialog.ts`：普通选择/取消/换牺牲对象保持原节点与当前位置；初次排列和用户主动点数/花色整理才重新排序。合法状态、筛选、选择上限、前后预览与确认照常更新；牺牲/受益资格立即更新但不会自动挪走卡片，主动整理仍按当前资格优先。持续显示已选数量/满选提示，避免满选和取消缩放目标区域；单选满选说明直接选择另一张。没有增加全局滚动锁或强制滚回选中卡。

## 实际画面

下列图均为软件Chromium实际原生触控/鼠标输入后的完整画面，已逐张查看所列关键图，不以bounds或单测代替像素审查。

| 情形 | 修复前 | 修复后 |
|---|---|---|
| 手机390第一张 | [选择前](before/390-T08-select-before.png) / [选择后跳走](before/390-T08-select-after.png) | [选择前](after/390-T08-select-before.png) / [选择后留在6点附近](after/390-T08-select-after.png) |
| 手机满选与交换 | [满选跳走](before/390-T08-full-after.png) / [换目标跳走](before/390-T08-replace-after.png) | [满选与清晰提示/确认](after/390-T08-full-after.png) / [换目标](after/390-T08-replace-after.png) |
| PC1366第一张 | [选择前](before/1366-T08-select-before.png) / [选择后跳走](before/1366-T08-select-after.png) | [选择前](after/1366-T08-select-before.png) / [选择后](after/1366-T08-select-after.png) |
| 手机牺牲牌切换 | — | [换牺牲前](after/390-S01-donor-switch-before.png) / [换牺牲后](after/390-S01-donor-switch-after.png) |
| 两目标真实保存 | — | [手机商店保存后](save-final/390-shop-saved.png) / [手机牌桌保存后](save-final/390-game-saved.png) / [PC商店保存后](save-final/1366-shop-saved.png) / [PC牌桌保存后](save-final/1366-game-saved.png) |

## 验收命令与结果

定向原生选择命令：

```bash
TARGET_SCROLL_BEFORE=1 TARGET_SCROLL_OUT=docs/production/evidence/tool-target-scroll-2026-10-11/before node harness/tool-target-scroll.mjs
TARGET_SCROLL_OUT=docs/production/evidence/tool-target-scroll-2026-10-11/after node harness/tool-target-scroll.mjs
TARGET_SCROLL_SAVE_OUT=docs/production/evidence/tool-target-scroll-2026-10-11/save-final node harness/tool-target-scroll-save.mjs
```

- [after/report.json](after/report.json)：12/12场景、56次目标操作PASS；T08升点/T02删除/S03单选复制/S01牺牲扑克/S02扑克与大丑牌切换/S07牺牲大丑牌，390×740和1366×768；记录每次前后滚动值、焦点、节点移除数、确认按钮实际边界。覆盖取消一张后换目标、键盘空格、隐藏已选筛选、主动整理、工作面切换、取消/切道具/重新打开从空选复位。
- [save-final/report.json](save-final/report.json)：4/4 PASS；商店与牌桌各两端，取消/重新打开不改变完整state/journal/storage；确认原子命令与保存tuple逐字段核对，冷刷新读取完全一致。
- `npm run typecheck`：exit 0，见[typecheck.txt](checks/typecheck.txt)；`npx vitest run tests/tool-target-directory.test.ts tests/tool-change-preview.test.ts tests/saved-tool-result.test.ts tests/c01-tools.test.ts tests/c01-enhancement-tools.test.ts`：5文件、88测试通过，见[targeted.txt](checks/targeted.txt)。最终必要补正后重测；没有借用旧CI。
- `npm run build`：exit 0，原有大块提示见 [build-final.txt](checks/build-final.txt)；唯一计划校验 [plan.txt](checks/plan.txt)：32包/P08通过。
- `src/domain`、`src/content`、`src/application`、`src/audio`、`public`、`art`、`ShopScene.ts`、`GameScene.ts`、`style.css` 与main44a140e逐树/文件相同。PR115倍率产品与其计划增量全部保留。

最终小结及源码blob核对见[summary.json](checks/summary.json)。

## 原失败、权限与边界

[scroll-limit-failure/report.json](scroll-limit-failure/report.json) 保留首修的真实PC底部边界失败：主动整理后取消满选，提示行隐藏使可滚范围减少30px，目标内容scrollTop `581→551`，焦点仍在原卡。此证据是产品失败，不解释为观察器错误；最终持续数量提示修复后按原严格相等断言再验，没有放宽容差。首修四条真实保存虽已PASS，仍保留于[save/report.json](save/report.json)，最终重新验收见save-final，不能借旧结果代签新产品。

[fixture-failure/report.json](fixture-failure/report.json) 保留首轮扩展夹具的 `unknown-save-joker`：错误使用不存在的b01，尚未进入该S07场景。`FAIL.png` 是拒绝导入时前一个S02画面，不能当S07产品失败图。修正为当前真实卡表ID及其正式growth初值，没有放宽存档校验或更改产品。

用户反馈图 `libfile_c96dfbc38510819188a77b5ae4e9a5dd` 经当前Library技能解析为16193.jpg，支持的传输助手返回 `download failed`，未得到可查看字节；未换URL/路径或猜测图内容。所有本项画面来自文字反馈的实际复现。读取PR113的原动作 `gh pr view 113 --json number,headRefName,headRefOid,baseRefName,state` 返回GitHub GraphQL `Forbidden`；未换接口重读该PR，未交叉拣入。

远端分支、draft PR及精确最终HEAD CI结果以最终交付回复和对应GitHub精确SHA为准，不能借main或早先CI宣称完成。父独立像素/操作审查、用户物理手机/PC体验尚未签收；没有跑18组合自然局、自然道具供给率、真实触摸设备或主观听感。本证据仅签所列软件浏览器目标连续选择/取消/确认和保存恢复范围。
