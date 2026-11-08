# FigFox Presentation Mode 验收记录

这是 `4d53116` 的 V1 历史验收。当前七状态演示及离线兼容文件见 [V2 验收报告](../figfox-presentation-visual-v2/README.md)。

2026-11-08，Windows 11（10.0.26200），Chrome 156.0.8078.74。

独立演示、离线文件和现有产品回归检查通过。演示专用检查 17 组、产品回归 39 组，报告中的浏览器错误均为空。macOS 与实际讲台电脑尚未执行设备验收；公网未发布。

## 交付入口

- 分支：`codex/figfox-presentation-mode`。
- 基线：`c67feff986f5f9de0e1a139d416eefcccf8a3b80`。
- 本报告验证的代码：`8cb533de5fda8e3b128a9d738e2a5aa1dc492747`；后续交付提交保存本说明、截图、报告、构建产物及防止 Git 改写产物字节的配置。
- 开发入口：`http://127.0.0.1:5173/presentation`。
- 已启动的 Pages 本地预览：[打开演示](http://127.0.0.1:5186/figfox/presentation)。重启命令见使用说明。
- [独立 HTML](../../../frontend/presentation-dist/FigFox-Architecture-Demo.html)：948,191 bytes，约 0.90 MiB；复制这一文件即可离线使用。
- HTML SHA-256：`d55b681c6d045b664591383449f74834937f2858caa741007a8c94c53dc110bc`。
- [六幕讲稿、一页使用说明、快捷键和案例来源](../../figfox-presentation-mode.md)。
- [案例 manifest](../../../frontend/public/assets/presentation/sample-0001/manifest.json)、[资源核验报告](../../../frontend/public/assets/presentation/sample-0001/resource-report.json)、[离线文件 manifest](../../../frontend/presentation-dist/manifest.json)、[交付元数据](delivery.json)。

网站构建中的下载文件与独立交付文件字节相同。在线和离线共用组件、状态机、文案与案例数据。演示入口处于账户、工作台与生成服务初始化之外。

## 八状态截图

截图逐幕检查了标题、结论、图像比例、箭头方向、目标与计划行对应关系，以及中英文控件。检查中将 B2 标签与引线移到图上方空白处，避免遮住图内标题；修正后的截图和测试结果保存在本目录。

| 状态 | 中文 1600×900 | 中文 1366×768 | 英文 1600×900 |
| --- | --- | --- | --- |
| overview · 总览 | [查看](1600x900-overview.png) | [查看](1366x768-overview.png) | [查看](en-overview.png) |
| assets · 素材 | [查看](1600x900-assets.png) | [查看](1366x768-assets.png) | [查看](en-assets.png) |
| draft · 初稿 | [查看](1600x900-draft.png) | [查看](1366x768-draft.png) | [查看](en-draft.png) |
| issue-map · 差异定位 | [查看](1600x900-issue-map.png) | [查看](1366x768-issue-map.png) | [查看](en-issue-map.png) |
| evidence · 证据 | [查看](1600x900-evidence.png) | [查看](1366x768-evidence.png) | [查看](en-evidence.png) |
| plan · 计划 | [查看](1600x900-plan.png) | [查看](1366x768-plan.png) | [查看](en-plan.png) |
| repair · 执行对照 | [查看](1600x900-repair.png) | [查看](1366x768-repair.png) | [查看](en-repair.png) |
| edit · 文本编辑 | [查看](1600x900-edit.png) | [查看](1366x768-edit.png) | [查看](en-edit.png) |

另附 [断网编辑](offline-edit.png)、[浏览器原生 125% 缩放](zoom-125-layout.png)、[实际导出的 SVG](FigFox-sample-0001-edited.svg)。

## 演示专用验收

完整结果：[checks.json](checks.json)。布局异常清单：[layout.json](layout.json)，结果为空数组。

| 附件验收项 | 实际检查与结果 |
| --- | --- |
| 1–3 · 导航 | 七次前进到 edit，七次后退返回；首尾有界；阶段键、步骤按钮、250ms 导航间隔和打断过渡通过。 |
| 4 · 素材关联 | 三块素材分别高亮其原图矩形区域。 |
| 5–6 · 证据定位 | B1 原图和初稿独立定位、同一单位缩放；B2/D1 有独立证据；主讲路线固定回到 B1。 |
| 7 · 目标对象 | 使用真实 SVG 对象边界和变换，计划行与选中目标对应；标签具有足够的点击区域。 |
| 8 · 修复对照 | 三种视图与 B 快捷键通过；标题断言为事务执行前后；全量记录数字单独展示。 |
| 9–10 · 真实编辑及导出 | 修改实际文本节点；导出重新解析、渲染且引用完整；原有属性和其他 tspan 保留。 |
| 11 · 恢复与重置 | 恢复仅影响目标文字；跨幕保留编辑；全局重置清除临时修改。 |
| 12–13 · 输入及语言 | 输入框内保留空格、方向键、字母和 Enter 语义；切语言保留步骤、选中对象和文本。 |
| 14 · 浮层 | 讲稿、帮助、Gap Guidance、完整记录可打开关闭，Escape 和焦点恢复通过。 |
| 15 · 减少动画 | 八状态在 reduced-motion 下完整可用。 |
| 16 · 离线 | file:// 加浏览器 offline 模式，八状态、语言、编辑、下载均通过；HTTP/HTTPS 请求尝试为 0。 |
| 17 · 独立路由 | 开发与 /figfox/ 深链接刷新通过；无认证、会话、生成 API 或字体请求；两种在线入口的离线下载内容均与交付 HTML 相同。 |
| 18 · 原有产品 | 下表六套现有检查共 39 组通过。 |

附加 SVG 检查覆盖有害属性清理、marker/clip/use 引用、嵌套 tspan，以及旋转对象包围框。观察高亮保留在文档外，导出使用原始 ID。

视口覆盖 1920×1080、1600×900、1366×768、1280×720、1024×768。五种尺寸均检查控件、标题、三行内结论和页面滚动条。浏览器全屏实际进入并退出；125% 使用 Chrome 设置里的原生缩放，核对 1600×900 窗口下 CSS 视口变为 1280×720、devicePixelRatio 为 1.25，并遍历八状态。

## 产品回归与构建

| 脚本 | 通过组数 | 记录 |
| --- | ---: | --- |
| research-check.mjs | 12 | [研究展示、数据、交互、深链接](research-checks.json) |
| showcase-curation-check.mjs | 4 | [首页案例、比较、编辑和下载](showcase-curation-checks.json) |
| pages-workspace-check.mjs | 6 | [登录状态、工作台、账户隔离和编辑器入口](pages-workspace-checks.json) |
| editor-reliability-check.mjs | 8 | [插入、引用、撤销重做、单位、导出重开](editor-reliability-checks.json) |
| editor-refinement-check.mjs | 6 | [文字、IME、属性、文件句柄、完整文档结构](editor-refinement-checks.json) |
| editor-save-check.mjs | 3 | [导出前持久化、刷新恢复、保存失败时真实导出](editor-save-checks.json) |

工作台检查使用浏览器拦截的账户与任务夹具，真实生成提交为 0；未发起模型调用。它验证前端原有行为，不作为后台生产服务重新验收的证据。

两处旧检查脚本适配了基线已有行为：可靠性检查先展开默认折叠的高级属性；保存检查选择当前账户作用域下的 IndexedDB，而非打开旧的固定名称。产品编辑器本身未因此修改。

TypeScript 与正式 Pages 构建通过。构建使用现有部署参数：

~~~powershell
Set-Location D:\Github_Ku\autodraftman-product\frontend
$env:VITE_API_BASE_URL = 'https://34.143.155.158'
$env:VITE_INTERNAL_RECONSTRUCTION = 'true'
$env:VITE_SESSION_TRANSPORT = 'bearer'
npm run build:pages
npm run review:presentation
~~~

单独生成离线文件：`npm run presentation:build`。演示检查启动并关闭独立测试服务器；不依赖已启动的 5186 预览。运行产品检查时将 `AUDIT_BASE_URL` 设为 `http://127.0.0.1:5186/figfox`，并按表中名称执行 `node scripts/<文件名>`。

## 材料真实性与复核

- Reference 来自同次运行的原始 PNG，转为无损 WebP 后核对 RGB 像素一致。Draft/Final 分别核对为公开 C.svg/A.svg。
- 可访问材料缺少本案例真实 SAM 裁图与目录，现有其他 preflight 目录属于另一原图。因此使用 `reference-crop-illustration`，显示“素材辅助机制示意”，分割数量为空值。
- 匹配版本执行器完整重放 13 个操作，最终 SVG 与原产物字节一致、执行日志一致。B1 保存真实上下文中的事务前后快照；两目标子树之外不变。
- B1 为已复核；B2/D1 保留原始观察及未记录独立复核的状态。未将缺失记录视为通过。
- G1/G2 的 GPT-5.5 标签来自该次实验；初稿模型名称缺失时使用角色名。Gap Guidance 为 `not-recorded`。
- 原实验产物只读；前端编辑作用于演示副本。

按 code-review-and-quality 技能执行了独立代码复核。复核后修正无损图像来源、事务前后标题、选择恢复和导航节流细节；最终无阻断项。

## 提交记录

| 提交 | 内容 |
| --- | --- |
| `4e4ab35` | 真实案例整理、来源哈希、事务重放和资源准备 |
| `56c9180` | 独立八状态演示、在线入口及离线构建 |
| `8cb533d` | 浏览器验收、标注修正、产品回归脚本适配 |
| 本文所属交付提交 | 单文件 HTML、截图、测试结果和讲稿文档 |

## 设备待测与发布

macOS 与实际讲台电脑待测。可重复步骤：

1. 只复制 HTML 到目标电脑，断网后双击打开，确认资源准备完成。
2. 连续七次前进到最后一幕，再逐步后退；检查所有标题、控件、箭头及对象边界。
3. 切换中英文；测试全屏进出、125% 浏览器缩放，以及翻页器的 PageDown/PageUp。
4. 查看三块素材、B1/B2/D1 证据、两条计划和三种修复视图；开关讲稿与 Gap Guidance。
5. 修改 Global Pooling，导出并重新打开 SVG；恢复原文、重置演示。
6. 记录操作系统、浏览器版本、字体替代、投影比例与发现的问题。

公网发布沿用 [现有审核与完整 SHA 发布流程](../../../deploy/README.md)。本次没有推送发布仓库或触发部署。审核后发布同一 SHA，再核对 `_release.json`、刷新 `/figfox/presentation` 以及离线下载。
