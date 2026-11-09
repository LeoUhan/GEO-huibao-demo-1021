<script setup lang="ts">
import { Modal } from '../../ui/ce'

defineProps<{
  enabled: boolean
  newBaseline: boolean
  pending?: boolean
  error?: string
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ confirm: [] }>()
</script>

<template>
  <Modal
    v-model:open="open"
    title="确认保存监测问题？"
    width="min(600px, calc(100vw - 32px))"
    confirm-text="确认保存"
    cancel-text="返回编辑"
    processing-text="保存中…"
    close-label="关闭保存确认"
    :loading="pending"
    @confirm="emit('confirm')"
  >
    <div class="question-change-copy">
      <p>{{ enabled ? '保存后，下一轮监测将使用更新后的问题，已启动的轮次继续使用原配置。' : '保存后，恢复监测后的第一轮将使用更新后的问题，已启动的轮次继续使用原配置。' }}</p>
      <p>{{ newBaseline ? '使用新问题集的第一轮将作为新基线首轮，与此前轮次的环比暂不展示。' : '问题集和指标口径未变时，沿用现有可比基线。' }}</p>
      <p v-if="error" class="question-change-copy__error" role="alert">{{ error }}</p>
    </div>
  </Modal>
</template>

<style scoped>
.question-change-copy { display: grid; gap: var(--space-2); color: var(--text-secondary); }
.question-change-copy p { margin: 0; }
.question-change-copy__error { color: var(--status-error-foreground); }
</style>
