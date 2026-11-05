import "./editorial-redesign.css";
import "./figfox-redesign.css";
import {
  ArrowRight,
  ArrowUpRight,
  BezierCurve,
  BoundingBox,
  CaretLeft,
  CaretRight,
  Check,
  ClockCounterClockwise,
  CursorClick,
  DownloadSimple,
  FileImage,
  GithubLogo,
  Globe,
  GoogleLogo,
  ImageSquare,
  List,
  LockKey,
  LinkSimple,
  MagnifyingGlassMinus,
  MagnifyingGlassPlus,
  NotePencil,
  PaintBrush,
  PaperPlaneTilt,
  PencilSimple,
  PlayCircle,
  Plus,
  Selection,
  SignOut,
  SlidersHorizontal,
  Stack,
  TextT,
  Trash,
  UploadSimple,
  UserCircle,
  VectorThree,
  WarningCircle,
  WechatLogo,
  X,
} from "@phosphor-icons/react";
import { Tabs } from "@base-ui/react/tabs";
import { Toolbar } from "@base-ui/react/toolbar";
import { Collapsible } from "@base-ui/react/collapsible";
import { Dialog } from "@base-ui/react/dialog";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Switch } from "@base-ui/react/switch";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Flex, Grid } from "@radix-ui/themes";
import {
  type CSSProperties,
  type ChangeEvent,
  type DragEvent as ReactDragEvent,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { PageContainer, PageSection } from "./components/layout/FigFoxLayout";
import { AnimatePresence, motion } from "motion/react";
import {
  ApiError,
  apiConfigured,
  completeAssetUpload,
  createAssetUploadIntent,
  createDraft,
  createFeedback,
  createOrRestoreGuest,
  deleteAccount,
  deleteAsset,
  deleteDraft,
  getAsset,
  getAssetDownloadUrl,
  getAuthProviders,
  getBoundIdentities,
  getCreditTransactions,
  getCurrentIdentity,
  listFeedback,
  listDrafts,
  logout,
  oauthStartUrl,
  updateDraft,
  updateIdentityPreferences,
  uploadToPresignedUrl,
  unlinkIdentity,
  type Asset,
  type AuthProvider,
  type BoundIdentity,
  type CreditTransaction,
  type CurrentIdentity,
  type FeedbackEntry,
  type WorkspaceDraftInput,
} from "./api";
import {
  draftFingerprint,
  draftInput,
  draftTitle,
  localDraftInput,
  mergeRemoteDraft,
  type WorkspaceDraft,
  type LocalDraftInput,
  type WorkspaceImage,
  makeLocalDraft,
  readCachedDrafts,
  writeCachedDrafts,
} from "./drafts";
import {
  footerCopy,
  ProductInformationPage,
  type ProductLanguage,
  type ProductRoute,
} from "./ProductPages";
import { FigFoxMark, FigFoxWordmark } from "./components/brand/FigFoxBrand";
import { saveBeforeEditorLeave } from "./features/product/editorNavigation";
import { ProductHeader } from "./features/product/ProductHeader";
import { ProductPricingPage } from "./features/product/ProductPricingPage";
import { ProductGuidePage } from "./features/product/ProductGuidePage";
import { WorkspaceDocuments } from "./features/product/WorkspaceDocuments";
import { useWorkspaceSvg } from "./features/product/workspaceSvg";
import { WorkspaceImageField } from "./features/product/WorkspaceImageField";
import { useWorkspaceView, rememberEditorOrigin, workspaceReturnHref } from "./features/product/workspaceNavigation";
import { saveWorkspaceImage, readWorkspaceImage, deleteWorkspaceImage, imageDimensions } from "./features/product/workspaceImages";
import { ProductPromptField } from "./features/product/ProductPromptField";
import { FigureProcessPreview } from "./features/product/FigureProcess";
import { ReconstructionProgress } from "./features/product/ReconstructionProgress";
import { ReconstructionResult } from "./features/product/ReconstructionResult";
import { useReconstructionTask } from "./features/product/reconstructionTask";
import { ProductLoginPage } from "./features/product/ProductLoginPage";
import { PublicFeedbackPage } from "./features/product/PublicFeedbackPage";
import { usePageTransition, type PageTransitionScope } from "./features/product/usePageTransition";
import { ProductEditorRoute } from "./features/product/ProductEditorRoute";
import "./features/product/product.css";
import "./features/product/workspace.css";
import { FigFoxSelect } from "./components/ui/FigFoxSelect";
import { FigFoxCursor } from "./components/ui/FigFoxCursor";
import { FigFoxDemoPage } from "./features/demo/FigFoxDemoPage";

type Language = ProductLanguage;
type Identity = "guest" | "user" | null;
type AuthChoice = "guest" | "google" | "github" | "wechat";
type RoutePath = ProductRoute;
function routeTransition(from: RoutePath, to: RoutePath): PageTransitionScope | null {
  if (from === to) return null;
  if (to === "/login") return "login-in";
  if (from === "/login") return "login-out";
  if (to === "/editor") return "editor-in";
  if (from === "/editor") return "editor-out";
  return null;
}
type DraftSaveState =
  | "saved"
  | "saving"
  | "offline"
  | "failed"
  | "session-expired";
type ReferenceUploadStatus =
  | "idle"
  | "local"
  | "preparing"
  | "uploading"
  | "verifying"
  | "ready"
  | "error";

const siteBasePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function sitePath(path: string) {
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;
}

const figureAssetPath = sitePath("/assets/figfox-showcase.png");
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
      examples: "示例",
      docs: "使用指南",
      pricing: "定价",
      workspace: "工作台",
      start: "开始制图",
      backHome: "返回首页",
      signIn: "登录",
      guest: "游客",
      account: "账户",
      menu: "打开菜单",
      primaryLabel: "主导航",
      mobileLabel: "移动端导航",
      skip: "跳到主要内容",
    },
    home: {
      kicker: "科研图生成、重建与编辑",
      title: "把研究内容，\n画成一张能继续改的图。",
      body:
        "写一段描述来创建新图，或者上传已有图片做重建。完成后还能继续改文字、颜色、路径和连线。",
      primary: "进入工作台",
      secondary: "看看示例",
      figureAlt: "一支铅笔正在同一张图纸上把研究草稿整理为正式科研图版",
      resultAlt: "由 FigFox 生成的科研图示预览",
      figureCaption: "同一张图纸，从研究草稿到正式图版",
      figureMeta: "内部概念预览 · 16:9",
      pointOne: "文字或参考图",
      pointTwo: "一次生成一张图",
      pointThree: "默认私密",
      storyKicker: "怎么开始",
      storyTitle: "先把内容说清楚，\n再处理版式。",
      storyBody:
        "创建新图时写清对象和关系，需要时再加参考图。已经有图，就直接上传重建。",
      steps: [
        {
          title: "描述研究关系",
          body: "写清有哪些对象、它们怎么连接，以及哪部分最重要。",
          label: "输入",
        },
        {
          title: "加入参考线索",
          body: "需要时上传一张图，说明你想要的构图或视觉方向。",
          label: "校准",
        },
        {
          title: "检查并导出",
          body: "生成后直接检查结果。需要细改时，打开 SVG 编辑器继续处理。",
          label: "结果",
        },
      ],
      stagePrompt:
        "绘制一个双分支编码器，展示均值、方差与加权采样之间的关系。",
      stageReference: "参考结构已加入",
      stageComplete: "图版已完成",
      privacyKicker: "你的文件",
      privacyTitle: "默认不公开，随时可以删。",
      privacyBody:
        "登录后可以保存和删除历史。游客文件只保留一段时间；公开展示必须由你主动开启。",
      privacyItems: ["私密生成", "可删除历史", "公开需主动选择"],
      closingTitle: "开始做第一张图。",
      closingBody: "写一段描述，或者上传手头已有的图片。",
      footer: "科研图生成、重建与 SVG 编辑",
      footerStatement: "图要说清楚，后面也要改得动。",
    },
    workspace: {
      eyebrow: "当前版本",
      title: "工作台",
      subtitle: "新建一张图，或者把已有图片重建成可编辑 SVG。",
      modeText: "文字生成",
      modeReference: "文字 + 参考图",
      promptLabel: "你想画什么？",
      promptPlaceholder:
        "例如：绘制一个双分支编码器，展示均值、方差与加权采样之间的关系。",
      promptHelp: "写清对象、关系和重点即可，不用把要求写成一长串关键词。",
      referenceLabel: "参考图",
      uploadTitle: "上传一张参考图",
      uploadBody: "PNG、JPG 或 WebP · 不超过 10 MB",
      replace: "点击更换",
      uploadPreparing: "正在准备私密上传…",
      uploadProgress: "正在上传",
      uploadVerifying: "正在验证图片…",
      uploadReady: "已私密保存",
      uploadCancel: "取消上传",
      uploadRemove: "移除参考图",
      uploadFailed: "参考图上传失败，请重试。",
      uploadCancelled: "上传已取消。",
      uploadRequiresApi: "当前版本不会上传或保存这张图片。",
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
      freePlan: "免费版",
      emptyTitle: "生成结果会出现在这里",
      emptyBody: "先在左边写内容或上传图片。",
      progressTitle: "正在处理这张图",
      progressBody: "这是界面演示，不会发起真实生成请求。",
      completed: "生成完成",
      private: "私密",
      public: "公开",
      download: "下载图片",
      regenerate: "重新生成",
      history: "最近任务",
      historyEmpty: "还没有草稿。",
      historyItem: "双分支编码器方法图",
      newDraft: "新建任务",
      draftPending: "尚未生成",
      historyHint: "输入内容后，当前草稿会显示在这里。",
      collapseHistory: "收起记录栏",
      expandHistory: "展开记录栏",
      delete: "删除记录",
      rename: "重命名草稿",
      renameSave: "保存名称",
      renameCancel: "取消重命名",
      draftUntitled: "未命名任务",
      draftSaving: "正在保存…",
      draftSaved: "草稿已保存",
      draftOffline: "网络已断开，修改已保存在此设备",
      draftFailed: "草稿暂未同步，稍后会自动重试",
      draftSessionExpired: "登录已失效，修改已保存在此设备",
      deleteDraftTitle: "删除这份草稿？",
      deleteDraftBody: "草稿会立即从记录栏移除；已上传的原始参考图仍可按数据规则单独删除。",
      deleteDraftConfirm: "删除草稿",
      cancel: "取消",
      onboardingTitle: "草稿会自动保存",
      onboardingBody:
        "输入内容和设置会出现在左侧记录里。当前版本不会真的生成，也不会扣额度。",
      onboardingDismiss: "关闭提示",
      closeHistory: "关闭历史记录",
      promptError: "请先描述你希望生成的内容。",
      noCredits: "当前账户没有可用额度，定价页面仍为界面预览。",
      mockNotice: "当前为界面演示",
      generationUnavailable:
        "当前还不能生成图片，也不会消耗额度。",
      kernelPending: "生成功能未开放",
      draftLabel: "当前草稿",
      technicalSummary: "输出与隐私",
      settingsOpen: "展开输出设置",
      settingsClose: "收起输出设置",
      idleStatus: "等待输入",
      previewTab: "图版预览",
      editorTab: "SVG 编辑",
      editorStatus: "未打开 SVG",
      editorTools: "编辑工具",
      editorSelect: "选择",
      editorNodes: "节点",
      editorShape: "形状",
      editorText: "文字",
      editorCanvas: "SVG 画布",
      editorDocument: "文档",
      editorInspector: "属性",
      editorLayers: "图层",
      editorSelection: "选中对象",
      editorNoLayers: "打开 SVG 后，这里会显示文档的顶层对象",
      editorNoSelection: "选择对象后可调整描边、填充与文字",
      editorTitle: "在这里继续改 SVG",
      editorBody:
        "打开 SVG 后，可以继续调整文字、图形、路径和连接线。",
      editorUnavailable: "生成可编辑 SVG 后启用",
      editorMobile:
        "移动端用于查看图版、图层概览和导出；精细编辑请在桌面端继续。",
      resultViews: "结果视图",
      editorZoom: "缩放",
      editorOpen: "打开 SVG 编辑器",
      editorBack: "返回生成工作台",
      editorUntitled: "未命名 SVG",
      editorExport: "导出 SVG",
      editorOpenFile: "打开 SVG",
      editorReplaceFile: "更换文件",
      editorDropTitle: "打开一个 SVG 文档",
      editorDropBody:
        "将已有 SVG 拖到画布，或从设备选择文件。文档只在当前浏览器中处理。",
      editorDropAction: "选择 SVG 文件",
      editorDropHint: "SVG · 本地处理 · 不上传到服务器",
      editorDropActive: "松开以打开 SVG",
      editorLoading: "正在检查 SVG…",
      editorReady: "已安全载入",
      editorLocal: "本地文档",
      editorSanitized: "已移除不安全脚本或外部内容",
      editorObjects: "个对象",
      editorTexts: "段文字",
      editorAspect: "画布比例",
      editorFonts: "字体引用",
      editorFontNotice: "本机缺少相应字体时，预览会使用浏览器替代字体。",
      editorStructure: "文档结构",
      editorSelectionReady:
        "文档已打开。现在可以选择对象，调整颜色、线宽和路径。",
      editorErrorFormat: "请选择有效的 .svg 文件。",
      editorErrorInvalid: "无法读取这个 SVG。请检查文件是否完整。",
      editorErrorLarge: "当前浏览器无法读取这个 SVG 文件。",
      editorErrorComplex: "SVG 元素过多，当前版本暂不支持打开。",
      editorTryAgain: "重新选择",
      editorPreviewAlt: "导入到 FigFox SVG 编辑器的本地文档",
    },
    examples: {
      kicker: "实际示例",
      title: "这是我们现在用来测试的几张图。",
      body:
        "它们来自项目现有实验资料，用来检查流程图生成、结构识别和图片重建。它们不是线上生成结果。",
      notice:
        "示例只用于展示。打开工作台后会从空白草稿开始。",
      openWorkspace: "打开工作台",
      artifact: "研发资料",
      cases: [
        {
          title: "双控制训练流程",
          category: "训练流程图",
          description:
            "说明文本条件、音频参考、CLAP 表征、RVQ 离散化和自回归训练目标之间的关系。",
          prompt:
            "绘制一个双控制音频模型的训练流程图，展示文本与音频参考、CLAP 表征、RVQ 离散化、自回归语义模型和训练损失之间的关系。",
          meta: "当前项目实验输出 · PNG · 1520 × 499",
          alt: "FigFox 当前项目的双控制音频模型训练流程实验图",
        },
        {
          title: "双控制推理流程",
          category: "推理流程图",
          description:
            "把双阶段采样、温度控制、CFG 权重、解码与最终音频输出组织在一张横向图中。",
          prompt:
            "绘制一个双阶段自回归音频生成模型的推理流程，突出温度控制、CFG 权重、RVQ 解码和最终音频输出。",
          meta: "当前项目实验输出 · PNG · 1521 × 271",
          alt: "FigFox 当前项目的双控制音频模型推理流程实验图",
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
      kicker: "按使用频率选择",
      title: "先选一个合适的用量。",
      body: "这里展示的是拟定方案，暂时不能购买。正式开放前会再次确认价格和额度。",
      monthly: "月付",
      yearly: "年付",
      save: "最高省 22%",
      notice: "暂未接入付款",
      choose: "选择方案",
      current: "当前方案",
      recommended: "推荐",
      perMonth: "/ 月",
      billedYearly: "按年支付",
      savePerMonth: "每月比月付节省",
      plans: [
        {
          name: "Sketch",
          description: "偶尔做图，先用起来。",
          features: ["每月 30 次生成", "标准处理队列", "草稿保留 30 天"],
        },
        {
          name: "Folio",
          description: "适合日常课程、论文和项目制图。",
          features: ["每月 120 次生成", "更高分辨率", "长期保存草稿"],
        },
        {
          name: "Atlas",
          description: "适合高频使用，或几个人一起做图。",
          features: ["每月 360 次生成", "优先处理队列", "更长文件保留时间"],
        },
      ],
      toast: "暂时还不能购买，我们会在开放前公布最终方案。",
      footnote: "生成失败且没有产出图片时不扣额度；主动重新生成会正常消耗额度。",
    },
    auth: {
      title: "登录 FigFox",
      body: "登录后可以保存草稿和编辑记录。不想登录，也可以先以游客身份试一次。",
      google: "使用 Google 登录",
      github: "使用 GitHub 登录",
      wechat: "使用微信登录",
      guest: "以游客身份继续",
      guestNote: "游客内容仅短期保存",
      close: "关闭登录窗口",
      deployRequired: "暂未开放",
      comingSoon: "待接入",
      demo: "登录渠道状态由后端统一管理。",
      noProvider: "当前版本还不能登录。",
      cancelled: "你取消了登录授权，账户没有发生变化。",
      conflict: "这个登录身份已经属于另一个 FigFox 账户。",
      loginFailed: "登录没有完成，请稍后重试。",
      connectionError: "暂时无法连接服务，请稍后重试。",
      connecting: "正在连接…",
      accountTitle: "你的账户",
      accountBody: "在这里管理登录方式、草稿默认状态和额度记录。",
      preferences: "工作偏好",
      defaultPrivacy: "新草稿默认状态",
      defaultPrivate: "默认私密",
      defaultPublic: "默认公开",
      privacyHint: "只影响之后新建的草稿；已有草稿保持原状。",
      preferenceSaved: "默认隐私已更新。",
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
      start: "Start drafting",
      backHome: "Back to home",
      signIn: "Sign in",
      guest: "Guest",
      account: "Account",
      menu: "Open menu",
      primaryLabel: "Primary navigation",
      mobileLabel: "Mobile navigation",
      skip: "Skip to main content",
    },
    home: {
      kicker: "A figure workspace for scientific ideas",
      title: "Research ideas,\ndrawn into focus.",
      body:
        "Begin with text or a reference image. FigFox arranges objects, relationships, and visual hierarchy into one clear scientific figure.",
      primary: "Open workspace",
      secondary: "View R&D examples",
      figureAlt:
        "A pencil turns a rough research sketch into a finished scientific figure on the same drafting sheet",
      resultAlt: "Scientific figure preview generated by FigFox",
      figureCaption: "One sheet, from research sketch to finished figure",
      figureMeta: "Internal concept preview · 16:9",
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
      closingBody: "Bring one research description into the workspace and start with one figure.",
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
      uploadBody: "PNG, JPG, or WebP · Up to 10 MB",
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
        "This version will not upload or store the image.",
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
      freePlan: "Free",
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
      history: "Recent tasks",
      historyEmpty: "No generations yet.",
      historyItem: "Two-branch encoder method figure",
      newDraft: "New task",
      draftPending: "Not generated",
      historyHint: "Your current draft appears here once you start writing.",
      collapseHistory: "Collapse records",
      expandHistory: "Expand records",
      delete: "Delete record",
      rename: "Rename draft",
      renameSave: "Save name",
      renameCancel: "Cancel renaming",
      draftUntitled: "Untitled task",
      draftSaving: "Saving…",
      draftSaved: "Draft saved",
      draftOffline: "Offline. Changes are saved on this device",
      draftFailed: "Draft is not synced yet. We will retry automatically",
      draftSessionExpired: "Your session expired. Changes are saved on this device",
      deleteDraftTitle: "Delete this draft?",
      deleteDraftBody:
        "The draft disappears from the record rail immediately. Uploaded source images continue to follow the separate data-retention rules.",
      deleteDraftConfirm: "Delete draft",
      cancel: "Cancel",
      onboardingTitle: "The workspace saves as you write",
      onboardingBody:
        "Your text and settings are saved in the history rail. This version does not create generation tasks or use credits.",
      onboardingDismiss: "Got it",
      closeHistory: "Close history",
      promptError: "Describe what you want to generate first.",
      noCredits:
        "This account has no credits left. Pricing is still an interface preview.",
      mockNotice: "This is an interface preview.",
      generationUnavailable:
        "Image generation is not available yet, and no credit was used.",
      kernelPending: "Generation unavailable",
      draftLabel: "Current draft",
      technicalSummary: "Output and privacy",
      settingsOpen: "Open output settings",
      settingsClose: "Close output settings",
      idleStatus: "Awaiting input",
      previewTab: "Figure preview",
      editorTab: "SVG editor",
      editorStatus: "No SVG open",
      editorTools: "Editing tools",
      editorSelect: "Select",
      editorNodes: "Nodes",
      editorShape: "Shape",
      editorText: "Text",
      editorCanvas: "SVG canvas",
      editorDocument: "Document",
      editorInspector: "Inspector",
      editorLayers: "Layers",
      editorSelection: "Selection",
      editorNoLayers: "Top-level document objects appear after an SVG is opened",
      editorNoSelection: "Select an object to adjust stroke, fill, and type",
      editorTitle: "Continue editing after generation",
      editorBody:
        "Paths, labels, connectors, and layers load here after an editable SVG is generated. No editable document is open yet.",
      editorUnavailable: "Enabled after an editable SVG is generated",
      editorMobile:
        "Mobile supports figure review, a layer overview, and export. Continue precise editing on desktop.",
      resultViews: "Result views",
      editorZoom: "Zoom",
      editorOpen: "Open SVG editor",
      editorBack: "Back to generation",
      editorUntitled: "Untitled SVG",
      editorExport: "Export SVG",
      editorOpenFile: "Open SVG",
      editorReplaceFile: "Replace file",
      editorDropTitle: "Open an SVG document",
      editorDropBody:
        "Drop an existing SVG onto the canvas or choose one from your device. The document stays in this browser.",
      editorDropAction: "Choose SVG file",
      editorDropHint: "SVG · processed locally · never uploaded",
      editorDropActive: "Release to open SVG",
      editorLoading: "Checking SVG…",
      editorReady: "Safely loaded",
      editorLocal: "Local document",
      editorSanitized: "Unsafe scripts or external content were removed",
      editorObjects: "objects",
      editorTexts: "text elements",
      editorAspect: "Canvas ratio",
      editorFonts: "Font references",
      editorFontNotice:
        "The browser will use fallback fonts when a referenced typeface is unavailable.",
      editorStructure: "Document structure",
      editorSelectionReady:
        "The document is loaded. Object selection, text changes, and path editing come in the next editor stage.",
      editorErrorFormat: "Choose a valid .svg file.",
      editorErrorInvalid: "This SVG could not be read. Check that the file is complete.",
      editorErrorLarge: "This browser could not read this SVG file.",
      editorErrorComplex: "This SVG contains too many elements for the current editor.",
      editorTryAgain: "Choose another",
      editorPreviewAlt: "Local document imported into the FigFox SVG editor",
    },
    examples: {
      kicker: "Examples",
      title: "Here are a few real examples.",
      body:
        "These images come from existing project material and show the kinds of scientific figures FigFox is built to handle. They are not live generation results.",
      notice:
        "Examples are for display only. The workspace opens with a blank draft.",
      openWorkspace: "Open workspace",
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
          alt: "Experimental training pipeline for the current FigFox dual-control audio model",
        },
        {
          title: "Dual-control inference pipeline",
          category: "Inference diagram",
          description:
            "Organizes two-stage sampling, temperature controls, CFG weights, decoding, and final audio output in one horizontal figure.",
          prompt:
            "Draw the inference pipeline for a two-stage autoregressive audio model, emphasizing temperature controls, CFG weights, RVQ decoding, and final audio output.",
          meta: "Current project experiment · PNG · 1521 × 271",
          alt: "Experimental inference pipeline for the current FigFox dual-control audio model",
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
      title: "Choose the plan that fits.",
      body:
        "Purchases are not available yet. These first plans will be confirmed before payments go live.",
      monthly: "Monthly",
      yearly: "Yearly",
      save: "Save up to 22%",
      notice: "Payments not connected",
      choose: "Choose plan",
      current: "Current plan",
      recommended: "Recommended",
      perMonth: "/ month",
      billedYearly: "billed yearly",
      savePerMonth: "Save each month vs monthly",
      plans: [
        {
          name: "Sketch",
          description: "Begin with one study and experience the complete workflow.",
          features: ["30 monthly generation credits", "Standard queue", "30-day history"],
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
      deployRequired: "Not open yet",
      comingSoon: "Coming soon",
      demo: "Sign-in availability is managed by the backend.",
      noProvider: "Sign-in is not available in this version.",
      cancelled: "Authorization was cancelled. Your account was not changed.",
      conflict: "This login identity already belongs to another FigFox account.",
      loginFailed: "Sign-in did not complete. Please try again.",
      connectionError: "The service is unavailable. Please try again later.",
      connecting: "Connecting…",
      accountTitle: "Your account",
      accountBody: "Different login methods can open the same FigFox account.",
      preferences: "Workspace preferences",
      defaultPrivacy: "New draft default",
      defaultPrivate: "Private by default",
      defaultPublic: "Public by default",
      privacyHint: "This only affects new drafts. Existing drafts stay unchanged.",
      preferenceSaved: "Default privacy updated.",
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

export type UiCopy = (typeof copy)[Language];

function isRoutePath(value: string): value is RoutePath {
  return [
    "/",
    "/examples",
    "/workspace",
    "/login",
    "/editor",
    "/pricing",
    "/docs",
    "/feedback",
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
      <FigFoxMark className="brand-mark" />
      <FigFoxWordmark className="brand-name" />
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
        backgroundImage: `url("${sitePath("/assets/figfox-drafting-sheet-hero.png")}")`,
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

function ProductStory({ ui }: { ui: UiCopy }) {
  const [activeStep, setActiveStep] = useState(0);
  const stepRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    let animationFrame = 0;

    const updateActiveStep = () => {
      animationFrame = 0;
      if (window.matchMedia("(max-width: 54rem)").matches) return;
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
            <button
              type="button"
              aria-current={activeStep === index ? "step" : undefined}
              className={`story-step ${state}`}
              data-allow-wrap="true"
              data-step={index}
              key={step.title}
              onClick={() => setActiveStep(index)}
              onPointerEnter={() => setActiveStep(index)}
              ref={(node) => {
                stepRefs.current[index] = node;
              }}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const figFoxWorkspaceCopy = {
  zh: {
    create: "创建",
    createDescription: "从一段描述开始，参考图可选。",
    rebuild: "重建",
    rebuildDescription: "上传现有图片，重建为可编辑 SVG。",
    rebuildKicker: "把图片变回可编辑文件",
    rebuildTitle: "上传现有图片，重建后直接编辑。",
    rebuildBody: "FigFox 会找出文字、图形和连接线，再把它们重建成分层 SVG。",
    rebuildStages: ["读取图片", "重建图层", "检查结果"],
    rebuildPrompt: "补充要求（可选）",
    rebuildPromptPlaceholder: "例如：保留原有构图，统一线宽，文字使用无衬线体。",
    rebuildAction: "开始重建",
    sourceRequired: "请先上传一张要重建的图片。",
  },
  en: {
    create: "Create",
    createDescription: "Write a description. A reference is optional.",
    rebuild: "Rebuild",
    rebuildDescription: "Upload an image and rebuild it as editable SVG.",
    rebuildKicker: "Image rebuild",
    rebuildTitle: "Upload the image. FigFox handles the rest.",
    rebuildBody: "We find the labels, shapes, and connectors, then open the rebuilt file in the editor.",
    rebuildStages: ["Read image", "Rebuild layers", "Check result"],
    rebuildPrompt: "Additional direction (optional)",
    rebuildPromptPlaceholder: "For example: preserve composition, normalize line widths, and use a sans-serif typeface.",
    rebuildAction: "Start rebuild",
    sourceRequired: "Upload the image you want to rebuild first.",
  },
} as const;

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
  const [activeIndex, setActiveIndex] = useState(0);
  const activeExample = examples[activeIndex] ?? examples[0];
  const zh = language === "zh";

  return (
    <main className="examples-page ff-library-page page-enter">
      <PageSection className="ff-library-section" density="compact" ariaLabel={ui.nav.examples}>
        <PageContainer>
          <header className="ff-library-heading">
            <div>
              <p className="ff-kicker">{ui.examples.kicker}</p>
              <h1>{ui.examples.title}</h1>
            </div>
            <div>
              <p>{ui.examples.body}</p>
              <span><FileImage size={16} />{ui.examples.notice}</span>
            </div>
          </header>

          <section className="ff-library-shell">
            <aside className="ff-library-index" aria-label={zh ? "案例列表" : "Example list"}>
              <header><span>{zh ? "研发案例" : "R&D collection"}</span><strong>{String(examples.length).padStart(2, "0")}</strong></header>
              <div className="ff-library-items">
                {examples.map((example, index) => (
                  <button
                    type="button"
                    className="ff-library-item"
                    data-allow-wrap="true"
                    data-active={index === activeIndex}
                    aria-current={index === activeIndex ? "true" : undefined}
                    onClick={() => setActiveIndex(index)}
                    key={example.id}
                  >
                    <span className="ff-library-thumb"><img src={example.src} alt="" width={example.width} height={example.height} /></span>
                    <span><small>{String(index + 1).padStart(2, "0")} · {example.category}</small><strong>{example.title}</strong></span>
                    <CaretRight size={15} />
                  </button>
                ))}
              </div>
              <button className="ff-library-start" type="button" onClick={() => onNavigate("/workspace")}>
                <Plus size={17} />{ui.examples.openWorkspace}<ArrowRight size={16} />
              </button>
            </aside>

            <article className="ff-library-detail" key={activeExample.id}>
              <header className="ff-library-detailbar">
                <span><i />FIGURE / {String(activeIndex + 1).padStart(2, "0")}</span>
                <span>{activeExample.ratio} · {activeExample.format}</span>
              </header>
              <figure className={`ff-library-canvas ratio-${activeExample.ratio.replace(":", "-")}`}>
                <img src={activeExample.src} alt={activeExample.alt} width={activeExample.width} height={activeExample.height} />
              </figure>
              <div className="ff-library-copy">
                <div className="ff-library-description">
                  <p>{activeExample.category}</p>
                  <h2>{activeExample.title}</h2>
                  <span>{activeExample.description}</span>
                </div>
                <blockquote><small>{zh ? "输入说明" : "Source prompt"}</small>{activeExample.prompt}</blockquote>
                <footer>
                  <span>{activeExample.meta}</span>
                  <button type="button" onClick={() => onNavigate("/workspace")}>{zh ? "按这个结构开始" : "Start from this structure"}<ArrowUpRight size={16} /></button>
                </footer>
              </div>
            </article>
          </section>
        </PageContainer>
      </PageSection>

      <Footer ui={ui} language={language} onNavigate={onNavigate} />
    </main>
  );
}

function WorkspaceAccountSummary({
  ui,
  identity,
  currentIdentity,
  onActivate,
}: {
  ui: UiCopy;
  identity: Identity;
  currentIdentity: CurrentIdentity | null;
  onActivate: () => void;
}) {
  const label =
    !apiConfigured
      ? ui.nav.signIn === "登录" ? "本地工作台" : "Local mode"
      : identity === "user"
      ? currentIdentity?.display_name || ui.nav.account
      : identity === "guest"
        ? ui.nav.guest
        : ui.nav.signIn;
  const monogram =
    identity === "user"
      ? (currentIdentity?.display_name?.trim().charAt(0) || "A").toUpperCase()
      : identity === "guest"
        ? "G"
        : "U";

  return (
    <button
      className="workspace-account-summary"
      type="button"
      onClick={onActivate}
      aria-label={label}
      data-allow-wrap="true"
    >
      <span className="workspace-account-avatar" aria-hidden="true">
        {!apiConfigured ? <FileImage size={17} /> : identity === "user" && currentIdentity?.avatar_url ? (
          <img src={currentIdentity.avatar_url} alt="" referrerPolicy="no-referrer" />
        ) : (
          monogram
        )}
      </span>
      <strong>{label}</strong>
      <span className="workspace-account-plan">{apiConfigured ? ui.workspace.freePlan : "SVG"}</span>
    </button>
  );
}

function WorkspacePage({
  active = true,
  ui,
  language,
  identity,
  currentIdentity,
  credits,
  requestAuth,
  onAccount,
  onOpenEditor,
  onNavigate,
  onLanguageChange,
  onViewTransition,
}: {
  active?: boolean;
  ui: UiCopy;
  language: Language;
  identity: Identity;
  currentIdentity: CurrentIdentity | null;
  credits: number | null;
  requestAuth: (action: () => void) => void;
  onAccount: () => void;
  onOpenEditor: () => void;
  onNavigate: (route: RoutePath) => void;
  onLanguageChange: () => void;
  onViewTransition: (update: () => void, animate: boolean | "task" | "layout") => void;
}) {
  const workspaceCopy = figFoxWorkspaceCopy[language];
  const [taskMode, setTaskMode] = useState<"create" | "rebuild">("rebuild");
  const requestedTaskMode = useRef(taskMode);
  useEffect(() => { requestedTaskMode.current = taskMode; }, [taskMode]);
  const changeTaskMode = (next: "create" | "rebuild") => {
    requestedTaskMode.current = next;
    onViewTransition(() => { setTaskMode(next); if (next === "rebuild") setMode("reference"); setMessage(""); }, "task");
  };
  const [localImage, setLocalImage] = useState<WorkspaceImage | null>(null);
  const [imageSaveState, setImageSaveState] = useState<"saved" | "saving" | "restoring" | "failed">("saved");
  const imageSequenceRef = useRef(0);
  const imageValidationRef = useRef(0);
  const [mode, setMode] = useState<"text" | "reference">("text");
  const [prompt, setPrompt] = useState("");
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState("");
  const { view: workspaceView, selectView: setWorkspaceView } = useWorkspaceView(active, onViewTransition);
  const [processPreview, setProcessPreview] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const dialogTrigger = useRef<HTMLElement | null>(null);
  const reconstruction = useReconstructionTask();
  const reconstructionLimited = taskMode === "rebuild" && !!reconstruction.unavailableReason;
  const reconstructionLimitLabel = reconstruction.unavailableReason === "test_limit"
    ? language === "zh" ? "本轮手动测试次数已用完" : "This manual test has been used"
    : language === "zh" ? "本轮测试剩余额度不足" : "Local test budget is insufficient";
  const progressTrigger = useRef<HTMLButtonElement | null>(null);
  useEffect(() => { if (!active) reconstruction.setOpen(false); }, [active, reconstruction.open, reconstruction.setOpen]);
  const [dragging, setDragging] = useState(false);
  useEffect(() => { if (!active) { setProcessPreview(false); setSourceOpen(false); setHistoryOpen(false); } }, [active]);
  const [referenceAsset, setReferenceAsset] = useState<Asset | null>(null);
  const [referenceAssetId, setReferenceAssetId] = useState<string | null>(null);
  const [referenceStatus, setReferenceStatus] =
    useState<ReferenceUploadStatus>("idle");
  const [referenceProgress, setReferenceProgress] = useState(0);
  const [referenceError, setReferenceError] = useState("");
  const [ratio, setRatio] = useState("16:9");
  const [format, setFormat] = useState("PNG");
  const [isPublic, setIsPublic] = useState(false);
  const [activeDraftTitle, setActiveDraftTitle] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyCollapsed, setHistoryCollapsed] = useState(
    () => window.localStorage.getItem("autodraftman-history-collapsed") === "true",
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [drafts, setDrafts] = useState<WorkspaceDraft[]>([]);
  const [activeDraftId, setActiveDraftId] = useState("");
  const [draftsReady, setDraftsReady] = useState(false);
  useEffect(() => {
    if (!draftsReady || !activeDraftId) return;
    try { window.localStorage.setItem("figfox-active-task", activeDraftId); } catch { /* Text save reports storage errors separately. */ }
  }, [activeDraftId, draftsReady]);
  const [draftSaveState, setDraftSaveState] = useState<DraftSaveState>("saved");
  const [draftToDelete, setDraftToDelete] = useState<WorkspaceDraft | null>(null);
  const [renamingDraftId, setRenamingDraftId] = useState("");
  const [renamingDraftTitle, setRenamingDraftTitle] = useState("");
  const [online, setOnline] = useState(() => window.navigator.onLine);
  const uploadAbortRef = useRef<AbortController | null>(null);
  const activeUploadAssetIdRef = useRef<string | null>(null);
  const uploadSequenceRef = useRef(0);
  const previewUrlRef = useRef("");
  const draftSaveTimerRef = useRef<number | null>(null);
  const draftSaveSequenceRef = useRef(0);
  const creatingDraftsRef = useRef(new Set<string>());
  const lastSavedDraftRef = useRef("");
  const latestDraftRef = useRef<WorkspaceDraft | null>(null);

  const flushLocalDraft = () => {
    const draft = latestDraftRef.current;
    if (!draft) return { ok: true, draft: null };
    const cached = readCachedDrafts();
    const previous = cached.find(item => item.id === draft.id);
    if (previous && draftFingerprint(localDraftInput(previous)) === draftFingerprint(localDraftInput(draft))) return { ok: true, draft: previous };
    const updated = { ...draft, updated_at: new Date().toISOString() };
    const ok = writeCachedDrafts([updated, ...cached.filter(item => item.id !== draft.id)]);
    if (!ok) setDraftSaveState("failed");
    return { ok, draft: updated };
  };

  useEffect(() => {
    const flush = () => flushLocalDraft();
    window.addEventListener("pagehide", flush);
    return () => { window.removeEventListener("pagehide", flush); flush(); };
  }, []);

  const currentDraft = drafts.find(draft => draft.id === activeDraftId);
  latestDraftRef.current = draftsReady && currentDraft ? { ...currentDraft, title: activeDraftTitle, prompt, mode, taskType: taskMode, localImage, aspect_ratio: ratio as WorkspaceDraftInput["aspect_ratio"], output_format: format as WorkspaceDraftInput["output_format"], visibility: isPublic ? "public" : "private", reference_asset_id: referenceAssetId } : null;

  const svg = useWorkspaceSvg({ active, zh: language === "zh", saveTask: () => flushLocalDraft().ok && imageSaveState !== "failed", enterEditor: () => {
    setProcessPreview(false); setSourceOpen(false); setHistoryOpen(false); onOpenEditor();
  }});
  const continueButton = (className: string) => svg.document && <button type="button" className={`workspace-continue ${className}`} disabled={svg.busy} onClick={() => void svg.openDocument(svg.document!.id)} title={`${language === "zh" ? "继续编辑" : "Continue editing"} · ${svg.document.fileName}`} aria-label={`${language === "zh" ? "继续编辑" : "Continue editing"} · ${svg.document.fileName}`}><NotePencil size={17}/><span>{language === "zh" ? "继续编辑" : "Continue editing"} · </span><strong>{svg.document.fileName}</strong></button>;

  const uploadBusy = ["preparing", "uploading", "verifying"].includes(
    referenceStatus,
  );
  useEffect(
    () => () => {
      uploadAbortRef.current?.abort();
      if (draftSaveTimerRef.current !== null) {
        window.clearTimeout(draftSaveTimerRef.current);
      }
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

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  const replacePreview = (file: File | null) => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const nextPreview = file ? URL.createObjectURL(file) : "";
    previewUrlRef.current = nextPreview;
    setReferencePreview(nextPreview);
  };

  const blankDraftInput = (): LocalDraftInput => ({
    taskType: "rebuild",
    localImage: null,
    title: null,
    prompt: "",
    mode: "text",
    aspect_ratio: "16:9",
    output_format: "PNG",
    visibility: currentIdentity?.default_visibility ?? "private",
    reference_asset_id: null,
  });

  const restoreReferenceAsset = async (assetId: string) => {
    if (!apiConfigured) return;
    const sequence = ++uploadSequenceRef.current;
    setReferenceStatus("preparing");
    try {
      const [asset, download] = await Promise.all([
        getAsset(assetId),
        getAssetDownloadUrl(assetId),
      ]);
      if (sequence !== uploadSequenceRef.current) return;
      setReferenceFile(null);
      setReferenceAsset(asset);
      setReferenceAssetId(asset.id);
      setReferencePreview(download.url);
      setReferenceProgress(100);
      setReferenceError("");
      setReferenceStatus("ready");
    } catch {
      if (sequence !== uploadSequenceRef.current) return;
      setReferenceAsset(null);
      setReferenceAssetId(null);
      setReferencePreview("");
      setReferenceStatus("error");
      setReferenceError(ui.workspace.uploadFailed);
    }
  };

  const applyDraft = (draft: WorkspaceDraft) => {
    ++draftSaveSequenceRef.current;
    const imageSequence = ++imageSequenceRef.current;
    setTaskMode(draft.taskType);
    setLocalImage(draft.localImage);
    setImageSaveState(draft.localImage ? "restoring" : "saved");
    uploadSequenceRef.current += 1;
    uploadAbortRef.current?.abort();
    uploadAbortRef.current = null;
    activeUploadAssetIdRef.current = null;
    replacePreview(null);
    setReferenceFile(null);
    setReferenceAsset(null);
    setReferenceAssetId(draft.reference_asset_id);
    setReferenceStatus(draft.reference_asset_id ? "preparing" : "idle");
    setReferenceProgress(0);
    setReferenceError("");
    setMode(draft.mode);
    setActiveDraftTitle(draft.title);
    setPrompt(draft.prompt);
    setRatio(draft.aspect_ratio);
    setFormat(draft.output_format);
    setIsPublic(draft.visibility === "public");
    setActiveDraftId(draft.id);
    setMessage("");
    lastSavedDraftRef.current = draftFingerprint(localDraftInput(draft));
    setDraftSaveState("saved");
    if (draft.localImage) {
      const metadata = draft.localImage;
      void readWorkspaceImage(metadata.key).then(blob => {
        if (imageSequence !== imageSequenceRef.current) return;
        const file = new File([blob], metadata.name, { type: metadata.type });
        setReferenceFile(file);
        replacePreview(file);
        setReferenceStatus("local");
        setImageSaveState("saved");
      }).catch(() => {
        if (imageSequence !== imageSequenceRef.current) return;
        setImageSaveState("failed");
        setReferenceError(language === "zh" ? "原图未能恢复，请重新选择图片。文字草稿已保留。" : "The saved image could not be restored. Select it again; your text is retained.");
      });
    } else if (draft.reference_asset_id) {
      void restoreReferenceAsset(draft.reference_asset_id);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const cached = readCachedDrafts();
    let activeId = "";
    try { activeId = window.localStorage.getItem("figfox-active-task") || ""; } catch { /* Restore the latest task if preferences are unavailable. */ }

    const useDrafts = (items: WorkspaceDraft[]) => {
      if (cancelled) return;
      const sorted = [...items].sort((left, right) =>
        right.updated_at.localeCompare(left.updated_at),
      );
      const available =
        sorted.length > 0 ? sorted : [makeLocalDraft(blankDraftInput())];
      setDrafts(available);
      const locallySaved = writeCachedDrafts(available);
      applyDraft(available.find(draft => draft.id === activeId) || available[0]);
      if (!locallySaved) setDraftSaveState("failed");
      setDraftsReady(true);
    };

    if (!apiConfigured) {
      useDrafts(cached);
      return () => {
        cancelled = true;
      };
    }

    listDrafts()
      .then(async (remote) => {
        if (cancelled) return;
        const cachedById = new Map(cached.map((draft) => [draft.id, draft]));
        const merged = remote.map((draft) => {
          const local = cachedById.get(draft.id);
          return local && local.updated_at > draft.updated_at ? local : mergeRemoteDraft(draft, local);
        });
        const localOnly = cached.filter((draft) => draft.id.startsWith("local-"));
        const imported = await Promise.all(
          localOnly.map(async (draft) => {
            try {
              const saved = mergeRemoteDraft(await createDraft({
                title: draft.title,
                prompt: draft.prompt,
                mode: draft.mode,
                aspect_ratio: draft.aspect_ratio,
                output_format: draft.output_format,
                visibility: draft.visibility,
                reference_asset_id: null,
              }), draft);
              if (activeId === draft.id) activeId = saved.id;
              return saved;
            } catch {
              return draft;
            }
          }),
        );
        useDrafts([...imported, ...merged]);
      })
      .catch(() => useDrafts(cached));

    return () => {
      cancelled = true;
    };
  }, []);

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

  useEffect(() => {
    if (!draftsReady || imageSaveState === "restoring") return;
    const input: LocalDraftInput = {
      taskType: taskMode,
      localImage,
      title: activeDraftTitle,
      prompt,
      mode,
      aspect_ratio: ratio as WorkspaceDraftInput["aspect_ratio"],
      output_format: format as WorkspaceDraftInput["output_format"],
      visibility: isPublic ? "public" : "private",
      reference_asset_id: referenceAssetId,
    };
    const fingerprint = draftFingerprint(input);
    if (fingerprint === lastSavedDraftRef.current) return;

    if (draftSaveTimerRef.current !== null) {
      window.clearTimeout(draftSaveTimerRef.current);
    }
    setDraftSaveState(apiConfigured && !online ? "offline" : "saving");

    const sequence = ++draftSaveSequenceRef.current;
    draftSaveTimerRef.current = window.setTimeout(() => {
      const now = new Date().toISOString();
      const fallbackId = activeDraftId || `local-${crypto.randomUUID()}`;
      setActiveDraftId(fallbackId);
      const existing = drafts.find((draft) => draft.id === fallbackId);
      const localDraft: WorkspaceDraft = existing
        ? { ...existing, ...input, updated_at: now }
        : makeLocalDraft(input, fallbackId);
      const next = [localDraft, ...drafts.filter((draft) => draft.id !== fallbackId)];
      const locallySaved = writeCachedDrafts(next);
      setDrafts(next);

      if (!apiConfigured) {
        if (locallySaved) lastSavedDraftRef.current = fingerprint;
        setDraftSaveState(locallySaved ? "saved" : "failed");
        return;
      }
      if (!online) {
        setDraftSaveState("offline");
        return;
      }

      const creating = fallbackId.startsWith("local-");
      // Keep one create in flight. Its ID migration will trigger an update
      // with any edits made while the server was responding.
      if (creating && creatingDraftsRef.current.has(fallbackId)) return;
      if (creating) creatingDraftsRef.current.add(fallbackId);
      const request = creating
        ? createDraft(draftInput(input))
        : updateDraft(fallbackId, draftInput(input));
      request
        .then((saved) => {
          if (creating) {
            const cached = readCachedDrafts();
            const latest = latestDraftRef.current?.id === fallbackId ? latestDraftRef.current : cached.find(draft => draft.id === fallbackId);
            if (!latest) { void deleteDraft(saved.id).catch(() => undefined); return; }
            const next = [{ ...mergeRemoteDraft(saved, latest), ...localDraftInput(latest), updated_at: latest.updated_at }, ...cached.filter(draft => draft.id !== fallbackId && draft.id !== saved.id)];
            const persisted = writeCachedDrafts(next);
            setDrafts(next);
            setActiveDraftId(current => current === fallbackId ? saved.id : current);
            if (sequence === draftSaveSequenceRef.current) {
              if (persisted) lastSavedDraftRef.current = fingerprint;
              setDraftSaveState(persisted ? "saved" : "failed");
            }
            return;
          }
          if (sequence !== draftSaveSequenceRef.current) return;
          setActiveDraftId(saved.id);
          const cached = readCachedDrafts();
          const next = [mergeRemoteDraft(saved, localDraft), ...(cached.length ? cached : drafts).filter(draft => draft.id !== fallbackId && draft.id !== saved.id)];
          const persisted = writeCachedDrafts(next);
          setDrafts(next);
          if (persisted) lastSavedDraftRef.current = fingerprint;
          setDraftSaveState(persisted ? "saved" : "failed");
        })
        .catch((error: unknown) => {
          if (sequence !== draftSaveSequenceRef.current) return;
          if (error instanceof ApiError && error.status === 401) {
            setDraftSaveState("session-expired");
          } else if (!window.navigator.onLine || (error instanceof ApiError && error.status === 0)) {
            setDraftSaveState("offline");
          } else {
            setDraftSaveState("failed");
          }
        }).finally(() => { if (creating) creatingDraftsRef.current.delete(fallbackId); });
    }, 700);

    return () => {
      if (draftSaveTimerRef.current !== null) {
        window.clearTimeout(draftSaveTimerRef.current);
        draftSaveTimerRef.current = null;
      }
    };
  }, [
    activeDraftId,
    activeDraftTitle,
    draftsReady,
    format,
    isPublic,
    mode,
    online,
    prompt,
    ratio,
    referenceAssetId,
    taskMode,
    localImage,
    imageSaveState,
  ]);

  useEffect(() => {
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      if (draftSaveState === "saved" && imageSaveState === "saved") return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [draftSaveState, imageSaveState]);

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
      setReferenceAssetId(completedAsset.id);
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

  const handleGenerate = async () => {
    if (taskMode === "rebuild" && reconstruction.available) {
      if (!referenceFile || !draftsReady || imageSaveState !== "saved" || reconstruction.busy) return;
      if (!flushLocalDraft().ok) return;
      await reconstruction.submit({ draftId: activeDraftId, image: referenceFile, prompt: prompt.trim() });
      return;
    }
    if (!apiConfigured) {
      setMessage(ui.workspace.generationUnavailable);
      return;
    }
    if (taskMode === "create" && !prompt.trim()) {
      setMessage(ui.workspace.promptError);
      return;
    }
    if (identity && (credits ?? 0) <= 0) {
      setMessage(ui.workspace.noCredits);
      return;
    }
    if ((taskMode === "rebuild" || mode === "reference") && referenceStatus !== "ready") {
      setMessage(
        taskMode === "rebuild"
          ? workspaceCopy.sourceRequired
          : ui.workspace.uploadBeforeGenerate,
      );
      return;
    }
    requestAuth(startGeneration);
  };

  const acceptReferenceFile = async (selected: File) => {
    if (!draftsReady) return;
    const validation = ++imageValidationRef.current;
    const startingSequence = imageSequenceRef.current;
    const mediaType = mediaTypeFor(selected);
    setReferenceError("");
    if (!mediaType) {
      setReferenceError(ui.workspace.uploadUnsupported);
      return;
    }
    if (selected.size <= 0) {
      setReferenceError(ui.workspace.uploadEmpty);
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      setReferenceError(ui.workspace.uploadTooLarge);
      return;
    }
    let dimensions: {width: number; height: number};
    try { dimensions = await imageDimensions(selected); }
    catch { if (validation === imageValidationRef.current && startingSequence === imageSequenceRef.current) setReferenceError(language === "zh" ? "无法读取这张图片，请选择有效的 PNG、JPEG 或 WebP。" : "Could not read this image. Choose a valid PNG, JPEG or WebP."); return; }
    if (validation !== imageValidationRef.current || startingSequence !== imageSequenceRef.current) return;
    const sequence = ++imageSequenceRef.current;
    const metadata: WorkspaceImage = { key: crypto.randomUUID(), name: selected.name, type: mediaType, size: selected.size, ...dimensions };
    const oldKey = localImage?.key;
    const accept = async () => {
      if (sequence !== imageSequenceRef.current) return;
      setMode("reference");
      setReferenceFile(selected);
      replacePreview(selected);
      setReferenceProgress(0);
      setLocalImage(metadata);
      setImageSaveState("saving");
      setReferenceStatus("local");
      // Record the association immediately; a reload can report an interrupted
      // Blob write instead of silently restoring an unrelated, older image.
      if (latestDraftRef.current) {
        latestDraftRef.current = { ...latestDraftRef.current, mode: "reference", localImage: metadata };
        const { draft: updated } = flushLocalDraft();
        if (updated) setDrafts(items => items.map(item => item.id === updated.id ? updated : item));
      }
      try {
        await saveWorkspaceImage(metadata.key, selected);
        const cached = readCachedDrafts();
        if (!cached.some(draft => draft.localImage?.key === metadata.key)) {
          await deleteWorkspaceImage(metadata.key);
          if (sequence === imageSequenceRef.current) throw new Error("Image association was not saved");
          return;
        }
        if (oldKey && !cached.some(draft => draft.localImage?.key === oldKey)) await deleteWorkspaceImage(oldKey);
        if (sequence !== imageSequenceRef.current) return;
        setImageSaveState("saved");
      } catch {
        if (oldKey && !readCachedDrafts().some(draft => draft.localImage?.key === oldKey)) void deleteWorkspaceImage(oldKey).catch(() => undefined);
        if (sequence !== imageSequenceRef.current) return;
        setImageSaveState("failed");
        setReferenceError(language === "zh" ? "图片未保存到此浏览器，请重新选择以重试。文字草稿仍保留。" : "The image was not saved in this browser. Select it again to retry; your text is retained.");
        return;
      }
      if (apiConfigured) requestAuth(() => void uploadReference(selected, mediaType));
    };
    if (taskMode === "create" && !referencePreview && !localImage) onViewTransition(() => { void accept(); }, "layout");
    else await accept();
  };

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    event.target.value = "";
    if (selected) void acceptReferenceFile(selected);
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
    ++imageSequenceRef.current;
    const oldKey = localImage?.key;
    setLocalImage(null);
    setImageSaveState("saved");
    if (latestDraftRef.current) {
      latestDraftRef.current = { ...latestDraftRef.current, localImage: null, reference_asset_id: null, mode: taskMode === "create" ? "text" : mode };
      const { draft: updated } = flushLocalDraft();
      if (updated) setDrafts(items => items.map(item => item.id === updated.id ? updated : item));
    }
    if (oldKey && !readCachedDrafts().some(draft => draft.localImage?.key === oldKey)) void deleteWorkspaceImage(oldKey).catch(() => undefined);
    if (taskMode === "create") setMode("text");
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
    setReferenceAssetId(null);
    setReferenceStatus("idle");
    setReferenceProgress(0);
    setReferenceError("");
    replacePreview(null);
  };

  const startNewDraft = () => {
    if (!draftsReady) return;
    const current = latestDraftRef.current;
    if (current && !current.title?.trim() && !current.prompt && !current.localImage && !current.reference_asset_id && !referenceFile) {
      onViewTransition(() => { setWorkspaceView("task", false); setTaskMode("rebuild"); setHistoryOpen(false); }, "task"); return;
    }
    onViewTransition(createNewDraft, "task");
  };
  const createNewDraft = () => {
    ++draftSaveSequenceRef.current;
    ++imageSequenceRef.current;
    setWorkspaceView("task", false);
    setProcessPreview(false);
    const result = flushLocalDraft();
    if (!result.ok) return;
    const flushed = result.draft;
    uploadSequenceRef.current += 1;
    uploadAbortRef.current?.abort();
    uploadAbortRef.current = null;
    const pendingAssetId = activeUploadAssetIdRef.current;
    activeUploadAssetIdRef.current = null;
    if (pendingAssetId) {
      void deleteAsset(pendingAssetId).catch(() => undefined);
    }
    replacePreview(null);
    setReferenceFile(null);
    setReferenceAsset(null);
    setReferenceAssetId(null);
    setReferenceStatus("idle");
    setReferenceProgress(0);
    setReferenceError("");
    setTaskMode("rebuild");
    setLocalImage(null);
    setImageSaveState("saved");
    setMode("text");
    setActiveDraftTitle(null);
    setPrompt("");
    setRatio("16:9");
    setFormat("PNG");
    setIsPublic(currentIdentity?.default_visibility === "public");
    setSettingsOpen(false);
    setMessage("");
    const next = makeLocalDraft(blankDraftInput());
    setActiveDraftId(next.id);
    const items = [next, ...drafts.map(item => item.id === flushed?.id ? flushed : item)];
    const locallySaved = writeCachedDrafts(items);
    setDrafts(items);
    lastSavedDraftRef.current = draftFingerprint(blankDraftInput());
    setDraftSaveState(locallySaved ? "saved" : "failed");
  };

  const selectDraft = (draft: WorkspaceDraft) => onViewTransition(() => {
    setWorkspaceView("task", false);
    setProcessPreview(false);
    if (draft.id === activeDraftId) { setHistoryOpen(false); return; }
    const result = flushLocalDraft();
    if (!result.ok) return;
    const flushed = result.draft;
    if (flushed) setDrafts(current => current.map(item => item.id === flushed.id ? flushed : item));
    applyDraft(draft);
    setHistoryOpen(false);
  }, "task");

  const beginRenameDraft = (draft: WorkspaceDraft) => {
    setRenamingDraftId(draft.id);
    setRenamingDraftTitle(
      draft.title ?? draftTitle(draft, ui.workspace.draftUntitled),
    );
  };

  const saveDraftTitle = async (draft: WorkspaceDraft) => {
    const title = renamingDraftTitle.trim().replace(/\s+/g, " ") || null;
    const updatedAt = new Date().toISOString();
    const local = { ...draft, title, updated_at: updatedAt };
    setRenamingDraftId("");
    setRenamingDraftTitle("");
    setDrafts((current) => {
      const next = current.map((item) => (item.id === draft.id ? local : item));
      writeCachedDrafts(next);
      return next;
    });
    if (activeDraftId === draft.id) {
      setActiveDraftTitle(title);
      return;
    }
    if (!apiConfigured || draft.id.startsWith("local-")) return;
    try {
      const saved = await updateDraft(draft.id, { title });
      setDrafts((current) => {
        const next = current.map((item) => (item.id === draft.id ? mergeRemoteDraft(saved, item) : item));
        writeCachedDrafts(next);
        return next;
      });
    } catch {
      setDraftSaveState(window.navigator.onLine ? "failed" : "offline");
    }
  };

  const confirmDeleteDraft = async () => {
    if (!draftToDelete) return;
    const deletedId = draftToDelete.id;
    setDraftToDelete(null);
    if (apiConfigured && !deletedId.startsWith("local-")) {
      try {
        await deleteDraft(deletedId);
      } catch {
        setDraftSaveState(window.navigator.onLine ? "failed" : "offline");
        return;
      }
    }
    const remaining = drafts.filter((draft) => draft.id !== deletedId);
    const imageKey = draftToDelete.localImage?.key;
    if (activeDraftId === deletedId) latestDraftRef.current = null;
    if (remaining.length > 0) {
      setDrafts(remaining);
      const saved = writeCachedDrafts(remaining);
      if (saved && imageKey) void deleteWorkspaceImage(imageKey).catch(() => undefined);
      if (activeDraftId === deletedId) applyDraft(remaining[0]);
      return;
    }
    const next = makeLocalDraft(blankDraftInput());
    setDrafts([next]);
    const locallySaved = writeCachedDrafts([next]);
    if (locallySaved && imageKey) void deleteWorkspaceImage(imageKey).catch(() => undefined);
    setSettingsOpen(false);
    applyDraft(next);
    if (!locallySaved) setDraftSaveState("failed");
  };

  const draftSaveLabel =
    imageSaveState === "failed" ? (language === "zh" ? "原图未保存或无法恢复" : "Image not saved or unavailable")
    : imageSaveState === "saving" ? (language === "zh" ? "正在保存原图…" : "Saving image…")
    : imageSaveState === "restoring" ? (language === "zh" ? "正在恢复原图…" : "Restoring image…")
    : draftSaveState === "saving"
      ? ui.workspace.draftSaving
      : draftSaveState === "offline"
        ? ui.workspace.draftOffline
        : draftSaveState === "failed"
          ? apiConfigured ? ui.workspace.draftFailed : language === "zh" ? "本地保存失败，请保留草稿内容" : "Local save failed. Keep a copy of your draft."
          : draftSaveState === "session-expired"
            ? ui.workspace.draftSessionExpired
          : apiConfigured ? ui.workspace.draftSaved : language === "zh" ? "已在当前浏览器保存" : "Saved in this browser";

  const handlePromptKeyDown = (
    event: ReactKeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (!event.nativeEvent.isComposing && (event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      handleGenerate();
    }
  };

  const changeWorkspaceView = (view: "task" | "documents") => setWorkspaceView(view);
  const promptField = <ProductPromptField key="prompt-field"
    active={active && workspaceView === "task"}
    language={language}
    taskMode={taskMode}
    value={prompt}
    onChange={setPrompt}
    onKeyDown={handlePromptKeyDown}
    label={taskMode === "rebuild" ? language === "zh" ? "补充要求（可选）" : "Additional notes (optional)" : language === "zh" ? "绘图要求" : "Figure brief"}
    help={taskMode === "rebuild"
      ? language === "zh" ? "可说明需要保留或调整的文字、布局和细节。" : "Add notes on text, layout and details to preserve or adjust."
      : language === "zh" ? "明确的主体、标签和布局，会让绘图要求更清楚。" : "Describe the subject, labels and layout to make the brief clearer."}
    message={message}
    invalid={message === ui.workspace.promptError}
  />;

  if (!active) return null;

  return (
    <main
      className={`workspace-page ff-workspace-v3 task-${taskMode} ${
        historyCollapsed ? "history-collapsed" : ""
      }`}
    >
      <aside className="workspace-history" aria-label={ui.workspace.history}>
        <div className="workspace-history-heading">
          <button className="workspace-brand" type="button" aria-label={language === "zh" ? "FigFox 展示首页" : "FigFox home"} onClick={() => onNavigate("/")}><FigFoxMark /><FigFoxWordmark className="figfox-wordmark" /></button>
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
          </button>
        </div>

        <button className="new-draft-button" type="button" onClick={startNewDraft} title={ui.workspace.newDraft} aria-label={ui.workspace.newDraft}>
          <Plus size={18} />
          <span>{ui.workspace.newDraft}</span>
        </button>

        <button type="button" className="workspace-new-svg" disabled={svg.busy} onClick={() => void svg.create()} title={language === "zh" ? "新建 SVG 画布" : "New SVG canvas"} aria-label={language === "zh" ? "新建 SVG 画布" : "New SVG canvas"}><BoundingBox size={18}/><span>{language === "zh" ? "新建 SVG 画布" : "New SVG canvas"}</span></button>
        <button type="button" className="workspace-documents-link" aria-current={workspaceView === "documents" ? "page" : undefined} aria-label={language === "zh" ? "我的 SVG" : "My SVGs"} onClick={() => changeWorkspaceView("documents")} title={language === "zh" ? "我的 SVG" : "My SVGs"}><Stack size={18} /><span>{language === "zh" ? "我的 SVG" : "My SVGs"}</span></button>

        {continueButton("workspace-continue-sidebar")}
        <div className="workspace-records">
          <p className="workspace-records-label">{ui.workspace.history}</p>
          {drafts.length > 0
            ? drafts.map((draft) => (
                <article
                  className={
                    workspaceView === "task" && activeDraftId === draft.id
                      ? "workspace-record current"
                      : "workspace-record"
                  }
                  aria-current={workspaceView === "task" && activeDraftId === draft.id ? "true" : undefined}
                  key={draft.id}
                >
                  {renamingDraftId === draft.id && !historyCollapsed ? (
                    <form
                      className="draft-rename-form"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void saveDraftTitle(draft);
                      }}
                    >
                      <input
                        autoFocus
                        maxLength={120}
                        value={renamingDraftTitle}
                        aria-label={ui.workspace.rename}
                        onChange={(event) => setRenamingDraftTitle(event.target.value)}
                      />
                      <button
                        type="submit"
                        aria-label={ui.workspace.renameSave}
                        title={ui.workspace.renameSave}
                      >
                        <Check size={15} />
                      </button>
                      <button
                        type="button"
                        aria-label={ui.workspace.renameCancel}
                        title={ui.workspace.renameCancel}
                        onClick={() => {
                          setRenamingDraftId("");
                          setRenamingDraftTitle("");
                        }}
                      >
                        <X size={15} />
                      </button>
                    </form>
                  ) : (
                    <button
                      title={draftTitle(draft.id === activeDraftId && latestDraftRef.current ? latestDraftRef.current : draft, ui.workspace.draftUntitled)}
                      aria-label={draftTitle(draft.id === activeDraftId && latestDraftRef.current ? latestDraftRef.current : draft, ui.workspace.draftUntitled)}
                      className="workspace-record-main"
                      type="button"
                      data-allow-wrap="true"
                      onClick={() => selectDraft(draft)}
                    >
                      <NotePencil size={19} />
                      <span>
                        <strong>{draftTitle(draft.id === activeDraftId && latestDraftRef.current ? latestDraftRef.current : draft, ui.workspace.draftUntitled)}</strong>
                        <small>
                          {new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }).format(new Date(draft.updated_at))}
                        </small>
                      </span>
                    </button>
                  )}
                  <span className="workspace-record-actions">
                      <button
                        className="workspace-record-rename"
                        type="button"
                        aria-label={ui.workspace.rename}
                        title={ui.workspace.rename}
                        onClick={() => beginRenameDraft(draft)}
                      >
                        <PencilSimple size={15} />
                      </button>
                      <button
                        className="workspace-record-delete"
                        type="button"
                        aria-label={ui.workspace.delete}
                        title={ui.workspace.delete}
                        onClick={() => setDraftToDelete(draft)}
                      >
                        <Trash size={15} />
                      </button>
                    </span>
                </article>
              ))
            : !historyCollapsed && (
                <div className="workspace-history-empty">
                  <FileImage size={22} />
                  <p>{ui.workspace.historyHint}</p>
                </div>
              )}
        </div>

        <nav className="workspace-utilities" aria-label={language === "zh" ? "帮助与设置" : "Help and settings"}>
          <button type="button" onClick={() => onNavigate("/docs")} aria-label={language === "zh" ? "使用指南" : "Guide"} title={language === "zh" ? "使用指南" : "Guide"}><NotePencil size={17}/><span>{language === "zh" ? "使用指南" : "Guide"}</span></button>
          <button type="button" onClick={() => onNavigate("/pricing")} aria-label={language === "zh" ? "定价" : "Pricing"} title={language === "zh" ? "定价" : "Pricing"}><Stack size={17}/><span>{language === "zh" ? "定价" : "Pricing"}</span></button>
          <button type="button" onClick={onLanguageChange} aria-label={language === "zh" ? "Switch to English" : "切换中文"}><Globe size={17}/><span>{language === "zh" ? "English" : "中文"}</span></button>
        </nav>
        <WorkspaceAccountSummary
          ui={ui}
          identity={identity}
          currentIdentity={currentIdentity}
          onActivate={onAccount}
        />
      </aside>

      <div className="workspace-canvas">
        <header className="workspace-heading">
          <div className="workspace-heading-copy">
            <div className="workspace-title-line">
              <h1 title={workspaceView === "documents" ? language === "zh" ? "我的 SVG" : "My SVGs" : latestDraftRef.current ? draftTitle(latestDraftRef.current, ui.workspace.draftUntitled) : ui.workspace.draftUntitled}>{workspaceView === "documents" ? language === "zh" ? "我的 SVG" : "My SVGs" : latestDraftRef.current ? draftTitle(latestDraftRef.current, ui.workspace.draftUntitled) : ui.workspace.draftUntitled}</h1>
              {workspaceView !== "documents" && <span className={`draft-save-state ${imageSaveState === "failed" ? "failed" : draftSaveState}`} role="status">
                {draftSaveLabel}
              </span>}
            </div>
          </div>
          <div className="workspace-heading-actions">
            <button
              className="workspace-mobile-history"
              type="button"
              onClick={() => setHistoryOpen(true)}
            >
              <ClockCounterClockwise size={17} />
              {language === "zh" ? "导航" : "Navigation"}
            </button>
            {continueButton("workspace-continue-header")}
            <button type="button" className="workspace-open-svg" disabled={svg.busy} onClick={svg.choose}><UploadSimple size={18}/><span>{language === "zh" ? "打开 SVG" : "Open SVG"}</span></button>
          </div>
        </header>
        <input ref={svg.input} className="sr-only" type="file" tabIndex={-1} accept=".svg,image/svg+xml" aria-label={language === "zh" ? "导入 SVG 文档" : "Import SVG document"} onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; void svg.importFile(file); }}/>
        <div className="workspace-scroll">
        <div className={`workspace-layout workspace-view-${workspaceView}`}>
        {reconstruction.task && <div className="workspace-progress-strip">
          <span title={reconstruction.task.name}>{reconstruction.task.name}</span>
          <button ref={progressTrigger} type="button" onClick={() => reconstruction.setOpen(true)}><ClockCounterClockwise size={17}/>{language === "zh" ? "查看进度" : "View progress"}</button>
        </div>}
        {reconstruction.submitFailed && <p className="workspace-file-error" role="alert">{language === "zh" ? "任务未能提交，请稍后重试。原图与要求已保留。" : "The task could not be submitted. Try again shortly; your image and notes are retained."}</p>}
        {reconstruction.task && <ReconstructionResult snapshot={reconstruction.task.snapshot} zh={language === "zh"} busy={svg.busy} onEdit={() => void svg.openReconstruction(reconstruction.task!.snapshot)}/>}
        {svg.error && <p className="workspace-file-error" role="alert"><WarningCircle size={17}/>{svg.error}</p>}
        {workspaceView === "documents" ? <WorkspaceDocuments language={language} onOpenDocument={id => void svg.openDocument(id)} onExample={() => void svg.example()} operationBusy={svg.busy} onDocumentsChange={svg.refresh}/> : <>
          <h2 className="sr-only">{taskMode === "rebuild" ? language === "zh" ? "图片转 SVG" : "Image to SVG" : language === "zh" ? "文生图" : "Text to image"}</h2>
          <div className="workspace-mode-row">
            <Tabs.Root value={taskMode} onValueChange={value => changeTaskMode(value as "create" | "rebuild")}>
              <Tabs.List className="workspace-task-switch" aria-label={ui.workspace.title}>
                <Tabs.Tab value="rebuild" onClick={() => { if (taskMode === "rebuild" && requestedTaskMode.current !== "rebuild") changeTaskMode("rebuild"); }}>{language === "zh" ? "图片转 SVG" : "Image to SVG"}</Tabs.Tab>
                <Tabs.Tab value="create" onClick={() => { if (taskMode === "create" && requestedTaskMode.current !== "create") changeTaskMode("create"); }}>{language === "zh" ? "文生图" : "Text to image"}</Tabs.Tab>
                <Tabs.Indicator className="workspace-task-indicator"/>
              </Tabs.List>
            </Tabs.Root>
            <button type="button" className="workspace-process-button" onClick={event => {dialogTrigger.current=event.currentTarget;setProcessPreview(true);}}><PlayCircle size={17}/>{language === "zh" ? "流程示意" : "Process overview"}</button>
          </div>
          <div className="workspace-task-content">
            {!(taskMode === "rebuild" && reconstruction.available) && <div className="workspace-service-status" id="workspace-service-status"><strong>{reconstructionLimited ? reconstructionLimitLabel : language === "zh" ? taskMode === "rebuild" ? "重建服务未开放" : "生成服务未开放" : taskMode === "rebuild" ? "Reconstruction unavailable" : "Generation unavailable"}</strong><span>{reconstructionLimited ? language === "zh" ? "已完成的结果仍可查看、下载和编辑。" : "Completed results remain available to view, download and edit." : language === "zh" ? taskMode === "rebuild" ? "目前可保存原图与要求，暂不能提交重建。" : "目前可保存绘图要求，暂不能提交生成。" : taskMode === "rebuild" ? "You can save the source image and notes, but cannot submit a reconstruction yet." : "You can save the brief, but cannot submit a generation yet."}</span></div>}
            <section className={`control-panel ${dragging ? "is-dragging" : ""}`}
              onDragOver={event => {if(event.dataTransfer.types.includes("Files")){event.preventDefault();event.dataTransfer.dropEffect="copy";setDragging(true);}}}
              onDragLeave={event => {if(!event.currentTarget.contains(event.relatedTarget as Node | null))setDragging(false);}}
              onDrop={event => {event.preventDefault();setDragging(false);const file=event.dataTransfer.files[0];if(file)void acceptReferenceFile(file);}}
              onPaste={event => {if((event.target as HTMLElement).closest("textarea,input,[contenteditable=true]"))return;const file=[...event.clipboardData.items].find(item=>item.kind==="file" && item.type.startsWith("image/"))?.getAsFile();if(file){event.preventDefault();void acceptReferenceFile(file);}}}>
              <div className={`workspace-input-body ${taskMode === "create" && (referencePreview || localImage) ? "has-reference" : ""}`}>
                {(taskMode === "rebuild" || referencePreview || localImage) && <WorkspaceImageField key="image-field" zh={language === "zh"} isRebuild={taskMode === "rebuild"} source={referencePreview} name={referenceFile?.name || localImage?.name || referenceAsset?.original_filename || ""} metadata={localImage} error={referenceError} pending={uploadBusy} choose={() => document.getElementById("reference-file")?.click()} remove={() => onViewTransition(uploadBusy ? cancelReferenceUpload : removeReference, "layout")} enlarge={trigger => {dialogTrigger.current=trigger;setSourceOpen(true);}}/>}
                {promptField}
              </div>
              {taskMode === "create" && !referencePreview && !localImage && referenceError && <p className="workspace-reference-error" role="alert">{referenceError}</p>}
              <input className="sr-only" id="reference-file" type="file" tabIndex={-1} accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" aria-label={ui.workspace.referenceLabel} onChange={handleFile} disabled={uploadBusy}/>
              <div className="workspace-composer-footer">
                {taskMode === "create" && !referencePreview && !localImage && <button type="button" className="workspace-attach-reference" onClick={() => document.getElementById("reference-file")?.click()} disabled={uploadBusy}><UploadSimple size={17}/><span>{language === "zh" ? "添加参考图" : "Add reference"}</span></button>}
                {taskMode === "rebuild" && <span className="workspace-output-info">{language === "zh" ? "输出：可编辑 SVG" : "Output: editable SVG"}</span>}
          {taskMode === "create" && <Collapsible.Root
            className="settings-disclosure"
            open={settingsOpen}
            onOpenChange={setSettingsOpen}
            onKeyDown={event => { if (event.key === "Escape") { setSettingsOpen(false); event.currentTarget.querySelector<HTMLButtonElement>(".settings-summary")?.focus(); } }}
          >
            <Collapsible.Trigger
              className="settings-summary"
              data-allow-wrap="true"
            >
              <span>
                <strong>{language === "zh" ? taskMode === "create" ? "画幅与导出" : "保存设置" : "Options"}</strong>
                <small>
                  {`${ratio} · ${format}`}
                </small>
              </span>
              <CaretRight size={17} aria-hidden="true" />
              <span className="sr-only">
                {settingsOpen
                  ? ui.workspace.settingsClose
                  : ui.workspace.settingsOpen}
              </span>
            </Collapsible.Trigger>

            <Collapsible.Panel className="settings-disclosure-body">
                {taskMode === "create" && <div className="settings-block">
                  <p>{ui.workspace.settings}</p>
                  <div className="settings-grid">
                    <fieldset>
                      <legend>{ui.workspace.ratio}</legend>
                      <ToggleGroup
                        className="choice-row"
                        value={[ratio]}
                        aria-label={ui.workspace.ratio}
                        onValueChange={(values) => {
                          const nextRatio = values.at(-1);
                          if (nextRatio) setRatio(nextRatio);
                        }}
                      >
                        {["16:9", "4:3", "1:1"].map((item) => (
                          <Toggle
                            key={item}
                            value={item}
                          >
                            {item}
                          </Toggle>
                        ))}
                      </ToggleGroup>
                    </fieldset>
                    <label className="format-field">
                      <span>{ui.workspace.format}</span>
                      <FigFoxSelect
                        value={format}
                        ariaLabel={ui.workspace.format}
                        options={[
                          { value: "PNG", label: "PNG" },
                          { value: "JPG", label: "JPG" },
                          { value: "WebP", label: "WebP" },
                        ]}
                        onValueChange={setFormat}
                      />
                    </label>
                  </div>
                </div>}

                {apiConfigured && <div className="privacy-control">
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
                  <Switch.Root
                    className="toggle"
                    checked={isPublic}
                    aria-label={
                      isPublic
                        ? ui.workspace.publicToggle
                        : ui.workspace.privateToggle
                    }
                    onCheckedChange={setIsPublic}
                  >
                    <Switch.Thumb />
                  </Switch.Root>
                </div>}
            </Collapsible.Panel>
          </Collapsible.Root>}


                <div className="workspace-submit"><span id="workspace-submit-reason">{taskMode === "rebuild" && reconstruction.available ? reconstruction.busy ? language === "zh" ? "任务处理中" : "Task in progress" : !referenceFile ? language === "zh" ? "请先添加原图" : "Add a source image" : "" : language === "zh" ? "服务未开放" : "Service unavailable"}</span><button type="button" className="generate-button" onClick={() => void handleGenerate()} disabled={taskMode !== "rebuild" || !reconstruction.available || !referenceFile || !draftsReady || imageSaveState !== "saved" || reconstruction.busy} aria-describedby="workspace-submit-reason">{reconstruction.submitting ? language === "zh" ? "正在提交…" : "Submitting…" : language === "zh" ? taskMode === "rebuild" ? "重建 SVG" : "生成图片" : taskMode === "rebuild" ? "Reconstruct SVG" : "Generate image"}<ArrowRight size={16}/></button></div>
              </div>
            </section>
            <button type="button" className="workspace-example" disabled={svg.busy} onClick={() => void svg.example()}><VectorThree size={17}/>{language === "zh" ? "编辑科研 SVG 示例" : "Edit a research SVG example"}<ArrowUpRight size={15}/></button>
          </div>
        </>}
        </div>
        </div>
      </div>

      <Dialog.Root open={reconstruction.open && active} onOpenChange={reconstruction.setOpen}>
        <Dialog.Portal><Dialog.Backdrop className="workspace-dialog-backdrop"/><Dialog.Viewport className="workspace-dialog-viewport"><Dialog.Popup className="workspace-dialog workspace-process-dialog" finalFocus={progressTrigger}>
          <header><Dialog.Title>{language === "zh" ? "重建进度" : "Reconstruction progress"}</Dialog.Title><Dialog.Close aria-label={language === "zh" ? "关闭进度" : "Close progress"}><X size={20}/></Dialog.Close></header>
          {reconstruction.task && <ReconstructionProgress snapshot={reconstruction.task.snapshot} name={reconstruction.task.name} disconnected={reconstruction.disconnected} language={language} onClose={() => reconstruction.setOpen(false)} resultBusy={svg.busy} onEdit={() => void svg.openReconstruction(reconstruction.task!.snapshot)}/>}
        </Dialog.Popup></Dialog.Viewport></Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={(sourceOpen || processPreview) && active} onOpenChange={open => {if(!open){setSourceOpen(false);setProcessPreview(false);}}}>
        <Dialog.Portal><Dialog.Backdrop className="workspace-dialog-backdrop"/><Dialog.Viewport className="workspace-dialog-viewport"><Dialog.Popup className={`workspace-dialog ${sourceOpen ? "workspace-source-dialog" : "workspace-process-dialog"}`} finalFocus={dialogTrigger}>
          <header><Dialog.Title>{sourceOpen ? referenceFile?.name || localImage?.name : language === "zh" ? "流程示意" : "Process overview"}</Dialog.Title><Dialog.Close aria-label={language === "zh" ? "关闭预览" : "Close preview"}><X size={20}/></Dialog.Close></header>
          {sourceOpen ? <img src={referencePreview} alt={language === "zh" ? "完整原图" : "Full source image"}/> : <FigureProcessPreview active={active && processPreview} language={language} mode={taskMode} onClose={() => setProcessPreview(false)}/>}
        </Dialog.Popup></Dialog.Viewport></Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={historyOpen && active} onOpenChange={setHistoryOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="modal-backdrop" />
          <Dialog.Viewport className="product-history-viewport">
          <Dialog.Popup className="history-drawer product-history-drawer">
            <div className="drawer-heading">
              <Dialog.Title>{ui.workspace.history}</Dialog.Title>
              <Dialog.Close
                aria-label={ui.workspace.closeHistory}
              >
                <X size={20} />
              </Dialog.Close>
            </div>
            <nav className="workspace-drawer-nav" aria-label={language === "zh" ? "工作台导航" : "Workspace navigation"}>
              <button type="button" onClick={() => { startNewDraft(); setHistoryOpen(false); }}>{ui.workspace.newDraft}</button>
              <button type="button" className="workspace-new-svg" disabled={svg.busy} onClick={() => void svg.create()}>{language === "zh" ? "新建 SVG 画布" : "New SVG canvas"}</button>
              {continueButton("workspace-continue-drawer")}
              <button type="button" onClick={() => { changeWorkspaceView("documents"); setHistoryOpen(false); }}>{language === "zh" ? "我的 SVG" : "My SVGs"}</button>
              <button type="button" onClick={() => { setHistoryOpen(false); onNavigate("/docs"); }}>{language === "zh" ? "使用指南" : "Guide"}</button>
              <button type="button" onClick={() => { setHistoryOpen(false); onNavigate("/pricing"); }}>{language === "zh" ? "定价" : "Pricing"}</button>
              <button type="button" onClick={onLanguageChange}>{language === "zh" ? "English" : "中文"}</button>
            </nav>
            {drafts.length > 0 ? (
              <div className="history-draft-list">
                {drafts.map((draft) => (
                  <article
                    className={
                      activeDraftId === draft.id
                        ? "history-item current"
                        : "history-item"
                    }
                    key={draft.id}
                  >
                    <button
                      type="button"
                      data-allow-wrap="true"
                      onClick={() => selectDraft(draft)}
                    >
                      <NotePencil size={20} />
                      <span>
                        <strong>{draftTitle(draft, ui.workspace.draftUntitled)}</strong>
                        <small>{ui.workspace.draftPending}</small>
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-label={ui.workspace.delete}
                      title={ui.workspace.delete}
                      onClick={() => setDraftToDelete(draft)}
                    >
                      <Trash size={18} />
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="drawer-empty">
                <FileImage size={27} />
                <p>{ui.workspace.historyEmpty}</p>
              </div>
            )}
            <WorkspaceAccountSummary
              ui={ui}
              identity={identity}
              currentIdentity={currentIdentity}
              onActivate={() => { setHistoryOpen(false); onAccount(); }}
            />
          </Dialog.Popup>
          </Dialog.Viewport>
        </Dialog.Portal>
      </Dialog.Root>

      <AlertDialog.Root open={!!draftToDelete && active} onOpenChange={open => { if (!open) setDraftToDelete(null); }}>
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="modal-backdrop" />
          <AlertDialog.Viewport className="dialog-viewport">
          <AlertDialog.Popup className="draft-delete-dialog product-delete-dialog">
            <p className="kicker">{ui.workspace.draftLabel}</p>
            <AlertDialog.Title>{ui.workspace.deleteDraftTitle}</AlertDialog.Title>
            <AlertDialog.Description>{apiConfigured ? ui.workspace.deleteDraftBody : language === "zh" ? "删除后无法恢复这份本地草稿。" : "This local draft cannot be restored after deletion."}</AlertDialog.Description>
            <div>
              <AlertDialog.Close
                className="button secondary-button"
              >
                {ui.workspace.cancel}
              </AlertDialog.Close>
              <button
                className="button danger-button"
                type="button"
                onClick={() => void confirmDeleteDraft()}
              >
                {ui.workspace.deleteDraftConfirm}
              </button>
            </div>
          </AlertDialog.Popup>
          </AlertDialog.Viewport>
        </AlertDialog.Portal>
      </AlertDialog.Root>

    </main>
  );
}

const feedbackCopy = {
  zh: {
    kicker: "提交反馈",
    title: "哪里不对，直接告诉我们。",
    body:
      "描述你当时在做什么、哪里出了问题。提交后会得到一个编号，方便之后跟进。",
    category: "你要反馈什么",
    categories: {
      product: "产品建议",
      bug: "问题报告",
      account: "账户与数据",
      other: "其他",
    },
    message: "发生了什么",
    messagePlaceholder:
      "例如：我在上传参考图时一直停在验证中。我原本以为几秒后会进入下一步。请不要填写患者信息或其他敏感资料。",
    email: "联系邮箱（可选）",
    emailPlaceholder: "需要回复时使用",
    submit: "提交反馈",
    submitting: "正在提交…",
    unavailableTitle: "反馈服务还没接通",
    unavailableBody:
      "你填写的内容只会留在当前页面，不会发出去。",
    validation: "请至少填写 10 个字符。",
    emailInvalid: "请填写有效的邮箱地址，或将邮箱留空。",
    failed: "暂时无法提交。内容仍保留在页面中，请稍后重试。",
    received: "已经收到",
    receipt: "反馈编号",
    history: "提交记录",
    historyEmpty: "还没有提交记录。",
    status: {
      received: "已收到",
      in_review: "处理中",
      resolved: "已解决",
      closed: "已关闭",
    },
    privacy:
      "反馈默认不公开。我们只保存正文、类型、可选邮箱、来源页面和处理状态。",
  },
  en: {
    kicker: "Feedback",
    title: "Found a problem? Tell us.",
    body:
      "Send a product idea, interface issue, or account request. Each submission gets a reference so you can check its status.",
    category: "Feedback type",
    categories: {
      product: "Product idea",
      bug: "Issue report",
      account: "Account and data",
      other: "Other",
    },
    message: "Details",
    messagePlaceholder:
      "Describe what you were doing, what happened, and what you expected. Do not submit patient identifiers or other sensitive research material.",
    email: "Contact email (optional)",
    emailPlaceholder: "Used only if a reply is needed",
    submit: "Send feedback",
    submitting: "Sending…",
    unavailableTitle: "Feedback is not available yet",
    unavailableBody:
      "The website is not connected to the feedback service yet. Your text stays on this page and is not sent.",
    validation: "Write at least 10 characters.",
    emailInvalid: "Enter a valid email address or leave the field empty.",
    failed: "We could not send this yet. Your text remains here so you can retry.",
    received: "Feedback received",
    receipt: "Reference",
    history: "Recent submissions",
    historyEmpty: "No feedback has been submitted from this identity.",
    status: {
      received: "Received",
      in_review: "In review",
      resolved: "Resolved",
      closed: "Closed",
    },
    privacy:
      "Submissions are private by default. We store the message, category, optional email, source page, and handling status.",
  },
} as const;

function FeedbackPage({
  language,
  onNavigate,
}: {
  language: Language;
  onNavigate: (path: RoutePath) => void;
}) {
  const content = feedbackCopy[language];
  const [category, setCategory] = useState<FeedbackEntry["category"]>("product");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const [submitState, setSubmitState] = useState<
    "idle" | "submitting" | "received" | "failed"
  >("idle");
  const [formError, setFormError] = useState("");
  const [receipt, setReceipt] = useState("");

  useEffect(() => {
    if (!apiConfigured) return;
    let cancelled = false;
    listFeedback()
      .then((items) => {
        if (!cancelled) setEntries(items);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    const normalizedMessage = message.trim();
    const normalizedEmail = email.trim();
    if (normalizedMessage.length < 10) {
      setFormError(content.validation);
      return;
    }
    if (
      normalizedEmail &&
      !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalizedEmail)
    ) {
      setFormError(content.emailInvalid);
      return;
    }
    if (!apiConfigured) return;

    setSubmitState("submitting");
    try {
      const entry = await createFeedback({
        category,
        message: normalizedMessage,
        contact_email: normalizedEmail || null,
        page_url: window.location.href,
        locale: language,
      });
      setEntries((current) => [entry, ...current.filter((item) => item.id !== entry.id)]);
      setReceipt(entry.id.slice(0, 8).toUpperCase());
      setMessage("");
      setEmail("");
      setSubmitState("received");
    } catch {
      setSubmitState("failed");
    }
  };

  return (
    <main className="feedback-page page-enter" id="main-content">
      <PageSection className="feedback-heading-section" density="compact">
        <PageContainer>
          <div className="feedback-heading">
            <button
              className="information-back"
              type="button"
              onClick={() => onNavigate("/")}
            >
              <CaretLeft size={17} />
              {language === "zh" ? "返回首页" : "Back to home"}
            </button>
            <Grid
              className="feedback-heading-grid"
              columns={{ initial: "1", md: "minmax(0, 1.12fr) minmax(18rem, 0.88fr)" }}
              gap={{ initial: "4", md: "8" }}
              align="end"
            >
              <div>
                <p className="kicker">{content.kicker}</p>
                <h1>{content.title}</h1>
              </div>
              <p>{content.body}</p>
            </Grid>
          </div>
        </PageContainer>
      </PageSection>

      <PageSection className="feedback-content-section" density="compact">
        <PageContainer>
          <Grid
            className="feedback-layout"
            columns={{ initial: "1", md: "minmax(0, 1.25fr) minmax(17rem, 0.75fr)" }}
            gap={{ initial: "7", md: "9" }}
            align="start"
          >
          <form className="feedback-form" onSubmit={(event) => void submit(event)}>
          <label>
            <span>{content.category}</span>
            <FigFoxSelect
              value={category}
              ariaLabel={content.category}
              options={Object.entries(content.categories).map(([value, label]) => ({
                value: value as FeedbackEntry["category"],
                label,
              }))}
              onValueChange={setCategory}
            />
          </label>
          <label>
            <span>{content.message}</span>
            <textarea
              rows={8}
              maxLength={4000}
              value={message}
              placeholder={content.messagePlaceholder}
              onChange={(event) => {
                setMessage(event.target.value);
                setSubmitState("idle");
              }}
            />
            <small>{message.length}/4000</small>
          </label>
          <label>
            <span>{content.email}</span>
            <input
              type="email"
              maxLength={320}
              value={email}
              placeholder={content.emailPlaceholder}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          {formError && (
            <p className="feedback-error" role="alert">
              {formError}
            </p>
          )}
          {!apiConfigured && (
            <div className="feedback-unavailable">
              <strong>{content.unavailableTitle}</strong>
              <p>{content.unavailableBody}</p>
            </div>
          )}
          {submitState === "failed" && (
            <p className="feedback-error" role="alert">
              {content.failed}
            </p>
          )}
          {submitState === "received" && (
            <div className="feedback-receipt" role="status">
              <Check size={19} />
              <span>
                <strong>{content.received}</strong>
                <small>
                  {content.receipt} · {receipt}
                </small>
              </span>
            </div>
          )}
          <button
            className="button primary-button feedback-submit"
            type="submit"
            disabled={!apiConfigured || submitState === "submitting"}
          >
            <PaperPlaneTilt size={18} />
            {submitState === "submitting" ? content.submitting : content.submit}
          </button>
          <p className="feedback-privacy">{content.privacy}</p>
          </form>

          <aside className="feedback-history">
          <p className="kicker">{content.history}</p>
          {entries.length > 0 ? (
            <ol>
              {entries.map((entry) => (
                <li key={entry.id}>
                  <div>
                    <strong>{content.categories[entry.category]}</strong>
                    <small>
                      {new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      }).format(new Date(entry.created_at))}
                    </small>
                  </div>
                  <span>{content.status[entry.status]}</span>
                  <code>{entry.id.slice(0, 8).toUpperCase()}</code>
                </li>
              ))}
            </ol>
          ) : (
            <div className="feedback-empty">
              <NotePencil size={24} weight="duotone" aria-hidden="true" />
              <strong>{content.historyEmpty}</strong>
              <span>
                {language === "zh"
                  ? "提交后，编号和处理状态会显示在这里。"
                  : "References and status updates will appear here after you submit."}
              </span>
            </div>
          )}
          </aside>
          </Grid>
        </PageContainer>
      </PageSection>
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
          <InternalLink href="/feedback" onNavigate={onNavigate}>
            {footer.feedback}
            <ArrowRight size={15} />
          </InternalLink>
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
  onDefaultVisibilityChange,
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
  onDefaultVisibilityChange: (
    visibility: "private" | "public",
  ) => Promise<boolean>;
  onLogout: () => void;
  onDeleteAccount: () => void;
}) {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [preferenceSaved, setPreferenceSaved] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDeleteConfirmOpen(false);
    setPreferenceSaved(false);
  }, [open]);

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
    <Dialog.Root open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="modal-backdrop" />
        <Dialog.Viewport className="dialog-viewport">
          <Dialog.Popup className="login-dialog account-dialog">
        <Dialog.Close className="dialog-close" aria-label={ui.auth.close}>
          <X size={20} />
        </Dialog.Close>
        <p className="dialog-label">FigFox</p>
        <Dialog.Title id="account-title">{ui.auth.accountTitle}</Dialog.Title>
        <Dialog.Description>{ui.auth.accountBody}</Dialog.Description>
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
            <strong>{current.display_name || ui.nav.account}</strong>
            <small>
              {ui.workspace.credits} {current.balance.available}
            </small>
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

        <section className="account-preferences">
          <div className="account-section-heading">
            <p>{ui.auth.preferences}</p>
            <LockKey size={17} />
          </div>
          <label>
            <span>
              <strong>{ui.auth.defaultPrivacy}</strong>
              <small>{ui.auth.privacyHint}</small>
            </span>
            <FigFoxSelect
              value={current.default_visibility}
              disabled={busy}
              ariaLabel={ui.auth.defaultPrivacy}
              options={[
                { value: "private", label: ui.auth.defaultPrivate },
                { value: "public", label: ui.auth.defaultPublic },
              ]}
              onValueChange={(visibility) => {
                setPreferenceSaved(false);
                void onDefaultVisibilityChange(visibility).then((saved) => {
                  setPreferenceSaved(saved);
                });
              }}
            />
          </label>
          {preferenceSaved && (
            <p className="preference-saved" role="status">
              <Check size={15} />
              {ui.auth.preferenceSaved}
            </p>
          )}
        </section>

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
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default function App() {
  const initialRoute = routeFromLocation(window.location.pathname);
  const [route, setRoute] = useState<RoutePath>(initialRoute);
  const currentRoute = useRef<RoutePath>(initialRoute);
  const transitionPage = usePageTransition();
  const [workspaceVisited, setWorkspaceVisited] = useState(initialRoute === "/workspace");
  useEffect(() => { if (route === "/workspace") setWorkspaceVisited(true); }, [route]);
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
  const [authReturnRoute, setAuthReturnRoute] = useState<RoutePath>(() => {
    try {
      const saved = window.sessionStorage.getItem("figfox-auth-return-route");
      if (saved && isRoutePath(saved) && saved !== "/login") return saved;
    } catch { /* Direct sign-in still has a local workspace to return to. */ }
    return "/workspace";
  });
  const [accountOpen, setAccountOpen] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [accountError, setAccountError] = useState("");
  const pendingAction = useRef<(() => void) | null>(null);
  const site = useRef<HTMLDivElement>(null);
  const ui = copy[language];

  const applyServerIdentity = (current: CurrentIdentity) => {
    setCurrentIdentity(current);
    setIdentity(current.kind);
    setCredits(current.balance.available);
  };

  useEffect(() => {
    let sequence = 0;
    const handlePopState = async () => {
      const current = ++sequence;
      pendingAction.current = null;
      const nextRoute = routeFromLocation(window.location.pathname);
      if (nextRoute === currentRoute.current) return;
      if (currentRoute.current === "/editor") {
        const saved = await saveBeforeEditorLeave();
        if (current !== sequence) return;
        if (!saved) { window.history.forward(); return; }
      }
      transitionPage(routeTransition(currentRoute.current, nextRoute), () => {
        currentRoute.current = nextRoute;
        setRoute(nextRoute);
        if (nextRoute === "/login" || nextRoute === "/editor") window.scrollTo({ top: 0, behavior: "instant" });
      });
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [transitionPage]);

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
      const returnRoute = routeFromLocation(url.pathname);
      if (returnRoute !== "/login") {
        setAuthReturnRoute(returnRoute);
        try { window.sessionStorage.setItem("figfox-auth-return-route", returnRoute); } catch { /* In-memory return route remains available. */ }
      }
      url.pathname = routeHref("/login");
      currentRoute.current = "/login";
      setRoute("/login");
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
    const previousRoute = currentRoute.current;
    if (previousRoute === "/login" && path !== "/login") pendingAction.current = null;
    const navigationState = path === "/editor" ? rememberEditorOrigin(previousRoute === "/workspace") : {};
    transitionPage(routeTransition(previousRoute, path), () => {
      const nextHref = path === "/workspace" ? workspaceReturnHref(routeHref(path), previousRoute === "/editor") : routeHref(path);
      if (window.location.pathname + window.location.search !== nextHref) {
        window.history.pushState(navigationState, "", nextHref);
      }
      currentRoute.current = path;
      setRoute(path);
      window.scrollTo({ top: 0, behavior: routeTransition(previousRoute, path) ? "instant" : "smooth" });
    });
  };

  const openLogin = (action?: () => void) => {
    pendingAction.current = action ?? null;
    setAuthError("");
    if (route !== "/login") {
      setAuthReturnRoute(route);
      try { window.sessionStorage.setItem("figfox-auth-return-route", route); } catch { /* Retain the return route in React state. */ }
    }
    navigate("/login");
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
      window.location.assign(oauthStartUrl(choice, "login", routeHref(authReturnRoute)));
      return;
    }

    if (!apiConfigured) {
      pendingAction.current = null;
      navigate("/workspace");
      return;
    }

    setAuthBusy(true);
    setAuthError("");
    try {
      const current = await createOrRestoreGuest();
      applyServerIdentity(current);
      window.localStorage.setItem(sessionMarker, "active");
      const action = pendingAction.current;
      pendingAction.current = null;
      navigate(action ? authReturnRoute : "/workspace");
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

  const handleDefaultVisibilityChange = async (
    visibility: "private" | "public",
  ) => {
    setAuthBusy(true);
    setAccountError("");
    try {
      const current = await updateIdentityPreferences(visibility);
      applyServerIdentity(current);
      return true;
    } catch (error) {
      setAccountError(
        error instanceof ApiError ? error.message : ui.auth.connectionError,
      );
      return false;
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
    <div className={route === "/" ? "figfox-site" : "figfox-site product-site"} ref={site} lang={language === "zh" ? "zh-CN" : "en"}>
      {route === "/" && <FigFoxCursor site={site} route={route} />}
      <a
        className="skip-link"
        href={route === "/editor" ? "#editor-canvas" : "#main-content"}
      >
        {ui.nav.skip}
      </a>
      {route !== "/editor" && route !== "/workspace" && route !== "/" && route !== "/login" && (
        <ProductHeader
          language={language}
          route={route}
          accountName={identity === "user" ? currentIdentity?.display_name || ui.nav.account : null}
          hrefFor={routeHref}
          onNavigate={navigate}
          onLanguageChange={() => setLanguage(value => value === "zh" ? "en" : "zh")}
          onAccount={() => identity === "user" ? void openAccount() : openLogin()}
        />
      )}

      <div id="main-content">
        {route === "/" && (
          <FigFoxDemoPage
            language={language}
            onLanguageChange={() => setLanguage((value) => value === "zh" ? "en" : "zh")}
            onNavigate={navigate}
            hrefFor={routeHref}
          />
        )}
        {route === "/examples" && (
          <ExamplesPage ui={ui} language={language} onNavigate={navigate} />
        )}
        {(route === "/workspace" || route === "/login" && authReturnRoute === "/workspace" || route === "/editor" && workspaceVisited) && <div hidden={route !== "/workspace"} inert={route !== "/workspace" ? true : undefined}>
          <WorkspacePage
            active={route === "/workspace"}
            ui={ui}
            language={language}
            identity={identity}
            currentIdentity={currentIdentity}
            credits={credits}
            requestAuth={requestAuth}
            onOpenEditor={() => navigate("/editor")}
            onNavigate={navigate}
            onLanguageChange={() => setLanguage(value => value === "zh" ? "en" : "zh")}
            onViewTransition={(update, animate) => transitionPage(animate === "task" ? "workspace-task" : animate === "layout" ? "workspace-layout" : animate ? "workspace" : null, update)}
            onAccount={() => {
              if (identity === "user") {
                void openAccount();
              } else {
                openLogin();
              }
            }}
          />
        </div>}
        {route === "/login" && <ProductLoginPage language={language} providers={providers} busy={authBusy} error={authError} onSelect={choice => void selectIdentity(choice)} onBack={() => { pendingAction.current = null; setAuthError(""); navigate(authReturnRoute); }} onLanguageChange={() => setLanguage(value => value === "zh" ? "en" : "zh")} hrefFor={routeHref} onNavigate={navigate} />}
        {route === "/editor" && (
          <ProductEditorRoute ui={ui} language={language} onLanguageChange={() => setLanguage(value => value === "zh" ? "en" : "zh")} onNavigate={navigate} hrefFor={routeHref} />
        )}
        {route === "/pricing" && (
          <ProductPricingPage language={language} onNavigate={navigate} hrefFor={routeHref} />
        )}
        {route === "/feedback" && !apiConfigured && <PublicFeedbackPage language={language} onNavigate={navigate} hrefFor={routeHref} />}
        {route === "/feedback" && apiConfigured && (
          <>
            <FeedbackPage language={language} onNavigate={navigate} />
            <Footer ui={ui} language={language} onNavigate={navigate} />
          </>
        )}
        {route === "/docs" && <ProductGuidePage language={language} onNavigate={navigate} hrefFor={routeHref} />}
        {(
          [ "/privacy", "/terms", "/content-policy"] as const
        ).includes(route as "/privacy" | "/terms" | "/content-policy") && (
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
      </div>

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
        onDefaultVisibilityChange={handleDefaultVisibilityChange}
        onLogout={() => void handleLogout()}
        onDeleteAccount={() => void handleDeleteAccount()}
      />
    </div>
  );
}
