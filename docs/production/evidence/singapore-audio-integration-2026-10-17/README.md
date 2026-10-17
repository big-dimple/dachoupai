# 新加坡批次音频接续整合（部分范围）

在独立 `dev/singapore-integration-20261017` 上继续整合。入口main只读核对仍为 `7d7921e76ca794a14e715e3eac3b4d66143862ff`；前一整合头 `64c87deaae5864fed85eff2f3c91b1ea4ed3a031`，音频来源 `934871198c8c737cba5aef3b5d8726138be341e5`，产品 `5a02e647d9d7b5e7ebbff23897822aadc8b7199d`（含生命周期父提交9440bf4c）。普通merge得到本阶段被测候选 `04efe4dae5834c85e2d57da934c86ea01e0e3ac7`，无冲突，未push main、查CI或管理部署。

## 独立证据与来源核对

已读[作者README](../audio-lifecycle-regression-2026-10-17/README.md)、[audit](../audio-lifecycle-regression-2026-10-17/audit.json)和前后原始日志，查看[触控原生重开截图](../audio-lifecycle-regression-2026-10-17/after-native-restart-390.png)。作者117项/8浏览器案及build按其实际范围保留，不在本阶段整套重跑。

作者浏览器执行时HEAD仍是9440bf4c，最终产品尚未提交；audit明确按源码SHA-256绑定最终产品。整合后7个报告源码（AudioEngine/mixPolicy及未改场景、入口和浏览器脚本）全部与报告哈希相同。音频来源与前期docs/去金鱼/卡图的变更文件交集为空；没有手工覆盖公共场景。详见[source-crosscheck.json](source-crosscheck.json)。

两个流式媒体槽、250ms交接、自然轮换、有限超时/错误恢复、旧回调失效、保存trace驱动逐卡速率均来自该精确音频产品。GameScene/ShopScene未由该来源修改，后续推荐/流程SHA接线变化仍需实际交叉。原版无故障普通重开也能播放，不能声称无条件复现用户设备失声；慢首曲/真实请求abort/快切竞态的原FAIL保留。未试听。

## 必须区分的旧断言与新合同

来源分支自身修改了 `tests/score-recorded-audio.test.ts` 旧第三档期望：`.82*1.075` → `.82*1.35`，并增加八档层速率与真实scoreR2Hand→numberImpact→scoreImpact主路径覆盖。**整合者没有再修改断言，但不能把来源中的这项改动说成“原断言不变却消失”。**

为核实区别，把7d7921原文件逐字节复制为临时测试，只运行原ordinary hits用例，结束删除临时文件，没有提交另一份测试或调整断言。[original-assertion-FAIL.log](original-assertion-FAIL.log)真实仍是1FAIL/11SKIP：actual1.107、expected0.8815，与原main相同。该断言与已记录的八档1.35合同冲突；当前新版用例通过代表来源合同校正后的检查通过，**不是该旧数值失败仅靠产品修改治愈**。原FAIL和作者修正前全日志完整保留，最终是否接受此期望校正由整合评审按合同记录判断，不以改测试洗成全绿。

原Vitest日志末尾空行也按原字节保留，因此全范围git whitespace检查会提示该原日志的blank-line-at-EOF；作者Markdown/JSON/脚本范围检查通过，未为清理格式改写失败日志。

## 本阶段实际窄交叉

|检查|结果/证据|
|---|---|
|score-recorded-audio + loading-progress + scene-resources|[38项通过](cross-targeted.log)，含音频新版真实逐卡路径；未重跑作者全部117项。|
|保留原音频断言|[仍1项失败](original-assertion-FAIL.log)，见上文；未隐去。|
|npm run build|[通过](build.log)，保留chunk提示；执行中已有未跟踪证据/临时验证文件，不能宣称clean工作区构建。|
|一个加载/卡图/媒体联合UI路径|[通过](cross-browser-report.json)，390×740/DPR2、软件Canvas；没有全量E2E或完整新局。|

UI路径复核真实加载未满门且无鱼→标题→原生菜单图鉴→a11按钮Enter放大→740×320旋转，关闭44×44在视口内且contain→ESC回触发焦点→苏轼旧黑底入口/关闭。音乐只读观察：context=running、volume=0.3、菜单曲paused=false，一槽、单曲loop=true，currentTime从1.378853→1.680544；pageerror=0。没有合成媒体事件或注入领域状态，也没有听觉验收。

截图：[390加载](390-loading-cross.png)、[390 a11](390-a11-cross.png)、[740 a11](740-a11-cross.png)、[苏轼入口](390-su-shi-cross.png)。苏轼采样仍可能为渐进高清阶段，只作黑底入口/关闭交叉，不冒充完整高清六英雄复验。

## 尚未关闭

- 原assist-profile-ui-copy两项和用户AI/稍后开战/跳场/底栏反馈：等待推荐/流程来源SHA。
- 原source-stage-art三项：等待高光来源图/资源预算后续；前阶段复现及52/72超过96KiB的静态计数保留，未因音频合入改变。不能无故移除预算/解码/取消保护或只更新字节断言。
- 未重跑全量，不把作者旧3800PASS/6FAIL改写为本阶段全量结果；当前新版音频套件已通过，原旧断言仍有独立FAIL证据。其余5项也不能在未接后续来源前写已修。
- 全部范围未齐，P08仍in_progress，仅普通push开发分支。指定线上版本仍未验证、没玩完线上一局，heard=false、未真机。
