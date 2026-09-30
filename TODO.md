# TODO

> 本文件只放“下一步要做什么”，按优先级排序。已完成事项回写到 ROADMAP.md，避免 TODO 越积越乱。
> 每个批次开头写清背景与验收标准，方便换模型 / 换 session 直接接手。

## P0：3D 视觉资产母版包 v1（已交付；保留勾选清单供素材验收）

> 这批资源可以提前并行制作。目标是服务 H5 的 2.5D 表现，不追求全 3D 游戏。
> 本批次只产出素材文件，不改代码；接入是后续单独批次。
>
> **风格硬约束**（违反即返工）：明亮东方戏台气质，主色朱红、鎏金、玉青、米白、竹绿、绛紫
> （详见 `docs/GDD.md` 视觉方向）；禁止“西方暗黑赌场 + 哥特小丑”基调；
> 版权：原创或明确可商用的 AI 生成素材，禁止抓取第三方版权素材（AGENTS.md 红线）。

### S 级：优先完成
- [x] **3D 扑克牌母版** — `public/assets/models/poker-card-master.glb`，用于换卡面、翻转与弯曲演出。
  - 正面 / 背面 / 侧边厚度
  - 正确 UV
  - 可弯曲、可翻转、可轻微扭曲
  - 纸张 Normal / Roughness
  - 金属描边
  - 卡面插画可替换
  - 输出 GLB + 正背预览图：`public/assets/renders/p0/poker-card-master.webp`、`poker-card-back.webp`
- [x] **大丑牌 5 档卡框母版** — `public/assets/models/joker-frame-{common,rare,epic,legendary,special}.glb`，用于五档稀有度；`ReplaceableIllustration` 与边框独立节点。
  - 普通 / 稀有 / 史诗 / 传说 / 特殊
  - 插画区域可替换
  - 稀有度框架可替换
  - 预留 Holographic / Emissive / 流光 Mask
- [x] **Holographic / 琉璃 / 鎏金材质套件** — `public/assets/models/material-kit.glb` 为 PBR 示例；`public/assets/textures/p0/{holographic,glass,gilded}-*.png` 为独立源通道，Mask 供后续 UV 流光 shader 使用。
  - BaseColor
  - Normal
  - Roughness
  - Metallic
  - Emissive
  - Mask

### A 级：爆分与演出资源
- [x] 东方 3D 小道具包 — 以下 GLB 均在 `public/assets/models/`，可独立实例化；对应预览在 `public/assets/renders/p0/`。
  - [x] 铜钱 — `prop-coin.glb`：方孔金属铜钱，用于金币掉落。
  - [x] 金锭 — `prop-gold-ingot.glb`：舟形元宝，用于奖励爆发。
  - [x] 玉牌 — `prop-jade-plaque.glb`：玉牌、红穗与金纹，用于稀有奖励。
  - [x] 骰子 — `prop-dice.glb`：对面和为七的标准六面点数，用于骰爷演出。
  - [x] 印章 — `prop-seal.glb`：朱红印座与玉柄，用于确认/命中。
  - [x] 铜铃 — `prop-bell.glb`：中空铃体、吊环与铃舌，用于连锁反馈。
  - [x] 面具 — `prop-opera-mask.glb`：原创戏曲彩绘面具，用于角色身份演出。
  - [x] 扇子 — `prop-fan.glb`：折扇纸面与竹骨，用于借东风。
  - [x] 小锣 — `prop-small-gong.glb`：锣面与槌，用于命中反馈。
  - [x] 酒碗 — `prop-wine-bowl.glb`：玉青口沿的米白碗，用于市井场景。
  - [x] 纸符 — `prop-talisman.glb`：微卷米白纸与原创朱砂符线，用于施法粒子。
- [x] 3D 爆分字 / 词母版 — 以下 GLB 均在 `public/assets/models/`，鎏金凸字与朱红底牌可换材质。
  - [x] ×2 — `word-times-2.glb`：二倍倍率弹字。
  - [x] ×4 — `word-times-4.glb`：四倍倍率弹字。
  - [x] 暴击 — `word-critical.glb`：高热度命中弹字。
  - [x] 满堂彩 — `word-full-house.glb`：成组牌型触发弹字。
  - [x] 借东风 — `word-east-wind.glb`：顺子/同花效果弹字。
  - [x] 全场失控 — `word-out-of-control.glb`：爆分峰值弹字。
  - [x] 大吉 — `word-good-fortune.glb`：幸运奖励弹字。
  - [x] 翻倍 — `word-double.glb`：最终倍率触发弹字。
- [x] 卡牌动画模板 — `public/assets/models/card-animation-templates.glb` 包含以下 11 条独立具名 clip，每条 1 秒、30fps；以卡牌形态键与节点变换实现，不依赖游戏计分。
  - [x] 翻牌 — `flip`：正反面 180° 翻转。
  - [x] 抽牌 — `draw`：从左侧牌堆滑入。
  - [x] 扔牌 — `throw`：弧线抛出并旋转。
  - [x] 弹起 — `bounce`：弹起与轻微拉伸。
  - [x] 旋转 — `spin`：完整 360° 自旋。
  - [x] 弯曲 — `bend`：Bend/Twist/Arch 形态键起伏。
  - [x] 被击飞 — `knock-away`：加速离场与翻滚。
  - [x] 裂开 — `split`：保持原卡 UV 的八块裂片分离。
  - [x] 燃烧 — `burn`：卡牌缩退与自发光火粒上升。
  - [x] 化墨 — `ink`：卡牌缩退与墨粒散开。
  - [x] 化金粉 — `gold-dust`：卡牌缩退与金粒爆散。
- [x] 东方舞台模块化组件 — 以下 GLB 均在 `public/assets/models/`，使用统一米制、Y 向上坐标，可组合为舞台场景。
  - [x] 戏台 — `stage-stage.glb`：朱柱、玉瓦、木阶与云纹台裙。
  - [x] 屏风 — `stage-screen.glb`：三折米白纸屏与金格云纹。
  - [x] 木质牌坊 — `stage-wood-arch.glb`：东方飞檐、朱柱与鎏金箍。
  - [x] 灯笼 — `stage-lantern.glb`：红丝灯、金骨与灯穗。
  - [x] 铜锣 — `stage-gong.glb`：悬挂锣面、锣槌与红木架。
  - [x] 鼓 — `stage-drum.glb`：红鼓身、米白鼓皮、金钉与鼓架。
  - [x] 布幔 — `stage-drape.glb`：有厚度的褶皱红丝幔与金边。
  - [x] 香炉 — `stage-censer.glb`：三足双耳炉与香条。
  - [x] 桌椅 — `stage-table-chairs.glb`：红木桌与双椅组合。
  - [x] 酒坛 — `stage-wine-jar.glb`：绛紫釉坛、红布盖与米白标签。
  - [x] 云纹地台 — `stage-cloud-plinth.glb`：玉青台基与米白云纹面。
  - [x] 未来东方霓虹牌坊 — `stage-neon-arch.glb`：传统飞檐配玉青/绛紫 Emissive 灯管。

### B 级：2D 直出资源（Phaser 立即可用）
- [x] 东方戏台主背景 1 套 — `public/assets/renders/p0/background-{far,mid,near}.webp`：1920×1080 同投影三层，远景不透明、中/近景透明，中央留白可用于选角与牌桌；`background-composite.webp` 为合成预览。
- [x] 出牌 / 命中 / 爆分特效 3 套 — `public/assets/sprites/p0/{play-ruyi,hit-cinnabar,score-gold}.{png,json}`：透明 4×4 精灵表，每套 16 帧、单帧 256px、30fps，JSON 可直接供 Phaser `load.atlas` 使用。
- [x] 六角色头像特写 512×512 — `public/assets/characters/{amo,touye,laohuan,erxiang,azao,xiemu}.avatar.webp`：按既有焦点裁切立绘顶部头肩，供 HUD/商店使用；高清原图保留。

### 资源交付规范
- [x] 源模型优先交付 **GLB** — 39 个独立 GLB，运行时无 FBX、Meshopt 或 Draco 解码依赖。
- [x] 纹理优先 **WebP / PNG** — 独立 PNG 源通道与 WebP 预览/背景/头像，可编辑和复用。
- [x] 动画若做预渲染，提供透明背景序列 — B 级提供直 Alpha PNG 精灵表与逐帧 atlas；A 级提供 GLB clip，WebP 仅为姿态预览。
- [x] 必须同时交源资源与游戏可用版本 — `tools/blender/build_asset_pack.py`、`asset_geometry.py`、`make_raster_assets.py` 为可重建源脚本，独立源纹理与 GLB/精灵表一并交付。
- [x] 目录按本机约定交付 — 源脚本在 `tools/blender/`，GLB 在 `public/assets/models/`，其余在 `public/assets/{textures,renders,sprites}/p0/`；头像与原立绘同目录。
- [x] 素材总新增体积 ≤ 20 MB；单张背景 ≤ 2 MB — `tools/blender/inspect_asset_pack.mjs` 对实际字节数执行硬门禁，包含预览、纹理、精灵表和新增头像。
- [x] 素材清单与本清单一一对应 — 本批次逐项附用途；`public/assets/models/asset-pack-v1.json` 逐文件记录用途、尺寸、面数、节点和校验结果，不另写说明文档。

### 本机工具链（已装好，直接可用）
- **Blender 5.2.1 LTS**：`D:\tools\blender-5.2.1-windows-x64\blender.exe`，支持无头跑 Python 脚本批量产资产：
  `"D:/tools/blender-5.2.1-windows-x64/blender.exe" --background --factory-startup --python tools/blender/make_cube_demo.py`（示例脚本在仓库 `tools/blender/`，新脚本照此约定放同目录）
- **gltf-transform**：`npx gltf-transform inspect <glb>` 检查、`npx gltf-transform optimize in.glb out.glb` 压缩（Meshopt + 纹理压缩一条龙）
- **Playwright 冒烟**：产出的素材接入后跑 `npm run shot` 截图目审
- **母版包重建**：`& 'D:\tools\blender-5.2.1-windows-x64\blender.exe' --background --factory-startup --python tools/blender/build_asset_pack.py -- --section all`（PowerShell）。脚本自驱调用本机 Pillow Python、生成 S→A→B、无损去重并逐 GLB inspect/校验；`--section s/a/b` 可分批重建，`--raster-python` 可覆盖 Pillow 解释器。
- **母版包复检**：`node tools/blender/inspect_asset_pack.mjs`；直接 inspect 示例：`npx gltf-transform inspect public/assets/models/card-animation-templates.glb`。

### H5 性能预算
- [x] 普通道具：约 500～5,000 triangles — 道具均在预算内，可用于 H5 实例化。
- [x] 核心卡牌：约 5,000～15,000 triangles — 母版、五档框和动画包均在预算内，保留变形拓扑。
- [x] 单个场景组件：约 2,000～20,000 triangles — 12 个组件均在预算内，静态部件按材质合并减少 draw call。
- [x] 普通纹理：512 / 1024 — 材质通道与占位插画为 512，精灵表为 1024。
- [x] 核心卡牌纹理：最高优先 2048 — 正反卡面采用 1024，足够母版展示且便于替换。
- [x] 非必要不使用 4K 纹理 — 没有 4K，减少 H5 显存与传输成本。
- [x] 不引入 FBX 作为浏览器运行时依赖 — 所有 3D 运行产物均为标准 GLB。

### 角色 3D 约束
- [x] 当前阶段**不要制作六角色完整 3D 模型** — 只裁切六张既有 2D 头像，未制作角色网格。
- [x] 角色优先采用：高质量 2D 立绘 + 局部骨骼/Live2D + 3D 环境/粒子 — 本包提供环境/粒子并保留既有立绘；局部骨骼/Live2D 属后续接入范围。
- [x] 角色风格允许大杂烩 — 原角色差异完整保留，环境同时提供传统与未来东方组件。
- [x] “大丑”是称号与反差感 — 面具为独立戏台道具，没有把六角色统一成小丑装。

## P1：角色立绘资源压缩（工程任务，任意模型可接手，可与 P0 并行）

**背景**：`public/assets/characters/` 下 6 张 PNG（1086×1448，合计约 14.3 MB），BootScene 开局一次性全部预加载。桌面无碍，H5 手机首次打开明显受网络影响。原图必须保留（GameScene HUD 与后续高清展示要用）。

**做法**（建议，可改进但需说明理由）：

- [ ] 生成一套选角页缩略图（建议 WebP，宽度约 512px 即可，命名如 `amo.select.webp`），放进 `public/assets/characters/`
- [ ] 选角页（`queuePortraitLoads` / `CharacterSelectScene`）改加载缩略图；玩家选定角色后，GameScene 启动时再加载对应角色高清原图
- [ ] BootScene 不再全量预加载 6 张高清图
- [ ] 注意 `import.meta.env.BASE_URL` 拼路径的约定（见 AGENTS.md「资源与路径」），裁切对焦配置 `portraitFocusX/Y` 原样复用
- [ ] 可选：高清 PNG 本身也压一遍（lossless 或高质量有损），但不破坏画质前提

**验收标准**：

- 选角页首屏资源总量从 ~14 MB 降到 ~1 MB 量级
- `npm run verify` 全绿；选角页加载、选定角色进 GameScene、HUD 头像显示均正常
- 桌面 + 手机触摸均可完成选角流程

## 当前批次：Phase 2 — 完整一局

### Batch 2A：关卡骨架
- [ ] 建立 RunState / StageDefinition
- [ ] 3 个普通关卡，目标热度逐级提高
- [ ] 关卡完成后进入明确的过场状态
- [ ] Seed 必须决定关卡相关随机内容

### Batch 2B：商店与构筑
- [ ] 金币奖励
- [ ] 商店展示 3 个候选大丑牌
- [ ] 购买 / 刷新
- [ ] 最多 5 个装备槽
- [ ] 商店随机必须使用 SeededRng
- [ ] 无法购买时按钮状态清楚

### Batch 2C：Boss 与结算
- [ ] 1 个真正改变规则的 Boss，而不是只加目标分
- [ ] Boss 规则写入独立定义
- [ ] 胜利 / 失败结算
- [ ] 六角色开场、胜利、失败台词

## Phase 3 设计约束
- 东方色彩优先：朱红、鎏金、玉青、竹绿、米白、绛紫。
- 禁止六个人都用长飘带/层层披帛做主要轮廓。
- 每个角色必须有不同服装结构和道具轮廓，例如短打、圆领袍、戏服、侠装、商贾装、礼服等。
- 避免“西方暗黑赌场 + 哥特小丑”作为主视觉。
- 选角页现为 `#090711` 深色背景，Phase 3 统一改为明亮东方戏台 UI 时一并处理。
