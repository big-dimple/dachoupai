# 继续无尽确认文案（有界验证）

基线 main `c2b506174d9add1df43eb9d94dbebe2bb974090f`；产品提交 `471391dd5d346efd035bbd722bb4f1df92061a5d`，`src` tree `f9c10b1682d5f2a74780726083c7e7915045dfa2`。开始前查询公开 PR 及相关远端分支，未发现等价修复。

仅把 IntermissionScene 确认正文接到纯展示 helper：使用目标服务相同的 `isR2BoundedClear` 完整 version/hash 判定，从既有 `R2_BOUNDED_TARGET_CONTRACT` / `R2_ENDLESS_CONTRACT` 读取倍率，再用既有精确分数格式化函数显示。新身份 1.1、旧身份 2.4，均注明最终向上取整；没有复制规则常数。

129 项相关测试（6 文件）通过，覆盖专项文案、无尽目标/命令/保存、bounded-clear 和留影。独立预期覆盖新身份 D0–D3、C8–C10 全场次：D0 暖场 20475→22523→24775；最后一个值排除逐章对已取整值再乘的错误 24776。旧 v10/v11/route-growth/active-mult 文案及目标保持 2.4。`npm run build`（含 `tsc --noEmit`）和 `npm run verify:content` 通过；构建保留既有大 chunk 提示。

[原始浏览器报告](report.json)记录同一洁净产品提交的四条路径：bounded-clear、历史 v11 × 1366×768、390×740。合法受控后期状态在领域服务完成最后一手，严格 checkpoint 校验后经真实菜单导入；浏览器用原生鼠标/触摸打开、取消、确认，并刷新后从标题继续。

- 文案与实际身份/目标一致，按钮 ≥44px，无横向溢出，四张原尺寸 PNG 均已实际查看。
- 取消留在胜利页，完整 state/journal/storage 逐字段相等。
- 确认只增加一次 ContinueEndless；全状态等于原 applyCommand；第九章商店、牌组/持牌/成长/道具/金币/身份/原结果及存档一致，冷恢复完整相等。
- 去除唯一正文替换及新增 import 后，整个 IntermissionScene 与基线逐字节相同；domain/application/content/audio/public/.github 及三处计划入口无改动。PR172/174/173 文件窗口未触及。

首轮夹具在入场后添加持牌，被 `live stage joker identities` 守卫拒绝，0 条浏览器案例启动；[原 FAIL](attempt-1-fixture-fail.json)保留。只把夹具持牌布置移到入场前，守卫、产品与断言不改，随后四条通过。[复现脚本](check.mjs)仅将当次脚本的绝对导入路径改为仓库相对路径；在洁净仓库根目录执行 `node docs/production/evidence/endless-confirmation-copy-2026-10-14/check.mjs`，输出默认位于 `/tmp/endless-confirmation-evidence`。

验证仅为软件 Canvas、系统 Chromium、DPR1/减少动态；没有自然试玩、八章自然可达率、真人/实体设备/听感或平衡验收。最终文档提交沿用相同产品树，精确最终 HEAD 的远端 CI 回执见 PR；未合 main、未部署。
