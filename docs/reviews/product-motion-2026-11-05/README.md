# 产品交互与轻动效 · 2026-11-05

本轮按用户确认，完成进度交互，真实状态待生成服务接入后启用。产品后端没有生成任务接口；本轮没有添加生成后端、调用付费模型或运行生产发布脚本。

## 实际改动

- 月付、年付切换时，三张价格卡在原位进行 240 ms 的数字位移与透明度过渡；计费说明同步交叉淡出、淡入。快速切换以最后一次选择为准。
- 定价页 FAQ 和指南页帮助问题共用 `ProductDisclosure`。展开 260 ms、收起 180 ms，加号同步旋转；保留原生 summary 的鼠标、Enter、Space 操作，收起完成后再关闭 details。
- 保留现有流程示意，并给阶段标题与说明增加过渡。
- 新增重建任务进度弹层与独立状态层。任务提交成功后自动打开；关闭、Escape 或返回工作台只隐藏弹层。工作台的「查看进度」可以重新打开，焦点会回到该入口。
- 进度涵盖排队、处理、成功、失败、取消及断线状态。未知阶段不选中任何步骤；断线显示上一次收到的阶段；终态停止轮询。阶段不能手动跳转，也不会按时间自动推进。
- 支持手机布局和 `prefers-reduced-motion`；页面不可见时暂停流程图的循环动效。

## 生成服务的接入边界

`frontend/src/features/product/reconstructionTask.tsx` 定义前端适配器接口；默认 Context 为 null，所以公开页面的生成按钮仍禁用，也不会发出生成请求。

后续接入方在 App 上层提供 `ReconstructionContext`：

- `submit(input, signal)` 接收原图 File、可选提示词、草稿 ID、请求幂等键，返回任务快照。
- `read(jobId, signal)` 返回同一任务的状态、阶段与递增版本号。前端每次请求完成后间隔 1.5 秒读取；旧版本不会覆盖新状态。
- 适配器负责鉴权、网络请求、超时、数据校验及与实际内核事件的对应关系。当前接口是前端适配边界，并非宣称已有服务器接口。
- 一次只提交一个在途重建任务；任务输入在提交时固定，之后切换草稿不会改变该任务。状态保存在当前应用会话内。
- 刷新恢复服务端任务、结果导入/下载以及真正的取消请求，需要随真实服务另行接入。当前页面没有提供伪造结果或假取消按钮。

`frontend/scripts/fixtures/reconstruction-progress.tsx` 是仅供浏览器检查的适配器夹具。检查器临时启动独立开发服务器，使用真实 App；夹具不进入生产构建。进度截图右下角均标明「非真实生成」。

## 验证

Windows Chrome，桌面 1440×900、手机 390×844；中文与英文。针对性动效测试记录了逐帧透明度、位置和展开高度，并生成 36.88 秒实际浏览器录屏；已检查桌面、手机截图及录屏抽帧。

执行时设置：

```powershell
$env:AUDIT_BASE_URL='http://127.0.0.1:4176/figfox'
$env:CHROME_PATH='C:/Program Files/Google/Chrome/Application/chrome.exe'
```

| 命令 | 结果 |
| --- | --- |
| `npm run build:pages` | 通过；保留既有大体积 chunk 提示 |
| `npm run review:product-motion` | 9 组通过，包含真实中间帧、快速反转、键盘、断线、成功与失败 |
| `npm run review:product` | 21 项通过 |
| `npm run review:workspace` | 6 项通过 |
| `npm run review:workspace-state` | 9 项通过 |
| `npm run review:documents` | 12 项通过 |
| `npm run review:workspace-remote` | 2 项通过 |

共 59 项/组检查通过。没有进行真实生成任务或线上部署验证。本轮未改 SVG 编辑引擎；草稿、图片保存与恢复、文档独立性、无效导入保护和原有服务不可用状态通过回归。

本目录 `index.html` 汇总截图与录屏；`motion-checks.json` 包含逐帧数值；其余 JSON 为对应回归结果。所有材料只在审查目录，不加入产品资源。
