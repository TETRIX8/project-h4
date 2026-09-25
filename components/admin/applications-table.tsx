'use client'

import { useDeferredValue, useMemo, useState } from 'react'
import Link from 'next/link'
import { APPLICATION_STATUSES, type ApplicationStatus } from '@/lib/db/schema'
import { APPLICATION_STATUS_META, applicationCode, formatDate, rub } from '@/lib/crm/format'
import { EmptyState, Panel, StatusBadge, TableScroll } from '@/components/admin/ui'

export type ApplicationTableRow = {
  id: string; number: number | null; createdAt: string; updatedAt: string; customerName: string; phone: string
  products: string; priceKopecks: number; depositKopecks: number; months: number; monthlyKopecks: number; totalKopecks: number
  status: ApplicationStatus; assignedAdminId: string | null; assignedName: string | null; contractNumber: string | null
}

export function ApplicationsTable({ rows, staff, initialStatus }: { rows: ApplicationTableRow[]; staff: { userId: string; name: string }[]; initialStatus?: string }) {
  const [status, setStatus] = useState(initialStatus ?? '')
  const [query, setQuery] = useState('')
  const [admin, setAdmin] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [minSum, setMinSum] = useState('')
  const [maxSum, setMaxSum] = useState('')
  const deferred = useDeferredValue(query.trim().toLowerCase())

  const filtered = useMemo(() => rows.filter((row) => {
    if (status && row.status !== status) return false
    if (admin && (admin === 'none' ? row.assignedAdminId : row.assignedAdminId !== admin)) return false
    const day = row.createdAt.slice(0, 10)
    if (from && day < from) return false
    if (to && day > to) return false
    if (minSum && row.priceKopecks < Number(minSum) * 100) return false
    if (maxSum && row.priceKopecks > Number(maxSum) * 100) return false
    if (deferred) {
      const digits = deferred.replace(/\D/g, '')
      const haystack = [row.customerName, applicationCode(row.number), row.contractNumber ?? '', row.products].join(' ').toLowerCase()
      const phoneHit = digits.length >= 3 && row.phone.replace(/\D/g, '').includes(digits)
      if (!haystack.includes(deferred) && !phoneHit) return false
    }
    return true
  }), [rows, status, admin, from, to, minSum, maxSum, deferred])

  const counts = useMemo(() => Object.fromEntries(APPLICATION_STATUSES.map((s) => [s, rows.filter((row) => row.status === s).length])), [rows])
  const reset = () => { setStatus(''); setQuery(''); setAdmin(''); setFrom(''); setTo(''); setMinSum(''); setMaxSum('') }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Статус заявки">
        <button type="button" role="tab" aria-selected={!status} onClick={() => setStatus('')} className={`crm-chip ${!status ? 'crm-chip-active' : ''}`}>Все <span>{rows.length}</span></button>
        {APPLICATION_STATUSES.map((s) => (
          <button key={s} type="button" role="tab" aria-selected={status === s} onClick={() => setStatus(s)} className={`crm-chip ${status === s ? 'crm-chip-active' : ''}`}>
            {APPLICATION_STATUS_META[s].label} <span>{counts[s]}</span>
          </button>
        ))}
      </div>

      <Panel>
        <div className="grid gap-3 border-b border-border p-4 sm:grid-cols-2 lg:grid-cols-6">
          <label className="crm-label lg:col-span-2">Поиск
            <input className="crm-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ФИО, телефон, ID заявки, № договора" />
          </label>
          <label className="crm-label">Ответственный
            <select className="crm-input" value={admin} onChange={(e) => setAdmin(e.target.value)}>
              <option value="">Все</option><option value="none">Не назначен</option>
              {staff.map((member) => <option key={member.userId} value={member.userId}>{member.name}</option>)}
            </select>
          </label>
          <div className="flex gap-2">
            <label className="crm-label flex-1">С<input className="crm-input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
            <label className="crm-label flex-1">По<input className="crm-input" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
          </div>
          <div className="flex gap-2">
            <label className="crm-label flex-1">Сумма от<input className="crm-input" inputMode="numeric" value={minSum} onChange={(e) => setMinSum(e.target.value.replace(/\D/g, ''))} /></label>
            <label className="crm-label flex-1">до<input className="crm-input" inputMode="numeric" value={maxSum} onChange={(e) => setMaxSum(e.target.value.replace(/\D/g, ''))} /></label>
          </div>
          <div className="flex items-end"><button type="button" className="crm-btn w-full justify-center" onClick={reset}>Сбросить</button></div>
        </div>
        {filtered.length === 0 ? <EmptyState title="Заявки не найдены" description="Измените фильтры или создайте новую заявку." /> : (
          <TableScroll>
            <table className="crm-table min-w-[1280px]">
              <thead>
                <tr><th>ID</th><th>Дата</th><th>Клиент</th><th>Телефон</th><th>Товары</th><th className="num">Стоимость</th><th className="num">Взнос</th><th className="num">Срок</th><th className="num">В месяц</th><th className="num">Итого</th><th>Статус</th><th>Ответственный</th><th>Изменена</th></tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className="cursor-pointer">
                    <td><Link href={`/admin/applications/${row.id}`} className="font-semibold text-accent hover:underline">{applicationCode(row.number)}</Link></td>
                    <td>{formatDate(row.createdAt)}</td>
                    <td className="font-medium"><Link href={`/admin/applications/${row.id}`} className="hover:underline">{row.customerName}</Link></td>
                    <td className="whitespace-nowrap">{row.phone}</td>
                    <td className="max-w-56 truncate" title={row.products}>{row.products}</td>
                    <td className="num">{rub(row.priceKopecks)}</td>
                    <td className="num">{rub(row.depositKopecks)}</td>
                    <td className="num">{row.months} мес.</td>
                    <td className="num">{rub(row.monthlyKopecks)}</td>
                    <td className="num font-semibold">{rub(row.totalKopecks)}</td>
                    <td><StatusBadge tone={APPLICATION_STATUS_META[row.status].tone}>{APPLICATION_STATUS_META[row.status].label}</StatusBadge></td>
                    <td>{row.assignedName ?? <span className="text-muted-foreground">—</span>}</td>
                    <td>{formatDate(row.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        )}
        <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">Показано {filtered.length} из {rows.length}</p>
      </Panel>
    </div>
  )
}
