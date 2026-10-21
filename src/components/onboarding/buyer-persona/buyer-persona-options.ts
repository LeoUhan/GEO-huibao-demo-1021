import type { DropdownSelectOption } from '../../ui/ce'

// Temporary local data. Replace these arrays with the onboarding options API response.
export const buyerPersonaTypeOptions: DropdownSelectOption[] = [
  { value: 'composites-engineering', label: '复材技术负责人' },
  { value: 'aviation-procurement', label: '航空采购' },
  { value: 'japan-trading-company', label: '日本商社' },
  { value: 'workshop-supervisor', label: '车间主管' },
  { value: 'composites-startup', label: '复材初创' },
  { value: 'automotive-tier-one', label: '汽车 Tier-1' },
]

export const purchaseStageOptions: DropdownSelectOption[] = [
  { value: 'requirement-identification', label: '需求识别' },
  { value: 'solution-search', label: '方案寻找' },
  { value: 'supplier-evaluation', label: '供应商评估' },
  { value: 'purchase-decision', label: '采购决策' },
]

export const companySizeOptions: DropdownSelectOption[] = [
  { value: 'under-50', label: '50 人以下' },
  { value: '50-199', label: '50–199 人' },
  { value: '200-499', label: '200–499 人' },
  { value: '500-999', label: '500–999 人' },
  { value: '1000-plus', label: '1000 人以上' },
]

export const decisionRoleOptions: DropdownSelectOption[] = [
  { value: 'user', label: '实际使用者' },
  { value: 'technical-evaluator', label: '技术评估者' },
  { value: 'procurement', label: '采购执行者' },
  { value: 'budget-owner', label: '预算负责人' },
  { value: 'final-decision-maker', label: '最终决策者' },
]

export const maxBuyerPersonas = 6
