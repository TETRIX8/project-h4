import 'server-only'
import { db } from '@/lib/db'
import { applications, transactions } from '@/lib/db/schema'
import { addDays, daysBetween } from '@/lib/crm/finance'
import type { ContractRow } from '@/lib/crm/queries'

export type SeriesPoint = {
  date: string
  label: string
  applications: number
  approved: number
  rejected: number
  paymentsKopecks: number
  paymentsCount: number
  salesKopecks: number
  contracts: number
  activeContracts: number
  overdueKopecks: number
}

const APPROVED = new Set(['approved', 'awaiting_contract', 'contract_signed', 'active', 'completed'])

const moscowDay = (value: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow' }).format(value)

export async function buildAnalytics(ledger: ContractRow[], from: string, to: string) {
  const [apps, txs] = await Promise.all([
    db.select({ createdAt: applications.createdAt, status: applications.status }).from(applications),
    db.select({ paidOn: transactions.paidOn, amountKopecks: transactions.amountKopecks, cancelledAt: transactions.cancelledAt }).from(transactions),
  ])
  const liveTx = txs.filter((tx) => !tx.cancelledAt)
  const span = Math.max(0, daysBetween(from, to))
  const byMonth = span > 120
  const keyOf = (iso: string) => (byMonth ? iso.slice(0, 7) : iso)

  const buckets = new Map<string, SeriesPoint>()
  for (let offset = 0; offset <= span; offset++) {
    const iso = addDays(from, offset)
    const key = keyOf(iso)
    if (buckets.has(key)) continue
    const date = new Date(`${iso}T00:00:00Z`)
    buckets.set(key, {
      date: key,
      label: byMonth ? date.toLocaleDateString('ru-RU', { month: 'short', year: '2-digit', timeZone: 'UTC' }) : date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', timeZone: 'UTC' }),
      applications: 0, approved: 0, rejected: 0, paymentsKopecks: 0, paymentsCount: 0, salesKopecks: 0, contracts: 0, activeContracts: 0, overdueKopecks: 0,
    })
  }
  const inRange = (iso: string) => iso >= from && iso <= to

  const appsInRange = apps.filter((app) => inRange(moscowDay(app.createdAt)))
  for (const app of appsInRange) {
    const point = buckets.get(keyOf(moscowDay(app.createdAt)))
    if (!point) continue
    point.applications++
    if (APPROVED.has(app.status)) point.approved++
    if (app.status === 'rejected') point.rejected++
  }
  const txInRange = liveTx.filter((tx) => inRange(tx.paidOn))
  for (const tx of txInRange) {
    const point = buckets.get(keyOf(tx.paidOn))
    if (!point) continue
    point.paymentsKopecks += tx.amountKopecks
    point.paymentsCount++
  }
  const contractsInRange = ledger.filter((contract) => inRange(contract.signedAt) && contract.status !== 'draft')
  for (const contract of contractsInRange) {
    const point = buckets.get(keyOf(contract.signedAt))
    if (!point) continue
    point.contracts++
    point.salesKopecks += contract.totalKopecks
  }
  for (const point of buckets.values()) {
    const endOfBucket = byMonth ? `${point.date}-31` : point.date
    point.activeContracts = ledger.filter((contract) => contract.signedAt <= endOfBucket && ['active', 'prepared', 'suspended'].includes(contract.status)).length
    point.overdueKopecks = ledger.flatMap((contract) => contract.status === 'active' ? contract.schedule : [])
      .filter((row) => row.status === 'overdue' && row.dueDate && keyOf(row.dueDate) === point.date)
      .reduce((sum, row) => sum + row.remaining, 0)
  }

  const liveLedger = ledger.filter((contract) => contract.status !== 'draft' && contract.status !== 'terminated')
  return {
    series: [...buckets.values()],
    totals: {
      applications: appsInRange.length,
      approved: appsInRange.filter((app) => APPROVED.has(app.status)).length,
      rejected: appsInRange.filter((app) => app.status === 'rejected').length,
      activeContracts: ledger.filter((contract) => ['active', 'prepared'].includes(contract.status)).length,
      closedContracts: ledger.filter((contract) => contract.status === 'paid').length,
      volumeKopecks: contractsInRange.reduce((sum, contract) => sum + contract.totalKopecks, 0),
      receivedKopecks: txInRange.reduce((sum, tx) => sum + tx.amountKopecks, 0),
      outstandingKopecks: liveLedger.reduce((sum, contract) => sum + contract.remainingKopecks, 0),
      overdueKopecks: liveLedger.filter((contract) => contract.status === 'active').reduce((sum, contract) => sum + contract.overdueKopecks, 0),
    },
  }
}
