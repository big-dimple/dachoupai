# 大丑牌 Dachoupai

一款面向 H5 的扑克 Roguelike，核心是 **角色身份 + 大丑牌构筑 + 东方舞台演出 + 连续触发爆分**。

## 当前进度

- Phase 0：工程、扑克规则、六角色基础能力 —— 完成
- Phase 1：首批 5 张大丑牌、数据驱动、逐张触发、计分明细 —— 完成
- Phase 2：关卡 / 商店 / Boss / 完整一局 —— 下一批
- Phase 3：东方视觉、正式立绘、动态音乐与高级演出 —— 待开发

详见 [ROADMAP.md](./ROADMAP.md) 与 [TODO.md](./TODO.md)。

## 技术栈

- Phaser 3 + TypeScript
- Vite
- Vitest
- Seeded RNG
- TriggerEngine + EffectQueue
- JSON 数据驱动 Joker

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

核心规则修改必须通过 CI 后再合并。
