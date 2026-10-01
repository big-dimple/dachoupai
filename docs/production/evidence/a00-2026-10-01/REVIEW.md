# A00 旧资产技术盘点与视觉待审

采用 Astra 独立分支 `art/A00-inventory` 的 `66f92b7`、`30600c2` 产物，工程接入基线为 `99cc43093c575cbc2a290b8f6763120a23cc4d3a`。原渲染/盘点证据仍对应 `abb62eefba1d20f6a9e3621fc52495342ea80679` 的原资产与当时未提交工具；安全默认补充检查基于准备提交 `66f92b7468cafa902d3846379ee6285e3c1b1d97`，见 cli-safety.json，不改写旧被测 SHA。正式工程检查与任务关闭另见 A00 证据指针。本文记录素材处置，不授权 A01 或量产。所有来源/商用权为 **UNKNOWN**，视觉批准 **NOT_GRANTED**，发布白名单为空。原图、GLB、旧 manifest 与游戏规则均未改；工程另接入 npm/CI、测试框架边界及计划交接。

## 可定位的盘点与预览

[inventory.json](inventory.json) 覆盖 `public/assets` 实际 **137 个文件**，逐项给出相对路径、实际像素/alpha、字节、SHA-256、用途、预览格号、制作来源声明、技术/视觉/接入状态、裁切/安全区和处置建议。GLB 本身没有像素宽高（填 null）；嵌入纹理另列实测尺寸，新的离线预览为 320×320。旧 `asset-pack-v1.json` 只列 130 项：漏六原图，另未计自身。全部 136 个视觉资源有联系表位置；manifest 是元数据，不伪造视觉评分。

| 实际类别 | 文件数 | 字节 | 说明 |
| --- | ---: | ---: | --- |
| 六原图与六头像 | 12 | 14,586,526 | 原图均 1086×1448、不透明；头像均 512×512、不透明 |
| GLB + 旧 manifest | 40 | 13,199,691 | 39 GLB 全部实际导入/校验/渲染 |
| 旧离线 renders | 56 | 2,995,196 | 含四背景、单帧动画预览及历史联系表 |
| 三 atlas PNG + JSON | 6 | 433,640 | 1024×1024 RGBA，16 格×256，每格已观察 |
| 纹理通道 | 23 | 151,938 | 卡面/占位画、纸张、虹彩/玻璃/金属材质通道 |
| 总计 | 137 | 31,366,991 | 不是合格发布包 |

联系表：

- [六原图](characters-original.webp)、[六头像 128px](characters-avatar.webp)、[64/48 CSS px 头像](avatars-64-48.webp)。最后一张按原生像素查看，勿放大后宣称手机可读。
- [38 个静态 GLB 新渲染](glb-static.webp)、[11 clips × 5 采样帧](glb-animation-samples.webp)、[弯曲斜视](bend-oblique.webp)。[翻面](clip-flip.webp)和[弯曲](clip-bend.webp)是五个采样帧组成的循环预览，每帧停留 250ms；不是完整逐帧 30fps 验收。
- [白底/深底透明边抽检](alpha-light-dark.webp)、[48 格 atlas](atlas-frames.webp)、[23 纹理](textures.webp)、[旧渲染/背景](existing-renders.webp)。旧 `animation-*.webp` 是单帧，不把它当已经播放过动画的证据。

## 实际布局依据与复用判断

已打开 R05 固定证据的 [1280×720 牌桌](../r05-2026-10-01/layout/table-1280x720.png) 与 [390×844 牌桌](../r05-2026-10-01/layout/table-390x844.png)，证据对应 R05 SHA `4227bca813a4d478f9685c260745a884c0b4997e`，不是本次新运行的界面。原截图 DPR=2。其 `layout.json` 实测手牌首张可点宽分别 112 和约 36.29 CSS px，高 126；源码布局的完整牌宽为 112，手机前七张被叠放遮挡。五个 Joker 槽约为桌面 183.2×88、手机 66.8×68 CSS px。当前选角/HUD 头像 64px，紧凑竖屏 HUD 48px，正文 14px。金样必须保留这些信息密度，不能拿孤立大图评审。

六原图偏精细国风插画，场景/服饰信息密集，与拟定印刷纸质语言有差距。阿默/老幻同为浅脸黑白长袍，阿燥/二响同为暖红市井少年；骰爷的银发蓝光较好区分，但不符合卷袖市井 brief。谢幕人红幕黑金能区分色组，长衣与金饰仍重复。头像小尺寸显示了较多肩胸背景，脸占比偏小；阿默尤其与浅底接近。现有原图高度 1448，小于新可编辑源规格 1536，且无主体分层。处置：原图**仅保留源**，头像**需重加工**，不提前重画六人。此轮只审构图/小尺寸识别，未逐像素完成人体、伪字、水印、品牌/相似角色取证，相关检查仍 **NOT_RUN**。

GLB 结论来自实际导入的新渲染：

- 扑克牌母版、骰子、方孔币可作为**直接复用的离线几何候选**；不代表材质、牌面、许可或发布获准。纸牌正背面/厚度存在；骰子可见三面点数清楚，背面未逐面目审；币高光较宽、细浮雕小图消失。
- 其余道具/舞台形体可辨，红/玉/金及云纹重复；倾向**需重加工**，降低金属反光并按 UI 用途裁切。金属球和铃有宽亮高光，虹彩球饱和偏高。39 模型均保持离线源，不为复用它们引入 runtime 3D。
- 五个旧框均依赖金边、彩边和小角饰，史诗/传说/特殊还共享冠形；缩至 66.8px 槽位时不支持三档的明确非颜色符号区分。中央「画」字是占位。全部**需重加工**。
- 八个固定词模型（及旧预览）字样在当前联系表可辨，但卷曲金饰跨近字形；不满足任意数值/本地化文字需求。**仅保留源**，重要中文和数字用程序字体，不批量渲染固定字 UI。
- `flip`/`spin` 有正面、侧面、背面；斜视 `bend` 中段确有弯曲。`burn`/`ink`/`gold-dust` 是牌骤缩后离散粒子，`split` 碎片可见。`draw`/`throw`/`knock-away` 在固定相机中出画，不能直接打成固定格 atlas；需重设包围框/留白。没有用相机跟随掩盖出画问题。完整帧连续性、Phaser 事件时序、触摸遮挡仍 **NOT_RUN**。

四背景均 1920×1080，far/composite 不透明，mid/near 有 alpha。两侧帘幕、屋檐和中央屏风在竖屏中心裁切会丢失侧边主体且侵入信息区；**需重加工**，桌面/手机单独裁切。三 atlas 每项 16 帧、JSON 30fps/straight alpha；逐格可见放射线、云线和金环粒子，浅底下后两者偏弱。非零 alpha 到格边的最小实测距离分别 hit=26、play=18、score=25px；有透明边距，但未声明挤出 padding，双线性/缩小采样仍待 runtime 检查。白/深底四样本未见大块不透明矩形边，不能据此宣称全部目标设备 alpha 已通过。

旧到新 rarity 的**资产整理建议**（不修改现有内容规则，也不代表视觉通过）：

| 旧框文件标签 | 新三档用途候选 | 必要修改 |
| --- | --- | --- |
| common | common | 减掉常态金边，保留简单纸边 |
| rare | uncommon | 一处非颜色纹样/材质区别 |
| epic / legendary | rare | 合并候选母版，明确徽记；不把两个旧等级写进规则 |
| special | 独立增强/表面层 | 不新增第四档 rarity，不能替代三档标识 |

## 首屏、解码和接入预算

当前实际加载入口 `src/game/portraits.ts` 为六头像：合计 **301,066 B**，保守 RGBA 解码 **6 MiB**。原图 URL 映射仍保留在 `characters.ts`，当前 loader 不预载原图；GLB/背景/atlas 未被当前 loader 引用。当前头像 512 输出大于 64 CSS px、DPR≤2 所需的 128px，后续按清晰度实测提供 128/256 变体，不同时加载两档。本次不重导出运行时文件。

`npm run build` 实际通过，实测整个 dist **32,684,890 B**；Vite 复制全部 public 资产，源图/GLB/预览尚未从发布包排除。**20 MB 发布预算不通过**。全部栅格若同时解码，RGBA 估算 **225,572,800 B（215.12 MiB）**，超过 96 MiB 初始纹理预算；这是假设同时加载的压力量，不是当前游戏实测显存。源 GLB 内嵌纹理还未计入此栅格总额。

QUALITY 的第一交互前≤4 MB、10Mbps/RTT80ms、20次冷启动≤4秒 P95、真机帧时/显存：本次 **NOT_RUN**，不能由头像字节直接判定首屏通过。白名单在盘点文件中冻结为空；仍需工程 A02 把实际构建与注册表白名单接起来，本分支不改变打包器。

## 只读校验与证据边界

`node tools/blender/verify_assets.mjs` 已实际 PASS，137 项逐文件解码/哈希、39 GLB Khronos **0 错误/0 警告**、上限三角数、UV0/法线、clips、atlas 边界与 alpha 合同均核对。没有最低三角数要求。默认只输出 stdout、不写 manifest、不优化模型、不向源码目录写日志。输出见 [verify.txt](verify.txt)。

先加反例再实现：首次测试实际因校验模块不存在退出 1；跨平台反例又实际捕获 JSON 的 CRLF 导致误报（退出 1），随后为 JSON 添加 LF 规范化身份，同时保留原文件实际字节/hash。对比 Git HEAD 使用 checkout filters，原资产 137 项及受保护源码均相同；详见 run-record。实现后 [negative-tests.txt](negative-tests.txt) 记录尺寸宽/高、alpha、hash、错误 clip、缺文件、未批准白名单、新增资源表达式、未列资产、逃逸路径、JSON 实际内容变化共十一类拒绝，CLI 均实际退出 1，健康 fixture 与仅换行变化退出 0，原始图片字节不变。引用检查是 `src` 中带 `assets/` 的字符串表达式快照，**不是完整数据流或构建产物/网络审计**；绕过该语法的动态 URL 必须由 A02 runtime 检查补齐。

`inspect_asset_pack.mjs` 现已默认委托同一只读验证，不建日志目录、不改 manifest/GLB，不设最低三角数。隔离 fixture 先复现旧默认把 manifest 从 14 B 改成 334 B（[失败证据](cli-safety-red.txt)）；修复后默认健康输入退出 0、一三角 GLB 原字节不变、合同损坏退出 1 且不修补输入。两个 CLI 的未知参数、缺失 `--root` 值、重复 root、额外位置参数及混合写参数均退出 2，见 [通过证据](cli-safety-green.txt)。实际 137 原资产的调用前后 hash 与命令退出码见 [cli-safety.json](cli-safety.json)。

制作脚本 `build_asset_pack.py` 确实消费 `inspect_asset_pack.mjs --optimize`，因此保留该**严格单参数显式写模式**，写 manifest/GLB/制作日志；制作模式同样移除最低三角数门槛，但不改源资产制作脚本。只在隔离空清单 fixture 验证写入口，未对现有模型运行优化或重建，完整制作链本轮 **NOT_RUN**。工程已接入 `verify:assets` 与 `test:assets`，纳入 `verify:ci` 的 domain 作业；现有 R06 已声明全部直接工具依赖，未借用未声明的传递依赖。Vitest 只发现 `tests/` 的游戏套件，资产 Node CLI 套件由 `test:assets` 实际执行。

工具：Node 22.20.0；Blender 5.2.1 LTS（`9e2066aef7ef`，Cycles 8 samples、AgX、320×320）；Python 3.12.14；Pillow 12.3.0；sharp 0.35.5；gltf-validator 2.0.0-dev.3.10。现有主工程 lock 安装的 glTF-transform core/extensions/functions 4.5.1、mikktspace 1.1.1 已告知 R06。这里只依赖 sharp/validator 进行检查，游戏运行无需 Blender/Python。

便携调用（使用环境变量，不把本机盘符写成代码要求）：

```powershell
# BLENDER 指向任一经验证的 Blender 5.2.1 可执行文件；ASSET_PYTHON 指向带 Pillow 的 Python。
& $env:BLENDER --background --factory-startup --python tools/blender/preview_existing_assets.py -- --out shots/a00-render
& $env:BLENDER --background --factory-startup --python tools/blender/preview_existing_assets.py -- --out shots/a00-oblique --only card-animation --oblique
& $env:ASSET_PYTHON tools/blender/asset_contact_sheets.py --renders shots/a00-render --oblique shots/a00-oblique --out shots/a00-contacts
node --test tools/blender/verify_assets.test.mjs
node --test tools/blender/inspect_asset_pack.test.mjs
node tools/blender/verify_assets.mjs
node tools/blender/inspect_asset_pack.mjs
```

[render-log.json](render-log.json) 对应这次新 GLB 导入的 93 张临时渲染，原始帧位于忽略的 `shots/`，仓库只保留紧凑联系表和两段采样预览，未提交重复原始帧。首次联系表运行遇到 Windows 默认 GBK 读 JSON 失败，已显式改 UTF-8 并成功重跑；没有把失败当成功。命令、退出码、工具/输入摘要见 [run-record.json](run-record.json)。

A01 仍须 V01 与 A00 门禁、真实牌桌金样和明确批准；未获批准不扩角色、不扩卡、不制作整套背景。用户真机/美术签收由用户执行，本报告不代签。实际任务状态只见 plan/handoff；本报告的技术检查不能关闭真人或美术门禁。

## 主工程接纳记录（2026-10-01）

主 Agent 已审真实 diff 与日志后接纳本工作：package 增加 `test:assets`/`verify:assets` 入口；新增 `vitest.config.ts` 把 Vitest 限定到 `tests/`（红证据见 red-npm-entry.txt、red-runner-discovery.txt：此前 `npm test` 误发现 node:test 资产套件并失败、`verify:assets` 无 npm 入口）。

盘点冻结后 P00/P01 新增了 29 个运行时候选文件（8 个手写 SVG 套件、2 个套件 manifest、12 个角色头像/胸像 WebP 与 manifest、6 个 Joker 卡面 WebP 与 manifest）。接纳时通过一次性脚本复用 `inspectAsset` 实测字节/哈希/像素并按原 schema 扩展 `inventory.json` 至 166 项，刷新 `sourceReferences` 快照与 `runtimeCurrentlyLoaded`（Boot 预载 8 SVG + 3 Joker 缩略 + 6 头像；胸像与 512 详情懒加载），全部仍为 visualApproval NOT_GRANTED / rightsStatus UNKNOWN / releaseEligible false，发布白名单保持为空。P00/P01 各自 manifest 声明的字节/SHA-256 与实际文件逐项交叉核对一致。扩展脚本为一次性用途，运行后已删除；旧 137 项资产与工具字节未改。

接纳实跑：`verify:assets` 扩展前 FAIL（29 项未列 + sourceReferences 变化）→ 扩展后 PASS exit 0（[adoption-verify.json](adoption-verify.json)）；`test:assets` 3 通过 exit 0（[adoption-test-assets.txt](adoption-test-assets.txt)）；`npm run build` PASS exit 0（[adoption-build.txt](adoption-build.txt)）；全量 Vitest 27 文件 235 通过（[adoption-vitest.txt](adoption-vitest.txt)，Node 22.20.0 `C:\Program Files\nodejs\node.exe`）。环境备注：本机默认 `node` 是 Kimi Electron  shim（process.execPath=Kimi.exe），`tests/ci-gates.test.mjs` 的 4 个门禁夹具在该 shim 下因子进程与临时目录清理报 EPERM 失败；换用独立 Node 22.20.0 后 7/7 通过。该失败为运行环境差异，非代码回归；CI/评审请使用真实 Node。

任务状态与证据指针以 plan/handoff 为准；本接纳不授予 A01 视觉批准、不解除 V01 真人门禁、不授权量产。
