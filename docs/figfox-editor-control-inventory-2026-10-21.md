# SVG-Edit 原生控件入口清单（复查）

当前 A1–A6、B1–B5 修复与统一 UI 状态见 [接入修复记录](figfox-editor-parity-repairs-2026-10-21.md)。下表保留历史映射，不能作为当前端到端验收清单。

最新组件内部功能、保存流程和状态复查见 [完整性扩展复查](figfox-editor-full-parity-audit-2026-10-21.md)。本表不覆盖颜色组件内部等细项，不能作为完整接入证明。

此表是修复前 d990261 的静态映射；后续功能修复见[修复记录](figfox-editor-reliability-fixes-2026-10-21.md)，不应把本表的历史缺陷说明当作最新状态。

后续布局、字体、虚线、状态反馈、网址图片和导出质量入口见 [UI 更新记录](figfox-editor-layout-2026-10-21.md)。

基线：FigFox d990261，安装的 svgedit 7.4.2。共提取 178 个具名控件/选项；同一动作可能有多个入口，数量不是功能数。

本表逐项记录原生面板、对话框、菜单和默认绘图扩展的静态映射，不是端到端通过清单。颜色选择器等 Web Component 内部控件、全部快捷键组合、可选扩展、各种 SVG 特性组合不在本清单穷举范围；实际复现结果见同日复查报告。默认 storage 由应用草稿存储替代，未逐项证明语义等价。

| 原生控件 | 原生源文件:行 | FigFox 入口/差异 |
| --- | --- | --- |
| `tool_select` | `panels/LeftPanel.html:2` | FigFox 主工具栏或更多绘图工具 |
| `tool_zoom` | `panels/LeftPanel.html:3` | FigFox 主工具栏或更多绘图工具 |
| `tool_fhpath` | `panels/LeftPanel.html:4` | FigFox 主工具栏或更多绘图工具 |
| `tool_line` | `panels/LeftPanel.html:5` | FigFox 主工具栏或更多绘图工具 |
| `tool_path` | `panels/LeftPanel.html:6` | FigFox 主工具栏或更多绘图工具 |
| `tool_rect` | `panels/LeftPanel.html:8` | FigFox 主工具栏或更多绘图工具 |
| `tool_square` | `panels/LeftPanel.html:9` | FigFox 主工具栏或更多绘图工具 |
| `tool_fhrect` | `panels/LeftPanel.html:10` | FigFox 主工具栏或更多绘图工具 |
| `tool_ellipse` | `panels/LeftPanel.html:13` | FigFox 主工具栏或更多绘图工具 |
| `tool_circle` | `panels/LeftPanel.html:14` | FigFox 主工具栏或更多绘图工具 |
| `tool_fhellipse` | `panels/LeftPanel.html:15` | FigFox 主工具栏或更多绘图工具 |
| `tool_text` | `panels/LeftPanel.html:17` | FigFox 主工具栏或更多绘图工具 |
| `tool_image` | `panels/LeftPanel.html:18` | FigFox 主工具栏或更多绘图工具 |
| `tool_source` | `panels/TopPanel.html:7` | FigFox 编辑/视图菜单 |
| `tool_wireframe` | `panels/TopPanel.html:8` | FigFox 编辑/视图菜单 |
| `tool_undo` | `panels/TopPanel.html:12` | FigFox 编辑菜单或属性面板 |
| `tool_redo` | `panels/TopPanel.html:13` | FigFox 编辑菜单或属性面板 |
| `tool_clone` | `panels/TopPanel.html:18` | FigFox 编辑菜单或属性面板 |
| `tool_delete` | `panels/TopPanel.html:19` | FigFox 编辑菜单或属性面板 |
| `tool_move_top` | `panels/TopPanel.html:23` | FigFox 排列菜单 |
| `tool_move_bottom` | `panels/TopPanel.html:24` | FigFox 排列菜单 |
| `tool_topath` | `panels/TopPanel.html:28` | FigFox 编辑菜单或属性面板 |
| `tool_reorient` | `panels/TopPanel.html:29` | FigFox 编辑菜单或属性面板 |
| `tool_make_link` | `panels/TopPanel.html:30` | FigFox 编辑菜单或属性面板 |
| `tool_flip_h` | `panels/TopPanel.html:32` | FigFox 编辑菜单或属性面板 |
| `tool_flip_v` | `panels/TopPanel.html:33` | FigFox 编辑菜单或属性面板 |
| `elem_id` | `panels/TopPanel.html:37` | FigFox 属性面板的几何/对象属性/名称与链接 |
| `elem_class` | `panels/TopPanel.html:40` | FigFox 属性面板的几何/对象属性/名称与链接 |
| `angle` | `panels/TopPanel.html:42` | FigFox 属性面板的几何/对象属性/名称与链接 |
| `blur` | `panels/TopPanel.html:44` | FigFox 属性面板的几何/对象属性/名称与链接 |
| `tool_position` | `panels/TopPanel.html:45` | FigFox 排列菜单 |
| `tool_posleft` | `panels/TopPanel.html:46` | FigFox 排列菜单 |
| `tool_poscenter` | `panels/TopPanel.html:48` | FigFox 排列菜单 |
| `tool_posright` | `panels/TopPanel.html:50` | FigFox 排列菜单 |
| `tool_postop` | `panels/TopPanel.html:52` | FigFox 排列菜单 |
| `tool_posmiddle` | `panels/TopPanel.html:54` | FigFox 排列菜单 |
| `tool_posbottom` | `panels/TopPanel.html:56` | FigFox 排列菜单 |
| `tool_poshoriz` | `panels/TopPanel.html:58` | FigFox 排列菜单 |
| `tool_posverti` | `panels/TopPanel.html:60` | FigFox 排列菜单 |
| `selected_x` | `panels/TopPanel.html:65` | FigFox 属性面板的几何/对象属性/名称与链接 |
| `selected_y` | `panels/TopPanel.html:68` | FigFox 属性面板的几何/对象属性/名称与链接 |
| `tool_clone_multi` | `panels/TopPanel.html:75` | FigFox 编辑菜单或属性面板 |
| `tool_delete_multi` | `panels/TopPanel.html:76` | FigFox 编辑菜单或属性面板 |
| `tool_group_elements` | `panels/TopPanel.html:80` | FigFox 编辑菜单或属性面板 |
| `tool_make_link_multi` | `panels/TopPanel.html:82` | FigFox 编辑菜单或属性面板 |
| `tool_align_left` | `panels/TopPanel.html:83` | FigFox 排列菜单 |
| `tool_align_center` | `panels/TopPanel.html:84` | FigFox 排列菜单 |
| `tool_align_right` | `panels/TopPanel.html:85` | FigFox 排列菜单 |
| `tool_align_top` | `panels/TopPanel.html:86` | FigFox 排列菜单 |
| `tool_align_middle` | `panels/TopPanel.html:87` | FigFox 排列菜单 |
| `tool_align_bottom` | `panels/TopPanel.html:88` | FigFox 排列菜单 |
| `tool_align_distrib_horiz` | `panels/TopPanel.html:89` | FigFox 排列菜单 |
| `tool_align_distrib_verti` | `panels/TopPanel.html:91` | FigFox 排列菜单 |
| `tool_align_relative` | `panels/TopPanel.html:93` | FigFox 排列菜单 |
| `rect_width` | `panels/TopPanel.html:100` | FigFox 属性面板的几何/对象属性/名称与链接 |
| `rect_height` | `panels/TopPanel.html:102` | FigFox 属性面板的几何/对象属性/名称与链接 |
| `rect_rx` | `panels/TopPanel.html:104` | FigFox 属性面板的几何/对象属性/名称与链接 |
| `image_width` | `panels/TopPanel.html:108` | FigFox 属性面板的几何/对象属性/名称与链接 |
| `image_height` | `panels/TopPanel.html:110` | FigFox 属性面板的几何/对象属性/名称与链接 |
| `image_url` | `panels/TopPanel.html:114` | FigFox 提供本地替换；URL 输入只在原生布局 |
| `circle_cx` | `panels/TopPanel.html:117` | FigFox 属性面板的几何/对象属性/名称与链接 |
| `circle_cy` | `panels/TopPanel.html:118` | FigFox 属性面板的几何/对象属性/名称与链接 |
| `circle_r` | `panels/TopPanel.html:121` | FigFox 属性面板的几何/对象属性/名称与链接 |
| `ellipse_cx` | `panels/TopPanel.html:124` | FigFox 属性面板的几何/对象属性/名称与链接 |
| `ellipse_cy` | `panels/TopPanel.html:126` | FigFox 属性面板的几何/对象属性/名称与链接 |
| `ellipse_rx` | `panels/TopPanel.html:130` | FigFox 属性面板的几何/对象属性/名称与链接 |
| `ellipse_ry` | `panels/TopPanel.html:132` | FigFox 属性面板的几何/对象属性/名称与链接 |
| `line_x1` | `panels/TopPanel.html:136` | FigFox 属性面板的几何/对象属性/名称与链接 |
| `line_y1` | `panels/TopPanel.html:138` | FigFox 属性面板的几何/对象属性/名称与链接 |
| `line_x2` | `panels/TopPanel.html:140` | FigFox 属性面板的几何/对象属性/名称与链接 |
| `line_y2` | `panels/TopPanel.html:142` | FigFox 属性面板的几何/对象属性/名称与链接 |
| `tool_bold` | `panels/TopPanel.html:147` | 按钮选中状态未识别计算样式 700 |
| `tool_italic` | `panels/TopPanel.html:148` | FigFox 属性面板的文字/文字间距 |
| `tool_text_decoration_underline` | `panels/TopPanel.html:149` | FigFox 属性面板的文字/文字间距 |
| `tool_text_decoration_linethrough` | `panels/TopPanel.html:151` | FigFox 属性面板的文字/文字间距 |
| `tool_text_decoration_overline` | `panels/TopPanel.html:153` | FigFox 属性面板的文字/文字间距 |
| `tool_font_family` | `panels/TopPanel.html:157` | 缺少原生 Cursive/Fantasy/Courier/Times 等可选项 |
| `font_size` | `panels/TopPanel.html:160` | FigFox 属性面板的文字/文字间距 |
| `tool_text_anchor` | `panels/TopPanel.html:164` | FigFox 属性面板的文字/文字间距 |
| `tool_text_anchor_start` | `panels/TopPanel.html:165` | FigFox 属性面板的文字/文字间距 |
| `tool_text_anchor_middle` | `panels/TopPanel.html:167` | FigFox 属性面板的文字/文字间距 |
| `tool_text_anchor_end` | `panels/TopPanel.html:169` | FigFox 属性面板的文字/文字间距 |
| `tool_letter_spacing` | `panels/TopPanel.html:174` | FigFox 属性面板的文字/文字间距 |
| `tool_word_spacing` | `panels/TopPanel.html:178` | FigFox 属性面板的文字/文字间距 |
| `tool_text_length` | `panels/TopPanel.html:182` | FigFox 属性面板的文字/文字间距 |
| `tool_length_adjust` | `panels/TopPanel.html:186` | FigFox 属性面板的文字/文字间距 |
| `text` | `panels/TopPanel.html:191` | FigFox 属性面板的文字/文字间距 |
| `g_title` | `panels/TopPanel.html:194` | FigFox 属性面板的几何/对象属性/名称与链接 |
| `tool_unlink_use` | `panels/TopPanel.html:197` | FigFox 编辑菜单或属性面板 |
| `tool_ungroup` | `panels/TopPanel.html:200` | FigFox 编辑菜单或属性面板 |
| `link_url` | `panels/TopPanel.html:206` | FigFox 属性面板的几何/对象属性/名称与链接 |
| `tool_node_link` | `panels/TopPanel.html:211` | FigFox 属性面板的路径/节点参数 |
| `path_node_x` | `panels/TopPanel.html:213` | FigFox 属性面板的路径/节点参数 |
| `path_node_y` | `panels/TopPanel.html:215` | FigFox 属性面板的路径/节点参数 |
| `seg_type` | `panels/TopPanel.html:217` | FigFox 属性面板的路径/节点参数 |
| `tool_node_clone` | `panels/TopPanel.html:219` | FigFox 属性面板的路径/节点参数 |
| `tool_node_delete` | `panels/TopPanel.html:220` | FigFox 属性面板的路径/节点参数 |
| `tool_openclose_path` | `panels/TopPanel.html:221` | FigFox 属性面板的路径/节点参数 |
| `tool_add_subpath` | `panels/TopPanel.html:222` | FigFox 属性面板的路径/节点参数 |
| `zoom` | `panels/BottomPanel.html:3` | FigFox 填充/描边/透明度/缩放；颜色预设由自定义颜色入口覆盖 |
| `fill_color` | `panels/BottomPanel.html:15` | FigFox 填充/描边/透明度/缩放；颜色预设由自定义颜色入口覆盖 |
| `stroke_color` | `panels/BottomPanel.html:16` | FigFox 填充/描边/透明度/缩放；颜色预设由自定义颜色入口覆盖 |
| `stroke_width` | `panels/BottomPanel.html:17` | FigFox 最大 64；原生最大 99；输入和实际值可不一致 |
| `stroke_style` | `panels/BottomPanel.html:18` | 缺少两种原生预设，已有虚线误显示为实线 |
| `stroke_linejoin` | `panels/BottomPanel.html:22` | FigFox 填充/描边/透明度/缩放；颜色预设由自定义颜色入口覆盖 |
| `linejoin_miter` | `panels/BottomPanel.html:23` | FigFox 填充/描边/透明度/缩放；颜色预设由自定义颜色入口覆盖 |
| `linejoin_round` | `panels/BottomPanel.html:24` | FigFox 填充/描边/透明度/缩放；颜色预设由自定义颜色入口覆盖 |
| `linejoin_bevel` | `panels/BottomPanel.html:25` | FigFox 填充/描边/透明度/缩放；颜色预设由自定义颜色入口覆盖 |
| `stroke_linecap` | `panels/BottomPanel.html:27` | FigFox 填充/描边/透明度/缩放；颜色预设由自定义颜色入口覆盖 |
| `linecap_butt` | `panels/BottomPanel.html:28` | FigFox 填充/描边/透明度/缩放；颜色预设由自定义颜色入口覆盖 |
| `linecap_square` | `panels/BottomPanel.html:29` | FigFox 填充/描边/透明度/缩放；颜色预设由自定义颜色入口覆盖 |
| `linecap_round` | `panels/BottomPanel.html:30` | FigFox 填充/描边/透明度/缩放；颜色预设由自定义颜色入口覆盖 |
| `opacity` | `panels/BottomPanel.html:32` | FigFox 填充/描边/透明度/缩放；颜色预设由自定义颜色入口覆盖 |
| `palette` | `panels/BottomPanel.html:33` | FigFox 填充/描边/透明度/缩放；颜色预设由自定义颜色入口覆盖 |
| `layer_new` | `panels/LayersPanel.html:7` | FigFox 图层面板；上下文操作由图层按钮替代 |
| `layer_delete` | `panels/LayersPanel.html:8` | FigFox 图层面板；上下文操作由图层按钮替代 |
| `layer_rename` | `panels/LayersPanel.html:9` | FigFox 图层面板；上下文操作由图层按钮替代 |
| `layer_up` | `panels/LayersPanel.html:10` | FigFox 图层面板；上下文操作由图层按钮替代 |
| `layer_down` | `panels/LayersPanel.html:11` | FigFox 图层面板；上下文操作由图层按钮替代 |
| `layer_moreopts` | `panels/LayersPanel.html:12` | FigFox 图层面板；上下文操作由图层按钮替代 |
| `selLayerNames` | `panels/LayersPanel.html:21` | FigFox 图层面板；上下文操作由图层按钮替代 |
| `tool_export` | `MainMenu.js:230` | FigFox 页面面板及原生菜单 |
| `tool_docprops` | `MainMenu.js:231` | FigFox 页面面板及原生菜单 |
| `tool_editor_prefs` | `MainMenu.js:232` | FigFox 页面面板及原生菜单 |
| `tool_editor_homepage` | `MainMenu.js:233` | 仅原生布局主页链接 |
| `tool_docprops_save` | `dialogs/imagePropertiesDialog.html:70` | 原生文档属性对话框 |
| `tool_docprops_cancel` | `dialogs/imagePropertiesDialog.html:71` | 原生文档属性对话框 |
| `canvas_title` | `dialogs/imagePropertiesDialog.html:77` | FigFox 页面面板和原生文档属性均有入口 |
| `canvas_width` | `dialogs/imagePropertiesDialog.html:83` | FigFox 页面面板和原生文档属性均有入口 |
| `canvas_height` | `dialogs/imagePropertiesDialog.html:87` | FigFox 页面面板和原生文档属性均有入口 |
| `resolution` | `dialogs/imagePropertiesDialog.html:90` | 原生文档属性对话框 |
| `image_embed` | `dialogs/imagePropertiesDialog.html:104` | 原生文档属性入口保留；FigFox 快照是否遵守嵌入选项待验证 |
| `image_ref` | `dialogs/imagePropertiesDialog.html:108` | 原生文档属性入口保留；FigFox 快照是否遵守引用选项待验证 |
| `tool_prefs_save` | `dialogs/editorPreferencesDialog.html:162` | 原生偏好设置对话框 |
| `tool_prefs_cancel` | `dialogs/editorPreferencesDialog.html:163` | 原生偏好设置对话框 |
| `lang_select` | `dialogs/editorPreferencesDialog.html:169` | 原生偏好设置对话框 |
| `canvas_bg_url` | `dialogs/editorPreferencesDialog.html:200` | 原生偏好设置对话框 |
| `grid_snapping_on` | `dialogs/editorPreferencesDialog.html:208` | FigFox 页面面板和原生设置均有入口 |
| `grid_snapping_step` | `dialogs/editorPreferencesDialog.html:212` | FigFox 页面面板和原生设置均有入口 |
| `grid_color` | `dialogs/editorPreferencesDialog.html:216` | 原生偏好设置对话框 |
| `show_rulers` | `dialogs/editorPreferencesDialog.html:223` | FigFox 页面面板和原生设置均有入口 |
| `base_unit` | `dialogs/editorPreferencesDialog.html:227` | FigFox 缺 em/ex；原生设置后导出换算有误 |
| `se-storage-pref` | `dialogs/exportDialog.html:60` | FigFox 图片/PDF 导出；原生对话框另有入口 |
| `se-quality` | `dialogs/exportDialog.html:61` | 只在原生导出对话框提供质量控制 |
| `export_ok` | `dialogs/exportDialog.html:64` | FigFox 图片/PDF 导出；原生对话框另有入口 |
| `export_cancel` | `dialogs/exportDialog.html:65` | FigFox 图片/PDF 导出；原生对话框另有入口 |
| `se-cut` | `dialogs/cmenuDialog.html:68` | FigFox 编辑/排列菜单及原生上下文菜单 |
| `se-copy` | `dialogs/cmenuDialog.html:73` | FigFox 编辑/排列菜单及原生上下文菜单 |
| `se-paste` | `dialogs/cmenuDialog.html:78` | FigFox 编辑/排列菜单及原生上下文菜单 |
| `se-paste-in-place` | `dialogs/cmenuDialog.html:81` | FigFox 编辑/排列菜单及原生上下文菜单 |
| `se-delete` | `dialogs/cmenuDialog.html:84` | FigFox 编辑/排列菜单及原生上下文菜单 |
| `se-group` | `dialogs/cmenuDialog.html:89` | FigFox 编辑/排列菜单及原生上下文菜单 |
| `se-ungroup` | `dialogs/cmenuDialog.html:94` | FigFox 编辑/排列菜单及原生上下文菜单 |
| `se-move-front` | `dialogs/cmenuDialog.html:99` | FigFox 编辑/排列菜单及原生上下文菜单 |
| `se-move-up` | `dialogs/cmenuDialog.html:104` | FigFox 编辑/排列菜单及原生上下文菜单 |
| `se-move-down` | `dialogs/cmenuDialog.html:109` | FigFox 编辑/排列菜单及原生上下文菜单 |
| `se-move-back` | `dialogs/cmenuDialog.html:114` | FigFox 编辑/排列菜单及原生上下文菜单 |
| `se-dupe` | `dialogs/cmenuLayersDialog.html:67` | FigFox 图层面板；上下文操作由图层按钮替代 |
| `se-layer-delete` | `dialogs/cmenuLayersDialog.html:68` | FigFox 图层面板；上下文操作由图层按钮替代 |
| `se-merge-down` | `dialogs/cmenuLayersDialog.html:69` | FigFox 图层面板；上下文操作由图层按钮替代 |
| `se-merge-all` | `dialogs/cmenuLayersDialog.html:70` | FigFox 图层面板；上下文操作由图层按钮替代 |
| `tool_connect` | `extensions/ext-connector/ext-connector.js:401` | FigFox 工具/视图/图层入口；原生扩展已加载 |
| `tool_eyedropper` | `extensions/ext-eyedropper/ext-eyedropper.js:106` | FigFox 工具/视图/图层入口；原生扩展已加载 |
| `view_grid` | `extensions/ext-grid/ext-grid.js:165` | FigFox 工具/视图/图层入口；原生扩展已加载 |
| `ext-panning` | `extensions/ext-panning/ext-panning.js:46` | FigFox 工具/视图/图层入口；原生扩展已加载 |
| `tool_shapelib` | `extensions/ext-shapes/ext-shapes.js:45` | FigFox 图形库；原生扩展已加载 |
| `tool_star` | `extensions/ext-polystar/ext-polystar.js:85` | FigFox 更多绘图工具和绘图参数；数量限制 3–128，与原生不完全相同 |
| `tool_polygon` | `extensions/ext-polystar/ext-polystar.js:87` | FigFox 更多绘图工具和绘图参数；数量限制 3–128，与原生不完全相同 |
| `starNumPoints` | `extensions/ext-polystar/ext-polystar.js:119` | FigFox 更多绘图工具和绘图参数；数量限制 3–128，与原生不完全相同 |
| `RadiusMultiplier` | `extensions/ext-polystar/ext-polystar.js:121` | FigFox 更多绘图工具和绘图参数；数量限制 3–128，与原生不完全相同 |
| `radialShift` | `extensions/ext-polystar/ext-polystar.js:123` | FigFox 更多绘图工具和绘图参数；数量限制 3–128，与原生不完全相同 |
| `polySides` | `extensions/ext-polystar/ext-polystar.js:127` | FigFox 更多绘图工具和绘图参数；数量限制 3–128，与原生不完全相同 |
| `tool_clear` | `extensions/ext-opensave/ext-opensave.js:265` | 未加载该扩展；新建/打开/插入由应用替代，保存为浏览器草稿+下载；文件句柄覆盖保存未接入 |
| `tool_open` | `extensions/ext-opensave/ext-opensave.js:267` | 未加载该扩展；新建/打开/插入由应用替代，保存为浏览器草稿+下载；文件句柄覆盖保存未接入 |
| `tool_save` | `extensions/ext-opensave/ext-opensave.js:269` | 未加载该扩展；新建/打开/插入由应用替代，保存为浏览器草稿+下载；文件句柄覆盖保存未接入 |
| `tool_save_as` | `extensions/ext-opensave/ext-opensave.js:271` | 未加载该扩展；新建/打开/插入由应用替代，保存为浏览器草稿+下载；文件句柄覆盖保存未接入 |
| `tool_import` | `extensions/ext-opensave/ext-opensave.js:273` | 未加载该扩展；新建/打开/插入由应用替代，保存为浏览器草稿+下载；文件句柄覆盖保存未接入 |
| `tool_layerView` | `extensions/ext-layer_view/ext-layer_view.js:79` | FigFox 工具/视图/图层入口；原生扩展已加载 |
