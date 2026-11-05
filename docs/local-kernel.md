# FigFox 本地内核接入

本地工作台：<http://127.0.0.1:5178/workspace>。只接通「图片转 SVG」；「文生图」沿用原状态。

## 版本与运行方式

- 内核采用 [LawrenceRiver/FigFox 的 21ffc012](https://github.com/LawrenceRiver/FigFox/commit/21ffc01271904d6c5610f0f96afd84530968f11e)，2026-11-03 的 `factual` 流水线。
- 独立下载到 `data/kernel/`，不修改已有的 FigFox-926 工作区或研究资料包。
- 使用源码内的 `historical-cohort.json`：G0 / G1 / G2 均为 GPT-5.5、medium；SAM3 在本机 CPU 执行。默认配置中的实验性 DeepSeek 视觉型号不在当前账号模型列表中，本次未使用。
- 初稿 → G1 检查 → G2 修复计划 → 原生 SVG 操作与渲染。阶段来自实际调用边界，页面不按计时器推断完成进度。
- 本地配置从历史配置派生：全局费用上限 USD 5，G0 保守输入上界 262144，其他阶段保持 131072。SAM 的多个小裁片各自占一个保守图像计费单元，因此原 G0 上界对实测图片不足；图片和裁片没有删减。
- 使用 [Responses 流式接口](https://developers.openai.com/api/docs/guides/streaming-responses) 避免等待完整长响应时连接关闭。只接受 `response.completed` 的完整内容与 usage。内核的持久化请求标识、费用预留、失败不自动重发和结果校验继续执行。

## 本机启动

已经准备好依赖时，在仓库根目录运行：

```powershell
.\scripts\start-local-kernel.ps1
```

脚本复用已经运行的本地服务；新服务使用隐藏窗口，日志在 `data/local-reconstruction/services/`。

| 服务 | 地址 |
| --- | --- |
| Vite 工作台 | `127.0.0.1:5178` |
| 本地任务 API | `127.0.0.1:8787` |
| 现有 SAM3 bridge | `127.0.0.1:18080` |

当前机器使用 `D:/Github_Ku/FigFox-926/.env` 的凭据，以及 `D:/fyp/sam3-local-test/runtime/.venv/Scripts/python.exe`。脚本参数 `-Credentials`、`-SamPython`、`-SamBridge` 可指定其他路径。密钥仅由后端读取，不返回网页、不复制进源码。

干净机器的依赖准备（还需已有 SAM3 模型、bridge 及 Chrome）：

```powershell
python scripts/prepare-local-kernel.py
python -m venv backend/.venv-local
backend/.venv-local/Scripts/python.exe -m pip install -e './backend[dev]' -r data/kernel/FigFox-21ffc01271904d6c5610f0f96afd84530968f11e/requirements.txt
npm ci --prefix data/kernel/FigFox-21ffc01271904d6c5610f0f96afd84530968f11e
npm ci --prefix frontend
```

`prepare-local-kernel.py` 核验下载包 SHA256，应用三处 Windows 兼容适配：运行目录锁、旧 provider 的延迟 POSIX 导入、目录 fsync 兼容。文件内容的 fsync 和哈希验证保留。不会修改提示词、执行人工 SVG 修复，也不会覆盖未知的内核文件改动。

## 工作台交互

上传 PNG/JPEG/WebP，可添加要求，然后点「重建 SVG」。进度自动打开，可以关闭并通过「查看进度」重新打开；刷新页面会恢复最近任务。成功后预览真实结果，可下载 SVG/PNG，或进入现有编辑器。再次打开同一结果优先使用浏览器内已编辑的文档，避免覆盖修改。

每次提交使用幂等键，本机同时执行一个任务；进程锁同时保护跨服务重启的费用计数。服务重启将中断任务标记为失败，不自动再调用模型。原图、模型输出、结果和账本留在 `data/local-reconstruction/jobs/`，该目录不提交 Git。

费用数字按配置价格与 provider usage 估算。未收到完整响应的请求保留全部预留费用，后续任务也会扣除这些预留。没有足够的请求预留时停止提交。不要通过删除账本或换目录绕过测试上限。

用户明确要求开始下一轮手动测试时，可由操作者在私有的 `data/local-reconstruction/test-limits.json` 中记录新的累计费用上限 `cumulative_budget_usd` 和任务总数上限 `max_jobs`。任务计数和全部历史费用仍保留；一次新测试的累计上限应设为当前费用占用加上单次允许额度，任务总数上限设为当前数量加一。此文件没有网页写入接口，修改后重启本地 API 生效。内核配置中的单任务 USD 5 上限仍然独立执行。

## 验证

离线接口检查（不会调用模型）：

```powershell
backend/.venv-local/Scripts/python.exe -m pytest backend/tests -q
```

真实浏览器检查会提交一次付费任务，需要显式指定图片：

```powershell
cd frontend
node scripts/local-kernel-check.mjs --submit --image '完整原图路径.png'
```

脚本记录进度、截图和结果，写入 `frontend/.review/local-kernel/`，不自动重试付费调用。

## 发布边界

本地 API 是单用户本机验证入口，只接受回环地址及指定的本地网页来源；上传有格式、大小、像素数校验。SVG 导入编辑器时使用现有清洗流程。生产构建不会启用本地客户端或探测 localhost。

本轮没有部署云端。正式上线前需要将执行器接入现有账号、任务权限与存储系统，部署独立 SAM/生成进程，配置运行配额及超时回收。当前本地入口不应直接开放公网。
