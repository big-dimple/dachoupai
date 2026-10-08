# PR69 独审补正：动作标签与活跃待选状态

2026-10-08。产品提交：ef84123cf9ff0b779e29e5ee4b39426e8e077b4b（普通出牌标签）；7a8c2e375aa5f22f00b84f7b9814b0137cf20c05（f10）；最终产品20d981a044f776932a4de1c6f634fa952f7301b7（共享活跃阶段合法性）。独立证据提交之后的精确head CI以PR69回执为准；旧c30c87e绿不覆盖本补正。未main、真人、设备/GPU/听感或有趣验收。游戏6.1 Medium串行，无新自然路线/旧档矩阵/seed扫描。

原b03 retained-390.png实际仍写“确认留1”，后续却执行PlayHand，明确是P1失败，原字节保留，不能作普通动作标签通过证据。updateControls先复位“出牌”，再按既有角色/pending合同覆盖。复查沿用原正常局pending及chosen完整state，经生产DOM文件导入；journal仅取原真实命令连续尾段（DiscardHand起），不改state/牌/钱/RNG。实际触控验证待选→ChooseRefill后“出牌”/4次，再两对点击实际PlayHand、得182/剩3手；收起、重开、TitleContinue与已完成保存导入动作正确。报告逐条canonical全state相等；四张PNG实际查看，零pageerror。不是新自然获取或真机流畅度证明。

f10在第一次冷开场戏法弃及普通第一次弃后再戏法弃两路，原实现各失败armed rescue stage（2 FAIL/8 PASS原日志保留）。修复认定pending-refill为同一活跃未出牌阶段：严格checkpoint恢复待选、ChooseRefill保武装、下一真实PlayHand只消费一次。随后共享同一合法性谓词用于stage指针、上限、challenge/boss快照、live joker初始身份、a06阶段及stage存在检查；不放宽pending允许的输入。增加最少定向拒绝篡改全局stageIndex、challenge/boss快照与未拥有实例身份。最终两文件48 PASS/typecheck/diff通过；中间47 PASS原日志也保留。

runner第一次使用不连续原记录（原report未记录EnterStage的seq4），makeCheckpoint在导入前拒绝invalid-save-journal；尚未验证产品UI，纯runner失败。runner-journal-fail保该report/脚本/失败图。改为现有真实连续尾段后一次复查PASS，不伪造缺失命令或篡改state。

本目录sha256.json覆盖所有本目录文件（自身除外）；根sha256.json覆盖历史包原条目，README哈希同步。原4♦/4♠/5♣弱留材、未即时升级、未证明比旧120更强/有趣的结论不变。
