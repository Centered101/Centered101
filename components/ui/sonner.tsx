'use client'

import { useTheme } from 'next-themes'
import { Toaster as Sonner, ToasterProps } from 'sonner'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
} from 'lucide-react'

// ─── PORTFOLIO TOASTER ────────────────────────────────────────────────────────
// Soft card style that blends with portfolio/admin surfaces.

const portfolioToastOptions = {
  unstyled: true,
  classNames: {
    toast: [
      'relative flex items-start gap-3 overflow-hidden',
      'rounded-xl border border-[#dfe3e8] bg-white/96 backdrop-blur-xl',
      '!text-[#090c13]',
      'px-3.5 py-3 shadow-[0_18px_48px_-30px_rgba(15,23,42,0.38)]',
      'w-[min(340px,calc(100vw-2rem))] cursor-grab active:cursor-grabbing',
      "font-['Kanit']",
      'before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-[#409EFE]',
    ].join(' '),
    content: 'flex-1 min-w-0 pt-px',
    title:       "font-['Kanit'] font-bold text-[13px] !text-[#090c13] leading-snug",
    description: "font-['Kanit'] text-[11px] !text-[#647084] mt-0.5 leading-relaxed",
    icon: 'shrink-0 mt-0.5 !text-[#409EFE]',
    closeButton: '!hidden',
    actionButton: [
      '!text-[11px] !font-bold !rounded-md !px-3 !py-1.5',
      '!bg-[#409EFE] !text-white hover:!bg-[#60aeff] !transition-colors',
    ].join(' '),
    cancelButton: [
      '!text-[11px] !font-bold !rounded-md !px-3 !py-1.5',
      '!border !border-[#dfe3e8] !bg-white !text-[#647084]',
      'hover:!border-[#409EFE]/40 hover:!text-[#409EFE] !transition-colors',
    ].join(' '),
    success: '!border-[#bbf7d0] before:!bg-[#22c55e]',
    error:   '!border-[#fecaca] before:!bg-[#ef4444]',
    warning: '!border-[#fde68a] before:!bg-[#f59e0b]',
    info:    '!border-[#bae0ff] before:!bg-[#409EFE]',
    loading: 'before:!bg-[#647084]',
  },
} as const

const portfolioIcons = {
  success: <CheckCircle2 className="size-[15px] text-[#22c55e]" />,
  error: <AlertCircle className="size-[15px] text-[#ef4444]" />,
  info: <Info className="size-[15px] text-[#409EFE]" />,
  warning: <AlertTriangle className="size-[15px] text-[#f59e0b]" />,
  loading: <Loader2 className="size-[15px] animate-spin text-[#647084]" />,
} as const

export function Toaster({ ...props }: ToasterProps) {
  const { theme = 'system' } = useTheme()
  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      toastOptions={portfolioToastOptions}
      icons={portfolioIcons}
      gap={8}
      {...props}
    />
  )
}

// ─── ADMIN TOASTER ────────────────────────────────────────────────────────────
// ออกแบบ: enterprise / dashboard — sharp, dense, left accent stripe

const adminToastOptions = {
  unstyled: true,
  classNames: {
    toast: [
      'relative flex items-start gap-3',
      'rounded-xl border border-[#27272A] bg-[#18181B]',
      'pl-4 pr-4 py-3 shadow-xl shadow-black/70',
      'w-[320px] cursor-grab active:cursor-grabbing',
      // left accent stripe via before pseudo (added in global css)
      "font-['Kanit']",
      // left border stripe
      'before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:rounded-l-xl',
    ].join(' '),
    content: 'flex-1 min-w-0 pt-px',
    title:       "font-['Kanit'] font-semibold text-[12px] text-[#FAFAFA] leading-snug tracking-wide",
    description: "font-['Kanit'] text-[11px] text-[#52525b] mt-0.5 leading-relaxed",
    icon: 'shrink-0 mt-0.5',
    closeButton: [
      'absolute top-2 right-2',
      '!size-5 !rounded-md !border !border-[#27272A]',
      '!bg-transparent !text-[#3f3f46]',
      'hover:!bg-[#27272A] hover:!text-[#FAFAFA] !transition-colors',
    ].join(' '),
    actionButton: [
      '!text-[10px] !font-semibold !rounded-lg !px-2.5 !py-1',
      '!bg-[#409EFE] !text-white hover:!bg-[#60aeff] !transition-colors',
    ].join(' '),
    cancelButton: [
      '!text-[10px] !rounded-lg !px-2.5 !py-1',
      '!bg-[#27272A] !text-[#52525b]',
      'hover:!bg-[#3f3f46] hover:!text-[#FAFAFA] !transition-colors',
    ].join(' '),
    success: '!border-[#22C55E]/30 before:!bg-[#22C55E]',
    error:   '!border-[#EF4444]/30 before:!bg-[#EF4444]',
    warning: '!border-[#F59E0B]/30 before:!bg-[#F59E0B]',
    info:    '!border-[#409EFE]/30 before:!bg-[#409EFE]',
    loading: 'before:!bg-[#3f3f46]',
  },
} as const

const adminIcons = {
  success: <CheckCircle2 className="size-[13px] text-[#22C55E]" />,
  error: <AlertCircle className="size-[13px] text-[#EF4444]" />,
  info: <Info className="size-[13px] text-[#409EFE]" />,
  warning: <AlertTriangle className="size-[13px] text-[#F59E0B]" />,
  loading: <Loader2 className="size-[13px] animate-spin text-[#52525b]" />,
} as const

export function AdminToaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      className="toaster group"
      toastOptions={adminToastOptions}
      icons={adminIcons}
      gap={6}
      {...props}
    />
  )
}
