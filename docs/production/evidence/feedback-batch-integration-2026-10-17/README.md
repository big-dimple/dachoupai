# 本轮反馈合批：等待Shop/Boss最终来源

基线 `212e23d547d4fcfdd886f9dfe80699318e77a738`；分支 `dev/feedback-batch-integration-20261017`。当前正常merge产品快照 `a54cb1efea32f6b42fdad37a490e70bfdd864e89`，无冲突；后续只有交接文档。**暂不main，未新增运行来源单测、类型/构建、浏览器或最终集成验证。** 等全部来源到齐后集中一次集成验证，再按授权正常发布。P08仍in_progress。

|已合最终来源|精确SHA|原增量路径完全一致|
|---|---|---|
|数字音阶|`5273a1fa3099d29aba7a1300de7560c3d644ed1b`|22/22|
|高光+新底栏+六英雄名与共性接线|`09249ad5c6e382c56f19a395cbde150d0e3b9153`|52/52|
|手机结算内容节奏|`236acc4cac8b990af9b622179dff4ccdc1e5c774`|2/2|

09249ad5包含此前dfef8971/deee6663/85ee1c0c/1eacdcd0；只正常merge最终来源，没有重复应用owner-only.patch。GameScene与09249ad5逐字节一致，音频三文件保持5273。[完整来源绑定](source-bindings.json)保留原快照与最终来源，三个来源变更路径无交集，规则/数值/存档、素材及包锁未变。

## 静态契约与原证据

scoreImpact五参数和arrival调用点保持；视觉只改峰值/拍长，数字kind/tier/chain分类不变，音频按保存的正向事件取完整乐句档位。技能按钮裸名、共同标识、独立状态、draft及ariaLabel由GameScene owner接入，秦琼取消/AI流程由该来源保留。以上仅静态兼容检查，未签新的整合运行通过。

六个显示技能名为：苏轼余音袅袅、秦琼跃马冲阵、辛弃疾众里寻他、刘娥垂帘听政、文成公主文成和亲、花蕊夫人花蕊赏赐。专属说明/示例/提醒/回看和结算来源投影均按最终来源保留。手机结算236acc4c已自动合入：IntermissionScene/SettlementPresentation与来源逐字节一致，SettlementHighlights/ScoreReview/HeroSkillPresentation保持名称owner原文。渲染读取最终savedSkillName，名称投影与内容收高/奖励重排同时保留，无冲突、未整文件择一覆盖；运行交叉仍等最终集中检查。

[音频113项及短WAV](../score-melody-audio-2026-10-17/README.md)、[高光51项与本地帧边界](../score-posture-pressure-2026-10-17/README.md)、[底栏组件/接线](../hand-action-footer-2026-10-17/README.md)、[名称226项与最终接线17项](../hero-skill-name-projection-2026-10-17/README.md)均只按各自SHA/范围引用，不重跑、不机械相加。视觉owner本地shots不复制或上传。父级播放WAV工具返回不支持audio input，没有试听成功，**heard=false**；参数与录音不代签主观音阶/力度、BGM混音或设备听感。

## 等待与Boss接口

手机结算owner回传44相关检查/类型构建及4例局部看图；源提交仅两个产品文件，不虚构已提交日志链接，不重跑矩阵。

剩余最终来源仅Shop/Boss（01a147f7/01a147ee）。Boss模块d77fd635已交Shop owner，由其正常merge并接线后一次纳入；当前不重复补丁。

接口为 `presentBossPreparation(dialog,run,{valid,onReveal,onFinish})`，返回shown/seen/not-applicable/deferred。Shop保存后首次render之后、其他弹窗之前调用，并删提前切boss；shown真正显示后onReveal才执行setScene('boss')及sourceCue('boss')，seen可保持boss，deferred保持原曲。valid检查原场景/controller/saved run，onFinish恢复店内展示；继续/取消仅收预告，不提交领域命令，去重不进存档。音频模块无需再改，集成时核对去重与恢复。

当前不抢写未齐owner窗口，不查CI/域名或部署，不push main；最终远端整合版复看归父级dot。
