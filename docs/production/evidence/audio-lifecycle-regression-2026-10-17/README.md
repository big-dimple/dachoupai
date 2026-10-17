# 音频回归：生命周期与真实逐卡音阶

基线 `7d7921e76ca794a14e715e3eac3b4d66143862ff`；最终产品 `5a02e647d9d7b5e7ebbff23897822aadc8b7199d`，开发分支 `dev/audio-lifecycle-regression-20261017`。生命周期首提交 `9440bf4c61b5f8284daabb573d6506dd94716e52` 保留，后续逐卡主路径补正另作普通提交。只改 AudioEngine、mixPolicy 与音频测试；GameScene、ShopScene、领域规则、存档及音频资源未改。

## 修复范围

- 取消未完成播放请求时失效其回调；新场景立即发起自己的请求，旧 promise 的晚到成功、拒绝及旧媒体事件不能操作复用后的槽位。
- 最多两个可复用流式媒体元素。新曲可播前保留旧曲，再用互补的 250ms 增益斜坡交接；静音、零背景音量及后台清理两个槽位、交接定时器和启动期限。相同录音跨场保持播放位置。
- 每次请求有 8 秒启动期限，同场曲单中的每曲最多自动尝试一次；全部失败后等待下一真实手势、前台恢复或新场景。取消全局永久 musicFailed，不无限自重试。预热不再创建额外游离媒体元素或首手势前的音乐请求。
- 多曲场景关闭原生 loop，真实 ended 轮换曲单；单曲场景继续原生循环。
- 八档因子固定为 `1 / 1.12 / 1.25 / 1.35 / 1.5 / 1.68 / 1.88 / 2`。普通/关键落点按已保存 trace 的 `activeScoringIds` 与当前事件的目标牌取索引，同一张牌的附加效果沿用同档；乘法沿用其独立 chain。无需修改场景接口。录音原始层音高仍相乘，因此最终采样速率上限为 `2.3`（原始层最高 1.15×八档最高 2），避免关键落点的 1.1 层再次被削平。终结和飞行纹理不作递升。

## 实际证据

| 检查 | 结果与原始文件 |
| --- | --- |
| 原版已有 6 个音频套件 | 75 PASS / 1 FAIL；旧第三档断言要求 0.8815，实际 1.107。[原 FAIL](before-existing-tests.txt) |
| 新生命周期用例放到原版 | 5 PASS / 10 FAIL。[原 FAIL](before-lifecycle-tests.txt) |
| 9440bf4c 的真实逐卡主路径 | 20 PASS / 2 FAIL；真实五张计分牌经 numberImpact → scoreImpact 仍输出 `[1,1,1,1,1]`，关键落点也固定音高。[补正前 FAIL](before-card-main-path-9440bf4c.txt) |
| 最终定向单测 | 8 文件 / 117 PASS，含真实计分事件序列、八档全部关键层速率、原取消/去重/混音/采样加载测试。[结果](after-tests.txt) |
| 最终类型与构建 | `npm run build` PASS；保留 Vite 原有大 chunk 提示。[日志](after-build.txt) |
| 最终浏览器 | Chromium 151.0.7922.173，8/8 PASS。[日志](after-browser.txt)、[完整报告](after-browser.json.gz) |
| 原版同一浏览器脚本 | 0 PASS / 8 FAIL；其中两条原生重开是新增逐卡速率断言失败，另六条为生命周期/切换/轮播失败。[日志](before-browser.txt)、[完整报告](before-browser.json.gz) |

具体浏览器对照：

- 慢首曲未完成时，经真实选角/路线确认进入商店：原版音乐停在 paused=true、time=0；修后商店曲可播。
- 媒体请求真实 abort 造成播放错误后，跨场和同场下一键盘手势：原版全局错误阻止恢复，修后恢复。不以预热元素的 error 代替引擎失败。
- 旧曲已播放、新曲响应暂挂：原版直接替换旧元素 src；修后旧录音时间持续前进，释放响应后交接。
- 将真实媒体 seek 到曲终前 80ms：原版原生 loop 重复第一首；修后收到自然 ended 并播放 Tango。没有伪造 ended 事件。
- 31 次快速服务场景请求：原版最后一曲 paused=true/time=0；修后最多两槽，且实际音乐总线采到非零峰值。音乐 0.07、音效 1 的独立值精确保留；音乐置零及受控 hidden/foreground 分别暂停、恢复。
- 1366×900 鼠标、390×740 真实触控均原生完成旧局 → 菜单新局 → 不同角色确认 → 商店 → 牌桌 → 首手提交。观察器仅包裹原 scoreImpact 并读取新增实际 AudioBufferSourceNode：首张速率 1、第二张 `1.1200000047683716`，终结层保持原速率。测试用 1e-6 容差容纳 AudioParam 的浮点表示。

普通无故障重开在原版也能播放，不能声称已无条件复现用户当时设备上的突然失声。此前纯生命周期脚本原版为 2 PASS / 6 FAIL、9440bf4c 为 8 PASS；加入主路径速率断言后才形成上表最终结果。这些阶段与入口对话框、关闭菜单 details、相同种子确定性 runId 的脚本修正均保留在 [历史原报告](harness-history.json.gz)，不覆盖原 FAIL。

## 版本与复跑

浏览器运行时 HEAD 仍为 9440bf4c、产品源码尚未提交；两份完整报告记录前后 SHA256 不变。提交后逐个将报告中的源码 SHA256 与最终产品 Git blob 比较，全部一致；原版源码另与 7d7921e 比较。实际绑定、浏览器峰值、Canvas/DPR1 环境及所有状态见 [audit.json](audit.json)。这不是把旧 HEAD 或旧 PASS 冒称为最终提交的执行结果。

```sh
npx vitest run tests/score-recorded-audio.test.ts tests/audio-music-lifecycle.test.ts tests/audio-mix-policy.test.ts tests/audio-preferences.test.ts tests/audio-sample-loading.test.ts tests/fire-audio.test.ts tests/failure-audio.test.ts tests/score-energy.test.ts
npm run build
AUDIO_OUT=shots/audio-lifecycle/review node tests/audio-lifecycle.browser.mjs
```

浏览器脚本优先使用 AUDIO_CHROMIUM，其次系统 /usr/bin/chromium，否则使用 Playwright 自带浏览器；所有观察器仅加入测试构建。截图 [桌面](after-native-restart-1366.png)、[触控](after-native-restart-390.png)、[原版慢首曲失声时页面](before-slow-first-track.png) 只补充界面事实，不证明听感。

## 剩余边界

heard=false：没有听觉能力，未试听，未签音色、交接听感或用户设备响度。仅 Canvas 浏览器软件证据；未做实体 Android/iPhone、硬件 GPU、Firefox/WebKit、子目录矩阵、30 分钟长局或 100 次原生场景切换。超时/播放拒绝的有限重试还由单测覆盖；音乐源全部不可用时仍等待下一恢复触发，不合成替代旋律。

另一路 GameScene/ShopScene 变更需由父在整合后的精确版本检查。本分支只普通开发提交与 push，不合 main、不强推、不查询/等待 CI、不部署。
