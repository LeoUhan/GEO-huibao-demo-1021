export interface CredibilityPresentation {
  label: string
  reason: string
}

const gradeLabels: Record<string, string> = {
  high: '可信度高',
  medium: '可信度中',
  moderate: '可信度中',
  low: '可信度低',
  高: '可信度高',
  中: '可信度中',
  低: '可信度低',
}

export function presentCredibility(level: string | null | undefined): CredibilityPresentation {
  const normalized = level?.trim().toLowerCase() ?? ''
  const label = gradeLabels[normalized]
  if (label) {
    return {
      label,
      reason: '可信度等级由服务端综合评估样本质量与监测稳定性后返回。',
    }
  }

  if (normalized === 'trend' || normalized === 'trend-level' || normalized === 'trend_level') {
    return {
      label: '可信度待评估',
      reason: '服务端当前返回趋势级口径，未提供高、中、低可信度评级。',
    }
  }

  return {
    label: '',
    reason: '',
  }
}
