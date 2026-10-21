export type MonitoringFrequency = 'daily' | 'weekly' | 'monthly'

export type MonitoringPlatform = 'chatgpt' | 'perplexity' | 'google_ai_overviews' | 'gemini' | string

export const monitoringFrequencyOptions = [
  { value: 'daily', label: '每日' },
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' },
] as const

export const monitoringPlatformOptions: { value: MonitoringPlatform, label: string, mark: string, markTone: string }[] = [
  { value: 'chatgpt', label: 'ChatGPT', mark: '⊕', markTone: 'chatgpt' },
  { value: 'perplexity', label: 'Perplexity', mark: '⋈', markTone: 'perplexity' },
  { value: 'google_ai_overviews', label: 'Google AI Overviews', mark: '✦', markTone: 'google' },
  { value: 'gemini', label: 'Gemini', mark: '✦', markTone: 'gemini' },
]

export const initialMonitoringPlatforms: MonitoringPlatform[] = monitoringPlatformOptions.map(platform => platform.value)

export function toggleMonitoringPlatform(
  selected: readonly MonitoringPlatform[],
  platform: MonitoringPlatform,
): MonitoringPlatform[] {
  return selected.includes(platform)
    ? selected.filter(item => item !== platform)
    : [...selected, platform]
}
