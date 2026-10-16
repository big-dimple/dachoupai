# 胜利结算布局本地修复

产品提交：3c4018dd870b664f7a582ffbbaad1bf3b4441445；基线/main：8728e18e823ef9cbe28a4350a566de21f1e3127c。独立分支 fix/victory-settlement-layout-20261016，未合并、未 push。

分数与目标/过关说明置顶，人物和本手来源分到下层；奖励有独立底栏。删除从来源穿过目标/加成的连接线、角线和人物热区的多余描边。小屏下一步收成已有的紧凑摘要；短横屏人物与奖励独立排列，来源成长仍在下一步说明。没有改计分、奖励、存档、正式图片或高光过程组件。

## 对比截图

|尺寸|修复前|修复后|
|---|---|---|
|320×568|[前](before/support-320x568.png)|[后](after/support-320x568.png)|
|390×844|[前](before/support-390x844.png)|[后](after/support-390x844.png)|
|740×320|[前](before/support-740x320.png)|[后](after/support-740x320.png)|
|1366×768|[前](before/support-1366x768.png)|[后](after/support-1366x768.png)|

另含 320×568 顶部24/底部34安全区、c04本手读取与手后成长、既有合法旧身份科学记数大分边界，共15张最终图。before 是基线同一 e11 受控终态，不是用户6990/3600原存档；after 同一 e11 经真实出牌得到相同3931分，另两组为合法受控终态导入。没有伪称自然获取或原存档复现。

## 实际验证

- 23项 settlement-presentation 定向测试、typecheck+Vite生产构建、diff --check 均PASS；构建仍有既有大chunk警告。
- 15个画面PASS：文字在卡片内、两两不重叠、奖励分隔线留空、无跨区来源线、主按钮至少48px且安全区可达。已逐张查看最终PNG。
- e11 的5组尺寸/安全区真实选牌、出牌、继续筹备；出牌完整状态等于原领域命令，继续筹备完整状态与journal等于唯一OpenShop命令，未重复奖励。
- 全15组真实回看/关闭、刷新/继续后完整state/journal/IndexedDB/localStorage保持；pageerror均0。完整明细见 report.json.gz，摘要见 summary.json。
- 报告在提交前运行，head记录当时基线。status.json记录最终产品提交和运行中采集的两个源码Git blob，提交未再改产品内容。

## 原FAIL与限制

history 保留安全区成长说明碰奖励线、短横人物名贴奖励线的原FAIL图；其余中间截图/观察报告保留在工作树 shots/victory-layout 下，未删除；早期编辑/编译错误保留在本会话工具输出，已修复。

用户附件 libfile_9949ae8efa688191a3c3d801a9647e07（16285.jpg）已经Library解析确认，但本机原图像素读取BLOCKED：官方materialize助手在Windows调用os.setxattr失败，未安装本地图片。没有审批拒绝；没有声称直接看过原附件。独立完成了同绘制器穿线复现、改版和截图验证，父会话仍可对照其已查看的原附件。

仅本地软件修复候选；真人观感、物理设备、听感与整体P08仍待验收，不扩展C04、不实施平衡建议、不查CI/域名。
