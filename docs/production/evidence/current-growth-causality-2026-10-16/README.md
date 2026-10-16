# 当前新局的成长因果入口

基线为已正常合并、push且用`git ls-remote`核实的main `fa5b30ee1ebf28d4ee71d676b231eab260172033`。本批独立分支`fix/current-growth-causality-20261016`；产品`088e6c3c52e957c996239551ecf42e7e2f7ec3eb`，精确来源见[status.json](status.json)。只发布开发分支，不追加main；加载自动重试另路负责。

## 计划中的具体缺口

承接DELIVERY_PLAN的P1正常经营/成长解释，不重做已实现的成长、倍率、商店推荐或技能提醒。`groupGrowthCausality`已有读取/新增/累计的只读账单，ShopScene/GameScene也已有按需入口，但资格写死旧`quality-r2-group-upgrade-prototype-v1`。正常新局已是S04Finish身份，虽然继承相同成组成长合同，购买练对子b10或老搭档b03后却没有该按钮。旧身份、普通长规则和其他成长界面仍在，缺口不是整套成长未实现。

先以当前正常身份、自然现货/实际购买和真实出牌写出4个失败回归（另1个未知身份反例通过），再由浏览器正常买入6金币老搭档复现按钮不存在：[原图](before-390-b03.png)、[原报告](baseline-gap.json.gz)、[红灯单测](red-results.json)。

修复仅一条能力判断：使用既有`hasR2GroupUpgradeContract`代替版本字符串；沿用原按实例保存事件的说明、原消费者和按钮。没有改公式、数值、概率/价格、英雄玩法、规则身份、存档或RNG；没有添加自动弹窗、自动成长或加载逻辑。

## 实际验证

- 8文件54项相关单测PASS：[结果](unit-results.json)。包括当前身份的真实购买及两手成长/旧值读取、旧原型与e7旧身份、封禁/封顶/缺历史/不同实例、既有成长视图和购物回执；未知身份继续不展示。
- PC1366×900、390×740/DPR2、320×568/DPR2，各实际完成练对子与老搭档两条，共6条PASS。固定公开可购买种子`growth-current-49`（练对子4金）与`growth-current-45`（老搭档6金），正常6金新局，不导入存档、不改库存/金币/发牌，不在浏览器调用领域命令替代输入。
- 正常购买双击仅一条BuyOffer；购后未出牌时显示已存0且不造触发历史；真实两手对子分别保存热度10→20，倍率0.25→0.5。说明分别读取第二手使用的10/0.25、实际新增10/0.25及累计20/0.5，新增不回填刚结算的一手。
- 每笔购买/离店/入场/出牌均用原SavedRun重放实际命令，与完整state/journal/storage/current/previous/revision/checksum/RNG逐字段相等。查看、真实滚动到底、Escape及冷恢复后再查看保持完整保存相等；页面无异常。完整原始状态见[native-report.json.gz](native-report.json.gz)，每档/每来源状态见status。
- typecheck、生产build与计划结构通过；[构建](build.txt)保留既有大bundle提示。源码哈希在运行前后相同，保护树逐树比较一致。

已实际查看[390倍率旧值/新增/累计](390-b03-second.png)、[320热度冷恢复后滚动](320-b10-restored.png)、[PC热度明细](1366-b10-second.png)与原缺失截图。软件可达与正确保存不代签真人理解、物理手机/GPU、听感、自然获取率/长期经营平衡或整体P08完成。两种固定普通现货只证明可用路径，不代表获取频率。P08保持in_progress，不机械跑18路线；先前整合的12项基线全量失败仍保留于原对照，本批没有重签全量绿。

## 玩家用语复核（后续小批）

现有入口和标题改为“加成从哪来”。内容只解释当前与最近一手，选择这个名称，不把它称为完整“成长记录”。明细用“出牌前已攒 / 这手实际用到 / 打完后新攒 / 打完后累计”区分旧值与新增加成，保留生效时点、条件与计分禁用限制；内部技术名不变。产品提交 `20a0fa2945b83332c4a5d6ccc6793217e526ced4`，来源及边界见[后续状态](plain-language/status.json)。

[54项相关单测](plain-language/unit-results.json)与[六条原生浏览器正常流程](plain-language/native-report.json.gz)通过，增加入口文字完整、44px触控区和视口边界检查，继续完整SavedRun重放与冷恢复相等检查。实际查看[390倍率明细](plain-language/390-b03-second.png)、[320滚动到底](plain-language/320-b10-restored.png)、[PC明细](plain-language/1366-b10-second.png)。改词后4条旧拼接文案断言曾失败，已修正断言文字，原[失败报告](plain-language/initial-stale-copy-assertions.json)保留；数值断言没有放宽。加载在报告结束后合并，组合构建/运行结果另列，不将本次六条报告冒充组合结果。

加载交付 `97279e91fb8803bac46406578c1bda98336a112d` 已无冲突合到开发组合 `a4a8481a584235e8b3df9a64f62994059601abe8`；两批产品树分别与其原交付一致，领域/应用/内容/音频/public/art相对main fa5b30ee无差异。组合的[14文件87项单测](plain-language/loading-growth-unit.json)、[类型与生产构建](plain-language/loading-growth-build.txt)和32工作包计划校验通过。此处尚未把分支各自浏览器证据当作组合运行回执；结算与首页另批仍待接入，main未追加发布。
