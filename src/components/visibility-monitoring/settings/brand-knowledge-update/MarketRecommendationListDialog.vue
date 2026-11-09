<script setup lang="ts">
import type { BrandKnowledgeUpdateSnapshot, MarketRecommendationState } from './types'
import Button from '../../../ui/ce/button/Button.vue'
import Modal from '../../../ui/ce/modal/Modal.vue'
import Spinner from '../../../ui/ce/spinner/Spinner.vue'
import MarketRecommendationEditor from './MarketRecommendationEditor.vue'

const props = withDefaults(defineProps<{
  open: boolean
  snapshot?: BrandKnowledgeUpdateSnapshot | null
  activeMarket?: MarketRecommendationState | null
  selectedIds?: string[]
  removedIds?: string[]
  activeTab?: 'all' | 'candidates' | 'current'
  pendingAction?: string | null
  error?: string | null
  feedback?: string
}>(), {
  snapshot: null,
  activeMarket: null,
  selectedIds: () => [],
  removedIds: () => [],
  activeTab: 'candidates',
  pendingAction: null,
  error: null,
})

const emit = defineEmits<{
  processMarket: [marketId: string]
  close: []
  retry: []
  'update:selectedIds': [ids: string[]]
  'update:removedIds': [ids: string[]]
  'update:activeTab': [tab: 'all' | 'candidates' | 'current']
  save: [candidateIds: string[], removedIds: string[]]
}>()

const enabledCount = () => (props.snapshot?.markets ?? []).filter(market => market.enabled).length
function pendingCount(market: MarketRecommendationState): number {
  return Math.max(0, market.candidates.length - market.selectedCandidateIds.length)
}
</script>

<template>
  <Modal
    class="market-recommendation-list"
    :open="open"
    title="各市场监测问题"
    width="min(1240px, calc(100vw - 40px))"
    confirm-text=""
    cancel-text=""
    close-label="关闭市场问题处理"
    processing-text="正在保存…"
    :show-cancel="false"
    :close-disabled="Boolean(pendingAction)"
    @close="emit('close')"
  >
    <div class="market-manager">
      <aside class="market-manager__sidebar" aria-label="市场列表">
        <header class="market-manager__sidebar-head">
          <strong>已启用市场 {{ enabledCount() }}</strong>
          <span>{{ snapshot?.markets.filter(market => !market.processed).length ?? 0 }} 个待处理</span>
        </header>
        <div v-if="snapshot?.markets.length" class="market-manager__markets">
          <button
            v-for="market in snapshot.markets"
            :key="market.id"
            type="button"
            class="market-manager__market"
            :class="{ 'is-active': activeMarket?.id === market.id, 'is-processed': market.processed }"
            :aria-pressed="activeMarket?.id === market.id"
            :disabled="Boolean(pendingAction)"
            @click="emit('processMarket', market.id)"
          >
            <span class="market-manager__market-name">{{ market.name }}</span>
            <span class="market-manager__market-status" :class="market.enabled ? 'is-enabled' : 'is-paused'">
              <i aria-hidden="true" />{{ market.enabled ? '运行中' : '已暂停' }}
            </span>
            <small>{{ market.processed ? '✓ 已处理' : `${pendingCount(market)} 条待处理` }}</small>
          </button>
        </div>
        <p v-else-if="snapshot" class="market-manager__empty">当前没有需要处理的市场</p>
        <p v-else class="market-manager__loading" role="status"><Spinner variant="ring" aria-hidden="true" /></p>
      </aside>

      <main class="market-manager__content">
        <div v-if="error" class="market-manager__error" role="alert">
          <span>{{ error }}</span>
          <Button size="xs" variant="outline" aria-label="重试市场操作" @click="emit('retry')">重试</Button>
        </div>
        <p v-else-if="feedback" class="market-manager__feedback" role="status">{{ feedback }}</p>
        <template v-if="activeMarket">
          <MarketRecommendationEditor
            :market="activeMarket"
            :selected-ids="selectedIds"
            :removed-ids="removedIds"
            :pending="Boolean(pendingAction)"
            :error="null"
            :show-return-button="false"
            :tab="activeTab"
            @update:tab="emit('update:activeTab', $event)"
            @update:selected-ids="emit('update:selectedIds', $event)"
            @update:removed-ids="emit('update:removedIds', $event)"
            @save="(candidateIds, removedQuestionIds) => emit('save', candidateIds, removedQuestionIds)"
          />
        </template>
        <p v-else-if="snapshot" class="market-manager__placeholder">选择一个市场处理监测问题</p>
        <p v-else class="market-manager__loading" role="status"><Spinner variant="ring" aria-hidden="true" /></p>
      </main>
    </div>

    <template #footer>
      <div class="market-manager__footer">
        <Button variant="outline" :disabled="Boolean(pendingAction)" @click="emit('close')">关闭</Button>
        <span>未确认的问题修改不会应用。</span>
      </div>
    </template>
  </Modal>
</template>

<style scoped>
:global(dialog.ce-modal-root.market-recommendation-list) {
  --modal-inset: 0px;
  --modal-title-font-size: 18px;
  --modal-title-line-height: 26px;
  width: min(1240px, calc(100vw - 40px));
  max-height: min(820px, calc(100vh - 32px));
}
:global(dialog.ce-modal-root.market-recommendation-list .ce-modal) { display: grid; grid-template-rows: auto minmax(0, 1fr) auto; max-height: min(820px, calc(100vh - 32px)); overflow: hidden; }
:global(dialog.ce-modal-root.market-recommendation-list .ce-modal-header) { padding: 16px 22px; border-bottom: 1px solid var(--border-divider); }
:global(dialog.ce-modal-root.market-recommendation-list .ce-modal-body) { min-height: 0; padding: 0; overflow: hidden; }
:global(dialog.ce-modal-root.market-recommendation-list .ce-modal-footer) { padding: 0; border-top: 1px solid var(--border-divider); }
.market-manager { display: grid; grid-template-columns: 270px minmax(0, 1fr); min-height: 480px; height: min(650px, calc(100vh - 180px)); color: var(--text-primary); }
.market-manager__sidebar { display: grid; grid-template-rows: auto minmax(0, 1fr); min-height: 0; border-right: 1px solid var(--border-divider); background: var(--background-subtle); }
.market-manager__sidebar-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 18px; border-bottom: 1px solid var(--border-divider); font-size: 13px; }
.market-manager__sidebar-head span { color: var(--action-accent); font-weight: 600; white-space: nowrap; }
.market-manager__markets { display: grid; align-content: start; gap: 9px; min-height: 0; overflow: auto; padding: 14px; }
.market-manager__market { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 4px 8px; width: 100%; padding: 12px; border: 1px solid var(--border-default); border-radius: 10px; color: var(--text-primary); background: var(--background-primary); text-align: left; cursor: pointer; }
.market-manager__market.is-active { border-color: var(--action-accent); color: var(--action-accent); background: var(--action-subtle-background); box-shadow: 0 0 0 1px color-mix(in srgb, var(--action-accent) 14%, transparent); }
.market-manager__market.is-processed:not(.is-active) { background: color-mix(in srgb, var(--status-success, #16845b) 4%, var(--background-primary)); }
.market-manager__market:disabled { cursor: default; opacity: .7; }
.market-manager__market-name { min-width: 0; font-size: 13px; font-weight: 650; }
.market-manager__market small { grid-column: 1 / -1; color: var(--text-secondary); font-size: 11px; }
.market-manager__market-status { display: inline-flex; align-items: center; gap: 5px; color: var(--text-secondary); font-size: 11px; white-space: nowrap; }
.market-manager__market-status i { width: 7px; height: 7px; border-radius: 50%; background: var(--text-muted); }
.market-manager__market-status.is-enabled i { background: var(--status-success, #16845b); }
.market-manager__market-status.is-paused i { background: var(--status-warning, #c17c16); }
.market-manager__content { display: grid; grid-template-rows: auto minmax(0, 1fr); gap: 12px; min-width: 0; min-height: 0; overflow: hidden; padding: 16px 20px; }
.market-manager__content :deep(.recommendation-editor) { grid-template-rows: auto auto minmax(0, 1fr); gap: 10px; min-height: 0; overflow: hidden; }
.market-manager__content :deep(.recommendation-editor.is-all) { grid-template-rows: auto auto auto auto; overflow: auto; }
.market-manager__content :deep(.recommendation-editor__tabs) { margin: 0; }
.market-manager__content :deep(.recommendation-editor__panel) { padding: 0; border: 0; border-radius: 0; background: transparent; }
.market-manager__content :deep(.recommendation-editor__recommendations) { display: flex; flex-direction: column; gap: 0; min-height: 0; }
.market-manager__content :deep(.recommendation-editor__header) { display: none; }
.market-manager__content :deep(.recommendation-editor__section-head) { margin: 0 0 8px; }
.market-manager__content :deep(.recommendation-candidates) { max-height: none; min-height: 0; }
.market-manager__content :deep(.recommendation-editor__recommendations .recommendation-candidates) { flex: 1 1 auto; }
.market-manager__content :deep(.recommendation-editor__existing) { min-height: 0; overflow: auto; }
.market-manager__content :deep(.recommendation-editor__actions) { margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--border-divider); }
.market-manager__content :deep(.recommendation-editor__buttons) { margin-left: auto; }
.market-manager__content :deep(.recommendation-editor__empty) { align-self: center; justify-self: center; }
.market-manager__error { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 10px; border-radius: 8px; color: var(--text-danger, #b42318); background: var(--background-danger-subtle, #fff1f0); font-size: 12px; }
.market-manager__feedback { margin: 0; padding: 8px 10px; border-radius: 8px; color: var(--status-success-foreground); background: var(--status-success-background); }
.market-manager__loading, .market-manager__placeholder, .market-manager__empty { display: flex; align-items: center; justify-content: center; margin: 0; padding: 24px; color: var(--text-muted); font-size: 13px; }
.market-manager__loading { --spinner-color: var(--action-accent); }
.market-manager__footer { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 12px; width: 100%; padding: 12px 20px; background: var(--background-subtle); }
.market-manager__footer span { color: var(--text-secondary); font-size: 12px; }
@media (max-width: 760px) {
  :global(dialog.ce-modal-root.market-recommendation-list) { width: calc(100vw - 20px); }
  .market-manager { grid-template-columns: 170px minmax(0, 1fr); min-height: 420px; height: min(650px, calc(100vh - 150px)); }
  .market-manager__sidebar-head { align-items: flex-start; flex-direction: column; gap: 3px; padding: 12px; }
  .market-manager__markets { padding: 8px; }
  .market-manager__market { padding: 9px; }
  .market-manager__market-status { grid-column: 1 / -1; }
  .market-manager__content { padding: 12px; }
  .market-manager__footer { grid-template-columns: auto minmax(0, 1fr); padding: 10px; }
  .market-manager__footer span { display: none; }
  .market-manager__footer :deep(.ce-button:last-child) { grid-column: 2; }
}
</style>
