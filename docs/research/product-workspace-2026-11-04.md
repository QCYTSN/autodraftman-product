# FigFox 产品与工作台优化 · 2026-11-04

源码：`QCYTSN/autodraftman-product`，分支 `codex/figfox-complete-redesign`。从 `3458be3` 继续修改。本轮不执行生产发布，展示页的实验数据、内容、案例和动效保持原有设计。

## 完成的体验

- 工作台采用 232px 侧栏和 56px 顶栏，新任务默认图片转 SVG。1440×900、1366×768 的中英文默认页面均可直接看到上传入口、主动作和服务状态。已有 SVG 与真实示例可从首屏打开。
- 点击、拖放和任务输入区粘贴图片共用格式、大小与有效图片校验。预览保持原图比例，显示名称与尺寸，可替换或移除。文生图示例改为手动切换，组合输入期间不会填入或替换示例。
- 任务类型独立于参考图模式保存。旧草稿保持原来的文生图语义，新任务为图片重建；API 请求不携带本地扩展字段。远端 ID 迁移保留图片关联，慢速创建期间的修改不会被旧响应覆盖。
- 原图 Blob 使用独立的 `figfox-workspace-images` IndexedDB；文字、任务类型与关联键保存在草稿缓存中。刷新、切换、替换、移除和删除均已验证。配额失败或 Blob 丢失时保留文字和 SVG，显示具体的部分保存失败状态。
- “我的 SVG”有独立标题、搜索、导入、新建与文件列表。点击卡片继续编辑，编辑器改名保持同一个文档 ID；返回工作台时回到原任务或文档集合。
- 属性面板按对象类型排序。文字内容、字体、字号、对齐与颜色在前，位置及高级属性在后。内部 ID 降低展示层级，无选区时显示“新对象样式”。数值显示舍入不会因聚焦、失焦而改写坐标。
- 浏览器保存、原文件写回、另存为和下载有不同反馈。修复了编辑后立即返回、切换语言可能遗漏最新内容的问题。保持原编辑引擎、清理与导出链路；在既有导入适配处保留 CSS transform 及其优先级，避免把 `!important` 复制到非法 SVG 变换属性中。
- 产品区统一系统指针，指南操作入口可实际打开文档或新画布；定价优先展示免费本地编辑，保留套餐价格、权益与插图并明确方案预览。

## 主要修改位置

| 文件 | 职责 |
| --- | --- |
| `frontend/src/App.tsx`、`frontend/src/drafts.ts` | 工作台导航、任务恢复、API DTO 与本地元信息分离 |
| `frontend/src/features/product/workspaceImages.ts` | 独立图片 Blob 存储和图片尺寸校验 |
| `ProductPromptField.tsx`、`WorkspaceDocuments.tsx`、`workspace.css` | 输入、文档列表和紧凑工作台 |
| `ProductSvgEditorPage.tsx` | 文档改名、离开前保存、语言切换和文件反馈 |
| `SelectionInspector.tsx`、`EditorFields.tsx`、`editor-layout.css` | 属性排序、输入精度和响应式面板 |
| `frontend/public/svgedit/figfox-features.js` | 保留导入 SVG 的 CSS 变换语义 |
| `ProductGuidePage.tsx`、`ProductPricingPage.tsx`、`product.css` | 指南、定价和产品样式规则 |
| `frontend/scripts/*-check.mjs` | 更新旧交互预期并补充本轮存储、编辑与迁移风险检查 |

产品组件文件在 `frontend/src/features/product/`；编辑器组件文件在 `frontend/src/components/editor/`。

## 实际验证

所有命令从 `frontend/` 执行，浏览器为本机实际 Chrome，测试使用 Playwright Core。独立编辑器及工作台检查配置了 `AUDIT_BASE_URL=http://127.0.0.1:4176/figfox`；整站检查自行启动并关闭 4175 预览。

| 命令 | 结果 |
| --- | --- |
| `npm run build:pages` | 通过 TypeScript 与 Pages 构建。仍有既有的大文件分包提示，无构建错误 |
| `npm run review:pages` | 通过：页面路由/资源检查；产品 21、工作台 6、文档 12、展示 8、指针 17、公开发布边界 6、编辑器保存 3 项行为检查；错误数组为空 |
| `npm run review:editor-selection` | 11 项通过，含小文字命中、组内编辑、旋转拖动和撤销 |
| `npm run review:editor-layout` | 14 项通过，覆盖中英文桌面以及 320/390px 窄屏，布局问题和错误数组为空 |
| `npm run review:workspace-state` | 9 项通过，含旧草稿、图片刷新恢复、图片清理、局部存储失败与上下文返回 |
| `npm run review:workspace-remote` | 2 项通过，使用拦截接口验证 ID 迁移、慢响应与重复创建保护，不连接真实后端 |
| `npm run review:editor-workflow` | 6 项通过，含 IME、精度、选区、颜色/位置、撤销重做、复杂 SVG 往返与文件反馈 |
| `git diff --check` | 通过 |

复杂 SVG 验证覆盖分组、ID、transform、defs、渐变、marker、clip、mask、tspan、嵌入图片及公式源数据。已有科研示例修改后导出再打开，49 个文字元素保留。文件写回测试使用真实浏览器可写文件句柄，由测试替代文件选择器选择；没有自动操作系统原生文件选择窗口。

审查同时检查了异步状态覆盖、Blob 生命周期、任务与 SVG 数据库隔离、样式作用域和保存失败反馈。未新增依赖、模型调用、生产后端或计费流程。

## 实际页面截图

截图来自运行中的正式构建，已查看并据此修正窄屏长文件名与数值控件布局。文档列表截图等待页面过渡结束后采集。

| 页面 | 截图 |
| --- | --- |
| 默认任务，中文 1366×768 | [查看](product-workspace-2026-11-04/new-task-zh-1366.png) |
| 默认任务，英文 1366×768 | [查看](product-workspace-2026-11-04/new-task-en-1366.png) |
| 默认任务，中文 1440×900 | [查看](product-workspace-2026-11-04/new-task-zh-1440.png) |
| 上传原图后的任务，完整页面 | [查看](product-workspace-2026-11-04/uploaded-task-zh.png) |
| 我的 SVG | [查看](product-workspace-2026-11-04/documents-zh.png) |
| 文字属性，中文 1440×900 | [查看](product-workspace-2026-11-04/editor-text-zh-1440.png) |
| 文字属性，英文 1366×768 | [查看](product-workspace-2026-11-04/editor-text-en-1366.png) |
| 指南操作入口 | [查看](product-workspace-2026-11-04/docs-en.png) |
| 免费编辑与方案预览 | [查看](product-workspace-2026-11-04/pricing-zh.png) |

补充行为结果：[工作台](product-workspace-2026-11-04/workspace-checks.json)、[远端接口模拟](product-workspace-2026-11-04/remote-checks.json)、[编辑流程](product-workspace-2026-11-04/editor-checks.json)。其余可再运行的检查及本地报告保留于 `frontend/.review/`。

## 边界

生成与重建服务仍未开放；当前可用的是本地 SVG 编辑。任务及原图保存于当前浏览器，不支持跨设备同步。模拟接口检查不代表真实后端联调。用户文件须主动导出才能成为独立磁盘副本。本轮提交源代码，不触发 `deploy/publish-pages.mjs`。
