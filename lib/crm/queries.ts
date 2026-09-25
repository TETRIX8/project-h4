import 'server-only'
import { and, asc, desc, eq, inArray, isNotNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  administrators, applicationItems, applications, auditLog, clients, comments, contracts, notifications, payments, settings, transactions, user,
  type ContractStatus,
} from '@/lib/db/schema'
import { addDays, reminderBucket, scheduleStatus, todayIso, type ReminderBucket, type ScheduleStatus } from '@/lib/crm/finance'

export type ScheduleRow = typeof payments.$inferSelect & { status: ScheduleStatus; remaining: number; daysUntil: number; daysOverdue: number }
export type ContractRow = typeof contracts.$inferSelect & {
  client: typeof clients.$inferSelect | null
  schedule: ScheduleRow[]
  paidKopecks: number
  remainingKopecks: number
  overdueKopecks: number
  maxDaysOverdue: number
  next: ScheduleRow | null
  lastPaidOn: string | null
  displayStatus: ContractStatus
}

function decorateSchedule(rows: (typeof payments.$inferSelect)[], today: string): ScheduleRow[] {
  return rows
    .map((row) => ({ ...row, ...scheduleStatus({ amountKopecks: row.amountKopecks, paidKopecks: row.paidKopecks, dueDate: row.dueDate, cancelled: row.cancelled }, today) }))
    .sort((a, b) => a.installmentNumber - b.installmentNumber)
}

export function buildContractRow(
  contract: typeof contracts.$inferSelect,
  client: typeof clients.$inferSelect | null,
  rows: (typeof payments.$inferSelect)[],
  today: string,
): ContractRow {
  const schedule = decorateSchedule(rows, today)
  const live = schedule.filter((row) => !row.cancelled)
  const paidKopecks = live.reduce((sum, row) => sum + row.paidKopecks, 0)
  const scheduled = live.reduce((sum, row) => sum + row.amountKopecks, 0)
  const overdueRows = live.filter((row) => row.status === 'overdue')
  const overdueKopecks = overdueRows.reduce((sum, row) => sum + row.remaining, 0)
  const maxDaysOverdue = overdueRows.reduce((max, row) => Math.max(max, row.daysOverdue), 0)
  const next = live.find((row) => row.remaining > 0) ?? null
  const lastPaidOn = live.filter((row) => row.paidAt).map((row) => row.paidAt as string).sort().at(-1) ?? null
  const displayStatus: ContractStatus = contract.status === 'active' && overdueKopecks > 0 ? 'overdue' : contract.status
  return { ...contract, client, schedule, paidKopecks, remainingKopecks: Math.max(0, scheduled - paidKopecks), overdueKopecks, maxDaysOverdue, next, lastPaidOn, displayStatus }
}

export async function loadLedger() {
  const today = todayIso()
  const [contractRows, clientRows, scheduleRows] = await Promise.all([
    db.select().from(contracts).orderBy(desc(contracts.createdAt)),
    db.select().from(clients),
    db.select().from(payments).where(isNotNull(payments.contractId)),
  ])
  const clientById = new Map(clientRows.map((client) => [client.id, client]))
  const rowsByContract = new Map<string, (typeof payments.$inferSelect)[]>()
  for (const row of scheduleRows) {
    const list = rowsByContract.get(row.contractId as string) ?? []
    list.push(row)
    rowsByContract.set(row.contractId as string, list)
  }
  const ledger = contractRows.map((contract) => buildContractRow(contract, clientById.get(contract.clientId) ?? null, rowsByContract.get(contract.id) ?? [], today))
  return { today, ledger, clients: clientRows }
}

export type DueEntry = { contract: ContractRow; row: ScheduleRow; bucket: ReminderBucket | null }

export function dueEntries(ledger: ContractRow[]): DueEntry[] {
  const collectable = ledger.filter((contract) => ['active', 'prepared'].includes(contract.status))
  return collectable.flatMap((contract) => contract.schedule
    .filter((row) => !row.cancelled && row.remaining > 0)
    .map((row) => ({ contract, row, bucket: reminderBucket(row.daysUntil, row.remaining) })))
}

export async function listApplications() {
  const [rows, items, contractRows, staff] = await Promise.all([
    db.select().from(applications).orderBy(desc(applications.createdAt)),
    db.select().from(applicationItems).orderBy(asc(applicationItems.position)),
    db.select({ id: contracts.id, number: contracts.number, applicationId: contracts.applicationId }).from(contracts),
    listStaff(),
  ])
  const staffById = new Map(staff.map((member) => [member.userId, member.name]))
  return rows.map((row) => ({
    ...row,
    items: items.filter((item) => item.applicationId === row.id),
    contract: contractRows.find((contract) => contract.applicationId === row.id) ?? null,
    assignedName: row.assignedAdminId ? staffById.get(row.assignedAdminId) ?? null : null,
  }))
}
export type ApplicationListRow = Awaited<ReturnType<typeof listApplications>>[number]

export async function getApplication(id: string) {
  const [row] = await db.select().from(applications).where(eq(applications.id, id)).limit(1)
  if (!row) return null
  const [items, client, contract, notes, history] = await Promise.all([
    db.select().from(applicationItems).where(eq(applicationItems.applicationId, id)).orderBy(asc(applicationItems.position)),
    row.clientId ? db.select().from(clients).where(eq(clients.id, row.clientId)).limit(1).then((r) => r[0] ?? null) : Promise.resolve(null),
    db.select().from(contracts).where(eq(contracts.applicationId, id)).limit(1).then((r) => r[0] ?? null),
    db.select().from(comments).where(and(eq(comments.entityType, 'application'), eq(comments.entityId, id))).orderBy(desc(comments.createdAt)),
    db.select().from(auditLog).where(and(eq(auditLog.entityType, 'application'), eq(auditLog.entityId, id))).orderBy(desc(auditLog.createdAt)),
  ])
  return { application: row, items, client, contract, comments: notes, history }
}

export async function getContract(id: string) {
  const [contract] = await db.select().from(contracts).where(eq(contracts.id, id)).limit(1)
  if (!contract) return null
  const [client, rows, txs, history, application] = await Promise.all([
    db.select().from(clients).where(eq(clients.id, contract.clientId)).limit(1).then((r) => r[0] ?? null),
    db.select().from(payments).where(eq(payments.contractId, id)),
    db.select().from(transactions).where(eq(transactions.contractId, id)).orderBy(desc(transactions.createdAt)),
    db.select().from(auditLog).where(and(eq(auditLog.entityType, 'contract'), eq(auditLog.entityId, id))).orderBy(desc(auditLog.createdAt)),
    db.select({ id: applications.id, number: applications.number }).from(applications).where(eq(applications.id, contract.applicationId)).limit(1).then((r) => r[0] ?? null),
  ])
  return { row: buildContractRow(contract, client, rows, todayIso()), transactions: txs, history, application }
}

export async function getClient(id: string) {
  const [client] = await db.select().from(clients).where(eq(clients.id, id)).limit(1)
  if (!client) return null
  const [apps, contractRows, notes, history] = await Promise.all([
    db.select().from(applications).where(eq(applications.clientId, id)).orderBy(desc(applications.createdAt)),
    db.select().from(contracts).where(eq(contracts.clientId, id)).orderBy(desc(contracts.createdAt)),
    db.select().from(comments).where(and(eq(comments.entityType, 'client'), eq(comments.entityId, id))).orderBy(desc(comments.createdAt)),
    db.select().from(auditLog).where(and(eq(auditLog.entityType, 'client'), eq(auditLog.entityId, id))).orderBy(desc(auditLog.createdAt)),
  ])
  const contractIds = contractRows.map((contract) => contract.id)
  const [rows, txs] = contractIds.length
    ? await Promise.all([
        db.select().from(payments).where(inArray(payments.contractId, contractIds)),
        db.select().from(transactions).where(inArray(transactions.contractId, contractIds)).orderBy(desc(transactions.createdAt)),
      ])
    : [[], []]
  const today = todayIso()
  const ledger = contractRows.map((contract) => buildContractRow(contract, client, rows.filter((row) => row.contractId === contract.id), today))
  return { client, applications: apps, contracts: ledger, transactions: txs, comments: notes, history }
}

export async function listTransactions(limit?: number) {
  const query = db
    .select({ tx: transactions, contractNumber: contracts.number, clientName: clients.fullName, clientId: clients.id, installmentNumber: payments.installmentNumber })
    .from(transactions)
    .leftJoin(contracts, eq(contracts.id, transactions.contractId))
    .leftJoin(clients, eq(clients.id, contracts.clientId))
    .leftJoin(payments, eq(payments.id, transactions.paymentId))
    .orderBy(desc(transactions.createdAt))
  return limit ? query.limit(limit) : query
}
export type TransactionListRow = Awaited<ReturnType<typeof listTransactions>>[number]

export async function listStaff() {
  const rows = await db
    .select({ userId: administrators.userId, role: administrators.role, active: administrators.active, grantedAt: administrators.grantedAt, name: user.name, email: user.email })
    .from(administrators)
    .leftJoin(user, eq(user.id, administrators.userId))
    .orderBy(asc(administrators.grantedAt))
  return rows.map((row) => ({ ...row, name: row.name || row.email || 'Сотрудник', email: row.email ?? '' }))
}

export async function getSettings() {
  const [row] = await db.select().from(settings).where(eq(settings.id, 1)).limit(1)
  return row
}

export async function listAudit(limit = 300) {
  return db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(limit)
}

export async function listNotifications(limit = 100) {
  return db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(limit)
}

export async function unreadNotificationCount() {
  const rows = await db.select({ id: notifications.id, readAt: notifications.readAt }).from(notifications).orderBy(desc(notifications.createdAt)).limit(200)
  return rows.filter((row) => !row.readAt).length
}

export function upcomingWindow(today: string) {
  return { tomorrow: addDays(today, 1), week: addDays(today, 7) }
}
