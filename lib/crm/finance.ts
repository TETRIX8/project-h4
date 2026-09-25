import { MARKUP_RATES } from '@/lib/installment'

export type TermsItem = { quantity: number; unitPriceKopecks: number }

export type TermsInput = {
  items: TermsItem[]
  depositKopecks: number
  months: number
  markupBasisPoints: number
  firstPaymentDate: string
}

export type ScheduleLine = { number: number; dueDate: string; amountKopecks: number }

export function defaultMarkupBasisPoints(months: number, hasDeposit: boolean) {
  if (hasDeposit && months <= 12) return Math.round((MARKUP_RATES[months] ?? 0) * 100)
  return 360 * months
}

export function computeTerms(input: TermsInput) {
  const goodsKopecks = input.items.reduce((sum, item) => sum + item.quantity * item.unitPriceKopecks, 0)
  const itemCount = input.items.reduce((sum, item) => sum + item.quantity, 0)
  const depositKopecks = Math.min(Math.max(0, input.depositKopecks), goodsKopecks)
  const principalKopecks = goodsKopecks - depositKopecks
  const markupKopecks = Math.round(principalKopecks * input.markupBasisPoints / 10_000)
  const financedKopecks = principalKopecks + markupKopecks
  const months = Math.max(1, input.months)
  const monthlyKopecks = Math.round(financedKopecks / months)
  const schedule: ScheduleLine[] = Array.from({ length: months }, (_, index) => ({
    number: index + 1,
    dueDate: addMonths(input.firstPaymentDate, index),
    amountKopecks: index === months - 1 ? financedKopecks - monthlyKopecks * (months - 1) : monthlyKopecks,
  }))
  return {
    goodsKopecks, itemCount, depositKopecks, principalKopecks, markupKopecks, financedKopecks,
    totalKopecks: depositKopecks + financedKopecks, monthlyKopecks, months, schedule,
  }
}

export function addMonths(isoDate: string, months: number) {
  const [year, month, day] = isoDate.split('-').map(Number)
  const target = new Date(Date.UTC(year, month - 1 + months, 1))
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  target.setUTCDate(Math.min(day, lastDay))
  return target.toISOString().slice(0, 10)
}

export function addDays(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function daysBetween(fromIso: string, toIso: string) {
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86_400_000)
}

export function todayIso() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow' }).format(new Date())
}

export type ScheduleStatus = 'paid' | 'partial' | 'overdue' | 'today' | 'soon' | 'upcoming' | 'cancelled'

export function scheduleStatus(row: { amountKopecks: number; paidKopecks: number; dueDate: string | null; cancelled?: boolean }, today = todayIso()) {
  const remaining = Math.max(0, row.amountKopecks - row.paidKopecks)
  const daysUntil = row.dueDate ? daysBetween(today, row.dueDate) : 0
  let status: ScheduleStatus
  if (row.cancelled) status = 'cancelled'
  else if (remaining === 0) status = 'paid'
  else if (row.dueDate && daysUntil < 0) status = 'overdue'
  else if (daysUntil === 0) status = 'today'
  else if (row.paidKopecks > 0) status = 'partial'
  else if (daysUntil <= 7) status = 'soon'
  else status = 'upcoming'
  return { status, remaining, daysUntil, daysOverdue: status === 'overdue' ? -daysUntil : 0 }
}

export type ReminderBucket = 'in7' | 'in3' | 'tomorrow' | 'today' | 'overdue1' | 'overdue3' | 'overdue7' | 'overdue30'

export const REMINDER_LABELS: Record<ReminderBucket, string> = {
  in7: 'Платёж через 7 дней',
  in3: 'Платёж через 3 дня',
  tomorrow: 'Платёж завтра',
  today: 'Платёж сегодня',
  overdue1: 'Просрочка 1 день',
  overdue3: 'Просрочка 3+ дня',
  overdue7: 'Просрочка 7+ дней',
  overdue30: 'Просрочка 30+ дней',
}

export function reminderBucket(daysUntil: number, remaining: number): ReminderBucket | null {
  if (remaining <= 0) return null
  if (daysUntil <= -30) return 'overdue30'
  if (daysUntil <= -7) return 'overdue7'
  if (daysUntil <= -3) return 'overdue3'
  if (daysUntil < 0) return 'overdue1'
  if (daysUntil === 0) return 'today'
  if (daysUntil === 1) return 'tomorrow'
  if (daysUntil <= 3) return 'in3'
  if (daysUntil <= 7) return 'in7'
  return null
}
