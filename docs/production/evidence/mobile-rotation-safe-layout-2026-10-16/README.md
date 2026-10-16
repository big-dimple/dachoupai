# 手机旋转、短横屏与安全区局部修复

基线 `06512d5fde500d072c4b7ea89b983faea641494d`；产品 `b532922cdcaea14291bfbf6e2701c79de0572d7b`。独立分支 `fix/mobile-rotation-safe-layout-20261016`，没有改共享 main。测试执行于该基线上的产品工作区；after/report.json 保留执行时 HEAD 和六个产品文件 SHA-256，与产品提交内容对应。后续证据提交只整理报告和 harness 默认入口。

## 复现与修复

| 场景 | 修复前 | 修复后 |
| --- | --- | --- |
| 740×320，上24/下20/左44/右12 | [选角按钮盖住姓名和技能](before/740x320-hero.png) | [英雄与选择/确认分别占位](after/740x320-hero.png) |
| 同一短横屏商店 | [入场盖住价格](before/740x320-shop.png) | [顶部分类、底部经营与入场并排](after/740x320-shop.png) |
| 320×568，上24/下34 | [误用横屏布局，商品及按钮不可达](before/320x568-shop.png) | [竖屏画廊和固定操作区](after/320x568-shop.png) |

短横屏选角保留立绘、姓名、技能名、短效果和条件；故事/例子仍点击打开。极窄路线格只展示路线名，完整例子使用原入口。两场景读取左右安全区。窄横屏商店通过原分页每页两件；短竖屏将持牌栏收进既有管理入口。价格、供给、购买、保存和技能规则未改。

ShopScene 仅改页容量/geometry、头部与持牌栏显示、窄分类标签及商品建议渲染；ShopArt 仅移除折叠持牌栏的分隔线。GameScene、领域、音频、英雄命名/故事及六张原图无变更。整合时注意另一商店反馈任务也可能修改 ShopScene render，应逐块接线。

## 实际验证

- Windows，Node22.20.0，Playwright Chromium153.0.8010.12，DPR1，真实浏览器触控事件；本地 e2e build + preview，无私有渲染调用伪装点击。
- selection-layout、shop-layout、tool-inventory-entry、tool-carry-intent、hero-explanation、layout：**96 测试通过**。`npm.cmd run build` 的 TypeScript 和生产构建通过，保留原有大 chunk 提示。
- [after/report.json](after/report.json)：**39 场景记录 PASS、pageerror 0**。六英雄在568×320、740×320、740×300和320×568的文字/目标检查；390×740、1366×768同流程代表检查。安全区通过 CSS 变量模拟，旋转通过真实浏览器 resize。
- 原生选英雄、改模式、展开故事、旋转/Escape保持选择与模式；[全图旋转](after/full-portrait-rotated.png)。商店两件分页后点第三件、旋转关闭详情，完整 state/journal/storage 不变。
- 自然新局文成公主 → 商店 → “大字号”真实购买 → [旋转后的去向](after/destination-rotated.png) → 带入牌桌 → [选牌/预览](after/target-preview-rotated.png) → Escape 保留完整状态 → 再打开确认 → [返回牌桌](after/returned-table.png)。唯一新增命令为 `BuyBasicTool / LeaveShop / EnterStage / UseConsumable`；只消耗买到的实例一次。刷新继续后完整 state/journal/storage 相等，无工具窗口自动重开。未注入金币、库存或手牌。
- 技能面板[横屏](after/skill-landscape.png)/[竖屏](after/skill-portrait.png)旋转与关闭保持状态。返回按钮高48；横屏 y233–281（安全下界300），竖屏 y463–511（安全下界534）。没有假装使用条件未满足的技能。
- `git diff --check` 和 harness `node --check` 通过。

重跑：先 `node node_modules/vite/bin/vite.js build --mode e2e --outDir shots/rotation/build`，再 `node harness/rotation-layout.mjs`。默认运行修复后断言；`ROTATION_PHASE=before` 仅供基线截图，不作通过门禁。

## 边界

仅签上述本地软件检查。实体设备、真实异形屏/地址栏/键盘变化、Firefox/WebKit、真人理解与听感未验收；截图不替代六图美术验收。未查/等待 CI，未部署/管理域名，未合 main。P08 仍为 in_progress。Library 截图未在本轮重下，依据为实际本地页面。前后商店各来自自然新局，现货可不同；只比较覆盖关系与可达性，不比较供给分布。
