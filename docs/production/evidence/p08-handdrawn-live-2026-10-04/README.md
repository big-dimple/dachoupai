# P08新手绘真实场景候选 · 现成两图

本证据分支从已发布main `5bb749fe3220adaf3055412e483ef42515b89726` 建立，只新增这两张PNG与README；不包含未验候选源码，不代表main部署画面。工程已实际view两图；父侧独立视觉验收待进行。

输入来自授权素材commit `c618cee93089bb2e556f16567709b0ea23abbcb9`，consumer manifest/portable verifier与43文件逐size/SHA通过。20原画对应43WebP、1262668字节；覆盖六角色、J/Q/K、11功能牌（f04/e07/f09/f07/d07/a07/a08/c03/d02/e02/e09），不是72牌全换。未覆盖ID保留旧图。

- CSS viewport390×740；DPR1；safeInset top/right/bottom/left均0；Chromium151.0.7922.173，Canvas（外部浏览器适配禁GPU/software-rasterizer）；减少动态。
- 六人选角图：自然标题→选择角色输入，全部六张新4:5预览已真实加载；高清portrait/detail首屏未请求。
- 牌桌图：通过原生导入的validator-approved九牌fixture，阿默持f04/e07/f09/a08/c03，手牌J♣Q♥K♠5♥5♦加四牌，已选前五。不是自然购买；图中三张J/Q/K是独立新牌面，五张功能牌为新完整插画。
- BASE_URL `/p08-reviewed/`，缩略图实际请求路径、非空响应size/SHA与runtime逐一相符。Phaser图片src为blob，不能拿它伪装原URL。f09高清仅打开详情后请求；实际前景解码615×768、45274字节、SHA `75454d0abbecabca7e6cc29a5e8c927e50003177f760176741657196a02085b0`；旧f09-layer/lamp节点均0。

构建embedded version `C03`，revision `5bb749fe3220adaf3055412e483ef42515b89726`，modified=true，builtAt `2026-10-04T02:21:49.935Z`。候选当时未提交；没有冻结的候选源码commit。以下“source”指精确被测构建的JS源码产物指纹（sorted build/assets/*.js相对路径+NUL+文件内容+NUL），避免把随后继续修改的工作树冒称截图源码：`5a0befddcf3e4ded06d6ee5ca8722cb214732fa06982d55bffc8e083ffc52ba9`。

Runtime指纹（sorted43WebP相对路径+NUL+内容+NUL）：`ceaa2aca60155d849649f91394671e233245d2303687c07dbb63b1b4787de7e8`；消费manifest SHA256 `429aa1791919a4f38c3577d03cb2b278e476ccaed5362474debe07bf65a8b05a`。这两图不会随后续候选源码变更自动更新。

PNG SHA256：

- `390-new-characters.png`：`318b6a524451251b7ca4cbc47083dd25cfaaf5d3de7d7352a6a0d912c01ff8a7`
- `390-new-courts-jokers.png`：`3b5fd2f3f6a02c42bfbb5bb43f58f3a79ac58854ec3d1bd6b2ba94b03c03adec`

四状态：候选接入实现完成；本条自然选角/fixture可见/子路径/hash/HD按需/无旧叠层技术通过；整体审美待独立复核；OnePlus/真实GPU/听感NOT_RUN。没有新增录屏或图集。
