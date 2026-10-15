# 成长牌选牌展示语义修复

独立基线 `4d2ff4ca8487f2f00b55516822d1a28ac3c1751f`，分支 `fix/growth-display-semantics-20261015`。最终产品与原生核验提交 `48b4e3fd67191f4553e2179f87cdbe1d5efc2e58`，src tree `18733c7eb10b6afee22049454ccb975c735722a7`；后续仅本文、AGENTS 与证据文件。未合 main、未部署、未进行自然试玩。

## 修复与范围

越染越深已有 +1 倍率时，选葫芦显示「读倍+1」，详情同时写「不新增成长」，不再被同花起手提示覆盖为「需要同花」。同一套展示按当前局定义分别读取计分 hook 与新增成长 hook，不预测总分或结算专属条件。

- GameScene.refreshJokerLabels：保留本手读取/即时效果；窄位依次选完整语句、短读取，再保留详情入口。起手 metadata 保持，成长牌不再由路线条件覆盖标签与边框。
- RouteStarter：同花起手的存量收益和同花后的新增分别表述。
- JokerExperience/GrowthOpportunity：本手读取、即时效果、新增成长、计分停用分开；成长封顶/本场已长不抹掉已有读取收益。未满足新增条件不等于本手不生效。
- 独家戏按实际牌型条件读取系数：普通对子不生效，当前合同的两对及以上可读；接续/次数只控制新增。换布景仍在下一次实际读取后消耗，计分停用时不读也不消耗；弃牌蓄热独立判断。

16 张核对清单：a05 熟面孔、b03 老搭档、c04 搭台阶、c06 越染越深、d03 等得住、e05 置办行头、a06 独家戏、c05 换布景、e06 旧物新用、f05 越说越顺、b10 练对子、d09 回声越来越近、e11 长期捧场、e12 淘旧摊、f11 越挫越会、f12 真正的压轴。实际读取/成长 phase、condition、operation 见 [逐牌审计](sixteen-source-audit.json)。

## 实际验证

- [最终针对测试](targeted-final-v2.txt)：12 文件 180 项；[计分/封禁/消耗](consumption-and-ban.txt)：3 文件 94 项，共 274 项。16 张逐一覆盖存量、独家戏负例、零存量/封顶、即时 +50、停用独立成长、只读不改 state/RNG；原真实计分/消耗断言保持。
- [typecheck](typecheck-final-v2.txt)、[生产 build](build.txt)、[content](content.txt)、[plan](plan.txt) 均通过。生产构建仍提示既有 chunk 大于 500kB；content 同时遇到既有 HMR 端口占用提示，但内容校验 PASS。
- [最终原生摘要](native-delivery/summary.json) / [含实际 trace 的完整报告](native-delivery/report.json.gz)：软件 Chromium，1366×768、390×740、320×740，每宽 8 个受控合法 checkpoint，24/24 PASS；不是自然获得率/人类理解/物理手机验收。
- 每窗原生选牌/开关所选条件，完整 state、journal、storage 不变；每窗实际 PlayHand 后完整 state 等于原 applyCommand。c06 葫芦实际读取 0/+1/+6，均无新增同花成长；c04 即时 +50 与已存 +10 分开；a06 普通对子负例/葫芦正例；c05 高牌读取并消耗 40。卡下实测文本宽度不超 1366/390/320 对应 label room。
- 已实际查看最终 [PC 选葫芦](native-delivery/1366-c06-1-house-selected.png)、[320 选葫芦](native-delivery/320-c06-1-house-selected.png)、[320 详情](native-delivery/320-c06-1-house-detail.png)。390 两图同目录。320 详情正文仍按既有容器滚动，关闭固定；不宣称整页无需滚动或其他原 UI 缺口已修。
- [保护树](protected-trees.json)：domain/content/application/platform/core/audio/public 与基线逐对象相同。数值、领域规则、保存格式、RNG、资源和音路均未改；src 只动上述 4 个 game 文件。

## 保留失败与边界

原日志不覆盖：targeted-first 中旧展示期待失败；typecheck-first-FAIL-excerpt 中测试漏传 scoringLimited（首完整类型日志被后次覆盖，只保留工具输出摘录，明确不冒称原完整日志）；native-fixture/profile/affordability-FAIL 是夹具分别违反实际手牌容量、profile 成长字段和起手金币。修正均在 harness/tests，未松动保存守卫或领域规则。

native-label-FAIL 保留390零存量回退「状态」的失败报告及同版已有 +1 截图；native-final 保留320出牌未提交的超时（此前 PC/390 16窗通过）。该脚本只等200ms，真实 DetailDialog 有350ms关闭防穿透保护，改等400ms后通过；产品保护未改。native-320-FAIL 保留320「读热+10」超48.4px而退化的报告与截图，现使用「读10热」短语；完整详情与数字保持。最终通过只认 native-delivery 的48b4e3fd，不借旧通过覆盖失败。

GitHub PR 查询返回 Forbidden，见 [原错误](pr-query-Forbidden.txt)。未改用其他接口创建/更新 PR，未合 main。分支 push 结果以最终回报的远端 SHA 为准；本地验证不冒称云端 CI 成功。
