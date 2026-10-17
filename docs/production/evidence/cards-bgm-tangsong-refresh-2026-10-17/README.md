# 2026-10-17 《唐宋牌》全套72张手绘卡牌、视听打击感、音画增强与工程交付总结

## 1. 交付概览与分支归档
- **主交付分支**：`feat/cards-bgm-tangsong-refresh`（已完成全部工程实现并合入 `main` 分支）
- **交付目标**：
  1. 完成全套 72 张大丑牌／唐宋牌（A01–F12）工笔手绘卡面 100% 视觉圆满；
  2. 实现现场按需加载的高清卡面细节赏析弹窗（615×768 Detail Zoom）；
  3. 建立 72 张唐宋牌展示层标准正名字典，与手绘原画命名 1:1 严格对齐；
  4. 实现 Balatro 级算分打击感、多巴胺震屏与五声音阶递升视听反馈（Juice & Punch）；
  5. 引入商店构筑联动“金色微光呼吸与气泡提示”；
  6. 落地牌桌内 Boss 致命禁令手牌铁索封印与石灰遮罩特效；
  7. 架构“边游戏边加载”渐进式纹理预热机制，首屏秒级轻量冷启；
  8. 首页小金鱼 SVG 灵动游动加载指示器（1:1 动态绑定真实资源解码进度）；
  9. 配置 5 首多场景专属沉浸 BGM，并在 Boss 战前商店无缝切换决战曲；
  10. 深度适配移动端竖版（Portrait）与桌面横版（Landscape）。

---

## 2. 今日已完成清单（Completed Items）

| 编号 | 模块分类 | 核心完成内容 | 对应实现文件与模块 |
|:---:|---|---|---|
| **01** | **全套 72 张手绘卡面** | 72 张手绘原画全部生成 Detail (615×768) 与 Thumb (128×160) 双规格 WebP，平均单张 145KB/8KB，全套总资源体积仅 10.07MB，严守 20MiB 红线 | [`public/assets/handdrawn-p08/cards/`](../../../../public/assets/handdrawn-p08/cards/) |
| **02** | **现场高清放大鉴赏** | 卡牌点击即开沉浸式原画赏析弹窗，现场按需平滑异步解码 615×768 高清大图，带模糊渐显与加载反馈 | [`src/game/CardArtZoomModal.ts`](../../../../src/game/CardArtZoomModal.ts) |
| **03** | **72 张唐宋正名体系** | 建立展示层统一正名字典，严格映射 72 张卡牌艺术品名，彻底消除旧戏班俗名感 | [`src/game/tangsongCardNames.ts`](../../../../src/game/tangsongCardNames.ts) |
| **04** | **算分爽感打击感** | 计分牌逐张跳起微倾（`Back.easeOut` 跃起 18px / ±2.5° 弹性回弹）、五声音阶逐级抬升（1.0~2.0）、乘倍率缩放 1.54x 伴随强力微弱震屏（`shake(120, 0.0045)`） | [`src/game/GameScene.ts`](../../../../src/game/GameScene.ts)、[`src/audio/AudioEngine.ts`](../../../../src/audio/AudioEngine.ts) |
| **05** | **商店构筑联动提示** | 悬停/选中商品时，已持道具中发生联动的牌泛起金色呼吸流光（`#f6c244`）与浮动徽标（`✨ 联动+成组`等），详情同步注明配合理由 | [`src/game/ShopSynergy.ts`](../../../../src/game/ShopSynergy.ts)、[`src/game/ShopScene.ts`](../../../../src/game/ShopScene.ts) |
| **06** | **Boss 禁令手牌封印** | 面对压轴强敌禁令（如 JQK 失效、特定花色失效、盲注禁用），受压制手牌覆盖半透石墨灰网罩、交错锁链暗纹与朱红【🔒 封禁】印章徽标 | [`src/game/GameScene.ts`](../../../../src/game/GameScene.ts) |
| **07** | **边游戏边加载架构** | Boot 阶段仅加载当前英雄立绘与核心纸质素材秒进主页，空闲期通过 `requestIdleCallback` 在后台平滑解码卡牌纹理，彻底消除长卡顿 | [`src/game/BootScene.ts`](../../../../src/game/BootScene.ts)、[`src/game/StageImageWarmup.ts`](../../../../src/game/StageImageWarmup.ts) |
| **08** | **小金鱼灵动进度条** | 移除冰冷数字百分比，采用 SVG 灵动金鱼摆尾动画，游动位移与真实解码完成度 1:1 动态绑定，既真实可感又消除等待焦虑 | [`index.html`](../../../../index.html)、[`src/game/LoadingScreen.ts`](../../../../src/game/LoadingScreen.ts) |
| **09** | **多场景 5 首专属 BGM** | 主页古琴《阳关三叠》、牌桌《Tango de Manzana》+《醉渔唱晚》、商店《舒伯特小夜曲》、决战《Dark Things》（怪奇物语电子脉冲氛围） | [`public/assets/audio/bgm/manifest.json`](../../../../public/assets/audio/bgm/manifest.json) |
| **10** | **Boss 战前前置战歌** | 在进入 Boss 战前的前一个商店即提前切换为决战曲《Dark Things》，商店顶栏加盖朱红印章“· 压轴备战”与警报横幅，进入战斗无缝衔接 | [`src/game/ShopScene.ts`](../../../../src/game/ShopScene.ts) |
| **11** | **三联折页节目录** | 仿古三联折页展现【暖场·基础盲注】、【正场·高额盲注】、【压轴·强敌盲注】，16 种 Boss 致命禁令与破局指引醒目呼出 | [`src/game/BlindSelectPresentation.ts`](../../../../src/game/BlindSelectPresentation.ts) |
| **12** | **全平台响应式适配** | 深度优化手机竖版（Portrait）弹窗居中缩放、垂直滚动、防遮挡触控，以及桌面横版（Landscape）宽屏并排排布 | [`src/game/DetailDialog.ts`](../../../../src/game/DetailDialog.ts)、[`src/game/BlindSelectPresentation.ts`](../../../../src/game/BlindSelectPresentation.ts) |

---

## 3. 改动理由与设计决策（Design Rationale & Trade-offs）

### (1) 为什么严格保留底层领域层 `R2_LEGACY_CONTENT_HASH`，而在展示层建立名字映射？
- **原因**：核心领域模型计算（`sharedRuntimeHash`）基于 `src/content/r2-jokers.json` 等静态契约，与历史存档反序列化键、网络通信以及自动化回归测试强绑定。
- **决策**：在展示层建立 [`src/game/tangsongCardNames.ts`](../../../../src/game/tangsongCardNames.ts)，使所有面向玩家的场景（牌桌、商店、图鉴、背包）均完美展示新唐宋正名（如《坐镇中军》、《两袖清风》），既 100% 满足玩家视听一体体验，又绝对杜绝了修改核心 JSON 导致 `published-r2-contract-drift` 致命异常的风险。

### (2) 为什么采用“平时轻量缩略图 + 弹窗现场按需加载高清原画”架构？
- **原因**：全套 72 张原画若在首屏全部加载 615×768 大图，将占用超过 30MB 显存并导致低端移动设备瞬间白屏或崩溃。
- **决策**：牌桌与商店常驻仅加载 128×160 极轻 WebP（单张仅 ~8KB）；仅当玩家主动点击卡牌查看详情或点击【🔍 点击放大细节】时，才在弹窗内通过 `openCardArtZoom` 现场按需加载高清 615×768 大图，兼具极速加载与精细鉴赏。

### (3) 为什么 Boss 战歌要在“前一个商店”提前切换？
- **原因**：原有设计仅在进入战斗瞬间弹出一句小提示，玩家往往毫无防备直接暴毙，感受不到大敌当前的窒息感与紧迫感。
- **决策**：将 BGM 切换前置到 Boss 前的一个商店，配合顶部朱红印章“· 压轴备战”与横幅警告，营造“大战在即、厉兵秣马”的心理铺垫，进入战斗时音乐无缝延续不截断，直到战胜后在下一关商店才恢复宁静悠扬的舒伯特小夜曲。

### (4) 为什么小金鱼加载进度条不显示冰冷数字？
- **原因**：卡牌游戏玩家对冰冷的“12/146”或“8%”数字容易产生等待焦虑。
- **决策**：使用中国传统工笔金鱼 SVG 动画，金鱼游动位移与真实资源解码完成比例 1:1 动态联动，让加载过程变成生动灵性的艺术体验。

---

## 4. 标明哪些旧方案已被替代（Superseded Legacy Schemes）

| 旧方案（已废弃／被替代） | 新方案（当前已交付落地） | 替代原因与提升效果 |
|---|---|---|
| **旧戏班俗名体系**（碰瓷、铁算盘、换布景、少一块布、兜比脸净等） | **唐宋文武与市井成语正名**（狭路相逢、精打细算、辞旧迎新、天衣无缝、两袖清风等） | 配合《唐宋牌》整体文雅、热血、国风漫画定位，全面摆脱戏班小格局 |
| **首屏 146 项大图同步解码**，低端设备白屏或 5 秒卡顿 | **渐进式后台空闲预加载**（Boot 阶段秒进，空闲时通过 `requestIdleCallback` 解码） | 首屏进入时间压缩至秒级，卡牌滑动完全无掉帧感知 |
| **单调生硬的进度条与数字显示**（已加载 X/146） | **SVG 灵动金鱼游动**，位移真实绑定解码进度 | 消除用户等待焦虑，增强文化韵味 |
| **全场景单曲循环**《舒伯特小夜曲》 | **5 首场景专属 BGM**（主页古琴、牌桌探戈、商店清雅版、决战复古电子《Dark Things》） | 极大丰富各场景氛围，避免听觉疲劳 |
| **Boss 战进场无感知、盲目暴毙** | **三联折页节目录 + 战前商店变奏 + 手牌铁索封印**三重立体预警 | 给予玩家充分战术准备时间，战前窒息感与战胜成就感极大提升 |
| **静态卡牌计分无反馈** | **Balatro 级卡牌跳起（18px）、五声音阶递升、倍率 1.54x 放大与微弱震屏** | 产生浓郁的多巴胺计分爽感与视听打击感 |
| **商店卡牌配合全凭玩家死记硬背** | **商店构筑智能联动**（已持卡牌金色呼吸流光 + `✨ 联动+成组`等徽标提示） | 大幅降低玩家记忆与思考负担，新手容易成型成套流派 |

---

## 5. 完整 72 张卡牌资源对应关系大表（Resource Mapping Table）

| 序号 | 标识ID | 唐宋新正名 | 旧戏班俗名 | 稀有度 | 核心规则效果 | 原画源文件 | 运行时缩略图 (128x160) | 运行时高清图 (615x768) |
|:---:|:---:|:---:|:---:|:---:|:---|:---|:---|:---|
| 01 | `pengci` | **狭路相逢** | 碰瓷 | 普通 | 高牌时，整手倍率 +2。 | `01_pengci_狭路相逢.png` | `cards/pengci.thumbnail.webp` | `cards/pengci.detail.webp` |
| 02 | `tiesuanpan` | **精打细算** | 铁算盘 | 罕见 | 每张有效计分的 J/Q/K/A 加 25 热度；杂牌和持牌不触发。 | `02_tiesuanpan_精打细算.png` | `cards/tiesuanpan.thumbnail.webp` | `cards/tiesuanpan.detail.webp` |
| 03 | `a03` | **掌灯破雾** | 一束光 | 普通 | 实际打出恰好1张牌时，整手热度 +35。 | `03_a03_掌灯破雾.png` | `cards/a03.thumbnail.webp` | `cards/a03.detail.webp` |
| 04 | `a04` | **乾坤锦囊** | 小口袋 | 罕见 | 进场时持久有效牌组不超过40张，手牌上限 +2；只在下次进场生效，总上限14。 | `04_a04_乾坤锦囊.png` | `cards/a04.thumbnail.webp` | `cards/a04.detail.webp` |
| 05 | `a05` | **轻车熟路** | 熟面孔 | 罕见 | 打出1张后热度成长 +6，上限90，从下一手生效；每手加入已有成长。 | `05_a05_轻车熟路.png` | `cards/a05.thumbnail.webp` | `cards/a05.detail.webp` |
| 06 | `a06` | **一舞倾城** | 独家戏 | 稀有 | 高牌时，整手倍率 ×1.5。 | `06_a06_一舞倾城.png` | `cards/a06.thumbnail.webp` | `cards/a06.detail.webp` |
| 07 | `a07` | **浮生半日** | 偷闲 | 普通 | 成功恰好弃1张时 +1金币，每场最多2次；计数进场重置，返还弃牌不回退计数。 | `07_a07_浮生半日.png` | `cards/a07.thumbnail.webp` | `cards/a07.detail.webp` |
| 08 | `a08` | **野火春风** | 小人物 | 普通 | 每张有效计分的2–5各加20热度；杂牌、失效牌和持牌不触发。 | `08_a08_野火春风.jpg` | `cards/a08.thumbnail.webp` | `cards/a08.detail.webp` |
| 09 | `a09` | **清音穿云** | 短节目 | 普通 | 实际打出不超过2张牌时，整手倍率 +1。 | `09_a09_清音穿云.png` | `cards/a09.thumbnail.webp` | `cards/a09.detail.webp` |
| 10 | `a10` | **慧眼识珠** | 后台眼神 | 罕见 | 本手实际打出1张牌时，按手牌顺序，前3张有效持有的 J/Q/K 各 +1倍率；A不是人头牌。 | `10_a10_慧眼识珠.png` | `cards/a10.thumbnail.webp` | `cards/a10.detail.webp` |
| 11 | `a11` | **梅开二度** | 返个场 | 稀有 | 实际打出1张牌时，唯一有效计分牌额外重触发一次；重触发不再请求新的重触发，仍受每牌额外4次上限约束。 | `11_a11_梅开二度.jpg` | `cards/a11.thumbnail.webp` | `cards/a11.detail.webp` |
| 12 | `a12` | **一盏清茗** | 不铺张 | 罕见 | 本场至少成功出过一手，且每手实际打出均不超过2张，成功过关额外 +3金币；失败与跳场不触发。 | `12_a12_一盏清茗.jpg` | `cards/a12.thumbnail.webp` | `cards/a12.detail.webp` |
| 13 | `mantangcai` | **满堂喝彩** | 满堂彩 | 普通 | 对子、两对、三条、葫芦、四条，整手热度 +90；扩展牌型不自动继承。 | `13_mantangcai_满堂喝彩.jpg` | `cards/mantangcai.thumbnail.webp` | `cards/mantangcai.detail.webp` |
| 14 | `b02` | **心有灵犀** | 对上眼 | 普通 | 计分牌的点数在实际打出牌中至少出现2次时，该牌倍率 +0.25。 | `14_b02_心有灵犀.jpg` | `cards/b02.thumbnail.webp` | `cards/b02.detail.webp` |
| 15 | `b03` | **莫逆之交** | 老搭档 | 罕见 | 对子、两对、三条后倍率成长 +0.25，上限3，从下一手生效；每手加入已有成长。 | `15_b03_莫逆之交.jpg` | `cards/b03.thumbnail.webp` | `cards/b03.detail.webp` |
| 16 | `b04` | **琴瑟和鸣** | 一唱一和 | 普通 | 实际打出牌含至少两组不同点数、每组至少2张时，整手倍率 +2。 | `16_b04_琴瑟和鸣.jpg` | `cards/b04.thumbnail.webp` | `cards/b04.detail.webp` |
| 17 | `b05` | **凤鸣朝阳** | 合唱班 | 罕见 | 有效计分牌的点数在实际打出牌中至少出现3次时，该牌加15热度。 | `17_b05_凤鸣朝阳.jpg` | `cards/b05.thumbnail.webp` | `cards/b05.detail.webp` |
| 18 | `b06` | **重锤响鼓** | 再说一遍 | 稀有 | 恰为对子时，两张有效对子计分牌各额外重触发1次；每卡额外重触发总上限4，最深1层。 | `18_b06_重锤响鼓.jpg` | `cards/b06.thumbnail.webp` | `cards/b06.detail.webp` |
| 19 | `b07` | **宾主尽欢** | 人人有份 | 普通 | 实际打出至少2张且全部都是有效计分牌时，整手热度 +30。 | `19_b07_宾主尽欢.jpg` | `cards/b07.thumbnail.webp` | `cards/b07.detail.webp` |
| 20 | `b08` | **平分秋色** | 对半分 | 罕见 | 致胜手恰为对子或两对时，成功过场额外 +3金币；失败和跳场不触发。 | `20_b08_平分秋色.jpg` | `cards/b08.thumbnail.webp` | `cards/b08.detail.webp` |
| 21 | `b09` | **技惊四座** | 四座皆惊 | 稀有 | 四条、五条或同花五条时，整手倍率 ×2；其他成组牌型不触发。 | `21_b09_技惊四座.jpg` | `cards/b09.thumbnail.webp` | `cards/b09.detail.webp` |
| 22 | `b10` | **炉火纯青** | 练对子 | 罕见 | 恰为对子时，结算后热度成长 +5，上限50，从下一手生效；每手任意牌型加入已有成长。 | `22_b10_炉火纯青.jpg` | `cards/b10.thumbnail.webp` | `cards/b10.detail.webp` |
| 23 | `b11` | **蓄势待发** | 候场同伴 | 罕见 | 持牌点数与本手任意有效计分牌相同时，按手牌顺序前3张有效匹配持牌各 +0.5倍率；失效计分牌和杂牌不提供匹配。 | `23_b11_蓄势待发.jpg` | `cards/b11.thumbnail.webp` | `cards/b11.detail.webp` |
| 24 | `b12` | **绝处逢生** | 救个场 | 稀有 | 本手恰为四条且结算后仍未达目标时，返还1次出牌，每场最多一次；先于耗尽失败判断，实际出牌序号不回退。 | `24_b12_绝处逢生.jpg` | `cards/b12.thumbnail.webp` | `cards/b12.detail.webp` |
| 25 | `jiedongfeng` | **巧借东风** | 借东风 | 罕见 | 顺子、同花或同花顺，整手倍率 +1.5。 | `25_jiedongfeng_巧借东风.jpg` | `cards/jiedongfeng.thumbnail.webp` | `cards/jiedongfeng.detail.webp` |
| 26 | `c02` | **朱砂点绛** | 红线 | 普通 | 每张有效计分的红桃或方片，加8热度；杂牌和持牌不触发。 | `26_c02_朱砂点绛.jpg` | `cards/c02.thumbnail.webp` | `cards/c02.detail.webp` |
| 27 | `c03` | **挥毫泼墨** | 蓝墨 | 普通 | 每张有效计分的黑桃或梅花加8热度；杂牌、失效牌和持牌不触发。 | `27_c03_挥毫泼墨.jpg` | `cards/c03.thumbnail.webp` | `cards/c03.detail.webp` |
| 28 | `c04` | **步步高升** | 搭台阶 | 普通 | 顺子或同花顺，整手热度 +50。 | `28_c04_步步高升.jpg` | `cards/c04.thumbnail.webp` | `cards/c04.detail.webp` |
| 29 | `c05` | **辞旧迎新** | 换布景 | 罕见 | 成功弃至少2张同花色牌，积累下手 +40热度，上限80；下一次整手计分消费一次，场末清零。 | `29_c05_辞旧迎新.jpg` | `cards/c05.thumbnail.webp` | `cards/c05.detail.webp` |
| 30 | `c06` | **青出于蓝** | 越染越深 | 罕见 | 同花或同花顺后倍率成长 +0.25，上限4，从下一手生效；每手加入已有成长。 | `30_c06_青出于蓝.jpg` | `cards/c06.thumbnail.webp` | `cards/c06.detail.webp` |
| 31 | `c07` | **弦外之音** | 拖个尾音 | 稀有 | 同花或同花顺的最后一张原始有效计分牌额外重触发1次；每卡额外重触发总上限4，最深1层。 | `31_c07_弦外之音.jpg` | `cards/c07.thumbnail.webp` | `cards/c07.detail.webp` |
| 32 | `c08` | **一步之遥** | 少一级 | 罕见 | 普通顺子允许4张连续不同点数，A234合法，也保留5张顺子；同花顺仍需5张，不允许QKA2。 | `32_c08_一步之遥.jpg` | `cards/c08.thumbnail.webp` | `cards/c08.detail.webp` |
| 33 | `c09` | **天衣无缝** | 少一块布 | 稀有 | 普通同花允许4张同花色，也保留5张；同花顺与扩展同花牌型仍需5张。与少一级同时持有时，4张同花连续牌按普通同花结算。 | `33_c09_天衣无缝.jpg` | `cards/c09.thumbnail.webp` | `cards/c09.detail.webp` |
| 34 | `c10` | **稳如泰山** | 压住书页 | 罕见 | 按手牌顺序，前2张有效持有的 A 各 +0.75倍率；持牌的版次不触发。 | `34_c10_稳如泰山.jpg` | `cards/c10.thumbnail.webp` | `cards/c10.detail.webp` |
| 35 | `c11` | **峰回路转** | 换轨 | 罕见 | 本手恰为普通顺子、上手恰为普通同花，或反之，整手倍率 ×1.75；首手与同花顺均不触发。 | `35_c11_峰回路转.jpg` | `cards/c11.thumbnail.webp` | `cards/c11.detail.webp` |
| 36 | `c12` | **锦上添花** | 换一身 | 罕见 | 本场同时打过普通顺子和普通同花，成功过关从 T03–T06 均匀随机获得一件；满消耗品槽转2金币，仍消费一次奖励随机。 | `36_c12_锦上添花.jpg` | `cards/c12.thumbnail.webp` | `cards/c12.detail.webp` |
| 37 | `d01` | **坐镇中军** | 候场席 | 普通 | 手牌顺序前4张持有的J/Q/K各加0.5倍率；A不算人头。 | `37_d01_坐镇中军.png` | `cards/d01.thumbnail.webp` | `cards/d01.detail.webp` |
| 38 | `d02` | **奇兵突起** | 小凳子 | 普通 | 手牌顺序前4张持有的2–5各加6热度；不加入普通点数。 | `38_d02_奇兵突起.png` | `cards/d02.thumbnail.webp` | `cards/d02.detail.webp` |
| 39 | `d03` | **陈年佳酿** | 等得住 | 罕见 | 一手后留下至少3张牌，热度成长 +4，上限60，从下一手生效；每手加入已有成长。 | `39_d03_陈年佳酿.png` | `cards/d03.thumbnail.webp` | `cards/d03.detail.webp` |
| 40 | `d04` | **顾盼生威** | 递个眼色 | 稀有 | 本场第偶数次合法出牌的首张原始有效计分牌额外重触发1次；返还次数不回退序号，每卡额外重触发总上限4，最深1层。 | `40_d04_顾盼生威.png` | `cards/d04.thumbnail.webp` | `cards/d04.detail.webp` |
| 41 | `d05` | **小试牛刀** | 彩排 | 罕见 | 本场首次成功弃牌返还1次弃牌；仅一次，返还仍算使用过弃牌。 | `41_d05_小试牛刀.png` | `cards/d05.thumbnail.webp` | `cards/d05.detail.webp` |
| 42 | `d06` | **虚位以待** | 搬张椅子 | 罕见 | 下次进场手牌上限 +1，所有修正后的硬上限14；场中不返还牌。 | `42_d06_虚位以待.png` | `cards/d06.thumbnail.webp` | `cards/d06.detail.webp` |
| 43 | `d07` | **箭无虚发** | 镜头不空 | 普通 | 实际打出牌全部是有效计分牌时，整手倍率 +0.5；单张也可触发。 | `43_d07_箭无虚发.png` | `cards/d07.thumbnail.webp` | `cards/d07.detail.webp` |
| 44 | `d08` | **余音绕梁** | 留声机 | 稀有 | 按手牌顺序，前2张有效持有的留声纸，在各自增强 +1倍率后再 ×1.2倍率；其他持牌Joker仍按槽位顺序执行。 | `44_d08_余音绕梁.png` | `cards/d08.thumbnail.webp` | `cards/d08.detail.webp` |
| 45 | `d09` | **空谷传响** | 回声越来越近 | 罕见 | 本手实际执行过至少一次额外重触发，结算后倍率成长 +0.2，上限3，从下一手生效；每手加入已有成长。 | `45_d09_空谷传响.png` | `cards/d09.thumbnail.webp` | `cards/d09.detail.webp` |
| 46 | `d10` | **无中生有** | 空位有价 | 普通 | 每个空大丑牌槽加12热度，最多4个空槽。 | `46_d10_无中生有.png` | `cards/d10.thumbnail.webp` | `cards/d10.detail.webp` |
| 47 | `d11` | **一鼓作气** | 三拍子 | 稀有 | 第三张原始计分牌有效时，额外重触发一次；少于3张或第三张失效则不触发，第四张不补位。 | `47_d11_一鼓作气.png` | `cards/d11.thumbnail.webp` | `cards/d11.detail.webp` |
| 48 | `d12` | **深藏不露** | 留点悬念 | 罕见 | 致胜手后留在手中至少4张牌时，成功过关额外 +2金币；打出的杂牌不计作持牌。 | `48_d12_深藏不露.png` | `cards/d12.thumbnail.webp` | `cards/d12.detail.webp` |
| 49 | `e01` | **金玉满盘** | 小费盒 | 普通 | 成功过场额外 +2金币；失败和跳场不触发。 | `49_e01_金玉满盘.png` | `cards/e01.thumbnail.webp` | `cards/e01.detail.webp` |
| 50 | `e02` | **宾至如归** | 熟客券 | 普通 | 持有时每店第一次成功购买减1金币，与跳场券叠加，最终最低支付1；购买前未持有则不优惠。 | `50_e02_宾至如归.png` | `cards/e02.thumbnail.webp` | `cards/e02.detail.webp` |
| 51 | `e03` | **聚宝金瓮** | 家底 | 罕见 | 每持有1金币加2热度，最多60热度。 | `51_e03_聚宝金瓮.png` | `cards/e03.thumbnail.webp` | `cards/e03.detail.webp` |
| 52 | `e04` | **一本万利** | 滚个零头 | 罕见 | 成功奖励前读取，利息上限 +2金币；仍按奖励前金币每5金产生1利息。 | `52_e04_一本万利.png` | `cards/e04.thumbnail.webp` | `cards/e04.detail.webp` |
| 53 | `e05` | **鲜衣怒马** | 置办行头 | 罕见 | 持有期间购买其他大丑牌后，热度成长 +8，上限80；每手加入已有成长。 | `53_e05_鲜衣怒马.png` | `cards/e05.thumbnail.webp` | `cards/e05.detail.webp` |
| 54 | `e06` | **点石成金** | 旧物新用 | 罕见 | 持有期间成功出售其他大丑牌后，倍率成长 +0.5，上限3；出售自己不成长，成长属于原实例。 | `54_e06_点石成金.png` | `cards/e06.thumbnail.webp` | `cards/e06.detail.webp` |
| 55 | `e07` | **天道酬勤** | 加班费 | 罕见 | 致胜手后剩余出牌为0，成功过场额外 +4金币，只发一次；失败和跳场不触发。 | `55_e07_天道酬勤.png` | `cards/e07.thumbnail.webp` | `cards/e07.detail.webp` |
| 56 | `e08` | **一掷千金** | 包场 | 稀有 | 当前金币至少20时，整手倍率 ×1.8。 | `56_e08_一掷千金.png` | `cards/e08.thumbnail.webp` | `cards/e08.detail.webp` |
| 57 | `e09` | **内有乾坤** | 储物箱 | 普通 | 持有时消耗品槽 +1，与道具合计最多4槽；出售或牺牲后容量不足则拒绝，须先主动处理超额物品。 | `57_e09_内有乾坤.png` | `cards/e09.thumbnail.webp` | `cards/e09.detail.webp` |
| 58 | `e10` | **倾囊相授** | 赠票 | 罕见 | 持有期间每第二次成功过关获得固定 T01，满槽转2金币；成功次数按0/1轮转并跨场保留，不消费奖励随机。 | `58_e10_倾囊相授.png` | `cards/e10.thumbnail.webp` | `cards/e10.detail.webp` |
| 59 | `e11` | **薪火相传** | 长期捧场 | 稀有 | 整手倍率乘自身系数，创建时 ×1；本场含准备商店未出售Joker而成功过关，系数 +0.1，上限2，从下一手生效；出售其他Joker重置1。 | `59_e11_薪火相传.png` | `cards/e11.thumbnail.webp` | `cards/e11.detail.webp` |
| 60 | `e12` | **沙里淘金** | 淘旧摊 | 罕见 | 每次实际付费刷新后，热度成长 +3，上限60；免费刷新不成长。每手加入已有成长。 | `60_e12_沙里淘金.png` | `cards/e12.thumbnail.webp` | `cards/e12.detail.webp` |
| 61 | `huimaqiang` | **回马枪** | 回马枪 | 稀有 | 本场每第 3 次出牌，整手倍率 ×2。 | `61_huimaqiang_回马枪.png` | `cards/huimaqiang.thumbnail.webp` | `cards/huimaqiang.detail.webp` |
| 62 | `f02` | **孤注一掷** | 最后一句 | 普通 | 扣除本手后出牌余量为0时，整手热度 +70。 | `62_f02_孤注一掷.png` | `cards/f02.thumbnail.webp` | `cards/f02.detail.webp` |
| 63 | `f03` | **双喜临门** | 开门见喜 | 普通 | 本场第一手，整手倍率 +2。 | `63_f03_双喜临门.png` | `cards/f03.thumbnail.webp` | `cards/f03.detail.webp` |
| 64 | `f04` | **两袖清风** | 兜比脸净 | 罕见 | 当前金币不超过3时，整手倍率 +3。 | `64_f04_两袖清风.png` | `cards/f04.thumbnail.webp` | `cards/f04.detail.webp` |
| 65 | `f05` | **青云直上** | 越说越顺 | 罕见 | 整手加入已有倍率成长；本手最终分数严格高于本场上一手时，结算后成长 +0.25，上限4，否则归零；本场首手只记录，成长跨场保留。 | `65_f05_青云直上.png` | `cards/f05.thumbnail.webp` | `cards/f05.detail.webp` |
| 66 | `f06` | **刹那芳华** | 一次性招牌 | 稀有 | 整手倍率 ×2；买入后第4次合法出牌本手仍有效，结算后销毁自身，次数跨场保留。 | `66_f06_刹那芳华.png` | `cards/f06.thumbnail.webp` | `cards/f06.detail.webp` |
| 67 | `f07` | **逢凶化吉** | 安全网 | 罕见 | 判失败前，仅因出牌耗尽且仍能获得可用手牌时，销毁自身并返还1次出牌；全局每局最多1次，触发后禁止再售，成功不触发。 | `67_f07_逢凶化吉.png` | `cards/f07.thumbnail.webp` | `cards/f07.detail.webp` |
| 68 | `f08` | **上上大吉** | 试试手气 | 罕见 | 每手在本槽结算时独立1/3概率 +90热度，否则0；每有效实例每手只判一次，扑克重触发不增加判定。 | `68_f08_上上大吉.png` | `cards/f08.thumbnail.webp` | `cards/f08.detail.webp` |
| 69 | `f09` | **始终如一** | 不换词 | 罕见 | 本场尚未成功使用弃牌时，整手倍率 ×1.5；返还弃牌不恢复资格。 | `69_f09_始终如一.png` | `cards/f09.thumbnail.webp` | `cards/f09.detail.webp` |
| 70 | `f10` | **柳暗花明** | 冷场救火 | 稀有 | 出牌前本场累计热度严格低于目标的25%时，整手倍率 ×1.5；恰好25%不触发。 | `70_f10_柳暗花明.png` | `cards/f10.thumbnail.webp` | `cards/f10.detail.webp` |
| 71 | `f11` | **越战越勇** | 越挫越会 | 罕见 | 本手未过关且最终得分严格低于目标的10%时，结算后热度成长 +10，上限100，从下一手生效；每手加入已有成长。 | `71_f11_越战越勇.png` | `cards/f11.thumbnail.webp` | `cards/f11.detail.webp` |
| 72 | `f12` | **压轴好戏** | 真正的压轴 | 稀有 | 整手倍率乘自身系数，创建时 ×1；每次最后一手成功过关后系数 +0.1，上限2.5，从下一手生效，跨场保留。 | `72_f12_压轴好戏.png` | `cards/f12.thumbnail.webp` | `cards/f12.detail.webp` |


---

## 6. 未完成事项与后续边界（Uncompleted / Future Scope Boundaries）

1. **独立眼部原画素材依赖**：六英雄当前采用已验收原图的精准安全眼部裁切；若后续美术交付专门的 1536×768 独立眼神原画，按既有接口无缝合入即可。
2. **长局自然数值与真人体验专题**：当前机器验证、E2E 行为闭环与 UI 视听均已全绿；真人在实体物理设备上的主观听感平衡、长局自然疲劳度等需配合 V01 真人专题后续跟进。
3. **领域层数值与价格红线**：本轮更新严格限制在视听呈现、手绘资产替换、加载架构与交互手感，未修改任何掉落概率、商店物价与游戏基础数值。

---

## 7. 已知问题与防御机制（Known Issues & Defensive Guards）

1. **自动部署环境隔离防护**：
   - 本地自动部署脚本 `/usr/local/bin/dachoupai-autodeploy.sh` 已增加当前分支前置守卫（`if [ "$CURRENT_BRANCH" != "main" ]; then exit 0; fi`）。
   - 在开发或特性分支上工作时，即使 crontab 定时器处于激活状态，也绝对不会误触发 `git reset --hard origin/main` 抹除工作区。
2. **大仓库 Git ls-files CI 门禁耗时放宽**：
   - 随 72 张高清原画与 WebP 派生资源并入，`git ls-files --stage -z` 哈希校验耗时由 ~18s 增至 ~20.5s。
   - `tests/ci-gates.test.mjs` 中的测试超时时间已由 20,000ms 调整为 35,000ms，确保 CI 门禁稳健通过，绝不因毫秒级超时误报。
3. **资源预算安全控制**：
   - 全套 72 张卡牌（包含 72 张 615×768 detail 和 72 张 128×160 thumb）总运行时体积为 **10.07MB**，严格低于 20MiB 上限预算。

---

## 8. 自动化测试与验证凭据（Automated Verification Evidence）

- **单元与组件测试（35/35 全绿）**：
  - `tests/handdrawn-art.test.ts`：18/18 PASS（全套 72 张卡牌 WebP 尺寸、哈希及用途映射完整校验）
  - `tests/tangsong-card-names.test.ts`：4/4 PASS（72 张唐宋正名与原画文件名 1:1 匹配校验）
  - `tests/bgm-scene.test.ts`：3/3 PASS（多场景 BGM 分配与 Boss 战前商店变奏校验）
  - `tests/blind-select-presentation.test.ts`：4/4 PASS（三联折页盲注与 16 种 Boss 禁令展示校验）
  - `tests/shop-synergy.test.ts`：3/3 PASS（商店构筑微光联动检测与流派关联校验）
  - `tests/boss-card-visual.test.ts`：3/3 PASS（Boss 关卡手牌锁链封印与石灰遮罩校验）
- **CI 门禁测试（8/8 全绿）**：
  - `tests/ci-gates.test.mjs`：8/8 PASS（只读沙箱、Git 索引完整性哈希、不可篡改门禁校验）
- **生产编译与打包（Exit Code 0）**：
  - `npm run build`（`tsc --noEmit && vite build`）：0 错误通过，生成全新 `dist/` 生产静态包。
