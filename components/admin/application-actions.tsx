'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, FileSignature, MessageSquareWarning, Pencil, X } from 'lucide-react'
import { assignApplicationAction, formContractAction, setApplicationStatusAction } from '@/app/admin/actions'
import type { ApplicationStatus } from '@/lib/db/schema'
import { APPLICATION_STATUS_META } from '@/lib/crm/format'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type Perms = { edit: boolean; approve: boolean; contract: boolean }
const REASON_REQUIRED: ApplicationStatus[] = ['rejected', 'needs_info', 'cancelled']
const DIALOG_COPY: Partial<Record<ApplicationStatus, { title: string; description: string; cta: string }>> = {
  rejected: { title: 'Отклонить заявку', description: 'Причина будет сохранена в комментариях и истории.', cta: 'Отклонить' },
  needs_info: { title: 'Запросить данные', description: 'Опишите, какие документы или сведения нужны от клиента.', cta: 'Отправить запрос' },
  cancelled: { title: 'Отменить заявку', description: 'Укажите причину отмены.', cta: 'Отменить заявку' },
}

export function ApplicationActions({ id, status, hasContract, contractId, assignedAdminId, staff, perms }: {
  id: string; status: ApplicationStatus; hasContract: boolean; contractId?: string | null
  assignedAdminId: string | null; staff: { userId: string; name: string }[]; perms: Perms
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<ApplicationStatus | null>(null)
  const [reason, setReason] = useState('')

  const act = (fn: () => Promise<{ ok: boolean; error?: string } & Record<string, unknown>>, after?: (result: Record<string, unknown>) => void) =>
    startTransition(async () => {
      setError(null)
      const result = await fn()
      if (!result.ok) return setError(result.error ?? 'Ошибка')
      setDialog(null)
      setReason('')
      after?.(result)
      router.refresh()
    })

  const changeStatus = (next: ApplicationStatus) => {
    if (REASON_REQUIRED.includes(next)) return setDialog(next)
    act(() => setApplicationStatusAction(id, next))
  }

  const closed = hasContract || ['rejected', 'cancelled', 'completed'].includes(status)
  const copy = dialog ? DIALOG_COPY[dialog] : null

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {perms.approve && !closed && status !== 'approved' && status !== 'awaiting_contract' && (
          <button type="button" className="crm-btn crm-btn-primary" disabled={pending} onClick={() => changeStatus('approved')}><Check className="size-4" aria-hidden="true" />Одобрить</button>
        )}
        {perms.contract && ['approved', 'awaiting_contract'].includes(status) && !hasContract && (
          <button type="button" className="crm-btn crm-btn-gold" disabled={pending} onClick={() => act(() => formContractAction(id), (r) => r.contractId && router.push(`/admin/contracts/${r.contractId}`))}>
            <FileSignature className="size-4" aria-hidden="true" />Сформировать договор
          </button>
        )}
        {hasContract && contractId && <Link href={`/admin/contracts/${contractId}`} className="crm-btn crm-btn-gold"><FileSignature className="size-4" aria-hidden="true" />Открыть договор</Link>}
        {perms.edit && !closed && <Link href={`/admin/applications/${id}/edit`} className="crm-btn"><Pencil className="size-4" aria-hidden="true" />Изменить</Link>}
        {perms.edit && !closed && status !== 'needs_info' && (
          <button type="button" className="crm-btn" disabled={pending} onClick={() => changeStatus('needs_info')}><MessageSquareWarning className="size-4" aria-hidden="true" />Запросить данные</button>
        )}
        {perms.approve && !closed && (
          <button type="button" className="crm-btn crm-btn-danger" disabled={pending} onClick={() => changeStatus('rejected')}><X className="size-4" aria-hidden="true" />Отклонить</button>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        {perms.edit && !closed && (
          <label className="crm-label min-w-44">Статус
            <select className="crm-input h-9" value={status} disabled={pending} onChange={(e) => changeStatus(e.target.value as ApplicationStatus)}>
              {(['new', 'review', 'needs_info', 'approved', 'awaiting_contract', 'rejected', 'cancelled'] as ApplicationStatus[])
                .filter((s) => perms.approve || !['approved', 'rejected'].includes(s) || s === status)
                .map((s) => <option key={s} value={s}>{APPLICATION_STATUS_META[s].label}</option>)}
            </select>
          </label>
        )}
        {perms.edit && (
          <label className="crm-label min-w-44">Ответственный
            <select className="crm-input h-9" value={assignedAdminId ?? ''} disabled={pending} onChange={(e) => act(() => assignApplicationAction(id, e.target.value || null))}>
              <option value="">Не назначен</option>
              {staff.map((member) => <option key={member.userId} value={member.userId}>{member.name}</option>)}
            </select>
          </label>
        )}
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      <Dialog open={Boolean(dialog)} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{copy?.title}</DialogTitle>
            <DialogDescription>{copy?.description}</DialogDescription>
          </DialogHeader>
          <label className="crm-label">Комментарий *
            <textarea className="crm-input min-h-24" value={reason} onChange={(e) => setReason(e.target.value)} autoFocus maxLength={1000} />
          </label>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <button type="button" className="crm-btn" onClick={() => setDialog(null)}>Отмена</button>
            <button type="button" className={dialog === 'needs_info' ? 'crm-btn crm-btn-primary' : 'crm-btn crm-btn-danger'} disabled={pending || !reason.trim()} onClick={() => dialog && act(() => setApplicationStatusAction(id, dialog, reason))}>
              {pending ? 'Сохраняем…' : copy?.cta}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
