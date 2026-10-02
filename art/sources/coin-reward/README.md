# 单枚铜钱奖励短动效候选

这是既有 `public/assets/models/prop-coin.glb` 的真实离线 3D 渲染，不是平面硬币图的 CSS 倾斜。
仅制作一款旋转落位动作；原 GLB、几何、金属材质保持原样，以暖色主光和青色环境补光呈现。
没有人物图、字体、文字、奖励数字、新模型、实时 3D 引擎或游戏运行代码改动。

16 帧、20fps、800ms，单次播放后停在第 15 帧；末段落位缓冲，适合实际奖励到账旁的短反馈。
不无缝循环，不用来持续闪烁货币数字。显示时以 atlas 的完整 256px cell 为单位，固定中心锚点；
建议 sprite 96 CSS px（铜钱可见轮廓约 60–65px），紧凑模式 72 CSS px。
不要裁掉帧内留白后分别对齐：留白包含小幅入场与落位运动。

## 可复建输入与输出

从仓库根目录执行，无需新下载或字体：

```sh
blender --background --factory-startup --python-exit-code 1 \
  --python art/sources/coin-reward/render.py
node art/sources/coin-reward/pack.mjs
node art/sources/coin-reward/verify.mjs --browser --chromium-executable /usr/bin/chromium
```

Blender 4.3.2 / Cycles CPU，384×384 RGBA 原始帧、128 samples、固定 seed 0、AgX，无降噪。
原始 PNG 及完整渲染参数/逐帧姿态存于忽略目录 `shots/coin-reward/`；渲染脚本与源 GLB 足以再次制作。
打包使用仓库已锁定的 Sharp，缩为 256px、4×4 atlas；仅 atlas WebP 和帧表进入 `public/assets/effects/coin-reward/`。
原图渲染、联系表、质量比较和演示不进入 public。

最终 q95 atlas 137,780 字节，帧表 5,738 字节，合计 143,518 字节（140.15KiB）。
本轮下载目标是 atlas 与 JSON 合计不超过 160KiB，不把目标当结果；各质量档实际大小、像素/alpha 检查和最终选择见 `pack-report.json`。
atlas 解码占用 1024×1024×4 = 4MiB（不含引擎纹理副本或 mipmaps）。帧间保留透明间隔；使用 straight alpha。
素材清单和来源见 `source.json`，批次验收与真实限制见仓库 `docs/assets/coin-reward-2026-10-02.json`。

## 本地查看

在仓库根目录启动只绑定本机的静态服务：

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

打开 `http://127.0.0.1:8765/art/sources/coin-reward/demo.html`。
演示仅加载此 atlas，展示深青、浅纸、棋盘三种底色的 72/96 CSS px 尺寸；手动播放一次或重播，不模拟实际发钱。
减少动态时保留静态末帧。`review-contact.webp` 可直接检查整段关键姿态和边缘。

## 后续接入合同（本批尚未接入）

仅在已提交、已保存的正数金币收益上播放，金额由实际事件/收据或奖励快照绘制，不能从这张贴图或动作次数推导。
适用例子是胜利奖励到账，及 `e07` 加班费真正触发的收益：当前定义为致胜后剩余出牌为零时额外 +4，失败/跳场不触发。
代码依据为 `src/domain/r2Run.ts` 的成功结算与 `joker-transaction / onStageClear / add-gold`；本批只是读源码确认用途，没有改规则或注册运行时。

按真实收据/事件身份去重，刷新、重放或关闭动画不能重复结算；同一时刻只展示一枚，连续收益合并排程而非满屏撒币。
普通胜利奖励与其内含的加班费不能重复加钱。数值始终来源于收益事件，不固定显示 `+4`，零/负收益不使用本动效。
减少动态、跳过、素材加载失败时，保留静态货币标志与真实数值即可；建议需要时再加载，勿因候选文件在 public 就加入首屏预载。

这是一款供下一接入回合使用的资产候选。机器检查与本地演示通过不代表已接入游戏、真机流畅度或用户视觉批准。

## 来源与许可

唯一形体来源为同仓库铜钱，SHA-256 `25c97ba5ac7a094ac7d234b16a932ecf87a32a722a6e76388beccae4d6201c69`。
原母包声明为原创程序化几何/美术，源函数在 `tools/blender/build_asset_pack.py` 的 `coin()`；该声明原文保留在 `source.json`。
没有添加第三方素材或新的授权声明。母包的 Noto SIL OFL 链接只对应字体，铜钱不使用字体，因此不把它误作本币的单独许可。
本批按用户对现有仓库模型的明确授权制作；保留仓库现有权利归属，不据此新增 CC0/MIT 等版权许可。
