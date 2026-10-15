# PR187 独立复审 P2：共享/重绘晋升

inputSHA: f36f003c338ae4aab7e50850e311bc57debdec80。
专属修复：ArtTextureLoading.ts、GoodsArtLoading.ts、两者测试及本证据。场景、领域状态、RNG、保存、音频和资源不改；保原四槽总数、各 lane 两槽、图像预算和回调生命周期。原交付的计时/截图仍属各自构建，本次不重拍或改写。

复现：精确旧 ArtTextureLoading 下新增饱和回归，2 goods + 2 HD 占满四槽；queued Joker warmup 被同 key visible 订阅后，两 HD signal 都未 abort，visible 未开始（art-before.txt）。旧 Goods 源码下，同 ID covered→primary 重绘的新增检查中，提权函数调用数为0（goods-before.txt）。两项均复现为 FAIL。

修复：新增请求与共享请求晋升进入同一高清抢占规则；queued/running 同 key transfer 原位提权，不新建 fetch/订阅，也不增加重试计数。已经晋升的重复请求不重复抢占已恢复高清，正在 abort 的高清也不重复 abort。

Goods loading 分支在当前渲染树完成后重新读 primary。只安排一次晋升 microtask，确认仍是当前 entry、场景未销毁、未取消且仍 loading，才向共享协调器提权；保留原 promise/attempt 和局部图片刷新路径。

新增回归：
- 2 goods + 2 HD 饱和时，共享 warmup→visible：两 HD 各 abort 一次；同纹理只 fetch 一次；HD 重新排队后恢复且不被重复订阅再次中断。
- 1 goods + 1 Joker + 2 HD 饱和时，真实 requestGoodsArt 同 ID covered→primary：顶牌在重新排队的 HD 前启动，fetch一次、attempt一次、原刷新回调一次。
- 晋升后 fetch/decode 两阶段分别取消全部订阅，再同 key 快速重入：旧数据迟到不 addImage，仅新进入安装一次。
- Goods 的晋升 microtask 前 shutdown：不提权、不刷新、不贴旧图。

本地47项加载定向测试及 typecheck 通过，适用构建通过情况与新精确CI见PR187后续回执。保护范围以git对象相等核对。先前 gh/GraphQL Forbidden 查询保持停止；使用已授权 GitHub Actions 读取精确新提交的工作流，不改变权限、不合并或 push main。
