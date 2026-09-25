import Link from 'next/link'
import { requireStaffPage } from '@/lib/crm/session'
import { dueEntries, listTransactions, loadLedger } from '@/lib/crm/queries'
import { formatDate, formatDateTime, PAYMENT_METHOD_LABELS, rub, SCHEDULE_STATUS_META } from '@/lib/crm/format'
import { EmptyState, KpiCard, PageHeader, Panel, StatusBadge, TableScroll } from '@/components/admin/ui'
import { PaymentButton } from '@/components/admin/payment-dialog'

export const metadata = { title: 'Платежи — ALLAHUMMA BARIK CRM' }

export default async function PaymentsPage() {
  const staff = await requireStaffPage('contracts.view')
  const [{ ledger }, txs] = await Promise.all([loadLedger(), listTransactions(300)])
  const canAccept = staff.permissions.includes('payments.accept')
  const upcoming = dueEntries(ledger)
    .filter((entry) => entry.row.daysUntil <= 30)
    .sort((a, b) => (a.row.dueDate ?? '').localeCompare(b.row.dueDate ?? ''))
  const live = txs.filter((t) => !t.tx.cancelledAt)
  const today = new Date().toISOString().slice(0, 10)
  const sum = (list: typeof live) => list.reduce((s, t) => s + t.tx.amountKopecks, 0)
  const monthPrefix = today.slice(0, 7)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Касса" title="Платежи" description="График к оплате на 30 дней и журнал всех проведённых операций." />
      <section aria-label="Итоги" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Получено сегодня" value={rub(sum(live.filter((t) => t.tx.paidOn === today)))} tone="green" />
        <KpiCard label="Получено за месяц" value={rub(sum(live.filter((t) => t.tx.paidOn.startsWith(monthPrefix))))} />
        <KpiCard label="К получению на 30 дней" value={rub(upcoming.reduce((s, e) => s + e.row.remaining, 0))} tone="yellow" />
        <KpiCard label="Из них просрочено" value={rub(upcoming.filter((e) => e.row.status === 'overdue').reduce((s, e) => s + e.row.remaining, 0))} tone="red" href="/admin/overdue" />
      </section>

      <Panel title="К оплате" description="Просроченные, сегодняшние и ближайшие платежи по графику.">
        {upcoming.length === 0 ? <EmptyState title="Ближайших платежей нет" /> : (
          <TableScroll maxHeight="520px">
            <table className="crm-table min-w-[900px]">
              <thead><tr><th>Дата</th><th>Клиент</th><th>Договор</th><th>№</th><th className="num">По графику</th><th className="num">К оплате</th><th>Статус</th><th /></tr></thead>
              <tbody>
                {upcoming.map(({ contract, row }) => {
                  const meta = SCHEDULE_STATUS_META[row.status]
                  return (
                    <tr key={row.id} className={`row-tone tone-${meta.tone}`}>
                      <td className="font-semibold">{formatDate(row.dueDate)}</td>
                      <td>{contract.client ? <Link href={`/admin/clients/${contract.client.id}`} className="hover:underline">{contract.client.fullName}</Link> : '—'}<p className="text-xs text-muted-foreground">{contract.client?.phone}</p></td>
                      <td><Link href={`/admin/contracts/${contract.id}`} className="font-semibold text-accent hover:underline">{contract.number}</Link></td>
                      <td>{row.installmentNumber}</td>
                      <td className="num">{rub(row.amountKopecks)}</td>
                      <td className="num font-semibold">{rub(row.remaining)}</td>
                      <td><StatusBadge tone={meta.tone}>{meta.label}</StatusBadge></td>
                      <td className="text-right">
                        {canAccept && contract.client && (
                          <PaymentButton label="Принять" target={{ paymentId: row.id, clientName: contract.client.fullName, phone: contract.client.phone, contractNumber: contract.number, installmentNumber: row.installmentNumber, amountKopecks: row.amountKopecks, paidKopecks: row.paidKopecks, dueDate: row.dueDate }} />
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </TableScroll>
        )}
      </Panel>

      <Panel title="Журнал операций" description="Последние 300 операций. Отменённые остаются в журнале с причиной отмены.">
        {txs.length === 0 ? <EmptyState title="Операций пока нет" /> : (
          <TableScroll maxHeight="620px">
            <table className="crm-table min-w-[960px]">
              <thead><tr><th>Чек</th><th>Дата оплаты</th><th>Клиент</th><th>Договор</th><th>Платёж</th><th className="num">Сумма</th><th>Способ</th><th>Кассир</th><th>Записано</th><th /></tr></thead>
              <tbody>
                {txs.map(({ tx, contractNumber, clientName, clientId, installmentNumber }) => (
                  <tr key={tx.id} className={tx.cancelledAt ? 'opacity-50' : ''}>
                    <td className="font-semibold">№{tx.receiptNumber}</td>
                    <td>{formatDate(tx.paidOn)}</td>
                    <td>{clientId ? <Link href={`/admin/clients/${clientId}`} className="hover:underline">{clientName}</Link> : '—'}</td>
                    <td><Link href={`/admin/contracts/${tx.contractId}`} className="text-accent hover:underline">{contractNumber}</Link></td>
                    <td>{installmentNumber ? `№${installmentNumber}` : '—'}</td>
                    <td className="num font-semibold">{rub(tx.amountKopecks)}</td>
                    <td>{tx.cancelledAt ? <StatusBadge tone="gray">Отменён</StatusBadge> : PAYMENT_METHOD_LABELS[tx.method]}</td>
                    <td>{tx.recordedByName || '—'}</td>
                    <td>{formatDateTime(tx.createdAt)}</td>
                    <td className="text-right"><Link href={`/admin/receipts/${tx.id}`} className="crm-btn crm-btn-sm">Чек</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        )}
      </Panel>
    </div>
  )
}
