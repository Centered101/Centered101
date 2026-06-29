export interface PortfolioTool {
  id: string
  name: string
  // Free-form so custom categories can be added in the admin. Common values:
  // Language, Library, Editor, Design, Gaming, Software, Cloud, Database.
  category: string
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
