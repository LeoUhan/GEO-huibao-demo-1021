<script setup lang="ts">
import type { KnowledgeItem } from '../../../../types'
import type { BrandKnowledgeChangeImpact, BrandKnowledgeUpdateService, BrandKnowledgeUpdateSnapshot, MarketRecommendationState } from './types'
import { computed, ref, shallowRef, watch } from 'vue'
import KnowledgeEditorDialog from '../../../onboarding/knowledge/KnowledgeEditorDialog.vue'
import QuestionChangeConfirm from '../../questions/QuestionChangeConfirm.vue'
import BrandKnowledgeChangeConfirm from './BrandKnowledgeChangeConfirm.vue'
import MarketRecommendationListDialog from './MarketRecommendationListDialog.vue'

type FlowStep = 'editor' | 'confirm' | 'markets'

const props = withDefaults(defineProps<{
  open: boolean
  items: KnowledgeItem[]
  initialTab: string | undefined
  service: BrandKnowledgeUpdateService
  startAtMarketManager?: boolean
}>(), { startAtMarketManager: false })
const emit = defineEmits<{
  'update:open': [value: boolean]
  'knowledgeCommitted': [items: KnowledgeItem[], snapshot: BrandKnowledgeUpdateSnapshot]
  'processMarket': [marketId: string, market: MarketRecommendationState]
  'marketSelectionSaved': [snapshot: BrandKnowledgeUpdateSnapshot]
  'marketManagerClosed': []
}>()

const step = shallowRef<FlowStep>('editor')
const snapshot = shallowRef<BrandKnowledgeUpdateSnapshot | null>(null)
const impact = shallowRef<BrandKnowledgeChangeImpact | null>(null)
const draftItems = ref<KnowledgeItem[]>([])
const pendingAction = shallowRef<string | null>(null)
const error = shallowRef<string | null>(null)
const retryOperation = shallowRef<(() => Promise<void>) | null>(null)
const selectedIds = ref<string[]>([])
const removedIds = ref<string[]>([])
const activeMarketId = shallowRef('')
const activeTab = shallowRef<'all' | 'candidates' | 'current'>('candidates')
const questionConfirmationOpen = shallowRef(false)
const marketSelection = shallowRef<{ candidateIds: string[], removedIds: string[] } | null>(null)
const marketFeedback = shallowRef('')
const selectedIdsByMarket = ref<Record<string, string[]>>({})
const removedIdsByMarket = ref<Record<string, string[]>>({})

const editorOpen = computed({
  get: () => props.open && (step.value === 'editor' || step.value === 'confirm'),
  set: (value: boolean) => {
    if (!value)
      closeFlow()
  },
})
const confirmOpen = computed(() => props.open && step.value === 'confirm')
const marketsOpen = computed(() => props.open && step.value === 'markets')

function cloneItems(items: readonly KnowledgeItem[]): KnowledgeItem[] {
  return items.map(item => ({
    ...item,
    brand: item.brand ? { ...item.brand } : undefined,
    products: item.products?.map(product => ({ ...product })),
    marketLanguage: item.marketLanguage ? { ...item.marketLanguage } : undefined,
    competitors: item.competitors?.map(competitor => ({ ...competitor })),
  }))
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '操作失败，请稍后重试。'
}

async function loadSnapshot() {
  pendingAction.value = 'load'
  error.value = null
  try {
    snapshot.value = await props.service.getSnapshot()
    if (!activeMarketId.value || !snapshot.value.markets.some(market => market.id === activeMarketId.value)) {
      const firstMarket = snapshot.value.markets[0]
      if (firstMarket)
        activateMarket(firstMarket.id)
    }
    retryOperation.value = null
  }
  catch (cause) {
    error.value = errorMessage(cause)
    retryOperation.value = loadSnapshot
  }
  finally {
    pendingAction.value = null
  }
}

async function previewChange() {
  pendingAction.value = 'preview'
  error.value = null
  impact.value = null
  try {
    impact.value = await props.service.previewChange(cloneItems(draftItems.value))
    retryOperation.value = null
  }
  catch (cause) {
    error.value = errorMessage(cause)
    retryOperation.value = previewChange
  }
  finally {
    pendingAction.value = null
  }
}

async function handleEditorSaved(items: KnowledgeItem[]) {
  draftItems.value = cloneItems(items)
  step.value = 'confirm'
  await previewChange()
}

function returnToEditor() {
  if (pendingAction.value)
    return
  error.value = null
  impact.value = null
  step.value = 'editor'
}

async function confirmChange() {
  if (pendingAction.value || !impact.value?.quotaAvailable)
    return
  pendingAction.value = 'confirm'
  error.value = null
  try {
    const result = await props.service.confirmChange(cloneItems(draftItems.value))
    snapshot.value = result
    emit('knowledgeCommitted', cloneItems(draftItems.value), result)
    selectedIdsByMarket.value = {}
    removedIdsByMarket.value = {}
    const firstMarket = result.markets[0]
    if (firstMarket)
      activateMarket(firstMarket.id)
    step.value = 'markets'
  }
  catch (cause) {
    error.value = errorMessage(cause)
  }
  finally {
    pendingAction.value = null
  }
}

function processMarket(marketId: string) {
  if (pendingAction.value)
    return
  const market = snapshot.value?.markets.find(item => item.id === marketId)
  if (!market)
    return
  if (activeMarketId.value) {
    selectedIdsByMarket.value[activeMarketId.value] = [...selectedIds.value]
    removedIdsByMarket.value[activeMarketId.value] = [...removedIds.value]
  }
  activateMarket(marketId)
  marketFeedback.value = ''
  error.value = null
  retryOperation.value = null
  emit('processMarket', marketId, market)
}

function activateMarket(marketId: string) {
  const market = snapshot.value?.markets.find(item => item.id === marketId)
  if (!market)
    return
  activeMarketId.value = marketId
  selectedIds.value = [...(selectedIdsByMarket.value[marketId] ?? market.selectedCandidateIds ?? [])]
  removedIds.value = [...(removedIdsByMarket.value[marketId] ?? [])]
  activeTab.value = 'candidates'
}

function updateSelectedIds(ids: string[]) {
  selectedIds.value = [...ids]
  selectedIdsByMarket.value[activeMarketId.value] = [...ids]
}

function updateRemovedIds(ids: string[]) {
  removedIds.value = [...ids]
  removedIdsByMarket.value[activeMarketId.value] = [...ids]
}

function returnToMarketList() {
  if (pendingAction.value)
    return
  error.value = null
  step.value = 'markets'
}

async function saveMarketSelection(marketId: string, candidateIds: string[], removedQuestionIds: string[] = []) {
  if (pendingAction.value)
    return
  const save = async () => {
    pendingAction.value = `market:${marketId}`
    marketFeedback.value = ''
    error.value = null
    try {
      const result = await props.service.saveMarketSelection(marketId, [...candidateIds], [...removedQuestionIds])
      snapshot.value = result
      retryOperation.value = null
      emit('marketSelectionSaved', result)
      step.value = 'markets'
      selectedIds.value = []
      removedIds.value = []
      selectedIdsByMarket.value[marketId] = []
      removedIdsByMarket.value[marketId] = []
      questionConfirmationOpen.value = false
      const changed = candidateIds.length > 0 || removedQuestionIds.length > 0
      marketFeedback.value = changed
        ? (result.markets.find(item => item.id === marketId)?.enabled
            ? '已保存，下一轮监测将使用更新后的问题，当前轮次不受影响。'
            : '已保存，恢复监测后的第一轮将使用更新后的问题。')
        : '已忽略本市场的推荐问题，现有监测问题保持不变。'
    }
    catch (cause) {
      error.value = errorMessage(cause)
      retryOperation.value = save
      step.value = 'markets'
    }
    finally {
      pendingAction.value = null
    }
  }
  await save()
}

async function retry() {
  if (pendingAction.value)
    return
  await (retryOperation.value ?? loadSnapshot)()
}

function closeFlow() {
  if (!pendingAction.value) {
    if (step.value === 'markets')
      emit('marketManagerClosed')
    emit('update:open', false)
  }
}

const activeMarket = computed(() => snapshot.value?.markets.find(item => item.id === activeMarketId.value) ?? null)

function requestMarketSave(candidateIds: string[], removedIds: string[]) {
  const market = activeMarket.value
  if (!market || pendingAction.value)
    return
  error.value = null
  if (!candidateIds.length && !removedIds.length) {
    void saveMarketSelection(market.id, [], [])
    return
  }
  marketSelection.value = { candidateIds: [...candidateIds], removedIds: [...removedIds] }
  questionConfirmationOpen.value = true
}

function confirmMarketSave() {
  const market = activeMarket.value
  const selection = marketSelection.value
  if (market && selection)
    void saveMarketSelection(market.id, selection.candidateIds, selection.removedIds)
}

watch(() => props.open, (isOpen) => {
  if (!isOpen)
    return
  step.value = props.startAtMarketManager ? 'markets' : 'editor'
  draftItems.value = cloneItems(props.items)
  impact.value = null
  error.value = null
  retryOperation.value = null
  activeMarketId.value = ''
  selectedIds.value = []
  removedIds.value = []
  selectedIdsByMarket.value = {}
  removedIdsByMarket.value = {}
  activeTab.value = 'candidates'
  questionConfirmationOpen.value = false
  marketSelection.value = null
  marketFeedback.value = ''
  void loadSnapshot()
})

defineExpose({ saveMarketSelection, returnToMarketList })
</script>

<template>
  <div class="brand-update-flow">
    <KnowledgeEditorDialog
      v-model:open="editorOpen"
      :items="items"
      :initial-tab="initialTab"
      :close-on-save="false"
      read-only-market
      stage-recommendations
      @saved="handleEditorSaved"
      @update:open="value => !value && closeFlow()"
    />
    <BrandKnowledgeChangeConfirm
      :open="confirmOpen"
      :impact="impact"
      :pending="pendingAction !== null"
      :error="error"
      @back="returnToEditor"
      @confirm="confirmChange"
      @retry-preview="retry"
    />
    <MarketRecommendationListDialog
      :open="marketsOpen"
      :snapshot="snapshot"
      :active-market="activeMarket"
      :selected-ids="selectedIds"
      :removed-ids="removedIds"
      :active-tab="activeTab"
      :pending-action="pendingAction"
      :error="questionConfirmationOpen ? null : error"
      :feedback="marketFeedback"
      @process-market="processMarket"
      @update:selected-ids="updateSelectedIds"
      @update:removed-ids="updateRemovedIds"
      @update:active-tab="activeTab = $event"
      @save="requestMarketSave"
      @close="closeFlow"
      @retry="retry"
    />
    <QuestionChangeConfirm
      v-if="activeMarket"
      v-model:open="questionConfirmationOpen"
      :enabled="activeMarket.enabled"
      :new-baseline="true"
      :pending="Boolean(pendingAction)"
      :error="error ?? undefined"
      @confirm="confirmMarketSave"
    />
  </div>
</template>

<style scoped>
.brand-update-flow { display: contents; }
</style>
