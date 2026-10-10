# 英雄选择到首店筹备：身份与主操作连续性

2026-10-10，输入父02:48UTC已FF PR100 main a7ad41d58076471fe82942db1d7f3159e69bbb27，部署另核。归属原W1首120秒/W2整屏纸墨/W3可选起手→实际买用→入场、U01/U03/U06/U11与SG05/SG09，W6真人/实机/听感依旧开放。

## 证据与玩家收益
同版1366/390原生英雄→路线→创局商店、已保存胜败只读截图已查看。英雄/路线与纸面战斗/胜败已有层级，不重做已认可页面；手机商店首屏没有英雄身份，起手提示与三个关闭偏好按钮同层，PC却有完整立绘。优先修最早的身份/决策断裂：筹备首屏沿用所选英雄图和名字，让真实起手→已购→库存/基础改牌→入场保持同一主操作，提示偏好进辅助层。不发明新玩法或必买流程，留钱和跳过指引合法。

## 执行卡
- requirementId：U01/U03/U06/U11、SG05/SG09。
- inputSHA：a7ad41d58076471fe82942db1d7f3159e69bbb27。相对14a9承接现有路线、基础自选及说明；不从旧待实现状态重做。
- dependencies：原W1必要布局、W2现有avatar/selection/p00与72牌/51物品稳定映射、W3 openingShopStep真实现货/库存事实和保存；不解锁W7/W8新机制。
- allowedFiles：src/game/ShopScene.ts、ShopLayout.ts、tests/shop-layout.test.ts（只必要几何断言）；本scope、AGENTS.md、DELIVERY_PLAN.md、UX.md；新增harness/hero-preparation-continuity.mjs及本包证据目录。
- nonGoals：英雄/路线/胜败页重画；domain/content/身份/价格/折扣/供给/随机/存档/音路/CI；门派重做、儒释道命名、染色固定供给；新图或大并发。
- outputs：双端筹备所选英雄与实际下一操作同屏，起手提示主按钮与提示偏好分层，买用/留钱/入场原命令，prepared头像/立绘映射与hash；main同输入关键图和保存对照。
- acceptance：先定向/type；同自然创局首店PC1366/390买前、实际买起手后、基础工具购买/使用或取消、入场；全部state/journal/storage按原命令比较，提示选项仅原偏好；320/740只必要布局和按钮可达，primary/secondary不低原48/44、文字≥14，不盖牌/价格/现持/固定入场；最终精确HEAD CI/draft父审。
- stopConditions：必须缩字删真实条件、操作漂移/保存副作用、需新机制/未批准重画；两次同方法仍无改善则重审。有限软件图/操作不是用户理解、美术满意、自然长期经营、设备/听感或W0–W9签收。

## 资产边界
原资产对账：p08 81条（6角色/72Joker/3court）、165导出；tools 51条、102导出，当前同原manifest，未宣称所有像素/母版都通过。本包复用现成hero avatar/selection与p00，商品原画保持。实际消费的二响与代表起手/工具记录hash；未读聊天母版、六角魅力与整体美术仍未知。胜败声音/用户听感仍开放，不能用本首店包宣布解决。
