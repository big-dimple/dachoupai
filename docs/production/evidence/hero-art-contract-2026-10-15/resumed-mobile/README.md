# 移动端恢复验证原始 FAIL · 2026-10-15

产品冻结 `7ae1d5d75d0fc39de69bfdacdb14947598286c06`，分支 `dev/hero-art-contract-20261015`；Chromium 151.0.7922.173，软件受控浏览器。原命令使用端口5588、7个指定手机case，本目录为观察器修正前的原始记录，不作为最终通过证据。

`report.json` 总结果 FAIL，仅执行到390-dpr3-normal。选角六ID、详情、筹备、牌桌及牌桌详情已采集；出牌前完整selectedIds与assistIds断言通过，等待高光strike的60000ms超时。失败时canonical场景为stage-cleared、commandSeq=4、playing/presentation=true、heroClimax=false。见 `390-dpr3-normal-FAIL.png` 和 report.failureState/failureScene；未取得高光帧与最终expected/after相等结论，不能把已提交状态当作演出验证通过。其他六case未执行，不填PASS。

report.frames保留每帧DPR、viewport、framebuffer、cssCanvas、纹理真实尺寸与manifest路径/hash。已采集390×740 CSS、DPR3、1170×2220 framebuffer；截图为device-scale原PNG。源纹理为avatar256×256、selection256×320、portrait615×768。此旧观察器未另存scale.zoom；不能凭DPR独立声称所有显示均达到该密度。

实际用view_image查看 `390-dpr3-normal-selection-amo.png` 与 `390-dpr3-normal-table.png`：主立绘/六角入口/底部操作和牌桌英雄头像可见。未对未生成的wrong-size/缺图/320帧声称图审。

当前仍为旧18张过渡资源；无年轻新人物图或独立eyes验收，不是物理手机、自然游戏、正常速度连续演出或整体美术签收。原FAIL保留；后续授权修正观察器的定向复验另存 `../verified-mobile/`。本任务不改产品、不生图、不提交或push。
