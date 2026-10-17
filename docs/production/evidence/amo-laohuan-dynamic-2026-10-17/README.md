# 苏轼、辛弃疾必要动态复核

被测候选：`e2e64946f6fabe6fc0e8b369a6b3b52c5bda9d29`。独立分支 `dev/hero-dynamic-amo-laohuan-20261017`。**四格有界操作与保存核验通过；像素审查发现两处缺陷，当前不能签视觉通过。** 共享源码未改，留给父线程协调 owner。

环境：Windows、Node `v22.20.0`、Playwright Chromium `153.0.8010.12`；PC `1366×768 / DPR1 / 鼠标`，手机竖屏 `390×844 / DPR2 / 原生触摸事件模拟`，正常速度与正常动态。手机模拟不等于实体手机；音色、真实触感、设备性能和真人美术验收均 **NOT_RUN**。

只测苏轼和辛弃疾，其他四位不在本分工覆盖内，**不能以本轮两位结果签六英雄全部通过**。夹具明确植入公开手牌和牌堆分区，保持实际目标400、原模式/身份与规则；经正式菜单导入校验通过的 checkpoint，随后均由真实 GameScene 鼠标/触摸输入提交命令。不是自然获取率、长局或完整游戏验收。

## 已执行结果

| 英雄 / 视口 | 行为和保存检查 | 真实兑现 | 像素结果 |
| --- | --- | --- | --- |
| 苏轼 / 1366 | PASS | 热度75，倍率2→4，本手150→300 | 已看实际帧；来源 ×2 完整 |
| 苏轼 / 390 | PASS | 同上 | **FAIL：来源 ×2 在右侧裁切** |
| 辛弃疾 / 1366 | PASS | 留下A♦，场热仍0，未生成计分trace；随后普通对子78分 | **FAIL：眼神遮资源文字** |
| 辛弃疾 / 390 | PASS | 同上 | **FAIL：眼神遮牌型说明** |

苏轼覆盖空选、高牌主手不满足条件、两对主手可用、选助攻、取消、重新选择、双击出牌只保存一次、已用按钮不重演、下一次普通出牌不重复助攻。辛弃疾覆盖空选、可用、打开后取消保留选牌、真实弃牌、候选收起/重开不重抽、双击确认只保存一次、已用不重演、普通出牌不伪造角色计分。查看/取消的 state、journal、storage、localStorage 不变；每笔真实命令后完整保存与 canonical `applyCommand` 相等，演出结束后保存不变。四格均无 pageerror。

专用眼神均实际出现 `hero-eyes-amo / hero-eyes-laohuan`、`dedicated-eye-strip`，取完整768×288区域；已看两幅源WebP和四格strike像素，人物映射正确。映射正确不等于位置正确或用户美术批准。

## 逐帧与音效时间证据

全部时间为**各页面独立的 `performance.now()` 毫秒**，不能跨页作同一时钟比较。[timeline.csv](timeline.csv) 列出 charge / strike / release；[summary.json](summary.json) 为短机器结果。`observed/*.json.gz` 保留完整命令前后保存、逐帧值、眼神元数据、WebAudio调用及新排程voice时间。图片来自实际 `postrender`，没有暂停、替代场景或篡改播放速度。

| 场景 | 数值到达 / 音效调用 | 首个strike像素 | 说明 |
| --- | --- | --- | --- |
| 苏轼PC | 8919.4 / 8920.0 | 8935.9 | 同一已保存event，`multiply`调用一次，差0.6ms |
| 苏轼手机 | 11009.3 / 11009.9 | 11025.6 | 同上；`flight`在windup调用，未提前改倍率 |
| 辛弃疾PC | ChooseRefill后seq5；4580.0 strike | 4580.0 | 留牌阶段无scoreImpact、无character音；普通出牌才有实际计分音 |
| 辛弃疾手机 | ChooseRefill后seq5；5308.6 strike | 5308.6 | 同上 |

音频context均为running、23个样本已加载。苏轼乘法调用有实际新排程的 `scoreMultiply` voices，排程起止有效；已用/取消/资格不足没有假助攻音。辛弃疾确认留牌只有通用select/hover，弃牌有discard，眼神strike处没有独立留牌或character音。是否补一个保存成功后的非计分确认音由owner判断，不能把此处写成已有专属音效。以上只证明软件调用和排程，**听感与物理触感没有通过**。

## 两处精确复现与建议

1. **辛弃疾眼神仍走默认坐标。** 使用本夹具弃 `J♣` → 确认换牌1张 → 留候选 `A♦`。PC实际眼神框 `(16,168.96,208,78)`，遮目标/金币/剩余热度；手机框 `(16,185.68,208,78)`，遮牌型/操作说明。[PC strike](observed/laohuan-1366-1-strike.png)、[手机 strike](observed/laohuan-390-1-strike.png)。`GameScene.ts:1657` 的 `showLaohuanPayoff` 调用 `mountHeroClimax` 没传placement；`showKeyHighlight`与秦琼锁定路径已传安全槽。最小建议：同调用补 `{eyes:localHeroEyeSlot(this.view.layout,toolInventoryPlayedArea(this.view.layout),this.jokerViews.size)}`，沿用已有无槽降级，保留保存后触发和eventId去重。修后复核该两格，不改技能数值。
2. **苏轼手机来源 ×2 的实际栅格越界。** 两对 `2♠ 2♥ 3♣ 3♦` + 助攻 `4♠ 4♥` → 出牌，seq4、角色event6。[手机 strike](observed/amo-390-1-strike.png) 的 ×2 右侧被屏幕裁掉。该帧 `score/source-value` 名义位置 `(308,335)`、宽高39×34、scale1、resolution3，但实际像素显著更大，故只按getBounds的防碰撞未发现。`ScoreTableMotion.ts:31` 先以默认resolution创建Text，再由`prepareTextScale`改变resolution。根据本地Phaser Canvas渲染读`frame.source.resolution`、Text构造时设置该值而后置`setResolution`只更新style的代码，推断是纹理源密度滞后；**此因果尚未经修复后验证**。最小建议：在这一个来源Text构造样式内就设 `resolution:Math.ceil(textDensity(scene)*1.08)`，与现有peak一致，保留现有计分/音效及坐标逻辑；先比较同一手机像素，避免贸然全局修改TextRaster。PC来源也使用同构造点，可顺带查实际大小。[PC strike](observed/amo-1366-1-strike.png)。

两处公共修复均为 **pending owner**，没有执行或审批拒绝。辛弃疾非计分留牌是否补确认音也待owner判断。父线程需汇总其他四英雄证据并安排修后复核；本包不更新整体完成百分比。

## 复现与产物边界

```powershell
$env:HERO_DYNAMIC_OUT='shots/amo-laohuan-recheck'
node docs/production/evidence/amo-laohuan-dynamic-2026-10-17/observe.mjs
```

可用 `HERO_DYNAMIC_CASES=amo-1366,amo-390` 等精确选格。runner只包装观察原方法并原样调用，不调用私有操作来伪装点击。`summary.json`的视觉FAIL来自实际像素审查，runner的PASS只针对明确列出的行为断言。

前序观察器遇到未关闭说明弹层、以动画卡面代替固定输入命中区、以及预先猜测倍率的断言错误，均未当产品缺陷。最终改用真实输入槽、正常鼠标按下45ms与卡牌输入间隔140ms、读取保存trace核数；手机和辛弃疾已通过的格未为此反复重跑。原观察记录和截图保留在独立worktree的 `shots/amo-laohuan-observation-history/`，交付只留四格有效证据。极端快速逐张选牌未获通过声明；出牌/留牌双击已实际覆盖。

检查了所读公共场景、技能演出、音频和眼神manifest的SHA，均与开始相同；两张运行时眼神文件SHA与manifest相符。没有修改产品代码、main、资源清单或部署，也没有查CI。
