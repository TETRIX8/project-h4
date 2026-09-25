import { notFound, redirect } from 'next/navigation'
import { requireStaffPage } from '@/lib/crm/session'
import { getApplication } from '@/lib/crm/queries'
import { todayIso } from '@/lib/crm/finance'
import { applicationCode } from '@/lib/crm/format'
import { PageHeader } from '@/components/admin/ui'
import { ApplicationForm } from '@/components/admin/application-form'

export default async function EditApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaffPage('applications.edit')
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const data = await getApplication(id)
  if (!data) notFound()
  if (data.contract) redirect(`/admin/applications/${id}`)
  const { application: app, items, client } = data

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow={`Заявка ${applicationCode(app.number)}`} title="Изменение заявки" description="Все изменения сумм, сроков и товаров сохраняются в истории." />
      <ApplicationForm
        mode="edit"
        applicationId={app.id}
        canApprove={staff.permissions.includes('applications.approve')}
        canContract={staff.permissions.includes('contracts.create')}
        initial={{
          clientId: app.clientId,
          client: {
            fullName: client?.fullName ?? app.customerName, phone: client?.phone ?? app.phone, email: client?.email ?? '',
            birthDate: client?.birthDate ?? '', address: client?.address ?? '', passportNumber: client?.passportNumber ?? '',
            passportIssuedAt: client?.passportIssuedAt ?? '', passportIssuedBy: client?.passportIssuedBy ?? '',
            registrationAddress: client?.registrationAddress ?? '', extraContacts: client?.extraContacts ?? '',
          },
          items: items.length
            ? items.map((item) => ({ name: item.name, sku: item.sku, category: item.category, quantity: item.quantity, unitPrice: item.unitPriceKopecks / 100 }))
            : [{ name: app.productName, quantity: 1, unitPrice: app.priceKopecks / 100 }],
          deposit: app.depositKopecks / 100,
          months: app.months,
          markupPercent: app.markupBasisPoints / 100,
          firstPaymentDate: app.firstPaymentDate ?? todayIso(),
          terms: app.terms,
        }}
      />
    </div>
  )
}
