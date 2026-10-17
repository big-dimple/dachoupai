# 卡图显示回归返修

基线为 main `7d7921e76ca794a14e715e3eac3b4d66143862ff`。产品提交 `fddb7378112304ead60d67a676e73bb4a3fe2ec0`，开发分支 `fix/card-art-display-regression`。本目录只记录有限软件浏览器验证，不代表真机或真人美术验收。

## 修复与范围

- 放大图改用全视口黑底、完整 `contain`；关闭按钮至少 44×44，遵守安全区。高清成功后收起加载区域，给图片更多空间。
- 详情的原生按钮支持 Enter/空格；按 JOKER_ART 中登记模型的完整资源地址精确匹配，再把模型 ID 传给放大组件，不解析文件名。a11 的版本化资源有效。
- 只有登记的 72 张卡独立高清资源具有放大入口。机制示意、道具、升级做牌、自选商品占位、未登记 URL、只有缩略图或同一图 URL 不显示徽标、不绑定放大点击。不生成补图。
- 复用现有 DetailArt 的有界加载、超时、解码、重试与取消。失败时缩略图无装饰模糊，关闭、Escape、外部黑区点击均清理请求并返回入口焦点；点击图内保留展示。
- 72 张卡的缩略和高清 URL 都经过原有 `assetUrl`，并附 manifest 内容哈希，解决本次沿旧路径覆盖后的暖缓存问题。Phaser 缩略与 DOM 详情消费同一登记表。
- 仅重新派生 a11：1696×2528 用户源文件保持原 SHA，完整 contain 到 128×160 / 615×768，使用新的 a11-v3 内容地址。旧 v2 与标准地址保留。其余 71 张源图、派生字节及资源记录保持。manifest 的 165 项有效资源合计 10,054,634 字节；新保留的两份派生文件共 114,544 字节，不把 manifest 合计冒称整个 public 目录大小。
- GameScene、ShopScene、AudioEngine、领域、存储、平台均与基线相同。没有 main 更新、强推、部署、CI 查询或触发操作。

## 证据

原回归截图与 [baseline-FAIL.json](baseline-FAIL.json) 保留：a11 显示徽标但点击无效；740×320 弹窗 y=-50，关闭按钮 y=-37、底端仅 7px；图被压为 360×148 的 cover 横条，回退缩略有 8px 模糊。

最终结果见 [browser-report.json](browser-report.json)：Chromium 151.0.7922.173，DPR 1，软件 Canvas。真实菜单→图鉴→卡牌详情→放大，三档 390×844、740×320、1366×900；Enter/空格/Escape、焦点返回、图内保留/外部关闭、重复开关、旋转和模拟安全区、商品无无效入口、受控 HTTP 404/坏图/挂起失败与恢复、迟到解码/替换/父详情关闭。另用实际生产产物访问 `/card-review/`，不启用 E2E observer。

主要图片：

- [390 竖屏](390-zoom-PASS.png)、[740 短横屏](740-zoom-PASS.png)、[1366 桌面](1366-zoom-PASS.png)
- [高清失败的可读缩略与重试](390-http-readable-fallback-PASS.png)、[重试恢复](390-http-recovered-PASS.png)
- [商品不显示放大入口](390-goods-no-zoom-PASS.png)、[生产子路径](390-built-subpath-PASS.png)

暖缓存测试保留并重复读取 144 个刷新前的不可变 HTTP 缓存条目，确认第二次不访问服务端；当前 144 个版本化请求的 SHA 均匹配当前 manifest。详情与放大保持可用。该测试是受控旧缓存，不声称检查了线上 CDN。

[resource-audit.json](resource-audit.json) 校验全部 72 张用户源文件 SHA，以及仅 a11 运行时资源记录变化；[a11-rederive-CHECK.txt](a11-rederive-CHECK.txt) 通过只读重导比对。

## 本地检查与剩余问题

- 类型检查：[typecheck-PASS.txt](typecheck-PASS.txt)。构建：[build-PASS.txt](build-PASS.txt)，构建提交 fddb7378，sourceStatus=clean；保留既有大包体积提示。
- 相关 5 文件 141 项通过：[targeted-141-PASS.txt](targeted-141-PASS.txt)。命令：`npx vitest run tests/detail-dialog.test.ts tests/detail-art.test.ts tests/joker-art.test.ts tests/joker-art-loading.test.ts tests/handdrawn-art.test.ts`。
- 全量本地回归 3800 通过、6 失败：[full-suite-FAIL.txt](full-suite-FAIL.txt)。原始 7d7921e7 在隔离目录复现同样 6 项：[main-7d7921e7-same-six-FAIL.txt](main-7d7921e7-same-six-FAIL.txt)。这 6 项是 score-recorded-audio 1 项、assist-profile-ui-copy 2 项、source-stage-art 3 项，未改相关产品代码或断言。新增最后一项“仅缩略/同 URL 无入口”测试另外包含在 141 项定向通过结果中。
- 浏览器初次迟到解码探针在缩略尚未就绪时直接 decode 而失败，原 [browser-lifecycle-observer-FAIL.json](browser-lifecycle-observer-FAIL.json) 保留；探针改为等基础详情高清就绪后再持有下一次解码。隔离主干测试首次缺依赖的夹具日志也保留，最终对照已补齐基线依赖，未改变基线源码。

未进行真机、听感、线上或 CI 验证。上述 6 项主干已有失败仍需相应负责人处理，不宣称全量回归通过。
