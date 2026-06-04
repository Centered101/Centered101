export interface WakaTimeLanguage {
  name: string
  totalSeconds: number
  text: string
  percent: number
  color: string | null
}

export interface WakaTimeProject {
  name: string
  totalSeconds: number
  text: string
  percent: number
  color: string | null
}

export interface WakaTimeStats {
  configured: boolean
  range: string
  humanReadableTotal: string
  humanReadableDailyAverage: string
  totalSeconds: number
  dailyAverageSeconds: number
  bestDayText: string | null
  bestDayDate: string | null
  languages: WakaTimeLanguage[]
  projects: WakaTimeProject[]
}
