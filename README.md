# 大丑牌 Dachoupai

扑克构筑 Roguelike：通过出牌、弃牌、改造牌组与大丑牌连锁，完成一场荒诞巡演。品质目标对标 Balatro 的核心玩法和操作体验，视觉不照搬其素材与界面。

**当前代码是早期原型，不是完成版。** 已有六角色、五张大丑牌、三个普通关卡和购买商店；质量重置计划要求先修正规则基础、移动端、恢复能力与测试，再扩展内容。本分支文档不代表这些新功能已经实现。

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
```

当前冒烟只覆盖选角→商店→牌桌。完整一局、触屏手感、刷新恢复和美术质量有独立验收，不能由冒烟通过代替。

技术栈保留 Phaser 3、TypeScript、Vite、Vitest、Playwright；Blender 是离线素材工具，不是游戏运行时依赖。生产规范和阶段门禁见 [ROADMAP.md](ROADMAP.md)，当前任务见 [TODO.md](TODO.md)。
