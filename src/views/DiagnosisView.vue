<script setup lang="ts">
import { onMounted, ref } from 'vue'
import DiagnosisContent from '../components/workbench/diagnosis/DiagnosisContent.vue'
import DiagnosisApiPanel from '../components/workbench/diagnosis/DiagnosisApiPanel.vue'
import { useGeoWorkbenchRouteContext } from '../composables/workbench-route-context'
import { useDiagnosisData } from '../composables/use-diagnosis-data'
import { useGeoContextStore } from '../stores/geo-context'

const diagnosis = useDiagnosisData()
const geoContext = useGeoContextStore()
const workbench = useGeoWorkbenchRouteContext()
const sessionLoading = ref(true)
const sessionError = ref('')

async function refresh() {
  sessionError.value = ''
  sessionLoading.value = true
  try {
    await geoContext.initialize()
    if (!geoContext.siteId)
      throw new Error('当前会话未提供有效站点 ID。')
    if (!geoContext.marketId)
      throw new Error('当前会话未提供有效市场 ID。')
    await diagnosis.load(geoContext.siteId)
  }
  catch (error) {
    sessionError.value = error instanceof Error ? error.message : '会话初始化失败'
  }
  finally {
    sessionLoading.value = false
  }
}

onMounted(() => void refresh())

function openDetail(kind: 'issue' | 'strategy', id: number) {
  if (geoContext.siteId)
    void diagnosis.loadDetail(kind, id, geoContext.siteId)
}
</script>

<template>
  <div class="geo-diagnosis-view">
    <DiagnosisContent
      :findings="workbench.findings"
      :personas="workbench.personas"
      :active-persona="workbench.activePersona.value"
      :strategies="workbench.strategies"
      :all-strategies="workbench.strategies"
      :tasks="workbench.tasks"
      :strategy-layer="workbench.strategyLayer.value"
      :service-mode="workbench.serviceMode.value"
      :role="workbench.role.value"
      :highlighted-strategy="workbench.highlightedStrategy.value"
      @select-finding="workbench.toggleFinding"
      @select-all-findings="workbench.selectAllFindings"
      @approve-selected-findings="workbench.approveSelectedFindings"
      @select-persona="workbench.activePersona.value = $event"
      @set-strategy-layer="workbench.strategyLayer.value = $event"
      @open-strategy="workbench.openStrategy"
      @confirm-strategy="workbench.confirmStrategy"
      @go-optimization="workbench.openFlow('optimization')"
      @open-flow="workbench.openFlow('diagnosis')"
      @open-audit="workbench.openAudit"
      @open-audit-check="workbench.openAuditCheck"
      @open-pending="workbench.openPending"
    />

    <details class="geo-diagnosis-data-details">
      <summary>原始诊断查询数据 <span>本地模拟数据 · 问题、Gap 与候选策略</span></summary>
      <DiagnosisApiPanel
        :issues="diagnosis.issues.value"
        :gaps="diagnosis.gaps.value"
        :strategies="diagnosis.strategies.value"
        :loading="sessionLoading || diagnosis.loading.value"
        :errors="sessionError ? { issues: sessionError, gaps: sessionError, strategies: sessionError } : diagnosis.errors.value"
        :detail="diagnosis.detail.value"
        :detail-loading="diagnosis.detailLoading.value"
        :detail-error="diagnosis.detailError.value"
        @retry="refresh"
        @detail="openDetail"
        @close-detail="diagnosis.closeDetail()"
      />
    </details>
  </div>
</template>

<style scoped>
.geo-diagnosis-data-details {
  margin: 0 0 32px;
  border: 1px solid var(--geo-border, #dfe5ef);
  border-radius: 12px;
  background: #fff;
}

.geo-diagnosis-data-details > summary {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  color: #334155;
  font-weight: 650;
  cursor: pointer;
  list-style-position: inside;
}

.geo-diagnosis-data-details > summary span {
  color: #8290a5;
  font-size: 13px;
  font-weight: 400;
}

.geo-diagnosis-data-details[open] > summary {
  border-bottom: 1px solid var(--geo-border, #dfe5ef);
}
</style>
