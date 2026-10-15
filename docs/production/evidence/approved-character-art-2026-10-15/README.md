# 六张正式立绘接入云端开发分支

本次已完成六张正式立绘的选角、说明、头像、筹备/结果和高光接入；仅开发分支 `feat/approved-character-art-20261015`，未合main、未部署。用户的眼神验收保持，本报告是云端资源接入与受控浏览器验证，不重新代签审美或物理手机体验。

基线：加载分支 `9c41dfff2a66ffa66b5cf812c2742caae9cdf125`。先前主题提交 `53b5283a1ae8a02255a124fc8f450743583f0e23` 保留。来源提交 `e6922f8d56cf42b9dedd4eab00d772591a7b79ad` 经核对仅7文件后安全cherry-pick为 `b4dbda6367c5e37c61c03511114d97ad9229f971`，没有合入其它分支修改。加载动画独立线程的表现代码未取用。最终产品提交 `111039b12ca3269e1bc1f574fa19ddb8f62b2c2d`，src tree `76a0912d70649cb24875f901d8437fa97022bdd9`；后续交付提交只补文档和证据。浏览器报告保留当时b4dbda63＋工作区实现的身份，最终文件哈希由 `validation.json` 绑定。

## 原图、人物与裁切

原始目录 `art/sources/tangsong-portraits-20261015/`；六张PNG均在本云端逐张实际查看，尺寸1122×1402，完整解码并核对来源manifest的原始字节数/SHA256。原图全部保持原始字节。以下坐标均为源PNG内的 `(x,y,width,height)`。

| 技术ID | 人物与正式主题 | 原图文件 | 头像/头脸特写共用安全裁切 |
|---|---|---|---|
| amo | 苏轼 · 风起赤壁 | `amo-su-shi.png` | 350,0,480,480 |
| touye | 秦琼 · 踏破山河 | `touye-qin-qiong.png` | 215,0,600,600 |
| laohuan | 辛弃疾 · 墨影醉里挑灯看剑 | `laohuan-xin-qi-ji.png` | 340,0,520,520 |
| erxiang | 刘娥 · 大宋之母 | `erxiang-liu-e.png` | 285,0,550,550 |
| azao | 文成公主 · 藏地迎宾 | `azao-wen-cheng-gong-zhu.png` | 160,0,650,650 |
| xiemu | 花蕊夫人 · 执剑凌风 | `xiemu-hua-rui-fu-ren.png` | 260,0,640,640 |

苏轼左侧题字与赤壁文人、秦琼右侧旗字与披甲双兵器、辛弃疾右侧姓名/左侧诗文、刘娥右上“大宋之母”匾额、花蕊夫人右侧姓名与花饰执剑均已看图辨认。文成公主无同类姓名题字，以藏地雪山宫殿、前景盛装女性与已确认来源映射核对，不按附件顺序猜人。文字面板不进入头像/头脸特写；源画面范围内的头发、头饰和脸保留。完整展示仍保留原画题字。

来源manifest保留原文件名，包括秦琼原名异常尾字；展示主题使用用户纠正的“踏破山河”。本批实际使用仓库转移原图，不宣称先前Library下载已成功；历史失败记录见 [transfer-blocked-history](transfer-blocked-history.md) 与 [attachments](attachments.json)。本轮没有在用户Windows开发。

## 资源与预算

`scripts/build-approved-character-art.mjs` 生成 `public/assets/tangsong-portraits/manifest.json` 和24张WebP。每人：256×256头像、256×320完整选角缩略、615×768完整立绘、480～600px头脸特写。后者来自上述源图安全裁切，明确 `independentEyeArtwork:false`，没有伪造独立眼神原画。全部使用原有 `CharacterArt` key/URL/尺寸守卫、共享纹理解码队列、进阶详情与缓存；每图≤128KiB、≤600000像素，没有放宽现有加载器守卫。

高光首次镜头使用 `portrait-focus-*`，完整立绘用于主体镜头；缺特写时走完整主体镜头，不回到有姓名文字的泛化眼部裁切。特写按实际源像素与framebuffer密度限制缩放≤1；没有放大小眼睛。字幕保留真实技能或来源标题和已保存效果，诗性主题只作人物归属，不改变规则含义。人物“待交付”标注已移除。

启动/场景预载只加入12张头像与选角图，完整立绘和头脸特写仍按需加载。首轮16MiB会漏掉13张原有小图，已保留该真实失败并将新预算设为20MiB。

- 全启动目录146项，保留72大丑牌和51工具/道具，实际4,458,496像素／17,833,984B RGBA（约17.01MiB），低于20MiB上限。
- 六人启动小图共884,736像素／3,538,944B RGBA。
- 每位选中英雄的额外完整立绘＋特写最多832,320像素／3,329,280B RGBA（约3.18MiB）。
- 全24张人物图合计5,601,956像素／22,407,824B RGBA；若六人均已查看并保留全部人物纹理，启动目录加全部可选图的理论采样RGBA约35.00MiB。这是图像解码预算，不是整个浏览器/GPU总内存承诺。
- 24图编码共1,733,342B；源PNG不进入启动预载。逐文件尺寸、哈希、裁切、质量和预算见 [art-audit](art-audit.json)。

## 实际验证与截图

[带图浏览器报告](art-browser/report.json)：1366×768/DPR1、390×740/DPR3、320×640/DPR2三组正常＋390缺完整立绘＋390迟到切人，共5组PASS。每组逐六人查看选角和只读说明；正常三组逐六人核验头像HUD和结果。迟到切换未串人；缺完整立绘仍保留选角图；旧戏班角色脸请求0、页面错误0，查看说明完整state/journal/storage不变。新建局通过真实选角确认，HUD/结果使用校验器接受的受控checkpoint，不代签自然经营。

[主体高光](climax/summary.json)：苏轼、秦琼、刘娥、文成公主、花蕊夫人390普通；苏轼/花蕊PC；花蕊320与390四倍速，共9组PASS。[辛弃疾高光](laohuan-climax/summary.json)：PC、390、320及390四倍速共4组PASS。均通过真实输入触发原技能，完整事务state/journal/storage/localStorage与原命令oracle及冷恢复一致，数字独立高清文字绘制；头脸特写按实际密度没有放大，保留原主体实墙钟≥1秒。

[缺图恢复报告](recovery/report.json)：PC/390各启动头像404→重试与文字继续，共4组；另核验立绘缩略/完整图缺失时文字仍可用、原生“重试立绘”恢复615×768图、故障提示消失、完整保存冷恢复一致。发现并修复详情状态真实缺陷：重试成功后，另一路高清失败提示残留。沿用原请求/解码流程，成功时取消旧升级订阅并清理同一图片的提示；控件会移入滚动列，因此保留控件身份进行清理。首轮及第一次修复遗漏重挂载位置的FAIL均保留在 [failures](failures/)。

已实际查看以下原生截图（手机图保留设备像素）：

- [PC苏轼选角](art-browser/1366-normal-amo-selection.png)、[390秦琼选角](art-browser/390-normal-touye-selection.png)、[390刘娥选角](art-browser/390-normal-erxiang-selection.png)、[320辛弃疾选角](art-browser/320-normal-laohuan-selection.png)、[320花蕊夫人选角](art-browser/320-normal-xiemu-selection.png)。
- [390文成头像](art-browser/390-normal-azao-hud.png)、[390花蕊头脸特写](climax/xiemu-390-normal-shot-0-eyes.png)、[390花蕊真实×2](climax/xiemu-390-normal-shot-1-skill.png)、[PC辛弃疾特写](laohuan-climax/1366-normal-0-eyes.png)、[320辛弃疾实际留牌](laohuan-climax/320-normal-1-skill.png)。
- [390立绘恢复](recovery/390-detail-recovered-view.png)，源图/头像/特写均已实际看像素；生成的接触表只是本地检查，不作为新原画。

检查日志见本目录 `art-*`。旧无正式图测试预期已同步为同ID的正式资源路径，原规则/存档断言保留。首轮全量14个旧图预期＋1个V00超时、次轮仅C02超时均原样保存；两个超时测试在单worker复核中均通过，未放宽超时或删保护。最终串行全量267文件/3641项、typecheck、生产build、content、plan均通过，详见 `validation.json`。

`src/domain`、`src/application`、`src/content`、`src/platform`、`src/core`、`src/audio` 与基线逐树保持，原手绘资源/历史manifest不动。只新增六PNG源包、人物派生资源与展示接线。没有未解决的原图可读性阻塞；独立眼图不在此次交付之内，未宣称物理设备、线上性能或整体美术验收。未合main、未部署、未查CI/域名。
