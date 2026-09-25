'use client'

import { useDeferredValue, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { FileSignature, FileText, Package, Search, User } from 'lucide-react'
import { globalSearchAction, type SearchHit } from '@/app/admin/actions'

const ICONS = { client: User, application: FileText, contract: FileSignature, item: Package }
const TYPE_LABELS = { client: 'Клиент', application: 'Заявка', contract: 'Договор', item: 'Товар' }

export function GlobalSearch() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const deferred = useDeferredValue(query.trim())
  const { data, isLoading } = useSWR(deferred.length >= 2 ? ['search', deferred] : null, ([, q]) => globalSearchAction(q), { keepPreviousData: true })
  const hits: SearchHit[] = deferred.length >= 2 ? data ?? [] : []

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const go = (hit: SearchHit) => {
    setOpen(false)
    setQuery('')
    router.push(hit.href)
  }

  return (
    <div className="relative w-full max-w-xl">
      <label htmlFor="global-search" className="sr-only">Поиск по системе</label>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <input
        id="global-search"
        ref={inputRef}
        role="combobox"
        aria-expanded={open && hits.length > 0}
        aria-controls="global-search-results"
        autoComplete="off"
        value={query}
        onChange={(event) => { setQuery(event.target.value); setOpen(true); setActive(0) }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing || event.keyCode === 229) return
          if (event.key === 'ArrowDown') { event.preventDefault(); setActive((i) => Math.min(i + 1, hits.length - 1)) }
          if (event.key === 'ArrowUp') { event.preventDefault(); setActive((i) => Math.max(i - 1, 0)) }
          if (event.key === 'Enter' && hits[active]) { event.preventDefault(); go(hits[active]) }
          if (event.key === 'Escape') { setOpen(false); inputRef.current?.blur() }
        }}
        placeholder="ФИО, телефон, паспорт, № договора, товар, артикул…"
        className="crm-input h-10 pl-9 pr-16"
      />
      <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-border px-1.5 text-[11px] text-muted-foreground md:block">Ctrl K</kbd>
      {open && deferred.length >= 2 && (
        <div id="global-search-results" role="listbox" className="absolute left-0 right-0 top-12 z-40 overflow-hidden rounded-xl border border-border bg-popover shadow-xl">
          {hits.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">{isLoading ? 'Ищем…' : 'Ничего не найдено'}</p>
          ) : (
            <ul className="max-h-96 overflow-y-auto py-1">
              {hits.map((hit, index) => {
                const Icon = ICONS[hit.type]
                return (
                  <li key={`${hit.type}-${hit.id}`} role="option" aria-selected={index === active}>
                    <button
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => go(hit)}
                      onMouseEnter={() => setActive(index)}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left ${index === active ? 'bg-secondary' : ''}`}
                    >
                      <Icon className="size-4 shrink-0 text-accent" aria-hidden="true" />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm font-medium">{hit.title}</span>
                        <span className="truncate text-xs text-muted-foreground">{hit.subtitle}</span>
                      </span>
                      <span className="shrink-0 text-[11px] uppercase tracking-wider text-muted-foreground">{TYPE_LABELS[hit.type]}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
