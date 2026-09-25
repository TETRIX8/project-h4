export type Tariff = 'with-deposit' | 'without-deposit'

export type InstallmentInput = {
  tariff: Tariff
  price: number
  depositPercent: number
  months: number
}

export const MARKUP_RATES = [0, 0, 9, 13.5, 18, 22.5, 27, 30.5, 34, 37.5, 41, 44.5, 48] as const

export function calculateInstallment(input: InstallmentInput) {
  const { price, months, tariff, depositPercent } = input
  if (!['with-deposit', 'without-deposit'].includes(tariff)) throw new Error('Неизвестный тариф')
  if (!Number.isInteger(price) || price < 5_000 || price > 1_000_000) throw new Error('Стоимость товара — от 5 000 до 1 000 000 ₽')
  if (!Number.isInteger(months) || months < 2 || months > 12) throw new Error('Срок — от 2 до 12 месяцев')
  if (!Number.isFinite(depositPercent) || (tariff === 'with-deposit' && (depositPercent < 20 || depositPercent > 80))) throw new Error('Первоначальный взнос — от 20% до 80%')

  const priceKopecks = price * 100
  const depositKopecks = tariff === 'with-deposit' ? Math.round(priceKopecks * depositPercent / 100) : 0
  const principalKopecks = priceKopecks - depositKopecks
  const rateBasisPoints = tariff === 'with-deposit' ? Math.round(MARKUP_RATES[months] * 100) : 360 * months
  const markupKopecks = Math.round(principalKopecks * rateBasisPoints / 10_000)
  const financedTotalKopecks = principalKopecks + markupKopecks
  const monthlyKopecks = Math.round(financedTotalKopecks / months)
  const schedule = Array.from({ length: months }, (_, index) => ({
    month: index + 1,
    amount: (index === months - 1 ? financedTotalKopecks - monthlyKopecks * (months - 1) : monthlyKopecks) / 100,
  }))

  return {
    price,
    deposit: depositKopecks / 100,
    principal: principalKopecks / 100,
    markup: markupKopecks / 100,
    markupPercent: rateBasisPoints / 100,
    financedTotal: financedTotalKopecks / 100,
    total: (depositKopecks + financedTotalKopecks) / 100,
    monthly: monthlyKopecks / 100,
    schedule,
  }
}

export function formatMoney(amount: number, decimals = false) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency', currency: 'RUB',
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  }).format(amount)
}

export function monthLabel(months: number) {
  return `${months} ${months >= 5 ? 'месяцев' : months === 1 ? 'месяц' : 'месяца'}`
}

export const DEFAULT_INPUT: InstallmentInput = { tariff: 'with-deposit', price: 250_000, depositPercent: 20, months: 6 }

export type InstallmentResult = ReturnType<typeof calculateInstallment>
