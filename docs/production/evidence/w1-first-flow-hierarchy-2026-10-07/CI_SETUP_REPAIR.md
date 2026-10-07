# PR48 浏览器 CI 安装修复开工与交接

2026-10-07，inputSHA `034c15e77c30d3cbe8940b0471918f80f1c56eab`。父已独审产品与12张实际前后图，无实质回归；明确授权必要CI基础修复，要求独立提交，不追加产品或测试矩阵。游戏6.1默认Medium、单负责人，无并发工作者。此记录不是新产品功能或设备验收。

## 有界诊断与合同

- requirementId：U11/U13，W9必要质量门禁基础设施；不改任务状态。dependencies：现有三引擎双端smoke、verify-ci/check-runner及锁定Playwright1.63.0。
- allowedFiles：`.github/workflows/ci.yml`的browser安装环境与必要预检、本记录及同目录registry索引证据。nonGoals：src/harness/tests/assets、领域/产品行为/规则/锁文件/依赖版本、门禁命令/引擎/视口/断言、domain/docs job、触发器/权限/保护、加并发或无限增大时限。
- outputs：独立CI提交；官方版本匹配且固定digest的预装环境，三个执行文件存在且可执行的失败前置检查；最终精确HEAD原工作流结果。acceptance：workflow结构核对、产品diff为零、必要计划检查及远端原三引擎双端验证。stopConditions：镜像版本/任一执行文件不符、原门禁失败或镜像拉取受阻如实报错，不跳过、不改PASS判据、不继续盲重跑。

## 失败证据与方案选择

原精确HEAD CI [37671020506](https://github.com/big-dimple/dachoupai/actions/runs/37671020506)两轮被browser原10分钟job时限取消。首轮apt约18:59:52→19:06:37（6分45秒），浏览器二进制约15秒；之后原build及Chromium桌面通过，双端/三引擎未完。重试[job112967622727](https://github.com/big-dimple/dachoupai/actions/runs/37671020506/job/112967622727)停在Ubuntu依赖下载：azure.archive.ubuntu.com多次Ign、约30秒间隔，19:21:12取消，本轮build/smoke skipped。不能记为验证PASS，也不是已发现产品断言失败；具体网络根因未被确定。

现有setup-node cache为npm，未缓存apt依赖或Playwright浏览器。裸Linux浏览器缓存仍需系统依赖安装，不能解决本次慢点；[Playwright官方CI说明](https://playwright.dev/docs/ci#caching-browsers)不推荐单缓存浏览器。云本地无现成Playwright镜像/浏览器缓存；Docker可用，但config blob CDN重定向返回Forbidden，未做本地完整容器启动，云网路并不能证明GitHub runner的网路相同。

选择[官方GitHub container方式](https://playwright.dev/docs/ci#via-containers)：官方镜像预含浏览器及系统依赖，npm包仍由原npm ci安装，见[Docker说明](https://playwright.dev/docs/docker)。lockfile/安装包为1.63.0，使用`mcr.microsoft.com/playwright:v1.63.0-noble@sha256:eff16c30e6f3f4af0a03fa4b706120d5e9b0891c344a27d64559aff5900a4a27`；registry按digest返回OCI索引，原字节SHA一致，见[registry索引](playwright-1.63.0-noble-oci-index.json)。amd64与arm64条目均存在，GitHub ubuntu-latest使用amd64。

替换重复apt/浏览器安装为预装环境版本/三个执行文件可执行性预检；缺失直接失败，没有fallback或continue-on-error。采用官方推荐ipc设置，保留Node22/npm ci、原verify:ci browser、SMOKE_BROWSERS=chromium,firefox,webkit、默认desktop/mobile、制品上传及原10分钟时限。domain/docs、checkout精确head、触发器、并发组和权限完全不变。未来升级Playwright须同步镜像版本/digest，否则预检失败；镜像冷拉取仍有外部网络成本，实际可靠性/耗时由本次远端原门禁测得，不预先宣称通过。

本地只做YAML解析与原结构/产品零diff/registry校验和计划检查，不重复本地全套或追加UI截图。最终精确CI/提交在PR48交接中确认；原两轮取消日志保持，不能将安装失败、旧head结果或本地Chromium通过冒称新head三引擎通过。


## 首次容器CI及工作区所有权适配

独立CI候选844c79f7a0ec05761ac5d4e915ec9975dd8d7c9b的[run37674588331/browser112974688322](https://github.com/big-dimple/dachoupai/actions/runs/37674588331/job/112974688322)成功拉取/初始化固定镜像，npm ci约6秒，19:28:15预检确认chromium1243/firefox1543/webkit2359三执行文件；19:28:16 verify-ci首次git ls-files报dubious ownership，未进入build/smoke。原失败保留，不记产品PASS。容器root与宿主挂载工作区所有者不同，checkout action的临时HOME信任配置没有覆盖运行脚本所用配置。补一个仅browser checkout之后的步骤，将当前精确checkout路径GITHUB_WORKSPACE加入该临时job全局safe.directory；不用通配符、不关闭Git/源码变化守卫，不改产品或测试判据。此为同一CI基础修复的必要所有权适配，独立修正提交，最终精确HEAD仍跑原三引擎双端门禁。
