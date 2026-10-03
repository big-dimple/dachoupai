# P08 局部火焰：两张实际静帧

被测运行时源码：`a423dc51cc326476a9c6729ff068fc4789aa5f34`，前置main `38f16c2984a2591af0bb918e5350a61515b8777c`。此处是实际本地Canvas候选，非线上版本证明。原e2e构建在源码commit前生成，header为38f16c2+modified；同一运行时源码随后提交a423dc5，冻结发布构建header为a423dc5+clean。

- [360×740：五张完整出牌／小火](P08-360x740-five-card-small-fire.png)
- [844×300：五张完整出牌／极高档](P08-844x300-five-card-extreme-fire.png)

Chromium 151.0.7922.173／Canvas，CSS视口分别360×740、844×300；请求DPR3，实际canvasDensity2，safeInset四边0。原PNG分别720×1480、1688×600，无裁图、重绘或录屏；postrender真实游戏画布不含DOM菜单浮层。两图仅游戏画面，不含账号、凭据、个人信息。

完整数据／SHA256见[本轮证据](../P08-flame-focus-2026-10-03.json)。工程已自查；父协调此前只见占位，独立视觉批准仍NOT_RUN。Library保存止于tools/list network、未返回身份；最新用户明确批准本次Git证据交付，不涉及待审批原画发布。
