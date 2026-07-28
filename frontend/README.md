# AutoDraftman Frontend

这是 AutoDraftman 的本地产品前端，包含中英双语首页、生成工作台、登录选择和定价页。
游客身份与额度已连接本地 FastAPI 和 PostgreSQL。

## 本地运行

```powershell
cd D:\Github_Ku\fyp_AutoDraftman\frontend
npm install
Copy-Item .env.example .env
npm run dev
```

默认访问地址：

- 首页：`http://127.0.0.1:5173/`
- 工作台：`http://127.0.0.1:5173/workspace`
- 定价：`http://127.0.0.1:5173/pricing`

## 当前实现范围

- 首页只提供产品介绍和工作台入口，不放生成输入框。
- 工作台支持文字生成、文字加参考图两种模式。
- 点击生成时可以创建或恢复真实游客身份。
- 游客的一次免费额度由 PostgreSQL 账本保存，不再由前端伪造。
- Google、GitHub 登录方式由后端配置接口决定；没有密钥时不会显示假入口。
- 正式用户可以查看已绑定登录方式、添加另一种登录方式、解绑和退出。
- 游客登录后，其额度和已上传资源会迁移到正式账户。
- 生图内核尚未接入；当前不会伪造生成任务，也不会扣除真实额度。
- 历史、公开状态、下载和定价均为 UI 原型。
- 中英文可随时切换，语言偏好保存在浏览器。

## 检查

```powershell
npm run build
```

启动开发服务器后可以运行：

```powershell
npm run review
```

该检查会验证主要页面在桌面和手机尺寸下是否出现横向溢出。
