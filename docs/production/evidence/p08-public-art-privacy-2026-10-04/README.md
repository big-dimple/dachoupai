# P08公开素材文本自动脱敏门禁

`npm run verify:content` 在领域校验前调用scripts/public-art-privacy.mjs；CI既有domain/content入口真实执行。只读当前 art/sources/handdrawn-runtime-* 包内README/manifest/verifier及public/assets/handdrawn-p08/manifest.json。明确不扫主目录/.git历史/图片，目录符号链接拒绝且不跟随。当前16份合法文本PASS。

检查实际Library/backing ID、结构化身份/特有版本字段、ChatGPT私有会话/local链接、明确私有绝对路径、签名下载URL；schemaVersion/公开素材交付commit/源basename尺寸hash与裸字段名说明允许。错误只有文件、类型、计数，坏JSON也不输出解析器片段或匹配值。26新门禁＋既有CI-gates受影响检查PASS，人工合成负例含真实content入口子进程失败/日志不回显，无真实用户资料。

未改75图片、注册、玩法、renderer、RNG/save、共享权限或旧Git历史。按本轮最小范围冻结受影响脚本测试/content/plan（既有read-only runner），本地不重跑艺术/渲染/录屏或无关游戏全套；正常FF后精确新CI仍跟终态。见[summary](summary.json)，冻结另归档。

无新画面；b5代表局部图评已由root实际看过并通过，整体/OnePlus/真GPU/听感未验。私有火参考仍未取得像素，不重试被拒路线、不改火。
