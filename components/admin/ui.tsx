import Link from 'next/link'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { Tone } from '@/lib/crm/format'

export function StatusBadge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={cn('tone', `tone-${tone}`)}>{children}</span>
}

export function PageHeader({ title, description, actions, eyebrow }: { title: string; description?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        {eyebrow && <div className="text-xs font-semibold uppercase tracking-widest text-accent">{eyebrow}</div>}
        <h1 className="font-serif text-3xl font-medium leading-tight text-balance md:text-4xl">{title}</h1>
        {description && <p className="text-sm leading-relaxed text-muted-foreground text-pretty">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

export function Panel({ title, description, actions, children, className, bodyClassName }: {
  title?: ReactNode; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string
}) {
  return (
    <section className={cn('flex min-w-0 flex-col rounded-2xl border border-border bg-card', className)}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex min-w-0 flex-col gap-0.5">
            {title && <h2 className="text-sm font-semibold">{title}</h2>}
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn('min-w-0', bodyClassName)}>{children}</div>
    </section>
  )
}

export function KpiCard({ label, value, hint, tone, href }: { label: string; value: ReactNode; hint?: ReactNode; tone?: Tone; href?: string }) {
  const body = (
    <div className={cn('flex h-full flex-col gap-2 rounded-2xl border border-border bg-card p-4 transition-colors', href && 'hover:border-accent', tone && `tone-${tone} row-tone`)}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className={cn('text-xl font-semibold tracking-tight md:text-2xl', tone && 'tone-text')}>{value}</span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  )
  return href ? <Link href={href} className="block h-full">{body}</Link> : body
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <p className="text-sm font-semibold">{title}</p>
      {description && <p className="max-w-sm text-sm leading-relaxed text-muted-foreground text-pretty">{description}</p>}
      {action && <div className="pt-2">{action}</div>}
    </div>
  )
}

export function TableScroll({ children, maxHeight }: { children: ReactNode; maxHeight?: string }) {
  return <div className="overflow-x-auto" style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}>{children}</div>
}

export function DefinitionGrid({ items, columns = 2 }: { items: [string, ReactNode][]; columns?: 1 | 2 | 3 }) {
  return (
    <dl className={cn('grid gap-x-6 gap-y-4 p-5', columns === 2 && 'sm:grid-cols-2', columns === 3 && 'sm:grid-cols-2 lg:grid-cols-3')}>
      {items.map(([label, value]) => (
        <div key={label} className="flex min-w-0 flex-col gap-1">
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="break-words text-sm font-medium">{value || '—'}</dd>
        </div>
      ))}
    </dl>
  )
}

export function AccessDenied() {
  return <EmptyState title="Недостаточно прав" description="Ваша роль не даёт доступа к этому действию. Обратитесь к Super Admin." />
}
