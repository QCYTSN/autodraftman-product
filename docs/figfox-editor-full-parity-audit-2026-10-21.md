# SVG-Edit 完整性扩展复查：仍未对齐

**历史审查记录。** 下文描述 40bb365 基线的问题；这些问题的后续修复、统一 UI、实际验证结果与保留边界见 [本轮修复记录](figfox-editor-parity-repairs-2026-10-21.md)。

基线：FigFox `40bb3655bf7615be5cedee606a82bc5ad5f8bed5`，实际安装的 SVG-Edit **7.4.2**。本轮只审查和记录，没有修改编辑器运行代码或发布网页。

结论：当前仍不能称为“完整吸收 SVG-Edit”。存在自定义界面遗漏、原生界面资源缺失、保存路径不遵守原生设置，以及两套界面状态不同步的问题。

## 为什么前几轮仍然漏项

1. 旧清单以工具栏、菜单和具名控件为单位，把“颜色”“渐变”等大类视为已接入。清单正文明确排除了 Web Component 内部控件，交付判断却没有持续保留这个边界。HSV 输入、渐变铺展、渐变变换、动态尺寸没有逐项验收。
2. “引擎有 API”“FigFox 有按钮”“原生界面有入口”“修改后正确保存”是四种不同的证据。此前把前三种过多地当成了最后一种。
3. FigFox 重写了界面、消息桥接、序列化和本地文档存储。保留 SVG-Edit 引擎文件，不会自动保留被替换模块的行为。图片嵌入、动态尺寸和偏好持久化是具体反例。
4. 既有检查主要证明当轮修复的场景，没有成为逐项覆盖原版功能的验收清单。累计测试数量不能证明完整性。

这些是接入和验收上的问题，不能归因于开源项目没有提供源码。

## 已操作确认的故障

### A1 · 高优先级：选择嵌入图片，下载仍保留网址，重开丢失图片引用

路径：原生图片 URL 字段替换图片 → 等待引擎成功缓存可嵌入数据 → 文档属性选择嵌入 → FigFox 导出 SVG → 重新导入副本。

实际：img_save 确实为 embed，下载的 image 仍使用 http://127.0.0.1:5173/audit-pixel.png。重新打开后 href 被导入清理流程移除，图片节点留下但没有内容来源。测试图片由浏览器本地拦截提供，不依赖外部服务。

原版保存经 svgCanvasToString 应用图片保存选项；我们的 snapshot 直接序列化复制树，不读取 img_save 或嵌入缓存。确认的是**原生 URL 入口与 FigFox 导出之间**的断点；FigFox 自定义网址图片对话框会先下载并嵌入，不能说所有图片插入都失效。

定位：`frontend/public/svgedit/figfox-features.js:66`；原版 `extensions/ext-opensave/ext-opensave.js:216`、`@svgedit/svgcanvas/core/svg-exec.js:285`。

证据：[定向记录](../frontend/.review/editor-parity-deep-2026-10-21-targeted/results.json)中的 image-save-embed；[下载副本](../frontend/.review/editor-parity-deep-2026-10-21-targeted/image-embed-copy.svg)；[重开截图](../frontend/.review/editor-parity-deep-2026-10-21-targeted/image-embed-reopened.png)。

验收要求：选项与实际输出一致；嵌入模式下载后在没有原网址的环境中重开仍有图像；引用模式与导入策略也须一致。

### A2 · 动态尺寸选项没有作用到下载

原版源码对话框有 Toggle dynamic size，支持输出只有 viewBox、无固定宽高的 SVG。实测勾选后，原生源码窗口无 width/height，FigFox 下载仍写入 width=800、height=600。

原因：snapshot 始终写宽高，不读取 dynamicOutput；自定义源码窗口也没有对应选项。定位：`figfox-features.js:86`；原版 `core/svg-exec.js:166`、`dialogs/svgSourceDialog.html:91`。

证据：[主要记录](../frontend/.review/editor-parity-deep-2026-10-21-confirmed/results.json)中的 source-dynamic；[下载副本](../frontend/.review/editor-parity-deep-2026-10-21-confirmed/dynamic-copy.svg)。验收须让源码预览、文件输出和重开结果遵守同一个设置。

### A3 · 节点“链接控制点”状态不同步，首击没有切换

实测进入路径编辑时，引擎和原生按钮都为 true，FigFox 本地变量却从 false 开始。连点两次 FigFox 按钮，引擎状态为 **true → true → false**；第二次之后原生按钮仍为 true。FigFox 按钮没有选中状态，用户也无法辨认是否联动。

添加子路径按钮同样没有绑定当前启用状态；这一项只审代码，没有新增子路径操作实测。

定位：`figfox-bridge.js:289`、`:488`；`SelectionInspector.tsx:193`；原版 `core/path.js:57`。证据：主要记录中的 path-link-state；[截图](../frontend/.review/editor-parity-deep-2026-10-21-confirmed/path-link-state.png)。验收须覆盖首击切换、重新选择路径、两套 UI 切换后的状态一致。

### A4 · 毫米等单位没有贯通对象属性和引擎配置

通过 FigFox 文档设置改为 mm 后，对象属性仍为 X=400、Y=80、W=160、H=120，即像素值，字段没有标明仍使用 px。原生宽度也暂时保持 160。再经原生偏好设置确认 mm、重新选中对象，原生宽度才变成 **42.33**。

两层问题：FigFox 对象字段未做单位转换；document-settings 更新 editor.configObj.curConfig 后，没有像原生 savePreferences 一样调用 canvas.setConfig。原生属性处理支持单位换算，FigFox 数字控件也没有带单位输入入口。

定位：`figfox-bridge.js:414`；`SelectionInspector.tsx` 位置尺寸字段；原版 `panels/TopPanel.js:367`、`:633`、`MainMenu.js:113`。证据：定向记录中的 units-in-properties；[FigFox 属性截图](../frontend/.review/editor-parity-deep-2026-10-21-targeted/figfox-mm-units.png)。验收须统一对象字段、画布配置、标尺和导出单位。

### A5 · 编辑偏好存储替换不完整

实测把编辑背景设为灰色，当时 bkgd_color 为 #888；刷新后回到 #FFF。原版 ext-storage 有保存用户偏好的路径；FigFox 未加载该扩展，且 noStorageOnLoad=true。自定义 IndexedDB 的 preferences 表目前只保存活动文档 ID，没有接上原生编辑偏好。

原生语言选项仍提示刷新生效，但 iframe 语言由应用参数指定。这条语言入口与应用语言切换也未接通；此项是静态判断，未逐个语言操作验证。

定位：`figfox-bridge.js:371`、`:383`；`editorStorage.ts:70`；原版 `extensions/ext-storage/ext-storage.js:198`。证据：主要记录中的 preferences-persistence；[设置后](../frontend/.review/editor-parity-deep-2026-10-21-confirmed/preferences-before.png)、[刷新后](../frontend/.review/editor-parity-deep-2026-10-21-confirmed/preferences-after.png)。

### A6 · 原生调色器图片资源缺失，不能作为完整兜底

原版 seColorPicker.js:771 读取 components/jgraduate/images。项目 public/svgedit 和公开站点镜像 site/svgedit 均没有该目录。

实际打开原生调色器，定位点、滑条箭头等不能解码；纯色色域图依赖的贴图也缺失。记录中实际图片 naturalWidth 为 0。[原生渐变截图](../frontend/.review/editor-parity-deep-2026-10-21-targeted/native-gradient-controls.png)、[原生纯色截图](../frontend/.review/editor-parity-deep-2026-10-21-targeted/native-solid-controls.png)，见定向记录 native-color-controls。

验收须把实际引用资源纳入构建和发布清单，并操作构建产物中的原生调色器。只检查引擎脚本存在不够。

## 仍缺的功能入口和工作流

### B1 · 渐变高级控制与真实预览

对照原版 jQuery.jGraduate.js:249–327、:466–500、:670，FigFox 仍缺：

- pad / reflect / repeat 铺展方式，即边缘延伸、镜像重复、重复。
- 径向渐变的椭圆比例、旋转角度。
- 中心与焦点保持一致的联动开关。
- 预览上拖动起点、终点、中心、焦点，以及拖动色标位置。

已有的坐标输入、颜色/透明度、色标增删不能替代上述全部交互。桥接会保留已有 spreadMethod / gradientTransform，但保留属性不等于能够编辑属性。

此外，当前预览固定使用 CSS linear-gradient(90deg) 或 radial-gradient(circle)，不使用输入的起终点、中心、焦点、变换和铺展方式。实测原图为偏心、旋转、镜像重复渐变，弹窗预览仍为普通居中渐变。

定位：`EditorPanels.tsx:144`、`:151–157`，`EditorAppearance.tsx:46`。证据：[渐变截图](../frontend/.review/editor-parity-deep-2026-10-21-confirmed/gradient-ui.png)，主要记录 gradient-ui。[原版源码](https://github.com/SVG-Edit/svgedit/blob/v7.4.2/src/editor/components/jgraduate/jQuery.jGraduate.js)。

### B2 · 精细纯色面板仍少部分原版操作

连续色域、色相条、HEX、RGB、透明度已补上，本轮没有把它们重复列为遗漏。尚缺：H/S/V 数值输入；选择 H/S/V/R/G/B/A 作为色域图与滑条控制轴；修改前后颜色并排比较和点击原色复原。

原版默认快捷色板为 41 种颜色加无，FigFox 为 10 种加无。这是预设减少，**当前可选颜色并不限于这些色块**。

定位：原版 jQuery.jPicker.js:1347–1376、:1477，sePalette.js:3；FigFox `EditorColorPicker.tsx:43–54`、`EditorAppearance.tsx:9`。属于静态入口对照，没有逐项改变全部原生颜色通道。

### B3 · 保存 / 另存为文件工作流

原版 ext-opensave 使用 browser-fs-access，在浏览器支持时保留打开文件的句柄，保存可以写回原文件，另存为另选位置。FigFox 是浏览器内自动保存，加下载一个 *-figfox.svg；没有原文件句柄，也没有等价的保存/另存为分工。画布 Ctrl+S 只刷新应用快照。

这属于替换后的能力差异，不能用已有导出按钮记为原版保存行为全部保留。浏览器兼容限制仍需下载回退。

定位：原版 ext-opensave.js:167、:237；FigFox `ProductSvgEditorPage.tsx:102–124`、`figfox-bridge.js:681`。[原版实现](https://github.com/SVG-Edit/svgedit/blob/v7.4.2/src/editor/extensions/ext-opensave/ext-opensave.js)。本轮静态确认，没有弹出系统文件选择器验证原版覆盖保存。

### B4 · 参数形状范围缩减

原版星角数、多边形边数最小为 1，控件未声明 128 的上限；FigFox 限为 3–128，内外径比例也限为 1–128。是否保留这些限制可以是产品决策，但不能称为无差异接入。

定位：原版 ext-polystar.js:119–127；`EditorNativeFields.tsx:22`、`figfox-native-controls.js:17`。只审代码，没有绘制边数极大的对象。

### B5 · 自己导出的较大 SVG 可能无法再次通过文件选择器打开

图片插入允许单张 10 MB，SVG 下载无对应的 5 MB 上限，文件选择器却拒绝大于 5 MB 的 SVG。图片 base64 编码还会增大，因此存在允许编辑并下载、但不能通过打开 SVG 重新导入的文件范围。

本地草稿恢复已绕过 5 MB 限制，不能说刷新一定丢文档。缺口是导出到文件后再打开。

定位：`FigFoxEditorChrome.tsx:336`、`:365`；`svgDocument.ts:246`、`:256`；`ProductSvgEditorPage.tsx:121`。代码边界不一致已确认；**未生成大文件实测，也未做压力测试**。

## 上游问题与产品边界

- 原生渐变编辑器对合法百分比 r=30% 显示 NaN，reflect 下拉框显示 pad，复合变换没有正确显示角度和椭圆比例。本轮实际见到这些状态。上游源码直接将半径属性乘 100，并对 select 使用 setAttribute(value)，至少前两项来自所依赖版本自身实现。它们不应归为缺少按钮，但需要修复才能宣称可靠兜底。
- 原生偏好保存事件未带 gridcolor，接收端却读取它。这是上游静态缺陷线索，本轮未单独操作确认。
- mask、clipPath、pattern、复杂滤镜链、symbol 资源管理等，没有专门的完整编辑面板。SVG-Edit 也不等于 SVG 标准全部编辑能力；源码窗口不计作相应可视化面板。
- LaTeX 是 FigFox 新增能力；已有轮廓公式不能自动无损还原源码。普通 SVG 表格没有电子表格语义。这两项不属于遗漏原版默认功能。
- 导入过滤脚本、动画、foreignObject、外部资源，是现有产品边界；仍须解决不同入口之间的数据行为冲突。
- 默认绘图/视图扩展 8 个均有加载。默认 storage/opensave 被替代，差异见上文。overview_window 在上游默认配置中已停用，helloworld 是示例；imagelib/arrows 只留下被注释的配置名称，安装包源目录没有这两个扩展。不将这些算作已验收功能，也不机械算作核心功能遗漏。

## 覆盖范围与证据边界

| 范围 | 本轮核对结果 |
| --- | --- |
| 选择、基本绘图、自由绘制、文字、图片 | LeftPanel 与工具映射对照，未发现新整类工具缺失；未重跑全部操作 |
| 几何、旋转、翻转、形状参数 | 入口与命令对照，确认 A4、B4 |
| 字体、装饰、对齐、文字间距、长度调整 | 当前入口存在；不重复报告此前已修复的字体/粗体/虚线问题；结构化文字组合未穷举 |
| 路径节点、线/曲线、增删、闭合、子路径 | 命令与控件对照，确认 A3；其余组合继续待操作验收 |
| 纯色、渐变、内部组件、资源 | 拆开 jPicker/jGraduate，并打开两套界面，确认 A6、B1/B2 及上游异常 |
| 描边、透明度、模糊、起中终点标记 | 入口存在；未新增完整组合实测 |
| 剪贴板、分组、链接、排列、图层 | 对照菜单和桥接命令，未发现新整类缺项；不标记为所有组合通过 |
| 缩放、平移、网格、标尺、线框 | 有入口；单位和偏好仍有 A4/A5；复杂图性能未实测 |
| 文档属性、编辑偏好、源码内部设置 | 确认 A1/A2/A5；源码修改后撤销实际正常，排除清空历史疑点 |
| 新建、打开、插入、保存、导出 | 确认 A1/A2/B3/B5；存在格式按钮不代表所有内容组合已验收 |
| 默认扩展与资产 | 8 个绘图扩展加载，2 个存储扩展替代；原生调色资源缺失 |
| 快捷键与跨界面焦点 | 阅读注册和路由；确认 Ctrl+S 的替代语义；未逐个按键/焦点组合实测，继续待验证 |

本轮环境：本地开发页面，Chrome 155.0.8059.40，1440×1000，只用自建副本。只读核对了公开镜像缺少调色资源，没有重新操作线上页面。未测试正式研究样本，D13/D14/D16 均不因此转为通过。

- [主要操作记录](../frontend/.review/editor-parity-deep-2026-10-21-confirmed/results.json)：渐变、节点状态、动态尺寸、偏好、源码撤销。其中单位初查不足和图片重开等待错误，以下方定向记录为准。
- [定向确认记录](../frontend/.review/editor-parity-deep-2026-10-21-targeted/results.json)：原生资源、单位配置、图片嵌入重开。三项均完成，无脚本错误。
- [复查脚本](../frontend/.review/editor-parity-deep-audit.mjs)：位于忽略目录。初轮定位器与等待错误不作为产品缺陷。

建议先修 A1/B5 文件往返，再修 A2/A3/A4/A5 设置与状态一致性，再补 A6/B1/B2 调色功能与资源，最后收口 B3/B4 工作流与参数范围。每项分别记录入口、行为、撤销和保存重开，不能再以按钮存在或累计检查数判定完整。
