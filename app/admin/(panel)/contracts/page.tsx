import { requireStaffPage } from '@/lib/crm/session'
import { loadLedger } from '@/lib/crm/queries'
import { PageHeader } from '@/components/admin/ui'
import { ContractsTable, type ContractTableRow } from '@/components/admin/contracts-table'

export const metadata = { title: 'Договоры — ALLAHUMMA BARIK CRM' }

export default async function ContractsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireStaffPage('contracts.view')
  const [{ status }, { ledger }] = await Promise.all([searchParams, loadLedger()])
  const rows: ContractTableRow[] = ledger.map((c) => ({
    id: c.id, number: c.number, clientName: c.client?.fullName ?? '—', phone: c.client?.phone ?? '', signedAt: c.signedAt,
    products: c.items.map((item) => (item.quantity > 1 ? `${item.name} ×${item.quantity}` : item.name)).join(', '),
    itemCount: c.items.reduce((sum, item) => sum + item.quantity, 0),
    goodsKopecks: c.goodsKopecks, depositKopecks: c.depositKopecks, financedKopecks: c.financedKopecks, months: c.months, monthlyKopecks: c.monthlyKopecks,
    paidKopecks: c.paidKopecks, remainingKopecks: c.remainingKopecks, nextKopecks: c.next?.remaining ?? null, nextDate: c.next?.dueDate ?? null,
    maxDaysOverdue: c.maxDaysOverdue, overdueKopecks: c.overdueKopecks, status: c.displayStatus,
  }))
  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Финансы" title="Договоры" description="Остатки, следующий платёж и просрочка пересчитываются по графику в реальном времени." />
      <ContractsTable rows={rows} initialStatus={status} />
    </div>
  )
}
