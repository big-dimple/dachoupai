# 大丑牌手绘运行资源候选 · 2026-10-04

本独立资产包包含20张原画对应的43张已冻结WebP，共1,262,668 bytes。手绘方向已获用户认可；最终游戏内采用与验收仍分别待完成。

## 通过GitHub取得

仓库：big-dimple/dachoupai
独立分支：art/handdrawn-runtime-20261004
父提交：5bb749fe3220adaf3055412e483ef42515b89726
目录：art/sources/handdrawn-runtime-20261004/

在已有授权仓库中正常fetch该分支，读取上述目录即可。运行本目录中的 node verify-runtime.mjs 应得到43文件、1,262,668 bytes，所有尺寸与SHA256一致。脚本无外部依赖、网络、写操作或源PNG要求。消费端应先验证明确分支提交SHA及这些文件，再单独完成工程接入。

## 映射与加载

- characters/：6角色azao、amo、touye、laohuan、erxiang、xiemu，每人avatar、selection、portrait三个用途，共18资源。
- court/：j、q、k人物画，共3资源。生成原画为近似镜像构图，不是像素级双头实现；花色与点数仍由独立UI表达。
- cards/：11功能牌f04、e07、f09、f07、d07、a07、a08、c03、d02、e02、e09，每张thumbnail、detail两个用途，共22资源。
- c03与e02均为确证准用修正版。本包不包含旧被拒版本、原PNG、QA、ZIP或生成脚本。
- 头像可作小型首屏资源；缩略只按可见内容加载；portrait/detail按需，不把全部高清资源放进首屏。

manifest.json保留确定ID、用途、相对路径、像素、bytes、SHA256和公开素材交付提交（deliveryCommitURL）；该commit是公开交付来源，不是图片生成来源。不发布私有Library标识或私有会话链接。当前版本移除，旧Git历史仍保留原记录；不改写历史。

## 检查及边界

仅完成交付用的原字节hash、WebP尺寸/解码、资源总量、便携校验脚本及远端树/提交核对。独立art分支不修改main、src、public、运行时注册、玩法、存档、CI、部署或合并。包本身不代表已接入、游戏测试或上线。

J/Q/K精确双头与f09同坐标透明叠层未实现。整体审美、脸部盲辨、目标设备/GPU及最终游戏内接受度仍由对应工作包验证，不能以资源可读取代替。
