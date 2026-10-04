# P08 工具入口 review 检查点

实现 0d21cd4d541183c6a91304709184132ade34297e；实测源码 1354a808ae98e04ec21482f96c8587c4d9ee394c；已正常合入 main 7d44b8bcada32942acded87d70abe78dea12f275。

Game 与 Shop 常驻“工具 x/y”。空库存能看购买后使用说明，消耗工具和本局道具分组；继续使用现有选目标、确认及保存命令，商店专用工具在牌桌只能查看。

93 项相关单测、typecheck 和四种尺寸原生流程通过。每种尺寸 Shop/Game 各有效使用一次，全状态同 applyCommand；关闭、取消、商店专用检查不消耗，原生 reload 恢复库存。8 个保存命令、8 张场景完整页及1张空库存图。软件 Canvas/DPR1、减少动态、合法导入样板；非自然连续获取、真机/GPU/听感验收。

普通9牌工作区和原手牌/底栏逻辑坐标保持；expanded14竖屏仅收紧与入口相交的待出牌视觉区（本轮只有单测覆盖）；safe34短横进度线上移4px。当前main资源与Joker新文案逐路径保持。

失败记录见 [retained-failures.json](retained-failures.json)，完整验证见 [browser.json](browser.json)，边界/检查点见 [summary.json](summary.json)。根独立图审、新reviewCI与main串行放行仍待完成。

[shop-320x568-safe0-0.png](shop-320x568-safe0-0.png)
[game-320x568-safe0-0.png](game-320x568-safe0-0.png)
[390-empty-inventory.png](390-empty-inventory.png)
[shop-390x740-safe0-0.png](shop-390x740-safe0-0.png)
[game-390x740-safe0-0.png](game-390x740-safe0-0.png)
[shop-844x300-safe12-12.png](shop-844x300-safe12-12.png)
[game-844x300-safe12-12.png](game-844x300-safe12-12.png)
[shop-844x300-safe12-34.png](shop-844x300-safe12-34.png)
[game-844x300-safe12-34.png](game-844x300-safe12-34.png)
