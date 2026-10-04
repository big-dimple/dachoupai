# P08 大丑牌人话文案候选

中央模板覆盖72张：主句“何时→效果”为21px，关键限制15px默认展开，保存值/当前资格15px，复杂细则折叠。商店、持有和详情复用同一层；只读定义绑定和既有jokerMemory，不新增判定器/预估分数。所有定义、RNG、存档与美术不变。

草稿输入公开交付commit b24ad0970f4ff1e385d6b62b450b23e003313a09；已合独审四张带牌限制、d06入场快照、f06总寿命/暂停仍耗寿命、B06当前暂停可恢复。薄模板不包含baseline展开值或定义快照。

## 实际图像

- `six-complex-details.png`：六个390×740真实整屏组合，a11/c08/c09/f05/f08/e02。验证过的导入fixture，native tap/详情/展开/关闭；不是自然购买。双four库存选择2–5同花色，真实普通同花；f05保存+3。旧已批准图，没有新生图。
- `e02-short.png`：844×300未购买熟客券详情，主句与“买本牌不享优惠”默认可见，购买/取消固定。

图像被测src SHA256指纹 `20c483d5166122b1dbe54e55f1725c056f89bd6480b2fdfd9fa8dbb566958f0e`；embedded C03/ce299b8a8ddf5cf399fecb889aa02882d315988c，modified=true，built 2026-10-04T16:30:22.554Z。DPR1、safeInset四边0、Chromium软件Canvas（GPU/software rasterizer禁用）；工程实际view。完整Text/DOM bounds见candidate-render.json。图只代表候选，不是main现场。

## 独审修正与实际验证

已对齐main8888e82ede1776e259096bbdfe4eef63fc6f2415，保留MIT持有调序。五项修正：d06删旧锁定句；暂停旁路区分当前/本手；c11演出读取记录中的previousHandType，null与旧记录未知分开；c08/c09 hover完整显示或中性详情入口；e03/d10删工程备注。

134受影响文案/条件/详情/原MIT调序测试与type PASS。新增原生检查：1280×720 c08/c09 hover14px实际bounds；B06第三章第2槽c09当前暂停，详情左移后恢复且静态fourFlush保留；f06跨场保存3/4，余1手；e02未买取消保持完整run，合法购买按原价一次扣金，已购详情再取消无变化。购买fixture12金币用于覆盖带版次商品；旧e02图片仍是首次6金币/多彩9金币不足的候选，未重拍或冒充自然购买。`post-audit-browser.json`记录当前软件Canvas验证；图的旧imageBuild/指纹独立保留。代码实际trace测试核两个换轨方向、第一手null、老trace未知。

商店放不下完整句时显示两行“条件与效果/点击查看”，实测70×32px，完整句保留于fullText与详情。默认限制没有隐藏或缩字。d06/B06/f06独审是静态语义结论；原生详情/hover/取消/购买是实际UI验证。首版图像方向已由root独立查看通过，不等于全局最终美术验收。

## 当前状态

实现完成；受影响技术检查通过，修正SHA的精确CI仍须核终态；仅review不main。首版4aadecb精确CI37217186943/docs37217186971 success不充当新修正验证。目标设备/OnePlus/真实GPU/听感：NOT_RUN。无需重拍已有效图片；新图片/规则/RNG/save/domain/application/assets未改。
