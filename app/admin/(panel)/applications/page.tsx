import Link from 'next/link'
import { Plus } from 'lucide-react'
import { requireStaffPage } from '@/lib/crm/session'
import { listApplications, listStaff } from '@/lib/crm/queries'
import { computeTerms, todayIso } from '@/lib/crm/finance'
import { PageHeader } from '@/components/admin/ui'
import { ApplicationsTable, type ApplicationTableRow } from '@/components/admin/applications-table'

export const metadata = { title: 'Заявки — ALLAHUMMA BARIK CRM' }

export default async function ApplicationsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const staff = await requireStaffPage('applications.view')
  const [{ status }, rows, team] = await Promise.all([searchParams, listApplications(), listStaff()])

  const tableRows: ApplicationTableRow[] = rows.map((row) => {
    const terms = row.items.length
      ? computeTerms({ items: row.items, depositKopecks: row.depositKopecks, months: row.months, markupBasisPoints: row.markupBasisPoints, firstPaymentDate: row.firstPaymentDate ?? todayIso() })
      : null
    return {
      id: row.id, number: row.number, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
      customerName: row.customerName, phone: row.phone,
      products: row.items.length ? row.items.map((item) => (item.quantity > 1 ? `${item.name} ×${item.quantity}` : item.name)).join(', ') : row.productName,
      priceKopecks: row.priceKopecks, depositKopecks: row.depositKopecks, months: row.months,
      monthlyKopecks: terms?.monthlyKopecks ?? Math.round((row.calculation?.monthly ?? 0) * 100),
      totalKopecks: terms?.totalKopecks ?? Math.round((row.calculation?.total ?? 0) * 100),
      status: row.status, assignedAdminId: row.assignedAdminId, assignedName: row.assignedName, contractNumber: row.contract?.number ?? null,
    }
  })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Продажи"
        title="Заявки"
        description="Все обращения клиентов: проверка, одобрение и передача в договор."
        actions={staff.permissions.includes('applications.edit') && (
          <Link href="/admin/applications/new" className="crm-btn crm-btn-primary"><Plus className="size-4" aria-hidden="true" />Создать заявку</Link>
        )}
      />
      <ApplicationsTable rows={tableRows} staff={team.filter((m) => m.active).map((m) => ({ userId: m.userId, name: m.name }))} initialStatus={status} />
    </div>
  )
}
