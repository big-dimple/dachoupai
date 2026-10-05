# 七卡原型增量证据

来源：正常对齐点 `1d8400db2f1667992a13024bf7530ed7615e1a71`（双亲含main `a5cdc5f`），本地第一代码检查点 `3acc73906c12730b67b721cc93e57d619317a4f3`，最终冻结本地源码 `5256394e8debfcadc5d17ed7d4952236fcf8b4a0`。GitHub源码 `bf38333afa36bb730e3cc3f622f5f9e73343c742` 的完整tree `8f17207e8c14bfb7ef4a7dc4370b3e2aafd7498c` 与本地冻结源码完全相同；通过已授权connector传输，无凭证创建或权限修改。后续提交仅证据/调度摘要，源码不再改变。

24专项覆盖七卡实际操作、逐张重触发、首个有效持牌人头、真实第二手成长及失败保存重试/重载/重复receipt、主副计数分离和新旧身份。92相关在第一检查点通过；最终2291tests/126files、content、typecheck/build、plan通过。检查前后源码/index/HEAD一致，详见frozen-checks.json。新hash原生Chromium151 IndexedDB验证三身份、pending候选、导入导出、坏current/previous及retained，详见native-save.json。未重拍UI、未录屏、未测FPS、未新增策略模拟。

本地标准smoke实际FAIL：原harness要求的Playwright headless shell1243缺失。未改产品/测试断言或改装执行器绕过；远端新review精确CI另报。对齐点CI37255686803与production-docs37255686730均success，但不能代替本增量CI。

保留first-related-fail.txt：首轮2个测试使用不存在的card-rank名称，改为真实rank来源的add-heat，正向计数为4；其余90通过。该日志属于提交前工作区，不冒称冻结源码。旧原型及旧消费修复的所有证据仍保持原身份，未重贴为七卡通过。

新原型hash843f…包含完整七卡定义；旧未发布79ddb…被拒绝，不能拿旧fixture导入失败当UI bug。v10/v11定义、身份、初始等级与文案JSON保持；默认仍v11。源码和CI通过仅支持本有界原型，不代表玩法平衡、UI验收、OnePlus/GPU/听感或六人玩法完成。main等待父串行放行。
