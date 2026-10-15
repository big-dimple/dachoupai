# 原失败与测量校正

1. `before.json` / `before-*`：最初 main 冷缓存复现，工具缩略图晚于丑牌出现；PC 已请求图全部到达 7168ms。初始 resource timing encodedBodySize 为 0，不能当字节量；后续以 response.body 的实际 WebP 字节数校正。旧数值原样保留。
2. `baseline-visible.json` / `after.json` / `after-*`：开发服务器探索，所有 active 图片持有者包含基础选择扇形中被覆盖的装饰层；初始全共享两槽版本有 PC 拖尾回归，未接收。后续保丑牌/工具各两槽，全局最多四槽（原独立三池可同时六槽），并识别实际顶牌，装饰层后置。
3. `frozen-before.json` / `frozen-after.json`：中间冻结构建，显示共用 FIFO 仍让扇形顶牌排在被遮盖层之后。最终产品 e76d2388 修正此问题。以 `frozen-*-final.json` 才作最终同操作对照。
4. 两次开发服务器浏览器检查超时：一处曾读错 longTermItems 的结构，已改为真实 string ID；另一处开发热更新打断场景进入。保留 `after-sequential-FAIL.png`；改用冻结编译构建，不把探索中的跨版本数据签为验收。
5. GoodsArtLoading 加入渲染后 microtask 分类时，旧测试在任务实际启动前读 signal，产生 `TypeError: Cannot read properties of undefined (reading '3')`；测试改为等待启动，再验证取消，新增顶牌/遮盖层优先级检查。最终 38 定向测试通过。
6. 一次独立 baseline worktree 尚未 checkout 完就启动 vite，报 ENOENT package.json；等待 checkout 完成后正常启动。未涉及权限拒绝或资源访问绕过。

以上是保留的探索/失败，不是正式站点或物理设备结论。图片最终仍有网络与解码等待，不声称无占位或瞬时显示。

7. 原生取消检查的首轮观察器在 GameScene 刚进入时取样，早于正常 EnterStage 保存完成；后续 200ms 内 commandSeq 2→3，phase stage-ready→await-input，产生完整状态相等 FAIL。`faults-FAIL.png` 保留。修正观察器为等待正常 EnterStage/idle 完成再取基线，产品代码未变；没有删除或放宽保存字段断言。

8. 修正 EnterStage 取样后，原生离场检查确实发现 transfer 未 abort：Goods 的 scene lease 已释放，商店实际商品的 Game 预热仍持有同一请求。该产品 FAIL 触发 0caddfa4：实际货架预热按 runId/visitIndex/rerollCount/phase 只读作用域释放，旧作用域取消从进度中退休而非伪报失败；固定角色/JQK 生命周期不变。此前截图与原观察保留，后续以 verified-after/faults 的最终结果为准。
