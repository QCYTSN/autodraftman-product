# FigFox 展示页桌面完善 · 2026-11-04

本轮保留现有白底紫色设计、原始实验评分与部署流程，完善比较状态、案例观察点和桌面阅读布局。

## 实际改动

- 消融摘要随指标更新，区分改善、持平、三配置同分与下降；判断使用未舍入数值。无 SAM 对照显示自己的配置，不再暗示与 A/C 共用初稿。
- 质量与费用图以 FigFox 为固定基准，点击三个基线会同步切换右侧对照。点击 FigFox 保留已选基线。费用差按对照费用计算，AutoFigure 的费用更低时明确显示 FigFox 的费用更高。
- 三个亮点保留 FigFox 分数，补充本项最高的方法名称与得分，包含并列。完整比较入口会选中对应指标类别并定位高亮行。排名分布与“相差不超过 5 分”说明放在详情中。
- 比较窗口采用 200px 原图侧栏和四方法 2×2 总览，桌面首屏显示四家输出。两方法模式保留同步缩放、平移、重置，原图可独立放大。消融只提供 A/B/C。单次判断显示通过、未通过、待核实或不适用，计数和原始证据按需展开。
- 六个重点指标配置适用的真实案例和可关闭的观察区域。窗口提供放大观察点、隐藏标注和恢复全图；未标定的方法保持全图参照。没有修改图像或原始 SVG。
- 公式、连接汇合和标题布局的修复对照新增可点击短标签。保持原图、初稿与修复结果的对应范围，以及进入可编辑案例和返回说明的入口。
- 统一中英文标题、正文、导航和桌面节奏。保留指标定义和机制内部入口。修复减少动态效果模式下仍有平滑滚动的问题。

## 桌面对比截图

| 区域 | 优化前 | 优化后 |
| --- | --- | --- |
| 1280×720 比较窗口 | [原图占据上方，输出落到下方](desktop-refinement-2026-11-04/inspector-before-1280.png) | [原图侧栏与四方法首屏总览](desktop-refinement-2026-11-04/inspector-after-1280.png) |
| 1440×900 费用区 | [点击 AutoFigure 后仍比较 DrawAI](desktop-refinement-2026-11-04/cost-before-1440.png) | [对照对象、得分与费用同步更新](desktop-refinement-2026-11-04/cost-after-1440.png) |

## 主要实现与数据来源

组件位于 `frontend/src/features/demo/`：

- `research/Results.tsx`、`Comparisons.tsx`、`QualityCostPlot.tsx`、`display.ts`：动态摘要、最高分、定位与费用联动。
- `research/SampleBrowser.tsx`、`ArtifactPreview.tsx`、`sample-browser.css`、`ResearchContext.tsx`：总览/双方法模式、观察标注、深链接与加载状态。
- `RefinementSection.tsx`、`FigFoxDemoPage.tsx`、`MechanismSection.tsx`：修复标签、双语文案与导航。
- `frontend/scripts/research-examples.json`：可重复生成的案例与逐方法归一化区域映射；D13 同时记录已核对的原生文字对象 ID。
- `frontend/scripts/research_examples.py`：校验案例属于各实验自己的有效集合，验证区域和对象 ID，发布 `example-observations.json`。完整导出器 `export-research.py` 同样调用它，避免下次导出覆盖案例选择。

| 指标 | 案例 | 观察点 |
| --- | --- | --- |
| D01 | sample-0061 | SQL 关键字间隔与 JOIN 字段 |
| D02 | sample-0057 | 起点 x 的上划线和速度公式 |
| D05 | sample-0001 | 特征点接入全局池化的路径 |
| D08 | sample-0027 | 道路图与下方模块的相对布局 |
| D11 | sample-0058 | Transformer 右侧第四个文字令牌的配色 |
| D13 | sample-0033 | Train、Encoder 的原生文字对象 |

案例均已检查原图、产物预览及对应评价。每条分别验证四方法和消融的有效集合。B 的局部位置未单独标定，放大观察点时保持 B 全图参照；不套用 A/C 的坐标。

## 验证

发布子路径：`/figfox/`。使用已安装 Chrome 和 Playwright 实际检查：

- `npm run build:pages`：通过。保留既有大包体积提示；没有新增依赖。
- `npm run review:research`：真实数据、68 个单元格、动效插值、快速切换、配置对照、资源记录、编辑与下载。
- `npm run review:showcase`：8 组展示页检查、21 个已发布案例资源的哈希、拖动/编辑/重置/下载、流程与局部对照。
- `node scripts/research-refinement-check.mjs`：摘要分支、小差异、相对费用、单次/多次判断、12 条观察映射、三基线联动、六指标观察点、完整比较定位、修复标签；中英文 1440×900、1280×720、1920×1080 的四图首屏、导航、焦点和阅读位置恢复。
- `node scripts/research-loading-check.mjs`：首次加载保持精简，快速切换取消旧请求并复用缓存，证据按需加载；AutoFigure 预览、损坏原件的原始哈希下载、关闭恢复位置和路由返回。
- `node scripts/showcase-motion-check.mjs`：延迟加载后的整页渐入、交互位置稳定、费用轴方向、中英文桌面及实时减少动态效果设置。
- `node scripts/verify-pages.mjs`：11 个页面路由均返回 200，无横向溢出或资源错误。
- 手机仅在 390px 做已有页面布局和产品入口的快速回归，没有新增手机布局或测试矩阵。

测试记录和额外桌面截图保存在 `frontend/.review/desktop-refinement/`；该目录为本机验收产物，不参与网页构建。

## 数据完整性与发布

以提交 `0e64f10acff9b43128988fbce126ad7b537e8959` 为本轮基线，逐项比较四方法评分、消融评分、资源统计、指标定义、方法信息与来源版本，完全一致。另核对 1,234 个既有研究/案例资源：原始 SVG、预览、有效样本集合和评价证据未改变；6 个 CSV 按 Git 的工作区换行规则比较，内容一致。详见 [核对记录](desktop-refinement-2026-11-04/data-integrity.json)。

研究数据只更新 `summary.examples`，新增独立的观察点映射。没有运行评分模型、付费 API 或新的实验。

本机预览：在 `frontend` 执行 `npm run preview -- --port 4175`，打开 `http://127.0.0.1:4175/figfox/`。线上沿用 `deploy/publish-pages.mjs <完整源码提交 SHA>`，由 Pages 仓库重建该源码提交，发布后以线上 `_release.json` 核对版本。
