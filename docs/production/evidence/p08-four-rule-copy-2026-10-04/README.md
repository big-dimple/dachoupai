# P08 四牌短语短轮证据（UTC 2026-10-04）

只修空选／已选四牌短语，统一“顺子/同花4张；同花顺5张”。完整普通型说明留在详情；不改字号、布局、判型、RNG、存档或素材。

真实 Chromium 151 Canvas，844×300 CSS、DPR1、top12/bottom0、12、34，reduced motion。合法 c08+c09/B03 九牌 checkpoint 经现有 readCheckpoint 验证，由真实导入和原生触控进入；四张红桃仍成普通同花但计分停用。fixture 非自然购买、非真 GPU/OnePlus。

基线空选实际 text 为“4张普通顺子／同花；同花顺…”（190×16），fullText 仍有完整例外；已选旧短句184×16未截。新两态完整 text/fullText 相等，160×16，194px可用宽，14px/resolution1.5。两快捷动作实际 CSS 44×44，文字／DOM工具／出弃牌无相交。六态原生直选只改selectedIds、不打开详情或自动出弃；撤销、规则开关保完整run与选择不变。

[基线实际矩形与文案](baseline-browser.json)、[修后六态与原生输入](final-browser.json)、[验证摘要](summary.json)。build-info 明确 fb709fe modified/C03，candidate源码指纹在摘要，不冒充main已部署。未新增截图或录屏。新冻结结果与精确CI另补；独立审美与真机不由技术替代。

复跑入口：`node harness/p08-four-rule-copy.mjs`（本云使用 Chromium Canvas）；红用例保留在两份报告，安全断言未放宽。
