# 9MP实际上限与新眼神素材接续

## 精确CI续交

`25f7de9f53e8f8e864107c47018ec0ea75c8577e` 的[CI38668665186](https://github.com/big-dimple/dachoupai/actions/runs/38668665186)三个job全部success，[production-docs38668665270](https://github.com/big-dimple/dachoupai/actions/runs/38668665270)success。domain原日志确证250文件3480tests、content成功且testedCommit为该SHA；browser完成Chromium/Firefox/WebKit各自desktop/mobile smoke。原de1d2e domain失败不删。

## 旧上限漏洞及本次修正

父审查正确：旧 `Math.max(1,sqrt(9MP/area))` 在CSS本身超过9MP时保留至少1倍；5K会分配14.75MP、8K会分配33.18MP，原文“硬9MP”不成立。不是仅修文案。

Viewport现在允许受预算约束的density小于1，并对**真实ceil后宽×高**进行预算检查：若ceil额外行列超限，通过有界48次二分取可行density。已有PC/手机在预算内的密度/分配不变。独立保存CSS逻辑尺寸，保证整数backing不会改变layout；缩小framebuffer时camera两个轴按真实backing/CSS对应，CSS样式在首次无resize路径也明确固定。

`browser-report.json` 为实际Chromium软件Canvas原生title→选择草稿，没有创局、没有自然试玩：

| CSS / DPR | 实际backing | 像素 | CSS/layout与原生点击 |
|---|---|---:|---|
|390×740 / 3|1170×2220|2,597,400|PASS|
|1366×768 / 1.25|1708×960|1,639,680|PASS|
|1920×1080 / 2|3840×2160|8,294,400|PASS|
|5120×2880 / 1|4000×2250|9,000,000|PASS|
|7680×4320 / 1|4000×2250|9,000,000|PASS|
|8192×4320 / 2|4131×2178|8,997,318|PASS|

额外单测含奇数边界8191×4321、3841×2161，核整数实际分配而不是只核浮点面积。完整domain检查250文件3485tests/content通过；build通过。捕获和本地检查时HEAD为25f7de9f、工作树有本次Viewport/tests/harness增量，未改写为已提交source。超大屏受下采样预算约束，**不宣称5K/8K原生像素清晰度**。物理性能仍未签。

首次只读浏览器观察器因标题尚无runController却读`.state`失败，原记录保留；观察器改为无controller即null，不改变任何产品断言或行为，后六项通过。

## 新眼神原画：当前消费阻塞

父已生成并看过六张2172×724专用母图，不能再称素材尚未生成。本消费者按用户给定六个Library ID调用正规prepare_materialize，返回六个signed transfer、workspace_path=null（应走正规签名GET，不是本地路径缺失）。本环境对第一项amo-eyes-master.png的该签名GET实际返回 `URLError: Tunnel connection failed: 403 Forbidden`。

已立即停止，其他五项未下载，没有重试、改URL、换host或用Library read绕行。本地没有任何可读PNG，因此本人没有看过这些新图像素，没有压缩、没有衍生图、没有接入运行时、没有发布20MB母图。`eyes-access-blocked.json`仅含文件名/大小/错误，不保存私有ID或signed URL。缺的是本消费者的可读正规素材交付，不以父文字描述或父已看图代签消费验收。

本增量产品只改Viewport；不改分数、英雄效果、RNG、保存、商店或既有资产。后续素材接入仍为独立增量，在正规交付可读且本消费者看过像素后继续。
