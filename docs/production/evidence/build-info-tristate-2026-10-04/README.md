# 构建文件状态：最小三态诊断模块

旧 `vite.config.ts` 将 Git 命令失败变成字符串 `unknown`，再用 `!== ''` 判定修改，因而**查询失败也可能显示「含本地修改」**。本 review 修正这个已确认的代码分支；已经部署的旧构建究竟为何出现该提示仍未知，不从新代码倒推旧原因。

基线为 `58e9d223ee5f29b965532551e71afc6fc6785d51`，实现及实际构建源码为 `525b604600eac06cc7d917803e9a05623d7c5a4d`。只改构建 collector、纯状态/格式化模块和原 facade。游戏、评分、RNG、存档、资源、场景、菜单结构与更新提示不改，旧自然局证据不覆盖，不推进 main 或部署。

| 核对状态 | `modified` | 新人话格式化文本 | 文件信息 |
| --- | --- | --- | --- |
| clean：HEAD 与 tracked status 两条查询均成功、无已跟踪修改 | `false` | 构建时：已核对，没有未提交修改。 | 不输出路径/计数 |
| dirty：两条查询成功，确有已跟踪修改 | `true` | 构建时：有尚未提交的文件修改（N 个文件）。 | 仅安全项目相对路径及真实文件数 |
| unknown：任何查询失败、无有效 HEAD 或状态输出不可解析 | `null` | 构建时：无法核对文件是否有修改。 | 不输出路径/计数 |

保留 `version`、`revision`、`builtAt` 的意义和格式；无法取得有效 HEAD 时 `revision` 仍为 `unknown`，不会造假版本号。新增 `sourceStatus` 作为三态依据，`modified` 在 unknown 时为 `null`，既不是已核对 clean，也不是假 dirty。dirty 才带 `modifiedFileCount` / `modifiedFiles`。原 metadata emitter 与 `__BUILD_INFO__` 使用同一个 collector 结果。

collector 使用 `git status --porcelain=v1 -z --untracked-files=no`，保留空格并按 NUL 处理重命名；staged 与 unstaged 同一文件只计一次，重命名以新名字计一个文件。延续原已跟踪文件范围，不把未跟踪文件计入。只发布安全仓库相对文件名；绝对路径、父目录跳转、控制/方向字符等不发布，只保留真实计数。不会读取或发布 diff 内容、Git stderr、凭据、命令参数或环境信息。Git 查询失败只有明确 unknown，不带原始错误细节。

`formatBuildInfo` 对只含旧 boolean 的身份也显示无法核对，不能据旧提示推断修改文件或失败原因。

并行所有权：手机旧 UI 排查任务 `01a108b2-fd7a-71eb-becd-6f424ee0f0f1` 仍负责 `RunMenu.ts` / 更新提示。本环境没有跨 Cloud 线程消息工具，已向父报告需转达的模块契约。本 review **未改 RunMenu**，菜单接入状态为 PENDING。该任务可以保留自己的菜单结构，仅将版本信息正文接到现成的人话函数：

```ts
import {buildInfo,formatBuildInfo} from '../platform/buildInfo';
// 既有版本按钮中，后接原「当前可玩内容」文字即可。
info.textContent = `${formatBuildInfo(buildInfo)}\n当前可玩内容：${R2_JOKERS.length}张大丑牌、${R2_AVAILABLE_CHAPTERS}章。`;
```

11 个专项测试通过：纯函数 clean/dirty/unknown、两类命令失败、坏输出、旧 boolean 不倒推、无私人路径/错误内容；真实临时 Git 仓库覆盖干净、未跟踪文件忽略、同文件 staged+unstaged、带空格路径与重命名、非仓库失败，并核对序列化身份与格式化文本。`npm run typecheck` 和 `npm run build -- --outDir shots/build-info-tristate/build` 通过。本地实际构建的文件身份与 JS bundle 内嵌身份逐字段相同：C03、源码 `525b604600eac06cc7d917803e9a05623d7c5a4d`、`sourceStatus=clean`、`modified=false`、`builtAt=2026-10-04T21:09:02.323Z`。bundle 原始字节及本地构建日志哈希见 [summary.json](summary.json)。没有以 helper 的单测冒称当前菜单已接入或真机展示已验。

没有请求 HTTP `/build-info.json`，没有改请求头、备用路线或网络绕过；只读取本地刚生成的构建产物。旧已部署原因、手机实际展示与加载问题未由此核实；真机/GPU/听感 NOT_RUN。精确 review CI 另报，暂不 main。
