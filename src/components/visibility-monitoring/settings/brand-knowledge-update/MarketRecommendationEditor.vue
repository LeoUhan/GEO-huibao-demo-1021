<script setup lang="ts">
import type { MarketRecommendationState } from './types'
import { computed } from 'vue'
import Button from '../../../ui/ce/button/Button.vue'

const props = withDefaults(defineProps<{ market: MarketRecommendationState, selectedIds: string[], removedIds?: string[], pending: boolean, error?: string | null, showReturnButton?: boolean }>(), { removedIds: () => [], error: null, showReturnButton: true })
const emit = defineEmits<{
  'update:selectedIds': [ids: string[]]
  'update:removedIds': [ids: string[]]
  'save': [ids: string[], removedIds: string[]]
  'returnToMarkets': []
}>()

const candidateIds = computed(() => new Set(props.market.candidates.map(candidate => candidate.id)))
const safeSelectedIds = computed(() => [...new Set(props.selectedIds)].filter(id => candidateIds.value.has(id)).slice(0, 10))
const selectedCount = computed(() => safeSelectedIds.value.length)
const activeTab = defineModel<'all' | 'candidates' | 'current'>('tab', { default: 'all' })
const safeRemovedIds = computed(() => props.removedIds.filter(id => props.market.existingQuestions.some(question => question.id === id)))
const canSave = computed(() => selectedCount.value > 0 || safeRemovedIds.value.length > 0)
const existingQuestionFields = [
  { key: 'keyword', label: '关键词' },
  { key: 'type', label: '类型' },
  { key: 'persona', label: '买家人设' },
  { key: 'stage', label: '采购阶段' },
  { key: 'intent', label: '意图' },
  { key: 'concern', label: '主要关注问题' },
] as const

function toggleCandidate(id: string, checked: boolean) {
  const current = safeSelectedIds.value
  if (checked) {
    if (current.length >= 10 || current.includes(id))
      return
    emit('update:selectedIds', [...current, id])
    return
  }
  emit('update:selectedIds', current.filter(selectedId => selectedId !== id))
}

function isDisabled(id: string) {
  return props.pending || (!safeSelectedIds.value.includes(id) && selectedCount.value >= 10)
}

function toggleRemoved(id: string, checked: boolean) {
  emit('update:removedIds', checked ? [...new Set([...safeRemovedIds.value, id])] : safeRemovedIds.value.filter(item => item !== id))
}

function saveSelection() {
  if (!props.pending)
    emit('save', safeSelectedIds.value, safeRemovedIds.value)
}
</script>

<template>
  <section class="recommendation-editor" :class="{ 'is-all': activeTab === 'all' }" aria-labelledby="recommendation-editor-title">
    <p v-if="error" class="recommendation-editor__error" role="alert">{{ error }}</p>
    <nav class="recommendation-editor__tabs" aria-label="问题分类">
      <button type="button" :aria-pressed="activeTab === 'all'" @click="activeTab = 'all'">全部问题 {{ (market.processed ? 0 : market.candidates.length) + market.existingQuestions.length }}</button>
      <button type="button" :aria-pressed="activeTab === 'candidates'" @click="activeTab = 'candidates'">AI 推荐候选 {{ market.processed ? 0 : market.candidates.length }}</button>
      <button type="button" :aria-pressed="activeTab === 'current'" @click="activeTab = 'current'">当前监测问题 {{ market.existingQuestions.length }}</button>
    </nav>
    <header v-if="!props.showReturnButton" class="recommendation-editor__market-heading">
      <div class="recommendation-editor__market-name">
        <h2>{{ market.name }}</h2>
        <span class="recommendation-editor__market-status" :class="market.enabled ? 'is-enabled' : 'is-paused'"><i aria-hidden="true" />{{ market.enabled ? '运行中' : '已暂停' }}</span>
      </div>
      <p>勾选 AI 推荐问题加入监测；可在当前监测问题中移除旧问题。</p>
    </header>
    <template v-if="activeTab !== 'current' && market.processed">
      <section class="recommendation-editor__processed" aria-live="polite">
        <div class="recommendation-editor__processed-check" aria-hidden="true">✓</div>
        <h3>该市场已处理</h3>
        <p v-if="(market.processedAddedCount ?? market.selectedCandidateIds.length) === 0 && (market.processedRemovedCount ?? 0) === 0">
          本次未加入 AI 推荐问题，现有 {{ market.existingQuestions.length }} 条监测问题保持不变。
        </p>
        <p v-else>
          本次加入 {{ market.processedAddedCount ?? market.selectedCandidateIds.length }} 条 AI 推荐问题，移除 {{ market.processedRemovedCount ?? 0 }} 条旧问题；当前共 {{ market.existingQuestions.length }} 条监测问题。
        </p>
        <Button variant="outline" @click="activeTab = 'current'">查看当前监测问题</Button>
        <span>可切换市场继续处理</span>
      </section>
    </template>
    <template v-else-if="activeTab !== 'current'">
    <section class="recommendation-editor__panel recommendation-editor__recommendations" aria-labelledby="recommendation-editor-title">
      <header class="recommendation-editor__header">
        <div class="recommendation-editor__heading">
          <h2 id="recommendation-editor-title">
            {{ market.name }} · AI 推荐问题
          </h2>
          <p>勾选 AI 推荐问题加入当前监测；最多选择 10 条。</p>
        </div>
        <Button v-if="props.showReturnButton" size="sm" variant="outline" aria-label="返回市场列表" :disabled="pending" @click="emit('returnToMarkets')">
          返回市场列表
        </Button>
      </header>

      <div v-if="activeTab === 'all'" class="recommendation-editor__section-head">
        <h3 id="candidate-title">
          AI 推荐问题
        </h3>
        <span class="recommendation-editor__count" aria-live="polite">
            已选择 {{ selectedCount }} / 10 条 · 共 {{ market.candidates.length }} 条候选
        </span>
      </div>

      <div v-if="market.candidates.length" class="recommendation-candidates">
        <label v-for="(candidate, index) in market.candidates" :key="candidate.id" class="candidate-question" :class="{ 'is-selected': safeSelectedIds.includes(candidate.id), 'is-disabled': isDisabled(candidate.id) }">
          <input
            type="checkbox"
            :value="candidate.id"
            :checked="safeSelectedIds.includes(candidate.id)"
            :disabled="isDisabled(candidate.id)"
            @change="toggleCandidate(candidate.id, ($event.target as HTMLInputElement).checked)"
          >
          <span class="candidate-question__body">
            <span class="candidate-question__meta">{{ market.name }} · AI 推荐 {{ String(index + 1).padStart(2, '0') }}</span>
            <span class="candidate-question__text">{{ candidate.question }}</span>
            <span class="candidate-question__details">
              <span><small>关键词</small>{{ candidate.keyword }}</span>
              <span><small>类型</small>{{ candidate.type }}</span>
              <span><small>买家人设</small>{{ candidate.persona }}</span>
              <span><small>采购阶段</small>{{ candidate.stage }}</span>
              <span><small>意图</small>{{ candidate.intent }}</span>
              <span><small>主要关注问题</small>{{ candidate.concern }}</span>
            </span>
          </span>
        </label>
      </div>
      <div v-else class="recommendation-editor__empty" role="status">
        当前没有新的推荐问题
      </div>
      <footer class="recommendation-editor__actions">
        <span>已选择 {{ selectedCount }} / 10 条加入监测</span>
        <div class="recommendation-editor__buttons">
          <Button variant="outline" size="sm" :disabled="pending" @click="emit('save', [], [])">忽略</Button>
        <Button class="is-primary" variant="primary" size="sm" :disabled="pending || !canSave" :loading="pending" @click="saveSelection">
          确认本市场选择
        </Button>
        </div>
      </footer>
    </section>
    </template>

    <section v-if="activeTab !== 'candidates'" class="recommendation-editor__panel recommendation-editor__existing" aria-labelledby="existing-questions-title">
      <div class="recommendation-editor__section-head">
        <div>
          <h3 id="existing-questions-title">
            当前监测问题
          </h3>
          <p>勾选需要从当前市场移除的问题。</p>
        </div>
        <span class="recommendation-editor__existing-count">{{ market.existingQuestions.length }} 条</span>
      </div>
      <div v-if="market.existingQuestions.length" class="existing-question-table" role="table" aria-label="当前监测问题列表">
        <div class="existing-question-table__header" role="row">
          <span role="columnheader">问题</span>
          <span v-for="field in existingQuestionFields" :key="field.key" role="columnheader">{{ field.label }}</span>
        </div>
        <ol class="existing-question-list" role="rowgroup">
          <li v-for="question in market.existingQuestions" :key="question.id" class="existing-question" role="row" :class="{ 'is-removing': safeRemovedIds.includes(question.id) }">
            <input type="checkbox" :checked="safeRemovedIds.includes(question.id)" :disabled="pending" :aria-label="`移除问题 ${question.id}`" @change="toggleRemoved(question.id, ($event.target as HTMLInputElement).checked)">
            <span class="existing-question__text" role="cell">
              <span class="existing-question__id">{{ question.id }}</span>
              {{ question.question }}
            </span>
            <span v-for="field in existingQuestionFields" :key="field.key" class="existing-question__field" role="cell">
              {{ question[field.key] }}
            </span>
          </li>
        </ol>
      </div>
      <p v-else class="recommendation-editor__empty">
        当前市场还没有监测问题。
      </p>
    </section>
    <footer v-if="activeTab === 'current'" class="recommendation-editor__actions"><span>待移除 {{ safeRemovedIds.length }} 条 · 确认后保留 {{ market.existingQuestions.length - safeRemovedIds.length }} 条</span><div class="recommendation-editor__buttons"><Button v-if="!market.processed" variant="outline" :disabled="pending" @click="emit('save', [], [])">忽略</Button><Button class="is-primary" variant="primary" :disabled="pending || !canSave" :loading="pending" @click="saveSelection">确认本市场选择</Button></div></footer>
  </section>
</template>

<style scoped>
.recommendation-editor {
  display: grid;
  gap: 14px;
  min-width: 0;
  color: var(--text-primary);
}
.recommendation-editor__tabs { display: flex; align-items: center; flex-wrap: wrap; gap: 7px; min-width: 0; padding-bottom: 10px; border-bottom: 1px solid var(--border-divider); }
.recommendation-editor__tabs button { display: inline-flex; align-items: center; gap: 6px; min-height: 34px; padding: 6px 10px; border: 1px solid transparent; border-radius: 8px; color: var(--text-secondary); background: var(--background-subtle); font: inherit; font-size: 12px; line-height: 1.35; cursor: pointer; }
.recommendation-editor__tabs button[aria-pressed="true"] { border-color: color-mix(in srgb, var(--action-accent) 15%, transparent); color: var(--action-accent); background: var(--action-subtle-background); font-weight: 650; }
.recommendation-editor__market-heading { display: grid; gap: 4px; min-width: 0; }
.recommendation-editor__market-name { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; min-width: 0; }
.recommendation-editor__market-name h2 { margin: 0; font-size: 14px; line-height: 1.4; font-weight: 650; }
.recommendation-editor__market-heading p { margin: 0; color: var(--text-secondary); font-size: 11px; line-height: 1.4; }
.recommendation-editor__market-status { display: inline-flex; align-items: center; gap: 5px; color: var(--text-secondary); font-size: 11px; }
.recommendation-editor__market-status i { width: 7px; height: 7px; border-radius: 50%; background: var(--text-muted); }
.recommendation-editor__market-status.is-enabled i { background: var(--status-success, #16845b); }
.recommendation-editor__market-status.is-paused i { background: var(--status-warning, #c17c16); }
.recommendation-editor__processed { display: grid; align-content: center; justify-items: center; gap: 12px; min-height: 300px; padding: 28px; border: 1px solid color-mix(in srgb, var(--status-success, #16845b) 28%, var(--border-default)); border-radius: 14px; background: color-mix(in srgb, var(--status-success, #16845b) 4%, var(--background-primary)); text-align: center; }
.recommendation-editor__processed-check { display: grid; place-items: center; width: 52px; height: 52px; border-radius: 50%; color: var(--status-success, #16845b); background: color-mix(in srgb, var(--status-success, #16845b) 13%, var(--background-primary)); font-size: 30px; font-weight: 700; }
.recommendation-editor__processed h3 { margin: 0; color: var(--text-primary); font-size: 22px; line-height: 1.35; }
.recommendation-editor__processed p { max-width: 620px; margin: 0; color: var(--text-secondary); font-size: 14px; line-height: 1.6; }
.recommendation-editor__processed > span { color: var(--text-muted); font-size: 12px; }

.recommendation-editor__panel {
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--border-default);
  border-radius: 12px;
  background: var(--background-primary);
}

.recommendation-editor__recommendations { background: var(--background-subtle); }

.recommendation-editor__header,
.recommendation-editor__section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.recommendation-editor__heading { min-width: 0; }
.recommendation-editor__heading h2 { margin: 0 0 3px; font-size: 15px; line-height: 1.4; font-weight: 650; overflow-wrap: anywhere; }
.recommendation-editor__heading p,
.recommendation-editor__section-head p { margin: 0; color: var(--text-secondary); font-size: 12px; line-height: 1.45; }

.recommendation-editor__section-head { margin: 12px 0 7px; }
.recommendation-editor__section-head h3 { margin: 0; font-size: var(--font-size-body); line-height: var(--line-height-body); font-weight: 600; }
.recommendation-editor__count,
.recommendation-editor__existing-count { flex: 0 0 auto; color: var(--text-secondary); font-size: 11px; font-weight: 600; }
.recommendation-editor__count { padding: 4px 8px; border-radius: 999px; background: var(--background-primary); }

.recommendation-candidates {
  display: grid;
  max-height: min(400px, 56vh);
  gap: 7px;
  min-width: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  padding-right: 3px;
}

.recommendation-candidates::-webkit-scrollbar { width: 7px; }
.recommendation-candidates::-webkit-scrollbar-thumb { border-radius: 999px; background: var(--border-default); }
.recommendation-candidates::-webkit-scrollbar-track { background: transparent; }
.candidate-question {
  display: grid;
  grid-template-columns: 16px minmax(0, 1fr);
  align-items: start;
  gap: 12px;
  min-width: 0;
  padding: 9px 10px;
  border: 1px solid var(--border-default);
  border-radius: 9px;
  background: var(--background-primary);
  cursor: pointer;
  transition: background-color 120ms ease;
}

.candidate-question:hover,
.candidate-question.is-selected { border-color: var(--action-accent); background: var(--action-subtle-background); }
.candidate-question.is-disabled { cursor: not-allowed; }
.candidate-question input { width: 16px; height: 16px; margin: 2px 0 0; accent-color: var(--action-accent); }
.candidate-question__body { display: grid; gap: 5px; min-width: 0; }
.candidate-question__meta { color: var(--text-muted); font-size: 11px; line-height: 1.35; }
.candidate-question__text,
.existing-question__text { min-width: 0; color: var(--text-primary); font-size: var(--font-size-body); line-height: var(--line-height-body); font-weight: 500; overflow-wrap: anywhere; word-break: normal; }
.candidate-question__details { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px 14px; padding-top: 1px; }
.candidate-question__details span { display: grid; min-width: 0; color: var(--text-secondary); font-size: 11px; line-height: 1.35; overflow-wrap: anywhere; }
.candidate-question__details small { color: var(--text-muted); font-size: 10px; }

.recommendation-editor__empty { margin: 0; padding: 16px 0; color: var(--text-muted); font-size: var(--font-size-body); line-height: var(--line-height-body); }
.recommendation-editor__error { margin: 0; padding: 9px 11px; border-radius: 8px; color: var(--text-danger, #b42318); background: var(--background-danger-subtle, #fff1f0); font-size: 12px; }
.recommendation-editor__existing { padding: 16px; }
.recommendation-editor__existing .recommendation-editor__section-head { margin: 0 0 10px; }
.existing-question-table { min-width: 0; overflow: hidden; border-radius: 9px; background: var(--background-subtle); }
.existing-question-table__header,
.existing-question { display: grid; grid-template-columns: minmax(220px, 2.5fr) repeat(6, minmax(78px, 1fr)); align-items: start; gap: 12px; }
.existing-question-table__header { padding: 9px 11px; color: var(--text-muted); background: color-mix(in srgb, var(--background-subtle) 78%, var(--text-primary) 3%); font-size: 11px; font-weight: 600; }
.existing-question-list { display: grid; gap: 1px; margin: 0; padding: 0; list-style: none; }
.existing-question { padding: 10px 11px; background: var(--background-primary); }
.existing-question__id { margin-right: 7px; color: var(--text-muted); font-size: 11px; white-space: nowrap; }
.existing-question__text,
.existing-question__field { color: var(--text-secondary); font-size: 12px; line-height: 1.5; overflow-wrap: anywhere; }
.existing-question__text { font-weight: 500; }
.recommendation-editor__actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 10px; }
.recommendation-editor__buttons { display: flex; align-items: center; gap: 8px; }
.recommendation-editor__actions span { min-width: 0; color: var(--text-muted); font-size: 11px; }

@media (max-width: 680px) {
  .recommendation-editor { gap: 14px; }
  .recommendation-editor__header { align-items: flex-start; }
  .recommendation-editor__heading h2 { font-size: 18px; }
  .recommendation-editor__panel { padding: 10px; }
  .candidate-question { gap: 9px; padding: 10px; }
  .candidate-question__details { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px 10px; }
  .existing-question-table { overflow-x: auto; }
  .existing-question-table__header,
  .existing-question { min-width: 850px; }
  .recommendation-editor__actions { align-items: flex-start; flex-direction: column; }
  .recommendation-editor__buttons { flex-wrap: wrap; margin-left: 0; }
}
</style>
