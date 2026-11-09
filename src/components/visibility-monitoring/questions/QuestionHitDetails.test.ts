import { mount } from '@vue/test-utils'
import { expect, it } from 'vitest'
import { referenceMonitoringResults } from '../../../data/reference-monitoring-results'
import QuestionHitDetails from './QuestionHitDetails.vue'

it('shows signed percentage-point changes only when the question can be compared', async () => {
  const { questions, platforms } = referenceMonitoringResults
  const wrapper = mount(QuestionHitDetails, {
    props: {
      questions: [questions[0]!, questions[3]!, questions[5]!, { ...questions[6]!, mentionVsPrevPp: null }],
      platforms,
    },
  })
  const trends = () => wrapper.findAll('.vm-question-trend').map(cell => cell.text())
  expect(trends()).toEqual(['↑ 上升 +6.3 pp', '→ 持平 0 pp', '↓ 下降 -2.4 pp', '—'])

  await wrapper.setProps({ hideComparison: true })
  expect(trends()).toEqual(['—', '—', '—', '—'])
})
