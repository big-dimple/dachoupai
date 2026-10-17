# Handdrawn current / historical provenance correction

范围：`handdrawn-p08` 来源元数据、归档构建脚本和相关测试。开发基线为
`a470da228a85283eabc00811f610ba6a41a38738`；本提交的最终 SHA 以开发分支交付回执为准。
不修改 UI、音频、共享计划、图片或旧 receipt；没有运行浏览器、CI、部署或 main 合并。

## 当前绑定

manifest schema v2 逐资产使用 `currentSource`。旧条目级 `sourceCommit` /
`sourceManifestSHA256` 已移入 `historicalSources`，C06 的后续替换也使用同一模型。
顶层 `sourceCommit` 是初始交付兼容字段，`sourceCommits` 是历史交付集合；
`provenancePolicy` 明确它们的范围，不能据此推断当前 72 张图的来源。

| 当前 receipt（`art/sources/` 下） | receiptCommit | 规范 JSON SHA256 | 当前张数 |
| --- | --- | --- | ---: |
| handdrawn-runtime-20261017-half1/manifest.json | fddb7378112304ead60d67a676e73bb4a3fe2ec0 | a5a703a20c18ab3b9dca29b9a10cda15b50a22c37c7c804c07aaa8e09f8039b6 | 35 |
| handdrawn-runtime-20261017-half2/manifest.json | c374c7aa31ec75f3a02b27b6d1bb0b6a5f8ea77e | 854b8f1d29a8aa511c7764c7f527eec8457c694d164c07f3a01f3920e73bb891 | 36 |
| qingchuyulan-art-20261017/manifest.json | 3897abbc80f71d760fa41a9a8330f9fb606e72ab | a248d6f72527d6e60c2ab9e01d1ede2b3eaf57ae6be562988c75d2a4ae62d863 | 1 |

哈希策略统一为 UTF-8 `JSON.stringify(parsed, null, 2) + LF`，避免 Windows CRLF
检出导致假失配；原图及 WebP 一律校验原始字节。没有重写任何旧 receipt。
half1 原图在 `55e218e1a4ea97fc223d5a056df61fc88311bdbb` 引入，当前 receipt 因
A11 contain/v3 修复更新于上表 fddb7378。receiptCommit 表示可读到当前 receipt
及原图字节的提交，不冒充作者、授权、用户验收或图片创作时间。

实际检查结果：72 个当前来源绑定；73 个原图文件（包括已被替换的 half1 C06）；
165 个运行时文件，10,112,306 字节；15 份当前/历史 receipt。
`--git-history` 还将 receipt 内容、73 份原图字节与其所指提交逐项比对。
`pengci` 当前读 half1；A11 当前读 half1 v3；C06 当前读独立替换 receipt。

## 仍缺的证据

- 旧目录六角色条目 `azao/amo/touye/laohuan/erxiang/xiemu` 与 J/Q/K 共九项：
  初始归档只有衍生图及交付记录，没有原图文件及逐原图 filename/SHA256 绑定。
  当前明确标记 `derivatives-only`。其 21 个输出、566,958 字节仍逐文件验证，
  九项记录指纹固定为 `dd9a9b78683af5f592a9108230611ae7941f551d4c477f80c4fa9ea5de8ed69d`。
- 上一代 72 张历史牌面：11 条（`f04/e07/f09/f07/d07/a07/a08/c03/d02/e02/e09`）
  没有原图映射；其余 61 条有 receipt 原图哈希，但原图未保存在相应归档目录或
  receipt 所指 Git 树。历史检查只证明 receipt 和归档衍生图，不认证旧原图。
  当前 72 张来源均有原图，不将这些历史缺口移作当前来源。
- 原 60 条记录 / 123 个输出的历史指纹
  `6ea3ed5a2054145ab25a812232cd8e391d4cfac67c64e6bff0ccf64ba1ddcad7`
  及 3,461,406 字节断言已恢复，明确验证历史，不再用恒假分支跳过当前绑定。

## 验证与限制

- PASS：`node scripts/handdrawn-provenance.mjs --check --git-history`，结果如上。
- PASS：两份 `build-handdrawn-cards-20261017*.mjs --check`，分别 36 源图 / 35 当前图、
  36 源图 / 36 当前图；默认也为只读检查，不编码、不改 receipt、不覆盖 C06。
  显式 `--write` 仅允许复现 receipt 已固定的字节，全部结果核对后才写入；本轮未运行。
- PASS：`npm run build`（TypeScript + Vite）；Vite 保留已有 bundle 大小警告。
- PASS：`npm test -- tests/handdrawn-art.test.ts tests/handdrawn-provenance.test.mjs tests/joker-art.test.ts tests/character-art.test.ts tests/detail-art.test.ts`，5 文件 / 38 测试。
  包括旧来源错绑、伪 receipt 哈希、遗留歧义字段、功能牌降级缺证、等长原图篡改反例。
- 已运行但 FAIL：扩展检查中的 `goods-art.test.ts` 两个文案断言，仍期待
  “本场剩余弃牌+1”及“当前场预算不增加”，基线实际文案已变化；
  `public-art-privacy.test.mjs` 两个 symlink 案例受 Windows EPERM 限制。
  这两文件共 19 PASS / 4 FAIL，已在干净的 a470da2 detached 基线再次复现完全相同四项；
  未修改这些测试、文案或系统权限。不能将扩展检查写成全绿。
- NOT_RUN：全量测试、浏览器、物理设备、视觉/真人验收、CI、部署。

两批重复的生成与元数据写入逻辑合并为归档复现器；A11 旧 URL、C06 旧输出及所有
原资源保留。通过来源检查只表示所列字节证据匹配，不表示缺证补齐或美术签收。
