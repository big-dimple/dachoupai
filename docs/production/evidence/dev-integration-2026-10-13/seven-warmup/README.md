七批预热/选角合成定向验证 PASS

精确产品前后HEAD 83dbed7fcdc386f05dc42a00dd0a0731f77c99e3，相关九源码SHA256前后相同，src树见report.json。独立固定e2e构建+preview，非HMR；bundle及10截图SHA256见evidence-meta.json。构建身份的dirty包含父待提交独立evidence，不冒称仓库全部clean；src无未提交改动。

只读合成审查：相对PR158，CharacterSelectScene仅加入PR156完整warmOpeningImages/portraitTargets/paintPortrait/warmHeroImage/Container分组改动；相对PR156仅加入PR158完整sampleExpanded折叠、选择/路线/模式/取消复位及模式名称，不覆盖双方。

1366和390各两行：快速首店→入桌与冷刷新→继续，实际当前手Q图未到先入桌，晚图到后同一牌对象恢复Q原图。冷继续两端HUD头像false→true、PC桌边false→true（手机无桌边图）。root、cardViews、每张牌容器/hit、handInput、roleAvatar、heroHit、selectedIds完全相同，发牌未重启；完整state/checkpoint/journal/IDB slots/非lease本地偏好前后相等。无出牌或计分，无pageerror。

两端另验证阿默高清未到时展开技能，晚到后sampleExpanded/sampleAfter/selectedId、root、收起按钮及顶层对象不变；真实收起→重开→收起可用，完整run/IndexedDB不变。10张当前构建截图均actual view。

保留156原断言，仅改临时观察器输出/导入/精确版本与上述合成交互。不扩weak/stall矩阵，不跑全六英雄/三路线或整局。未验真机触感、听感、真人理解、GPU或新数值；未改产品/计划/旧证据，未commit/push。
