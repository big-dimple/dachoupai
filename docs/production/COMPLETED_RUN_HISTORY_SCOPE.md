# C04.3 完成局历史：原子保存合同

2026-10-09。输入父13:48UTC已FF PR86 main `4d2d78e6be692aa48cb9ee62fb99918aa6e10453`。父明确授权此单一子包，游戏6.1默认Medium串行；不恢复整个C04，不改变原plan.json/resumeContract/W6/W8历史状态，不重做八章工程或补造自然/真人验收。

## 触发与必要事实

只在SavedRun.submit实际非重复命令使本机当前非终态局转为run-won/run-lost时，构造一个不可变结果摘要，并随该候选checkpoint成功提交后可见。start/import/restore、只打开终档、回看、重复点击均不归档；旧终档无记录就留空，不补录。未完成局和数字上限未终结巡演不记完成。主动放弃按真实abandoned原因显示，不能当战胜或战败计分。受控原生终态验收明确是软件夹具，不能宣传自然八章通关。

摘要仅version、记录/局次身份、runId、终态commandSeq、本机保存时间、角色、原contentVersion/hash、mode/difficulty/challengeId/programsEnabled、normal/endless阶段、终态及outcome原因、到达章节/场次、实际累计热度、可选最后一次实际计分的牌型/热度/rootId/打出张数。最后一手明确不是全局最高；无lastTrace显示无实际计分记录，不填0分假高光。不复制牌堆、全部trace、图片或录像，不加排行榜/分享/服务器。

## 局次身份与去重

同seed重试可能沿用runId和commandSeq，不能仅按runId去重。每个新局/重试/导入候选分配独立attemptId，作为IndexedDB保存槽的外围元数据；不改领域state/checkpoint格式、内容hash或随机。提交命令沿用局次ID，current/previous分别保留自己的ID，恢复选择正确的ID。旧槽无ID时在下一真实提交中带入新ID，读取或打开旧终档不写元数据/历史。

归档ID为attemptId + normal/endless阶段：八章胜利是“正常巡演·八章通关”，之后真正无尽终局是“无尽续演·终局”，同一局次可各一项，不能把后者算第二次八章胜利。新局/同种子重新挑战是新局次。稳定ID索引与保存顺序记录key同时写入；已有同ID同事实保留原记录/时间，不追加，冲突或坏指针明确失败保留原数据，不能覆盖事实。列表按成功保存顺序最近在前，分页读有限条，不自动删旧记录。

## 原子事务、失败与替换

沿现有dachoupai-checkpoints v1数据库/saves对象库、WriteLease与meta.revision CAS；不升数据库版本，不新建独立localStorage历史。一次readwrite事务包含current完整候选、previous完整备份及其局次ID、meta新版本、历史摘要及去重指针。没有终态触发时不写历史。事务完成前不发布候选、不通知UI/通关进度；历史写入/校验/CAS/配额失败全事务回滚，旧checkpoint、备份、历史、meta均保留。

失败保留同一pending checkpoint/摘要/时间/局次ID，重试只再次持久化，不能重放领域命令、结算或奖励。现有saving/paused/readonly、候选导出、保留数据导出和接管行为保持。新局/重试/导入仍先flush当前局，失败不得清旧局；成功替换只写新候选，与已归档事实无耦合删除。未保存的新候选仍沿原replacement隔离/取消机制。

只读历史读取不改变mode/meta指针、当前局、手选或随机。存储不可读/坏历史显示明确失败并指向原菜单导出；不能假装空历史、删坏记录或迁移补录。异步读取以弹窗代次保护，关闭/换局/销毁后旧回调不回挂；详情使用短记录与现有手绘DetailDialog，无码预测或完整演出重播。

## 文件与有限验收

允许新增application完成局摘要及game历史弹窗；SavedRun仅pending/保存参数的必要接线，IndexedDbSave仅槽元数据、同事务追加/去重和分页读取，RunMenu仅主动入口/销毁，style.css仅历史DOM；相关tests、受控pre-terminal fixture和本包证据/原计划入口。session/计分/domain/content/BGM/图片系统/整个牌桌/存档schema/部署/CI只读。

定向正常终态/无最后手/normal与endless/重复/恢复/同seed新局次/导入终档不补录、原子失败保current/previous/历史/meta及同候选重试、新局失败保旧。原生仅PC1366与390代表读历史，单一受控终态经生产动作实际提交；一个IndexedDB历史中途故障/回滚/原菜单重试，必要一次恢复与终档导入负例，不跑24场/seed扫描或全矩阵。按SHA保失败、结果与截图；最后一个精确head标准CI，draft父独审协调main。自然八章、真人、设备、流畅度与听感未签。
