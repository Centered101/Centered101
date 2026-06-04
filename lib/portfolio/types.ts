export interface PortfolioTool {
  id: string
  name: string
  category: 'Frontend' | 'Backend' | 'Database' | 'DevOps' | 'Tools' | 'Cloud'
  icon: string | null
}

export interface LearningStoryItem {
  id: string
  year: string
  title: string
  description: string
  type: 'work' | 'education' | 'achievement'
  icon: string | null
}
