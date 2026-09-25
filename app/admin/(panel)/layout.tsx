import type { Metadata } from 'next'
import { AdminShell } from '@/components/admin/shell'
import { requireStaffPage } from '@/lib/crm/session'
import { loadLedger, unreadNotificationCount } from '@/lib/crm/queries'

export const metadata: Metadata = {
  title: 'ALLAHUMMA BARIK — CRM рассрочек',
  robots: { index: false, follow: false },
}

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaffPage()
  const [unread, { ledger }] = await Promise.all([unreadNotificationCount(), loadLedger()])
  const overdueCount = ledger.filter((contract) => contract.status === 'active' && contract.overdueKopecks > 0).length
  return (
    <AdminShell staff={{ name: staff.name, email: staff.email, role: staff.role, permissions: staff.permissions }} unread={unread} overdueCount={overdueCount}>
      {children}
    </AdminShell>
  )
}
