# 六人正式主题接线；正式立绘下载阻塞

基线为 `feat/loading-preload-20261015` 的 `9c41dfff2a66ffa66b5cf812c2742caae9cdf125`，独立分支 `feat/approved-character-art-20261015`。本批只完成已确认主题的展示接线，不能作为六张正式图接入或眼神验收完成证明。

## 已完成

`HeroIdentity` 六个展示主题由用户明确确认：

| 技术ID | 人物 | 展示主题 | Library 返回的原始文件名（仅元数据，未实际看图） |
|---|---|---|---|
| amo | 苏轼 | 风起赤壁 | 苏轼：风起赤壁.png |
| touye | 秦琼 | 踏破山河 | 秦琼：踏破山河人體藝術.png |
| laohuan | 辛弃疾 | 墨影醉里挑灯看剑 | 辛弃疾：墨影醉里挑灯看剑.png |
| erxiang | 刘娥 | 大宋之母 | 刘娥：大宋之母(2).png |
| azao | 文成公主 | 藏地迎宾 | 文成公主：藏地迎宾.png |
| xiemu | 花蕊夫人 | 执剑凌风 | 花蕊夫人：执剑凌风.png |

秦琼展示主题按用户纠正去掉异常尾字；上表保留工具实际返回的原始文件名，未改原图。人物与文件内容对应关系仍需逐张像素确认，未按上传顺序推定。

选角沿用 `CharacterDefinition.title`，说明页新增主题正文，高光保留真实技能/来源标题与真实效果并在归属字幕附人物主题。无新加载系统；`CharacterArt` 仍为空，未虚构路径/尺寸/裁切/SHA，也没有注册不存在的图。

`themes-browser.json` 为本次原生浏览器报告：1366×768/DPR1、390×740/DPR3、320×640/DPR2，各逐六人切换，主题边界及只读说明通过；18次说明开关 localStorage 不变，旧人物脸/姓名占位资源请求0、页面错误0。已实际查看三张选角截图及320说明截图；长主题辛弃疾用于截图，正文仍清楚列“做什么/何时能用/现在”。这些图目前只有文字入口，不能验收立绘、头像或带图高光。

必要检查：typecheck、4文件19项相关单测通过；build/content日志见本目录。`src/domain`、`src/application`、`src/content`、`src/platform`、`src/core`、`src/audio`、`public`、`art` 与基线无改动，规则/保存/原图/已有预载实现保持。

## 原图阻塞与重试

已按当前 Library `prepare_materialize` + 官方 `library_file_transfer.py materialize` 流程准备六个确认ID，下载目标 `/workspace/approved-character-art/`；六次均失败。重新准备签名传输并指定 `/workspace/approved-character-art-retry/` 重试，六次仍失败。两目录最终为空，无本地可读原图；没有把其他环境路径当本地路径。只对返回的下载地址作HEAD诊断，结果 `URLError: Tunnel connection failed: 403 Forbidden`。这不是图片解码错误，也不是权限审批拒绝；未使用猜测下载URL。准确文件ID/文件名/声明字节记录在 `attachments.json`，不保存签名URL。

Library read 返回前三图为1122×1402的图像指针/说明，未提供可查看的本地像素，因此该尺寸只属元数据，不作为实际分辨率验收。其余图未猜尺寸。不能确认姓名文字位置、人脸/眼睛范围或裁切边界。

## 未完成与下一步

六原图落库、逐张图审与文件映射、保留原图/派生资源、头像/高光安全裁切、正式资源注册、解码预算、PC/320/390带图验收、缺资源恢复及高清数字与头脸完整性检查均未完成。带图高光主题排版亦待原图可用后检查。用户已验收眼神，本批不重绘/不修改原图，不将立绘裁切冒充独立眼神原画。

父任务可另派仅取文件的本地任务，从 `D:\ai\dachoupai\lihui` 取回六张备份并送到本云环境，再继续本分支。未到用户Windows开发；未合main、未部署、未查CI或域名。
