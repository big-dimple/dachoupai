# 阿默两代规则与计分反馈组合

先确认远端main已经是 `04d2f729bbe37d7e34783f4a2a81b9026ff98a64`，再正常无冲突合入score review `76cd618564b2037aee98895e245ee71cfa4f5ddc`，merge为 `d31a64e1cd0feaf443d9a7ebc1740f2f8879fac9`。实际有界运行源码 `4613543`，完整SHA与clean构建时间见[summary.json](summary.json)。原domain、checkpoint、IndexedDbSave、bot、角色文案、A的harness及冻结v10 fixture逐字节保main；GameScene、ScoreFlame、音频和数字反馈逐字节保76cd。没有新增产品代码或改角色规则。

只运行390×740、DPR1、safe12/34两条合法DOM导入fixture：原冻结v10 before，以及按A既有方法标明v11身份的同一合法手牌/库存。用实际点牌/出牌，监听真实postrender impact阶段；没有sleep猜阶段、注入得分或改存档以通过断言。

| 保存身份 | 实际渲染来源次序及显示分 | 实际回看入口 |
| --- | --- | --- |
| v10旧局 | rank13：75 → 阿默：225 → 碰瓷：325 | GameScene完整动态回看 |
| v11新局 | rank13：75 → 碰瓷：175 → 阿默：525 | 过关页原生已保存账本 |

两条实际来源次序都等于当前已保存trace的event序列，正向值在到达帧等于该event.after乘积，不用另外推测角色位置。每个正向event与award恰好调用一次短鼓/纸击；实际有owned accent voice。回看新增短鼓调用0、owned accent voice0；旧动态回看全部帧credited=true，数字scale1、impactCount0。新525过关后原生产回看入口展示账本，不播放新的计分演出，账本文本保持Joker在阿默之前。

原始播放、回看、刷新继续的完整state/journal/export一致，包括计分、奖励、commandSeq、receipts和RNG；全部播放采样帧不改保存状态。结束后Graphics/mask/owned音尾归零。回看断言针对本方案新增的短鼓/纸击，既有来源提示音沿原契约保持，未做听感验收。

71项相关tests（5files）、typecheck、e2e build、harness语法及diff检查PASS；实际build身份clean、modified=false。原D美术图、旧FAIL、active pulse证据与A的兼容证据保持原source，未重拍、未重跑8条美术矩阵或全冻结。精确组合证据HEAD的CI另核。真机爽感、GPU/FPS、听感、整体P08未验，main未推。
