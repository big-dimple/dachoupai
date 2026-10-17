# 零成长读取的单位与节奏窄修

基线 `34636a743c4caeefe7a04ec1ed9f04d032bf8115`；父级在c452自然实玩观察到炉火纯青“+0 倍率”。本分支涉及的两个产品文件在c452与本基线相同；只改零读取显示，不接商店热修或改名，不改domain、trace或保存。

- `r2Help.r2ScoreOperationText`：零 read-growth 不能靠H是否变化猜单位，现从实际来源定义的对应phase/read-growth target读取；无法唯一判定时用“成长”，不假称倍率。零热度原始审计文案为“+0 热度”，零倍率仍为“+0 倍率”。
- `ScoreTableMotion.isNeutralScoreReceipt`：仅把value=0且H/M都未变的 read-growth 标为中性收据。GameScene既有计分队列在入队前跳过它，因而不展示零加成或占独立音画等待。原trace不删除该记录。
- afterHand的add-growth +10不跳过，既有“结算后新增，下手按条件读取”、0→10保存提示、下一手实际读取10均保留。

`tests/zero-growth-presentation.test.ts` 经真实领域命令清过暖场进入第1章正场，再用校验通过的受控公开手牌/持有牌：对子Lv2、6♣6♥、满堂喝彩、初始热度成长0的b10，选择6♥转倍率。断言精确H146、M17/2、总分1241，trace含零读取及成长+10，前状态/trace未被展示投影改写。随后经正常OpenShop/LeaveShop/EnterStage验证下一手读取已有10热度，不被跳过；另验真实b03零倍率读取保留正确单位。该夹具不声称自然购买或复刻父级存档。

4个相关测试文件26项通过；typecheck与Vite构建通过（只有既有大chunk提示），日志见checks.txt。父级已有连续抓帧，本次没有重跑浏览器矩阵，不能把单测称为新的像素/听感验收。首次测试夹具误保留了默认起始牌，H仅56而非用户持有满堂后的146；修正为明确持有满堂+b10后原146/8.5/1241断言通过，没有修改规则或放宽断言，首个夹具失败见fixture-first-FAIL.txt。
