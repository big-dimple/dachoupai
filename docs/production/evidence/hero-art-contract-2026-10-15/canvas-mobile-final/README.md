# 移动端英雄资源合同受控验证 · 2026-10-15

产品冻结 `7ae1d5d75d0fc39de69bfdacdb14947598286c06`，分支 `dev/hero-art-contract-20261015`。本目录 `report.json` 总结果PASS：390-dpr3-normal、missing、wrong-size、late、avatar-only、name-only和320-dpr2-normal七例通过。使用现有harness，不改产品/运行资产，不提交、不push、不生图。

最终命令：

```sh
HERO_ART_PORT=5592 HERO_ART_CASE=390-dpr3-normal,390-dpr3-missing,390-dpr3-wrong-size,390-dpr3-late,390-dpr3-avatar-only,390-dpr3-name-only,320-dpr2-normal HERO_ART_OUT=docs/production/evidence/hero-art-contract-2026-10-15/canvas-mobile-final node harness/hero-art-contract.mjs
```

先用5588启动因旧观察器被Ctrl-C后端口短暂残留而失败，未进入任何case，无report/PNG；改5592成功。收尾 `fuser -n tcp 5588` 无PID、退出1，旧监听已自行结束，未杀不明进程。此启动冲突不是产品失败。旧 `../resumed-mobile/` 保留60000ms strike观察器FAIL；`../verified-mobile/` 保留被已知错误stop/start观察器替代、中断130的有限截图，不当作最终PASS。

## 实际范围与保存证据

七例均覆盖选角、详情、筹备、牌桌、牌桌详情，正常390另外记录六角切换；late验证迟到阿默不会替换已切骰爷。missing只阻断portrait；wrong-size在portrait URL返回selection字节，确认错误portrait不入纹理，DOM可见的合法同ID selection缩略保留；avatar-only和name-only分别验证两级回退。

390 normal/missing/wrong-size三例导入同一受控multiply夹具，出牌前完整selectedIds/assistIds断言通过，截高光后走原生菜单快进，最终与canonical命令expected完整state相等。每例 `*-state.json.gz` 保存before（state/journal/stored）、expected与after（state/journal/stored）；report各行为 `canonicalCommandStateEqual:true`、`nativeFastForwardAfterCapture:true`。其他四例未做高光命令对照，不扩称覆盖。

高光用原生设置4倍演出速度、postrender持久检测strike并sleep冻结截图、wake(true)恢复，再原生快进当前手。它验证资源/状态，不验证正常速度连续演出时长或一秒实墙钟合同。

## 像素与源尺寸

实际rendererType=1（Phaser Canvas），Chromium版本见report；软件浏览器使用禁GPU/禁software-rasterizer参数，不是物理设备/GPU验收。

| CSS视口 | 实际DPR | canvas framebuffer | 原device-scale PNG |
|---|---:|---|---|
| 390×740 | 3 | 1170×2220 | 1170×2220 |
| 320×640 | 2 | 640×1280 | 640×1280 |

report.frames逐帧保留viewport、cssCanvas、framebuffer、scale.width/height、rendererType、DPR、显示图scaleX/Y、实际源纹理尺寸与manifestSource路径/hash。运行源avatar256×256、selection256×320、portrait615×768；wrong-size与missing没有被拒portrait纹理。原观察器未显式保存scale.zoom/最终图像缩放总矩阵，不能只凭DPR签所有局部展示密度或无放大。

## 实际看图与限制

已用view_image实际查看下列原PNG：390 normal selection-amo/climax、missing selection-amo/climax、wrong-size table-details/climax、name-only selection-amo，以及320 normal selection-amo/table。正常立绘与选角操作可见；缺portrait仍保同ID缩略；wrong-size DOM详情可见合法selection缩略、“高清暂未加载，可重试”和返回；name-only以首字与姓名保身份。高光主体实际是“不换词”功能牌图与阿默来源文字、×1.5及2→3，不能将该帧冒称独立英雄眼图或完整英雄镜头覆盖。

320选角操作在画面内；320 table帧处于发牌过渡，辅助说明与“主手”提示文字相叠，此受控资源PASS不签稳定整桌排版。截图保留不修饰。未逐帧图审全部PNG。

现图仍为旧18张过渡资源，无年轻新人物/新独立eyes验收；非实机、非自然游戏、非正常速度时长、非全六英雄实际技能高光、非整体美术或全游戏签收。新图仍待生成、原图取得与人工图审。
