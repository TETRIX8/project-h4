'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Download, Printer } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { recordPaymentAction } from '@/app/admin/actions'
import { formatDate, PAYMENT_METHOD_LABELS, rub } from '@/lib/crm/format'
import { todayIso } from '@/lib/crm/finance'
import { PAYMENT_METHODS, type PaymentMethod } from '@/lib/db/schema'

export type PayTarget = {
  paymentId: string
  clientName: string
  phone?: string | null
  contractNumber: string
  installmentNumber: number
  amountKopecks: number
  paidKopecks: number
  dueDate: string | null
}

export function PaymentButton({ target, className = 'crm-btn crm-btn-gold crm-btn-sm', label = 'Принять платёж' }: { target: PayTarget; className?: string; label?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>{label}</button>
      {open && <PaymentDialog target={target} onClose={() => setOpen(false)} />}
    </>
  )
}

function PaymentDialog({ target, onClose }: { target: PayTarget; onClose: () => void }) {
  const router = useRouter()
  const remaining = target.amountKopecks - target.paidKopecks
  const [amount, setAmount] = useState(String(remaining / 100))
  const [paidOn, setPaidOn] = useState(todayIso())
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<{ transactionId: string; receiptNumber: number; partial: boolean } | null>(null)
  const [pending, startTransition] = useTransition()

  const entered = Math.round(Number(amount.replace(',', '.')) * 100) || 0

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await recordPaymentAction({ paymentId: target.paymentId, amount: entered / 100, paidOn, method, comment })
      if (!result.ok) return setError(result.error)
      setDone({ transactionId: result.transactionId, receiptNumber: result.receiptNumber, partial: entered < remaining })
      router.refresh()
    })
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="admin-theme max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        {done ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <CheckCircle2 className="size-12 text-[var(--tone-green)]" aria-hidden="true" />
            <DialogHeader className="items-center">
              <DialogTitle className="text-lg">Платёж успешно зарегистрирован</DialogTitle>
              <DialogDescription>
                Чек №{done.receiptNumber} · {rub(entered)}{done.partial ? ' · платёж частично оплачен' : ''}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-wrap justify-center gap-2">
              <a className="crm-btn crm-btn-primary" href={`/admin/print/receipt/${done.transactionId}?print=1`} target="_blank" rel="noreferrer">
                <Printer className="size-4" aria-hidden="true" />Распечатать чек
              </a>
              <a className="crm-btn" href={`/admin/print/receipt/${done.transactionId}?print=1&pdf=1`} target="_blank" rel="noreferrer">
                <Download className="size-4" aria-hidden="true" />Скачать чек PDF
              </a>
            </div>
            <button type="button" className="crm-btn crm-btn-sm" onClick={onClose}>Закрыть</button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle className="text-lg">Принять платёж</DialogTitle>
              <DialogDescription>Проверьте данные и укажите фактически внесённую сумму.</DialogDescription>
            </DialogHeader>
            <dl className="grid grid-cols-2 gap-3 rounded-xl bg-secondary p-4 text-sm">
              <div><dt className="text-xs text-muted-foreground">Клиент</dt><dd className="font-medium">{target.clientName}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Договор</dt><dd className="font-medium">{target.contractNumber}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Платёж</dt><dd className="font-medium">{target.installmentNumber === 0 ? 'Первоначальный взнос' : `№${target.installmentNumber}`} · {formatDate(target.dueDate)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Сумма по графику</dt><dd className="font-medium">{rub(target.amountKopecks)}</dd></div>
              <div className="col-span-2"><dt className="text-xs text-muted-foreground">Сумма к оплате</dt><dd className="text-lg font-semibold">{rub(remaining)}{target.paidKopecks > 0 && <span className="ml-2 text-xs font-normal text-muted-foreground">уже внесено {rub(target.paidKopecks)}</span>}</dd></div>
            </dl>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="crm-label">Фактически внесено, ₽
                <input className="crm-input" inputMode="decimal" required value={amount} onChange={(e) => setAmount(e.target.value)} />
              </label>
              <label className="crm-label">Дата оплаты
                <input className="crm-input" type="date" required max={todayIso()} value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
              </label>
            </div>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-xs font-semibold text-muted-foreground">Способ оплаты</legend>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((value) => (
                  <label key={value} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${method === value ? 'border-accent bg-accent/10' : 'border-border'}`}>
                    <input type="radio" name="method" value={value} checked={method === value} onChange={() => setMethod(value)} className="accent-[var(--accent)]" />
                    {PAYMENT_METHOD_LABELS[value]}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="crm-label">Комментарий
              <textarea className="crm-input min-h-16" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500} />
            </label>
            {entered > 0 && entered < remaining && (
              <p className="rounded-lg bg-[color-mix(in_srgb,var(--tone-yellow)_12%,transparent)] px-3 py-2 text-sm text-[var(--tone-yellow)]">
                Частичная оплата: после внесения останется {rub(remaining - entered)} по этому платежу.
              </p>
            )}
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" className="crm-btn" onClick={onClose}>Отмена</button>
              <button type="submit" className="crm-btn crm-btn-primary" disabled={pending || entered <= 0}>{pending ? 'Сохраняем…' : `Подтвердить ${entered > 0 ? rub(entered) : ''}`}</button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
