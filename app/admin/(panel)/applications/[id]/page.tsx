import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { requireStaffPage } from '@/lib/crm/session'
import { getApplication, listStaff } from '@/lib/crm/queries'
import { computeTerms, todayIso } from '@/lib/crm/finance'
import { APPLICATION_STATUS_META, applicationCode, formatDate, formatDateTime, rub } from '@/lib/crm/format'
import { DefinitionGrid, PageHeader, Panel, StatusBadge, TableScroll } from '@/components/admin/ui'
import { ApplicationActions } from '@/components/admin/application-actions'
import { CommentsPanel, HistoryPanel } from '@/components/admin/timeline'

export default async function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaffPage('applications.view')
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const [data, team] = await Promise.all([getApplication(id), listStaff()])
  if (!data) notFound()
  const { application: app, items, client, contract, comments, history } = data

  const lineItems = items.length ? items : [{ id: 'legacy', name: app.productName, sku: null, category: null, quantity: 1, unitPriceKopecks: app.priceKopecks, position: 0, applicationId: app.id }]
  const terms = computeTerms({ items: lineItems, depositKopecks: app.depositKopecks, months: app.months, markupBasisPoints: app.markupBasisPoints, firstPaymentDate: app.firstPaymentDate ?? todayIso() })
  const meta = APPLICATION_STATUS_META[app.status]
  const assigned = team.find((member) => member.userId === app.assignedAdminId)

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/applications" className="inline-flex items-center gap-1.5 self-start text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" aria-hidden="true" />Все заявки</Link>
      <PageHeader
        eyebrow={<>Заявка {applicationCode(app.number)} · {formatDateTime(app.createdAt)}</>}
        title={app.customerName}
        description={<span className="inline-flex flex-wrap items-center gap-2"><StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>{assigned ? `Ответственный: ${assigned.name}` : 'Ответственный не назначен'}{app.userId ? ' · Зарегистрирован на сайте' : ' · Создана администратором'}</span>}
      />

      <Panel bodyClassName="p-5">
        <ApplicationActions
          id={app.id} status={app.status} hasContract={Boolean(contract)} contractId={contract?.id}
          assignedAdminId={app.assignedAdminId} staff={team.filter((m) => m.active).map((m) => ({ userId: m.userId, name: m.name }))}
          perms={{ edit: staff.permissions.includes('applications.edit'), approve: staff.permissions.includes('applications.approve'), contract: staff.permissions.includes('contracts.create') }}
        />
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Panel title="Данные клиента" actions={client && <Link href={`/admin/clients/${client.id}`} className="crm-btn crm-btn-sm">Карточка клиента</Link>}>
            <DefinitionGrid columns={3} items={[
              ['ФИО', client?.fullName ?? app.customerName],
              ['Дата рождения', formatDate(client?.birthDate)],
              ['Телефон', client?.phone ?? app.phone],
              ['Email', client?.email],
              ['Адрес проживания', client?.address],
              ['Адрес регистрации', client?.registrationAddress],
              ['Паспорт', client?.passportNumber],
              ['Дата выдачи', formatDate(client?.passportIssuedAt)],
              ['Кем выдан', client?.passportIssuedBy],
              ['Дополнительные контакты', client?.extraContacts],
            ]} />
          </Panel>

          <Panel title="Товары" description={`${terms.itemCount} шт. на ${rub(terms.goodsKopecks)}`}>
            <TableScroll>
              <table className="crm-table min-w-[640px]">
                <thead><tr><th>Название</th><th>Артикул</th><th>Категория</th><th className="num">Кол-во</th><th className="num">Цена</th><th className="num">Стоимость</th></tr></thead>
                <tbody>
                  {lineItems.map((item) => (
                    <tr key={item.id}><td className="font-medium">{item.name}</td><td>{item.sku ?? '—'}</td><td>{item.category ?? '—'}</td><td className="num">{item.quantity}</td><td className="num">{rub(item.unitPriceKopecks)}</td><td className="num font-semibold">{rub(item.quantity * item.unitPriceKopecks)}</td></tr>
                  ))}
                </tbody>
                <tfoot><tr><td colSpan={3}>Итого</td><td className="num">{terms.itemCount}</td><td /><td className="num">{rub(terms.goodsKopecks)}</td></tr></tfoot>
              </table>
            </TableScroll>
          </Panel>

          <Panel title="График платежей" description={`Первый платёж ${formatDate(app.firstPaymentDate ?? terms.schedule[0]?.dueDate)}`}>
            <TableScroll maxHeight="24rem">
              <table className="crm-table">
                <thead><tr><th>№</th><th>Дата</th><th className="num">Сумма</th></tr></thead>
                <tbody>
                  {terms.depositKopecks > 0 && <tr><td>Взнос</td><td>При подписании</td><td className="num">{rub(terms.depositKopecks)}</td></tr>}
                  {terms.schedule.map((line) => <tr key={line.number}><td>{line.number}</td><td>{formatDate(line.dueDate)}</td><td className="num">{rub(line.amountKopecks)}</td></tr>)}
                </tbody>
              </table>
            </TableScroll>
          </Panel>
          <HistoryPanel entries={history} title="История заявки" />
        </div>

        <aside className="flex flex-col gap-4">
          <Panel title="Финансовые условия">
            <dl className="flex flex-col gap-2.5 p-5 text-sm">
              {[
                ['Стоимость товаров', rub(terms.goodsKopecks)],
                ['Первоначальный взнос', rub(terms.depositKopecks)],
                ['Остаток к рассрочке', rub(terms.principalKopecks)],
                [`Наценка ${app.markupBasisPoints / 100}%`, rub(terms.markupKopecks)],
                ['Сумма рассрочки', rub(terms.financedKopecks)],
                ['Срок', `${terms.months} мес.`],
                ['Размер платежа', rub(terms.monthlyKopecks)],
              ].map(([label, value]) => <div key={label} className="flex justify-between gap-3"><dt className="text-muted-foreground">{label}</dt><dd className="font-medium">{value}</dd></div>)}
              <div className="mt-2 flex justify-between gap-3 border-t border-border pt-3"><dt className="font-medium">Общая сумма к оплате</dt><dd className="text-lg font-semibold text-accent">{rub(terms.totalKopecks)}</dd></div>
            </dl>
            {app.terms && <p className="border-t border-border px-5 py-4 text-sm leading-relaxed text-muted-foreground">{app.terms}</p>}
          </Panel>
          <CommentsPanel entityType="application" entityId={app.id} comments={comments} />
        </aside>
      </div>
    </div>
  )
}
