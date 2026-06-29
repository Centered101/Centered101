import { cn } from '@/lib/utils'

type AdminPageContainerProps = {
  children: React.ReactNode
  className?: string
}

export function AdminPageContainer({ children, className }: AdminPageContainerProps) {
  return (
    <div className={cn('space-y-6 p-5', className)}>
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
    <div className={cn('flex flex-wrap items-start justify-between gap-4', className)}>
      <div>
        <h1 className="text-xl font-bold text-foreground-light">{title}</h1>
        {description && (
          <p className="mt-0.5 text-sm text-foreground-muted">{description}</p>
        )}
      </div>
      {children && (
        <div className="flex shrink-0 items-center gap-2">{children}</div>
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
        <div className="border-b border-surface-300 px-5 py-4">
          {title && <h2 className="text-sm font-semibold text-foreground-light">{title}</h2>}
          {description && <p className="mt-0.5 text-[12px] text-foreground-muted">{description}</p>}
        </div>
      )}
      <div className="px-5 py-4">{children}</div>
    </section>
  )
}
