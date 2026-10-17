# 青出于蓝用户原画替换

基线 `f81724b57736c7d4f299cf1d95705a7ba3ef9497`；独立资源分支 `dev/qingchuyulan-art-20261017`。不包含51张工具图或文档分支的提交，不改牌效果、名称、数值、规则身份、存档或其他原画。

## 实际映射与原图

- 不可变 ID：**`c06`**；当前展示名“青出于蓝”，领域定义仍为“越染越深”。映射依据 `src/game/tangsongCardNames.ts`、既有 runtime 注册和今日前半原画 receipt 的 `30_c06_青出于蓝.jpg`，没有按旧名猜 ID。
- 用户新交付 `青出于蓝.png`，1122×1402，3,937,366 字节。原字节归档到 [c06-qingchuyulan-original.png](../../../../art/sources/qingchuyulan-art-20261017/c06-qingchuyulan-original.png)。SHA-256：`7b530adb5ede95719ad37f4813e90f0ad42faa657763b7f5c60152a3f3b963e9`，与用户文件全同。
- 已实际查看新原图和旧卡面像素，图义为蓝染师徒；新图有青年举深蓝纹布、师长、染缸/蓝草与完整金边。另查看了缩略、高清和高光派生像素，保留完整构图。
- [独立来源清单](../../../../art/sources/qingchuyulan-art-20261017/manifest.json)保存原图、原始SHA、像素核对和旧/新派生映射；旧批原图和 receipt 不改写。runtime 的 `replacementSource` 指向本次来源，旧 sourceCommit 仅保留历史沿革。

## 活动派生与缓存

|用途|新路径（public/ 下）|尺寸|字节|
|---|---|---|---|
|缩略图|`assets/handdrawn-p08/cards/c06-v3-45e28c8be0e9.thumbnail.webp`|128×160|8492|
|高清图|`assets/handdrawn-p08/cards/c06-v3-2cac9ea20520.detail.webp`|615×768|155372|
|高光来源图|`assets/handdrawn-climax/c06-8658c7e678da.webp`|320×400|54670|

缩略/高清沿现有 Sharp WebP 80/78、effort 6 管线，使用 contain 完整采样，不 cover 裁主体或边框。沿既有高光管线从当前高清图产生同ID的320×400可选图，低于96 KiB上限。现有加载器还在URL追加各自完整SHA参数，新路径和哈希共同避免暖缓存继续读取旧图。启动尺寸/解码预算没有增加。

`build-climax-source-art.mjs` 增加 `--id c06` 单卡模式，仅更新c06，不重导其余71张。旧c06派生文件作为前版保留，当前清单只选新图。

## 本地验证与未验范围

- `node scripts/replace-qingchuyulan-art-20261017.mjs --check`：原图SHA、完整构图派生字节及活动清单重建相同。
- `node scripts/build-climax-source-art.mjs --check --id c06`：单卡高光重建相同，来源SHA与当前高清一致。
- `vitest run tests/handdrawn-art.test.ts tests/joker-art.test.ts tests/source-stage-art.test.ts`：36项通过；覆盖当前来源替换、全部runtime字节/哈希、版本URL及高光同ID保护。
- `npm run build`：TypeScript与生产Vite构建通过；保留已有大bundle警告。
- [资源审计](asset-audit.json)：用户原图SHA、其他卡图/高光清单项不变、src及工具图目录不变，构建产物对应当前派生。
- 初检发现旧c06字节期望待更新，以及三份旧receipt因Windows检出CRLF导致原始SHA不符；本次改为显式c06替换来源，旧receipt只恢复到Git保存的原始字节，不提交修改。构建初检的稀疏依赖缺失及测试可选字段类型已解决；没有放宽图像哈希或机制断言。

**远端视觉验收：待验。** 本地只做图像目审、必要资源单测/重建和构建，没有重跑长局或浏览器截图矩阵，没有访问远端游戏、CI或部署，不以本地软件检查代签用户运行观感。
