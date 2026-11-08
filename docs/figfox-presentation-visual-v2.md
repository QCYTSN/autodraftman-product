# FigFox Presentation Mode V2

本版把 V1 的八状态说明界面改成七状态图形舞台：opening → assets → draft → evidence → targets → repair → editable。讲解者前进六次完成主线，每次动画结束后停留。

> 当前主讲案例已换为 sample-0032（小鸟编码与原型库）。换图基线为 `a364e80`，筛选、来源核验和新截图见 [换图交付报告](reviews/figfox-presentation-case-refresh/README.md)。

## 基线与范围

- 基线：`4d53116669c4cc318e8a55376150e95086047d8a`，保留 `4e4ab35 → 56c9180 → 8cb533d → 4d53116` 的已核验交付历史。
- 分支：`codex/figfox-presentation-visual-v2`。
- V2 实现：`437199b`；原素材引线修正：`74a9c5f`；小鸟案例与数据适配：`d918b5f`。
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

当前案例为 [sample-0032](../frontend/public/assets/presentation/sample-0032/manifest.json)，由 `public/assets/presentation/active-case.json` 指定。原 sample-0001 资源和核验历史完整保留。本轮没有模型调用、SAM 重跑或实验结论修改。

- 素材：三块真实 SAM PNG 从原始初稿的 data URI 恢复，逐字节匹配同次 G0 记录的 asset proof；舞台显示 `SAM assets / SAM 素材`。源位置经过视觉核验，未宣称是原始 SAM 边界。完整目录缺失，分割总数仍为空值。
- 主问题：A2，`F_A_hash_table_interior`，黑白单元格与圆点列被初稿改变。B2、C2 辅助证据保留在技术详情中。
- 主事务：`tx_A2_redraw_upper_left_hash_table`，一个 `replace_svg` 操作，目标 `left_hash_table_top`。
- 完整 19 项操作重新重放，最终字节和执行 journal 与原记录一致。该事务的前后快照中，目标子树之外的内容完全一致。
- 文字编辑目标：`txt_hash_table_title`，`Hash Table` → `Demo Table`。编辑只作用于展示副本，导出保留真实 SVG 的其他节点与属性。
- 模型、ROI、事实复核、哈希和全量执行数字保留在详情。执行完成、视觉评价与未解决项分别表示。

归档再生（普通构建无需 Python 或外部归档）：

~~~powershell
python scripts/prepare-presentation-bird-case.py 'D:\Downloads\FigFox-研究资料总库\FigFox-研究资料总库'
npm run presentation:prepare
~~~

## 讲稿、验收与设备检查

[两分钟讲稿](figfox-presentation-visual-v2-script.md) 单独保存，不回填投影舞台。

[本轮验收报告与七状态截图、过渡录像](reviews/figfox-presentation-case-refresh/README.md) 记录实际测试环境、来源核验、文本预算和产品回归结果。

macOS 与实际讲台电脑待测。复制单 HTML，断网打开，完成七状态、三块素材、两侧完整图切换、replace 操作、Before/After 与按住 B、文字确认/取消、SVG 导出重开；再检查中英文、全屏、125% 缩放与翻页器。记录系统、浏览器、字体替代和投影比例。
