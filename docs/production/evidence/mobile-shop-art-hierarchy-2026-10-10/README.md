# 手机商店美术层级与结算来源回退

输入main `1b258bc728152860fa901f94bbbc788cee5264ae`；产品 `1d47bd420fbe0453e7f8268314cc89e0ff1547b7`。2026-10-10当前候选，待父独审／用户观感；6.1 Medium串行，无并发。

**商店根因及改后：** 起手标识原实色底板位于画像顶部。现在独立放入商品文字区；手机较高竖屏三件图文纵排、仍一屏可见，货架／换牌／培养／提示为轻操作，进入牌桌保持主按钮，报价／不足金币／已购／非空道具提示保留。较矮／短横屏沿已有容量；PC横版保留。短效果沿真实原摘要，不改价格、用途或规则。

**结算证据：** 原来源区域只取已保存且真实生效的角色／大丑牌，较矮布局仍留左右两区。原生无来源样例确可空左区；不能从用户JPEG判定其当局是否网络故障。正常头像布局、来源选择及加载实现均保持；没有图片时用本手实际落牌留影，较小来源带展示至多3张，较大区域至多5张，不冒称整手全展示或无关英雄发动。图片迟到只替换同一区域，数值／奖励坐标和完整保存不变。

用户原图16181／16180已由父亲眼查看。本云按当前Library流程准备并下载两次均失败（download failed），未获得本地JPEG；下列为原生同类复现，**不是原图逐像素验收**。

- 同seed同角色：[原手机商店](baseline/390-shop.png)、[最终手机商店](after/390-amo-shop.png)；[320买用后](after/320-ready-to-enter.png)、[非空道具箱](after/390-inventory.png)、[PC横版](after/1366-before-purchase.png)。
- 普通首章、真实PlayHand受控公开牌：[原无来源结果](baseline/390-no-source-result.png)、[真实落牌回退](after/390-no-source-result.png)。该例不是用户183×4那一局。
- 既有合法c06保存：[正常来源](after/source-normal-final.png)、[慢图期间](after/source-slow-initial.png)、[到图后](after/source-slow-final.png)、[失败回退](after/source-failed-final.png)。正常／慢／失败同一保存，数值与奖励坐标完全相同；首图失败并非自然网络测量。

76定向／typecheck通过。PC1366和390各实际买起手、买用基础工具、进入原牌桌，每笔完整state与原applyCommand相等；查看／取消／提示关闭保存不变，320／740仅必要缩窗。[原生完整事务](native-operations.json.gz)、[正常慢失败完整状态与边界](source-normal-slow-failed.json.gz)、[非空库存／三货架只读](inventory-and-shelves.json.gz)、[基线与无来源真实事件](baseline.json.gz)。没有本地整库回归、FPS、真人／实机／听感签收；最终精确HEAD标准CI另核。

原失败保留：[买牌后快捷提示入口缺失](original-failures/native-missing-shortcut-FAIL.json.gz)及[原画面](original-failures/390-missing-shortcut.png)，已恢复底部轻入口；[初回退卡牌过小](original-failures/390-small-fallback-cards.png)已改为较小带至多3张；[旧三列尺寸断言](original-failures/retired-gallery-assertion-FAIL.log)已按最终行矩形更新。

复跑用已有 `harness/hero-preparation-continuity.mjs`（PREPARATION_OUTPUT可指定）、本目录capture／source-check／inventory-check脚本；均从仓库根运行，不新增依赖。领域／内容／存档身份／音路／公共资产／HeroClimax／IntermissionScene／ResultStage与main相同；无新图、音频、视频或计分等待。

选角样板保全于独立本地 `review/opening-visible-play`／`9123aef0d630776a55f477c245a33570fab59f0c`（WIP，首轮320风险文字越界FAIL尚待处理），不混入本候选。Rex NOT_ENABLED、文化转型PAUSED_BY_USER及原计划依赖保持。

父独审追加窄高／安全区文字预算修正，产品 `4d4fbc71692bc0cedb19e92e245a77369dc96931`。原生390×640的用途／路线重叠16–22px，路线／价格重叠10px；320×740底部安全区34px的用途／路线重叠6–7px。旧三列恢复专属卡面下部路线区与23px用途起点；新图文行仅在可用高度≥693px启用，遇到实际用途底部越过路线时保留两行短摘要、按实际路线高度在价格前留2px，再将用途移至不重叠位置，完整效果仍在详情。390×740安全区34px同批商品原本没有重叠，也保存同法改前后。正常390×740截图与694318e候选逐字节一致（SHA256 f7939895cf41b4b11444fdc292f2ea2bdf9633f2ec2016c2865745db79a6aff1）。

有限原生截图及完整文字边界见 [budget-review/native-text-bounds.json.gz](budget-review/native-text-bounds.json.gz)：390×640、320／390×740+bottom34、320×705新行边界／704旧列回退，以及正常390×740；改后名称、用途、路线、价格的实际文字矩形互不重叠。原FAIL截图均保留。17商店定向、typecheck、计划检查通过；此处依据实际Phaser文字与截图，不以卡框布局断言代签文字。旧HEAD694318e标准CI38050540083／计划38050540080均成功，补修最终HEAD需重新核对；不签真人／实机／全商品组合。
