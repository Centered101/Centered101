export const PORTFOLIO_TOOL_GROUP_ORDER = [
  'Language',
  'Library',
  'Editor',
  'Design',
  'Gaming',
  'Software',
  'Cloud',
  'Database',
  'AI',
  // Legacy categories stay last so older data still renders in a predictable place.
  'Frontend',
  'Backend',
  'DevOps',
  'Tools',
]

export const PORTFOLIO_TOOL_PRIMARY_GROUPS = [
  'Language',
  'Library',
  'Editor',
  'Design',
  'Gaming',
  'Software',
  'Cloud',
  'Database',
  'AI',
]

const LEGACY_AUTO_GROUPS = new Set(['Frontend', 'Backend', 'DevOps', 'Tools'])

const TOOL_NAME_GROUPS: Record<string, string> = {
  html: 'Language',
  html5: 'Language',
  css: 'Language',
  css3: 'Language',
  javascript: 'Language',
  typescript: 'Language',
  python: 'Language',
  'c++': 'Language',
  c: 'Language',
  react: 'Library',
  'next.js': 'Library',
  nextjs: 'Library',
  jquery: 'Library',
  'tailwind css': 'Library',
  tailwindcss: 'Library',
  vscode: 'Editor',
  'vs code': 'Editor',
  obsidian: 'Editor',
  figma: 'Design',
  adobe: 'Design',
  blender: 'Design',
  godot: 'Gaming',
  cloudflare: 'Cloud',
  netlify: 'Cloud',
  vercel: 'Cloud',
  'google cloud': 'Cloud',
  firebase: 'Cloud',
  postgresql: 'Database',
  supabase: 'Database',
  git: 'Software',
  github: 'Software',
  npm: 'Software',
  'node.js': 'Software',
  nodejs: 'Software',
  postman: 'Software',
  notion: 'Software',
  ubuntu: 'Software',
  windows: 'Software',
  'kali linux': 'Software',
  codex: 'AI',
  gemini: 'AI',
  openai: 'AI',
  chatgpt: 'AI',
  stripe: 'Software',
}

export function getPortfolioToolGroup(tool: { name?: string | null; category?: string | null }) {
  const category = (tool.category || '').trim()
  const nameKey = (tool.name || '').trim().toLowerCase()
  if (category && !LEGACY_AUTO_GROUPS.has(category)) return category
  return TOOL_NAME_GROUPS[nameKey] ?? (category || 'Tools')
}

export function comparePortfolioToolGroups(a: string, b: string) {
  const ia = PORTFOLIO_TOOL_GROUP_ORDER.indexOf(a)
  const ib = PORTFOLIO_TOOL_GROUP_ORDER.indexOf(b)
  return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
}
