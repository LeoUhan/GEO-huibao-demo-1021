<script setup lang="ts">
import type { ReportRecord } from '../../data/report-center-data'
import { onBeforeUnmount, ref, watch } from 'vue'
import { exampleExpertHtml, loadExpertFile } from '../../data/expert-report-demo'

const props = defineProps<{ report: ReportRecord | null }>()
const emit = defineEmits<{ close: [] }>()
const source = ref('')
let currentUrl = ''

watch(() => props.report, async (report) => {
  if (currentUrl)
    URL.revokeObjectURL(currentUrl)
  source.value = ''
  if (!report)
    return
  const file = await loadExpertFile(report.id).catch(() => null)
  if (props.report?.id !== report.id)
    return
  if (!file && report.expert?.format === 'pdf')
    return
  currentUrl = URL.createObjectURL(file ?? exampleExpertHtml(report))
  source.value = currentUrl
}, { immediate: true })
onBeforeUnmount(() => {
  if (currentUrl)
    URL.revokeObjectURL(currentUrl)
})
</script>

<template>
  <div v-if="report" class="expert-preview-overlay" role="presentation" @click.self="emit('close')">
    <section class="expert-preview" role="dialog" aria-modal="true" aria-labelledby="expert-preview-title">
      <header>
        <div>
          <h2 id="expert-preview-title">
            {{ report.title }}
          </h2><p>{{ report.period }} · {{ report.expert?.deliveredAt || report.date }} 交付</p>
        </div><div class="expert-preview-actions">
          <a v-if="source" :href="source" :download="report.expert?.fileName">下载{{ report.expert?.format?.toUpperCase() }}</a><button type="button" aria-label="关闭报告" @click="emit('close')">
            ×
          </button>
        </div>
      </header>
      <iframe v-if="source" :src="source" :title="report.title" sandbox="allow-scripts" />
      <div v-else class="expert-preview-empty">
        当前演示记录没有可预览的文件。上传并交付报告后即可查看。
      </div>
    </section>
  </div>
</template>

<style scoped>
.expert-preview-overlay{position:fixed;inset:0;z-index:100;padding:3vh 3vw;background:#17243b77;backdrop-filter:blur(3px)}.expert-preview{display:flex;flex-direction:column;width:100%;height:100%;overflow:hidden;border-radius:18px;background:#fff;box-shadow:0 30px 80px #17243b30}.expert-preview header{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:15px 24px;border-bottom:1px solid #e5ebf4}.expert-preview h2{margin:0;color:#1d2b45;font-size:18px}.expert-preview p{margin:5px 0 0;color:#8290a5;font-size:12px}.expert-preview-actions{display:flex;align-items:center;gap:14px}.expert-preview-actions a{padding:9px 14px;border:1px solid #c9d8ff;border-radius:8px;color:#4055ed;text-decoration:none;font-size:13px;font-weight:600}.expert-preview-actions button{border:0;background:transparent;color:#7c8a9e;font-size:27px;cursor:pointer}.expert-preview iframe{width:100%;height:100%;border:0;background:#fff}.expert-preview-empty{display:grid;flex:1;place-items:center;color:#8190a6}
</style>
