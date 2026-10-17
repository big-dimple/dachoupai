# 小图鉴赏触发去遮挡

本次小修基线 `9ec861adce4e8e088d638dc36800ff9cac304ad7`，独立分支 `dev/art-zoom-small-image-20261017`。只改 `DetailDialog.ts`、`DetailDialog.css` 的共用触发渲染/样式及定向测试；不改 ShopScene、GameScene、ConsumableDialog、资源或使用/购买流程。

## 修正

- 修前，小红包 60px 宽的使用页卡图被“放大鉴赏”黑底文字换行遮住。修后，图片按钮内不再渲染文字；“点图放大”移到图片下方，单行、无底色、无框。
- 图内仍是一个覆盖图片的透明原生按钮，保留 `aria-label="放大鉴赏小红包"`、`aria-haspopup="dialog"`、键盘入口和原焦点恢复。图外提示为装饰文字，避免额外 Tab 停靠点；机制示意回退时随图片按钮隐藏。
- 共用图片框预留提示行，大图也将提示放在图外。未给图片按钮增加边框或阴影。

## 验证与截图

- `node node_modules/vitest/vitest.mjs run tests/detail-dialog.test.ts`：150 项通过。
- `npm run build`：TypeScript 与 Vite 生产构建通过，322 模块；已有 bundle 体积提示保留。
- `node harness/goods-art-zoom.mjs --small-trigger`：单 Chromium 153、本地生产组件页，10 项短检查通过、0 pageerror。小红包走受控库存→使用→原“返回选牌”页，实际图片盒 60×84px，contain 卡面约 60×75px；提示不与图片盒相交，且为无底色单行。触摸图片、Enter、Space、关闭/Escape、返回原图按钮焦点与零业务命令均通过。
- 已实际查看 `60px-trigger-before.png`、`60px-trigger.png`、`390-t16-use.png` 和 `390-catalog-detail.png`；只说明本次遮挡修正，未代签主观审美或物理设备。

`overlap-baseline-FAIL.json` 与修前截图保留了真实遮挡失败。首次观察器忘记切出小红包默认预览页，测到的是隐藏图片区，失败保留在 `hidden-pane-observer-FAIL.json`；只补正常“返回选牌”点击，未修改产品流程。`browser.json` 为最终结果，包含被测源码 SHA-256。

未核验线上新版本、完整工具旅程或另一 worker 的工具页重排；基于本分支的同一共用渲染修正交付普通 dev push，不合 main、不查 CI、不部署。
