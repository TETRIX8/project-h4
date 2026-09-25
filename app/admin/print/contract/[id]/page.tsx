import { notFound } from 'next/navigation'
import { requireStaffPage } from '@/lib/crm/session'
import { getContract, getSettings } from '@/lib/crm/queries'
import { formatDate, rub } from '@/lib/crm/format'
import { PrintToolbar } from '@/components/admin/print-toolbar'

export const metadata = { title: 'Договор — ALLAHUMMA BARIK' }

export default async function ContractDocumentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ print?: string }> }) {
  await requireStaffPage('contracts.view')
  const [{ id }, query] = await Promise.all([params, searchParams])
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const [data, org] = await Promise.all([getContract(id), getSettings()])
  if (!data) notFound()
  const c = data.row
  const client = c.client
  const units = c.items.reduce((s, item) => s + item.quantity, 0)
  const schedule = c.schedule.filter((row) => !row.cancelled)
  const orgName = org?.orgName || 'ALLAHUMMA BARIK'

  return (
    <div className="min-h-dvh bg-secondary">
      <PrintToolbar backHref={`/admin/contracts/${c.id}`} backLabel="К договору" autoPrint={query.print === '1'} />
      <main className="print-sheet contract-doc mx-auto my-6 flex max-w-[210mm] flex-col gap-6 border border-border bg-card p-10 text-sm leading-relaxed text-card-foreground shadow-sm">
        <header className="flex flex-col items-center gap-1 text-center">
          <p className="font-serif text-xs font-semibold tracking-[0.3em] text-muted-foreground">ALLAHUMMA BARIK</p>
          <h1 className="font-serif text-2xl font-bold text-balance">Договор купли-продажи товара в рассрочку № {c.number}</h1>
          <p className="text-muted-foreground">без процентов, в соответствии с принципами исламского финансирования (мурабаха)</p>
        </header>
        <div className="flex justify-between text-muted-foreground"><span>{org?.address?.split(',')[0] || 'г. ________'}</span><span>{formatDate(c.signedAt)}</span></div>

        <section className="flex flex-col gap-2">
          <p><strong>{orgName}</strong>{org?.inn ? `, ИНН ${org.inn}` : ''}{org?.ogrn ? `, ОГРН ${org.ogrn}` : ''}, именуемый в дальнейшем «Продавец», с одной стороны, и <strong>{client?.fullName}</strong>, {client?.birthDate ? `${formatDate(client.birthDate)} г.р., ` : ''}паспорт {client?.passportNumber || '________'}{client?.passportIssuedAt ? `, выдан ${formatDate(client.passportIssuedAt)}` : ''}{client?.passportIssuedBy ? ` ${client.passportIssuedBy}` : ''}, зарегистрированный(-ая) по адресу: {client?.registrationAddress || client?.address || '________'}, именуемый(-ая) в дальнейшем «Покупатель», с другой стороны, заключили настоящий договор о нижеследующем.</p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-serif text-base font-bold">1. Предмет договора</h2>
          <p>1.1. Продавец приобретает в собственность и продаёт Покупателю следующие товары, а Покупатель принимает и оплачивает их в порядке и сроки, установленные договором:</p>
          <table className="doc-table w-full">
            <thead><tr><th>№</th><th>Наименование</th><th>Артикул</th><th className="num">Кол-во</th><th className="num">Цена</th><th className="num">Стоимость</th></tr></thead>
            <tbody>
              {c.items.map((item, index) => (
                <tr key={`${item.name}-${index}`}>
                  <td>{index + 1}</td><td>{item.name}{item.category ? <span className="text-muted-foreground"> · {item.category}</span> : null}</td><td>{item.sku || '—'}</td>
                  <td className="num">{item.quantity} шт.</td><td className="num">{rub(item.unitPriceKopecks)}</td><td className="num">{rub(item.unitPriceKopecks * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td colSpan={3}>Итого</td><td className="num">{units} шт.</td><td /><td className="num">{rub(c.goodsKopecks)}</td></tr></tfoot>
          </table>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-base font-bold">2. Цена и порядок расчётов</h2>
          <dl className="doc-terms">
            {([
              ['Стоимость товаров', rub(c.goodsKopecks)],
              ['Первоначальный взнос', rub(c.depositKopecks)],
              ['Остаток стоимости товаров', rub(c.principalKopecks)],
              ['Наценка продавца (фиксированная)', rub(c.markupKopecks)],
              ['Сумма рассрочки', rub(c.financedKopecks)],
              ['Срок рассрочки', `${c.months} мес.`],
              ['Ежемесячный платёж', rub(c.monthlyKopecks)],
              ['Общая сумма по договору', rub(c.totalKopecks)],
            ] as const).map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 border-b border-dotted border-border py-1"><dt>{label}</dt><dd className="font-semibold tabular-nums">{value}</dd></div>
            ))}
          </dl>
          <p>2.2. Цена договора фиксирована и не может быть увеличена. Проценты, пени и штрафы за просрочку не начисляются.</p>
          <p>2.3. Платежи вносятся согласно графику (Приложение № 1) наличными, банковским переводом или картой.</p>
          {c.terms && <p>2.4. Дополнительные условия: {c.terms}</p>}
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-base font-bold">3. Права и обязанности сторон</h2>
          <p>3.1. Продавец обязуется передать товар надлежащего качества в комплектности, указанной в разделе 1.</p>
          <p>3.2. Покупатель обязуется своевременно вносить платежи по графику. Досрочное погашение допускается без ограничений.</p>
          <p>3.3. Договор вступает в силу с момента подписания и действует до полного исполнения обязательств сторонами.</p>
        </section>

        <section className="doc-page-break flex flex-col gap-3">
          <h2 className="font-serif text-base font-bold">Приложение № 1. График платежей</h2>
          <table className="doc-table w-full">
            <thead><tr><th>№</th><th>Дата платежа</th><th className="num">Сумма</th><th className="num">Остаток после платежа</th></tr></thead>
            <tbody>
              {schedule.map((row, index) => {
                const after = c.financedKopecks - schedule.slice(0, index + 1).reduce((s, r) => s + r.amountKopecks, 0)
                return <tr key={row.id}><td>{row.installmentNumber}</td><td>{formatDate(row.dueDate)}</td><td className="num">{rub(row.amountKopecks)}</td><td className="num">{rub(Math.max(0, after))}</td></tr>
              })}
            </tbody>
            <tfoot><tr><td colSpan={2}>Итого платежей</td><td className="num">{rub(schedule.reduce((s, r) => s + r.amountKopecks, 0))}</td><td /></tr></tfoot>
          </table>
        </section>

        <section className="grid gap-8 pt-6 sm:grid-cols-2">
          {[
            ['Продавец', [orgName, org?.address, org?.phone, org?.bankDetails]],
            ['Покупатель', [client?.fullName, client?.phone, client?.email, client?.address]],
          ].map(([role, details]) => (
            <div key={role as string} className="flex flex-col gap-1">
              <p className="font-serif font-bold">{role as string}</p>
              {(details as (string | null | undefined)[]).filter(Boolean).map((line) => <p key={line} className="text-muted-foreground">{line}</p>)}
              <p className="mt-8 border-t border-foreground pt-1 text-xs text-muted-foreground">подпись / расшифровка</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  )
}
