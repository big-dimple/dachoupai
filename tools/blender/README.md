# P0 离线资产重建

这些 Python 文件是现有 GLB 的可编辑几何源。运行游戏不依赖 Blender；保留 npm / Phaser 流程。
默认输出位于被 Git 忽略的 `shots/p0-build/`，不会覆盖 `public`。必须指定 `--only` 或 `--section`，没有隐式整包构建。

## 最小 Linux 重建

已在系统 Blender **4.3.2**、Python **3.12.14 / Pillow 12.3.0** 上验证无字体依赖的骰子；不需要安装或下载字体。
从仓库根目录执行：

```sh
blender --background --factory-startup --python-exit-code 1 \
  --python tools/blender/build_asset_pack.py -- \
  --only prop-dice --raster-python "$(command -v python3)"
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tools/blender -p test_asset_config.py
```

产物为 `shots/p0-build/assets/models/prop-dice.glb`、同目录 `asset-pack-v1.json`，以及
`shots/p0-build/review/raw/prop-dice.png`、`review/prop-dice.webp` 和联系表。
渲染采用 Cycles CPU、16 samples、固定 seed 0、AgX、640×640 RGBA，默认不降噪。
本系统 Blender 未编译 OpenImageDenoise，旧脚本强制降噪会报错；只有支持时才显式传 `--denoise`。这些预览不冒充历史降噪效果。
记录实际 Blender 版本与渲染设置；跨版本不承诺字节或像素一致。
Blender 的 Python 失败默认不一定产生非零退出码，因此自动化必须保留 `--python-exit-code 1`。

```sh
# 独立第二次生成，不重复渲染；也可用 --only prop-coin。
blender --background --factory-startup --python-exit-code 1 \
  --python tools/blender/build_asset_pack.py -- \
  --only prop-dice --no-previews --output-root shots/p0-repeat/assets
```

同一环境两次骰子重建均为 2,708 三角形、3 材质；GLB 字节哈希不同。
已核对 JSON、POSITION / NORMAL / UV 数据完全一致，仅点数球面的三角形索引排列顺序不同；
每个三角形保留绕序、循环规范化后排序，三个 primitive 的有向三角形集合完全一致。
这证明本次几何语义重复生成，不承诺 glTF 导出器的字节稳定性。

`--only` 可重复，支持 `prop-*`、`stage-*`、`word-*` 的确切名称（`--help` 列出）。
`--section s|a|b|all` 才运行历史整段流程：S 为卡牌/框/材质，A 为道具/词/动画/舞台，B 为精灵表/三层背景。
卡牌动画读取输出目录纹理，缺失时只读仓库已有 `public/assets/textures/p0`。不会读取角色或 f09 原图；头像联系表仅可通过 raster 工具显式 `--include-avatars` 生成。
整包/动画在本轮没有重建或验收；输出的未优化源 GLB 不替代已交付母版。

## 路径与发布边界

`--output-root` 是包含 `models/`、`textures/`、`sprites/`、`renders/` 的资产根，默认 `shots/p0-build/assets`。
`--review-root` 默认 `shots/p0-build/review`，拒绝放在仓库 `public/` 内（解析真实路径，包含符号链接）。
原始渲染 PNG 位于 review 的 `raw/`；预览 WebP、联系表、背景合成图始终只进 review。
只有 `background-far.webp`、`background-mid.webp`、`background-near.webp` 三张保留层进入输出资产根的 `renders/p0`。
单资产构建只转换本次渲染，避免旧 PNG 被重新带入输出。

写回发布资产必须显式指定 `--output-root public/assets` 并评审 diff；本次工作没有写回生成物。
生成器不再自动调用仓库级 `inspect_asset_pack.mjs --optimize`，该旧命令会改动 public 中整包 GLB，不能用于孤立重建。
构建清单仅描述资产和构建参数，不代表 runtime 引用或视觉批准。只读仓库验证用 `npm run verify:assets`。

## 字体和 Python

旧源使用 `NotoSerifSC-VF.ttf`，本 Linux 环境没有该原字体；系统仅有 Noto Serif CJK 的 TTC 集合。
词网格/卡面纹理必须通过 `--font /absolute/path/to/font.ttf` 或 `P0_FONT` 明确选用有许可的字体。
没有配置时会失败并说明已安装候选，不会静默替换。
若仅需检查生成流程，可以显式 `--allow-font-fallback` 接受系统 Noto 替代；脚本会打印替代警告，并将文件名、SHA-256 和替代状态写入构建清单。
TTC 使用首个 face（可能为日文字形），不声称与原简中可变字体视觉一致，不应用于未经复核的正式成品。
fallback 搜索 Windows、Linux、macOS 的常见 Noto 字体位置，不联网下载。

保留历史 [Noto Serif SIL OFL 1.1 许可链接](https://github.com/notofonts/noto-cjk/blob/main/Serif/LICENSE)；
Linux 已安装 `fonts-noto-cjk` 的许可在 `/usr/share/doc/fonts-noto-cjk/copyright`。字体文件不随仓库重分发。
显式选用其他字体时，调用者仍需保留对应许可，历史 Noto 许可不替代其他字体的许可。
无字道具和预览联系表无需该字体；联系表的英文文件名标注使用 Pillow 内置字体，不写入资产。

Pillow Python 可通过 `--raster-python` / `P0_RASTER_PYTHON` 指定，否则按 PATH 查找 `python3` / `python`。
不再访问 `USERPROFILE` 或固定 Windows Python 位置。所有生成与评审输出都可删除后按命令重建。

## 当前清单与验证

当前清单为 [`docs/assets/inventory.json`](../../docs/assets/inventory.json)；旧 `docs/production/evidence/a00-2026-10-01/` 保持历史证据，不再作为默认当前清单。
`runtimeCurrentlyLoaded=[] / NOT_OBSERVED` 表示静态盘点没有观测浏览器加载；literal、参数模板匹配和音频 JSON 间接路径分开记录，不能用 manifest 登记证明运行时消费。

```sh
npm run test:assets
npm run verify:assets
node tools/blender/inspect_asset_pack.mjs  # 默认只读
# 仅在已评审资产树/引用变更后，显式刷新当前清单：
node tools/blender/verify_assets.mjs --write-inventory
npm run build
node tools/blender/verify_publication.mjs --build-dir dist
# 短浏览器路径使用独立 e2e 构建，保留生产 dist：
npx vite build --mode e2e --outDir shots/asset-cleanup/e2e
node harness/asset-cleanup.mjs --build-dir shots/asset-cleanup/e2e --chromium-executable /usr/bin/chromium
```

浏览器脚本需要已安装 Chromium/Playwright，只走标题→选角→商店→入场；明确记录 Canvas、软件环境、请求结果，不作为真机性能测试。
导入现有骰子母版的只读实际渲染：

```sh
blender --background --factory-startup --python-exit-code 1 \
  --python tools/blender/preview_existing_assets.py -- \
  --out shots/asset-cleanup/existing-dice --only prop-dice
```

本轮[维护证据与删除清单](../../docs/assets/maintenance-2026-10-02.json)、[复建骰子预览](../../docs/assets/rebuilt-dice.webp)随 Git 保存。
默认预览和诊断仍只留在被忽略的 `shots/`。旧文件可从基线 `c90a9fc5d704874a52bddda3e4d991aef92c29fb` 恢复；回滚用正常 revert，不重写历史。
