# 大丑牌 开发交接

状态：2026-09-30，TODO P0「3D 视觉资产母版包 v1」完成，按 S → A → B 交付。只修改素材、`tools/blender/` 和归属文档；`src/`、游戏规则、加载方式与依赖未改。稳定合同见 `docs/GDD.md`，逐项用途见 TODO P0；按用户要求保留本批次勾选清单供素材验收，阶段状态已回写 ROADMAP。

## 当前工作包与已完成

- 39 个 GLB：1 张双面可变形扑克母版、5 档可换插画卡框、1 套三材质示例、11 个道具、8 个爆分词、1 个含 11 条 clip 的动画包、12 个舞台组件。
- 独立源纹理：纸张 Normal/Roughness、卡面/卡背/插画占位，以及 Holographic / 琉璃 / 鎏金的 BaseColor、Normal、Roughness、Metallic、Emissive、Mask。
- Phaser 可直接使用的 B 级资源：1920×1080 同投影三层 WebP 背景、3 套透明 16 帧/256px PNG atlas + JSON、6 张既有立绘顶部裁切的 512×512 WebP 头像。原立绘完整保留，没有六角色 3D 模型。
- 可重建源入口：`tools/blender/build_asset_pack.py`；几何与 PBR helper、Pillow 纹理/裁切/精灵表脚本及 `inspect_asset_pack.mjs` 同目录。重建命令在 TODO P0 本机工具链内，无 `.blend`、FBX 或外部素材下载依赖。
- 逐文件用途与实际参数：`public/assets/models/asset-pack-v1.json`；预览总表 `public/assets/renders/p0/contact-sheet.webp`，背景合成与头像预览同目录。没有另建说明文档。

## 验证与证据

- Blender 5.2.1 无头完整运行；A 级从源重建复测成功。GLB 全部经 gltf-transform inspect 与 Khronos validator 检查：39 个模型，0 errors / 0 warnings，UV0、法线、可替换节点与三形态键保留。
- 动画包具名 clip 恰为 11 条，每条时间归一到 0～1 秒；导出后补烘焙 Bend/Twist/Arch 曲线，弯曲峰值权重为 1，避免 Blender NLA 形态键导出仅保留末帧零值。Normal 材质补烘焙 MikkTSpace 切线，运行产物不需要几何压缩解码器。
- 新增素材约 17.08 MB（含清单、纹理、背景、预览、精灵表和头像）；三层背景分别约 0.88 / 0.42 / 0.30 MB。道具 1,532～4,476 tris，核心牌/框/动画 8,416～14,588 tris，舞台组件 4,024～14,624 tris，均在 P0 预算内。
- 本机目审了素材总表、卡正背、背景合成、六角色头像和特效 atlas；背景中/近景保留透明度，头像保留头饰、脸与肩部。
- `npm run verify`：typecheck、28 单元测试、build 通过；`npm run verify:smoke`：桌面 1280×800 与手机 390×844 选角 → 开局 → HUD 通过。这是已有游戏流程回归检查，资产接入尚未实施。

## 遗留与边界

- GLB、预渲染背景、atlas、头像均未接入游戏。Holographic/流光 Mask 留给接入时的 shader；琉璃材质带 glTF Transmission/IOR 扩展，低端渲染器可退回不透明玉色 PBR。
- 既有 6 张高清立绘约 14.3 MB 仍由 BootScene 全量加载；P1 缩略图与按需高清加载尚未做。
- 既有选角页仍为深色 UI；Phase 3 视觉统一尚未做，素材交付不代表该阶段已接入。

## 唯一下一步

主线继续 TODO 的 **Phase 2 Batch 2A：关卡骨架**，建立 RunState / StageDefinition 与三级普通关卡。P0 游戏接入和 P1 立绘加载优化另开独立批次，不夹带进当前已完成素材包。
