'use client'

import { ArrowRight } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Field, FieldGroup } from '@/components/ui/field'
import { calculateInstallment, formatMoney, monthLabel, type InstallmentInput, type Tariff } from '@/lib/installment'

type Props = {
  input: InstallmentInput
  onChange: (input: InstallmentInput) => void
  onDetails: () => void
}

function NumericControl({ id, value, min, max, disabled, onChange }: { id: string; value: number; min: number; max: number; disabled?: boolean; onChange: (value: number) => void }) {
  const format = (number: number) => new Intl.NumberFormat('ru-RU').format(number)
  const [draft, setDraft] = useState(format(value))
  const focused = useRef(false)
  useEffect(() => { if (!focused.current) setDraft(new Intl.NumberFormat('ru-RU').format(value)) }, [value])
  const numeric = Number(draft.replace(/\s/g, ''))
  const invalid = !disabled && (draft === '' || !Number.isInteger(numeric) || numeric < min || numeric > max)
  return <input id={id} inputMode="numeric" type="text" value={draft} disabled={disabled} aria-invalid={invalid} aria-label={id === 'price' ? 'Стоимость товара' : 'Первоначальный взнос'} onFocus={() => { focused.current = true; setDraft(String(value)) }} onChange={(event) => {
    const raw = event.target.value.replace(/\s/g, '')
    if (!/^\d*$/.test(raw)) return
    setDraft(raw)
    const next = Number(raw)
    if (Number.isInteger(next) && next >= min && next <= max) onChange(next)
  }} onBlur={() => { focused.current = false; setDraft(format(value)) }} />
}

const track = (value: number, min: number, max: number) => ({ '--range-progress': `${(value - min) / (max - min) * 100}%` }) as CSSProperties

export function Calculator({ input, onChange, onDetails }: Props) {
  const result = calculateInstallment(input)
  const withDeposit = input.tariff === 'with-deposit'
  function change(key: 'price' | 'depositPercent' | 'months', value: number) {
    onChange({ ...input, [key]: value })
  }

  return (
    <section className="calculator" id="calculator" aria-label="Калькулятор рассрочки">
      <ToggleGroup className="tariff-toggle" value={[input.tariff]} onValueChange={(values) => {
        if (values.length) onChange({ ...input, tariff: values[0] as Tariff })
      }} aria-label="Тариф рассрочки">
        <ToggleGroupItem value="with-deposit">С первоначальным<br />взносом</ToggleGroupItem>
        <ToggleGroupItem value="without-deposit">Без первоначального<br />взноса</ToggleGroupItem>
      </ToggleGroup>
      <FieldGroup className="calculator-fields">
        <Field>
          <div className="calc-label-row">
            <label htmlFor="price">Стоимость товара</label>
            <div className="calc-number"><NumericControl id="price" value={input.price} min={5000} max={1000000} onChange={(value) => change('price', value)} /><span>₽</span></div>
          </div>
          <input className="range-input" type="range" aria-label="Стоимость товара, ползунок" min={5000} max={1000000} step={1000} value={input.price} style={track(input.price, 5000, 1000000)} onChange={(e) => change('price', Number(e.target.value))} />
          <div className="range-captions"><span>5 000 ₽</span><span>1 000 000 ₽</span></div>
        </Field>
        <Field>
          <div className="calc-label-row">
            <label htmlFor="deposit">Первоначальный взнос</label>
            <div className="calc-number deposit-number"><div className="percent-input"><NumericControl id="deposit" min={20} max={80} disabled={!withDeposit} value={withDeposit ? input.depositPercent : 0} onChange={(value) => change('depositPercent', value)} /><span>%</span></div><span>{formatMoney(result.deposit)}</span></div>
          </div>
          <input className="range-input" type="range" aria-label="Первоначальный взнос, ползунок" min={20} max={80} step={1} disabled={!withDeposit} value={withDeposit ? input.depositPercent : 20} style={track(withDeposit ? input.depositPercent : 20, 20, 80)} onChange={(e) => change('depositPercent', Number(e.target.value))} />
          <div className="range-captions"><span>{withDeposit ? '20%' : 'Без взноса'}</span><span>{withDeposit ? '80%' : '0 ₽'}</span></div>
        </Field>
        <Field>
          <div className="calc-label-row">
            <label htmlFor="months">Срок рассрочки</label>
            <output className="calc-number" htmlFor="months">{monthLabel(input.months)}</output>
          </div>
          <input id="months" className="range-input" type="range" min={2} max={12} step={1} value={input.months} style={track(input.months, 2, 12)} onChange={(e) => change('months', Number(e.target.value))} />
          <div className="range-captions"><span>2 мес</span><span>12 мес</span></div>
        </Field>
      </FieldGroup>
      <button className="monthly-payment" onClick={onDetails} aria-label="Полный расчёт и график платежей">
        <span className="payment-content"><span className="payment-label">Ежемесячный платеж</span><span className="payment-amount font-serif" aria-live="polite">{formatMoney(result.monthly)}</span><span className="payment-caption">Полный расчет и график платежей</span></span>
        <span className="round-arrow filled"><ArrowRight size={25} strokeWidth={1.4} /></span>
      </button>
    </section>
  )
}
