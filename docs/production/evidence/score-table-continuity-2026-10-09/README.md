# 得分落地工作包：保全，未发布

2026-10-09，输入main199c854fd9c61b796f713725b5481e4b0e125eaf。父23:26UTC已FF PR96，23:29UTC核菜单C03·199c854fd9c6/build23:27:23.241Z；本云线不代称已核main CI。

用户手机实测拒收工具结果跳过与基础自选空白板后，本未发布整包暂停；保全于review/score-table-continuity，保全推分支不代表CI验收，不交付main，不创建draft、不以本检查签体验。下一串行任务为 TOOL_RESULT_REPAIR_SCOPE.md。

## 产品与版本
- 97b0b7c：saved finalScore中央纸墨落地，沿现有played工作面/字体/纹理，原award时槽；软件8条通过但实际图审拒绝侧栏与中央双总分，first-visual-FAIL保原两图和完整报告。
- ff84c5b：总分中央独占、原260ms回弹改为克制1.08，侧栏H/M与HUD保持，旧得分墨迹退场。该8条通过版本有空副标题，后f2ec984用排版suppressed旗标补正。
- f2ec984三主路径通过，新增缩窗FAIL；6d0856a已保护回调一次性且只引用原对象，但同缩窗仍FAIL。main199c854同点也FAIL。三组原report/stack/log/FAIL截图分别保留；不是观察器忽略错误。
- 2110e59：只在旧进度条active时更新，新layout已横屏但旧竖屏控件未重建时可安全fastForward。bounded-final九条全部PASS，无断言/timeout放宽。
- 7d5d4df：只让中央沿用真实普通墨色/达标朱红/高分暖金，tier-final PC/390两条PASS，完整initial/final state+journal+storage与main两条完全相等。最终string类型窄化只修Phaser联合类型编译，不改这些实际字符串画面；first-type-FAIL保留，修后23 tests/type PASS。

截图各自属于以上源码，未谎称全矩阵最终HEAD重拍。有限固定输入：ordinary为既有score-energy受控公开单张高牌，实际27；growth为既有固定合法route-first-4的真实BuyOffer c06/LeaveShop/EnterStage普通同花，实际748、已存0.25只下手生效；fifth为明确pre-fifth控制而不是跑四手。

## 有界检查
2110e59的九路是1366 ordinary、390 growth、320/740 ordinary、390低动态growth、1366原菜单快进、390 award中reload退出、390→740窗口变动，以及1366 fifth得分英雄特写独占、没有第二纸页。每路原生导入/手选/出牌，保存全state等于原领域命令；退场纸页不存在、完整cold state/journal/storage相等、无pageerror。动态连续样本≤90帧/例，只做软件边界与公式不互盖检查，不转FPS结论。

23相关tests/3files、type与plan32通过；无全本地回归/seed扫描/完整自然八章/音频录制/长片。最终精确CI尚未验收，因用户新返修阻塞暂停；不借PR96 CI。

## 资源与边界
新增运行图/音/请求0；只复用既有p00-paper.svg和Dachoupai Score字体，其bytes/hash/lastChangedGitCommit列assets.json。lastChanged不是创建/授权证明，不新借第三方许可。八保护树与main精确一致见proof.json；默认30/80/原小夜曲/音路由保持。

追加计分等待0。中央显示已保存finalScore与实际H×M；HUD累计数字仍在既有入账滚动中，早期award截图不是最终HUD稳定状态。低动态静态、菜单快进清理、退出保同状态；原首次得分英雄特写不同时出现中央页。玩家输入仅在原演出完成后恢复；演出不做交易/奖励。

原失败保留。全部原bounded motion样本在frames.json.gz，报告只留少量代表帧，不删原始动态样本；完整state用gzip。当前尚无人类/设备/听感、六角/整体美术签收；PR96的390 settling姓名贴近发顶同画面待办保留，不因本包签过。W0–W9与G1/P08/C04历史边界不变。
