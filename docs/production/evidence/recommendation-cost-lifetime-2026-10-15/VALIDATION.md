# 有限验证回执

评估基线 `4d2ff4ca8487f2f00b55516822d1a28ac3c1751f`；运行产品src树 `0e29164c0a149c3e9d56aceb2aea19d564089fb7`。最终交付提交和push回执由任务最终回复给出；这里不以运行时尚未生成的提交冒充冻结身份。

| 检查 | 本次实际结果与范围 |
| --- | --- |
| 纯评估与既有受影响合同 | [tests.txt](tests.txt)：4文件55项PASS，其中新专项19项；另外36项为既有f06、购后现金、指定替换现金风险回归。只跑该有限集合 |
| 类型 | [typecheck.txt](typecheck.txt)：`tsc --noEmit`退出0；包含从测试导入的分析模型 |
| 计划门 | [plan.txt](plan.txt)：32工作包有效，current=P08；不作为玩法验收 |
| 报告复算 | [reproduce.txt](reproduce.txt)：精确字节相等；report.provenance含模型、runner、独立floor函数来源和专项测试SHA256，校验冻结src树且src无dirty |
| 保护范围 | [protected.json](protected.json)：src、public、art、harness、third-party、plan.json和AGENTS与候选基线对象相同，工作区相应路径无改动；src涵盖领域数值、四轴显示与C04产品 |
| 文档／范围 | 只向原五机制小节追加合同；相对路径存在和`git diff --check`通过。新增文件仅analysis模型／runner、一项专项测试、本证据目录 |

新模型明确改编自未合PR147的交易／scorer骨架，不cherry-pick其提交。本次改用当前身份、章Boss合法池与锁定目标、f06两星现状，并按当前目录给已持paidPrice输入（c04闪箔6、e01普通4），所以指定替换退款分别为3／2，而非照搬PR147给定的两个8金实例退款4。它们仍是控制输入，未伪装自然回执。输出的成长、限次、现金和永久代价均重新算出，未借旧报告的PASS。

首次第3章B03投影缺合法封禁花色，严格不变量拒绝：[first-failure.txt](first-failure.txt)；首次扩展专项的两处r变量作用域错误：[first-test-failure.txt](first-test-failure.txt)。修正仅在夹具／专项测试，未放宽领域守卫或修改产品。原15项先验PASS保留[first-run.txt](first-run.txt)，最终55项以tests.txt为准。

未运行自然局、浏览器／截图／物理设备、构建、全库／全量测试、旧档矩阵或云端CI。纯评估不接保存适配器，也不发真实UI命令；领域clone事务与输入不变断言不是实际IndexedDB保存／冷恢复验收。未来自然经营、审美／玩家理解、全局五星政策与B00／C04状态都保持未验。
