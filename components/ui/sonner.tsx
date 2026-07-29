'use client'

import { useTheme } from 'next-themes'
import { Toaster as Sonner, ToasterProps } from 'sonner'

// ─── PORTFOLIO TOASTER ────────────────────────────────────────────────────────
// ออกแบบ: creative / personal — rounded, soft glow, navy bg

const portfolioToastOptions = {
  unstyled: true,
  classNames: {
    toast: [
      'relative flex items-start gap-3',
      'rounded-2xl border bg-[#0b1018]/95 backdrop-blur-md',
      'border-[rgba(132,212,250,0.12)]',
      'px-4 py-3.5 shadow-2xl shadow-black/60',
      'w-[340px] cursor-grab active:cursor-grabbing',
      "font-['Kanit']",
    ].join(' '),
    content: 'flex-1 min-w-0 pt-px',
    title:       "font-['Kanit'] font-semibold text-[13px] text-[#f8fbff] leading-snug",
    description: "font-['Kanit'] text-[11px] text-[#6b7a8d] mt-0.5 leading-relaxed",
    icon: 'shrink-0 mt-0.5',
    closeButton: [
      'absolute top-2.5 right-2.5',
      '!size-5 !rounded-lg !border !border-[rgba(132,212,250,0.1)]',
      '!bg-transparent !text-[#4a5568]',
      'hover:!bg-[rgba(132,212,250,0.07)] hover:!text-[#f8fbff] !transition-colors',
    ].join(' '),
    actionButton: [
      '!text-[11px] !font-semibold !rounded-xl !px-3 !py-1.5',
      '!bg-[#409EFE] !text-white hover:!bg-[#60aeff] !transition-colors',
    ].join(' '),
    cancelButton: [
      '!text-[11px] !rounded-xl !px-3 !py-1.5',
      '!bg-[rgba(132,212,250,0.06)] !text-[#6b7a8d]',
      'hover:!bg-[rgba(132,212,250,0.1)] hover:!text-[#f8fbff] !transition-colors',
    ].join(' '),
    success: '!border-[#1ED760]/20 !bg-[#061210]/95 [box-shadow:0_0_20px_rgba(30,215,96,0.06),0_8px_32px_rgba(0,0,0,0.6)]',
    error:   '!border-[#FE4040]/20 !bg-[#0f0707]/95 [box-shadow:0_0_20px_rgba(254,64,64,0.06),0_8px_32px_rgba(0,0,0,0.6)]',
    warning: '!border-[#FFB84D]/20 !bg-[#0f0c06]/95 [box-shadow:0_0_20px_rgba(255,184,77,0.06),0_8px_32px_rgba(0,0,0,0.6)]',
    info:    '!border-[#409EFE]/20 !bg-[#060c18]/95 [box-shadow:0_0_20px_rgba(64,158,254,0.06),0_8px_32px_rgba(0,0,0,0.6)]',
  },
} as const

const portfolioIcons = {
  success: <i className="fa-solid fa-circle-check    text-[#1ED760] text-[15px]" />,
  error:   <i className="fa-solid fa-circle-exclamation text-[#FE4040] text-[15px]" />,
  info:    <i className="fa-solid fa-circle-info     text-[#409EFE] text-[15px]" />,
  warning: <i className="fa-solid fa-triangle-exclamation text-[#FFB84D] text-[15px]" />,
  loading: <i className="fa-solid fa-spinner        text-[#6b7a8d] text-[15px] animate-spin" />,
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
  success: <i className="fa-solid fa-circle-check        text-[#22C55E] text-[13px]" />,
  error:   <i className="fa-solid fa-circle-exclamation  text-[#EF4444] text-[13px]" />,
  info:    <i className="fa-solid fa-circle-info         text-[#409EFE] text-[13px]" />,
  warning: <i className="fa-solid fa-triangle-exclamation text-[#F59E0B] text-[13px]" />,
  loading: <i className="fa-solid fa-spinner             text-[#52525b] text-[13px] animate-spin" />,
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
