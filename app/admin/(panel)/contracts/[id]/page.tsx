import Link from 'next/link'
import { notFound } from 'next/navigation'
import { FileText, Receipt } from 'lucide-react'
import { requireStaffPage } from '@/lib/crm/session'
import { getContract } from '@/lib/crm/queries'
import { db } from '@/lib/db'
import { comments } from '@/lib/db/schema'
import { and, desc, eq } from 'drizzle-orm'
import { applicationCode, CONTRACT_STATUS_META, formatDate, formatDateTime, PAYMENT_METHOD_LABELS, pluralDays, rub, SCHEDULE_STATUS_META } from '@/lib/crm/format'
import { DefinitionGrid, EmptyState, PageHeader, Panel, StatusBadge, TableScroll } from '@/components/admin/ui'
import { PaymentButton } from '@/components/admin/payment-dialog'
import { CancelTransactionButton, ContractStatusActions } from '@/components/admin/contract-actions'
import { CommentsPanel, HistoryPanel } from '@/components/admin/timeline'

export const metadata = { title: 'Договор — ALLAHUMMA BARIK CRM' }

export default async function ContractPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaffPage('contracts.view')
  const { id } = await params
  const [data, notes] = await Promise.all([
    getContract(id),
    db.select().from(comments).where(and(eq(comments.entityType, 'contract'), eq(comments.entityId, id))).orderBy(desc(comments.createdAt)),
  ])
  if (!data) notFound()
  const { row: contract, transactions, history, application } = data
  const client = contract.client
  const meta = CONTRACT_STATUS_META[contract.displayStatus]
  const canAccept = staff.permissions.includes('payments.accept') && ['prepared', 'active'].includes(contract.status)
  const canCancel = staff.permissions.includes('payments.cancel')
  const canEdit = staff.permissions.includes('contracts.edit')
  const itemCount = contract.items.reduce((sum, item) => sum + item.quantity, 0)
  const progress = contract.totalKopecks > 0 ? Math.min(100, Math.round((contract.paidKopecks / contract.financedKopecks) * 100)) : 0

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={<Link href="/admin/contracts" className="hover:underline">Договоры</Link>}
        title={`Договор ${contract.number}`}
        description={<span className="flex flex-wrap items-center gap-2"><StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>от {formatDate(contract.signedAt)}{application && <> · заявка <Link className="text-accent hover:underline" href={`/admin/applications/${application.id}`}>{applicationCode(application.number)}</Link></>}</span>}
        actions={<>
          <Link href={`/admin/contracts/${contract.id}/document`} className="crm-btn crm-btn-sm"><FileText className="size-4" aria-hidden />Документ договора</Link>
          {canEdit && <ContractStatusActions id={contract.id} status={contract.status} />}
          {canAccept && contract.next && client && (
            <PaymentButton target={{ paymentId: contract.next.id, clientName: client.fullName, phone: client.phone, contractNumber: contract.number, installmentNumber: contract.next.installmentNumber, amountKopecks: contract.next.amountKopecks, paidKopecks: contract.next.paidKopecks, dueDate: contract.next.dueDate }} />
          )}
        </>}
      />

      {contract.statusReason && ['suspended', 'terminated'].includes(contract.status) && (
        <p className="rounded-xl border border-border bg-card p-4 text-sm"><span className="font-semibold">Причина: </span>{contract.statusReason}</p>
      )}

      <section aria-label="Финансовая сводка" className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          ['Сумма по договору', rub(contract.totalKopecks)],
          ['Оплачено', rub(contract.paidKopecks + contract.depositKopecks)],
          ['Остаток', rub(contract.remainingKopecks)],
          ['Следующий платёж', contract.next ? `${rub(contract.next.remaining)} · ${formatDate(contract.next.dueDate)}` : '—'],
          ['Просрочка', contract.overdueKopecks > 0 ? `${rub(contract.overdueKopecks)} · ${pluralDays(contract.maxDaysOverdue)}` : 'Нет'],
        ].map(([label, value], index) => (
          <div key={label} className={`rounded-2xl border border-border bg-card p-4 ${index === 4 && contract.overdueKopecks > 0 ? 'row-tone tone-red' : ''}`}>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="mt-2 font-serif text-lg font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </section>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Погашено по рассрочке</span><span className="font-semibold tabular-nums">{progress}%</span></div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Погашено">
          <div className="h-full rounded-full bg-accent" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel title="Товары в договоре" className="xl:col-span-2">
          <TableScroll>
            <table className="crm-table min-w-[640px]">
              <thead><tr><th>Название</th><th>Артикул</th><th>Категория</th><th className="num">Кол-во</th><th className="num">Цена за ед.</th><th className="num">Стоимость</th></tr></thead>
              <tbody>
                {contract.items.map((item, index) => (
                  <tr key={`${item.name}-${index}`}>
                    <td className="font-medium">{item.name}</td><td>{item.sku || '—'}</td><td>{item.category || '—'}</td>
                    <td className="num">{item.quantity} шт.</td><td className="num">{rub(item.unitPriceKopecks)}</td><td className="num font-semibold">{rub(item.quantity * item.unitPriceKopecks)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
          <dl className="grid gap-2 border-t border-border p-4 text-sm sm:grid-cols-2">
            {[
              ['Количество товаров', `${itemCount} шт.`], ['Стоимость товаров', rub(contract.goodsKopecks)], ['Первоначальный взнос', rub(contract.depositKopecks)],
              ['Сумма рассрочки', rub(contract.principalKopecks)], ['Наценка', rub(contract.markupKopecks)], ['К оплате по графику', rub(contract.financedKopecks)],
              ['Срок', `${contract.months} мес.`], ['Ежемесячный платёж', rub(contract.monthlyKopecks)],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4"><dt className="text-muted-foreground">{label}</dt><dd className="font-semibold tabular-nums">{value}</dd></div>
            ))}
          </dl>
        </Panel>

        <Panel title="Клиент" actions={client && <Link href={`/admin/clients/${client.id}`} className="crm-btn crm-btn-sm">Карточка</Link>}>
          <div className="p-4">
            {client ? <DefinitionGrid columns={1} items={[['ФИО', client.fullName], ['Телефон', client.phone], ['Email', client.email || '—'], ['Паспорт', client.passportNumber || '—'], ['Адрес', client.address || '—']]} /> : <p className="text-sm text-muted-foreground">Клиент не найден</p>}
          </div>
        </Panel>
      </div>

      <Panel title="График платежей" description="Зелёный — оплачено, жёлтый — скоро, оранжевый — сегодня, красный — просрочка, серый — будущий.">
        <TableScroll>
          <table className="crm-table min-w-[820px]">
            <thead><tr><th>№</th><th>Дата платежа</th><th className="num">Сумма</th><th className="num">Оплачено</th><th>Дата оплаты</th><th className="num">Остаток</th><th>Статус</th><th /></tr></thead>
            <tbody>
              {contract.schedule.map((row) => {
                const status = SCHEDULE_STATUS_META[row.status]
                return (
                  <tr key={row.id} className={`row-tone tone-${status.tone}`}>
                    <td className="font-semibold">{row.installmentNumber}</td>
                    <td>{formatDate(row.dueDate)}</td>
                    <td className="num">{rub(row.amountKopecks)}</td>
                    <td className="num">{rub(row.paidKopecks)}</td>
                    <td>{formatDate(row.paidAt)}</td>
                    <td className="num font-semibold">{rub(row.remaining)}</td>
                    <td><StatusBadge tone={status.tone}>{status.label}{row.status === 'overdue' ? ` · ${pluralDays(row.daysOverdue)}` : ''}</StatusBadge></td>
                    <td className="text-right">
                      {canAccept && client && row.remaining > 0 && !row.cancelled && (
                        <PaymentButton label="Принять" target={{ paymentId: row.id, clientName: client.fullName, phone: client.phone, contractNumber: contract.number, installmentNumber: row.installmentNumber, amountKopecks: row.amountKopecks, paidKopecks: row.paidKopecks, dueDate: row.dueDate }} />
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </TableScroll>
      </Panel>

      <Panel title="Операции и чеки" description="Операции не удаляются — только отменяются с указанием причины.">
        {transactions.length === 0 ? <EmptyState title="Платежей пока нет" /> : (
          <TableScroll>
            <table className="crm-table min-w-[900px]">
              <thead><tr><th>Чек</th><th>Дата оплаты</th><th className="num">Сумма</th><th>Способ</th><th>Принял</th><th>Записано</th><th>Статус</th><th /></tr></thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className={tx.cancelledAt ? 'opacity-60' : ''}>
                    <td className="font-semibold">№{tx.receiptNumber}</td>
                    <td>{formatDate(tx.paidOn)}</td>
                    <td className="num font-semibold">{rub(tx.amountKopecks)}</td>
                    <td>{PAYMENT_METHOD_LABELS[tx.method]}</td>
                    <td>{tx.recordedByName || '—'}</td>
                    <td>{formatDateTime(tx.createdAt)}</td>
                    <td>{tx.cancelledAt ? <span title={tx.cancelReason ?? ''}><StatusBadge tone="gray">Отменён</StatusBadge></span> : <StatusBadge tone="green">Проведён</StatusBadge>}</td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <Link href={`/admin/receipts/${tx.id}`} className="crm-btn crm-btn-sm"><Receipt className="size-4" aria-hidden />Чек</Link>
                        {canCancel && !tx.cancelledAt && <CancelTransactionButton id={tx.id} receiptNumber={tx.receiptNumber} />}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        )}
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        <CommentsPanel entityType="contract" entityId={contract.id} comments={notes} />
        <HistoryPanel entries={history} />
      </div>
    </div>
  )
}
