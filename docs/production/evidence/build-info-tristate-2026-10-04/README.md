# 构建状态与版本菜单三态

实际 RunMenu 版本按钮已接到 `formatBuildInfo(buildInfo)`，旧 `modified` truthy 文案已移除。菜单只改 import 和版本正文两行，保留版本号、revision、builtAt、72 张大丑牌/8 章尾注及原存档操作。unknown 明确显示「无法核对文件是否有修改」；dirty 仅显示安全项目相对文件名及真实文件数，不输出 diff、绝对路径或原始命令错误。

运行验证源码为 `5862e59581e0fa8e42de61d6012bb676e8970e6c`，已正常合入 main 基线 `ff768c132a2f1c683f164bd308b11482e7d781e8`，保留 RewardCoin/资源更新。本分支仅供独立 review，不推进 main 或部署；原自然局证据保持不变。

390×740、DPR 1、headless 软件 Canvas 的实际版本菜单三态均 PASS。clean 使用正常构建；dirty/unknown 在构建优化前注入元数据 fixture，再分别编译。每份本地生成身份与对应 JS 可执行对象通过 AST 逐字段核对。浏览器直接加载普通本地页面/资源，没有请求 HTTP `/build-info.json`，没有请求拦截、改头或备用路线。

| 实际菜单截图 | 显示 | 来源 |
| --- | --- | --- |
| [clean](01-version-clean.png) | 已核对，没有未提交修改 | 实际 clean 构建 |
| [dirty](02-version-dirty-fixture.png) | 3 个文件及带空格长相对路径 | 单独编译 fixture |
| [unknown](03-version-unknown-fixture.png) | 无法核对文件是否有修改 | 单独编译 fixture |

三張截图已经人工查看：长路径自动换行，正文位于视口内，关闭按钮位置保持不变。使用同一浏览器上下文和同一普通新局，仅到 await-input、选一张牌；各次打开/关闭和继续本局前后完整 checkpoint、全部 IndexedDB 存档及选牌状态均相同。clean 中实际「导出本局」下载与 checkpoint 相同；dirty/unknown 未重复导出，原始报告中的 `nativeExportMatchesCheckpoint: false` 表示未运行该操作，非导出失败。没有评分/RNG/存档注入或修改。

12 个专项测试、typecheck 和 Vite e2e build 通过，实际菜单 PASS，未捕获页面错误。原始菜单报告和截图哈希见 [native-menu-report.json](native-menu-report.json)，当前/历史构建身份及日志哈希见 [summary.json](summary.json)。精确新 review head CI 留待父线程检查，不为等 CI 延迟检查点。

先前两次测试 timeout 保留在本地原始 FAIL 目录。原因是测试在 clean bundle 编译完成后替换元数据，而优化已经删除 dirty 分支；第二次诊断实际显示 unknown。最终改为分别编译 fixture，未修改生产逻辑迁就测试。第一份失败没有捕获失败状态截图。

此前模块检查点 `525b604600eac06cc7d917803e9a05623d7c5a4d` 的构建身份仍保留在 summary 的 `priorModuleCheckpoint`，其中旧 PENDING 描述仅属历史记录；当前菜单接入已完成。旧已部署构建为何显示本地修改仍未知。真机/GPU/听感及部署状态验证 NOT_RUN。
