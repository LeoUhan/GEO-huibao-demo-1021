<script setup lang="ts">
import type { KnowledgeItem } from '../../../../types'
import type { BrandKnowledgeChangeImpact, BrandKnowledgeUpdateService, BrandKnowledgeUpdateSnapshot, MarketRecommendationState } from './types'
import { computed, ref, shallowRef, watch } from 'vue'
import KnowledgeEditorDialog from '../../../onboarding/knowledge/KnowledgeEditorDialog.vue'
import BrandKnowledgeChangeConfirm from './BrandKnowledgeChangeConfirm.vue'
import MarketRecommendationListDialog from './MarketRecommendationListDialog.vue'
import Toast from '../../../ui/ce/toast/Toast.vue'

type FlowStep = 'editor' | 'confirm' | 'markets'

const props = withDefaults(defineProps<{
  open: boolean
  items: KnowledgeItem[]
  initialTab: string | undefined
  service: BrandKnowledgeUpdateService
  persistProducts?: boolean
  persistCompetitors?: boolean
  deleteProduct?: (id: string) => Promise<void>
  deleteCompetitor?: (id: string) => Promise<void>
  startAtMarketManager?: boolean
}>(), { startAtMarketManager: false })
const emit = defineEmits<{
  'update:open': [value: boolean]
  'knowledgeCommitted': [items: KnowledgeItem[], snapshot: BrandKnowledgeUpdateSnapshot]
  'processMarket': [marketId: string, market: MarketRecommendationState]
  'marketSelectionSaved': [snapshot: BrandKnowledgeUpdateSnapshot]
  'enableAllMarkets': [snapshot: BrandKnowledgeUpdateSnapshot]
  'refreshKnowledge': []
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
const resumeAfterSave = shallowRef(false)
const toastMessage = shallowRef('')
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
      if (resumeAfterSave.value && result.markets.find(item => item.id === marketId)) {
        const enabled = await setMarketEnabled(marketId, true)
        snapshot.value = enabled
        emit('enableAllMarkets', enabled)
        toastMessage.value = `${activeMarket.value?.name ?? '该市场'}已开启`
        resumeAfterSave.value = false
      }
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

async function enableAllMarkets() {
  if (pendingAction.value)
    return
  const enable = async () => {
    pendingAction.value = 'enable-all'
    error.value = null
    try {
      const result = await props.service.enableAllMarkets()
      snapshot.value = result
      retryOperation.value = null
      emit('enableAllMarkets', result)
    }
    catch (cause) {
      error.value = errorMessage(cause)
      retryOperation.value = enable
    }
    finally {
      pendingAction.value = null
    }
  }
  await enable()
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

async function setMarketEnabled(marketId: string, enabled: boolean) {
  if (props.service.setMarketEnabled)
    return props.service.setMarketEnabled(marketId, enabled)
  const current = snapshot.value
  if (!current)
    throw new Error('市场状态尚未加载')
  return { ...current, markets: current.markets.map(market => market.id === marketId ? { ...market, enabled } : market) }
}

function saveActiveMarket(candidateIds: string[], removedQuestionIds: string[]) {
  const market = activeMarket.value
  if (!market)
    return
  if (market.enabled) {
    void pauseActiveMarket()
    return
  }
  void saveMarketSelection(market.id, candidateIds, removedQuestionIds)
}
async function pauseActiveMarket() {
  const market = activeMarket.value
  if (!market)
    return
  resumeAfterSave.value = true
  pendingAction.value = `market:${market.id}`
  error.value = null
  try {
    snapshot.value = await setMarketEnabled(market.id, false)
    toastMessage.value = `${market.name}已暂停`
  }
  catch (cause) {
    resumeAfterSave.value = false
    error.value = errorMessage(cause)
  }
  finally {
    pendingAction.value = null
  }
}

async function toggleActiveMarket() {
  const market = activeMarket.value
  if (!market || pendingAction.value)
    return
  pendingAction.value = `market:${market.id}`
  error.value = null
  try {
    snapshot.value = await setMarketEnabled(market.id, !market.enabled)
    toastMessage.value = `${market.name}${market.enabled ? '已暂停' : '已开启'}`
  }
  catch (cause) {
    error.value = errorMessage(cause)
  }
  finally {
    pendingAction.value = null
  }
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
      :persist-products="persistProducts"
      :persist-competitors="persistCompetitors"
      :delete-product="deleteProduct"
      :delete-competitor="deleteCompetitor"
      @saved="handleEditorSaved"
      @product-saved="emit('refreshKnowledge')"
      @product-accepted="emit('refreshKnowledge')"
      @competitor-saved="emit('refreshKnowledge')"
      @competitor-accepted="emit('refreshKnowledge')"
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
      :error="error"
      @process-market="processMarket"
      @update:selected-ids="updateSelectedIds"
      @update:removed-ids="updateRemovedIds"
      @update:active-tab="activeTab = $event"
      @save="saveActiveMarket"
      @pause-market="pauseActiveMarket"
      @toggle-market="toggleActiveMarket"
      @enable-all="enableAllMarkets"
      @close="closeFlow"
      @retry="retry"
    />
    <Toast :open="!!toastMessage" variant="success" :title="toastMessage" close-label="关闭状态提示" @close="toastMessage = ''" />
  </div>
</template>

<style scoped>
.brand-update-flow { display: contents; }
</style>
