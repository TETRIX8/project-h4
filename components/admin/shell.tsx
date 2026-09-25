'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  AlertTriangle, BarChart3, Bell, FileSignature, FileText, FolderOpen, LayoutDashboard, LogOut, Menu, Package, ScrollText, Settings, UserCog, Users, Wallet, X,
} from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { cn } from '@/lib/utils'
import type { Permission } from '@/lib/crm/permissions'
import { ROLE_LABELS } from '@/lib/crm/permissions'
import type { StaffRole } from '@/lib/db/schema'
import { GlobalSearch } from '@/components/admin/global-search'

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard; permission?: Permission; badge?: number }

export function AdminShell({ staff, unread, overdueCount, children }: {
  staff: { name: string; email: string; role: StaffRole; permissions: Permission[] }
  unread: number
  overdueCount: number
  children: ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

  const allNav: NavItem[] = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/applications', label: 'Заявки', icon: FileText, permission: 'applications.view' },
    { href: '/admin/clients', label: 'Клиенты', icon: Users, permission: 'clients.view' },
    { href: '/admin/contracts', label: 'Договоры', icon: FileSignature, permission: 'contracts.view' },
    { href: '/admin/payments', label: 'Платежи', icon: Wallet, permission: 'contracts.view' },
    { href: '/admin/overdue', label: 'Просрочки', icon: AlertTriangle, permission: 'contracts.view', badge: overdueCount },
    { href: '/admin/products', label: 'Товары', icon: Package, permission: 'applications.view' },
    { href: '/admin/documents', label: 'Документы', icon: FolderOpen, permission: 'contracts.view' },
    { href: '/admin/analytics', label: 'Аналитика', icon: BarChart3, permission: 'analytics.view' },
    { href: '/admin/notifications', label: 'Уведомления', icon: Bell, badge: unread },
    { href: '/admin/staff', label: 'Сотрудники', icon: UserCog, permission: 'staff.manage' },
    { href: '/admin/settings', label: 'Настройки', icon: Settings, permission: 'settings.manage' },
    { href: '/admin/audit', label: 'Audit Log', icon: ScrollText, permission: 'audit.view' },
  ]
  const nav = allNav.filter((item) => !item.permission || staff.permissions.includes(item.permission))

  const isActive = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href))

  const signOut = async () => {
    await authClient.signOut()
    router.push('/sign-in')
    router.refresh()
  }

  const sidebar = (
    <nav aria-label="Разделы админ-панели" className="flex h-full flex-col gap-6 bg-primary px-4 py-5 text-primary-foreground">
      <div className="flex items-center justify-between gap-2 px-2">
        <Link href="/admin" className="flex flex-col leading-tight" onClick={() => setMenuOpen(false)}>
          <span className="font-serif text-xl tracking-wide">ALLAHUMMA BARIK</span>
          <span className="text-[11px] uppercase tracking-[0.25em] text-accent">Installment CRM</span>
        </Link>
        <button type="button" className="rounded-lg p-1.5 lg:hidden" onClick={() => setMenuOpen(false)} aria-label="Закрыть меню">
          <X className="size-5" />
        </button>
      </div>
      <ul className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
        {nav.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => setMenuOpen(false)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  active ? 'bg-primary-foreground/10 text-primary-foreground' : 'text-primary-foreground/65 hover:bg-primary-foreground/5 hover:text-primary-foreground',
                )}
              >
                <Icon className={cn('size-4 shrink-0', active && 'text-accent')} aria-hidden="true" />
                <span className="flex-1">{item.label}</span>
                {!!item.badge && <span className="rounded-full bg-accent px-1.5 text-[11px] font-bold leading-5 text-primary">{item.badge > 99 ? '99+' : item.badge}</span>}
              </Link>
            </li>
          )
        })}
      </ul>
      <div className="flex flex-col gap-3 border-t border-primary-foreground/10 px-2 pt-4">
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium">{staff.name}</span>
          <span className="truncate text-xs text-primary-foreground/55">{staff.email}</span>
          <span className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-accent">{ROLE_LABELS[staff.role]}</span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <Link href="/" className="text-primary-foreground/60 hover:text-primary-foreground">На сайт</Link>
          <button type="button" onClick={signOut} className="flex items-center gap-1.5 text-primary-foreground/60 hover:text-primary-foreground">
            <LogOut className="size-3.5" aria-hidden="true" />Выйти
          </button>
        </div>
      </div>
    </nav>
  )

  return (
    <div className="admin-theme flex min-h-dvh">
      <aside className="no-print sticky top-0 hidden h-dvh w-64 shrink-0 lg:block">{sidebar}</aside>
      {menuOpen && (
        <div className="no-print fixed inset-0 z-50 flex lg:hidden">
          <div className="w-72 max-w-[85vw]">{sidebar}</div>
          <button type="button" aria-label="Закрыть меню" className="flex-1 bg-primary/40" onClick={() => setMenuOpen(false)} />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur md:px-8">
          <button type="button" className="crm-btn px-2.5 lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Открыть меню">
            <Menu className="size-4" />
          </button>
          <GlobalSearch />
          <div className="ml-auto flex items-center gap-2">
            <Link href="/admin/notifications" className="crm-btn relative px-2.5" aria-label={`Уведомления${unread ? `: ${unread} новых` : ''}`}>
              <Bell className="size-4" />
              {unread > 0 && <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-primary-foreground">{unread > 9 ? '9+' : unread}</span>}
            </Link>
            <div className="hidden items-center gap-2 md:flex">
              <span className="flex size-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground" aria-hidden="true">
                {staff.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}
              </span>
              <span className="flex flex-col leading-tight">
                <span className="text-sm font-medium">{staff.name}</span>
                <span className="text-xs text-muted-foreground">{ROLE_LABELS[staff.role]}</span>
              </span>
            </div>
          </div>
        </header>
        <main className="flex min-w-0 flex-1 flex-col gap-6 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  )
}
