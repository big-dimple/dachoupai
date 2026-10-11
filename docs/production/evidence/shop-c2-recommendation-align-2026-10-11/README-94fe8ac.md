# C2商店语义兼容：有限验收证据

输入：父main `9d0cd754150a8c9cb6ed3ddf38c50f543ed6bac3` 与已独审、精确CI成功的PR121 `9c567449b553b4220811e189a77dc150185692f5`，正常merge为 `79ab2481226b2527014c88750339cffc94870037`。本项独立分支 `fix/shop-c2-recommendation-align`，不追加PR122，不合main、不部署。产品冻结 `fa66bf5edbbb5ceb0b9f68e646c772a557be2809`；最终文档/观察器HEAD及CI登记在独立draft PR。

本项为C2新局上线前高优先兼容依赖。固定C2身份 `quality-r2-route-growth-v1 / json-fnv-v1:7414228d95059959`，72定义语义为 `json-fnv-v1:91387711fbe1298d`；旧定义语义 `json-fnv-v1:bd8fa974db581460` 的独立职责保持。不是单纯放行新hash：满堂彩+90、搭台阶基础50及成长10/上限100、越染越深扩展F族成长0.5/上限6、借东风扩展顺花族+1.5、长期捧场售其他牌保系数且失去未售成长资格、冷场救火未出牌首次弃牌各有新职责分支。其他66条继续共用旧职责。未知改定义仍显示待核。

读取既有本局G/S/F清场资历及原精确因子，不新增保存、计分、数值或资历来源；资历属于局而非起手标签或持牌实例。出售成长牌失去该实例成长；保留长期捧场已有系数；准备商店出售导致下一场未售成长资格失效；卖掉长期捧场自身仍失去自身系数。购买不凭空入账资历或新购成长。c07仍只普通同花/同花顺，未扩大为C2整族F。

## 实际画面与操作

| 核验 | 前 | 后/最终 | 实际观察 |
|---|---|---|---|
| 手机390首层三张 | [集成前](before-native/390-six-a-shop.png) | [新语义](after-native-5aade6b/390-six-a-shop.png) | 待核改为五格指数；14px和原持牌长按提示保留，价格/比较替换可读 |
| PC1366另外三张 | 无新增前照，使用同固定C2基线 | [最终](final-copy-native/1366-six-b-shop.png) | 借东风/长期捧场/冷场救火实际货架；e11旧“查重置”改为查成长 |
| 手机390另外三张 | 无新增前照 | [最终](final-copy-native/390-six-b-shop.png) | 三条星指数及条件完整可见，持牌/入场保持原层级 |
| PC1366满槽比较 | [集成前](before-native/1366-retained-compare.png) | [最终](final-copy-native/1366-retained-compare.png) | 单次共同资历保留提示；每槽单一管理入口，成长/售购损失未藏进详情 |
| 手机390满槽比较 | [集成前](before-native/390-retained-compare.png) | [最终](final-copy-native/390-retained-compare.png) | 共同提示完整；保系数文字使对应槽增一行，首张仍239.75px，热20槽283.125px；五槽仍滚动可达 |
| 手机出售确认 | [集成前](before-native/390-retained-sale.png) | [最终](final-copy-native/390-retained-sale.png) | 实际管理第4槽→出售→确认层→取消；热20损失与保留e11系数可见，全文含资历保留；原明确确认保持 |

原生基线4例、兼容初版6例、最后共享文案修正仅受影响4例，均为1366×768鼠标和390×844触摸、原菜单导入严格合法checkpoint后实际商店/比较/管理/出售取消。不是18组合自然试玩、自然获取或物理手机。各批`report.json`记录真实HEAD/生产夹具HEAD/空源码改动；`full-state-journal-storage.json.gz`保存完整初终run、journal和IndexedDB并逐项相等。全六张/比较/出售主要实图已实际查看；几何绿不代替体验判断，真人理解及18自然局仍由父/dot验收。

最终产品只比初版多e11无重置hook的查成长文案。`after-native-5aade6b` 六例保留原SHA，`final-copy-native` 四例记录最终产品SHA；没有把旧图改标新SHA。手机星指数保持14px五格、无与价格/操作/条件重叠；未改字号、货架布局、拖拽或工具选择。

## 原始事实与保护

[压缩事实](facts.json.gz)包含完整输入/trace和实际命令：旧身份72×3培养方向216条与merge前逐项相等；四组真实scorer输入（满堂90、四顺搭台阶、同花葫芦、同花五条）；扩展F两例c06和借东风确有事件而c07没有，d09仅2；首次弃牌前已有两对并非冷场，实际弃牌仍武装，下一手真实救火×3并消耗；四次真实成功清场完整before/after/命令得到G4×1.35；真实卖→买保持局资历/e11×1.5，新购c04成长为原初值`{}`，checkpoint可读。牌组、现金、版次、实例已存成长及补排手牌为明确受控输入，资历和trace通过实际命令产生，未伪造保存记录。读取建议/比较未改原状态。

[保护清单](protection.json)：本包仅五个展示/建议文件变化；领域、内容、应用/save、全部资产、GameScene、排序手势、布局、弹层与工具控制均逐树同正常merge基线。GameScene逐字节同固定PR121；main c07谓词逐字相同；唯一计划历史标记后与main9d逐字节相同。JokerPlainCopy仅e11实际无reset hook时提示查成长，旧e11真实重置提示保持。

86项受影响定向先通过，首弃证明收紧后10项/type再过，最后共享提示修正后26项/type再过，日志各自保留，不冒称一个102项全新批次。独立最终精确HEAD CI另核，不借PR121/122或旧source成功。

计划校验最初误填不存在的Vitest文件得到No test files，未声称通过；随后使用仓库真实plan validator及self-test，原日志保留。

原FAIL保留在`fail-*`和`logs`：初始断言错用事件operand/growthAfter和非现行动作、新购初值不是显式0、改手牌后缺disabled重算；原生初局受控修改触发opening-state校验，同ID改已有trace成长触发live-growth校验；均修观察夹具/断言，未放宽任何checkpoint/领域保护。导出首版错用救火数学事件名及BuyJoker也已保留，最终改用真实rescue-multiplier/BuyOffer。并行Vite提示默认HMR端口占用不影响HTTP/原生实际操作，未作为产品故障或避开原环境。

不签通用净收益评估、未来概率/EV、自然强度、真人理解、物理设备/听感或W0–W9全体验；不增做牌流程、供给、价格或新规则。C2父串行合并/发布与dot剩余18局继续独立处理。
