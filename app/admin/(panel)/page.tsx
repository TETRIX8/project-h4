import Link from 'next/link'
import { Plus } from 'lucide-react'
import { requireStaffPage } from '@/lib/crm/session'
import { dueEntries, listApplications, listAudit, listTransactions, loadLedger, type DueEntry } from '@/lib/crm/queries'
import { buildAnalytics } from '@/lib/crm/analytics'
import { addDays, REMINDER_LABELS } from '@/lib/crm/finance'
import { APPLICATION_STATUS_META, applicationCode, formatDate, formatDateTime, pluralDays, rub, SCHEDULE_STATUS_META } from '@/lib/crm/format'
import { EmptyState, KpiCard, PageHeader, Panel, StatusBadge, TableScroll } from '@/components/admin/ui'
import { PaymentButton } from '@/components/admin/payment-dialog'
import { CrmCharts } from '@/components/admin/charts'

const APPROVED = ['approved', 'awaiting_contract', 'contract_signed', 'active', 'completed']

function payTarget(entry: DueEntry) {
  return {
    paymentId: entry.row.id, clientName: entry.contract.client?.fullName ?? '—', phone: entry.contract.client?.phone,
    contractNumber: entry.contract.number, installmentNumber: entry.row.installmentNumber,
    amountKopecks: entry.row.amountKopecks, paidKopecks: entry.row.paidKopecks, dueDate: entry.row.dueDate,
  }
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const staff = await requireStaffPage()
  const { denied } = await searchParams
  const [{ today, ledger, clients }, apps, recentTx, recentAudit] = await Promise.all([loadLedger(), listApplications(), listTransactions(8), listAudit(8)])
  const analytics = await buildAnalytics(ledger, addDays(today, -29), today)
  const canPay = staff.permissions.includes('payments.accept')

  const live = ledger.filter((contract) => !['draft', 'terminated'].includes(contract.status))
  const entries = dueEntries(ledger)
  const tomorrow = addDays(today, 1)
  const week = addDays(today, 7)
  const todays = entries.filter((entry) => entry.row.dueDate === today)
  const tomorrows = entries.filter((entry) => entry.row.dueDate === tomorrow)
  const weekly = entries.filter((entry) => entry.row.dueDate && entry.row.dueDate >= today && entry.row.dueDate <= week)
  const overdue = entries.filter((entry) => entry.row.status === 'overdue').sort((a, b) => b.row.daysOverdue - a.row.daysOverdue)
  const attention = entries.filter((entry) => entry.bucket).sort((a, b) => a.row.daysUntil - b.row.daysUntil)
  const sum = (list: DueEntry[]) => list.reduce((total, entry) => total + entry.row.remaining, 0)

  const kpis = [
    { label: 'Всего клиентов', value: clients.length, href: '/admin/clients' },
    { label: 'Новые заявки', value: apps.filter((a) => a.status === 'new').length, href: '/admin/applications?status=new', tone: 'blue' as const },
    { label: 'На рассмотрении', value: apps.filter((a) => a.status === 'review' || a.status === 'needs_info').length, href: '/admin/applications?status=review' },
    { label: 'Одобрено', value: apps.filter((a) => APPROVED.includes(a.status)).length },
    { label: 'Отклонено', value: apps.filter((a) => a.status === 'rejected').length },
    { label: 'Активные договоры', value: ledger.filter((c) => ['active', 'prepared'].includes(c.status)).length, href: '/admin/contracts' },
    { label: 'Полностью погашены', value: ledger.filter((c) => c.status === 'paid').length },
    { label: 'Выдано рассрочек', value: rub(live.reduce((s, c) => s + c.totalKopecks, 0)) },
    { label: 'Получено платежей', value: rub(live.reduce((s, c) => s + c.paidKopecks, 0)), tone: 'green' as const },
    { label: 'Осталось получить', value: rub(live.reduce((s, c) => s + c.remainingKopecks, 0)) },
    { label: 'Просроченная задолженность', value: rub(sum(overdue)), tone: overdue.length ? ('red' as const) : undefined, href: '/admin/overdue', hint: `${overdue.length} платежей` },
    { label: 'Платежи сегодня', value: rub(sum(todays)), hint: `${todays.length} платежей`, tone: todays.length ? ('orange' as const) : undefined },
    { label: 'Платежи завтра', value: rub(sum(tomorrows)), hint: `${tomorrows.length} платежей`, tone: tomorrows.length ? ('yellow' as const) : undefined },
    { label: 'Ближайшие 7 дней', value: rub(sum(weekly)), hint: `${weekly.length} платежей` },
  ]

  return (
    <>
      <PageHeader
        eyebrow={formatDate(today)}
        title={`Ассаляму алейкум, ${staff.name.split(' ')[0]}`}
        description="Сводка по заявкам, договорам и платежам на сегодня."
        actions={staff.permissions.includes('applications.edit') && (
          <Link href="/admin/applications/new" className="crm-btn crm-btn-primary"><Plus className="size-4" aria-hidden="true" />Создать заявку</Link>
        )}
      />
      {denied && <p role="alert" className="rounded-xl border border-destructive/30 px-4 py-3 text-sm text-destructive">У вашей роли нет доступа к запрошенному разделу.</p>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {kpis.map((kpi) => <KpiCard key={kpi.label} {...kpi} />)}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="Требуют внимания" description="Автоматические напоминания по графикам" className="xl:row-span-2" bodyClassName="max-h-[640px] overflow-y-auto">
          {attention.length === 0 ? <EmptyState title="Всё спокойно" description="Нет платежей в ближайшие 7 дней и нет просрочек." /> : (
            <ul className="divide-y divide-border">
              {attention.map((entry) => {
                const tone = entry.row.status === 'overdue' ? 'red' : entry.row.status === 'today' ? 'orange' : 'yellow'
                return (
                  <li key={entry.row.id} className={`tone-${tone} row-tone flex items-center justify-between gap-3 px-5 py-3`}>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="tone-text text-xs font-semibold">{entry.bucket && REMINDER_LABELS[entry.bucket]}</span>
                      <Link href={`/admin/contracts/${entry.contract.id}`} className="truncate text-sm font-medium hover:underline">{entry.contract.client?.fullName}</Link>
                      <span className="text-xs text-muted-foreground">
                        {rub(entry.row.remaining)} · {formatDate(entry.row.dueDate)}{entry.row.daysOverdue > 0 && ` · просрочка ${pluralDays(entry.row.daysOverdue)}`}
                      </span>
                    </div>
                    {canPay && <PaymentButton target={payTarget(entry)} label="Принять" />}
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>

        <Panel title="Платежи сегодня" description={`${todays.length} · ${rub(sum(todays))}`} className="xl:col-span-2">
          {todays.length === 0 ? <EmptyState title="Сегодня платежей нет" /> : (
            <TableScroll>
              <table className="crm-table">
                <thead><tr><th>Клиент</th><th>Договор</th><th className="num">Сумма</th><th>Дата</th><th>Статус</th><th /></tr></thead>
                <tbody>
                  {todays.map((entry) => (
                    <tr key={entry.row.id}>
                      <td className="font-medium">{entry.contract.client?.fullName}</td>
                      <td><Link href={`/admin/contracts/${entry.contract.id}`} className="hover:underline">{entry.contract.number}</Link></td>
                      <td className="num font-semibold">{rub(entry.row.remaining)}</td>
                      <td>{formatDate(entry.row.dueDate)}</td>
                      <td><StatusBadge tone={SCHEDULE_STATUS_META[entry.row.status].tone}>{SCHEDULE_STATUS_META[entry.row.status].label}</StatusBadge></td>
                      <td className="num">{canPay && <PaymentButton target={payTarget(entry)} />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          )}
        </Panel>

        <Panel title="Платежи завтра" description={formatDate(tomorrow)} className="xl:col-span-2">
          {tomorrows.length === 0 ? <EmptyState title="Завтра платежей нет" /> : (
            <TableScroll>
              <table className="crm-table">
                <thead><tr><th>Клиент</th><th className="num">Сумма</th><th>Дата</th><th>Телефон</th><th>Статус</th></tr></thead>
                <tbody>
                  {tomorrows.map((entry) => (
                    <tr key={entry.row.id}>
                      <td className="font-medium">{entry.contract.client?.fullName}</td>
                      <td className="num font-semibold">{rub(entry.row.remaining)}</td>
                      <td>{formatDate(entry.row.dueDate)}</td>
                      <td><a href={`tel:${entry.contract.client?.phone}`} className="hover:underline">{entry.contract.client?.phone}</a></td>
                      <td><StatusBadge tone={SCHEDULE_STATUS_META[entry.row.status].tone}>{SCHEDULE_STATUS_META[entry.row.status].label}</StatusBadge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          )}
        </Panel>
      </div>

      <Panel title="Просрочки" description={`${overdue.length} платежей · ${rub(sum(overdue))}`} actions={<Link href="/admin/overdue" className="crm-btn crm-btn-sm">Все просрочки</Link>}>
        {overdue.length === 0 ? <EmptyState title="Просрочек нет" /> : (
          <TableScroll>
            <table className="crm-table">
              <thead><tr><th>Клиент</th><th>Договор</th><th className="num">Дней</th><th className="num">Просрочено</th><th className="num">Общий долг</th><th /></tr></thead>
              <tbody>
                {overdue.slice(0, 8).map((entry) => (
                  <tr key={entry.row.id} className="tone-red row-tone">
                    <td className="font-medium">{entry.contract.client?.fullName}</td>
                    <td>{entry.contract.number}</td>
                    <td className="num tone-text font-semibold">{entry.row.daysOverdue}</td>
                    <td className="num">{rub(entry.row.remaining)}</td>
                    <td className="num">{rub(entry.contract.remainingKopecks)}</td>
                    <td className="num"><Link href={`/admin/contracts/${entry.contract.id}`} className="crm-btn crm-btn-sm">Открыть договор</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        )}
      </Panel>

      <CrmCharts series={analytics.series} kinds={['applications', 'decisions', 'revenue', 'payments', 'overdue', 'active']} />

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="Последние заявки" actions={<Link href="/admin/applications" className="crm-btn crm-btn-sm">Все</Link>}>
          {apps.length === 0 ? <EmptyState title="Заявок пока нет" /> : (
            <ul className="divide-y divide-border">
              {apps.slice(0, 7).map((app) => (
                <li key={app.id}>
                  <Link href={`/admin/applications/${app.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-secondary/50">
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium">{app.customerName}</span>
                      <span className="truncate text-xs text-muted-foreground">{applicationCode(app.number)} · {rub(app.priceKopecks)}</span>
                    </span>
                    <StatusBadge tone={APPLICATION_STATUS_META[app.status].tone}>{APPLICATION_STATUS_META[app.status].label}</StatusBadge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Последние платежи" actions={<Link href="/admin/payments" className="crm-btn crm-btn-sm">Все</Link>}>
          {recentTx.length === 0 ? <EmptyState title="Платежей пока нет" /> : (
            <ul className="divide-y divide-border">
              {recentTx.map(({ tx, clientName, contractNumber }) => (
                <li key={tx.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">{clientName}</span>
                    <span className="truncate text-xs text-muted-foreground">{contractNumber} · чек №{tx.receiptNumber} · {formatDate(tx.paidOn)}</span>
                  </span>
                  <span className={`text-sm font-semibold ${tx.cancelledAt ? 'text-muted-foreground line-through' : ''}`}>{rub(tx.amountKopecks)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Действия администраторов" actions={staff.permissions.includes('audit.view') && <Link href="/admin/audit" className="crm-btn crm-btn-sm">Журнал</Link>}>
          {recentAudit.length === 0 ? <EmptyState title="Действий пока нет" /> : (
            <ul className="divide-y divide-border">
              {recentAudit.map((entry) => (
                <li key={entry.id} className="flex flex-col gap-0.5 px-5 py-3">
                  <span className="text-sm font-medium">{entry.action}{entry.entityLabel && <span className="text-muted-foreground"> · {entry.entityLabel}</span>}</span>
                  <span className="text-xs text-muted-foreground">{(entry.actorName ?? 'Система').split(' (')[0]} · {formatDateTime(entry.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  )
}
