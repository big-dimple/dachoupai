# 已打开比较窗的缩放补验

产品/观察器提交 `8e654bf8`；在原分支继续修复，未混入后续培养升级包。

原 c06a4f96 的比较窗仅在打开时选择布局。390×844打开后缩到390×568，普通/长组合/五星的槽位滚动区只余62/41/20px；[原始报告](before-report.json)、[五星整屏](before-five-star-568.png)保留。

修复限定 ShopComparisonDialog：matchMedia change跟随当前视窗移入/移出候选牌，按可见槽锚定滚动，聚焦控制用nearest保持可见；close时解除监听。新开短屏仍恢复原选槽与scrollTop。

精确8e654bf8的3类场景均PASS：同一打开弹窗844→568→844；候选/第五槽、原生滚动、固定返回/关闭按钮完整可达；管理显式返回/关闭恢复第五槽焦点及滚动；直接在聚焦第五槽时双向缩放仍可见；返回购买详情和关闭回货架均通过。完整state/journal/IDB/localStorage不变、dispatch=[]。typecheck、9项既有相关单测通过，父实际查看前后原尺寸整屏图。报告记录的按钮框有亚像素坐标，几何包含判定留1px舍入余量；实际按钮均原生点击成功。

中间修复失败保留于运行环境/tmp/shop-comparison-resize-*-fix-fail：初次重排覆盖view.scrollTop、聚焦第五槽在缩窗后移出、包含断言的亚像素舍入；最终精确提交重跑通过，不借旧PASS。不签物理设备/玩家体验。

## PR创建请求原始失败

工具：`tools.exec_command`中运行GitHub CLI：

```sh
gh api --method POST repos/big-dimple/dachoupai/pulls --input /tmp/shop-four-axis-pr.json --jq '{number,html_url,draft,head: .head.sha,base: .base.ref}'
```

原始stderr（退出码1）：

```text
Post "https://api.github.com/repos/big-dimple/dachoupai/pulls": Forbidden
```

仅确认CLI请求层Forbidden；工具未给HTTP状态码、GitHub JSON响应体或结构化auto-review拒绝，不能据此确认账户仓库权限原因。此前PR145读取另返回`Post "https://api.github.com/graphql": Forbidden`。均停止对应被拒动作，未换通道重试、未改权限。本次只继续已授权的本地开发/测试与开发分支push。
