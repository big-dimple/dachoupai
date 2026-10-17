# B05 凤鸣朝阳：替换截断原图

基线及来源管线：`2229b4cb22da230cda241d7cd414e6726a4c1d7d`。
原图/receipt 已先归档到真实提交 `70340cc590a22882948490e6276808b9d12cca70`；
运行时 `currentSource.receiptCommit` 指向该提交。最终开发提交 SHA 见交付回执。

## 认图与 ID

用户文件名是 `风鸣朝阳.png`。实际检查展示字典 `tangsongCardNames.ts`、half1 原清单及
领域定义后，确认游戏展示名为“凤鸣朝阳”，技术 ID `b05`，机制名“合唱班”。
未修改名字、机制或数值。

新 PNG 为 **1122×1402，3,737,032 字节**，原字节 SHA256：
`11055d52940eecf33d815a82b23f51171480723aaa2983e15edd37e68a6b1e45`。
归档文件为 `art/sources/fengmingchaoyang-art-20261017/b05-fengmingchaoyang-original.png`，
与用户本地原文件逐字节相同。receipt 保留原文件名中的“风”，不将错别字当成 ID。

已查看新旧原图及新派生图真实像素：新图为金红凤凰展开双翼、长尾、朝阳城景、云带及
完整四边装饰，画面下部没有灰色缺失。旧 `17_b05_凤鸣朝阳.jpg`（1856×2304）
下部存在大块灰色缺失区；严格全图解码实际报 `VipsJpeg: premature end of JPEG image`。
新原图严格全图解码通过。看图结果只说明所见图像，不代替用户或物理设备验收。

## 派生、映射与缓存

仅派生该 PNG 的 WebP；`fit: contain`，完整源区域 `{left:0,top:0,width:1122,height:1402}`，
不拉伸，背景 `#F3EADB`，sharp 0.35.5 / libwebp 1.6.0，effort 6，质量 80/78。
没有重新生成原画。已查看 128×160 缩略图和 615×768 详情图，构图与装饰边框完整保留。

| 用途 | 运行时路径（`public/assets/handdrawn-p08/` 下） | 字节 | SHA256 |
| --- | --- | ---: | --- |
| thumbnail | cards/b05-v3-ee1848ebb107.thumbnail.webp | 7,960 | ee1848ebb107e505ada50db8484a9ab6967d7716687b8cb8a3e11daefecf1604 |
| detail | cards/b05-v3-808bf2fbfd26.detail.webp | 136,794 | 808bf2fbfd262662b2c678e3dfec1ae5d3fb511325f5d62bcef0be50336a3ec7 |

当前 receipt 规范 JSON SHA256 为
`76459e0c50e2ba0763b7b5bdf81b71e00ca8de2c382406a28879983aed8d9e18`。
`JOKER_ART`、`reviewedCardPath`、`jokerArtUrl` / `jokerArtPreviewUrl` 均取当前 manifest；
详情/放大入口 `CardArtZoomModal` 共用 `jokerArtUrl`。两个请求均使用新内容路径及
`?v=<完整新SHA256>`，不会沿用旧 URL。没有修改这些 UI/加载实现。

旧 JPEG、旧 b05 WebP、half1 receipt 全部保留；原 half1 当前来源移入 B05 的历史来源。
与 2229b4cb 相比，其余 **80 条完整资源记录逐项相同**，旧 B05 输出哈希也仍匹配。

## 检查

- PASS：用户原图与归档逐字节相同；新 PNG 严格解码；新输出尺寸/hash；其余 80 条不变。
- PASS：来源检查 `node scripts/handdrawn-provenance.mjs --check --git-history`：
  72 个当前原图绑定、74 份原图、165 个输出、16 份 receipt，10,196,942 字节。
  既有九条 `derivatives-only` 和历史原图缺证仍按来源整改证据保留。
- PASS：7 文件 / 48 项相关测试：
  `b05-art`、`handdrawn-art`、`handdrawn-provenance`、`joker-art`、`character-art`、
  `detail-art`、`scene-resources`。涵盖真实 B05 名称/ID、完整解码、详情 URL、缓存版本和
  146 项首屏资源像素预算；详情图继续按需加载。
- PASS：`npm run build`，TypeScript 和 Vite 构建通过，保留已有 chunk 大小警告。
  half1 只读归档检查也通过：36 源图 / 34 当前图，保留 B05、C06 后续替换。
- PASS：首屏 146 项的静态解码估算为 17,833,984 字节（17.01 MiB），
  上限 20,971,520 字节（20 MiB）；142 个外部图文件共 1,372,162 字节，
  另有 4 个内联 SVG。该图文件统计不是实际首屏网络传输测量。
- **既有 FAIL 未解决**：实际构建目录 518 文件 / **44,459,864 字节**，
  高于 20,000,000 字节发布预算；替换前构建已为 516 文件 / 44,314,529 字节，
  本次增加 145,335 字节。沿用 assets-runtime 的全构建目录口径，含保留的旧副本。
  handdrawn 当前注册内容净增 84,636 字节；完整源 PNG 未进入发布产物。
  本轮不删除旧资源或扩大到整包体积整改。完整实测数值见 `checks.json`。
- NOT_RUN：浏览器、长局、真人/物理设备、全量测试、CI、部署及 main 合并。

本轮只提交独立 dev 分支，包含 2229b4cb 来源修复；由整合线程决定 main 整合。
