import { requireStaffPage } from '@/lib/crm/session'
import { loadLedger } from '@/lib/crm/queries'
import { rub } from '@/lib/crm/format'
import { KpiCard, PageHeader } from '@/components/admin/ui'
import { OverdueTable, type OverdueRow } from '@/components/admin/overdue-table'

export const metadata = { title: 'Просрочки — ALLAHUMMA BARIK CRM' }

export default async function OverduePage() {
  const staff = await requireStaffPage('contracts.view')
  const { ledger } = await loadLedger()
  const rows: OverdueRow[] = ledger
    .filter((c) => c.status === 'active' && c.client)
    .flatMap((contract) => {
      const lastPaid = contract.schedule.map((r) => r.paidAt).filter(Boolean).sort().at(-1) ?? null
      const next = contract.schedule.find((r) => r.status !== 'overdue' && r.remaining > 0 && !r.cancelled)
      return contract.schedule.filter((r) => r.status === 'overdue').map((row) => ({
        id: row.id, contractId: contract.id, contractNumber: contract.number,
        clientId: contract.client!.id, clientName: contract.client!.fullName, phone: contract.client!.phone,
        dueDate: row.dueDate ?? '', amountKopecks: row.amountKopecks, paidKopecks: row.paidKopecks, remaining: row.remaining,
        daysOverdue: row.daysOverdue, totalDebtKopecks: contract.remainingKopecks, installmentNumber: row.installmentNumber,
        lastPaymentDate: lastPaid ? String(lastPaid) : null, nextDueDate: next?.dueDate ?? null,
      }))
    })
  const total = rows.reduce((s, r) => s + r.remaining, 0)
  const buckets = [
    ['1–2 дня', rows.filter((r) => r.daysOverdue < 3)],
    ['3–6 дней', rows.filter((r) => r.daysOverdue >= 3 && r.daysOverdue < 7)],
    ['7–29 дней', rows.filter((r) => r.daysOverdue >= 7 && r.daysOverdue < 30)],
    ['30+ дней', rows.filter((r) => r.daysOverdue >= 30)],
  ] as const

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Контроль" title="Просрочки" description={`${rows.length} просроченных платежей на сумму ${rub(total)}. Статус пересчитывается автоматически при каждой оплате.`} />
      <section aria-label="Структура просрочки" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {buckets.map(([label, list], index) => (
          <KpiCard key={label} label={label} value={rub(list.reduce((s, r) => s + r.remaining, 0))} hint={`${list.length} платежей`} tone={index < 1 ? 'yellow' : index < 2 ? 'orange' : 'red'} />
        ))}
      </section>
      <OverdueTable rows={rows} canAccept={staff.permissions.includes('payments.accept')} />
    </div>
  )
}
