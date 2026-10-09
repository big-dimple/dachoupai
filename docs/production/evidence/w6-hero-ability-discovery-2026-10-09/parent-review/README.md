# PR83父审三项必要补正

输入head e23d3043dda33919b2ad45b9ee52b21387fb46f7，其CI绿色但父审发现真实语义回归，不足以合并。产品修复b635444290d995702d44dd79ba78a0e612fb7952；最终提交只修测试ES2022夹具/存证和入口，产品src与b635一致。

1. updateControls每次计算并更新availability标记、颜色和细线，不再因playing/presentation跳过清除。只有ready（含controller idle及session可写）且不playing、不presentation、未选主动草稿和当前真实资格成立才强调。
2. 上手按钮改“上手结果”，保所选/来源条件等其他状态。
3. 骰爷实际未成×0.85仍有saved结果说明；showScoreEvent正向scoreImpact分支使用真实hasActualBenefit，失败走原sourceCue(character)。不改AudioEngine、BGM或音效素材，也不把结果说明当正收益判定。

## 复现与定向

真实合法下注/下一手未成trace，经实际GameScene.showScoreEvent和音频spy，修复前调用scoreImpact(...,'add',0)且没走中性来源；audio-route-before-FAIL保留。修复后检查没有正向scoreImpact，sourceCue(character)恰一次，结果/状态仍含未成×0.85，NumberImpact仍未生成。现有hero-ability-cue六项通过，没有重新运行六角全局/原四笔代表事务。

首个test double直接赋值只读reducedMotion getter失败，audio-fixture-getter-FAIL保留，改own属性shadow才得到上述真实路由FAIL。新夹具toReversed受仓库ES2022库拒绝，type-fixture-ES2022-FAIL保留，只换克隆reverse、不改编译配置；最终typecheck通过。不是软件产品兼容扩张，不虚报旧FAIL为PASS。

## 同状态像素补证

state-report无损gzip、runner与图：系统Chromium软件Canvas。导入原两份公开合法输入后只选牌，直接设置UI playing/presentation或controller saving/paused以调用实际updateControls；每状态完整run不变，没有真实Play/弃牌/保存重试/配额失败。每端idle→playing→saving→paused→presentation→idle，实际availability为true/false/false/false/false/true，色#3f606b/#59646a、线2/1对应；最后idle截图覆盖同起始合法状态。presentation是独立标志模拟，不是实际结算全套输入锁/舞台验收。

修复前相同PC playing模式真实标记仍true及粗玉线，busy-before-FAIL保原report/图/runner/日志。b635修复后同状态清除并恢复，关键图已图审；旧PC已保存19失败结果只导入/查看，“上手结果”按钮确认，完整run未变。不重跑普通88、完整代表路径、六角色自然局或新矩阵；没有录像。

原8e6/0aad证据仍只属其源码，不能代本修复或真人签收。最终修复head一次CI另核、draft父协调main；真人/设备/听感/平衡/W6仍未签。
