# 阿默助攻领域 / 保存原型证据

本批源代码接续未完成 WIP `2328587`。本地冻结 `0d3b57019f92ecb7d118bb58efde985d2cfd9193` 与 GitHub connector 正常提交 `629ac89b4134a0676c6b72e61d5507497b6bb00b` 的完整 tree **aa5f3dd865ccea33a783db08f25aa549db9b3276** 相同；远端直接 parent 仍为 WIP，更新前重新核验原 head，`force:false`。提交 SHA 因正常 API 提交元数据不同，不改变测试身份。详见 [source-binding.json](source-binding.json) 的 src/tests/harness 树和本轮 11 文件清单。

- 91 相关 tests、typecheck PASS；最终域门禁 2236 tests/122 files 与 content PASS；build 和 production-plan PASS。
- [native-indexeddb.json](native-indexeddb.json)：真实系统 Chromium 151.0.7922.173 + 生产 IndexedDbSave/SavedRun，三身份分区、原子配额失败、同候选重试、重复命令无写、重载/导出导入、活跃同模式优先、损坏 current+previous 与 retained 原文。源码/index/HEAD 前后一致。
- [local-browser-FAIL.json](local-browser-FAIL.json) 与 [原日志](browser-FAIL.txt)：原标准 smoke 未能启动 Playwright headless shell，产品检查 NOT_RUN。缺失浏览器安装返回 [HTTP 403 Domain forbidden](browser-install-403.txt)，该下载路线停止；未换域名/镜像/权限。
- 现有 smoke 仅有 `SMOKE_CHROMIUM_CHANNEL`，没有 executablePath 参数；系统 `/usr/bin/chromium` 可供独立保存 harness 使用，但不冒充已安装的 Playwright channel。未修改原 smoke 断言、启动路径或安装来源。正常 draft PR CI 结果另报，不能据本地 build 宣称 smoke PASS。
- 早期测试 FAIL 的实际原因及原日志 SHA256 保留于 source-binding；修正的是错误 fixture/预期，未改旧牌数、补牌方向或 f06 到期规则。

[最小纯 facts、命令及 trace 合同](../../AMO_ASSIST_PROTOTYPE.md)。A 系适配、UI 接入、其余五人、玩法平衡和真机验收仍待；本批只 review，父独立审查后另行串行决定 main。
