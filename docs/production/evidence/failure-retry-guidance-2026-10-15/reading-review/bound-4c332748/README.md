# 本轮最终源码绑定

当前观察器及两组本地复核都冻结于 `4c3327482c03e659acc69b0675b7588849cb2382`，source/index/HEAD前后干净且相等；[原摘要](summary.json)、[源码对象证明](source-proof.json)。产品src/tests/CSS/资产/fixture均逐对象同3fb6eea3。本观察器在手机使用真实触点、桌面使用原鼠标点击，默认PC路径已实际回归；不是用触屏API覆盖桌面。

- [六短屏完整逐帧报告](short/report.json.gz)、[完整初态](short/full-state.json.gz)：320/390×568的普通、B02、主动结束全部PASS。每帧及所有返回路径逐次deepEqual完整state/journal/checkpoint/revision；实际关闭、Escape、重开、回看返回正常。
- [默认十三项回归报告](default/report.json.gz)、[完整保存](default/full-state.json.gz)：原PC/390/320终态与重试/保存故障/换角路径全部PASS，其中普通九个窗口也走新正文读取；B02及主动结束全文以六项专项为准，不把默认分支的首段截图当成全文。

## 已逐张实际查看的最终正文序列

- [320规则正文到底](short/320-short-reading-hands-read-03.png)、[390规则正文到底](short/390-short-reading-hands-read-03.png)。
- 320 B02：[第二建议全文/第三条开头](short/320-short-reading-boss-read-02.png) → [第三条正文末句](short/320-short-reading-boss-read-03.png) → [实际规则全部正文末句](short/320-short-reading-boss-read-04.png)。
- 390 B02：[第二条全文](short/390-short-reading-boss-read-01.png) → [第三条开头](short/390-short-reading-boss-read-02.png) → [第三条末句](short/390-short-reading-boss-read-03.png) → [实际规则全部正文末句](short/390-short-reading-boss-read-04.png)。
- [320长标题](short/320-short-reading-post-skip-heading-initial.png)、[390长标题](short/390-short-reading-post-skip-heading-initial.png)。DOM h2/header/裁切祖先与每个文字Range行片段均保在原报告内；每条正文所有Range片段均在重叠阅读序列中完整可见，不宣称一屏容纳全部三条。

上层reading-review保留0155初轮，其六窗口当时真实通过；本目录追加桌面兼容修正后的最终绑定，两组报告不改写旧来源。标题原PNG字节/区域像素审计见上层：当前两张标题图也有相同完整标题区域RGB摘要，未复现给定原字节的顶边裁切，不猜测原因、不冒称产品修复。最新精确HEAD CI在PR186另据实登记；仍draft、不合main/不部署，实体设备/听感/自然平衡未验。

[最终标题像素复核](heading-pixels.json)与[实际看图绑定](visual-review-binding.json)：10张关键帧与已逐张查看的0155轮原图完整RGB逐像素相同，另1张返回按钮焦点不同已单独实际查看；PC读取帧也实际查看。标题区域摘要仍完全相同。
