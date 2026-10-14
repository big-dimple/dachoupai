# main4a52 发布后手机 QA：云环境阻塞

2026-10-14 17:16–17:17 UTC，本云环境系统 Chromium 151.0.7922.173、仓库 Playwright；检出基线 `4a52fd0b0fb9ac0a49b8cb5e79abc8db4326e2d7`。已读根 AGENTS.md、README、唯一 DELIVERY_PLAN、相关核心/商店证据及 PR183；本环境 `.agents`/`.codex` 为空，无额外适用 SKILL.md。只新增本批 QA 证据和更新唯一计划当前入口，产品/规则/原证据未改。

## 实际结果与停点

在 390×844 通过浏览器正常导航 `https://pai.hp666.cc/`，游戏启动前失败：`net::ERR_TUNNEL_CONNECTION_FAILED`。同环境正常 curl HEAD 返回 `CONNECT tunnel failed, response 403`、server envoy；这是本环境访问路径阻塞，不是游戏用例 FAIL 或正式站故障证明。未改代理、权限、安全设置或使用用户电脑，未换部署域名/本地服务器冒充正式 QA。

- [浏览器错误页原图](390-navigation-blocked.png)：已实际查看；390×844，只有连接失败页，没有游戏截图。
- [环境与未执行清单](environment.json)、[原错误摘录](network-failure.txt)。CDP 重连 API 的 viewport 为 null，初次导航请求和错误页 PNG 尺寸均为390×844；不借 null 推定游戏布局。

| 本次计划检查 | 结果 | 原因 |
|---|---|---|
| 正式390×844选角、能力说明/技能示例及返回 | NOT_RUN | 首次导航被阻断，未见应用 |
| 正式320×568选角及返回 | NOT_RUN | 同域名访问阻断后停止，不重复导航 |
| 正式390×568短屏选角/滚动/确认 | NOT_RUN | 同上；该尺寸仅预定，未设置/实测 |
| 正常随机新建core-build局与首章经营 | NOT_RUN | 没有创局；无seed/存档/实际操作记录 |
| 自然已发现牌型报价、买或留钱选择 | NOT_RUN | 未抵达商店，不造牌型/等级/金币 |
| 真实保存、刷新继续与恢复 | NOT_RUN | 无新局可保存/恢复 |

原授权请求身份 `quality-r2-core-build-v1` / `json-fnv-v1:6dfe1a721e4949e6` 仅作后续检查合同，**本次未实际创建或验证该线上身份**。没有导入受控/假牌、没有挑seed、没有重试新局或重跑18局。后续待可访问正式站的授权云环境完成这同一有限检查，不把未执行改成通过。

## 原证据的有限复用

[PR183](https://github.com/big-dimple/dachoupai/pull/183)最终集成head `6015f0699bf579ec539d24bdee6c300c154cb183` 仍draft、未合；正式main由原PR177→178→180→179→182→181正常合入。[原证据目录](https://github.com/big-dimple/dachoupai/tree/6015f0699bf579ec539d24bdee6c300c154cb183/docs/production/evidence/experience-integration-2026-10-14)按该head读取，未复制/重写为本次自然记录。

本次Git只读核对main4a52与该集成head的 `src/tests/harness/public/art` 五树逐对象相同，完整hash见[reuse-proof](reuse-proof.json)。它支持复用原受控软件证据，不能证明线上产物逐字节同树，也不是本次正式手机PASS。原报告含PC1366/390真实新建，服务随后采用公开受控导入窗口，报价取消、保存故障固定重试、共享额度、T01、入场出牌及冷恢复，14笔后续保存命令与权威领域相等；受控无尽读取1.35/确认另列。不得把两段输入混成一个自然首章。

PR183精确[CI38599959366](https://github.com/big-dimple/dachoupai/actions/runs/38599959366)/[production-docs38599959337](https://github.com/big-dimple/dachoupai/actions/runs/38599959337)原回执success；[父181增量审查评论](https://github.com/big-dimple/dachoupai/pull/183#issuecomment-6173406099)记录18个受控样本及眼神→技能→累计值有限验收，本次只读取不重跑、不外推自然经营或实体设备。

父委派回执：正式main4a52的[CI38601884508](https://github.com/big-dimple/dachoupai/actions/runs/38601884508)全成功；父在正式站已读同版本、build `2026-10-14T16:55:57.761Z` 并实用PC选角/示例/商店。本代理受阻未独立复核这些线上项目，不把父PC回执改称手机实测；本次未读dirty清单，不称洁净构建。

## 留待与检查边界

实体设备触控/短屏、听感、整体美学、完整三路线自然经营/全局平衡和无尽深层仍未验。本批为环境阻塞记录，工程已合/父有限发布回执与手机QA分列。只跑适用文档检查，不重跑既有受控全矩阵、产品全量测试或18局；不合main、不部署。
