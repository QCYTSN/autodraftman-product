# FigFox Presentation Mode V2

本版把 V1 的八状态说明界面改成七状态图形舞台：opening → assets → draft → evidence → targets → repair → editable。讲解者前进六次完成主线，每次动画结束后停留。

## 基线与范围

- 基线：`4d53116669c4cc318e8a55376150e95086047d8a`，保留 `4e4ab35 → 56c9180 → 8cb533d → 4d53116` 的已核验交付历史。
- 分支：`codex/figfox-presentation-visual-v2`。
- 实现提交：`437199b`；素材引线视觉修正：`74a9c5f`。
- 规格：`FigFox_Codex_Demo_Visual_Redesign_V2.md`。
- 在仓库及上级适用目录中未发现 AGENTS.md。原有三个未跟踪宣传片目录未改动。
- 改动限定在演示场景、控制、动效、字体准备、离线打包和验收脚本。首页入口、账户、工作台、生成服务与完整编辑器沿用基线。

## 一页操作说明

启动开发预览：

~~~powershell
Set-Location D:\Github_Ku\autodraftman-product\frontend
npm ci
npm run dev
~~~

访问 [开发入口](http://127.0.0.1:5173/presentation)。图像、SVG 与字体准备完成后点击 Begin。默认英文，菜单切换中文；也可使用 `?lang=zh`。在线和离线使用相同场景组件。

独立构建、正式路径构建与检查：

~~~powershell
npm run presentation:prepare
npm run presentation:build
npm run build:pages
npm run review:presentation
~~~

正式部署参数沿用 [deploy/README.md](../deploy/README.md)。本地模拟 Pages：

~~~powershell
npm run preview -- --mode github-pages --port 5186 --strictPort
~~~

访问 [Pages 路径预览](http://127.0.0.1:5186/figfox/presentation)。正式网站路径保持 `/figfox/presentation`；公网发布仍需要现有审核与完整 SHA 发布流程，本轮未发布。

离线文件为 [FigFox-Architecture-Demo-V2.html](../frontend/presentation-dist/FigFox-Architecture-Demo-V2.html)。只复制这一文件到讲台电脑，断网后双击即可使用。旧文件名 [FigFox-Architecture-Demo.html](../frontend/presentation-dist/FigFox-Architecture-Demo.html) 提供字节一致的 V2 兼容产物。

网站构建把两个文件名同时放进 `dist/presentation-downloads/`。开发服务器支持相同下载路径。Figtree 英文字体与许可证内嵌于 HTML；中文使用设备字体回退，不依赖外部字体服务。

| 操作 | 键盘 | 鼠标入口 |
| --- | --- | --- |
| 前进 / 后退 | → / ←、PageDown / PageUp、Space 前进 | 右下箭头 |
| 开场 / 结尾 | Home / End | 左下第一 / 第七定位点 |
| 三个阶段 | 1 / 2 / 3 | 底部阶段文字 |
| 技术详情 | D | 菜单 → 技术详情 |
| 全屏 | F | 菜单 → 全屏 |
| 暂看修改前 | repair 中按住 B，松开恢复选择 | Before / After |
| 确认 / 撤销输入 | Enter / Escape | 输入旁的勾 / 叉 |
| 修改文字 / 下载 | Tab 到对应控件，再 Enter | 点击真实文字或 Edit；SVG 下载 |
| 语言、恢复案例、重置 | Tab 与 Enter 操作菜单 | 右上菜单 |

最后一幕不会自动回到开场。Home 保留已经确认的文字修改；“恢复案例”恢复原始最终 SVG 副本；“重置演示”恢复案例并回到开场。未确认输入在 Escape 或切幕时撤销。输入法组合、空格、Home/End 和方向键保留编辑语义。

## 图形与动效

内部舞台为 1600×900，整体等比缩放。采用附件的近白背景、橙色选择信号和 Figtree 排版。原固定说明栏、阶段卡片、主讲段落和舞台讲稿均已移除。

先完成 assets、evidence、editable 静态构图并检查两套截图，再实现其余场景。来源展开移动的是显示副本；证据两侧使用独立中心和相同图像单位倍率；目标边界由实际 getBBox/CTM 计算；修复使用真实前后产物交叉淡入。

原图与初稿视口保持同一 DOM 身份。向前播放指定短序列，直接跳转和反向导航到标准结束画面；新导航取消旧计时器。页面隐藏或减少动态效果时完成当前序列，返回后不补播。稳定场景没有持续装饰动画。

## 来源与编辑边界

案例仍为 sample-0001，沿用 [原 manifest](../frontend/public/assets/presentation/sample-0001/manifest.json) 和所有原资源哈希。本轮没有模型调用、SAM 重跑或实验结论修改。

- SAM 原始产物缺失：保持 `reference-crop-illustration`，舞台显示 `Crop illustration / 素材示意`。分割数量为空值。
- B1 箭头问题：保持 `F_B_pool_arrow` 与 `T_B_pooling_arrow_and_feature_container` 的对应关系。
- 主操作仍为 `green_pooling_path_left` 的 set，关联操作为 `feature_dots_top` 的 replace_svg。舞台短名为 set、replace，完整名称在详情。
- 修复比较仍为已验证的 `transaction-snapshot`。修改前快照包含先前事务上下文；完整重放 13 个操作的哈希和操作范围验证沿用 V1。
- 初稿、参考图和事务快照只读；最终文字编辑作用于演示副本中的 `plus_node_49`。导出保留原 ID、引用和未修改节点，不包含观察框。
- 模型名称、复核结论、来源哈希、ROI、全量运行数字与 Gap Guidance 状态保留在案例资料和技术详情。执行完成、视觉评价、未解决项仍分别表示。

## 讲稿、验收与设备检查

[两分钟讲稿](figfox-presentation-visual-v2-script.md) 单独保存，不回填投影舞台。

[验收报告与七状态截图、过渡录像](reviews/figfox-presentation-visual-v2/README.md) 记录实际测试环境、来源核验、文本预算和产品回归结果。

macOS 与实际讲台电脑待测。复制单 HTML，断网打开，完成七状态、三块素材、两侧完整图切换、两项操作、Before/After 与按住 B、文字确认/取消、SVG 导出重开；再检查中英文、全屏、125% 缩放与翻页器。记录系统、浏览器、字体替代和投影比例。
