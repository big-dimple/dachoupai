# 当前交接：P08全游戏手绘墨线／纸色主线



P08点数／花色放回选牌review（UTC 2026-10-04）：基线已授权发布main3938cee（缺图主题FF15:16:39Z，精确main CI37212391288与docs37212391290 success），本排序独立source bf01aa5暂不推进main。仅GameScene.sortHand：await-input且ready/无presentation时，先cancel手势，再清全部手选／直选／顾问选牌和旧ghost/undo，刷新普通座位后走原单次ReorderHand；原比较器、ID焦点、九牌几何与规则参考保持。历史排序保选合同按最新用户要求覆盖；三旧浏览器样板正确更新，并重新原生选牌保弃／出检查。101受影响单测/type PASS，旧8测试7红1绿保留；390×740 DPR1软件Canvas一个合法九牌native import，手选／顾问3张／空选／重复四排序全归空、原框和全run除order/seq/receipt外不变，271忙帧含270presentation均禁排序且真实点击无新命令PASS；唯一现成PNG actual view。public/assets、art/sources（72原画＋四工具样图）、domain/application树同3938；无美术/火/工具loader/计分/RNG/save-format变化，不重跑无关全冻结/设备/录屏/PC/部署。证据evidence/p08-sort-return-2026-10-04；整体仍IN_PROGRESS，review待根协调放行。
