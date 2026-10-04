# P08核心信息批2／有限批3技术证据

源码提交：`3507b6623e90aea0b6d8d54235e9a126c93eb220`。本目录是开发证据，不是runtime资源或部署现场。

## 两张已独立早评的图

仅复用review `a15288e832f0de62f80c9c8eb916b4eacaaf51d3`的两张产物；root实际fetch/view后，完整类别发现性、3/4/5真实变体和固定行动的局部方向早评通过。不新增图或录屏。

- 候选src指纹SHA256：`cdd3adddc69630337f657d71ac4a1edf6abf7c2eeb8cff3716e5d74d8f35b2e6`，与最终源码相同。
- embedded C03，revision `9610ab4e8ce35d9d98a679fa60258f1d5742c5bb`，modified=true，builtAt `2026-10-04T01:21:40.381Z`；不能称3507或main现场截图。
- Chromium151.0.7922.173，实际Canvas，CSS390×740，DPR1，safeInset四边0，reduced-motion。
- validator通过FIXTURE，经原生导入/选牌：7♠7♥7♣2♠4♥、持有c08/c09/f09。旧素材，不是自然购买或新美术。
- `390-selected-hand.png`：三条／计分3附带2／7类入口／常驻四牌普通规则。
- `390-candidate-detail.png`：全部7类摘要、实际3/4/5各一个确定性代表；切5后唯一正文原生滚32CSSpx，固定换组／撤销／关闭仍可见。
- PNG SHA256分别为`7c5ddde0d99b2dc9c8f5f8b904cf07f00b7eab3fe3f06cc64e56b2ca001ca5ff`和`b7784df7b56a3a2f0f69bf990e0f9937c0132a860b43b1ef5d832fe39387416a`。

## 实际验证

- `freeze.json`：冻结3507，1851 tests（102文件）、content、type/build、Canvas Chromium桌面/手机smoke、plan全PASS；前后源码/index/HEAD不变。仅Canvas功能门禁，不冒充全部WebGL或设备性能。
- 162受影响测试及后续51模型/详情测试、type通过。全72/29共享schema静态审计与参数化纯predicate用例通过，不代表72张所有运行组合已人工验收。
- `browser-contract.json`：Chromium Canvas与WebKit实际WebGL390×740/DPR1；自然三货详情取消／一次购买／入场，随后合法fixture检候选ghost/apply/undo/手改终止/排序resize/物品返回、B02/B03/B16与单牌精准身份。阻断保存时不露预测，保存完成才实际演出、完整已提交trace、下一手与刷新恢复全state/RNG。自然路线与fixture路线分开，未宣称全程自然构筑。
- `candidate-review.json`：最终同指纹构建，同手牌旧关闭弹窗回调不能应用新ghost；当前明确换3张并撤销回5张，UI-only、全运行state不变。最终摘要/变体安全边界实际量测。
- `layout-input.json`：8个有限实际文字bounds：360/390/430×740、360×640、844×300 top12/bottom0/12/34、1280×720，DPR1；14牌两行、独立出牌、字体14/44触点/56主动作、无预测与文字相交检查PASS。文件内保留自己的embedded候选版本；最终改动仅文案/所有权清理，未重复矩阵。
- `hand-input.json`：最终候选构建Chromium/WebKit360/390×740 DPR3，9及14张、双向跨行选/取消/重复、最多5张、pointercancel/第二指/Escape、排序/resize/旋转、弃牌补牌/刷新恢复PASS；报告testedCommit是构建时HEAD9610，实际测试含未提交候选，不能误称已发布9610原码。无录屏/性能验收。
- `bounds-before.json`：320×656/top0真实score108.4，规则与页脚交叠0.6px。页脚移3px、不降字体/容差。`bounds-after.json`仅再核390×678/top0/bottom0和390×690/top12/bottom0各一次，score132，实际规则/页脚间隔4px。320修后未浏览器复核，不以360结果替代390。
- `renderer-assumption-failure.json`保留首次失败：测试误把WebKit实际WebGL要求为Canvas，非计时/GPU失败；改为记录实际renderer，原安全断言未删，随后两engine功能通过。

## 四状态与边界

实现完成；本地技术冻结PASS，批2 main3b724283精确CI37168582912与production-docs37168582887均completed/success；见batch2-publication.json。局部候选信息早评通过；整体审美待独立验收。OnePlus／硬件GPU／听感NOT_RUN。27新WebP未接入，素材支线仍独立阻塞。原规则/RNG/存档/计分/奖励与P08几何合同不变。

已批准批3有限全流程几何/手势/保存与恢复检查如上，不重复图集、旧CI或无GPU性能测。非阻塞文案“只列当前手牌能组成的牌型”留后续适当批次，当前冻结不改。

## 批3自然串联收尾（不重复有限矩阵或图集）

`natural-flow.json`复用冻结源码3507的C03/e2e构建（2026-10-04T01:31:26.401Z，modified=false），CSS390×740/DPR1/safe四边0/reduced：Chromium Canvas、WebKit实际WebGL各一条完整自然种子路线PASS，没有导入fixture。自然合唱班商品完整条件先于单项数值，取消全state不变、明确一次购买后入场；0/1/5张选择，当前可见手牌候选ghost/明确换组/撤销不改领域state、RNG、资源。原生键盘详情/菜单规则/物品返回和模拟visibilitychange后台恢复保选择，不露预测/fullText/火。成功弃牌刷新候选且不推进playIndex，正式出牌保存真实完整trace，下一手转guidance；上手回看、保存退出→选角返回本局、reload继续均保持完整run/RNG/journal/资源，不重复购买/计分/奖励。实际Android后台行为仍未验。

首轮辅助脚本的字面“条件”关键词、未展开存档菜单和默认WebKit缓存路径错误分别已定位；记录在报告harnessCorrections。修的是支持测试入口/精确文案判断，没有修改游戏实现、删除安全合同或增超时。Chromium成功后只补WebKit，不反复跑两引擎全套。

批2实现与本地/远端技术门禁完成；批3有限自然全流程、已归档尺寸/手势/恢复验证完成。候选局部信息可读性独立早评通过；整体审美、OnePlus、硬件GPU、听感NOT_RUN。冻结源码保持，非阻塞文案清理留后续适当点，不为收尾重做图。
