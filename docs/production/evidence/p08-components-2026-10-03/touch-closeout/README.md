# P08公共触控合同短轮

基线d24ff178。本轮仅短横屏商店工具／tabs避让、音量range真实44px命中；原规则／RNG／存档／计分／奖励／素材不变。

[844×300 safe34](844-shop-safe34.png) · [390×740音量input](390-audio-range.png) · [原生输入与实际bounds](report.json)

两张未经改绘PNG已工程实际查看，Chromium Canvas／CSS viewport／DPR1／safeInset／embedded版本／候选src SHA256见report。构建标识为d24ff178+dirty候选，不是已发布main现场截图；候选源码指纹与最终冻结源码核对。

844×300/top12/bottom0、12、34实测DOM工具y24–68、tabs y72–116（4px空隙），商品y118–241.2，文案／价签／主动作不相交；三货可发现、原生tab切换不被菜单拦截、详情取消保持完整save、合法一次购买通过。

390×740／1280×720真实range各152×44px；y=上边+4和下边−4位于可视中心轨道外但input内，原生tap／mouse取得16／84，touch／mouse拖动28；min0/max100/step1/aria与Home/ArrowRight保留。fresh30/80、saved37/62 reload验证后还原测试初始值，run未变；只在隔离浏览器context操作，无用户常用值写入。

8受影响布局／音量偏好单测及type PASS。源码冻结5482279d968d29361218031b73afce64aa85a209的99文件／1809 tests、content、type/build、Chromium Canvas双端smoke、plan全部PASS，前后源码／索引／HEAD不变，且src指纹与两张候选截图一致（见[frozen](frozen-ci.json)）；最终仅证据记录改动，新精确远端CI另报。整体审美不据此宣称通过；OnePlus／真GPU／听感NOT_RUN，新27WebP未接入。
