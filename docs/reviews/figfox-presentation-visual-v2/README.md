# Presentation Mode V2 · 验收报告

> 此报告对应换图前的 sample-0001。当前 HTML 与讲稿已更新到 sample-0032，最新结果见 [换图报告](../figfox-presentation-case-refresh/README.md)。

2026-11-08，Windows 11，Chrome 156.0.8078.74。演示专用检查 18 组，现有产品回归 39 组，均通过。macOS 与实际讲台电脑待测。公网未发布。

## 交付与版本

- 分支：`codex/figfox-presentation-visual-v2`。
- 基线：`4d53116669c4cc318e8a55376150e95086047d8a`。
- 实现：`437199b`；最终引线修正：`74a9c5f`。本报告所属交付提交保存说明、截图、录像、测试报告和构建文件。
- [本地 Pages 预览](http://127.0.0.1:5186/figfox/presentation)。
- [独立 V2 HTML](../../../frontend/presentation-dist/FigFox-Architecture-Demo-V2.html) 与 [旧名称兼容 HTML](../../../frontend/presentation-dist/FigFox-Architecture-Demo.html)，二者字节一致。
- [使用说明、构建命令和快捷键](../../figfox-presentation-visual-v2.md)、[独立两分钟讲稿](../../figfox-presentation-visual-v2-script.md)。
- 文件体积、SHA-256、测试时间和系统版本见 [delivery.json](delivery.json)；完整资源来源见 [离线 manifest](../../../frontend/presentation-dist/manifest.json)。

## 七状态截图

| 场景 | 英文 1600×900 | 英文 1366×768 | 中文 1600×900 |
| --- | --- | --- | --- |
| opening | [查看](1600x900-opening.png) | [查看](1366x768-opening.png) | [查看](zh-opening.png) |
| assets | [查看](1600x900-assets.png) | [查看](1366x768-assets.png) | [查看](zh-assets.png) |
| draft | [查看](1600x900-draft.png) | [查看](1366x768-draft.png) | [查看](zh-draft.png) |
| evidence | [查看](1600x900-evidence.png) | [查看](1366x768-evidence.png) | [查看](zh-evidence.png) |
| targets | [查看](1600x900-targets.png) | [查看](1366x768-targets.png) | [查看](zh-targets.png) |
| repair | [查看](1600x900-repair.png) | [查看](1366x768-repair.png) | [查看](zh-repair.png) |
| editable | [查看](1600x900-editable.png) | [查看](1366x768-editable.png) | [查看](zh-editable.png) |

附：[实际文字输入](edit-input.png)、[车辆来源关联](asset-vehicle.png)、[图结构来源关联](asset-graph.png)、[断网编辑](offline-edit.png)、[125% 浏览器缩放](zoom-125.png)、[实际导出的 SVG](FigFox-sample-0001-edited.svg)。

## 静态构图先行的记录

修改前从运行中的 V1 保存了 1600×900、1366×768 各八幕截图，位于 [baseline/](baseline/)。这批截图对应当前交付基线，而非旧实验仓库。

先完成 assets、evidence、editable，分别在两种尺寸下截图检查，记录在 [key-static/](key-static/)。完成图形尺度、独立 ROI、文字预算和对齐后，才接入其余场景与连续过渡。

| 关键画面 | 1600×900 静态稿 | 1366×768 静态稿 |
| --- | --- | --- |
| assets | [查看](key-static/1600x900-assets.png) | [查看](key-static/1366x768-assets.png) |
| evidence | [查看](key-static/1600x900-evidence.png) | [查看](key-static/1366x768-evidence.png) |
| editable | [查看](key-static/1600x900-editable.png) | [查看](key-static/1366x768-editable.png) |

静态稿的新增英文词数为 9、4、4。之后的视觉复核修正了来源引线穿过原图标题、结构类型标签遮挡、目标引线弯折半径，以及退出场景时的残留标签。

## 关键过渡录像

[architecture-transitions.webm](architecture-transitions.webm) 是真实浏览器录制，连续展示六次前进，动画按原速播放，每幕作短暂停留。

[录像抽帧总览](motion-contact.png) 用于检查素材移动、局部聚焦、范围选择和返回全图的连续性。录像与静态截图分别检查，不能互相替代。

- opening → assets：同一原图移向左侧，三个显示副本按来源展开，不表达真实分割计算时间。
- assets → draft：原图缩小，素材交接退场，实际 Image → Shape → Text 结构依次显现。
- draft → evidence：原图与初稿保持各自身份，同时聚焦到独立中心。
- evidence → targets：初稿局部扩展，参照缩至角落；连线追踪当前真实目标。
- targets → repair：操作区 160ms 退场；保留修改前 180ms，随后真实快照交叉淡入。
- repair → editable：从局部返回完整 SVG，修复对象观察框退场，文本对象选择框显现。

检查还比较了每幕序列结束后两张相隔 250ms 的截图，像素完全一致。直接跳转与反向导航使用标准结束画面，快速导航取消旧序列；隐藏页面或减少动画不会推进主讲状态。

## 功能与视觉检查

原始结果：[checks.json](checks.json)。各视口、场景的文字与异常清单：[layout.json](layout.json)。

| 检查范围 | 结果 |
| --- | --- |
| 六次前进、逐幕后退、首尾边界 | 通过；最后下一幕禁用 |
| 阶段键、定位点、Home/End、快速切换、repeat | 通过；原图与初稿 DOM 身份连续 |
| 素材与来源 | 三项一一对应，单条连接线，明确 Crop illustration |
| SVG 结构 | 真实图像、路径、文字均可选择；四角框来自实际对象 |
| 双侧证据 | 独立中心、共同倍率、28 像素上下文；1366×768 下关键 ROI 短边不少于 72px |
| 操作与目标 | set / replace 对应真实 ID，当前连线与选择同步 |
| 修复对照 | Before/After 与按住 B 通过；松开和失焦恢复当前所选状态 |
| 文本编辑 | 修改真实节点；Enter 确认、Escape 撤销未确认输入；IME 不误触发 |
| 导出 | 实际新文字、原属性和文档引用保留；重新解析、渲染通过，无观察层 |
| 恢复、重置和语言 | 恢复案例、全局重置范围正确；语言与跨幕切换保留已确认编辑 |
| 菜单与详情 | 来源、完整证据、Gap Guidance 和运行记录可访问；焦点恢复；菜单内 F/D 有效 |
| 独立路由 | 开发与 /figfox/ 深链接刷新通过，无账户、会话或生成 API 请求 |
| 离线 | file:// 加浏览器 offline 模式完成七幕、语言、编辑和导出；HTTP/HTTPS 请求尝试 0 |
| 字体及下载兼容 | Figtree 已就绪，无外部字体请求；开发与 Pages 的两个下载文件名均匹配单文件 |
| SVG 安全与定位 | 清理、marker/clip/use 引用、嵌套 tspan、旋转边界测试通过 |
| 动态效果 | 六次过渡录像、序列结束静止、减少动画、全屏进出均通过 |

视口覆盖 1920×1080、1600×900、1366×768、1280×720、1024×768。主讲画面没有旧侧栏、说明段落、阶段卡片或页面滚动条。125% 使用 Chrome 设置中的真实浏览器缩放，核对 1600×900 窗口下 CSS 视口为 1280×720、DPR 为 1.25，并遍历七幕。

| 场景 | 英文词数 | 中文字符预算计数 |
| --- | ---: | ---: |
| opening | 5 | 8 |
| assets | 9 | 19 |
| draft | 5 | 11 |
| evidence | 4 | 8 |
| targets | 7 | 20 |
| repair | 4 | 11 |
| editable | 4 | 9 |

计数排除原科研图文字、品牌、边缘导航与详情；中文列将可见英文短名也计入，仍低于 28。英文均低于 16 词。

## 原有产品回归

正式 Pages 参数构建通过，详情见 [build.log](build.log)。账户与任务检查使用隔离的浏览器夹具，真实生成提交为 0；这些结果验证前端行为，不替代后台生产服务验收。

| 现有脚本 | 通过组数 | 报告 |
| --- | ---: | --- |
| research-check.mjs | 12 | [研究展示](research-checks.json) |
| showcase-curation-check.mjs | 4 | [首页案例](showcase-curation-checks.json) |
| pages-workspace-check.mjs | 6 | [账户、工作台、编辑入口](pages-workspace-checks.json) |
| editor-reliability-check.mjs | 8 | [完整编辑器可靠性](editor-reliability-checks.json) |
| editor-refinement-check.mjs | 6 | [编辑流程、文件句柄、文档结构](editor-refinement-checks.json) |
| editor-save-check.mjs | 3 | [持久化和导出](editor-save-checks.json) |

本轮没有修改这些产品业务实现或回归脚本。最后的来源引线修正只影响演示中的图结构连线；演示套件在修正后重新运行。

## 数据真实性与代码复核

案例 manifest 和资源与基线逐文件核对，保持原字节和哈希。仍使用原图无损副本、原初稿、最终 SVG 和事务前后快照。SAM 为机制示意；初稿模型名称缺失仍按角色表达；G1/G2 模型记录和 Gap Guidance 的 not-recorded 状态保留。未重新调用模型或改写实验文件。

按 code-review-and-quality 技能完成独立复核。标签覆盖、连接线圆角、菜单键盘、开场重新进入时长和操作区退场问题已修正；最终无阻断项。原图身份、计时器取消、静止画面、输入法、按住 B、字体与 SVG 编辑隔离均已复核。

## 设备待测与发布

macOS 与讲台电脑尚未实测。可重复步骤：复制单 HTML，断网打开，逐幕前后导航，选择三项素材和两项操作，查看完整图与局部，切换 Before/After 并测试按住 B，编辑/取消/恢复文字，导出重开；再检查语言、全屏、125% 缩放与翻页器。

记录目标电脑操作系统、浏览器、字体替代、投影比例及问题。公网仍沿用 [现有审核发布流程](../../../deploy/README.md)，发布审核后的完整 SHA，再检查 `_release.json`、演示深链接和两个离线下载路径。
