<script setup lang="ts">
import type { BrandMetric, PageResult, PersonaMetric, PlatformMetric, QuestionHit, RoundDetail, RoundSummary, SourceDomainMetric, SourcePageMetric } from '../../../api/monitoring'
import type { VisibilityTab } from '../../../data/visibility-monitoring-data'
import { shallowRef } from 'vue'
import ResponseDetailsDrawer from './ResponseDetailsDrawer.vue'

defineProps<{
  activeTab: VisibilityTab
  round: RoundSummary
  detail: RoundDetail
  brandMetrics: readonly BrandMetric[]
  platformMetrics: readonly PlatformMetric[]
  personaMetrics: readonly PersonaMetric[]
  questionHits: readonly QuestionHit[]
  sourceDomains: PageResult<SourceDomainMetric>
  sourcePages: PageResult<SourcePageMetric>
}>()
const selectedQuestion = shallowRef<QuestionHit | null>(null)

const platformLabels: Record<string, string> = {
  'chatgpt': 'ChatGPT',
  'gemini': 'Gemini',
  'perplexity': 'Perplexity',
  'google_ai': 'Google AI',
  'google-ai': 'Google AI',
  'claude': 'Claude',
  'copilot': 'Copilot',
  'ai_mode': 'AI Mode',
  'ai-mode': 'AI Mode',
}

function value(value: number | string | null | undefined, suffix = '') {
  return value === null || value === undefined || value === '' ? '—' : `${value}${suffix}`
}

function platformList(raw: string | null | undefined) {
  const parsed = parseJson<unknown>(raw)
  if (!Array.isArray(parsed))
    return '—'
  return parsed.map((item) => {
    const id = typeof item === 'string' ? item : typeof item === 'object' && item !== null && 'platform' in item ? String(item.platform) : ''
    return platformLabels[id] ?? (id || '')
  }).filter(Boolean).join(' · ') || '—'
}

function platformHits(raw: string | null) {
  const parsed = parseJson<unknown>(raw)
  if (!Array.isArray(parsed))
    return '—'
  return parsed.map((item) => {
    if (!item || typeof item !== 'object' || !('platform' in item))
      return ''
    const record = item as { platform?: unknown, mentioned?: unknown }
    const id = String(record.platform ?? '')
    const label = platformLabels[id] ?? id
    return label ? `${label}：${record.mentioned === true ? '提及' : record.mentioned === false ? '未提及' : '—'}` : ''
  }).filter(Boolean).join(' / ') || '—'
}

function names(raw: string | null) {
  const parsed = parseJson<unknown>(raw)
  return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string').join('、') || '—' : '—'
}

function parseJson<T>(raw: string | null | undefined): T | null {
  if (!raw)
    return null
  try {
    return JSON.parse(raw) as T
  }
  catch {
    return null
  }
}

function statusLabel(status: number) {
  return ({ 0: '待执行', 1: '采集中', 2: '聚合中', 3: '已完成', 4: '失败' } as Record<number, string>)[status] ?? '未知状态'
}

function trendLabel(trend: number | null) {
  if (trend === 1)
    return '上升'
  if (trend === -1)
    return '下降'
  if (trend === 0)
    return '持平'
  return '—'
}
</script>

<template>
  <section class="vm-round-results" aria-label="服务端监测结果">
    <div v-if="activeTab === 'brand'" class="vm-result-stack">
      <section class="vm-result-card">
        <header class="vm-result-head">
          <div><h2>第 {{ round.roundNo }} 轮 · {{ round.monitorDate }}</h2><p>状态：{{ statusLabel(round.roundStatus) }}；以下指标均来自本轮后端快照。</p></div>
          <span class="vm-result-status">{{ statusLabel(round.roundStatus) }}</span>
        </header>
        <dl class="vm-round-metrics">
          <div><dt>计划采样</dt><dd>{{ value(detail.totalSample) }}</dd></div>
          <div><dt>已完成采集</dt><dd>{{ value(detail.finishedSampleCount) }}</dd></div>
          <div><dt>有效回答</dt><dd>{{ value(detail.validSample) }}</dd></div>
          <div><dt>已判定</dt><dd>{{ value(detail.judgedCount) }}</dd></div>
          <div><dt>有效返回率</dt><dd>{{ value(detail.validReturnRate, '%') }}</dd></div>
          <div><dt>95% 置信区间</dt><dd>{{ value(detail.ciValue, 'pp') }}</dd></div>
        </dl>
      </section>
      <section class="vm-result-card">
        <header class="vm-result-head">
          <div><h2>品牌指标</h2><p>本品与竞品的实际聚合结果。</p></div><span>{{ brandMetrics.length }} 条</span>
        </header>
        <div class="vm-result-table-scroll">
          <table>
            <thead><tr><th>品牌</th><th>有效回答</th><th>提及率</th><th>推荐率</th><th>官网引用率</th><th>SOV</th><th>平均位次</th><th>事实准确率</th></tr></thead><tbody>
              <tr v-for="brand in brandMetrics" :key="`${brand.brandType}-${brand.brandId}`">
                <th>{{ brand.brandName }}</th><td>{{ value(brand.validAnswerCount) }}</td><td>{{ value(brand.mentionRate, '%') }}</td><td>{{ value(brand.recommendRate, '%') }}</td><td>{{ value(brand.citationRate, '%') }}</td><td>{{ value(brand.sovRate, '%') }}</td><td>{{ value(brand.avgRank) }}</td><td>{{ value(brand.factAccuracyRate, '%') }}</td>
              </tr>
              <tr v-if="!brandMetrics.length">
                <td colspan="8" class="vm-result-empty">
                  本轮尚无已聚合的品牌指标。
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <section class="vm-result-card">
        <header class="vm-result-head">
          <div><h2>平台指标</h2><p>按实际平台回答与判定统计。</p></div><span>{{ platformMetrics.length }} 个平台</span>
        </header>
        <div class="vm-result-table-scroll">
          <table>
            <thead><tr><th>平台</th><th>模型版本</th><th>计划数</th><th>有效回答</th><th>提及率</th><th>官网引用率</th><th>较上轮</th></tr></thead><tbody>
              <tr v-for="platform in platformMetrics" :key="`${platform.platform}-${platform.modelVersion}`">
                <th>{{ platformLabels[platform.platform] ?? platform.platform }}</th><td>{{ value(platform.modelVersion) }}</td><td>{{ value(platform.sampleCount) }}</td><td>{{ value(platform.validAnswerCount) }}</td><td>{{ value(platform.mentionRate, '%') }}</td><td>{{ value(platform.citationRate, '%') }}</td><td>{{ value(platform.mentionVsPrevPp, 'pp') }}</td>
              </tr>
              <tr v-if="!platformMetrics.length">
                <td colspan="7" class="vm-result-empty">
                  本轮尚无已聚合的平台指标。
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <section class="vm-result-card">
        <header class="vm-result-head">
          <div><h2>人设与维度指标</h2><p>显示后端已聚合的人设、主题及意图维度数据。</p></div><span>{{ personaMetrics.length }} 条</span>
        </header>
        <div class="vm-result-table-scroll">
          <table>
            <thead><tr><th>人设</th><th>维度</th><th>维度值</th><th>有效回答</th><th>提及回答</th><th>提及率</th><th>等级</th></tr></thead><tbody>
              <tr v-for="(metric, index) in personaMetrics" :key="`${metric.personaId}-${metric.dimType}-${metric.dimValue}-${index}`">
                <th>{{ metric.personaName }}</th><td>{{ ['人设', '主题', '意图'][metric.dimType] ?? '—' }}</td><td>{{ value(metric.dimName || metric.dimValue) }}</td><td>{{ value(metric.validAnswerCount) }}</td><td>{{ value(metric.mentionedAnswerCount) }}</td><td>{{ value(metric.mentionRate, '%') }}</td><td>{{ value(metric.metricLevel) }}</td>
              </tr>
              <tr v-if="!personaMetrics.length">
                <td colspan="7" class="vm-result-empty">
                  本轮尚无已聚合的人设维度指标。
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <section v-else-if="activeTab === 'questions'" class="vm-result-card">
      <header class="vm-result-head">
        <div><h2>问答命中明细</h2><p>各平台是否提及、竞品命中、官网引用及位次均来自本轮问答命中快照。</p></div><span>{{ questionHits.length }} 个问题</span>
      </header>
      <div class="vm-result-table-scroll">
        <table>
          <thead><tr><th>监测问题</th><th>买家人设</th><th>主题</th><th>平台提及与位置</th><th>竞品提及</th><th>引用官网</th><th>当前位置</th><th>趋势</th><th>采集回答</th></tr></thead><tbody>
            <tr v-for="hit in questionHits" :key="hit.questionId">
              <th>{{ hit.questionContent }}</th><td>{{ value(hit.personaName) }}</td><td>{{ value(hit.themeName) }}</td><td>{{ platformHits(hit.platformHits) }}</td><td>{{ hit.isCompetitorMentioned === null ? '—' : hit.isCompetitorMentioned ? names(hit.competitorNames) : '否' }}</td><td>{{ hit.isOfficialCited === null ? '—' : hit.isOfficialCited === 1 ? '是' : '否' }}</td><td>{{ hit.brandRank === null ? '—' : `第 ${hit.brandRank} 位 / ${value(hit.rankTotal)}` }}</td><td>{{ trendLabel(hit.trend) }}</td><td>
                <button class="vm-response-open" type="button" @click="selectedQuestion = hit">
                  查看回答
                </button>
              </td>
            </tr>
            <tr v-if="!questionHits.length">
              <td colspan="9" class="vm-result-empty">
                本轮尚无已聚合的问答命中数据。
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div v-else class="vm-result-stack">
      <section class="vm-result-card">
        <header class="vm-result-head">
          <div><h2>来源域名</h2><p>域名、引用平台和品牌/竞品命中取自本轮信源聚合。</p></div><span>{{ sourceDomains.total }} 个域名</span>
        </header>
        <div class="vm-result-table-scroll">
          <table>
            <thead><tr><th>来源域名</th><th>命中问题数</th><th>引用次数</th><th>引用平台</th><th>我方提及</th><th>竞品引用</th><th>竞品</th></tr></thead><tbody>
              <tr v-for="domain in sourceDomains.records" :key="domain.domain">
                <th>{{ domain.domain }}</th><td>{{ value(domain.hitQuestionCount) }}</td><td>{{ value(domain.citationCount) }}</td><td>{{ platformList(domain.platforms) }}</td><td>{{ domain.isOurMentioned === null ? '—' : domain.isOurMentioned === 1 ? '是' : '否' }}</td><td>{{ domain.isCompetitorCited === null ? '—' : domain.isCompetitorCited === 1 ? '是' : '否' }}</td><td>{{ names(domain.competitorNames) }}</td>
              </tr>
              <tr v-if="!sourceDomains.records.length">
                <td colspan="7" class="vm-result-empty">
                  本轮尚无信源域名数据。
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <section class="vm-result-card">
        <header class="vm-result-head">
          <div><h2>被引页面</h2><p>页面 URL、标题、摘录及引用次数取自本轮信源聚合。</p></div><span>{{ sourcePages.total }} 个页面</span>
        </header>
        <div class="vm-result-table-scroll">
          <table>
            <thead><tr><th>页面</th><th>来源域名</th><th>命中问题</th><th>引用次数</th><th>引用平台</th><th>归属</th><th>摘录</th></tr></thead><tbody>
              <tr v-for="(page, index) in sourcePages.records" :key="`${page.pageUrl}-${index}`">
                <th><a v-if="page.pageUrl" :href="page.pageUrl" target="_blank" rel="noreferrer">{{ page.pageTitle || page.pageUrl }}</a><span v-else>—</span></th><td>{{ value(page.domain) }}</td><td>{{ value(page.hitQuestionCount) }}</td><td>{{ value(page.citationCount) }}</td><td>{{ platformList(page.platforms) }}</td><td>{{ ['第三方', '本品', '竞品'][page.ownerBrandType] ?? '—' }}</td><td>{{ value(page.excerptText) }}</td>
              </tr>
              <tr v-if="!sourcePages.records.length">
                <td colspan="7" class="vm-result-empty">
                  本轮尚无被引页面数据。
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
    <ResponseDetailsDrawer v-if="selectedQuestion" :open="!!selectedQuestion" :round-id="round.id" :question-id="selectedQuestion.questionId" :question-text="selectedQuestion.questionContent" @close="selectedQuestion = null" />
  </section>
</template>

<style scoped>
.vm-result-stack { display: grid; gap: 16px; }
.vm-result-card { min-width: 0; padding: 20px; border: 1px solid var(--border-default); border-radius: 12px; background: var(--background-primary); }
.vm-result-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 14px; color: var(--text-secondary); }
.vm-result-head h2 { margin: 0; color: var(--text-primary); font-size: 15px; line-height: 22px; }
.vm-result-head p { margin: 4px 0 0; }
.vm-result-status { padding: 4px 10px; border-radius: 999px; color: var(--action-accent); background: var(--action-subtle-background); white-space: nowrap; }
.vm-round-metrics { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 10px; margin: 0; }
.vm-round-metrics > div { min-width: 0; padding: 12px; border-radius: 9px; background: var(--background-subtle); }
.vm-round-metrics dt { color: var(--text-secondary); font-size: 12px; }
.vm-round-metrics dd { margin: 6px 0 0; color: var(--text-primary); font-size: 18px; font-weight: 650; font-variant-numeric: tabular-nums; }
.vm-result-table-scroll { max-height: 520px; overflow: auto; border: 1px solid var(--border-default); border-radius: 9px; }
table { width: 100%; min-width: 940px; border-collapse: collapse; text-align: left; }
thead { position: sticky; top: 0; z-index: 1; color: var(--text-secondary); background: var(--background-subtle); }
th, td { padding: 11px 12px; border-bottom: 1px solid var(--border-default); vertical-align: top; }
th { font-weight: 600; }
tbody th { min-width: 170px; color: var(--text-primary); font-weight: 500; }
tbody tr:last-child th, tbody tr:last-child td { border-bottom: 0; }
.vm-result-empty { padding: 24px; color: var(--text-muted); text-align: center; }
a { color: var(--action-accent); overflow-wrap: anywhere; }
.vm-response-open { padding: 5px 9px; border: 1px solid var(--border-default); border-radius: 7px; color: var(--action-accent); background: var(--background-primary); font: inherit; white-space: nowrap; cursor: pointer; }
@media (max-width: 720px) { .vm-result-card { padding: 15px; } .vm-round-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); } .vm-result-head { flex-direction: column; } }
</style>
