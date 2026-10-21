import type { MockState } from './state'
import { auditFindings, initialTasks, strategies } from '../data/geo-data'
import { initialMonthlyQuota, initialReports } from '../data/report-center-data'
import { visibilityMonitoringData } from '../data/visibility-monitoring-data'

const competitorSeed = [
  { id: 101, competitorName: 'Wix', domain: 'wix.com', aliasNames: 'Wix.com, Wix Website Builder', competitorDesc: '云端网站开发平台，提供网站搭建、托管和电商工具。', isCoreSov: 1, sourceType: 1, status: 1 },
  { id: 102, competitorName: 'Squarespace', domain: 'squarespace.com', aliasNames: 'Squarespace Inc.', competitorDesc: '集成网站设计、域名和托管的一体化发布平台。', isCoreSov: 1, sourceType: 1, status: 1 },
  { id: 103, competitorName: 'GoDaddy', domain: 'godaddy.com', aliasNames: 'GoDaddy Inc.', competitorDesc: '域名注册、建站与线上营销服务商。', isCoreSov: 1, sourceType: 1, status: 1 },
  { id: 104, competitorName: 'Webflow', domain: 'webflow.com', aliasNames: 'Webflow Inc.', competitorDesc: '可视化网站设计与内容管理平台。', isCoreSov: 1, sourceType: 1, status: 1 },
  { id: 105, competitorName: 'OMAX', domain: 'omax.com', aliasNames: 'OMAX Corporation', competitorDesc: '工业水刀切割系统制造商。', isCoreSov: 1, sourceType: 1, status: 1 },
]

const recommendationSeed = [
  { id: 201, recommendationId: 201, competitorName: 'Shopify', domain: 'shopify.com', aliasNames: 'Shopify Inc.', competitorDesc: '面向企业的电商基础设施平台。', isCoreSov: 0, sourceType: 2, status: 1, occurrenceCount: 17, questionIds: ['Q01', 'Q03'], platformNames: ['ChatGPT', 'Perplexity'], recommendationStatus: 'pending' as const },
  { id: 202, recommendationId: 202, competitorName: 'Flow X', domain: 'flowwaterjet.com', aliasNames: 'Flow International', competitorDesc: '高压水刀切割系统与自动化解决方案供应商。', isCoreSov: 0, sourceType: 2, status: 1, occurrenceCount: 12, questionIds: ['Q02', 'Q04'], platformNames: ['ChatGPT', 'Google AI'], recommendationStatus: 'pending' as const },
  { id: 203, recommendationId: 203, competitorName: 'STM Waterjet', domain: 'stm-waterjet.com', aliasNames: 'STM', competitorDesc: '工业水刀设备和切割方案供应商。', isCoreSov: 0, sourceType: 2, status: 1, occurrenceCount: 8, questionIds: ['Q05'], platformNames: ['Perplexity'], recommendationStatus: 'pending' as const },
  { id: 204, recommendationId: 204, competitorName: 'Webflow', domain: 'https://www.webflow.com/platform', aliasNames: 'Webflow Inc.', competitorDesc: '可视化网站设计与内容管理平台。', isCoreSov: 0, sourceType: 2, status: 1, occurrenceCount: 4, questionIds: ['Q06'], platformNames: ['ChatGPT'], recommendationStatus: 'pending' as const },
]

export function createSeedState(): MockState {
  return structuredClone({
    schemaVersion: 1,
    revision: 0,
    identity: { siteId: 'demo-site-apw', userId: 1001, userName: '演示用户' },
    config: {
      activeMarketId: 1,
      wizard: { entryStatus: 'FIRST_TIME', id: 1, currentStep: 1, maxReachedStep: 1 },
      markets: [{ id: 1, marketType: 1, status: 1, marketCountry: '德国', marketLanguage: '德语', subSiteName: 'APW Waterjet' }],
      brand: { brandName: 'APW Waterjet', industry: '工业水刀切割系统与解决方案', siteUrl: 'https://www.apwwaterjet.com', aliasNames: 'APW, APW Waterjet', positioning: '工业水刀切割系统与解决方案品牌', saved: 1 },
      products: [
        { id: 301, lineName: '五轴水刀切割系统', productName: 'APW 五轴水刀切割系统', usageScene: 'CFRP、航空复合材料及复杂曲面切割', sellingPoints: ['无热影响区', '五轴切割', '锥度补偿'], targetCustomers: ['航空制造商', '复合材料加工商'], sourceType: 1, isPrimary: 1 },
        { id: 302, lineName: '高压水刀系统', productName: 'APW 高压水刀系统', usageScene: '工业材料精密切割', sellingPoints: ['稳定高压泵', '精密切割'], targetCustomers: ['工业制造企业'], sourceType: 1, isPrimary: 0 },
      ],
      personas: [
        { id: 401, personaName: '复材加工技术主管', personaType: 'technical_lead', actualPosition: '复材加工技术主管', industry: '航空复合材料', companyScale: '中型企业', decisionRole: '影响者', purchaseTrigger: '复材切割质量与工艺升级', purchaseBudget: '—', purchaseCycle: '2–6 个月', infoChannels: '技术论坛 / Google 搜索 / 行业媒体', description: '负责复材加工工艺评估、质量与设备技术选型。', focusTopics: ['切割质量', '设备精度', '认证与服务'], purchaseStages: ['供应商评估'], sourceType: 1, status: 1 },
        { id: 402, personaName: '航空部件采购经理', personaType: 'procurement_lead', actualPosition: '航空部件采购经理', industry: '航空制造', companyScale: '大型企业', decisionRole: '决策者', purchaseTrigger: '设备采购与供应商评估', purchaseBudget: '—', purchaseCycle: '3–6 个月', infoChannels: '行业媒体 / Google 搜索 / 供应商推荐', description: '负责航空部件生产设备采购与供应商准入。', focusTopics: ['交付能力', '合规认证', '总拥有成本'], purchaseStages: ['供应商评估', '采购决策'], sourceType: 1, status: 1 },
        { id: 403, personaName: '精密加工车间主管', personaType: 'production_lead', actualPosition: '精密加工车间主管', industry: '精密制造', companyScale: '中型企业', decisionRole: '使用者', purchaseTrigger: '提高产线效率与减少停机', purchaseBudget: '—', purchaseCycle: '1–3 个月', infoChannels: '同行交流 / Google 搜索', description: '管理生产现场，关注设备效率、易用性和售后支持。', focusTopics: ['稳定性', '维护难度', '培训成本'], purchaseStages: ['方案寻找'], sourceType: 1, status: 1 },
      ],
      questions: visibilityMonitoringData.questions.map((question, index) => ({ id: 501 + index, questionContent: question.question, keyword: question.keyword, themeId: null, questionType: question.type, personaId: 401 + index % 3, purchaseStage: question.stage, intentType: question.intent, focusType: question.concern, isFirstSelected: 1, sourceType: 1, status: 1 })),
      platforms: visibilityMonitoringData.settings.platforms.map((platform, index) => ({ id: 601 + index, platform, modelVersion: null, enabled: 1, sort: index + 1 })),
      competitors: competitorSeed,
      themes: ['碳纤维切割', '五轴水刀选型', '水刀 vs 激光', '钛合金航空加工'].map((themeName, index) => ({ id: 701 + index, themeName, searchVolume: 1200 - index * 150, cpcCost: 3.2 + index, competition: 0.42, resultCount: 25000 - index * 1000, keywordIntent: 'commercial', status: 1 })),
      recommendations: recommendationSeed,
      dictionaries: {},
      nextId: 1000,
    },
    monitoring: {
      questions: visibilityMonitoringData.questions,
      settings: { ...visibilityMonitoringData.settings },
      isPaused: false,
      rounds: [
        { id: 'round-2026-10-16', date: '2026-10-16', status: 'completed' as const, responseCount: 1200 },
        { id: 'round-2026-10-09', date: '2026-10-09', status: 'completed' as const, responseCount: 1172 },
        { id: 'round-2026-10-02', date: '2026-10-02', status: 'completed' as const, responseCount: 1138 },
      ],
    },
    tasks: initialTasks,
    diagnosis: { findings: auditFindings, strategies },
    reports: { quota: initialMonthlyQuota, items: initialReports },
  } as MockState)
}
