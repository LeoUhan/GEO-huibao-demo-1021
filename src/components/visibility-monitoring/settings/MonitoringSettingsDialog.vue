<script setup lang="ts">
import type { SamplingFrequency } from '../../../data/visibility-monitoring-data'
import { computed, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import { monitoringFrequencyOptions, monitoringPlatformOptions } from '../../onboarding/monitoring-plan/monitoring-plan'
import AppIcon from '../../ui/icons/AppIcon.vue'

const props = defineProps<{ open: boolean, frequency: SamplingFrequency, selectedPlatforms: readonly string[] }>()
const emit = defineEmits<{ close: [] }>()
const dialog = shallowRef<HTMLDialogElement | null>(null)
const frequency = computed(() => props.frequency === 'monthly' ? 'monthly' : 'weekly')
const availablePlatforms = computed(() => monitoringPlatformOptions.map(platform => ({ id: platform.value, label: platform.label, hint: platform.hint })))
const frequencyLabel = computed(() => monitoringFrequencyOptions.find(option => option.value === frequency.value)?.label)
watch(() => props.open, (open) => {
  if (!dialog.value)
    return
  if (open) {
    if (!dialog.value.open)
      dialog.value.showModal()
  }
  else if (dialog.value.open) {
    dialog.value.close()
  }
}, { flush: 'post' })
onMounted(() => {
  if (props.open)
    dialog.value?.showModal()
})
function handleClose() {
  if (props.open)
    emit('close')
}
onBeforeUnmount(() => {
  if (dialog.value?.open)
    dialog.value.close()
})
</script>

<template>
  <dialog ref="dialog" class="vm-settings" aria-labelledby="vm-settings-title" @close="handleClose">
    <header class="vm-settings__head">
      <h2 id="vm-settings-title">
        采集计划
      </h2><button type="button" aria-label="关闭设置" @click="emit('close')">
        <AppIcon name="close" :size="18" aria-hidden="true" />
      </button>
    </header>
    <div class="vm-settings__body">
      <fieldset>
        <legend>采集频率</legend><div class="vm-frequency">
          <label v-for="item in monitoringFrequencyOptions" :key="item.value" :class="{ 'is-selected': frequency === item.value, 'is-locked': frequency !== item.value }"><input type="radio" name="frequency" :value="item.value" :checked="frequency === item.value" disabled>{{ item.label }}</label>
        </div>
      </fieldset>
      <fieldset>
        <legend>AI 平台</legend>
        <ul class="vm-platform-grid">
          <li v-for="platform in availablePlatforms" :key="platform.id">
            <span>{{ platform.label }}</span>
            <small>{{ platform.hint ?? (selectedPlatforms.includes(platform.id) ? '已包含' : '套餐未包含') }}</small>
          </li>
        </ul>
      </fieldset>
      <p class="vm-settings__note">
        采集频率固定为{{ frequencyLabel }}，AI 平台按套餐执行。采集日期与时间由系统安排。
      </p>
    </div>
    <footer class="vm-settings__foot">
      <button type="button" @click="emit('close')">关闭</button>
    </footer>
  </dialog>
</template>

<style scoped>
.vm-settings { width: min(720px, calc(100vw - 32px)); max-width: none; max-height: 92vh; padding: 0; color: var(--text-primary); background: var(--background-primary); border: 1px solid var(--border-default); border-radius: 16px; box-shadow: var(--shadow-floating); }
.vm-settings::backdrop { background: rgb(15 23 42 / 48%); }
.vm-settings__head, .vm-settings__foot { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 12px 22px; border-bottom: 1px solid var(--border-default); }
.vm-settings__head h2 { margin: 0; font-size: 16px; }
.vm-settings__head button { display: grid; width: 30px; height: 30px; place-items: center; background: none; border: 0; font-size: 20px; line-height: 1; cursor: pointer; }
.vm-settings__body { display: grid; gap: 18px; max-height: 64vh; overflow-y: auto; padding: 18px 22px; }
fieldset { min-width: 0; margin: 0; padding: 0; border: 0; }
legend { margin-bottom: 10px; font-weight: 600; }
legend span { color: var(--text-muted); font-weight: 400; }
.vm-frequency { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.vm-frequency label { display: flex; align-items: center; gap: 10px; min-height: 42px; padding: 8px 12px; border: 1px solid var(--border-default); border-radius: 10px; }
.vm-frequency label.is-selected { border-color: var(--action-accent); background: var(--action-subtle-background); }
.vm-frequency label.is-locked { color: var(--text-muted); background: var(--background-subtle); }
.vm-frequency input { accent-color: var(--action-accent); }
.vm-platform-grid { margin: 0; padding: 0; list-style: none; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 20px; }
.vm-platform-grid li { display: flex; align-items: center; gap: 10px; min-height: 28px; }
.vm-platform-grid li small { color: var(--text-muted); font-size: 12px; }
.vm-settings__note { margin: 0; padding: 10px 12px; color: var(--text-secondary); background: var(--background-subtle); border-radius: 8px; }
.vm-settings__foot { justify-content: flex-end; border-top: 1px solid var(--border-default); border-bottom: 0; background: var(--background-subtle); }
.vm-settings__foot button { min-height: 34px; padding: 5px 12px; color: var(--action-accent); background: var(--background-primary); border: 1px solid var(--border-control); border-radius: 9px; font: inherit; font-size: 14px; line-height: 18px; cursor: pointer; }
@media (max-width: 520px) { .vm-settings__body { padding: 14px 16px; } .vm-settings__head, .vm-settings__foot { padding: 10px 16px; } .vm-frequency { grid-template-columns: 1fr; } }
</style>
