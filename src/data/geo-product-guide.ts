export interface GuideStep { title: string, description: string, action: string }
export interface GuideModule { id: string, title: string, introduction: string, route: string, steps: GuideStep[] }

export const geoGuideModules: GuideModule[] = [
  {
    id: 'overview', title: '概览', route: 'overview',
    introduction: '概览先看本轮核心指标，再看不同 AI 平台上的实际表现，帮助你快速判断品牌是否被看见、被推荐和被引用。',
    steps: [
      { title: '核心指标概览：判断整体表现', description: '品牌提及率（SOA）看品牌在回答中出现的比例；推荐率看 AI 是否主动推荐；官网引用率看品牌官网是否成为回答信源；声量份额（SOV）看品牌在同类品牌中的相对声量。还可对比上次和首次监测的变化。', action: '结合当前市场、语言和监测轮次，先判断整体表现与变化方向。' },
      { title: '监测趋势：观察变化是否持续', description: '趋势图按监测轮次呈现核心指标变化，帮助区分单轮波动和持续上升或下降。', action: '将趋势与各平台表现结合，找到变化发生的时间和平台。' },
      { title: '各 AI 平台表现：看清真实差异', description: '按平台查看品牌提及率和官网引用率，并与整体水平对照。不同平台的结果可能不同，这里能看出品牌在哪些 AI 平台更容易被提到或引用。', action: '逐个平台比较表现；点击“查看完整监测数据”可继续核对具体回答。' },
      { title: 'Agent 工作队列：继续采取行动', description: '队列汇总等待确认或处理的事项，把监测发现衔接到竞品确认、策略审核和优化任务。', action: '从待办进入对应模块，查看证据并决定下一步。' },
    ],
  },
  {
    id: 'visibility-monitoring', title: '可见性监测', route: 'visibility-monitoring',
    introduction: '从品牌资料、买家需求到 AI 回答结果，了解各环节能做什么，并找到品牌被看见的机会。左侧导航可随时切换到其他工作模块。',
    steps: [
      { title: '品牌知识：让 AI 了解你', description: '整理品牌、产品和竞争对手信息，为监测提供真实业务背景。', action: '在左侧进入品牌知识，维护品牌资料。' },
      { title: '买家人设：代入目标客户', description: '按买家角色和采购阶段模拟客户视角，观察不同客户如何了解和比较产品。', action: '维护目标买家，结果可按人设比较。' },
      { title: '监测问题：还原真实需求', description: '围绕买家关心的问题观察 AI 如何回答、提及哪些品牌及其推荐依据。', action: '配置监测问题，持续追踪对应回答。' },
      { title: '采样执行：持续收集回答', description: '按计划在选定 AI 平台采集回答，形成可追踪、可比较的监测轮次。', action: '查看采样状态、平台和轮次进度。' },
      { title: '品牌提及分析：看整体表现', description: '通过趋势、平台、人设和竞品维度，了解品牌被提及与推荐的变化。', action: '切换图表维度，判断表现变化发生在哪里。' },
      { title: '问答命中明细：核对具体回答', description: '逐条查看监测问题在各平台的回答、品牌出现情况和官网引用证据。', action: '打开问题明细，确认品牌如何被提及或推荐。' },
      { title: '信源域名追踪：了解引用来源', description: '查看 AI 回答引用了哪些外部域名和页面，以及这些信源与品牌、竞品的关联。', action: '从域名进入引用页面，寻找可建设的内容和信任信号。' },
    ],
  },
  {
    id: 'report-center', title: '报告中心', route: 'report-center',
    introduction: '按报告查看监测结果和分析记录，集中阅读指定周期的观察结论，并保留讨论时使用的共同依据。',
    steps: [
      { title: '选择要阅读的报告', description: '报告对应特定的市场、周期与生成状态，阅读前先确认这些背景。', action: '在报告列表中找到目标报告，打开报告详情。' },
      { title: '结合口径阅读结论', description: '指标与分析依赖所选问题、平台和采样结果；单次变化需要结合数据范围理解。', action: '查看报告中的指标与分析，再到监测明细核对相关回答。' },
    ],
  },
  {
    id: 'diagnosis', title: '诊断与策略', route: 'diagnosis',
    introduction: '把监测证据转为可讨论的问题和候选策略，明确处理优先级，再将采纳的策略衔接到任务。',
    steps: [
      { title: '查看诊断证据', description: '诊断结果列出问题依据、处理方式与当前状态。官网技术直接处理项由 AI 建站流程处理；官网结构的建议项无需审核或执行；官网内容缺少核对资料时仅提醒补充知识。', action: '对待审核项点击“审核”，核对证据后决定处理、忽略或暂缓。' },
      { title: '判断候选策略', description: '候选策略来自认知 GAP 的回答证据与原因核查，覆盖内容、实体与信任、外部信源。审核时可以调整优先级；采纳后系统编排任务，忽略时保留原因。', action: '打开策略审核，确认建议与范围，并选择 P0—P3 优先级。' },
      { title: '识别当前审核责任', description: 'AI + 客户版由客户处理人工审核；AI + 运营 + 客户版按运营与客户分工流转。状态文字说明当前处理节点。', action: '根据产品版本与当前角色，处理对应的待审核事项。' },
    ],
  },
  {
    id: 'optimization', title: '优化中心', route: 'optimization',
    introduction: '把策略转化后的任务、待办和执行进展集中管理，从任务范围确认到内容交付保留连续的处理记录。',
    steps: [
      { title: '从待我处理开始', description: '任务概况展示类型分布，待我处理聚合当前角色需要参与的节点。任务列表可按类型与状态筛选。', action: '点击对应待办或筛选任务，打开需要处理的任务。' },
      { title: '确认 Brief 与执行范围', description: 'Brief 记录任务目标、资料和执行要求，为后续生成与审核提供依据。', action: '在任务中核对 Brief，补充资料后按当前权限确认或反馈。' },
      { title: '审核内容与查看执行', description: '官网内容与外部信源内容保留改写、质检和审核记录；技术直接处理任务展示 AI 建站处理进展。', action: '从任务详情进入对应工作区，处理审核或查看执行结果。' },
    ],
  },
  {
    id: 'task-detail', title: '任务详情与内容审核', route: 'optimization',
    introduction: '围绕一篇内容或一个修复任务，集中核对任务要求、当前版本与审核依据，保留每次处理的来龙去脉。',
    steps: [
      { title: '编辑与 AI 优化', description: '官网内容和外部信源内容均支持编辑；优化选中段落与重新生成文章共享当前角色、当前篇内容的 2 次 AI 调用机会。', action: '先检查剩余次数，再按需要选择段落优化或重新生成。' },
      { title: '结合质检审阅', description: '段落问题与七项自动质检提供检查线索，版本 / Diff 和审核记录呈现内容变化与处理历史。', action: '核对标记段落，检查版本差异后提交当前节点的审核决定。' },
      { title: '按任务类型继续流转', description: '不同产品版本与任务类型对应不同审核节点；外部信源成稿交付与外部平台发布是不同环节。', action: '依据任务当前状态执行可用操作，并查看交付或执行记录。' },
    ],
  },
  {
    id: 'operations-review', title: '运营复盘与 Agent 升级', route: 'operations-review',
    introduction: '回看执行记录与监测变化，整理策略和方法的使用情况，为下一轮的工作选择提供参考。',
    steps: [
      { title: '对照执行背景阅读变化', description: '任务执行与监测变化可以放在一起观察，但同期变化本身并不构成单项任务的效果归因。', action: '结合任务时间、内容变更和监测范围阅读复盘。' },
      { title: '审阅方法与经验记录', description: '查看页面提供的方法、经验和 Agent 升级相关记录，核对其适用条件与使用依据。', action: '从具体记录阅读详情，再判断后续工作是否适用。' },
    ],
  },
  {
    id: 'onboarding', title: '品牌知识与初始配置', route: 'onboarding',
    introduction: '整理品牌、产品、竞品与目标市场，为监测问题和后续任务建立可核对的业务背景。',
    steps: [
      { title: '核对品牌与产品事实', description: '品牌名称、官网、产品与竞品资料用于界定分析对象。资料的准确性与完整性影响后续内容的理解背景。', action: '检查已有信息，补充当前业务所需的事实资料。' },
      { title: '检查人设与监测设置', description: '目标市场、语言、人设、问题与平台配置共同界定本轮观察范围。', action: '按页面步骤完成必要配置；使用引导可随时跳过或再次打开。' },
    ],
  },
  {
    id: 'market-setup', title: '新增市场配置', route: 'market-setup',
    introduction: '为不同市场与语言建立独立的观察范围，分别组织对应的品牌背景、人设和监测问题。',
    steps: [
      { title: '确定市场与语言', description: '不同市场的采购语境与问题表达可能不同，市场配置用于区分后续观察的背景。', action: '按页面要求选择市场与语言，再检查对应配置。' },
      { title: '核对本市场的监测范围', description: '检查本市场的人设、问题和平台安排，避免混用其他市场的观察背景。', action: '完成页面所需配置后，切换到该市场查看监测信息。' },
    ],
  },
]

export function guideModuleForRoute(name: unknown) {
  const id = name === 'report-detail' ? 'report-center' : String(name)
  return geoGuideModules.find(module => module.id === id) ?? geoGuideModules[0]!
}
