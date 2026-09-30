# 大丑牌 Dachoupai

扑克构筑 Roguelike：通过出牌、弃牌、改造牌组与大丑牌连锁，完成一场荒诞巡演。品质目标对标 Balatro 的核心玩法和操作体验，视觉不照搬其素材与界面。

**当前代码是整改中的 r2 原型，不是完成版。** 已接入六角色新能力、五张大丑牌、准确的牌型/计分牌结算、每场 4 次出牌与 3 次弃牌、商店与完整存档恢复。桌面、竖屏和横屏已有响应式操作布局；真机手感、美术、Boss、完整内容与数值平衡仍有独立验收。

点角色查看能力并确认开局。商店点货品看效果、余额与利息档，再点购买；装备详情可左右调序，出售另有确认。手牌轻触选/取消，长按只查看；可按点数/花色排序或拖动，排序保留选择。Joker 触摸长按后拖动调序。计分牌有描边和星标；出牌、弃牌是底部独立按钮。牌组详情提供剩余/全部及增强筛选，按花色点数展示，不公开抽牌顺序。320px 或较矮竖屏采用紧凑布局，完整效果在可滚动详情中查看。

骰爷通常倍率 ×1.15，角色详情可选择本场押注一手，预览显示 50% 的两种可能结果。谢幕人详情显示最后一手状态。分数先计分牌、再角色、最后按装备顺序执行加乘；杂牌也会离手，但不给普通点数。旋转保留选择和确认内容，结算中旋转直接显示已保存的结果。

菜单可继续本局、导入/导出完整进度、调 1×/2×/4× 演出速度、静音、快进和回看上一手。出牌/购买先保存确定结果，再展示；未保存会暂停后续操作，可原样重试或导出内存结果。多标签默认只有一页可写，接管先读取最新进度。旧版或损坏数据会保留可导出的备份。

开发 AI 从 [AGENTS.md](AGENTS.md) 开始。人类阅读入口是 [审查与策划目录](docs/production/INDEX.md)。

## 运行当前原型

```bash
npm ci
npm run dev
```

```bash
npm run verify
npx playwright install chromium firefox webkit
npm run verify:smoke
npm run test:e2e
npm run verify:ci
npm run test:rules
npm run test:run
npm run test:recovery
npm run test:recovery:browser
npm run test:layout
npm run test:layout:browser
npm run verify:content
npm run test:domain:browser
```

启动冒烟只覆盖选角→商店→牌桌。E2E 使用生产/测试构建产物，检查三引擎、六选角详情、阿默/二响的出弃牌、过场奖励、商店买卖调序/付费刷新、次数耗尽失败、演出退出/快进/旋转和刷新继续；手机尺寸使用真实触摸事件。它另查根/子路径、生产包关闭观察接口、头像失败降级和音频拒绝。失败截图/trace 写入忽略的 `shots/e2e/`，CI artifact 保留 14 天。

`verify:ci` 按领域/浏览器/文档组合已有检查，并拒绝检查期间的源码或 Git index/HEAD 改动。资产和平衡/真人检查在相应工作包落地前明确未纳入；Boss、最终胜利/无尽、真机手感、离线恢复和美术质量有独立验收。`release:checked` 只执行这组只读检查，`--plan` 标 NOT_RUN；不会提交、推送或合并 PR。

技术栈保留 Phaser 3、TypeScript、Vite、Vitest、Playwright；Blender 是离线素材工具，不是游戏运行时依赖。生产规范和阶段门禁见 [ROADMAP.md](ROADMAP.md)，当前任务见 [TODO.md](TODO.md)。
