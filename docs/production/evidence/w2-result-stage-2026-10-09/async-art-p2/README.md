# PR81 P2：贡献图片不能阻塞文字或主操作

父独审指出旧最终 `c6f59b1a995e4db8978d1a94c9be148c1e3693af` 的Intermission preload可等待未缓存图片5000ms，create之前分数/继续均未出现。旧CI37902087171/production-docs37902087257成功不覆盖慢图时机，因此**旧head暂不合main**。旧12张最终图父像素审查无重叠，继续按eba4f24读取，不重拍矩阵或扩美术。

补正最终产品 `0a1992114b8d159628cfe85462bdfdd2bfc9598b`：贡献图片退出Phaser preload；先render文字/按钮，再独立fetch低优先级图片。可读来源文字保留，成功后只补绘来源容器，主按钮对象、分数、奖励动画和音频不被重建/重播。来源容器坐标/字体/已有卡图与原构图一致。离场、忙碌重试及shutdown/destroy会取消请求；请求代次、场景标志、控制器和同一保存state均须有效，取blob/解码前后均检查，超时/取消会释放timer、监听、image src及object URL。无业务回调、计分/身份/奖励或音频改动。

## 一个原存档延迟案例

report.json/runner.mjs：同原高分seq79存档，390×740软件Chromium、低动态；c06.thumbnail.webp网络请求被明确挂起，直到**原生继续已经进入shop以后**才返回成功图片。没有再PlayHand或经营路线。

- 请求仍pending时，实际+3802、越染越深、读取+2.25/保存+2.5和继续入口都可见，继续已启用；观测距请求开始约87ms，因果证据是请求未释放而create/按钮已存在，不把这个时间当真机性能。
- 原生触控继续新增唯一OpenShop seq79→80，全部state等于applyCommand，IndexedDB checkpoint完整相等。
- 离场后request字段清空、intermission inactive；随后释放晚成功回包，完整state/journal/checkpoint不变，没有旧回调作用于shop。
- 两张有限图已actual view：controls-before-delayed-art-390是明确缺图期间的文字布局，continued-before-art-390是下一店；不作为新12图或真人签收。

42必要定向（result-stage/reward-coin两文件）及typecheck通过。新增六个transport/lifecycle测试覆盖当前图片成功/缓存、忽略abort的晚回包、旧decode对destroyed/reused场景无效、超时清timer、shutdown于decode期间立即释放资源。原奖励测试继续通过。最终新head标准CI只跑一次，结果在PR/交付回报，不预写。

## 保留失败与边界

original-creating-FAIL：首个补正3ca51ee在create中用isActive；Phaser仍CREATING，guard拒绝首个补图请求。观察器无request deadline而等待，后明确中止；原脚本/FAIL事实保留，未实际点继续。0a92c97改为有效scene设置标志，且保持代次/state/active保护；原观察器加有限deadline。original-port-FAIL是中断后自有node217079占5503导致Vite启动失败、尚未原生导入；只清掉该自有进程后进行上述同一个案例。没有删除保护或泛化PASS。

新增图/音频0，6.1 Medium串行，无并发、长录屏或软件GPU验收。只draft父独审协调main；原自然路线、角色/工具战略价值、真人审美/继续意愿、设备、heard:false及W6未签边界保持。files.json逐件实际字节SHA256（不自哈希），原根42件manifest保持原样。
