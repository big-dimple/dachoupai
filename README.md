# 大丑牌 Dachoupai

原创中国巡演戏班题材的扑克构筑 H5 游戏。通过出牌、弃牌与大丑牌连锁推进巡演；使用 TypeScript、Phaser 和 Vite，规则与表现分离，支持本地保存与恢复。

```bash
npm ci
npm run dev
```

需要 Node 22 与 npm。生产构建使用 `npm run build`。若云端默认HOME缓存不可写，可显式指定可写缓存：`npm ci --cache /workspace/.npm`。

当前版本、工作范围与未完成事项见[开发交接](docs/development-handoff.md)和[唯一任务状态](docs/production/plan.json)。当前优先[首章留人体验](docs/production/DELIVERY_PLAN.md#11-交付目标)：路线发现、取舍、可感成长与真实继续意愿；软件流程通过不等于首章完成。素材审美、真实手机与完整发布验收分别记录，不能把可运行候选当成已全部验收。

开发从[AGENTS.md](AGENTS.md)开始，策划资料按[文档目录](docs/production/INDEX.md)取用。检查命令定义在[package.json](package.json)，按变更选择，发布候选使用`npm run verify:ci`。部署沿用项目已有流程。
