import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, inject } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { geoWorkbenchRouteContextKey } from '../composables/workbench-route-context'
import { auditFindings, strategies } from '../data/geo-data'
import { useWorkbenchTasksStore } from '../stores/workbench-tasks'
import GeoWorkbenchLayout from './GeoWorkbenchLayout.vue'

function makeRouteProbe() {
  return defineComponent({
    setup() {
      const context = inject(geoWorkbenchRouteContextKey)!
      return () => h('div', [
        h('button', { 'data-test': 'open-pending', 'onClick': context.openPending }, '打开待处理'),
        h('button', { 'data-test': 'open-audit', 'onClick': () => context.openAudit(auditFindings.find(finding => finding.id === 'F9')!) }, '打开诊断'),
        h('button', {
          'data-test': 'select-bulk-findings',
          'onClick': () => {
            context.toggleFinding('F8-1')
            context.toggleFinding('F8-3')
          },
        }, '选择两条异常'),
        h('button', { 'data-test': 'approve-bulk-findings', 'onClick': context.approveSelectedFindings }, '批量审核'),
        h('button', { 'data-test': 'open-strategy-finding', 'onClick': () => context.openAudit(auditFindings.find(finding => finding.id === 'F8-2')!) }, '打开策略型诊断'),
        h('button', { 'data-test': 'open-strategy', 'onClick': () => context.openStrategy(strategies.find(strategy => strategy.id === 'GS11')!) }, '打开候选策略'),
      ])
    },
  })
}

describe('geoWorkbenchLayout icon migration', () => {
  it('uses an arrow icon for pending actions and preserves flow arrows in copy', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', name: 'overview', component: makeRouteProbe() }],
    })
    await router.push('/')
    await router.isReady()
    const wrapper = mount(GeoWorkbenchLayout, {
      global: {
        plugins: [createPinia(), router],
        stubs: {
          GeoWorkbenchToolbar: true,
          GeoDrawer: { props: ['open', 'title', 'subtitle', 'eyebrow', 'size', 'titleFirst'], template: '<div v-if="open" class="test-drawer" :data-size="size"><header><template v-if="titleFirst"><h2>{{ title }}</h2><small>{{ eyebrow }}</small></template><template v-else><small>{{ eyebrow }}</small><h2>{{ title }}</h2></template><p>{{ subtitle }}</p></header><slot /><footer><slot name="footer" /></footer></div>' },
        },
      },
    })

    expect(wrapper.find('geo-workbench-toolbar-stub').exists()).toBe(true)

    await wrapper.get('[data-test="open-pending"]').trigger('click')
    expect(wrapper.get('.geo-pending-item b').text()).toContain('立即处理')
    expect(wrapper.find('.geo-pending-item b svg.lucide-arrow-right').exists()).toBe(true)

    await wrapper.get('[data-test="open-audit"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('.test-drawer').text()).not.toContain('后续流程')
    expect(wrapper.get('.test-drawer').attributes('data-size')).toBe('600')
    const taskStore = useWorkbenchTasksStore()
    const initialTaskCount = taskStore.tasks.length
    const repairApproval = wrapper.findAll('.test-drawer footer button').find(button => button.text() === '审核通过并生成任务')
    expect(repairApproval).toBeDefined()
    await repairApproval!.trigger('click')
    expect(taskStore.tasks.length).toBe(initialTaskCount + 1)

    const countBeforeBulkApproval = taskStore.tasks.length
    await wrapper.get('[data-test="select-bulk-findings"]').trigger('click')
    await wrapper.get('[data-test="approve-bulk-findings"]').trigger('click')
    expect(taskStore.tasks.length).toBe(countBeforeBulkApproval + 2)
    expect(wrapper.find('.geo-toast').text()).toContain('已审核通过并生成关联任务')

    await wrapper.get('[data-test="open-strategy-finding"]').trigger('click')
    const findingDrawer = wrapper.get('.test-drawer')
    expect(findingDrawer.get('small').text()).toBe('异常4')
    expect(findingDrawer.get('header').element.firstElementChild?.tagName).toBe('H2')
    expect(findingDrawer.get('h2').text()).toBe('异常处理 · 专家作者档案待补')
    expect(findingDrawer.text()).toContain('⑤ 品牌实体')
    expect(findingDrawer.text()).toContain('待运营审核')
    expect(findingDrawer.text()).toContain('2 位工程师已有内容贡献，但缺少可验证的专业背景、经验与作者介绍。')
    expect(findingDrawer.text()).toContain('需要确认专家范围、身份事实和对外介绍方式。')
    expect(findingDrawer.text()).not.toContain('后续流程')
    expect(wrapper.findAll('.test-drawer footer button').some(button => button.text() === '忽略')).toBe(true)
    const strategyApproval = wrapper.findAll('.test-drawer footer button').find(button => button.text() === '审核通过并生成任务')
    expect(strategyApproval).toBeDefined()
    await strategyApproval!.trigger('click')
    await flushPromises()
    expect(wrapper.find('.geo-toast').text()).toContain('S-14 已审核通过并生成任务')
    wrapper.unmount()
  })

  it('shows candidate strategy details in the two-card review drawer layout', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', name: 'overview', component: makeRouteProbe() }],
    })
    await router.push('/')
    await router.isReady()
    const wrapper = mount(GeoWorkbenchLayout, {
      global: {
        plugins: [createPinia(), router],
        stubs: {
          GeoWorkbenchToolbar: true,
          GeoDrawer: { props: ['open', 'title', 'subtitle', 'eyebrow', 'size', 'titleFirst'], template: '<div v-if="open" class="test-drawer" :data-size="size"><header><template v-if="titleFirst"><h2>{{ title }}</h2><small>{{ eyebrow }}</small></template><template v-else><small>{{ eyebrow }}</small><h2>{{ title }}</h2></template><p>{{ subtitle }}</p></header><slot /><footer><slot name="footer" /></footer></div>' },
        },
      },
    })

    await wrapper.get('[data-test="open-strategy"]').trigger('click')

    const drawer = wrapper.get('.test-drawer')
    expect(drawer.get('header').element.firstElementChild?.tagName).toBe('H2')
    expect(drawer.attributes('data-size')).toBe('560')
    expect(drawer.get('small').text()).toBe('认知缺口策略 10')
    expect(drawer.get('p').text()).toBe('')
    expect(drawer.get('h2').text()).toBe('交期页增加汽车工艺停机风险与服务问答')
    expect(drawer.findAll('.geo-strategy-detail-card__header').map(header => header.text())).toEqual([
      '认知缺口策略待运营审核',
      'Agent 建议方法',
    ])
    expect(drawer.find('.geo-strategy-status').exists()).toBe(false)
    expect(drawer.find('.geo-strategy-drawer__status').text()).toBe('待运营审核')
    expect(drawer.get('.geo-strategy-detail-grid').text()).toContain('策略类型官网内容')
    expect(drawer.get('.geo-strategy-detail-grid').text()).toContain('目标人设汽车工艺、车间主管')
    expect(drawer.get('.geo-strategy-recommendation').text()).toBe('建议采用停机风险 Q&A、服务问答、买家场景补充等方式，完成本次官网内容优化。')
    expect(drawer.text()).not.toContain('审核与协作记录')
    await wrapper.findAll('.test-drawer footer button').find(button => button.text() === '忽略')!.trigger('click')
    expect(wrapper.find('.geo-strategy-ignore-form').exists()).toBe(true)
    await wrapper.findAll('.test-drawer footer button').find(button => button.text() === '取消')!.trigger('click')
    expect(wrapper.find('.geo-strategy-ignore-form').exists()).toBe(false)
    wrapper.unmount()
  })
})
