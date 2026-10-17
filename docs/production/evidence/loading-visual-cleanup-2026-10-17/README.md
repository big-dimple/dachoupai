# 加载页小金鱼移除（2026-10-17）

基线：`7d7921e76ca794a14e715e3eac3b4d66143862ff`。独立分支：`fix/loading-visual-cleanup-20261017`。本批仅普通提交/push 开发分支，不合 main。

## 产品差异

- `index.html`：删除加载进度旁的小金鱼 SVG、专用定位样式和三组动画。
- `src/game/LoadingScreen.ts`：删除兜底模板的小金鱼、构造时自动补建小金鱼的逻辑，以及只供小金鱼定位的 CSS 变量写入。
- 保留既有唐宋牌标题、山河/三牌画面、细进度条、加载文案和操作。未生成新图，未改/删任何 `public` 原画或派生资源，未重做首页。
- 加载策略/资源完成门/自动重试/暂停继续/减少动态/存档均保持原实现。`main.ts` 及并行独占文件完全未动，逐文件保护哈希见 [verification.json](verification.json)。未查询 CI、域名或部署。

已阅读当前 `AGENTS.md` 及 ENGINEERING/QUALITY/UX 合同；仓库及本地入口未发现适用于本次局部代码修复的 `SKILL.md`。用户本次分支/文件范围优先于历史发布授权。

## 实际验证

- `npm run typecheck`：PASS。
- `npm test -- tests/loading-progress.test.ts tests/resource-recovery.test.ts tests/scene-resources.test.ts tests/image-warmup-queue.test.ts`：4 文件、18 测试 PASS。
- `node harness/loading-visual-cleanup.mjs`：E2E 构建和 4 个真实浏览器用例 PASS；原始计数、布局与结果见 [report.json](report.json)，被测源码/构建哈希见 [verification.json](verification.json)。

截图来自构建产物的真实 BootScene 加载弹层：只在测试网络层暂扣一张必需图片，实际已解码 11/12，未达完成门；没有伪造进度/资源注册表或替换产品画面。当前基线 BootScene 准备的是 12 张英雄小图，完整目录继续按原策略后台预热，不能套用旧脚本的开局 146 项断言。

|用例|实际结果|
|---|---|
|PC 1366×900 默认动态|首屏 HTML 与运行时均无小金鱼；真实未完成门不进入首页；Escape 暂停无新增图片准备请求、点击继续后完成；系统减少动态热切换停止装饰动画。受控移出一张缓存后，通过原生首页按钮再次打开加载弹层，再到选角，未补回小金鱼。|
|390×844 默认动态|11/12 期间无小金鱼、无横纵溢出，按钮至少 44px；目标图片首次返回 503 后无需点击自动重试一次，全部完成才关闭加载。|
|390×844 系统减少动态|模块执行前与运行时装饰动画均为 0，11/12 时进度不足 100%，图片完成后正常进入首页。|
|390×844 应用减少动态|已保存的减少动态偏好在模块执行前生效，运行时装饰动画为 0，完成门保持。|

已实际打开查看以下原尺寸截图：无小金鱼，标题/牌面/进度清楚，操作完整可见。

- [PC 加载帧](pc-loading.png)
- [390 竖屏加载帧](390-loading.png)
- [390 系统减少动态加载帧](390-os-reduce-loading.png)

另外保留 [390 应用减少动态加载帧](390-app-reduce-loading.png)。Chromium 151 软件环境与视口模拟不代表物理手机、玩家审美或线上部署验收。

## 原观察器失败保留

- [首次观察器失败](initial-observer-failure/report.json)：测试路由未匹配英雄图的 `?v=` 参数，目标请求命中为 0，真实页面已经完成加载，等待 11/12 超时。修正为按 URL pathname 匹配；没有改产品。
- [暂停观察器失败](pause-observer-failure/report.json)：Escape 同时触发现有键盘音频解锁，观察器把音频请求误计为加载图片请求；当时实际资源门仍为 paused/11/12。限定计数为图片准备请求，保留音频原行为；没有改产品。

两次 FAIL 的报告和截图原样保留。最终 4 个用例在同一产品源码上重新运行并通过。
