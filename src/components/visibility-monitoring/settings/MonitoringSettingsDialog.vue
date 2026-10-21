<script setup lang="ts">
import type { SamplingFrequency } from '../../../data/visibility-monitoring-data'
import { computed, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import Spinner from '../../ui/ce/spinner/Spinner.vue'
import AppIcon from '../../ui/icons/AppIcon.vue'

const props = defineProps<{ open: boolean, frequency: SamplingFrequency, platforms: readonly { id: string, label: string, enabled: boolean }[], selectedPlatforms: readonly string[], time: string, saving?: boolean, error?: string }>()
const emit = defineEmits<{ close: [], save: [settings: { frequency: SamplingFrequency, platforms: string[], time: string }] }>()
const dialog = shallowRef<HTMLDialogElement | null>(null)
const frequency = shallowRef<SamplingFrequency>(props.frequency)
const time = shallowRef(props.time)
const selectedPlatforms = shallowRef<string[]>([...props.selectedPlatforms])
const availablePlatforms = computed(() => props.platforms.filter(platform => platform.enabled))
watch(() => props.open, (open) => {
  if (!dialog.value)
    return
  if (open) {
    frequency.value = props.frequency
    time.value = props.time
    selectedPlatforms.value = [...props.selectedPlatforms]
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
function togglePlatform(id: string, checked: boolean) {
  selectedPlatforms.value = checked ? [...new Set([...selectedPlatforms.value, id])] : selectedPlatforms.value.filter(platform => platform !== id)
}
function save() {
  emit('save', { frequency: frequency.value, platforms: selectedPlatforms.value, time: time.value })
}
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
        调整采集频率与平台
      </h2><button type="button" aria-label="关闭设置" @click="emit('close')">
        <AppIcon name="close" :size="18" aria-hidden="true" />
      </button>
    </header>
    <form class="vm-settings__body" @submit.prevent="save">
      <fieldset>
        <legend>采集频率</legend><div class="vm-frequency">
          <label v-for="item in [{ id: 'daily', label: '每天' }, { id: 'weekly', label: '每周' }, { id: 'monthly', label: '每月' }] as const" :key="item.id" :class="{ 'is-selected': frequency === item.id }"><input v-model="frequency" type="radio" name="frequency" :value="item.id">{{ item.label }}</label>
        </div>
      </fieldset>
      <label class="vm-settings__time">执行时间 <input v-model="time" type="time" required></label>
      <fieldset>
        <legend>AI 平台 <span>{{ availablePlatforms.length }} 个服务端可选项</span></legend><p v-if="props.error" class="vm-settings__error" role="alert">
          {{ props.error }}
        </p><p v-else-if="!availablePlatforms.length" class="vm-settings__note">
          暂无平台选项，或平台配置尚未加载成功。
        </p><div class="vm-platform-grid">
          <label v-for="platform in availablePlatforms" :key="platform.id"><input type="checkbox" :value="platform.id" :checked="selectedPlatforms.includes(platform.id)" @change="togglePlatform(platform.id, ($event.target as HTMLInputElement).checked)">{{ platform.label }}</label>
        </div>
      </fieldset>
      <p class="vm-settings__note">
        执行频率和时间将保存到当前市场的服务端计划；平台勾选也会同步写入当前市场配置。
      </p>
    </form>
    <footer class="vm-settings__foot">
      <button type="button" @click="emit('close')">
        取消
      </button><button class="is-primary" type="button" :disabled="props.saving || !availablePlatforms.length" :aria-busy="props.saving" @click="save">
        <Spinner v-if="props.saving" variant="ring" aria-hidden="true" />
        保存当前设置
      </button>
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
.vm-frequency { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.vm-frequency label { display: flex; align-items: center; gap: 10px; min-height: 42px; padding: 8px 12px; border: 1px solid var(--border-default); border-radius: 10px; cursor: pointer; }
.vm-frequency label.is-selected { border-color: var(--action-accent); background: var(--action-subtle-background); }
.vm-frequency input, .vm-platform-grid input { accent-color: var(--action-accent); }
.vm-platform-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 20px; }
.vm-platform-grid label { display: flex; align-items: center; gap: 10px; min-height: 28px; }
.vm-settings__note { margin: 0; padding: 10px 12px; color: var(--text-secondary); background: var(--background-subtle); border-radius: 8px; }
.vm-settings__foot { justify-content: flex-end; border-top: 1px solid var(--border-default); border-bottom: 0; background: var(--background-subtle); }
.vm-settings__foot button { min-height: 34px; padding: 5px 12px; color: var(--action-accent); background: var(--background-primary); border: 1px solid var(--border-control); border-radius: 9px; font: inherit; font-size: 14px; line-height: 18px; cursor: pointer; }
.vm-settings__foot button.is-primary { color: var(--action-primary-foreground); background: var(--action-primary-background); border-color: var(--action-primary-background); }
.vm-settings__foot button.is-primary { display: inline-flex; align-items: center; justify-content: center; gap: 8px; --spinner-size: 16px; --spinner-color: currentColor; }
@media (max-width: 520px) { .vm-settings__body { padding: 14px 16px; } .vm-settings__head, .vm-settings__foot { padding: 10px 16px; } .vm-frequency { grid-template-columns: 1fr; } }
</style>
