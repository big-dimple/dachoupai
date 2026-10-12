# 独立结算表现候选

产品冻结 `2e214e25ddbedcdd450e9d6c769978051c41610a`，从 `be2ff12` 起步；父通知骰爷 P0 合入后，正常 merge `dc985f6a4f418e5751648f1d57f466163fbc2673` 得 `8c04902eea4601e1f3fb9e856f3a28d24a67702f`。随后正常吸收PR131纯文档main `0c71c5dabbc754516848d1a0acc931464db730a8` 得 `10a74918523f4ef8ecea6834145ba3e812311069`，产品树不变。五个产品/测试/harness文件字节不变，最终 draft 的精确 HEAD CI 由 PR 检查与交接回执单独记录。未合 main，父独立看画面/操作后决定美学是否通过。

## 文件边界与实际行为

- `IntermissionScene.ts`：纸面结算接线、既有来源/人物按需加载、直接相邻下一步区域的纸色与分隔。原命令、奖励身份去重、菜单/回看/恢复、主按钮语义沿用；一秒后不整页重画，以免销毁按住中的触点。
- 新 `SettlementPresentation.ts`：已保存事件事实、分强度构图、完整等比人物、来源卡、固定缺图留影、按实墙钟一秒的局部收束。静态结果与操作从首帧即可读；低动态直接落定；失焦/离场清理。
- 专属 `harness/fixtures/settlement.ts`、`harness/settlement-presentation.mjs`、`tests/settlement-presentation.test.ts`，以及本目录证据。

领域、计分、随机、供给/价格、身份/存档、GameScene、技能、ShopScene、全局样式、既有图像/音轨/库与父合骰爷15文件均逐树同 `dc985f6`。未扩世界观/全资产重画/3D/新外库或音效工程。复用 `selectionPortraitKey`、既有 Joker preview、p00 纸面、既有数字字体、`loadResultSourceArt` 和 `RewardCoinCue`；新运行图音文件为零。象牙/深墨/青蓝/朱红沿当前合同。

强度按验证过的末手 `finalScore` 与真实乘法事件分层：普通、至少两笔有效乘法的强链、千万、亿分。Boss保存身份另盖“压轴击败/未过”；失败明确本场累计、目标差额和最后一手。来源头像只附其自身事件因子/代价；累计 M、局级资历和已存热度加成分别标记。搭台阶实际 `热度+50`、`读取+100热度` 保持加区；资历读取本手之前的 S，不倒灌本次新增。

## 证据入口

所有 PNG 都是实际浏览器整屏，包含按钮/下一步/菜单；未裁切重构、未复制旧图冒充候选。每端坐标、显示文本和资产 ID 在对应完整 report 内；gzip只压缩序列化证据。文件哈希见 [manifest](manifest.json)，检查范围见 [checks](checks.json)。

| 用途 | 入口 |
|---|---|
| PC1366亿分前后 | [before](before/billion-1366.png) / [after](after/billion-1366.png) |
| PC1180亿分前后 | [before](before/billion-1180.png) / [after](after/billion-1180.png) |
| 390×844亿分前后 | [before](before/billion-390.png) / [after](after/billion-390.png) |
| 普通/强链/千万/长数字 | [普通390](after/ordinary-390.png)、[强链1366](after/chain-1366.png)、[千万390](after/million-390.png)、[科学计数390](after/long-390.png) |
| Boss胜败 | [胜1366](after/boss-win-1366.png)、[败390](after/boss-loss-390.png) |
| 缺图/低动态/加速/窄屏/短横 | [缺图](after/boundary-missing-art.png)、[低动态](after/boundary-reduced.png)、[4倍](after/boundary-accelerated.png)、[320](after/boundary-narrow.png)、[740×390](after/boundary-short.png) |
| 完整真实UI出牌→结算短片 | [普通1180](after/native-ordinary-1180.mp4)、[强链390](after/native-chain-390.mp4)、[亿分1366](after/native-billion-1366.mp4)、[Boss胜1366](after/native-boss-win-1366.mp4)、[Boss败390](after/native-boss-loss-390.mp4) |
| 全21前态/37候选case及原生保存 | [before report](before/report.json.gz)、[after report](after/report.json.gz)、[受控输入与原计分输出](after/controlled-states.json.gz) |
| 吸收main后必要只读图/存档 | [6例report](main-alignment/report.json.gz)、[亿分1366](main-alignment/billion-1366.png)、[亿分390](main-alignment/billion-390.png) |

普通、强链、千万、亿分、长数字、Boss胜败各在1180×757、1366×768、390×844用同一受控保存状态比较前后。自然 `310793589 / H977 / M≈318110.12` 只来自父提供的事实，完整原存档/trace尚未同步到本工作区，本包**没有声称重放了这笔自然单手**。上表全部是明确受控例；现行原计分器分别产出1296、41990、97467438、733884590、1952400131333767，原生实际出牌病例不等于自然购得、八章经营或18局试玩。

五条原生UI命令均以实际receipt的commandId调用原 `applyCommand` 对账完整state；journal只新增该笔，IndexedDB current.state相等。回看/关闭不改完整保存；冷恢复仍相等，`RewardCoinCue`没有恢复奖励cue。三连点“前往筹备”只多一次OpenShop、金币不变；双击快速返回与迟图离场不改保存；blur及受控hidden/focus后无锁死、无重奖；低动态无运动组；4倍偏好400ms时运动仍存在、1.25秒后消失。软件截屏/录屏保留实际音路，云端未真人试听，不签GPU/FPS/设备或人类美学。

吸收main后99项/7文件定向、typecheck与build通过；七组受控输入/输出和冻结版逐字段相同，6例只读原生图/完整保存相等，五产品文件hash保持。标准CI必须读取最终draft HEAD，不能借2e/8c或父骰爷旧绿灯代签。

## 保留的FAIL与修正

1. 首次缺图夹具拦了整个handdrawn目录，连manifest也拦截，白屏停在启动前；[真实FAIL图](failures/manifest-interception-FAIL.png)与[原report](failures/manifest-interception-report.json.gz)保留。夹具修正为只拦`.webp`；产品不扩大到Boot系统。最终缺图候选已通过。
2. 第一短横候选bounds虽过，实际像素仍有来源卡压人物、分隔线碰累计；[视觉FAIL原图](failures/short-overlap-visual-FAIL.png)保留。短横移除来源小卡并合并次级标签，让完整人物、主分数、H/M、累计与奖励各自分离；末手详情保持原入口。最终740×390已实际查看。

以上初候选源HEAD显示be2且工作树当时未提交，不冒充精确冻结SHA；最终图与完整report绑定2e，吸收记录绑定8c，哈希分别留证。整体美术、自然来源原trace重放、人类操作理解、设备/听感、其它页面与正式质量门仍待父/用户验收。本包独立draft，父唯一集成/部署。
