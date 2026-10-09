# 首章纸墨／共用按压：有限软件证据

产品冻结 `ba0b618`，输入main8943e0d；源／index／HEAD前后完全一致，见report.json。1366×768鼠标、390×740真实触摸：标题→英雄／路线确认→正常购买满堂彩→进入→可见K♦K♣→真实过关→谢幕继续→减少动态下一次入场。每次保存完整状态与真实journal命令重放一致，5次视觉掠过／端；既有同场英雄→路线没有新增遮幕。

按压110ms实测脸scale0.955、命中矩形原值；手机与PC纸墨截图文字可读，无纯色整屏块或额外图片／音频。约6秒PC原生合成短片，仅标题到筹备，不是实机帧率／人类满意签收。手机按压／掠过／低动态图单独留证。新增资源0；原图映射和小夜曲30/80保持。真人、设备GPU、观感及听感未签；W6未完成。

定向命令 `npx vitest run tests/paper-flow.test.ts tests/scene-view-refresh.test.ts tests/pointer-release-time.test.ts`：28项／3文件通过；另一次首轮涉及hero-climax的15项通过；typecheck、production build通过（既有大bundle提示保留）。token旧帧、rAF饥饿保底、低动态变更、blur/resize/visibility取消、立即路由仅一次及按住禁用无激活均有定向覆盖。不重复旧声音包验收。

原FAIL完整保留original-failures：观察器于文档根节点出现前安装在documentElement，换场计数0而实际正常命令已通过；改为观察Document后复查通过。并非原失败也通过，未掩盖失败。原与最终harness均保存。

最终精确head CI随draft另核；本包仅候选，不预记main或实机通过。
