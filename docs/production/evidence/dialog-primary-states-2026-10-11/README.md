# 弹层主按钮状态：局部修复与受控证据

输入 main `9d0cd754150a8c9cb6ed3ddf38c50f543ed6bac3`，独立分支 `fix/dialog-primary-states`。用户 G10 原帧显示浅灰底白字，AX 合法、后续使用成功；该原帧没有 hover/computedStyle，**不判定原帧一定处于 hover**。下面是本工程的实际可复现条件。

## 复现与修复

PC1366×768 实际指针进入合法 S05 忘招确认按钮，等待240ms（原过渡120ms）后，`disabled=false`、`:hover=true`：背景 `#E2E8E5`、字 `#FFF9EE`，对比度由静止 `5.0086:1` 降至 `1.1851:1`。鼠标按住仍相同。合法候选、保存资格、资源都没有改变。原生禁用与保存中则是 `#D8D1C3/#595B59`，对比 `4.5109:1`，不能从浅灰白字截图倒推 disabled。

390×740 的实际 touchStart 在软件 Chromium 中未进入 `:active`，如实保留；释放后保存中的按钮真实 `:hover=true`，仍 disabled。普通 DetailDialog 主按钮实际 tap 后恢复可用却保留 `:hover=true`，原浅灰白字缺陷可复现。不是强制伪状态测试。

只新增 `src/style.css:245–246` 两条规则。没有 `data-shop-context` 的弹层主按钮，只有 `:not(:disabled)` 的 hover/active/focus-visible 保持既有深红 `#9F3228` 和象牙字 `#FFF9EE`（`6.7668:1`）；disabled 明确保持既有灰底深字/灰边框并取消按下位移。普通按钮、返回按钮、全局 hover、尺寸与布局不改。

已逐一核主按钮相关特例：商店 `data-shop-context` 当前专用颜色/disabled规则正常，主动排除，前后对应 background/color/border/borderStyle/outline/transform 逐值相等；阿默正文主按钮真实入口原 hover 同样浅灰白字，只获得同类状态修复，不改其专用 `.amo-assist-*` 区块；关卡身份 `.stage-identity-entry .dialog-primary:hover` 原来还覆盖 disabled，实际组件夹具中不可执行但呈深红白字，本次 disabled 更高权重恢复灰底深字，可用 hover 深红保持。普通/商店/关卡身份特例使用真实 DetailDialog 组件夹具，**不冒称走完其实际商店交易或关卡旅程**。

## 有界原生验证

[修前双端记录](before/report.json)、[修前390粘hover补充](before-touch/report.json)、[修后双端记录](after/report.json)、[冻结与范围检查](checks.json)。修后双端合计38个CSS状态采样，每次等待240ms后记录伪状态、AX禁用属性、busy、实际颜色/轮廓/边框/变换/宽高与整屏PNG。源码/index/HEAD在每次原生运行期间冻结，最终提交CSS字节与修后记录SHA256一致。记录是提交前工作源码检查，不用旧HEAD或旧CI冒签最终HEAD。

工程检查点通过正式 makeCheckpoint/readCheckpoint 校验，并通过真实菜单导入到独立新浏览器 context，非用户存档。S05 缺目标禁用、合法两牌型、键盘Shift+Tab焦点、PC真正hover/down/up、390真正触摸按住/释放、保存中重复点击、真实QuotaExceededError失败、预开旧确认保护、暂停重开禁用、真实菜单重试全部覆盖。缺目标/保存中/失败旧确认/暂停重开点击的完整state/journal/storage都不变；每端菜单重试仅持久化原 S05 命令一次，完整最终state与原领域oracle及IDB一致；双端最终state也逐值同修前基线。失败后原目标保留、busy清除；旧弹层当前ready快照的资格语义仍按原实现，不为CSS修改支付或阶段规则。

阿默用真实游戏入口打开正文、操作推荐副组，只有草稿变化，完整保存不变。普通/商店/关卡身份组件夹具分别覆盖可用/原生disabled、PC hover/键盘、390点击后粘hover，回调计数确认禁用原生输入零调用。所有对应按钮前后宽高逐值相等；只有禁用按住的1px位移被取消，不改实际按钮尺寸。

| 实际画面 | 修前 | 修后 |
|---|---|---|
| PC忘招可用hover | [浅灰白字](before/1366-legal-hover.png) | [深红象牙字](after/1366-legal-hover.png) |
| PC按住/键盘 | [按住](before/1366-legal-active.png) / [焦点](before/1366-legal-keyboard-focus.png) | [按住](after/1366-legal-active.png) / [焦点](after/1366-legal-keyboard-focus.png) |
| 390忘招可用/保存中 | [可用](before/390-legal-rest.png) / [保存中](before/390-saving.png) | [可用](after/390-legal-rest.png) / [保存中](after/390-saving.png) |
| 390普通按钮tap后 | [粘hover浅灰白字](before-touch/390-ordinary-touch-after-tap.png) | [粘hover深红象牙字](after/390-ordinary-touch-after-tap.png) |
| PC原生disabled | [忘招](before/1366-invalid-hover.png) / [关卡身份夹具](before/1366-stage-identity-disabled.png) | [忘招](after/1366-invalid-hover.png) / [关卡身份夹具](after/1366-stage-identity-disabled.png) |
| 同类核查 | [阿默](before/1366-amo-available.png) / [商店夹具](before/1366-shop-purchase-hover.png) | [阿默](after/1366-amo-available.png) / [商店夹具保持](after/1366-shop-purchase-hover.png) |

已实际读取上述关键前后PNG，图面通过仅签这些条件和现有纸墨色系，不签真人/真机/GPU/整体美术。Chrome触摸按住未出现CSS active；PC真实active已核，触屏粘hover通过真实tap后的保留状态核，不借PC hover替代。

## 失败、边界与交付

首次工程夹具错用 `highCard` 而非领域真实键 `high-card`，正式存档校验拒绝，见[原失败日志](failures/fixture-high-card-key.log)。纠正观察器夹具，没有改领域校验。首轮把390 touchStart必进入CSS active当作断言，实际active=false使观察器FAIL；[原报告](failures/touch-active-assumption-report.json.gz)、[原失败画面](failures/390-touch-active-assumption.png)保留。改为如实记录真实touch状态，PC仍严格要求active；原生禁用/重复提交/完整保存断言未放宽。

必要本地检查：该有界浏览器检查双端PASS、node --check PASS、diff-check PASS；没有重跑未变全套或本地build。domain/content/application/platform/audio/public/GameScene/阿默逻辑/C2/唯一DELIVERY_PLAN相对指定main无改，产品只有两条局部CSS，另有本检查harness与证据。独立draftPR/最终精确HEAD CI另核；不合main、不部署。未验物理触屏、其它引擎/设备、自然18格、所有商店交易或长期保存场景。

给计划拥有者的待登记短段：9d0cd75基线弹层主按钮状态候选完成；工程PC真正hover/down与390普通按钮tap后粘hover均复现浅灰白字1.19:1，修后非商店弹层可用交互状态深红象牙字6.77:1，禁用/保存中灰底深字且零重复写入。双端真实S05失败/原候选重试完整保存oracle通过，阿默实际正文与普通/商店/关卡身份特例核查通过，38状态采样与关键前后像素保留；只两条CSS，不改C2/逻辑/尺寸/唯一计划，draft及精确HEAD CI由最终交付登记，未合并部署。
