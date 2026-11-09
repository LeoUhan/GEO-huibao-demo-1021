import type { MockRoundConfiguration } from './state'

function brandNames(brand: MockRoundConfiguration['brand']) {
  return [...new Set([brand.brandName, ...brand.aliasNames.split(/[,，、;；\n]/)].map(value => value.trim().toLowerCase()).filter(Boolean))].sort()
}

function siteDomain(value: string) {
  const text = value.trim().toLowerCase()
  if (!text)
    return ''
  try {
    return new URL(text.includes('://') ? text : `https://${text}`).hostname.replace(/^www\./, '')
  }
  catch {
    return text
  }
}

export function brandBaselineChanges(previous: MockRoundConfiguration['brand'], next: MockRoundConfiguration['brand']) {
  return {
    brandBaseline: JSON.stringify(brandNames(previous)) !== JSON.stringify(brandNames(next)),
    citationBaseline: siteDomain(previous.siteUrl) !== siteDomain(next.siteUrl),
  }
}

export function questionSetChanged<T extends { id: string | number }>(
  previous: readonly T[],
  next: readonly T[],
  text: (question: T) => string,
) {
  return JSON.stringify(previous.map(item => JSON.stringify([item.id, text(item).trim()])).sort()) !== JSON.stringify(next.map(item => JSON.stringify([item.id, text(item).trim()])).sort())
}
