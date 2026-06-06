'use client'

import { useTheme } from 'next-themes'
import { Toaster as Sonner, ToasterProps } from 'sonner'

const toasterIcons = {
  success: <i className="fa-solid fa-circle-check text-green-500 text-sm" />,
  error: <i className="fa-solid fa-circle-exclamation text-red-500 text-sm" />,
  info: <i className="fa-solid fa-circle-info text-blue-400 text-sm" />,
  warning: <i className="fa-solid fa-circle-info text-yellow-500 text-sm" />,
  loading: <i className="fa-solid fa-spinner text-slate-400 text-sm animate-spin" />,
}

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as React.CSSProperties
      }
      icons={toasterIcons}
      {...props}
    />
  )
}

export { Toaster }
