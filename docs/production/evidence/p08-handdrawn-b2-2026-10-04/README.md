# P08 两图消费候选（UTC 2026-10-04）

现成一张真实牌桌PNG，工程已actual view：新铁算盘／冷场救火同时可见，旧未覆盖图与机制仍保留。13/72功能牌新手绘，不称全画风或main部署／设备PASS。

- baseline main: `89339f08847ea5b9a0d93444f5d05decad0054e4`（四牌短修精确CI success）
- asset input: `3284505ad86e4e216343aa873719d20524f9a4ce`；source manifest SHA `c00c8942d75e023da38930d95be9492ce63b55342f2633031662d9217403deeb`；4WebP/101218B逐hash+portable verify PASS，4像素actual view。
- candidate src fingerprint: `bc74f100461bdfa480fa8af6d854ddc78a2fa6233e9370a7af6ff81f29b96166`（sorted src path+NUL+content+NUL；本增量仅注册manifest／图文件，TS运行源码不变）
- candidate merged runtime manifest SHA: `9140b9eaea1dd62d432fd35cc36ea845578b37edc5da92cdda9497d87eab0f32`；47WebP/1363886B，原43输出hash不变。
- PNG SHA256: `3778d7daac64b4e3886e2f8f13901c24f1a60f82abba372b814084bff0040244`。
- embedded build: C03 / revision89339f0 / modified=true / builtAt2026-10-04T03:21:18.423Z；这是未提交候选，不冒充已发布main现场。
- Chromium151 / Canvas；390×740 CSS / DPR1 / safeInset全0 / reduced-motion。
- route: 现有checkpoint校验通过的九牌fixture，持有这两个ID，通过原生导入进入牌桌；不是自然购买。截图为空选，无预测总分。
- 实际两缩略图128×160，两个HD615×768hash/size匹配；HD仅详情打开后请求，铁算盘重开缓存正确；f10高清404保正确缩略图与固定图框，显式重试恢复。完整run/RNG/save不变。

候选方向供独立看图；本图未构成独立审美通过。本增量46受影响tests/type/有限浏览器PASS；新freeze/main发布待验。OnePlus/真GPU/听感NOT_RUN，fire审批pending且未重试。

root/协调者已精确GitHub fetch/view本PNG（e1da046），局部候选方向通过；不是整体／设备PASS。新消费源码 `82fc462a7dbc8158851e0ba1a71fc02a4cb892d7` 冻结1865 tests/104files、content、type/build、Canvas双端smoke、plan全PASS，source/index/HEAD不变，见[freeze](freeze.json)。之后仅归档结果与交接，无运行源码／素材变化；精确新CI另报。完整只读覆盖／c08-c09建议见[盘点](coverage-audit.md)。
