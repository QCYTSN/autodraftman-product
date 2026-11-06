# FigFox 本地内核接入

工作台：<http://127.0.0.1:5178/workspace>。本地仅接通「图片转 SVG」。当前是三阶段 GPT 链路及 2026-11-06 的输入计数修复，标识 `upstream-factual-gpt55-count-v1`。

## 当前执行链路

采用 [LawrenceRiver/FigFox 的 21ffc012](https://github.com/LawrenceRiver/FigFox/commit/21ffc01271904d6c5610f0f96afd84530968f11e)，入口是 `figfox_plus.factual.pipeline.run`，直接加载仓库的 `configs/historical-cohort.json`：

1. 原图经 SAM3 提取素材，G0 使用 GPT-5.5 生成初稿；素材绑定、坐标处理沿用原版。
2. G1 使用 GPT-5.5 对照原图、初稿与四组局部图，检查事实、关系和差异，并可请求细节图。
3. G2 使用 GPT-5.5 接收初稿 SVG、对象索引、G1 报告和图像证据，独立复核并给出原生 SVG 修改操作。
4. 本地代码校验计划、执行操作、渲染，输出 SVG、PNG 与未解决问题。

从新图成功完成一次完整重建，共调用 GPT-5.5 三次，统一走 OpenAI Responses 接口。此配置不使用 DS，不读取或要求 DS 凭据，也没有 DS 补救或自动评分调用。完成的阶段沿用原版哈希验证和复用规则。

G2 的操作由本地代码直接执行，没有第二次模型实现翻译或多轮自动视觉复审调用。执行完成表示操作链完成，原版结果中的 `visual_quality_pass` 仍为空。完整对照见 [三阶段 GPT 接入报告](reviews/kernel-gpt-chain-2026-11-06/README.md)。

## 输入计数修复

原版传输层按每张裁剪至少 8192 tokens 预估，20 张很小的素材也会超过 131072 的门槛。当前接入在每个尚未发送的阶段调用 OpenAI `/v1/responses/input_tokens`，使用原样的模型、提示词、图片、顺序和 detail，再将返回的计数与原有限制比较。计数接口不生成模型回答；三个生成阶段仍为 G0/G1/G2。

这是明确记录的第四处源码补丁：给原传输函数增加可选计数回调。未设置回调的上游入口保持原有行为。三处 Windows 兼容补丁继续保留，未改变模型请求正文、素材、修复和费用记录逻辑。计数失败或确实超限时停止，不采用盲目放行或自动重试。

只有用户手动提交任务会进入计数及生成。本轮验证使用合成图片和模拟回复，没有发送用户图片、调用计数接口或生成模型。旧失败任务保留；新版本不跨配置续跑旧任务。详见 [输入计数修复报告](reviews/kernel-input-count-2026-11-06/README.md)。

## 明确记录的配置差异

相对 `historical-cohort.json` 唯一的配置差异是预算：单图最多 USD 5，本地累计额度另外计入历史调用和待确认预留。模型、接口、价格字段、输入/输出限制和超时逐字段保持原配置；费用仍按原版价格字段和 usage 估算，不表示账单实付值。

三个阶段输入限制均为 131072、输出均为 32768，推理设置为 medium，请求超时 900 秒。没有额外的拼板、缩图、提示词附加、SSE/后台请求替换或自动付费重发。

## 本机启动

依赖已就绪时：

```powershell
.\scripts\start-local-kernel.ps1
```

脚本复用已有服务，新服务使用隐藏窗口。日志在 `data/local-reconstruction/services/`。

| 服务 | 地址 |
| --- | --- |
| 工作台 | `127.0.0.1:5178` |
| 任务 API | `127.0.0.1:8787` |
| SAM3 bridge | `127.0.0.1:18080` |

当前机器仅从 `D:/Github_Ku/FigFox-926/.env` 或环境变量读取 `OPENAI_API_KEY`，SAM 环境位于 `D:/fyp/sam3-local-test/runtime/.venv/Scripts/python.exe`。启动参数 `-Credentials`、`-SamPython`、`-SamBridge` 可指定其他路径。凭据仅在后端使用，原凭据文件不修改。

干净机器的准备命令（还需 SAM3 模型、bridge 和 Chrome）：

```powershell
python scripts/prepare-local-kernel.py
python -m venv backend/.venv-local
backend/.venv-local/Scripts/python.exe -m pip install -e './backend[dev]' -r data/kernel/FigFox-21ffc01271904d6c5610f0f96afd84530968f11e/requirements.txt
npm ci --prefix data/kernel/FigFox-21ffc01271904d6c5610f0f96afd84530968f11e
npm ci --prefix frontend
```

已使用旧适配配置的机器，可执行 `python scripts/prepare-local-kernel.py --restore-upstream-config`。脚本先按内容哈希备份私有配置，再生成上述公开声明的配置；不会覆盖历史任务的配置、结果和费用。

下载包固定 SHA256，逐一核验 1111 个文件。源码差异限于三处 Windows 兼容修改（运行锁、旧 provider 的延迟 POSIX 导入、目录 fsync）以及上述一处输入计数回调。每次 worker 启动都会再次核验源码和配置。未知改动会在模型提交前停止。

## 工作台与失败处理

PNG/JPEG 直接以原始字节传给内核，保留透明度和 EXIF；WebP 为兼容原版传输转换为同像素的 PNG，同时保存上传原件。用户补充要求留在草稿，不发送给模型，因为该上游入口没有用户提示词参数。

进度来自实际阶段调用。进度弹层可关闭、重新打开；结果可预览、下载或送入编辑器，编辑后的文档不会被重复打开原结果覆盖。结果页显示内核保留的未解决问题数量。直接下载保留原始 SVG 字节；进入编辑器后会经过安全清理及 XML 序列化，属于单独的编辑副本。

每次提交使用幂等键，同一时刻仅运行一个任务。服务重启后中断的任务标记失败，不自动付费重发。结果、请求收据、原图和阶段产物保存在 `data/local-reconstruction/jobs/`，不提交 Git。

失败时保留原因、阶段、已知费用与待确认预留。只有当前一致性配置下、确认尚未发送的可恢复任务才允许手动恢复；已发出但未收到完整响应的请求保留费用预留。原版输入上限错误不提供相同输入的重复提交。旧适配任务保留下载和查看，但不能跨配置续跑。

预算不足时停止提交，不删除账本、不自动增加额度。累计额度文件是私有的 `data/local-reconstruction/test-limits.json`；`max_jobs: null` 表示在余额范围内允许继续手动测试。模型可用性检查只读取模型列表，不创建生成请求。

## 验证

离线测试与原版对照，无模型费用：

```powershell
backend/.venv-local/Scripts/python.exe -m pytest backend/tests -q
backend/.venv-local/Scripts/python.exe scripts/check-kernel-parity.py
```

第二项对照原版入口和真实网页 worker：原版读取原始全 GPT 配置，网页仅调整预算；采用相同输入和固定模型/SAM 响应，比较请求内容、附件字节、操作与最终产物。覆盖无素材、带素材/细节裁剪/实际 SVG 操作，以及 G0/G1/G2 分别断线的情况。验证失败时不会转调 DS 或重发不确定的请求。这是适配一致性验证，不是实际模型质量验证。

[2026-11-06 完整复核](reviews/kernel-full-audit-2026-11-06/README.md) 另覆盖 SAM 图片实际嵌入、最终坐标、箭头证据、未解决问题传递与结果页面。

浏览器只读复查已有真实结果：在 `frontend` 运行 `node scripts/local-result-check.mjs`。显式的付费端到端验证使用 `node scripts/local-kernel-check.mjs --submit --image '完整图片路径.png'`，每次都需要足够额度，不自动重试。

## 发布边界

本地入口仅接受回环地址和指定来源；上传受格式、大小与像素数限制。生产构建不启用本地客户端或探测 localhost。本轮未部署生成服务至云端；公网运行仍需账号鉴权、任务权限和独立执行服务。
