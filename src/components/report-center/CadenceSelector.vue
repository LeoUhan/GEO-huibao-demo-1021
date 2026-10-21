<script setup lang="ts">
import type { ReportType } from '../../data/report-center-data'

defineProps<{ modelValue: ReportType }>()
const emit = defineEmits<{ 'update:modelValue': [value: ReportType] }>()

const options: Array<{ value: ReportType, title: string, output: string, description: string }> = [
  { value: 'weekly', title: '每周监测', output: '周报 + 月报 + 季报', description: '按周计划采集，正式报告从周度开始生成；当前快照在概览与可见性监测中查看。' },
  { value: 'monthly', title: '每月监测', output: '月报 + 季报', description: '按月采集形成月报，并在季度周期汇总；不补造周报。' },
]
</script>

<template>
  <section class="cadence-panel" aria-labelledby="cadence-title">
    <div class="panel-heading">
      <div>
        <h2 id="cadence-title">
          周期监测与报告
        </h2>
        <p>选择采样节奏，了解各周期对应的报告产物</p>
      </div>
      <span class="current-config">当前配置：{{ options.find(option => option.value === modelValue)?.title.replace('监测', '') }}</span>
    </div>
    <div class="cadence-grid">
      <button
        v-for="option in options"
        :key="option.value"
        class="cadence-card"
        :class="{ 'is-selected': modelValue === option.value }"
        type="button"
        :data-cadence="option.value"
        :aria-pressed="modelValue === option.value"
        @click="emit('update:modelValue', option.value)"
      >
        <span class="cadence-card__top">
          <span>{{ option.title }}</span>
          <span v-if="modelValue === option.value" class="current-badge">当前</span>
        </span>
        <strong>{{ option.output }}</strong>
        <span class="cadence-card__description">{{ option.description }}</span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.cadence-panel { min-width: 0; padding: 20px; border: 1px solid var(--border-default); border-radius: var(--radius-card); background: var(--background-primary); }
.panel-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
.panel-heading h2 { margin: 0; color: var(--text-primary); font-size: var(--typography-section-title-font-size, 14px); line-height: var(--typography-section-title-line-height, 22px); font-weight: var(--weight-semibold); }
.panel-heading p { margin: 4px 0 0; color: var(--text-muted); font-size: 14px; }
.current-config { flex: 0 0 auto; padding: 2px 8px; border-radius: var(--radius-tag); color: var(--text-secondary); background: var(--background-subtle); font-size: var(--font-size-caption); line-height: var(--line-height-caption); }
.cadence-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.cadence-card { display: grid; min-width: 0; min-height: 132px; align-content: start; gap: 10px; padding: 16px; border: 1px solid var(--border-default); border-radius: var(--radius-card); color: var(--text-primary); background: var(--background-secondary); text-align: left; font: inherit; cursor: pointer; transition: border-color var(--motion-fast), background-color var(--motion-fast); }
.cadence-card:hover { border-color: var(--border-control); background: var(--background-primary); }
.cadence-card.is-selected { border-color: var(--action-accent); background: var(--action-subtle-background); }
.cadence-card__top { display: flex; align-items: center; justify-content: space-between; gap: 8px; color: var(--text-secondary); font-size: 14px; font-weight: 650; }
.current-badge { padding: 2px 8px; border-radius: var(--radius-tag); color: var(--action-accent); background: var(--action-subtle-background); font-size: var(--font-size-caption); line-height: var(--line-height-caption); }
.cadence-card > strong { font-size: 14px; line-height: 22px; font-weight: 600; }
.cadence-card__description { color: var(--text-secondary); font-size: var(--font-size-body); line-height: var(--line-height-body); }
.cadence-card:focus-visible { outline: 2px solid var(--action-accent); outline-offset: 3px; }
@media (max-width: 880px) { .cadence-grid { grid-template-columns: 1fr; } .cadence-card { min-height: 0; } }
@media (max-width: 560px) { .cadence-panel { padding: 18px; } .panel-heading { flex-direction: column; } }
</style>
