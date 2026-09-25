import { auth } from "@/lib/auth"
import { getUserApplicationsAction } from "@/app/actions/applications"
import { isUserAdmin } from "@/lib/admin"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import CabinetClient from "./cabinet-client"

export default async function CabinetPage() {
  const reqHeaders = await headers()
  const session = await auth.api.getSession({ headers: reqHeaders })

  if (!session?.user) {
    redirect("/sign-in")
  }

  const applications = await getUserApplicationsAction()
  const admin = await isUserAdmin(session.user.id)

  return (
    <CabinetClient
      user={session.user}
      applications={applications}
      isAdmin={admin}
    />
  )
}
