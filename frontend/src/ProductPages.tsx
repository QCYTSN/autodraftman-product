import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle,
  Clock,
  FileText,
  LockKey,
  WarningCircle,
} from "@phosphor-icons/react";
import type { MouseEvent as ReactMouseEvent } from "react";

export type ProductLanguage = "zh" | "en";
export type ProductRoute =
  | "/"
  | "/examples"
  | "/workspace"
  | "/pricing"
  | "/docs"
  | "/privacy"
  | "/terms"
  | "/content-policy";

type InformationRoute = Exclude<
  ProductRoute,
  "/" | "/examples" | "/workspace" | "/pricing"
>;

type InformationSection = {
  title: string;
  paragraphs?: readonly string[];
  items?: readonly string[];
  note?: string;
};

type InformationPageCopy = {
  eyebrow: string;
  title: string;
  introduction: string;
  status: string;
  notice: string;
  sections: readonly InformationSection[];
  action?: {
    label: string;
    route: ProductRoute;
  };
};

const pageCopy: Record<
  ProductLanguage,
  Record<InformationRoute, InformationPageCopy>
> = {
  zh: {
    "/privacy": {
      eyebrow: "研究资料，由你掌握",
      title: "隐私政策",
      introduction:
        "这份政策说明 AutoDraftman 在内部测试阶段会处理哪些资料、为什么处理，以及你如何查看、公开或删除自己的内容。",
      status: "草案 0.1 · 更新于 2026 年 7 月 28 日",
      notice:
        "当前为内部测试版本。经营主体、正式联系地址、部署地区和实际生图服务商将在公开测试前补充并接受法律审核。",
      sections: [
        {
          title: "我们处理的资料",
          items: [
            "Google 或 GitHub 返回的账户标识、显示名称、头像和经验证的邮箱状态。",
            "你输入的提示词、上传的参考图、生成结果及文件格式、大小和创建时间。",
            "登录会话、额度变化、请求记录和保障账户安全所需的设备与网络信息。",
            "你主动提交的反馈、问题或删除请求。",
          ],
        },
        {
          title: "我们如何使用",
          items: [
            "提供登录、账户绑定、文件保存、额度记录和未来的图像生成服务。",
            "排查失败请求、阻止滥用，并以汇总数据了解产品是否稳定。",
            "执行你主动选择的公开展示、删除或账户注销操作。",
          ],
          note: "我们不会出售你的研究资料，也不会将私密提示词、参考图或结果用于训练 AutoDraftman 自有模型。",
        },
        {
          title: "生成服务与第三方",
          paragraphs: [
            "图像生成内核和最终服务商尚未确定。接入前，我们会在本政策中列出处理方、处理目的和数据传输范围。",
            "第三方只能在完成你请求的生成任务所必需的范围内处理数据，不得把私密资料用于其模型训练。",
          ],
        },
        {
          title: "默认私密与主动公开",
          items: [
            "输入、参考图和结果默认仅账户本人可见。",
            "公开展示必须由你主动开启；关闭公开或删除后，公开访问立即停止。",
            "请勿上传未经授权的论文图片、患者资料、受保密协议约束的数据或他人的个人信息。",
          ],
        },
        {
          title: "保留与删除",
          items: [
            "游客身份和游客内容保留 7 天。",
            "登录用户的内容保留至用户主动删除或注销账户。",
            "删除后内容立即不可见，主对象存储中的文件在 24 小时内清理。",
            "隔离备份中的残留最长保留 30 天，随备份轮换消失且不会恢复到在线产品。",
          ],
        },
        {
          title: "你的选择",
          items: [
            "查看账户、额度与已绑定的登录渠道。",
            "解绑登录渠道，但必须至少保留一种可用的登录方式。",
            "删除历史和图片，或注销整个账户。",
            "在公开测试前公布的联系入口中提出访问、更正或删除请求。",
          ],
        },
        {
          title: "安全、未成年人和变更",
          paragraphs: [
            "我们使用受限访问、HTTPS、私有数据库网络和短期文件访问地址保护资料，但任何网络服务都无法承诺绝对安全。",
            "本产品面向能够独立开展研究与创作的用户。未达到所在地数字服务同意年龄的用户应在监护人指导下使用。",
            "政策发生重要变化时，我们会更新版本和日期，并在产品内给出提示。",
          ],
        },
      ],
    },
    "/terms": {
      eyebrow: "内部测试使用约定",
      title: "用户协议",
      introduction:
        "本协议描述你在使用 AutoDraftman 时与产品团队之间的基本约定。当前版本不收费，也不承诺正式商业服务的可用性。",
      status: "草案 0.1 · 更新于 2026 年 7 月 28 日",
      notice:
        "公开收费前还需要补充签约主体、适用法律、退款和争议处理条款。当前文本仅用于内部测试和产品评审。",
      sections: [
        {
          title: "接受与适用范围",
          paragraphs: [
            "访问或使用内部测试版即表示你理解本协议、隐私政策和内容使用规则。",
            "如果你不同意其中任何部分，请不要提交研究资料或使用生成能力。",
          ],
        },
        {
          title: "账户与登录",
          items: [
            "游客可以浏览和输入；点击生成时可以登录或使用一次游客体验。",
            "Google、GitHub 以及未来的微信身份可以绑定到同一个 AutoDraftman 账户。",
            "你应保护自己的登录渠道，并对账户中的操作负责。",
            "不得出售、出租、批量注册或绕过游客额度与访问限制。",
          ],
        },
        {
          title: "你的输入与结果",
          paragraphs: [
            "你保留对自己合法拥有的输入资料的权利，并授权 AutoDraftman 仅为提供服务而存储和处理这些资料。",
            "在法律允许的范围内，你可以将生成结果用于合法的研究、教学、展示或商业工作；但我们不保证任何结果自动获得著作权、专利权或投稿资格。",
          ],
          note: "你必须核查科学准确性、标签、单位、引用和期刊披露要求。生成结果不能替代研究判断。",
        },
        {
          title: "额度与失败",
          items: [
            "额度是产品内部的使用单位，不是货币或可提现资产。",
            "没有产生图片的系统失败不消耗额度。",
            "用户主动重新生成会创建新的请求并重新计算额度。",
            "当前定价页仅为界面预览，不构成报价、订阅或自动续费承诺。",
          ],
        },
        {
          title: "测试服务",
          paragraphs: [
            "内部测试版可能中断、修改或重置数据。团队会尽力保护资料，但暂不提供服务等级、永久保存或无错误运行保证。",
            "重要研究文件必须由用户自行保留原始副本，不应把 AutoDraftman 当作唯一存档位置。",
          ],
        },
        {
          title: "暂停与终止",
          paragraphs: [
            "对危害他人、侵犯权利、攻击系统、规避额度或违反内容规则的使用，我们可以限制请求、移除内容或停用账户。",
            "用户可以在账户中心退出登录或注销账户。注销后的处理遵循隐私政策中的数据保留规则。",
          ],
        },
        {
          title: "责任边界与后续变更",
          paragraphs: [
            "你对输入来源、研究结论和结果的最终使用负责。AutoDraftman 不提供医疗、法律、投稿或研究伦理结论。",
            "商业化前，本协议会根据经营主体、服务地区、支付方式和生成服务商更新，并重新提示用户确认。",
          ],
        },
      ],
    },
    "/content-policy": {
      eyebrow: "清楚表达，也要负责任",
      title: "内容使用规则",
      introduction:
        "AutoDraftman 服务科研表达，但不会替用户判断资料是否合法、结论是否准确或图片是否适合发表。",
      status: "草案 0.1 · 更新于 2026 年 7 月 28 日",
      notice:
        "以下规则同时适用于提示词、参考图、生成结果、公开内容和对服务的自动化调用。",
      sections: [
        {
          title: "禁止内容",
          items: [
            "违法活动、暴力伤害、恐怖主义、欺诈、恶意软件或规避安全措施。",
            "儿童性剥削、非自愿私密影像、露骨色情内容或对真实人物的性化伪造。",
            "仇恨、骚扰、威胁、歧视或以真实个人为目标的诽谤和冒充。",
            "侵犯著作权、商标、隐私、肖像权、保密义务或研究数据使用协议的内容。",
            "伪造实验结果、篡改数据含义、制造虚假证据或故意误导读者的科研图。",
          ],
        },
        {
          title: "敏感研究资料",
          items: [
            "不要上传可识别患者、受试者、未公开专利、受出口管制或机构禁止上传的资料。",
            "涉及人类受试者、医疗或生物安全内容时，必须遵守伦理审批和机构数据政策。",
            "如无法确认参考图的授权范围，应先获得许可或使用自有材料。",
          ],
        },
        {
          title: "科研准确性",
          items: [
            "逐项检查标签、结构、比例、单位、箭头方向、统计含义和引用。",
            "不得把示意图包装为显微照片、临床影像、原始观测或真实实验记录。",
            "按照期刊、学校或资助机构的要求披露 AI 辅助，并保存必要的人工修改记录。",
          ],
        },
        {
          title: "公开展示",
          items: [
            "公开是主动选择，不代表 AutoDraftman 对内容准确性或权利状态的认可。",
            "公开内容不得包含个人信息、保密资料、未经授权的论文图或机构内部信息。",
            "用户删除或取消公开后，我们会立即停止公开访问。",
          ],
        },
        {
          title: "执行与申诉",
          paragraphs: [
            "我们可以阻止明显违规的请求、限制额度、撤下公开内容或暂停账户，并保留必要的安全记录。",
            "误判申诉和侵权通知入口会在公开测试前公布；内部测试阶段请直接联系项目组。",
          ],
        },
      ],
    },
    "/docs": {
      eyebrow: "AutoDraftman 使用指南",
      title: "从研究描述到第一张图",
      introduction:
        "这份短指南解释当前工作台的输入方式、账户规则和数据处理。生图内核尚未接入，因此示例只说明已经确定的产品流程。",
      status: "内部文档 0.1 · 随产品更新",
      notice:
        "当前公开网页是静态预览。真实登录、文件保存和额度将在公网后端部署后启用；真实生成将在内核接口确定后启用。",
      action: {
        label: "打开工作台",
        route: "/workspace",
      },
      sections: [
        {
          title: "选择输入方式",
          items: [
            "文字生成：只描述研究对象、关系、方向和视觉重点。",
            "文字 + 参考图：在文字之外上传一张用于说明构图或风格方向的图片。",
            "参考图用于校准，不应要求复制他人的具体作品、标识或受保护内容。",
          ],
        },
        {
          title: "写一个清楚的提示词",
          items: [
            "先写要表达的研究关系，再写构图和视觉风格。",
            "明确对象名称、连接方式、先后顺序、重点区域和需要出现的标签。",
            "避免一次塞入互相冲突的风格、过多对象或无法验证的结论。",
          ],
          note: "示例：绘制一个双分支编码器，左侧输入图像，中间分别输出均值和方差，右侧展示加权采样与最终结果。",
        },
        {
          title: "登录、游客与额度",
          items: [
            "浏览和填写内容不强制登录；点击生成时再选择登录或游客。",
            "游客获得一次体验额度，游客身份和内容保留 7 天。",
            "Google 和 GitHub 可以绑定到同一个账户；微信将在条件具备后接入。",
            "系统失败且没有生成图片时不扣额度，主动重新生成正常消耗额度。",
          ],
        },
        {
          title: "参考图和格式",
          items: [
            "当前产品约定接受 PNG、JPG/JPEG 和 WebP，单文件上限暂定 10MB。",
            "上传前请确认你拥有使用权，并移除患者信息、内部编号或其他敏感字段。",
            "最终输出尺寸、分辨率和更多格式要在生图内核测量后确定。",
          ],
        },
        {
          title: "隐私、公开与删除",
          items: [
            "所有内容默认私密，公开展示需要主动开启。",
            "删除后内容立即从账户和公开区域消失，文件在 24 小时内清理。",
            "登录用户内容保留到主动删除；游客内容 7 天后过期。",
            "不要把 AutoDraftman 当作唯一存档，重要文件应保留本地副本。",
          ],
        },
        {
          title: "使用生成结果",
          items: [
            "生成结果是草稿，需要人工检查科学关系、标签、单位和视觉歧义。",
            "投稿前检查期刊对 AI 辅助图像、披露、分辨率和文件格式的要求。",
            "不要把生成示意图描述成真实实验数据、显微照片或临床证据。",
          ],
        },
        {
          title: "常见问题",
          paragraphs: [
            "为什么登录按钮暂不可用？公开网页目前没有公网 API，只有部署后才能完成 OAuth 回调。",
            "为什么不能真的生成？团队尚在确定生图内核的输入、输出、耗时和失败语义。",
            "为什么价格不能购买？定价页当前用于讨论产品层级，支付会在商业主体和渠道明确后接入。",
          ],
        },
      ],
    },
  },
  en: {
    "/privacy": {
      eyebrow: "Research material under your control",
      title: "Privacy policy",
      introduction:
        "This policy explains what AutoDraftman handles during internal testing, why it is needed, and how you can view, publish, or delete your material.",
      status: "Draft 0.1 · Updated 28 July 2026",
      notice:
        "This is an internal-test draft. The operating entity, formal contact address, hosting regions, and actual generation providers will be added and legally reviewed before public testing.",
      sections: [
        {
          title: "Information we handle",
          items: [
            "Account identifiers, display name, avatar, and verified-email status returned by Google or GitHub.",
            "Prompts, reference images, results, and file metadata such as format, size, and creation time.",
            "Sessions, credit changes, request records, and limited device or network data needed for security.",
            "Feedback, support messages, and deletion requests you submit.",
          ],
        },
        {
          title: "How we use it",
          items: [
            "To provide sign-in, account linking, file storage, credit records, and future image generation.",
            "To diagnose failed requests, prevent abuse, and measure reliability with aggregated data.",
            "To carry out publishing, deletion, and account closure choices you make.",
          ],
          note: "We do not sell research material or use private prompts, references, or results to train AutoDraftman's own models.",
        },
        {
          title: "Generation providers",
          paragraphs: [
            "The generation kernel and final providers have not been selected. We will identify each processor, purpose, and data-transfer scope before enabling generation.",
            "A provider may process data only as needed to complete the requested task and may not train on private material.",
          ],
        },
        {
          title: "Private by default",
          items: [
            "Inputs, references, and results are visible only to the account owner by default.",
            "Publishing requires an explicit choice. Removing or deleting an item stops public access immediately.",
            "Do not upload unlicensed paper figures, patient data, confidential research, or another person's personal information.",
          ],
        },
        {
          title: "Retention and deletion",
          items: [
            "Guest identities and guest content are retained for seven days.",
            "Signed-in content remains until the user deletes it or closes the account.",
            "Deleted content becomes inaccessible immediately and is removed from primary object storage within 24 hours.",
            "Isolated backup remnants expire within 30 days and are not restored to the live product.",
          ],
        },
        {
          title: "Your choices",
          items: [
            "View the account, credits, and linked sign-in methods.",
            "Unlink a provider while keeping at least one usable sign-in method.",
            "Delete history and images or close the entire account.",
            "Use the contact channel published before public testing to request access, correction, or deletion.",
          ],
        },
        {
          title: "Security, age, and changes",
          paragraphs: [
            "We plan to use restricted access, HTTPS, private database networking, and short-lived file URLs, but no online service can promise absolute security.",
            "The product is for people able to conduct independent research or creative work. Users below their local age of digital consent should use it with a guardian.",
            "Material changes will update the version and date and will be announced in the product.",
          ],
        },
      ],
    },
    "/terms": {
      eyebrow: "Internal test agreement",
      title: "Terms of use",
      introduction:
        "These terms set the basic agreement between you and the AutoDraftman team during internal testing. The current edition is free and does not promise a commercial service level.",
      status: "Draft 0.1 · Updated 28 July 2026",
      notice:
        "The contracting entity, governing law, refunds, and dispute terms must be added before paid public use. This draft is for internal testing and product review.",
      sections: [
        {
          title: "Acceptance and scope",
          paragraphs: [
            "Using the internal edition means you understand these terms, the privacy policy, and the content rules.",
            "If you disagree, do not submit research material or use generation features.",
          ],
        },
        {
          title: "Accounts and sign-in",
          items: [
            "Guests may browse and type; generation asks them to sign in or use one guest trial.",
            "Google, GitHub, and a future WeChat identity may link to one AutoDraftman account.",
            "You must protect your sign-in providers and are responsible for activity in the account.",
            "Do not sell accounts, bulk-register, or bypass allowance and access controls.",
          ],
        },
        {
          title: "Inputs and outputs",
          paragraphs: [
            "You keep rights in material you lawfully own and grant AutoDraftman only the permission needed to store and process it for the service.",
            "Where permitted by law, you may use outputs for lawful research, teaching, presentations, or commercial work. We do not guarantee copyright, patent protection, or journal acceptance.",
          ],
          note: "You must verify scientific accuracy, labels, units, citations, and journal disclosure rules. A generated figure cannot replace research judgment.",
        },
        {
          title: "Credits and failures",
          items: [
            "Credits are internal usage units, not money or a withdrawable asset.",
            "A system failure that produces no image does not consume a credit.",
            "A user-requested regeneration is a new request and consumes credits normally.",
            "The pricing page is a preview and is not an offer, subscription, or renewal commitment.",
          ],
        },
        {
          title: "Test service",
          paragraphs: [
            "The internal edition may pause, change, or reset data. We work to protect material but do not yet offer an uptime, permanent-storage, or error-free guarantee.",
            "Keep original copies of important research files. AutoDraftman must not be the only archive.",
          ],
        },
        {
          title: "Suspension and termination",
          paragraphs: [
            "We may restrict requests, remove content, or disable accounts used to harm others, infringe rights, attack the service, evade limits, or violate the content rules.",
            "You may sign out or close the account from the account center. Account closure follows the privacy-policy retention schedule.",
          ],
        },
        {
          title: "Responsibility and changes",
          paragraphs: [
            "You remain responsible for source material, research conclusions, and final use. AutoDraftman does not provide medical, legal, publication, or ethics approval.",
            "Before commercial launch, these terms will change to reflect the operating entity, regions, payments, and generation providers, and users will be asked to review them again.",
          ],
        },
      ],
    },
    "/content-policy": {
      eyebrow: "Clear expression, responsible use",
      title: "Content rules",
      introduction:
        "AutoDraftman supports scientific communication. It cannot decide whether source material is lawful, conclusions are accurate, or an image is suitable for publication.",
      status: "Draft 0.1 · Updated 28 July 2026",
      notice:
        "These rules apply to prompts, reference images, outputs, public material, and automated use of the service.",
      sections: [
        {
          title: "Prohibited content",
          items: [
            "Illegal activity, violent harm, terrorism, fraud, malware, or bypassing safety controls.",
            "Child sexual exploitation, non-consensual intimate imagery, explicit sexual content, or sexualized impersonation.",
            "Hate, harassment, threats, discrimination, defamation, or impersonation targeting a real person.",
            "Material that violates copyright, trademarks, privacy, publicity rights, confidentiality, or research-data agreements.",
            "Fabricated experiments, altered data meaning, false evidence, or scientific figures intended to mislead.",
          ],
        },
        {
          title: "Sensitive research",
          items: [
            "Do not upload identifiable patient or participant data, unpublished patent material, export-controlled material, or data your institution forbids you to upload.",
            "Human-subject, medical, and biosafety work must follow ethics approval and institutional data rules.",
            "If reference-image permission is unclear, obtain permission or use your own material.",
          ],
        },
        {
          title: "Scientific accuracy",
          items: [
            "Check labels, structure, scale, units, arrow direction, statistical meaning, and citations.",
            "Do not present a schematic as a micrograph, clinical image, raw observation, or actual experimental record.",
            "Follow journal, university, and funder disclosure rules and retain records of meaningful human edits.",
          ],
        },
        {
          title: "Public material",
          items: [
            "Publishing is opt-in and does not mean AutoDraftman endorses accuracy or ownership.",
            "Public items must not contain personal data, confidential research, unlicensed paper figures, or internal institutional information.",
            "Deleting or unpublishing an item stops public access immediately.",
          ],
        },
        {
          title: "Enforcement and appeals",
          paragraphs: [
            "We may block clearly prohibited requests, restrict credits, remove public material, or suspend accounts while retaining necessary security records.",
            "Appeal and infringement-reporting channels will be published before public testing. During internal testing, contact the project team.",
          ],
        },
      ],
    },
    "/docs": {
      eyebrow: "AutoDraftman user guide",
      title: "From research description to first draft",
      introduction:
        "This short guide explains the workspace inputs, account rules, and data handling. The generation kernel is not connected, so examples describe only the agreed product flow.",
      status: "Internal guide 0.1 · Updated with the product",
      notice:
        "The public website is a static preview. Real sign-in, storage, and credits require the public API; generation requires a defined kernel contract.",
      action: {
        label: "Open workspace",
        route: "/workspace",
      },
      sections: [
        {
          title: "Choose an input mode",
          items: [
            "Text to image: describe the research objects, relationships, direction, and visual emphasis.",
            "Text plus reference: add one image to communicate composition or style direction.",
            "A reference calibrates the result; it must not be used to copy protected work, marks, or content.",
          ],
        },
        {
          title: "Write a clear prompt",
          items: [
            "State the research relationship first, then composition and visual style.",
            "Name objects, connections, sequence, focal regions, and required labels.",
            "Avoid conflicting styles, too many objects, or claims that cannot be verified.",
          ],
          note: "Example: Draw a two-branch encoder with an image input, separate mean and variance heads, weighted sampling, and one final output.",
        },
        {
          title: "Accounts, guests, and credits",
          items: [
            "Browsing and typing do not require sign-in. Generation asks for sign-in or a guest trial.",
            "A guest receives one trial credit, and guest identity and content expire after seven days.",
            "Google and GitHub may link to one account. WeChat will follow when its platform requirements are met.",
            "A system failure with no image does not use credits. A requested regeneration does.",
          ],
        },
        {
          title: "References and formats",
          items: [
            "The current product contract accepts PNG, JPG/JPEG, and WebP up to 10 MB.",
            "Confirm you have permission and remove patient details, internal identifiers, and sensitive fields.",
            "Final output sizes, resolution, and additional formats depend on kernel measurements.",
          ],
        },
        {
          title: "Privacy and deletion",
          items: [
            "Everything is private by default; publishing requires an explicit choice.",
            "Deletion removes account and public access immediately and schedules file removal within 24 hours.",
            "Signed-in content remains until deletion; guest content expires after seven days.",
            "Keep local copies of important work. AutoDraftman is not the only archive.",
          ],
        },
        {
          title: "Using a generated result",
          items: [
            "Treat every output as a draft and check scientific relationships, labels, units, and visual ambiguity.",
            "Before submission, review the journal's AI-assistance, disclosure, resolution, and format policies.",
            "Do not represent a generated schematic as experimental data, a micrograph, or clinical evidence.",
          ],
        },
        {
          title: "Common questions",
          paragraphs: [
            "Why is sign-in unavailable? The static website has no public API yet, so OAuth callbacks cannot complete.",
            "Why does generation not run? The team is still defining the kernel input, output, duration, and failure semantics.",
            "Why can I not purchase a plan? Pricing is for product discussion until the business entity and payment channels are confirmed.",
          ],
        },
      ],
    },
  },
};

export const footerCopy = {
  zh: {
    product: "产品",
    resources: "指南与规则",
    examples: "研发样例",
    workspace: "工作台",
    pricing: "定价",
    docs: "用户文档",
    privacy: "隐私政策",
    terms: "用户协议",
    content: "内容使用规则",
    contact: "联系",
    contactBody: "公开测试前公布正式支持邮箱",
    internal: "当前为内部测试版",
    copyright: "© 2026 AutoDraftman",
  },
  en: {
    product: "Product",
    resources: "Guide and rules",
    examples: "R&D examples",
    workspace: "Workspace",
    pricing: "Pricing",
    docs: "User guide",
    privacy: "Privacy",
    terms: "Terms",
    content: "Content rules",
    contact: "Contact",
    contactBody: "A support address will be published before public testing",
    internal: "Internal testing edition",
    copyright: "© 2026 AutoDraftman",
  },
} as const;

function InformationIcon({ route }: { route: InformationRoute }) {
  if (route === "/privacy") return <LockKey size={24} weight="duotone" />;
  if (route === "/terms") return <FileText size={24} weight="duotone" />;
  if (route === "/content-policy") {
    return <WarningCircle size={24} weight="duotone" />;
  }
  return <BookOpen size={24} weight="duotone" />;
}

export function ProductInformationPage({
  route,
  language,
  hrefFor,
  onNavigate,
}: {
  route: InformationRoute;
  language: ProductLanguage;
  hrefFor: (path: ProductRoute) => string;
  onNavigate: (path: ProductRoute) => void;
}) {
  const content = pageCopy[language][route];
  const backLabel = language === "zh" ? "返回首页" : "Back to home";
  const onInternalLink = (
    event: ReactMouseEvent<HTMLAnchorElement>,
    path: ProductRoute,
  ) => {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    onNavigate(path);
  };

  return (
    <main className="information-page page-enter" id="main-content">
      <section className="information-hero shell">
        <a
          className="information-back"
          href={hrefFor("/")}
          onClick={(event) => onInternalLink(event, "/")}
        >
          <ArrowLeft size={17} />
          {backLabel}
        </a>
        <div className="information-heading">
          <div className="information-emblem">
            <InformationIcon route={route} />
          </div>
          <p className="kicker">{content.eyebrow}</p>
          <h1>{content.title}</h1>
          <p>{content.introduction}</p>
        </div>
        <div className="information-status">
          <Clock size={17} />
          <span>{content.status}</span>
        </div>
      </section>

      <section className="information-body shell">
        <article className="information-document">
          <div className="information-notice">
            <WarningCircle size={20} weight="duotone" />
            <p>{content.notice}</p>
          </div>

          {route === "/privacy" && (
            <div className="retention-ruler" aria-label="Data retention summary">
              <div>
                <strong>7</strong>
                <span>{language === "zh" ? "天 · 游客内容" : "days · guest content"}</span>
              </div>
              <div>
                <strong>24</strong>
                <span>{language === "zh" ? "小时 · 文件清理" : "hours · file purge"}</span>
              </div>
              <div>
                <strong>30</strong>
                <span>{language === "zh" ? "天 · 备份轮换" : "days · backup rotation"}</span>
              </div>
            </div>
          )}

          <div className="information-sections">
            {content.sections.map((section) => (
              <section className="information-section" key={section.title}>
                <div>
                  <h2>{section.title}</h2>
                  {section.paragraphs?.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                  {section.items && (
                    <ul>
                      {section.items.map((item) => (
                        <li key={item}>
                          <CheckCircle size={17} weight="duotone" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {section.note && <blockquote>{section.note}</blockquote>}
                </div>
              </section>
            ))}
          </div>

          {content.action && (
            <a
              className="information-action button primary-button"
              href={hrefFor(content.action.route)}
              onClick={(event) =>
                onInternalLink(event, content.action?.route ?? "/workspace")
              }
            >
              {content.action.label}
              <ArrowRight size={18} />
            </a>
          )}
        </article>
      </section>
    </main>
  );
}
