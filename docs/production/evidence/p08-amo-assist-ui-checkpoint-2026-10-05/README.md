# 阿默主手＋助攻：首个 UI 检查点

只供 review；main 仍是 a5cdc5f，默认 v11 不变。领域中间父 1d8400d；UI remote source c334f7a899a6efdfd1859ae2ff22c58c7dbb19ef，精确本地原生 build source 5d3995dc53dcda20ede909dd00930e2a21478af7，二者 root tree 一致，见 source-binding.json。

显式新 profile 以 availability/facts 构建只读助攻候选。主手＋副组草稿、再次点击取消、菜单返回、420ms 长按后 pointercancel 无提交，以及真实 PlayAssistedHand 全状态和领域结果一致，390 与844×300 top12/bottom34 软件 Canvas 已通过。58相关 tests、typecheck、plan check 通过；原生前后 source/index/HEAD 保持。两张图均实际 view。没有 GPU、真实设备、自然获取或平衡接受。

首轮 FAIL 保留原711ae29 source/build身份：检查器误用未序列化矩形 right/bottom，且原390 AI说明实际碰整理按钮。修正分别用 x+width/y+height，以及把 AI说明移到待出牌区上方空位；没有削弱边界断言。

尚待 F 七卡 resolver/copy 接口、320/14牌有界检查、完整 AI清副组/全草稿撤销/排序、保存暂停重试/回载与持久 trace 回看。短横辅助文案与小牌徽标仍待细化。首图不能当最终发布或完整验收。
