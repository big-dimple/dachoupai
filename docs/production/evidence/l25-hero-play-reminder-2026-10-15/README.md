# L25：出牌前可用主动技能提醒

候选基线 `4d2ff4ca8487f2f00b55516822d1a28ac3c1751f`；产品与观察器冻结 `7b127e35430daf9cb4a05eeb0196c987eb3310f2`。独立分支 `dev/l25-active-skill-reminder-20261015`。需求按 `cf430c845c5edde8dca437e68db190ef3ea145c6` 的 DELIVERY_PLAN「后续交互：出牌前确认是否保留可用主动技能」（用户称 L25）执行。

## 原实现核对与本次范围

原候选已有六英雄资格查询、技能草稿、原子保存、技能入口强调与操作面板，没有点击出牌时的确认层；本次只补该层。仓库 `.agents/skills` 不存在，共享 `/workspace/.agents` 为空。读取现有 AGENTS、指定原计划与相关模块；最新明确并发授权覆盖 AGENTS 的历史串行记录。独立 Astra 代理负责资格/接线只读审查、专属测试和基线窄屏复核；公共场景只有主线修改。未自然试玩、未生图、未购买服务，未合 main/部署/强推/重试 Forbidden PR。

- 仅原新手引导登记且仍启用的普通难度0新局；前两场（stageIndex 0、1）各最多一次，每局最多两次。取消/Escape/返回同样消耗这次提醒额度，之后本场不循环追问，不每手打断。
- 可直接返回原技能面板、继续原出牌、取消、或“不再提醒”。关闭提醒只改本地 UI 偏好，保留选牌，不出牌。全局关闭持久化；最多保留8个近期局的提醒记录，不新增 checkpoint/schema 字段。
- 原 FirstChapterGuide 被略过/本局关闭/永久关闭时，本提示也不参加。导入/重试不会自动登记；受控浏览器样板明确登记测试偏好，不冒称自然新手全流程。
- 资格使用 `heroAbilityCue.available`，排除已选技能草稿、已提交待兑现及不可操作状态；不使用宽泛的 `opportunity`。返回调用 `inspectRole`，阿默仅显示选择面板，不走会选推荐组的 `inspectHeroAction`。
- 继续前检查原 immutable run 引用、lifecycle、选牌、草稿、即时资格、ready/演出锁；过期回调仅关闭。确认回调一次消费；提交仍是原 PlayHand/PlayAssistedHand 与保存失败固定候选重试。

## 六英雄资格账

| 英雄 | 可提醒正例 | 排除例 |
|---|---|---|
| 二响 | 对子以上且有有效普通点数计分核心 | 高牌、核心不可用、已用、已选交棒 |
| 阿默 | 合格主手之外存在合法剩余对子/三条助攻 | 无副组、已用、已选助攻；旧被动不伪装主动 |
| 阿燥 | 有层数且当前两对以上、尚未选择释放 | 0层、当前低牌型、已选释放；已有层数是释放前提，不错误排除合法释放机会 |
| 谢幕 | 两对以上且至少10金 | 不足10金、不合格牌型、已用、已选燃金档 |
| 骰爷 | 当前选1–5张，可付弃牌成本，有补牌与下一手及可押目标 | 已押待下一手/已用、无弃牌/补牌、税金不足；不放宽原时钟 |
| 老幻 | 当前选1–5张、戏法未用、可付弃牌成本 | 已用、留牌pending、弃牌次数/税金不足；B08非计分例外保持 |

## 验证及证据边界

冻结源码 build（含 tsc）通过，5文件59项定向测试通过：`hero-play-reminder`、`hero-ability-cue`、`first-chapter-guide`、`hero-skill-guide`、`recovery-save`。build 有既有大 chunk 提示，无构建错误。未用旧CI代签本分支，CI/上线与整体验收另核。

受控观察器 `harness/hero-play-reminder.mjs`：PC1366×768、手机390×740（DPR1软件Chromium），每端六英雄合法公开手牌/金币样板。提示/返回/取消完整state、journal、storage和选牌保持；回原面板不代选/代用；返回后不用技能出牌按原命令逐字段对照，storage当前/前一checkpoint和revision也核对。重复处理器投递为明确控制注入，不冒称原生连点；继续/重试按钮使用实际双击。每端另测真实IndexedDB quota故障、固定候选重试/冷恢复、Escape后恢复不再提醒、受控选牌变化和busy旧回调不提交。

320×568与740×320为对应尺寸**冷加载**后原生选牌/提醒查看、固定动作按钮与≥44px触点、关闭/继续和新局关闭偏好；没有把动态缩窗的既有故障签成通过。截图为 CSS 原尺寸，不代表物理高DPR清晰度。

最终报告 status=PASS、head精确绑定7b127e35、dirty为空；30张原尺寸截图见 `screenshots/`，摘要见 `summary.json`，完整2,353,383字节原报告无损压缩为 `report.json.gz`。恢复后仅离线核对：12次正常出牌各保存一次、2次固定候选重试的完整当前/备份checkpoint和revision符合原报告；未重跑已经完成的检查。`build-info.json` 保留原洁净构建身份。本文和证据提交不改变上述冻结产品/观察器。

用户暂停后工作区与本地提交原样保留；明确恢复并改用Sol6.1后，只完成源码/报告核对与证据归档及开发分支push，没有再启代理或重新运行产品检查。独立Astra审查属于暂停前的实际历史，不把它改写为Sol执行。

## 真实失败保留

`previous-failures/` 保留原始报告压缩字节，未改成PASS：

1. first-FAIL：观察器第二次点击出牌所在的弹窗外区域，触发既有关闭，再错误要求弹窗仍在；改为明确重复处理器投递，原生按钮双击另测。
2. second-FAIL：观察器错误等待 controller status=`save-failed`，实际契约为 `paused`（错误码才是 save-failed）；改正观察值。
3. third-FAIL、narrow-debug/2：390触摸context不刷新缩到320后，实际点出牌(220,507)多选K，没有出牌，也没有提醒。未把它归因本功能。
4. 初次视觉检查见通用详情窗过大，改专属紧凑CSS，关闭提醒由折叠区移到直接可见按钮。最初视觉截图未单独归档，不伪称保有原始像素。
5. 专属单测初跑1个旧身份夹具使用不存在的definitions而FAIL，改沿既有测试复用原facts；产品不因夹具失败改资格。

`baseline-resize/` 是独立代理在精确原候选4d2ff4ca、隔离worktree复现的完整报告与前后图：同(220,507)点击，Phaser收到(180.5128,389.1568)，分别等于旧390/740比例缩放后的坐标；canvas/scale/bounds已320×568，state/journal/storage完全不变。支持触摸缩窗比例残留解释；不签具体底层根因已修。公共输入模块未扩改，这个既有动态缩窗限制留父后续处理。

## 父整合清单与未签项

- `GameScene.ts` 仅新增1条import，以及 `playSelected` 原合法/保存锁检查之后、捕获intent/置playing之前的提醒接线（合计12行diff）。pendingRefill原分流和实际dispatch/演出逻辑保持。ShopScene无改动。
- 新独立模块 `HeroPlayReminder.ts`、局部 `HeroPlayReminder.css`；新专属test/harness和本目录证据。domain/application/content、通用DetailDialog/输入、公共style.css、图音资源均保持基线。
- localStorage不可写时会话内去重/关闭仍有效，不能保证刷新后保留该UI偏好。8局以外记录不无限保存。关闭提醒的恢复入口未新增（清除此偏好可恢复）；不改变游戏存档。
- 人类能否理解主动/被动、真实新手体验、物理设备/听感、自然经营/平衡/整体美学与全游戏验收仍未签。未生成或接入新图；未来图片仍按原 dot ChatGPT Chat 取回流程，模型/额度不保证。
