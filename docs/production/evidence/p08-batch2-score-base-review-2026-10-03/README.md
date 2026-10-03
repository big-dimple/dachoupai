# P08批2主得分底座局部候选（待独立早评）

[真实390×740自然1200静帧](390x740-large.png)。仅这张游戏PNG＋本README；没有候选源码、新原画或runtime文件。本review分支从已发布main `2870c6234d42c622820d3d151c8bdde8d54778f0` 建立，不改main。

- 路线：seed `d43-fire-1`，老幻，自然选7♦／9♦／4♦／Q♦／10♦；演出2×，实际最终分数1200／大火档。截真实渲染帧，等待总分稳定及260ms辅助边缘闪光消退；非录像、非拼图、未编辑。
- Renderer：Canvas，Chromium151.0.7922.173；cloud Linux工程Playwright入口禁GPU／software rasterizer。CSS viewport390×740，requested DPR3，Phaser canvas density2，PNG780×1480；safeInset top/bottom0（本图不证明safe34），普通动态。无真GPU／OnePlus／听感验收。
- 构建版本：C03，revision `2870c6234d42c622820d3d151c8bdde8d54778f0` + modified。候选源码仍保存在原单一工作树，不在review分支。源码指纹为 `git diff --binary HEAD -- src` 的SHA256：`9bef82cf7d8b140770d1729c823af50091665b02484ed3abb8edaaec72b60565`；捕获前后相同。
- PNG：176877 bytes；SHA256 `d6cb9e7e77db1828d9d44f90b15ebe119a33bb529ab04c3932b3b046b68935dd`。工程已实际view此最终PNG；没有声称独立评审已看或接受。
- 最小实现：仅GameScene／layout／ScoreFlame。前景不透明#FFF9EE纸底座、朱红薄边，实际36px总分完全在底座内；约36CSSpx后景火窗从上缘露出，根略伸到底座后面自然遮住。总分不再在整片火材质上挖洞；caption／次级数字／按钮仍几何避让。低成本程序轮廓＋朱橙外层／黄核；中段主长舌，宽高错开，小／大／极高使用不同火舌组合；原阈值、eventId、墙钟寿命和清理代码保留。出牌／手牌区域未重做，新27WebP未接入。
- 真实测量：底座x151.08/y214.6/w222.92/h69；后景火窗y179.6/h36。实测层序fire65＜base76＜total83，真实总分bounds完整包含于底座。自然finalScore1200，browser无pageerror。
- 四状态：**局部候选实现完成；技术部分通过（typecheck／候选build／火焰11项／本图实际路线通过）；独立审美PENDING；目标设备NOT_RUN**。布局25/26，仍有1项旧火窗≥58px矩形断言失败（新后景窗36px）；未删断言／放宽阈值，尚未最终冻结或放行main。后续需按早评确认新前后景几何，并验证真实可见轮廓／强度／遮挡与短屏安全预算。不会以技术通过宣称像火或整体美术接受。

下一步：父协调从GitHub取这张实际像素早评，收到方向后才扩统一批2全流程组件与必要最终门禁。批1旧CI不再查看；此检查点不操作PC／域名／部署。
