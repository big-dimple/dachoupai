# 六英雄技能名称投影与旧名漏接修复

基线 `212e23d547d4fcfdd886f9dfe80699318e77a738`，独立分支 `dev/hero-skill-name-projection-20261017`。本包只改表现层名称、动作说明及相关测试，不改技术 ID、存档、数值、RNG、原图或资源清单。

## 六人统一名表与依据

名称全部复用[既有批准规范](../../HERO_TEXT_SPEC_20261015.json)的 skillName；没有新增命名，也没有另造史实或诗句。下表出处是该规范已登记的 historySources / historyBoundary，本轮未另作原典考证。

| 英雄 | 统一显示名 | 本轮确认的旧标题／漏接 | 规范登记的作品或史事依据与边界 |
|---|---|---|---|
| 苏轼 | 余音袅袅 | 主手＋助攻、独角戏；助攻被当作技能标题 | 《前赤壁赋》余音意象；副组相助是游戏演绎。 |
| 秦琼 | 跃马冲阵 | 弃前赌约、赌约兑现、再来一把 | 《旧唐书》卷68冲阵事迹；押牌型是游戏机制，不包装为神谕。 |
| 辛弃疾 | 众里寻他 | 戏法换牌、戏法择牌、袖里有牌 | 《青玉案·元夕》寻觅意象；选择补牌是游戏演绎。 |
| 刘娥 | 垂帘听政 | 交棒、点数交棒、选交棒、接得漂亮 | 《宋史》卷242所载摄政背景；普通点数转倍率是游戏机制。 |
| 文成公主 | 和亲 | 蓄势／爆发、蓄势爆发、换个活儿 | 入蕃和亲背景；不借用金城公主的“和同一家”作为文成原话，蓄层为游戏演绎。 |
| 花蕊夫人 | 赏赐 | 留钱／燃金、燃金、最后一个包袱 | 传世《花蕊夫人宫词》的散钱／买花钱意象；作者归属有争议，不钉死为某一位花蕊夫人亲作。 |

“和亲”“赏赐”保留已批准二字名，不为凑四字另起名。动作仍明确写选牌、确认换牌、押牌型、选择支付档、释放层数；助攻／副组、蓄层等规则描述继续保留，不把所有动作替换成技能名。

## 已接线的专属模块

- `HeroSkillPresentation.ts` 是名称和状态投影：`heroSkillName(id)` 返回裸名称；`heroSkillTitle(id)` 返回英雄名与技能名；`heroSkillButton(id, flags, detail)` 返回 `label / status / state / detail / ariaLabel`。
- `characters / CharacterRunCopy` 统一显示名。旧局仍读自己的说明、资格、时点、数值和旧被动／押注规则；只统一外观名称，不套用新局规则、次数标签或示例。
- 主动操作说明、提醒、选角比较、技能示例、补牌选择、跨场提示、已存结果、计分回看、结算技能来源都接到同一名称。删除示例里被覆盖的旧 tag 常量。
- `JokerExperience / SettlementHighlights` 的保存事件标题统一投影，仍检查真实事件和收益；普通秦琼 ×1.15 仍注明常规倍率，不宣称主动押注已使用。原始计分诊断与存档事件 ID 保持原样。
- `HeroClimax.ts` 已通过 `savedSkillName` 和保存事件标题读取名称，本包未直接改任何 HeroClimax 文件。ShopScene 也未直接改，现有 `characterForRun / heroStageContinuity` 消费者可获得新名称。

## 场景负责人最小接线：pending

**GameScene 仍由 01a147f6 独占，本包未改该文件。** [GameScene-owner-only.patch](GameScene-owner-only.patch) 是以基线生成、仅供 owner 比对采纳的名称清理补丁；`git apply --check` 在本 worktree 的基线上通过，没有实际应用。不要整份复制场景，也不要直接覆盖 owner 的并行修改。

最关键的接线是：

1. `heroActionLabel` 直接返回 `heroSkillName(this.characterId)`，视觉不加“技能”、英雄名前缀、动作或状态后缀。手机短名表同样取该函数。
2. 在原 `heroAbilityCue` 调用末尾传入真实草稿作为第 5 参数：`{erxiangTargetId, xiemuBurn, azaoRelease, assistCount}`。它保留原 available / opportunity 计算，并提供统一名称与状态。
3. 名称用 `cue.label`；邻近的同位置状态用 `cue.status`，样式可按 `cue.state` 映射。detail 是具体下一步；ariaLabel 可含“主动技能”，视觉名称不重复此前缀。共同标识、固定位置、同一按钮样式和触控尺寸由场景负责人接入。
4. 状态为 available=可用、used=已用、unavailable=条件未满足、disabled=已停用、selected=已选择、pending=待完成。待选补牌／下一手押注优先显示待完成。文成公主释放后可重新蓄层，不凭空增加“本场已用”的一次限制。
5. 按原命令门禁决定可执行操作；状态接口不写状态、不自动选牌或发动技能。条件未满足时仍须保留既有查看说明路径。旧被动身份继续查看自身规则。
6. 补丁还列出取消选牌、规则展开标签、候选补牌标题、计分来源的旧称替换。原始 command / reasonKey / 数据字段和回看重放语义均不改。

## 实际验证

- 集中运行 24 个直接相关测试文件：226 项。首次 218 通过、8 失败；6 项是旧名称断言，2 项是旧 GameScene 测试桩缺 stage。同步名称断言并补齐当前场景字段后，只补跑这两个文件，13/13 通过；最终没有未解决的测试失败，没有削弱旧局时点／资格／保存／数值断言。
- `npm run build`（含 TypeScript）通过；保留既有大 bundle 提示，产物与源文件 SHA-256 见 [checks.json](checks.json)。
- `git diff --check`、共享补丁的只读应用检查通过。
- src/domain、src/content、GameScene、ShopScene、全部 HeroClimax 文件与 public 没有 diff。
- 本轮没有浏览器试玩、截图矩阵、CI、部署或自然长局。父级接入后的 dot 远端实际显示、按钮统一位置／样式／标识、触摸与键盘可达性仍为待验；不写成人机体验通过，不改 P08 状态。
