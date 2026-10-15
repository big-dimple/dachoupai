# 被替代的移动端观察器中间记录

2026-10-15，产品冻结7ae1d5d75d0fc39de69bfdacdb14947598286c06。此目录运行加载了已确认有loop.stop/start恢复问题的旧观察器；主线程修正为sleep/wake并在PC两case确认后，明确授权本线程Ctrl-C安全终止旧run，退出码130。外层会话Ctrl-C退出时尚未见完整report；后续收尾复核发现旧子进程仍在结束前写入report.json，真实结论为FAIL：等待strike 60000ms超时，pageerror为空。原PNG及报告均保留，无PASS结论，不作为最终验收。5588监听随后已自行退出，无残留owner。最新定向复验另存 ../canvas-mobile-final/。

现有资源仍是过渡旧图；不是年轻新人物/eyes图审、物理设备、自然游戏或正常演出时长验收。此旧run未记录rendererType，不声称Canvas。
