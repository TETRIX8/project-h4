import { requireStaffPage } from '@/lib/crm/session'
import { PageHeader } from '@/components/admin/ui'
import { ApplicationForm } from '@/components/admin/application-form'

export const metadata = { title: 'Новая заявка — ALLAHUMMA BARIK CRM' }

export default async function NewApplicationPage() {
  const staff = await requireStaffPage('applications.edit')
  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Заявки" title="Новая заявка" description="Оформление от имени клиента. Итоговые суммы и график рассчитываются автоматически." />
      <ApplicationForm mode="create" canApprove={staff.permissions.includes('applications.approve')} canContract={staff.permissions.includes('contracts.create')} />
    </div>
  )
}
