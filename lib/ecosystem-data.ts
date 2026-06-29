import {
  Activity,
  BarChart3,
  Brain,
  Briefcase,
  Cloud,
  Code2,
  Database,
  FileText,
  FolderOpen,
  Github,
  Globe,
  HardDrive,
  LayoutDashboard,
  MessageSquare,
  Monitor,
  Package,
  Rocket,
  ScrollText,
  Server,
  Settings,
  Shield,
  Star,
  Users,
  Zap,
} from 'lucide-react'

export type ServiceStatus = 'operational' | 'degraded' | 'maintenance' | 'incident'
export type ContentStatus = 'published' | 'draft' | 'archived' | 'scheduled'
export type ProjectStatus = 'active' | 'paused' | 'completed' | 'archived'
export type DomainStatus = 'active' | 'inactive' | 'maintenance' | 'pending'
export type UserStatus = 'active' | 'invited' | 'suspended'
export type AdminRole = 'owner' | 'admin' | 'developer' | 'editor' | 'viewer'
export type LogLevel = 'error' | 'warning' | 'info'

// ─── GLOBAL STATS ─────────────────────────────────────────────────────────────

export const globalStats = [
  {
    label: 'Monthly Visitors',
    value: '124,832',
    change: '+18.2%',
    trend: 'up' as const,
    description: 'Last 30 days',
    icon: Users,
  },
  {
    label: 'GitHub Stars',
    value: '2,491',
    change: '+124 this month',
    trend: 'up' as const,
    description: 'Across all repos',
    icon: Star,
  },
  {
    label: 'Published Posts',
    value: '48',
    change: '3 drafts pending',
    trend: 'neutral' as const,
    description: 'Blog & articles',
    icon: FileText,
  },
  {
    label: 'Active Projects',
    value: '12',
    change: '4 in progress',
    trend: 'neutral' as const,
    description: 'Personal & open source',
    icon: Package,
  },
  {
    label: 'Storage Used',
    value: '24.3 GB',
    change: '68% of 35 GB',
    trend: 'warning' as const,
    description: 'CDN + database',
    icon: HardDrive,
  },
  {
    label: 'API Uptime',
    value: '99.98%',
    change: 'Last 30 days',
    trend: 'up' as const,
    description: 'All endpoints',
    icon: Activity,
  },
]

// ─── RECENT ACTIVITIES ────────────────────────────────────────────────────────

export const recentActivities = [
  {
    id: 'act_001',
    type: 'deploy',
    title: 'Deployed centered101.com',
    description: 'Production deployment via Vercel — v2.4.0',
    time: '2 minutes ago',
    icon: Rocket,
    tone: 'success' as const,
  },
  {
    id: 'act_002',
    type: 'content',
    title: 'Published blog post',
    description: '"Building a Personal Digital Ecosystem"',
    time: '1 hour ago',
    icon: FileText,
    tone: 'info' as const,
  },
  {
    id: 'act_003',
    type: 'github',
    title: 'New GitHub star',
    description: 'centered101/ecosystem — 2,491 total',
    time: '3 hours ago',
    icon: Star,
    tone: 'warning' as const,
  },
  {
    id: 'act_004',
    type: 'security',
    title: 'Admin login via GitHub OAuth',
    description: 'Session from 127.0.0.1 — recognized device',
    time: '5 hours ago',
    icon: Shield,
    tone: 'neutral' as const,
  },
  {
    id: 'act_005',
    type: 'system',
    title: 'Database backup completed',
    description: '8.2 GB stored in cold storage — Singapore',
    time: '6 hours ago',
    icon: Database,
    tone: 'success' as const,
  },
  {
    id: 'act_006',
    type: 'content',
    title: 'Portfolio project updated',
    description: 'DevTools Collection v2 metadata refreshed',
    time: '12 hours ago',
    icon: Package,
    tone: 'info' as const,
  },
  {
    id: 'act_007',
    type: 'system',
    title: 'API key rotated',
    description: 'admin-service-role key renewed',
    time: '1 day ago',
    icon: Zap,
    tone: 'warning' as const,
  },
]

// ─── SYSTEM SERVICES ──────────────────────────────────────────────────────────

export const systemServices = [
  {
    id: 'svc_001',
    name: 'API Server',
    description: 'Next.js API routes — Vercel Fluid',
    status: 'operational' as ServiceStatus,
    uptime: '99.98%',
    latency: '45ms',
    region: 'SIN',
    icon: Server,
  },
  {
    id: 'svc_002',
    name: 'Database',
    description: 'PostgreSQL via Supabase Cloud',
    status: 'operational' as ServiceStatus,
    uptime: '99.99%',
    latency: '12ms',
    region: 'SIN',
    icon: Database,
  },
  {
    id: 'svc_003',
    name: 'CDN / Storage',
    description: 'Vercel Edge Network + Blob',
    status: 'operational' as ServiceStatus,
    uptime: '100%',
    latency: '8ms',
    region: 'Global',
    icon: Cloud,
  },
  {
    id: 'svc_004',
    name: 'Email Service',
    description: 'Transactional via Resend',
    status: 'degraded' as ServiceStatus,
    uptime: '97.2%',
    latency: '280ms',
    region: 'US-EAST',
    icon: MessageSquare,
  },
  {
    id: 'svc_005',
    name: 'Background Jobs',
    description: 'Cron + webhook workers',
    status: 'maintenance' as ServiceStatus,
    uptime: '—',
    latency: '—',
    region: 'SIN',
    icon: Settings,
  },
  {
    id: 'svc_006',
    name: 'AI Gateway',
    description: 'Claude API via Anthropic',
    status: 'operational' as ServiceStatus,
    uptime: '99.95%',
    latency: '180ms',
    region: 'Global',
    icon: Brain,
  },
]

// ─── SUBDOMAINS ───────────────────────────────────────────────────────────────

export const subdomains = [
  {
    id: 'sd_001',
    name: 'centered101.com',
    type: 'apex',
    status: 'active' as DomainStatus,
    ssl: true,
    sslExpiry: 'Dec 15, 2026',
    latency: '42ms',
    visits: '89,120/mo',
    description: 'Main portfolio & hub',
    provider: 'Vercel',
  },
  {
    id: 'sd_002',
    name: 'docs.centered101.com',
    type: 'subdomain',
    status: 'active' as DomainStatus,
    ssl: true,
    sslExpiry: 'Dec 15, 2026',
    latency: '38ms',
    visits: '12,841/mo',
    description: 'Documentation site',
    provider: 'Vercel',
  },
  {
    id: 'sd_003',
    name: 'api.centered101.com',
    type: 'subdomain',
    status: 'active' as DomainStatus,
    ssl: true,
    sslExpiry: 'Dec 15, 2026',
    latency: '15ms',
    visits: '428,902 req/mo',
    description: 'Public REST API',
    provider: 'Vercel',
  },
  {
    id: 'sd_004',
    name: 'status.centered101.com',
    type: 'subdomain',
    status: 'active' as DomainStatus,
    ssl: true,
    sslExpiry: 'Dec 15, 2026',
    latency: '28ms',
    visits: '3,241/mo',
    description: 'Status page',
    provider: 'Vercel',
  },
  {
    id: 'sd_005',
    name: 'projects.centered101.com',
    type: 'subdomain',
    status: 'active' as DomainStatus,
    ssl: true,
    sslExpiry: 'Dec 15, 2026',
    latency: '45ms',
    visits: '8,102/mo',
    description: 'Project showcase',
    provider: 'Vercel',
  },
  {
    id: 'sd_006',
    name: 'lab.centered101.com',
    type: 'subdomain',
    status: 'maintenance' as DomainStatus,
    ssl: true,
    sslExpiry: 'Dec 15, 2026',
    latency: '—',
    visits: '—',
    description: 'Experimental lab',
    provider: 'Vercel',
  },
]

// ─── PORTFOLIO PROJECTS ───────────────────────────────────────────────────────

export const portfolioProjects = [
  {
    id: 'pf_001',
    title: 'Centered101 Ecosystem',
    slug: 'centered101',
    description: 'Personal digital hub — portfolio, blog, open source showcase and admin control center',
    tech: ['Next.js', 'Supabase', 'TypeScript', 'Tailwind CSS'],
    status: 'active' as ProjectStatus,
    featured: true,
    stars: 12,
    liveUrl: 'https://centered101.com',
    githubUrl: 'https://github.com/Centered101/centered101',
    updatedAt: 'Jun 8, 2026',
  },
  {
    id: 'pf_002',
    title: 'DevTools Collection',
    slug: 'devtools',
    description: 'Developer utility toolkit with CLI tools, browser extensions, and web UI',
    tech: ['TypeScript', 'Node.js', 'React', 'Commander.js'],
    status: 'active' as ProjectStatus,
    featured: true,
    stars: 284,
    liveUrl: 'https://devtools.centered101.com',
    githubUrl: 'https://github.com/Centered101/devtools-collection',
    updatedAt: 'Jun 5, 2026',
  },
  {
    id: 'pf_003',
    title: 'API Studio',
    slug: 'api-studio',
    description: 'Visual REST API builder and tester with request chaining',
    tech: ['React', 'Electron', 'TypeScript', 'CodeMirror'],
    status: 'paused' as ProjectStatus,
    featured: false,
    stars: 89,
    liveUrl: null,
    githubUrl: 'https://github.com/Centered101/api-studio',
    updatedAt: 'May 12, 2026',
  },
  {
    id: 'pf_004',
    title: 'Markdown Editor Pro',
    slug: 'markdown-editor',
    description: 'Full-featured markdown editor with live preview, themes, and export',
    tech: ['React', 'CodeMirror', 'Tailwind', 'Remark'],
    status: 'completed' as ProjectStatus,
    featured: false,
    stars: 142,
    liveUrl: 'https://md.centered101.com',
    githubUrl: 'https://github.com/Centered101/markdown-editor-pro',
    updatedAt: 'Apr 20, 2026',
  },
]

// ─── PORTFOLIO SKILLS ─────────────────────────────────────────────────────────

export const portfolioSkills = [
  {
    category: 'Frontend',
    level: 'expert',
    skills: ['React', 'Next.js', 'TypeScript', 'Tailwind CSS', 'Framer Motion'],
  },
  {
    category: 'Backend',
    level: 'advanced',
    skills: ['Node.js', 'FastAPI (Python)', 'PostgreSQL', 'Redis', 'REST / GraphQL'],
  },
  {
    category: 'DevOps & Cloud',
    level: 'advanced',
    skills: ['Docker', 'GitHub Actions', 'Vercel', 'Supabase', 'Cloudflare'],
  },
  {
    category: 'AI / ML',
    level: 'intermediate',
    skills: ['Claude API', 'OpenAI SDK', 'LangChain', 'Prompt Engineering', 'RAG'],
  },
  {
    category: 'Tools & Design',
    level: 'expert',
    skills: ['Git', 'VS Code', 'Figma', 'Notion', 'Linear'],
  },
]

// ─── PORTFOLIO TIMELINE ───────────────────────────────────────────────────────

export const portfolioTimeline = [
  {
    id: 'tl_001',
    year: '2026',
    title: 'Centered101 v2 — Enterprise Admin',
    type: 'project',
    description: 'Launched full enterprise-grade admin control center',
  },
  {
    id: 'tl_002',
    year: '2025',
    title: 'Freelance Full-Stack Developer',
    type: 'work',
    description: 'Building products for startups in Southeast Asia',
  },
  {
    id: 'tl_003',
    year: '2024',
    title: 'DevTools Collection — 100+ GitHub Stars',
    type: 'achievement',
    description: 'First open source project to reach 100+ stars',
  },
  {
    id: 'tl_004',
    year: '2023',
    title: 'B.Sc. Computer Science',
    type: 'education',
    description: 'Graduated with First Class Honours',
  },
]

// ─── CERTIFICATIONS ───────────────────────────────────────────────────────────

export const certifications = [
  {
    id: 'cert_001',
    name: 'AWS Certified Developer – Associate',
    issuer: 'Amazon Web Services',
    date: 'Mar 2026',
    expiry: 'Mar 2029',
    status: 'active',
  },
  {
    id: 'cert_002',
    name: 'Supabase Certified Builder',
    issuer: 'Supabase',
    date: 'Jan 2026',
    expiry: 'Jan 2028',
    status: 'active',
  },
  {
    id: 'cert_003',
    name: 'Next.js Certified Developer',
    issuer: 'Vercel',
    date: 'Nov 2025',
    expiry: 'Nov 2027',
    status: 'active',
  },
  {
    id: 'cert_004',
    name: 'GitHub Foundations',
    issuer: 'GitHub',
    date: 'Aug 2025',
    expiry: 'Aug 2027',
    status: 'active',
  },
]

// ─── BLOG POSTS ───────────────────────────────────────────────────────────────

export const blogPosts = [
  {
    id: 'post_001',
    title: 'Building a Personal Digital Ecosystem',
    slug: 'personal-digital-ecosystem',
    status: 'published' as ContentStatus,
    views: 4812,
    readTime: '8 min',
    publishedAt: 'Jun 7, 2026',
    category: 'Development',
    tags: ['ecosystem', 'development', 'personal'],
  },
  {
    id: 'post_002',
    title: 'Supabase Row-Level Security Patterns',
    slug: 'supabase-rls-patterns',
    status: 'published' as ContentStatus,
    views: 3241,
    readTime: '12 min',
    publishedAt: 'May 28, 2026',
    category: 'Database',
    tags: ['supabase', 'security', 'postgresql'],
  },
  {
    id: 'post_003',
    title: 'Next.js App Router — The Complete Guide',
    slug: 'nextjs-app-router-guide',
    status: 'published' as ContentStatus,
    views: 6104,
    readTime: '15 min',
    publishedAt: 'May 14, 2026',
    category: 'Frontend',
    tags: ['nextjs', 'react', 'frontend'],
  },
  {
    id: 'post_004',
    title: 'AI-Powered Admin Dashboard Design',
    slug: 'ai-admin-dashboard-design',
    status: 'draft' as ContentStatus,
    views: 0,
    readTime: '10 min',
    publishedAt: null,
    category: 'Design',
    tags: ['ai', 'dashboard', 'ux'],
  },
  {
    id: 'post_005',
    title: 'TypeScript 5.5 New Features Overview',
    slug: 'typescript-55-features',
    status: 'scheduled' as ContentStatus,
    views: 0,
    readTime: '7 min',
    publishedAt: 'Jun 15, 2026',
    category: 'Development',
    tags: ['typescript', 'javascript'],
  },
  {
    id: 'post_006',
    title: 'Cloudflare Zero Trust Setup Guide',
    slug: 'cloudflare-zero-trust',
    status: 'archived' as ContentStatus,
    views: 1284,
    readTime: '18 min',
    publishedAt: 'Jan 12, 2026',
    category: 'DevOps',
    tags: ['cloudflare', 'security', 'devops'],
  },
]

// ─── PERSONAL PROJECTS ────────────────────────────────────────────────────────

export const personalProjects = [
  {
    id: 'proj_001',
    name: 'Centered101 Ecosystem v2',
    description: 'Personal digital operating system — enterprise admin rebuild',
    status: 'active' as ProjectStatus,
    priority: 'high' as const,
    progress: 72,
    milestone: 'Admin Control Center launch',
    dueDate: 'Jun 30, 2026',
    tech: ['Next.js', 'Supabase', 'TypeScript'],
    tasks: { total: 48, done: 34 },
  },
  {
    id: 'proj_002',
    name: 'DevTools CLI v3',
    description: 'Next major version with plugin architecture and marketplace',
    status: 'active' as ProjectStatus,
    priority: 'medium' as const,
    progress: 45,
    milestone: 'Plugin API design',
    dueDate: 'Jul 15, 2026',
    tech: ['Node.js', 'TypeScript', 'Commander.js'],
    tasks: { total: 32, done: 14 },
  },
  {
    id: 'proj_003',
    name: 'Open Source Docs Site',
    description: 'Unified documentation hub for all open source projects',
    status: 'paused' as ProjectStatus,
    priority: 'low' as const,
    progress: 20,
    milestone: 'Content migration',
    dueDate: 'Aug 1, 2026',
    tech: ['Docusaurus', 'Markdown', 'GitHub Actions'],
    tasks: { total: 24, done: 5 },
  },
  {
    id: 'proj_004',
    name: 'API Studio Desktop',
    description: 'Cross-platform REST API testing and documentation tool',
    status: 'archived' as ProjectStatus,
    priority: 'low' as const,
    progress: 60,
    milestone: 'v1.0 Beta release',
    dueDate: null,
    tech: ['Electron', 'React', 'TypeScript'],
    tasks: { total: 40, done: 24 },
  },
]

// ─── GITHUB REPOS ─────────────────────────────────────────────────────────────

export const githubRepos = [
  {
    id: 'repo_001',
    name: 'centered101',
    fullName: 'Centered101/centered101',
    description: 'Personal digital hub and portfolio — Next.js + Supabase',
    language: 'TypeScript',
    stars: 12,
    forks: 3,
    openIssues: 4,
    visibility: 'public',
    lastCommit: '2 hours ago',
    topics: ['portfolio', 'nextjs', 'supabase', 'admin'],
  },
  {
    id: 'repo_002',
    name: 'devtools-collection',
    fullName: 'Centered101/devtools-collection',
    description: 'Developer utility toolkit — CLI + browser extensions',
    language: 'TypeScript',
    stars: 284,
    forks: 41,
    openIssues: 12,
    visibility: 'public',
    lastCommit: '1 day ago',
    topics: ['cli', 'developer-tools', 'typescript', 'productivity'],
  },
  {
    id: 'repo_003',
    name: 'markdown-editor-pro',
    fullName: 'Centered101/markdown-editor-pro',
    description: 'Full-featured markdown editor with live preview and export',
    language: 'TypeScript',
    stars: 142,
    forks: 18,
    openIssues: 7,
    visibility: 'public',
    lastCommit: '5 days ago',
    topics: ['markdown', 'editor', 'react', 'codemirror'],
  },
  {
    id: 'repo_004',
    name: 'api-studio',
    fullName: 'Centered101/api-studio',
    description: 'Visual REST API builder and tester',
    language: 'TypeScript',
    stars: 89,
    forks: 11,
    openIssues: 3,
    visibility: 'public',
    lastCommit: '3 weeks ago',
    topics: ['api', 'rest', 'electron', 'testing'],
  },
  {
    id: 'repo_005',
    name: 'ecosystem-admin',
    fullName: 'Centered101/ecosystem-admin',
    description: 'Enterprise admin control center for personal digital ecosystem',
    language: 'TypeScript',
    stars: 8,
    forks: 1,
    openIssues: 2,
    visibility: 'private',
    lastCommit: '30 minutes ago',
    topics: ['admin', 'dashboard', 'nextjs', 'enterprise'],
  },
]

// ─── DIGITAL ASSETS ───────────────────────────────────────────────────────────

export const digitalAssets = [
  {
    id: 'asset_001',
    name: 'centered101-og.png',
    path: '/public/og/',
    type: 'image/png',
    size: '284 KB',
    bucket: 'public',
    updatedAt: 'Jun 8, 2026',
  },
  {
    id: 'asset_002',
    name: 'resume-2026.pdf',
    path: '/public/documents/',
    type: 'application/pdf',
    size: '482 KB',
    bucket: 'public',
    updatedAt: 'Jun 5, 2026',
  },
  {
    id: 'asset_003',
    name: 'devtools-poster.webp',
    path: '/projects/devtools/',
    type: 'image/webp',
    size: '841 KB',
    bucket: 'projects',
    updatedAt: 'Jun 3, 2026',
  },
  {
    id: 'asset_004',
    name: 'blog-cover-ecosystem.jpg',
    path: '/blog/covers/',
    type: 'image/jpeg',
    size: '612 KB',
    bucket: 'content',
    updatedAt: 'Jun 7, 2026',
  },
  {
    id: 'asset_005',
    name: 'db-backup-2026-06-08.sql.gz',
    path: '/backups/',
    type: 'application/gzip',
    size: '8.2 GB',
    bucket: 'backups',
    updatedAt: 'Jun 8, 2026',
  },
  {
    id: 'asset_006',
    name: 'centered101-brand-kit.zip',
    path: '/brand/',
    type: 'application/zip',
    size: '12.4 MB',
    bucket: 'public',
    updatedAt: 'May 30, 2026',
  },
]

// ─── DATABASE TABLES ──────────────────────────────────────────────────────────

export const databaseTables = [
  { id: 'tbl_001', name: 'profiles', schema: 'public', rows: 1284, size: '2.4 MB', lastModified: 'Jun 8, 2026' },
  { id: 'tbl_002', name: 'portfolio_projects', schema: 'public', rows: 12, size: '128 KB', lastModified: 'Jun 8, 2026' },
  { id: 'tbl_003', name: 'blog_posts', schema: 'public', rows: 48, size: '512 KB', lastModified: 'Jun 7, 2026' },
  { id: 'tbl_004', name: 'content_tags', schema: 'public', rows: 84, size: '64 KB', lastModified: 'Jun 5, 2026' },
  { id: 'tbl_005', name: 'contacts', schema: 'public', rows: 42, size: '128 KB', lastModified: 'Jun 2, 2026' },
  { id: 'tbl_006', name: 'admin_users', schema: 'admin', rows: 3, size: '16 KB', lastModified: 'Jun 8, 2026' },
  { id: 'tbl_007', name: 'audit_logs', schema: 'admin', rows: 8291, size: '4.8 MB', lastModified: 'Jun 8, 2026' },
  { id: 'tbl_008', name: 'analytics_events', schema: 'analytics', rows: 124832, size: '24.1 MB', lastModified: 'Jun 8, 2026' },
  { id: 'tbl_009', name: 'roles', schema: 'admin', rows: 8, size: '8 KB', lastModified: 'May 12, 2026' },
  { id: 'tbl_010', name: 'github_repos_cache', schema: 'public', rows: 5, size: '32 KB', lastModified: 'Jun 8, 2026' },
]

// ─── ANALYTICS ────────────────────────────────────────────────────────────────

export const analyticsData = {
  overview: {
    visitors: { value: '12,842', change: '+18.2%', period: '30 days' },
    pageViews: { value: '48,291', change: '+12.4%', period: '30 days' },
    avgSession: { value: '3m 42s', change: '+8.1%', period: '30 days' },
    bounceRate: { value: '32.4%', change: '-2.1%', period: '30 days' },
  },
  topPages: [
    { path: '/', title: 'Home', views: 18241, unique: 12841, bounce: '28%' },
    { path: '/portfolio', title: 'Portfolio', views: 8102, unique: 6241, bounce: '32%' },
    { path: '/blog', title: 'Blog', views: 6241, unique: 4812, bounce: '41%' },
    { path: '/projects', title: 'Projects', views: 4812, unique: 3941, bounce: '35%' },
    { path: '/open-source', title: 'Open Source', views: 2401, unique: 2184, bounce: '22%' },
    { path: '/about', title: 'About', views: 1841, unique: 1642, bounce: '45%' },
  ],
  traffic: [
    { source: 'Organic Search', visits: 5842, percent: 47 },
    { source: 'Direct', visits: 3241, percent: 26 },
    { source: 'GitHub', visits: 1982, percent: 16 },
    { source: 'Social Media', visits: 841, percent: 7 },
    { source: 'Other', visits: 494, percent: 4 },
  ],
  devices: [
    { type: 'Desktop', percent: 62, color: '#409EFE' },
    { type: 'Mobile', percent: 31, color: '#22C55E' },
    { type: 'Tablet', percent: 7, color: '#F59E0B' },
  ],
  weeklyVisitors: [
    { day: 'Mon', value: 1842 },
    { day: 'Tue', value: 2104 },
    { day: 'Wed', value: 1984 },
    { day: 'Thu', value: 2481 },
    { day: 'Fri', value: 2284 },
    { day: 'Sat', value: 1241 },
    { day: 'Sun', value: 984 },
  ],
}

// ─── AI TOOLS ─────────────────────────────────────────────────────────────────

export const aiTools = [
  {
    id: 'ai_001',
    name: 'Content Generator',
    description: 'Generate blog posts and articles with Claude AI',
    model: 'claude-sonnet-4-6',
    status: 'active',
    usageToday: '12,400 tokens',
    usageMonth: '284,100 tokens',
    category: 'content',
  },
  {
    id: 'ai_002',
    name: 'Code Reviewer',
    description: 'Automated PR and code quality analysis',
    model: 'claude-sonnet-4-6',
    status: 'active',
    usageToday: '8,200 tokens',
    usageMonth: '142,800 tokens',
    category: 'development',
  },
  {
    id: 'ai_003',
    name: 'SEO Optimizer',
    description: 'Generate meta tags, titles, and descriptions',
    model: 'claude-haiku-4-5-20251001',
    status: 'active',
    usageToday: '3,100 tokens',
    usageMonth: '84,200 tokens',
    category: 'content',
  },
  {
    id: 'ai_004',
    name: 'Analytics Insights',
    description: 'Analyze traffic data and generate insights reports',
    model: 'claude-opus-4-8',
    status: 'paused',
    usageToday: '0 tokens',
    usageMonth: '48,100 tokens',
    category: 'analytics',
  },
]

// ─── PROMPT LIBRARY ───────────────────────────────────────────────────────────

export const promptLibrary = [
  {
    id: 'prompt_001',
    name: 'Blog Post Draft',
    description: 'Create a full blog post draft from a topic and keywords',
    category: 'Content',
    uses: 42,
    lastUsed: 'Jun 7, 2026',
  },
  {
    id: 'prompt_002',
    name: 'Code Review',
    description: 'Review code for correctness, security, and best practices',
    category: 'Development',
    uses: 88,
    lastUsed: 'Jun 8, 2026',
  },
  {
    id: 'prompt_003',
    name: 'Project Description',
    description: 'Generate a compelling project description for portfolio',
    category: 'Portfolio',
    uses: 12,
    lastUsed: 'Jun 5, 2026',
  },
  {
    id: 'prompt_004',
    name: 'SEO Meta Tags',
    description: 'Generate optimized title, description, and Open Graph tags',
    category: 'SEO',
    uses: 64,
    lastUsed: 'Jun 8, 2026',
  },
  {
    id: 'prompt_005',
    name: 'Bug Analysis',
    description: 'Analyze error logs and suggest root causes and fixes',
    category: 'Development',
    uses: 31,
    lastUsed: 'Jun 6, 2026',
  },
]

// ─── BUSINESS ─────────────────────────────────────────────────────────────────

export const businessContacts = [
  {
    id: 'biz_001',
    name: 'Tech Startup SG',
    email: 'hello@techstartup.sg',
    type: 'client',
    status: 'active',
    value: '$4,200',
    project: 'Full-stack dashboard',
    lastContact: 'Jun 5, 2026',
  },
  {
    id: 'biz_002',
    name: 'Dev Agency TH',
    email: 'projects@devagency.co.th',
    type: 'lead',
    status: 'active',
    value: '$8,500',
    project: 'E-commerce platform',
    lastContact: 'Jun 1, 2026',
  },
  {
    id: 'biz_003',
    name: 'Open Source Sponsor',
    email: 'sponsor@oss-fund.org',
    type: 'partner',
    status: 'active',
    value: '$500/mo',
    project: 'DevTools Collection',
    lastContact: 'May 28, 2026',
  },
  {
    id: 'biz_004',
    name: 'Solo Creator',
    email: 'creator@example.com',
    type: 'lead',
    status: 'inactive',
    value: '$1,200',
    project: 'Personal website',
    lastContact: 'Apr 15, 2026',
  },
]

// ─── ADMIN USERS ──────────────────────────────────────────────────────────────

export const adminUsers = [
  {
    id: 'adm_001',
    name: 'Centered101',
    email: 'admin@centered101.com',
    role: 'owner' as AdminRole,
    status: 'active' as UserStatus,
    githubUsername: 'Centered101',
    lastLogin: 'Jun 8, 2026 18:42',
    sessions: 1,
  },
  {
    id: 'adm_002',
    name: 'Dev Assistant',
    email: 'dev@centered101.com',
    role: 'developer' as AdminRole,
    status: 'invited' as UserStatus,
    githubUsername: null,
    lastLogin: 'Never',
    sessions: 0,
  },
]

// ─── SECURITY EVENTS ──────────────────────────────────────────────────────────

export const securityEvents = [
  {
    id: 'sec_001',
    type: 'login',
    description: 'Admin login via GitHub OAuth',
    ip: '127.0.0.1',
    time: 'Jun 8, 2026 18:42',
    status: 'success',
    actor: 'Centered101',
  },
  {
    id: 'sec_002',
    type: 'login_failed',
    description: 'Failed login attempt (invalid credentials)',
    ip: '192.168.1.14',
    time: 'Jun 8, 2026 14:12',
    status: 'blocked',
    actor: 'unknown',
  },
  {
    id: 'sec_003',
    type: 'api_key',
    description: 'API key rotated — admin-service-role',
    ip: '127.0.0.1',
    time: 'Jun 7, 2026 10:00',
    status: 'success',
    actor: 'Centered101',
  },
  {
    id: 'sec_004',
    type: 'permission',
    description: 'Role assigned — Dev Assistant → developer',
    ip: '127.0.0.1',
    time: 'Jun 6, 2026 16:28',
    status: 'success',
    actor: 'Centered101',
  },
]

// ─── API KEYS ─────────────────────────────────────────────────────────────────

export const apiKeys = [
  {
    id: 'key_001',
    name: 'Public API',
    key: 'pub_c101_••••••••••••_3Kx9',
    scope: 'read:public',
    lastUsed: '2 minutes ago',
    createdAt: 'Jan 1, 2026',
    status: 'active',
  },
  {
    id: 'key_002',
    name: 'Admin Service Role',
    key: 'adm_c101_••••••••••••_M9qP',
    scope: 'admin:all',
    lastUsed: '5 hours ago',
    createdAt: 'Jan 1, 2026',
    status: 'active',
  },
  {
    id: 'key_003',
    name: 'Analytics Ingestion',
    key: 'ingest_c101_••••••••••••_8Qa',
    scope: 'write:analytics',
    lastUsed: '1 hour ago',
    createdAt: 'Feb 15, 2026',
    status: 'active',
  },
  {
    id: 'key_004',
    name: 'Webhook Signing Secret',
    key: 'whsec_c101_••••••••••••_2Lp',
    scope: 'webhooks:sign',
    lastUsed: 'Never',
    createdAt: 'Mar 1, 2026',
    status: 'active',
  },
]

// ─── ERROR LOGS ───────────────────────────────────────────────────────────────

export const errorLogs = [
  {
    id: 'err_001',
    level: 'error' as LogLevel,
    message: 'Database connection timeout after 30s',
    path: '/api/analytics',
    statusCode: 503,
    time: 'Jun 8, 2026 10:12',
    count: 3,
  },
  {
    id: 'err_002',
    level: 'warning' as LogLevel,
    message: 'Email delivery delay detected — Resend queue backed up',
    path: '/api/contact',
    statusCode: 202,
    time: 'Jun 8, 2026 08:45',
    count: 12,
  },
  {
    id: 'err_003',
    level: 'info' as LogLevel,
    message: 'Cache miss rate above 40% threshold',
    path: '/api/portfolio',
    statusCode: 200,
    time: 'Jun 7, 2026 22:00',
    count: 284,
  },
  {
    id: 'err_004',
    level: 'error' as LogLevel,
    message: '401 Unauthorized — expired GitHub token in webhook handler',
    path: '/api/github/webhook',
    statusCode: 401,
    time: 'Jun 7, 2026 14:22',
    count: 1,
  },
]

// ─── PERFORMANCE METRICS ──────────────────────────────────────────────────────

export const performanceMetrics = [
  { name: 'Largest Contentful Paint', value: '1.2s', score: 92, target: '< 2.5s' },
  { name: 'First Input Delay', value: '8ms', score: 98, target: '< 100ms' },
  { name: 'Cumulative Layout Shift', value: '0.02', score: 99, target: '< 0.1' },
  { name: 'Time to First Byte', value: '180ms', score: 95, target: '< 800ms' },
  { name: 'Total Blocking Time', value: '42ms', score: 96, target: '< 200ms' },
]

// ─── QUICK ACTIONS ────────────────────────────────────────────────────────────

export const quickActions = [
  { label: 'New Blog Post', icon: FileText, href: '/admin/content', description: 'Write & publish' },
  { label: 'Add Project', icon: Package, href: '/admin/portfolio', description: 'Update portfolio' },
  { label: 'Run Query', icon: Database, href: '/admin/database', description: 'DB explorer' },
  { label: 'View Analytics', icon: BarChart3, href: '/admin/analytics', description: 'Site stats' },
  { label: 'Deploy', icon: Rocket, href: '/admin/monitoring', description: 'Vercel deploy' },
  { label: 'Security Audit', icon: Shield, href: '/admin/security', description: 'Review events' },
]

// ─── STORAGE BREAKDOWN ────────────────────────────────────────────────────────

export const storageBreakdown = [
  { bucket: 'backups', used: 12.1, color: '#409EFE' },
  { bucket: 'content', used: 6.4, color: '#22C55E' },
  { bucket: 'projects', used: 3.8, color: '#F59E0B' },
  { bucket: 'public', used: 2.0, color: '#A1A1AA' },
]

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

export const notifications = [
  {
    id: 'notif_001',
    type: 'deploy',
    title: 'Deployment succeeded',
    message: 'centered101.com v2.4.0 is live',
    time: '2 min ago',
    read: false,
  },
  {
    id: 'notif_002',
    type: 'warning',
    title: 'Storage at 68%',
    message: 'Consider archiving old backups',
    time: '1 hr ago',
    read: false,
  },
  {
    id: 'notif_003',
    type: 'security',
    title: 'Failed login blocked',
    message: 'Unauthorized attempt from 192.168.1.14',
    time: '5 hr ago',
    read: true,
  },
  {
    id: 'notif_004',
    type: 'info',
    title: 'GitHub Stars milestone',
    message: 'devtools-collection reached 284 stars',
    time: '1 day ago',
    read: true,
  },
]
