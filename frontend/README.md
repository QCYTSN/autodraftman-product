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

- `/`：独立展示页，包含可编辑 SVG、原图对照、方法图和实验展示位置。紫色指针只用于展示页；编辑、拖拽、文本选择、触控、减少动态效果及高对比度模式使用原生指针。
- `/pricing`：保留 Sketch、Folio、Atlas 的名称、原图标和原有价格；月付／年付切换、方案比较及常见问题可用。价格为方案预览，未接入订阅或支付。
- `/docs`：六节操作指南，目录跟随滚动更新，包含文件导入、元素编辑、导出、本地保存和当前服务状态。
- `/workspace`：草稿列表、改名、删除、快速切换保存、参考图本地预览及 SVG 编辑器入口。文生图与图转 SVG 的生成按钮明确标为尚未开放。
- `/editor`：沿用 SVG-Edit 与现有 FigFox 工具栏。支持导入、空白画布、元素编辑、撤销／重做及实际 SVG 导出；IndexedDB 保存最近一个文档，支持返回页面和刷新恢复。保存失败有明确状态，重要文档仍应导出保留。
- `/feedback`、`/privacy`、`/terms`、`/content-policy`：已有反馈界面与政策草稿。没有 API 时反馈不会被提交。

文件选择导入最多 5 MB、12,000 个元素；错误文件不会替换当前有效文档。本地恢复使用同一 SVG 清理与结构检查，允许编辑后的文档因嵌入图片超过导入大小。文件不会为编辑操作上传到服务器。

中文界面使用 Noto Sans SC，英文与数字使用 Google Sans Flex。导入 SVG 保留自己的字体设置；缺失字体可能由浏览器替代。

开发服务只从同级 `FigFox-926` 的明确清单读取实验案例，不运行生成内核。研究图片和输出不会进入生产构建。正式展示页中缺少实验数据的图表为白底「占位」。

## 检查

```powershell
npm run build:pages
npm run review:quality
npm run review:product
npm run review:pages
```

`review:quality` 会临时启动服务，检查十个路由、中英两种语言和七种屏幕宽度。`review:product` 默认使用已经运行的 `http://127.0.0.1:5173`；可用 `AUDIT_BASE_URL` 指向带 `/figfox` 子路径的构建预览。

产品检查验证真实编辑、撤销重做、导出内容、本地恢复、存储失败、无 API 时的界面行为及手机弹窗操作。截图与报告位于忽略提交的 `.review/product/`。

发布流程见 [部署说明](../deploy/README.md)，设计记录见 [产品界面记录](../docs/figfox-product-surface-2026-10-04.md) 和 [展示页记录](../docs/research/figfox-demo-design-2026-10-03.md)。
