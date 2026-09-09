'use client'

import Image from 'next/image'
import { FormEvent, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import {
  faMagnifyingGlass, faBookmark, faStopwatch, faHourglass,
  faNoteSticky, faKeyboard, faImages, faServer, faPlay, faPause,
  faRotateLeft, faChevronLeft, faChevronRight, faVolumeHigh,
  faVolumeXmark, faRightFromBracket, faLock, faArrowUpRightFromSquare,
  faLayerGroup, faCode, faGlobe, faUser, faStar, faCopy,
  faTerminal, faCloud, faSun, faCloudRain, faSnowflake, faWind,
  faBolt, faWifi, faTriangleExclamation, faSpinner, faChevronDown,
  faFloppyDisk, faCircleInfo, faLink, faShuffle, faChevronUp,
  faBroadcastTower,
} from '@fortawesome/free-solid-svg-icons'
import { faGithub } from '@fortawesome/free-brands-svg-icons'
import { Chart as ChartJS, ArcElement, Tooltip as ChartTooltip } from 'chart.js'
import { Doughnut } from 'react-chartjs-2'
import { toast } from 'sonner'
import { useAdminAuth } from '@/components/admin/AdminAuthProvider'

ChartJS.register(ArcElement, ChartTooltip)

// ── Design Tokens (Supabase Radix Slate dark × cyberpunk) ────────────────────
// Supabase uses Radix slate scale for surfaces + white-alpha borders
// We overlay #1ED760 (green) and #409EFE (blue) as neon cyberpunk accents
const C = {
  bg:       '#0d0e11',   // slate-1 tinted
  s100:     '#111318',   // slate-2 – panels
  s200:     '#161b22',   // slate-3 – cards
  s300:     '#1d2230',   // slate-4 – hover / elevated
  overlay:  '#222636',   // slate-5 – dropdowns
  border:   'rgba(255,255,255,.07)',
  borderSt: 'rgba(255,255,255,.12)',
  fg:       '#edeef0',   // slate-12
  fgLight:  '#b0b4ba',   // slate-11
  fgMuted:  '#696e77',   // slate-9
  fgSub:    '#43484e',   // slate-7
  green:    '#1ED760',
  blue:     '#409EFE',
  red:      '#e5484d',
  amber:    '#ffc53d',
}

// ── Types ────────────────────────────────────────────────────────────────────
type GhProfile = { name: string; login: string; bio: string | null; avatar_url: string; public_repos: number; followers: number; following: number }
type GhRepo    = { name: string; description: string | null; language: string | null; stargazers_count: number; html_url: string }
type WeatherData = { temp: string; icon: string; city: string; ts: number }

// ── Constants ────────────────────────────────────────────────────────────────
const ENGINES = [
  { id: 'google',    label: 'Google',      url: 'https://www.google.com/search?q=' },
  { id: 'ddg',       label: 'DuckDuckGo',  url: 'https://duckduckgo.com/?q=' },
  { id: 'bing',      label: 'Bing',        url: 'https://www.bing.com/search?q=' },
  { id: 'perp',      label: 'Perplexity',  url: 'https://www.perplexity.ai/search?q=' },
  { id: 'wiki',      label: 'Wikipedia',   url: 'https://en.wikipedia.org/wiki/Special:Search?search=' },
  { id: 'scholar',   label: 'Scholar',     url: 'https://scholar.google.com/scholar?q=' },
  { id: 'translate', label: 'Translate',   url: 'https://translate.google.com/?sl=auto&tl=th&text=' },
  { id: 'github',    label: 'GitHub',      url: 'https://github.com/search?q=' },
  { id: 'npm',       label: 'NPM',         url: 'https://www.npmjs.com/search?q=' },
  { id: 'mdn',       label: 'MDN',         url: 'https://developer.mozilla.org/en-US/search?q=' },
]

const QUICK_LINKS = [
  { label: 'GitHub',     href: 'https://github.com/centered101',  icon: faGithub },
  { label: 'Claude AI',  href: 'https://claude.ai',               icon: faTerminal },
  { label: 'Gmail',      href: 'https://gmail.com',               icon: faLink },
  { label: 'YouTube',    href: 'https://youtube.com',             icon: faLink },
  { label: 'Drive',      href: 'https://drive.google.com',        icon: faCloud },
  { label: 'Stack Overflow', href: 'https://stackoverflow.com',   icon: faCode },
  { label: 'Vercel',     href: 'https://vercel.com',              icon: faBolt },
  { label: 'npm',        href: 'https://npmjs.com',               icon: faLayerGroup },
]

const DOMAIN_NAV = [
  { group: 'Projects', icon: faGlobe, items: [
    { name: 'centered101.com',        desc: 'Portfolio', href: 'https://centered101.com' },
    { name: 'portfolio.centered101.com', desc: 'Portfolio website', href: 'https://portfolio.centered101.com' },
    { name: 'mycert.centered101.com', desc: 'Certificates', href: 'https://mycert.centered101.com' },
  ]},
  { group: 'Dev Tools', icon: faCode, items: [
    { name: 'asia-bot',  desc: 'LINE Bot', href: '#' },
    { name: 'camp-kit',  desc: 'Camp certs', href: '#' },
    { name: 'mycert-v1', desc: 'Next.js v1', href: '#' },
  ]},
]

const LANG_COLORS: Record<string, string> = {
  TypeScript: '#3178c6', JavaScript: '#f1e05a', Python: '#3572a5',
  Go: '#00add8', Rust: '#dea584', CSS: '#563d7c', HTML: '#e34c26',
  Vue: '#41b883', Ruby: '#701516', 'C#': '#178600',
}

const SHORTCUTS = [
  { key: 'Ctrl+K',  desc: 'Focus search' },
  { key: 'Ctrl+/',  desc: 'Toggle sidebar' },
  { key: 'Tab',     desc: 'Next engine' },
  { key: 'Esc',     desc: 'Clear search' },
  { key: 'Ctrl+S',  desc: 'Save notes' },
  { key: 'Space',   desc: 'Pause slideshow' },
]

const SS_IMAGES = [
  '/newtab/images/1.png', '/newtab/images/2.jpeg', '/newtab/images/3.jpeg',
  '/newtab/images/4.jpeg', '/newtab/images/5.jpeg', '/newtab/images/6.jpg',
  '/newtab/images/7.jpg',  '/newtab/images/8.png',  '/newtab/images/9.png',
  '/newtab/images/10.png', '/newtab/images/11.png', '/newtab/images/12.png',
]

// ── Font shorthands ──────────────────────────────────────────────────────────
const mono  = { fontFamily: 'var(--nt-mono, monospace)' }
const disp  = { fontFamily: 'var(--nt-display, monospace)' }
const sans  = { fontFamily: 'var(--nt-sans, sans-serif)' }
const cyber = { fontFamily: 'var(--nt-cyberpunk, var(--nt-display, monospace))' }

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtTime = (d: Date) => d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
const fmtDate = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
function fmtSw(ms: number) {
  return `${String(Math.floor(ms / 60000)).padStart(2, '0')}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}.${String(Math.floor((ms % 1000) / 10)).padStart(2, '0')}`
}
function fmtCd(s: number) {
  return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
function wxIcon(code: number): IconDefinition {
  if (code >= 200 && code < 300) return faBolt
  if (code >= 300 && code < 600) return faCloudRain
  if (code >= 600 && code < 700) return faSnowflake
  if (code === 800) return faSun
  if (code > 800) return faCloud
  return faWind
}
const neonGlow = (col: string, size = 16) => `0 0 ${size}px ${col}60, 0 0 ${size * 2}px ${col}20`

// ── CSS keyframes ────────────────────────────────────────────────────────────
const GLOBAL_STYLES = `
  @keyframes ntScan { from { background-position: 0 0 } to { background-position: 0 80px } }
  @keyframes ntFadeUp { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
  @keyframes ntPulse { 0%,100%{opacity:.6}50%{opacity:1} }
  @keyframes ntBlink { 0%,49%{opacity:1}50%,100%{opacity:0} }
  @keyframes ntGlow { 0%,100%{filter:brightness(1)}50%{filter:brightness(1.2)} }
`

// ── Background ───────────────────────────────────────────────────────────────
function NtBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" style={{ background: C.bg }}>
      {/* Supabase-style grid: very subtle white lines */}
      <div className="absolute inset-0 opacity-[.025]" style={{
        backgroundImage: `repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 1px,transparent 48px),repeating-linear-gradient(90deg,#fff 0,#fff 1px,transparent 1px,transparent 48px)`,
      }} />
      {/* CRT scanlines */}
      <div className="absolute inset-0 opacity-[.03]" style={{
        backgroundImage: `repeating-linear-gradient(transparent 0,transparent 2px,rgba(255,255,255,.04) 2px,rgba(255,255,255,.04) 4px)`,
        animation: 'ntScan 10s linear infinite',
      }} />
      {/* Radial neon glow: brand green top center */}
      <div className="absolute inset-x-0 top-0 h-96 opacity-[.06]" style={{
        background: `radial-gradient(ellipse 70% 100% at 50% -20%, ${C.green}, transparent)`,
      }} />
      {/* Blue glow bottom-left */}
      <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full opacity-[.04] blur-3xl" style={{ background: C.blue }} />
      {/* Green glow top-right */}
      <div className="absolute right-0 top-0 h-64 w-64 rounded-full opacity-[.03] blur-3xl" style={{ background: C.green }} />
      <style>{GLOBAL_STYLES}</style>
    </div>
  )
}

// ── Badge (Supabase-style) ────────────────────────────────────────────────────
function Badge({ label, variant = 'default' }: { label: string; variant?: 'default' | 'success' | 'blue' | 'warning' | 'destructive' }) {
  const colors: Record<string, [string, string, string]> = {
    default:     [C.fgSub,    'rgba(255,255,255,.08)', C.borderSt],
    success:     [C.green,    `${C.green}18`,          `${C.green}40`],
    blue:        [C.blue,     `${C.blue}18`,           `${C.blue}40`],
    warning:     [C.amber,    `${C.amber}18`,          `${C.amber}40`],
    destructive: [C.red,      `${C.red}18`,            `${C.red}40`],
  }
  const [col, bg, border] = colors[variant]
  return (
    <span
      className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest"
      style={{ ...mono, color: col, background: bg, border: `1px solid ${border}` }}
    >
      {label}
    </span>
  )
}

// ── Card (Supabase-style panel) ───────────────────────────────────────────────
function Card({ title, icon, children, className = '', accent = 'green', badge, badgeVariant }: {
  title: string; icon: IconDefinition; children: React.ReactNode
  className?: string; accent?: 'green' | 'blue'; badge?: string; badgeVariant?: 'default' | 'success' | 'blue' | 'warning'
}) {
  const accentColor = accent === 'blue' ? C.blue : C.green
  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-lg ${className}`}
      style={{ background: C.s200, border: `1px solid ${C.border}` }}
    >
      {/* Neon top-edge line */}
      <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg,transparent,${accentColor}60,transparent)` }} />

      {/* Card header – Supabase uses a subtle darker header */}
      <div
        className="flex shrink-0 items-center gap-2.5 px-4 py-3"
        style={{ background: C.s100, borderBottom: `1px solid ${C.border}` }}
      >
        <FontAwesomeIcon icon={icon} className="shrink-0 text-[11px]" style={{ color: accentColor }} />
        <span className="flex-1 text-[11px] font-semibold uppercase tracking-widest" style={{ ...sans, color: C.fgMuted }}>
          {title}
        </span>
        {badge && <Badge label={badge} variant={badgeVariant ?? (accent === 'blue' ? 'blue' : 'success')} />}
      </div>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  )
}

// ── Icon button ───────────────────────────────────────────────────────────────
function Btn({ icon, onClick, title, active, variant = 'green' }: {
  icon: IconDefinition; onClick: () => void; title?: string; active?: boolean; variant?: 'green' | 'blue'
}) {
  const col = variant === 'blue' ? C.blue : C.green
  return (
    <button
      onClick={onClick}
      title={title}
      className="grid size-7 shrink-0 place-items-center rounded text-[11px] transition active:scale-95"
      style={{
        border: `1px solid ${active ? col : C.border}`,
        background: active ? `${col}15` : C.s100,
        color: active ? col : C.fgMuted,
        boxShadow: active ? neonGlow(col, 8) : 'none',
      }}
    >
      <FontAwesomeIcon icon={icon} />
    </button>
  )
}

// ── Login Gate ────────────────────────────────────────────────────────────────
function NewTabLoginGate() {
  const { isLoading, authMode, setAuthMode, adminUsername, setAdminUsername, token, setToken, unlockDashboard, loginWithGitHub } = useAdminAuth()
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    const err = new URLSearchParams(window.location.search).get('auth_error')
    if (err) void Promise.resolve().then(() => setAuthError(decodeURIComponent(err)))
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    await unlockDashboard(token, 'token', adminUsername)
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-6" style={{ ...mono, background: C.bg }}>
      <NtBackground />
      <div className="relative z-10 w-full max-w-sm" style={{ animation: 'ntFadeUp .45s ease' }}>
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-4">
          <div
            className="flex size-16 items-center justify-center rounded-xl"
            style={{ background: C.s200, border: `1px solid ${C.green}40`, boxShadow: neonGlow(C.green, 20) }}
          >
            <img src="/newtab/favicon.ico" alt="SearchHub" className="size-10 object-contain" />
          </div>
          <div className="text-center">
            <h1
              className="text-3xl font-bold tracking-[.18em]"
              style={{ ...cyber, color: C.green, textShadow: neonGlow(C.green, 12) }}
            >
              SEARCHHUB
            </h1>
            <p className="mt-1 text-[10px] uppercase tracking-[.25em]" style={{ ...sans, color: C.fgSub }}>
              Secure Access Required
            </p>
          </div>
        </div>

        {/* Auth tabs – Supabase-style tab bar */}
        <div
          className="flex overflow-hidden rounded-t-lg p-0.5"
          style={{ background: C.s100, border: `1px solid ${C.border}`, borderBottom: 'none' }}
        >
          {(['token', 'github'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setAuthMode(m)}
              className="flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-[11px] uppercase tracking-widest transition"
              style={{
                ...sans,
                background: authMode === m ? C.s300 : 'transparent',
                color: authMode === m ? C.fg : C.fgSub,
                border: authMode === m ? `1px solid ${C.borderSt}` : '1px solid transparent',
                boxShadow: authMode === m ? `0 1px 3px rgba(0,0,0,.4)` : 'none',
              }}
            >
              <FontAwesomeIcon icon={m === 'token' ? faLock : faGithub} className="text-[12px]" style={{ color: authMode === m ? C.green : C.fgSub }} />
              {m === 'token' ? 'Password' : 'GitHub'}
            </button>
          ))}
        </div>

        {/* Panel */}
        <div
          className="rounded-b-lg rounded-tr-lg p-5"
          style={{ background: C.s200, border: `1px solid ${C.border}` }}
        >
          {authMode === 'token' ? (
            <form onSubmit={onSubmit} className="flex flex-col gap-3.5">
              {(['Username', 'Password'] as const).map((label) => {
                const isPass = label === 'Password'
                return (
                  <div key={label} className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase tracking-widest" style={{ ...sans, color: C.fgMuted }}>{label}</label>
                    <div
                      className="flex items-center gap-2 rounded-md px-3 py-2 transition focus-within:ring-1"
                      style={{
                        background: C.s100,
                        border: `1px solid ${C.border}`,
                        outline: 'none',
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = C.green)}
                      onBlur={(e) => (e.currentTarget.style.borderColor = C.border)}
                    >
                      <FontAwesomeIcon icon={isPass ? faLock : faUser} className="shrink-0 text-[11px]" style={{ color: C.fgSub }} />
                      <input
                        type={isPass ? 'password' : 'text'}
                        value={isPass ? token : adminUsername}
                        onChange={(e) => isPass ? setToken(e.target.value) : setAdminUsername(e.target.value)}
                        placeholder={isPass ? '••••••••••••' : 'admin'}
                        className="flex-1 bg-transparent text-[13px] outline-none placeholder:opacity-30"
                        style={{ ...mono, color: C.fg }}
                        autoComplete={isPass ? 'current-password' : 'username'}
                      />
                    </div>
                  </div>
                )
              })}
              {authError && (
                <div className="flex items-center gap-2 rounded-md px-3 py-2 text-[11px]" style={{ background: `${C.red}12`, border: `1px solid ${C.red}40`, color: C.red }}>
                  <FontAwesomeIcon icon={faTriangleExclamation} className="shrink-0" />
                  {authError}
                </div>
              )}
              <button
                type="submit"
                disabled={isLoading}
                className="mt-0.5 flex items-center justify-center gap-2 rounded-md py-2.5 text-[12px] font-semibold uppercase tracking-widest transition hover:brightness-110 disabled:opacity-40"
                style={{ ...sans, background: `${C.green}20`, border: `1px solid ${C.green}50`, color: C.green, boxShadow: neonGlow(C.green, 8) }}
              >
                {isLoading ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : <FontAwesomeIcon icon={faLock} />}
                {isLoading ? 'Authenticating...' : 'Unlock Dashboard'}
              </button>
            </form>
          ) : (
            <div className="flex flex-col items-center gap-4 py-2">
              <p className="text-center text-[12px]" style={{ color: C.fgMuted }}>
                Sign in with your GitHub account to access SearchHub
              </p>
              {authError && (
                <div className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-[11px]" style={{ background: `${C.red}12`, border: `1px solid ${C.red}40`, color: C.red }}>
                  <FontAwesomeIcon icon={faTriangleExclamation} className="shrink-0" />
                  {authError}
                </div>
              )}
              <button
                onClick={() => loginWithGitHub('/newtab')}
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-3 rounded-md py-3 text-[13px] font-semibold uppercase tracking-widest transition hover:brightness-110 disabled:opacity-40"
                style={{ ...sans, background: `${C.green}18`, border: `1px solid ${C.green}45`, color: C.green, boxShadow: neonGlow(C.green, 8) }}
              >
                {isLoading ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : <FontAwesomeIcon icon={faGithub} className="text-[16px]" />}
                {isLoading ? 'Redirecting...' : 'Continue with GitHub'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Dashboard Content ─────────────────────────────────────────────────────────
function NewTabContent() {
  const { authInfo, logout } = useAdminAuth()

  // Clock
  const [now, setNow] = useState(new Date())
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t) }, [])

  // Online
  // `navigator.onLine` is an external store, not React state to sync into an
  // Effect — useSyncExternalStore reads it directly and re-renders on the
  // browser's own online/offline events.
  const isOnline = useSyncExternalStore(
    (onChange) => {
      window.addEventListener('online', onChange)
      window.addEventListener('offline', onChange)
      return () => {
        window.removeEventListener('online', onChange)
        window.removeEventListener('offline', onChange)
      }
    },
    () => navigator.onLine,
    () => true,
  )

  // Weather
  const [weather, setWeather] = useState<WeatherData | null>(null)
  useEffect(() => {
    const c = sessionStorage.getItem('nt_wx')
    if (c) {
      const d: WeatherData = JSON.parse(c)
      if (Date.now() - d.ts < 600000) {
        void Promise.resolve().then(() => setWeather(d))
        return
      }
    }
    fetch('https://ipapi.co/json/').then(r => r.json()).then(loc =>
      fetch(`https://wttr.in/${encodeURIComponent(loc.city || loc.country_name)}?format=j1`)
    ).then(r => r.json()).then(wx => {
      const cu = wx.current_condition?.[0]; if (!cu) return
      const d: WeatherData = { temp: cu.temp_C + '°C', icon: cu.weatherCode, city: wx.nearest_area?.[0]?.areaName?.[0]?.value || '', ts: Date.now() }
      sessionStorage.setItem('nt_wx', JSON.stringify(d)); setWeather(d)
    }).catch(() => {})
  }, [])

  // GitHub
  const [ghProfile, setGhProfile] = useState<GhProfile | null>(null)
  const [ghRepos, setGhRepos] = useState<GhRepo[]>([])
  useEffect(() => {
    const u = authInfo?.githubUsername || 'centered101'
    fetch(`https://api.github.com/users/${u}`).then(r => r.json()).then(d => setGhProfile(d)).catch(() => {})
    fetch(`https://api.github.com/users/${u}/repos?per_page=5&sort=updated`).then(r => r.json()).then(d => Array.isArray(d) && setGhRepos(d)).catch(() => {})
  }, [authInfo])

  // Search
  const [query, setQuery] = useState('')
  const [engineId, setEngineId] = useState('google')
  const searchRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); searchRef.current?.focus() }
      if (e.key === 'Escape' && document.activeElement === searchRef.current) { setQuery(''); searchRef.current?.blur() }
      if (e.key === 'Tab' && document.activeElement === searchRef.current) {
        e.preventDefault()
        setEngineId(id => { const i = ENGINES.findIndex(en => en.id === id); return ENGINES[(i + 1) % ENGINES.length].id })
      }
    }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey)
  }, [])
  function doSearch(e: FormEvent) {
    e.preventDefault(); const q = query.trim(); if (!q) return
    const engine = ENGINES.find(en => en.id === engineId) || ENGINES[0]
    window.open(engine.url + encodeURIComponent(q), '_blank')
    toast.success(`Searching "${q}" on ${engine.label}`, { duration: 2000 })
  }

  // Notes
  const [notes, setNotes] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('nt_notes') || '' : ''))
  const [noteSaved, setNoteSaved] = useState(false)
  function saveNotes() {
    localStorage.setItem('nt_notes', notes); setNoteSaved(true)
    toast.success('Notes saved'); setTimeout(() => setNoteSaved(false), 2500)
  }

  // Stopwatch
  const [swMs, setSwMs] = useState(0); const [swRun, setSwRun] = useState(false)
  const swRef = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    if (swRun) swRef.current = setInterval(() => setSwMs(p => p + 10), 10)
    else if (swRef.current) clearInterval(swRef.current)
    return () => { if (swRef.current) clearInterval(swRef.current) }
  }, [swRun])

  // Countdown
  const [cdInput, setCdInput] = useState('00:05:00'); const [cdSec, setCdSec] = useState(300); const [cdRun, setCdRun] = useState(false)
  const cdRef = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    if (cdRun) cdRef.current = setInterval(() => setCdSec(p => { if (p <= 1) { setCdRun(false); toast.success('Countdown finished!', { duration: 4000 }); return 0 }; return p - 1 }), 1000)
    else if (cdRef.current) clearInterval(cdRef.current)
    return () => { if (cdRef.current) clearInterval(cdRef.current) }
  }, [cdRun])
  function resetCd() { setCdRun(false); const [h, m, s] = cdInput.split(':').map(Number); setCdSec((h || 0) * 3600 + (m || 0) * 60 + (s || 0) || 300) }

  // Slideshow
  const [ssIdx, setSsIdx] = useState(0); const [ssPlay, setSsPlay] = useState(true); const [soundOn, setSoundOn] = useState(false)
  useEffect(() => { if (!ssPlay) return; const t = setInterval(() => setSsIdx(i => (i + 1) % SS_IMAGES.length), 5000); return () => clearInterval(t) }, [ssPlay])

  // Sidebar
  const [sideOpen, setSideOpen] = useState(true)
  const [openGroups, setOpenGroups] = useState(['Projects', 'Dev Tools'])
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if ((e.ctrlKey || e.metaKey) && e.key === '/') { e.preventDefault(); setSideOpen(s => !s) } }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey)
  }, [])

  // System chart (session uptime)
  const [sessionStart] = useState(() => Date.now())
  const uptimeSec = Math.floor((now.getTime() - sessionStart) / 1000)
  const uptimePct = Math.min(99, Math.floor((uptimeSec / 28800) * 100))
  const chartData = { datasets: [{ data: [uptimePct, 100 - uptimePct], backgroundColor: [C.green, C.s300], borderWidth: 0, cutout: '76%' }] }
  const chartOpts = { plugins: { tooltip: { enabled: false } }, animation: { duration: 600 }, responsive: true, maintainAspectRatio: true }

  const toggleGroup = (g: string) => setOpenGroups(p => p.includes(g) ? p.filter(x => x !== g) : [...p, g])

  return (
    <div className="relative flex min-h-screen overflow-hidden" style={{ ...mono, background: C.bg }}>
      <NtBackground />

      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <aside
        className="relative z-20 flex shrink-0 flex-col transition-all duration-300"
        style={{ width: sideOpen ? 220 : 52, background: C.s100, borderRight: `1px solid ${C.border}` }}
      >
        {/* Logo */}
        <div className="flex h-12 items-center gap-2.5 px-3" style={{ borderBottom: `1px solid ${C.border}` }}>
          <div
            className="flex size-7 shrink-0 items-center justify-center rounded-md"
            style={{ background: C.s300, border: `1px solid ${C.green}30` }}
          >
            <img src="/newtab/favicon.ico" alt="SearchHub" className="size-4.5 object-contain" />
          </div>
          {sideOpen && (
            <span className="flex-1 truncate text-[13px] font-bold tracking-[.1em]" style={{ ...cyber, color: C.green }}>SearchHub</span>
          )}
          <button
            onClick={() => setSideOpen(s => !s)}
            className="grid size-6 shrink-0 place-items-center rounded text-[10px] transition hover:brightness-150"
            style={{ color: C.fgSub, background: C.s200 }}
          >
            <FontAwesomeIcon icon={sideOpen ? faChevronLeft : faChevronRight} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden py-2">
          {DOMAIN_NAV.map(g => (
            <div key={g.group}>
              {sideOpen ? (
                <button
                  onClick={() => toggleGroup(g.group)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-[10px] uppercase tracking-widest transition hover:brightness-125"
                  style={{ ...sans, color: C.fgSub }}
                >
                  <FontAwesomeIcon icon={openGroups.includes(g.group) ? faChevronDown : faChevronUp} className="text-[8px]" />
                  {g.group}
                </button>
              ) : (
                <div className="mx-3 my-1.5 h-px" style={{ background: C.border }} />
              )}
              {(sideOpen ? openGroups.includes(g.group) : true) && g.items.map(item => (
                <a
                  key={item.name}
                  href={item.href}
                  target="_blank"
                  rel="noopener"
                  title={item.name}
                  className="flex items-center gap-2.5 overflow-hidden px-3 py-2 text-[12px] no-underline transition"
                  style={{ color: C.fgMuted }}
                  onMouseEnter={e => { e.currentTarget.style.background = C.s200; e.currentTarget.style.color = C.fg }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.fgMuted }}
                >
                  <FontAwesomeIcon icon={faGlobe} className="shrink-0 text-[10px]" style={{ color: C.green }} />
                  {sideOpen && (
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-medium" style={{ color: C.fgLight }}>{item.name}</p>
                      <p className="truncate text-[9px]" style={{ color: C.fgSub }}>{item.desc}</p>
                    </div>
                  )}
                </a>
              ))}
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-2" style={{ borderTop: `1px solid ${C.border}` }}>
          <button
            onClick={async () => { await logout() }}
            className="flex w-full items-center justify-center gap-2 rounded-md py-1.5 text-[10px] transition"
            style={{ color: C.fgSub }}
            onMouseEnter={e => { e.currentTarget.style.color = C.red; e.currentTarget.style.background = `${C.red}10` }}
            onMouseLeave={e => { e.currentTarget.style.color = C.fgSub; e.currentTarget.style.background = 'transparent' }}
          >
            <FontAwesomeIcon icon={faRightFromBracket} />
            {sideOpen && <span style={sans} className="uppercase tracking-widest">Logout</span>}
          </button>
        </div>
      </aside>

      {/* ── Main ───────────────────────────────────────────────────────────── */}
      <main className="relative z-10 flex flex-1 flex-col overflow-y-auto">

        {/* Header */}
        <header
          className="sticky top-0 z-30 flex h-12 shrink-0 items-center gap-4 px-5 backdrop-blur-md"
          style={{ background: `${C.s100}e0`, borderBottom: `1px solid ${C.border}` }}
        >
          {/* Online status badge */}
          <Badge label={isOnline ? 'Online' : 'Offline'} variant={isOnline ? 'success' : 'destructive'} />

          {/* Weather */}
          {weather && (
            <div className="flex items-center gap-1.5 text-[11px]" style={{ color: C.fgMuted }}>
              <FontAwesomeIcon icon={wxIcon(Number(weather.icon))} style={{ color: C.green }} />
              <span>{weather.temp}</span>
              {weather.city && <span style={{ color: C.fgSub }}>{weather.city}</span>}
            </div>
          )}

          <div className="ml-auto flex items-center gap-4">
            {/* User info */}
            {authInfo?.displayName && (
              <div className="flex items-center gap-2 text-[11px]" style={{ color: C.fgMuted }}>
                {authInfo.avatarUrl ? (
                  <Image src={authInfo.avatarUrl} alt="" width={20} height={20} className="size-5 rounded-full" style={{ border: `1px solid ${C.border}` }} />
                ) : (
                  <FontAwesomeIcon icon={faUser} style={{ color: C.green }} />
                )}
                <span>{authInfo.displayName}</span>
              </div>
            )}
            {/* Clock */}
            <div className="text-right">
              <div className="text-[14px] font-bold tabular-nums" style={{ ...disp, color: C.fg }}>{fmtTime(now)}</div>
              <div className="text-[9px]" style={{ ...sans, color: C.fgSub }}>{fmtDate(now)}</div>
            </div>
          </div>
        </header>

        <div className="flex flex-col gap-4 p-5" style={{ animation: 'ntFadeUp .4s ease' }}>

          {/* ── Hero SearchHub ──────────────────────────────────────────── */}
          <div
            className="relative overflow-hidden rounded-xl p-6"
            style={{ background: C.s200, border: `1px solid ${C.border}` }}
          >
            {/* Neon edge */}
            <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg,transparent 0%,${C.green}80 50%,transparent 100%)` }} />
            {/* Corner glow */}
            <div className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full opacity-[.05] blur-3xl" style={{ background: C.green }} />
            <div className="pointer-events-none absolute -bottom-12 -left-12 size-48 rounded-full opacity-[.04] blur-3xl" style={{ background: C.blue }} />

            {/* Title row */}
            <div className="relative mb-5 flex items-start justify-between gap-4">
              <div>
                <div className="mb-1.5 flex items-center gap-2">
                  <img src="/newtab/favicon.ico" alt="" className="size-5 object-contain opacity-70" />
                  <span className="text-[9px] uppercase tracking-[.3em]" style={{ ...sans, color: C.fgSub }}>Personal Dashboard</span>
                </div>
                <h1
                  className="text-[2.25rem] font-bold leading-none tracking-[.15em]"
                  style={{ ...cyber, color: C.green, textShadow: neonGlow(C.green, 16) }}
                >
                  SEARCHHUB
                </h1>
              </div>

              {/* Engine pills */}
              <div className="flex flex-wrap justify-end gap-1 pt-1">
                {ENGINES.map(en => (
                  <button
                    key={en.id}
                    onClick={() => setEngineId(en.id)}
                    className="rounded-md px-2.5 py-1 text-[10px] uppercase tracking-wider transition"
                    style={{
                      ...sans,
                      border: `1px solid ${engineId === en.id ? C.green : C.border}`,
                      background: engineId === en.id ? `${C.green}15` : C.s100,
                      color: engineId === en.id ? C.green : C.fgMuted,
                      boxShadow: engineId === en.id ? neonGlow(C.green, 6) : 'none',
                    }}
                  >
                    {en.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Search input */}
            <form onSubmit={doSearch} className="relative flex items-center gap-3">
              <span className="select-none text-[15px] font-bold" style={{ ...mono, color: C.green }}>$&gt;</span>
              <div className="relative flex-1">
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder={`Search with ${ENGINES.find(e => e.id === engineId)?.label}... (Ctrl+K)`}
                  className="w-full rounded-lg py-3 pl-4 pr-12 text-[15px] outline-none transition"
                  style={{
                    ...mono,
                    background: C.s100,
                    border: `1px solid ${C.border}`,
                    color: C.fg,
                  }}
                  onFocus={e => { e.target.style.borderColor = C.green; e.target.style.boxShadow = neonGlow(C.green, 6) }}
                  onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = 'none' }}
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 grid size-8 place-items-center rounded-md text-[12px] transition hover:brightness-120"
                  style={{ background: `${C.green}20`, border: `1px solid ${C.green}50`, color: C.green }}
                >
                  <FontAwesomeIcon icon={faMagnifyingGlass} />
                </button>
              </div>
            </form>

            {/* Quick links */}
            <div className="mt-4 flex flex-wrap gap-1.5">
              {QUICK_LINKS.map(l => (
                <a
                  key={l.label}
                  href={l.href}
                  target="_blank"
                  rel="noopener"
                  className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] no-underline transition"
                  style={{ ...sans, border: `1px solid ${C.border}`, background: C.s100, color: C.fgMuted }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = C.green; e.currentTarget.style.color = C.fg; e.currentTarget.style.background = `${C.green}10` }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.fgMuted; e.currentTarget.style.background = C.s100 }}
                >
                  <FontAwesomeIcon icon={l.icon} className="text-[10px]" style={{ color: C.green }} />
                  {l.label}
                </a>
              ))}
            </div>
          </div>

          {/* ── Widget Grid ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-4 gap-4">

            {/* System Monitor (1 col) */}
            <Card title="System" icon={faServer} badge="Live" badgeVariant="success">
              <div className="flex flex-col items-center gap-3 p-4">
                {/* Doughnut chart */}
                <div className="relative size-24">
                  <Doughnut data={chartData} options={chartOpts} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[20px] font-bold tabular-nums" style={{ ...disp, color: C.green, textShadow: neonGlow(C.green, 8) }}>{uptimePct}%</span>
                    <span className="text-[8px] uppercase tracking-widest" style={{ ...sans, color: C.fgSub }}>Session</span>
                  </div>
                </div>
                {/* Stats rows – Supabase-style dividers */}
                <div className="w-full text-[10px]">
                  {([
                    ['Status', isOnline ? 'Online' : 'Offline', isOnline ? C.green : C.red],
                    ['Uptime', fmtCd(uptimeSec), C.blue],
                    ['Engine', ENGINES.find(e => e.id === engineId)?.label ?? 'Google', C.fg],
                    ['User', authInfo?.githubUsername ?? 'admin', C.fg],
                  ] as [string, string, string][]).map(([k, v, col]) => (
                    <div key={k} className="flex items-center justify-between py-1.5" style={{ borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ ...sans, color: C.fgSub }}>{k}</span>
                      <span className="font-medium" style={{ ...mono, color: col }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Bookmarks (2 col) */}
            <Card title="Bookmarks" icon={faBookmark} className="col-span-2">
              <div className="grid grid-cols-2 gap-px p-3">
                {QUICK_LINKS.map(l => (
                  <a
                    key={l.label}
                    href={l.href}
                    target="_blank"
                    rel="noopener"
                    className="group flex items-center gap-3 rounded-md px-3 py-2.5 no-underline transition"
                    style={{ border: '1px solid transparent' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = `${C.green}30`; e.currentTarget.style.background = `${C.green}08` }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'transparent' }}
                  >
                    <div
                      className="grid size-8 shrink-0 place-items-center rounded-md text-[12px] transition group-hover:brightness-125"
                      style={{ background: C.s300, border: `1px solid ${C.border}`, color: C.green }}
                    >
                      <FontAwesomeIcon icon={l.icon} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-semibold" style={{ ...sans, color: C.fgLight }}>{l.label}</p>
                      <p className="truncate text-[10px]" style={{ ...mono, color: C.fgSub }}>{l.href.replace('https://', '')}</p>
                    </div>
                    <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="shrink-0 text-[9px] opacity-0 transition group-hover:opacity-100" style={{ color: C.green }} />
                  </a>
                ))}
              </div>
            </Card>

            {/* GitHub (1 col) */}
            <Card title="GitHub" icon={faGithub} accent="blue">
              {ghProfile ? (
                <div className="flex flex-col gap-2.5 p-3">
                  <div className="flex items-center gap-2.5">
                    <Image src={ghProfile.avatar_url} alt="" width={36} height={36} className="size-9 rounded-full" style={{ border: `2px solid ${C.blue}40` }} />
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-semibold" style={{ ...sans, color: C.fgLight }}>{ghProfile.name || ghProfile.login}</p>
                      <p className="text-[10px]" style={{ ...mono, color: C.fgSub }}>@{ghProfile.login}</p>
                    </div>
                  </div>
                  {ghProfile.bio && <p className="text-[10px] italic line-clamp-2" style={{ color: C.fgSub }}>{ghProfile.bio}</p>}
                  <div className="grid grid-cols-3 gap-1">
                    {([['Repos', ghProfile.public_repos], ['Follow', ghProfile.followers], ['Following', ghProfile.following]] as [string, number][]).map(([l, n]) => (
                      <div key={l} className="rounded-md py-1.5 text-center" style={{ background: C.s300, border: `1px solid ${C.border}` }}>
                        <div className="text-[14px] font-bold tabular-nums" style={{ ...disp, color: C.blue }}>{n}</div>
                        <div className="text-[9px] uppercase tracking-wide" style={{ ...sans, color: C.fgSub }}>{l}</div>
                      </div>
                    ))}
                  </div>
                  <div className="max-h-36 overflow-y-auto">
                    {ghRepos.map(r => (
                      <a key={r.name} href={r.html_url} target="_blank" rel="noopener" className="flex items-center gap-2 py-1.5 text-[11px] no-underline transition" style={{ borderBottom: `1px solid ${C.border}`, color: C.fgMuted }}
                        onMouseEnter={e => (e.currentTarget.style.color = C.fg)} onMouseLeave={e => (e.currentTarget.style.color = C.fgMuted)}
                      >
                        <FontAwesomeIcon icon={faCode} className="shrink-0 text-[9px]" style={{ color: C.blue }} />
                        <span className="flex-1 truncate font-medium">{r.name}</span>
                        {r.language && <span className="shrink-0 rounded px-1 py-0.5 text-[8px]" style={{ background: `${LANG_COLORS[r.language] || C.blue}25`, color: LANG_COLORS[r.language] || C.blue }}>{r.language}</span>}
                        {r.stargazers_count > 0 && <span className="flex shrink-0 items-center gap-0.5 text-[9px]" style={{ color: C.amber }}><FontAwesomeIcon icon={faStar} className="text-[8px]" />{r.stargazers_count}</span>}
                      </a>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 items-center justify-center p-6"><FontAwesomeIcon icon={faSpinner} className="animate-spin text-[20px]" style={{ color: C.blue }} /></div>
              )}
            </Card>

            {/* Stopwatch (1 col) */}
            <Card title="Stopwatch" icon={faStopwatch}>
              <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
                <div className="relative">
                  <div
                    className="text-[30px] font-bold tabular-nums leading-none"
                    style={{ ...disp, color: swRun ? C.green : C.fgMuted, textShadow: swRun ? neonGlow(C.green, 12) : 'none', transition: 'all .3s' }}
                  >
                    {fmtSw(swMs)}
                  </div>
                  {swRun && <div className="absolute -bottom-1 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg,transparent,${C.green},transparent)`, animation: 'ntPulse 1s ease infinite' }} />}
                </div>
                <div className="flex gap-2">
                  <Btn icon={swRun ? faPause : faPlay} onClick={() => setSwRun(r => !r)} active={swRun} title={swRun ? 'Pause' : 'Start'} />
                  <Btn icon={faRotateLeft} onClick={() => { setSwRun(false); setSwMs(0) }} title="Reset" />
                  <Btn icon={faCopy} onClick={() => { navigator.clipboard.writeText(fmtSw(swMs)); toast.success('Copied!', { duration: 1000 }) }} title="Copy time" />
                </div>
              </div>
            </Card>

            {/* Countdown (2 col) */}
            <Card title="Countdown" icon={faHourglass} className="col-span-2">
              <div className="flex flex-1 items-center gap-6 p-4">
                <div className="flex flex-1 flex-col items-center gap-3">
                  <div
                    className="text-[42px] font-bold tabular-nums leading-none"
                    style={{
                      ...disp,
                      color: cdRun ? (cdSec < 60 ? C.red : C.blue) : C.fgMuted,
                      textShadow: cdRun ? neonGlow(cdSec < 60 ? C.red : C.blue, 14) : 'none',
                      transition: 'all .3s',
                    }}
                  >
                    {fmtCd(cdSec)}
                  </div>
                  <div className="flex gap-2">
                    <Btn icon={cdRun ? faPause : faPlay} onClick={() => cdSec > 0 && setCdRun(r => !r)} active={cdRun} variant="blue" title={cdRun ? 'Pause' : 'Start'} />
                    <Btn icon={faRotateLeft} onClick={resetCd} title="Reset" />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] uppercase tracking-widest" style={{ ...sans, color: C.fgSub }}>HH:MM:SS</label>
                  <input
                    type="text"
                    value={cdInput}
                    onChange={e => setCdInput(e.target.value)}
                    onBlur={resetCd}
                    placeholder="00:05:00"
                    className="rounded-md px-3 py-2 text-[13px] outline-none transition"
                    style={{ ...mono, background: C.s100, border: `1px solid ${C.border}`, color: C.fg }}
                    onFocus={e => (e.target.style.borderColor = C.blue)}
                  />
                  <div className="grid grid-cols-4 gap-1">
                    {[['5m', '00:05:00'], ['15m', '00:15:00'], ['30m', '00:30:00'], ['1h', '01:00:00']].map(([l, v]) => (
                      <button
                        key={l}
                        onClick={() => { setCdInput(v); setCdRun(false); const [h, m, s] = v.split(':').map(Number); setCdSec(h * 3600 + m * 60 + s) }}
                        className="rounded-md py-1 text-[10px] transition"
                        style={{ ...sans, border: `1px solid ${C.border}`, background: C.s100, color: C.fgMuted }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = C.blue; e.currentTarget.style.color = C.blue }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.fgMuted }}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* Notes (1 col) */}
            <Card title="Notes" icon={faNoteSticky} badge={noteSaved ? 'Saved' : undefined} badgeVariant="success">
              <div className="flex flex-1 flex-col p-3">
                <textarea
                  value={notes}
                  onChange={e => { setNotes(e.target.value); setNoteSaved(false) }}
                  onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveNotes() } }}
                  placeholder="Write anything... Ctrl+S to save"
                  className="flex-1 resize-none rounded-md p-3 text-[12px] outline-none transition"
                  style={{ ...mono, minHeight: 140, background: C.s100, border: `1px solid ${C.border}`, color: C.fgLight, lineHeight: 1.6 }}
                  onFocus={e => (e.target.style.borderColor = C.green)}
                  onBlur={e => (e.target.style.borderColor = C.border)}
                />
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[9px]" style={{ color: C.fgSub }}>{notes.length} chars</span>
                  <button
                    onClick={saveNotes}
                    className="flex items-center gap-1.5 rounded-md px-3 py-1 text-[10px] transition"
                    style={{ ...sans, border: `1px solid ${C.border}`, background: C.s300, color: C.fgMuted }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = C.green; e.currentTarget.style.color = C.green }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.fgMuted }}
                  >
                    <FontAwesomeIcon icon={faFloppyDisk} />
                    Save
                  </button>
                </div>
              </div>
            </Card>

            {/* Slideshow (2 col) */}
            <Card title="Slideshow" icon={faImages} className="col-span-2">
              <div className="relative overflow-hidden">
                <div className="relative aspect-video w-full overflow-hidden" style={{ background: C.s100 }}>
                  <Image key={ssIdx} src={SS_IMAGES[ssIdx]} alt="" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" style={{ animation: 'ntFadeUp .5s ease' }} />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(13,14,17,.7) 0%, transparent 50%)' }} />
                  {/* Dot indicators */}
                  <div className="absolute bottom-2.5 left-0 right-0 flex justify-center gap-1">
                    {SS_IMAGES.map((_, i) => (
                      <button key={i} onClick={() => setSsIdx(i)} className="rounded-full transition-all"
                        style={{ width: i === ssIdx ? 16 : 6, height: 6, background: i === ssIdx ? C.green : C.fgSub, boxShadow: i === ssIdx ? neonGlow(C.green, 4) : 'none' }} />
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between px-3 py-2" style={{ borderTop: `1px solid ${C.border}` }}>
                  <div className="flex gap-1.5">
                    <Btn icon={faChevronLeft} onClick={() => setSsIdx(i => (i - 1 + SS_IMAGES.length) % SS_IMAGES.length)} title="Prev" />
                    <Btn icon={ssPlay ? faPause : faPlay} onClick={() => setSsPlay(p => !p)} active={ssPlay} title={ssPlay ? 'Pause' : 'Play'} />
                    <Btn icon={faChevronRight} onClick={() => setSsIdx(i => (i + 1) % SS_IMAGES.length)} title="Next" />
                    <Btn icon={faShuffle} onClick={() => setSsIdx(Math.floor(Math.random() * SS_IMAGES.length))} title="Shuffle" />
                  </div>
                  <span className="text-[10px] tabular-nums" style={{ ...mono, color: C.fgSub }}>{String(ssIdx + 1).padStart(2, '0')} / {SS_IMAGES.length}</span>
                  <Btn icon={soundOn ? faVolumeHigh : faVolumeXmark} onClick={() => setSoundOn(s => !s)} active={soundOn} title="Sound" />
                </div>
              </div>
            </Card>

            {/* Shortcuts (2 col) */}
            <Card title="Shortcuts" icon={faKeyboard} className="col-span-2" accent="blue">
              <div className="grid grid-cols-2 gap-1 p-3">
                {SHORTCUTS.map(s => (
                  <div key={s.key} className="flex items-center gap-3 rounded-md px-3 py-2 transition" style={{ border: '1px solid transparent' }}
                    onMouseEnter={e => { e.currentTarget.style.background = C.s300; e.currentTarget.style.borderColor = C.border }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent' }}
                  >
                    <kbd className="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold" style={{ ...mono, background: C.s300, border: `1px solid ${C.borderSt}`, color: C.blue }}>{s.key}</kbd>
                    <span className="text-[11px]" style={{ ...sans, color: C.fgMuted }}>{s.desc}</span>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2.5" style={{ borderTop: `1px solid ${C.border}` }}>
                <div className="flex items-start gap-2">
                  <FontAwesomeIcon icon={faCircleInfo} className="mt-0.5 shrink-0 text-[10px]" style={{ color: C.blue }} />
                  <p className="text-[10px]" style={{ ...sans, color: C.fgSub }}>Tab cycles search engines. All shortcuts are global and work from any widget.</p>
                </div>
              </div>
            </Card>

          </div>
        </div>
      </main>
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────
export function NewTabDashboard() {
  const { isBooting, isAuthenticated } = useAdminAuth()

  if (isBooting) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center" style={{ background: C.bg }}>
        <NtBackground />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="flex size-14 items-center justify-center rounded-xl" style={{ background: C.s200, border: `1px solid ${C.green}30`, boxShadow: neonGlow(C.green, 16) }}>
            <img src="/newtab/favicon.ico" alt="SearchHub" className="size-9 object-contain" />
          </div>
          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-[22px]" style={{ color: C.green }} />
          <span className="text-[10px] uppercase tracking-[.25em]" style={{ ...sans, color: C.fgSub }}>Initializing SearchHub...</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) return <NewTabLoginGate />
  return <NewTabContent />
}
