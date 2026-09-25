'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, Check, Download, Pause, Play } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { calculateInstallment, formatMoney, MARKUP_RATES, monthLabel, type InstallmentInput } from '@/lib/installment'

export type DialogView = 'schedule' | 'compare' | 'tariff' | 'apply' | 'faq' | 'guide' | 'account' | null

type Props = { view: DialogView; onClose: () => void; input: InstallmentInput; onApply: () => void; onCalculate: () => void }
const titles = { schedule: 'Ваш расчёт рассрочки', compare: 'Сравните два тарифа', tariff: 'Прозрачные условия', apply: 'Заявка на рассрочку', faq: 'Вопросы и ответы', guide: 'Как устроена рассрочка', account: 'Личный кабинет' }
const descriptions = { schedule: 'Все суммы известны заранее. Никаких скрытых платежей.', compare: 'Одна покупка — два способа сделать её ближе.', tariff: 'Наценка фиксируется при заключении договора.', apply: 'Выбранные вами параметры покупки.', faq: 'Главное, что нужно знать перед покупкой.', guide: 'От первой заявки до вашей покупки — четыре простых шага.', account: 'Ваши заявки, согласованные условия и платежи.' }

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
        ['Чем рассрочка отличается от кредита?', 'Клиент заранее видит стоимость товара, фиксированную наценку и итоговую сумму по договору. Наценка не скрыта в ежемесячном платеже. Юридические и религиозные условия сделки должны быть подтверждены документами оператора.'],
        ['Кто может оформить рассрочку?', 'Клиент от 21 года с одним поручителем. Окончательное решение принимается после проверки заявки.'],
        ['Можно ли оформить без первого взноса?', 'Да. По тарифу без первоначального взноса при оформлении вы платите 0 ₽. Наценка составляет 3,6% от стоимости товара за каждый месяц.'],
        ['На какой срок можно оформить покупку?', 'От 2 до 12 месяцев. Стоимость товара — от 5 000 до 1 000 000 ₽.'],
        ['Как округляются платежи?', 'Предварительный график рассчитывается в рублях и копейках. Разница от округления включается в последний платёж, поэтому сумма графика точно совпадает с суммой к оплате.'],
        ['Можно ли погасить рассрочку досрочно?', 'Правила досрочного погашения, а также действия при просрочке необходимо уточнить у оператора и согласовать в договоре до оформления.'],
        ['Как связаться с вами?', 'Контакты оператора ещё не предоставлены. Телефон, адрес и реквизиты будут размещены перед открытием приёма заявок.'],
      ].map(([question, answer]) => <details key={question}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}</div>}
      {view === 'guide' && <Explainer />}
      {view === 'apply' && <>
        <dl className="calculation-summary"><div><dt>Стоимость товара</dt><dd>{formatMoney(result.price)}</dd></div><div><dt>Первоначальный взнос</dt><dd>{formatMoney(result.deposit)}</dd></div><div><dt>Срок</dt><dd>{monthLabel(input.months)}</dd></div><div><dt>Ежемесячный платёж</dt><dd>{formatMoney(result.monthly, true)}</dd></div></dl>
        <div className="setup-notice"><h3>Приём заявок ещё не открыт</h3><p>Сохраните расчёт. Отправка заявки станет доступна после подключения защищённого хранилища и настройки личного кабинета. Сейчас персональные данные не собираются.</p></div>
        <button className="gold-button dialog-primary" onClick={() => exportCalculation(input)}>Сохранить мой расчёт <Download size={18} /></button>
      </>}
      {view === 'account' && <div className="setup-notice"><h3>Кабинет готовится к открытию</h3><p>Здесь будут ваши заявки, статусы и график платежей. Вход будет доступен после подключения защищённой системы авторизации.</p><button className="gold-button" onClick={onCalculate}>Рассчитать рассрочку <ArrowRight size={18} /></button></div>}
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
  return <div className="explainer"><div className="explainer-scene"><span className="eyebrow">Шаг 0{step + 1}</span><h3 className="font-serif" key={step}>{slides[step][0]}</h3><p>{slides[step][1]}</p></div><div className="explainer-controls"><button className="round-arrow" onClick={() => setPlaying(!playing)} aria-label={playing ? 'Приостановить презентацию' : 'Продолжить презентацию'}>{playing ? <Pause size={18} /> : <Play size={18} />}</button><div className="slide-dots">{slides.map((slide, index) => <button key={slide[0]} className={index === step ? 'active' : ''} onClick={() => setStep(index)} aria-label={`Шаг ${index + 1}: ${slide[0]}`} aria-current={index === step ? 'step' : undefined} />)}</div><span>0{step + 1} / 04</span></div><p className="fine-print">Краткая презентация. Оригинальное видео пока не предоставлено.</p></div>
}
