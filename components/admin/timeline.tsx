'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addCommentAction } from '@/app/admin/actions'
import { formatDateTime } from '@/lib/crm/format'
import { EmptyState, Panel } from '@/components/admin/ui'

type Comment = { id: string; authorName: string | null; body: string; createdAt: Date | string }
type AuditEntry = { id: number; actorName: string | null; action: string; createdAt: Date | string; oldValue: unknown; newValue: unknown }

export function CommentsPanel({ entityType, entityId, comments }: { entityType: 'application' | 'client' | 'contract'; entityId: string; comments: Comment[] }) {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const submit = () => startTransition(async () => {
    setError(null)
    const result = await addCommentAction(entityType, entityId, body)
    if (!result.ok) return setError(result.error)
    setBody('')
    router.refresh()
  })

  return (
    <Panel title="Комментарии администратора" description={`${comments.length}`}>
      <form className="flex flex-col gap-2 border-b border-border p-4" onSubmit={(e) => { e.preventDefault(); submit() }}>
        <label className="sr-only" htmlFor={`comment-${entityId}`}>Новый комментарий</label>
        <textarea id={`comment-${entityId}`} className="crm-input min-h-16" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Оставьте заметку для коллег…" maxLength={2000} />
        {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
        <button type="submit" className="crm-btn crm-btn-sm self-end" disabled={pending || !body.trim()}>{pending ? 'Сохраняем…' : 'Добавить'}</button>
      </form>
      {comments.length === 0 ? <EmptyState title="Комментариев нет" /> : (
        <ul className="flex max-h-96 flex-col divide-y divide-border overflow-y-auto">
          {comments.map((comment) => (
            <li key={comment.id} className="flex flex-col gap-1 px-4 py-3">
              <div className="flex justify-between gap-2 text-xs text-muted-foreground"><span className="font-medium text-foreground">{comment.authorName ?? 'Сотрудник'}</span><time>{formatDateTime(comment.createdAt)}</time></div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{comment.body}</p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

function renderValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—'
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export function ChangeDiff({ oldValue, newValue }: { oldValue: unknown; newValue: unknown }) {
  const before = (oldValue && typeof oldValue === 'object' ? oldValue : {}) as Record<string, unknown>
  const after = (newValue && typeof newValue === 'object' ? newValue : {}) as Record<string, unknown>
  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]))
  if (!keys.length) return null
  return (
    <dl className="mt-1.5 grid gap-1 text-xs">
      {keys.map((key) => (
        <div key={key} className="flex flex-wrap gap-x-2">
          <dt className="text-muted-foreground">{key}:</dt>
          {key in before && <dd className="text-destructive line-through decoration-destructive/40">{renderValue(before[key])}</dd>}
          {key in after && <dd className="font-medium text-foreground">{renderValue(after[key])}</dd>}
        </div>
      ))}
    </dl>
  )
}

export function HistoryPanel({ entries, title = 'История изменений' }: { entries: AuditEntry[]; title?: string }) {
  return (
    <Panel title={title} description={`${entries.length}`}>
      {entries.length === 0 ? <EmptyState title="Изменений пока нет" /> : (
        <ol className="flex max-h-[28rem] flex-col overflow-y-auto">
          {entries.map((entry) => (
            <li key={entry.id} className="relative border-b border-border px-4 py-3 pl-8 last:border-0">
              <span className="absolute left-4 top-4.5 size-2 rounded-full bg-accent" aria-hidden="true" />
              <div className="flex flex-wrap justify-between gap-x-3 text-sm"><span className="font-medium">{entry.action}</span><time className="text-xs text-muted-foreground">{formatDateTime(entry.createdAt)}</time></div>
              <p className="text-xs text-muted-foreground">{entry.actorName ?? 'Система'}</p>
              <ChangeDiff oldValue={entry.oldValue} newValue={entry.newValue} />
            </li>
          ))}
        </ol>
      )}
    </Panel>
  )
}
