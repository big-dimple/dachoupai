# AI 切有界收尾

最终 source `c568b6636b55fbf2671717787f1f728092a78c9f`，基线 main `8e0daae74efd56969886d1fdb2c28df404af27e0`。133项相关测试／type／plan、一次精确clean构建和五条原生路线 PASS，source/index/HEAD 前后不变。第一390位置方向已由父批准，三张最终图均 actual view。原空串检查器FAIL、撤销真实FAIL和两次未冻结样板FAIL保留。

随机按公开保底值比较，成牌优先／高牌末项兜底；平分先少牌后座位。只选牌，仍由玩家出／弃。旧v10直接导入原冻结存档，身份不改。AI循环／撤销／查看／手选保持完整state、journal、export及RNG；排序仅提交既有ReorderHand并清选牌，结果完整对比领域命令。

通过既有动作门槛后取消旧AI，原finally在失败或返回await-input时重建。未就绪出／弃原生测试用显式延时故障保持pending，按权威领域结果逐字段核；离场另让一个已取消timer迟到，旧结果未应用。故障注入不是自然性能证据。

一次软件Canvas观测：9牌最大切片6.9ms／就绪655.8ms；14牌最大11.7ms／就绪3852.8ms。14牌working时真实点选响应；8项／4ms为软预算，未称硬上限、完全不卡、真机FPS或GPU通过。两fixture无随机得分分支，既有preview的max已复用min，未重构domain。

本包是AI切限定scope完成，P08仍in_progress。主域、存档、RNG、内容、音频、火与公开美术逐树同main。新证据head精确CI另报；不以旧CI替代，不推进main。
