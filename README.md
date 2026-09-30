# 大丑牌 Dachoupai

一款面向 H5 的扑克 Roguelike。目标不是复刻现有作品，而是围绕 **舞台演出、连续触发、动态音乐与夸张爆分反馈** 做独立体验。

## 当前阶段

Phase 0 / Vertical Slice：先做出一局里最核心的“发牌 → 选牌 → 出牌 → 识别牌型 → 计分 → 动效反馈”闭环。

## 技术栈

- Phaser 3 + TypeScript
- Vite
- Vitest
- Seeded RNG（核心逻辑禁止直接使用 Math.random）
- Event / Trigger / Effect Queue 驱动演出

## 开发原则

1. 核心规则与动画分离。
2. 随机行为统一经过 Seeded RNG。
3. 复杂规则必须有测试。
4. 优先可玩的垂直切片，不提前堆内容。
5. 大丑牌、Boss、舞台效果逐步数据驱动。
6. 每个效果都应能解释“为什么触发、如何影响最终热度”。

## 本地运行

```bash
npm install
npm run dev
```

## 检查

```bash
npm run typecheck
npm test
npm run build
```

详细路线见 [ROADMAP.md](./ROADMAP.md)。
