import { cn } from '@/lib/utils'

type AdminPageContainerProps = {
  children: React.ReactNode
  className?: string
}

export function AdminPageContainer({ children, className }: AdminPageContainerProps) {
  return (
    <div className={cn('min-w-0 space-y-4 overflow-x-hidden p-2 sm:space-y-6 sm:p-5', className)}>
      {children}
    </div>
  )
}

type AdminPageHeaderProps = {
  title: string
  description?: string
  children?: React.ReactNode
  className?: string
}

export function AdminPageHeader({ title, description, children, className }: AdminPageHeaderProps) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-3 sm:gap-4', className)}>
      <div className="min-w-0 flex-1">
        <h1 className="text-base font-bold text-foreground-light sm:text-xl">{title}</h1>
        {description && (
          <p className="mt-0.5 text-xs leading-5 text-foreground-muted sm:text-sm sm:leading-6">{description}</p>
        )}
      </div>
      {children && (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">{children}</div>
      )}
    </div>
  )
}

type AdminPageSectionProps = {
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
}

export function AdminPageSection({ title, description, children, className }: AdminPageSectionProps) {
  return (
    <section className={cn('rounded-xl border border-surface-300 bg-surface-100', className)}>
      {(title || description) && (
        <div className="border-b border-surface-300 px-3 py-3 sm:px-5 sm:py-4">
          {title && <h2 className="text-sm font-semibold text-foreground-light">{title}</h2>}
          {description && <p className="mt-0.5 text-[12px] text-foreground-muted">{description}</p>}
        </div>
      )}
      <div className="px-3 py-3 sm:px-5 sm:py-4">{children}</div>
    </section>
  )
}
