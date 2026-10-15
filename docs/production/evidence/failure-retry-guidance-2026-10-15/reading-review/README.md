# PR186复审补证：真实正文滚动与标题裁切核查

## 原结论更正

3fb6eea3精确CI成功，但旧harness滚动的是外层`.detail-dialog`，该外层由CSS固定，`scrollHeight==clientHeight`。原`rules-bottom`只证明展开标签，未证明正文底部；B02短屏旧图只见第一建议。**撤回原“已实际滚到底并读完建议”的证据声明**，原13项报告只保其功能/事务断言，不借它签全文。旧PNG/报告/FAIL均保原路径与原SHA，未覆盖或改成新PASS。

## 本次真实交互

观察器commit `0155ebfd0509979a01f57d27da4af26c7162ed02`，新一轮6窗口source/index/HEAD前后干净一致。[汇总](summary.json)、[完整逐帧报告](report.json.gz)、[完整保存输入](full-state.json.gz)、[源码绑定](source-proof.json)。产品src/tests/CSS/资产及fixture逐Git对象同3fb6eea3，本轮未改产品。

320×568、390×568各普通次数用尽、B02三建议、跳场后主动结束。先以原生`page.mouse.wheel`在真实`.dialog-scroll`中滚到规则标签，真实触点展开，再向上滚回首段，以重叠视窗一路读至正文底。没有给任何元素赋scrollTop，没有关闭overflow或放大视窗。每帧用DOM Range取得实际文字行，要求所有建议（含第二/第三条）和规则正文的每行都曾完整落在真实裁切框内；正文最后一行最终位于固定操作条之上。每帧及关闭/返回/重开/回看返回均比较完整state/journal/checkpoint/revision不变；实际点“返回失败页”和Escape均成功，重开正文回0。

| 窗口 | 正文clientHeight / scrollHeight | 实际末scrollTop | 文字覆盖 |
|---|---:|---:|---|
| 320-short-reading-hands | 326 / 887 | 561 | advice/2/body 8/8, rules/body 8/8 |
| 320-short-reading-boss | 326 / 1077 | 751 | advice/2/body 9/9, advice/3/body 8/8, rules/body 8/8 |
| 320-short-reading-post-skip | 326 / 735 | 409 | advice/2/body 3/3, rules/body 8/8 |
| 390-short-reading-hands | 322 / 784 | 462 | advice/2/body 8/8, rules/body 6/6 |
| 390-short-reading-boss | 322 / 1003 | 681 | advice/2/body 9/9, advice/3/body 8/8, rules/body 6/6 |
| 390-short-reading-post-skip | 322 / 681 | 359 | advice/2/body 3/3, rules/body 6/6 |

## 已实际查看的完整读屏序列

- 320普通规则底：[正文末](320-short-reading-hands-read-03.png)；390普通规则底：[正文末](390-short-reading-hands-read-03.png)。两图已见实际规则全部正文与最后“留钱”句，非只见展开标签。
- 320 B02：[第二建议/第三建议标题与开头](320-short-reading-boss-read-02.png) → [第三建议正文到末句](320-short-reading-boss-read-03.png) → [规则全部正文与末句](320-short-reading-boss-read-04.png)。
- 390 B02：[第二建议全文](390-short-reading-boss-read-01.png) → [第三建议标题与前文](390-short-reading-boss-read-02.png) → [第三建议后文/末句](390-short-reading-boss-read-03.png) → [规则全部正文与末句](390-short-reading-boss-read-04.png)。正文允许分屏阅读，逐行联合覆盖，不声称一屏容纳全部三建议。

上述冻结轮原PNG已实际逐张查看；固定回看/选角/重试/返回操作条可见、实际关闭/返回均通过。完整帧序列及文字行坐标另见report。6项不是实体手机、听感或平衡验收，不访问正式站、不重跑18局。

## 已提交长标题疑点的结果

给定原图SHA256 `c4c3d9db91639fa43a56ea1f07fc5a6c23e2e970052aae59b24354205a2b846e` 与仓库原文件完全一致，旧图未修改。只读解码审计见[原图数值](original-heading-audit.json)、[原图/新图/重复捕获的RGB像素比较](heading-pixel-comparison.json)。该标题区域的原始RGB摘要在原图、320/390新图及辅助重复捕获中完全相同：`fb9ecb929ea28db9561b54590ed2cbb661c41248bf94499a1fa3ac7995494d96`；文字墨迹边界x39–254/y32–55，y0–10没有标题墨迹。

新轮320/390的h2文本确为“已结束本局，重新选择”，box为y28–55.5，文字Range为y26–57，完整处在header y13–68.5内，且未被任何相关裁切父容器截断。每帧都记录h2、header/dialog/body/html边界与overflow，真实正文滚动时标题位置不变。实际看[320新标题](320-short-reading-post-skip-heading-initial.png)、[390新标题](390-short-reading-post-skip-heading-initial.png)。

另作6次打开、立即/250ms各捕获一次的[12次辅助诊断](title-diagnostic/report.json)，原脚本/PNG归档于同目录。所有捕获的DOM/header位置一致，正常标题区域像素一致；此诊断是辅助记录，精确验收仍以上述冻结6窗口为准。

曾仅凭工具预览的顶边外观误判“复现”，已用PNG直接解码和重复浏览器捕获更正。**未在给定原始PNG字节或这两种本地视窗中确认产品标题裁切，原因未确证，不宣称已修复，也不猜测独审显示端原因。** 若将来取得不同原字节/其他视窗可另复现；本次不以未证实问题擅改标题布局。

复跑：`FAILURE_QA_SCROLL_ONLY=1 FAILURE_QA_OUT=/tmp/failure-reading-review node harness/failure-retry-guidance.mjs`。像素复核：`node harness/failure-heading-pixels.mjs <原图> <新标题图>`。最新精确HEAD CI回执见[PR186](https://github.com/big-dimple/dachoupai/pull/186)，不借旧3fb绿灯签新观察器。
