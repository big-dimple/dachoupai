# 培养路线的权威当场升级取舍（2026-10-15）

独立分支 `dev/build-journey-practice-20261015`，基于已补验并推送的四轴分支 `aa001b3d6795ade79effd1c7b88055ff32b9fee3`。四轴分支未混入本包。本包产品提交 `6ea22895edaf961c01b26c9608ded4d789437bc3`，最终观察器提交/精确浏览器验证 `376f856e6f26a258a7dd6d8fd6e24bb6ccea4fce`；src tree均为 `d660cccbe09db818326d3ad2fae978854c9a5a54`。随后只提交本目录证据与PR描述，产品保持。

## 问题与行为

原 BuildJourney / BuildFallback 只看现货和库存升型工具，会遗漏当前身份已有的合法付费升级，并误报没有对应商品/升型机会。现在简版与全部培养页都有独立“当场升级 · 当前路线”区，保留原大丑牌首推荐、改牌和留金取舍，不新增推荐阈值或最优判断。

报价全部来自 r2PracticeQuotes：真实发现/等级、Lv前后、原价/优惠后实付、余金、按现持上限的利息档与共用额度。成组沿原成组族，顺子含普通顺子/同花顺，同花含同花/同花顺/同花葫芦/同花五条；同花族只影响本包升级展示与发现文字，不改变原商品匹配算法。满库存不挡当场升级；缺钱仍可查看原因，确认禁用；旧身份/未发现/30级/额度已用无升级入口，真实刷新不恢复额度。

ShopScene只接最小practice回调和返回来源（原简版/全部页、路线、滚动与入口焦点）；取消/ESC返回原培养页。确认沿原PracticeHand+quote.expectedSeq/expectedLevel/shopSeq；成功读真实hand-practiced，失败原候选重试通过既有registry携带同一来源，按原runId/seq/action及已保存回执恢复；完成后用最新this.run重建原培养页、额度已用。不用旧state闭包重开，且不再次派发命令。

相对基线只改 BuildJourney.ts、BuildFallback.ts、BuildJourneyDialog.ts、ShopScene.ts 及专项tests/harness；领域/算法、加载、GameScene、DetailDialog、CSS、资产均未改。

## 实测

- `npm run typecheck` PASS；`npm run build` PASS（原chunk >500 kB提示保留）；6文件43项定向单测PASS：[tests.txt](tests.txt)、[build.txt](build.txt)、[typecheck.txt](typecheck.txt)。
- 精确clean HEAD `376f856e`：1366×768、390×844、320×568、390×568 × 成组/顺子/同花，12/12链PASS，无pageerror。完整[报告](report.json)及[全state/journal/IDB证据](full-state-journal-storage.json.gz)。本机偏好断言排除临时租约心跳键，RNG/目标/库存及完整IDB槽位均逐字段核验。
- 每端成组成对 Lv4→5：简版进入，取消与ESC返回原路线/页面/scroll/focus，延迟保存期间双击、ESC和返回禁重复，最终只派发原PracticeHand一次。
- 每端顺子 Lv7→8：全部页进入，quota拒绝前后完整保存相同；恢复存储后保存原固定候选一次，返回新状态的同一全部培养页与原滚动（按新内容高度收敛）。
- 每端同花 Lv29→30：满库存、有现持折扣来源和减价券，直接成功仅消费一次；保存不增加工具，最高等级后无服务入口。
- 每端成组升级后再真实RerollShop：逐笔权威对账并重新开培养页，额度不恢复；最终冷恢复完整状态/journal/IDB相同。共12次PracticeHand+4次RerollShop=16笔，每笔等于applyCommand，expectedSeq原样传递；查看取消零命令。
- 单测覆盖三路线全部可发现族、仅同花葫芦/五条已发现的文字、未发现/Lv29/30、优惠/余金/利息、缺钱可查看、满库存、旧身份/非商店、已用额度与刷新不重开，以及有真实大丑牌推荐时仍保留升级选项。

父与独立只读复审实际查看PC/390/320升级入口、报价、保存/重试/返回整屏；本次确认及返回无遮挡，未发现必须返修缺陷。本目录精选入口/报价/失败/结果/返回图；原运行输出76张完整PNG，脚本可再生成全部。

有限边界：320全部培养页沿既有英雄手记与固定多操作栏，仍须滚动阅读，入口/确认原生可达；短屏故障菜单警告可能在上方屏外，但重试按钮清楚且已实际点击。未改这些共享布局，不以此签整体审美/玩家理解。受控合法存档不证明自然发现率、物理设备或整体经营平衡，也没有新增18路线试玩、旧档迁移或部署。

```sh
npx vitest run tests/build-practice.test.ts tests/build-journey.test.ts tests/build-fallback.test.ts tests/build-journey-dialog.test.ts tests/shop-practice-service.test.ts tests/shop-card-journey.test.ts
BUILD_PRACTICE_OUTPUT=/tmp/build-journey-practice node harness/build-journey-practice.mjs
```

预提交功能轮完整回执保留在运行环境 `/tmp/build-journey-practice-functional/`；新单测 helper 首次被推断为 AnyRunState 导致tsc拒绝，改为 R2RunState 后typecheck及43tests通过。最终PASS全部来自精确376f856e，不借功能轮身份。复审一次宽范围 `rg --files /tmp` 遇到系统目录 `/tmp/codex-daemon-1000` Permission denied，已停止该范围搜索，后续仅查看已给定截图目录，未访问或绕过被拒目录。

PR创建仍停止，未重试。原始工具与错误详见[四轴权限回执](../shop-four-axis-2026-10-15/resize/README.md#pr创建请求原始失败)；本包只备[PR描述](PR_DESCRIPTION.md)。
