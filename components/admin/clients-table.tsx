'use client'

import { useDeferredValue, useMemo, useState } from 'react'
import Link from 'next/link'
import { formatDate, rub } from '@/lib/crm/format'
import { EmptyState, Panel, StatusBadge, TableScroll } from '@/components/admin/ui'

export type ClientTableRow = {
  id: string; fullName: string; phone: string; email: string; passport: string; createdAt: string
  applications: number; contracts: number; active: number; completed: number
  purchasesKopecks: number; paidKopecks: number; remainingKopecks: number; overdueKopecks: number
}

type Sort = 'recent' | 'debt' | 'overdue' | 'name'

export function ClientsTable({ rows }: { rows: ClientTableRow[] }) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<Sort>('recent')
  const [onlyOverdue, setOnlyOverdue] = useState(false)
  const deferred = useDeferredValue(query.trim().toLowerCase())
  const filtered = useMemo(() => {
    const digits = deferred.replace(/\D/g, '')
    const list = rows.filter((row) => {
      if (onlyOverdue && row.overdueKopecks === 0) return false
      if (!deferred) return true
      return [row.fullName, row.email, row.passport].join(' ').toLowerCase().includes(deferred) || (digits.length >= 3 && (row.phone + row.passport).replace(/\D/g, '').includes(digits))
    })
    const sorters: Record<Sort, (a: ClientTableRow, b: ClientTableRow) => number> = {
      recent: (a, b) => b.createdAt.localeCompare(a.createdAt),
      debt: (a, b) => b.remainingKopecks - a.remainingKopecks,
      overdue: (a, b) => b.overdueKopecks - a.overdueKopecks,
      name: (a, b) => a.fullName.localeCompare(b.fullName, 'ru'),
    }
    return [...list].sort(sorters[sort])
  }, [rows, deferred, sort, onlyOverdue])

  return (
    <Panel>
      <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-end">
        <label className="crm-label flex-1">Поиск<input className="crm-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ФИО, телефон, email, паспорт" /></label>
        <label className="crm-label md:w-56">Сортировка
          <select className="crm-input" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="recent">Сначала новые</option><option value="debt">По остатку долга</option><option value="overdue">По просрочке</option><option value="name">По алфавиту</option>
          </select>
        </label>
        <label className="flex min-h-9 items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={onlyOverdue} onChange={(e) => setOnlyOverdue(e.target.checked)} className="size-4 accent-[var(--tone-red)]" />Только с просрочкой
        </label>
      </div>
      {filtered.length === 0 ? <EmptyState title="Клиенты не найдены" description="Клиент создаётся автоматически при подаче заявки." /> : (
        <TableScroll>
          <table className="crm-table min-w-[1200px]">
            <thead><tr>
              <th>Клиент</th><th>Телефон</th><th>Паспорт</th><th>Регистрация</th><th className="num">Заявки</th><th className="num">Договоры</th>
              <th className="num">Активные</th><th className="num">Покупки</th><th className="num">Оплачено</th><th className="num">Остаток</th><th>Просрочка</th>
            </tr></thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className={row.overdueKopecks > 0 ? 'row-tone tone-red' : ''}>
                  <td>
                    <Link href={`/admin/clients/${row.id}`} className="font-semibold hover:text-accent hover:underline">{row.fullName}</Link>
                    {row.email && <p className="text-xs text-muted-foreground">{row.email}</p>}
                  </td>
                  <td>{row.phone}</td>
                  <td>{row.passport || '—'}</td>
                  <td>{formatDate(row.createdAt)}</td>
                  <td className="num">{row.applications}</td>
                  <td className="num">{row.contracts}</td>
                  <td className="num">{row.active}</td>
                  <td className="num">{rub(row.purchasesKopecks)}</td>
                  <td className="num text-[var(--tone-green)]">{rub(row.paidKopecks)}</td>
                  <td className="num font-semibold">{rub(row.remainingKopecks)}</td>
                  <td>{row.overdueKopecks > 0 ? <StatusBadge tone="red">{rub(row.overdueKopecks)}</StatusBadge> : <span className="text-muted-foreground">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      )}
    </Panel>
  )
}
