# FigFox V2 · 架构交接验收

在已交付的小鸟案例上补足三个交接关系，保留七幕、六次前进、原有图形构图和在线 / 离线共用组件。没有增加模型调用或主讲必经步骤。

## 核查范围与版本

- 本地基线：`4f1368890098296dab44b83d7234e96268dab69a`，前置案例实现 `d918b5f0c038d12fa8739fa192b8b5caaa899a1f`。
- 分支：`codex/figfox-presentation-visual-v2`；实现提交 `879f4d1`（三个交接与轻量状态）、`e88ede1`（Plan 对齐事务前快照）。完整源码 SHA 与产物哈希见 [delivery.json](delivery.json)。
- 当前案例：`sample-0032`，主问题 **A2**，主事务只有一个 `replace_svg`。本轮没有套用旧案例 B1 / 两项操作的数量。
- 核查本地源码、真实归档和实际浏览器；未将远端可见性或公网可访问性视为已验证。
- 首页、登录、工作台、生成服务、完整编辑器源码均未改动。原三个未跟踪宣传片目录保留。
- 公网未发布，继续沿用 [部署说明](../../../deploy/README.md) 的审核与完整 SHA 发布流程。

## 三个交接

| 位置 | 画面如何回答职责与交接 | 记录边界 |
| --- | --- | --- |
| assets → draft | 原图与三块真实 SAM 素材分别进入短暂的 Draft model 节点，再承接 SVG 初稿。节点退场后，初稿与对象成为主体。 | 素材提供局部视觉输入，初稿由生成环节产生。动画不是模型计算耗时。 |
| draft → evidence | 完整初稿展示九条 G1 原始检测记录；200ms 聚焦 A2，440ms 展开独立成对局部，1100ms 前停稳。 | 九条检测记录不等于九条复核通过的问题；A2 已由 G2 确认。 |
| targets → repair | Confirmed A2 → Plan；同一操作组在 180ms 进入 Local execution，560ms 显示事务后 SVG，820ms 强调 Render。 | Plan 与执行前视图使用同一个真实事务前快照；目标位置和相机不变。浏览器展示已核验产物，不重新调用模型或运行归档执行器。 |

问题图编号避开图中标题与箭头；仅改变标签锚点，原始检测区域与证据文本不变。Plan 对齐事务前快照，避免其他较早事务的已完成内容在交接处跳变。

Gap guidance 以低强调虚线支路出现，点击进入详情。当前记录为 **not-recorded**，既没有冒充已调用，也没有改成明确未触发。界面保留三态。结尾 **Unresolved 0** 来自真实空清单，详情将 `recorded-complete` 与视觉验收 `null` 分开。

重复的“已修复”和单项操作序号已省去；Before / After 的选中态反映当前实际显示内容，包括按住 B 的临时查看。

## 使用与产物

- [本地 Pages 路径预览](http://127.0.0.1:5186/figfox/presentation)；[本地开发入口](http://127.0.0.1:5190/presentation)。这些地址仅在对应本机服务运行时有效。
- [独立 HTML](../../../frontend/presentation-dist/FigFox-Architecture-Demo-V2.html)，复制单文件到讲台电脑即可离线使用。
- [兼容文件名](../../../frontend/presentation-dist/FigFox-Architecture-Demo.html) 与 V2 文件逐字节相同。
- [两分钟讲稿](../../figfox-presentation-visual-v2-script.md)、[完整操作与构建说明](../../figfox-presentation-visual-v2.md)。
- [六次连续过渡录像](architecture-transitions.webm)、[实际编辑导出 SVG](FigFox-sample-0032-edited.svg)。

从 opening 连续前进六次到 editable。R / 右下回转箭头重播 draft、evidence、repair 的交接；I / Issue map 在 evidence 中停留查看问题分布，Escape 关闭。两个记录详情均可用 Tab、Enter、Escape 操作，关闭后焦点返回入口。文字输入时 R / I 保持普通字符输入。

在 `D:\Github_Ku\autodraftman-product\frontend` 中运行：

```powershell
npm run dev
npm run presentation:build
npm run build:pages
npm run review:presentation
```

正式路径构建使用项目现有部署环境参数。独立 HTML 已内嵌案例、字体与代码；离线七幕、问题图、辅助详情、实际文字编辑与 SVG 导出均无需网络。

## 浏览器与来源验证

Windows Chrome 156，**23 组浏览器检查通过**，页面错误 0，离线 HTTP / HTTPS 尝试 0。详见 [checks.json](checks.json) 和 [layout.json](layout.json)。

- 七幕正反导航、六次前进到终点、阶段键、快速中断与重播、隐藏页面 / 减少动态效果语义沿用现有控制。
- 新增交接验证：两路真实生成输入、九条原始问题分布、全图重播、问题图持续停留、同一 Plan / execution 操作组、事务前内容一致、SVG 更新先于 Render、固定相机。
- 原有素材来源、真实 SVG 对象选择、独立局部相机、操作范围、按住 B / 松开恢复、真实文本编辑与导出引用完整性全部保留。
- 键盘 / 鼠标详情、焦点回到原入口、IME 与 R / I 输入隔离、快速切幕无残留计时器。
- 五种视口：1600×900、1366×768、1920×1080、1280×720、1024×768；另测原生 Chrome 125% 缩放。
- 43 项布局记录无溢出；这些记录中英文七幕最高 11 词、中文最高 28 字符（按既有预算规则统计，中文含问题图停留态），符合 V2 的 16 / 28 上限。
- 实际 `file://` 断网打开、七幕交互、语言切换、编辑 `Offline Table` 与 SVG 导出；在线两套入口及两个下载文件名均与最终 HTML 字节一致。
- 六次真实时间过渡全部录像；每幕序列后静止，后续截图逐像素一致。测试使用真实浏览器时间以覆盖原生 Web Animations 时间线。
- TypeScript / Pages / 独立 HTML 构建成功；本轮没有重新声称此前网站业务回归是本次执行。

来源核验：九条问题 ID、bbox、source / initial evidence 与 repair 文本逐条匹配 G1；G1 / G2 SHA 新增到案例清单。原始 SVG、SAM 图片与事务快照字节未改变；完整 19 项操作重放仍匹配最终 SVG 与执行 journal，A2 事务前后目标子树外完全相同。SAM 原始完整目录与 masks 仍缺失，分割总数不填造。

独立复核覆盖数据边界、三种 Gap guidance 状态、未知保留项、减少动态效果、输入与中断、重播位置和 StrictMode 焦点恢复，未留下阻断项。macOS 和实际讲台电脑尚未实机验证。

## 七幕截图

| 状态 | 1600×900 | 1366×768 | 中文 |
| --- | --- | --- | --- |
| opening | [查看](1600x900-opening.png) | [查看](1366x768-opening.png) | [查看](zh-opening.png) |
| assets | [查看](1600x900-assets.png) | [查看](1366x768-assets.png) | [查看](zh-assets.png) |
| draft | [查看](1600x900-draft.png) | [查看](1366x768-draft.png) | [查看](zh-draft.png) |
| evidence | [查看](1600x900-evidence.png) | [查看](1366x768-evidence.png) | [查看](zh-evidence.png) |
| targets | [查看](1600x900-targets.png) | [查看](1366x768-targets.png) | [查看](zh-targets.png) |
| repair | [查看](1600x900-repair.png) | [查看](1366x768-repair.png) | [查看](zh-repair.png) |
| editable | [查看](1600x900-editable.png) | [查看](1366x768-editable.png) | [查看](zh-editable.png) |

关键交接：[Draft model](handoff-draft-model.png) · [Issue map 入场](handoff-issue-map.png) · [问题图停留](issue-map-held.png) · [1366 问题图](1366x768-issue-map-held.png) · [中文问题图](zh-issue-map.png) · [Local execution](handoff-local-execution.png) · [Render](handoff-render.png)。

记录与离线：[Gap guidance 详情](gap-guidance-details.png) · [保留项详情](retained-details.png) · [断网编辑](offline-edit.png) · [125% 缩放](zoom-125.png)。
