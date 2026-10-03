# P08核心对局信息批1 · 单张早评候选

[390×740选牌实际静帧](390-selected-straight.png)。本分支从已发布main `5fa9704395c4a1481069daec48b5919349731b77` 建立，仅含此PNG与README；候选源码未提交、仍在原 `dot/d44-layout` 工作树，不是main现场或新素材。

- 候选全src指纹 SHA256：`8b81d8b526d9ff0f76481cee4c1ecf7d11abac28bc0e6837cd579a10645ed28f`（路径排序＋NUL＋文件bytes＋NUL，含新纯facts文件）。
- Embedded：C03 / revision5fa9704395c4a1481069daec48b5919349731b77 / modified=true / builtAt 2026-10-03T23:40:20.636Z。
- Chromium 151.0.7922.173，Canvas（禁GPU/software-rasterizer）；CSS390×740，DPR1，safeInset全0，PNG390×740，SHA256 `2f9b30b49d3dce1e2fa064013197df66848be5db1c47f9d60db0b43062d3f624`。未经改绘／裁切，工程已实际view。
- 明确fixture路线：既有createRun／LeaveShop／EnterStage→合法checkpoint校验→真实菜单导入→原生touch选Q♥、J♥、10♥、9♠、8♠→选择说明→关闭。持有c08/c09/f09为测试配置，不宣称自然购买；这一手成型5／有效5／附带0。
- 候选改动：共享真实eval／完整持有mods／失效／普通点数压制事实供scorer和UI复用；牌型标题始终可见、静态四牌规则与同花顺仍5张可读；去掉选牌预演数字／链／火；现72短条件复用r2Help、完整持有条件进统一详情。实际出牌计分不改变。
- 已检查：73项facts/Boss计分相关单测、type与本次build；真实touch选择／详情取消、无预测数字或来源入口／火，完整run/RNG/journal/resources不变。最终全路径／9与14手势／冻结verify:ci尚NOT_RUN；整体方向待父侧独立早评，目标OnePlus／真GPU／听感NOT_RUN。

本图只供早评，不作为整批技术／审美验收完成。后续可见手牌推荐与完整条件家族等待同一主线规格，不在本候选盲扩。
