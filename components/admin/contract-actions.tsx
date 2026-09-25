'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cancelTransactionAction, setContractStatusAction } from '@/app/admin/actions'
import type { ContractStatus } from '@/lib/db/schema'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type Intent = { kind: 'status'; id: string; status: ContractStatus; title: string; cta: string; danger?: boolean } | { kind: 'cancelTx'; id: string; title: string; cta: string; danger: true }

function ReasonDialog({ intent, onClose }: { intent: Intent | null; onClose: () => void }) {
  const router = useRouter()
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const needsReason = intent?.kind === 'cancelTx' || (intent?.kind === 'status' && ['suspended', 'terminated'].includes(intent.status))

  const confirm = () => intent && startTransition(async () => {
    setError(null)
    const result = intent.kind === 'cancelTx' ? await cancelTransactionAction(intent.id, reason) : await setContractStatusAction(intent.id, intent.status, reason)
    if (!result.ok) return setError(result.error)
    setReason('')
    onClose()
    router.refresh()
  })

  return (
    <Dialog open={Boolean(intent)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{intent?.title}</DialogTitle>
          <DialogDescription>
            {intent?.kind === 'cancelTx' ? 'Платёж не удаляется: операция помечается отменённой, сумма возвращается в остаток, причина фиксируется в журнале.' : 'Изменение будет записано в историю договора.'}
          </DialogDescription>
        </DialogHeader>
        <label className="crm-label">Причина{needsReason ? ' *' : ''}
          <textarea className="crm-input min-h-24" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} autoFocus />
        </label>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <button type="button" className="crm-btn" onClick={onClose}>Отмена</button>
          <button type="button" className={intent?.danger ? 'crm-btn crm-btn-danger' : 'crm-btn crm-btn-primary'} disabled={pending || (needsReason && reason.trim().length < (intent?.kind === 'cancelTx' ? 5 : 1))} onClick={confirm}>
            {pending ? 'Сохраняем…' : intent?.cta}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type StatusIntent = Extract<Intent, { kind: 'status' }>

export function ContractStatusActions({ id, status }: { id: string; status: ContractStatus }) {
  const [intent, setIntent] = useState<StatusIntent | null>(null)
  if (status === 'paid' || status === 'terminated') return null
  const options: StatusIntent[] = [
    ...(status === 'prepared' || status === 'draft' || status === 'suspended' ? [{ kind: 'status' as const, id, status: 'active' as const, title: status === 'suspended' ? 'Возобновить договор' : 'Активировать договор', cta: status === 'suspended' ? 'Возобновить' : 'Активировать' }] : []),
    ...(status === 'active' ? [{ kind: 'status' as const, id, status: 'suspended' as const, title: 'Приостановить договор', cta: 'Приостановить' }] : []),
    { kind: 'status', id, status: 'terminated', title: 'Расторгнуть договор', cta: 'Расторгнуть', danger: true },
  ]
  return (
    <>
      {options.map((option) => (
        <button key={option.status} type="button" className={option.danger ? 'crm-btn crm-btn-sm crm-btn-danger' : 'crm-btn crm-btn-sm'} onClick={() => setIntent(option)}>{option.cta}</button>
      ))}
      <ReasonDialog intent={intent} onClose={() => setIntent(null)} />
    </>
  )
}

export function CancelTransactionButton({ id, receiptNumber }: { id: string; receiptNumber: number | null }) {
  const [intent, setIntent] = useState<Intent | null>(null)
  return (
    <>
      <button type="button" className="crm-btn crm-btn-sm crm-btn-danger" onClick={() => setIntent({ kind: 'cancelTx', id, title: `Отменить операцию, чек №${receiptNumber ?? '—'}`, cta: 'Отменить платёж', danger: true })}>Отменить</button>
      <ReasonDialog intent={intent} onClose={() => setIntent(null)} />
    </>
  )
}
