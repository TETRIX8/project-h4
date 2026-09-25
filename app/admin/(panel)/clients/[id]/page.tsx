import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireStaffPage } from '@/lib/crm/session'
import { getClient } from '@/lib/crm/queries'
import { APPLICATION_STATUS_META, applicationCode, CONTRACT_STATUS_META, formatDate, formatDateTime, PAYMENT_METHOD_LABELS, pluralDays, rub, SCHEDULE_STATUS_META } from '@/lib/crm/format'
import { DefinitionGrid, EmptyState, PageHeader, Panel, StatusBadge, TableScroll } from '@/components/admin/ui'
import { CommentsPanel, HistoryPanel } from '@/components/admin/timeline'

export const metadata = { title: 'Клиент — ALLAHUMMA BARIK CRM' }

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaffPage('clients.view')
  const { id } = await params
  const data = await getClient(id)
  if (!data) notFound()
  const { client, applications, contracts, transactions, comments, history } = data
  const live = contracts.filter((c) => c.status !== 'terminated')
  const numberById = new Map(contracts.map((c) => [c.id, c.number]))
  const overdueRows = live.flatMap((c) => c.schedule.filter((row) => row.status === 'overdue').map((row) => ({ contract: c, row })))
  const totals: [string, string][] = [
    ['Заявок', String(applications.length)],
    ['Договоров', String(live.length)],
    ['Активных', String(live.filter((c) => c.status === 'active').length)],
    ['Завершённых', String(live.filter((c) => c.status === 'paid').length)],
    ['Сумма покупок', rub(live.reduce((s, c) => s + c.goodsKopecks, 0))],
    ['Всего оплачено', rub(live.reduce((s, c) => s + c.paidKopecks + c.depositKopecks, 0))],
    ['Остаток', rub(live.reduce((s, c) => s + c.remainingKopecks, 0))],
    ['Просрочено', rub(live.reduce((s, c) => s + c.overdueKopecks, 0))],
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow={<Link href="/admin/clients" className="hover:underline">Клиенты</Link>} title={client.fullName} description={`Клиент с ${formatDate(client.createdAt)} · ${client.phone}`}
        actions={<Link href={`/admin/applications/new?client=${client.id}`} className="crm-btn crm-btn-sm crm-btn-primary">+ Заявка для клиента</Link>} />

      <section aria-label="Сводка" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {totals.map(([label, value], index) => (
          <div key={label} className={`rounded-2xl border border-border bg-card p-4 ${index === 7 && overdueRows.length ? 'row-tone tone-red' : ''}`}>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="mt-2 font-serif text-lg font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </section>

      <Panel title="Персональные данные">
        <div className="p-4">
          <DefinitionGrid columns={3} items={[
            ['ФИО', client.fullName], ['Дата рождения', formatDate(client.birthDate)], ['Телефон', client.phone], ['Email', client.email || '—'],
            ['Паспорт', client.passportNumber || '—'], ['Дата выдачи', formatDate(client.passportIssuedAt)], ['Кем выдан', client.passportIssuedBy || '—'],
            ['Адрес проживания', client.address || '—'], ['Адрес регистрации', client.registrationAddress || '—'], ['Доп. контакты', client.extraContacts || '—'],
          ]} />
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Заявки">
          {applications.length === 0 ? <EmptyState title="Заявок нет" /> : (
            <TableScroll><table className="crm-table">
              <thead><tr><th>ID</th><th>Дата</th><th className="num">Сумма</th><th>Статус</th></tr></thead>
              <tbody>{applications.map((app) => { const meta = APPLICATION_STATUS_META[app.status]; return (
                <tr key={app.id}><td><Link href={`/admin/applications/${app.id}`} className="font-semibold text-accent hover:underline">{applicationCode(app.number)}</Link></td>
                  <td>{formatDate(app.createdAt)}</td><td className="num">{rub(app.priceKopecks)}</td><td><StatusBadge tone={meta.tone}>{meta.label}</StatusBadge></td></tr>
              ) })}</tbody>
            </table></TableScroll>
          )}
        </Panel>
        <Panel title="Договоры">
          {contracts.length === 0 ? <EmptyState title="Договоров нет" /> : (
            <TableScroll><table className="crm-table">
              <thead><tr><th>№</th><th className="num">Сумма</th><th className="num">Остаток</th><th>Статус</th></tr></thead>
              <tbody>{contracts.map((c) => { const meta = CONTRACT_STATUS_META[c.displayStatus]; return (
                <tr key={c.id} className={`row-tone tone-${meta.tone}`}><td><Link href={`/admin/contracts/${c.id}`} className="font-semibold text-accent hover:underline">{c.number}</Link></td>
                  <td className="num">{rub(c.totalKopecks)}</td><td className="num font-semibold">{rub(c.remainingKopecks)}</td><td><StatusBadge tone={meta.tone}>{meta.label}</StatusBadge></td></tr>
              ) })}</tbody>
            </table></TableScroll>
          )}
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Платежи">
          {transactions.length === 0 ? <EmptyState title="Платежей нет" /> : (
            <TableScroll maxHeight="420px"><table className="crm-table">
              <thead><tr><th>Чек</th><th>Договор</th><th>Дата</th><th className="num">Сумма</th><th>Способ</th></tr></thead>
              <tbody>{transactions.map((tx) => (
                <tr key={tx.id} className={tx.cancelledAt ? 'opacity-50' : ''}>
                  <td><Link href={`/admin/receipts/${tx.id}`} className="font-semibold hover:underline">№{tx.receiptNumber}</Link></td>
                  <td>{numberById.get(tx.contractId)}</td><td>{formatDate(tx.paidOn)}</td><td className="num font-semibold">{rub(tx.amountKopecks)}</td>
                  <td>{tx.cancelledAt ? 'Отменён' : PAYMENT_METHOD_LABELS[tx.method]}</td>
                </tr>
              ))}</tbody>
            </table></TableScroll>
          )}
        </Panel>
        <Panel title="Просрочки">
          {overdueRows.length === 0 ? <EmptyState title="Просрочек нет" /> : (
            <TableScroll><table className="crm-table">
              <thead><tr><th>Договор</th><th>Платёж</th><th>Дата</th><th className="num">Остаток</th><th>Дней</th></tr></thead>
              <tbody>{overdueRows.map(({ contract, row }) => (
                <tr key={row.id} className="row-tone tone-red"><td><Link href={`/admin/contracts/${contract.id}`} className="font-semibold hover:underline">{contract.number}</Link></td>
                  <td>№{row.installmentNumber}</td><td>{formatDate(row.dueDate)}</td><td className="num font-semibold">{rub(row.remaining)}</td>
                  <td><StatusBadge tone={SCHEDULE_STATUS_META.overdue.tone}>{pluralDays(row.daysOverdue)}</StatusBadge></td></tr>
              ))}</tbody>
            </table></TableScroll>
          )}
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <CommentsPanel entityType="client" entityId={client.id} comments={comments} />
        <HistoryPanel entries={history} title={`Изменения данных · обновлено ${formatDateTime(client.updatedAt)}`} />
      </div>
    </div>
  )
}
