# PR58独审增量：高清请求生命周期

输入已审候选 `ddc88d6e2d387613ffda6c5b86fd592a88e45752`，产品小修 `cfe7b223db134f0311fda72b6633fe05b8cf0d30`。父已实际看PC1613/390前后图，认可角色焦点与减少首屏数学；现有取消/保存/route binding无其它阻塞。这个记录是局部独审，不是用户角色魅力/设备/GPU/听感/W6验收。

唯一源码改动：CharacterSelectScene主shutdown回调清空portraitRequests。监听仍按原方式移除，原图仍在原位置替换、输入目标不重建、加载规则与玩法状态不改。

## 实际复现边界

旧版实际鼠标入口延迟阿默完整立绘，返回标题，令原请求失败，再进相同selector。`before-ddc88d6.json`确认pending时无texture，离场及失败后Set标识仍为true。此Chromium/Phaser Loader重入时自行重排旧请求，原生流程最后得到了高清图，因此旧日志为PASS：本次没有复现“永久低清/永不重试”，不能把旧PASS重命名为完整资源失败。确认的问题是离场后不该保留的请求标识；某些加载路径掩盖了它。

修后同一个有界案例`after-cfe7b22.json`与`after-native-PASS.log`：延迟时标识true；离场与失败后均false；重入总计第二个原图请求并取得opening-portrait-amo；原图可见，确认目标为同一对象，无pageerror且全程没有run。新增标识断言要求shutdown释放与迟到失败不遗留标识。仅这一项1280×720/DPR1/Chromium151鼠标验证，没有重跑八视口、18组合、首章矩阵或本地全回归。

freeze-before/after为精确cfe7b22，源码/index/HEAD相同，worktree clean；typecheck通过。`reentered-original.png`只证明修后有界软件画面，不代替真机。旧八视口图仍属c73，旧两端/恢复图仍属6e，不冒称新版像素证据。

必要证据文档另提交，统一最终精确head CI在PR58列实链，父增量复核协调main，不强推或绕保护。W7/W8/C04/高光与花色待办保持原排期。
