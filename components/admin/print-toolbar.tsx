'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Download, Printer } from 'lucide-react'

export function PrintToolbar({ backHref, backLabel, autoPrint, formats }: { backHref: string; backLabel: string; autoPrint?: boolean; formats?: { href: string; label: string; active: boolean }[] }) {
  useEffect(() => {
    if (!autoPrint) return
    const timer = window.setTimeout(() => window.print(), 400)
    return () => window.clearTimeout(timer)
  }, [autoPrint])

  return (
    <div className="no-print sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
      <Link href={backHref} className="crm-btn crm-btn-sm"><ArrowLeft className="size-4" aria-hidden="true" />{backLabel}</Link>
      <div className="flex flex-wrap items-center gap-2">
        {formats?.map((format) => (
          <Link key={format.href} href={format.href} className={`crm-chip ${format.active ? 'crm-chip-active' : ''}`} aria-current={format.active ? 'page' : undefined}>{format.label}</Link>
        ))}
        <button type="button" className="crm-btn crm-btn-sm" onClick={() => window.print()} title="В окне печати выберите «Сохранить как PDF»">
          <Download className="size-4" aria-hidden="true" />Скачать PDF
        </button>
        <button type="button" className="crm-btn crm-btn-sm crm-btn-primary" onClick={() => window.print()}>
          <Printer className="size-4" aria-hidden="true" />Распечатать
        </button>
      </div>
    </div>
  )
}
