import {
  ArrowRight,
  ArrowUpRight,
  CaretLeft,
  CaretRight,
  Check,
  ClockCounterClockwise,
  DownloadSimple,
  FileImage,
  GithubLogo,
  Globe,
  GoogleLogo,
  ImageSquare,
  List,
  LockKey,
  LinkSimple,
  NotePencil,
  Plus,
  SignOut,
  TextT,
  Trash,
  UploadSimple,
  UserCircle,
  WechatLogo,
  X,
} from "@phosphor-icons/react";
import {
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ApiError,
  apiConfigured,
  completeAssetUpload,
  createAssetUploadIntent,
  createOrRestoreGuest,
  deleteAccount,
  deleteAsset,
  getAuthProviders,
  getBoundIdentities,
  getCreditTransactions,
  getCurrentIdentity,
  logout,
  oauthStartUrl,
  uploadToPresignedUrl,
  unlinkIdentity,
  type Asset,
  type AuthProvider,
  type BoundIdentity,
  type CreditTransaction,
  type CurrentIdentity,
} from "./api";
import {
  footerCopy,
  ProductInformationPage,
  type ProductLanguage,
  type ProductRoute,
} from "./ProductPages";

type Language = ProductLanguage;
type Identity = "guest" | "user" | null;
type AuthChoice = "guest" | "google" | "github" | "wechat";
type RoutePath = ProductRoute;
type GenerateStatus = "empty" | "generating" | "complete";
type BillingCycle = "monthly" | "yearly";
type ReferenceUploadStatus =
  | "idle"
  | "preparing"
  | "uploading"
  | "verifying"
  | "ready"
  | "error";

const siteBasePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function sitePath(path: string) {
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;
}

const figureAssetPath = sitePath("/assets/autodraftman-showcase.png");
const exampleArtifacts = [
  {
    id: "training",
    src: sitePath("/assets/case-training-pipeline.png"),
    width: 1520,
    height: 499,
    ratio: "16:9",
    format: "PNG",
  },
  {
    id: "inference",
    src: sitePath("/assets/case-inference-pipeline.png"),
    width: 1521,
    height: 271,
    ratio: "16:9",
    format: "PNG",
  },
  {
    id: "structure",
    src: sitePath("/assets/case-structure-inspection.png"),
    width: 1600,
    height: 1017,
    ratio: "4:3",
    format: "PNG",
  },
] as const;
const sessionMarker = "autodraftman-session";
const defaultAuthProviders: AuthProvider[] = [
  { id: "google", name: "Google", enabled: false },
  { id: "github", name: "GitHub", enabled: false },
  { id: "wechat", name: "WeChat", enabled: false },
];

const copy = {
  zh: {
    nav: {
      product: "产品",
      examples: "研发样例",
      docs: "使用指南",
      pricing: "定价",
      workspace: "工作台",
      signIn: "登录",
      guest: "游客",
      account: "演示账户",
      menu: "打开菜单",
    },
    home: {
      kicker: "面向科研表达的制图工作台",
      title: "把研究思路，\n绘成清晰的图。",
      body:
        "从一段文字或一张参考图开始。AutoDraftman 梳理对象、关系与视觉层级，交付一张完整、可读的科研图。",
      primary: "进入工作台",
      secondary: "查看研发样例",
      figureAlt: "一支铅笔正在同一张图纸上把研究草稿整理为正式科研图版",
      resultAlt: "由 AutoDraftman 生成的科研图示预览",
      figureCaption: "同一张图纸，从研究草稿到正式图版",
      pointOne: "文字或参考图",
      pointTwo: "一次生成一张图",
      pointThree: "默认私密",
      storyKicker: "一个安静而完整的流程",
      storyTitle: "把复杂留给系统，\n把判断留给研究者。",
      storyBody:
        "首页只说明价值，真正的输入、校准与生成都在工作台完成。随着阅读推进，你会看到同一张图如何逐步成形。",
      steps: [
        {
          title: "描述研究关系",
          body: "写清对象、连接与重点。无需在首页面对密集的生成设置。",
          label: "输入",
        },
        {
          title: "加入参考线索",
          body: "需要时上传一张参考图，用来说明构图或视觉方向，而不是机械复刻。",
          label: "校准",
        },
        {
          title: "得到完整图版",
          body: "跟随进度完成生成，下载结果；只有主动重新生成才再次消耗额度。",
          label: "交付",
        },
      ],
      stagePrompt:
        "绘制一个双分支编码器，展示均值、方差与加权采样之间的关系。",
      stageReference: "参考结构已加入",
      stageComplete: "图版已完成",
      privacyKicker: "由你掌握的研究资料",
      privacyTitle: "默认私密，也始终可删除。",
      privacyBody:
        "登录用户可以保留和删除历史；游客内容仅短期保存。任何公开展示都必须由用户主动选择，内容不用于训练。",
      privacyItems: ["私密生成", "可删除历史", "公开需主动选择"],
      closingTitle: "从一张干净的画布开始。",
      closingBody: "当前为本地内部版本，交互与产品结构均可继续讨论和调整。",
      footer: "面向科研图示的生成工具",
      footerStatement: "让严谨的研究，也拥有清晰的表达。",
    },
    workspace: {
      eyebrow: "内部版本 · 本地演示",
      title: "生成工作台",
      subtitle: "描述你的研究图，必要时加入参考图，然后完成一次生成。",
      modeText: "文字生成",
      modeReference: "文字 + 参考图",
      promptLabel: "你想画什么？",
      promptPlaceholder:
        "例如：绘制一个双分支编码器，展示均值、方差与加权采样之间的关系。",
      promptHelp: "说明对象、关系和视觉重点，通常会得到更稳定的结果。",
      referenceLabel: "参考图",
      uploadTitle: "上传一张参考图",
      uploadBody: "PNG、JPG 或 WebP",
      replace: "点击更换",
      uploadPreparing: "正在准备私密上传…",
      uploadProgress: "正在上传",
      uploadVerifying: "正在验证图片…",
      uploadReady: "已私密保存",
      uploadCancel: "取消上传",
      uploadRemove: "移除参考图",
      uploadFailed: "参考图上传失败，请重试。",
      uploadCancelled: "上传已取消。",
      uploadRequiresApi: "公网后端尚未配置，静态预览不会保存你的图片。",
      uploadUnsupported: "请选择 PNG、JPG 或 WebP 图片。",
      uploadTooLarge: "图片不能超过 10 MB。",
      uploadEmpty: "不能上传空文件。",
      uploadPrivateNote: "原图默认私密；游客文件将在短期后过期。",
      uploadBeforeGenerate: "请先等待参考图完成上传与验证。",
      settings: "输出设置",
      ratio: "画面比例",
      format: "文件格式",
      privacy: "默认私密",
      publicToggle: "完成后公开到案例区",
      privateToggle: "只有你可以查看",
      generate: "生成一张图",
      generating: "正在生成",
      credits: "剩余额度",
      emptyTitle: "结果将在这里出现",
      emptyBody: "左侧用于描述与设置，右侧始终保留给你的图。",
      progressTitle: "正在组织结构与视觉层级",
      progressBody: "当前本地界面使用模拟进度，不会调用真实接口。",
      completed: "生成完成",
      private: "私密",
      public: "公开",
      download: "下载图片",
      regenerate: "重新生成",
      history: "历史记录",
      historyEmpty: "还没有生成记录。",
      historyItem: "双分支编码器方法图",
      newDraft: "新建草稿",
      draftPending: "尚未生成",
      historyHint: "输入内容后，当前草稿会显示在这里。",
      collapseHistory: "收起记录栏",
      expandHistory: "展开记录栏",
      delete: "删除记录",
      closeHistory: "关闭历史记录",
      promptError: "请先描述你希望生成的内容。",
      noCredits: "当前账户没有可用额度，定价页面仍为界面预览。",
      mockNotice: "本地演示，不会调用真实生图接口。",
      generationUnavailable:
        "游客身份与额度已经保存到数据库；生图内核尚未接入，本次不会创建任务或扣除额度。",
      kernelPending: "内核待接入",
      draftLabel: "当前草稿",
      technicalSummary: "输出与隐私",
      settingsOpen: "展开输出设置",
      settingsClose: "收起输出设置",
      idleStatus: "等待输入",
    },
    examples: {
      kicker: "真实项目资料 · 静态展示",
      title: "先看我们已经做出来的东西。",
      body:
        "这里展示的是当前 AutoDraftman 项目已有的实验输出与结构检查资料。它们用于验证界面、信息密度和展示方式，不冒充尚未接通的线上生成结果。",
      notice:
        "所有样例均来自当前项目目录，仅作为研发资料在此展示。工作台保持空白，不会预载样例、调用模型或消耗额度。",
      openWorkspace: "进入空白工作台",
      artifact: "研发资料",
      cases: [
        {
          title: "双控制训练流程",
          category: "训练流程图",
          description:
            "展示文本条件、音频参考、CLAP 表征、RVQ 离散化和自回归训练目标之间的完整关系。",
          prompt:
            "绘制一个双控制音频模型的训练流程图，展示文本与音频参考、CLAP 表征、RVQ 离散化、自回归语义模型和训练损失之间的关系。",
          meta: "当前项目实验输出 · PNG · 1520 × 499",
          alt: "AutoDraftman 当前项目的双控制音频模型训练流程实验图",
        },
        {
          title: "双控制推理流程",
          category: "推理流程图",
          description:
            "把双阶段采样、温度控制、CFG 权重、解码与最终音频输出组织在一张横向图中。",
          prompt:
            "绘制一个双阶段自回归音频生成模型的推理流程，突出温度控制、CFG 权重、RVQ 解码和最终音频输出。",
          meta: "当前项目实验输出 · PNG · 1521 × 271",
          alt: "AutoDraftman 当前项目的双控制音频模型推理流程实验图",
        },
        {
          title: "语义结构检查",
          category: "结构标注",
          description:
            "展示系统如何识别容器、文本、箭头、公式、图像和功能模块，用于检查结构理解而不是作为最终成图。",
          prompt:
            "分析一张扩散模型流程图的语义结构，识别主要容器、功能模块、文本、箭头、公式和图像区域。",
          meta: "当前项目结构检查资料 · PNG · 1600 × 1017",
          alt: "扩散模型科研图中的语义区域和组件结构检查标注",
        },
      ],
    },
    pricing: {
      kicker: "Sketch · Folio · Atlas",
      title: "选择适合你的生成额度。",
      body: "当前暂不开放真实付款。价格、额度与存储周期是首版产品占位，可在接入支付前继续讨论。",
      monthly: "月付",
      yearly: "年付",
      save: "最高省 21%",
      notice: "暂未接入付款",
      choose: "选择方案",
      current: "当前方案",
      recommended: "推荐",
      perMonth: "/ 月",
      billedYearly: "按年支付",
      savePerMonth: "每月比月付节省",
      freeForever: "用于初次体验",
      plans: [
        {
          name: "Sketch",
          description: "从一张研究草图开始，轻量体验完整流程。",
          features: ["1 次游客免费生成", "标准生成队列", "PNG、JPG、WebP"],
        },
        {
          name: "Folio",
          description: "把课程与研究图示逐步积累成册。",
          features: ["120 次月度生成额度", "更高分辨率", "长期历史记录"],
        },
        {
          name: "Atlas",
          description: "为高频研究与小型团队建立完整图谱。",
          features: ["360 次月度生成额度", "优先生成队列", "更长存储周期"],
        },
      ],
      toast: "这是定价界面预览，尚未连接付款渠道。",
      footnote: "生成失败且没有产出图片时不扣额度；主动重新生成会正常消耗额度。",
    },
    auth: {
      title: "开始生成",
      body: "登录后可以保存历史，也可以使用一次游客免费额度继续。",
      google: "使用 Google 登录",
      github: "使用 GitHub 登录",
      wechat: "使用微信登录",
      guest: "以游客身份继续",
      guestNote: "游客内容仅短期保存",
      close: "关闭登录窗口",
      deployRequired: "公网后端部署后启用",
      comingSoon: "待接入",
      demo: "登录渠道状态由后端统一管理。",
      noProvider: "当前为静态预览；真实登录将在公网后端部署后启用。",
      cancelled: "你取消了登录授权，账户没有发生变化。",
      conflict: "这个登录身份已经属于另一个 AutoDraftman 账户。",
      loginFailed: "登录没有完成，请稍后重试。",
      connectionError: "暂时无法连接本地后端，请确认 Docker 服务仍在运行。",
      connecting: "正在连接…",
      accountTitle: "你的账户",
      accountBody: "不同登录方式可以绑定到同一个 AutoDraftman 账户。",
      linked: "已绑定",
      addLogin: "添加登录方式",
      unlink: "解除绑定",
      logout: "退出登录",
      lastLogin: "至少需要保留一种登录方式。",
      noEmail: "未提供邮箱",
      creditActivity: "额度记录",
      noTransactions: "暂时没有额度变化。",
      creditAfter: "变更后",
      granted: "发放额度",
      reserved: "冻结额度",
      settled: "完成结算",
      released: "释放额度",
      refunded: "退回额度",
      adjusted: "额度调整",
      dangerZone: "账户管理",
      deleteAccount: "注销账户",
      deleteTitle: "确认注销这个账户？",
      deleteBody:
        "登录方式会立即解除，账户和内容将无法继续访问。主文件将在 24 小时内清理，账户记录计划在 30 天后清除。",
      deleteConfirm: "确认注销",
      cancelDelete: "保留账户",
    },
  },
  en: {
    nav: {
      product: "Product",
      examples: "R&D examples",
      docs: "Docs",
      pricing: "Pricing",
      workspace: "Workspace",
      signIn: "Sign in",
      guest: "Guest",
      account: "Demo account",
      menu: "Open menu",
    },
    home: {
      kicker: "A figure workspace for scientific ideas",
      title: "Research ideas,\ndrawn into focus.",
      body:
        "Begin with text or a reference image. AutoDraftman arranges objects, relationships, and visual hierarchy into one clear scientific figure.",
      primary: "Open workspace",
      secondary: "View R&D examples",
      figureAlt:
        "A pencil turns a rough research sketch into a finished scientific figure on the same drafting sheet",
      resultAlt: "Scientific figure preview generated by AutoDraftman",
      figureCaption: "One sheet, from research sketch to finished figure",
      pointOne: "Text or reference",
      pointTwo: "One image per run",
      pointThree: "Private by default",
      storyKicker: "One quiet, complete workflow",
      storyTitle: "Leave the complexity to the system.\nKeep the judgment.",
      storyBody:
        "The homepage explains the value. Description, calibration, and generation stay inside the workspace. Scroll to see one figure take shape.",
      steps: [
        {
          title: "Describe the relationships",
          body: "Name the objects, connections, and emphasis without facing a wall of settings.",
          label: "Describe",
        },
        {
          title: "Add a visual reference",
          body: "Upload one image when composition guidance helps. It informs the direction without being copied.",
          label: "Calibrate",
        },
        {
          title: "Receive one complete figure",
          body: "Follow progress, download the result, and use another credit only when you generate again.",
          label: "Deliver",
        },
      ],
      stagePrompt:
        "Draw a two-branch encoder showing mean, variance, and weighted sampling.",
      stageReference: "Reference structure added",
      stageComplete: "Figure complete",
      privacyKicker: "Research material under your control",
      privacyTitle: "Private by default. Deletable by design.",
      privacyBody:
        "Signed-in users can keep and delete history; guest files expire. Public sharing is always opt-in, and content is not used for training.",
      privacyItems: ["Private generation", "Deletable history", "Opt-in sharing"],
      closingTitle: "Begin with a clean canvas.",
      closingBody:
        "This is a local internal edition. The interaction and product structure can continue to evolve.",
      footer: "Generative tools for scientific figures",
      footerStatement: "Rigorous research deserves clear expression.",
    },
    workspace: {
      eyebrow: "Internal edition · Local preview",
      title: "Generation workspace",
      subtitle:
        "Describe your figure, add a reference when useful, and complete one generation.",
      modeText: "Text to image",
      modeReference: "Text + reference",
      promptLabel: "What should we draw?",
      promptPlaceholder:
        "Example: draw a two-branch encoder showing mean, variance, and weighted sampling.",
      promptHelp:
        "Clear objects, relationships, and visual emphasis usually produce steadier results.",
      referenceLabel: "Reference image",
      uploadTitle: "Upload one reference image",
      uploadBody: "PNG, JPG, or WebP",
      replace: "Click to replace",
      uploadPreparing: "Preparing a private upload…",
      uploadProgress: "Uploading",
      uploadVerifying: "Verifying the image…",
      uploadReady: "Saved privately",
      uploadCancel: "Cancel upload",
      uploadRemove: "Remove reference",
      uploadFailed: "The reference upload failed. Please try again.",
      uploadCancelled: "Upload cancelled.",
      uploadRequiresApi:
        "The public API is not configured. This static preview will not store your image.",
      uploadUnsupported: "Choose a PNG, JPG, or WebP image.",
      uploadTooLarge: "Images must be 10 MB or smaller.",
      uploadEmpty: "Empty files cannot be uploaded.",
      uploadPrivateNote: "Private by default. Guest files expire after a short period.",
      uploadBeforeGenerate: "Wait for the reference image to finish uploading and verification.",
      settings: "Output settings",
      ratio: "Aspect ratio",
      format: "File format",
      privacy: "Private by default",
      publicToggle: "Publish to the gallery when complete",
      privateToggle: "Only visible to you",
      generate: "Generate one image",
      generating: "Generating",
      credits: "Credits left",
      emptyTitle: "Your result will appear here",
      emptyBody:
        "Description and settings stay on the left. The right side belongs to your figure.",
      progressTitle: "Organizing structure and visual hierarchy",
      progressBody:
        "This local interface uses simulated progress and does not call a real API.",
      completed: "Complete",
      private: "Private",
      public: "Public",
      download: "Download image",
      regenerate: "Generate again",
      history: "History",
      historyEmpty: "No generations yet.",
      historyItem: "Two-branch encoder method figure",
      newDraft: "New draft",
      draftPending: "Not generated",
      historyHint: "Your current draft appears here once you start writing.",
      collapseHistory: "Collapse records",
      expandHistory: "Expand records",
      delete: "Delete record",
      closeHistory: "Close history",
      promptError: "Describe what you want to generate first.",
      noCredits:
        "This account has no credits left. Pricing is still an interface preview.",
      mockNotice: "Local preview. No real image API is called.",
      generationUnavailable:
        "Your guest identity and credit are stored in PostgreSQL. The image kernel is not connected, so no task or charge was created.",
      kernelPending: "Kernel pending",
      draftLabel: "Current draft",
      technicalSummary: "Output and privacy",
      settingsOpen: "Open output settings",
      settingsClose: "Close output settings",
      idleStatus: "Awaiting input",
    },
    examples: {
      kicker: "Real project material · static display",
      title: "Start with what the project has already made.",
      body:
        "These are existing experimental outputs and structure-inspection artifacts from the current AutoDraftman project. They help us test layout and information density without pretending the live generation service is already connected.",
      notice:
        "Every example comes from the current project directory and stays on this R&D page. The workspace opens blank and does not preload an example, call a model, or use a credit.",
      openWorkspace: "Open blank workspace",
      artifact: "R&D artifact",
      cases: [
        {
          title: "Dual-control training pipeline",
          category: "Training diagram",
          description:
            "Maps text conditioning, audio reference, CLAP representations, RVQ discretization, the autoregressive model, and training targets.",
          prompt:
            "Draw a training pipeline for a dual-control audio model, showing text and audio references, CLAP representations, RVQ discretization, an autoregressive semantic model, and the training loss.",
          meta: "Current project experiment · PNG · 1520 × 499",
          alt: "Experimental training pipeline for the current AutoDraftman dual-control audio model",
        },
        {
          title: "Dual-control inference pipeline",
          category: "Inference diagram",
          description:
            "Organizes two-stage sampling, temperature controls, CFG weights, decoding, and final audio output in one horizontal figure.",
          prompt:
            "Draw the inference pipeline for a two-stage autoregressive audio model, emphasizing temperature controls, CFG weights, RVQ decoding, and final audio output.",
          meta: "Current project experiment · PNG · 1521 × 271",
          alt: "Experimental inference pipeline for the current AutoDraftman dual-control audio model",
        },
        {
          title: "Semantic structure inspection",
          category: "Structure annotation",
          description:
            "Shows how containers, text, arrows, formulas, images, and functional modules are identified for structure inspection rather than final presentation.",
          prompt:
            "Inspect the semantic structure of a diffusion-model diagram and identify its main containers, functional modules, text, arrows, formulas, and image regions.",
          meta: "Current project inspection material · PNG · 1600 × 1017",
          alt: "Semantic regions and component structure annotations in a diffusion-model research figure",
        },
      ],
    },
    pricing: {
      kicker: "Sketch · Folio · Atlas",
      title: "Choose the generation allowance that fits.",
      body:
        "Live payments are not enabled. Prices, allowances, and storage periods are first-pass product placeholders for discussion.",
      monthly: "Monthly",
      yearly: "Yearly",
      save: "Save up to 21%",
      notice: "Payments not connected",
      choose: "Choose plan",
      current: "Current plan",
      recommended: "Recommended",
      perMonth: "/ month",
      billedYearly: "billed yearly",
      savePerMonth: "Save each month vs monthly",
      freeForever: "For a first experience",
      plans: [
        {
          name: "Sketch",
          description: "Begin with one study and experience the complete workflow.",
          features: ["1 free guest generation", "Standard queue", "PNG, JPG, WebP"],
        },
        {
          name: "Folio",
          description: "Build a working collection of course and research figures.",
          features: ["120 monthly generation credits", "Higher resolution", "Long-term history"],
        },
        {
          name: "Atlas",
          description: "Map a broader body of work for frequent research and small teams.",
          features: ["360 monthly generation credits", "Priority queue", "Longer storage"],
        },
      ],
      toast: "This pricing preview is not connected to a payment provider.",
      footnote:
        "Failed generations with no image do not use credits. Generating again does.",
    },
    auth: {
      title: "Start generating",
      body: "Sign in to save history, or continue with one free guest generation.",
      google: "Continue with Google",
      github: "Continue with GitHub",
      wechat: "Continue with WeChat",
      guest: "Continue as guest",
      guestNote: "Guest files are stored temporarily",
      close: "Close sign-in dialog",
      deployRequired: "Available after API deployment",
      comingSoon: "Coming soon",
      demo: "Sign-in availability is managed by the backend.",
      noProvider: "This is a static preview. Real sign-in activates after the public API is deployed.",
      cancelled: "Authorization was cancelled. Your account was not changed.",
      conflict: "This login identity already belongs to another AutoDraftman account.",
      loginFailed: "Sign-in did not complete. Please try again.",
      connectionError: "The local API is unavailable. Check that Docker is still running.",
      connecting: "Connecting…",
      accountTitle: "Your account",
      accountBody: "Different login methods can open the same AutoDraftman account.",
      linked: "Linked",
      addLogin: "Add a login method",
      unlink: "Unlink",
      logout: "Sign out",
      lastLogin: "At least one login method must remain linked.",
      noEmail: "No email provided",
      creditActivity: "Credit activity",
      noTransactions: "No credit changes yet.",
      creditAfter: "After",
      granted: "Credits granted",
      reserved: "Credits reserved",
      settled: "Generation settled",
      released: "Credits released",
      refunded: "Credits refunded",
      adjusted: "Credit adjustment",
      dangerZone: "Account management",
      deleteAccount: "Close account",
      deleteTitle: "Close this account?",
      deleteBody:
        "Sign-in methods are removed immediately and the account and content become inaccessible. Primary files are scheduled for removal within 24 hours and account records after 30 days.",
      deleteConfirm: "Close account",
      cancelDelete: "Keep account",
    },
  },
} as const;

type UiCopy = (typeof copy)[Language];

function isRoutePath(value: string): value is RoutePath {
  return [
    "/",
    "/examples",
    "/workspace",
    "/pricing",
    "/docs",
    "/privacy",
    "/terms",
    "/content-policy",
  ].includes(value as RoutePath);
}

function routeFromLocation(pathname: string): RoutePath {
  const relativePath =
    siteBasePath && pathname.startsWith(`${siteBasePath}/`)
      ? pathname.slice(siteBasePath.length)
      : pathname === siteBasePath
        ? "/"
        : pathname;
  const normalizedPath =
    relativePath.length > 1 ? relativePath.replace(/\/+$/, "") : relativePath;
  return isRoutePath(normalizedPath) ? normalizedPath : "/";
}

function routeHref(path: RoutePath) {
  return path === "/" ? import.meta.env.BASE_URL : sitePath(path);
}

function InternalLink({
  href,
  onNavigate,
  children,
  className,
}: {
  href: RoutePath;
  onNavigate: (path: RoutePath) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      className={className}
      href={routeHref(href)}
      onClick={(event) => {
        event.preventDefault();
        onNavigate(href);
      }}
    >
      {children}
    </a>
  );
}

function Brand({ onNavigate }: { onNavigate: (path: RoutePath) => void }) {
  return (
    <InternalLink className="brand" href="/" onNavigate={onNavigate}>
      <span className="brand-name">
        autodraftman<span className="brand-period">.</span>
      </span>
    </InternalLink>
  );
}

function HeroDraftingIllustration({ label }: { label: string }) {
  return (
    <div
      className="hero-drafting-illustration"
      role="img"
      aria-label={label}
      style={{
        backgroundImage: `url("${sitePath("/assets/autodraftman-drafting-sheet-hero.png")}")`,
      }}
    />
  );
}

function EditorialMotif({ kind }: { kind: "thread" | "privacy" }) {
  if (kind === "privacy") {
    return (
      <svg className="editorial-motif privacy-motif" viewBox="0 0 150 130" aria-hidden="true">
        <path className="motif-carrier" d="M31 28c24-19 69-18 90 5 20 22 15 62-7 82-25 22-74 15-92-9-16-22-12-61 9-78Z" />
        <path className="motif-line" d="M48 72c0-23 12-36 29-36 19 0 31 14 31 36" />
        <path className="motif-line" d="M43 69c18-12 50-13 69 0v34H43Z" />
        <circle className="motif-node clay" cx="77" cy="82" r="8" />
        <path className="motif-line small" d="M77 89v10" />
      </svg>
    );
  }

  return (
    <svg className="editorial-motif thread-motif" viewBox="0 0 160 130" aria-hidden="true">
      <path className="motif-carrier" d="M25 38c27-29 83-25 110 2 24 25 17 63-10 78-31 17-91 7-108-23-10-19-5-43 8-57Z" />
      <path className="motif-line" d="M30 82c17-42 34 22 54-20 19-39 33 31 52-12" />
      <circle className="motif-node" cx="30" cy="82" r="7" />
      <circle className="motif-node clay" cx="84" cy="62" r="8" />
      <circle className="motif-node" cx="136" cy="50" r="7" />
    </svg>
  );
}

const planMarkSources = [
  sitePath("/assets/pricing-sketch-v2.png"),
  sitePath("/assets/pricing-folio-v2.png"),
  sitePath("/assets/pricing-atlas-v2.png"),
];

function PlanMark({ level, label }: { level: number; label: string }) {
  return (
    <figure className={`plan-mark plan-mark-${level}`}>
      <img
        src={planMarkSources[level]}
        alt={label}
        width={1254}
        height={1254}
      />
    </figure>
  );
}

function Header({
  language,
  identity,
  accountName,
  ui,
  route,
  onLanguageChange,
  onNavigate,
  onSignIn,
}: {
  language: Language;
  identity: Identity;
  accountName: string | null;
  ui: UiCopy;
  route: RoutePath;
  onLanguageChange: () => void;
  onNavigate: (path: RoutePath) => void;
  onSignIn: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = (path: RoutePath) => {
    setMenuOpen(false);
    onNavigate(path);
  };

  return (
    <header className="site-header">
      <div className="header-inner shell">
        <Brand onNavigate={navigate} />
        <nav className="desktop-nav" aria-label="Primary navigation">
          {(
            [
              ["/", ui.nav.product],
              ["/examples", ui.nav.examples],
              ["/docs", ui.nav.docs],
              ["/pricing", ui.nav.pricing],
              ["/workspace", ui.nav.workspace],
            ] as const
          ).map(([path, label]) => (
            <InternalLink
              key={path}
              className={route === path ? "nav-link active" : "nav-link"}
              href={path}
              onNavigate={navigate}
            >
              {label}
            </InternalLink>
          ))}
        </nav>
        <div className="header-actions">
          <button
            className="language-button"
            type="button"
            onClick={onLanguageChange}
            aria-label={language === "zh" ? "Switch to English" : "切换到中文"}
          >
            <Globe size={16} />
            <span>{language === "zh" ? "EN" : "中文"}</span>
          </button>
          <button className="account-button" type="button" onClick={onSignIn}>
            <span>
              {identity === "guest"
                ? ui.nav.guest
                : identity === "user"
                  ? accountName || ui.nav.account
                  : ui.nav.signIn}
            </span>
          </button>
          <button
            className="mobile-menu-button"
            type="button"
            aria-label={ui.nav.menu}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={20} /> : <List size={20} />}
          </button>
        </div>
      </div>
      {menuOpen && (
        <nav className="mobile-nav" aria-label="Mobile navigation">
          <InternalLink href="/" onNavigate={navigate}>
            {ui.nav.product}
          </InternalLink>
          <InternalLink href="/examples" onNavigate={navigate}>
            {ui.nav.examples}
          </InternalLink>
          <InternalLink href="/docs" onNavigate={navigate}>
            {ui.nav.docs}
          </InternalLink>
          <InternalLink href="/pricing" onNavigate={navigate}>
            {ui.nav.pricing}
          </InternalLink>
          <InternalLink href="/workspace" onNavigate={navigate}>
            {ui.nav.workspace}
          </InternalLink>
        </nav>
      )}
    </header>
  );
}

function ProductStory({ ui }: { ui: UiCopy }) {
  const [activeStep, setActiveStep] = useState(0);
  const stepRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    let animationFrame = 0;

    const updateActiveStep = () => {
      animationFrame = 0;
      const viewportAnchor = window.innerHeight * 0.5;
      let nextStep = 0;
      let closestDistance = Number.POSITIVE_INFINITY;

      stepRefs.current.forEach((step, index) => {
        if (!step) return;
        const bounds = step.getBoundingClientRect();
        const distance =
          viewportAnchor < bounds.top
            ? bounds.top - viewportAnchor
            : viewportAnchor > bounds.bottom
              ? viewportAnchor - bounds.bottom
              : 0;
        const centerDistance = Math.abs(bounds.top + bounds.height / 2 - viewportAnchor);
        const score = distance * window.innerHeight + centerDistance;

        if (score < closestDistance) {
          closestDistance = score;
          nextStep = index;
        }
      });

      setActiveStep((currentStep) => (currentStep === nextStep ? currentStep : nextStep));
    };

    const requestUpdate = () => {
      if (animationFrame) return;
      animationFrame = window.requestAnimationFrame(updateActiveStep);
    };

    updateActiveStep();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <div className="story-layout">
      <div className="story-visual-column">
        <div className="story-canvas" aria-live="polite">
          <div className="story-canvas-top">
            <span>{String(activeStep + 1).padStart(2, "0")}</span>
            <span>{ui.home.steps[activeStep].label}</span>
          </div>
          <div className="story-frames">
            <div className={activeStep === 0 ? "story-frame active" : "story-frame"}>
              <p className="story-field-label">{ui.workspace.promptLabel}</p>
              <p className="story-prompt">{ui.home.stagePrompt}</p>
              <div className="prompt-measure" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            </div>
            <div className={activeStep === 1 ? "story-frame active" : "story-frame"}>
              <div className="reference-preview">
                <img src={figureAssetPath} alt="" width={2048} height={544} />
              </div>
              <div className="reference-note">
                <Check size={18} weight="bold" />
                <div>
                  <strong>{ui.home.stageReference}</strong>
                  <span>PNG · 2048 × 544</span>
                </div>
              </div>
            </div>
            <div className={activeStep === 2 ? "story-frame active" : "story-frame"}>
              <div className="final-preview">
                <img
                  src={figureAssetPath}
                  alt={ui.home.resultAlt}
                  width={2048}
                  height={544}
                />
              </div>
              <div className="final-meta">
                <span>{ui.home.stageComplete}</span>
                <span>PNG · 16:9</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="story-steps">
        {ui.home.steps.map((step, index) => {
          const state =
            activeStep === index ? "active" : index < activeStep ? "past" : "upcoming";

          return (
            <article
              aria-current={activeStep === index ? "step" : undefined}
              className={`story-step ${state}`}
              data-step={index}
              key={step.title}
              ref={(node) => {
                stepRefs.current[index] = node;
              }}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function HomePage({
  ui,
  language,
  onNavigate,
}: {
  ui: UiCopy;
  language: Language;
  onNavigate: (path: RoutePath) => void;
}) {
  return (
    <main className="home-page page-enter">
      <section className="editorial-hero shell">
        <div className="hero-copy">
          <p className="kicker">{ui.home.kicker}</p>
          <h1>{ui.home.title}</h1>
          <p className="hero-body">{ui.home.body}</p>
          <div className="hero-actions">
            <InternalLink
              className="button primary-button"
              href="/workspace"
              onNavigate={onNavigate}
            >
              {ui.home.primary}
              <ArrowRight size={18} />
            </InternalLink>
            <InternalLink
              className="text-link"
              href="/examples"
              onNavigate={onNavigate}
            >
              {ui.home.secondary}
              <ArrowUpRight size={16} />
            </InternalLink>
          </div>
        </div>
        <figure className="hero-art">
          <HeroDraftingIllustration label={ui.home.figureAlt} />
          <figcaption>
            <span>AutoDraftman / 01</span>
            <span>{ui.home.figureCaption}</span>
          </figcaption>
        </figure>
      </section>

      <section className="product-notes shell" aria-label="Product principles">
        {[ui.home.pointOne, ui.home.pointTwo, ui.home.pointThree].map(
          (point, index) => (
            <p key={point}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {point}
            </p>
          ),
        )}
      </section>

      <section className="story-section shell">
        <div className="story-decoration">
          <EditorialMotif kind="thread" />
        </div>
        <header className="section-intro">
          <p className="kicker">{ui.home.storyKicker}</p>
          <h2>{ui.home.storyTitle}</h2>
          <p>{ui.home.storyBody}</p>
        </header>
        <ProductStory ui={ui} />
      </section>

      <section className="privacy-section">
        <div className="privacy-inner shell">
          <div className="privacy-decoration">
            <EditorialMotif kind="privacy" />
          </div>
          <p className="kicker">{ui.home.privacyKicker}</p>
          <div className="privacy-grid">
            <h2>{ui.home.privacyTitle}</h2>
            <div>
              <p>{ui.home.privacyBody}</p>
              <ul>
                {ui.home.privacyItems.map((item) => (
                  <li key={item}>
                    <Check size={16} weight="bold" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="closing-section shell">
        <div>
          <h2>{ui.home.closingTitle}</h2>
          <p>{ui.home.closingBody}</p>
        </div>
        <InternalLink
          className="button primary-button"
          href="/workspace"
          onNavigate={onNavigate}
        >
          {ui.home.primary}
          <ArrowRight size={18} />
        </InternalLink>
      </section>

      <Footer ui={ui} language={language} onNavigate={onNavigate} />
    </main>
  );
}

function ExamplesPage({
  ui,
  language,
  onNavigate,
}: {
  ui: UiCopy;
  language: Language;
  onNavigate: (path: RoutePath) => void;
}) {
  const examples = exampleArtifacts.map((artifact, index) => ({
    ...artifact,
    ...ui.examples.cases[index],
  }));

  return (
    <main className="examples-page page-enter">
      <section className="examples-hero shell">
        <div>
          <p className="kicker">{ui.examples.kicker}</p>
          <h1>{ui.examples.title}</h1>
        </div>
        <div className="examples-hero-copy">
          <p>{ui.examples.body}</p>
          <div className="examples-notice">
            <FileImage size={19} weight="duotone" />
            <p>{ui.examples.notice}</p>
          </div>
        </div>
      </section>

      <section className="examples-gallery shell" aria-label={ui.nav.examples}>
        {examples.map((example, index) => (
          <article
            className={`example-case example-case-${index + 1}`}
            key={example.id}
          >
            <header className="example-case-heading">
              <div>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <p>{example.category}</p>
              </div>
              <span>{ui.examples.artifact}</span>
            </header>
            <div className="example-case-visual">
              <img
                src={example.src}
                alt={example.alt}
                width={example.width}
                height={example.height}
              />
            </div>
            <div className="example-case-copy">
              <div>
                <h2>{example.title}</h2>
                <p>{example.description}</p>
              </div>
              <blockquote>{example.prompt}</blockquote>
              <div className="example-case-footer">
                <span>{example.meta}</span>
                <button
                 className="text-link"
                 type="button"
                  onClick={() => onNavigate("/workspace")}
                >
                  {ui.examples.openWorkspace}
                  <ArrowRight size={17} />
                </button>
              </div>
            </div>
          </article>
        ))}
      </section>

      <Footer ui={ui} language={language} onNavigate={onNavigate} />
    </main>
  );
}

function WorkspacePage({
  ui,
  language,
  identity,
  credits,
  requestAuth,
}: {
  ui: UiCopy;
  language: Language;
  identity: Identity;
  credits: number | null;
  requestAuth: (action: () => void) => void;
}) {
  const [mode, setMode] = useState<"text" | "reference">("text");
  const [prompt, setPrompt] = useState("");
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState("");
  const [referenceAsset, setReferenceAsset] = useState<Asset | null>(null);
  const [referenceStatus, setReferenceStatus] =
    useState<ReferenceUploadStatus>("idle");
  const [referenceProgress, setReferenceProgress] = useState(0);
  const [referenceError, setReferenceError] = useState("");
  const [ratio, setRatio] = useState("16:9");
  const [format, setFormat] = useState("PNG");
  const [isPublic, setIsPublic] = useState(false);
  const [status] = useState<GenerateStatus>("empty");
  const [progress] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(true);
  const [historyCollapsed, setHistoryCollapsed] = useState(
    () => window.localStorage.getItem("autodraftman-history-collapsed") === "true",
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const uploadAbortRef = useRef<AbortController | null>(null);
  const activeUploadAssetIdRef = useRef<string | null>(null);
  const uploadSequenceRef = useRef(0);
  const previewUrlRef = useRef("");

  const uploadBusy = ["preparing", "uploading", "verifying"].includes(
    referenceStatus,
  );
  useEffect(
    () => () => {
      uploadAbortRef.current?.abort();
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    [],
  );

  useEffect(() => {
    window.localStorage.setItem(
      "autodraftman-history-collapsed",
      String(historyCollapsed),
    );
  }, [historyCollapsed]);

  const replacePreview = (file: File | null) => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const nextPreview = file ? URL.createObjectURL(file) : "";
    previewUrlRef.current = nextPreview;
    setReferencePreview(nextPreview);
  };

  const mediaTypeFor = (file: File) => {
    if (["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      return file.type;
    }
    const suffix = file.name.toLowerCase().split(".").pop();
    if (suffix === "png") return "image/png";
    if (suffix === "jpg" || suffix === "jpeg") return "image/jpeg";
    if (suffix === "webp") return "image/webp";
    return "";
  };

  const uploadReference = async (file: File, mediaType: string) => {
    const sequence = ++uploadSequenceRef.current;
    const controller = new AbortController();
    const previousAsset = referenceAsset;
    let pendingAssetId: string | null = null;
    uploadAbortRef.current?.abort();
    uploadAbortRef.current = controller;
    setReferenceStatus("preparing");
    setReferenceProgress(0);
    setReferenceError("");
    setMessage("");

    try {
      const intent = await createAssetUploadIntent(file, mediaType);
      pendingAssetId = intent.asset.id;
      activeUploadAssetIdRef.current = intent.asset.id;
      if (sequence !== uploadSequenceRef.current) {
        void deleteAsset(intent.asset.id).catch(() => undefined);
        return;
      }

      setReferenceStatus("uploading");
      await uploadToPresignedUrl(
        intent.upload,
        file,
        setReferenceProgress,
        controller.signal,
      );
      if (sequence !== uploadSequenceRef.current) return;

      setReferenceStatus("verifying");
      const completedAsset = await completeAssetUpload(intent.asset.id);
      if (sequence !== uploadSequenceRef.current) {
        void deleteAsset(completedAsset.id).catch(() => undefined);
        return;
      }

      activeUploadAssetIdRef.current = null;
      uploadAbortRef.current = null;
      setReferenceAsset(completedAsset);
      setReferenceStatus("ready");
      setReferenceProgress(100);
      if (previousAsset && previousAsset.id !== completedAsset.id) {
        void deleteAsset(previousAsset.id).catch(() => undefined);
      }
    } catch {
      if (pendingAssetId) {
        void deleteAsset(pendingAssetId).catch(() => undefined);
      }
      if (sequence !== uploadSequenceRef.current) return;
      activeUploadAssetIdRef.current = null;
      uploadAbortRef.current = null;
      setReferenceStatus("error");
      setReferenceError(
        controller.signal.aborted
          ? ui.workspace.uploadCancelled
          : ui.workspace.uploadFailed,
      );
    }
  };

  const startGeneration = () => {
    setMessage(ui.workspace.generationUnavailable);
  };

  const handleGenerate = () => {
    if (!prompt.trim()) {
      setMessage(ui.workspace.promptError);
      return;
    }
    if (identity && (credits ?? 0) <= 0) {
      setMessage(ui.workspace.noCredits);
      return;
    }
    if (mode === "reference" && referenceStatus !== "ready") {
      setMessage(ui.workspace.uploadBeforeGenerate);
      return;
    }
    requestAuth(startGeneration);
  };

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    event.target.value = "";
    if (!selected) return;

    const mediaType = mediaTypeFor(selected);
    setReferenceFile(selected);
    replacePreview(selected);
    setReferenceProgress(0);
    setReferenceError("");
    if (!mediaType) {
      setReferenceStatus("error");
      setReferenceError(ui.workspace.uploadUnsupported);
      return;
    }
    if (selected.size <= 0) {
      setReferenceStatus("error");
      setReferenceError(ui.workspace.uploadEmpty);
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      setReferenceStatus("error");
      setReferenceError(ui.workspace.uploadTooLarge);
      return;
    }
    if (!apiConfigured) {
      setReferenceStatus("error");
      setReferenceError(ui.workspace.uploadRequiresApi);
      return;
    }
    setReferenceStatus("idle");
    requestAuth(() => void uploadReference(selected, mediaType));
  };

  const cancelReferenceUpload = () => {
    uploadSequenceRef.current += 1;
    uploadAbortRef.current?.abort();
    uploadAbortRef.current = null;
    const pendingAssetId = activeUploadAssetIdRef.current;
    activeUploadAssetIdRef.current = null;
    if (pendingAssetId) {
      void deleteAsset(pendingAssetId).catch(() => undefined);
    }
    setReferenceStatus("error");
    setReferenceError(ui.workspace.uploadCancelled);
  };

  const removeReference = () => {
    uploadSequenceRef.current += 1;
    uploadAbortRef.current?.abort();
    uploadAbortRef.current = null;
    const ids = new Set(
      [activeUploadAssetIdRef.current, referenceAsset?.id].filter(
        (value): value is string => Boolean(value),
      ),
    );
    activeUploadAssetIdRef.current = null;
    for (const assetId of ids) {
      void deleteAsset(assetId).catch(() => undefined);
    }
    setReferenceFile(null);
    setReferenceAsset(null);
    setReferenceStatus("idle");
    setReferenceProgress(0);
    setReferenceError("");
    replacePreview(null);
  };

  const startNewDraft = () => {
    removeReference();
    setMode("text");
    setPrompt("");
    setRatio("16:9");
    setFormat("PNG");
    setIsPublic(false);
    setSettingsOpen(false);
    setHistoryVisible(true);
    setMessage("");
  };

  const referenceStatusLabel = (() => {
    if (referenceStatus === "preparing") return ui.workspace.uploadPreparing;
    if (referenceStatus === "uploading") {
      return `${ui.workspace.uploadProgress} · ${referenceProgress}%`;
    }
    if (referenceStatus === "verifying") return ui.workspace.uploadVerifying;
    if (referenceStatus === "ready") return ui.workspace.uploadReady;
    if (referenceStatus === "error") return referenceError;
    return ui.workspace.uploadPrivateNote;
  })();

  const handlePromptKeyDown = (
    event: ReactKeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      handleGenerate();
    }
  };

  return (
    <main
      className={`workspace-page page-enter ${
        historyCollapsed ? "history-collapsed" : ""
      }`}
    >
      <aside className="workspace-history" aria-label={ui.workspace.history}>
        <div className="workspace-history-heading">
          <button
            type="button"
            className="history-collapse-button"
            aria-label={
              historyCollapsed
                ? ui.workspace.expandHistory
                : ui.workspace.collapseHistory
            }
            title={
              historyCollapsed
                ? ui.workspace.expandHistory
                : ui.workspace.collapseHistory
            }
            onClick={() => setHistoryCollapsed((value) => !value)}
          >
            {historyCollapsed ? <CaretRight size={18} /> : <CaretLeft size={18} />}
            <span>{ui.workspace.history}</span>
          </button>
        </div>

        <button className="new-draft-button" type="button" onClick={startNewDraft}>
          <Plus size={18} />
          <span>{ui.workspace.newDraft}</span>
        </button>

        <div className="workspace-records">
          {!historyCollapsed && (
            <p className="workspace-records-label">{ui.workspace.history}</p>
          )}
          {status === "complete" && historyVisible ? (
            <article className="workspace-record">
              <FileImage size={19} />
              <div>
                <strong>{ui.workspace.historyItem}</strong>
                <small>
                  {language === "zh" ? "刚刚生成" : "Generated just now"}
                </small>
              </div>
              {!historyCollapsed && (
                <button
                  type="button"
                  aria-label={ui.workspace.delete}
                  title={ui.workspace.delete}
                  onClick={() => setHistoryVisible(false)}
                >
                  <Trash size={16} />
                </button>
              )}
            </article>
          ) : prompt.trim() ? (
            <div className="workspace-record current" aria-current="true">
              <NotePencil size={19} />
              <div>
                <strong>{prompt.trim()}</strong>
                <small>{ui.workspace.draftPending}</small>
              </div>
            </div>
          ) : (
            !historyCollapsed && (
              <div className="workspace-history-empty">
                <FileImage size={22} />
                <p>{ui.workspace.historyHint}</p>
              </div>
            )
          )}
        </div>

        <div className="workspace-history-account">
          <UserCircle size={21} />
          <div>
            <strong>{credits ?? "—"}</strong>
            <small>{ui.workspace.credits}</small>
          </div>
        </div>
      </aside>

      <div className="workspace-canvas">
        <header className="workspace-heading">
          <div className="workspace-heading-copy">
            <div className="workspace-heading-topline">
              <p className="kicker">{ui.workspace.eyebrow}</p>
              <span className="kernel-status">
                <i aria-hidden="true" />
                {ui.workspace.kernelPending}
              </span>
            </div>
            <div className="workspace-title-line">
              <h1>{ui.workspace.title}</h1>
              <span>{ui.workspace.draftLabel} / 01</span>
            </div>
            <p>{ui.workspace.subtitle}</p>
          </div>
          <div className="workspace-heading-actions">
            <button
              className="workspace-mobile-history"
              type="button"
              onClick={() => setHistoryOpen(true)}
            >
              <ClockCounterClockwise size={17} />
              {ui.workspace.history}
            </button>
            <div className="workspace-balance">
              <span>{ui.workspace.credits}</span>
              <strong>{credits ?? "—"}</strong>
            </div>
          </div>
        </header>

        <div className="workspace-layout">
        <aside className="control-panel">
          <div className="mode-switch" aria-label="Generation mode">
            <button
              type="button"
              className={mode === "text" ? "selected" : ""}
              aria-pressed={mode === "text"}
              onClick={() => setMode("text")}
            >
              <TextT size={17} />
              {ui.workspace.modeText}
            </button>
            <button
              type="button"
              className={mode === "reference" ? "selected" : ""}
              aria-pressed={mode === "reference"}
              onClick={() => setMode("reference")}
            >
              <ImageSquare size={17} />
              {ui.workspace.modeReference}
            </button>
          </div>

          <div className="form-block prompt-block">
            <label htmlFor="figure-prompt">{ui.workspace.promptLabel}</label>
            <textarea
              id="figure-prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={handlePromptKeyDown}
              placeholder={ui.workspace.promptPlaceholder}
              aria-describedby={message ? "prompt-message" : "prompt-help"}
              aria-invalid={message ? "true" : undefined}
            />
            <div className="field-meta">
              {message ? (
                <p className="field-message" id="prompt-message" role="status">
                  {message}
                </p>
              ) : (
                <p className="field-help" id="prompt-help">
                  {ui.workspace.promptHelp}
                </p>
              )}
              <span>{prompt.length}/1200</span>
            </div>
          </div>

          {mode === "reference" && (
            <div className="form-block reference-block">
              <label htmlFor="reference-file">{ui.workspace.referenceLabel}</label>
              {referenceFile && referencePreview ? (
                <div className={`reference-upload-card ${referenceStatus}`}>
                  <img src={referencePreview} alt="" />
                  <div className="reference-upload-copy">
                    <strong>{referenceFile.name}</strong>
                    <small>{referenceStatusLabel}</small>
                    {uploadBusy && (
                      <span
                        className="reference-progress"
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={referenceProgress}
                      >
                        <span style={{ width: `${referenceProgress}%` }} />
                      </span>
                    )}
                    {referenceStatus === "ready" && referenceAsset && (
                      <small>
                        {referenceAsset.width_px} × {referenceAsset.height_px} ·{" "}
                        {(referenceAsset.byte_size / 1024 / 1024).toFixed(1)} MB
                      </small>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={uploadBusy ? cancelReferenceUpload : removeReference}
                    aria-label={
                      uploadBusy
                        ? ui.workspace.uploadCancel
                        : ui.workspace.uploadRemove
                    }
                    title={
                      uploadBusy
                        ? ui.workspace.uploadCancel
                        : ui.workspace.uploadRemove
                    }
                  >
                    {uploadBusy ? <X size={18} /> : <Trash size={17} />}
                  </button>
                </div>
              ) : (
                <label className="upload-zone" htmlFor="reference-file">
                  <UploadSimple size={20} />
                  <span>
                    <strong>{ui.workspace.uploadTitle}</strong>
                    <small>{ui.workspace.uploadBody}</small>
                  </span>
                </label>
              )}
              {referenceFile && !uploadBusy && (
                <label className="reference-replace" htmlFor="reference-file">
                  <UploadSimple size={15} />
                  {ui.workspace.replace}
                </label>
              )}
              <input
                className="sr-only"
                id="reference-file"
                type="file"
                accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                onChange={handleFile}
                disabled={uploadBusy}
              />
            </div>
          )}

          <div className={settingsOpen ? "settings-disclosure open" : "settings-disclosure"}>
            <button
              className="settings-summary"
              type="button"
              data-allow-wrap="true"
              aria-expanded={settingsOpen}
              onClick={() => setSettingsOpen((value) => !value)}
            >
              <span>
                <strong>{ui.workspace.technicalSummary}</strong>
                <small>
                  {ratio} · {format} ·{" "}
                  {isPublic ? ui.workspace.public : ui.workspace.private}
                </small>
              </span>
              <CaretRight size={17} aria-hidden="true" />
              <span className="sr-only">
                {settingsOpen
                  ? ui.workspace.settingsClose
                  : ui.workspace.settingsOpen}
              </span>
            </button>

            {settingsOpen && (
              <div className="settings-disclosure-body">
                <div className="settings-block">
                  <p>{ui.workspace.settings}</p>
                  <div className="settings-grid">
                    <fieldset>
                      <legend>{ui.workspace.ratio}</legend>
                      <div className="choice-row">
                        {["16:9", "4:3", "1:1"].map((item) => (
                          <button
                            key={item}
                            type="button"
                            className={ratio === item ? "selected" : ""}
                            aria-pressed={ratio === item}
                            onClick={() => setRatio(item)}
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    </fieldset>
                    <label className="format-field">
                      <span>{ui.workspace.format}</span>
                      <select
                        value={format}
                        onChange={(event) => setFormat(event.target.value)}
                      >
                        <option>PNG</option>
                        <option>JPG</option>
                        <option>WebP</option>
                      </select>
                    </label>
                  </div>
                </div>

                <div className="privacy-control">
                  <div>
                    <LockKey size={17} />
                    <span>
                      <strong>{ui.workspace.privacy}</strong>
                      <small>
                        {isPublic
                          ? ui.workspace.publicToggle
                          : ui.workspace.privateToggle}
                      </small>
                    </span>
                  </div>
                  <button
                    type="button"
                    className={isPublic ? "toggle on" : "toggle"}
                    aria-pressed={isPublic}
                    aria-label={
                      isPublic
                        ? ui.workspace.publicToggle
                        : ui.workspace.privateToggle
                    }
                    onClick={() => setIsPublic((value) => !value)}
                  >
                    <span />
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            className="generate-button"
            type="button"
            disabled={status === "generating"}
            onClick={handleGenerate}
          >
            {status === "generating" ? (
              <>
                <span className="button-loader" aria-hidden="true" />
                {ui.workspace.generating}
              </>
            ) : (
              <>
                {ui.workspace.generate}
                <ArrowRight size={18} />
              </>
            )}
          </button>
          <p className="mock-note">{ui.workspace.mockNotice}</p>
        </aside>

        <section className="result-panel" aria-live="polite">
          <header className="result-toolbar">
            <div className="result-status">
              <span
                className={status === "generating" ? "status-mark working" : "status-mark"}
                aria-hidden="true"
              />
              <span>
                {status === "complete"
                 ? ui.workspace.completed
                 : status === "generating"
                   ? ui.workspace.generating
                    : ui.workspace.idleStatus}
              </span>
              {status === "complete" && (
                <span className="privacy-badge">
                  {isPublic ? ui.workspace.public : ui.workspace.private}
                </span>
              )}
            </div>
            <div className="result-metadata" aria-label={ui.workspace.technicalSummary}>
              <span>{ratio}</span>
              <span>{format}</span>
              <span>{isPublic ? ui.workspace.public : ui.workspace.private}</span>
            </div>
          </header>

          <div className={`result-stage ratio-${ratio.replace(":", "-")}`}>
            {status === "empty" && (
              <div className="empty-result">
                <span className="empty-sheet-index">FIGURE / 01</span>
                <div className="empty-result-content">
                  <span className="empty-result-mark" aria-hidden="true">
                    <FileImage size={22} weight="duotone" />
                  </span>
                  <div>
                    <h2>{ui.workspace.emptyTitle}</h2>
                    <p>{ui.workspace.emptyBody}</p>
                  </div>
                </div>
                <span className="empty-sheet-meta">
                  {ratio} · {format}
                </span>
              </div>
            )}
            {status === "generating" && (
              <div className="generation-state">
                <div className="generation-lines" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                <div className="progress-copy">
                  <div>
                    <h2>{ui.workspace.progressTitle}</h2>
                    <p>{ui.workspace.progressBody}</p>
                  </div>
                  <strong>{progress}%</strong>
                </div>
                <div
                  className="progress-track"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress}
                >
                  <span style={{ transform: `scaleX(${progress / 100})` }} />
                </div>
              </div>
            )}
            {status === "complete" && (
              <div className="complete-result">
                <img
                  src={figureAssetPath}
                  alt={ui.home.resultAlt}
                  width={2048}
                  height={544}
                />
              </div>
            )}
          </div>

          {status === "complete" && (
            <div className="result-actions">
              <a
                className="button secondary-button"
                href={figureAssetPath}
                download={`autodraftman-result.${format.toLowerCase()}`}
              >
                <DownloadSimple size={18} />
                {ui.workspace.download}
              </a>
              <button className="button primary-button" type="button" onClick={handleGenerate}>
                {ui.workspace.regenerate}
                <ArrowRight size={18} />
              </button>
            </div>
          )}

        </section>
      </div>
      </div>

      {historyOpen && (
        <div
          className="drawer-backdrop"
          role="presentation"
          onMouseDown={() => setHistoryOpen(false)}
        >
          <aside
            className="history-drawer"
            aria-label={ui.workspace.history}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="drawer-heading">
              <h2>{ui.workspace.history}</h2>
              <button
                type="button"
                aria-label={ui.workspace.closeHistory}
                onClick={() => setHistoryOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            {status === "complete" && historyVisible ? (
              <article className="history-item">
                <img src={figureAssetPath} alt="" width={2048} height={544} />
                <div>
                  <h3>{ui.workspace.historyItem}</h3>
                  <p>{language === "zh" ? "刚刚生成" : "Generated just now"}</p>
                </div>
                <button
                  type="button"
                  aria-label={ui.workspace.delete}
                  title={ui.workspace.delete}
                  onClick={() => setHistoryVisible(false)}
                >
                  <Trash size={18} />
                </button>
              </article>
            ) : (
              <div className="drawer-empty">
                <FileImage size={27} />
                <p>{ui.workspace.historyEmpty}</p>
              </div>
            )}
          </aside>
        </div>
      )}

    </main>
  );
}

const planPrices = [
  { monthly: 0, yearly: 0 },
  { monthly: 15, yearly: 12 },
  { monthly: 39, yearly: 31 },
] as const;

function PricingPage({
  ui,
  language,
  onNavigate,
}: {
  ui: UiCopy;
  language: Language;
  onNavigate: (path: RoutePath) => void;
}) {
  const [billing, setBilling] = useState<BillingCycle>("monthly");
  const [toast, setToast] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(false), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return (
    <main className="pricing-page page-enter">
      <section className="pricing-intro shell">
        <p className="kicker">{ui.pricing.kicker}</p>
        <h1>{ui.pricing.title}</h1>
        <p>{ui.pricing.body}</p>
        <div className="billing-switch" aria-label="Billing cycle">
          <button
            type="button"
            className={billing === "monthly" ? "selected" : ""}
            aria-pressed={billing === "monthly"}
            onClick={() => setBilling("monthly")}
          >
            {ui.pricing.monthly}
          </button>
          <button
            type="button"
            className={billing === "yearly" ? "selected" : ""}
            aria-pressed={billing === "yearly"}
            data-allow-wrap="true"
            onClick={() => setBilling("yearly")}
          >
            {ui.pricing.yearly}
            <span>{ui.pricing.save}</span>
          </button>
        </div>
      </section>

      <section className="pricing-grid shell" aria-label={ui.nav.pricing}>
        {ui.pricing.plans.map((plan, index) => {
          const amount =
            billing === "monthly"
              ? planPrices[index].monthly
              : planPrices[index].yearly;
          return (
            <article className={index === 1 ? "pricing-card featured" : "pricing-card"} key={plan.name}>
              <div className="plan-topline">
                <span>{String(index + 1).padStart(2, "0")}</span>
                {index === 1 && <span>{ui.pricing.recommended}</span>}
              </div>
              <PlanMark
                level={index}
                label={`${plan.name} ${ui.nav.pricing}`}
              />
              <div className="plan-heading">
                <h2>{plan.name}</h2>
                <p>{plan.description}</p>
              </div>
              <div className="plan-price">
                {billing === "yearly" && amount > 0 && (
                  <del>${planPrices[index].monthly}</del>
                )}
                <strong>${amount}</strong>
                {amount > 0 && <span>{ui.pricing.perMonth}</span>}
              </div>
              <div className="billing-detail">
                {amount === 0 ? (
                  <span>{ui.pricing.freeForever}</span>
                ) : billing === "yearly" ? (
                  <>
                    <strong>
                      {ui.pricing.savePerMonth} $
                      {planPrices[index].monthly - amount}
                    </strong>
                    <span>
                      {ui.pricing.billedYearly} · ${amount * 12}
                    </span>
                  </>
                ) : (
                  <span>{ui.pricing.notice}</span>
                )}
              </div>
              <button
                className={index === 1 ? "button primary-button" : "button secondary-button"}
                type="button"
                onClick={() => setToast(true)}
              >
                {index === 0 ? ui.pricing.current : ui.pricing.choose}
              </button>
              <div className="plan-rule" />
              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <Check size={17} weight="bold" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </section>

      <p className="pricing-footnote shell">{ui.pricing.footnote}</p>

      <section className="pricing-closing shell">
        <div>
          <h2>{ui.home.closingTitle}</h2>
          <p>{ui.home.closingBody}</p>
        </div>
        <button
          className="button primary-button"
          type="button"
          onClick={() => onNavigate("/workspace")}
        >
          {ui.home.primary}
          <ArrowRight size={18} />
        </button>
      </section>

      <Footer ui={ui} language={language} onNavigate={onNavigate} />
      {toast && (
        <div className="toast" role="status">
          <LockKey size={18} />
          {ui.pricing.toast}
        </div>
      )}
    </main>
  );
}

function Footer({
  ui,
  language,
  onNavigate,
}: {
  ui: UiCopy;
  language: Language;
  onNavigate: (path: RoutePath) => void;
}) {
  const footer = footerCopy[language];

  return (
    <footer className="site-footer">
      <div className="footer-directory shell">
        <div className="footer-lead">
          <Brand onNavigate={onNavigate} />
          <p>{ui.home.footerStatement}</p>
          <span>{ui.home.footer}</span>
        </div>
        <nav aria-label={footer.product}>
          <p>{footer.product}</p>
          <InternalLink href="/examples" onNavigate={onNavigate}>
            {footer.examples}
          </InternalLink>
          <InternalLink href="/workspace" onNavigate={onNavigate}>
            {footer.workspace}
          </InternalLink>
          <InternalLink href="/pricing" onNavigate={onNavigate}>
            {footer.pricing}
          </InternalLink>
        </nav>
        <nav aria-label={footer.resources}>
          <p>{footer.resources}</p>
          <InternalLink href="/docs" onNavigate={onNavigate}>
            {footer.docs}
          </InternalLink>
          <InternalLink href="/privacy" onNavigate={onNavigate}>
            {footer.privacy}
          </InternalLink>
          <InternalLink href="/terms" onNavigate={onNavigate}>
            {footer.terms}
          </InternalLink>
          <InternalLink href="/content-policy" onNavigate={onNavigate}>
            {footer.content}
          </InternalLink>
        </nav>
        <div className="footer-contact">
          <p>{footer.contact}</p>
          <span>{footer.contactBody}</span>
        </div>
      </div>
      <div className="footer-bottom shell">
        <p>{footer.copyright}</p>
        <p>{footer.internal}</p>
        <span aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </div>
    </footer>
  );
}

function ProviderIcon({ provider }: { provider: string }) {
  if (provider === "google") return <GoogleLogo size={19} weight="bold" />;
  if (provider === "github") return <GithubLogo size={19} weight="bold" />;
  if (provider === "wechat") return <WechatLogo size={19} weight="fill" />;
  return <UserCircle size={19} />;
}

function LoginDialog({
  ui,
  open,
  busy,
  error,
  providers,
  onClose,
  onSelect,
}: {
  ui: UiCopy;
  open: boolean;
  busy: boolean;
  error: string;
  providers: AuthProvider[];
  onClose: () => void;
  onSelect: (identity: AuthChoice) => void;
}) {
  const firstButton = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    firstButton.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !dialogRef.current) return;
      const controls = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (!controls.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="login-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-title"
        ref={dialogRef}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="dialog-close" type="button" aria-label={ui.auth.close} onClick={onClose}>
          <X size={20} />
        </button>
        <p className="dialog-label">AutoDraftman</p>
        <h2 id="login-title">{ui.auth.title}</h2>
        <p>{ui.auth.body}</p>
        <div className="login-actions">
          {providers.map((provider, index) => {
            const enabled =
              apiConfigured && provider.enabled && provider.id !== "wechat";
            const label =
              provider.id === "google"
                ? ui.auth.google
                : provider.id === "github"
                  ? ui.auth.github
                  : ui.auth.wechat;
            const status =
              provider.id === "wechat"
                ? ui.auth.comingSoon
                : enabled
                  ? ""
                  : ui.auth.deployRequired;

            return (
              <button
                key={provider.id}
                ref={index === 0 ? firstButton : undefined}
                className="oauth-button"
                type="button"
                disabled={busy || !enabled}
                onClick={() => onSelect(provider.id)}
              >
                <span className="oauth-button-icon">
                  <ProviderIcon provider={provider.id} />
                </span>
                <span className="oauth-button-label">{label}</span>
                {status && <small>{status}</small>}
              </button>
            );
          })}
          <button
            className="guest-button"
            type="button"
            disabled={busy}
            onClick={() => onSelect("guest")}
          >
            <UserCircle size={19} />
            <span>
              <strong>{busy ? ui.auth.connecting : ui.auth.guest}</strong>
              <small>{ui.auth.guestNote}</small>
            </span>
          </button>
        </div>
        {error && (
          <p className="dialog-error" role="alert" aria-live="polite">
            {error}
          </p>
        )}
        <p className="dialog-demo-note">
          {apiConfigured ? ui.auth.demo : ui.auth.noProvider}
        </p>
      </div>
    </div>
  );
}

function AccountDialog({
  ui,
  open,
  current,
  providers,
  identities,
  transactions,
  busy,
  error,
  onClose,
  onLink,
  onUnlink,
  onLogout,
  onDeleteAccount,
}: {
  ui: UiCopy;
  open: boolean;
  current: CurrentIdentity | null;
  providers: AuthProvider[];
  identities: BoundIdentity[];
  transactions: CreditTransaction[];
  busy: boolean;
  error: string;
  onClose: () => void;
  onLink: (provider: "google" | "github") => void;
  onUnlink: (provider: string) => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDeleteConfirmOpen(false);
    dialogRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open, onClose]);

  if (!open || current?.kind !== "user") return null;
  const linkedProviders = new Set(identities.map((identity) => identity.provider));
  const availableProviders = providers.filter(
    (provider): provider is AuthProvider & { id: "google" | "github" } =>
      provider.enabled &&
      provider.id !== "wechat" &&
      !linkedProviders.has(provider.id),
  );
  const transactionLabels = {
    grant: ui.auth.granted,
    reserve: ui.auth.reserved,
    settle: ui.auth.settled,
    release: ui.auth.released,
    refund: ui.auth.refunded,
    adjustment: ui.auth.adjusted,
  } as const;

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="login-dialog account-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-title"
        ref={dialogRef}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="dialog-close" type="button" aria-label={ui.auth.close} onClick={onClose}>
          <X size={20} />
        </button>
        <p className="dialog-label">AutoDraftman</p>
        <h2 id="account-title">{ui.auth.accountTitle}</h2>
        <p>{ui.auth.accountBody}</p>
        <div className="account-profile">
          {current.avatar_url ? (
            <img
              src={current.avatar_url}
              alt=""
              width={34}
              height={34}
              referrerPolicy="no-referrer"
            />
          ) : (
            <UserCircle size={34} />
          )}
          <div>
            <strong>{current.display_name || "AutoDraftman user"}</strong>
            <small>{current.balance.available} credits</small>
          </div>
        </div>

        <section className="identity-section">
          <p>{ui.auth.linked}</p>
          {identities.map((identity) => (
            <div className="identity-row" key={identity.provider}>
              <ProviderIcon provider={identity.provider} />
              <span>
                <strong>
                  {identity.provider === "google" ? "Google" : "GitHub"}
                </strong>
                <small>{identity.email || ui.auth.noEmail}</small>
              </span>
              <button
                type="button"
                disabled={busy || identities.length <= 1}
                title={identities.length <= 1 ? ui.auth.lastLogin : undefined}
                onClick={() => onUnlink(identity.provider)}
              >
                {ui.auth.unlink}
              </button>
            </div>
          ))}
        </section>

        {availableProviders.length > 0 && (
          <section className="identity-section">
            <p>{ui.auth.addLogin}</p>
            {availableProviders.map((provider) => (
              <button
                className="link-provider-button"
                type="button"
                key={provider.id}
                disabled={busy}
                onClick={() => onLink(provider.id)}
              >
                <LinkSimple size={17} />
                {provider.name}
              </button>
            ))}
          </section>
        )}

        <section className="credit-activity">
          <div className="account-section-heading">
            <p>{ui.auth.creditActivity}</p>
            <ClockCounterClockwise size={17} />
          </div>
          {transactions.length > 0 ? (
            <ol>
              {transactions.map((transaction) => {
                const delta = transaction.delta_available;
                return (
                  <li key={transaction.id}>
                    <span>
                      <strong>{transactionLabels[transaction.kind]}</strong>
                      <small>
                        {new Intl.DateTimeFormat(
                          document.documentElement.lang || "zh-CN",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          },
                        ).format(new Date(transaction.created_at))}
                      </small>
                    </span>
                    <span className={delta >= 0 ? "credit-positive" : "credit-negative"}>
                      <strong>{delta > 0 ? `+${delta}` : delta}</strong>
                      <small>
                        {ui.auth.creditAfter} {transaction.available_after}
                      </small>
                    </span>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="account-empty">{ui.auth.noTransactions}</p>
          )}
        </section>

        {error && (
          <p className="dialog-error" role="alert" aria-live="polite">
            {error}
          </p>
        )}
        <button className="logout-button" type="button" disabled={busy} onClick={onLogout}>
          <SignOut size={18} />
          {ui.auth.logout}
        </button>

        <section className="account-danger">
          <p>{ui.auth.dangerZone}</p>
          {deleteConfirmOpen ? (
            <div className="delete-confirmation">
              <strong>{ui.auth.deleteTitle}</strong>
              <p>{ui.auth.deleteBody}</p>
              <div>
                <button type="button" disabled={busy} onClick={onDeleteAccount}>
                  <Trash size={17} />
                  {ui.auth.deleteConfirm}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setDeleteConfirmOpen(false)}
                >
                  {ui.auth.cancelDelete}
                </button>
              </div>
            </div>
          ) : (
            <button
              className="delete-account-button"
              type="button"
              disabled={busy}
              onClick={() => setDeleteConfirmOpen(true)}
            >
              {ui.auth.deleteAccount}
            </button>
          )}
        </section>
      </div>
    </div>
  );
}

export default function App() {
  const initialRoute = routeFromLocation(window.location.pathname);
  const [route, setRoute] = useState<RoutePath>(initialRoute);
  const [language, setLanguage] = useState<Language>(() => {
    const stored = window.localStorage.getItem("autodraftman-language");
    return stored === "en" ? "en" : "zh";
  });
  const [currentIdentity, setCurrentIdentity] = useState<CurrentIdentity | null>(null);
  const [identity, setIdentity] = useState<Identity>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [providers, setProviders] = useState<AuthProvider[]>(defaultAuthProviders);
  const [boundIdentities, setBoundIdentities] = useState<BoundIdentity[]>([]);
  const [creditTransactions, setCreditTransactions] = useState<CreditTransaction[]>([]);
  const [loginOpen, setLoginOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [accountError, setAccountError] = useState("");
  const pendingAction = useRef<(() => void) | null>(null);
  const ui = copy[language];

  const applyServerIdentity = (current: CurrentIdentity) => {
    setCurrentIdentity(current);
    setIdentity(current.kind);
    setCredits(current.balance.available);
  };

  useEffect(() => {
    const handlePopState = () => {
      setRoute(routeFromLocation(window.location.pathname));
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (!apiConfigured) return;
    const returnedFromOAuth =
      new URL(window.location.href).searchParams.get("auth") === "success";
    if (
      window.localStorage.getItem(sessionMarker) !== "active" &&
      !returnedFromOAuth
    ) {
      return;
    }

    let cancelled = false;
    getCurrentIdentity()
      .then((current) => {
        if (!cancelled) applyServerIdentity(current);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 401) {
          window.localStorage.removeItem(sessionMarker);
          setCurrentIdentity(null);
          setIdentity(null);
          setCredits(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!apiConfigured) return;
    let cancelled = false;
    getAuthProviders()
      .then((available) => {
        if (!cancelled) {
          const providersById = new Map(
            available.map((provider) => [provider.id, provider]),
          );
          setProviders(
            defaultAuthProviders.map(
              (provider) => providersById.get(provider.id) ?? provider,
            ),
          );
        }
      })
      .catch(() => {
        if (!cancelled) setProviders([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    const authResult = url.searchParams.get("auth");
    const authFailure = url.searchParams.get("auth_error");
    if (!authResult && !authFailure) return;

    if (authResult === "success") {
      window.localStorage.setItem(sessionMarker, "active");
    }
    if (authFailure) {
      setAuthError(
        authFailure === "authorization_cancelled"
          ? ui.auth.cancelled
          : authFailure === "identity_conflict"
            ? ui.auth.conflict
          : ui.auth.loginFailed,
      );
      setLoginOpen(true);
    }
    url.searchParams.delete("auth");
    url.searchParams.delete("auth_error");
    url.searchParams.delete("provider");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, [ui.auth.cancelled, ui.auth.conflict, ui.auth.loginFailed]);

  useEffect(() => {
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
    document.documentElement.dataset.language = language;
    window.localStorage.setItem("autodraftman-language", language);
  }, [language]);

  const navigate = (path: RoutePath) => {
    const nextHref = routeHref(path);
    if (window.location.pathname !== nextHref) {
      window.history.pushState({}, "", nextHref);
    }
    setRoute(path);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openLogin = (action?: () => void) => {
    pendingAction.current = action ?? null;
    setAuthError("");
    setLoginOpen(true);
  };

  const requestAuth = (action: () => void) => {
    if (identity) {
      action();
      return;
    }
    openLogin(action);
  };

  const selectIdentity = async (choice: AuthChoice) => {
    if (choice === "wechat") return;

    if (choice === "google" || choice === "github") {
      if (!apiConfigured) return;
      window.location.assign(oauthStartUrl(choice));
      return;
    }

    if (!apiConfigured) {
      setIdentity("guest");
      setCredits(1);
      setLoginOpen(false);
      const action = pendingAction.current;
      pendingAction.current = null;
      window.setTimeout(() => action?.(), 0);
      return;
    }

    setAuthBusy(true);
    setAuthError("");
    try {
      const current = await createOrRestoreGuest();
      applyServerIdentity(current);
      window.localStorage.setItem(sessionMarker, "active");
      setLoginOpen(false);

      const action = pendingAction.current;
      pendingAction.current = null;
      window.setTimeout(() => action?.(), 0);
    } catch {
      setAuthError(ui.auth.connectionError);
    } finally {
      setAuthBusy(false);
    }
  };

  const openAccount = async () => {
    setAccountError("");
    setAccountOpen(true);
    setAuthBusy(true);
    try {
      const [linked, transactions] = await Promise.all([
        getBoundIdentities(),
        getCreditTransactions(),
      ]);
      setBoundIdentities(linked);
      setCreditTransactions(transactions);
    } catch (error) {
      setAccountError(
        error instanceof ApiError ? error.message : ui.auth.connectionError,
      );
    } finally {
      setAuthBusy(false);
    }
  };

  const refreshAccount = async () => {
    const [current, linked, transactions] = await Promise.all([
      getCurrentIdentity(),
      getBoundIdentities(),
      getCreditTransactions(),
    ]);
    applyServerIdentity(current);
    setBoundIdentities(linked);
    setCreditTransactions(transactions);
  };

  const handleUnlink = async (provider: string) => {
    setAuthBusy(true);
    setAccountError("");
    try {
      await unlinkIdentity(provider);
      await refreshAccount();
    } catch (error) {
      setAccountError(
        error instanceof ApiError ? error.message : ui.auth.connectionError,
      );
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    setAuthBusy(true);
    setAccountError("");
    try {
      await logout();
      setCurrentIdentity(null);
      setIdentity(null);
      setCredits(null);
      setBoundIdentities([]);
      setCreditTransactions([]);
      window.localStorage.removeItem(sessionMarker);
      setAccountOpen(false);
    } catch (error) {
      setAccountError(
        error instanceof ApiError ? error.message : ui.auth.connectionError,
      );
    } finally {
      setAuthBusy(false);
    }
  };

  const handleDeleteAccount = async () => {
    setAuthBusy(true);
    setAccountError("");
    try {
      await deleteAccount();
      setCurrentIdentity(null);
      setIdentity(null);
      setCredits(null);
      setBoundIdentities([]);
      setCreditTransactions([]);
      window.localStorage.removeItem(sessionMarker);
      setAccountOpen(false);
      navigate("/");
    } catch (error) {
      setAccountError(
        error instanceof ApiError ? error.message : ui.auth.connectionError,
      );
    } finally {
      setAuthBusy(false);
    }
  };

  return (
    <>
      <Header
        language={language}
        identity={identity}
        accountName={currentIdentity?.display_name ?? null}
        ui={ui}
        route={route}
        onLanguageChange={() =>
          setLanguage((value) => (value === "zh" ? "en" : "zh"))
        }
        onNavigate={navigate}
        onSignIn={() => {
          if (identity === "user") {
            void openAccount();
          } else {
            openLogin();
          }
        }}
      />

      {route === "/" && (
        <HomePage ui={ui} language={language} onNavigate={navigate} />
      )}
      {route === "/examples" && (
        <ExamplesPage ui={ui} language={language} onNavigate={navigate} />
      )}
      {route === "/workspace" && (
        <WorkspacePage
          ui={ui}
          language={language}
          identity={identity}
          credits={credits}
          requestAuth={requestAuth}
        />
      )}
      {route === "/pricing" && (
        <PricingPage ui={ui} language={language} onNavigate={navigate} />
      )}
      {(
        ["/docs", "/privacy", "/terms", "/content-policy"] as const
      ).includes(route as "/docs" | "/privacy" | "/terms" | "/content-policy") && (
        <>
          <ProductInformationPage
            route={route as "/docs" | "/privacy" | "/terms" | "/content-policy"}
            language={language}
            hrefFor={routeHref}
            onNavigate={navigate}
          />
          <Footer ui={ui} language={language} onNavigate={navigate} />
        </>
      )}

      <LoginDialog
        ui={ui}
        open={loginOpen}
        busy={authBusy}
        error={authError}
        providers={providers}
        onClose={() => {
          pendingAction.current = null;
          setAuthError("");
          setLoginOpen(false);
        }}
        onSelect={selectIdentity}
      />
      <AccountDialog
        ui={ui}
        open={accountOpen}
        current={currentIdentity}
        providers={providers}
        identities={boundIdentities}
        transactions={creditTransactions}
        busy={authBusy}
        error={accountError}
        onClose={() => {
          setAccountError("");
          setAccountOpen(false);
        }}
        onLink={(provider) => window.location.assign(oauthStartUrl(provider, "link"))}
        onUnlink={(provider) => void handleUnlink(provider)}
        onLogout={() => void handleLogout()}
        onDeleteAccount={() => void handleDeleteAccount()}
      />
    </>
  );
}
