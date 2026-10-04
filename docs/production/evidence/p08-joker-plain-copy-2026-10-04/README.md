# P08 大丑牌人话文案候选

中央模板覆盖72张：主句“何时→效果”为21px，关键限制15px默认展开，保存值/当前资格15px，复杂细则折叠。商店、持有和详情复用同一层；只读定义绑定和既有jokerMemory，不新增判定器/预估分数。所有定义、RNG、存档与美术不变。

草稿输入公开交付commit b24ad0970f4ff1e385d6b62b450b23e003313a09；已合独审四张带牌限制、d06入场快照、f06总寿命/暂停仍耗寿命、B06当前暂停可恢复。薄模板不包含baseline展开值或定义快照。

## 实际图像

- `six-complex-details.png`：六个390×740真实整屏组合，a11/c08/c09/f05/f08/e02。验证过的导入fixture，native tap/详情/展开/关闭；不是自然购买。双four库存选择2–5同花色，真实普通同花；f05保存+3。旧已批准图，没有新生图。
- `e02-short.png`：844×300未购买熟客券详情，主句与“买本牌不享优惠”默认可见，购买/取消固定。

图像被测src SHA256指纹 `20c483d5166122b1dbe54e55f1725c056f89bd6480b2fdfd9fa8dbb566958f0e`；embedded C03/ce299b8a8ddf5cf399fecb889aa02882d315988c，modified=true，built 2026-10-04T16:30:22.554Z。DPR1、safeInset四边0、Chromium软件Canvas（GPU/software rasterizer禁用）；工程实际view。完整Text/DOM bounds见candidate-render.json。图只代表候选，不是main现场。

## 阶段状态

实现：中央层与72字段绑定完成。技术：56受影响单测和六代表/商店/短横原生详情PASS；全套首次2011中2009PASS，2个旧技术文案断言已按公开余次/历史语义更新，待最终重跑。最终源码freeze/精确review CI尚待运行。安全商店入口随后从单行改为两行，避免列宽溢出，该无图区域修正待新几何检查。

整体审美：待root独立查看。目标设备/OnePlus/真实GPU/听感：NOT_RUN。main保持，MIT持有调序8888e82由协调整合，未在此候选回退或改动。
