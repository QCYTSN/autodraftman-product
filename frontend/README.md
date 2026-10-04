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
- `/workspace`：「我的 SVG」提供缩略图、搜索、导入、新建、示例、改名、下载和删除。描述草稿独立保存在历史记录中；上传原图后可切换预览与文档列表。生成与重建按钮明确标为尚未开放。
- `/editor`：沿用 SVG-Edit 与现有 FigFox 工具栏。支持元素编辑、撤销／重做及实际 SVG 导出；IndexedDB 分别保存多个文档，打开后继续编辑。原有单文档记录会自动迁移，保存失败有明确状态，重要文档仍应导出保留。
- `/feedback`、`/privacy`、`/terms`、`/content-policy`：已有反馈界面与政策草稿。没有 API 时反馈不会被提交。

文件选择导入最多 5 MB、12,000 个元素；错误文件不会替换当前有效文档。本地恢复使用同一 SVG 清理与结构检查，允许编辑后的文档因嵌入图片超过导入大小。文件不会为编辑操作上传到服务器。

中文界面使用 Noto Sans SC，英文与数字使用 Google Sans Flex。导入 SVG 保留自己的字体设置；缺失字体可能由浏览器替代。

展示页、指南、定价和工作台共用紫色弹性指针，跨页面切换保留同一组件。输入框、滑块、文本选择、弹窗和 SVG 编辑区域使用原生操作光标；编辑器顶部导航保留品牌指针。触控、减少动态效果及高对比度模式自动使用原生指针。

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

产品检查验证真实编辑、撤销重做、导出内容、本地恢复、存储失败、无 API 时的界面行为及手机弹窗操作。多文档检查进一步验证独立保存、改名、搜索、删除和示例入口。展示检查核对全部章节、交互和素材清单，防止正式版漏掉开发版内容。指针检查覆盖页面切换、实际 SVG 编辑和拖动、输入与弹窗、触控及系统偏好回退。`review:pages` 在正式构建的 `/figfox/` 子路径运行这四组操作检查。截图与报告保存在忽略提交的 `.review/`。

发布流程见 [部署说明](../deploy/README.md)，设计记录见 [产品界面记录](../docs/figfox-product-surface-2026-10-04.md) 和 [展示页记录](../docs/research/figfox-demo-design-2026-10-03.md)。
