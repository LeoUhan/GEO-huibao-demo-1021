<script setup lang="ts">
import type { BrandProductRecord } from '../api/geo-config'
import type { DropdownSelectOption } from '../components/ui/ce/dropdown-select/types'
import type { KnowledgeItem } from '../types'
import { computed, onBeforeUnmount, onMounted, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BuyerPersonaStep from '../components/onboarding/buyer-persona/BuyerPersonaStep.vue'
import KnowledgeEditorDialog from '../components/onboarding/knowledge/KnowledgeEditorDialog.vue'
import KnowledgeSummaryCard from '../components/onboarding/knowledge/KnowledgeSummaryCard.vue'
import MonitoringPlanStep from '../components/onboarding/monitoring-plan/MonitoringPlanStep.vue'
import MonitoringQuestionStep from '../components/onboarding/monitoring-questions/MonitoringQuestionStep.vue'
import BottomActionBar from '../components/onboarding/shared/BottomActionBar.vue'
import OnboardingHelp from '../components/onboarding/shared/OnboardingHelp.vue'
import OnboardingSteps from '../components/onboarding/shared/OnboardingSteps.vue'
import { Alert, Modal, Spinner, Tag, Toast } from '../components/ui/ce'
import { useFirstConfigWizard } from '../composables/use-first-config-wizard'
import { useOnboardingStore } from '../stores/onboarding'

const store = useOnboardingStore()
const router = useRouter()
const route = useRoute()
const wizard = useFirstConfigWizard()

const editVisible = shallowRef(false)
const currentEditItem = shallowRef<KnowledgeItem | null>(null)
const toastOpen = shallowRef(false)
const toastMessage = shallowRef('')
const toastVariant = shallowRef<'info' | 'success' | 'error'>('info')
const personaSaving = shallowRef(false)
const questionSelectionSaving = shallowRef(false)
let toastTimer: ReturnType<typeof setTimeout> | undefined

const currentMarket = computed(() => store.knowledgeItems.find(item => item.id === 'market')?.marketLanguage?.market ?? '')
const currentLanguage = computed(() => store.knowledgeItems.find(item => item.id === 'market')?.marketLanguage?.language ?? '')
const options = (key: string): DropdownSelectOption[] => wizard.dictionaryOptions.value[key] ?? []
const personaOptions = computed<DropdownSelectOption[]>(() => store.buyerPersonas.map(persona => ({ value: persona.id, label: persona.type })))
const entryCheck = computed(() => ['service', 'website', 'knowledge'].includes(String(route.query.entryCheck)) ? String(route.query.entryCheck) : null)
const entryCheckCopy = computed(() => {
  if (entryCheck.value === 'service')
    return { title: '请先开通 AI 建站服务', body: '请先开通独立站营销智能体建站服务，再开启 GEO。', action: '开通服务后，重新检查' }
  if (entryCheck.value === 'knowledge')
    return { title: '请先完成企业知识库同步', body: '请完善企业知识库或重新同步，确认内容可读取后再开启 GEO。', action: '完成后，重新检查' }
  return { title: '请先完成网站建设', body: '请先完成网站建设并绑定可用域名，再开启 GEO。', action: '完成建站并绑定域名后，重新检查' }
})

onMounted(() => void loadWizard())

async function loadWizard() {
  try {
    await wizard.load()
    if (route.query.preview === '1')
      store.currentStep = 0
  }
  catch {
    showToast(wizard.error.value ? `新人引导加载失败：${wizard.error.value}` : '新人引导加载失败', 'error')
  }
}

function advanceEntryCheck() {
  const nextState = entryCheck.value === 'service' ? 'website' : entryCheck.value === 'website' ? 'knowledge' : undefined
  void router.replace({ name: 'onboarding', query: { ...route.query, entryCheck: nextState } })
}

function openEditor(item: KnowledgeItem) {
  currentEditItem.value = item
  editVisible.value = true
}

function handleEditorSaved(items: KnowledgeItem[]) {
  store.updateKnowledgeItems(items)
  editVisible.value = false
  showToast('品牌知识已保存到服务器', 'success')
}

function handleProductAccepted(product: BrandProductRecord) {
  wizard.registerAcceptedProduct(product)
}

function handleCompetitorAccepted(competitor: import('../api/geo-config').CompetitorRecord) {
  wizard.registerAcceptedCompetitor(competitor)
}

function handleProductSaved(draft: import('../types').ProductKnowledgeDraft, record: BrandProductRecord) {
  wizard.syncSavedProduct(record)
  const items = store.knowledgeItems.map((item) => {
    if (item.id !== 'product')
      return item
    const products = item.products ?? []
    const exists = products.some(product => product.id === String(record.id))
    return { ...item, products: exists ? products.map(product => product.id === String(record.id) ? draft : product) : [...products, draft] }
  })
  store.updateKnowledgeItems(items)
}

function handleCompetitorSaved(draft: import('../types').CompetitorKnowledgeDraft, record: import('../api/geo-config').CompetitorRecord) {
  wizard.syncSavedCompetitor(record)
  const items = store.knowledgeItems.map((item) => {
    if (item.id !== 'competitor')
      return item
    const competitors = item.competitors ?? []
    const exists = competitors.some(competitor => competitor.id === String(record.id))
    return { ...item, competitors: exists ? competitors.map(competitor => competitor.id === String(record.id) ? draft : competitor) : [...competitors, draft] }
  })
  store.updateKnowledgeItems(items)
}

async function addCustomQuestion(question: import('../components/onboarding/monitoring-questions/monitoring-question-data').MonitoringQuestion) {
  store.addCustomMonitoringQuestion(question)
  try {
    await updateQuestionSelection([...store.selectedMonitoringQuestionIds, question.id])
  }
  catch {
    showToast(wizard.error.value || '问题已创建，但更新选择失败，请重试。', 'error')
  }
}

async function updateQuestionSelection(ids: string[]) {
  if (questionSelectionSaving.value)
    return
  questionSelectionSaving.value = true
  try {
    await wizard.saveQuestionSelection(ids)
  }
  catch (cause) {
    wizard.error.value = cause instanceof Error ? cause.message : '更新监测问题失败'
    throw cause
  }
  finally {
    questionSelectionSaving.value = false
  }
}

async function savePersonasImmediately(personas: import('../types').BuyerPersona[]) {
  personaSaving.value = true
  try {
    return await wizard.savePersonasImmediately(personas)
  }
  finally {
    personaSaving.value = false
  }
}

async function removePersonaImmediately(id: string) {
  if (store.buyerPersonas.length <= 1) {
    showToast('至少保留一套买家人设。', 'error')
    return
  }
  if (personaSaving.value)
    return
  personaSaving.value = true
  try {
    const saved = await wizard.savePersonasImmediately(store.buyerPersonas.filter(persona => persona.id !== id))
    store.updateBuyerPersonas(saved)
  }
  catch (cause) {
    showToast(cause instanceof Error ? cause.message : '移除买家人设失败', 'error')
  }
  finally {
    personaSaving.value = false
  }
}

async function persistCustomQuestion(question: import('../components/onboarding/monitoring-questions/monitoring-question-data').MonitoringQuestion) {
  return wizard.addCustomQuestionImmediately(question)
}

async function persistEditedQuestion(question: import('../components/onboarding/monitoring-questions/monitoring-question-data').MonitoringQuestion) {
  return wizard.updateMonitoringQuestionImmediately(question)
}

async function goNext() {
  try {
    await wizard.saveCurrentStep(store.currentStep)
    if (store.goNext() === 'finished') {
      const returnTo = route.query.returnTo
      await router.push(typeof returnTo === 'string' && returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : { name: 'visibility-monitoring' })
      return
    }
    showToast('本步骤已保存', 'success')
  }
  catch {
    showToast(wizard.error.value || '保存失败，请检查信息后重试', 'error')
  }
}

function showToast(message: string, variant: 'info' | 'success' | 'error') {
  toastMessage.value = message
  toastVariant.value = variant
  toastOpen.value = true
  if (toastTimer)
    clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastOpen.value = false
  }, 2800)
}

function closeToast() {
  toastOpen.value = false
  if (toastTimer)
    clearTimeout(toastTimer)
}

onBeforeUnmount(() => {
  if (toastTimer)
    clearTimeout(toastTimer)
})
</script>

<template>
  <main v-if="wizard.loading.value" class="onboarding-page onboarding-page__status" role="status" aria-label="正在加载新人引导">
    <Spinner aria-hidden="true" />
  </main>
  <main v-else-if="!wizard.loaded.value" class="onboarding-page onboarding-page__status" aria-live="polite" />
  <main v-else class="onboarding-page">
    <div class="onboarding-page__inner">
      <template v-if="store.currentStep === 0">
        <header class="page-header">
          <div>
            <div class="page-header__title-row">
              <h1 class="page-header__title">
                确认品牌知识
              </h1>
              <OnboardingHelp label="品牌知识说明" message="请确认并完善品牌基础信息，这些信息将用于后续买家人设生成、监测问题生成与可见性监测。" />
            </div>
          </div>
        </header>

        <OnboardingSteps :current-step="store.currentStep" :steps="store.steps" />

        <Alert class="knowledge-notice" variant="neutral" icon-type="icon-wancheng-1">
          <template #title>
            已从 <span class="knowledge-notice__source">企业知识库</span> 同步品牌知识
          </template>
        </Alert>

        <section class="knowledge-panel" aria-labelledby="knowledge-panel-title">
          <div class="knowledge-panel__header">
            <div class="knowledge-card__title-row">
              <h2 id="knowledge-panel-title" class="knowledge-panel__title">
                品牌资料摘要
              </h2>
              <OnboardingHelp label="品牌资料摘要说明" message="来源：独立站超级智能体 · 与正式品牌知识共用同一份数据" />
            </div>
            <Tag class="knowledge-panel__status" tone="green" variant="soft" size="sm">
              已同步
            </Tag>
          </div>

          <div class="knowledge-grid">
            <KnowledgeSummaryCard
              v-for="item in store.knowledgeItems"
              :key="item.id"
              :item="item"
              @edit="openEditor"
            />
          </div>
        </section>
      </template>

      <BuyerPersonaStep
        v-else-if="store.currentStep === 1"
        :current-step="store.currentStep"
        :steps="store.steps"
        :personas="store.buyerPersonas"
        :market="currentMarket"
        :type-options="options('persona_type')"
        :stage-options="options('purchase_stage')"
        :persist-personas="savePersonasImmediately"
        :saving="personaSaving"
        @saved="store.updateBuyerPersonas"
        @remove-requested="removePersonaImmediately"
      />

      <MonitoringQuestionStep
        v-else-if="store.currentStep === 2"
        :current-step="store.currentStep"
        :steps="store.steps"
        :market="currentMarket"
        :language="currentLanguage"
        :selected-ids="store.selectedMonitoringQuestionIds"
        :custom-questions="store.customMonitoringQuestions"
        :candidate-questions="wizard.questionCandidates.value"
        :persona-options="personaOptions"
        :type-options="options('question_type')"
        :stage-options="options('purchase_stage')"
        :intent-options="options('intent_type')"
        :focus-options="options('focus_type')"
        :question-limit="wizard.questionLimit.value ?? undefined"
        :selection-saving="questionSelectionSaving"
        :persist-question="persistCustomQuestion"
        :persist-edited-question="persistEditedQuestion"
        @selection-changed="updateQuestionSelection"
        @custom-question-added="addCustomQuestion"
      />

      <MonitoringPlanStep
        v-else-if="store.currentStep === 3"
        :current-step="store.currentStep"
        :steps="store.steps"
        :frequency="wizard.planFrequency.value"
        :platforms="store.monitoringPlatforms"
        :platform-options="options('ai_platform')"
      />

      <section v-else class="knowledge-panel onboarding-next-step" aria-live="polite">
        <div class="knowledge-panel__header">
          <h1 class="knowledge-panel__title">
            {{ store.steps[store.currentStep] }}
          </h1>
        </div>
        <div class="knowledge-grid">
          <Alert variant="neutral" title="此步骤尚未配置">
            当前演示已完成品牌知识与买家人设配置，后续步骤将在下一阶段接入。
          </Alert>
        </div>
      </section>
    </div>

    <BottomActionBar
      :current-step="store.currentStep"
      :total-steps="store.steps.length"
      :current-label="store.steps[store.currentStep]"
      :show-previous="store.currentStep > 0"
      :next-text="store.currentStep === store.steps.length - 1 ? '开始首次监测' : undefined"
      :processing="wizard.saving.value"
      @previous="store.goPrevious"
      @next="goNext"
    />

    <Modal
      :open="!!entryCheck"
      title=""
      width="min(720px, calc(100vw - 32px))"
      confirm-text=""
      cancel-text=""
      processing-text=""
      close-label="完成 GEO 启动条件检查"
      :show-close="false"
      :show-cancel="false"
      :close-disabled="true"
      :footer="null"
      class="geo-entry-prompt"
    >
      <div class="geo-entry-prompt__content">
        <span class="geo-entry-prompt__icon" aria-hidden="true">↗</span>
        <h2>{{ entryCheckCopy.title }}</h2>
        <p>{{ entryCheckCopy.body }}</p>
        <button type="button" class="geo-entry-prompt__action" @click="advanceEntryCheck">
          {{ entryCheckCopy.action }}
        </button>
      </div>
    </Modal>

    <KnowledgeEditorDialog v-model:open="editVisible" :items="store.knowledgeItems" :initial-tab="currentEditItem?.id" footer-mode="brand-only" :competitor-count-limit="wizard.competitorCountLimit.value" :delete-product="wizard.deleteProduct" :delete-competitor="wizard.deleteCompetitor" read-only-market persist-products persist-competitors :persist-knowledge="wizard.saveKnowledgeItems" @saved="handleEditorSaved" @product-accepted="handleProductAccepted" @product-saved="handleProductSaved" @competitor-accepted="handleCompetitorAccepted" @competitor-saved="handleCompetitorSaved" />
  </main>

  <Toast
    :open="toastOpen"
    :message-id="toastMessage"
    close-label="关闭提示"
    :variant="toastVariant"
    @close="closeToast"
  >
    {{ toastMessage }}
  </Toast>
</template>

<style scoped>
.onboarding-page__status {
  display: grid;
  min-height: 100vh;
  padding: 0;
  place-items: center;
}

:global(.geo-entry-prompt) {
  --modal-backdrop: rgb(20 31 50 / 46%);
  --modal-backdrop-blur: 0px;
  --modal-shadow: 0 18px 54px rgb(15 23 42 / 22%);
}
:global(.geo-entry-prompt .ce-modal) { border-radius: 16px; }
:global(.geo-entry-prompt .ce-modal-header) { display: none; }
:global(.geo-entry-prompt .ce-modal-body) { padding: 30px 28px 34px; }
.geo-entry-prompt__content { display: flex; min-height: 220px; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
.geo-entry-prompt__icon { display: grid; width: 42px; height: 42px; margin-bottom: 12px; place-items: center; border-radius: 50%; background: var(--status-warning-background); color: var(--status-warning-foreground); font-size: 23px; font-weight: 700; }
.geo-entry-prompt__content h2 { margin: 0 0 6px; color: var(--text-primary); font-size: 20px; line-height: 28px; }
.geo-entry-prompt__content p { margin: 0; color: var(--text-secondary); font-size: 14px; line-height: 22px; }
.geo-entry-prompt__action { min-height: 40px; margin-top: 20px; padding: 0 18px; border: 0; border-radius: 8px; background: var(--action-accent); color: white; font: inherit; font-weight: 600; cursor: pointer; }
.geo-entry-prompt__action:hover { filter: brightness(.96); }
</style>
