<script setup lang="ts">
import type { ReportRecord } from '../../data/report-center-data'
import { computed, ref, watch } from 'vue'
import { expertReportName, expertSummaryDefault } from '../../data/expert-report-demo'

const props = defineProps<{ open: boolean, report: ReportRecord | null, scope: string, remaining: number, deliveredMonths: string[], error?: string }>()
const emit = defineEmits<{
  close: []
  save: [value: { id?: string, month: string, name: string, summary: string, file: File | null, fileName: string, format: 'html' | 'pdf' | null }]
  deliver: [value: { id?: string, month: string, name: string, summary: string, file: File | null, fileName: string, format: 'html' | 'pdf' | null }]
}>()
const month = ref('')
const name = ref(expertReportName)
const summary = ref('')
const file = ref<File | null>(null)
const step = ref<'edit' | 'confirm'>('edit')
const validation = ref('')
const today = new Date()
const maxMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
const oldest = new Date(today.getFullYear(), today.getMonth() - 12, 1)
const minMonth = `${oldest.getFullYear()}-${String(oldest.getMonth() + 1).padStart(2, '0')}`
const fileName = computed(() => file.value?.name ?? props.report?.expert?.fileName ?? '')
const format = computed<'html' | 'pdf' | null>(() => {
  const extension = fileName.value.split('.').pop()?.toLowerCase()
  return extension === 'html' || extension === 'htm' ? 'html' : extension === 'pdf' ? 'pdf' : null
})

watch(() => [props.open, props.report] as const, ([open, report]) => {
  if (!open)
    return
  month.value = report?.expert?.month ?? maxMonth
  name.value = report?.title?.split(' 月 ').at(-1) ?? expertReportName
  summary.value = report?.expert?.delivery === 'draft' ? report.expert.draftSummary ?? '' : report?.summary ?? ''
  file.value = null
  validation.value = ''
  step.value = 'edit'
})

function data() {
  return { id: props.report?.id, month: month.value, name: name.value.trim(), summary: summary.value.trim(), file: file.value, fileName: fileName.value, format: format.value }
}

function validate(deliver: boolean) {
  if (!month.value || month.value < minMonth || month.value > maxMonth)
    return '报告月份须为当前月或过去 12 个月。'
  if (!name.value.trim())
    return '请填写报告名称。'
  if (name.value.trim().length > 40)
    return '报告名称最多 40 字。'
  if (summary.value.trim().length > 45)
    return '汇报重点最多 45 字。'
  if (file.value && file.value.size > 20 * 1024 * 1024)
    return '文件不能超过 20 MB。'
  if (file.value && !format.value)
    return '只支持 HTML 或 PDF 文件。'
  if (deliver && !fileName.value)
    return '请选择报告文件。'
  if (deliver && props.deliveredMonths.includes(month.value))
    return '该市场的这个月份已有已交付报告。'
  if (deliver && props.remaining <= 0)
    return '运营专家报告权益不足，暂无法交付。'
  return ''
}

function saveDraft() {
  validation.value = validate(false)
  if (!validation.value)
    emit('save', data())
}

function continueSubmit() {
  validation.value = validate(true)
  if (!validation.value)
    step.value = 'confirm'
}

function pickFile(event: Event) {
  file.value = (event.target as HTMLInputElement).files?.[0] ?? null
  validation.value = ''
}
</script>

<template>
  <div v-if="open" class="expert-overlay" role="presentation" @click.self="emit('close')">
    <section class="expert-dialog" role="dialog" aria-modal="true" aria-labelledby="expert-dialog-title">
      <header>
        <h2 id="expert-dialog-title">
          {{ step === 'confirm' ? '确认交付报告' : report ? '继续编辑报告' : '上传运营专家报告' }}
        </h2><button type="button" aria-label="关闭" @click="emit('close')">
          ×
        </button>
      </header>
      <template v-if="step === 'edit'">
        <div class="expert-fields">
          <div class="expert-scope">
            <span>交付至当前市场</span><strong>{{ scope }}</strong>
          </div>
          <div class="expert-grid">
            <label>报告月份 <b>*</b><input v-model="month" type="month" :min="minMonth" :max="maxMonth"></label>
            <label>报告名称 <b>*</b><input v-model="name" type="text" maxlength="40" placeholder="GEO 专家服务月度诊断报告"></label>
          </div>
          <label class="expert-upload" @dragover.prevent @drop.prevent="file = $event.dataTransfer?.files?.[0] ?? null"><span>报告文件</span><input type="file" accept=".html,.htm,.pdf,text/html,application/pdf" @change="pickFile"><strong>{{ fileName || '点击选择或拖入 HTML / PDF 文件' }}</strong><small>仅交付所上传的原格式文件，最大 20 MB</small></label>
          <label class="expert-summary-field">汇报重点 <span>（选填，{{ summary.length }}/45）</span><textarea v-model="summary" maxlength="45" rows="2" :placeholder="expertSummaryDefault" /></label>
          <p v-if="validation || error" class="expert-error" role="alert">
            {{ validation || error }}
          </p>
        </div>
        <footer>
          <span>保存草稿不会交付或消耗权益</span><div>
            <button type="button" class="expert-secondary" @click="emit('close')">
              取消
            </button><button type="button" class="expert-secondary" @click="saveDraft">
              保存草稿
            </button><button type="button" class="expert-primary" @click="continueSubmit">
              继续提交
            </button>
          </div>
        </footer>
      </template>
      <template v-else>
        <div class="expert-confirm">
          <p>确认后，客户即可在当前市场查看这份报告，并消耗 1 份运营专家报告权益。</p><dl><div><dt>当前市场</dt><dd>{{ scope }}</dd></div><div><dt>报告月份</dt><dd>{{ month }}</dd></div><div><dt>报告文件</dt><dd>{{ fileName }}</dd></div><div><dt>汇报重点</dt><dd>{{ summary.trim() || expertSummaryDefault }}</dd></div><div><dt>当前剩余</dt><dd>{{ remaining }} 份</dd></div></dl><p v-if="error" class="expert-error" role="alert">
            {{ error }}
          </p>
        </div>
        <footer>
          <span /><div>
            <button type="button" class="expert-secondary" @click="step = 'edit'">
              返回修改
            </button><button type="button" class="expert-primary" @click="emit('deliver', data())">
              确认交付
            </button>
          </div>
        </footer>
      </template>
    </section>
  </div>
</template>

<style scoped>
.expert-overlay{position:fixed;inset:0;z-index:100;display:grid;place-items:center;padding:20px;background:#17243b77;backdrop-filter:blur(3px)}.expert-dialog{width:min(720px,100%);max-height:calc(100vh - 40px);display:flex;flex-direction:column;overflow:hidden;border:1px solid #dce5f3;border-radius:18px;background:#fff;box-shadow:0 30px 80px #17243b30;color:#1d2b45}.expert-dialog header{display:flex;align-items:center;justify-content:space-between;padding:20px 24px;border-bottom:1px solid #e5ebf4}.expert-dialog h2{margin:0;font-size:19px}.expert-dialog header button{border:0;background:transparent;color:#8190a6;font-size:26px;cursor:pointer}.expert-fields,.expert-confirm{display:grid;gap:18px;overflow:auto;padding:24px}.expert-scope{display:flex;justify-content:space-between;gap:12px;padding:13px 16px;border:1px solid #dbe6f7;border-radius:10px;background:#f7f9fe;font-size:13px}.expert-scope span{color:#7b8ba4}.expert-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.expert-fields label{display:grid;gap:8px;color:#34435a;font-size:13px;font-weight:600}.expert-grid label{display:flex;flex-wrap:wrap;align-items:center;column-gap:4px;row-gap:8px}.expert-grid label input{flex:0 0 100%}.expert-fields label span{color:#8896aa;font-weight:400}.expert-fields label b{color:#df4848}.expert-fields input:not([type=file]),.expert-fields textarea{box-sizing:border-box;width:100%;min-height:42px;padding:10px 12px;border:1px solid #d9e1ed;border-radius:8px;background:#fff;color:#20304b;font:inherit;font-weight:400}.expert-fields textarea{resize:vertical}.expert-summary-field{display:block!important}.expert-summary-field span{display:inline}.expert-summary-field textarea{display:block;margin-top:8px}.expert-upload{padding:18px;border:1px dashed #a7baff;border-radius:10px;background:#f8faff;text-align:center;cursor:pointer}.expert-upload input{display:none}.expert-upload strong{color:#4055ed}.expert-upload small{color:#8b99ae;font-weight:400}.expert-dialog footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 24px;border-top:1px solid #e5ebf4;font-size:12px;color:#8a98aa}.expert-dialog footer div{display:flex;gap:8px}.expert-dialog footer button{min-height:38px;padding:0 15px;border-radius:8px;font:inherit;font-size:13px;font-weight:600;cursor:pointer}.expert-secondary{border:1px solid #d3ddec;background:#fff;color:#4a5a74}.expert-primary{border:1px solid #4656ef;background:#4656ef;color:white}.expert-confirm p{margin:0;line-height:1.7}.expert-confirm dl{display:grid;gap:0;margin:0;border:1px solid #dce5f3;border-radius:10px}.expert-confirm dl div{display:grid;grid-template-columns:120px 1fr;gap:12px;padding:11px 15px;border-bottom:1px solid #edf1f7}.expert-confirm dl div:last-child{border:0}.expert-confirm dt{color:#8391a5}.expert-confirm dd{margin:0;overflow-wrap:anywhere}.expert-error{margin:0;color:#c2413b;font-size:13px}@media(max-width:600px){.expert-grid{grid-template-columns:1fr}.expert-dialog footer{align-items:flex-start;flex-direction:column}.expert-dialog footer div{width:100%;justify-content:flex-end}}
</style>
