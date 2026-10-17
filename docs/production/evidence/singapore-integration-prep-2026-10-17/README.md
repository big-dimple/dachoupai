# 新加坡批次整合准备（部分范围，未发布main）

独立整合分支：`dev/singapore-integration-20261017`。2026-10-17两次只读核对远端main均仍为 `7d7921e76ca794a14e715e3eac3b4d66143862ff`，未发现他人新main提交；未查询CI、操作域名或部署。

本阶段依次普通merge三个精确来源，未冲突，保留源commit与所有作者原FAIL：

|来源|精确提交|整合merge|
|---|---|---|
|评审/待实施计划|`5a2b3f0af0d59bc8846dd895b3bea6d3fe8277d0`|`4b16621ac7b8671cf9836437b1d88c52813719e3`|
|去金鱼|`73a621e57fd8790f634601aa4ab1906ece25cdd4`|`0b55e70eb3d4921760865be29d39d0c651a4fdc4`|
|卡图证据及产品父提交|`38bd514a655cd1c507fdc5d135fd7f71c4cac94f`，产品 `fddb7378112304ead60d67a676e73bb4a3fe2ec0`|`59a2bf60a4eac659b840b3fff9affd8d71b91617`|

被测产品合并候选为59a2bf60，后续本目录证据提交只增加文档/脚本。三个来源相对main的文件交集均为空；合并后每个来源持有的文件均与其精确源码逐字节相同。GameScene/ShopScene/AudioEngine仍与7d7921相同，等待推荐/流程与音频独立修复SHA。不是整批完成，也没有因此解除既有P1。

## 先看作者修复后截图与原结果

实际查看过卡图作者的[390](../card-art-display-2026-10-17/390-zoom-PASS.png)、[740](../card-art-display-2026-10-17/740-zoom-PASS.png)、[PC](../card-art-display-2026-10-17/1366-zoom-PASS.png)、[失败可读缩略/重试](../card-art-display-2026-10-17/390-http-readable-fallback-PASS.png)，以及去金鱼作者的[390加载帧](../loading-visual-cleanup-2026-10-17/390-loading.png)。a11完整构图可见，短横关闭在视口内，失败有可用重试，加载页无金鱼。

卡图[作者检查索引](../card-art-display-2026-10-17/verification-index.json)记录141项定向、build、9个浏览器案通过；全量原日志为 **3800通过、6失败**，并在原7d7921复现同六项。最后追加的单条入口测试包含于141定向结果，不能据此前全量计数推断所有最后断言又跑过全量。去金鱼作者记录18项定向及4浏览器案通过。本整合没有重跑这两套完整矩阵，按产品文件字节完全相同保留其实际范围，原观察器失败也不删除。

## 本阶段窄交叉实际结果

- [build.log](build.log)：合并候选npm run build通过，保留大chunk警告。构建时已有未跟踪评审证据，不能冒称源码/工作区clean构建。
- [cross-targeted.log](cross-targeted.log)：仅scene-resources/loading-progress/source-stage-art三文件，**17通过、3失败**，3项即原有来源舞台图片失败；没有改任何产品源码或测试断言来处理它们。
- [cross-browser-report.json](cross-browser-report.json)：一个有限实际UI路径通过，390×740/DPR2软件Canvas。真实Boot加载门暂扣一张必需图片时4/12、无金鱼、进度未满；完成后原生菜单→图鉴→a11详情→键盘Enter放大→旋转740×320→ESC回触发焦点→新苏轼旧黑底入口并关闭。pageerror为0，最终无残留dialog。未跑新局或声音。
- 已实际查看本整合截图：[390加载](390-loading-cross.png)、[390 a11](390-a11-cross.png)、[740 a11](740-a11-cross.png)、[390苏轼入口](390-su-shi-cross.png)。苏轼这张采样仍显示“高清细节加载中”，仅证明旧黑底入口/关闭可用，**不能当完整高清六英雄复验**。旧六英雄完整图原证据按其SHA保留。
- 740×320关闭为x688/y8、44×44，图为contain；ESC返回a11触发按钮，区别于原y−37的已证失败。

## 原六项失败的责任分配与未修状态

|原失败|责任窗口|现状/下一出口|
|---|---|---|
|assist-profile-ui-copy：same-ID game and shop copy follows the current exact profile in both directions|推荐/流程的GameScene单一负责人|待新SHA；原getter改名导致数组引用/内容不再是原defs，不能把卡图合并当已修。|
|assist-profile-ui-copy：all known identities bind game, shop and AI to the exact definition; only Amo shows assist|同上|待新SHA后仅重跑相关profile/AI与真实新局候选交叉。|
|score-recorded-audio：ordinary hits stay light and key multiplication has bounded three-layer timbre, all cancellable|音频负责人|待新SHA；原actual1.107/expected0.8815保留，不只改断言期望。|
|source-stage-art：same-ID existing detail is bounded and has no legacy/background/unknown substitution|高光来源图/资源预算专项；整合负责人协调父线程指派|本阶段真实复现；ClimaxSourceArt:4的96KiB上限拒绝f09，asset undefined后读url失败。|
|source-stage-art：publishes the existing exact-size image only after decode and current generation checks|同上|本阶段真实复现false而非true；不是卡图zoom已修就通过。|
|source-stage-art：a stale decode cannot publish, and cancellation resolves before a blocked decode|同上|本阶段真实复现finish未定义；资源在进入decode前已被拒绝。|

静态只读计数见[source-crosscheck.json](source-crosscheck.json)：当前f09 detail为163,216字节，超过96KiB（98,304）；72个详情中52个也超过该线。这个计数证明注册时被现有可选来源图保护挡下，**不是52段自然高光的浏览器验收**。源main已经同样失败；卡图产品未改ClimaxSourceArt。后续须在保留有界字节/尺寸/取消保护的前提下确定专用有界变体或批准的预算合同，修复实际接线与合理测试；不能删保护或只改旧45,274字节期望洗绿。当前不擅自扩范围修它。

## 等待后续来源的交叉出口

音频SHA到齐后：核其真实来源与文件交集，读独立证据，结合静音/重开/场景转换及原失败用例做最短交叉，不重跑全部声音矩阵。推荐/流程SHA到齐后：优先确认raw definitions、AI可用、稍后开战留当前局、跳场成功/失败/取消与新底栏/技能提醒；其GameScene/ShopScene与后续联动/正名不可并发覆盖。若改共享style.css、DetailDialog或资源路径，重新核a11入口、短横关闭、旧黑底与loading门。

只有当前三来源准备分支可以普通push。全部范围齐后仍须汇总实际候选SHA和剩余FAIL向用户报告，不自行push main。P08继续in_progress。线上域名代理403、没完成线上一局、未试听/真机的既有边界保持。
