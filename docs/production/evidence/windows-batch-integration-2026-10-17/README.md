# Windows 整批整合：开发候选

**后续提醒补正：** [hero-reminder-scope](../hero-reminder-scope-2026-10-17/README.md) 已取消本记录当时的首两场/每场一次限制；本文件其余原测试按070cc/1d80版本保留。

被测产品 `070cc16f0d04c7da03850dd62fd34cef450d8227`，分支 `dev/windows-integration-20261017`。原主工作区保持 `main@ba49d453` 且干净；只读远端 main 核对为 `7d7921e76ca794a14e715e3eac3b4d66143862ff`。本批只普通 dev push，未合 main、未强推、未查 CI/域名或部署。P08 仍为 in_progress。

本候选顺序接续 `5afce4e4`（评审、去鱼、卡图、音频），合入高光预算 `fc681cf7`、AI/开战正确性 `36ba1e41` 与底栏 `f82b3cf9`。后两项来自同一 GameScene 负责人；本地没有重写公共场景。底栏原产品 `86f253e0` 与证据提交通过 Library bundle 保留原 SHA：1,029,871 bytes，SHA256 `5cb633042d2d286cd5371b23e58f6e509998f31694c007507fc402d0c65f5aea`，本地文件可读、hash 和 `git bundle verify` 均通过，前置为 `36ba1e41`。

## 实际检查与来源复用

- [最终三文件 48 项通过](targeted-48-PASS.txt)：source-stage-art、score-recorded-audio、assist-profile-ui-copy。此前已知两项身份失败在正确性来源合入后消除；[本地此前原 FAIL](prior-copy-2-FAIL.txt.gz) 保留。
- [最终类型/生产构建通过](build-PASS.txt)，保留既有大 chunk 提示。build-info 绑定上述产品 SHA，sourceStatus=clean。
- [来源与构建审计](source-build-audit.json)：卡图/高光、音频、流程/底栏、加载各自与精确来源的 Git blob 一致，领域/应用/存储/原稿/详情/商品图/依赖合同未变。Windows 检出为 CRLF，实际文件 SHA 与云端 LF 不同，报告分别记录，不冒称工作区原字节相同。
- 72 个产物文件 SHA 全匹配；52 个独立高光派生、20 个详情复用，最大选用 96,814 bytes < 98,304（96 KiB），最大派生 61,570。没有提高加载上限、覆盖完整详情或把高光加入首屏预载。
- 前阶段 `a358d07c` 的[67 项短交叉](pre-budget-audio-67-PASS.txt)按当时版本保留，不冒称最终再跑。最终底栏[85 项与四尺寸](../table-footer-2026-10-17/README.md)、[正确性 28 项与七场景](../ai-stage-regressions-2026-10-17/README.md)、[音频 117 项与八场景](../audio-lifecycle-regression-2026-10-17/README.md)、[高光 172 项与三尺寸](../climax-source-assets-2026-10-17/README.md)复用各自精确来源证据，不相加为一次整包全量。

[Windows 最终单例 PASS](native/report.json)：Chromium 153.0.8010.12、320×568、真实触控、受控九牌当前身份。点数/花色两笔 ReorderHand 完整状态与领域相等；AI仅选牌、滑选与技能查看不发命令；提醒继续双击只一条 PlayHand、完整 state/journal/storage 相等。媒体 music=0.3、时间从 3.157914 推进到 3.407528、槽位≤2；f09 HTTP200/57,192 bytes/320×400，响应SHA与manifest相符，只读取图不改局。页面错误0。不是自然获得或听感验收。

首次共享缓存 ENOENT 与等待超时保留于 [cache FAIL](windows-cache-FAIL.txt)，另有 [SSR transport超时](windows-ssr-FAIL.txt) 与 [并行源服务导航超时](windows-ui-startup-FAIL.txt)。临时测试改独立缓存、有界index/Phaser依赖发现及Windows Chromium路径后，最终上述单例通过；产品/断言均未修改。最后一次状态查询与完成报告交错，最终进程已正常PASS退出，没有停止已完成的场景。

## 合同与未签边界

音频来源按批准八档 `1/1.12/1.25/1.35/1.5/1.68/1.88/2` 更新旧第三档断言 `.82*1.075` 为 `.82*1.35`，并增加真实逐卡和每层速率检查；原断言 actual=1.107、expected=0.8815 的 FAIL 仍在[前期整合](../singapore-audio-integration-2026-10-17/original-assertion-FAIL.log)。不能称“原断言不变通过”。

底栏为弃牌—点数/花色/AI 三块—出牌，技能独立。提醒复用原合同：已加入引导的新局首两场、每场最多一次，尊重关闭引导/不再提醒；不是所有长局每手强制提醒。查看、返回、取消不自动用技能或发出牌命令。正确性来源恢复 raw definitions、稍后开战留当前局、单个稍后按钮，以及裸结算结果/跳场保存失败重试与防重复。

未跑全量、自然长局、生产 bundle 浏览器矩阵、Firefox/WebKit、物理设备或听感；软件证据不代签真人/美术/听觉/P08 总完成。其余评审项、C04/A03/V01/L01 门保持原状态。本地独立 worktree 和构建留给后续总整合接续，不 reset/clean 或覆盖旧工作区。
