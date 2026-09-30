# 下一步

任务状态唯一来源：[`docs/production/plan.json`](docs/production/plan.json)。不要在这里维护第二份完成清单。

每次接手先读 [AGENTS](AGENTS.md) → [当前交接](docs/development-handoff.md) → plan 的 `currentTask` → [对应工作包](docs/production/WORK_PACKAGES.md) 和该条目的 reads。检查实际 HEAD、分支、未提交修改和审查基线差异，保留别人工作；已关闭的 R00 不重复启动。

每包按失败用例/金样→实现→实际检查→证据/plan/handoff 推进。只选择依赖满足的最低优先级未完成包；真人或美术门禁未批准时保留 BLOCKED，继续独立工程。不要续做旧 Batch 2C。

旧的完成勾选和 3D 资源交付清单位于 `docs/archive/2026-09-30-pre-audit/`，不再决定开发优先级。素材技术交付、视觉批准、运行时接入是三种不同状态。
