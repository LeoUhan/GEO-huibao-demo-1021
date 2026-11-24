import type { ReportRecord } from './report-center-data'

const key = 'geo-expert-reports-demo-v1'
const quotaKey = 'geo-expert-report-quota-v1'
export const expertSummaryDefault = '本月 GEO 表现、关键变化与优化建议。'
export const expertReportName = 'GEO 专家服务月度诊断报告'

function sample(id: string, month: string, status: 'draft' | 'delivered', format: 'html' | 'pdf'): ReportRecord {
  const delivered = status === 'delivered'
  return {
    id,
    type: 'expert',
    title: `APW Waterjet · ${month.slice(0, 4)} 年 ${Number(month.slice(5))} 月 ${expertReportName}`,
    period: `${month.slice(0, 4)} 年 ${Number(month.slice(5))} 月`,
    date: delivered ? `${month}-20` : new Date().toISOString().slice(0, 10),
    summary: delivered ? expertSummaryDefault : '本月诊断报告尚未提交，客户暂不可见。',
    tags: delivered ? ['月度诊断', format.toUpperCase()] : ['待交付', format.toUpperCase()],
    sections: [],
    questionIds: [],
    status: 'generated',
    expert: { marketId: 1, month, format, fileName: `APW-GEO-${month}.${format}`, delivery: status, deliveredAt: delivered ? `${month}-20` : undefined },
  }
}

export function loadExpertReports(): ReportRecord[] {
  try {
    const stored = localStorage.getItem(key)
    if (stored)
      return JSON.parse(stored) as ReportRecord[]
  }
  catch { /* Keep the demo usable when storage is unavailable. */ }
  return [sample('expert-demo-2026-11', '2026-11', 'draft', 'html'), sample('expert-demo-2026-10', '2026-10', 'delivered', 'html')]
}

export function saveExpertReports(reports: ReportRecord[]) {
  localStorage.setItem(key, JSON.stringify(reports))
}

export function getExpertQuota(): number {
  const value = Number(localStorage.getItem(quotaKey))
  return localStorage.getItem(quotaKey) === null ? 2 : Number.isFinite(value) ? Math.max(0, value) : 2
}

export function setExpertQuota(value: number) {
  localStorage.setItem(quotaKey, String(Math.max(0, value)))
}

function fileDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('geo-expert-report-demo-files', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('files')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveExpertFile(id: string, file: File): Promise<void> {
  const db = await fileDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction('files', 'readwrite')
    transaction.objectStore('files').put(file, id)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
  db.close()
}

export async function loadExpertFile(id: string): Promise<Blob | null> {
  const db = await fileDatabase()
  const result = await new Promise<Blob | null>((resolve, reject) => {
    const request = db.transaction('files').objectStore('files').get(id)
    request.onsuccess = () => resolve(request.result instanceof Blob ? request.result : null)
    request.onerror = () => reject(request.error)
  })
  db.close()
  return result
}

export function exampleExpertHtml(report: ReportRecord): Blob {
  const title = report.title.replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  return new Blob([`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>${title}</title><style>body{font-family:system-ui,sans-serif;max-width:920px;margin:7vh auto;padding:32px;color:#1d2b45}h1{font-size:32px}p{line-height:1.8;color:#64748b}.card{border:1px solid #dce5f2;border-radius:18px;padding:32px;margin-top:32px}</style><h1>${title}</h1><div class="card"><h2>月度诊断概览</h2><p>${report.summary}</p></div></html>`], { type: 'text/html' })
}
