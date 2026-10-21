# FigFox 编辑器完整性复查

后续状态：[编辑操作与保存修复记录](figfox-editor-reliability-fixes-2026-10-21.md)。F1–F6 和插入居中问题已修复；F7/F8 及其他 UI 项按用户要求留待下一轮。以下为修复前 d990261 的检查记录。

结论：当前不能验收为“SVG-Edit 功能完整接入、全部 UI 已补齐”。本轮确认了 8 项操作或数据问题，并发现若干只在原生界面提供、或被 FigFox 缩减的设置。此前的 39 项检查只覆盖各自场景，不能作为完整性证明。

## 基线与检查边界

- 本地代码：`d9902617b1deb88170682c9a8f229f66e8dc8bff`，分支 `codex/figfox-complete-redesign`。
- SVG-Edit：安装包 7.4.2；运行的是项目实际引用的 `public/svgedit/iife-Editor.js` 及 FigFox 桥接代码。
- 环境：Windows，Chrome 155.0.8059.40，1440 × 1000，100% 缩放为默认检查状态。浏览器自动化使用实际页面操作；对象选中辅助命令和诊断专用的焦点操作在下文注明。
- 对照原生左右/顶部/底部面板、文档属性、偏好设置、导出、上下文菜单及默认扩展入口，整理了 [178 个具名控件/选项的静态映射](figfox-editor-control-inventory-2026-10-21.md)。控件数不是功能数，也不是通过数。
- 本轮没有重新跑旧的 39 项检查，没有进行大型 SVG 压力测试，也没有改动或发布运行时代码。公开站点本轮未重新操作核验。
- 只使用自建检查 SVG 的副本；没有把任何正式研究样本记为 D13/D14/D16 通过。

## 已复现的问题

### F1：原生单位设置与保存换算不一致（优先修复）

在 800 × 600 px 文档中，打开原生偏好设置，把基本单位选为 `em` 并确定。编辑器分辨率仍为 800 × 600，导出的根元素却变为 `width="800em" height="600em" viewBox="0 0 800 600"`。它直接把像素数加上了字体相对单位，改变了输出的固有尺寸。

原因：`figfox-features.js:73` 的单位转换只列出 px/mm/cm/in/pt/pc，未知单位回退为系数 1。FigFox 页面面板和 `figfox-bridge.js:416` 又不接受 em/ex，但原生偏好仍允许选择。`em` 已实际复现；`ex` 是同一代码路径的风险，未单独操作。

记录：[单位修改后的 SVG](../frontend/.review/editor-completeness-2026-10-21-targeted/em-unit-copy.svg)、[截图](../frontend/.review/editor-completeness-2026-10-21-targeted/native-units.png)。不能用“有原生完整工具入口”证明这条保存路径正确。

### F2：插入 SVG 丢失星形参数（优先修复）

通过“插入 SVG 文件”加入一个合法五角星，原始 `starRadiusMultiplier="4"`，点坐标与比例一致。插入后的 symbol 中该属性丢失。解除引用并选中星形后，FigFox 的“内外径比例”显示为 3。外形暂时由原 points 保留，但后续参数编辑依据已错误。

原因：`figfox-native-controls.js:80` 的插入路径直接调用原生导入，未经过整份文档打开路径的属性保留步骤；相关属性的大小写/白名单处理也需统一。不能仅检查星形是否可见。

记录：[输入副本](../frontend/.review/editor-completeness-2026-10-21-targeted/insert-copy.svg)、[修改后副本](../frontend/.review/editor-completeness-2026-10-21-targeted/edited-copy.svg)、[参数错误截图](../frontend/.review/editor-completeness-2026-10-21-targeted/insert-parameter-ui.png)。原先画布对象在这次插入中没有被移动或改变，此疑点已排除。

### F3：从外层输入框回到画布，键盘操作没有恢复焦点

在 FigFox 缩放框输入 100 并确认，再用鼠标单击画布中的文字，文字已选中、模式为 select，但 iframe 的 `document.hasFocus()` 为 false；按右方向键，对象位移为 0。需要让画布接管键盘焦点。

诊断时只调用 iframe 的 `window.focus()`，后续方向键就能移动对象，说明不能把这种失效解释为对象不可编辑。没有修改编辑器代码。这属于外层 UI 与原生 iframe 的整合问题。

记录：[实际操作与焦点隔离结果](../frontend/.review/editor-completeness-2026-10-21-targeted/results.json)，条目 `rotated-keyboard` / `keyboard-focus-isolation`；[截图](../frontend/.review/editor-completeness-2026-10-21-targeted/rotated-keyboard.png)。

### F4：旋转组内对象的方向键移动方向错误

对父组旋转 28° 的文字，先通过上述诊断方式恢复键盘焦点，再按右方向键。100% 缩放下，实际屏幕位移约为 `dx=0.875, dy=0.46875`，是沿父组局部坐标移动，而非向屏幕正右方移动。应为约 `dx=1, dy=0`。

现有 `figfox-selection.js` 针对鼠标拖动做了父变换逆矩阵换算；键盘仍走原生 `Editor.moveSelected` → `moveSelectedElements`，没有同样的处理。此项的焦点恢复是诊断前置操作，不代表普通用户已有可用的恢复步骤。

记录同 F3 的 `keyboard-focus-isolation`。之前“旋转文字拖动通过”不能覆盖键盘微调。

### F5：缩放按钮方向反转

- 输入 1000%，点“放大”，实际变为 800%。
- 输入 5%，点“缩小”，实际变为 10%。

原因：`FigFoxEditorChrome.tsx:791` 的输入范围为 1–6400，`figfox-bridge.js:506` 的加减按钮仍限制在 10–800。

记录：[操作结果](../frontend/.review/editor-completeness-2026-10-21/results.json)、[放大截图](../frontend/.review/editor-completeness-2026-10-21/zoom-upper.png)、[缩小截图](../frontend/.review/editor-completeness-2026-10-21/zoom-lower.png)。

### F6：线宽上限缩减，输入与实际值不一致

选中矩形，在线宽框输入 90 并按 Enter，输入框仍显示 90，但 SVG 的 `stroke-width` 实际为 64。原生 BottomPanel 的线宽控件最大值为 99，FigFox 在 `FigFoxEditorChrome.tsx:709` 把上限设为 64。

记录：[结果](../frontend/.review/editor-completeness-2026-10-21/results.json)，条目 `stroke-range`；[截图](../frontend/.review/editor-completeness-2026-10-21/stroke-range.png)。这既是范围差异，也是 UI 值与实际文档不一致。

### F7：虚线对象显示成“实线”

选中 `stroke-dasharray="5,5"` 的矩形。浏览器返回的计算样式为 `5px, 5px`，面板 select 的选项为 `5,5`，未做归一化；最终界面显示“实线”，实际图形仍为虚线。

对应 `figfox-bridge.js:146`、`SelectionInspector.tsx:151`。此外，原生预设 `5,2,2,2`、`5,2,2,2,2,2` 在 FigFox 中没有对应选项。

记录：[复现结果](../frontend/.review/editor-completeness-2026-10-21-followup/results.json)、[截图](../frontend/.review/editor-completeness-2026-10-21-followup/dash-display.png)。初轮检查脚本的精确标签定位超时已通过修正定位器解决，超时本身不作为产品缺陷。

### F8：粗体按钮状态错误，文字装饰缺少状态反馈

选中 `font-weight="bold"` 的文字，计算样式为 `700`，但粗体按钮 `data-active="false"`。`SelectionInspector.tsx:112` 只比较字符串 `bold`。下划线/删除线/上划线按钮也没有绑定选中状态；后者是静态 UI 发现，未逐一点击验证。

记录：[粗体截图](../frontend/.review/editor-completeness-2026-10-21/bold-display.png)、[结果](../frontend/.review/editor-completeness-2026-10-21/results.json)，条目 `bold-display`。

## 功能和 UI 对齐情况

| 范围 | 本轮确认的接入情况 | 不能据此声称的结论 |
| --- | --- | --- |
| 原生基本绘图工具 | 原生 13 个具名工具都有 FigFox 工具栏/更多工具映射 | 尚未在本轮逐个验证完整绘制、修改、撤销、保存 |
| 节点、几何、文字间距、标记 | 有属性面板和桥接命令；映射见控件清单 | 参数入口存在不代表所有组合状态和保存结果正确 |
| 默认扩展 | 8 个绘图/视图扩展直接加载；storage、opensave 由应用替代 | 替代不等同于全部原生行为保留；原生可用的文件句柄覆盖保存未接入 |
| 字体 | FigFox 支持常用字体和当前已有字体 | 原生 Cursive、Fantasy、Courier 等没有直接选项，也没有自由输入字体族的字段；需原生布局 |
| 描边 | 端点、连接、线型、宽度有入口 | 存在 F6/F7，原生两种线型预设未对齐 |
| 导出 | PNG/JPEG/WebP/BMP/PDF 均有入口 | FigFox 页面面板只有倍率，缺质量调节；质量调节仍在原生导出对话框；本轮未重跑全部格式 |
| 图像 | FigFox 可插入/替换本地图片 | 图像 URL 输入仍在原生布局；文档属性里的“嵌入/引用”选项是否被自定义快照完整遵守，待验证 |
| 页面/偏好 | 页面尺寸、标题、网格、标尺有 FigFox 入口；背景等复用原生对话框 | em/ex 与 FigFox 保存/面板路径不一致，见 F1 |
| 保存 | 应用草稿存储和导出下载存在 | 并未逐项证明与原生 storage/opensave 语义等价；本轮不能给所有文件 D16 通过 |

原生主页链接、偏好设置对话框等不必机械复制为相同按钮，但应有明确的产品入口和一致的数据行为。相对链接协议、对象数上限、栅格导出像素上限等限制需要作为产品边界记录，不能算“原生全能力无损吸收”。SVG-Edit 的功能集也不等于 SVG 标准的全部编辑能力；这不能用于掩盖已经存在于原生中的接入遗漏。

## 性能复查（只审代码）

已经存在的改善：拖动用动画帧合并更新；交互期间延后全文快照；对象树按脏标记更新；图层列表做可视区域渲染。它们有实际优化作用，但不是“卡顿已全部解决”的证据。

仍存在可疑热点：`figfox-selection.js:63` 的文字命中缓存重建会遍历当前范围全部文字，逐个读取样式、边界框和屏幕变换；随后指针移动仍线性扫描缓存。`figfox-bridge.js:582` 的文档观察器对多数属性变化会使缓存失效。因此大图中的频繁编辑、悬停和重新命中仍可能出现主线程开销。这里只能记录风险，未测耗时，不能断言它就是用户全部卡顿的原因。

按用户要求，没有添加无针对性的压力测试，也没有用少量小文件的流畅表现推断大图性能。

## 已排除与仍待验证

- 已排除：选中已有链接内的形状后修改链接，实际 href 正常更新为新地址。
- 已排除：此次插入 SVG 没有修改原画布矩形。
- 已排除：普通矩形的页面水平居中正常，x 从 300 变为 350，宽度 100、页面宽 800。
- 待进一步定位：插入的 use 在本例中仍出现在左上区域，尽管桥接发出居中命令；普通矩形居中正常，不能把它概括成“全部对齐失效”。
- 待验证：全部快捷键的焦点路由、旋转/缩放父组中的尺寸和节点操作、原生对话框所有选项与自定义保存的兼容、复杂渐变/引用/图像的往返保存、实际复杂业务文件的编辑性能。
- 正式样本 D13/D14/D16：本轮全部保持待验证；没有用本轮自建检查文件替代正式验收。

## 记录索引

- [原生控件清单](figfox-editor-control-inventory-2026-10-21.md)：静态入口对照。
- [初轮记录](../frontend/.review/editor-completeness-2026-10-21/results.json)：保留原始结果，含已纠正的检查脚本定位错误。
- [定位器修正后的记录](../frontend/.review/editor-completeness-2026-10-21-followup/results.json)：虚线显示、普通矩形对齐、原生单位。
- [针对性确认记录](../frontend/.review/editor-completeness-2026-10-21-targeted/results.json)：焦点/键盘方向、合法星形参数、单位。
- [复查脚本](../frontend/.review/editor-completeness-audit.mjs)：只在被忽略的本地 `.review` 目录运行。

修复优先顺序：先修输出单位与插入参数保留，再修焦点与嵌套变换操作，然后统一缩放/线宽范围和面板状态，最后收口剩余原生 UI 参数。每项修复分别证明实际操作和必要的保存结果，避免再次用总检查数量代替完整性结论。
