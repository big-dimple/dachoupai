# P08 b4四图＋当前公开元数据最小化

合法素材交付commit `41e78e1eac85920cede9ed867e4dabb8bba4f5c4`，只注册碰瓷/满堂彩/回马枪/借东风，8 WebP261422B。原51 runtime逐SHA不变，当前新19/72、旧18、机制35；共59文件1717214B。碰瓷全源contain，110×150/527×720内容，未裁拉伸。

首包移除20私有Library字段，20私有会话链接改为明确的公开素材交付提交字段。该commit不是图片生成来源；当前移除，历史仍在，不改写旧历史。13份当前相关文本有限扫描私有ID/版本/路径/签名URL为零；原输出尺寸/bytes/hash与登记未改。公开文档不含实际私有值。

唯一[真实牌桌PNG](390-four-new-faces.png)为本轮候选：390×740 CSS、DPR1、safeInset全0、Chromium151 Canvas、BASE_URL `/p08-b4/`；embedded C03 /7e1e9aa…modified=true，build 2026-10-04T04:05:21.877Z。源码指纹 `1866e23e3e6c362ec3f86f7162cc1c7c9aabf2d88aeaad36c9f536a323f2bd47`，runtime manifest `cfe915e6d09242f02af2b7b769eb5ef5189edf6f7693ec0679368e527a20da09`。Validator-approved fixture经原生导入，四个b4持有与c08共5槽、九张手牌；四连续红桃在只持c08时为普通顺子。非自然购买、非main现场部署；未额外拍相似图/录屏。

consumer实际view8源派生与此PNG。有限原生检查四个缩略/HD hash、HD仅打开请求、缓存、404保缩略固定框重试、完整run/resources/RNG/save不变；四牌两自然副句实际14px/res1.5文字bounds清楚。具体见[browser](browser.json)、[summary](summary.json)。首次补flush fixture因替换实例未同步入场身份被合法validator拒绝，仅修fixture保实例id后通过；无游戏实现/门禁/容差修改。

四状态：实现完成；相关技术通过/最终冻结另归档；根已批准来源候选、整屏独立视觉NOT_RUN；OnePlus/真实GPU/听感NOT_RUN。未覆盖53个功能ID保旧或机制，不称72全换。没有火代码/私有参考图进入本轮。

首次最终冻结928e116：1864通过/5失败，均是旧图预取fixture使用了已迁按需的新图ID。旧fixture换仍保旧的a03/e05/a05，全部预取/重试/取消断言保留；新4ID另参数化断言打开前不请求HD，未修改runtime加载策略。初次失败报告保留，最终新源码重新冻结。

最终源码 `825c8fb14d91a238c29d5bdc5de67afd574517ea` 冻结：1871tests/104files、content、type/build、Chromium Canvas桌面/手机smoke、plan全PASS，source/index/HEAD前后相同，见[freeze](freeze.json)。公开远端main/精确新CI另报。火私有消费本次官方helper仅报下载失败，无HTTP状态/本机文件，因此未看像素且不分类猜测；无重试/转公开。
