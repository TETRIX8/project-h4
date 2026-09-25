import { db } from '@/lib/db'
import { applications } from '@/lib/db/schema'
import { requireStaffPage } from '@/lib/crm/session'
import { loadLedger } from '@/lib/crm/queries'
import { PageHeader } from '@/components/admin/ui'
import { ClientsTable, type ClientTableRow } from '@/components/admin/clients-table'

export const metadata = { title: 'Клиенты — ALLAHUMMA BARIK CRM' }

export default async function ClientsPage() {
  await requireStaffPage('clients.view')
  const [{ ledger, clients }, apps] = await Promise.all([loadLedger(), db.select({ clientId: applications.clientId }).from(applications)])
  const rows: ClientTableRow[] = clients.map((client) => {
    const own = ledger.filter((contract) => contract.clientId === client.id && contract.status !== 'terminated')
    return {
      id: client.id, fullName: client.fullName, phone: client.phone, email: client.email ?? '', passport: client.passportNumber ?? '',
      createdAt: client.createdAt.toISOString(),
      applications: apps.filter((app) => app.clientId === client.id).length,
      contracts: own.length,
      active: own.filter((c) => c.status === 'active').length,
      completed: own.filter((c) => c.status === 'paid').length,
      purchasesKopecks: own.reduce((sum, c) => sum + c.goodsKopecks, 0),
      paidKopecks: own.reduce((sum, c) => sum + c.paidKopecks + c.depositKopecks, 0),
      remainingKopecks: own.reduce((sum, c) => sum + c.remainingKopecks, 0),
      overdueKopecks: own.reduce((sum, c) => sum + c.overdueKopecks, 0),
    }
  })
  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="База" title="Клиенты" description={`${rows.length} клиентов · суммы учитывают первоначальный взнос и все проведённые платежи.`} />
      <ClientsTable rows={rows} />
    </div>
  )
}
