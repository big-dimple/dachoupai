# PR80父审P2最小修正

输入PR80旧head `d6db0c6d691b2ab9f8d9e021c128accbe6f6a1ad`；旧CI37896682219最终success、production-docs37896682221success，只属于被P2指出问题的旧候选，不能替新产品签收。

- 预算产品 `6adc62f253bf7a9fda1c448f5545d4b37b3047dd`：将无条件“出牌后剩N−1／最后一手没有下一手补牌”改为常规消耗／常规余次与通常无余次的败局风险，明确返手或救场按实际效果结算。不判断实际返手／救场能否发动，不新增全计分预测。b12与f07既有领域规则原文不变。
- 助演产品 `c74729432be7d65f0f54a3417014463171a9a5d8`：仅过渡示例排除与保留组冲突的助演IDs；剩下助演重新按现有完整facts校验，不合法则清除整组。预览展示要取消／实际会消耗的助演。ghost明确携带这一份助演草稿，主动换组应用同一草稿，原撤销保存并恢复旧主手及助演。普通候选不设置此override，沿用原助演保留规则；查看不改真实草稿。
- 13必要定向通过／4files执行，另1file与81其它案例跳过；typecheck通过。包含既有真实command的b12末手返手与f07末手救场／继续发牌，普通末手危险提示，阿默KKK／77交叉预览原草稿不变、不冲突助演仍保留，以及普通主手编辑保合法助演的原断言。没有全量本地回归或自然经营重跑。
- 一组1366鼠标原生导入明确合法夹具：当前正式tool-supply身份阿默，KKK主手，7♣7♥已选助演，顺子参考保留7♣8♥9♠10♦。查看／点示例保持原KKK/77和完整run；明确换组assist=[]，撤销完整还原KKK/77。再次主动换组后唯一真实PlayHand只消耗KKK，四保留ID仍在handOrder，完整canonical state等于applyCommand。3个有限记录／pageerror0，`amo-conflict-preview.png`已actual view。不是自然获取、真机或玩家认可。
- 原生观察器原FAIL全部保留：首轮未显式指定当前身份，落在旧默认v11，助演入口不存在而超时（`FAIL-old-profile-report.json`／PNG）；指定当前身份后遗漏强制openingRoute，创夹具前报invalid-opening-route（`FAIL-missing-route.log`）。最终使用当前身份＋straight开场，未放宽产品断言或伪造自然证据。

## 独立CI收尾预算维护

提交 `97a0b7a` 仅browser timeout 10→15分钟及一行说明；原job容器／build／三引擎双端smoke、artifact、失败退出合同全保持。

已核旧main CI37896181961／browser113707932782：06:56:17→07:06:22共605秒，configured600秒；验证步骤06:57:10→07:06:18 success，receipt精确main15a1172 PASS，build20260ms、smoke526936ms，source/index/head前后相等；artifact11600419260成功，setup-node post skipped，overall/job **cancelled**。元数据与receipt原文见上级 `ci-main-budget.json`。日志未明确取消发起者；重复约600秒边界耗尽与成功检查后无收尾余量支持预算不足的推断，不宣称已证平台原因或旧main总体全绿。未重跑旧main。

最终新head仅执行一次标准CI，由PR按新SHA核；此记录不提前写绿。原6dc候选普通双端／自然窗口结果仍只按原SHA，旧绝对末手文案已被本P2替代。真人／设备／音频/W6依旧未签，6.1 Medium串行无并发。
