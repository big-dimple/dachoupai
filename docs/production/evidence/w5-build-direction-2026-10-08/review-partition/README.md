# PR63 独审：当前版存档分区隔离

2026-10-08。父独审指出原产品2805ef5以runId存方向，但session实际runId为run/${seed}/${characterId}，不同存档分区可能相同。旧五图及报告继续归原SHA，不改写为新head全矩阵。

补正产品 `9cc87a1037c15051dba8adea4de7bdd218f95203`：所有选择/读取/保留状态接口接当前state，复用r2ModeStorageKey现有contentHash/mode/challenge/difficulty/programs分区，并组合runId作为UI偏好身份。独立key换到v2，不迁移有歧义v1记录，不删除它或用户档案；领域runId、计分、RNG、商店及存档格式不改。开场成功保存后发布意图、商店/工具/牌桌/指南等调用点一致采用当前state。

41项/5文件、typecheck通过；两项新增反例取同一当前身份与同seed/amo D0/D1：D0同花、D1顺子、切回和冷建各自保持，拒绝存储时各方向只在页内且冷建回开局fallback，完整run不改。

增量原生：一个390×740当前合法D0/D1普通商店checkpoint，seed/character/runId/contentHash完全相同，仅difficulty不同。真实导入D0→转同花→导入D1（不会继承同花）→转顺子→切回D0→冷续局同花→切回D1→冷续局顺子，逐步完整state不变。两张增量截图已实际查看；最终v2偏好有两个不同分区键。明确是受控当前版本两模式UI/保存反例，不是历史迁移、自然率、设备或全章验收。

另仅复查原harness的390-storage-denied：独立v2偏好key拒绝，真实转同花仍明确“仅本页保留”，完整run/RNG不变PASS。没有重跑旧5图、完整章节、全视口或旧档矩阵；原全包其余证据保持原SHA。最终精确新head标准CI在同PR63复核。

15:54UTC新用户表现反馈仍待下一独立包：英雄高光需要更大胆前景动作/完整构图和强节拍，PR62新观感/听感不签通过；音乐由父协调可用授权来源。本增量不混音画/BGM实现。
