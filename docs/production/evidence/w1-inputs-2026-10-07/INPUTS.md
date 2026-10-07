# W1 当前原生输入补齐

更新：2026-10-07。冻结源码/main：`27d31fc50bcbbdc4a7a3405eece92c54e9aa8314`。C03 构建 UTC `2026-10-07T08:02:24.514Z`，sourceStatus clean；Chromium 151.0.7922.173（精确浏览器以 report.json 为准）。DPR1，safe inset 均0，reduced-motion reduce，软件 Canvas。仅提取当前原生 UI，不制作替代生成图，不给真机、GPU帧率或整体观感签收。

## 身份与来源

当前普通入口及两个受控档均为 `quality-r2-group-upgrade-prototype-v1 / json-fnv-v1:5025cc23c013987f`，二响、标准D0、无节目单。历史 PR27 的 5905d4c / 318、325、402 等数值仍只属于原轨迹。当前选牌态不显示预计总分，也未实际出牌，lastTrace=null。

| 输入 | 来源、完整保存与证明边界 |
| --- | --- |
| 正常初店 | [1280完整state](natural-1280.json)、[390完整state](natural-390.json)：真实 Title→选角→二响→商店；只复用旧线索 seed group-natural-17，一次初店两视口，零新种子搜索、零刷新、零购买。当前实跑取得完整货架，不补造玩家购买动机。 |
| 非空管理 | [controlled-shop.json](controlled-shop.json)：同种子领域创建后明确受控加入 b10、c11、T03、U01；两端原生导入。不是自然购买或资源累积。 |
| 九牌与 HUD | [controlled-nine.json](controlled-nine.json)：从上项执行真实 LeaveShop/EnterStage，现有 U01 使入场容量8+1=9；再受控固定九牌顺序并补齐牌区守恒，makeCheckpoint/readCheckpoint 通过；不是自然发到这组牌。没有直接改 handLimit 或生产规则。 |

runId：受控 `w1-controlled-20261007`；持有实例 `w1/b10`（实付4、保存成长0）、`w1/c11`（实付6），工具实例 `w1/T03`，长期物品 ID `U01`。受控金额6、Joker2/5、工具1/2、长期1/4；购买历史未伪造，不能用本档证明6金买下全部组件。

## P1 合法九牌与完整密度

顺序：diamonds-2、clubs-7、hearts-5、clubs-5、diamonds-8、spades-10、diamonds-10、diamonds-12、hearts-7。选中 diamonds-2、hearts-5、clubs-5、spades-10、diamonds-10。原静态组合现在有独立的当前受控合法运行输入；旧静态图仍不追认成历史自然九牌。

首章第1场暖场，目标400/累计0，还需400；金币6，出牌4次、弃牌3次，场内playIndex=0、上手无、Boss无、disabled/sealed为空，无押注、无助攻；完整角色及规则事实见 report.json 的 nine/stage 和实际文字 bounds。二响显示“接得漂亮”，当前 profile 能力边界沿现有规则；本批未增加角色奖励。Joker按 b10→c11 排列，剩3空槽，工具包1/2、长期1/4。未选显示“当前选择 · 选1–5张”；选后识别两对、已选5张、计分4/附带1，可成3种入口与待出牌区均保留。

[手机未选](nine-unselected-390.png)、[手机已选](nine-selected-390.png)、[PC已选](nine-selected-1280.png)。九牌两端可见，选牌前后保存state完全相同；仅原生点选草稿。当前390是单排错叠，并非5＋4两行候选。

## P3 同一正常三货与独立货架

初店 visitIndex0/reroll0/purchases0/soldJoker=false；金币6，Joker0/5、工具0/2、长期0/4，有效牌组52。三货次序与 offerId 完整留在自然state，前缀 `run/group-natural-17/erxiang/shop/0/0/`，如下后缀；普通版次 none 无额外计分，稀有度独立。

| 后缀 | 稳定ID / 名称 / 稀有度 | 实际价 | 当前身份规则全文 |
| --- | --- | ---: | --- |
| joker/0 | b10 练对子 / 普通 | 4 | 任何成组牌型结算后热度成长+10，上限+100，下次起生效；每手任意牌型均加入已有成长，跨场保留。 |
| joker/1 | b11 候场同伴 / 特别 | 6 | 持牌点数与本手任意有效计分牌相同时，按手牌顺序前3张有效匹配持牌各+0.5倍率；失效计分牌和杂牌不提供匹配。 |
| joker/2 | mantangcai 满堂彩 / 普通 | 4 | 对子、两对、三条、葫芦、四条，整手热度+90；扩展牌型不自动继承。 |
| tool/0 | T06 黑桃染 / 独立工具 | 4 | 商店/待出牌可用，选1–3张可见扑克永久改黑桃，保留点数增强版次；成功消耗一件，无额外金币/牺牲；取消/过期/非法/无变化/代价不足不消费。 |
| item/0 | U11 另一间摊 / 独立长期道具 | 10 | 后续开店长期道具货位1→2，当前不补货，刷新不重抽该货架；本局持续，每种不可重复/出售，共最多4件。 |

[PC三货](natural-shop-1280.png)、[手机三货](natural-shop-390.png)、[手机工具](natural-tools-390.png)、[手机长期道具](natural-items-390.png)。三张Joker同时显示；工具和道具沿现有独立tab可达，未画成第四张Joker。余额支持b10/mantangcai付款6→2或b11/T06付款6→0，U11差4金；这是确定即时算术，不是本轮实际购买，未预报关后收入。换牌实际价2、进入牌桌与构筑详情入口保留。

原2026-10-06 b10/b03/b08陈列仍仅受控设计组合，不是此次自然货架，也未偷换/删除历史全文。当前正常初店补齐不等于长名称/所有商品压力通过。

受控库存 [实际入口](controlled-inventory-390.png)：工具 T03 红桃染1/2，长期U01宽桌面1/4，持有即持续，不把工具/长期混同。T03规则与T06对应，但改红桃；U01下一场入场容量+1最多14，当前场不补，同种不可重复/出售。[details.json](details.json)保留当前 resolver 全文与路径；本轮未使用工具。

## P4 同一持有 b10 的管理合同

[PC详情](held-b10-1280.png)、[手机详情](held-b10-390.png)。实际买价4、出售2、余额6→8、成长当前0；展开“规则与操作”后的全文在 details.json.heldText。按从左到右触发。首槽左移disabled/右移enabled；实际右移后末槽右移disabled/左移enabled，再左移恢复。两次真实ReorderJokers均只换顺序/序列，不消费金币。出售打开二次确认，含槽位1/名称/2金/6→8/成长丢失；点取消后完整state等于确认前。未执行出售，不冒称出售收益已到账。

所有详情按钮当前44px高；PC宽203.5，手机73.5，横向gap8。主关闭仍不满足48px目标；禁用边界正确不等于误触/返回体验通过。

## 当前实际使用资源

只检查本批实际消费的10个稳定ID/12输出，未遍历全库。下表文件经字节hash、尺寸解码且与manifest一致；[assets.json](assets.json)留证。[联系板](asset-contact.png)只是已有原图等比拼接的查看证据，按行顺序 erxiang avatar/selection、b10、b11、mantangcai、c11、q、T03、T06、U01、U11；不是新美术候选。b10详情在上述原生DOM图中实际显示，naturalWidth615、加载complete。素材/整屏均实际查看：人像、分岔轨道、Q与染印/桌摊可辨，当前保留这些资源；审美、全身解剖、全部素材统一及聊天母版仍未知，不能按hash替代观感。

| 稳定ID | 用途 | 源尺寸 | 路径 | SHA256 |
| --- | --- | --- | --- | --- |
| erxiang | avatar | 256×256 | public/assets/handdrawn-p08/characters/erxiang.avatar.webp | `9e6ad8631633b5dd22da9edcaef2fd40df037e1c2930bfc8db8b5e3e522342f9` |
| erxiang | selection | 256×320 | public/assets/handdrawn-p08/characters/erxiang.selection.webp | `a5071c29da50d8dac41aff04aee757454d9375da9cb2e84e7f7b45305af0f431` |
| b10 | thumbnail | 128×160 | public/assets/handdrawn-p08/cards/b10.thumbnail.webp | `ea36c7963037921a9b2ea7a9564bbb92edec1bd8f81835086e376715e7775097` |
| b10 | detail | 615×768 | public/assets/handdrawn-p08/cards/b10.detail.webp | `e4ebe4c9f8e35b55ade5e06d65ec5d8af36e6d35d5db664a6588bf0efce58d21` |
| b11 | thumbnail | 128×160 | public/assets/handdrawn-p08/cards/b11.thumbnail.webp | `5022f9aa4b3f48a2c636b4ccec9a08e7f80599709183d71083a0bcb21dc7a3f2` |
| mantangcai | thumbnail | 128×160 | public/assets/handdrawn-p08/cards/mantangcai.thumbnail.webp | `527fcd231970dfb7ff2eb9ee8e9d3f31f219a8c8249b69316698f86014faa15a` |
| c11 | thumbnail | 128×160 | public/assets/handdrawn-p08/cards/c11.thumbnail.webp | `e44a3bb4198e4d631ced39072db46b09fcfeef777d6c012dfc8fb2f8d4c42d85` |
| q | court | 256×384 | public/assets/handdrawn-p08/court/q.court.webp | `54d581a71ea19f50db92c31a404482e494643d4700d6164db50075ee205b9efe` |
| tool-t03 | thumbnail | 128×160 | public/assets/handdrawn-tools/tool-t03.thumbnail.webp | `a3f356a35fd2065b66022c463119c416429a01b6eccc31791d40ff79ac9a28ed` |
| tool-t06 | thumbnail | 128×160 | public/assets/handdrawn-tools/tool-t06.thumbnail.webp | `f430a731f8559493479fcbe6107762ef51d3b76172f952773c726375ef88afe4` |
| item-u01 | thumbnail | 128×160 | public/assets/handdrawn-tools/item-u01.thumbnail.webp | `057ba6b5f7bff038dc51b78bdc10d5c7043380df9a81f2b858081429156b05a3` |
| item-u11 | thumbnail | 128×160 | public/assets/handdrawn-tools/item-u11.thumbnail.webp | `dab1a5b479f969729af4bc341b501afafdf75788ce5532d43be2d1eccc3a6ca2` |

消费路径沿 HanddrawnArt/jokerArt、portraits/characters、GoodsArt/r2ToolInfo→ShopScene/ConsumableDialog/GameScene，源路径均相对仓库。实际缩略 b10/b11/mantangcai 手机96×120，工具T06/道具U11为98×122.5；b10手机详情图容器约162.7×227.8（包含卡框），PC为240×332；九牌Q角标与既有court图保留。不能把容器尺寸当原图拉伸尺寸，也未观察/验收每个未使用detail输出。

## 检查与复现

report.json 两视口PASS：正常同店状态、九牌合法导入/可见9/选5/选态不改保存、P4边界/重排/出售取消一致、pageerror为空。details.json 为补充同档全文和库存入口，assets.json 12输出hash全一致。仅为运行原生UI做一次e2e构建；产品代码未改，本纯文档批不重跑全tests/typecheck/smoke，不拿旧2450通过充本批测试数。

复现：从冻结源码27d31fc安装现有依赖，mkdir shots/w1-inputs-20261007，将本目录RUNNER.mjs、DETAIL_RUNNER.mjs、ASSET_RUNNER.mjs分别复制为该目录run.mjs/detail.mjs/assets.mjs，依次node执行。RUNNER依赖现有harness/ui，DETAIL复用同一构建/档、无新随机搜索；查看PNG和JSON。全部证据文件hash见SHA256SUMS（排除该清单自身）。

该批只测1280×720、390×740；320、短横、1920、触控、物理GPU、音频、玩家解释能力及实际自然九牌均NOT_RUN，延续历史边界。
