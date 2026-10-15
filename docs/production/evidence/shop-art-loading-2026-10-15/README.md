# 商店真画加载：独立开发窗口

- requirementId: shop-visible-art-loading
- inputSHA: 4a52fd0b0fb9ac0a49b8cb5e79abc8db4326e2d7 (actual origin/main)
- dependencies: existing ShopScene render/request/paint callbacks and StageImageWarmup entrypoints; all public interfaces preserved.
- allowedFiles: src/game/{GoodsArtLoading,JokerArtLoading,DetailArt,StageImageWarmup,ImageWarmupQueue,ImageWarmupStatus}.ts; new src/game/ArtTextureLoading.ts; tests/{goods-art-loading,joker-art-loading,detail-art,image-warmup-queue,art-texture-loading}.test.ts; harness/shop-art-loading.mjs; this evidence directory.
- nonGoals: scene edits (including ShopScene, GameScene and failure pages), domain/RNG/save changes, audio, artwork, manifests, full-library preload, deployment, merge/main push and permission changes.
- outputs: bounded loading implementation, deterministic failure/cancel tests, cold-cache browser measurements and screenshots, development branch + ready PR.
- acceptance: real visible shelf/owned/tool textures first; detail remains optional; shared requests, budgets, explicit retries, shutdown and stale decode safety; read-only full-state comparisons; first/all real image timings and resource counts/bytes before/after.
- stopConditions: denied permissions stop that action; coordinate before a required scene/API edit; preserve actual failed observations and report untested gates.

Local Chromium measurements use a fresh browser context and a controlled 900ms delay per original WebP response. This reproduces scheduling contention and measures local behavior; it does not measure production CDN latency, physical phones or player acceptance.

## 最终实现与验证

产品提交：`29e4c34b94aa4685baaac48472d28dcf184f6626` + `e76d23884f00aab18ee8ce7093b98f49c7adbcff`。取消修复 0caddfa40ce863d5fb922591ca015756bcf0606b；状态同步修复 d43a901ed116256c68eadb68e2f44f290e150c3b。计时构建绑定0caddfa4，最终故障构建绑定d43a901e，均 sourceStatus clean；后续证据提交不改产品。没有修改 ShopScene/GameScene/失败页、音频、原画、manifest、domain/content/application，也不合并、部署或 push main。

`ArtTextureLoading` 按 Game/texture key 合并预热与场景的请求，成功只保留 Phaser 原纹理缓存，不把缩略图挤进四项高清 Blob 缓存。每图最多 128KiB/600,000 像素/4500ms；保丑牌/工具各两槽，预热与高清共用另一两槽，全局最多四槽（原三个独立池最多六槽）。优先真实可见牌面，已有下载中的预热只合并/提权；只有可选高清会被中断并排到真画后继续，消费者关闭则取消。高清原两槽、四项缓存、2MiB/1,600,000 像素/6000ms 限制保留，响应体新增流式上限检查。

Goods 的渲染后只读分类识别基础选择扇形的实际顶牌，被覆盖的四张降为预热。预热状态在显式卡面重试成功后同步到真实纹理缓存，避免仍报“简图×1”；Joker 保留每次场景一轮自动瞬时重试、明确失败/显式重试及离场取消；去掉 Phaser 独立下载池与可选高清预取。现有预热入口只读当前已保存 run 的真实货架、持有牌与工具/长期物品，替代三个固定起手 ID；固定角色/JQK 预热继续，队列仍最多24项，已完成旧项可让位于下一真实需求。没有全库预载。

本地 Chromium 冻结构建、正常新局→购入持有牌→刷新→道具货架→正常保存冷恢复；1366×768 和390×768，各一条受控 900ms WebP 延迟。`frozen-before-final.json` 与 `verified-after.json` 保留每项请求、原路径、响应字节、完整状态 SHA256 和输入对象保持断言，`comparison.json` 为并排数据。首张/全部指实际画面中的货架、持有牌及基础扇形顶牌；被完全覆盖的装饰层另计请求，不签为可见货架。截图每个窗口含 initial/ready，已实际查看最终 PC 完整图及404重试图。

| 窗口 | 首张 before→after ms | 全部 before→after ms |
|---|---:|---:|
| PC冷首店 | 522→496 | 4328→2357 |
| PC持有牌 | 0→0 | 0→0 |
| PC刷新 | 1→1 | 2644→2069 |
| PC冷恢复 | 921→390 | 3489→2269 |
| 手机冷首店 | 993→924 | 1933→1969 |
| 手机持有牌 | 0→0 | 0→0 |
| 手机刷新 | 1→0 | 2251→1928 |
| 手机长期道具 | 0→0 | 980→0 |
| 手机冷恢复 | 1100→942 | 2243→2052 |

首店截至截图的累计原图请求 PC 28→24、收到 WebP body 275170→241576B；手机13→13、145324→145324B。累计从标题页起算，冷恢复行还包括此前正常购买/刷新操作，详情高清是用户实际打开时才请求。字节只计已收到的图片 body，不含 HTTP 头，不把仍待完成的传输当零字节总量；完整每行见 comparison.json，不承诺所有窗口总字节均下降。手机首店全部时间略有波动（1933→1969ms）；单次受控计时不是统计或正式CDN性能结论。

41项加载定向测试通过；最终完整245文件/3436单元测试通过（`final-unit-tests.log`），typecheck/e2e模式编译通过。所有图片到达窗口逐字段比较 run（含RNG）、journal、checkpoint、持久化slots，根容器、图片容器和输入对象保持。原生404、坏图、重试到高清、离场取消/冷重入结果见 `faults.json`；没有用假原画、重启输入或重发游戏事务掩盖加载。

已交的是可运行候选与有限本地软件证据。正式域名代理、物理设备、人工观感、真实慢网统计及完整旅程/18路线未做或未签；不以CI替代体验完成。原失败与测量校正在 [EXPLORATORY.md](EXPLORATORY.md)，其旧数据/图保持。

故障用例不加900ms延迟；404/坏图各记录三次同路径请求：场景初次、原详情缩略图、用户明确重试。页面路由关闭浏览器HTTP缓存，所以原详情 DOM 图片也有独立网络记录；共享协调器自己的预热/场景订阅已合并，未修改 DetailDialog。取消用例原请求记录 net::ERR_ABORTED，冷重入及完整保存一致。保护树/产品摘要见 [validation.json](validation.json)。
