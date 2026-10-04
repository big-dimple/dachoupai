# P08 查看牌组：点数统计与商店复用

源码 624bc28cae3b3f94e19468e91957446ee5d0c577，基线 d1c072dff5055238bd94775a14f2fca44c4d38b8。原游戏菜单入口保留；商店通过同一 RunMenu 查看全部有效持久牌组。显示 A、K、Q、J、10 到2，保留花色、增强筛选和已打出／已弃／手牌标识；商店旧牌区标为“上场”，不把上场 drawPile 当下一场剩余牌堆。

36项相关测试、类型检查及干净 e2e 构建通过。三视口原生输入实际验证开／筛／关全 run、seq、RNG、选牌不变，关闭可达、溢出正文可滚动、场景所有权释放。390四次真实工具确认和刷新续局通过；320／短横复用该已保存状态，没有重跑四工具矩阵。样板均原生导入并经现有存档校验，容量和手牌受控，不证明自然获取或完整流程。

三张完整页均已实际 view：

- [390商店全部点数](390-shop-all-ranks.png)
- [320修改后点数](320-game-modified-ranks.png)
- [844×300短横滚动后点数](844-short-game-modified-ranks.png)（top12／bottom34仅模拟安全区）

[summary.json](summary.json) 与 [browser.json](browser.json) 保留实际 build/source/index/HEAD 身份。[checker-failures.json](checker-failures.json) 保留五次检查器 FAIL：option识别、滚动触点测量、现有350ms关闭保护、正文恰好容纳、刷新后菜单区折叠。产品源码全程未改；同一 clean 构建复用。第五次已通过的390改牌／reload检查仍保留原 FAIL 总状态，最终仅补退出并验320／短横，没有把旧 FAIL 重标 PASS。

checker.mjs 是实际最终检查器；回放时复制到干净源码工作区的 shots/p08-deck-inspector/verify.mjs（相对导入按该位置），从源码 624bc28cae3b3f94e19468e91957446ee5d0c577 运行默认完整 bounded 路径。最终续跑用 DECK_SKIP_BUILD=1 DECK_RESUME390=1，消费既有第五次报告和已保存修改样板；这些身份和实际结果留在 browser.json。不会修改运行时状态来伪装 UI。

本包仅 review，新精确 review CI 另报；domain／save／RNG／素材／手牌布局／火／音频保持原树。P08仍 in_progress；真机、GPU、FPS、听感、整体审美未通过，C04暂停及 V01／L01 门禁保持。
