import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import DiagnosisView from './DiagnosisView.vue'

const context = vi.hoisted(() => ({
  siteId: '01a12e18-3e48-7232-b98c-283ca40ac3c2' as string | null,
  marketId: 17 as number | null,
  initialize: vi.fn(),
}))
const diagnosis = vi.hoisted(() => ({
  issues: { value: [] },
  gaps: { value: [] },
  strategies: { value: [] },
  loading: { value: false },
  errors: { value: {} },
  detail: { value: null },
  detailLoading: { value: false },
  detailError: { value: '' },
  load: vi.fn(),
  loadDetail: vi.fn(),
  closeDetail: vi.fn(),
}))
const workbench = vi.hoisted(() => ({
  findings: [],
  personas: [],
  activePersona: { value: 'engineering' },
  strategies: [],
  tasks: [],
  strategyLayer: { value: '全部' },
  serviceMode: { value: 'managed' },
  role: { value: 'ops' },
  highlightedStrategy: { value: undefined },
  toggleFinding: vi.fn(),
  selectAllFindings: vi.fn(),
  approveSelectedFindings: vi.fn(),
  openStrategy: vi.fn(),
  confirmStrategy: vi.fn(),
  openFlow: vi.fn(),
  openAudit: vi.fn(),
  openAuditCheck: vi.fn(),
  openPending: vi.fn(),
}))

vi.mock('../stores/geo-context', () => ({ useGeoContextStore: () => context }))
vi.mock('../composables/use-diagnosis-data', () => ({ useDiagnosisData: () => diagnosis }))
vi.mock('../composables/workbench-route-context', () => ({ useGeoWorkbenchRouteContext: () => workbench }))
vi.mock('../components/workbench/diagnosis/DiagnosisContent.vue', () => ({
  default: {
    props: ['role', 'activePersona'],
    emits: ['selectPersona'],
    template: '<div data-testid="local-workflow" :data-role="role"><span>{{ activePersona }}</span><button type="button" @click="$emit(\'selectPersona\', \'procurement\')">switch persona</button></div>',
  },
}))
vi.mock('../components/workbench/diagnosis/DiagnosisApiPanel.vue', () => ({
  default: { template: '<div role="main"><div v-if="errors?.issues" role="alert">{{ errors.issues }}</div></div>', props: ['errors'] },
}))

describe('diagnosis view context gating', () => {
  it('waits for site and market context before loading diagnosis APIs', async () => {
    let resolveContext!: () => void
    context.siteId = '01a12e18-3e48-7232-b98c-283ca40ac3c2'
    context.marketId = 17
    context.initialize.mockReset().mockReturnValueOnce(new Promise<void>((resolve) => {
      resolveContext = resolve
    }))
    diagnosis.load.mockReset().mockResolvedValue(undefined)

    mount(DiagnosisView)
    await flushPromises()
    expect(diagnosis.load).not.toHaveBeenCalled()

    resolveContext()
    await flushPromises()
    expect(diagnosis.load).toHaveBeenCalledWith('01a12e18-3e48-7232-b98c-283ca40ac3c2')
  })

  it('does not call diagnosis APIs when there is no active market', async () => {
    context.siteId = '01a12e18-3e48-7232-b98c-283ca40ac3c2'
    context.marketId = null
    context.initialize.mockReset().mockResolvedValue(undefined)
    diagnosis.load.mockReset()

    mount(DiagnosisView)
    await flushPromises()

    expect(diagnosis.load).not.toHaveBeenCalled()
  })

  it('renders the local workflow with the active role and connects persona changes', async () => {
    context.siteId = '01a12e18-3e48-7232-b98c-283ca40ac3c2'
    context.marketId = 17
    context.initialize.mockReset().mockResolvedValue(undefined)
    diagnosis.load.mockReset().mockResolvedValue(undefined)
    workbench.activePersona.value = 'engineering'
    workbench.role.value = 'client'

    const wrapper = mount(DiagnosisView)
    await flushPromises()

    expect(wrapper.get('[data-testid="local-workflow"]').attributes('data-role')).toBe('client')
    await wrapper.get('[data-testid="local-workflow"] button').trigger('click')
    expect(workbench.activePersona.value).toBe('procurement')
    expect(wrapper.get('summary').text()).toContain('原始诊断查询数据')
  })
})
