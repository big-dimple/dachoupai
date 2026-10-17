# Retired runtime resource cleanup

基线：`c4525b2c2faf77ad2df0b5486e0ea64276856d04`。独立分支
`dev/runtime-asset-cleanup-20261017`；最终候选 SHA 见交付回执。
本轮仅清理已确认不用的运行时副本及对应清单，不继续全历史清扫。
与已知并行 main `4b0de064` 比较，本批修改路径没有重叠；未修改商店、技能效果、
GameScene、ShopScene、规则、存档或共享计划。

## 删除清单与无引用依据

共删除 **137 文件 / 7,680,205 字节**。逐项路径、清前 SHA256、字节数及其引用依据分类
均在 [cleanup.json](cleanup.json) 的 `removed` / `evidence` 中。没有创建图片备份目录；
全部旧字节仍可从基线 Git 提交恢复。

| 退役组 | 文件 | 字节 | 依据 |
| --- | ---: | ---: | --- |
| P07 旧人物图 | 18 | 810,824 | CharacterArt/portraits/CHARACTERS 均取正式 tangsong 清单 |
| P07 旧 Joker 图 | 48 | 3,399,732 | 当前 72 ID 全由 handdrawn 覆盖；恒空旧映射一并删除 |
| handdrawn 旧六人派生图 | 18 | 495,176 | 旧角色记录没有加载消费者；新立绘清单独立有效 |
| A11/B05/C06 过期卡图副本 | 8 | 442,146 | 不在当前 outputs；历史字节由 Git 按实际哈希核验 |
| 孤立旧 C06 高光图 | 1 | 39,506 | 不在当前 72 项 ClimaxSourceArt 清单 |
| P00 磁盘牌背/边框 SVG | 4 | 8,976 | Boot 的 P00_ASSETS 使用 INK_FRAME_PATHS 内联 SVG |
| 旧奖励金币 atlas | 2 | 143,857 | RewardCoin 仅取当前手绘金币图，不加载 atlas |
| P03 旧舞台背景及清单 | 2 | 132,163 | 代码/加载表无 URL、texture key 引用；纸面舞台为程序绘制 |
| P0 评审背景 | 3 | 1,594,106 | 无生产加载引用；清理旧 pack 对应记录 |
| P0 sprite 图集 | 6 | 433,640 | 无生产 atlas/sprite 加载引用；清理旧 pack 记录 |
| P0 原型纹理 | 23 | 151,938 | 无生产 texture URL；保留的 GLB 均自包含 |
| 不再使用的 metal/chop 音效 | 4 | 28,141 | 当前 Foley 清单及 AudioEngine 队列只用新调色盘与 cloth2 |

`public/assets/textures/p0/card-back.png`（旧“丑”牌背）属于已删的 P0 纹理组。
`models/asset-pack-v1.json` 从 77 项修正为 39 个离线 GLB，不再列旧头像、纹理、sprite、
背景；P00 清单收敛为实际使用的纸纹/三个符号。handdrawn 当前清单为 75 记录 / 147 输出，
其中 72 张功能牌及 J/Q/K 不变，旧六人记录退役。

## 保留与完整性

- 当前 72 卡面、51 组工具/物品、24 份立绘派生、6 独立眼图、所有 72 高光项、
  J/Q/K、当前纸纹/符号、字体、金币、5 首音乐及在用 Foley/cloth2 均保留。
  从实际 API 导出的加载 URL 有对应文件；366 个在用文件清前后原始字节指纹完全相同。
- 六份 `focus` 图仍由 `HeroClimaxStage` / `StageImageWarmup` 用作独立眼图失败回退，
  保留。没有用旧人物占位图替代回退。
- 39 个原始 GLB 保留且哈希不变，已核 images/buffers 无外部 URI；它们仍由现有 Vite
  规则排除发布副本。`art/sources` 及唯一原画原字节未修改、移动或复制。
- B05/C06 的四个历史输出标记 `outputsCommit=c4525b2...`。普通来源检查明确报告
  Git 历史输出待核数；`--git-history` 实际读取 Git 对象，四项均核验通过，无待核项。
  历史角色九项/原 60 记录指纹仍从既有归档验证，不要求废弃文件继续占用 public。

## 验证与体积

- PASS：10 文件 / **96** 项相关回归；资产工具 **6** 项测试，包含缺文件、坏 hash、
  错尺寸、越界、非法清单、SVG 实际内容篡改等失败反例。
- PASS：显式刷新当前 `docs/assets/inventory.json` 后，独立运行只读
  `npm run verify:assets`，423 文件一致；历史 A00 清单未改。
- PASS：`node scripts/handdrawn-provenance.mjs --check --git-history`，72 当前来源、
  74 原图、147 输出、16 receipt、4 历史 Git 输出完整通过。
- PASS：`npm run build`（TypeScript + Vite），保留已有 chunk 大小警告。
  构建产物逐文件验证 366 个在用文件与源字节相同，137 个退役文件全部不在产物中。

本轮修正资产审查将字符串拼接目录前缀当成“缺失文件”的误判，目录仅列作参数化证据，
不冒充实际请求；完整文件字面路径仍严格验存在性。文本清单/SVG/许可证采用 LF 内容身份，
避免 Windows CRLF 造成假漂移，二进制图片及音频继续验证原始字节。没有改图片质量。

| 实际完整 Vite 产物（未压缩文件字节） | 清理前 | 清理后 |
| --- | ---: | ---: |
| 文件数 | 526 | 389 |
| 字节 | 45,173,017 | 37,469,485 |

发布产物减少 **7,703,532 字节**；这包含退役文件、过时元数据及死映射的变化。
20,000,000 字节目标仍为 **FAIL（既有超限）**。在用文件原字节保持，没有为预算删除在用资源。
测试基于上述 HEAD 的明确工作区变更，最终提交与被测文件一致；详细机器数据见 cleanup.json。
未运行浏览器、长局、物理设备、CI、部署或 main 合并。
