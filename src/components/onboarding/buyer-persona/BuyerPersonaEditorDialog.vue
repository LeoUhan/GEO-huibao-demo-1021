<script setup lang="ts">
import type { BuyerPersona } from '../../../types'
import type { DropdownSelectOption } from '../../ui/ce'
import type { BuyerPersonaDraft } from './buyer-persona-validation'
import { computed, ref, watch } from 'vue'
import { Button, DropdownSelect, Modal } from '../../ui/ce'
import { buyerPersonaTypeOptions, maxBuyerPersonas, purchaseStageOptions } from './buyer-persona-options'
import { validateBuyerPersonas } from './buyer-persona-validation'

type PersistPersonas = (personas: BuyerPersona[]) => Promise<BuyerPersona[]>

const props = defineProps<{
  personas: BuyerPersona[]
  mode: 'add' | 'edit' | 'view'
  typeOptions?: readonly DropdownSelectOption[]
  stageOptions?: readonly DropdownSelectOption[]
  persistPersonas?: PersistPersonas
}>()

const emit = defineEmits<{
  saved: [personas: BuyerPersona[]]
}>()

const open = defineModel<boolean>('open', { default: false })
const drafts = ref<BuyerPersonaDraft[]>([])
const errors = ref<Record<string, string>>({})
const saving = ref(false)
const saveError = ref('')
const availableTypeOptions = computed(() => props.typeOptions ?? buyerPersonaTypeOptions)
const availableStageOptions = computed(() => props.stageOptions ?? purchaseStageOptions)
const isReadOnly = computed(() => props.mode === 'view')
const remainingTypes = computed(() => availableTypeOptions.value.filter(option => !drafts.value.some(item => item.type === option.value)))
const purchaseStageChoices = [
  { value: '', label: '请选择采购阶段', disabled: true },
  ...availableStageOptions.value,
]
function newDraft(): BuyerPersonaDraft {
  return {
    id: `buyer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: '',
    purchaseStage: '',
    commonQuestions: '',
    actualRole: '',
    industry: '',
    companySize: '',
    decisionRole: '',
    purchaseTrigger: '',
    purchaseBudget: '',
    purchaseCycle: '',
    discoveryChannel: '',
  }
}

function resetDraft() {
  drafts.value = props.personas.map(item => ({ ...item, commonQuestions: item.commonQuestions ?? '' }))
  if (props.mode === 'add' && drafts.value.length < maxBuyerPersonas)
    drafts.value.push(newDraft())
  if (!drafts.value.length)
    drafts.value.push(newDraft())
  errors.value = {}
}

function addDraft() {
  if (drafts.value.length >= maxBuyerPersonas)
    return
  drafts.value.push(newDraft())
  errors.value = {}
}

function removeDraft(id: string) {
  if (drafts.value.length <= 1)
    return
  drafts.value = drafts.value.filter(item => item.id !== id)
  errors.value = {}
}

function typeOptionsFor(id: string) {
  const selectedByOthers = new Set(drafts.value.filter(item => item.id !== id).map(item => item.type).filter(Boolean))
  return [
    { value: '', label: '请选择人设类型', disabled: true },
    ...availableTypeOptions.value.map(option => ({ ...option, disabled: selectedByOthers.has(option.value) })),
  ]
}

function optionLabel(options: readonly DropdownSelectOption[], value: string) {
  if (!value)
    return '—'
  return options.find(option => option.value === value)?.label ?? value
}

function clearError(key: string) {
  if (!errors.value[key])
    return
  const next = { ...errors.value }
  delete next[key]
  errors.value = next
}

async function save() {
  errors.value = validateBuyerPersonas(drafts.value)
  if (Object.keys(errors.value).length)
    return
  saveError.value = ''
  saving.value = true
  try {
    const next = drafts.value.map(item => ({ ...item }))
    const saved = props.persistPersonas ? await props.persistPersonas(next) : next
    // Close the dialog before notifying parents. Parent listeners may replace
    // the persona list (or change onboarding steps) as part of the save.
    open.value = false
    emit('saved', saved)
  }
  catch (cause) {
    saveError.value = cause instanceof Error ? cause.message : '保存人设失败，请重试。'
  }
  finally {
    saving.value = false
  }
}

watch([open, () => props.mode], ([isOpen]) => {
  if (isOpen)
    resetDraft()
})
</script>

<template>
  <Modal
    v-model:open="open"
    class="buyer-persona-modal"
    :title="isReadOnly ? '查看买家人设' : '维护买家人设'"
    width="min(920px, calc(100vw - 32px))"
    :footer="undefined"
    :confirm-text="isReadOnly ? '关闭' : '保存'"
    :cancel-text="isReadOnly ? '关闭' : '取消'"
    processing-text="保存中…"
    :close-label="isReadOnly ? '关闭买家人设查看' : '关闭买家人设编辑'"
    :loading="saving"
  >
    <div class="buyer-persona-editor">
      <p class="buyer-persona-editor__intro">
        {{ isReadOnly ? '当前市场已确认的全部买家人设，仅供查看。' : '一次添加多套人设。类型仅限固定的 6 类；每套只需选择人设类型和采购阶段。' }}
      </p>

      <div class="buyer-persona-editor__list">
        <article v-for="(persona, index) in drafts" :key="persona.id" class="buyer-persona-form">
          <header class="buyer-persona-form__header">
            <h3>{{ isReadOnly ? '买家人设' : `人设 ${index + 1}` }}</h3>
            <Button v-if="!isReadOnly && drafts.length > 1" variant="text" @click="removeDraft(persona.id)">
              移除
            </Button>
          </header>

          <div class="buyer-persona-form__fields">
            <div class="buyer-persona-field">
              <label :id="`persona-type-label-${persona.id}`">人设类型 <span aria-hidden="true">*</span></label>
              <div v-if="isReadOnly" class="buyer-persona-field__value">
                {{ optionLabel(availableTypeOptions, persona.type) }}
              </div>
              <DropdownSelect
                v-else
                v-model="persona.type"
                :options="typeOptionsFor(persona.id)"
                panel-width="100%"
                v-bind="{ ariaLabel: `人设 ${index + 1} 类型`, ariaLabelledby: `persona-type-label-${persona.id}`, ariaDescribedby: errors[`${persona.id}.type`] ? `persona-type-error-${persona.id}` : undefined }"
                @update:model-value="clearError(`${persona.id}.type`)"
              />
              <p v-if="errors[`${persona.id}.type`]" :id="`persona-type-error-${persona.id}`" class="buyer-persona-field__error" role="alert">
                {{ errors[`${persona.id}.type`] }}
              </p>
            </div>
            <div class="buyer-persona-field">
              <label :id="`persona-stage-label-${persona.id}`">采购阶段 <span aria-hidden="true">*</span></label>
              <div v-if="isReadOnly" class="buyer-persona-field__value">
                {{ optionLabel(availableStageOptions, persona.purchaseStage) }}
              </div>
              <DropdownSelect
                v-else
                v-model="persona.purchaseStage"
                :options="purchaseStageChoices"
                panel-width="100%"
                v-bind="{ ariaLabel: `人设 ${index + 1} 采购阶段`, ariaLabelledby: `persona-stage-label-${persona.id}`, ariaDescribedby: errors[`${persona.id}.purchaseStage`] ? `persona-stage-error-${persona.id}` : undefined }"
                @update:model-value="clearError(`${persona.id}.purchaseStage`)"
              />
              <p v-if="errors[`${persona.id}.purchaseStage`]" :id="`persona-stage-error-${persona.id}`" class="buyer-persona-field__error" role="alert">
                {{ errors[`${persona.id}.purchaseStage`] }}
              </p>
            </div>
          </div>

          <div class="buyer-persona-field buyer-persona-form__questions">
            <label :for="`persona-questions-${persona.id}`">买家常问的问题</label>
            <textarea v-if="!isReadOnly" :id="`persona-questions-${persona.id}`" v-model="persona.commonQuestions" rows="3" placeholder="可输入多条问题，每行一条；例如：产品如何安装？交货周期多久？此项选填。" />
            <div v-else class="buyer-persona-field__value buyer-persona-form__questions-value">{{ persona.commonQuestions || '—' }}</div>
          </div>

        </article>
      </div>

      <p v-if="!isReadOnly && errors.form" class="buyer-persona-editor__error" role="alert">
        {{ errors.form }}
      </p>
      <p v-if="!isReadOnly && saveError" class="buyer-persona-editor__error" role="alert">
        {{ saveError }}
      </p>
      <Button
        v-if="!isReadOnly"
        class="buyer-persona-editor__add"
        variant="outline"
        :disabled="drafts.length >= maxBuyerPersonas || remainingTypes.length === 0"
        @click="addDraft"
      >
        + 再添加一套
      </Button>
      <p v-if="!isReadOnly" class="buyer-persona-editor__hint">
        最多维护 6 套，同一类型只能添加一次。
      </p>
    </div>

    <template #footer>
      <Button v-if="isReadOnly" variant="outline" @click="open = false">
        关闭
      </Button>
      <template v-else>
        <Button variant="outline" :disabled="saving" @click="open = false">
          取消
        </Button>
        <Button variant="primary" :loading="saving" @click="save">
          保存
        </Button>
      </template>
    </template>
  </Modal>
</template>

<style scoped>
.buyer-persona-editor { display: grid; gap: var(--space-3); }
.buyer-persona-editor__intro,.buyer-persona-editor__hint { margin: 0; color: var(--text-secondary); font-size: var(--font-size-body); line-height: var(--line-height-body); }
.buyer-persona-editor__list { display: grid; gap: var(--space-3); }
.buyer-persona-form { padding: var(--space-3); border: 1px solid var(--border-default); border-radius: var(--radius-card); background: var(--background-primary); }
.buyer-persona-form__questions { margin-top: var(--space-3); gap: 8px; }
.buyer-persona-form__questions textarea { box-sizing: border-box; width: 100%; min-height: 84px; padding: 12px; border: 1px solid var(--border-default); border-radius: var(--radius-control); color: var(--text-primary); background: var(--background-primary); font: inherit; resize: vertical; }
.buyer-persona-form__questions-value { min-height: 68px; align-items: flex-start; background: var(--background-primary); white-space: pre-line; }
.buyer-persona-form__header { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); margin-bottom: var(--space-3); }
.buyer-persona-form__header h3 { margin: 0; color: var(--text-primary); font-size: var(--font-size-section-title); line-height: var(--line-height-section-title); font-weight: var(--weight-semibold); }
.buyer-persona-form__fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-3); }
.buyer-persona-field { display: grid; align-content: start; gap: var(--space-2); min-width: 0; }
.buyer-persona-field > label:not(.buyer-persona-field__sr-label) { color: var(--text-secondary); font-size: var(--font-size-body); line-height: var(--line-height-body); font-weight: var(--weight-medium); }
.buyer-persona-field > label span { color: var(--status-error); }
.buyer-persona-field__value { display: flex; min-height: 42px; align-items: center; padding: 8px 12px; border: 1px solid var(--border-control); border-radius: var(--radius-control); color: var(--text-primary); background: var(--background-secondary); overflow-wrap: anywhere; }
.buyer-persona-field__error,.buyer-persona-editor__error { margin: 0; color: var(--status-error); font-size: var(--font-size-caption); line-height: var(--line-height-caption); }
.buyer-persona-editor__add { justify-self: start; border-style: dashed; }
.buyer-persona-editor__hint { color: var(--text-muted); font-size: var(--font-size-caption); line-height: var(--line-height-caption); }
:deep(.ce-modal-root.buyer-persona-modal) { --modal-inset: var(--space-4); width: min(920px, calc(100vw - 32px)); max-height: min(760px, calc(100vh - 32px)); }
:deep(.ce-modal-root.buyer-persona-modal .ce-modal) { max-height: min(760px, calc(100vh - 32px)); }
:deep(.ce-modal-root.buyer-persona-modal .ce-modal-footer) { border-top: 1px solid var(--border-divider); }
@media (max-width: 600px) { .buyer-persona-form__fields { grid-template-columns: 1fr; } }
</style>
