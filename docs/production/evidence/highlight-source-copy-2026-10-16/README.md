# 高光来源辨识与玩家文案清理

基线 `0621156b5bd17557d867f618dbb86c1ef0260384`；产品 `ab2d492a096a29eca05a1fc4ffaf02a2819e20c0`，独立分支 `fix/highlight-source-timing-20261016`。本批仅开发交付，不合main。P08仍in_progress。

## 实际问题与改动

1. 740×320真实原生出牌中，长期捧场的“本次倍率×1.3”与“读取已有×1.3倍率”重叠，累计10.4缩至14px。[修前](screens/before-short-landing.png)、[修后](screens/after-short-landing.png)。短横屏落位改为本次/累计两列；本次×1.3、累计8→10.4分别表达，累计字体实测47px，底部说明独占一行。[来源镜头修前](screens/before-short-skill.png)、[修后](screens/after-short-skill.png)。所有已捕获镜头的可见文字两两检查无重叠。正常竖屏/PC版式未重做。
2. 用户所说“正式例会”实际对应高光叠字“正式立绘”，不是图片内的字。原图查看、角色比较和技能图的替代文本也携带这类制作状态。现已移除，图片只用角色姓名描述。
3. 人物故事额外追加通用创作声明、宣言创作/出处附注；在实际界面中形成重复自我解释。移除这些追加段，原故事、宣言、技能条件和数值保留。[故事页修前](screens/before-player-story.png)、[最终修后](screens/after-player-story.png)。

| 原来实际进入玩家界面的内容 | 位置与最终行为 |
| --- | --- |
| 正式立绘 | HeroClimax归属行；HeroExplanation、SelectionComparison、GameScene技能图片alt。归属行现仅人物姓名/主题，图片alt为姓名。 |
| 来源兑现 / 技能兑现 / 这一手·实际兑现 | 高光固定归属带的冗余说明。移除，来源名/技能名、局部收益和累计值仍清楚展示。 |
| 唐宋人物的架空青年形象；诗文摘句与游戏演绎见各人物说明。 | HeroExplanation故事后追加段。删除。 |
| 六份mottoAttribution追加段，如“据刘娥垂帘决事经历作游戏演绎，并非历史原话。”及“摘句（简体）” | 不再追加到玩家故事页；规范JSON保留为制作来源记录，故事/宣言本身未改。 |
| 全图标题“·立绘”、图片alt“·完整立绘” | 全图页简化为人物姓名，[实际全图页](screens/after-player-full.png)。 |

实际查看六张runtime完整角色图，以及本轮使用的e11/f06 detail图：未发现上述开发状态说明烘焙其中；原图里已有的人名、题字和诗句是角色画面，保留。六张1122×1402原图和24份派生图均逐一核对manifest SHA-256一致，public/art/sources无修改。没有生图、抹图、裁掉用户验收内容或修改资源预算。

技能条件、花费、首次/每场限制、成长下手生效、回看/示例与本局区别等玩家必要说明保留。[实际技能面板](screens/player-skill-390.png)。测试描述和代码注释中的辅助文字不当作运行时UI清除。

## 文件与共享边界

- HeroClimax/HeroClimaxLayout：短横屏占位与高光归属文字；没有改事件选择、计分或队列等待。
- HeroIdentity/HeroExplanation/HeroPortraitDialog/SelectionComparison：移除素材状态、冗余附注与图片alt元信息。
- GameScene只有inspectRole的portrait.alt从“姓名·正式立绘”改为姓名。完整文件已与基线做精确替换对照；高光队列、出牌与B05状态均无改动。
- 对`47ab5e5e83df27fc1ad94ddc1536e1c86126802e`做git merge-tree排练，无冲突；合并结果GameScene逐字节等于B05版只替换该alt，B05三处接线、目标/余手/认招、应对和风险预告保持。仅生成审查tree，没有把B05或本分支合入共享main。见[source-proof.json](source-proof.json)。

## 实际验证

[validation.json](validation.json)汇总；[原生高光/控制报告](native-report.json.gz)保留完整state/journal/storage/localStorage、实际事件、逐帧文本/像素与镜头时点；[最后的六人文案复核](final-player-copy-report.json.gz)保留实际展开的故事、规则、技能例子和图片alt。

- Windows、Node22.20、Playwright Chromium153.0.8010.12，DPR1，实际鼠标/触控/DOM，e2e构建+preview。没有私调出牌/呈现、暂停场景或修改时钟。
- 60项相关测试、TypeScript及生产构建通过；原Vite大chunk提示保留。harness语法与diff检查通过。
- 15个真实出牌/控制窗口PASS、pageerror 0：普通固定种子刘娥的PC/390/740短横及回看；普通现货c06两端两手；实际来源e11/f06短横、e11三尺寸/低动态/快进/退出；花蕊4倍速。原有主体约1秒保留，没有添加等待。
- 普通刘娥实际对子发动：本次+6倍率与累计2→8分开，[390](screens/ordinary-liue-390.png)、[PC](screens/ordinary-liue-pc.png)、[短横](screens/after-short-hero.png)。所有实际输入只保存一次，完整状态/命令/存储等于原领域命令；展示、快进、回看、关闭和冷恢复不重放收益，回看后实际选牌/取消可继续。
- c06前置来自已有固定普通货架种子的合法购买命令，不植入牌或金币；浏览器从生产存档导入后实际出两手。第一手读+0、结算后存0.5且累积器不变，[保存时点](screens/growth-first-save.png)；下一手实际读+0.5且没有再新增，[下一手回执](screens/growth-next-read.png)。已有成长表现正确，不重复开发。
- 同一e11原生出牌修前/修后完整state、journal、storage和localStorage逐字段相等，均为×1.3、累计8→10.4；显示修复没有改变分数、成长、RNG或消费。[原FAIL报告](before-report.json.gz)保留。
- 17窗口批次包含两尺寸×六人说明/比较/全图复核。最后只再去掉HeroExplanation的宣言创作附注，随后两尺寸×六人重新实际展开验证全部通过；核心高光/GameScene代码没有再改，不把两阶段伪称一轮全套。最后构建及60项测试对应封存产品代码。

观察器修正保留在observer-failures：首次普通对子目标顺序与UI顺序不同，改为记录真正点击的候选；Node夹具BASE_URL原设`/`与生产`./`不同，改为跟随现行Vite配置。它们不是产品缺陷，也没有放宽保存或显示断言。Windows SSR/Linux浏览器路径改为已安装esbuild与Chromium，未新增应用测试后门。

重跑：`HERO_TITLE_CAPTIONS=1 HERO_TITLE_PLAYER_COPY=1 node harness/hero-source-title.mjs`。本批选择项见validation/raw报告的key；只查六人文案可设`HERO_TITLE_CASES=player-copy HERO_TITLE_PLAYER_COPY=1`。脚本自动构建，输出在gitignored的shots。gz可用Node zlib.gunzipSync读取。

## 未验边界

这是有限软件/画面证据，不签真人阅读速度、历史人物审美、听感、物理设备/GPU、跨浏览器、自然供给/通关率或完整平衡。固定普通种子是有界代表路径；e11/f06及花蕊金量是明示受控合法入口，不当自然获取率。未改规则/经济/存档身份/原图，未查询等待CI、处理域名、部署或合main。
