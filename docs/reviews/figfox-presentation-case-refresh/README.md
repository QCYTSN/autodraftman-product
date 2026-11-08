# Presentation Mode V2 · 换图交付

当前主案例为 **sample-0032 · 小鸟图像编码与原型库**。保持七幕、手动六次前进和原有视觉系统。

## 选择依据

对现有 80 张真实案例做缩略检查，详细比较 14 张的原图、初稿和结果，并检查其事务记录。依据是投影阅读顺序、证据可见程度、真实修复范围和编辑可演示性，不是重新评定研究指标。

| 案例 | 展示考虑 | 选择 |
| --- | --- | --- |
| sample-0032 小鸟/哈希表 | 上下两行、左右两种方法易辨认；图片、图标、矢量网格和标题都有独立对象；黑白网格与初稿蓝色竖条差异明显；单对象修复可准确重放 | 当前主讲 |
| sample-0042 斑马 | 主体易识别、最终图整洁，但主要标签修复 OVIP → OVDP 字符差异小且竖排 | 留作备选 |
| sample-0066 神经活动 | 热图有明显变化，但曲线含义需要更多背景说明，最终曲线仍与原图有视觉差异 | 留作备选 |
| sample-0079 多模态编码 | 配色清楚、流程完整，但主修复集中在较小的照片、骨架和标注位置 | 留作备选 |
| sample-0072 蛋白质 | 主体鲜明，超宽画幅在当前舞台里高度较低 | 保留原官网示例 |
| 原 sample-0001 | 细箭头与点云较密，现场需要更长时间解释局部 | 原始材料和历史交付保留 |

[选图对照](case-selection.jpg) 展示原案例、新案例和两张备选的真实原图。

原图为记录中的 575×241 栅格。清晰度改善来自规整的阅读结构、较大的关键对象和真实矢量放大；没有对原图做 AI 增强或重绘。

## 来源与一致性

- [案例清单](../../../frontend/public/assets/presentation/sample-0032/manifest.json)、[资源校验](../../../frontend/public/assets/presentation/sample-0032/resource-report.json)。
- 参考图和预览从同次归档 PNG 无损转为 WebP，解码 RGB 逐像素一致。初稿与最终 SVG 字节原样保留。
- 三张真实 SAM PNG 从初稿内嵌 data URI 恢复，与同次 `G0-reuse-proof.json` 中 asset proof 的 SHA-256 一致。原图位置经过视觉核验；完整目录和原始 mask 未恢复，分割总数为空值。
- 主问题 A2 / `F_A_hash_table_interior`，实际记录为 confirmed。
- 主事务 `tx_A2_redraw_upper_left_hash_table`，1 项 `replace_svg`，对象 `left_hash_table_top`。前后快照保留此前图标可见性事务的上下文。
- 全部 19 项操作重放后，最终 SVG 字节和执行日志与原记录一致；A2 前后目标子树之外内容完全一致。
- `Hash Table` 的真实文本节点 `txt_hash_table_title` 支持修改与导出。原始最终 SVG 不被改写。
- 执行完成不代表整图视觉验收全部通过：visualQualityPass 仍为 null。
- 独立审查再次验证了 SAM 对应、重放、目标范围、G1/G2 模型、单对象交互和离线导出，结论为批准。

## 入口与复现

- [本地浏览器入口](http://127.0.0.1:5186/figfox/presentation)；[开发入口](http://127.0.0.1:5190/presentation)。
- [单文件 HTML](../../../frontend/presentation-dist/FigFox-Architecture-Demo-V2.html)，兼容旧名称的 HTML 字节相同；在线和离线使用同一套组件与案例。
- [两分钟讲稿](../../figfox-presentation-visual-v2-script.md)、[启动/构建/操作说明](../../figfox-presentation-visual-v2.md)。
- 分支 `codex/figfox-presentation-visual-v2`，换图基线 `a364e80`，实现提交 `d918b5f`。完整提交记录、文件大小和哈希见 [delivery.json](delivery.json)。
- 公网未发布，仍沿用现有完整 SHA 审核流程。

在 frontend 中运行：

```powershell
npm run dev
npm run presentation:prepare
npm run presentation:build
npm run build:pages
npm run review:presentation
```

正式构建环境参数沿用项目部署说明。本轮使用原 API 地址、内部工作台开关和 bearer 会话配置。没有改动官网、登录、工作台、生成接口或完整编辑器的业务代码，也没有调用生图服务。

## 测试与截图

2026-11-08，Windows 11 / Chrome 156.0.8078.74。18 组演示测试全部通过；[checks.json](checks.json) 与 [layout.json](layout.json) 保存实际结果。覆盖：

- 六次前进到 editable、反向与中断导航、鼠标/键盘、重复键过滤。
- 三张素材来源、真实对象选择、局部证据独立相机和完整图切换、真实事务 Before/After。
- 实际文本修改、输入法与取消、状态保留、SVG 下载解析/渲染、属性与引用保留。
- 5 种窗口尺寸、双语文字预算、125% 浏览器缩放、全屏与减少动态效果。
- Dev / Pages 深链接、离线下载内容一致，独立 HTML 在 file:// 断网走完七幕并编辑导出，HTTP/HTTPS 请求为 0。
- 六段实际浏览器过渡录像，动画结束后画面静止。

先检查 assets、evidence、editable 的 1600×900 和 1366×768 静态画面，再对完整流程回归。目标操作引线改为经过图上留白，避开小鸟主体。

| 状态 | 1600×900 | 1366×768 | 中文 |
| --- | --- | --- | --- |
| opening | [截图](1600x900-opening.png) | [截图](1366x768-opening.png) | [截图](zh-opening.png) |
| assets | [截图](1600x900-assets.png) | [截图](1366x768-assets.png) | [截图](zh-assets.png) |
| draft | [截图](1600x900-draft.png) | [截图](1366x768-draft.png) | [截图](zh-draft.png) |
| evidence | [截图](1600x900-evidence.png) | [截图](1366x768-evidence.png) | [截图](zh-evidence.png) |
| targets | [截图](1600x900-targets.png) | [截图](1366x768-targets.png) | [截图](zh-targets.png) |
| repair | [截图](1600x900-repair.png) | [截图](1366x768-repair.png) | [截图](zh-repair.png) |
| editable | [截图](1600x900-editable.png) | [截图](1366x768-editable.png) | [截图](zh-editable.png) |

[六段过渡录像](architecture-transitions.webm) · [离线编辑](offline-edit.png) · [浏览器缩放](zoom-125.png) · [实际导出的 SVG](FigFox-sample-0032-edited.svg)

此前 V2 的 39 组产品回归结果保留在 [历史报告](../figfox-presentation-visual-v2/README.md)，未冒充本次重跑结果。本次变更限于演示功能；macOS 与实际讲台电脑仍待实机检查。
