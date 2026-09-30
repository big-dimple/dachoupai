# 大丑牌 Dachoupai

扑克构筑 Roguelike：通过出牌、弃牌、改造牌组与大丑牌连锁，完成一场荒诞巡演。品质目标对标 Balatro 的核心玩法和操作体验，视觉不照搬其素材与界面。

**当前代码是整改中的 r2 原型，不是完成版。** 已接入六角色新能力、五张大丑牌、准确的牌型/计分牌结算、每场 4 次出牌与 3 次弃牌、带购买/出售确认和调序的商店。已接入完整存档、继续、导入导出与演出取消。章节按新合同推进；Boss、完整内容和移动布局尚未完成，当前数值未验证平衡。

选角后先逛店，点货品确认购买再开局。手牌轻触选/取消，独立按钮出牌或弃牌；商店装备下方可调顺序和确认出售。骰爷通常倍率 ×1.15，每场可选择押注一手，界面显示两种可能结果。分数先计分牌、再角色、最后按装备顺序执行加乘；杂牌也会离手，但不给普通点数。

菜单可继续本局、导入/导出完整进度、调 1×/2×/4× 演出速度、静音、快进和回看上一手。出牌/购买先保存确定结果，再展示；未保存会暂停后续操作，可原样重试或导出内存结果。多标签默认只有一页可写，接管先读取最新进度。旧版或损坏数据会保留可导出的备份。

开发 AI 从 [AGENTS.md](AGENTS.md) 开始。人类阅读入口是 [审查与策划目录](docs/production/INDEX.md)。

## 运行当前原型

```bash
npm ci
npm run dev
```

```bash
npm run verify
npx playwright install chromium
npm run verify:smoke
npm run test:rules
npm run test:run
npm run test:recovery
npm run test:recovery:browser
npm run verify:content
npm run test:domain:browser
```

启动冒烟只覆盖选角→商店→牌桌。领域浏览器检查另外用正常按钮完成一场出弃牌、回店、买卖调序并核对命令回放。恢复浏览器检查另外覆盖七个刷新点、存储故障、非法导入、多标签和中断取消。完整一局、真机触屏手感、离线恢复和美术质量有独立验收，不能由这些自动检查通过代替。

技术栈保留 Phaser 3、TypeScript、Vite、Vitest、Playwright；Blender 是离线素材工具，不是游戏运行时依赖。生产规范和阶段门禁见 [ROADMAP.md](ROADMAP.md)，当前任务见 [TODO.md](TODO.md)。
