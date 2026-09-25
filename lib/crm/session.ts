import 'server-only'
import { cache } from 'react'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { administrators, auditLog, notifications, settings, type StaffRole } from '@/lib/db/schema'
import { resolvePermissions, type Permission } from '@/lib/crm/permissions'

export type Staff = {
  id: string
  name: string
  email: string
  role: StaffRole
  permissions: Permission[]
}

export const getStaff = cache(async (): Promise<Staff | null> => {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return null
  const [admin] = await db.select().from(administrators).where(eq(administrators.userId, session.user.id)).limit(1)
  if (!admin || !admin.active) return null
  const [config] = await db.select({ rolePermissions: settings.rolePermissions }).from(settings).where(eq(settings.id, 1)).limit(1)
  return {
    id: session.user.id,
    name: session.user.name || session.user.email,
    email: session.user.email,
    role: admin.role,
    permissions: resolvePermissions(admin.role, config?.rolePermissions),
  }
})

export async function requireStaffPage(permission?: Permission) {
  const staff = await getStaff()
  if (!staff) {
    const session = await auth.api.getSession({ headers: await headers() })
    redirect(session?.user ? '/cabinet' : '/sign-in?next=/admin')
  }
  if (permission && !staff.permissions.includes(permission)) redirect('/admin?denied=1')
  return staff
}

export class AccessError extends Error {}

export async function requirePermission(permission: Permission) {
  const staff = await getStaff()
  if (!staff) throw new AccessError('Необходима авторизация сотрудника')
  if (!staff.permissions.includes(permission)) throw new AccessError('Недостаточно прав для этого действия')
  return staff
}

async function clientIp() {
  const requestHeaders = await headers()
  return requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() || requestHeaders.get('x-real-ip') || null
}

type Executor = Pick<typeof db, 'insert'>

export async function writeAudit(
  staff: Staff | null,
  entry: { action: string; entityType: string; entityId?: string | null; entityLabel?: string | null; oldValue?: unknown; newValue?: unknown },
  executor: Executor = db,
) {
  await executor.insert(auditLog).values({
    actorId: staff?.id ?? null,
    actorName: staff ? `${staff.name} (${staff.email})` : 'Клиент (сайт)',
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId ?? null,
    entityLabel: entry.entityLabel ?? null,
    ip: await clientIp(),
    oldValue: entry.oldValue ?? null,
    newValue: entry.newValue ?? null,
  })
}

export async function pushNotification(entry: { kind: string; title: string; body?: string; href?: string }, executor: Executor = db) {
  await executor.insert(notifications).values(entry)
}
