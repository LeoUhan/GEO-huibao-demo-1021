export type MonitoringFrequency = 'daily' | 'weekly' | 'monthly'

export type MonitoringPlatform = 'chatgpt' | 'google-ai' | 'ai-mode' | 'gemini' | 'claude' | string

export const monitoringFrequencyOptions = [
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' },
] as const

export function frequencyForPlan(planCode?: string | null, planName?: string | null, fallback: MonitoringFrequency = 'weekly'): MonitoringFrequency {
  const plan = `${planCode ?? ''} ${planName ?? ''}`.toLocaleLowerCase()
  if (plan.includes('入门') || plan.includes('basic') || plan.includes('starter'))
    return 'monthly'
  if (plan.includes('专业') || plan.includes('professional') || plan.includes('pro'))
    return 'weekly'
  return fallback === 'monthly' ? 'monthly' : 'weekly'
}

export const monitoringPlatformOptions: { value: MonitoringPlatform, label: string, mark: string, markTone: string, disabled?: boolean, hint?: string }[] = [
  { value: 'google-ai', label: 'AI Overview', mark: '✦', markTone: 'google' },
  { value: 'ai-mode', label: 'AI Mode', mark: '✧', markTone: 'ai-mode' },
  { value: 'gemini', label: 'Gemini', mark: '✦', markTone: 'gemini' },
  { value: 'chatgpt', label: 'ChatGPT', mark: '⊕', markTone: 'chatgpt' },
  { value: 'claude', label: 'Claude', mark: '✳', markTone: 'claude', disabled: true, hint: '敬请期待' },
]

const baseMonitoringPlatforms: MonitoringPlatform[] = ['google-ai', 'ai-mode', 'gemini']

export function defaultMonitoringPlatformsForPlan(planCode?: string | null, planName?: string | null): MonitoringPlatform[] {
  const plan = `${planCode ?? ''} ${planName ?? ''}`.toLocaleLowerCase()
  const platforms = [...baseMonitoringPlatforms]
  if (plan.includes('成长') || plan.includes('growth') || plan.includes('专业') || plan.includes('professional') || plan.includes('pro'))
    platforms.push('chatgpt')
  return platforms
}

export function normalizeMonitoringPlatform(platform: string): MonitoringPlatform {
  return platform === 'google_ai_overviews' || platform === 'google_ai' ? 'google-ai' : platform
}

export const initialMonitoringPlatforms: MonitoringPlatform[] = defaultMonitoringPlatformsForPlan()

export function toggleMonitoringPlatform(
  selected: readonly MonitoringPlatform[],
  platform: MonitoringPlatform,
): MonitoringPlatform[] {
  return selected.includes(platform)
    ? selected.filter(item => item !== platform)
    : [...selected, platform]
}
