import { auth } from "@/lib/auth"
import { getAdminApplicationsAction } from "@/app/actions/applications"
import { isUserAdmin } from "@/lib/admin"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import AdminClient from "./admin-client"

export default async function AdminPage() {
  const reqHeaders = await headers()
  const session = await auth.api.getSession({ headers: reqHeaders })

  if (!session?.user) {
    redirect("/sign-in")
  }

  const admin = await isUserAdmin(session.user.id)
  if (!admin) {
    redirect("/cabinet")
  }

  const applications = await getAdminApplicationsAction()

  return (
    <AdminClient
      user={session.user}
      initialApplications={applications}
    />
  )
}
