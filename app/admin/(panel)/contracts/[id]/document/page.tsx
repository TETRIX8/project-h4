import { redirect } from 'next/navigation'

export default async function ContractDocumentRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/admin/print/contract/${encodeURIComponent(id)}`)
}
