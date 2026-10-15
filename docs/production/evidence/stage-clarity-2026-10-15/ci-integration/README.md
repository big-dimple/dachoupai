# 精确CI失败与最终集成接续

原 `de1d2e8411a69b5fab73ec73c05aae0ec8a4fa3a` 的[CI38667830188](https://github.com/big-dimple/dachoupai/actions/runs/38667830188) domain实际为5失败/3466通过，两个测试文件失败。原始失败摘录保在 de1d2e84-domain-failure.txt。此前74项定向PASS不代表该精确CI成功。

父要求正常merge精确最终集成 `2ecb859a7b001193c235c48e8bfd15813873ea21`；无冲突生成双亲 `8a31d77812d02a1aeb720a8797a43ab099230344`（第一亲de1d2e84、第二亲2ecb859a），没有rebase/强推，也没有修改父分支。以下修正均来自该已存在集成，不是视觉代码临时绕过：

- `make-cards-flow.test.ts:21` 原只断言一个参数，但实际 `ShopScene.resumeMakeCards` 调用 `showPracticeResult(receipt,pending.practiceOrigin)`；无来源的恢复路径正确传第二参数undefined。新断言仍核一次调用及全部receipt字段、未重新派发/报价，只明确这个可选参数。
- `shop-sale-continuation` 四失败的原CI堆栈在 `ShopScene.ts:860`，实际是 `dialog.classList.add('shop-joker-held')` 缺少classList；不是scene.tweens.add。旧伪dialog不具备classList且对所有selector均返回对象。集成替身补classList，并只对`.dialog-close`返回可用节点，其他不在该事务测试中的DOM节点返回null，符合真实DOM查询合同。原关闭/更新dialog所有权、销售事务结果、成功只续开一次、成长代价等断言全部保留。

合并后相关5文件29项定向PASS。随后完整 `npm run verify:ci -- --scope=domain`：250文件、3480 tests及verify:content全部PASS；typecheck、docs门禁PASS。domain.json/docs.json的精确HEAD为8a31d778，before/after source、index、HEAD一致，测试时工作树干净。随后只增加本续交文档/日志再push，远端最终SHA的CI作为最终门禁另读，不把这份旧HEAD记录改写。

视觉核心HeroClimax/PaperFlow/Viewport/TextRaster相对de1d2e84逐字节不变；相对2ecb859a，domain/application/content/public资产/art树无diff。没有新增自然试玩或改变数值。

原CLI GET run返回Forbidden，使用已连接GitHub工具的常规只读workflow API核原日志；没有改权限，没有POST/创建PR，没有重跑旧失败job。最新push自动触发全量CI（domain/browser/docs及production-docs），最终结果在交付消息给出精确SHA与run链接。
