'use client'

import { useDeferredValue, useMemo, useState } from 'react'
import Link from 'next/link'
import { CONTRACT_STATUSES, type ContractStatus } from '@/lib/db/schema'
import { CONTRACT_STATUS_META, formatDate, pluralDays, rub } from '@/lib/crm/format'
import { EmptyState, Panel, StatusBadge, TableScroll } from '@/components/admin/ui'

export type ContractTableRow = {
  id: string; number: string; clientName: string; phone: string; signedAt: string; products: string; itemCount: number
  goodsKopecks: number; depositKopecks: number; financedKopecks: number; months: number; monthlyKopecks: number
  paidKopecks: number; remainingKopecks: number; nextKopecks: number | null; nextDate: string | null; maxDaysOverdue: number; overdueKopecks: number
  status: ContractStatus
}

export function ContractsTable({ rows, initialStatus }: { rows: ContractTableRow[]; initialStatus?: string }) {
  const [status, setStatus] = useState(initialStatus ?? '')
  const [query, setQuery] = useState('')
  const deferred = useDeferredValue(query.trim().toLowerCase())
  const filtered = useMemo(() => rows.filter((row) => {
    if (status && row.status !== status) return false
    if (!deferred) return true
    const digits = deferred.replace(/\D/g, '')
    return [row.number, row.clientName, row.products].join(' ').toLowerCase().includes(deferred) || (digits.length >= 3 && row.phone.replace(/\D/g, '').includes(digits))
  }), [rows, status, deferred])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Статус договора">
        <button type="button" role="tab" aria-selected={!status} className={`crm-chip ${!status ? 'crm-chip-active' : ''}`} onClick={() => setStatus('')}>Все <span>{rows.length}</span></button>
        {CONTRACT_STATUSES.map((s) => (
          <button key={s} type="button" role="tab" aria-selected={status === s} className={`crm-chip ${status === s ? 'crm-chip-active' : ''}`} onClick={() => setStatus(s)}>
            {CONTRACT_STATUS_META[s].label} <span>{rows.filter((row) => row.status === s).length}</span>
          </button>
        ))}
      </div>
      <Panel>
        <div className="border-b border-border p-4">
          <label className="crm-label max-w-md">Поиск<input className="crm-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="№ договора, клиент, телефон, товар" /></label>
        </div>
        {filtered.length === 0 ? <EmptyState title="Договоры не найдены" description="Договор формируется из одобренной заявки." /> : (
          <TableScroll>
            <table className="crm-table min-w-[1500px]">
              <thead><tr>
                <th>№ договора</th><th>Клиент</th><th>Дата</th><th>Товар</th><th className="num">Кол-во</th><th className="num">Стоимость</th><th className="num">Взнос</th>
                <th className="num">Рассрочка</th><th className="num">Срок</th><th className="num">В месяц</th><th className="num">Оплачено</th><th className="num">Остаток</th>
                <th className="num">След. платёж</th><th>Дата</th><th>Просрочка</th><th>Статус</th>
              </tr></thead>
              <tbody>
                {filtered.map((row) => {
                  const meta = CONTRACT_STATUS_META[row.status]
                  return (
                    <tr key={row.id} className={`row-tone tone-${meta.tone}`}>
                      <td><Link href={`/admin/contracts/${row.id}`} className="font-semibold text-accent hover:underline">{row.number}</Link></td>
                      <td className="font-medium">{row.clientName}</td>
                      <td>{formatDate(row.signedAt)}</td>
                      <td className="max-w-52 truncate" title={row.products}>{row.products}</td>
                      <td className="num">{row.itemCount}</td>
                      <td className="num">{rub(row.goodsKopecks)}</td>
                      <td className="num">{rub(row.depositKopecks)}</td>
                      <td className="num">{rub(row.financedKopecks)}</td>
                      <td className="num">{row.months} мес.</td>
                      <td className="num">{rub(row.monthlyKopecks)}</td>
                      <td className="num text-[var(--tone-green)]">{rub(row.paidKopecks)}</td>
                      <td className="num font-semibold">{rub(row.remainingKopecks)}</td>
                      <td className="num">{row.nextKopecks ? rub(row.nextKopecks) : '—'}</td>
                      <td>{formatDate(row.nextDate)}</td>
                      <td>{row.maxDaysOverdue > 0 ? <StatusBadge tone="red">{pluralDays(row.maxDaysOverdue)} · {rub(row.overdueKopecks)}</StatusBadge> : <span className="text-muted-foreground">—</span>}</td>
                      <td><StatusBadge tone={meta.tone}>{meta.label}</StatusBadge></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </TableScroll>
        )}
      </Panel>
    </div>
  )
}
