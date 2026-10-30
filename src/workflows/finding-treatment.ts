import type { AuditFinding } from '../data/geo-data'

export function isAdviceFinding(finding: AuditFinding) {
  return finding.route === 'advice'
}

export function isKnowledgeFinding(finding: AuditFinding) {
  return finding.route === 'knowledge'
}

export function isReadOnlyFinding(finding: AuditFinding) {
  return isAdviceFinding(finding) || isKnowledgeFinding(finding)
}

export function findingRouteLabel(finding: AuditFinding) {
  if (isKnowledgeFinding(finding)) return '官网内容 · 待补充知识'
  if (isAdviceFinding(finding))
    return `${finding.category ?? '官网内容'} · 仅提供建议`
  if (finding.route === 'strategy')
    return '官网内容 · 需要审核'
  if (finding.id === 'F9')
    return '信息口径 · 确认后处理'
  return '官网技术 · 直接处理'
}
