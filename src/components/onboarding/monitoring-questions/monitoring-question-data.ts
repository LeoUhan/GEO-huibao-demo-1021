export interface MonitoringQuestion {
  id: string
  question: string
  keyword: string
  type: string
  persona: string
  purchaseStage: string
  intent: string
  mainConcern?: string
  personaId?: number
  questionTypeCode?: string
  purchaseStageCode?: string
  intentCode?: string
  focusCode?: string
}
