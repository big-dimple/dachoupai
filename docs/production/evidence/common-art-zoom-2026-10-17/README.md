# 共用卡图鉴赏 · 2026-10-17

基线 `9e015286d1d223afad0a6e6b2860fcfed1457faf`；独立分支 `dev/common-art-zoom-20261017`。本目录的 browser.json 保存四个被测产品文件的 SHA-256；最终 Git SHA 以交付回执为准。

## 范围与入口

- `DetailDialog` 的卡图区域统一识别当前注册的 72 张唐宋牌、39 张消耗/牌型升级工具、12 张长期物品。严格匹配高清与缩略资源对，拒绝旧路径、跨卡混配、缩略单图、机制示意和未注册地址。
- 图鉴：`Catalog` / `CatalogDialog` 已有的唐宋牌、道具、长期道具详情直接继承。牌型升级工具 P 系列随道具详情覆盖；无插画的独立牌型规则条目不添加入口。
- 库存：`showConsumables` 的使用详情和长期物品查看直接继承；点击图片不选择目标、不购买、不使用、不销毁。
- 商店：现有 `goodsArtPortrait` 购买详情、基础选购、购买结果、物品查看调用静态继承同一入口。过关只读道具与礼物详情也继承。未改 `ShopScene`、`GameScene`、`ConsumableDialog` 或任何资源 manifest。
- 放大层纯黑、完整 contain、图片使用整个视口区域；44×44 关闭触点、Escape、黑色留白点击关闭，回到独立图片按钮。无新增外框；图片提示放在右上角，与右下稀有度分开，详情卡图去掉额外实线框。
- 真实高清解码后以 180ms 淡入替换缩略图，减少动态设置下直接替换；沿用现有有界加载、取消、缓存和重试。没有可用注册高清时不创建放大按钮；详情正在使用机制示意回退时隐藏提示，真实插画恢复后重新显示。

## 已执行验证

- `tests/card-art-source.test.ts` + `tests/detail-dialog.test.ts`：152 项通过；包含全部现有注册 ID、错误/过期/混配地址、图片与业务操作隔离、回退和晚回调清理。
- `npm run build`：TypeScript 与 Vite 生产构建通过，322 模块；保留已有大 bundle 提示。
- `node harness/goods-art-zoom.mjs`：单个 Chromium 153 上的短组件检查，10 项通过、0 pageerror。移动视口 390×844 与一次 1366×900 缩放；使用生产 `showCatalog`、`showConsumables`、`DetailDialog` 和样式。静态预构建检查页避免 Windows Vite 开发模式模块变换持续占用 CPU。
- 图鉴实点 T12/P01/U01/c06；受控库存实点 T12/P01/U01；共用购买详情组件中图片点击不触发购买。关闭触摸、Escape、空格重开、焦点恢复、高清 503 → 缩略保留 → 手动重试恢复、父详情关闭清理、机制示意无入口均通过。完整受控 state、localStorage 与命令计数保持不变。
- 现有实际高清为 615×768，缩略为 128×160。截图在淡入结束后拍摄。只复用当前发布资源；原图/更高像素资源的管线属于另一个工作包。

## 失败与边界

- 首个可执行浏览器检查在 P11 高清重试恢复后发现焦点丢失。保留 `browser-first-FAIL.json` 与 `browser-FAIL.png`；修复为隐藏恢复区域后聚焦关闭按钮，最终 `browser.json` 通过。之前两种开发模式启动无进展，均主动停止，不计为浏览器通过。
- 原有 `tests/goods-art.test.ts` 为 2 通过 / 2 失败；在未改的主工作树同一基线复测结果一致。第 52 行旧期待“本场剩余弃牌+1”，当前文案为“本场弃牌次数+1”；第 66 行旧期待“当前场预算不增加”，当前为“当前场次数不增加”。未修改这些文案或放宽测试。
- 未跑正常 ShopScene/GameScene 全旅程、全部 123 个资源的浏览器矩阵、断网/超时完整矩阵、子路径构建浏览器、物理设备、移动系统返回键、听感或真人美术验收。浏览器证据是生产组件检查，不代签这些项目。
- 本包只普通 dev 分支提交/push；不合 main、不查/等 CI、不部署。P08 保持 in_progress，无整体完成百分比。

日志：`targeted-tests.txt`、`build.txt`、`browser.json`。截图：`390-tool-zoom.png`、`1366-permanent-item-zoom.png`、`390-recoverable-detail-failure.png`。
