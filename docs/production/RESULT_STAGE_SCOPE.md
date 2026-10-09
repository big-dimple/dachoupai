# 胜败谢幕到下一场：整屏体验包

2026-10-09，父已确认实施；输入main59586a46d1a0b2f2b1f258e9b944931ded37293c（父07:31UTC正常快进）。归属原W1/W2 §5胜败合同、§6全界面手绘统一，衔接W4保存结果。

- requirementId：U01/U02/U03/U07/U11；SG09/SG10。
- dependencies：已保存结果、现有共享纸墨组件、六角色与功能牌prepared映射；原W3事实、W6真人/设备/听感依赖不省略。
- allowedFiles：src/game/IntermissionScene.ts；新增src/game/ResultStage.ts、src/game/ResultStageArt.ts、tests/result-stage.test.ts；本文、AGENTS.md、DELIVERY_PLAN.md、UX.md及evidence/w2-result-stage-2026-10-09的本包证据。其它源/资产/规则/CI不修改。
- nonGoals：新增引导说明墙、自然经营取证、重画角色、数值/身份/抽牌/奖励/BGM变动、新音频体系、W7/W8扩张或设备/GPU签收。6.1 Medium串行，无并发。
- outputs：普通胜利、实际高分/成长、失败的纸台构图；实际贡献来源图、真实奖励及成长读取/新增、失败差距与主操作形成整体。数字/操作先出现，有限节律不阻输入；无浮夸光圈或无来源角色高光。
- acceptance：先实际view当前三类结果截图与prepared资源，再实现；复用同三份保存结果，1366/390/320前后图，740短横仅必要布局。必要facts/布局/type、继续/重试/跳过/低动态/重复点击与完整保存比对；最终一次精确head标准CI。普通b10与中期同花高分为原正常记录，失败为原已保存受控失败，不冒称自然失败。现有音效只保语义调用，heard:false。
- stopConditions：关键数值/按钮遮挡或缩字，未生效角色/卡被突出，成长倒算当前手、重奖/重复开局、缺图有色块、同方法两次仍无改善。观感与真人/设备结论分别保留。

复用：handdrawn-p08六角色selection.webp（保持contain）、b10/c06等实际来源thumbnail、p00-paper.svg及现有SceneView纸边/按钮；stageOutcome、victorySourceFact、buildGrowthProgress、failureSummary与RewardCoin读已保存事实。新增外部图片/音频0。基线三结果共9原生导入截图在main595冻结取得，未再出牌或推进经营。

2026-10-09父PR81 P2授权：旧preload最多5秒可能阻主操作；仅上述Intermission/ResultStageArt及同测试文件修为文字按钮先显、独立补图与取消/旧回调保护，只补一个延迟图片案例和必要生命周期定向；12张父像素审查无重叠保原eba证据，不扩大美术/整局/矩阵。新head一次标准CI后仍draft父审。
