# 公共演出窄修与状态小字接线 · 2026-10-17

基线 `af9b0473d78823b06ae54ffe6bc58906803e329b`，原复现证据为 `c1977284ef133045506ef2e2df3274127c2bf47d` 的 [两英雄审查](https://github.com/big-dimple/dachoupai/blob/c1977284ef133045506ef2e2df3274127c2bf47d/docs/production/evidence/amo-laohuan-dynamic-2026-10-17/README.md)。正常 merge 纳入状态小字模块 `efb066319c6fea3ce5579b9f06692d72f91d0db5`，合并提交 `def4722da3bf05402d7097e10a101c92f9c9bee8`。只交 dev 候选，不是 main 或六英雄总验收。

## 产品修改

- 辛弃疾真实 ChooseRefill 保存后兑现，给 `mountHeroClimax` 传入既有 `localHeroEyeSlot`。无空槽或纹理时只响应已有头像和已保存状态，不再创建居中说明面板。
- 苏轼手机来源“×2”：`ScoreTableMotion` 在 Text 构造时就分配 `ceil(textDensity*1.08)` 密度。保留原字号、逻辑尺寸、坐标、防碰撞和计分时间线；初始化的采样除数与后来相同样式保持一致，避免高清位图被放大。
- 辛弃疾保存后眼神 strike 同步调用一次已有 `sourceCue('character')`。保留原收据 eventId 去重和 abort 检查；取消、查看、资格不足、重复确认、已用再点及后续普通出牌不会追加留牌音。没有伪造计分事件或调用乘倍率/得分音，也没有新音频素材。
- 按 efb 提供的 owner patch，GameScene 仅增加 import，把原 `getData('skillStatus')` 的 setText/setColor 改为 `updateHeroSkillStatusText`。af9 的真实已用状态、11px 字号、位置和颜色语义保留。独立 `HeroSkillStatusText.ts` 原样合入，未修改 gallery owner 的模块。

## 实际回归

复用 c197 的同一公开手牌、牌堆分区、正式菜单 checkpoint 导入和原生鼠标/触摸操作。观察器只包装并原样调用原音频/累加方法，不替换演出、不暂停、不改速。每笔真实命令后的 state、journal、storage 均与 canonical applyCommand 全等，演出后保存不变，所有 case 0 pageerror。

| 源码阶段 / 格 | 实际结果 |
| --- | --- |
| 两处修复后、状态小字接线前 / 苏轼1366×768 DPR1 | PASS；热75、倍率2→4、总分150→300，来源×2完整。来源样式/实际采样密度2/2，逻辑39×34，纹理78×68。 |
| 同阶段 / 苏轼390×844 DPR2 | PASS；同一已保存角色事件。来源×2的样式/采样密度3/3，逻辑39×34，纹理117×102，实际像素完整，没有右侧裁切。 |
| 同阶段 / 辛弃疾1366×768 DPR1 | PASS；眼神改在(20,270,208,78)，避开目标/金币/剩余热度；留A♦、阶段热度仍0且无计分trace。一次真实角色音，首strike像素晚17.3ms。 |
| 同阶段 / 辛弃疾390×844 DPR2 | PASS；眼神改在(109.67,305.6,170.67,64)，避开牌型说明；同一保存合同。一声角色音，首strike像素晚16.7ms。 |
| efb正式接入后的最终源码 / 辛弃疾390×740 DPR3 | PASS；只补此最终接线格。眼神(131,291.6,128,48)，不遮文字；一次角色音，首strike像素晚23ms。实际GameScene可用/待完成/已用和后续普通出牌均保持11px、样式3、采样3。状态纹理按真实文字为165×39、99×39、66×39。 |

声音有真实新排程 voices，且声画 eventId 相同；以上只证明软件调用/排程时点，不签听感或实体触感。最终接线格使用真正磁盘上的 GameScene 调用模块，未使用 gallery 原证据的接线预演包装。此前 owner 已验的 DPR1/2/2.625/3 像素与22项测试保留在 `../hero-skill-status-density-2026-10-17/`，未机械重跑其全矩阵。

已实际查看本包五张 strike 像素；最终 DPR3 另保 charge/strike/release 三连帧。压缩原始报告包含前后保存、逐帧眼神边界/受保护文字、来源位图和排程音频。所有时间都是各页面独立 performance.now()，不跨页面相减。见 `summary.json` 和 `observed/`。两个阶段由真实源码哈希区分；前四格不冒称为 efb 接线后重录。最终源文件原字节 SHA-256 在 summary.finalSourceHashes，检查运行期间源码未变化。

最终9个相关测试文件72项通过，`npm run build` 通过（含 tsc --noEmit）；见 `checks.txt`。测试只补齐既有场景假Text所需的纹理/密度接口，并在六人技能入口单测中断言实际接线的3/3密度，原玩法/存档断言保留。此前两处修复后的38项与构建也通过，没有重跑完整六英雄运行矩阵、自然长局或CI。

本轮没有更改 AudioEngine、全局 TextRaster、ScoreTableReadouts、技能规则/数值、存档、原图或资产清单。限定的是来源×2与状态小字的采样修复，不能据此签全部计分数字的DPR表现；复核图中原有热度数字在峰值时仍略超计分框下缘，交整合 owner 判断后续窄修。其它四英雄仍由对应 owner 复核，未验实体手机/Safari/用户主观音画。Library 跨范围物化拒绝没有重试。

复现最终接线格：

```powershell
$env:HERO_DYNAMIC_OUT='shots/amo-laohuan-public-fix-integrated'
$env:HERO_DYNAMIC_CASES='laohuan-390'
$env:HERO_DYNAMIC_HEIGHT='740'
$env:HERO_DYNAMIC_DPR='3'
node docs/production/evidence/amo-laohuan-public-fix-2026-10-17/observe.mjs
```

原四格使用 HERO_DYNAMIC_CASES=amo-1366,amo-390,laohuan-1366,laohuan-390，默认手机844/DPR2；复用夹具未变。
