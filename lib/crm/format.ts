import type { ApplicationStatus, ContractStatus, PaymentMethod } from '@/lib/db/schema'
import type { ScheduleStatus } from '@/lib/crm/finance'

export type Tone = 'green' | 'yellow' | 'orange' | 'red' | 'gray' | 'blue' | 'gold'

const rubFormatter = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 2, minimumFractionDigits: 0 })

export function rub(kopecks: number | null | undefined) {
  return rubFormatter.format((kopecks ?? 0) / 100)
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return '—'
  const date = typeof value === 'string' ? new Date(value.length === 10 ? `${value}T00:00:00` : value) : value
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return '—'
  const date = typeof value === 'string' ? new Date(value) : value
  return date.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' })
}

export function applicationCode(number: number | null) {
  return `З-${String(number ?? 0).padStart(5, '0')}`
}

export function pluralDays(days: number) {
  const mod10 = days % 10
  const mod100 = days % 100
  if (mod10 === 1 && mod100 !== 11) return `${days} день`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${days} дня`
  return `${days} дней`
}

export const APPLICATION_STATUS_META: Record<ApplicationStatus, { label: string; tone: Tone }> = {
  new: { label: 'Новая', tone: 'blue' },
  review: { label: 'На проверке', tone: 'yellow' },
  needs_info: { label: 'Требуются данные', tone: 'orange' },
  approved: { label: 'Одобрена', tone: 'green' },
  rejected: { label: 'Отклонена', tone: 'red' },
  awaiting_contract: { label: 'Ожидает оформления', tone: 'gold' },
  contract_signed: { label: 'Договор оформлен', tone: 'gold' },
  active: { label: 'Активна', tone: 'green' },
  completed: { label: 'Завершена', tone: 'gray' },
  cancelled: { label: 'Отменена', tone: 'gray' },
}

export const CONTRACT_STATUS_META: Record<ContractStatus, { label: string; tone: Tone }> = {
  draft: { label: 'Черновик', tone: 'gray' },
  prepared: { label: 'Подготовлен', tone: 'gold' },
  active: { label: 'Активен', tone: 'green' },
  overdue: { label: 'Есть просрочка', tone: 'red' },
  suspended: { label: 'Приостановлен', tone: 'orange' },
  paid: { label: 'Полностью оплачен', tone: 'blue' },
  terminated: { label: 'Расторгнут', tone: 'gray' },
}

export const SCHEDULE_STATUS_META: Record<ScheduleStatus, { label: string; tone: Tone }> = {
  upcoming: { label: 'Предстоящий', tone: 'gray' },
  soon: { label: 'Скоро', tone: 'yellow' },
  today: { label: 'Сегодня', tone: 'orange' },
  paid: { label: 'Оплачен', tone: 'green' },
  partial: { label: 'Частично оплачен', tone: 'yellow' },
  overdue: { label: 'Просрочен', tone: 'red' },
  cancelled: { label: 'Отменён', tone: 'gray' },
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Наличные',
  transfer: 'Банковский перевод',
  card: 'Карта',
  other: 'Другое',
}
