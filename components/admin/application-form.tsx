'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import { createApplicationAction, updateApplicationAction, type ApplicationInput, type ClientInput } from '@/app/admin/actions'
import { addMonths, computeTerms, defaultMarkupBasisPoints, todayIso } from '@/lib/crm/finance'
import { formatDate, rub } from '@/lib/crm/format'
import { Panel } from '@/components/admin/ui'

type ItemDraft = { key: string; name: string; sku: string; category: string; quantity: string; unitPrice: string }

export type ApplicationFormValues = {
  clientId?: string | null
  client: ClientInput
  items: { name: string; sku?: string | null; category?: string | null; quantity: number; unitPrice: number }[]
  deposit: number
  months: number
  markupPercent: number | null
  firstPaymentDate: string
  terms?: string | null
}

const emptyClient: ClientInput = { fullName: '', phone: '', email: '', birthDate: '', address: '', passportNumber: '', passportIssuedAt: '', passportIssuedBy: '', registrationAddress: '', extraContacts: '' }
const newKey = () => Math.random().toString(36).slice(2)
const num = (value: string) => Number(value.replace(/\s/g, '').replace(',', '.')) || 0

export function ApplicationForm({ mode, applicationId, initial, canApprove, canContract }: {
  mode: 'create' | 'edit'
  applicationId?: string
  initial?: ApplicationFormValues
  canApprove: boolean
  canContract: boolean
}) {
  const router = useRouter()
  const [client, setClient] = useState<ClientInput>({ ...emptyClient, ...Object.fromEntries(Object.entries(initial?.client ?? {}).map(([k, v]) => [k, v ?? ''])) })
  const [items, setItems] = useState<ItemDraft[]>(
    initial?.items.length
      ? initial.items.map((item) => ({ key: newKey(), name: item.name, sku: item.sku ?? '', category: item.category ?? '', quantity: String(item.quantity), unitPrice: String(item.unitPrice) }))
      : [{ key: newKey(), name: '', sku: '', category: '', quantity: '1', unitPrice: '' }],
  )
  const [deposit, setDeposit] = useState(String(initial?.deposit ?? 0))
  const [months, setMonths] = useState(initial?.months ?? 6)
  const [markup, setMarkup] = useState<string | null>(initial?.markupPercent != null ? String(initial.markupPercent) : null)
  const [firstPaymentDate, setFirstPaymentDate] = useState(initial?.firstPaymentDate ?? addMonths(todayIso(), 1))
  const [terms, setTerms] = useState(initial?.terms ?? '')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const depositKopecks = Math.round(num(deposit) * 100)
  const autoMarkup = defaultMarkupBasisPoints(months, depositKopecks > 0) / 100
  const markupPercent = markup === null ? autoMarkup : num(markup)
  const calc = useMemo(() => computeTerms({
    items: items.map((item) => ({ quantity: Math.max(0, Math.trunc(num(item.quantity))), unitPriceKopecks: Math.round(num(item.unitPrice) * 100) })),
    depositKopecks, months, markupBasisPoints: Math.round(markupPercent * 100), firstPaymentDate,
  }), [items, depositKopecks, months, markupPercent, firstPaymentDate])

  const setItem = (key: string, patch: Partial<ItemDraft>) => setItems((list) => list.map((item) => (item.key === key ? { ...item, ...patch } : item)))

  const payload = (): ApplicationInput => ({
    clientId: initial?.clientId ?? null,
    client,
    items: items.map((item) => ({ name: item.name, sku: item.sku, category: item.category, quantity: Math.trunc(num(item.quantity)), unitPrice: num(item.unitPrice) })),
    deposit: num(deposit), months, markupPercent, firstPaymentDate, terms,
  })

  const submit = (then: 'save' | 'approve' | 'contract') => {
    setError(null)
    startTransition(async () => {
      if (mode === 'edit' && applicationId) {
        const result = await updateApplicationAction(applicationId, payload())
        if (!result.ok) return setError(result.error)
        router.push(`/admin/applications/${applicationId}`)
        router.refresh()
        return
      }
      const result = await createApplicationAction(payload(), then)
      if (!result.ok) return setError(result.error)
      router.push(result.contractId ? `/admin/contracts/${result.contractId}` : `/admin/applications/${result.applicationId}`)
      router.refresh()
    })
  }

  const field = (key: keyof ClientInput, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="crm-label">{label}
      <input className="crm-input" value={client[key] ?? ''} onChange={(e) => setClient((c) => ({ ...c, [key]: e.target.value }))} {...props} />
    </label>
  )

  return (
    <form className="grid gap-4 xl:grid-cols-[1fr_380px]" onSubmit={(e) => { e.preventDefault(); submit('save') }}>
      <div className="flex min-w-0 flex-col gap-4">
        <Panel title="Данные клиента" description="ФИО и телефон обязательны; паспортные данные нужны для договора">
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            {field('fullName', 'ФИО *', { required: true, autoComplete: 'off' })}
            {field('phone', 'Телефон *', { required: true, type: 'tel', inputMode: 'tel' })}
            {field('email', 'Email', { type: 'email' })}
            {field('birthDate', 'Дата рождения', { type: 'date' })}
            {field('passportNumber', 'Серия и номер паспорта')}
            {field('passportIssuedAt', 'Дата выдачи', { type: 'date' })}
            <div className="sm:col-span-2">{field('passportIssuedBy', 'Кем выдан')}</div>
            {field('registrationAddress', 'Адрес регистрации')}
            {field('address', 'Адрес проживания')}
            <div className="sm:col-span-2">{field('extraContacts', 'Дополнительные контакты')}</div>
          </div>
        </Panel>

        <Panel title="Товары" description={`${calc.itemCount} шт. · ${rub(calc.goodsKopecks)}`} actions={
          <button type="button" className="crm-btn crm-btn-sm" onClick={() => setItems((list) => [...list, { key: newKey(), name: '', sku: '', category: '', quantity: '1', unitPrice: '' }])}>
            <Plus className="size-3.5" aria-hidden="true" />Добавить товар
          </button>
        }>
          <div className="overflow-x-auto">
            <table className="crm-table min-w-[720px]">
              <thead><tr><th>Название *</th><th>Артикул</th><th>Категория</th><th className="num">Кол-во</th><th className="num">Цена, ₽</th><th className="num">Сумма</th><th /></tr></thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={item.key}>
                    <td><input aria-label={`Название товара ${index + 1}`} className="crm-input h-9" required value={item.name} onChange={(e) => setItem(item.key, { name: e.target.value })} placeholder="Смеситель" /></td>
                    <td><input aria-label="Артикул" className="crm-input h-9 w-28" value={item.sku} onChange={(e) => setItem(item.key, { sku: e.target.value })} /></td>
                    <td><input aria-label="Категория" className="crm-input h-9 w-32" value={item.category} onChange={(e) => setItem(item.key, { category: e.target.value })} /></td>
                    <td className="num"><input aria-label="Количество" className="crm-input h-9 w-20 text-right" inputMode="numeric" value={item.quantity} onChange={(e) => setItem(item.key, { quantity: e.target.value })} /></td>
                    <td className="num"><input aria-label="Цена за единицу" className="crm-input h-9 w-28 text-right" inputMode="decimal" required value={item.unitPrice} onChange={(e) => setItem(item.key, { unitPrice: e.target.value })} /></td>
                    <td className="num font-medium">{rub(Math.trunc(num(item.quantity)) * Math.round(num(item.unitPrice) * 100))}</td>
                    <td className="num">
                      <button type="button" className="crm-btn crm-btn-sm px-2" aria-label="Удалить товар" disabled={items.length === 1} onClick={() => setItems((list) => list.filter((row) => row.key !== item.key))}>
                        <Trash2 className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Условия рассрочки">
          <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
            <label className="crm-label">Первоначальный взнос, ₽
              <input className="crm-input" inputMode="decimal" value={deposit} onChange={(e) => setDeposit(e.target.value)} />
            </label>
            <label className="crm-label">Срок, мес.
              <select className="crm-input" value={months} onChange={(e) => setMonths(Number(e.target.value))}>
                {Array.from({ length: 36 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
            <label className="crm-label">Наценка, %
              <input className="crm-input" inputMode="decimal" value={markup ?? String(autoMarkup)} onChange={(e) => setMarkup(e.target.value)} />
              {markup !== null && <button type="button" className="self-start text-xs text-accent hover:underline" onClick={() => setMarkup(null)}>По тарифу: {autoMarkup}%</button>}
            </label>
            <label className="crm-label">Дата первого платежа
              <input className="crm-input" type="date" required value={firstPaymentDate} onChange={(e) => setFirstPaymentDate(e.target.value)} />
            </label>
            <label className="crm-label sm:col-span-2 lg:col-span-4">Дополнительные условия
              <textarea className="crm-input min-h-20" value={terms} onChange={(e) => setTerms(e.target.value)} maxLength={2000} />
            </label>
          </div>
        </Panel>
      </div>

      <aside className="flex flex-col gap-4 xl:sticky xl:top-20 xl:self-start">
        <Panel title="Расчёт" description="Обновляется автоматически">
          <dl className="flex flex-col gap-2.5 p-5 text-sm">
            {[
              ['Стоимость товаров', rub(calc.goodsKopecks)],
              ['Первоначальный взнос', rub(calc.depositKopecks)],
              ['Остаток', rub(calc.principalKopecks)],
              [`Наценка ${markupPercent}%`, rub(calc.markupKopecks)],
              ['Сумма рассрочки', rub(calc.financedKopecks)],
              ['Количество платежей', String(calc.months)],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3"><dt className="text-muted-foreground">{label}</dt><dd className="font-medium">{value}</dd></div>
            ))}
            <div className="mt-2 flex items-end justify-between gap-3 border-t border-border pt-3">
              <dt className="text-muted-foreground">Ежемесячный платёж</dt><dd className="text-xl font-semibold">{rub(calc.monthlyKopecks)}</dd>
            </div>
            <div className="flex justify-between gap-3"><dt className="font-medium">Общая сумма по договору</dt><dd className="font-semibold text-accent">{rub(calc.totalKopecks)}</dd></div>
          </dl>
          <div className="max-h-64 overflow-y-auto border-t border-border">
            <table className="crm-table">
              <thead><tr><th>№</th><th>Дата</th><th className="num">Сумма</th></tr></thead>
              <tbody>
                {calc.schedule.map((line) => <tr key={line.number}><td>{line.number}</td><td>{formatDate(line.dueDate)}</td><td className="num">{rub(line.amountKopecks)}</td></tr>)}
              </tbody>
            </table>
          </div>
        </Panel>
        {error && <p role="alert" className="rounded-xl border border-destructive/30 px-4 py-3 text-sm text-destructive">{error}</p>}
        <div className="flex flex-col gap-2">
          <button type="submit" className="crm-btn crm-btn-primary justify-center" disabled={pending}>{pending ? 'Сохраняем…' : mode === 'edit' ? 'Сохранить изменения' : 'Сохранить заявку'}</button>
          {mode === 'create' && canApprove && <button type="button" className="crm-btn justify-center" disabled={pending} onClick={() => submit('approve')}>Сохранить и одобрить</button>}
          {mode === 'create' && canApprove && canContract && <button type="button" className="crm-btn crm-btn-gold justify-center" disabled={pending} onClick={() => submit('contract')}>Одобрить и сформировать договор</button>}
        </div>
      </aside>
    </form>
  )
}
