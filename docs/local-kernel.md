# FigFox 本地内核接入

本地工作台：<http://127.0.0.1:5178/workspace>。只接通「图片转 SVG」；「文生图」沿用原状态。

## 版本与运行方式

- 内核采用 [LawrenceRiver/FigFox 的 21ffc012](https://github.com/LawrenceRiver/FigFox/commit/21ffc01271904d6c5610f0f96afd84530968f11e)，2026-11-03 的 `factual` 流水线。
- 独立下载到 `data/kernel/`，不修改已有的 FigFox-926 工作区或研究资料包。
- 使用源码内的 `historical-cohort.json`：G0 / G1 / G2 均为 GPT-5.5、medium；SAM3 在本机 CPU 执行。默认配置中的实验性 DeepSeek 视觉型号不在当前账号模型列表中，本次未使用。
- 初稿 → G1 检查 → G2 修复计划 → 原生 SVG 操作与渲染。阶段来自实际调用边界，页面不按计时器推断完成进度。
- 本地配置从历史配置派生：单图费用上限 USD 5，累计测试额度单独配置；G0 保守输入上界 262144，其他阶段保持 131072。三个阶段在发出请求前统一核算完整文本和图像输入。
- 新调用使用 [Responses 后台任务](https://developers.openai.com/api/docs/guides/background)，保持 GPT-5.5 与 `store=false`，保存任务编号后以 GET 查询完成结果与 usage。查询断线不会重新生成；仅连接建立失败允许最多三次连接尝试。已发出但未确认的请求保留费用预留。后台数据有官方文档说明的临时轮询保留期。

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

失败弹层显示阶段、原因和费用状态。输入准备失败且确认没有请求收据时，可点「重试此图」：保留任务 ID、原图和要求，归档此前的准备记录，不另占手动测试名额；最多允许两次这样的恢复。后端重新检查收据、费用余额和进程锁，重复点击同一失败版本只启动一个任务。已有付费或费用待确认的调用不会通过此入口重发。

如果失败发生在尚未提交的 G1/G2 阶段，可从该阶段继续。后端先核验此前响应、G1 数据、初稿和配置的哈希/一致性，复用完成的阶段；原预算与请求记录保留。读取失败或校验不一致不会重新生成前面的阶段。连接建立失败会保留原始收据，并明确记为未提交；请求发出后的断线仍按费用未确认处理。

当 G0 的多个 SAM 小切片超过输入上界时，本地适配层将全部切片整理为带素材 ID 的图板，替换附件清单说明。原图和标注总览保持原尺寸，源素材与坐标仍用于内核绑定；模型图板中的大切片按比例缩小。策略版本写入任务配置，图板清单记录每个素材的哈希、原始尺寸和位置。未超限的请求不改变附件。此适配不修改模型生成的 SVG，也不放宽输入或费用限制。

G0/G1/G2 超限时还会统一使用证据图板：保留原图和初稿独立显示，其余对照图按原始像素排列，附编号与像素位置映射。图板不缩放、不删减任何对照图；原来的裁剪坐标和比例含义保持不变。超出图板仍可容纳的输入会在该次模型请求前停止，已完成阶段保留。

费用数字按配置价格与 provider usage 估算。未收到完整响应的请求保留全部预留费用，后续任务也会扣除这些预留。没有足够的请求预留时停止提交。不要通过删除账本或换目录绕过测试上限。

本地测试额度在私有的 `data/local-reconstruction/test-limits.json` 配置：`cumulative_budget_usd` 是累计费用上限，`max_jobs: null` 允许用户在余额范围内连续手动测试。追加额度应保留全部历史费用与待确认预留，不能清空账本。此文件没有网页写入接口，修改后重启本地 API 生效。内核配置中的单图 USD 5 上限仍然独立执行。网页定时刷新可用状态，并显示余额不足的具体金额。

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

`node scripts/reconstruction-failure-check.mjs` 使用拦截接口的离线浏览器场景验证失败提示、手机布局、防重复点击与费用待确认保护。`node scripts/local-retry-check.mjs` 只读检查最近一次可恢复失败；增加 `--retry` 才实际点击恢复并等待结果，可能产生模型费用。

## 发布边界

本地 API 是单用户本机验证入口，只接受回环地址及指定的本地网页来源；上传有格式、大小、像素数校验。SVG 导入编辑器时使用现有清洗流程。生产构建不会启用本地客户端或探测 localhost。

本轮没有部署云端。正式上线前需要将执行器接入现有账号、任务权限与存储系统，部署独立 SAM/生成进程，配置运行配额及超时回收。当前本地入口不应直接开放公网。
