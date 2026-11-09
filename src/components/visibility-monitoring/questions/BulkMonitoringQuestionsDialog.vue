<script setup lang="ts">
import type { MonitoringQuestion } from '../../../data/visibility-monitoring-data'
import type { DropdownSelectOption } from '../../ui/ce'
import { computed, ref, watch } from 'vue'
import { questionSetChanged } from '../../../mock/monitoring-baseline'
import { Button, DropdownSelect, Input, Modal } from '../../ui/ce'
import QuestionChangeConfirm from './QuestionChangeConfirm.vue'

type QuestionDraft = Omit<MonitoringQuestion, 'type'> & { type: string }
type QuestionField = 'type' | 'persona' | 'purchaseStage' | 'intent'

const props = defineProps<{
  questions: readonly MonitoringQuestion[]
  market: string
  questionCount: number
  enabled?: boolean
  persistQuestions?: (questions: MonitoringQuestion[]) => Promise<void>
  options: Record<QuestionField, readonly DropdownSelectOption[]>
}>()

const emit = defineEmits<{
  saved: [questions: MonitoringQuestion[]]
}>()

const open = defineModel<boolean>('open', { default: false })
const confirmationOpen = ref(false)
const saving = ref(false)
const error = ref('')
const drafts = ref<QuestionDraft[]>([])
const typeOptions = computed(() => [{ value: '', label: '请选择类型', disabled: true }, ...props.options.type])
const purchaseStageOptions = computed(() => [{ value: '', label: '请选择采购阶段', disabled: true }, ...props.options.purchaseStage])
const personaOptions = computed(() => [{ value: '', label: '请选择买家人设', disabled: true }, ...props.options.persona])
const intentOptions = computed(() => [{ value: '', label: '请选择意图', disabled: true }, ...props.options.intent])
const canSave = computed(() => drafts.value.every(question => [question.question, question.keyword, question.type, question.persona, question.stage, question.intent, question.concern].every(value => value.trim())))

const newBaseline = computed(() => questionSetChanged(props.questions, drafts.value, question => question.question))

watch(open, (isOpen) => {
  error.value = ''
  if (isOpen)
    drafts.value = props.questions.map(question => ({ ...question, platformResults: question.platformResults.map(result => ({ ...result, competitorsMentioned: [...result.competitorsMentioned], citedPages: [...result.citedPages] })), competitors: [...question.competitors], samplingBatches: question.samplingBatches.map(batch => ({ ...batch })) }))
})

function addDraft() {
  const nextIndex = [...props.questions, ...drafts.value].reduce((max, question) => Math.max(max, Number(question.id.match(/\d+$/)?.[0] ?? 0)), 0) + 1
  const template = props.questions[0]
  drafts.value.push({
    id: `Q${String(nextIndex).padStart(2, '0')}`,
    question: '',
    keyword: '',
    type: '',
    persona: '',
    stage: '',
    intent: '',
    concern: '',
    platformResults: template?.platformResults.map(result => ({ ...result, competitorsMentioned: [...result.competitorsMentioned], citedPages: [...result.citedPages] })) ?? [],
    competitors: [],
    officialSiteCited: false,
    rank: null,
    trend: 'flat',
    samplingBatches: [],
  })
}

function removeDraft(id: string) {
  drafts.value = drafts.value.filter(question => question.id !== id)
}

async function confirmSave() {
  if (!canSave.value || saving.value)
    return
  saving.value = true
  error.value = ''
  try {
    const questions = drafts.value.map(question => ({ ...question, type: question.type as MonitoringQuestion['type'] }))
    await props.persistQuestions?.(questions)
    emit('saved', questions)
    confirmationOpen.value = false
    open.value = false
  }
  catch (cause) {
    error.value = cause instanceof Error ? cause.message : '保存失败，请重试。'
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <Modal
    v-model:open="open"
    class="vm-bulk-question-modal"
    title="批量编辑监测问题"
    width="min(1900px, calc(100vw - 32px))"
    confirm-text="保存"
    cancel-text="取消"
    processing-text="保存中…"
    close-label="关闭批量编辑监测问题"
    :footer="undefined"
  >
    <div class="vm-bulk-question-editor">
      <div class="vm-bulk-question-editor__toolbar">
        <p>{{ market }} · {{ questionCount }} 条问题；所有修改统一保存</p>
        <Button class="vm-bulk-question-add" variant="outline" @click="addDraft">
          + 新增问题
        </Button>
      </div>
      <div class="vm-bulk-question-table-scroll" tabindex="0" aria-label="批量编辑监测问题列表，可横向滚动">
        <table>
          <thead>
            <tr>
              <th scope="col">
                序号
              </th>
              <th scope="col">
                监测问题
              </th>
              <th scope="col">
                关键词
              </th>
              <th scope="col">
                类型
              </th>
              <th scope="col">
                买家人设
              </th>
              <th scope="col">
                采购阶段
              </th>
              <th scope="col">
                意图
              </th>
              <th scope="col">
                主要关注问题
              </th>
              <th scope="col">
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="question in drafts" :key="question.id" class="vm-bulk-question-row">
              <th scope="row" class="vm-bulk-question-row__id">
                {{ question.id }}
              </th>
              <td><textarea v-model="question.question" class="ce-input vm-bulk-question-row__question" :aria-label="`${question.id} 监测问题`" rows="2" /></td>
              <td><Input v-model="question.keyword" :aria-label="`${question.id} 关键词`" /></td>
              <td><DropdownSelect v-model="question.type" :options="typeOptions" v-bind="{ ariaLabel: `${question.id} 类型` }" panel-width="100%" /></td>
              <td><DropdownSelect v-model="question.persona" :options="personaOptions" v-bind="{ ariaLabel: `${question.id} 买家人设` }" panel-width="100%" /></td>
              <td><DropdownSelect v-model="question.stage" :options="purchaseStageOptions" v-bind="{ ariaLabel: `${question.id} 采购阶段` }" panel-width="100%" /></td>
              <td><DropdownSelect v-model="question.intent" :options="intentOptions" v-bind="{ ariaLabel: `${question.id} 意图` }" panel-width="100%" /></td>
              <td><Input v-model="question.concern" :aria-label="`${question.id} 主要关注问题`" /></td>
              <td>
                <Button variant="text" tone="danger" @click="removeDraft(question.id)">
                  移除
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <template #footer>
      <Button variant="outline" @click="open = false">
        取消
      </Button>
      <Button class="vm-bulk-question-save" variant="primary" :disabled="!canSave" @click="error = ''; confirmationOpen = true">
        保存
      </Button>
    </template>
  </Modal>

  <QuestionChangeConfirm
    v-model:open="confirmationOpen"
    :enabled="enabled ?? true"
    :new-baseline="newBaseline"
    :pending="saving"
    :error="error"
    @confirm="confirmSave"
  />
</template>

<style scoped>
.vm-bulk-question-editor { display: grid; min-width: 0; gap: 12px; }
.vm-bulk-question-editor__toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.vm-bulk-question-editor__toolbar p { margin: 0; color: var(--text-muted); }
.vm-bulk-question-table-scroll { max-height: min(68vh, 900px); overflow: auto; border: 1px solid var(--border-default); border-radius: 10px; }
.vm-bulk-question-table-scroll table { width: 100%; min-width: 1720px; border-collapse: collapse; text-align: left; }
.vm-bulk-question-table-scroll th, .vm-bulk-question-table-scroll td { padding: 10px; border-bottom: 1px solid var(--border-divider); vertical-align: middle; }
.vm-bulk-question-table-scroll thead th { position: sticky; top: 0; z-index: 1; color: var(--text-secondary); background: var(--background-control-subtle); font-size: 12px; white-space: nowrap; }
.vm-bulk-question-row__id { width: 76px; color: var(--text-muted); font-size: var(--font-size-caption); line-height: var(--line-height-caption); white-space: nowrap; }
.vm-bulk-question-row textarea { min-width: 340px; min-height: 58px; resize: vertical; }
.vm-bulk-question-row td :deep(.ce-input), .vm-bulk-question-row td :deep(.ce-dropdown-select__trigger) { width: 100%; min-width: 130px; }
.vm-bulk-question-row td:nth-child(4) :deep(.ce-dropdown-select__trigger), .vm-bulk-question-row td:nth-child(7) :deep(.ce-dropdown-select__trigger) { min-width: 112px; }
.vm-bulk-question-row td:nth-child(5) :deep(.ce-dropdown-select__trigger) { min-width: 220px; }
.vm-bulk-question-row td:nth-child(6) :deep(.ce-dropdown-select__trigger) { min-width: 150px; }
.vm-bulk-question-row td:nth-child(8) :deep(.ce-input) { min-width: 220px; }
.vm-bulk-question-row td:last-child { text-align: center; }
@media (max-width: 760px) { .vm-bulk-question-editor__toolbar { align-items: flex-start; flex-direction: column; } }
</style>
