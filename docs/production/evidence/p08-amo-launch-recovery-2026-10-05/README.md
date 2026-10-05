# 阿默正常选角入口恢复 — PR21 review

产品源码：`1024ad58c3ad90d9f16c9d6144798f8ca49e9cde`，从 `d1dfb90d39b23ced76ef41a312269af76fe95260` 独立接线。首检查点 `51c24dde6c7015033e766e412d37aa26b2b81ee9` 在实现后立即推送，父已静态独审入口/精确重试，无 must-fix。分支 `review/p08-amo-launch-recovery-20261005`；只 draft [PR21](https://github.com/big-dimple/dachoupai/pull/21)，未推 main，未 force，未覆盖旧任务分支。

正常 Title → CharacterSelect → runAdapter.startRun → GameSession.start 仅阿默采用现有 `quality-r2-amo-assist-prototype-v1` / `json-fnv-v1:843f02356211cb91`。其余五人新局 v11；底层无 profile/identity 的 createRun 保 v11。new/retry 显式分流，失败重试校验当前局及 seed/角色/mode，StartRun 只接受白名单完整身份并直接创建，拒绝未知、混配、多余键、非普通对象、profile/identity 冲突。无建后修改 version/hash。继续/导入/接管/无尽、IndexedDB 分区与保存格式不改。

选角与详情共用实际新局身份文案；助攻 buildTip 独立覆盖旧单张建议。标题“主手＋助攻（试行）”，详情说明合格主手、每场一次、剩余对子×2/三条×4、副组真消耗且不计主手/留手、高牌对子仅兜底。旧 characters 全局和其他五人文案保持。Q01 仍为助攻身份但关闭能力，教程仍固定二响。

## 可复核结果

- `native-report.json`：编译构建、系统 Chromium 软件 Canvas、真实鼠标/触控/DOM 输入。固定公开种子 `amo-launch-recovery`，没有导入 fixture 或修改 run。起手保留33与44，弃4张散牌；实际补到QQ，主33/44+助QQ一次得316。保存刷新及回看维持完整 state/journal/export。继续普通小牌至389/400自然失败，点击同局重试保留完整身份/seed/role/mode，journal清空，初次发牌相同且assistUsed=false。
- 原生新建取消保旧局；模拟 IndexedDB 原子 meta 写入容量失败，完整旧DB与指针不变，只保唯一新候选；再次保存失败导出候选逐字节相同，取消候选保旧局。单元另核双确认、写锁、三身份重试与额度/journal重置；旧v10/v11 fixtures原文件未改，全量重放测试通过。
- `frozen-all.json`：2327 tests / 130 files、content、type/build、标准桌面/手机 smoke、production plan，冻结前后 source/index/HEAD 相同。标准 smoke 除角色ID外明确断言助攻完整version/hash。
- 四视口选角：320×568、390×740、844×300（top12/bottom34）、1280×720。44px命中、标题/模式/DOM菜单不相交、说明不碰操作按钮。七张最终PNG均实际view，见`image-manifest.json`的哈希和元数据检查；只含仓库游戏界面，无用户私有图/聊天元数据。

## 原失败与边界

`first-related-FAIL.txt`保留首轮旧测试仍期待正常阿默v11导致的失败；只更新该新局预期，不改旧局预期。`first-native-FAIL/`保留原构建和source指纹：实际PNG发现mode与DOM按钮重叠，调整间距并新增非相交断言；回看自动关闭菜单后，原harness误等不存在的“继续本局”产生30s timeout，随后按真实回看行为修正。初次默认模式类型缺字段的原诊断在visual-review.txt保留。没有重标旧FAIL为最终PASS。

本批不重做助攻/七卡/素材，不纳入亿级成长或72卡歧义改造；不扩GPU/FPS/视频、六人平衡。P08仍in_progress；C04 D32暂停和现有resumeContract/B00/V01/L01、OnePlus/真实GPU/听感/整体审美门槛保持。工程通过不等同上述验收，main由父独审决定。
