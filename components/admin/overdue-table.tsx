'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { formatDate, pluralDays, rub } from '@/lib/crm/format'
import { EmptyState, Panel, StatusBadge, TableScroll } from '@/components/admin/ui'
import { PaymentButton, type PayTarget } from '@/components/admin/payment-dialog'

export type OverdueRow = {
  id: string; contractId: string; contractNumber: string; clientId: string; clientName: string; phone: string
  dueDate: string; amountKopecks: number; paidKopecks: number; remaining: number; daysOverdue: number
  totalDebtKopecks: number; lastPaymentDate: string | null; nextDueDate: string | null; installmentNumber: number
}

type Sort = 'amount' | 'days' | 'debt' | 'date'
const SORTS: [Sort, string][] = [['amount', 'Самые большие'], ['days', 'По дням'], ['debt', 'По задолженности'], ['date', 'По дате платежа']]

function severity(days: number) {
  if (days >= 30) return { label: '30+ дней', tone: 'red' as const }
  if (days >= 7) return { label: '7+ дней', tone: 'red' as const }
  if (days >= 3) return { label: '3+ дня', tone: 'orange' as const }
  return { label: '1–2 дня', tone: 'yellow' as const }
}

export function OverdueTable({ rows, canAccept }: { rows: OverdueRow[]; canAccept: boolean }) {
  const [sort, setSort] = useState<Sort>('amount')
  const sorted = useMemo(() => {
    const by: Record<Sort, (a: OverdueRow, b: OverdueRow) => number> = {
      amount: (a, b) => b.remaining - a.remaining,
      days: (a, b) => b.daysOverdue - a.daysOverdue,
      debt: (a, b) => b.totalDebtKopecks - a.totalDebtKopecks,
      date: (a, b) => a.dueDate.localeCompare(b.dueDate),
    }
    return [...rows].sort(by[sort])
  }, [rows, sort])

  return (
    <Panel>
      <div role="tablist" aria-label="Сортировка" className="flex gap-2 overflow-x-auto border-b border-border p-4">
        {SORTS.map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={sort === key} onClick={() => setSort(key)} className={`crm-chip ${sort === key ? 'crm-chip-active' : ''}`}>{label}</button>
        ))}
      </div>
      {sorted.length === 0 ? <EmptyState title="Просрочек нет" description="Все платежи по графику внесены вовремя." /> : (
        <TableScroll>
          <table className="crm-table min-w-[1180px]">
            <thead><tr>
              <th>Клиент</th><th>Договор</th><th>Дата платежа</th><th className="num">Сумма</th><th className="num">Оплачено</th><th className="num">Остаток</th>
              <th>Просрочка</th><th className="num">Общий долг</th><th>Посл. оплата</th><th>След. платёж</th><th />
            </tr></thead>
            <tbody>
              {sorted.map((row) => {
                const level = severity(row.daysOverdue)
                const target: PayTarget = { paymentId: row.id, clientName: row.clientName, phone: row.phone, contractNumber: row.contractNumber, installmentNumber: row.installmentNumber, amountKopecks: row.amountKopecks, paidKopecks: row.paidKopecks, dueDate: row.dueDate }
                return (
                  <tr key={row.id} className={`row-tone tone-${level.tone}`}>
                    <td><Link href={`/admin/clients/${row.clientId}`} className="font-semibold hover:underline">{row.clientName}</Link><p className="text-xs text-muted-foreground">{row.phone}</p></td>
                    <td><Link href={`/admin/contracts/${row.contractId}`} className="font-semibold text-accent hover:underline">{row.contractNumber}</Link><p className="text-xs text-muted-foreground">платёж №{row.installmentNumber}</p></td>
                    <td>{formatDate(row.dueDate)}</td>
                    <td className="num">{rub(row.amountKopecks)}</td>
                    <td className="num">{rub(row.paidKopecks)}</td>
                    <td className="num font-semibold">{rub(row.remaining)}</td>
                    <td><StatusBadge tone={level.tone}>{pluralDays(row.daysOverdue)}</StatusBadge></td>
                    <td className="num font-semibold">{rub(row.totalDebtKopecks)}</td>
                    <td>{formatDate(row.lastPaymentDate)}</td>
                    <td>{formatDate(row.nextDueDate)}</td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <Link href={`/admin/contracts/${row.contractId}`} className="crm-btn crm-btn-sm">Договор</Link>
                        {canAccept && <PaymentButton label="Принять" target={target} />}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </TableScroll>
      )}
    </Panel>
  )
}
