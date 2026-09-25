'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, Check, Download, Pause, Play, SendIcon, CheckCircle2Icon } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { calculateInstallment, formatMoney, MARKUP_RATES, monthLabel, type InstallmentInput } from '@/lib/installment'
import { submitApplicationAction } from '@/app/actions/applications'
import Link from 'next/link'

export type DialogView = 'schedule' | 'compare' | 'tariff' | 'apply' | 'faq' | 'guide' | 'account' | null

type Props = { view: DialogView; onClose: () => void; input: InstallmentInput; onApply: () => void; onCalculate: () => void }
const titles = { schedule: 'Ваш расчёт рассрочки', compare: 'Сравните два тарифа', tariff: 'Прозрачные условия', apply: 'Заявка на рассрочку', faq: 'Вопросы и ответы', guide: 'Как устроена рассрочка', account: 'Личный кабинет' }
const descriptions = { schedule: 'Все суммы известны заранее. Никаких скрытых платежей.', compare: 'Одна покупка — два способа сделать её ближе.', tariff: 'Наценка фиксируется при заключении договора.', apply: 'Укажите контактные данные для рассмотрения заявки.', faq: 'Главное, что нужно знать перед покупкой.', guide: 'От первой заявки до вашей покупки — четыре простых шага.', account: 'Управление заявками и графиком платежей.' }

function exportCalculation(input: InstallmentInput) {
  const result = calculateInstallment(input)
  const content = [
    'Расчёт рассрочки (предварительный)',
    `Тариф: ${input.tariff === 'with-deposit' ? 'С первоначальным взносом' : 'Без первоначального взноса'}`,
    `Стоимость товара: ${formatMoney(result.price, true)}`,
    `Первоначальный взнос: ${formatMoney(result.deposit, true)}`,
    `Сумма в рассрочку: ${formatMoney(result.principal, true)}`,
    `Наценка: ${formatMoney(result.markup, true)} (${result.markupPercent}%)`,
    `К оплате по графику: ${formatMoney(result.financedTotal, true)}`,
    `Общая сумма выплат: ${formatMoney(result.total, true)}`,
    '', 'Месяц;Платёж', ...result.schedule.map((row) => `${row.month};${formatMoney(row.amount, true)}`),
    '', 'Платежи округлены до копеек. Остаток учтён в последнем платеже.',
    'Даты платежей определяются договором. Расчёт не является публичной офертой.',
  ].join('\r\n')
  const url = URL.createObjectURL(new Blob(['\uFEFF' + content], { type: 'text/plain;charset=utf-8' }))
  const link = document.createElement('a'); link.href = url; link.download = 'Расчёт-рассрочки.txt'; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function SiteDialogs({ view, onClose, input, onApply, onCalculate }: Props) {
  const result = calculateInstallment(input)
  const withDeposit = input.tariff === 'with-deposit'

  // Application Form State
  const [customerName, setCustomerName] = useState('')
  const [phone, setPhone] = useState('+7')
  const [productName, setProductName] = useState('')
  const [consent, setConsent] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submittedAppId, setSubmittedAppId] = useState<string | null>(null)

  const handleSubmitApp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!consent) {
      setSubmitError('Необходимо согласие на обработку персональных данных')
      return
    }
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const res = await submitApplicationAction({
        customerName,
        phone,
        productName,
        tariff: input.tariff,
        price: input.price,
        depositPercent: input.depositPercent,
        months: input.months,
      })

      if (res.success && res.applicationId) {
        setSubmittedAppId(res.applicationId)
      } else {
        setSubmitError(res.error || 'Произошла ошибка при отправке заявки')
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Ошибка отправки заявки. Пожалуйста, войдите в аккаунт.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return <Dialog open={view !== null} onOpenChange={(open) => { if (!open) onClose() }}>
    <DialogContent className="site-dialog">
      {view && <><DialogHeader><p className="eyebrow">Исламская рассрочка</p><DialogTitle>{titles[view]}</DialogTitle><DialogDescription>{descriptions[view]}</DialogDescription></DialogHeader>
      {view === 'schedule' && <>
        <dl className="calculation-summary">{[
          ['Стоимость товара', result.price], ['Первоначальный взнос', result.deposit], ['Сумма в рассрочку', result.principal], [`Наценка / переплата (${result.markupPercent}%)`, result.markup], ['К оплате по графику', result.financedTotal], ['Общая сумма выплат', result.total],
        ].map(([label, amount]) => <div key={label}><dt>{label}</dt><dd>{formatMoney(Number(amount), true)}</dd></div>)}</dl>
        <div className="schedule-heading"><h3>График на {monthLabel(input.months)}</h3><button className="text-link" onClick={() => exportCalculation(input)}><Download size={17} />Скачать</button></div>
        <div className="schedule-table"><table><thead><tr><th>Платёж</th><th>Сумма</th></tr></thead><tbody>{result.schedule.map(({ month, amount }) => <tr key={month}><td>{month}-й месяц</td><td>{formatMoney(amount, true)}</td></tr>)}</tbody></table></div>
        <p className="fine-print">Предварительный расчёт. Платежи округлены до копеек, разница учтена в последнем платеже. Даты определяются договором. Не является публичной офертой.</p>
        <button className="gold-button dialog-primary" onClick={onApply}>Подать заявку <ArrowRight size={18} /></button>
      </>}
      {view === 'compare' && <Comparison input={input} onCalculate={onCalculate} />}
      {view === 'tariff' && <>
        <h3 className="dialog-subtitle font-serif">{withDeposit ? 'С первоначальным взносом' : 'Без первоначального взноса'}</h3>
        <ul className="dialog-condition-list">{[withDeposit ? 'Первоначальный взнос от 20% до 80%' : 'Первоначальный взнос 0 ₽', 'Стоимость товара от 5 000 до 1 000 000 ₽', 'Срок от 2 до 12 месяцев', 'Один поручитель', 'Возраст клиента от 21 года'].map((text) => <li key={text}><Check size={17} />{text}</li>)}</ul>
        <p className="dialog-body-text">{withDeposit ? 'Наценка начисляется только на остаток после первоначального взноса. Её размер зависит от срока:' : 'Наценка составляет 3,6% от полной стоимости товара за каждый месяц. Это фиксированная наценка на товар, а не сложный процент.'}</p>
        {withDeposit && <div className="rates-grid">{MARKUP_RATES.slice(2).map((rate, index) => <div key={index}><span>{index + 2} мес.</span><strong>{rate}%</strong></div>)}</div>}
        <p className="fine-print">Правила досрочного погашения и просрочки уточняются до подписания договора.</p>
        <button className="gold-button dialog-primary" onClick={onCalculate}>Рассчитать этот тариф <ArrowRight size={18} /></button>
      </>}
      {view === 'faq' && <div className="faq-list">{[
        ['Чем рассрочка отличается от кредита?', 'Клиент заранее видит стоимость товара, фиксированную наценку и итоговую сумму по договору. Наценка не скрыта в ежемесячном платеже. Юридические и религиозные условия сделки подтверждены документами.'],
        ['Кто может оформить рассрочку?', 'Клиент от 21 года с одним поручителем. Окончательное решение принимается после проверки заявки.'],
        ['Можно ли оформить без первого взноса?', 'Да. По тарифу без первоначального взноса при оформлении вы платите 0 ₽. Наценка составляет 3,6% от стоимости товара за каждый месяц.'],
        ['На какой срок можно оформить покупку?', 'От 2 до 12 месяцев. Стоимость товара — от 5 000 до 1 000 000 ₽.'],
        ['Как округляются платежи?', 'Предварительный график рассчитывается в рублях и копейках. Разница от округления включается в последний платёж, поэтому сумма графика точно совпадает с суммой к оплате.'],
        ['Можно ли погасить рассрочку досрочно?', 'Правила досрочного погашения, а также действия при просрочке необходимо уточнить у оператора и согласовать в договоре до оформления.'],
      ].map(([question, answer]) => <details key={question}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}</div>}
      {view === 'guide' && <Explainer />}
      {view === 'apply' && <>
        {submittedAppId ? (
          <div className="py-6 text-center space-y-4">
            <div className="size-16 rounded-full bg-emerald-950/80 border border-emerald-700 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2Icon className="size-8" />
            </div>
            <h3 className="font-serif text-2xl text-white">Заявка успешно отправлена!</h3>
            <p className="text-xs text-[#a8b8a0]">
              Номер заявки: <strong className="text-[#d4af7a]">{submittedAppId.slice(0, 8)}</strong>. Мы рассмотрим ваши данные в ближайшее время.
            </p>
            <div className="pt-2">
              <Link href="/cabinet" className="gold-button dialog-primary inline-flex items-center justify-center gap-2">
                Перейти в личный кабинет <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmitApp} className="space-y-4">
            <dl className="calculation-summary">
              <div><dt>Товар / услуга</dt><dd>{formatMoney(result.price)}</dd></div>
              <div><dt>Первоначальный взнос</dt><dd>{formatMoney(result.deposit)}</dd></div>
              <div><dt>Срок рассрочки</dt><dd>{monthLabel(input.months)}</dd></div>
              <div><dt>Ежемесячный платёж</dt><dd>{formatMoney(result.monthly, true)}</dd></div>
            </dl>

            {submitError && (
              <div className="p-3 bg-red-950/80 border border-red-800 text-red-200 text-xs rounded-xl">
                {submitError.includes('авторизуйтесь') || submitError.includes('войдите') ? (
                  <div>
                    {submitError}{' '}
                    <Link href="/sign-in" className="underline font-medium text-amber-300">
                      Войти
                    </Link>{' '}
                    или{' '}
                    <Link href="/sign-up" className="underline font-medium text-amber-300">
                      Зарегистрироваться
                    </Link>
                  </div>
                ) : (
                  submitError
                )}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#a8b8a0] mb-1">Ваше ФИО *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Иванов Иван Иванович"
                  className="w-full bg-[#0a1712] border border-[#234237] rounded-xl py-2 px-3 text-xs text-white placeholder:text-[#5a6b52] focus:outline-none focus:border-[#d4af7a]"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[#a8b8a0] mb-1">Номер телефона *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+7 (999) 000-00-00"
                  className="w-full bg-[#0a1712] border border-[#234237] rounded-xl py-2 px-3 text-xs text-white placeholder:text-[#5a6b52] focus:outline-none focus:border-[#d4af7a]"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[#a8b8a0] mb-1">Наименование товара *</label>
                <input
                  type="text"
                  required
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="Например: Смартфон, Ноутбук, Мебель..."
                  className="w-full bg-[#0a1712] border border-[#234237] rounded-xl py-2 px-3 text-xs text-white placeholder:text-[#5a6b52] focus:outline-none focus:border-[#d4af7a]"
                />
              </div>

              <label className="flex items-start gap-2 text-[11px] text-[#a8b8a0] cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 rounded border-[#234237] text-[#d4af7a] focus:ring-0"
                />
                <span>Согласен на обработку персональных данных и проверку условий рассрочки</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="gold-button dialog-primary w-full justify-center disabled:opacity-50"
            >
              {isSubmitting ? 'Отправка...' : 'Подтвердить и отправить заявку'} <SendIcon size={16} />
            </button>
          </form>
        )}
      </>}
      {view === 'account' && (
        <div className="setup-notice">
          <h3>Личный кабинет и заявки</h3>
          <p>В кабинете вы можете отслеживать статус ваших заявок, даты платежей и остаток по договору.</p>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link href="/cabinet" className="gold-button text-center">
              Перейти в личный кабинет <ArrowRight size={18} />
            </Link>
            <Link href="/sign-in" className="border border-[#234237] hover:border-[#caa278] text-[#e8ded1] font-sans px-4 py-2.5 rounded-xl text-xs text-center transition-colors">
              Войти в другой аккаунт
            </Link>
          </div>
        </div>
      )}
      </>}
    </DialogContent>
  </Dialog>
}

function Comparison({ input, onCalculate }: { input: InstallmentInput; onCalculate: () => void }) {
  const withDeposit = calculateInstallment({ ...input, tariff: 'with-deposit' })
  const withoutDeposit = calculateInstallment({ ...input, tariff: 'without-deposit' })
  return <><p className="dialog-body-text">Для покупки на {formatMoney(input.price)} сроком на {monthLabel(input.months)}.</p><div className="comparison-table"><table><thead><tr><th>Условие</th><th>Со взносом</th><th>Без взноса</th></tr></thead><tbody>{[
    ['Первый взнос', formatMoney(withDeposit.deposit), '0 ₽'],
    ['Наценка', formatMoney(withDeposit.markup), formatMoney(withoutDeposit.markup)],
    ['В месяц', formatMoney(withDeposit.monthly, true), formatMoney(withoutDeposit.monthly, true)],
    ['Всего', formatMoney(withDeposit.total), formatMoney(withoutDeposit.total)],
    ['Поручитель', '1 человек', '1 человек'],
    ['Возраст', 'От 21 года', 'От 21 года'],
  ].map((row) => <tr key={row[0]}>{row.map((value, index) => index === 0 ? <th key={index}>{value}</th> : <td key={index}>{value}</td>)}</tr>)}</tbody></table></div><button className="gold-button dialog-primary" onClick={onCalculate}>Изменить параметры <ArrowRight size={18} /></button></>
}

const slides = [
  ['Оставляете заявку', 'Выберите товар, рассчитайте удобные условия и заполните контактные данные.'],
  ['Проходите проверку', 'Мы рассмотрим вашу заявку и согласуем параметры покупки. Вам понадобится один поручитель.'],
  ['Подписываете договор', 'До подписания вы знаете окончательную стоимость и график всех платежей.'],
  ['Получаете товар', 'Пользуйтесь покупкой уже сейчас и вносите платежи по согласованному графику.'],
]
function Explainer() {
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(true)
  useEffect(() => {
    if (!playing) return
    const timer = setInterval(() => setStep((current) => (current + 1) % slides.length), 5500)
    return () => clearInterval(timer)
  }, [playing])
  return <div className="explainer"><div className="explainer-scene"><span className="eyebrow">Шаг 0{step + 1}</span><h3 className="font-serif" key={step}>{slides[step][0]}</h3><p>{slides[step][1]}</p></div><div className="explainer-controls"><button className="round-arrow" onClick={() => setPlaying(!playing)} aria-label={playing ? 'Приостановить презентацию' : 'Продолжить презентацию'}>{playing ? <Pause size={18} /> : <Play size={18} />}</button><div className="slide-dots">{slides.map((slide, index) => <button key={slide[0]} className={index === step ? 'active' : ''} onClick={() => setStep(index)} aria-label={`Шаг ${index + 1}: ${slide[0]}`} aria-current={index === step ? 'step' : undefined} />)}</div><span>0{step + 1} / 04</span></div><p className="fine-print">Краткая презентация. Интерактивное руководство.</p></div>
}
