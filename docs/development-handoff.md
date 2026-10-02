# 开发交接：dot接手

用户已要求停止扩功能，完成当前最小闭环后暂停。**接下来由dot主导美术与交互提升，参考小丑牌和炉石，优先做一张卡的完整动态体验样板；不自动启动C04.3或新玩法。** 最新决定见D32。`plan.json.currentTask`仍为C04 / IN_PROGRESS，C04.2未宣称整包验收完成；C03与C04.1已完成。

收尾基线为main `ab8f376b99c91cd1e76593c1b631d1fb9b4e8976`。原有45个已跟踪修改和12个未跟踪源/测试文件属于同一C04.2接线批次，保留并整合，没有reset、覆盖或丢弃其他人的工作。被测工作树指纹、命令、结果及发布回执见[收尾证据](production/evidence/C04-closeout-2026-10-02.json)。发布只正常提交并push main，既有自动部署链路未修改。

已实现的最小闭环：显式v10配置接共享StartRun、四难度资源/目标、十二挑战限制和节目单选择/章末奖励；选角页可选模式，普通D0仍可直接开局；模式/挑战/难度/节目单开关分别保存，恢复不重开、不重抽、不串备份。只有可写Session实际保存的standard八章胜利更新解锁记录。PG04免费换牌计次数、离店过期，不触发E12付费成长。Q02真实三槽、Q06全渠道禁换牌、Q10禁增强、Q11公开封角及旧trace快照保留。收尾修正了模式按钮被全屏控件遮挡、三槽商店提示及禁换牌时的金币提示。

v10内容hash为`json-fnv-v1:24efe7a905216d85`。真实v9及更旧存档原文保留、可导出，**不支持v9直接续局或暗迁移到v10**；开始v10新局不删除旧分区。真实v9夹具`tests/fixtures/c04-v9-checkpoint.json`未改写，SHA256 `c266fb4a2d9ac25cf145e099c1e7abca48206e1dcf3c019cbb01ee5b3fbd5900`。

本地检查：81文件/1,587单测、类型检查、生产构建、72定义内容检查通过；事件保守界320、上界92来自最多一个节目单奖励，原88/91实际计分金样未改。Chromium/Firefox/WebKit各桌面鼠标和390×740触摸短流程通过，覆盖确认/取消、购买/取消、排序、弃牌补牌与次数呼应、出牌、刷新续局、菜单锚点和双向选牌。Chromium桌面/触摸模式专项通过，覆盖锁定入口、教程跳过、节目单不接、开关分区、固定教程入桌及精确恢复。本次CI与发布结果见收尾证据；机器检查不等于美术、真机或真人验收。

尚未完成或已知限制：

- C04.3实际三步教学、搜索图鉴、跨局真实高光/历史尚未做；当前“教程”只有固定二响/固定种子/可跳的练习局，不能当成新手教学验收。
- C04.2完整故障/长流程与十二挑战自然八章体验、C04.4整包验收未完成。本候选Android/iPhone真机、实体扬声器试听、自然平衡、多人专题对标均NOT_RUN。既有A01/D22/D25真人认可有效，不扩大到本候选及未来素材。
- 生产JS约1.79MB、gzip约509KB，Vite保留大chunk提示；本轮未拆包或调整预算。构建标签仍为C03，实际规则内容为v10。模式恢复成功的信息提示可能打开菜单，可点“继续本局”关闭；提示层级与详情精致度由dot统一收敛。
- 六角色/原24张Joker插画仍是已认可范围内的候选，剩余48张Joker及功能牌/物品/Boss资源、正式分层源规格和未来批次批准仍缺；机制示意图不算正式插画。A03、B00、V01、L01保持原门禁。

启动与验证命令（Node22、npm；Windows可用`npm.cmd`）：

```bash
npm ci
npm run dev -- --host 127.0.0.1 --port 5201
npm run typecheck
npm test -- --maxWorkers=2
npm run build
npx playwright install chromium firefox webkit
npm run verify:smoke
npm run verify:content
node scripts/check-production-plan.mjs --self-test
node scripts/check-production-plan.mjs
npm run verify:ci
```

`verify:ci`是实际CI组合入口；多引擎短流程用`SMOKE_BROWSERS=chromium,firefox,webkit`。领域改动跑对应单测；只改表现不重复全仓长harness。本地生产预览用`npm run preview -- --host 127.0.0.1 --port 5202`。部署仍由用户现有自动部署负责。

素材与代码入口：

| 用途 | 位置 |
| --- | --- |
| 六东方角色原图/来源与认可 | `art/sources/p07-characters/manifest.json`及同目录PNG |
| 原24张Joker原图/来源 | `art/sources/p07-jokers/manifest.json`、`part-a/b/c.json`及PNG |
| 运行头像/选角/完整详情 | `public/assets/characters-p07`；注册`src/game/characters.ts` |
| 运行Joker缩略/完整详情 | `public/assets/jokers-p07`；注册`src/game/jokerArt.ts` |
| 戏台、卡背、基础框 | `public/assets/p03`、`public/assets/p00` |
| GLB母版/离线帧/纹理 | `public/assets/models/asset-pack-v1.json`、`public/assets/renders/p0`、`public/assets/textures/p0`、`tools/blender` |
| 舒伯特钢琴音轨/来源 | `public/assets/audio/p06/recording.json`及MP3；录音为Pixabay许可，不是CC0 |
| 逐事件演出/声音/详情 | `src/game/GameScene.ts`、`src/core/EffectQueue.ts`、`src/audio/AudioEngine.ts`、`src/game/DetailDialog.ts`、`src/style.css` |

美术方向沿用ART/D20及D22/D25：东方人物，性别/年龄/职业/表情/角度明确不同；印刷巡演牌桌，玉青、暖白、朱红、旧金共用左上暖光。扑克点数/花色由程序清晰绘制，头像独立裁切，详情完整展示立绘。参考竞品的反馈节奏与材质细节，保留npm/TypeScript/Phaser H5主线，不为复用GLB改全3D。新生图只用可证明模型身份的ChatGPT Images 2.5；未来素材批次仍需用户认可，不能自行签收。

本地遗留：忽略的`shots/`保存RED/GREEN日志、浏览器临时诊断与测试构建，`dist/`、`node_modules/`及`.codex-remote-attachments/`保留；这些不进入发布提交，未做全目录清场。没有需要另藏分支的半成品。**唯一下一步：dot选择一张现有卡，完成手机竖屏可操作、逐事件可听可看的动态样板，再决定后续美术与交互改造；本Agent收尾后暂停。**
