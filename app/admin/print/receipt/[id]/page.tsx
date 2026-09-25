import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { transactions, payments } from '@/lib/db/schema'
import { requireStaffPage } from '@/lib/crm/session'
import { getContract, getSettings } from '@/lib/crm/queries'
import { formatDate, formatDateTime, PAYMENT_METHOD_LABELS, rub } from '@/lib/crm/format'
import { PrintToolbar } from '@/components/admin/print-toolbar'

export const metadata = { title: 'Чек — ALLAHUMMA BARIK' }

export default async function ReceiptPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ print?: string; format?: string }> }) {
  await requireStaffPage('receipts.print')
  const [{ id }, query] = await Promise.all([params, searchParams])
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const [tx] = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1)
  if (!tx) notFound()
  const [data, org, [payment]] = await Promise.all([
    getContract(tx.contractId),
    getSettings(),
    db.select({ installmentNumber: payments.installmentNumber }).from(payments).where(eq(payments.id, tx.paymentId)).limit(1),
  ])
  if (!data) notFound()
  const contract = data.row
  const thermal = query.format === 'thermal'
  const base = `/admin/print/receipt/${tx.id}`
  const lines: [string, string][] = [
    ['Номер договора', contract.number],
    ['Клиент', contract.client?.fullName ?? '—'],
    ['Телефон', contract.client?.phone ?? '—'],
    ['Платёж по графику', payment ? `№${payment.installmentNumber}` : '—'],
    ['Дата оплаты', formatDate(tx.paidOn)],
    ['Способ оплаты', PAYMENT_METHOD_LABELS[tx.method]],
    ['Общая сумма договора', rub(contract.totalKopecks)],
    ['Оплачено всего', rub(contract.paidKopecks + contract.depositKopecks)],
    ['Остаток задолженности', rub(contract.remainingKopecks)],
    ['Следующий платёж', contract.next ? rub(contract.next.remaining) : 'Договор погашен'],
    ['Дата следующего платежа', contract.next ? formatDate(contract.next.dueDate) : '—'],
  ]

  return (
    <div className="min-h-dvh bg-secondary">
      <PrintToolbar backHref={`/admin/contracts/${contract.id}`} backLabel="К договору" autoPrint={query.print === '1'}
        formats={[{ href: base, label: 'A4', active: !thermal }, { href: `${base}?format=thermal`, label: 'Термо 80 мм', active: thermal }]} />
      <main className={`print-sheet mx-auto my-6 bg-card text-card-foreground shadow-sm ${thermal ? 'receipt-thermal max-w-[80mm] p-4 font-mono text-xs' : 'max-w-xl rounded-2xl border border-border p-8 text-sm'}`}>
        <header className={`flex flex-col items-center gap-1 text-center ${thermal ? 'border-b border-dashed border-foreground pb-3' : 'border-b border-border pb-5'}`}>
          <p className={`font-serif font-bold tracking-widest ${thermal ? 'text-base' : 'text-2xl'}`}>ALLAHUMMA BARIK</p>
          <p className="font-semibold">{org?.orgName}</p>
          {org?.inn && <p>ИНН {org.inn}{org.ogrn ? ` · ОГРН ${org.ogrn}` : ''}</p>}
          {org?.address && <p>{org.address}</p>}
          {org?.phone && <p>{org.phone}</p>}
        </header>
        <div className={`flex flex-col items-center gap-1 text-center ${thermal ? 'py-3' : 'py-5'}`}>
          <p className="font-semibold uppercase tracking-wider">Кассовый чек №{tx.receiptNumber}</p>
          <p className="text-muted-foreground">{formatDateTime(tx.createdAt)}</p>
          {tx.cancelledAt && <p className="font-bold uppercase text-destructive">Аннулирован: {tx.cancelReason}</p>}
        </div>
        <div className={`flex flex-col items-center gap-1 ${thermal ? 'border-y border-dashed border-foreground py-3' : 'rounded-xl bg-secondary py-5'}`}>
          <p className="text-muted-foreground">Сумма внесённого платежа</p>
          <p className={`font-serif font-bold tabular-nums ${thermal ? 'text-xl' : 'text-4xl'}`}>{rub(tx.amountKopecks)}</p>
        </div>
        <dl className={`flex flex-col ${thermal ? 'gap-1 py-3' : 'gap-2 py-5'}`}>
          {lines.map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-4">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="text-right font-semibold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
        {tx.comment && <p className="border-t border-border pt-3 text-muted-foreground">Комментарий: {tx.comment}</p>}
        <footer className={`flex flex-col items-center gap-1 text-center ${thermal ? 'border-t border-dashed border-foreground pt-3' : 'border-t border-border pt-5'}`}>
          <p className="font-serif text-base font-semibold">Спасибо за оплату</p>
          <p className="text-muted-foreground">Кассир: {tx.recordedByName || '—'}</p>
        </footer>
      </main>
    </div>
  )
}
