import type { GeoTask } from '../../../data/geo-data'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { initialTasks } from '../../../data/geo-data'
import { ensureWorkflow } from '../../../workflows/task-workflow'
import OptimizationContent from './OptimizationContent.vue'

function makeTasks(): GeoTask[] {
  return Array.from({ length: 6 }, (_, index) => ({
    ...initialTasks[index % initialTasks.length]!,
    id: `TASK-${index + 1}`,
    name: `任务 ${index + 1}`,
  }))
}

describe('optimization content task table', () => {
  it('removes the optimization-window selector and aggregates every window', () => {
    const tasks = makeTasks().slice(0, 2).map((task, index) => ({
      ...task,
      type: index === 0 ? 'web' as const : 'external' as const,
      strategyWindow: index === 0 ? '09/14–09/20' : '09/21–09/27',
    }))
    const wrapper = mount(OptimizationContent, {
      props: { tasks: [tasks[0]!], allTasks: tasks, filter: 'all', role: 'ops' },
    })

    expect(wrapper.find('.geo-optimization-period').exists()).toBe(false)
    expect(wrapper.findAll('.geo-stat-card').map(card => card.text())).toEqual([
      '2项全部任务',
      '1项官网内容',
      '1项外部内容',
      '0项基础修复',
    ])
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
    wrapper.unmount()
  })

  it('shows the unified page help icon with the requested explanation', () => {
    const tasks = makeTasks()
    const wrapper = mount(OptimizationContent, {
      props: { tasks, allTasks: tasks, filter: 'all', role: 'ops' },
    })

    expect(wrapper.get('.geo-page-intro h1 .overview-info-icon').attributes('aria-label')).toBe('优化中心说明')
    expect(wrapper.find('.geo-page-description').exists()).toBe(false)
    wrapper.unmount()
  })

  it('uses the prototype columns and shows a compact pagination summary', () => {
    const tasks = makeTasks()
    const wrapper = mount(OptimizationContent, {
      props: { tasks, allTasks: tasks, filter: 'all', role: 'ops' },
    })

    expect(wrapper.findAll('thead th').map(header => header.text())).toEqual([
      '序号',
      '任务',
      '任务类型',
      '来源',
      '任务状态',
      '操作',
    ])
    expect(wrapper.findAll('tbody tr td:first-child').map(cell => cell.text())).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
    ])
    expect(wrapper.get('thead th:nth-child(1)').attributes('style')).toContain('width: 4%')
    expect(wrapper.get('thead th:nth-child(1)').attributes('style')).toContain('min-width: 44px')
    expect(wrapper.get('thead th:nth-child(6)').attributes('style')).toContain('width: 9%')
    expect(wrapper.get('thead th:nth-child(6)').attributes('style')).toContain('min-width: 112px')
    expect(wrapper.get('.geo-task-pagination .pagination__summary').text()).toBe('共 6 条 · 第 1 / 2 页')
    expect(wrapper.get('.geo-task-pagination').attributes('data-size')).toBe('sm')
    expect(wrapper.get('.geo-task-detail-button').text()).toBe('查看详情')
    expect(wrapper.get('.geo-task-detail-button').classes()).toContain('geo-table-detail-button')
    wrapper.unmount()
  })

  it('removes ignored Briefs from pending cards and exposes a dedicated ignored filter', async () => {
    const task = { ...initialTasks[0]!, id: 'TASK-IGNORED', name: '已忽略任务', progress: 'brief' as const }
    ensureWorkflow(task).ignoredBrief = {
      reason: '其他',
      explanation: '不再适用',
      actor: '客户',
      time: new Date().toISOString(),
    }
    const tasks = [task]
    const wrapper = mount(OptimizationContent, {
      props: { tasks, allTasks: tasks, filter: 'all', role: 'client' },
    })

    expect(wrapper.get('.geo-action-card').text()).toContain('当前 0 项')
    expect(wrapper.get('tbody').text()).toContain('已忽略')
    await wrapper.get('input[value="ignored"]').trigger('change')
    expect(wrapper.get('tbody').text()).toContain('已忽略任务')

    wrapper.unmount()
  })
})
