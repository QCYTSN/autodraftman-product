# FigFox Frontend

FigFox 的中英双语展示页和产品界面。静态发布版本可直接使用本地 SVG 编辑器；账户、订阅和生成服务尚未在公网部署。

## 本地运行

```powershell
Set-Location D:\Github_Ku\autodraftman-product\frontend
npm ci
npm run dev
```

默认地址为 `http://127.0.0.1:5173`。未配置 `VITE_API_URL` 时不请求 API，也不创建假游客身份或显示虚构额度。接入开发后端的方法见仓库根目录说明。

## 页面与行为

- `/`：独立展示页，包含可编辑 SVG、原图对照、方法图和实验展示位置。
- `/pricing`：保留 Sketch、Folio、Atlas 的名称、原图标和原有价格；月付／年付切换、方案比较及常见问题可用。价格为方案预览，未接入订阅或支付。
- `/docs`：六节操作指南与常见问题，目录跟随滚动更新。可一键打开真实实验示例，练习修改、导出和重新打开。
- `/workspace`：新任务默认「图片转 SVG」，也可切换「文生图」。任务类型、文字和原图可在当前浏览器恢复；原图 Blob 使用独立 IndexedDB，任务元信息不进入后端 DTO。「我的 SVG」拥有独立标题和文档操作，支持缩略图、搜索、导入、新建、示例、改名、下载和删除。生成与重建服务仍未开放。
- `/editor`：沿用 SVG-Edit 与现有 FigFox 工具栏。支持元素编辑、撤销／重做及实际 SVG 导出；IndexedDB 分别保存多个文档，打开后继续编辑。原有单文档记录会自动迁移，保存失败有明确状态，重要文档仍应导出保留。
- `/feedback`、`/privacy`、`/terms`、`/content-policy`：已有反馈界面与政策草稿。没有 API 时反馈不会被提交。

文件选择导入最多 5 MB、12,000 个元素；错误文件不会替换当前有效文档。本地恢复使用同一 SVG 清理与结构检查，允许编辑后的文档因嵌入图片超过导入大小。文件不会为编辑操作上传到服务器。

中文界面使用 Noto Sans SC，英文与数字使用 Google Sans Flex。导入 SVG 保留自己的字体设置；缺失字体可能由浏览器替代。

展示页保留紫色弹性指针。工作台、文档列表、编辑器、指南、定价及产品表单统一使用系统指针。触控、减少动态效果及高对比度模式继续使用原生指针。

展示素材来自同级 `FigFox-926` 的明确清单，复制到 `public/assets/demo/cases/`，不运行生成内核。开发和正式构建使用同一套素材，包括三组可编辑案例、技术局部、修复对照和六张原图。清单记录文件校验值；回执仅保留界面显示字段。缺少评测数据的四张图表为白底「占位」。

## 检查

```powershell
npm run build:pages
npm run review:quality
npm run review:product
npm run review:documents
npm run review:showcase
npm run review:cursor
npm run review:pages
```

`review:quality` 会临时启动服务，检查十个路由、中英两种语言和七种屏幕宽度。`review:product` 默认使用已经运行的 `http://127.0.0.1:5173`；可用 `AUDIT_BASE_URL` 指向带 `/figfox` 子路径的构建预览。

产品检查验证真实编辑、撤销重做、导出内容、本地恢复、存储失败、无 API 时的界面行为及手机弹窗操作。多文档检查进一步验证独立保存、改名、搜索、删除和示例入口。展示检查核对全部章节、交互和素材清单，防止正式版漏掉开发版内容。指针检查覆盖页面切换、实际 SVG 编辑和拖动、输入与弹窗、触控及系统偏好回退。`review:pages` 自行启动并关闭 4175 端口的构建预览，运行页面、产品、工作台、文档、展示、指针、公开发布边界和编辑器保存检查。

本轮任务状态与编辑流程的补充检查使用 `npm run review:workspace-state` 和 `npm run review:editor-workflow`，覆盖图片关联与恢复、存储失败、任务类型兼容、IME、属性精度、复杂 SVG 往返及保存反馈。与 `review:editor-selection`、`review:editor-layout` 一样，需要先运行预览服务，例如 `npm run preview -- --port 4175 --base /figfox/`，并设置 `$env:AUDIT_BASE_URL='http://127.0.0.1:4175/figfox'`。截图与报告保存在忽略提交的 `.review/`。

`npm run review:workspace-remote` 自行启动并关闭 4177 端口的开发服务，拦截全部 API 请求，验证远端 ID 迁移、慢速创建期间继续输入及本地字段不进入请求。它不连接真实后端或模型服务。

发布流程见 [部署说明](../deploy/README.md)，设计记录见 [产品界面记录](../docs/figfox-product-surface-2026-10-04.md) 和 [展示页记录](../docs/research/figfox-demo-design-2026-10-03.md)。
