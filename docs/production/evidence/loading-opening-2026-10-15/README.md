# 唐宋牌开场视觉动画 · 2026-10-15

基线 `9c41dfff2a66ffa66b5cf812c2742caae9cdf125`（用户指定 `feat/loading-preload-20261015`），独立开发分支 `feat/loading-opening-art-20261015`。动画首提交 `dd5896772372a0247b063918668166d96825fdb7`；最终产品提交 `29a253e3efbb82ac5204991bd65b5dc170cebe04`（320标题留白修正）。验证脚本另有隔离运行修正，最终源码提交 `6c91667db50f8c879f8dd3c0468cd0ea1634f668`。本目录后续证据提交不改变产品源码；`source-and-results.json` 固定测试源码 blob 与保护树核对。

## 看得到的变化

之前：单层山形、小日印、整行标题和三张牌的阴影呼吸。[原PC](../loading-preload-2026-10-15/pc-cold-loading.png)、[原390](../loading-preload-2026-10-15/phone-cold-loading.png)、[原320](../loading-preload-2026-10-15/phone-weak-loading.png) 保留原测试版本及尺寸，不冒称同一次拍摄。

现在：朱砂日印与细金环浮现；两侧远近山河错层落定；标题三字以平移/透明度依次入场；三张原创纹饰牌先中后侧错峰发出，持续有轻微浮动；河面和六枚微小金点缓动。没有从上到下曲线擦屏，没有全屏遮盖转场。日印/金点/山河/纸牌均为本项目内联 SVG/CSS 原创，无新增图片请求。标题、说明、计数和按钮都是独立 DOM 文字，不随 SVG 或图片缩放。

原生 `progress.value` 始终等于真实已解码图片数量，轨道金红游标也只读同一个比例。已解码 >0、≥1/2、全部完成分别点亮三张牌和三枚装饰标记；短描边扩散复用已有 MIT 弹簧函数，不等待播放完毕。装饰标记不是资源分类完成承诺。未完成或缺图不会伪装满格。首次纸面与134项目录切换时重置装饰状态，不改真实计数。

## 图像和动画证据

| 视口 | 实际加载中PNG | 原生录屏 |
| --- | --- | --- |
| 1366×900 PC | [PC](1366-motion-settled.png) | [PC动态](1366-motion.webm) |
| 390×844 | [390](390-motion-settled.png) | [390动态](390-motion.webm) |
| 320×568 | [320](320-motion-settled.png) | [320动态](320-motion.webm) |

PNG为文字、色彩和几何验收依据。录屏为软件 Chromium + Playwright固定版本FFmpeg原生录像，用来查看实际先后节奏。录屏与视觉脚本注入了有界传输/解码延迟以暴露加载状态；这些延迟只在 `harness/loading-opening.mjs`，产品不包含等待。`*-opening.png` 为主模块加载前的原生HTML首屏。

三档完整PNG均已实际打开检查；320标题/副标题上移，最终副标题与牌扇≥8px；320横向装饰溢出在图审后通过独立山河裁切容器修正，短屏高度压紧，最终脚本同时断言 dialog 横纵无滚动、页面无横溢出和按钮≥44px。手机山河保留可见层次，不因缩窗移除动效。系统/应用减少动态效果偏好都禁用动画与过渡；系统偏好切换实时生效。隐藏页面暂停CSS并取消短描边，关闭时取消动画/移除监听。

## 验证与边界

- `npm run build`（`raw/build-compact-final.txt`）PASS，包含TypeScript检查；已有大chunk提示保留。
- 7文件41项相关单测（`raw/affected-compact-final.txt`）PASS：真实资源计数/12秒截止与取消/共享解码/温存队列/资源加载/弹簧/场景路由。
- `harness/loading-opening.mjs` 五组原生视觉 PASS + 独立CPU4 PASS（合成报告保留各次源码身份）：三档原生加载、系统reduce、已存应用reduce、4倍CPU限速。进度始终真实，0/半程/完成装饰状态匹配；标题稳态变换没有scale；入口后dialog删除，无页面异常。
- 原 `harness/loading-preload.mjs` 原样运行；最终固定产品提交的结果与所有冷/弱机/缺图/缓存/原生命令保存相等性见 `pipeline-final.json.gz` 和原始日志。
- `src/game/CharacterArt.ts`、所有人物/美术资源与manifest、`SceneResources.ts`、`BootScene.ts`、`ImageWarmupQueue.ts` 相对基线逐字节相同。没有共享窗口冲突。
- 没有合main、查CI、部署或管理域名；没有自然整局、物理手机、GPU性能或用户主观审美签收。

首次观察脚本用过大的每图解码延迟，累计越过产品原有12秒，等不到自动入场；记录见 `first-observer-failure/visual-report.json` 与 `raw/visual-first.txt`。仅缩短测试注入延迟，产品截止/重试没有放宽。`pre-compact/visual-report.json` 为横向溢出修正前观察，不充作最终几何验收。初次尝试录屏时Playwright附带FFmpeg缺失，工具失败记录保留；本机FFmpeg重录后六组通过；随后安装Playwright固定版本编码器，以固定编码器重录原生动画，PNG仍为色彩验收依据。

## 参考与许可（仍有明确阻碍）

已实际读取本地既有 Inkwave spring 实现、第三方记录和完整 MIT 许可证（Copyright © 2026 Jayden Davis），在加载装饰复用该既有实现。完整许可证继续在源码和Web分发中保留；[本次归属说明](../../../../third-party/inkwave/README.md)。新山河、日印、纹样、花色路径与CSS原创，没有搬运未授权素材。

**本轮无法实际观看用户指定参考站的加载演出，也无法重新读取其上游当前源码/许可。** 演示站在执行环境浏览器与curl返回代理连接失败/403；GitHub clone、API与已知历史raw路径404；web reader仅取得站点标题，没有画面/源码。因此只声称复用了已保留归属的本地MIT代码，不声称本次完成上游实看/新许可核验。逐项结果见 [reference-access-and-license.json](reference-access-and-license.json)。可见动画产品已完成；参考实看是唯一未完成的请求项。

后续压力观察记录：`contended-cpu/report.json` 中前五项视觉PASS，CPU4与另一浏览器回归并行时超时；独立观察也有只等待自动ready的超时FAIL，均保留。截图期间扣住传输可能消耗原有12秒，前述超时不作为产品弱机PASS或确定归因。最终CPU4测试进入真实预载即释放传输，并检验原有两种合法结果：实际全部解码，或12秒后原生文字继续（进度不得冒充满格）。未改产品时间、并发或资源；最终独立CPU4实际完成134项全解码，通过后顺序运行原预载全矩阵，精确源码八例PASS。完整结果见 `cpu4-final.json`、`visual-report.json`、`pipeline-final.json.gz` 和 `raw/pipeline-contract-final.txt`。
