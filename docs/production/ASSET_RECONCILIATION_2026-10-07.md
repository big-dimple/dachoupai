# 已准备素材对账与下一批入口

更新：2026-10-07。核对源码：`f270ad08276b14b29bfd4ad27edb1edfb029570f`。本笔只读manifest、定义ID与运行映射代码；不是新浏览器、逐图像素、加载成功或审美验收。全部聊天母版未取得，其数量、版本与采用关系未知。

| 当前仓库清单 | 核数与用途 | 映射入口 |
| --- | --- | --- |
| [handdrawn-p08 manifest](../../public/assets/handdrawn-p08/manifest.json) | `originalArtworkCount=81`；81条asset为6角色、72功能牌、3张J/Q/K。165个唯一WebP输出：角色avatar/selection/portrait各6（18）、功能牌thumbnail/detail各72（144）、court3。81原画是manifest声明，本轮未逐一核原画文件。 | [characters.ts](../../src/game/characters.ts)/[portraits.ts](../../src/game/portraits.ts)：头像、选角、完整立绘；[HanddrawnArt.ts](../../src/game/HanddrawnArt.ts)/[jokerArt.ts](../../src/game/jokerArt.ts)：J/Q/K牌面、72功能牌缩略/按需详情；GameScene/CharacterSelectScene消费对应入口。 |
| [handdrawn-tools manifest](../../public/assets/handdrawn-tools/manifest.json) | 51条asset为39工具、12长期物品；thumbnail/detail各51，共102个唯一WebP输出。不能把102导出文件当102原画。 | [GoodsArt.ts](../../src/game/GoodsArt.ts)按domainId/category/purpose映射；[r2ToolInfo.ts](../../src/game/r2ToolInfo.ts)提供缩略/详情与回退，ShopScene/ConsumableDialog消费。 |

两份manifest内的72功能牌ID、39工具domainId、12物品domainId和6角色ID与当前定义一一对应；J/Q/K为j/q/k。只核元数据与静态消费路径，未重新遍历、读取、解码或复算全体WebP，也未证明每张在真实场景都已成功显示。manifest SHA256：p08 `74701e283c39be4e7522795c9dedbd77e5f82c36627aa8ab6d8d21bbc3371f9c`；tools `67a5325342315877b6ea09108e34087f836beccf89ddcd1ba23e54ebea2adb00`。近期少量视觉候选不代表这两批已准备素材的总量，也不替代其映射/复用。

| 下一批分流 | 已知入口与实际动作 |
| --- | --- |
| 已接入 | 上述manifest和代码映射已存在，先按W0/W1冻结的首章状态复用角色、功能牌、J/Q/K、工具/物品；记录稳定ID、用途、对应真实尺寸与源码。这里“接入”仅指静态映射与消费入口，不等于玩家满意。 |
| 待映射 | 上述清单对当前定义未发现缺失ID；清单外或聊天母版未核，待取得确切文件/版本后对照稳定ID、用途和当前映射。没有可核的未映射ID清单，不假称所有聊天成果均已接入，也不因聊天素材未知判现有素材不存在。 |
| 需修 | 从[W1视觉简报](W1_VISUAL_BRIEF.md)及同版真实尺寸/状态复核登记具体缺陷：ID、部位、影响辨认/操作程度、保留与局部修正范围。影响操作的修正前置，具体非阻断精修可局部后置；本轮未查看像素，不新增“必须重画”的ID或断言旧缺陷已解决。 |
| 未知 | 全部聊天母版、清单外候选的对应关系、逐图当前观感、整屏统一程度及用户满意度未核；保留未知，不能把数量/映射或近五张候选当全部美术完成。 |

本记录服务原W0–W9主线中的W1/W2必要素材复用与W3/W4/W6真实场景，不另起美术总计划。必要共享组件与素材映射持续进入首章；当前PC共享布局修复独立有界收尾，不等待全量美术完成。既有证据、原图与未完成状态保留，总体美术质量仍待分项验收。


## 首章实际消费子集补核（源码27d31fc）

本次有限[输入记录](evidence/w1-inputs-2026-10-07/INPUTS.md)实际读到并查看10个稳定ID：erxiang、b10、b11、mantangcai、c11、q、T03、T06、U01、U11，共12个输出（角色avatar/selection及b10 thumbnail/detail等）。[字节/尺寸/hash](evidence/w1-inputs-2026-10-07/assets.json)均与manifest一致，原生界面缩略、b10详情和库存图已显示；[既有资源联系板](evidence/w1-inputs-2026-10-07/asset-contact.png)仅便于查看，不是新候选。当前保留这些资源，不新增全库重画任务。

本子集需修项集中于实际UI：PC商店420px区域分配、条件摘要可比性、详情关闭尺寸；这不是判原图不可用。未检查的detail输出、其他资源像素/解剖/统一、聊天母版与用户满意仍未知；原静态全清单对账边界保持。


## 高频画面复用补核（源码d11f155，2026-10-07）

[本批证据](evidence/w1-first-flow-hierarchy-2026-10-07/README.md)将既有erxiang、b10/b11/mantangcai、j/q/k、T06/U11用于牌桌/三货/候选，不新增原画或风格。两份manifest与有限avatar/thumbnail/court输出的字节SHA重核一致，见[assets.json](evidence/w1-first-flow-hierarchy-2026-10-07/assets.json)。系统Chromium1366/390/短横实际图已查看，候选K显式decode；PC商品与来源图片按现有高度预算扩大，长说明回退保留价格独立区域，候选复用公开牌面并滚入可视区。只补这些页面的消费/可见性证据，不宣布267个输出全部加载、全美术/设备或真人审美通过；母版未知、原历史状态和W2/W6分项门槛保留。
